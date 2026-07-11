import React, { useState, useMemo } from "react";
import {
  Tag,
  Plus,
  Trash2,
  Copy,
  X,
  CheckCircle,
} from "lucide-react";
import { MarketingHashtag } from "../../types/marketing";
import { showToast } from "../../utils/toast";
import {
  useCreateMarketingHashtag,
  useDeleteMarketingHashtag,
} from "../../hooks/useMarketingRepository";
import { AiPreviewModal } from "./AiPreviewModal";
import { Sparkles } from "lucide-react";

interface HashtagsManagerProps {
  hashtags: MarketingHashtag[];
}

type TabType = "Honda" | "Yamaha" | "Vision" | "SH" | "Xe điện" | "Pin Lithium" | "General";

export const HashtagsManager: React.FC<HashtagsManagerProps> = ({ hashtags = [] }) => {
  const [activeTab, setActiveTab] = useState<TabType>("Honda");
  const [showModal, setShowModal] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const createHashtagMutation = useCreateMarketingHashtag();
  const deleteHashtagMutation = useDeleteMarketingHashtag();

  const handleConfirmAiHashtags = (data: any) => {
    let tagsList: string[] = [];

    if (Array.isArray(data)) {
      tagsList = data;
    } else if (typeof data === "string") {
      // Extract words starting with # including letters, numbers, and Vietnamese characters
      const matches = data.match(/#[a-zA-Z0-9_\u00C0-\u1EF9]+/g);
      if (matches) {
        tagsList = matches;
      }
    }

    if (tagsList.length === 0) {
      showToast.error("Không tìm thấy hashtag nào từ kết quả của AI!");
      return;
    }

    showToast.success(`AI sinh ${tagsList.length} hashtags thành công!`);
    tagsList.forEach(async (tagStr: string) => {
      try {
        await createHashtagMutation.mutateAsync({
          tag: tagStr,
          category: activeTab,
        });
      } catch (err) {
        console.error("Lỗi khi thêm hashtag:", err);
      }
    });
    showToast.info(`Đã tự động thêm các hashtags mới vào danh mục ${activeTab}!`);
  };

  const tabs: TabType[] = ["Honda", "Yamaha", "Vision", "SH", "Xe điện", "Pin Lithium", "General"];

  const filteredTags = useMemo(() => {
    return hashtags.filter((t) => t.category === activeTab);
  }, [hashtags, activeTab]);

  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    showToast.success(`Đã sao chép tag: ${tag}`);
  };

  const handleCopyAll = () => {
    if (filteredTags.length === 0) return;
    const allTagsStr = filteredTags.map((t) => t.tag).join(" ");
    navigator.clipboard.writeText(allTagsStr);
    showToast.success(`Đã sao chép toàn bộ hashtag nhóm ${activeTab}!`);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Xóa hashtag này khỏi thư viện?")) {
      try {
        await deleteHashtagMutation.mutateAsync(id);
        showToast.success("Xóa hashtag thành công!");
      } catch (err: any) {
        showToast.error("Không thể xóa hashtag");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) {
      showToast.error("Vui lòng nhập hashtag!");
      return;
    }

    try {
      await createHashtagMutation.mutateAsync({
        tag: newTag.trim(),
        category: activeTab,
      });
      showToast.success("Đã thêm hashtag mới!");
      setNewTag("");
      setShowModal(false);
    } catch (err: any) {
      showToast.error("Lỗi khi thêm hashtag");
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab bar header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-700/80 pb-3">
        <div className="flex gap-1 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-fuchsia-600 text-white shadow-sm"
                  : "text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex gap-2 w-full sm:w-auto ml-auto sm:ml-0">
          <button
            onClick={handleCopyAll}
            disabled={filteredTags.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-800 dark:text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Sao chép tất cả</span>
          </button>
          
          <button
            onClick={() => setAiModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-650 hover:bg-purple-750 text-white rounded-lg text-xs font-bold shadow transition-colors whitespace-nowrap animate-pulse"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>AI Hashtags Generator</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold shadow transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Hashtag</span>
          </button>
        </div>
      </div>

      {/* Hashtag List */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {filteredTags.map((t) => (
          <div
            key={t.id}
            className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-250 dark:border-slate-700 flex items-center justify-between group hover:border-fuchsia-500/30 transition-all hover:shadow-sm"
          >
            <button
              onClick={() => handleCopyTag(t.tag)}
              className="text-xs font-bold text-slate-800 dark:text-white hover:text-fuchsia-600 dark:hover:text-fuchsia-400 transition-colors select-all truncate text-left flex-1"
            >
              {t.tag}
            </button>

            <button
              onClick={() => handleDelete(t.id)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-slate-400 transition-all"
              title="Xóa tag"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {filteredTags.length === 0 && (
          <div className="col-span-full bg-slate-50 dark:bg-slate-800/40 p-12 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            <Tag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Không có hashtag nào trong danh mục {activeTab}.
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full animate-scaleIn border border-slate-100 dark:border-slate-700">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-fuchsia-600" />
                <span>Thêm Hashtag vào nhóm {activeTab}</span>
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
                  Nhãn Hashtag (Bắt đầu bằng dấu #)
                </label>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Ví dụ: #visionhonda"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <button
                  type="submit"
                  disabled={createHashtagMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Xác nhận</span>
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
        onConfirm={handleConfirmAiHashtags}
        feature="hashtag"
        title="✨ AI Hashtags Generator"
        description="AI tự động nghiên cứu từ khóa xu hướng để đề xuất danh sách hashtags tối ưu chuẩn SEO."
        variables={{ topic: `bảo dưỡng xe ga ${activeTab}` }}
      />
    </div>
  );
};
