import React, { useState } from "react";
import {
  Flame,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ShoppingCart,
  Clock,
  Package,
  ArrowRight,
} from "lucide-react";
import { formatCurrency } from "../../../utils/format";
import type {
  RestockSuggestion,
  RestockPeriod,
  RestockUrgency,
} from "../hooks/useBestSellerRestock";

// =====================================================
// Best Seller Restock Panel
// Hiển thị đề xuất bổ sung hàng bán chạy
// =====================================================

interface BestSellerRestockPanelProps {
  suggestions: RestockSuggestion[];
  summary: {
    critical: number;
    warning: number;
    normal: number;
    total: number;
    totalCostToRestock: number;
  };
  period: RestockPeriod;
  setPeriod: (p: RestockPeriod) => void;
  restockCycle: number;
  setRestockCycle: (c: number) => void;
  onCreatePO: (partIds: string[]) => void;
}

const URGENCY_CONFIG: Record<
  RestockUrgency,
  {
    label: string;
    emoji: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  critical: {
    label: "Khẩn cấp",
    emoji: "🔴",
    bg: "bg-red-50 dark:bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-500/30",
    dot: "bg-red-500",
    badgeBg: "bg-red-500/15",
    badgeText: "text-red-600 dark:text-red-400",
  },
  warning: {
    label: "Cần nhập sớm",
    emoji: "🟡",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-500/30",
    dot: "bg-amber-500",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-600 dark:text-amber-400",
  },
  normal: {
    label: "Bình thường",
    emoji: "🟢",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-500/30",
    dot: "bg-emerald-500",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-600 dark:text-emerald-400",
  },
};

