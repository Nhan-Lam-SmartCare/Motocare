import React, { useState, useEffect, useMemo } from "react";
import { useAppContext } from "../../contexts/AppContext";
import { useCashTxRepo } from "../../hooks/useCashTransactionsRepository";
import {
  fetchPinCashTransactions,
  fetchPinBalanceSummary,
  PinCashTransaction,
} from "../../lib/pinSupabase";
import { syncBidirectional } from "../../lib/syncCashTransactions";
import { formatCashTxCategory } from "../../lib/finance/cashTxCategories";
import { formatCurrency, formatDate } from "../../utils/format";
import { Loader2, RefreshCw, Building2, Wrench, Filter, ArrowLeftRight } from "lucide-react";

type SourceFilter = "all" | "motocare" | "pin";

interface CombinedTransaction {
  id: string;
  type: "income" | "expense";
  category?: string;
  amount: number;
  date: string;
  description?: string;
  source: "motocare" | "pin";
}

const CombinedFinance: React.FC = () => {
  const { currentBranchId, paymentSources } = useAppContext();

  // Motocare data
  const { data: motocareTx = [], isLoading: motocareLoading } = useCashTxRepo({
    branchId: currentBranchId,
  });

  // Pin data
  const [pinTx, setPinTx] = useState<PinCashTransaction[]>([]);
  const [pinBalance, setPinBalance] = useState<{
    totalIncome: number;
    totalExpense: number;
    balance: number;
    cash?: number;
    bank?: number;
  }>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    cash: 0,
    bank: 0,
  });
  const [pinLoading, setPinLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [dateFilter, setDateFilter] = useState<
    "all" | "month" | "week" | "today"
  >("month");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string>("");

  // Fetch Pin data
  const loadPinData = async () => {
    setPinLoading(true);
    try {
      const [transactions, balance] = await Promise.all([
        fetchPinCashTransactions(),
        fetchPinBalanceSummary(currentBranchId),
      ]);

      console.log("[CombinedFinance] Pin transactions:", transactions.length);
      console.log("[CombinedFinance] Pin balance:", balance);

      setPinTx(transactions);
      setPinBalance(balance);

      if (transactions.length === 0) {
        console.warn("[CombinedFinance] ⚠️ Pin Factory không có dữ liệu hoặc RLS đang chặn!");
      }
    } catch (error: any) {
      console.error("[CombinedFinance] Error loading Pin data:", error);
      if (error?.code === '42501') {
        setSyncResult("❌ Pin Factory: Lỗi RLS chặn truy cập. Cần chạy script fix_rls trên Pin DB.");
      }
    }
    setPinLoading(false);
  };

  useEffect(() => {
    loadPinData();
  }, [currentBranchId]);

  // Sync function
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult("");
    try {
      const result = await syncBidirectional(currentBranchId);
      const msg = `✅ Đồng bộ thành công!\nMotocare→Pin: ${result.motoToPin.success} giao dịch\nPin→Motocare: ${result.pinToMoto.success} giao dịch`;
      setSyncResult(msg);
      // Reload data
      await loadPinData();
    } catch (error: any) {
      setSyncResult(`❌ Lỗi: ${error.message || "Không thể đồng bộ"}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper functions
  const isIncomeType = (type: string) =>
    type === "income" || type === "deposit";

  // Motocare balance calculation
  const motocareBalance = useMemo(() => {
    const savedInitialCash =
      paymentSources.find((ps) => ps.id === "cash")?.balance[currentBranchId] ||
      0;
    const savedInitialBank =
      paymentSources.find((ps) => ps.id === "bank")?.balance[currentBranchId] ||
      0;

    const branchTx = motocareTx.filter((tx) => tx.branchId === currentBranchId);

    const cashDelta = branchTx
      .filter((tx) => tx.paymentSourceId === "cash")
      .reduce((sum, tx) => {
        return isIncomeType(tx.type)
          ? sum + Math.abs(tx.amount)
          : sum - Math.abs(tx.amount);
      }, 0);

    const bankDelta = branchTx
      .filter((tx) => tx.paymentSourceId === "bank")
      .reduce((sum, tx) => {
        return isIncomeType(tx.type)
          ? sum + Math.abs(tx.amount)
          : sum - Math.abs(tx.amount);
      }, 0);

    return {
      cash: savedInitialCash + cashDelta,
      bank: savedInitialBank + bankDelta,
      total: savedInitialCash + cashDelta + savedInitialBank + bankDelta,
    };
  }, [motocareTx, currentBranchId, paymentSources]);

  // Combined transactions
  const combinedTransactions = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    // Fix: Tạo Date riêng để tránh mutation của now
    const weekAgoDate = new Date();
    weekAgoDate.setDate(weekAgoDate.getDate() - 7);
    const weekAgo = weekAgoDate.toISOString().slice(0, 10);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthAgoStr = monthAgo.toISOString().slice(0, 10);

    // Convert Motocare transactions
    const motocareCombined: CombinedTransaction[] = motocareTx
      .filter((tx) => tx.branchId === currentBranchId)
      .map((tx) => ({
        id: tx.id,
        type: tx.type as "income" | "expense",
        category: tx.category,
        amount: tx.amount,
        date: tx.date,
        description: tx.notes || (tx as any).description || "",
        source: "motocare" as const,
      }));

    // Convert Pin transactions
    const pinCombined: CombinedTransaction[] = pinTx.map((tx) => ({
      id: tx.id,
      type: tx.type,
      category: tx.category,
      amount: tx.amount,
      date: tx.date,
      description: tx.description,
      source: "pin" as const,
    }));

    let combined = [...motocareCombined, ...pinCombined];

    // Filter by source
    if (sourceFilter !== "all") {
      combined = combined.filter((tx) => tx.source === sourceFilter);
    }

    // Filter by date
    if (dateFilter === "today") {
      combined = combined.filter((tx) => tx.date.slice(0, 10) === today);
    } else if (dateFilter === "week") {
      combined = combined.filter((tx) => tx.date.slice(0, 10) >= weekAgo);
    } else if (dateFilter === "month") {
      combined = combined.filter((tx) => tx.date.slice(0, 10) >= monthAgoStr);
    }

    // Sort by date descending
    return combined.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [motocareTx, pinTx, currentBranchId, sourceFilter, dateFilter]);

  // Total balance
  const totalBalance = motocareBalance.total + pinBalance.balance;
  const totalCash = motocareBalance.cash + (pinBalance.cash || 0);
  const totalBank = motocareBalance.bank + (pinBalance.bank || 0);

  const isLoading = motocareLoading || pinLoading;

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              📊 Tổng hợp Tài chính
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Đồng bộ 2 chiều"
            >
              <ArrowLeftRight
                className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Đồng bộ</span>
            </button>
            <button
              onClick={loadPinData}
              disabled={isLoading}
              className="p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Sync Result */}
        {syncResult && (
          <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 whitespace-pre-line">
            {syncResult}
          </div>
        )}

        {/* Total Balance */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Tổng Số Dư Lũy Kế</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(totalBalance)}
          </p>
          <div className="mt-3 flex gap-6 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5"><span className="text-amber-500">💵</span> {formatCurrency(totalCash)}</span>
            <span className="flex items-center gap-1.5"><span className="text-indigo-500">🏦</span> {formatCurrency(totalBank)}</span>
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="px-4 pt-3 grid grid-cols-2 gap-3">
        {/* Motocare Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-xl"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                <Wrench className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-900 dark:text-white">Motocare</span>
            </div>

          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(motocareBalance.total)}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/50 pt-3">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">Tiền mặt</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(motocareBalance.cash)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">Ngân hàng</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(motocareBalance.bank)}</span>
            </div>
          </div>
        </div>

        {/* Pin Factory Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-xl"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-900 dark:text-white">Pin Factory</span>
            </div>

          </div>

          {pinLoading ? (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500 py-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang tải...</span>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(pinBalance.balance)}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/50 pt-3">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">Tiền mặt</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(pinBalance.cash || 0)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">Ngân hàng</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(pinBalance.bank || 0)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 pb-4 pt-4 flex flex-wrap gap-3 items-center">
        {/* Source Filter */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/50 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setSourceFilter("all")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${sourceFilter === "all"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent"
              }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setSourceFilter("motocare")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${sourceFilter === "motocare"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent"
              }`}
          >
            Motocare
          </button>
          <button
            onClick={() => setSourceFilter("pin")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${sourceFilter === "pin"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent"
              }`}
          >
            Pin Factory
          </button>
        </div>

        {/* Date Filter */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as any)}
          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300"
        >
          <option value="today">Hôm nay</option>
          <option value="week">7 ngày</option>
          <option value="month">30 ngày</option>
          <option value="all">Tất cả</option>
        </select>
      </div>

      {/* Transactions List */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Giao dịch ({combinedTransactions.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
              <p className="text-slate-500 mt-2">Đang tải dữ liệu...</p>
            </div>
          ) : combinedTransactions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Không có giao dịch nào
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {combinedTransactions.map((tx) => (
                <div
                  key={`${tx.source}-${tx.id}`}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                >
                  {/* Source Badge */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${tx.source === "motocare"
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : "bg-amber-100 dark:bg-amber-900/30"
                      }`}
                  >
                    {tx.source === "motocare" ? "🔧" : "🏭"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${isIncomeType(tx.type)
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                      >
                        {isIncomeType(tx.type) ? "Thu" : "Chi"}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatCashTxCategory(tx.category) || tx.category || "--"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-0.5">
                      {tx.description || "--"}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {formatDate(tx.date)}
                    </p>
                  </div>

                  {/* Amount */}
                  <div
                    className={`text-right font-bold ${isIncomeType(tx.type)
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                      }`}
                  >
                    {isIncomeType(tx.type) ? "+" : "-"}
                    {formatCurrency(Math.abs(tx.amount))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CombinedFinance;
