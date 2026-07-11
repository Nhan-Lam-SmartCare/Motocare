import React, { useMemo } from "react";
import { Clapperboard, FileText, Image, ChevronRight, MessageSquare, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useMarketingVideos, useMarketingScripts, useMarketingIdeas } from "../../../hooks/useMarketingRepository";

export const ContentTodayWidget: React.FC = () => {
  const { data: videos = [] } = useMarketingVideos();
  const { data: scripts = [] } = useMarketingScripts();
  const { data: ideas = [] } = useMarketingIdeas();

  // Aggregate content statistics
  const stats = useMemo(() => {
    // 1. Script cần viết (Ý tưởng chưa thành kịch bản chi tiết hoặc kịch bản ở nháp)
    const pendingScripts = scripts.filter((s: any) => !s.content || s.content.length < 50);

    // 2. Video cần quay (Có kịch bản nhưng chưa quay xong)
    const videosToShoot = videos.filter((v: any) => !v.filmingDate || v.filmingDate === "");

    // 3. Thumbnail cần làm (Video chưa điền hình ảnh preview)
    const thumbnailsToMake = videos.filter((v: any) => !v.thumbnail || v.thumbnail.includes("placeholder"));

    // 4. Video cần đăng (Có file hoặc đã quay/dựng nhưng chưa có ngày đăng)
    const videosToPost = videos.filter((v: any) => !v.postingDate || v.postingDate === "");

    return {
      ideasCount: ideas.length,
      scriptsToWrite: pendingScripts.length,
      videosToShoot: videosToShoot.length,
      thumbnailsToMake: thumbnailsToMake.length,
      videosToPost: videosToPost.length
    };
  }, [videos, scripts, ideas]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur flex flex-col h-full justify-between">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">🎬 Content Today</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Tiến độ sản xuất nội dung Studio</p>
          </div>
          <Link
            to="/marketing"
            className="text-[10.5px] font-bold text-fuchsia-400 hover:text-fuchsia-300 transition flex items-center gap-0.5"
          >
            Vào Studio <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Action checklist stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex items-center gap-3 hover:border-slate-800 transition">
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] text-slate-550 block uppercase font-bold">Kịch bản viết</span>
              <span className="text-sm font-black text-white font-mono mt-0.5">{stats.scriptsToWrite} bài</span>
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex items-center gap-3 hover:border-slate-800 transition">
            <div className="p-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-lg shrink-0">
              <Clapperboard className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] text-slate-550 block uppercase font-bold">Video cần quay</span>
              <span className="text-sm font-black text-white font-mono mt-0.5">{stats.videosToShoot} clips</span>
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex items-center gap-3 hover:border-slate-800 transition">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg shrink-0">
              <Image className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] text-slate-550 block uppercase font-bold">Thumbnail làm</span>
              <span className="text-sm font-black text-white font-mono mt-0.5">{stats.thumbnailsToMake} ảnh</span>
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex items-center gap-3 hover:border-slate-800 transition">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
              <PlayCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] text-slate-550 block uppercase font-bold">Video cần đăng</span>
              <span className="text-sm font-black text-white font-mono mt-0.5">{stats.videosToPost} clips</span>
            </div>
          </div>
        </div>

        {/* Creative idea note brief */}
        <div className="bg-slate-950/40 border border-slate-850 p-3.5 rounded-xl text-xs space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
            <span>Kho ý tưởng chưa quay</span>
            <span className="text-purple-400 font-mono">{stats.ideasCount} ý tưởng</span>
          </div>
          <p className="text-[11px] text-slate-450 leading-relaxed">
            Bạn đang có <strong className="text-purple-400">{stats.ideasCount} ý tưởng</strong> chờ triển khai trong kho. Hãy tranh thủ lên kịch bản để chuẩn bị thiết bị bấm máy!
          </p>
        </div>
      </div>

      <div className="text-[9px] text-slate-550 border-t border-slate-850/50 pt-3 mt-4 text-left italic">
        * Dữ liệu tự động cập nhật đồng bộ từ Marketing Hub (Studio).
      </div>
    </div>
  );
};
