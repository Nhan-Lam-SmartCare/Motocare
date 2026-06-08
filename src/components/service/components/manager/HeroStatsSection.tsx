import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { formatCurrency } from "../../../../utils/format";

interface StatCard {
  key: string;
  label: string;
  value: number;
  subtitle: string;
}

interface HeroStatsSectionProps {
  totalOpenTickets: number;
  urgentTickets: number;
  completionRate: number | string;
  statusSnapshotCards: StatCard[];
  activeTab: string;
  setActiveTab: (tab: any) => void;
  canViewServiceFinancial: boolean;
  showFinancialOverview: boolean;
  setShowFinancialOverview: (show: boolean) => void;
  filteredRevenue: number;
  filteredProfit: number;
  profitMargin: number | string;
  chartData: {
    data: Array<{ date: string; rev: number; prof: number }>;
    maxRev: number;
    maxProf: number;
  } | null;
}

export const HeroStatsSection: React.FC<HeroStatsSectionProps> = ({
  totalOpenTickets,
  urgentTickets,
  completionRate,
  statusSnapshotCards,
  activeTab,
  setActiveTab,
  canViewServiceFinancial,
  showFinancialOverview,
  setShowFinancialOverview,
  filteredRevenue,
  filteredProfit,
  profitMargin,
  chartData,
}) => {
  const colors: Record<
    string,
    {
      dot: string;
      glow: string;
      borderHover: string;
      activeBg: string;
      activeBorder: string;
      hoverBg: string;
      text: string;
    }
  > = {
    pending: {
      dot: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]",
      glow: "group-hover:shadow-[0_8px_30px_rgba(59,130,246,0.06)]",
      borderHover: "group-hover:border-blue-500/30 dark:group-hover:border-blue-500/20",
      activeBg: "bg-blue-50/80 dark:bg-[#141b30]/90",
      activeBorder: "border-blue-500/50 dark:border-blue-400/40",
      hoverBg: "hover:bg-blue-50/20 dark:hover:bg-[#141b30]/20",
      text: "text-blue-500 dark:text-blue-400",
    },
    inProgress: {
      dot: "bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]",
      glow: "group-hover:shadow-[0_8px_30px_rgba(245,158,11,0.06)]",
      borderHover: "group-hover:border-amber-500/30 dark:group-hover:border-amber-500/20",
      activeBg: "bg-amber-50/80 dark:bg-[#281c15]/90",
      activeBorder: "border-amber-500/50 dark:border-amber-400/40",
      hoverBg: "hover:bg-amber-50/20 dark:hover:bg-[#281c15]/20",
      text: "text-amber-500 dark:text-amber-400",
    },
    done: {
      dot: "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]",
      glow: "group-hover:shadow-[0_8px_30px_rgba(6,182,212,0.06)]",
      borderHover: "group-hover:border-cyan-500/30 dark:group-hover:border-cyan-500/20",
      activeBg: "bg-cyan-50/80 dark:bg-[#12222d]/90",
      activeBorder: "border-cyan-500/50 dark:border-cyan-400/40",
      hoverBg: "hover:bg-cyan-50/20 dark:hover:bg-[#12222d]/20",
      text: "text-cyan-500 dark:text-cyan-400",
    },
    delivered: {
      dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
      glow: "group-hover:shadow-[0_8px_30px_rgba(16,185,129,0.06)]",
      borderHover: "group-hover:border-emerald-500/30 dark:group-hover:border-emerald-500/20",
      activeBg: "bg-emerald-50/80 dark:bg-[#11241f]/90",
      activeBorder: "border-emerald-500/50 dark:border-emerald-400/40",
      hoverBg: "hover:bg-emerald-50/20 dark:hover:bg-[#11241f]/20",
      text: "text-emerald-500 dark:text-emerald-400",
    },
  };

  return (
    <div className="space-y-4">
      {/* Cụm Thống kê (Hero Stats) - Giao diện mới Flat Grid */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-200 uppercase flex items-center gap-2">
            <span>Tổng quan hoạt động</span>
            <span className="text-[9.5px] font-bold px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-500/20 leading-none">
              Thời gian thực
            </span>
          </h2>
        </div>

        {/* Tóm tắt nhanh */}
        <div className="flex items-center gap-3 text-[11px] bg-slate-50/70 dark:bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/40 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-450 dark:text-slate-500 font-extrabold uppercase tracking-wider">
              Đang mở:
            </span>
            <span className="font-extrabold text-slate-900 dark:text-white">
              {totalOpenTickets}
            </span>
          </div>
          <div className="w-px h-3 bg-slate-200/60 dark:bg-slate-700/60"></div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-450 dark:text-slate-500 font-extrabold uppercase tracking-wider">
              Cần xử lý:
            </span>
            <span className="font-extrabold text-amber-650 dark:text-amber-500">
              {urgentTickets}
            </span>
          </div>
          <div className="w-px h-3 bg-slate-200/60 dark:bg-slate-700/60"></div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-450 dark:text-slate-500 font-extrabold uppercase tracking-wider">
              Tỷ lệ HT:
            </span>
            <span className="font-extrabold text-emerald-650 dark:text-emerald-400">
              {totalOpenTickets > 0 ? `${completionRate}%` : "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 4 Thẻ Quy trình Trạng thái */}
        {statusSnapshotCards.map((card) => {
          const style = colors[card.key] || {
            dot: "bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.6)]",
            glow: "group-hover:shadow-[0_8px_30px_rgba(148,163,184,0.06)]",
            borderHover: "group-hover:border-slate-400/30",
            activeBg: "bg-slate-50/80 dark:bg-slate-900/90",
            activeBorder: "border-slate-500/50 dark:border-slate-400/40",
            hoverBg: "hover:bg-slate-50/20 dark:hover:bg-slate-900/20",
            text: "text-slate-500 dark:text-slate-400",
          };

          const isActive = activeTab === card.key;

          return (
            <button
              key={card.key}
              onClick={() => setActiveTab(isActive ? "all" : card.key)}
              className={`relative group flex flex-col justify-between p-3 rounded-2xl transition-all duration-300 focus:outline-none border text-left h-[76px] ${
                style.glow
              } hover:-translate-y-0.5 shadow-sm hover:shadow-md ${
                isActive
                  ? `${style.activeBg} ${style.activeBorder} ring-1 ring-slate-500/10`
                  : `bg-white/60 dark:bg-slate-800/80 border-slate-200/40 dark:border-slate-700/60 ${style.hoverBg} ${style.borderHover}`
              }`}
            >
              {/* Top line with title and status dot */}
              <div className="w-full flex items-center justify-between gap-2 leading-none">
                <span className="text-[9px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest leading-none">
                  {card.label}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
              </div>

              {/* Metric Value */}
              <div className="mt-1 flex items-baseline gap-1.5 w-full leading-none">
                <span className="text-2xl font-black tracking-tight text-slate-950 dark:text-white font-mono leading-none">
                  {card.value}
                </span>
                <span className="text-[9.5px] text-slate-450 dark:text-slate-500 font-semibold truncate max-w-[80px] leading-none">
                  {card.subtitle}
                </span>
              </div>
            </button>
          );
        })}

        {/* Khối Tài chính: Doanh thu */}
        {canViewServiceFinancial ? (
          <div className="relative group flex flex-col justify-between p-3 rounded-2xl transition-all duration-300 border text-left h-[76px] bg-white/60 dark:bg-slate-800/80 border-slate-200/40 dark:border-blue-500/20 hover:border-blue-500/30 shadow-sm hover:shadow-md overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-blue-500/[0.03] rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/[0.06] transition-all duration-500" />

            <div className="w-full flex items-center justify-between gap-2 leading-none">
              <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none">
                Doanh thu
              </span>
              <button
                onClick={() => setShowFinancialOverview(!showFinancialOverview)}
                className="p-1 rounded-lg bg-slate-100/40 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-700/80 transition-all border border-slate-200/10 hover:scale-105 active:scale-95 leading-none flex items-center justify-center"
                aria-label="Ẩn/hiện doanh thu"
              >
                {showFinancialOverview ? (
                  <Eye className="w-3 h-3 text-slate-450" />
                ) : (
                  <EyeOff className="w-3 h-3 text-slate-450" />
                )}
              </button>
            </div>

            <div className="mt-1 flex items-end justify-between w-full leading-none">
              <span className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-none">
                {showFinancialOverview
                  ? formatCurrency(filteredRevenue)
                  : "•••••••"}
              </span>
              {showFinancialOverview && chartData && (
                <div
                  className="h-6 w-14 flex items-end gap-[1.5px] opacity-80"
                  aria-hidden="true"
                >
                  {chartData.data.map((d, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-blue-500/[0.06] rounded-full relative h-full"
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-full"
                        style={{
                          height: `${Math.max(
                            (d.rev / chartData.maxRev) * 100,
                            10
                          )}%`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50/50 dark:bg-[#080911]/40 border border-slate-200/30 dark:border-slate-800 p-2 text-[10px] text-slate-450 dark:text-slate-550 flex items-center justify-center text-center h-[76px]">
            Ẩn tài chính
          </div>
        )}

        {/* Khối Tài chính: Lợi nhuận */}
        {canViewServiceFinancial ? (
          <div className="relative group flex flex-col justify-between p-3 rounded-2xl transition-all duration-300 border text-left h-[76px] bg-white/60 dark:bg-slate-800/80 border-slate-200/40 dark:border-emerald-500/20 hover:border-emerald-500/30 shadow-sm hover:shadow-md overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-emerald-500/[0.03] rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/[0.06] transition-all duration-500" />

            <div className="w-full flex items-center justify-between gap-2 leading-none">
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">
                Lợi nhuận
              </span>
              <span className="text-[8.5px] font-extrabold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 px-1 py-0.5 rounded border border-emerald-200/30 dark:border-emerald-500/25 leading-none">
                {showFinancialOverview ? `${profitMargin}%` : "••%"}
              </span>
            </div>

            <div className="mt-1 flex items-end justify-between w-full leading-none">
              <span className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-none">
                {showFinancialOverview
                  ? formatCurrency(filteredProfit)
                  : "•••••••"}
              </span>
              {showFinancialOverview && chartData && (
                <div
                  className="h-6 w-14 flex items-end gap-[1.5px] opacity-80"
                  aria-hidden="true"
                >
                  {chartData.data.map((d, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-emerald-500/[0.06] rounded-full relative h-full"
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-full"
                        style={{
                          height: `${Math.max(
                            (Math.abs(d.prof) / chartData.maxProf) * 100,
                            10
                          )}%`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50/50 dark:bg-[#080911]/40 border border-slate-200/30 dark:border-slate-800 p-2 text-[10px] text-slate-450 dark:text-slate-550 flex items-center justify-center text-center h-[76px]">
            Ẩn tài chính
          </div>
        )}
      </div>
    </div>
  );
};
