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
    User,
    ChevronRight,
    Wallet
} from "lucide-react";
import { useAppContext } from "../../contexts/AppContext";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import type { EmployeeAdvance } from "../../types";
import { formatCurrency, formatDate } from "../../utils/format";
import { showToast } from "../../utils/toast";
import {
    useEmployeeAdvances,
    useCreateEmployeeAdvance,
    useUpdateEmployeeAdvance,
    useDeleteEmployeeAdvance,
} from "../../hooks/useEmployeeAdvanceRepository";

export const EmployeeAdvanceManagerMobile: React.FC = () => {
    const { employees, currentBranchId } = useAppContext();
    const { profile } = useAuth();
    const queryClient = useQueryClient();

    // Fetch data
    const { data: advances = [], isLoading } = useEmployeeAdvances(currentBranchId);
    const { mutateAsync: createAdvance } = useCreateEmployeeAdvance();
    const { mutateAsync: updateAdvance } = useUpdateEmployeeAdvance();
    const { mutateAsync: deleteAdvance } = useDeleteEmployeeAdvance();

    // State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedAdvance, setSelectedAdvance] = useState<EmployeeAdvance | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | EmployeeAdvance["status"]>("all");

    // Payment form state
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentNotes, setPaymentNotes] = useState("");

    // Create form state
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
                advance.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                advance.reason?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === "all" || advance.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [advances, searchQuery, statusFilter]);

    // Summary calculations
    const totalAdvances = useMemo(() => {
        return advances.reduce((sum, adv) => sum + adv.advanceAmount, 0);
    }, [advances]);

    const totalRemaining = useMemo(() => {
        // ✅ FIX: Chỉ tính đơn còn nợ (remaining_amount > 0)
        return advances
            .filter((adv) => adv.remainingAmount > 0)
            .reduce((sum, adv) => sum + adv.remainingAmount, 0);
    }, [advances]);

    const pendingCount = useMemo(() => {
        return advances.filter((a) => a.status === "pending").length;
    }, [advances]);

    // Handlers
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
        const installmentMonths = formData.isInstallment ? parseInt(formData.installmentMonths) : 0;
        const monthlyDeduction = formData.isInstallment ? Math.ceil(advanceAmount / installmentMonths) : 0;

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
                installmentMonths: formData.isInstallment ? installmentMonths : undefined,
                monthlyDeduction: formData.isInstallment ? monthlyDeduction : undefined,
                remainingAmount: advanceAmount,
                paidAmount: 0,
                branchId: currentBranchId,
            });

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
                `Đã duyệt đơn ứng lương cho ${advance.employeeName}. Vui lòng chi tiền thực tế trong mục chi tiết.`
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
                updates: { status: "rejected" },
            });
            showToast.info("Đã từ chối đơn ứng lương");
        } catch (error) { }
    };

    const handleDisburse = async (advance: EmployeeAdvance) => {
        if (!confirm(`Chi ${formatCurrency(advance.advanceAmount)} ứng lương cho ${advance.employeeName}?\n\nTiền sẽ được ghi vào sổ quỹ. Nhân viên vẫn cần hoàn trả số tiền này.`)) return;
        try {
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

    const handleMakePayment = async () => {
        if (!selectedAdvance || !paymentAmount) return;
        const amount = parseFloat(paymentAmount);

        try {
            await supabase.from("employee_advance_payments").insert({
                advance_id: selectedAdvance.id,
                employee_id: selectedAdvance.employeeId,
                amount: amount,
                payment_date: new Date().toISOString(),
                payment_month: new Date().toISOString().slice(0, 7),
                notes: paymentNotes || `Nhân viên trả tiền ứng`,
                branch_id: currentBranchId,
            });

            await supabase.from("cash_transactions").insert({
                id: `REPAY-${selectedAdvance.id}-${Date.now()}`,
                type: "income",
                category: "employee_advance_repayment",
                amount: amount,
                date: new Date().toISOString(),
                description: `Trả tiền ứng - ${selectedAdvance.employeeName}`,
                branchid: currentBranchId,
                paymentsource: selectedAdvance.paymentMethod === "cash" ? "cash" : "bank",
            });

            queryClient.invalidateQueries({ queryKey: ["employee-advances"] });
            setPaymentAmount("");
            setPaymentNotes("");
            setShowPaymentForm(false);
            setShowDetailModal(false);
            setSelectedAdvance(null);
            showToast.success("Đã ghi nhận thanh toán");
        } catch (error) {
            showToast.error("Đã xảy ra lỗi");
        }
    };

    const getStatusBadge = (status: EmployeeAdvance["status"]) => {
        const styles = {
            pending: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
            approved: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
            rejected: "bg-red-500/10 text-red-400 border border-red-500/20",
            paid: "bg-green-500/10 text-green-400 border border-green-500/20",
        };
        const labels = {
            pending: "Chờ duyệt",
            approved: "Đã duyệt",
            rejected: "Từ chối",
            paid: "Đã chi trả",
        };
        return (
            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${styles[status]}`}>
                {labels[status]}
            </span>
        );
    };

    return (
        <div className="pb-24">
            {/* Stats Cards - Horizontal Scroll */}
            <div className="px-4 py-4 overflow-x-auto no-scrollbar flex gap-3 snap-x">
                <div className="snap-center shrink-0 w-[85%] bg-gradient-to-br from-blue-600 to-blue-800 p-4 rounded-2xl shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-100 text-xs font-medium">Tổng ứng lương</span>
                        <DollarSign className="w-5 h-5 text-blue-200" />
                    </div>
                    <div className="text-2xl font-bold text-white">{formatCurrency(totalAdvances)}</div>
                </div>

                <div className="snap-center shrink-0 w-[85%] bg-[#1e1e2d] border border-slate-700 p-4 rounded-2xl shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-xs font-medium">Còn phải thu</span>
                        <TrendingDown className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold text-amber-500">{formatCurrency(totalRemaining)}</div>
                </div>

                <div className="snap-center shrink-0 w-[85%] bg-[#1e1e2d] border border-slate-700 p-4 rounded-2xl shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-xs font-medium">Chờ duyệt</span>
                        <Clock className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-white">{pendingCount} <span className="text-sm font-normal text-slate-500">đơn</span></div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="px-4 mb-4 flex gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-[#1e1e2d] border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2.5 bg-[#1e1e2d] border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">Tất cả</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="approved">Đã duyệt</option>
                    <option value="paid">Đã chi</option>
                </select>
            </div>

            {/* List */}
            <div className="px-4 space-y-3">
                {filteredAdvances.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">Chưa có đơn ứng lương nào</div>
                ) : (
                    filteredAdvances.map((advance) => (
                        <div
                            key={advance.id}
                            onClick={() => {
                                setSelectedAdvance(advance);
                                setShowDetailModal(true);
                            }}
                            className="bg-[#1e1e2d] border border-slate-700/50 rounded-xl p-4 active:scale-[0.99] transition-transform"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                                        <User className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm">{advance.employeeName}</h4>
                                        <div className="text-xs text-slate-400 mt-0.5">{formatDate(advance.advanceDate)}</div>
                                    </div>
                                </div>
                                {getStatusBadge(advance.status)}
                            </div>

                            <div className="flex justify-between items-end mb-3">
                                <div>
                                    <div className="text-[10px] text-slate-500 uppercase mb-0.5">Số tiền ứng</div>
                                    <div className="text-lg font-bold text-white">{formatCurrency(advance.advanceAmount)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-500 uppercase mb-0.5">Còn nợ</div>
                                    <div className="text-lg font-bold text-amber-500">{formatCurrency(advance.remainingAmount)}</div>
                                </div>
                            </div>

                            {advance.status === "pending" && (
                                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700/50">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleApprove(advance.id);
                                        }}
                                        className="flex-1 py-2 bg-blue-600/10 text-blue-400 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-blue-600/20"
                                    >
                                        Duyệt
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleReject(advance.id);
                                        }}
                                        className="flex-1 py-2 bg-red-600/10 text-red-400 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-600/20"
                                    >
                                        Từ chối
                                    </button>
                                </div>
                            )}

                            {advance.status === "approved" && advance.remainingAmount > 0 && (
                                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700/50">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDisburse(advance);
                                        }}
                                        className="flex-1 py-2 bg-green-600/10 text-green-400 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-green-600/20"
                                    >
                                        Chi trả
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* FAB */}
            <button
                onClick={() => setShowCreateModal(true)}
                className="fixed bottom-24 right-4 w-14 h-14 bg-blue-600 rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center text-white z-10 active:scale-90 transition-transform"
            >
                <Plus className="w-7 h-7" />
            </button>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50 modal-bottom-safe">
                    <div className="bg-[#1e1e2d] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md border-t sm:border border-slate-700 p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-white mb-6">Tạo đơn ứng lương</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase">Nhân viên</label>
                                <select
                                    value={formData.employeeId}
                                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Chọn nhân viên...</option>
                                    {activeEmployees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase">Số tiền ứng</label>
                                <input
                                    type="number"
                                    value={formData.advanceAmount}
                                    onChange={(e) => setFormData({ ...formData, advanceAmount: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                                    placeholder="0"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase">Lý do</label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                                    rows={3}
                                />
                            </div>

                            <div className="flex items-center gap-3 py-2">
                                <input
                                    type="checkbox"
                                    checked={formData.isInstallment}
                                    onChange={(e) => setFormData({ ...formData, isInstallment: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-600"
                                />
                                <span className="text-sm text-white">Trả góp hàng tháng</span>
                            </div>

                            {formData.isInstallment && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase">Số tháng</label>
                                    <select
                                        value={formData.installmentMonths}
                                        onChange={(e) => setFormData({ ...formData, installmentMonths: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                                    >
                                        {[2, 3, 4, 5, 6, 12].map(m => (
                                            <option key={m} value={m}>{m} tháng</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-bold"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleCreateAdvance}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                                >
                                    Tạo đơn
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedAdvance && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50 modal-bottom-safe">
                    <div className="bg-[#1e1e2d] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md border-t sm:border border-slate-700 p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-white">{selectedAdvance.employeeName}</h3>
                                <p className="text-sm text-slate-400">{formatDate(selectedAdvance.advanceDate)}</p>
                            </div>
                            {getStatusBadge(selectedAdvance.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-800/50 p-3 rounded-xl">
                                <div className="text-xs text-slate-500 uppercase mb-1">Đã ứng</div>
                                <div className="text-lg font-bold text-white">{formatCurrency(selectedAdvance.advanceAmount)}</div>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-xl">
                                <div className="text-xs text-slate-500 uppercase mb-1">Còn nợ</div>
                                <div className="text-lg font-bold text-amber-500">{formatCurrency(selectedAdvance.remainingAmount)}</div>
                            </div>
                        </div>

                        {selectedAdvance.status === "paid" && selectedAdvance.remainingAmount > 0 && (
                            <div className="space-y-3">
                                {!showPaymentForm ? (
                                    <button
                                        onClick={() => setShowPaymentForm(true)}
                                        className="w-full py-3 bg-green-600 text-white rounded-xl font-bold"
                                    >
                                        Trả nợ ứng lương
                                    </button>
                                ) : (
                                    <div className="bg-slate-800 p-4 rounded-xl space-y-3">
                                        <h4 className="font-bold text-white text-sm">Thanh toán nợ</h4>
                                        <input
                                            type="number"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            placeholder="Số tiền trả..."
                                            className="w-full px-3 py-2 bg-[#1e1e2d] border border-slate-600 rounded-lg text-white"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setShowPaymentForm(false)}
                                                className="flex-1 py-2 bg-slate-700 text-white rounded-lg text-sm"
                                            >
                                                Hủy
                                            </button>
                                            <button
                                                onClick={handleMakePayment}
                                                className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-bold"
                                            >
                                                Xác nhận
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => setShowDetailModal(false)}
                            className="w-full py-3 mt-4 bg-slate-800 text-slate-400 rounded-xl font-medium"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
