import React, { useMemo } from "react";
import { Sparkles, ArrowRight, Lightbulb } from "lucide-react";
import { useWorkOrdersRepo } from "../../../hooks/useWorkOrdersRepository";
import { useMarketingVideos, useMarketingScripts } from "../../../hooks/useMarketingRepository";
import { useDashboardData } from "../hooks/useDashboardData";

export const SmartCareAiWidget: React.FC = () => {
  const { data: workOrders = [] } = useWorkOrdersRepo();
  const { data: videos = [] } = useMarketingVideos();
  const { data: scripts = [] } = useMarketingScripts();
  const { todayStats } = useDashboardData("today");

  const counts = useMemo(() => {
    const activeWO = workOrders.filter((w) => w.status === "Tiếp nhận" || w.status === "Đang sửa").length;
    const pendingVideos = videos.filter((v: any) => !v.filmingDate).length;
    const pendingScripts = scripts.filter((s: any) => !s.content || s.content.length < 50).length;

    return {
      activeWO,
      pendingVideos,
      pendingScripts,
      salesCount: todayStats.salesCount
    };
  }, [workOrders, videos, scripts, todayStats]);

  return (
    <div className="bg-gradient-to-br from-fuchsia-950/20 via-slate-900/60 to-purple-950/20 border border-fuchsia-900/30 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur flex flex-col h-full justify-between">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-fuchsia-900/20 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-fuchsia-500 animate-pulse" />
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">🧠 SmartCare AI</h3>
              <p className="text-[10px] text-fuchsia-400 font-bold mt-0.5">Trợ lý Tóm tắt & Gợi ý hành động ngày</p>
            </div>
          </div>
        </div>

        {/* AI Daily Brief Message block */}
        <div className="space-y-3">
          <div className="text-xs text-slate-200 leading-relaxed font-medium">
            Xin chào Nhạn. Hôm nay bạn đang có:
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-xl flex items-center gap-2">
              <span className="text-lg">🚗</span>
              <span className="text-xs font-bold text-slate-300">
                <strong className="text-fuchsia-400 font-mono">{counts.activeWO}</strong> xe cần xử lý
              </span>
            </div>

            <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-xl flex items-center gap-2">
              <span className="text-lg">🎥</span>
              <span className="text-xs font-bold text-slate-300">
                <strong className="text-fuchsia-400 font-mono">{counts.pendingVideos}</strong> video cần quay
              </span>
            </div>

            <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-xl flex items-center gap-2">
              <span className="text-lg">📝</span>
              <span className="text-xs font-bold text-slate-300">
                <strong className="text-fuchsia-400 font-mono">{counts.pendingScripts}</strong> kịch bản nháp
              </span>
            </div>

            <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-xl flex items-center gap-2">
              <span className="text-lg">📦</span>
              <span className="text-xs font-bold text-slate-300">
                <strong className="text-fuchsia-400 font-mono">{counts.salesCount}</strong> đơn hàng hôm nay
              </span>
            </div>
          </div>
        </div>

        {/* Suggestion Card */}
        <div className="bg-fuchsia-500/5 border border-fuchsia-500/10 p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-fuchsia-400 font-bold text-[10px] uppercase tracking-wider">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Gợi ý chiến lược hôm nay:</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            "Hôm nay trời nắng đẹp, lưu lượng khách bảo dưỡng xe sẽ tăng. Nên tập trung quay 1 video ngắn review kỹ thuật thay nhớt hộp số xe ga và chia sẻ lên Tiktok. Từ khóa <strong className="text-fuchsia-400">#baoduongxega</strong> đang có lượng tìm kiếm tăng vọt <strong>+35%</strong> tuần này!"
          </p>
        </div>
      </div>

      <div className="text-[9px] text-fuchsia-500/50 border-t border-fuchsia-950/40 pt-3 mt-4 text-left italic">
        * Nhận định từ AI dựa trên lưu lượng sửa chữa và xu hướng tiếp thị ngoài hệ thống.
      </div>
    </div>
  );
};
