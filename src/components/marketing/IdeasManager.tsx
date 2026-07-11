import React, { useState, useMemo } from "react";
import {
  Lightbulb,
  Search,
  Plus,
  Pencil,
  Trash2,
  Copy,
  SlidersHorizontal,
  X,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { MarketingIdea } from "../../types/marketing";
import { useAuth } from "../../contexts/AuthContext";
import { formatDate } from "../../utils/format";
import { showToast } from "../../utils/toast";
import {
  useCreateMarketingIdea,
  useUpdateMarketingIdea,
  useDeleteMarketingIdea,
} from "../../hooks/useMarketingRepository";
import { AiPreviewModal } from "./AiPreviewModal";
import { Sparkles } from "lucide-react";

interface IdeasManagerProps {
  ideas: MarketingIdea[];
}

export const IdeasManager: React.FC<IdeasManagerProps> = ({ ideas = [] }) => {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingIdea, setEditingIdea] = useState<MarketingIdea | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Queries / Mutations
  const createIdeaMutation = useCreateMarketingIdea();
  const updateIdeaMutation = useUpdateMarketingIdea();
  const deleteIdeaMutation = useDeleteMarketingIdea();

  const handleConfirmAiIdeas = (data: any) => {
    let ideasArray: any[] = [];

    if (Array.isArray(data)) {
      ideasArray = data;
    } else if (typeof data === "string") {
      // 1. Try parsing as JSON array or object
      try {
        const cleaned = data.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/i, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          ideasArray = parsed;
        } else if (parsed && Array.isArray(parsed.ideas)) {
          ideasArray = parsed.ideas;
        } else if (parsed && typeof parsed === "object") {
          ideasArray = [parsed];
        }
      } catch (e) {
        // 2. Fall back to plain text/markdown string parsing
        const lines = data.split("\n");
        lines.forEach((line) => {
          const text = line.trim();
          // Remove list indicators like "1.", "1)", "-", "*", "+"
          const listMatch = text.match(/^(?:\d+[\.\)]|[\-\*\+])\s*(.*)$/);
          if (!listMatch) return;
          
          let contentStr = listMatch[1].trim();
          if (!contentStr) return;

          let title = "";
          let topic = "baoduong";

          // Extract title enclosed in bold tags
          if (contentStr.startsWith("**")) {
            const nextBoldIndex = contentStr.indexOf("**", 2);
            if (nextBoldIndex !== -1) {
              title = contentStr.substring(2, nextBoldIndex).trim();
            }
          }

          // Fallback if no bold tags found: split by colon or dash
          if (!title) {
            const splitIndex = contentStr.search(/[:\-\—\=]/);
            if (splitIndex !== -1) {
              title = contentStr.substring(0, splitIndex).trim();
            } else {
              title = contentStr;
            }
          }

          // Clean up bold tags inside title
          title = title.replace(/\*\*/g, "").trim();

          const lowerTitle = title.toLowerCase();
          // Filter out section headers and boilerplate lines
          if (
            lowerTitle.includes("nhóm") ||
            lowerTitle.includes("lời khuyên") ||
            lowerTitle.includes("chú ý") ||
            lowerTitle.includes("tác giả") ||
            title.length < 5 ||
            title.length > 100
          ) {
            return;
          }

          ideasArray.push({
            title: title,
            vehicleModel: "Xe ga",
            topic: topic,
          });
        });
      }
    }

    if (ideasArray.length === 0) {
      showToast.error("Không thể phân tích danh sách ý tưởng từ phản hồi của AI.");
      return;
    }

    showToast.success(`AI sinh ${ideasArray.length} ý tưởng thành công!`);
    ideasArray.forEach(async (item: any) => {
      if (!item || !item.title) return;
      await createIdeaMutation.mutateAsync({
        title: item.title,
        vehicleModel: item.vehicleModel || "Xe ga",
        brand: (item.vehicleModel && item.vehicleModel.split(" ")[0]) || "Honda",
        topic: item.topic || "baoduong",
        priority: "medium",
        source: "AI Generator",
        status: "draft",
        creatorId: profile?.id,
      });
    });
    showToast.info("Đã tự động nạp các ý tưởng mới vào danh sách!");
  };

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    vehicleModel: "",
    brand: "",
    topic: "",
    priority: "medium" as "low" | "medium" | "high",
    source: "",
    status: "draft" as "draft" | "approved" | "writing" | "completed" | "cancelled",
  });

  // Filters
  const filteredIdeas = useMemo(() => {
    return ideas.filter((idea) => {
      const matchSearch =
        idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (idea.topic && idea.topic.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (idea.vehicleModel && idea.vehicleModel.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchBrand = selectedBrand === "" || idea.brand === selectedBrand;
      const matchPriority = selectedPriority === "" || idea.priority === selectedPriority;
      const matchStatus = selectedStatus === "" || idea.status === selectedStatus;
      return matchSearch && matchBrand && matchPriority && matchStatus;
    });
  }, [ideas, searchTerm, selectedBrand, selectedPriority, selectedStatus]);

  // Unique lists for filtering dropdowns
  const brandsList = useMemo(() => {
    const set = new Set(ideas.map((i) => i.brand).filter(Boolean));
    return Array.from(set) as string[];
  }, [ideas]);

  const handleOpenAdd = () => {
    setEditingIdea(null);
    setFormData({
      title: "",
      vehicleModel: "",
      brand: "",
      topic: "",
      priority: "medium",
      source: "",
      status: "draft",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (idea: MarketingIdea) => {
    setEditingIdea(idea);
    setFormData({
      title: idea.title,
      vehicleModel: idea.vehicleModel || "",
      brand: idea.brand || "",
      topic: idea.topic || "",
      priority: idea.priority,
      source: idea.source || "",
      status: idea.status,
    });
    setShowModal(true);
  };

  const handleClone = async (idea: MarketingIdea) => {
    try {
      await createIdeaMutation.mutateAsync({
        title: `${idea.title} (Nhân bản)`,
        vehicleModel: idea.vehicleModel,
        brand: idea.brand,
        topic: idea.topic,
        priority: idea.priority,
        source: idea.source,
        status: "draft",
        creatorId: profile?.id,
      });
      showToast.success("Nhân bản ý tưởng thành công!");
    } catch (e: any) {
      showToast.error("Không thể nhân bản ý tưởng");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa ý tưởng này không?")) {
      try {
        await deleteIdeaMutation.mutateAsync(id);
        showToast.success("Xóa ý tưởng thành công!");
      } catch (e: any) {
        showToast.error("Không thể xóa ý tưởng");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast.error("Vui lòng nhập tiêu đề ý tưởng!");
      return;
    }

    try {
      if (editingIdea) {
        await updateIdeaMutation.mutateAsync({
          id: editingIdea.id,
          updates: {
            ...formData,
          },
        });
        showToast.success("Cập nhật ý tưởng thành công!");
      } else {
        await createIdeaMutation.mutateAsync({
          ...formData,
          creatorId: profile?.id,
        });
        showToast.success("Thêm ý tưởng thành công!");
      }
      setShowModal(false);
    } catch (err: any) {
      showToast.error("Không thể lưu ý tưởng");
    }
  };

  const priorityLabels = {
    low: { text: "Thấp", color: "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-400" },
    medium: { text: "Trung bình", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    high: { text: "Cao", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  };

  const statusLabels = {
    draft: { text: "Nháp", color: "bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-400" },
    approved: { text: "Được duyệt", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
    writing: { text: "Viết kịch bản", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    completed: { text: "Hoàn thành", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
    cancelled: { text: "Hủy bỏ", color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm ý tưởng theo tiêu đề, chủ đề, dòng xe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs"
          >
            <option value="">Tất cả hãng xe</option>
            {brandsList.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs"
          >
            <option value="">Độ ưu tiên</option>
            <option value="low">Thấp</option>
            <option value="medium">Trung bình</option>
            <option value="high">Cao</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs"
          >
            <option value="">Trạng thái</option>
            <option value="draft">Nháp</option>
            <option value="approved">Được duyệt</option>
            <option value="writing">Viết kịch bản</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Hủy bỏ</option>
          </select>

          <button
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-650 hover:bg-purple-750 text-white rounded-lg text-xs font-bold shadow transition-colors"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>AI Idea Generator</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold shadow transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm ý tưởng</span>
          </button>
        </div>
      </div>

      {/* Grid List of Ideas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredIdeas.map((idea) => {
          const pLabel = priorityLabels[idea.priority] || priorityLabels.medium;
          const sLabel = statusLabels[idea.status] || statusLabels.draft;
          return (
            <div
              key={idea.id}
              className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-fuchsia-500/40 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${pLabel.color}`}>
                      {pLabel.text}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${sLabel.color}`}>
                      {sLabel.text}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    {formatDate(idea.created_at)}
                  </div>
                </div>

                <h4 className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-fuchsia-500 transition-colors line-clamp-2 mb-3 leading-snug">
                  {idea.title}
                </h4>

                {/* Metadata Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {idea.brand && (
                    <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600/50 rounded text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                      {idea.brand}
                    </span>
                  )}
                  {idea.vehicleModel && (
                    <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600/50 rounded text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                      {idea.vehicleModel}
                    </span>
                  )}
                  {idea.topic && (
                    <span className="px-2 py-0.5 bg-fuchsia-50 dark:bg-fuchsia-950/20 border border-fuchsia-100 dark:border-fuchsia-900/30 rounded text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-medium">
                      #{idea.topic}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                  Nguồn: {idea.source || "Tự nghĩ"}
                </span>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => handleClone(idea)}
                    className="p-1 hover:text-indigo-500 text-slate-400 transition-colors"
                    title="Nhân bản ý tưởng"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(idea)}
                    className="p-1 hover:text-blue-500 text-slate-400 transition-colors"
                    title="Chỉnh sửa"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(idea.id)}
                    className="p-1 hover:text-red-500 text-slate-400 transition-colors"
                    title="Xóa ý tưởng"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredIdeas.length === 0 && (
          <div className="col-span-full bg-slate-50 dark:bg-slate-800/40 p-12 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            <Lightbulb className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Không tìm thấy ý tưởng nào phù hợp bộ lọc của bạn.
            </p>
          </div>
        )}
      </div>

      {/* Form Modal for Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scaleIn border border-slate-100 dark:border-slate-700">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-fuchsia-600" />
                <span>{editingIdea ? "Chỉnh sửa ý tưởng" : "Tạo ý tưởng mới"}</span>
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
                  Tiêu đề ý tưởng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ví dụ: Cách khắc phục xe tay ga bị hao xăng cực nhanh"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Hãng xe
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Ví dụ: Honda, Yamaha..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Dòng xe
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleModel}
                    onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                    placeholder="Ví dụ: Vision, SH, Exciter..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Chủ đề
                  </label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="Ví dụ: HaoXang, BaoDuong..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Nguồn ý tưởng
                  </label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="Ví dụ: Đối thủ, Khách hỏi..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Mức độ ưu tiên
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  >
                    <option value="draft">Nháp</option>
                    <option value="approved">Được duyệt</option>
                    <option value="writing">Viết kịch bản</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Hủy bỏ</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <button
                  type="submit"
                  disabled={createIdeaMutation.isPending || updateIdeaMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{editingIdea ? "Lưu thay đổi" : "Tạo ý tưởng"}</span>
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
        onConfirm={handleConfirmAiIdeas}
        feature="idea"
        title="✨ AI Idea Generator"
        description="AI tự động đề xuất 20 ý tưởng video triệu view, phân nhóm theo dòng xe Honda/Yamaha và tính điểm tiềm năng."
        variables={{ topic: "bảo dưỡng nồi xe tay ga" }}
      />
    </div>
  );
};
