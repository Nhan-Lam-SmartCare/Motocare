import React, { useMemo } from "react";
import { Wrench, Clock, CheckCircle2, PhoneCall, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkOrdersRepo } from "../../../hooks/useWorkOrdersRepository";
import { useAppContext } from "../../../contexts/AppContext";

export const RepairTodayWidget: React.FC = () => {
  const { data: workOrders = [] } = useWorkOrdersRepo();
  const { currentBranchId } = useAppContext();

  // Filter to active branch work orders
  const branchOrders = useMemo(() => {
    return workOrders.filter((wo: any) => wo.branchId === currentBranchId || wo.branch_id === currentBranchId);
  }, [workOrders, currentBranchId]);

  // Group stats
  const stats = useMemo(() => {
    const pending = branchOrders.filter((wo) => wo.status === "Tiếp nhận");
    const active = branchOrders.filter((wo) => wo.status === "Đang sửa");
    const ready = branchOrders.filter((wo) => wo.status === "Đã sửa xong" || wo.status === "Trả máy");
    
    // Customers to call: status is completed/ready but hasn't paid full or has unpaid balances
    const toCall = branchOrders.filter((wo) => {
      const isReady = wo.status === "Đã sửa xong" || wo.status === "Trả máy";
      const isUnpaid = wo.paymentStatus === "unpaid" || wo.paymentStatus === "partial";
      return isReady && isUnpaid;
    }).slice(0, 5); // Limit to top 5

    return { pending, active, ready, toCall };
  }, [branchOrders]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur flex flex-col h-full justify-between">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">🚗 Repair Today</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Trạng thái kỹ thuật tại chi nhánh</p>
          </div>
          <Link
            to="/service"
            className="text-[10.5px] font-bold text-fuchsia-400 hover:text-fuchsia-300 transition flex items-center gap-0.5"
          >
            Quản lý sửa <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 3 Metrics Blocks */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex flex-col items-center justify-center text-center">
            <Clock className="w-4 h-4 text-amber-500 mb-1" />
            <span className="text-[9px] text-slate-550 font-extrabold uppercase tracking-wide">Chờ sửa</span>
            <span className="text-lg font-black text-white font-mono mt-0.5">{stats.pending.length}</span>
          </div>

          <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex flex-col items-center justify-center text-center">
            <Wrench className="w-4 h-4 text-blue-500 mb-1" />
            <span className="text-[9px] text-slate-550 font-extrabold uppercase tracking-wide">Đang sửa</span>
            <span className="text-lg font-black text-white font-mono mt-0.5">{stats.active.length}</span>
          </div>

          <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mb-1" />
            <span className="text-[9px] text-slate-550 font-extrabold uppercase tracking-wide">Xong/Giao</span>
            <span className="text-lg font-black text-white font-mono mt-0.5">{stats.ready.length}</span>
          </div>
        </div>

        {/* Action required: Calls */}
        <div className="space-y-2.5">
          <h4 className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest flex items-center gap-1">
            <PhoneCall className="w-3.5 h-3.5 text-rose-500" />
            <span>Khách cần gọi giao xe / thu tiền</span>
          </h4>

          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
            {stats.toCall.map((wo: any, idx: number) => (
              <div
                key={idx}
                className="bg-slate-950/30 border border-slate-850 p-2.5 rounded-lg flex items-center justify-between hover:border-slate-800 transition"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{wo.customerName || wo.customername || "Khách vãng lai"}</span>
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
                      {wo.licensePlate || wo.licenseplate || "Chưa có biển"}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-550 font-sans mt-0.5">
                    {wo.vehicleName || wo.vehiclename || "Xe máy"} — Lỗi: {wo.symptoms || "Sửa chữa chung"}
                  </div>
                </div>
                <a
                  href={`tel:${wo.customerPhone || wo.customerphone}`}
                  className="p-1.5 bg-emerald-650/15 border border-emerald-500/25 hover:bg-emerald-650 hover:text-white rounded-lg text-emerald-400 transition"
                  title="Gọi khách hàng"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
            {stats.toCall.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-650 italic">
                Chưa có yêu cầu liên lạc khẩn cấp nào hôm nay.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-[9px] text-slate-550 border-t border-slate-850/50 pt-3 mt-4 text-left italic">
        * Dữ liệu tự động cập nhật đồng bộ từ Module Sửa chữa.
      </div>
    </div>
  );
};
