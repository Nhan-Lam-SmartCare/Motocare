import React, { useState } from "react";
import { showToast } from "../../utils/toast";
import {
  LayoutDashboard,
  Lightbulb,
  FileText,
  Video as VideoIcon,
  Image as ImageIcon,
  MessageSquare,
  Tag,
  Target,
  Calendar as CalendarIcon,
  Globe,
  BarChart3,
  Cpu,
  Settings as CogIcon,
  Share2,
  Tv,
  Youtube,
  Facebook,
  Play,
  Loader2,
  Folder,
  BookOpen,
  ClipboardList,
  History,
  FileSpreadsheet,
  Settings,
  Sparkles,
} from "lucide-react";
import {
  useMarketingIdeas,
  useMarketingScripts,
  useMarketingVideos,
  useMarketingThumbnails,
  useMarketingCaptions,
  useMarketingHashtags,
  useMarketingCampaigns,
  useMarketingCalendarEvents,
} from "../../hooks/useMarketingRepository";

// Subpages
import { MarketingDashboard } from "./MarketingDashboard";
import { IdeasManager } from "./IdeasManager";
import { ScriptsManager } from "./ScriptsManager";
import { VideosManager } from "./VideosManager";
import { ThumbnailsManager } from "./ThumbnailsManager";
import { CaptionsManager } from "./CaptionsManager";
import { HashtagsManager } from "./HashtagsManager";
import { CampaignsManager } from "./CampaignsManager";
import { CalendarManager } from "./CalendarManager";
import { PlatformAnalytics } from "./PlatformAnalytics";
import { AiCenterAdmin } from "./AiCenterAdmin";
import { AiPanel } from "./AiPanel";
import { AiAdvisor } from "./AiAdvisor";

// New Content Studio Subpages
import { ContentProjectManager } from "./ContentProjectManager";
import { ResearchManager } from "./ResearchManager";
import { ShotListManager } from "./ShotListManager";
import { ChecklistManager } from "./ChecklistManager";
import { VersionsManager } from "./VersionsManager";

// New Knowledge Center Subpages
import { KmsDashboard } from "./KmsDashboard";
import { KmsArticlesManager } from "./KmsArticlesManager";

type TabKey =
  // Content Studio
  | "project_kanban"
  | "ideas"
  | "scripts"
  | "shot_lists"
  | "checklists"
  | "videos_production"
  | "versions"
  | "research"
  | "thumbnails"
  | "captions"
  | "hashtags"
  // Marketing Center
  | "calendar"
  | "campaigns"
  | "tiktok"
  | "facebook"
  | "youtube"
  | "website"
  | "stats"
  // Knowledge Center
  | "kms_dashboard"
  | "kms_articles"
  // AI Center
  | "ai_advisor"
  | "ai"
  // System
  | "settings";

interface MenuItem {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const MarketingManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("project_kanban");
  const [navKmsCategoryId, setNavKmsCategoryId] = useState("");
  const [navKmsArticleId, setNavKmsArticleId] = useState("");

  // Channel URL States
  const [tiktokUrl, setTiktokUrl] = useState(() => {
    return localStorage.getItem("sc_mkt_tiktok_url") || "https://www.tiktok.com/@motocaresmartcare";
  });
  const [facebookUrl, setFacebookUrl] = useState(() => {
    return localStorage.getItem("sc_mkt_facebook_url") || "https://www.facebook.com/motocaresmartcare";
  });
  const [youtubeUrl, setYoutubeUrl] = useState(() => {
    return localStorage.getItem("sc_mkt_youtube_url") || "https://www.youtube.com/@motocaresmartcare";
  });

  const handleSaveSettings = () => {
    localStorage.setItem("sc_mkt_tiktok_url", tiktokUrl);
    localStorage.setItem("sc_mkt_facebook_url", facebookUrl);
    localStorage.setItem("sc_mkt_youtube_url", youtubeUrl);
    showToast.success("Đã lưu cấu hình kênh truyền thông!");
  };

  // Fetch all marketing data via unified React Query hooks
  const { data: ideas = [], isLoading: loadingIdeas } = useMarketingIdeas();
  const { data: scripts = [], isLoading: loadingScripts } = useMarketingScripts();
  const { data: videos = [], isLoading: loadingVideos } = useMarketingVideos();
  const { data: thumbnails = [], isLoading: loadingThumbs } = useMarketingThumbnails();
  const { data: captions = [], isLoading: loadingCaptions } = useMarketingCaptions();
  const { data: hashtags = [], isLoading: loadingTags } = useMarketingHashtags();
  const { data: campaigns = [], isLoading: loadingCamps } = useMarketingCampaigns();
  const { data: calendarEvents = [], isLoading: loadingCalendar } = useMarketingCalendarEvents();

