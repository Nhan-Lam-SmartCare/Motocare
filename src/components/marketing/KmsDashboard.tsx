import React, { useState, useMemo } from "react";
import {
  Search,
  BookOpen,
  CheckCircle,
  FileText,
  Paperclip,
  Clock,
  ChevronRight,
  Folder,
  History,
  AlertTriangle,
} from "lucide-react";
import {
  useKnowledgeArticles,
  useKnowledgeCategories,
  useKnowledgeFiles,
} from "../../hooks/useKnowledgeRepository";
import { formatDate } from "../../utils/format";

interface KmsDashboardProps {
  onNavigateToCategory: (categoryId: string) => void;
  onNavigateToArticle: (articleId: string) => void;
}

export const KmsDashboard: React.FC<KmsDashboardProps> = ({
  onNavigateToCategory,
  onNavigateToArticle,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: articles = [], isLoading: loadingArticles } = useKnowledgeArticles();
  const { data: categories = [], isLoading: loadingCategories } = useKnowledgeCategories();

  // Search Results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return articles.filter(
      (art) =>
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [articles, searchQuery]);

  // Group Articles by Category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    articles.forEach((art) => {
      if (art.categoryId) {
        counts[art.categoryId] = (counts[art.categoryId] || 0) + 1;
      }
    });
    return counts;
  }, [articles]);

  // General KPIs
  const kpis = useMemo(() => {
    const total = articles.length;
    const approved = articles.filter((a) => a.status === "published").length;
    const draft = articles.filter((a) => a.status === "draft").length;
    return { total, approved, draft };
  }, [articles]);

  // Recent revisions
  const recentArticles = useMemo(() => {
    return [...articles]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
  }, [articles]);

  return (
    <div className="space-y-6">
      {/* Search Bar Block */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="max-w-xl space-y-3 relative z-10">
          <h3 className="text-base font-extrabold text-white">
            Bộ não Tri thức Nhạn-Lâm SmartCare
          </h3>
          <p className="text-xs text-slate-400">
            Tìm kiếm SOP, quy trình kỹ thuật, kịch bản mẫu, Brand book, cẩm nang đào tạo và bài học kinh nghiệm nhanh chóng.
          </p>

          <div className="relative pt-2">
            <Search className="absolute left-3.5 top-5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Nhập từ khóa tìm kiếm quy trình, SOP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-700 bg-slate-800 text-white placeholder-slate-500 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
          </div>
        </div>

        {/* Search Results Dropdown Overlay */}
        {searchQuery.trim() !== "" && (
          <div className="absolute left-6 right-6 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto divide-y divide-slate-700 p-2 animate-fadeIn">
            {searchResults.map((art) => (
              <div
                key={art.id}
                onClick={() => onNavigateToArticle(art.id)}
                className="p-3 hover:bg-slate-700/50 cursor-pointer flex justify-between items-center text-xs"
              >
                <div className="font-bold text-slate-200">{art.title}</div>
                <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded font-mono uppercase">
                  {art.type}
                </span>
              </div>
            ))}
            {searchResults.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500 italic">
                Không tìm thấy tài liệu phù hợp với từ khóa.
              </div>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-850 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-500 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Tổng Tài liệu</span>
            <span className="text-base font-extrabold text-slate-800 dark:text-white">{kpis.total}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-850 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/20 text-green-500 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Đã Duyệt (SOP)</span>
            <span className="text-base font-extrabold text-slate-800 dark:text-white">{kpis.approved}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-850 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-500 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Bản nháp / Chưa duyệt</span>
            <span className="text-base font-extrabold text-slate-800 dark:text-white">{kpis.draft}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Index Grid */}
        <div className="col-span-2 space-y-3.5">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Thư mục Tri thức Hệ thống
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {categories.map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              return (
                <div
                  key={cat.id}
                  onClick={() => onNavigateToCategory(cat.id)}
                  className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-slate-250 dark:border-slate-800 hover:border-fuchsia-500/40 cursor-pointer shadow-sm flex items-center justify-between group hover:shadow transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-fuchsia-50 dark:bg-fuchsia-950/20 text-fuchsia-600 dark:text-fuchsia-400 rounded-lg flex items-center justify-center">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-850 dark:text-white group-hover:text-fuchsia-500 transition-colors">
                        {cat.name}
                      </h5>
                      <span className="text-[10px] text-slate-500">{count} tài liệu</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-fuchsia-500 group-hover:translate-x-1 transition" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent updates log */}
        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-fuchsia-500" />
            <span>Lịch sử cập nhật gần đây</span>
          </h4>
          <div className="space-y-3">
            {recentArticles.map((art) => (
              <div
                key={art.id}
                onClick={() => onNavigateToArticle(art.id)}
                className="p-3 bg-slate-50 dark:bg-slate-900/45 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl cursor-pointer transition-colors space-y-1.5"
              >
                <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                  {art.title}
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>Phiên bản v{art.version}</span>
                  <span>{formatDate(art.updated_at)}</span>
                </div>
              </div>
            ))}
            {articles.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-500 italic">
                Chưa có cập nhật nào.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
