import React, { useMemo } from "react";
import { DollarSign, ArrowUpRight, ArrowDownRight, Briefcase, ShoppingBag } from "lucide-react";
import { useDashboardData } from "../hooks/useDashboardData";
import { useSalesRepo } from "../../../hooks/useSalesRepository";
import { useWorkOrdersRepo } from "../../../hooks/useWorkOrdersRepository";
import { formatCurrency } from "../../../utils/format";

export const BusinessTodayWidget: React.FC = () => {
  const { todayStats } = useDashboardData("today");
  const { data: sales = [] } = useSalesRepo();
  const { data: workOrders = [] } = useWorkOrdersRepo();

  // Compute yesterday's revenue
  const stats = useMemo(() => {
    const now = new Date();
    
    // Yesterday boundaries
    const yestStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const yestEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    
    const yestStartStr = yestStart.toISOString().slice(0, 10);
    const yestEndStr = yestEnd.toISOString().slice(0, 10);

    // Sales yesterday
    const yestSales = sales.filter((s) => {
      const sDate = s.date?.slice(0, 10);
      return sDate && sDate >= yestStartStr && sDate <= yestEndStr;
    });
    const yestSalesRev = yestSales.reduce((sum, s) => sum + (s.total || 0), 0);

    // Work Orders paid yesterday
    const yestWOs = workOrders.filter((wo: any) => {
      const woDate = (wo.creationDate || wo.creationdate)?.slice(0, 10);
      const isPaid = wo.paymentStatus === "paid" || wo.paymentstatus === "paid";
      return woDate && woDate >= yestStartStr && woDate <= yestEndStr && isPaid;
    });
    const yestWORev = yestWOs.reduce((sum, wo: any) => sum + (wo.totalPaid || wo.totalpaid || wo.total || 0), 0);

    const yesterdayRevenue = yestSalesRev + yestWORev;

    // Compare growth
    const diff = todayStats.revenue - yesterdayRevenue;
    const growthPercent = yesterdayRevenue > 0 ? Math.round((diff / yesterdayRevenue) * 100) : 0;

    return {
      yesterdayRevenue,
      growthPercent,
      growthDirection: diff >= 0 ? "up" : "down"
    };
  }, [sales, workOrders, todayStats.revenue]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur flex flex-col h-full justify-between">
      <div className="space-y-4">
        {/* Header */}
        <div className="border-b border-slate-850 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">💰 Business Today</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Hiệu năng tài chính cửa hàng hôm nay</p>
        </div>

        {/* 2 Main cards: Today vs Yesterday */}
        <div className="space-y-3">
          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[9px] text-slate-500 block uppercase font-bold">Doanh thu hôm nay</span>
              <span className="text-xl font-black text-white mt-1 block font-mono">
                {formatCurrency(todayStats.revenue)}
              </span>
            </div>
            
            {stats.growthPercent !== 0 && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${
                stats.growthDirection === "up"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
              }`}>
                {stats.growthDirection === "up" ? (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>+{stats.growthPercent}% so với hôm qua</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>{stats.growthPercent}% so với hôm qua</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl">
              <span className="text-[9px] text-slate-500 block uppercase font-bold">Doanh thu hôm qua</span>
              <span className="text-sm font-bold text-slate-350 mt-1 block font-mono">
                {formatCurrency(stats.yesterdayRevenue)}
              </span>
            </div>

            <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl">
              <span className="text-[9px] text-slate-500 block uppercase font-bold">Lợi nhuận ròng (ước tính)</span>
              <span className="text-sm font-bold text-emerald-400 mt-1 block font-mono">
                {formatCurrency(todayStats.profit)}
              </span>
            </div>
          </div>
        </div>

        {/* Sales & Repairs count breakdown */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 border border-blue-500/25 text-blue-400 rounded-lg shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block uppercase font-bold">Đơn hàng bán lẻ</span>
              <span className="text-xs font-black text-white font-mono mt-0.5">{todayStats.salesCount} hóa đơn</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl flex items-center gap-2.5">
            <div className="p-2 bg-violet-500/10 border border-violet-500/25 text-violet-400 rounded-lg shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] text-slate-500 block uppercase font-bold">Phiếu sửa xe</span>
              <span className="text-xs font-black text-white font-mono mt-0.5">{todayStats.workOrdersCount} phiếu</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-[9px] text-slate-550 border-t border-slate-850/50 pt-3 mt-4 text-left italic">
        * Lợi nhuận ròng được tính bằng Doanh thu trừ Giá vốn phụ tùng & Chi phí ngày.
      </div>
    </div>
  );
};