  const isDataLoading =
    loadingIdeas ||
    loadingScripts ||
    loadingVideos ||
    loadingThumbs ||
    loadingCaptions ||
    loadingTags ||
    loadingCamps ||
    loadingCalendar;

  const menuSections: MenuSection[] = [
    {
      title: "Content Studio",
      items: [
        { key: "project_kanban", label: "Dự án (Kanban)", icon: <Folder className="w-4 h-4 text-fuchsia-400" /> },
        { key: "ideas", label: "Ý tưởng", icon: <Lightbulb className="w-4 h-4 text-amber-400" /> },
        { key: "scripts", label: "Kịch bản", icon: <FileText className="w-4 h-4 text-sky-400" /> },
        { key: "shot_lists", label: "Shot List", icon: <VideoIcon className="w-4 h-4 text-orange-400" /> },
        { key: "checklists", label: "Checklist quay", icon: <ClipboardList className="w-4 h-4 text-pink-400" /> },
        { key: "videos_production", label: "Quản lý Media", icon: <Tv className="w-4 h-4 text-teal-400" /> },
        { key: "versions", label: "Phiên bản dựng", icon: <History className="w-4 h-4 text-purple-400" /> },
        { key: "research", label: "Nghiên cứu", icon: <BookOpen className="w-4 h-4 text-indigo-400" /> },
        { key: "thumbnails", label: "Thumbnail", icon: <ImageIcon className="w-4 h-4 text-rose-400" /> },
        { key: "captions", label: "Caption", icon: <MessageSquare className="w-4 h-4 text-violet-400" /> },
        { key: "hashtags", label: "Hashtag", icon: <Tag className="w-4 h-4 text-emerald-400" /> },
      ],
    },
    {
      title: "Marketing Center",
      items: [
        { key: "calendar", label: "Lịch đăng", icon: <CalendarIcon className="w-4 h-4 text-cyan-400" /> },
        { key: "campaigns", label: "Chiến dịch", icon: <Target className="w-4 h-4 text-red-400" /> },
        { key: "tiktok", label: "Kênh TikTok", icon: <Tv className="w-4 h-4 text-rose-500" /> },
        { key: "facebook", label: "Kênh Facebook", icon: <Facebook className="w-4 h-4 text-blue-500" /> },
        { key: "youtube", label: "Kênh YouTube", icon: <Youtube className="w-4 h-4 text-red-500" /> },
        { key: "website", label: "Kênh Website", icon: <Globe className="w-4 h-4 text-emerald-500" /> },
        { key: "stats", label: "Thống kê / ROI", icon: <BarChart3 className="w-4 h-4 text-indigo-500" /> },
      ],
    },
    {
      title: "Knowledge Center",
      items: [
        { key: "kms_dashboard", label: "Tổng quan KMS", icon: <LayoutDashboard className="w-4 h-4 text-amber-500" /> },
        { key: "kms_articles", label: "SOP & Tri thức", icon: <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> },
      ],
    },
    {
      title: "🧠 SmartCare AI",
      items: [
        { key: "ai_advisor", label: "AI Advisor Hub", icon: <Sparkles className="w-4 h-4 text-fuchsia-500" /> },
        { key: "ai", label: "Quản trị AI Hub", icon: <Cpu className="w-4 h-4 text-purple-500" /> },
      ],
    },
    {
      title: "Hệ thống",
      items: [
        { key: "settings", label: "Cài đặt", icon: <Settings className="w-4 h-4 text-slate-400" /> },
      ],
    },
  ];

  // Helper navigate functions from KMS Dashboard
  const handleNavigateKmsCategory = (catId: string) => {
    setNavKmsCategoryId(catId);
    setNavKmsArticleId("");
    setActiveTab("kms_articles");
  };

  const handleNavigateKmsArticle = (artId: string) => {
    setNavKmsArticleId(artId);
    setNavKmsCategoryId("");
    setActiveTab("kms_articles");
  };

  const allMenuItems = menuSections.flatMap((s) => s.items);

