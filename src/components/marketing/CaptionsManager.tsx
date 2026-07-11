import React, { useState, useMemo } from "react";
import {
  FileText,
  Search,
  Plus,
  Pencil,
  Trash2,
  Copy,
  X,
  CheckCircle,
} from "lucide-react";
import { MarketingCaption } from "../../types/marketing";
import { showToast } from "../../utils/toast";
import {
  useCreateMarketingCaption,
  useUpdateMarketingCaption,
  useDeleteMarketingCaption,
} from "../../hooks/useMarketingRepository";
import { AiPreviewModal } from "./AiPreviewModal";
import { Sparkles } from "lucide-react";

interface CaptionsManagerProps {
  captions: MarketingCaption[];
}

export const CaptionsManager: React.FC<CaptionsManagerProps> = ({ captions = [] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCaption, setEditingCaption] = useState<MarketingCaption | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Mutations
  const createCaptionMutation = useCreateMarketingCaption();
  const updateCaptionMutation = useUpdateMarketingCaption();
  const deleteCaptionMutation = useDeleteMarketingCaption();

  const handleConfirmAiCaption = (data: any) => {
    setFormData({
      title: "[AI Gợi ý] Caption đa kênh bảo dưỡng côn Vision",
      content: `📱 [TIKTOK]:\n${data.tiktok}\n\n📘 [FACEBOOK]:\n${data.facebook}\n\n▶ [YOUTUBE]:\n${data.youtube}\n\n🌐 [WEBSITE]:\n${data.website}`,
      category: "AI Generated",
    });
    setEditingCaption(null);
    setShowModal(true);
    showToast.success("Đã nạp bộ Captions đa kênh gợi ý của AI vào Form!");
  };

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "",
  });

  // Filters
  const filteredCaptions = useMemo(() => {
    return captions.filter((caption) => {
      const matchSearch =
        caption.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caption.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === "" || caption.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [captions, searchTerm, selectedCategory]);

  const categoriesList = useMemo(() => {
    const set = new Set(captions.map((c) => c.category).filter(Boolean));
    return Array.from(set) as string[];
  }, [captions]);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    showToast.success("Đã sao chép caption vào bộ nhớ tạm!");
  };

  const handleOpenAdd = () => {
    setEditingCaption(null);
    setFormData({
      title: "",
      content: "",
      category: "",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (caption: MarketingCaption) => {
    setEditingCaption(caption);
    setFormData({
      title: caption.title,
      content: caption.content,
      category: caption.category || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa caption này?")) {
      try {
        await deleteCaptionMutation.mutateAsync(id);
        showToast.success("Xóa caption thành công!");
      } catch (err: any) {
        showToast.error("Không thể xóa caption");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      showToast.error("Vui lòng nhập đầy đủ tiêu đề và nội dung caption!");
      return;
    }

    try {
      if (editingCaption) {
        await updateCaptionMutation.mutateAsync({
          id: editingCaption.id,
          updates: formData,
        });
        showToast.success("Cập nhật caption thành công!");
      } else {
        await createCaptionMutation.mutateAsync(formData);
        showToast.success("Thêm caption thành công!");
      }
      setShowModal(false);
    } catch (err: any) {
      showToast.error("Không thể lưu caption");
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm caption theo tiêu đề, nội dung..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto items-center">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs w-full md:w-40"
          >
            <option value="">Tất cả phân loại</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-650 hover:bg-purple-750 text-white rounded-lg text-xs font-bold shadow transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>AI Caption Writer</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold shadow transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Caption</span>
          </button>
        </div>
      </div>

      {/* Grid of Caption cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredCaptions.map((caption) => (
          <div
            key={caption.id}
            className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2 py-0.5 bg-fuchsia-50 dark:bg-fuchsia-950/20 border border-fuchsia-100 dark:border-fuchsia-900/30 rounded text-[10px] text-fuchsia-650 dark:text-fuchsia-400 font-semibold uppercase tracking-wider">
                  {caption.category || "Chưa phân loại"}
                </span>
                <button
                  onClick={() => handleCopy(caption.content)}
                  className="flex items-center gap-1 text-[10px] text-fuchsia-600 hover:underline dark:text-fuchsia-400 font-bold"
                >
                  <Copy className="w-3.5 h-3.5" /> Sao chép nhanh
                </button>
              </div>

              <h4 className="text-sm font-bold text-slate-850 dark:text-white truncate mb-2">
                {caption.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line line-clamp-6 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                {caption.content}
              </p>
            </div>

            <div className="flex justify-end gap-2.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <button
                onClick={() => handleOpenEdit(caption)}
                className="p-1 hover:text-blue-500 text-slate-400 transition-colors"
                title="Sửa"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(caption.id)}
                className="p-1 hover:text-red-500 text-slate-400 transition-colors"
                title="Xóa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredCaptions.length === 0 && (
          <div className="col-span-full bg-slate-50 dark:bg-slate-800/40 p-12 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Không tìm thấy caption mẫu nào.
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scaleIn border border-slate-100 dark:border-slate-700">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-fuchsia-600" />
                <span>{editingCaption ? "Chỉnh sửa caption mẫu" : "Thêm caption mẫu mới"}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Tiêu đề Caption <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ví dụ: Caption chia sẻ mẹo Vision hao xăng"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Phân loại (Category)
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Ví dụ: Review, Mẹo Vặt, Khuyến Mãi..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Nội dung Caption <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Nhập nội dung đầy đủ bao gồm cả hashtag bổ sung..."
                  rows={8}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <button
                  type="submit"
                  disabled={createCaptionMutation.isPending || updateCaptionMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{editingCaption ? "Lưu thay đổi" : "Tạo caption"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* AI Preview Modal */}
      <AiPreviewModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onConfirm={handleConfirmAiCaption}
        feature="caption"
        title="✨ AI Caption Writer"
        description="AI tự soạn nội dung mô tả đa kênh (TikTok, Facebook, YouTube Shorts, Website) theo nhiều tone giọng tùy chọn."
        variables={{ videoTitle: "Bảo dưỡng nồi Honda Vision lì máy hao xăng", tone: "kể câu chuyện thu hút" }}
      />
    </div>
  );
};
