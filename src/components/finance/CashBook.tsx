import React, { useState, useMemo, useEffect } from "react";
import { useAppContext } from "../../contexts/AppContext";
import { useAuth } from "../../contexts/AuthContext";
import { showToast } from "../../utils/toast";
import { canDo } from "../../utils/permissions";
import { formatCurrency, formatDate, formatShortWorkOrderId } from "../../utils/format";
import type { CashTransaction } from "../../types";
import { PlusIcon } from "../Icons";
import {
  useCashTxRepo,
  useCreateCashTxRepo,
  useUpdateCashTxRepo,
  useDeleteCashTxRepo,
} from "../../hooks/useCashTransactionsRepository";
import { useUpdatePaymentSourceBalanceRepo } from "../../hooks/usePaymentSourcesRepository";
import { supabase } from "../../supabaseClient";
import { CashBookMobile } from "./CashBookMobile";
import {
  AddTransactionModal,
  EditTransactionModal,
  DeleteConfirmModal
} from "./CashBookModals";
import { getCategoryLabel } from "./cashBookHelpers";

const CashBook: React.FC = () => {
  const {
    paymentSources,
    currentBranchId,
    setCashTransactions,
    setPaymentSources,
  } = useAppContext();

  // Fetch cash transactions from database instead of localStorage
  const { data: cashTransactions = [], isLoading: isCashTxLoading } =
    useCashTxRepo({ branchId: currentBranchId });
  const authCtx = useAuth();
  const createCashTxRepo = useCreateCashTxRepo();
  const updateCashTxRepo = useUpdateCashTxRepo();
  const deleteCashTxRepo = useDeleteCashTxRepo();
  const updatePaymentSourceBalanceRepo = useUpdatePaymentSourceBalanceRepo();
  const canManageFinance = canDo(authCtx.profile?.role, "finance.collect_payment");

  // Fetch profiles for user names
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name");
      if (!error && data) {
        const map: Record<string, string> = {};
        data.forEach((profile: any) => {
          map[profile.id] = profile.name;
        });
        setProfilesMap(map);
      }
    };
    fetchProfiles();
  }, []);

  const [filterType, setFilterType] = useState<"all" | "income" | "expense">(
    "all"
  );
  const [filterPaymentSource, setFilterPaymentSource] = useState<string>("all");
  const [filterDateRange, setFilterDateRange] = useState<
    "today" | "week" | "month" | "all" | "custom-month"
  >("month");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // Format: YYYY-MM
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<CashTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<CashTransaction | null>(null);

  // State cho modal cài đặt số dư ban đầu
  const [showInitialBalanceModal, setShowInitialBalanceModal] = useState(false);
  const [initialCashBalance, setInitialCashBalance] = useState("");
  const [initialBankBalance, setInitialBankBalance] = useState("");

  // Lấy số dư ban đầu từ paymentSources (đã lưu trong DB)
  const savedInitialCash =
    paymentSources.find((ps) => ps.id === "cash")?.balance[currentBranchId] ||
    0;
  const savedInitialBank =
    paymentSources.find((ps) => ps.id === "bank")?.balance[currentBranchId] ||
    0;

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = cashTransactions.filter(
      (tx) => tx.branchId === currentBranchId
    );

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((tx) => tx.type === filterType);
    }

    // Filter by payment source
    if (filterPaymentSource !== "all") {
      filtered = filtered.filter(
        (tx) => tx.paymentSourceId === filterPaymentSource
      );
    }

    // Filter by date range
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filterDateRange) {
      case "today":
        filtered = filtered.filter((tx) => new Date(tx.date) >= today);
        break;
      case "week": {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter((tx) => new Date(tx.date) >= weekAgo);
        break;
      }
      case "month": {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter((tx) => new Date(tx.date) >= monthAgo);
        break;
      }
      case "custom-month":
        // Filter by selected month (YYYY-MM)
        filtered = filtered.filter((tx) => {
          const txMonth = new Date(tx.date).toISOString().slice(0, 7);
          return txMonth === selectedMonth;
        });
        break;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          ((tx as any).description || "").toLowerCase().includes(query) ||
          (tx.notes || "").toLowerCase().includes(query) ||
          ((tx as any).reference || "").toLowerCase().includes(query) ||
          ((tx as any).recipient || "").toLowerCase().includes(query) ||
          getCategoryLabel(tx.category).toLowerCase().includes(query)
      );
    }

    return filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [
    cashTransactions,
    currentBranchId,
    filterType,
    filterPaymentSource,
    filterDateRange,
    selectedMonth,
    searchQuery,
  ]);

  const INCOME_CATEGORIES = new Set([
    "sale_income",
    "service_income",
    "other_income",
    "debt_collection",
    "service_deposit",
    "employee_advance_repayment",
    "general_income",
    "deposit",
  ]);
  const EXPENSE_CATEGORIES = new Set([
    "inventory_purchase",
    "supplier_payment",
    "debt_payment",
    "salary",
    "employee_advance",
    "loan_payment",
    "rent",
    "utilities",
    "outsourcing",
    "service_cost",
    "sale_refund",
    "other_expense",
    "general_expense",
  ]);

  // ✅ FIX: Refactored transaction type detection with clear priority
  const isIncomeTx = (tx: CashTransaction) => {
    const normalizedCategory = String(tx.category || "").trim().toLowerCase();

    // Priority 1: Check expense categories first (more specific)
    if (EXPENSE_CATEGORIES.has(normalizedCategory)) return false;

    // Priority 2: Check income categories
    if (INCOME_CATEGORIES.has(normalizedCategory)) return true;

    // Priority 3: Fallback to type field only if category not recognized
    return tx.type === "income" || tx.type === "deposit";
  };

  // Calculate ACTUAL BALANCE (from ALL transactions, not filtered)
  const actualBalance = useMemo(() => {
    const allBranchTransactions = cashTransactions.filter(
      (tx) => tx.branchId === currentBranchId
    );

    // Tính biến động tiền mặt từ TẤT CẢ giao dịch
    // FIXED: Không dùng Math.abs() vì DB có sẵn negative amounts
    const cashTransactionsDelta = allBranchTransactions
      .filter((tx) => tx.paymentSourceId === "cash")
      .reduce((sum, tx) => {
        // Nếu amount > 0: thu, amount < 0: chi (hoặc ngược lại tùy type)
        // RULE: income → +amount, expense → -amount
        let delta = 0;
        if (isIncomeTx(tx)) {
          delta = Math.abs(tx.amount); // Income luôn cộng (dương)
        } else {
          delta = -Math.abs(tx.amount); // Expense luôn trừ (âm)
        }

        return sum + delta;
      }, 0);

    // Tính biến động ngân hàng từ TẤT CẢ giao dịch
    const bankTransactionsDelta = allBranchTransactions
      .filter((tx) => tx.paymentSourceId === "bank")
      .reduce((sum, tx) => {
        if (isIncomeTx(tx)) {
          return sum + Math.abs(tx.amount);
        } else {
          return sum - Math.abs(tx.amount);
        }
      }, 0);

    // Số dư thực tế = Số dư ban đầu + Biến động từ giao dịch
    const cashBalance = savedInitialCash + cashTransactionsDelta;
    const bankBalance = savedInitialBank + bankTransactionsDelta;

    return {
      cashBalance,
      bankBalance,
      totalBalance: cashBalance + bankBalance,
    };
  }, [
    cashTransactions,
    currentBranchId,
    savedInitialCash,
    savedInitialBank,
  ]);

  // Calculate FILTERED SUMMARY (from filtered transactions only)
  const filteredSummary = useMemo(() => {
    const income = filteredTransactions
      .filter((tx) => isIncomeTx(tx))
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const expense = filteredTransactions
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const balance = income - expense;

    // Tính riêng cho tiền mặt và ngân hàng trong kỳ lọc
    const cashIncome = filteredTransactions
      .filter((tx) => tx.paymentSourceId === "cash" && isIncomeTx(tx))
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const cashExpense = filteredTransactions
      .filter((tx) => tx.paymentSourceId === "cash" && tx.type === "expense")
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const bankIncome = filteredTransactions
      .filter((tx) => tx.paymentSourceId === "bank" && isIncomeTx(tx))
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const bankExpense = filteredTransactions
      .filter((tx) => tx.paymentSourceId === "bank" && tx.type === "expense")
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return {
      income,
      expense,
      balance,
      cashIncome,
      cashExpense,
      cashBalance: cashIncome - cashExpense,
      bankIncome,
      bankExpense,
      bankBalance: bankIncome - bankExpense,
    };
  }, [filteredTransactions]);

  // Determine if we're showing filtered view (not "all")
  const isFilteredView = filterDateRange !== "all" || filterType !== "all" || filterPaymentSource !== "all" || searchQuery.trim() !== "";

  // Hàm lưu số dư ban đầu
  const handleSaveInitialBalance = async () => {
    if (!canManageFinance) {
      showToast.error("Bạn không có quyền cập nhật số dư ban đầu");
      return;
    }

    try {
      const parseSignedAmount = (value: string) => {
        const normalized = String(value || "")
          .replace(/\s+/g, "")
          .replace(/[,.]/g, "")
          .replace(/[^0-9-]/g, "");
        if (!normalized || normalized === "-") return 0;
        return parseFloat(normalized) || 0;
      };

      const cashAmount =
        parseSignedAmount(initialCashBalance);
      const bankAmount =
        parseSignedAmount(initialBankBalance);

      // Cập nhật số dư tiền mặt
      await updatePaymentSourceBalanceRepo.mutateAsync({
        id: "cash",
        branchId: currentBranchId,
        delta: cashAmount - savedInitialCash, // Delta để đạt được số dư mới
      });

      // Cập nhật số dư ngân hàng
      await updatePaymentSourceBalanceRepo.mutateAsync({
        id: "bank",
        branchId: currentBranchId,
        delta: bankAmount - savedInitialBank,
      });

      // Cập nhật local state
      setPaymentSources((prev) =>
        prev.map((ps) => {
          if (ps.id === "cash") {
            return {
              ...ps,
              balance: { ...ps.balance, [currentBranchId]: cashAmount },
            };
          }
          if (ps.id === "bank") {
            return {
              ...ps,
              balance: { ...ps.balance, [currentBranchId]: bankAmount },
            };
          }
          return ps;
        })
      );

      showToast.success("Đã cập nhật số dư ban đầu");
      setShowInitialBalanceModal(false);
    } catch (error) {
      showToast.error("Lỗi khi cập nhật số dư");
    }
  };

  return (
    <>
      <div className="block md:hidden">
        <CashBookMobile />
      </div>
      <div className="hidden md:block h-full flex flex-col bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">


        {/* Modal cài đặt số dư ban đầu */}
        {showInitialBalanceModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Cài đặt số dư ban đầu
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Nhập số dư thực tế khi bắt đầu sử dụng hệ thống
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    💵 Tiền mặt
                  </label>
                  <input
                    type="text"
                    value={initialCashBalance}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const hasLeadingMinus = raw.trim().startsWith("-");
                      const digitsOnly = raw.replace(/[^0-9]/g, "");
                      setInitialCashBalance(hasLeadingMinus ? `-${digitsOnly}` : digitsOnly);
                    }}
                    placeholder="0"
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Hiển thị:{" "}
                    {formatCurrency(parseFloat(initialCashBalance) || 0)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    🏦 Ngân hàng
                  </label>
                  <input
                    type="text"
                    value={initialBankBalance}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const hasLeadingMinus = raw.trim().startsWith("-");
                      const digitsOnly = raw.replace(/[^0-9]/g, "");
                      setInitialBankBalance(hasLeadingMinus ? `-${digitsOnly}` : digitsOnly);
                    }}
                    placeholder="0"
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Hiển thị:{" "}
                    {formatCurrency(parseFloat(initialBankBalance) || 0)}
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    ⚠️ Số dư ban đầu là số tiền thực tế bạn có{" "}
                    <strong>trước khi</strong> bắt đầu ghi chép. Các giao dịch sau
                    sẽ được cộng/trừ từ số này.
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                <button
                  onClick={() => setShowInitialBalanceModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveInitialBalance}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Lưu số dư
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actual Balance Section - Always visible */}
        <div className="p-3 md:p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Số dư thực tế
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Số tiền hiện có tới thời điểm hiện tại
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Action Buttons */}
              <button
                onClick={() => {
                  if (!canManageFinance) {
                    showToast.error("Bạn không có quyền cập nhật số dư ban đầu");
                    return;
                  }
                  setInitialCashBalance(savedInitialCash.toString());
                  setInitialBankBalance(savedInitialBank.toString());
                  setShowInitialBalanceModal(true);
                }}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg transition-colors"
                title="Cài đặt số dư ban đầu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              <button
                onClick={() => {
                  if (!canManageFinance) {
                    showToast.error("Bạn không có quyền thêm giao dịch");
                    return;
                  }
                  setShowAddModal(true);
                }}
                className="px-4 py-2 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 text-sm"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Thêm giao dịch</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center transition-all hover:border-slate-300 dark:hover:border-slate-600">
              <div className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
                Tiền mặt
              </div>
              <div className={`text-2xl lg:text-3xl font-bold tracking-tight ${actualBalance.cashBalance >= 0
                ? "text-slate-900 dark:text-white"
                : "text-red-500"
                }`}>
                {formatCurrency(actualBalance.cashBalance)}
              </div>
              {actualBalance.cashBalance < 0 && (
                <div className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  Kiểm tra lại số dư
                </div>
              )}
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center transition-all hover:border-slate-300 dark:hover:border-slate-600">
              <div className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
                Ngân hàng
              </div>
              <div className={`text-2xl lg:text-3xl font-bold tracking-tight ${actualBalance.bankBalance >= 0
                ? "text-slate-900 dark:text-white"
                : "text-red-500"
                }`}>
                {formatCurrency(actualBalance.bankBalance)}
              </div>
              {actualBalance.bankBalance < 0 && (
                <div className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  Kiểm tra lại số dư
                </div>
              )}
            </div>
            
            <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-5 border border-blue-100 dark:border-blue-800/30 shadow-sm flex flex-col justify-center">
              <div className="text-blue-600/80 dark:text-blue-400/80 text-sm font-medium mb-1">
                Tổng cộng
              </div>
              <div className={`text-2xl lg:text-3xl font-bold tracking-tight ${actualBalance.totalBalance >= 0
                ? "text-blue-700 dark:text-blue-400"
                : "text-red-600 dark:text-red-400"
                }`}>
                {formatCurrency(actualBalance.totalBalance)}
              </div>
            </div>
          </div>
        </div>

        {/* Filtered Summary Section - Only show when filtered */}
        {isFilteredView && (
          <div className="px-3 md:px-6 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Tóm tắt kỳ lọc
              </span>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-full">
                {filteredTransactions.length} GD
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">Thu:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(filteredSummary.income)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">Chi:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(filteredSummary.expense)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">Chênh lệch:</span>
                <span className={`font-bold ${filteredSummary.balance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>
                  {filteredSummary.balance > 0 ? "+" : ""}{formatCurrency(filteredSummary.balance)}
                </span>
              </div>
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 hidden md:block"></div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">TM:</span>
                <span className={`font-bold ${filteredSummary.cashBalance >= 0 ? "text-slate-900 dark:text-white" : "text-red-600 dark:text-red-400"}`}>
                  {filteredSummary.cashBalance > 0 ? "+" : ""}{formatCurrency(filteredSummary.cashBalance)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">NH:</span>
                <span className={`font-bold ${filteredSummary.bankBalance >= 0 ? "text-slate-900 dark:text-white" : "text-red-600 dark:text-red-400"}`}>
                  {filteredSummary.bankBalance > 0 ? "+" : ""}{formatCurrency(filteredSummary.bankBalance)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="p-3 md:p-6 pb-2">
          {/* Mobile Filters */}
          <div className="md:hidden space-y-3 mb-4">

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                  Loại
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                >
                  <option value="all">Tất cả</option>
                  <option value="income">Thu</option>
                  <option value="expense">Chi</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                  Nguồn tiền
                </label>
                <select
                  value={filterPaymentSource}
                  onChange={(e) => setFilterPaymentSource(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                >
                  <option value="all">Tất cả</option>
                  <option value="cash">Tiền mặt</option>
                  <option value="bank">Ngân hàng</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                Thời gian
              </label>
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value as any)}
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="today">Hôm nay</option>
                <option value="week">7 ngày qua</option>
                <option value="month">30 ngày qua</option>
                <option value="custom-month">Theo tháng</option>
                <option value="all">Tất cả</option>
              </select>
              {filterDateRange === 'custom-month' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full mt-2 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
              )}
            </div>
          </div>

          {/* Desktop Filters */}
          <div className="hidden md:flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2 shadow-sm mb-4 sticky top-0 z-10 transition-all">
            {/* Search */}
            <div className="flex-1 min-w-[200px] relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Tìm nội dung, mã GD, đối tượng..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all dark:text-white placeholder-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden lg:block"></div>

            {/* Type Filter */}
            <div className="flex p-0.5 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
              {[
                { value: "all", label: "Tất cả" },
                { value: "income", label: "Thu" },
                { value: "expense", label: "Chi" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilterType(option.value as any)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterType === option.value
                    ? option.value === "income"
                      ? "bg-green-600 text-white shadow-sm"
                      : option.value === "expense"
                        ? "bg-red-600 text-white shadow-sm"
                        : "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-600/50"
                    }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Source Filter */}
            <div className="flex p-0.5 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
              {[
                { value: "all", label: "Mọi nguồn" },
                { value: "cash", label: "Tiền mặt" },
                { value: "bank", label: "Ngân hàng" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilterPaymentSource(option.value as any)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterPaymentSource === option.value
                    ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-600/50"
                    }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden lg:block"></div>

            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value as any)}
                className="py-1.5 pl-3 pr-8 bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: `right 0.25rem center`,
                  backgroundRepeat: `no-repeat`,
                  backgroundSize: `1.25em 1.25em`,
                }}
              >
                <option value="today">Hôm nay</option>
                <option value="week">7 ngày qua</option>
                <option value="month">30 ngày qua</option>
                <option value="custom-month">Theo tháng</option>
                <option value="all">Tất cả thời gian</option>
              </select>
              
              {filterDateRange === 'custom-month' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          </div>

          {/* Transactions List (Mobile) */}
          <div className="md:hidden space-y-3">
            {isCashTxLoading ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Đang tải dữ liệu...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                Không có giao dịch nào
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {getCategoryLabel(tx.category)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatDate(new Date(tx.date))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`font-bold ${isIncomeTx(tx)
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                          }`}
                      >
                        {isIncomeTx(tx) ? "+" : "-"}
                        {formatCurrency(Math.abs(tx.amount))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[50%]">
                      {tx.notes || "--"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {(() => {
                          const source =
                            tx.paymentSourceId ||
                            (tx as any).paymentsource ||
                            (tx as any).paymentSource;
                          if (source === "cash") return "Tiền mặt";
                          if (source === "bank") return "Ngân hàng";
                          return source || "--";
                        })()}
                      </span>
                      <button
                        onClick={() => {
                          if (!canManageFinance) {
                            showToast.error("Bạn không có quyền sửa giao dịch");
                            return;
                          }
                          setEditingTransaction(tx);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          if (!canManageFinance) {
                            showToast.error("Bạn không có quyền xóa giao dịch");
                            return;
                          }
                          setDeletingTransaction(tx);
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Transactions Table (Desktop) */}
          <div className="hidden md:block bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Ngày/Giờ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Loại
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Danh mục
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Nội dung
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Nguồn tiền
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Số tiền
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {isCashTxLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                    >
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                    >
                      Không có giao dịch nào
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const txIsIncome = isIncomeTx(tx);
                    // Format reference if it looks like a work order ID
                    const rawRef = (tx as any).reference || "";
                    const formattedRef = rawRef && rawRef.match(/SC-|WO-|\d{10,}/)
                      ? formatShortWorkOrderId(rawRef).short
                      : rawRef;
                    const fullRef = rawRef && rawRef.match(/SC-|WO-|\d{10,}/)
                      ? formatShortWorkOrderId(rawRef).full
                      : rawRef;
                    // Merge target_name / recipient into content column
                    const targetName = (tx as any).target_name || (tx as any).recipient || "";
                    const createdByName = profilesMap[(tx as any).created_by] || "";

                    return (
                      <tr
                        key={tx.id}
                        className={`group transition-colors duration-100 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50`}
                      >
                        <td className="px-4 py-4 text-sm text-slate-900 dark:text-slate-100">
                          <div className="flex flex-col">
                            <span className="font-medium">{formatDate(new Date(tx.date))}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              {new Date(tx.date).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {createdByName && (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                {createdByName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${txIsIncome
                              ? "bg-green-100/50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                              : "bg-red-100/50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                              }`}
                          >
                            {txIsIncome ? "Thu" : "Chi"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {getCategoryLabel(tx.category)}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-800 dark:text-slate-200">
                              {(tx as any).description || tx.notes || "--"}
                            </span>
                            {targetName && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                👤 {targetName}
                              </span>
                            )}
                            {formattedRef && (
                              <span
                                className="text-xs font-mono text-blue-500 dark:text-blue-400 cursor-help"
                                title={fullRef}
                              >
                                🔗 {formattedRef}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {(() => {
                            const source =
                              tx.paymentSourceId ||
                              (tx as any).paymentsource ||
                              (tx as any).paymentSource;
                            if (source === "cash") return (
                              <span className="text-slate-600 dark:text-slate-400 font-medium">
                                Tiền mặt
                              </span>
                            );
                            if (source === "bank") return (
                              <span className="text-slate-600 dark:text-slate-400 font-medium">
                                Ngân hàng
                              </span>
                            );
                            return <span className="text-slate-400">{source || "--"}</span>;
                          })()}
                        </td>
                        <td
                          className={`px-4 py-4 text-right text-sm font-bold ${txIsIncome
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                            }`}
                        >
                          {txIsIncome ? "+" : "-"}
                          {formatCurrency(Math.abs(tx.amount))}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                if (!canManageFinance) {
                                  showToast.error("Bạn không có quyền sửa giao dịch");
                                  return;
                                }
                                setEditingTransaction(tx);
                              }}
                              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 opacity-60 group-hover:opacity-100 transition-all"
                              title="Chỉnh sửa giao dịch"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                if (!canManageFinance) {
                                  showToast.error("Bạn không có quyền xóa giao dịch");
                                  return;
                                }
                                setDeletingTransaction(tx);
                              }}
                              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                              title="Xóa giao dịch"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Footer totals */}
              {!isCashTxLoading && filteredTransactions.length > 0 && (
                <tfoot className="bg-slate-50 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600">
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                      Tổng: {filteredTransactions.length} giao dịch
                      <span className="text-slate-400 ml-1">
                        ({filteredTransactions.filter((t) => isIncomeTx(t)).length} thu, {filteredTransactions.filter((t) => !isIncomeTx(t)).length} chi)
                      </span>
                    </td>
                    <td className="px-4 py-4"></td>
                    <td className="px-4 py-4"></td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center justify-between w-28 text-xs font-semibold text-green-600 dark:text-green-400">
                          <span>Thu:</span>
                          <span>+{formatCurrency(filteredSummary.income)}</span>
                        </div>
                        <div className="flex items-center justify-between w-28 text-xs font-semibold text-red-600 dark:text-red-400">
                          <span>Chi:</span>
                          <span>-{formatCurrency(filteredSummary.expense)}</span>
                        </div>
                        <div className="w-28 h-px bg-slate-200 dark:bg-slate-600 my-0.5"></div>
                        <div className={`flex items-center justify-between w-28 text-sm font-bold ${filteredSummary.balance >= 0
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-red-600 dark:text-red-400"
                          }`}>
                          <span>Dư:</span>
                          <span>{formatCurrency(filteredSummary.balance)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Add Transaction Modal */}
          {showAddModal && (
            <AddTransactionModal
              onClose={() => setShowAddModal(false)}
              onSave={async (transaction) => {
                if (!canManageFinance) {
                  showToast.error("Bạn không có quyền thêm giao dịch");
                  return;
                }
                // Basic validation
                if (!transaction.amount || transaction.amount <= 0) {
                  showToast.warning("Số tiền phải > 0");
                  return;
                }
                try {
                  const res = await createCashTxRepo.mutateAsync({
                    type: transaction.type,
                    amount: transaction.amount,
                    branchId: currentBranchId,
                    paymentSourceId: transaction.paymentSourceId,
                    date: transaction.date,
                    notes: transaction.notes,
                    category: transaction.category,
                    recipient: transaction.recipient,
                  });
                  if (res?.ok) {
                    // Optimistically update local state for immediate UI feedback
                    setCashTransactions((prev) => [
                      res.data as CashTransaction,
                      ...prev,
                    ]);
                    const delta =
                      transaction.type === "income"
                        ? transaction.amount
                        : -transaction.amount;
                    await updatePaymentSourceBalanceRepo.mutateAsync({
                      id: transaction.paymentSourceId,
                      branchId: currentBranchId,
                      delta,
                    });
                    setPaymentSources((prev) =>
                      prev.map((ps) =>
                        ps.id === transaction.paymentSourceId
                          ? {
                            ...ps,
                            balance: {
                              ...ps.balance,
                              [currentBranchId]:
                                (ps.balance[currentBranchId] || 0) + delta,
                            },
                          }
                          : ps
                      )
                    );
                    showToast.success("Đã thêm giao dịch sổ quỹ");
                    setShowAddModal(false);
                  } else if (res?.error) {
                    showToast.error(res.error.message || "Ghi giao dịch thất bại");
                  }
                } catch (e: any) {
                  showToast.error(e?.message || "Lỗi không xác định");
                }
              }}
            />
          )}

          {/* Edit Transaction Modal */}
          {editingTransaction && (
            <EditTransactionModal
              transaction={editingTransaction}
              onClose={() => setEditingTransaction(null)}
              onSave={async (updatedData) => {
                if (!canManageFinance) {
                  showToast.error("Bạn không có quyền sửa giao dịch");
                  return;
                }
                try {
                  const res = await updateCashTxRepo.mutateAsync({
                    id: editingTransaction.id,
                    ...updatedData,
                  });
                  if (res?.ok) {
                    showToast.success("Đã cập nhật giao dịch");
                    setEditingTransaction(null);
                  } else if (res?.error) {
                    showToast.error(res.error.message || "Cập nhật thất bại");
                  }
                } catch (e: any) {
                  showToast.error(e?.message || "Lỗi không xác định");
                }
              }}
            />
          )}

          {/* Delete Confirmation Modal */}
          {deletingTransaction && (
            <DeleteConfirmModal
              transaction={deletingTransaction}
              onClose={() => setDeletingTransaction(null)}
              onConfirm={async () => {
                if (!canManageFinance) {
                  showToast.error("Bạn không có quyền xóa giao dịch");
                  return;
                }
                try {
                  const res = await deleteCashTxRepo.mutateAsync(
                    deletingTransaction.id
                  );
                  if (res?.ok) {
                    showToast.success("Đã xóa giao dịch");
                    setDeletingTransaction(null);
                  } else if (res?.error) {
                    showToast.error(res.error.message || "Xóa thất bại");
                  }
                } catch (e: any) {
                  showToast.error(e?.message || "Lỗi không xác định");
                }
              }}
            />
          )}
        </div>
      </div>
    </>
  );
};


export default CashBook;
