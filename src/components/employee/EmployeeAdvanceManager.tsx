import React, { useState, useMemo } from "react";
import {
  DollarSign,
  Plus,
  Check,
  X,
  Clock,
  Calendar,
  TrendingDown,
  Search,
  Trash2,
} from "lucide-react";
import { useAppContext } from "../../contexts/AppContext";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import type { EmployeeAdvance, EmployeeAdvancePayment } from "../../types";
import { formatCurrency, formatDate } from "../../utils/format";
import { showToast } from "../../utils/toast";
import {
  useEmployeeAdvances,
  useCreateEmployeeAdvance,
  useUpdateEmployeeAdvance,
  useDeleteEmployeeAdvance,
  useAdvancePayments,
} from "../../hooks/useEmployeeAdvanceRepository";

export default function EmployeeAdvanceManager() {
  const { employees, currentBranchId } = useAppContext();
  const { profile } = useAuth();

  // Fetch data from Supabase
  const { data: advances = [], isLoading } =
    useEmployeeAdvances(currentBranchId);
  const { mutateAsync: createAdvance } = useCreateEmployeeAdvance();
  const { mutateAsync: updateAdvance } = useUpdateEmployeeAdvance();
  const { mutateAsync: deleteAdvance } = useDeleteEmployeeAdvance();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAdvance, setSelectedAdvance] =
    useState<EmployeeAdvance | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | EmployeeAdvance["status"]
  >("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all"); // NEW: Filter by employee

  // Payment form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    employeeId: "",
    advanceAmount: "",
    reason: "",
    paymentMethod: "cash" as "cash" | "transfer",
    isInstallment: false,
    installmentMonths: "3",
  });

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === "active"),
    [employees]
  );

  const filteredAdvances = useMemo(() => {
    return advances.filter((advance) => {
      const matchesSearch =
        advance.employeeName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        advance.reason?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || advance.status === statusFilter;
      const matchesEmployee =
        employeeFilter === "all" || advance.employeeId === employeeFilter;
      return matchesSearch && matchesStatus && matchesEmployee;
    });
  }, [advances, searchQuery, statusFilter, employeeFilter]);

  const handleCreateAdvance = async () => {
    if (!formData.employeeId || !formData.advanceAmount) {
      showToast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    const employee = employees.find((e) => e.id === formData.employeeId);
    if (!employee) {
      showToast.error("Không tìm thấy nhân viên");
      return;
    }

    const advanceAmount = parseFloat(formData.advanceAmount);
    const installmentMonths = formData.isInstallment
      ? parseInt(formData.installmentMonths)
      : 0;
    const monthlyDeduction = formData.isInstallment
      ? Math.ceil(advanceAmount / installmentMonths)
      : 0;

    try {
      await createAdvance({
        employeeId: formData.employeeId,
        employeeName: employee.name,
        advanceAmount,
        advanceDate: new Date().toISOString(),
        reason: formData.reason,
        paymentMethod: formData.paymentMethod,
        status: "pending",
        isInstallment: formData.isInstallment,
        installmentMonths: formData.isInstallment
          ? installmentMonths
          : undefined,
        monthlyDeduction: formData.isInstallment ? monthlyDeduction : undefined,
        remainingAmount: advanceAmount,
        paidAmount: 0,
        branchId: currentBranchId,
      });

      // Refresh data to show new advance immediately
      queryClient.invalidateQueries({ queryKey: ["employee-advances"] });

      setShowCreateModal(false);
      setFormData({
        employeeId: "",
        advanceAmount: "",
        reason: "",
        paymentMethod: "cash",
        isInstallment: false,
        installmentMonths: "3",
      });

      showToast.success("Đã tạo đơn ứng lương");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleApprove = async (advanceId: string) => {
    if (!profile) return;

    const advance = advances.find((a) => a.id === advanceId);
    if (!advance) {
      showToast.error("Không tìm thấy đơn ứng lương");
      return;
    }

    try {
      // Chỉ duyệt đơn — KHÔNG chi tiền tự động.
      // Tiền sẽ được chi khi nhấn "Trả tiền ứng" trong màn hình chi tiết.
      await updateAdvance({
        id: advanceId,
        updates: {
          status: "approved",
          approvedBy: profile.full_name || profile.email,
          approvedDate: new Date().toISOString(),
          // Giữ nguyên remainingAmount = advanceAmount, paidAmount = 0
        },
      });

      queryClient.invalidateQueries({ queryKey: ["employee-advances"] });
      showToast.success(
        `Đã duyệt đơn ứng lương cho ${advance.employeeName}. Vui lòng chi tiền thực tế trong mục "Chi tiết đơn".`
      );
    } catch (error) {
      console.error("Error approving advance:", error);
      showToast.error("Có lỗi khi duyệt ứng lương");
    }
  };

  const handleReject = async (advanceId: string) => {
    try {
      await updateAdvance({
        id: advanceId,
        updates: {
          status: "rejected",
        },
      });
      showToast.info("Đã từ chối đơn ứng lương");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const queryClient = useQueryClient();

  const handleDelete = async (advanceId: string) => {
    if (!confirm("Bạn có chắc muốn xóa đơn ứng lương này không?")) return;

    try {
      await deleteAdvance(advanceId);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleMakePayment = async () => {
    if (!selectedAdvance || !paymentAmount) {
      showToast.error("Vui lòng nhập số tiền trả");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedAdvance.remainingAmount) {
      showToast.error(
        `Số tiền không hợp lệ. Còn nợ: ${formatCurrency(
          selectedAdvance.remainingAmount
        )}`
      );
      return;
    }

    try {
      // Create payment record
      const { error: paymentError } = await supabase
        .from("employee_advance_payments")
        .insert({
          advance_id: selectedAdvance.id,
          employee_id: selectedAdvance.employeeId,
          amount: amount,
          payment_date: new Date().toISOString(),
          payment_month: new Date().toISOString().slice(0, 7), // YYYY-MM
          notes: paymentNotes || `Nhân viên trả tiền ứng`,
          branch_id: currentBranchId,
        });

      if (paymentError) {
        console.error("Error creating payment:", paymentError);
        showToast.error("Đã xảy ra lỗi khi ghi nhận thanh toán");
        return;
      }

      // Create cash transaction (income) for the repayment
      const transactionId = `REPAY-${selectedAdvance.id}-${Date.now()}`;
      const { error: txError } = await supabase
        .from("cash_transactions")
        .insert({
          id: transactionId,
          type: "income",
          category: "employee_advance_repayment",
          amount: amount,
          date: new Date().toISOString(),
          description: `Trả tiền ứng - ${
            selectedAdvance.employeeName
          } (${formatCurrency(amount)})`,
          branchid: currentBranchId,
          paymentsource:
            selectedAdvance.paymentMethod === "cash" ? "cash" : "bank",
        });

      if (txError) {
        console.error("Error creating repayment transaction:", txError);
        showToast.warning("Đã ghi nhận thanh toán nhưng chưa ghi sổ quỹ");
      } else {
        showToast.success(`Đã ghi nhận thanh toán ${formatCurrency(amount)}`);
      }

      // 🔹 NOTE: remaining_amount và paid_amount được tự động cập nhật bởi database trigger
      // Trigger: trigger_update_advance_on_payment (xem employee_advance_schema.sql)
      
      // ✅ FIX: Query lại remaining_amount MỚI từ database sau khi trigger chạy
      const { data: updatedAdvance } = await supabase
        .from("employee_advances")
        .select("remaining_amount")
        .eq("id", selectedAdvance.id)
        .single();

      // Kiểm tra nếu đã trả hết thì đổi status
      if (updatedAdvance && updatedAdvance.remaining_amount <= 0) {
        await supabase
          .from("employee_advances")
          .update({ status: "paid" })
          .eq("id", selectedAdvance.id);
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["employee-advances"] });

      // Reset form and close
      setPaymentAmount("");
      setPaymentNotes("");
      setShowPaymentForm(false);
      setShowDetailModal(false);
      setSelectedAdvance(null);
    } catch (error) {
      console.error("Error making payment:", error);
      showToast.error("Đã xảy ra lỗi");
    }
  };

  const handleDisburse = async (advance: EmployeeAdvance) => {
    if (!confirm(`Chi ${formatCurrency(advance.advanceAmount)} ứng lương cho ${advance.employeeName}?\n\nTiền sẽ được ghi vào sổ quỹ. Nhân viên vẫn cần hoàn trả số tiền này.`)) return;
    try {
      // Chỉ ghi sổ quỹ chi tiền — KHÔNG thay đổi remainingAmount
      // vì nhân viên vẫn còn nợ, sẽ trả dần qua handleMakePayment
      const transactionId = `ADV-${advance.id}-${Date.now()}`;
      const { error: txError } = await supabase
        .from("cash_transactions")
        .insert({
          id: transactionId,
          type: "expense",
          category: "employee_advance",
          amount: advance.advanceAmount,
          date: new Date().toISOString(),
          description: `Chi ứng lương - ${advance.employeeName} (${formatCurrency(advance.advanceAmount)})`,
          branchid: currentBranchId,
          paymentsource: advance.paymentMethod === "cash" ? "cash" : "bank",
        });

      if (txError) {
        showToast.warning("Chưa ghi được sổ quỹ. Vui lòng kiểm tra lại.");
      } else {
        queryClient.invalidateQueries({ queryKey: ["cash_transactions"] });
        showToast.success(`Đã ghi chi ${formatCurrency(advance.advanceAmount)} cho ${advance.employeeName}. Nhân viên sẽ hoàn trả dần.`);
      }
    } catch (error) {
      showToast.error("Có lỗi khi chi tiền ứng lương");
    }
  };

  const getStatusBadge = (status: EmployeeAdvance["status"]) => {
    const styles = {
      pending:
        "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
      approved:
        "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
      rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
      paid: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    };

    const labels = {
      pending: "Chờ duyệt",
      approved: "Đã duyệt",
      rejected: "Từ chối",
      paid: "Đã chi trả",
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {status === "pending" && <Clock className="w-3 h-3" />}
        {status === "approved" && <Check className="w-3 h-3" />}
        {status === "rejected" && <X className="w-3 h-3" />}
        {status === "paid" && <DollarSign className="w-3 h-3" />}
        {labels[status]}
      </span>
    );
  };

  const totalAdvances = useMemo(() => {
    return advances.reduce((sum, adv) => sum + adv.advanceAmount, 0);
  }, [advances]);

  const totalRemaining = useMemo(() => {
    // ✅ FIX: Chỉ tính đơn còn nợ (remaining_amount > 0)
    return advances
      .filter((adv) => adv.remainingAmount > 0)
      .reduce((sum, adv) => sum + adv.remainingAmount, 0);
  }, [advances]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">
            Đang tải dữ liệu...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Quản lý Ứng lương
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Quản lý các khoản ứng lương và trả góp của nhân viên
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Tạo đơn ứng lương</span>
            </button>
          </div>

          {/* Employee-specific summary when filtered */}
          {employeeFilter !== "all" &&
            (() => {
              const selectedEmployee = activeEmployees.find(
                (emp) => emp.id === employeeFilter
              );
              const employeeAdvances = filteredAdvances;
              const employeeTotal = employeeAdvances.reduce(
                (sum, adv) => sum + adv.advanceAmount,
                0
              );
              const employeeRemaining = employeeAdvances.reduce(
                (sum, adv) => sum + adv.remainingAmount,
                0
              );
              const employeePaid = employeeAdvances.reduce(
                (sum, adv) => sum + adv.paidAmount,
                0
              );

              return (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 mb-6 border-2 border-blue-200 dark:border-blue-700">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        👤 {selectedEmployee?.name}
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        {selectedEmployee?.position} •{" "}
                        {selectedEmployee?.department}
                      </p>
                    </div>
                    <button
                      onClick={() => setEmployeeFilter("all")}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white/80 dark:bg-slate-800/80 rounded-lg p-4">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                        Tổng đã ứng
                      </p>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(employeeTotal)}
                      </p>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800/80 rounded-lg p-4">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                        Đã trả
                      </p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(employeePaid)}
                      </p>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800/80 rounded-lg p-4">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                        Còn nợ
                      </p>
                      <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                        {formatCurrency(employeeRemaining)}
                      </p>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800/80 rounded-lg p-4">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                        Số đơn
                      </p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">
                        {employeeAdvances.length}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Tổng ứng lương
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(totalAdvances)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Còn phải thu
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(totalRemaining)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Số đơn chờ duyệt
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {advances.filter((a) => a.status === "pending").length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-6 border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm nhân viên, lý do..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="all">Tất cả nhân viên</option>
              {activeEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="paid">Đã chi trả</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>
        </div>

        {/* Advances Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Nhân viên
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Ngày ứng
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Số tiền
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Nguồn
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Trả góp
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Còn lại
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredAdvances.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                    >
                      {searchQuery || statusFilter !== "all"
                        ? "Không tìm thấy đơn ứng lương nào"
                        : "Chưa có đơn ứng lương nào"}
                    </td>
                  </tr>
                ) : (
                  filteredAdvances.map((advance) => (
                    <tr
                      key={advance.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                      onClick={() => {
                        setSelectedAdvance(advance);
                        setShowDetailModal(true);
                      }}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {advance.employeeName ||
                              employees.find(
                                (emp) => emp.id === advance.employeeId
                              )?.name ||
                              advance.employeeId ||
                              "Chưa có tên"}
                          </div>
                          {advance.reason && (
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              {advance.reason}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {formatDate(advance.advanceDate)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(advance.advanceAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm">
                          {advance.paymentMethod === "cash"
                            ? "💵 Mặt"
                            : "🏦 CK"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {advance.isInstallment ? (
                          <div className="text-sm">
                            <div className="text-blue-600 dark:text-blue-400 font-medium">
                              {advance.installmentMonths} tháng
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 text-xs">
                              {formatCurrency(advance.monthlyDeduction || 0)}
                              /tháng
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                        {formatCurrency(advance.remainingAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(advance.status)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div
                          className="flex items-center justify-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {advance.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleApprove(advance.id)}
                                className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                title="Duyệt"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(advance.id)}
                                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                title="Từ chối"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {/* Nút Chi tiền ngay khi đơn đã được duyệt nhưng chưa chi */}
                          {advance.status === "approved" && advance.remainingAmount > 0 && (
                            <button
                              onClick={() => handleDisburse(advance)}
                              className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded font-medium"
                              title="Chi tiền ngay"
                            >
                              Chi tiền
                            </button>
                          )}
                          {/* Nút xóa - hiển thị cho tất cả trạng thái */}
                          <button
                            onClick={() => handleDelete(advance.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Tạo đơn ứng lương mới
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nhân viên <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.employeeId}
                  onChange={(e) =>
                    setFormData({ ...formData, employeeId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="">Chọn nhân viên...</option>
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.position} (
                      {formatCurrency(emp.baseSalary)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Số tiền ứng <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.advanceAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, advanceAmount: e.target.value })
                  }
                  placeholder="VD: 5000000"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
                {formData.advanceAmount && (
                  <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                    = {formatCurrency(parseFloat(formData.advanceAmount) || 0)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Lý do ứng lương
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  placeholder="VD: Đóng học phí cho con, chi phí y tế..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nguồn tiền <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={formData.paymentMethod === "cash"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paymentMethod: e.target.value as "cash" | "transfer",
                        })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      💵 Tiền mặt
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="transfer"
                      checked={formData.paymentMethod === "transfer"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paymentMethod: e.target.value as "cash" | "transfer",
                        })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      🏦 Chuyển khoản
                    </span>
                  </label>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isInstallment}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isInstallment: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Cho phép trả góp hàng tháng
                  </span>
                </label>

                {formData.isInstallment && (
                  <div className="mt-4 ml-8 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Số tháng trả góp
                      </label>
                      <select
                        value={formData.installmentMonths}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            installmentMonths: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      >
                        <option value="2">2 tháng</option>
                        <option value="3">3 tháng</option>
                        <option value="4">4 tháng</option>
                        <option value="5">5 tháng</option>
                        <option value="6">6 tháng</option>
                        <option value="12">12 tháng</option>
                      </select>
                    </div>

                    {formData.advanceAmount && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          💡 Sẽ trừ khoảng{" "}
                          <strong>
                            {formatCurrency(
                              Math.ceil(
                                parseFloat(formData.advanceAmount) /
                                  parseInt(formData.installmentMonths)
                              )
                            )}
                          </strong>
                          /tháng trong{" "}
                          <strong>{formData.installmentMonths} tháng</strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({
                    employeeId: "",
                    advanceAmount: "",
                    reason: "",
                    paymentMethod: "cash",
                    isInstallment: false,
                    installmentMonths: "3",
                  });
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateAdvance}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Tạo đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedAdvance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Chi tiết đơn ứng lương
              </h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedAdvance(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Nhân viên
                  </p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {selectedAdvance.employeeName ||
                      employees.find(
                        (emp) => emp.id === selectedAdvance.employeeId
                      )?.name ||
                      selectedAdvance.employeeId ||
                      "Chưa có tên"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Trạng thái
                  </p>
                  <div className="mt-1">
                    {getStatusBadge(selectedAdvance.status)}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Ngày ứng
                </p>
                <p className="text-base font-medium text-slate-900 dark:text-white">
                  {formatDate(selectedAdvance.advanceDate)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Nguồn tiền
                </p>
                <p className="text-base font-medium text-slate-900 dark:text-white">
                  {selectedAdvance.paymentMethod === "cash"
                    ? "💵 Tiền mặt"
                    : "🏦 Chuyển khoản"}
                </p>
              </div>

              {selectedAdvance.reason && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                    Lý do
                  </p>
                  <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3">
                    <p className="text-slate-900 dark:text-white">
                      {selectedAdvance.reason}
                    </p>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                      Số tiền ứng
                    </p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(selectedAdvance.advanceAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                      Đã trả
                    </p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(selectedAdvance.paidAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                      Còn lại
                    </p>
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(selectedAdvance.remainingAmount)}
                    </p>
                  </div>
                </div>
              </div>

              {selectedAdvance.isInstallment && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                    📅 Trả góp hàng tháng
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Số tháng
                      </p>
                      <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                        {selectedAdvance.installmentMonths} tháng
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Trừ hàng tháng
                      </p>
                      <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                        {formatCurrency(selectedAdvance.monthlyDeduction || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedAdvance.approvedBy && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Người duyệt
                  </p>
                  <p className="text-base font-medium text-slate-900 dark:text-white">
                    {selectedAdvance.approvedBy} -{" "}
                    {formatDate(selectedAdvance.approvedDate || "")}
                  </p>
                </div>
              )}

              {/* Payment form */}
              {selectedAdvance.remainingAmount > 0 &&
                (selectedAdvance.status === "approved" ||
                  selectedAdvance.status === "paid") && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    {!showPaymentForm ? (
                      <button
                        onClick={() => setShowPaymentForm(true)}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                      >
                        <DollarSign className="w-5 h-5" />
                        Trả tiền ứng
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-3">
                            💵 Trả tiền ứng lương
                          </p>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                                Số tiền trả{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                value={paymentAmount}
                                onChange={(e) =>
                                  setPaymentAmount(e.target.value)
                                }
                                placeholder={`Tối đa: ${formatCurrency(
                                  selectedAdvance.remainingAmount
                                )}`}
                                max={selectedAdvance.remainingAmount}
                                className="w-full px-3 py-2 border border-green-300 dark:border-green-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                              />
                              {paymentAmount && (
                                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                                  ={" "}
                                  {formatCurrency(
                                    parseFloat(paymentAmount) || 0
                                  )}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                                Ghi chú
                              </label>
                              <input
                                type="text"
                                value={paymentNotes}
                                onChange={(e) =>
                                  setPaymentNotes(e.target.value)
                                }
                                placeholder="VD: Trả lần 1, trừ lương tháng 12..."
                                className="w-full px-3 py-2 border border-green-300 dark:border-green-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setShowPaymentForm(false);
                              setPaymentAmount("");
                              setPaymentNotes("");
                            }}
                            className="flex-1 px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={handleMakePayment}
                            disabled={
                              !paymentAmount || parseFloat(paymentAmount) <= 0
                            }
                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-medium"
                          >
                            Xác nhận trả
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedAdvance(null);
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
