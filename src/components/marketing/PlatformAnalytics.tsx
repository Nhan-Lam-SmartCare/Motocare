import React, { useMemo } from "react";
import {
  TrendingUp,
  Eye,
  MessageSquare,
  Share2,
  Bookmark,
  Inbox,
  UserCheck,
  DollarSign,
  Globe,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MarketingVideo } from "../../types/marketing";
import { formatCurrency, formatDate } from "../../utils/format";
import { showToast } from "../../utils/toast";
import { AiPreviewModal } from "./AiPreviewModal";
import { Sparkles } from "lucide-react";
import { useState } from "react";

interface PlatformAnalyticsProps {
  platformName: "TikTok" | "Facebook" | "YouTube" | "Website";
  videos: MarketingVideo[];
}

export const PlatformAnalytics: React.FC<PlatformAnalyticsProps> = ({
  platformName,
  videos = [],
}) => {
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const getAiButtonDetails = () => {
    switch (platformName) {
      case "TikTok":
        return {
          label: "AI SEO Review",
          feature: "seo",
          title: "✨ AI SEO TikTok Advisor",
          description: "AI đánh giá và chấm điểm SEO cho thẻ tiêu đề, hashtag và caption để tối ưu thuật toán tìm kiếm TikTok.",
        };
      case "Facebook":
        return {
          label: "AI Rewrite Caption",
          feature: "rewrite",
          title: "✨ AI Rewrite Facebook",
          description: "AI viết lại nội dung caption bài đăng Facebook theo nhiều phong cách thu hút tương tác (Story-selling, khuyến mãi).",
        };
      case "YouTube":
        return {
          label: "AI Shorts Opt",
          feature: "seo",
          title: "✨ AI YouTube Shorts Optimizer",
          description: "AI gợi ý tiêu đề giật gân, thẻ tag và mô tả ngắn tăng tỷ lệ click (CTR) cho Shorts.",
        };
      default:
        return {
          label: "AI SEO Article",
          feature: "rewrite",
          title: "✨ AI SEO Blog Article",
          description: "AI tự động chuyển kịch bản video thành một bài viết chuẩn SEO đăng tải trực tiếp lên Website.",
        };
    }
  };

  const aiDetails = getAiButtonDetails();

  const handleConfirmAiPlatformAction = (data: any) => {
    showToast.success(`AI thực thi hoàn tất!`);
    alert(`💡 Đề xuất gợi ý từ SmartCare AI:\n\n${typeof data === "string" ? data : JSON.stringify(data, null, 2)}`);
  };
  // Filter videos that have a link for this specific platform
  const platformVideos = useMemo(() => {
    return videos.filter((video) => {
      if (platformName === "TikTok") return !!video.tiktokLink;
      if (platformName === "Facebook") return !!video.facebookLink;
      if (platformName === "YouTube") return !!video.youtubeLink;
      // Website: we can default to videos having no links or placeholder
      return !video.tiktokLink && !video.facebookLink && !video.youtubeLink;
    });
  }, [videos, platformName]);

  // Aggregate stats
  const stats = useMemo(() => {
    // If no videos are explicitly linked, we attribute a percentage of overall metrics for demonstration
    const vList = platformVideos.length > 0 ? platformVideos : videos;
    const count = platformVideos.length;

    let views = 0, comments = 0, shares = 0, saves = 0, inboxes = 0, visitors = 0, revenue = 0;

    if (platformVideos.length > 0) {
      views = platformVideos.reduce((acc, v) => acc + (v.views || 0), 0);
      comments = platformVideos.reduce((acc, v) => acc + (v.comments || 0), 0);
      shares = platformVideos.reduce((acc, v) => acc + (v.shares || 0), 0);
      saves = platformVideos.reduce((acc, v) => acc + (v.saves || 0), 0);
      inboxes = platformVideos.reduce((acc, v) => acc + (v.inboxes || 0), 0);
      visitors = platformVideos.reduce((acc, v) => acc + (v.visitors || 0), 0);
      revenue = platformVideos.reduce((acc, v) => acc + (v.revenue || 0), 0);
    } else {
      // Demo attribution splits
      const multiplier = platformName === "TikTok" ? 0.5 : platformName === "Facebook" ? 0.3 : platformName === "YouTube" ? 0.18 : 0.02;
      const overallViews = videos.reduce((acc, v) => acc + (v.views || 0), 0);
      const overallInbox = videos.reduce((acc, v) => acc + (v.inboxes || 0), 0);
      const overallRevenue = videos.reduce((acc, v) => acc + (v.revenue || 0), 0);

      views = Math.round(overallViews * multiplier);
      inboxes = Math.round(overallInbox * multiplier);
      revenue = overallRevenue * multiplier;
      comments = Math.round(videos.reduce((acc, v) => acc + (v.comments || 0), 0) * multiplier);
      shares = Math.round(videos.reduce((acc, v) => acc + (v.shares || 0), 0) * multiplier);
      saves = Math.round(videos.reduce((acc, v) => acc + (v.saves || 0), 0) * multiplier);
      visitors = Math.round(videos.reduce((acc, v) => acc + (v.visitors || 0), 0) * multiplier);
    }

    return {
      count,
      views,
      comments,
      shares,
      saves,
      inboxes,
      visitors,
      revenue,
    };
  }, [platformVideos, videos, platformName]);

  // Chart data: Trend (Chronological view logs)
  const chartData = useMemo(() => {
    const list = platformVideos.length > 0 ? platformVideos : videos;
    return list
      .map((v) => ({
        date: formatDate(v.postingDate || v.created_at).slice(0, 5), // DD/MM
        "Lượt xem": v.views,
        "Inbox": v.inboxes,
      }))
      .slice(-10); // last 10 records
  }, [platformVideos, videos]);

  const kpis = [
    { label: "Tổng lượt xem", value: stats.views.toLocaleString(), icon: <Eye className="w-5 h-5 text-blue-500" />, border: "border-t-blue-500" },
    { label: "Bình luận", value: stats.comments.toLocaleString(), icon: <MessageSquare className="w-5 h-5 text-emerald-500" />, border: "border-t-emerald-500" },
    { label: "Chia sẻ", value: stats.shares.toLocaleString(), icon: <Share2 className="w-5 h-5 text-teal-500" />, border: "border-t-teal-500" },
    { label: "Lưu bài đăng", value: stats.saves.toLocaleString(), icon: <Bookmark className="w-5 h-5 text-violet-500" />, border: "border-t-violet-500" },
    { label: "Khách Inbox", value: stats.inboxes.toLocaleString(), icon: <Inbox className="w-5 h-5 text-pink-500" />, border: "border-t-pink-500" },
    { label: "Khách đến tiệm", value: stats.visitors.toLocaleString(), icon: <UserCheck className="w-5 h-5 text-cyan-500" />, border: "border-t-cyan-500" },
    { label: "Doanh thu nguồn", value: formatCurrency(stats.revenue), icon: <DollarSign className="w-5 h-5 text-rose-500" />, border: "border-t-rose-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-6 h-6 text-fuchsia-600" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Phân tích hiệu quả kênh: {platformName} ({stats.count} Video)
          </h3>
        </div>

        <button
          onClick={() => setAiModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-650 hover:bg-purple-750 text-white rounded-lg text-xs font-bold shadow transition-colors animate-pulse"
        >
          <Sparkles className="w-4 h-4 text-white" />
          <span>{aiDetails.label}</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className={`bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 border-t-4 ${kpi.border} shadow-sm flex flex-col justify-between h-24`}
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
                {kpi.label}
              </span>
              {kpi.icon}
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-fuchsia-500" />
          <span>Biểu đồ tăng trưởng lượt xem & Inbox</span>
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.2} />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "12px",
              }}
            />
            <Area type="monotone" dataKey="Lượt xem" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorViews)" />
            <Area type="monotone" dataKey="Inbox" stroke="#ec4899" fill="none" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Videos List on this platform */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Danh sách Video trên kênh
          </h4>
        </div>
        
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {platformVideos.map((video) => (
            <div key={video.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-900 dark:text-white">{video.title}</div>
                <div className="text-[10px] text-slate-450 dark:text-slate-400 font-mono truncate max-w-sm">
                  {video.localPath}
                </div>
              </div>
              <div className="text-right text-xs space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {video.views.toLocaleString()} views
                </div>
                <div className="text-[10px] text-slate-450 dark:text-slate-500">
                  Inbox: {video.inboxes} | Thu nhập: {formatCurrency(video.revenue)}
                </div>
              </div>
            </div>
          ))}

          {platformVideos.length === 0 && (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
              Chưa liên kết video nào với kênh {platformName}. Thêm link liên kết tại mục quản lý video.
            </div>
          )}
        </div>
      </div>
      {/* AI Preview Modal */}
      <AiPreviewModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onConfirm={handleConfirmAiPlatformAction}
        feature={aiDetails.feature as any}
        title={aiDetails.title}
        description={aiDetails.description}
        variables={{ topic: "Quy trình vệ sinh nồi và búa côn Vision 2021", tone: "phong cách chuyên gia chia sẻ" }}
      />
    </div>
  );
};
