import React, { useMemo } from "react";
import { BookOpen, FileText, ChevronRight, Bookmark } from "lucide-react";
import { Link } from "react-router-dom";
import { useKnowledgeArticles } from "../../../hooks/useKnowledgeRepository";

export const KnowledgeWidget: React.FC = () => {
  const { data: articles = [] } = useKnowledgeArticles();

  // Find 5 most recent articles
  const recentArticles = useMemo(() => {
    return [...articles]
      .sort((a: any, b: any) => {
        const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
        const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [articles]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur flex flex-col h-full justify-between">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">📚 Knowledge</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">SOP quy trình & tài liệu kỹ thuật gần đây</p>
          </div>
          <Link
            to="/knowledge"
            className="text-[10.5px] font-bold text-fuchsia-400 hover:text-fuchsia-300 transition flex items-center gap-0.5"
          >
            Tất cả SOP <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Recent Articles Stack */}
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {recentArticles.map((article: any, idx: number) => (
            <div
              key={idx}
              className="bg-slate-950/30 border border-slate-850 p-2.5 rounded-xl hover:border-slate-800 transition flex items-start gap-3"
            >
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg shrink-0 mt-0.5">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate leading-snug">
                  {article.title}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-550">
                  <span className="px-1.5 py-0.2 bg-slate-800 rounded font-semibold uppercase tracking-wider">
                    {article.categoryName || article.category_name || "SOP"}
                  </span>
                  <span>•</span>
                  <span>
                    Cập nhật: {new Date(article.updated_at || article.created_at).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {recentArticles.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-650 italic">
              Chưa có tài liệu quy trình SOP nào được tạo.
            </div>
          )}
        </div>
      </div>

      <div className="text-[9px] text-slate-550 border-t border-slate-850/50 pt-3 mt-4 text-left italic">
        * SOP giúp bạn chuẩn hóa quy trình và lưu giữ kinh nghiệm sửa chữa.
      </div>
    </div>
  );
};
