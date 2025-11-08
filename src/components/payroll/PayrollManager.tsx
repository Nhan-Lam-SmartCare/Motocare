import React, { useState, useMemo } from "react";
import { useAppContext } from "../../contexts/AppContext";
import { formatCurrency, formatDate } from "../../utils/format";
import type { Employee, PayrollRecord } from "../../types";
import { PlusIcon } from "../Icons";

const PayrollManager: React.FC = () => {
  const {
    employees,
    payrollRecords,
    upsertEmployee,
    upsertPayrollRecord,
    currentBranchId,
    setCashTransactions,
    cashTransactions,
    setPaymentSources,
    paymentSources,
  } = useAppContext();
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );
  const [activeTab, setActiveTab] = useState<"employees" | "payroll">(
    "employees"
  );
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);

  // Filter payroll by selected month
  const monthlyPayroll = useMemo(() => {
    return payrollRecords.filter((p) => p.month === selectedMonth);
  }, [payrollRecords, selectedMonth]);

  // Calculate summary
  const summary = useMemo(() => {
    const totalEmployees = employees.filter(
      (e) => e.status === "active"
    ).length;
    const totalBaseSalary = monthlyPayroll.reduce(
      (sum, p) => sum + p.baseSalary,
      0
    );
    const totalNetSalary = monthlyPayroll.reduce(
      (sum, p) => sum + p.netSalary,
      0
    );
    const paidCount = monthlyPayroll.filter(
      (p) => p.paymentStatus === "paid"
    ).length;
    const pendingCount = monthlyPayroll.filter(
      (p) => p.paymentStatus === "pending"
    ).length;

    return {
      totalEmployees,
      totalBaseSalary,
      totalNetSalary,
      paidCount,
      pendingCount,
    };
  }, [employees, monthlyPayroll]);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Quản lý lương
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Quản lý nhân viên và tính lương
              </p>
            </div>
            <button
              onClick={() =>
                activeTab === "employees"
                  ? setShowAddEmployeeModal(true)
                  : setShowPayrollModal(true)
              }
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              <span>
                {activeTab === "employees"
                  ? "Thêm nhân viên"
                  : "Tính lương tháng"}
              </span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("employees")}
              className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
                activeTab === "employees"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Danh sách nhân viên (
              {employees.filter((e) => e.status === "active").length})
            </button>
            <button
              onClick={() => setActiveTab("payroll")}
              className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
                activeTab === "payroll"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Bảng lương
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "employees" ? (
          <EmployeeList
            employees={employees}
            onEdit={(emp) => console.log("Edit", emp)}
          />
        ) : (
          <>
            {/* Month Selector & Summary */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Chọn tháng
                  </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-2">
                    Tổng lương cơ bản
                  </div>
                  <div className="text-blue-900 dark:text-blue-100 text-2xl font-bold">
                    {formatCurrency(summary.totalBaseSalary)}
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="text-green-600 dark:text-green-400 text-sm font-medium mb-2">
                    Tổng lương thực nhận
                  </div>
                  <div className="text-green-900 dark:text-green-100 text-2xl font-bold">
                    {formatCurrency(summary.totalNetSalary)}
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                  <div className="text-amber-600 dark:text-amber-400 text-sm font-medium mb-2">
                    Đã trả lương
                  </div>
                  <div className="text-amber-900 dark:text-amber-100 text-2xl font-bold">
                    {summary.paidCount}
                  </div>
                  <div className="text-amber-600 dark:text-amber-400 text-xs mt-1">
                    nhân viên
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                  <div className="text-orange-600 dark:text-orange-400 text-sm font-medium mb-2">
                    Chưa trả
                  </div>
                  <div className="text-orange-900 dark:text-orange-100 text-2xl font-bold">
                    {summary.pendingCount}
                  </div>
                  <div className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                    nhân viên
                  </div>
                </div>
              </div>
            </div>

            {/* Payroll Table */}
            <PayrollTable
              payroll={monthlyPayroll}
              onMarkAsPaid={(recordId, paymentMethod) => {
                const record = payrollRecords.find((p) => p.id === recordId);
                if (record) {
                  // Cập nhật trạng thái bảng lương
                  upsertPayrollRecord({
                    ...record,
                    paymentStatus: "paid",
                    paymentDate: new Date().toISOString(),
                    paymentMethod,
                  });

                  // Tự động tạo giao dịch chi trong Sổ quỹ
                  const cashTxId = `CT-${Date.now()}`;
                  const cashTransaction = {
                    id: cashTxId,
                    type: "expense" as const,
                    date: new Date().toISOString(),
                    amount: record.netSalary,
                    recipient: record.employeeName,
                    notes: `Trả lương tháng ${selectedMonth} - ${record.employeeName}`,
                    paymentSourceId: paymentMethod,
                    branchId: currentBranchId,
                    category: "salary" as const,
                  };

                  setCashTransactions([cashTransaction, ...cashTransactions]);

                  // Cập nhật số dư nguồn tiền
                  setPaymentSources(
                    paymentSources.map((ps) =>
                      ps.id === paymentMethod
                        ? {
                            ...ps,
                            balance: {
                              ...ps.balance,
                              [currentBranchId]:
                                (ps.balance[currentBranchId] || 0) -
                                record.netSalary,
                            },
                          }
                        : ps
                    )
                  );
                }
              }}
            />
          </>
        )}
      </div>

      {/* Modals */}
      {showAddEmployeeModal && (
        <AddEmployeeModal
          onClose={() => setShowAddEmployeeModal(false)}
          onSave={(emp) => {
            upsertEmployee(emp);
            setShowAddEmployeeModal(false);
          }}
        />
      )}

      {showPayrollModal && (
        <GeneratePayrollModal
          employees={employees.filter((e) => e.status === "active")}
          month={selectedMonth}
          onClose={() => setShowPayrollModal(false)}
          onSave={(records) => {
            records.forEach((record) => upsertPayrollRecord(record));
            setShowPayrollModal(false);
          }}
        />
      )}
    </div>
  );
};

