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
import { getCategoryLabel, isIncomeTx } from "./cashBookHelpers";
import {
  Wallet,
  Building2,
  TrendingUp,
  Search,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Plus,
  Trash2,
  Edit3,
  DollarSign,
  Info,
  Settings,
  ArrowRightLeft,
  Coins
} from "lucide-react";

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
      <div className="hidden md:block h-full flex flex-col bg-transparent space-y-6">


        {/* Modal cài đặt số dư ban đầu */}
        {showInitialBalanceModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-[#0F172A]/95 border border-slate-200 dark:border-slate-800/80 shadow-[0_10px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-2xl w-full max-w-md backdrop-blur-xl">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/80">
                <h2 className="text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  <span>Cài đặt số dư ban đầu</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Nhập số dư thực tế khi bắt đầu sử dụng hệ thống
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
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
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800/80 rounded-xl bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 text-lg font-bold focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">
                    Hiển thị:{" "}
                    {formatCurrency(parseFloat(initialCashBalance) || 0)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
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
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800/80 rounded-xl bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 text-lg font-bold focus:ring-1 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">
                    Hiển thị:{" "}
                    {formatCurrency(parseFloat(initialBankBalance) || 0)}
                  </p>
                </div>
                <div className="bg-amber-55 dark:bg-amber-500/10 rounded-xl p-3 border border-amber-200 dark:border-amber-500/20 flex gap-2.5">
                  <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed font-medium">
                    Số dư ban đầu là số tiền thực tế bạn có <strong>trước khi</strong> bắt đầu ghi chép. Các giao dịch sau sẽ được cộng/trừ từ số này.
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800/80 flex gap-3">
                <button
                  onClick={() => setShowInitialBalanceModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors border border-slate-200 dark:border-transparent"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveInitialBalance}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:from-blue-500 hover:to-indigo-400 transition-colors shadow-lg shadow-blue-500/20"
                >
                  Lưu số dư
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actual Balance Section - Always visible */}
        <div className="bg-gradient-to-b from-[#161F32]/65 to-[#0F1626]/85 backdrop-blur-2xl border border-[#2B354A]/50 p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-200 tracking-wide uppercase">
                  Số dư thực tế
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Số tiền hiện có tới thời điểm hiện tại
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
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
                className="p-2.5 bg-[#1E293B]/40 hover:bg-[#1E293B]/80 text-slate-300 hover:text-slate-100 border border-[#2B354A]/60 hover:border-slate-500 rounded-xl transition-all shadow-md active:scale-95"
                title="Cài đặt số dư ban đầu"
              >
                <Settings className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => {
                  if (!canManageFinance) {
                    showToast.error("Bạn không có quyền thêm giao dịch");
                    return;
                  }
                  setShowAddModal(true);
                }}
                className="px-4.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl font-extrabold shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.4)] active:scale-95 transition-all duration-200 flex items-center gap-2 text-xs uppercase tracking-wider border border-emerald-500/30"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm giao dịch</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Tiền mặt */}
            <div className="bg-gradient-to-br from-[#122A25]/45 via-[#0C151B]/75 to-[#0B0F19]/90 border border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_35px_rgba(16,185,129,0.12)] group transition-all duration-300 rounded-2xl p-5 relative overflow-hidden flex items-center justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
              <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full pointer-events-none" />
              <div className="space-y-1.5">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  💵 Tiền mặt
                </span>
                <div className={`text-[28px] font-bold font-mono tracking-tight group-hover:text-emerald-300 transition-colors leading-none drop-shadow-[0_2px_8px_rgba(16,185,129,0.3)] ${
                  actualBalance.cashBalance >= 0 ? "text-slate-100" : "text-red-400"
                }`}>
                  {formatCurrency(actualBalance.cashBalance).replace("₫", "")} <span className="text-sm font-medium text-slate-400 font-sans">₫</span>
                </div>
                {actualBalance.cashBalance < 0 && (
                  <div className="mt-2 text-[10px] text-red-400 font-bold flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    Kiểm tra lại số dư
                  </div>
                )}
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:scale-110 transition-transform duration-300">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            
            {/* Ngân hàng */}
            <div className="bg-gradient-to-br from-[#0F223D]/45 via-[#0C1221]/75 to-[#0B0F19]/90 border border-blue-500/20 hover:border-blue-500/40 hover:shadow-[0_0_35px_rgba(59,130,246,0.12)] group transition-all duration-300 rounded-2xl p-5 relative overflow-hidden flex items-center justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
              <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full pointer-events-none" />
              <div className="space-y-1.5">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  🏦 Ngân hàng
                </span>
                <div className={`text-[28px] font-bold font-mono tracking-tight group-hover:text-blue-300 transition-colors leading-none drop-shadow-[0_2px_8px_rgba(59,130,246,0.3)] ${
                  actualBalance.bankBalance >= 0 ? "text-slate-100" : "text-red-400"
                }`}>
                  {formatCurrency(actualBalance.bankBalance).replace("₫", "")} <span className="text-sm font-medium text-slate-400 font-sans">₫</span>
                </div>
                {actualBalance.bankBalance < 0 && (
                  <div className="mt-2 text-[10px] text-red-400 font-bold flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    Kiểm tra lại số dư
                  </div>
                )}
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] group-hover:scale-110 transition-transform duration-300">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            
            {/* Tổng cộng */}
            <div className="bg-gradient-to-br from-[#23173C]/45 via-[#0E1121]/75 to-[#0B0F19]/90 border border-purple-500/25 hover:border-purple-500/45 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] group transition-all duration-300 rounded-2xl p-5 relative overflow-hidden flex items-center justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
              <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-purple-500/5 blur-2xl rounded-full pointer-events-none" />
              <div className="space-y-1.5">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  💎 Tổng cộng
                </span>
                <div className={`text-[28px] font-bold font-mono tracking-tight group-hover:text-purple-400 transition-colors leading-none drop-shadow-[0_2px_8px_rgba(168,85,247,0.35)] ${
                  actualBalance.totalBalance >= 0 ? "text-purple-400" : "text-red-400"
                }`}>
                  {formatCurrency(actualBalance.totalBalance).replace("₫", "")} <span className="text-sm font-medium text-slate-400 font-sans">₫</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtered Summary Section - Only show when filtered */}
        {isFilteredView && (
          <div className="flex items-center justify-between gap-4 flex-wrap bg-white dark:bg-[#131926]/30 border border-slate-200 dark:border-slate-800/60 p-3.5 rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgb(0,0,0,0.15)]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-wide uppercase">
                Tóm tắt kỳ lọc
              </h3>
              <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase rounded-full border border-blue-100 dark:border-blue-500/30">
                {filteredTransactions.length} GD
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider text-[10px]">Thu:</span>
                <span className="font-mono text-emerald-600 dark:text-green-400 font-bold">{formatCurrency(filteredSummary.income)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider text-[10px]">Chi:</span>
                <span className="font-mono text-rose-600 dark:text-red-400 font-bold">{formatCurrency(filteredSummary.expense)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider text-[10px]">Chênh lệch:</span>
                <span className={`font-mono font-bold ${filteredSummary.balance >= 0 ? "text-blue-600 dark:text-blue-400 shadow-sm" : "text-rose-600 dark:text-red-400 shadow-sm"}`}>
                  {filteredSummary.balance > 0 ? "+" : ""}{formatCurrency(filteredSummary.balance)}
                </span>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden md:block"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider text-[10px]">TM:</span>
                <span className={`font-mono font-bold ${filteredSummary.cashBalance >= 0 ? "text-slate-800 dark:text-slate-200" : "text-rose-600 dark:text-red-400"}`}>
                  {filteredSummary.cashBalance > 0 ? "+" : ""}{formatCurrency(filteredSummary.cashBalance)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider text-[10px]">NH:</span>
                <span className={`font-mono font-bold ${filteredSummary.bankBalance >= 0 ? "text-slate-800 dark:text-slate-200" : "text-rose-600 dark:text-red-400"}`}>
                  {filteredSummary.bankBalance > 0 ? "+" : ""}{formatCurrency(filteredSummary.bankBalance)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="space-y-4">
          {/* Mobile Filters */}
          <div className="md:hidden space-y-3 mb-4 p-3 bg-[#131926]/30 border border-slate-800/60 rounded-2xl">

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
          <div className="hidden md:flex flex-wrap items-center gap-4 bg-white/80 dark:bg-[#141C2E]/65 backdrop-blur-xl border border-slate-200 dark:border-[#2B354A]/40 p-3 rounded-2xl shadow-sm dark:shadow-[0_12px_40px_rgba(0,0,0,0.25)] sticky top-0 z-20 transition-all duration-300 hover:border-slate-300 dark:hover:border-[#35425C]/60 mb-4">
            {/* Search */}
            <div className="flex-1 min-w-[240px] relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Tìm nội dung, mã GD, đối tượng..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white dark:bg-[#0C101A]/95 border border-slate-200 dark:border-[#2B354A]/60 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/80 dark:focus:shadow-[0_0_20px_rgba(59,130,246,0.3),inset_0_2px_4px_rgba(0,0,0,0.4)] transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden lg:block"></div>

            {/* Type Filter */}
            <div className="bg-slate-50 dark:bg-[#0C101A]/95 border border-slate-200 dark:border-[#2B354A]/60 p-1.5 rounded-xl flex items-center gap-1 shadow-sm">
              {[
                { value: "all", label: "Tất cả" },
                { value: "income", label: "Thu" },
                { value: "expense", label: "Chi" },
              ].map((option) => {
                let activeStyle = "";
                if (filterType === option.value) {
                  if (option.value === "income") {
                    activeStyle = "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/35 dark:shadow-[0_2px_8px_rgba(16,185,129,0.15)]";
                  } else if (option.value === "expense") {
                    activeStyle = "bg-rose-50 text-rose-600 border-rose-200 shadow-sm dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/35 dark:shadow-[0_2px_8px_rgba(244,63,94,0.15)]";
                  } else {
                    activeStyle = "bg-blue-50 text-blue-600 border-blue-250 shadow-sm dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/35 dark:shadow-[0_2px_8px_rgba(59,130,246,0.15)]";
                  }
                }
                return (
                  <button
                    key={option.value}
                    onClick={() => setFilterType(option.value as any)}
                    className={`px-4 py-1.5 rounded-lg font-extrabold text-xs uppercase tracking-wider border transition-all duration-200 ${
                      filterType === option.value
                        ? activeStyle
                        : "bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {/* Source Filter */}
            <div className="bg-slate-50 dark:bg-[#0C101A]/95 border border-slate-200 dark:border-[#2B354A]/60 p-1.5 rounded-xl flex items-center gap-1 shadow-sm">
              {[
                { value: "all", label: "Mọi nguồn" },
                { value: "cash", label: "Tiền mặt" },
                { value: "bank", label: "Ngân hàng" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilterPaymentSource(option.value as any)}
                  className={`px-4 py-1.5 rounded-lg font-extrabold text-xs uppercase tracking-wider border transition-all duration-200 ${
                    filterPaymentSource === option.value
                      ? "bg-blue-50 text-blue-600 border-blue-250 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/35 dark:shadow-[0_2px_8px_rgba(59,130,246,0.15)] shadow-sm"
                      : "bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/30"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden lg:block"></div>

            {/* Date Filter */}
            <div className="bg-slate-50 dark:bg-[#0C101A]/95 border border-slate-200 dark:border-[#2B354A]/60 p-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value as any)}
                className="py-1.5 pl-3.5 pr-9 bg-transparent border-none text-xs font-extrabold uppercase tracking-wider text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white focus:ring-0 cursor-pointer appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.8' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: `right 0.35rem center`,
                  backgroundRepeat: `no-repeat`,
                  backgroundSize: `1.3em 1.3em`,
                }}
              >
                <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" value="today">Hôm nay</option>
                <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" value="week">7 ngày</option>
                <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" value="month">Tháng</option>
                <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" value="custom-month">Theo tháng</option>
                <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" value="all">Tất cả</option>
              </select>
              
              {filterDateRange === 'custom-month' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-2.5 py-1 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#2B354A]/60 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

          {/* Transactions Table (Desktop) - Breathable Floating Glass Row Cards */}
          <div className="hidden md:block bg-transparent overflow-visible">
            <table className="w-full border-separate border-spacing-y-3">
              <thead className="bg-transparent">
                <tr>
                  <th className="px-6 py-2 text-left text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase border-none">
                    Ngày/Giờ
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase border-none">
                    Loại
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase border-none">
                    Danh mục
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase border-none">
                    Nội dung
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase border-none">
                    Nguồn tiền
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase border-none">
                    Số tiền
                  </th>
                  <th className="px-6 py-2 text-center text-xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase border-none">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-transparent">
                {isCashTxLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-[#121929]/50 backdrop-blur-xl border border-slate-200 dark:border-[#222E45]/50 rounded-2xl shadow-sm"
                    >
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-500 mx-auto mb-3"></div>
                      <span className="text-sm font-semibold tracking-wide">Đang tải dữ liệu giao dịch...</span>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-16 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-[#121929]/50 backdrop-blur-xl border border-slate-200 dark:border-[#222E45]/50 rounded-2xl font-bold text-sm tracking-wide shadow-sm"
                    >
                      📭 Không tìm thấy dữ liệu giao dịch sổ quỹ
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
                        className="group transition-all duration-300"
                      >
                        {/* Ngày/Giờ - Redesigned into horizontal micro-badges */}
                        <td className={`pl-6 pr-4 py-5 text-sm first:rounded-l-2xl first:border-l border-y border-slate-200 dark:border-[#222E45]/50 bg-white dark:bg-[#121929]/50 backdrop-blur-xl group-hover:bg-slate-50/80 dark:group-hover:bg-[#1C263B]/65 group-hover:border-slate-300 dark:group-hover:border-[#354363]/60 transition-all duration-300 ${
                          txIsIncome
                            ? "group-hover:first:shadow-[inset_4px_0_0_#10B981]"
                            : "group-hover:first:shadow-[inset_4px_0_0_#F43F5E]"
                        }`}>
                          <div className="flex flex-col gap-1.5">
                            <span className="font-bold text-slate-800 dark:text-slate-100 font-mono tracking-tight text-[14.5px] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                              {formatDate(new Date(tx.date))}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600 dark:bg-[#1B253D]/80 dark:border-[#2B354A]/40 dark:text-slate-300 text-[11px] font-semibold font-mono tracking-wide shadow-sm leading-none">
                                🕒 {new Date(tx.date).toLocaleTimeString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {createdByName && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-slate-800/30 px-2 py-0.5 rounded border border-slate-200 dark:border-[#2B354A]/30 flex items-center gap-1 leading-none shadow-sm">
                                  👤 {createdByName}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Loại - Sleek capsules */}
                        <td className="px-4 py-5 text-sm border-y border-slate-200 dark:border-[#222E45]/50 bg-white dark:bg-[#121929]/50 backdrop-blur-xl group-hover:bg-slate-50/80 dark:group-hover:bg-[#1C263B]/65 group-hover:border-slate-300 dark:group-hover:border-[#354363]/60 transition-all duration-300">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${txIsIncome
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.05)] dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 dark:shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                              : "bg-rose-50 text-rose-600 border-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.05)] dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30 dark:shadow-[0_0_10px_rgba(244,63,94,0.15)]"
                              }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${txIsIncome ? "bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_6px_#10B981]" : "bg-rose-500 dark:bg-rose-400 shadow-[0_0_6px_#F43F5E]"}`} />
                            {txIsIncome ? "Thu" : "Chi"}
                          </span>
                        </td>

                        {/* Danh mục */}
                        <td className="px-4 py-5 text-sm font-extrabold text-slate-800 dark:text-slate-200 border-y border-slate-200 dark:border-[#222E45]/50 bg-white dark:bg-[#121929]/50 backdrop-blur-xl group-hover:bg-slate-50/80 dark:group-hover:bg-[#1C263B]/65 group-hover:border-slate-300 dark:group-hover:border-[#354363]/60 transition-all duration-300">
                          {getCategoryLabel(tx.category)}
                        </td>

                        {/* Nội dung - Clean horizontal sub-badges */}
                        <td className="px-4 py-5 text-sm border-y border-slate-200 dark:border-[#222E45]/50 bg-white dark:bg-[#121929]/50 backdrop-blur-xl group-hover:bg-slate-50/80 dark:group-hover:bg-[#1C263B]/65 group-hover:border-slate-300 dark:group-hover:border-[#354363]/60 transition-all duration-300">
                          <div className="flex flex-col gap-1.5 max-w-[280px] lg:max-w-[420px]">
                            <span className="text-slate-800 dark:text-slate-100 font-bold leading-relaxed break-words text-[14.5px]">
                              {(tx as any).description || tx.notes || "--"}
                            </span>
                            {(targetName || formattedRef) && (
                              <div className="flex items-center gap-2 flex-wrap">
                                {targetName && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-[#2B354A]/30 text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-none shadow-sm">
                                    👤 {targetName}
                                  </span>
                                )}
                                {formattedRef && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-[11px] font-bold font-mono text-blue-600 border border-blue-200 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/25 dark:hover:bg-blue-500/20 transition-all cursor-help leading-none shadow-sm"
                                    title={fullRef}
                                  >
                                    🔗 {formattedRef}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Nguồn tiền - SaaS style LED status pills */}
                        <td className="px-4 py-5 text-sm border-y border-slate-200 dark:border-[#222E45]/50 bg-white dark:bg-[#121929]/50 backdrop-blur-xl group-hover:bg-slate-50/80 dark:group-hover:bg-[#1C263B]/65 group-hover:border-slate-300 dark:group-hover:border-[#354363]/60 transition-all duration-300">
                          {(() => {
                            const source =
                              tx.paymentSourceId ||
                              (tx as any).paymentsource ||
                              (tx as any).paymentSource;
                            if (source === "cash") return (
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-250 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25 text-xs font-black uppercase tracking-wider shadow-sm shadow-amber-500/5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shadow-[0_0_8px_#F59E0B] animate-pulse" />
                                Tiền mặt
                              </span>
                            );
                            if (source === "bank") return (
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-250 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/25 text-xs font-black uppercase tracking-wider shadow-sm shadow-blue-500/5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 shadow-[0_0_8px_#3B82F6] animate-pulse" />
                                Ngân hàng
                              </span>
                            );
                            return (
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/25 text-xs font-black uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                {source || "--"}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Số tiền - Bold monospace cash figures with neon drop shadows */}
                        <td
                          className={`px-4 py-5 text-right text-[16px] font-extrabold font-mono tracking-tight border-y border-slate-200 dark:border-[#222E45]/50 bg-white dark:bg-[#121929]/50 backdrop-blur-xl group-hover:bg-slate-50/80 dark:group-hover:bg-[#1C263B]/65 group-hover:border-slate-300 dark:group-hover:border-[#354363]/60 transition-all duration-300 ${txIsIncome
                            ? "text-emerald-600 dark:text-emerald-400 dark:drop-shadow-[0_2px_4px_rgba(16,185,129,0.2)] font-black"
                            : "text-rose-600 dark:text-rose-400 dark:drop-shadow-[0_2px_4px_rgba(244,63,94,0.2)]"
                            }`}
                        >
                          {txIsIncome ? "+" : "-"}
                          {formatCurrency(Math.abs(tx.amount))}
                        </td>

                        {/* Thao tác - Beautiful circular loop buttons */}
                        <td className="pl-4 pr-6 py-5 text-center last:rounded-r-2xl last:border-r border-y border-slate-200 dark:border-[#222E45]/50 bg-white dark:bg-[#121929]/50 backdrop-blur-xl group-hover:bg-slate-50/80 dark:group-hover:bg-[#1C263B]/65 group-hover:border-slate-300 dark:group-hover:border-[#354363]/60 transition-all duration-300">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                if (!canManageFinance) {
                                  showToast.error("Bạn không có quyền sửa giao dịch");
                                  return;
                                }
                                setEditingTransaction(tx);
                              }}
                              className="w-8 h-8 rounded-full border border-slate-200 dark:border-[#2B354A]/80 bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all duration-200 flex items-center justify-center shadow-sm shadow-black/5"
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
                                  strokeWidth={2.5}
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
                              className="w-8 h-8 rounded-full border border-slate-200 dark:border-[#2B354A]/80 bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-500/40 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-200 flex items-center justify-center shadow-sm shadow-black/5"
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
                                  strokeWidth={2.5}
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
              {/* Footer totals - Styled as a wide, elegant summary row block */}
              {!isCashTxLoading && filteredTransactions.length > 0 && (
                <tfoot>
                  <tr className="bg-transparent">
                    <td
                      colSpan={3}
                      className="pl-6 pr-4 py-5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide first:rounded-l-2xl first:border-l border-y border-slate-200 dark:border-[#222E45]/45 bg-slate-50 dark:bg-[#0F1422]/65 backdrop-blur-xl"
                    >
                      <div className="flex flex-col gap-1 text-[11px]">
                        <span className="font-extrabold text-slate-700 dark:text-slate-300">Tổng: {filteredTransactions.length} giao dịch</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-455 font-bold lowercase tracking-normal normal-case opacity-90">
                          ({filteredTransactions.filter((t) => isIncomeTx(t)).length} thu, {filteredTransactions.filter((t) => !isIncomeTx(t)).length} chi)
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5 border-y border-slate-200 dark:border-[#222E45]/45 bg-slate-50 dark:bg-[#0F1422]/65 backdrop-blur-xl"></td>
                    <td className="px-4 py-5 border-y border-slate-200 dark:border-[#222E45]/45 bg-slate-50 dark:bg-[#0F1422]/65 backdrop-blur-xl"></td>
                    <td className="px-4 py-5 text-right border-y border-slate-200 dark:border-[#222E45]/45 bg-slate-50 dark:bg-[#0F1422]/65 backdrop-blur-xl">
                      <div className="flex flex-col items-end gap-1.5 pr-2">
                        <div className="flex items-center justify-between w-36 text-[11px] font-bold text-emerald-600 dark:text-emerald-400/90 font-mono tracking-tight">
                          <span className="font-sans uppercase text-[9px] font-extrabold text-slate-500 tracking-wider">Thu:</span>
                          <span>+{formatCurrency(filteredSummary.income)}</span>
                        </div>
                        <div className="flex items-center justify-between w-36 text-[11px] font-bold text-rose-600 dark:text-rose-400/90 font-mono tracking-tight">
                          <span className="font-sans uppercase text-[9px] font-extrabold text-slate-500 tracking-wider">Chi:</span>
                          <span>-{formatCurrency(filteredSummary.expense)}</span>
                        </div>
                        <div className="w-36 h-px bg-slate-200 dark:bg-slate-800 my-0.5"></div>
                        <div className={`flex items-center justify-between w-36 text-xs font-black font-mono tracking-tight ${filteredSummary.balance >= 0
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-rose-600 dark:text-rose-400"
                          }`}>
                          <span className="font-sans uppercase text-[9px] font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Dư:</span>
                          <span>{formatCurrency(filteredSummary.balance)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="pl-4 pr-6 py-5 last:rounded-r-2xl last:border-r border-y border-slate-200 dark:border-[#222E45]/45 bg-slate-50 dark:bg-[#0F1422]/65 backdrop-blur-xl"></td>
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
