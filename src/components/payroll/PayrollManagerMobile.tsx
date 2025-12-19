import React, { useState, useMemo } from "react";
import { useAppContext } from "../../contexts/AppContext";
import { formatCurrency, formatDate } from "../../utils/format";
import { useCreateCashTxRepo } from "../../hooks/useCashTransactionsRepository";
import { useUpdatePaymentSourceBalanceRepo } from "../../hooks/usePaymentSourcesRepository";
import { GeneratePayrollModal } from "./PayrollManager";
import { Plus, Calendar, DollarSign, User, CheckCircle, XCircle, Wallet, CreditCard } from "lucide-react";
import { showToast } from "../../utils/toast";

export const PayrollManagerMobile: React.FC = () => {
    const {
        employees,
        payrollRecords,
        upsertPayrollRecord,
        currentBranchId,
    } = useAppContext();
    const { mutateAsync: createCashTxAsync } = useCreateCashTxRepo();
    const { mutateAsync: updatePaymentSourceBalanceAsync } = useUpdatePaymentSourceBalanceRepo();

    const [selectedMonth, setSelectedMonth] = useState(
        new Date().toISOString().slice(0, 7) // YYYY-MM
    );
    const [showPayrollModal, setShowPayrollModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);

    // Filter payroll by selected month
    const monthlyPayroll = useMemo(() => {
        return payrollRecords.filter((p) => p.month === selectedMonth);
    }, [payrollRecords, selectedMonth]);

    // Calculate summary
    const summary = useMemo(() => {
        const totalBaseSalary = monthlyPayroll.reduce((sum, p) => sum + p.baseSalary, 0);
        const totalNetSalary = monthlyPayroll.reduce((sum, p) => sum + p.netSalary, 0);
        const paidCount = monthlyPayroll.filter((p) => p.paymentStatus === "paid").length;
        const pendingCount = monthlyPayroll.filter((p) => p.paymentStatus === "pending").length;

        return {
            totalBaseSalary,
            totalNetSalary,
            paidCount,
            pendingCount,
        };
    }, [monthlyPayroll]);

    const handleMarkAsPaid = async (recordId: string, paymentMethod: "cash" | "bank") => {
        const record = payrollRecords.find((p) => p.id === recordId);
        if (!record) return;

        try {
            // 1) Cập nhật trạng thái bảng lương
            upsertPayrollRecord({
                ...record,
                paymentStatus: "paid",
                paymentDate: new Date().toISOString(),
                paymentMethod,
            });

            // 2) Ghi giao dịch chi trong sổ quỹ
            await createCashTxAsync({
                type: "expense",
                amount: record.netSalary,
                branchId: currentBranchId,
                paymentSourceId: paymentMethod,
                category: "salary",
                payrollRecordId: record.id,
                recipient: record.employeeName,
                notes: `Trả lương tháng ${selectedMonth} - ${record.employeeName}`,
                date: new Date().toISOString(),
            });

            // 3) Cập nhật số dư nguồn tiền
            await updatePaymentSourceBalanceAsync({
                id: paymentMethod,
                branchId: currentBranchId,
                delta: -record.netSalary,
            });

            showToast.success(`Đã trả lương cho ${record.employeeName}`);
        } catch (error) {
            showToast.error("Có lỗi xảy ra khi trả lương");
        }
    };

    return (
        <div className="pb-20">
            {/* Header & Month Selector */}
            <div className="px-4 py-3 space-y-3">
                <div className="flex items-center gap-3 bg-[#1e1e2d] p-2 rounded-xl border border-slate-700">
                    <Calendar className="w-5 h-5 text-slate-400 ml-2" />
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-transparent text-white text-sm font-medium focus:outline-none w-full"
                    />
                </div>

                {monthlyPayroll.length === 0 && (
                    <button
                        onClick={() => setShowPayrollModal(true)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Tính lương tháng {selectedMonth.split("-")[1]}
                    </button>
                )}
            </div>

            {/* Summary Cards - Horizontal Scroll */}
            {monthlyPayroll.length > 0 && (
                <div className="px-4 mb-4 overflow-x-auto no-scrollbar flex gap-3 snap-x">
                    <div className="snap-center shrink-0 w-[70vw] bg-gradient-to-br from-blue-600 to-blue-800 p-4 rounded-2xl shadow-lg">
                        <p className="text-blue-100 text-xs font-medium mb-1">Tổng thực nhận</p>
                        <h3 className="text-2xl font-bold text-white">
                            {formatCurrency(summary.totalNetSalary)}
                        </h3>
                        <p className="text-blue-200 text-xs mt-1">Lương tháng {selectedMonth}</p>
                    </div>
                    <div className="snap-center shrink-0 w-[40vw] bg-[#1e1e2d] p-4 rounded-2xl border border-slate-700">
                        <p className="text-slate-400 text-xs font-medium mb-1">Đã trả</p>
                        <h3 className="text-xl font-bold text-green-500">
                            {summary.paidCount} <span className="text-sm text-slate-500 font-normal">NV</span>
                        </h3>
                    </div>
                    <div className="snap-center shrink-0 w-[40vw] bg-[#1e1e2d] p-4 rounded-2xl border border-slate-700">
                        <p className="text-slate-400 text-xs font-medium mb-1">Chưa trả</p>
                        <h3 className="text-xl font-bold text-orange-500">
                            {summary.pendingCount} <span className="text-sm text-slate-500 font-normal">NV</span>
                        </h3>
                    </div>
                </div>
            )}

            {/* Payroll List */}
            <div className="px-4 space-y-3">
                {monthlyPayroll.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                            <DollarSign className="w-8 h-8 text-slate-600" />
                        </div>
                        <p className="text-slate-500">Chưa có bảng lương tháng này</p>
                    </div>
                ) : (
                    monthlyPayroll.map((record) => (
                        <div
                            key={record.id}
                            className="bg-[#1e1e2d] border border-slate-700/50 rounded-xl p-4"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                                        <User className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white">{record.employeeName}</h4>
                                        <div className="text-xs text-slate-400 mt-0.5">
                                            Lương CB: {formatCurrency(record.baseSalary)}
                                        </div>
                                    </div>
                                </div>
                                <span
                                    className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${record.paymentStatus === "paid"
                                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                        : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                        }`}
                                >
                                    {record.paymentStatus === "paid" ? "Đã trả" : "Chưa trả"}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                                    <div className="text-[10px] text-green-400 mb-0.5">Thưởng</div>
                                    <div className="text-xs font-bold text-white">+{formatCurrency(record.bonus).replace("₫", "")}</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                                    <div className="text-[10px] text-red-400 mb-0.5">Phạt</div>
                                    <div className="text-xs font-bold text-white">-{formatCurrency(record.deduction).replace("₫", "")}</div>
                                </div>
                                <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-2 text-center">
                                    <div className="text-[10px] text-blue-400 mb-0.5">Thực nhận</div>
                                    <div className="text-xs font-bold text-blue-400">{formatCurrency(record.netSalary).replace("₫", "")}</div>
                                </div>
                            </div>

                            {record.paymentStatus === "pending" && (
                                <button
                                    onClick={() => {
                                        setSelectedRecord(record);
                                        setShowPaymentModal(true);
                                    }}
                                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Xác nhận trả lương
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Generate Payroll Modal */}
            {showPayrollModal && (
                <GeneratePayrollModal
                    employees={employees.filter((e) => e.status === "active")}
                    month={selectedMonth}
                    onClose={() => setShowPayrollModal(false)}
                    onSave={(records) => {
                        records.forEach((record) => upsertPayrollRecord(record));
                        setShowPayrollModal(false);
                        showToast.success("Đã tạo bảng lương thành công");
                    }}
                />
            )}

            {/* Payment Method Modal */}
            {showPaymentModal && selectedRecord && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50">
                    <div className="bg-[#1e1e2d] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md border-t sm:border border-slate-700 p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Xác nhận trả lương</h3>

                        <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
                            <p className="text-sm text-slate-400 mb-1">Nhân viên</p>
                            <p className="text-lg font-bold text-white mb-2">{selectedRecord.employeeName}</p>
                            <div className="h-[1px] bg-slate-700 my-2"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">Thực nhận</span>
                                <span className="text-xl font-bold text-blue-400">{formatCurrency(selectedRecord.netSalary)}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    handleMarkAsPaid(selectedRecord.id, "cash");
                                    setShowPaymentModal(false);
                                    setSelectedRecord(null);
                                }}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <Wallet className="w-5 h-5" />
                                Tiền mặt
                            </button>
                            <button
                                onClick={() => {
                                    handleMarkAsPaid(selectedRecord.id, "bank");
                                    setShowPaymentModal(false);
                                    setSelectedRecord(null);
                                }}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <CreditCard className="w-5 h-5" />
                                Chuyển khoản
                            </button>
                            <button
                                onClick={() => {
                                    setShowPaymentModal(false);
                                    setSelectedRecord(null);
                                }}
                                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium"
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