// Employee List Component
const EmployeeList: React.FC<{
  employees: Employee[];
  onEdit: (emp: Employee) => void;
}> = ({ employees, onEdit }) => {
  if (employees.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
        <p className="text-slate-500 dark:text-slate-400">
          Chưa có nhân viên nào
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {employees.map((emp) => (
        <div
          key={emp.id}
          className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {emp.name}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    emp.status === "active"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  {emp.status === "active" ? "Đang làm" : "Nghỉ việc"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">
                    Chức vụ:{" "}
                  </span>
                  <span className="text-slate-900 dark:text-white font-medium">
                    {emp.position}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">
                    Lương:{" "}
                  </span>
                  <span className="text-slate-900 dark:text-white font-medium">
                    {formatCurrency(emp.baseSalary)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">
                    SĐT:{" "}
                  </span>
                  <span className="text-slate-900 dark:text-white font-medium">
                    {emp.phone || "--"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onEdit(emp)}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg text-sm font-medium transition-colors"
            >
              Sửa
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Payroll Table Component
const PayrollTable: React.FC<{
  payroll: PayrollRecord[];
  onMarkAsPaid?: (recordId: string, paymentMethod: "cash" | "bank") => void;
}> = ({ payroll, onMarkAsPaid }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(
    null
  );
  if (payroll.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
        <p className="text-slate-500 dark:text-slate-400">
          Chưa có bảng lương cho tháng này
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
              Nhân viên
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
              Lương CB
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
              Thưởng
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
              Phạt
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
              BHXH
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
              Thuế
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
              Thực nhận
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
          {payroll.map((record) => (
            <tr
              key={record.id}
              className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">
                {record.employeeName}
              </td>
              <td className="px-4 py-3 text-right text-slate-900 dark:text-white">
                {formatCurrency(record.baseSalary)}
              </td>
              <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                +{formatCurrency(record.bonus)}
              </td>
              <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                -{formatCurrency(record.deduction)}
              </td>
              <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                {formatCurrency(record.socialInsurance)}
              </td>
              <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                {formatCurrency(record.personalIncomeTax)}
              </td>
              <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-bold">
                {formatCurrency(record.netSalary)}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    record.paymentStatus === "paid"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}
                >
                  {record.paymentStatus === "paid" ? "Đã trả" : "Chưa trả"}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                {record.paymentStatus === "pending" && onMarkAsPaid && (
                  <button
                    onClick={() => {
                      setSelectedRecord(record);
                      setShowPaymentModal(true);
                    }}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-medium transition-colors"
                  >
                    Đã trả lương
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Payment Method Modal */}
      {showPaymentModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Xác nhận trả lương
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Nhân viên
                </div>
                <div className="text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedRecord.employeeName}
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {formatCurrency(selectedRecord.netSalary)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Hình thức thanh toán
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      if (onMarkAsPaid) {
                        onMarkAsPaid(selectedRecord.id, "cash");
                      }
                      setShowPaymentModal(false);
                      setSelectedRecord(null);
                    }}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    💵 Tiền mặt
                  </button>
                  <button
                    onClick={() => {
                      if (onMarkAsPaid) {
                        onMarkAsPaid(selectedRecord.id, "bank");
                      }
                      setShowPaymentModal(false);
                      setSelectedRecord(null);
                    }}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    🏦 Chuyển khoản
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedRecord(null);
                }}
                className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add Employee Modal
const AddEmployeeModal: React.FC<{
  onClose: () => void;
  onSave: (emp: Partial<Employee>) => void;
}> = ({ onClose, onSave }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [baseSalary, setBaseSalary] = useState("0");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newEmployee = {
      name,
      phone,
      position,
      baseSalary: parseFloat(baseSalary),
      startDate: new Date(startDate).toISOString(),
      status: "active" as const,
    };

    onSave(newEmployee);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Thêm nhân viên mới
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Họ và tên *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Số điện thoại
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Chức vụ *
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Ví dụ: Kỹ thuật viên, Nhân viên bán hàng..."
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Lương cơ bản *
            </label>
            <input
              type="number"
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Ngày vào làm *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Thêm nhân viên
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Generate Payroll Modal
const GeneratePayrollModal: React.FC<{
  employees: Employee[];
  month: string;
  onClose: () => void;
  onSave: (records: PayrollRecord[]) => void;
}> = ({ employees, month, onClose, onSave }) => {
  const [payrollData, setPayrollData] = useState<
    Array<{
      employeeId: string;
      employeeName: string;
      baseSalary: number;
      bonus: number;
      deduction: number;
    }>
  >(
    employees.map((emp) => ({
      employeeId: emp.id,
      employeeName: emp.name,
      baseSalary: emp.baseSalary,
      bonus: 0,
      deduction: 0,
    }))
  );

  const handleBonusChange = (employeeId: string, value: string) => {
    setPayrollData((prev) =>
      prev.map((item) =>
        item.employeeId === employeeId
          ? { ...item, bonus: parseFloat(value) || 0 }
          : item
      )
    );
  };

  const handleDeductionChange = (employeeId: string, value: string) => {
    setPayrollData((prev) =>
      prev.map((item) =>
        item.employeeId === employeeId
          ? { ...item, deduction: parseFloat(value) || 0 }
          : item
      )
    );
  };

  const calculateNetSalary = (
    baseSalary: number,
    bonus: number,
    deduction: number
  ) => {
    return baseSalary + bonus - deduction;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const records: PayrollRecord[] = payrollData.map((data) => ({
      id: `PAY-${month}-${data.employeeId}`,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      month,
      baseSalary: data.baseSalary,
      allowances: 0,
      bonus: data.bonus,
      deduction: data.deduction,
      workDays: 26,
      standardWorkDays: 26,
      socialInsurance: 0,
      healthInsurance: 0,
      unemploymentInsurance: 0,
      personalIncomeTax: 0,
      netSalary: calculateNetSalary(
        data.baseSalary,
        data.bonus,
        data.deduction
      ),
      paymentStatus: "pending" as const,
      paymentDate: undefined,
      notes: "",
      branchId: "main",
      created_at: new Date().toISOString(),
    }));

    onSave(records);
  };

  const totalBaseSalary = payrollData.reduce(
    (sum, item) => sum + item.baseSalary,
    0
  );
  const totalBonus = payrollData.reduce((sum, item) => sum + item.bonus, 0);
  const totalDeduction = payrollData.reduce(
    (sum, item) => sum + item.deduction,
    0
  );
  const totalNetSalary = payrollData.reduce(
    (sum, item) =>
      sum + calculateNetSalary(item.baseSalary, item.bonus, item.deduction),
    0
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-5xl w-full border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Tính lương tháng {month}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {employees.length} nhân viên
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Nhân viên
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Lương CB
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Thưởng
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Phạt
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Thực nhận
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {payrollData.map((item) => (
                    <tr
                      key={item.employeeId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">
                        {item.employeeName}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-white">
                        {formatCurrency(item.baseSalary)}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.bonus}
                          onChange={(e) =>
                            handleBonusChange(item.employeeId, e.target.value)
                          }
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-right text-slate-900 dark:text-white"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.deduction}
                          onChange={(e) =>
                            handleDeductionChange(
                              item.employeeId,
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-right text-slate-900 dark:text-white"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-bold">
                        {formatCurrency(
                          calculateNetSalary(
                            item.baseSalary,
                            item.bonus,
                            item.deduction
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-700 border-t-2 border-slate-300 dark:border-slate-600">
                  <tr>
                    <td className="px-4 py-3 text-slate-900 dark:text-white font-bold">
                      TỔNG CỘNG
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900 dark:text-white font-bold">
                      {formatCurrency(totalBaseSalary)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-bold">
                      {formatCurrency(totalBonus)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-bold">
                      {formatCurrency(totalDeduction)}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-bold text-lg">
                      {formatCurrency(totalNetSalary)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Tạo bảng lương
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PayrollManager;
