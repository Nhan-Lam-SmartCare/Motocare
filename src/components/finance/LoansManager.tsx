import React, { useState, useMemo } from "react";
import { useAppContext } from "../../contexts/AppContext";
import { formatCurrency, formatDate } from "../../utils/format";
import type { Loan, LoanPayment } from "../../types";
import {
  Plus,
  Pencil,
  Coins,
  Eye,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  DollarSign,
  Wallet,
  CreditCard,
  X,
  Info,
} from "lucide-react";
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
    setPaymentSources,
    paymentSources,
  } = useAppContext();

  // Fetch loans from Supabase
  const { data: loans = [], isLoading: loadingLoans } = useLoansRepo();
  const { data: loanPayments = [], isLoading: loadingPayments } =
    useLoanPaymentsRepo();
  const createLoan = useCreateLoanRepo();
  const updateLoan = useUpdateLoanRepo();
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
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700/60 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Quản lý vốn & vay
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Theo dõi các khoản vay và lịch trả nợ của doanh nghiệp
            </p>
          </div>
          <button
            onClick={() => setShowAddLoanModal(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all duration-200 shadow-sm shadow-blue-500/10 hover:shadow-md hover:shadow-blue-500/25 active:scale-95 cursor-pointer self-start sm:self-center"
          >
            <Plus className="w-5 h-5" />
            <span>Thêm khoản vay</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-4 md:p-6 flex-1 overflow-y-auto">
        {loadingLoans || loadingPayments ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 animate-pulse">
              Đang tải dữ liệu tài chính...
            </span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {/* Card 1: Tổng vay */}
              <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
                <div className="truncate">
                  <div className="text-slate-400 dark:text-slate-500 text-[10px] md:text-xs font-bold mb-1 uppercase tracking-wider">
                    Tổng vay
                  </div>
                  <div className="text-slate-900 dark:text-white text-lg md:text-xl xl:text-2xl font-extrabold truncate">
                    {formatCurrency(summary.totalLoans)}
                  </div>
                </div>
                <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              {/* Card 2: Còn nợ */}
              <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
                <div className="truncate">
                  <div className="text-slate-400 dark:text-slate-500 text-[10px] md:text-xs font-bold mb-1 uppercase tracking-wider">
                    Còn nợ
                  </div>
                  <div className="text-red-600 dark:text-red-400 text-lg md:text-xl xl:text-2xl font-extrabold truncate">
                    {formatCurrency(summary.totalRemaining)}
                  </div>
                </div>
                <div className="p-3 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              {/* Card 3: Đã trả */}
              <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
                <div className="truncate">
                  <div className="text-slate-400 dark:text-slate-500 text-[10px] md:text-xs font-bold mb-1 uppercase tracking-wider">
                    Đã trả
                  </div>
                  <div className="text-green-600 dark:text-green-400 text-lg md:text-xl xl:text-2xl font-extrabold truncate">
                    {formatCurrency(summary.totalPaid)}
                  </div>
                </div>
                <div className="p-3 bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>

              {/* Card 4: Đang vay */}
              <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
                <div className="truncate">
                  <div className="text-slate-400 dark:text-slate-500 text-[10px] md:text-xs font-bold mb-1 uppercase tracking-wider">
                    Đang vay
                  </div>
                  <div className="text-slate-900 dark:text-white text-lg md:text-xl xl:text-2xl font-extrabold">
                    {summary.activeLoans}
                    <span className="text-slate-400 dark:text-slate-500 text-xs ml-1 font-normal uppercase">
                      khoản
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>

              {/* Card 5: Quá hạn */}
              <div className="sm:col-span-2 md:col-span-1 bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
                <div className="truncate">
                  <div className="text-slate-400 dark:text-slate-500 text-[10px] md:text-xs font-bold mb-1 uppercase tracking-wider">
                    Quá hạn
                  </div>
                  <div className="text-orange-600 dark:text-orange-400 text-lg md:text-xl xl:text-2xl font-extrabold">
                    {summary.overdueLoans}
                    <span className="text-slate-400 dark:text-slate-500 text-xs ml-1 font-normal uppercase">
                      khoản
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Active Loans */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-5 w-1 bg-blue-500 rounded-full"></div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Các khoản vay đang hoạt động
                </h2>
                <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                  {groupedLoans.active.length}
                </span>
              </div>

              {groupedLoans.active.length === 0 ? (
                <div className="bg-white/50 dark:bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                  Không có khoản vay nào đang hoạt động
                </div>
              ) : (
                <div className="grid gap-5">
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
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-5 w-1 bg-orange-500 rounded-full"></div>
                  <h2 className="text-lg font-bold text-orange-600 dark:text-orange-400 tracking-tight">
                    Các khoản vay quá hạn
                  </h2>
                  <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 rounded-full">
                    {groupedLoans.overdue.length}
                  </span>
                </div>

                <div className="grid gap-5">
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
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-5 w-1 bg-green-500 rounded-full"></div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Các khoản vay đã thanh toán
                  </h2>
                  <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                    {groupedLoans.paid.length}
                  </span>
                </div>

                <div className="grid gap-5">
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

              // Giao dịch chi trong Sổ quỹ
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

              // Cập nhật số dư nguồn tiền local
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

              // Cập nhật số dư nguồn tiền db
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
    ? (loan.remainingAmount * loan.interestRate) / 100 / 12
    : 0;

  return (
    <div
      className={`bg-white/85 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border-l-4 p-5 md:p-6 transition-all duration-300 shadow-sm hover:shadow-md hover:translate-y-[-2px] flex flex-col justify-between ${
        isOverdue
          ? "border-l-orange-500 border-t border-r border-b border-slate-200/80 dark:border-slate-700/60 bg-gradient-to-br from-white to-orange-50/5 dark:from-slate-800 dark:to-orange-950/5"
          : isPaid
            ? "border-l-green-500 border-t border-r border-b border-slate-200/80 dark:border-slate-700/60 bg-gradient-to-br from-white to-green-50/5 dark:from-slate-800 dark:to-green-950/5"
            : "border-l-blue-500 border-t border-r border-b border-slate-200/80 dark:border-slate-700/60 bg-gradient-to-br from-white to-blue-50/5 dark:from-slate-800 dark:to-blue-950/5"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              {loan.lenderName}
            </h3>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                loan.loanType === "bank"
                  ? "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-900/25 dark:text-blue-400 dark:border-blue-800/30"
                  : loan.loanType === "personal"
                    ? "bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-900/25 dark:text-purple-400 dark:border-purple-800/30"
                    : "bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/40"
              }`}
            >
              {loan.loanType === "bank"
                ? "Ngân hàng"
                : loan.loanType === "personal"
                  ? "Cá nhân"
                  : "Khác"}
            </span>
          </div>
          {loan.purpose && (
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 font-medium">
              {loan.purpose}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          {!isPaid && (
            <>
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-amber-500/20 text-amber-600 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-400 dark:hover:text-slate-950 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap active:scale-95 shadow-sm hover:shadow-md hover:shadow-amber-500/10 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Sửa</span>
              </button>
              <button
                onClick={onPayment}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap active:scale-95 shadow-sm shadow-blue-500/15 hover:shadow-md hover:shadow-blue-500/25 cursor-pointer"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Trả nợ</span>
              </button>
            </>
          )}
          {onViewDetail && (
            <button
              onClick={onViewDetail}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap active:scale-95 shadow-sm cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Chi tiết</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 my-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/40">
        <div className="truncate">
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
            Số tiền vay
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
            {formatCurrency(loan.principal)}
          </div>
        </div>
        <div className="truncate">
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
            Còn nợ
          </div>
          <div className="text-sm font-bold text-red-650 dark:text-red-400 truncate">
            {formatCurrency(loan.remainingAmount)}
          </div>
        </div>
        <div className="truncate">
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
            Lãi suất
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {loan.interestRate}%/năm
          </div>
        </div>
        <div className="truncate">
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
            Trả hàng tháng
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
            {isDaoHan ? formatCurrency(monthlyInterest) : formatCurrency(loan.monthlyPayment)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 mb-4">
        <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
          <span className="flex items-center gap-1.5">
            <span className="text-slate-400 dark:text-slate-500">Đã trả:</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {progressPercent.toFixed(1)}%
            </span>
          </span>
          <span>
            {!isPaid && (
              isOverdue ? (
                <span className="text-red-500 dark:text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wider">
                  Quá hạn
                </span>
              ) : daysUntilDue > 0 ? (
                <span className="text-blue-500 dark:text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wider">
                  Còn {daysUntilDue} ngày
                </span>
              ) : (
                <span className="text-orange-500 dark:text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wider">
                  Đến hạn hôm nay
                </span>
              )
            )}
            {isPaid && (
              <span className="text-green-500 dark:text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wider">
                Đã thanh toán
              </span>
            )}
          </span>
        </div>
        <div className="h-2 bg-slate-200/80 dark:bg-slate-700/60 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isOverdue
                ? "bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_8px_rgba(239,68,68,0.25)]"
                : isPaid
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                  : "bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_8px_rgba(59,130,246,0.25)]"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/60 pt-3">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Ngày vay: <strong className="text-slate-600 dark:text-slate-400 font-medium">{formatDate(new Date(loan.startDate))}</strong></span>
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Đến hạn: <strong className="text-slate-600 dark:text-slate-400 font-medium">{formatDate(new Date(loan.endDate))}</strong></span>
        </span>
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-100 dark:border-slate-700/80 max-h-[90vh] overflow-y-auto transform scale-100 transition-all duration-300">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 sticky top-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm z-10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Thêm khoản vay mới
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tên ngân hàng/Người cho vay *
              </label>
              <input
                type="text"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Loại vay *
              </label>
              <select
                value={loanType}
                onChange={(e) => setLoanType(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
              >
                <option value="bank">Ngân hàng</option>
                <option value="personal">Cá nhân</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Số tiền vay *
              </label>
              <input
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Lãi suất (%/năm) *
              </label>
              <input
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Kỳ hạn (tháng) *
              </label>
              <input
                type="number"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Ngày vay *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Mục đích vay
            </label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
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
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tài sản thế chấp
            </label>
            <input
              type="text"
              value={collateral}
              onChange={(e) => setCollateral(e.target.value)}
              placeholder="Ví dụ: Sổ đỏ nhà, giấy tờ xe..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-750 dark:text-slate-200 rounded-xl font-bold transition-all duration-200 cursor-pointer active:scale-98"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all duration-200 cursor-pointer shadow-sm shadow-blue-500/10 hover:shadow-md hover:shadow-blue-500/20 active:scale-98"
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-100 dark:border-slate-700/80 max-h-[90vh] overflow-y-auto transform scale-100 transition-all duration-300">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 sticky top-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm z-10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Chỉnh sửa khoản vay
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tên ngân hàng/Người cho vay *
              </label>
              <input
                type="text"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Loại vay *
              </label>
              <select
                value={loanType}
                onChange={(e) => setLoanType(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
              >
                <option value="bank">Ngân hàng</option>
                <option value="personal">Cá nhân</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Số tiền vay *
              </label>
              <input
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Lãi suất (%/năm) *
              </label>
              <input
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Kỳ hạn (tháng) *
              </label>
              <input
                type="number"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Ngày vay *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Mục đích vay
            </label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
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
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tài sản thế chấp
            </label>
            <input
              type="text"
              value={collateral}
              onChange={(e) => setCollateral(e.target.value)}
              placeholder="Ví dụ: Sổ đỏ nhà, giấy tờ xe..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-750 dark:text-slate-200 rounded-xl font-bold transition-all duration-200 cursor-pointer active:scale-98"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all duration-200 cursor-pointer shadow-sm shadow-blue-500/10 hover:shadow-md hover:shadow-blue-500/20 active:scale-98"
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
    return (loan.remainingAmount * loan.interestRate) / 100 / 12;
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 dark:border-slate-700/80 transform scale-100 transition-all duration-300">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Trả nợ - {loan.lenderName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-450 dark:text-slate-400 font-semibold uppercase tracking-wider">Còn nợ:</span>
              <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(loan.remainingAmount)}</span>
            </div>
            {isDaoHan && (
              <div className="mt-2.5 p-3 bg-amber-50 dark:bg-amber-900/25 border border-amber-200/60 dark:border-amber-800/40 rounded-xl flex items-start gap-2 max-w-md">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                  Khoản vay đáo hạn: Chỉ cần đóng tiền lãi suất định kỳ, không bắt buộc đóng tiền gốc.
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 cursor-pointer self-start"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tiền gốc *
            </label>
            <input
              type="number"
              value={principalAmount}
              onChange={(e) => setPrincipalAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800"
              required
              disabled={isDaoHan}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tiền lãi
            </label>
            <input
              type="number"
              value={interestAmount}
              onChange={(e) => setInterestAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
            />
          </div>

          <div className="bg-blue-50/60 dark:bg-blue-950/20 rounded-xl p-4 border border-blue-200/50 dark:border-blue-900/30 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Tổng tiền trả:
              </span>
              <span className="font-extrabold text-blue-700 dark:text-blue-400">
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-blue-200/30 dark:border-blue-900/10">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Còn lại sau khi trả:
              </span>
              <span className="font-extrabold text-red-650 dark:text-red-400">
                {formatCurrency(Math.max(0, remainingAfterPayment))}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Hình thức thanh toán
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  value="cash"
                  checked={paymentMethod === "cash"}
                  onChange={(e) => setPaymentMethod(e.target.value as "cash")}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 dark:bg-slate-900 border-slate-300 dark:border-slate-700 cursor-pointer"
                />
                <span className="text-sm font-semibold text-slate-750 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-slate-400" />
                  Tiền mặt
                </span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  value="bank"
                  checked={paymentMethod === "bank"}
                  onChange={(e) => setPaymentMethod(e.target.value as "bank")}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 dark:bg-slate-900 border-slate-300 dark:border-slate-700 cursor-pointer"
                />
                <span className="text-sm font-semibold text-slate-750 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  Chuyển khoản
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Ngày trả
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Ghi chú
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-200"
              placeholder="Nhập ghi chú giao dịch trả nợ..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-750 dark:text-slate-200 rounded-xl font-bold transition-all duration-200 cursor-pointer active:scale-98"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all duration-200 cursor-pointer shadow-sm shadow-blue-500/10 hover:shadow-md hover:shadow-blue-500/20 active:scale-98"
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-100 dark:border-slate-700/80 max-h-[90vh] overflow-hidden flex flex-col transform scale-100 transition-all duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Chi tiết khoản vay - {loan.lenderName}
            </h2>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1.5">
              <span className="uppercase">
                {loan.loanType === "bank"
                  ? "Ngân hàng"
                  : loan.loanType === "personal"
                    ? "Cá nhân"
                    : "Khác"}
              </span>
              <span>•</span>
              <span className="normal-case">{loan.purpose}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Financial Indicator Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-xl p-3 border border-blue-200/40 dark:border-blue-900/30">
              <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-0.5">
                Số tiền vay
              </div>
              <div className="text-sm font-extrabold text-blue-950 dark:text-blue-300">
                {formatCurrency(loan.principal)}
              </div>
            </div>
            <div className="bg-green-50/50 dark:bg-green-950/20 rounded-xl p-3 border border-green-200/40 dark:border-green-900/30">
              <div className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-0.5">
                Đã trả
              </div>
              <div className="text-sm font-extrabold text-green-950 dark:text-green-300">
                {formatCurrency(totalPaid)}
              </div>
            </div>
            <div className="bg-red-50/50 dark:bg-red-950/20 rounded-xl p-3 border border-red-200/40 dark:border-red-900/30">
              <div className="text-[10px] font-bold text-red-650 dark:text-red-400 uppercase tracking-wider mb-0.5">
                Còn nợ
              </div>
              <div className="text-sm font-extrabold text-red-950 dark:text-red-350">
                {formatCurrency(loan.remainingAmount)}
              </div>
            </div>
            <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-xl p-3 border border-amber-200/40 dark:border-amber-900/30">
              <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5">
                Lãi suất
              </div>
              <div className="text-sm font-extrabold text-amber-950 dark:text-amber-300">
                {loan.interestRate}%/năm
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/40">
            <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              <span className="flex items-center gap-1">
                <span>Tiến độ trả nợ:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{progressPercent.toFixed(1)}%</span>
              </span>
              <span className="text-slate-400 dark:text-slate-500">
                Trạng thái:{" "}
                {loan.status === "paid" ? (
                  <span className="text-green-500 dark:text-green-400 font-bold">Hoàn thành</span>
                ) : (
                  <span className="text-blue-500 dark:text-blue-400 font-bold">Đang trả</span>
                )}
              </span>
            </div>
            <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  loan.status === "paid" ? "bg-green-500" : "bg-blue-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-450 dark:text-slate-500 mt-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/20">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Ngày vay: <strong>{formatDate(new Date(loan.startDate))}</strong></span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Đến hạn: <strong>{formatDate(new Date(loan.endDate))}</strong></span>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-4 border border-slate-150 dark:border-slate-700/40">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Tổng hợp thanh toán
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm font-medium">
              <div>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold mb-0.5 uppercase tracking-wider">
                  Gốc đã trả
                </div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(totalPaidPrincipal)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold mb-0.5 uppercase tracking-wider">
                  Lãi đã trả
                </div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(totalPaidInterest)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold mb-0.5 uppercase tracking-wider">
                  Số lần trả
                </div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {payments.length} lần
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="space-y-3.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="h-4 w-0.5 bg-blue-500 rounded-full"></span>
              <span>Lịch sử trả nợ ({payments.length} giao dịch)</span>
            </h3>
            {sortedPayments.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                Chưa có lịch sử trả nợ
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {sortedPayments.map((payment, index) => (
                  <div
                    key={payment.id}
                    className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5.5 h-5.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center border border-blue-100 dark:border-blue-900/30">
                          {sortedPayments.length - index}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(new Date(payment.paymentDate))}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          payment.paymentMethod === "cash"
                            ? "bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30"
                            : "bg-blue-50 text-blue-700 border border-blue-200/50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30"
                        }`}
                      >
                        {payment.paymentMethod === "cash" ? (
                          <>
                            <Wallet className="w-3 h-3" />
                            <span>Tiền mặt</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-3 h-3" />
                            <span>Chuyển khoản</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/40">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                          Tiền gốc
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {formatCurrency(payment.principalAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                          Tiền lãi
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {formatCurrency(payment.interestAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                          Tổng trả
                        </div>
                        <div className="text-xs font-bold text-green-600 dark:text-green-450 truncate">
                          {formatCurrency(payment.totalAmount)}
                        </div>
                      </div>
                    </div>

                    {payment.notes && (
                      <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                        <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <span className="italic leading-normal">{payment.notes}</span>
                      </div>
                    )}
                    <div className="mt-2.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Dư nợ còn lại sau trả:</span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 tracking-normal normal-case">
                        {formatCurrency(payment.remainingAmount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 sticky bottom-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-250 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition-all duration-200 cursor-pointer active:scale-98"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoansManager;