const BestSellerRestockPanel: React.FC<BestSellerRestockPanelProps> = ({
  suggestions,
  summary,
  period,
  setPeriod,
  restockCycle,
  setRestockCycle,
  onCreatePO,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterUrgency, setFilterUrgency] = useState<
    RestockUrgency | "all"
  >("all");

  if (suggestions.length === 0) return null;

  const filtered =
    filterUrgency === "all"
      ? suggestions
      : suggestions.filter((s) => s.urgency === filterUrgency);

  const allVisible = filtered.map((s) => s.partId);
  const allSelected =
    allVisible.length > 0 && allVisible.every((id) => selectedIds.has(id));
  const someSelected = allVisible.some((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisible));
    }
  };

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-gradient-to-br from-orange-50/80 via-rose-50/30 to-amber-50/50 dark:from-orange-500/5 dark:via-rose-500/5 dark:to-amber-500/5 border border-orange-200/60 dark:border-orange-500/20 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
      {/* ─── Header ─── */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-orange-100/30 dark:hover:bg-orange-500/5 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-rose-500 rounded-xl shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform duration-300">
            <Flame className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="text-left">
            <div className="text-sm font-black text-slate-900 dark:text-white leading-tight flex items-center gap-2">
              Sản phẩm bán chạy cần bổ sung
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-500/15 text-orange-600 dark:text-orange-400 tabular-nums">
                {summary.total}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {summary.critical > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {summary.critical} khẩn cấp
                </span>
              )}
              {summary.warning > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {summary.warning} cần sớm
                </span>
              )}
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                Phân tích {period} ngày
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Cost estimate pill */}
          {summary.totalCostToRestock > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-orange-200/40 dark:border-orange-500/20">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Chi phí ước tính:
              </span>
              <span className="text-xs font-extrabold text-orange-600 dark:text-orange-400 tabular-nums">
                {formatCurrency(summary.totalCostToRestock)}
              </span>
            </div>
          )}
          <ChevronDown
            className={`w-5 h-5 text-orange-500 transition-transform duration-300 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* ─── Expanded Content ─── */}
      {isExpanded && (
        <div className="border-t border-orange-200/50 dark:border-orange-500/15">
          {/* Toolbar */}
          <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 bg-white/40 dark:bg-slate-900/30">
            <div className="flex items-center gap-2">
              {/* Period selector */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                {([30, 60, 90] as RestockPeriod[]).map((p) => (
                  <button
                    key={p}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPeriod(p);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                      period === p
                        ? "bg-orange-500 text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-orange-600"
                    }`}
                  >
                    {p} ngày
                  </button>
                ))}
              </div>

              {/* Restock cycle selector */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Chu kỳ nhập:
                </span>
                <select
                  value={restockCycle}
                  onChange={(e) =>
                    setRestockCycle(Number(e.target.value) || 30)
                  }
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-orange-500/50"
                >
                  <option value={15}>15 ngày</option>
                  <option value={30}>30 ngày</option>
                  <option value={45}>45 ngày</option>
                  <option value={60}>60 ngày</option>
                </select>
              </div>

              {/* Urgency filter */}
              <div className="flex items-center gap-1">
                {(
                  [
                    { key: "all", label: "Tất cả", count: summary.total },
                    {
                      key: "critical",
                      label: "Khẩn",
                      count: summary.critical,
                    },
                    {
                      key: "warning",
                      label: "Sớm",
                      count: summary.warning,
                    },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterUrgency(f.key);
                    }}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                      filterUrgency === f.key
                        ? f.key === "critical"
                          ? "bg-red-500/15 text-red-600 dark:text-red-400"
                          : f.key === "warning"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {f.label}
                    {f.count > 0 && (
                      <span className="ml-1 tabular-nums">({f.count})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Create PO button */}
            <button
              disabled={selectedIds.size === 0}
              onClick={(e) => {
                e.stopPropagation();
                onCreatePO(Array.from(selectedIds));
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                selectedIds.size > 0
                  ? "bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white shadow-sm shadow-orange-500/20"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Đặt hàng
              {selectedIds.size > 0 && (
                <span className="tabular-nums">({selectedIds.size})</span>
              )}
            </button>
          </div>

          {/* ─── Desktop Table ─── */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-orange-50/60 dark:bg-orange-500/5">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      className="rounded border-orange-400"
                      checked={allSelected}
                      ref={(el) => {
                        if (el)
                          el.indeterminate =
                            !allSelected && someSelected;
                      }}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">
                    Sản phẩm
                  </th>
                  <th className="text-center px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">
                    Tồn kho
                  </th>
                  <th className="text-center px-3 py-2 font-semibold text-orange-600 dark:text-orange-400">
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Đã bán ({period}ng)
                    </span>
                  </th>
                  <th className="text-center px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">
                    Bán TB/ngày
                  </th>
                  <th className="text-center px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Còn bán được
                    </span>
                  </th>
                  <th className="text-center px-3 py-2 font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="inline-flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      Đề xuất nhập
                    </span>
                  </th>
                  <th className="text-center px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">
                    Mức khẩn cấp
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const isChecked = selectedIds.has(item.partId);
                  const cfg = URGENCY_CONFIG[item.urgency];

                  return (
                    <tr
                      key={item.partId}
                      onClick={() => toggleItem(item.partId)}
                      className={`border-t border-orange-100/50 dark:border-orange-500/10 cursor-pointer transition ${
                        isChecked
                          ? "bg-orange-100/60 dark:bg-orange-500/10"
                          : idx % 2 === 0
                          ? "bg-white dark:bg-slate-800/30 hover:bg-orange-50/50"
                          : "bg-orange-50/20 dark:bg-orange-500/[0.02] hover:bg-orange-50/50"
                      }`}
                    >
                      <td
                        className="px-3 py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="rounded border-orange-400"
                          checked={isChecked}
                          onChange={() => toggleItem(item.partId)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                          {item.partName}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.sku && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.sku}
                            </span>
                          )}
                          {item.category && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`font-bold tabular-nums ${
                              item.currentStock === 0
                                ? "text-red-600 dark:text-red-400"
                                : item.currentStock <= 5
                                ? "text-orange-600 dark:text-orange-400"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {item.currentStock}
                          </span>
                          {/* Mini progress bar */}
                          <div className="w-12 h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                item.stockPercentage <= 20
                                  ? "bg-red-500"
                                  : item.stockPercentage <= 50
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{
                                width: `${item.stockPercentage}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                          <TrendingUp className="w-3 h-3" />
                          {item.soldQty}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                          {item.avgDailySales.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-bold tabular-nums ${
                            item.daysUntilStockout <= 3
                              ? "text-red-600 dark:text-red-400"
                              : item.daysUntilStockout <= 7
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {item.daysUntilStockout >= 999
                            ? "∞"
                            : `${item.daysUntilStockout} ngày`}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold tabular-nums text-[11px]">
                          <ArrowRight className="w-3 h-3" />+
                          {item.suggestedQty}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.badgeBg} ${cfg.badgeText}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${
                              item.urgency === "critical"
                                ? "animate-pulse"
                                : ""
                            }`}
                          />
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ─── Mobile Cards ─── */}
          <div className="block sm:hidden p-2 space-y-2">
            {/* Select all for mobile */}
            <div className="flex items-center justify-between px-2 py-1">
              <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <input
                  type="checkbox"
                  className="rounded border-orange-400"
                  checked={allSelected}
                  ref={(el) => {
                    if (el)
                      el.indeterminate = !allSelected && someSelected;
                  }}
                  onChange={toggleAll}
                />
                Chọn tất cả ({filtered.length})
              </label>
              {/* Mobile restock cycle */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <Clock className="w-3 h-3 text-slate-400" />
                <select
                  value={restockCycle}
                  onChange={(e) =>
                    setRestockCycle(Number(e.target.value) || 30)
                  }
                  className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold text-slate-700 dark:text-slate-300"
                >
                  <option value={15}>15ng</option>
                  <option value={30}>30ng</option>
                  <option value={45}>45ng</option>
                  <option value={60}>60ng</option>
                </select>
              </div>
            </div>

            {filtered.map((item) => {
              const isChecked = selectedIds.has(item.partId);
              const cfg = URGENCY_CONFIG[item.urgency];

              return (
                <div
                  key={item.partId}
                  onClick={() => toggleItem(item.partId)}
                  className={`rounded-xl p-3 border cursor-pointer transition-all ${
                    isChecked
                      ? "bg-orange-50 dark:bg-orange-500/10 border-orange-300 dark:border-orange-500/30 shadow-sm"
                      : "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 hover:border-orange-300"
                  }`}
                >
                  {/* Top row: name + urgency */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        className="rounded border-orange-400 mt-0.5 flex-shrink-0"
                        checked={isChecked}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {item.partName}
                        </div>
                        {item.sku && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {item.sku}
                          </div>
                        )}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0 ${cfg.badgeBg} ${cfg.badgeText}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${
                          item.urgency === "critical"
                            ? "animate-pulse"
                            : ""
                        }`}
                      />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mt-2.5">
                    <div className="text-center flex-1">
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider font-medium">
                        Tồn kho
                      </div>
                      <div
                        className={`font-bold text-sm tabular-nums ${
                          item.currentStock === 0
                            ? "text-red-600"
                            : "text-orange-500"
                        }`}
                      >
                        {item.currentStock}
                      </div>
                      {/* Mini progress */}
                      <div className="w-full h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${
                            item.stockPercentage <= 20
                              ? "bg-red-500"
                              : item.stockPercentage <= 50
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${item.stockPercentage}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider font-medium">
                        Đã bán
                      </div>
                      <div className="font-bold text-sm text-orange-600 flex items-center justify-center gap-0.5 tabular-nums">
                        <TrendingUp className="w-3 h-3" />
                        {item.soldQty}
                      </div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider font-medium">
                        Còn bán
                      </div>
                      <div
                        className={`font-bold text-sm tabular-nums ${
                          item.daysUntilStockout <= 3
                            ? "text-red-600"
                            : item.daysUntilStockout <= 7
                            ? "text-amber-500"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {item.daysUntilStockout >= 999
                          ? "∞"
                          : `${item.daysUntilStockout}ng`}
                      </div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider font-medium">
                        Đề xuất
                      </div>
                      <div className="font-bold text-sm text-emerald-600 tabular-nums">
                        +{item.suggestedQty}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 flex items-center justify-between gap-3 bg-orange-50/40 dark:bg-orange-500/5 border-t border-orange-200/30 dark:border-orange-500/10">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              * Dựa trên dữ liệu bán hàng {period} ngày gần nhất. Đề
              xuất nhập đủ hàng cho {restockCycle} ngày tiếp theo.
            </div>
            {selectedIds.size > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreatePO(Array.from(selectedIds));
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm shadow-orange-500/20 hover:from-orange-600 hover:to-rose-600 transition flex-shrink-0"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Đặt hàng ({selectedIds.size})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BestSellerRestockPanel;
