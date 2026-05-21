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
    <div className="h-full flex flex-col bg-transparent space-y-6">
      {/* Header Panel - Premium Glass Card */}
      <div className="bg-gradient-to-b from-[#161F32]/65 to-[#0F1626]/85 backdrop-blur-2xl border border-[#2B354A]/50 p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-slate-200 tracking-wide uppercase">
                Tổng hợp Tài chính
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Giao dịch đồng bộ đa nguồn hệ thống
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-4.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white rounded-xl font-extrabold shadow-[0_4px_20px_rgba(59,130,246,0.25)] hover:shadow-[0_4px_25px_rgba(59,130,246,0.4)] active:scale-95 transition-all duration-200 flex items-center gap-2 text-xs uppercase tracking-wider border border-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Đồng bộ 2 chiều"
            >
              <ArrowLeftRight
                className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
              />
              <span>Đồng bộ</span>
            </button>
            <button
              onClick={loadPinData}
              disabled={isLoading}
              className="p-2.5 bg-[#1E293B]/40 hover:bg-[#1E293B]/80 text-slate-300 hover:text-slate-100 border border-[#2B354A]/60 hover:border-slate-500 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Sync Result */}
        {syncResult && (
          <div className="p-4 bg-slate-900/60 backdrop-blur-md rounded-xl text-xs font-semibold text-blue-300 border border-blue-500/20 whitespace-pre-line shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
            {syncResult}
          </div>
        )}

        {/* Total Accumulated Balance */}
        <div className="bg-gradient-to-r from-[#141C30]/50 to-[#0C101A]/60 border border-[#2B354A]/40 rounded-2xl p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full pointer-events-none" />
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-450 block mb-1">
            💎 Tổng Số Dư Lũy Kế
          </span>
          <div className="text-3xl font-extrabold text-blue-400 drop-shadow-[0_2px_8px_rgba(59,130,246,0.3)] font-mono leading-none">
            {formatCurrency(totalBalance).replace("₫", "")} <span className="text-sm font-medium text-slate-400 font-sans">₫</span>
          </div>
          <div className="mt-4 flex gap-4 text-xs font-bold text-slate-300">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B]" />
              Tiền mặt: {formatCurrency(totalCash)}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#3B82F6]" />
              Ngân hàng: {formatCurrency(totalBank)}
            </span>
          </div>
        </div>
      </div>

      {/* Balance Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Motocare Card */}
        <div className="bg-gradient-to-br from-[#0F223D]/45 via-[#0C1221]/75 to-[#0B0F19]/90 border border-blue-500/20 hover:border-blue-500/40 hover:shadow-[0_0_35px_rgba(59,130,246,0.12)] group transition-all duration-300 rounded-2xl p-5 relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] flex items-center justify-between">
          <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full pointer-events-none" />
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg">
                <Wrench className="w-4 h-4" />
              </div>
              <span className="text-[12px] font-extrabold uppercase tracking-wider text-slate-400">
                🔧 Motocare Branch
              </span>
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-100 group-hover:text-blue-300 transition-colors drop-shadow-[0_2px_6px_rgba(59,130,246,0.25)] leading-none">
              {formatCurrency(motocareBalance.total).replace("₫", "")} <span className="text-xs font-medium text-slate-400 font-sans">₫</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 border-t border-slate-800/60 pt-3">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-black">Tiền mặt</span>
                <span className="font-bold text-slate-200 font-mono mt-0.5">{formatCurrency(motocareBalance.cash)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-black">Ngân hàng</span>
                <span className="font-bold text-slate-200 font-mono mt-0.5">{formatCurrency(motocareBalance.bank)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pin Factory Card */}
        <div className="bg-gradient-to-br from-[#271E17]/45 via-[#181310]/75 to-[#0B0F19]/90 border border-amber-500/20 hover:border-amber-500/40 hover:shadow-[0_0_35px_rgba(245,158,11,0.12)] group transition-all duration-300 rounded-2xl p-5 relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] flex items-center justify-between">
          <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full pointer-events-none" />
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-[12px] font-extrabold uppercase tracking-wider text-slate-400">
                🏭 Pin Factory
              </span>
            </div>

            {pinLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tải số dư đối tác...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold font-mono tracking-tight text-slate-100 group-hover:text-amber-300 transition-colors drop-shadow-[0_2px_6px_rgba(245,158,11,0.25)] leading-none">
                  {formatCurrency(pinBalance.balance).replace("₫", "")} <span className="text-xs font-medium text-slate-400 font-sans">₫</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 border-t border-slate-800/60 pt-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-black">Tiền mặt</span>
                    <span className="font-bold text-slate-200 font-mono mt-0.5">{formatCurrency(pinBalance.cash || 0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-black">Ngân hàng</span>
                    <span className="font-bold text-slate-200 font-mono mt-0.5">{formatCurrency(pinBalance.bank || 0)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filters Shelf - Styled in glass capsules */}
      <div className="bg-[#141C2E]/65 backdrop-blur-xl border border-[#2B354A]/40 p-3 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.25)] flex flex-wrap gap-4 items-center mb-4 transition-all duration-300 hover:border-[#35425C]/60">
        {/* Source Filter */}
        <div className="bg-[#0C101A]/95 border border-[#2B354A]/60 p-1.5 rounded-xl flex items-center gap-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
          {[
            { value: "all", label: "Tất cả" },
            { value: "motocare", label: "Motocare" },
            { value: "pin", label: "Pin Factory" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setSourceFilter(option.value as any)}
              className={`px-4 py-1.5 rounded-lg font-extrabold text-xs uppercase tracking-wider border transition-all duration-200 ${
                sourceFilter === option.value
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/35 shadow-[0_2px_8px_rgba(59,130,246,0.15)]"
                  : "bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/30"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Date Filter */}
        <div className="bg-[#0C101A]/95 border border-[#2B354A]/60 p-1.5 rounded-xl flex items-center gap-1.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="py-1.5 pl-3.5 pr-9 bg-transparent border-none text-xs font-extrabold uppercase tracking-wider text-slate-300 hover:text-white focus:ring-0 cursor-pointer appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.8' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: `right 0.35rem center`,
              backgroundRepeat: `no-repeat`,
              backgroundSize: `1.3em 1.3em`,
            }}
          >
            <option value="today">Hôm nay</option>
            <option value="week">7 ngày</option>
            <option value="month">30 ngày</option>
            <option value="all">Tất cả</option>
          </select>
        </div>
      </div>

      {/* Transactions List - Rebuilt as spaced row capsules for perfect breathing room */}
      <div className="flex-1 overflow-visible pb-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-400">
              Danh sách giao dịch ({combinedTransactions.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-slate-400 bg-[#121929]/50 backdrop-blur-xl border border-[#222E45]/50 rounded-2xl">
              <Loader2 className="w-7 h-7 animate-spin mx-auto text-blue-500 mb-3" />
              <p className="text-sm font-semibold tracking-wide">Đang tải dữ liệu đồng bộ...</p>
            </div>
          ) : combinedTransactions.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-[#121929]/50 backdrop-blur-xl border border-[#222E45]/50 rounded-2xl font-bold text-sm tracking-wide">
              📭 Không tìm thấy giao dịch nào phù hợp
            </div>
          ) : (
            <div className="space-y-3">
              {combinedTransactions.map((tx) => {
                const isIncome = isIncomeType(tx.type);
                return (
                  <div
                    key={`${tx.source}-${tx.id}`}
                    className={`px-5 py-4.5 flex items-center justify-between gap-4 bg-[#121929]/50 backdrop-blur-xl border border-[#222E45]/50 rounded-2xl hover:bg-[#1C263B]/65 hover:border-[#354363]/60 transition-all duration-300 group shadow-md ${
                      isIncome
                        ? "hover:shadow-[inset_4px_0_0_#10B981]"
                        : "hover:shadow-[inset_4px_0_0_#F43F5E]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Source Icon Badge */}
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg border shadow-sm transition-transform duration-300 group-hover:scale-105 ${
                          tx.source === "motocare"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/25 shadow-blue-500/5"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/25 shadow-amber-500/5"
                        }`}
                      >
                        {tx.source === "motocare" ? "🔧" : "🏭"}
                      </div>

                      {/* Info Panel - Organized horizontally to reduce visual vertical density */}
                      <div className="min-w-0 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                              isIncome
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            }`}
                          >
                            {isIncome ? "Thu" : "Chi"}
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            {formatCashTxCategory(tx.category) || tx.category || "--"}
                          </span>
                          <span className="text-[11px] text-slate-400 font-semibold bg-slate-800/30 px-2 py-0.5 rounded border border-[#2B354A]/30 font-mono tracking-wide leading-none shadow-sm">
                            🕒 {formatDate(tx.date)}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-100 truncate group-hover:text-white transition-colors leading-relaxed">
                          {tx.description || "--"}
                        </p>
                      </div>
                    </div>

                    {/* Amount */}
                    <div
                      className={`text-right font-extrabold font-mono text-[16px] tracking-tight ${
                        isIncome
                          ? "text-emerald-400 drop-shadow-[0_2px_4px_rgba(16,185,129,0.2)]"
                          : "text-rose-400 drop-shadow-[0_2px_4px_rgba(244,63,94,0.2)]"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatCurrency(Math.abs(tx.amount))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CombinedFinance;
