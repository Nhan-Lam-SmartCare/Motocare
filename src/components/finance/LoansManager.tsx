import React, { useState, useMemo } from "react";
import { useAppContext } from "../../contexts/AppContext";
import { formatCurrency, formatDate } from "../../utils/format";
import type { Loan, LoanPayment } from "../../types";
import { PlusIcon } from "../Icons";
import {
  useLoansRepo,
  useCreateLoanRepo,
  useUpdateLoanRepo,
  useDeleteLoanRepo,
  useLoanPaymentsRepo,
  useCreateLoanPaymentRepo,
} from "../../hooks/useLoansRepository";
import { useUpdatePaymentSourceBalanceRepo } from "../../hooks/usePaymentSourcesRepository";
import { showToast } from "../../utils/toast";
import { createCashTransaction } from "../../lib/repository/cashTransactionsRepository";

const LoansManager: React.FC = () => {
  const {
    currentBranchId,
    setCashTransactions,
    cashTransactions,
    setPaymentSources,
    paymentSources,
  } = useAppContext();

  // Fetch loans from Supabase
  const { data: loans = [], isLoading: loadingLoans } = useLoansRepo();
  const { data: loanPayments = [], isLoading: loadingPayments } =
    useLoanPaymentsRepo();
  const createLoan = useCreateLoanRepo();
  const updateLoan = useUpdateLoanRepo();
  const deleteLoan = useDeleteLoanRepo();
  const createLoanPayment = useCreateLoanPaymentRepo();
  const updatePaymentSourceBalanceRepo = useUpdatePaymentSourceBalanceRepo();
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [showEditLoanModal, setShowEditLoanModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);

  // Calculate summary
  const summary = useMemo(() => {
    const totalLoans = loans.reduce((sum, loan) => sum + loan.principal, 0);
    const totalRemaining = loans.reduce(
      (sum, loan) => sum + loan.remainingAmount,
      0
    );
    const totalPaid = totalLoans - totalRemaining;
    const activeLoans = loans.filter((l) => l.status === "active").length;
    const overdueLoans = loans.filter((l) => l.status === "overdue").length;

    return {
      totalLoans,
      totalRemaining,
      totalPaid,
      activeLoans,
      overdueLoans,
    };
  }, [loans]);

  // Group loans by status
  const groupedLoans = useMemo(() => {
    return {
      active: loans.filter((l) => l.status === "active"),
      overdue: loans.filter((l) => l.status === "overdue"),
      paid: loans.filter((l) => l.status === "paid"),
    };
  }, [loans]);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Quản lý vốn & vay
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Theo dõi các khoản vay và lịch trả nợ
            </p>
          </div>
          <button
            onClick={() => setShowAddLoanModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Thêm khoản vay</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-3 md:p-4">
        {loadingLoans || loadingPayments ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            <span className="ml-3 text-secondary-text">
              Đang tải dữ liệu...
            </span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 border-t-2 border-t-blue-500 shadow-sm">
                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                  Tổng vay
                </div>
                <div className="text-slate-900 dark:text-white text-xl md:text-2xl font-bold truncate">
                  {formatCurrency(summary.totalLoans)}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 border-t-2 border-t-red-500 shadow-sm">
                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                  Còn nợ
                </div>
                <div className="text-slate-900 dark:text-white text-xl md:text-2xl font-bold truncate">
                  {formatCurrency(summary.totalRemaining)}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 border-t-2 border-t-green-500 shadow-sm">
                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                  Đã trả
                </div>
                <div className="text-slate-900 dark:text-white text-xl md:text-2xl font-bold truncate">
                  {formatCurrency(summary.totalPaid)}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 border-t-2 border-t-amber-500 shadow-sm">
                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                  Đang vay
                </div>
                <div className="text-slate-900 dark:text-white text-xl md:text-2xl font-bold">
                  {summary.activeLoans}
                  <span className="text-slate-400 dark:text-slate-500 text-xs ml-1 font-normal">
                    khoản
                  </span>
                </div>
              </div>

              <div className="col-span-2 md:col-span-1 bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 border-t-2 border-t-orange-500 shadow-sm">
                <div className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
                  Quá hạn
                </div>
                <div className="text-slate-900 dark:text-white text-xl md:text-2xl font-bold">
                  {summary.overdueLoans}
                  <span className="text-slate-400 dark:text-slate-500 text-xs ml-1 font-normal">
                    khoản
                  </span>
                </div>
              </div>
            </div>

            {/* Active Loans */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Các khoản vay đang hoạt động
              </h2>
              {groupedLoans.active.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-500 dark:text-slate-400">
                  Không có khoản vay nào đang hoạt động
                </div>
              ) : (
                <div className="grid gap-4">
                  {groupedLoans.active.map((loan) => (
                    <LoanCard
                      key={loan.id}
                      loan={loan}
                      onPayment={() => {
                        setSelectedLoan(loan);
                        setShowPaymentModal(true);
                      }}
                      onEdit={() => {
                        setEditingLoan(loan);
                        setShowEditLoanModal(true);
                      }}
                      onViewDetail={() => {
                        setSelectedLoan(loan);
                        setShowDetailModal(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Overdue Loans */}
            {groupedLoans.overdue.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-orange-600 dark:text-orange-400 mb-4">
                  Các khoản vay quá hạn
                </h2>
                <div className="grid gap-4">
                  {groupedLoans.overdue.map((loan) => (
                    <LoanCard
                      key={loan.id}
                      loan={loan}
                      onPayment={() => {
                        setSelectedLoan(loan);
                        setShowPaymentModal(true);
                      }}
                      onEdit={() => {
                        setEditingLoan(loan);
                        setShowEditLoanModal(true);
                      }}
                      onViewDetail={() => {
                        setSelectedLoan(loan);
                        setShowDetailModal(true);
                      }}
                      isOverdue
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Paid Loans */}
            {groupedLoans.paid.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Các khoản vay đã thanh toán
                </h2>
                <div className="grid gap-4">
                  {groupedLoans.paid.map((loan) => (
                    <LoanCard
                      key={loan.id}
                      loan={loan}
                      isPaid
                      onViewDetail={() => {
                        setSelectedLoan(loan);
                        setShowDetailModal(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showAddLoanModal && (
        <AddLoanModal
          onClose={() => setShowAddLoanModal(false)}
          onSave={async (loan) => {
            try {
              await createLoan.mutateAsync(
                loan as Omit<Loan, "id" | "created_at">
              );
              showToast.success("Đã thêm khoản vay thành công");
              setShowAddLoanModal(false);
            } catch (error: any) {
              showToast.error(error.message || "Không thể thêm khoản vay");
            }
          }}
        />
      )}

      {showEditLoanModal && editingLoan && (
        <EditLoanModal
          loan={editingLoan}
          onClose={() => {
            setShowEditLoanModal(false);
            setEditingLoan(null);
          }}
          onSave={async (updates) => {
            try {
              await updateLoan.mutateAsync({
                id: editingLoan.id,
                updates,
              });
              showToast.success("Đã cập nhật khoản vay thành công");
              setShowEditLoanModal(false);
              setEditingLoan(null);
            } catch (error: any) {
              showToast.error(error.message || "Không thể cập nhật khoản vay");
            }
          }}
        />
      )}

      {showPaymentModal && selectedLoan && (
        <LoanPaymentModal
          loan={selectedLoan}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedLoan(null);
          }}
          onSave={async (payment) => {
            try {
              // Update loan remaining amount
              await updateLoan.mutateAsync({
                id: selectedLoan.id,
                updates: {
                  remainingAmount: payment.remainingAmount,
                  status:
                    payment.remainingAmount === 0
                      ? "paid"
                      : selectedLoan.status,
                },
              });

              // Create payment record
              await createLoanPayment.mutateAsync(payment);

              showToast.success("Đã ghi nhận thanh toán thành công");

              // 💰 Tạo giao dịch chi trong Sổ quỹ (INSERT vào database)
              // Tách riêng: Gốc = loan_principal (loại trừ khỏi báo cáo lợi nhuận)
              //             Lãi = loan_interest (TÍNH vào chi phí báo cáo)
              if (payment.principalAmount > 0) {
                const principalTxResult = await createCashTransaction({
                  type: "expense",
                  amount: payment.principalAmount,
                  branchId: currentBranchId,
                  paymentSourceId: payment.paymentMethod,
                  date: payment.paymentDate,
                  notes: `Trả gốc vay - ${selectedLoan.lenderName}`,
                  category: "loan_principal",
                  recipient: selectedLoan.lenderName,
                  loanPaymentId: payment.id,
                });
                if (!principalTxResult.ok) {
                  console.error("❌ Lỗi ghi sổ quỹ trả gốc:", principalTxResult.error);
                }
              }

              if (payment.interestAmount > 0) {
                const interestTxResult = await createCashTransaction({
                  type: "expense",
                  amount: payment.interestAmount,
                  branchId: currentBranchId,
                  paymentSourceId: payment.paymentMethod,
                  date: payment.paymentDate,
                  notes: `Trả lãi vay - ${selectedLoan.lenderName}`,
                  category: "loan_interest",
                  recipient: selectedLoan.lenderName,
                  loanPaymentId: payment.id,
                });
                if (!interestTxResult.ok) {
                  console.error("❌ Lỗi ghi sổ quỹ trả lãi:", interestTxResult.error);
                  showToast.warning(
                    `Trả nợ OK nhưng chưa ghi được sổ quỹ lãi: ${interestTxResult.error?.message}`
                  );
                }
              }

              // Fallback: nếu cả gốc và lãi đều = 0 nhưng totalAmount > 0
              if (payment.principalAmount === 0 && payment.interestAmount === 0 && payment.totalAmount > 0) {
                await createCashTransaction({
                  type: "expense",
                  amount: payment.totalAmount,
                  branchId: currentBranchId,
                  paymentSourceId: payment.paymentMethod,
                  date: payment.paymentDate,
                  notes: `Trả nợ vay - ${selectedLoan.lenderName}`,
                  category: "loan_payment",
                  recipient: selectedLoan.lenderName,
                  loanPaymentId: payment.id,
                });
              }

              // Cập nhật số dư nguồn tiền (local state)
              const newBalance =
                (paymentSources.find((ps) => ps.id === payment.paymentMethod)
                  ?.balance[currentBranchId] || 0) - payment.totalAmount;

              setPaymentSources(
                paymentSources.map((ps) =>
                  ps.id === payment.paymentMethod
                    ? {
                      ...ps,
                      balance: {
                        ...ps.balance,
                        [currentBranchId]: newBalance,
                      },
                    }
                    : ps
                )
              );

              // 💾 Persist số dư nguồn tiền vào database
              try {
                await updatePaymentSourceBalanceRepo.mutateAsync({
                  id: payment.paymentMethod,
                  branchId: currentBranchId,
                  delta: -payment.totalAmount,
                });
              } catch (balanceErr) {
                console.error("❌ Lỗi cập nhật số dư nguồn tiền:", balanceErr);
              }

              setShowPaymentModal(false);
              setSelectedLoan(null);
            } catch (error: any) {
              showToast.error(error.message || "Không thể ghi nhận thanh toán");
            }
          }}
        />
      )}

      {/* Loan Detail Modal */}
      {showDetailModal && selectedLoan && (
        <LoanDetailModal
          loan={selectedLoan}
          payments={loanPayments.filter((p) => p.loanId === selectedLoan.id)}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedLoan(null);
          }}
        />
      )}
    </div>
  );
};

// Loan Card Component
const LoanCard: React.FC<{
  loan: Loan;
  onPayment?: () => void;
  onEdit?: () => void;
  onViewDetail?: () => void;
  isOverdue?: boolean;
  isPaid?: boolean;
}> = ({ loan, onPayment, onEdit, onViewDetail, isOverdue, isPaid }) => {
  const progressPercent =
    ((loan.principal - loan.remainingAmount) / loan.principal) * 100;
  const daysUntilDue = Math.ceil(
    (new Date(loan.endDate).getTime() - new Date().getTime()) /
    (1000 * 60 * 60 * 24)
  );

  // Kiểm tra nếu là khoản vay đáo hạn
  const isDaoHan = loan.purpose?.toLowerCase().includes("đáo hạn");

  // Tính tiền lãi hàng tháng cho khoản vay đáo hạn
  const monthlyInterest = isDaoHan
    ? (loan.remainingAmount * loan.interestRate / 100 / 12)
    : 0;

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-lg border-2 p-6 ${isOverdue
          ? "border-orange-300 dark:border-orange-700"
          : isPaid
            ? "border-green-300 dark:border-green-700"
            : "border-slate-200 dark:border-slate-700"
        }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {loan.lenderName}
            </h3>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${loan.loanType === "bank"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                  : loan.loanType === "personal"
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400"
                }`}
            >
              {loan.loanType === "bank"
                ? "Ngân hàng"
                : loan.loanType === "personal"
                  ? "Cá nhân"
                  : "Khác"}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {loan.purpose}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {!isPaid && (
            <>
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                ✏️ Sửa
              </button>
              <button
                onClick={onPayment}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                💰 Trả nợ
              </button>
            </>
          )}
          {onViewDetail && (
            <button
              onClick={onViewDetail}
              className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              📋 Chi tiết
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Số tiền vay
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {formatCurrency(loan.principal)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Còn nợ
          </div>
          <div className="text-sm font-semibold text-red-600 dark:text-red-400 truncate">
            {formatCurrency(loan.remainingAmount)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Lãi suất
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {loan.interestRate}%/năm
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Trả hàng tháng
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {isDaoHan ? formatCurrency(monthlyInterest) : formatCurrency(loan.monthlyPayment)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
          <span>Đã trả {progressPercent.toFixed(1)}%</span>
          <span>
            {!isPaid &&
              (isOverdue
                ? "Quá hạn"
                : daysUntilDue > 0
                  ? `Còn ${daysUntilDue} ngày`
                  : "Đến hạn hôm nay")}
          </span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${isOverdue
                ? "bg-orange-500"
                : isPaid
                  ? "bg-green-500"
                  : "bg-blue-500"
              }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Ngày vay: {formatDate(new Date(loan.startDate))}</span>
        <span>Đến hạn: {formatDate(new Date(loan.endDate))}</span>
      </div>
    </div>
  );
};

// Add Loan Modal
const AddLoanModal: React.FC<{
  onClose: () => void;
  onSave: (loan: Partial<Loan>) => void;
}> = ({ onClose, onSave }) => {
  const [lenderName, setLenderName] = useState("");
  const [loanType, setLoanType] = useState<"bank" | "personal" | "other">(
    "bank"
  );
  const [principal, setPrincipal] = useState("0");
  const [interestRate, setInterestRate] = useState("0");
  const [term, setTerm] = useState("12");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [purpose, setPurpose] = useState("");
  const [collateral, setCollateral] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const principalAmount = parseFloat(principal);
    const rate = parseFloat(interestRate);
    const termMonths = parseInt(term);

    // Calculate monthly payment (simple calculation)
    const monthlyRate = rate / 100 / 12;
    const monthlyPayment =
      (principalAmount *
        (monthlyRate * Math.pow(1 + monthlyRate, termMonths))) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);

    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + termMonths);

    const newLoan = {
      lenderName,
      loanType,
      principal: principalAmount,
      interestRate: rate,
      term: termMonths,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      remainingAmount: principalAmount,
      monthlyPayment: isNaN(monthlyPayment) ? 0 : monthlyPayment,
      status: "active" as const,
      purpose,
      collateral,
    };

    onSave(newLoan);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Thêm khoản vay mới
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tên ngân hàng/Người cho vay *
              </label>
              <input
                type="text"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Loại vay *
              </label>
              <select
                value={loanType}
                onChange={(e) => setLoanType(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="bank">Ngân hàng</option>
                <option value="personal">Cá nhân</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Số tiền vay *
              </label>
              <input
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Lãi suất (%/năm) *
              </label>
              <input
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Kỳ hạn (tháng) *
              </label>
              <input
                type="number"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Ngày vay *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Mục đích vay
            </label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="">-- Chọn mục đích --</option>
              <option value="Đáo hạn">Đáo hạn</option>
              <option value="Mở rộng kinh doanh">Mở rộng kinh doanh</option>
              <option value="Mua thiết bị">Mua thiết bị</option>
              <option value="Bổ sung vốn lưu động">Bổ sung vốn lưu động</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tài sản thế chấp
            </label>
            <input
              type="text"
              value={collateral}
              onChange={(e) => setCollateral(e.target.value)}
              placeholder="Ví dụ: Sổ đỏ nhà, giấy tờ xe..."
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
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
              Thêm khoản vay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Loan Modal
const EditLoanModal: React.FC<{
  loan: Loan;
  onClose: () => void;
  onSave: (loan: Partial<Loan>) => void;
}> = ({ loan, onClose, onSave }) => {
  const [lenderName, setLenderName] = useState(loan.lenderName);
  const [loanType, setLoanType] = useState<"bank" | "personal" | "other">(
    loan.loanType
  );
  const [principal, setPrincipal] = useState(loan.principal.toString());
  const [interestRate, setInterestRate] = useState(
    loan.interestRate.toString()
  );
  const [term, setTerm] = useState(loan.term.toString());
  const [startDate, setStartDate] = useState(loan.startDate.split("T")[0]);
  const [purpose, setPurpose] = useState(loan.purpose || "");
  const [collateral, setCollateral] = useState(loan.collateral || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const principalAmount = parseFloat(principal);
    const rate = parseFloat(interestRate);
    const termMonths = parseInt(term);

    // Calculate monthly payment (simple calculation)
    const monthlyRate = rate / 100 / 12;
    const monthlyPayment =
      (principalAmount *
        (monthlyRate * Math.pow(1 + monthlyRate, termMonths))) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);

    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + termMonths);

    const updates = {
      lenderName,
      loanType,
      principal: principalAmount,
      interestRate: rate,
      term: termMonths,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      monthlyPayment: isNaN(monthlyPayment) ? 0 : monthlyPayment,
      purpose,
      collateral,
    };

    onSave(updates);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Chỉnh sửa khoản vay
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tên ngân hàng/Người cho vay *
              </label>
              <input
                type="text"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Loại vay *
              </label>
              <select
                value={loanType}
                onChange={(e) => setLoanType(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="bank">Ngân hàng</option>
                <option value="personal">Cá nhân</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Số tiền vay *
              </label>
              <input
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Lãi suất (%/năm) *
              </label>
              <input
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Kỳ hạn (tháng) *
              </label>
              <input
                type="number"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Ngày vay *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Mục đích vay
            </label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="">-- Chọn mục đích --</option>
              <option value="Đáo hạn">Đáo hạn</option>
              <option value="Mở rộng kinh doanh">Mở rộng kinh doanh</option>
              <option value="Mua thiết bị">Mua thiết bị</option>
              <option value="Bổ sung vốn lưu động">Bổ sung vốn lưu động</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tài sản thế chấp
            </label>
            <input
              type="text"
              value={collateral}
              onChange={(e) => setCollateral(e.target.value)}
              placeholder="Ví dụ: Sổ đỏ nhà, giấy tờ xe..."
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
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
              Cập nhật
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Loan Payment Modal
const LoanPaymentModal: React.FC<{
  loan: Loan;
  onClose: () => void;
  onSave: (payment: LoanPayment) => void;
}> = ({ loan, onClose, onSave }) => {
  // Kiểm tra xem có phải khoản vay đáo hạn không
  const isDaoHan = loan.purpose?.toLowerCase().includes("đáo hạn");

  // Tính lãi cho kỳ hạn (tháng)
  const calculateInterest = () => {
    // Lãi = Số tiền còn nợ * lãi suất/năm / 12 tháng
    return (loan.remainingAmount * loan.interestRate / 100 / 12);
  };

  const [principalAmount, setPrincipalAmount] = useState(
    isDaoHan ? "0" : loan.monthlyPayment.toString()
  );
  const [interestAmount, setInterestAmount] = useState(
    isDaoHan ? calculateInterest().toFixed(2) : "0"
  );
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("bank");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  const totalAmount = parseFloat(principalAmount) + parseFloat(interestAmount);
  const remainingAfterPayment =
    loan.remainingAmount - parseFloat(principalAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payment: LoanPayment = {
      id: `LOANPAY-${Date.now()}`,
      loanId: loan.id,
      paymentDate: new Date(paymentDate).toISOString(),
      principalAmount: parseFloat(principalAmount),
      interestAmount: parseFloat(interestAmount),
      totalAmount,
      remainingAmount: Math.max(0, remainingAfterPayment),
      paymentMethod,
      notes,
      branchId: loan.branchId,
    };

    onSave(payment);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Trả nợ - {loan.lenderName}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Còn nợ: {formatCurrency(loan.remainingAmount)}
          </p>
          {isDaoHan && (
            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                ⚠️ Khoản vay đáo hạn: Chỉ tính lãi suất, không trả gốc
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tiền gốc *
            </label>
            <input
              type="number"
              value={principalAmount}
              onChange={(e) => setPrincipalAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              required
              disabled={isDaoHan}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tiền lãi
            </label>
            <input
              type="number"
              value={interestAmount}
              onChange={(e) => setInterestAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600 dark:text-slate-400">
                Tổng tiền trả:
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                Còn lại sau khi trả:
              </span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(Math.max(0, remainingAfterPayment))}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Hình thức thanh toán
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="cash"
                  checked={paymentMethod === "cash"}
                  onChange={(e) => setPaymentMethod(e.target.value as "cash")}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-slate-900 dark:text-white">Tiền mặt</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="bank"
                  checked={paymentMethod === "bank"}
                  onChange={(e) => setPaymentMethod(e.target.value as "bank")}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-slate-900 dark:text-white">
                  Chuyển khoản
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Ngày trả
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Ghi chú
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex gap-3 pt-2">
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
              Xác nhận trả nợ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Loan Detail Modal - Hiển thị lịch sử trả nợ
const LoanDetailModal: React.FC<{
  loan: Loan;
  payments: LoanPayment[];
  onClose: () => void;
}> = ({ loan, payments, onClose }) => {
  const progressPercent =
    ((loan.principal - loan.remainingAmount) / loan.principal) * 100;

  // Sort payments by date descending (newest first)
  const sortedPayments = [...payments].sort(
    (a, b) =>
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
  );

  const totalPaidPrincipal = payments.reduce(
    (sum, p) => sum + p.principalAmount,
    0
  );
  const totalPaidInterest = payments.reduce(
    (sum, p) => sum + p.interestAmount,
    0
  );
  const totalPaid = payments.reduce((sum, p) => sum + p.totalAmount, 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Chi tiết khoản vay - {loan.lenderName}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {loan.loanType === "bank"
                  ? "Ngân hàng"
                  : loan.loanType === "personal"
                    ? "Cá nhân"
                    : "Khác"}{" "}
                • {loan.purpose}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                Số tiền vay
              </div>
              <div className="text-sm font-bold text-blue-900 dark:text-blue-100">
                {formatCurrency(loan.principal)}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
              <div className="text-xs text-green-600 dark:text-green-400 mb-1">
                Đã trả
              </div>
              <div className="text-sm font-bold text-green-900 dark:text-green-100">
                {formatCurrency(totalPaid)}
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
              <div className="text-xs text-red-600 dark:text-red-400 mb-1">
                Còn nợ
              </div>
              <div className="text-sm font-bold text-red-900 dark:text-red-100">
                {formatCurrency(loan.remainingAmount)}
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
              <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">
                Lãi suất
              </div>
              <div className="text-sm font-bold text-amber-900 dark:text-amber-100">
                {loan.interestRate}%/năm
              </div>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600 dark:text-slate-400">
                Tiến độ trả nợ
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {progressPercent.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${loan.status === "paid" ? "bg-green-500" : "bg-blue-500"
                  }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
              <span>Ngày vay: {formatDate(new Date(loan.startDate))}</span>
              <span>Đến hạn: {formatDate(new Date(loan.endDate))}</span>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Tổng hợp thanh toán
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-slate-500 dark:text-slate-400">
                  Gốc đã trả
                </div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(totalPaidPrincipal)}
                </div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">
                  Lãi đã trả
                </div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(totalPaidInterest)}
                </div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">
                  Số lần trả
                </div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {payments.length} lần
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Lịch sử trả nợ ({payments.length} giao dịch)
            </h3>
            {sortedPayments.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                Chưa có lịch sử trả nợ
              </div>
            ) : (
              <div className="space-y-3">
                {sortedPayments.map((payment, index) => (
                  <div
                    key={payment.id}
                    className="bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center justify-center">
                          {sortedPayments.length - index}
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {formatDate(new Date(payment.paymentDate))}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${payment.paymentMethod === "cash"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            }`}
                        >
                          {payment.paymentMethod === "cash"
                            ? "💵 Tiền mặt"
                            : "🏦 Chuyển khoản"}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Tiền gốc
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(payment.principalAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Tiền lãi
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(payment.interestAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Tổng trả
                        </div>
                        <div className="font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(payment.totalAmount)}
                        </div>
                      </div>
                    </div>
                    {payment.notes && (
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">
                        📝 {payment.notes}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                      Còn lại sau trả: {formatCurrency(payment.remainingAmount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoansManager;