  return (
    <div className="dark flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-80px)] bg-[#0b0f1a] -m-6 p-6 md:-m-6 md:p-6">
      {/* Sidebar for Desktop / Dropdown for Mobile */}
      <div className="w-full lg:w-60 flex-shrink-0">
        {/* Mobile menu select */}
        <div className="lg:hidden">
          <label htmlFor="marketing-tabs" className="sr-only">
            Menu Marketing Hub
          </label>
          <div className="relative">
            <select
              id="marketing-tabs"
              className="block w-full py-3 pl-4 pr-10 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-805 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as TabKey)}
            >
              {allMenuItems.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop grouped sidebar with Dividers and Headings */}
        <div className="hidden lg:flex flex-col gap-3 p-4 bg-slate-900 border border-slate-850 rounded-2xl shadow-xl sticky top-20 max-h-[80vh] overflow-y-auto scrollbar-thin">
          <div className="px-1.5 py-0.5">
            <span className="text-[11px] font-extrabold text-fuchsia-500 uppercase tracking-widest block">
              🎬 MARKETING HUB
            </span>
          </div>

          {menuSections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              {idx > 0 && <div className="border-t border-slate-700/50 my-3" />}
              <div className="flex items-center gap-1.5 px-2 py-1">
                <div className="w-0.5 h-3 bg-fuchsia-500 rounded-full" />
                <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-[0.12em] leading-none">
                  {sec.title}
                </span>
              </div>
              
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const active = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActiveTab(item.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold select-none transition-all ${
                        active
                          ? "bg-fuchsia-600 text-white shadow-md shadow-fuchsia-500/10 scale-102 font-bold"
                          : "text-slate-400 hover:bg-slate-850 hover:text-slate-200"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 bg-slate-900/60 p-1 lg:p-4 rounded-2xl border border-slate-800/60 shadow-sm">
        {isDataLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
            <Loader2 className="w-10 h-10 text-fuchsia-600 animate-spin" />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Đang đồng bộ dữ liệu Marketing Hub...
            </span>
          </div>
        ) : (
          <>
            {/* 1. CONTENT STUDIO TABS */}
            {activeTab === "project_kanban" && <ContentProjectManager />}
            {activeTab === "ideas" && <IdeasManager ideas={ideas} />}
            {activeTab === "scripts" && (
              <ScriptsManager scripts={scripts} ideas={ideas} videos={videos} />
            )}
            {activeTab === "shot_lists" && <ShotListManager />}
            {activeTab === "checklists" && <ChecklistManager />}
            {activeTab === "videos_production" && (
              <VideosManager videos={videos} scripts={scripts} hideMetrics={true} />
            )}
            {activeTab === "versions" && <VersionsManager />}
            {activeTab === "research" && <ResearchManager />}
            {activeTab === "thumbnails" && <ThumbnailsManager thumbnails={thumbnails} videos={videos} />}
            {activeTab === "captions" && <CaptionsManager captions={captions} />}
            {activeTab === "hashtags" && <HashtagsManager hashtags={hashtags} />}

            {/* 2. MARKETING CENTER TABS */}
            {activeTab === "calendar" && <CalendarManager events={calendarEvents} videos={videos} />}
            {activeTab === "campaigns" && <CampaignsManager campaigns={campaigns} videos={videos} />}
            {activeTab === "tiktok" && <PlatformAnalytics platformName="TikTok" videos={videos} />}
            {activeTab === "facebook" && <PlatformAnalytics platformName="Facebook" videos={videos} />}
            {activeTab === "youtube" && <PlatformAnalytics platformName="YouTube" videos={videos} />}
            {activeTab === "website" && <PlatformAnalytics platformName="Website" videos={videos} />}
            {activeTab === "stats" && (
              <MarketingDashboard
                ideas={ideas}
                scripts={scripts}
                videos={videos}
                campaigns={campaigns}
              />
            )}

            {/* 3. KNOWLEDGE CENTER TABS */}
            {activeTab === "kms_dashboard" && (
              <KmsDashboard
                onNavigateToCategory={handleNavigateKmsCategory}
                onNavigateToArticle={handleNavigateKmsArticle}
              />
            )}
            {activeTab === "kms_articles" && (
              <KmsArticlesManager
                initialCategoryId={navKmsCategoryId}
                initialArticleId={navKmsArticleId}
              />
            )}

            {/* 4. AI CENTER TABS */}
            {activeTab === "ai_advisor" && <AiAdvisor />}
            {activeTab === "ai" && <AiCenterAdmin />}

            {/* 5. SYSTEM SETTINGS */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-3">
                  <CogIcon className="w-6 h-6 text-fuchsia-600" />
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                      Cấu hình kênh & Chỉ số KPI
                    </h3>
                  </div>
                </div>
                
                <div className="max-w-xl space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3.5">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">Đường dẫn các kênh chính</h4>
                    
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">TikTok Channel URL</label>
                        <input
                          type="text"
                          value={tiktokUrl}
                          onChange={(e) => setTiktokUrl(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-655 rounded bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Facebook Page URL</label>
                        <input
                          type="text"
                          value={facebookUrl}
                          onChange={(e) => setFacebookUrl(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-655 rounded bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">YouTube Channel URL</label>
                        <input
                          type="text"
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-655 rounded bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                      >
                        Lưu cấu hình
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Persistent AI-First Copilot Panel */}
      <AiPanel />
    </div>
  );
};

export default MarketingManager;
