import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Idea,
  Script,
  Video,
  Campaign,
} from "../../types/marketing";
import { formatCurrency } from "../../utils/format";
import { showToast } from "../../utils/toast";
import { AiPreviewModal } from "./AiPreviewModal";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import {
  Lightbulb,
  FileText,
  Video as VideoIcon,
  Eye,
  MessageSquare,
  Share2,
  Bookmark,
  Inbox,
  UserCheck,
  DollarSign,
  TrendingUp,
} from "lucide-react";

interface DashboardProps {
  ideas: any[];
  scripts: any[];
  videos: any[];
  campaigns: any[];
}

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1"];

export const MarketingDashboard: React.FC<DashboardProps> = ({
  ideas = [],
  scripts = [],
  videos = [],
  campaigns = [],
}) => {
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const handleConfirmAiInsight = (data: any) => {
    showToast.success("AI phân tích hoàn tất!");
    alert(`🧠 Insight chuyển đổi từ SmartCare AI:\n\n- Chủ đề tốt nhất: ${data.bestTopic}\n- Dòng xe chuyển đổi cao nhất: ${data.bestVehicleModel}\n- Phân tích hiệu quả: ${data.performanceMetrics}\n- Đề xuất tối ưu: ${data.growthAction}`);
  };

  // 1. KPI Statistics
  const stats = useMemo(() => {
    const totalIdeas = ideas.length;
    const totalScripts = scripts.length;
    const totalVideos = videos.length;
    const postedVideos = videos.filter((v) => v.postingDate).length;
    const pendingVideos = videos.filter((v) => !v.postingDate).length;
    
    const totalViews = videos.reduce((acc, v) => acc + (v.views || 0), 0);
    const totalComments = videos.reduce((acc, v) => acc + (v.comments || 0), 0);
    const totalShares = videos.reduce((acc, v) => acc + (v.shares || 0), 0);
    const totalSaves = videos.reduce((acc, v) => acc + (v.saves || 0), 0);
    const totalInboxes = videos.reduce((acc, v) => acc + (v.inboxes || 0), 0);
    const totalVisitors = videos.reduce((acc, v) => acc + (v.visitors || 0), 0);
    const totalRevenue = videos.reduce((acc, v) => acc + (v.revenue || 0), 0);

    return {
      totalIdeas,
      totalScripts,
      totalVideos,
      postedVideos,
      pendingVideos,
      totalViews,
      totalComments,
      totalShares,
      totalSaves,
      totalInboxes,
      totalVisitors,
      totalRevenue,
    };
  }, [ideas, scripts, videos]);

  // Map scriptId -> idea mapping for video metadata lookup
  const videoMappings = useMemo(() => {
    return videos.map((video) => {
      const script = scripts.find((s) => s.id === video.scriptId);
      const idea = script ? ideas.find((i) => i.id === script.ideaId) : null;
      return {
        ...video,
        topic: idea?.topic || "Khác",
        vehicleModel: idea?.vehicleModel || "Khác",
        brand: idea?.brand || "Khác",
      };
    });
  }, [videos, scripts, ideas]);

  // 2. Chart: Video theo tháng (last 6 months)
  const videosByMonthData = useMemo(() => {
    const counts: Record<string, number> = {};
    videos.forEach((video) => {
      const dateStr = video.postingDate || video.created_at;
      if (!dateStr) return;
      const month = dateStr.slice(0, 7); // YYYY-MM
      counts[month] = (counts[month] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, count]) => {
        const [year, m] = month.split("-");
        return {
          month: `Th ${m}/${year.slice(2)}`,
          "Số lượng": count,
        };
      });
  }, [videos]);

  // 3. Chart: Video theo chủ đề
  const videosByTopicData = useMemo(() => {
    const counts: Record<string, number> = {};
    videoMappings.forEach((v) => {
      const topic = v.topic;
      counts[topic] = (counts[topic] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [videoMappings]);

  // 4. Chart: Video theo dòng xe
  const videosByVehicleData = useMemo(() => {
    const counts: Record<string, number> = {};
    videoMappings.forEach((v) => {
      const vehicle = v.vehicleModel;
      counts[vehicle] = (counts[vehicle] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([vehicle, count]) => ({
        "Dòng xe": vehicle,
        "Số lượng": count,
      }))
      .sort((a, b) => b["Số lượng"] - a["Số lượng"])
      .slice(0, 6);
  }, [videoMappings]);

  // 5. Chart: Hiệu quả theo nền tảng
  const performanceByPlatformData = useMemo(() => {
    let tkViews = 0, tkInbox = 0, tkRevenue = 0;
    let fbViews = 0, fbInbox = 0, fbRevenue = 0;
    let ytViews = 0, ytInbox = 0, ytRevenue = 0;

    videos.forEach((video) => {
      // If links are present, attribute views, inboxes, and revenue.
      // For simplicity, we distribute metrics to active platforms or log general values.
      const platformsCount = [video.tiktokLink, video.facebookLink, video.youtubeLink].filter(Boolean).length || 1;
      const vShare = Math.round((video.views || 0) / platformsCount);
      const ibShare = Math.round((video.inboxes || 0) / platformsCount);
      const revShare = (video.revenue || 0) / platformsCount;

      if (video.tiktokLink) {
        tkViews += vShare;
        tkInbox += ibShare;
        tkRevenue += revShare;
      }
      if (video.facebookLink) {
        fbViews += vShare;
        fbInbox += ibShare;
        fbRevenue += revShare;
      }
      if (video.youtubeLink) {
        ytViews += vShare;
        ytInbox += ibShare;
        ytRevenue += revShare;
      }
    });

    // Fallback if no link exists but views are present
    if (tkViews === 0 && fbViews === 0 && ytViews === 0) {
      tkViews = Math.round(stats.totalViews * 0.5);
      fbViews = Math.round(stats.totalViews * 0.3);
      ytViews = Math.round(stats.totalViews * 0.2);

      tkInbox = Math.round(stats.totalInboxes * 0.5);
      fbInbox = Math.round(stats.totalInboxes * 0.3);
      ytInbox = Math.round(stats.totalInboxes * 0.2);

      tkRevenue = stats.totalRevenue * 0.5;
      fbRevenue = stats.totalRevenue * 0.3;
      ytRevenue = stats.totalRevenue * 0.2;
    }

    return [
      { name: "TikTok", "Lượt xem": tkViews, "Inbox": tkInbox, "Doanh thu (k)": Math.round(tkRevenue / 1000) },
      { name: "Facebook", "Lượt xem": fbViews, "Inbox": fbInbox, "Doanh thu (k)": Math.round(fbRevenue / 1000) },
      { name: "YouTube", "Lượt xem": ytViews, "Inbox": ytInbox, "Doanh thu (k)": Math.round(ytRevenue / 1000) },
    ];
  }, [videos, stats]);

  const kpis = [
    { label: "Ý tưởng", value: stats.totalIdeas, sub: "Đang lên kế hoạch", icon: <Lightbulb className="w-5 h-5 text-amber-500" />, border: "border-t-amber-500" },
    { label: "Kịch bản", value: stats.totalScripts, sub: "Đã hoàn thành", icon: <FileText className="w-5 h-5 text-indigo-500" />, border: "border-t-indigo-500" },
    { label: "Tổng Video", value: stats.totalVideos, sub: `${stats.postedVideos} đã đăng | ${stats.pendingVideos} chờ đăng`, icon: <VideoIcon className="w-5 h-5 text-fuchsia-500" />, border: "border-t-fuchsia-500" },
    { label: "Lượt xem", value: stats.totalViews.toLocaleString(), sub: "Tích lũy", icon: <Eye className="w-5 h-5 text-blue-500" />, border: "border-t-blue-500" },
    { label: "Bình luận", value: stats.totalComments.toLocaleString(), sub: "Mức độ tương tác", icon: <MessageSquare className="w-5 h-5 text-emerald-500" />, border: "border-t-emerald-500" },
    { label: "Chia sẻ", value: stats.totalShares.toLocaleString(), sub: "Lan tỏa truyền thông", icon: <Share2 className="w-5 h-5 text-teal-500" />, border: "border-t-teal-500" },
    { label: "Lượt lưu", value: stats.totalSaves.toLocaleString(), sub: "Tỷ lệ lưu trữ", icon: <Bookmark className="w-5 h-5 text-violet-500" />, border: "border-t-violet-500" },
    { label: "Khách Inbox", value: stats.totalInboxes.toLocaleString(), sub: "Khách hàng tiềm năng", icon: <Inbox className="w-5 h-5 text-pink-500" />, border: "border-t-pink-500" },
    { label: "Đến cửa hàng", value: stats.totalVisitors.toLocaleString(), sub: "Chuyển đổi thực tế", icon: <UserCheck className="w-5 h-5 text-cyan-500" />, border: "border-t-cyan-500" },
    { label: "Doanh thu Mkt", value: formatCurrency(stats.totalRevenue), sub: "Từ các nguồn truyền thông", icon: <DollarSign className="w-5 h-5 text-rose-500" />, border: "border-t-rose-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Dashboard Title with AI Insight */}
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Tổng quan Marketing Hub
          </h2>
          <p className="text-xs text-slate-500">
            Dữ liệu tổng hợp chiến dịch, chuyển đổi và tăng trưởng.
          </p>
        </div>

        <button
          onClick={() => setAiModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-650 hover:bg-purple-750 text-white rounded-lg text-xs font-bold shadow transition-colors animate-pulse"
        >
          <Sparkles className="w-4 h-4 text-white" />
          <span>AI Insight</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className={`bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 border-t-4 ${kpi.border} shadow-sm flex flex-col justify-between h-28 hover:shadow-md transition-shadow`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {kpi.label}
              </span>
              {kpi.icon}
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold text-slate-900 dark:text-white truncate">
                {kpi.value}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                {kpi.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Video theo tháng */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span>Video theo tháng (Thống kê 6 tháng gần nhất)</span>
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={videosByMonthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.2} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
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
              <Bar dataKey="Số lượng" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Video theo dòng xe */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span>Video theo dòng xe</span>
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={videosByVehicleData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.2} />
              <XAxis dataKey="Dòng xe" stroke="#94a3b8" fontSize={11} tickLine={false} />
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
              <Bar dataKey="Số lượng" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 3: Video theo chủ đề */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm lg:col-span-1">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Video theo chủ đề</span>
          </h3>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={videosByTopicData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {videosByTopicData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Legend list */}
            <div className="w-full mt-4 space-y-1.5">
              {videosByTopicData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="truncate max-w-[120px] font-medium">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.value} video</span>
                </div>
              ))}
              {videosByTopicData.length === 0 && (
                <div className="text-center text-slate-500 py-4">Chưa có dữ liệu</div>
              )}
            </div>
          </div>
        </div>

        {/* Chart 4: Hiệu quả theo nền tảng */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm lg:col-span-2">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-fuchsia-500" />
            <span>Hiệu quả theo nền tảng truyền thông</span>
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={performanceByPlatformData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.2} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" fontSize={10} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#ec4899" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" fontSize={11} />
              <Bar yAxisId="left" dataKey="Lượt xem" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar yAxisId="left" dataKey="Inbox" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar yAxisId="right" dataKey="Doanh thu (k)" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* AI Preview Modal */}
      <AiPreviewModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onConfirm={handleConfirmAiInsight}
        feature="dashboard_insight"
        title="✨ AI Conversion Insights"
        description="AI phân tích số liệu thống kê video đa kênh để phát hiện chủ đề sửa xe tiềm năng và gợi ý hướng đi đột phá."
        variables={{ topic: "phân tích dữ liệu 30 ngày qua" }}
      />
    </div>
  );
};
