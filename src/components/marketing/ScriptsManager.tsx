import React, { useState, useMemo } from "react";
import {
  FileText,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Link as LinkIcon,
  Video as VideoIcon,
  CheckCircle,
} from "lucide-react";
import { MarketingScript, MarketingIdea, MarketingVideo } from "../../types/marketing";
import { showToast } from "../../utils/toast";
import {
  useCreateMarketingScript,
  useUpdateMarketingScript,
  useDeleteMarketingScript,
} from "../../hooks/useMarketingRepository";
import { AiPreviewModal } from "./AiPreviewModal";
import { Sparkles } from "lucide-react";

interface ScriptsManagerProps {
  scripts: MarketingScript[];
  ideas: MarketingIdea[];
  videos: MarketingVideo[];
}

export const ScriptsManager: React.FC<ScriptsManagerProps> = ({
  scripts = [],
  ideas = [],
  videos = [],
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingScript, setEditingScript] = useState<MarketingScript | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Mutations
  const createScriptMutation = useCreateMarketingScript();
  const updateScriptMutation = useUpdateMarketingScript();
  const deleteScriptMutation = useDeleteMarketingScript();

  const handleConfirmAiScript = async (data: any) => {
    let scriptData = {
      hook: "",
      introduction: "",
      content: "",
      cta: "",
      duration: 45,
    };

    if (typeof data === "string") {
      // Try JSON parse first
      try {
        const cleaned = data.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/i, "").trim();
        const parsed = JSON.parse(cleaned);
        scriptData.hook = parsed.hook || "";
        scriptData.introduction = parsed.problem || "";
        scriptData.content = [parsed.story, parsed.solution].filter(Boolean).join("\n\nGiải pháp: ");
        scriptData.cta = [parsed.cta, parsed.callToComment].filter(Boolean).join("\n");
        scriptData.duration = parsed.estimatedDuration || 45;
      } catch {
        // Parse markdown/text: extract sections by **Header** pattern
        const sections: Record<string, string> = {};
        let currentKey = "";
        const lines = data.split("\n");

        for (const line of lines) {
          const headerMatch = line.match(/\*\*(\w+)\*\*/i);
          if (headerMatch) {
            currentKey = headerMatch[1].toLowerCase();
            // Extract inline content after the header on the same line
            const afterHeader = line.replace(/.*\*\*\w+\*\*[|\s:]*/, "").trim();
            if (afterHeader) {
              sections[currentKey] = (sections[currentKey] ? sections[currentKey] + "\n" : "") + afterHeader;
            }
          } else if (currentKey && line.trim()) {
            sections[currentKey] = (sections[currentKey] ? sections[currentKey] + "\n" : "") + line.trim();
          }
        }

        scriptData.hook = sections["hook"] || "";
        scriptData.introduction = sections["problem"] || sections["intro"] || sections["introduction"] || "";
        scriptData.content = [
          sections["story"] || sections["content"] || sections["body"] || "",
          sections["solution"] ? `\nGiải pháp: ${sections["solution"]}` : "",
        ].filter(Boolean).join("\n");
        scriptData.cta = [
          sections["cta"] || "",
          sections["call"] || sections["calltocomment"] || "",
        ].filter(Boolean).join("\n");

        // Try to extract duration
        const durationMatch = data.match(/(\d+)\s*[-–]\s*(\d+)\s*s/i) || data.match(/(\d+)\s*giây/i) || data.match(/(\d+)\s*s\b/i);
        scriptData.duration = durationMatch ? parseInt(durationMatch[durationMatch.length > 2 ? 2 : 1]) : 45;

        // If nothing was parsed, use entire text as content
        if (!scriptData.hook && !scriptData.content) {
          scriptData.content = data;
        }
      }
    } else if (data && typeof data === "object") {
      scriptData.hook = data.hook || "";
      scriptData.introduction = data.problem || "";
      scriptData.content = [data.story, data.solution ? `Giải pháp: ${data.solution}` : ""].filter(Boolean).join("\n\n");
      scriptData.cta = [data.cta, data.callToComment].filter(Boolean).join("\n");
      scriptData.duration = data.estimatedDuration || 45;
    }

    // Auto-save directly without opening the form
    try {
      await createScriptMutation.mutateAsync({
        ideaId: undefined,
        hook: scriptData.hook,
        introduction: scriptData.introduction,
        content: scriptData.content,
        cta: scriptData.cta,
        duration: scriptData.duration,
      });
      showToast.success("🎬 Đã tạo kịch bản từ AI thành công!");
    } catch (err) {
      showToast.error("Lỗi lưu kịch bản AI. Đang nạp vào form để chỉnh sửa thủ công...");
      // Fallback: open form with pre-filled data
      setFormData({
        ideaId: "",
        hook: scriptData.hook,
        introduction: scriptData.introduction,
        content: scriptData.content,
        cta: scriptData.cta,
        duration: scriptData.duration,
      });
      setEditingScript(null);
      setShowModal(true);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    ideaId: "",
    hook: "",
    introduction: "",
    content: "",
    cta: "",
    duration: 0,
  });

  // Filter scripts
  const filteredScripts = useMemo(() => {
    return scripts.filter((script) => {
      // Find corresponding idea title
      const idea = ideas.find((i) => i.id === script.ideaId);
      const matchText =
        (idea && idea.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (script.hook && script.hook.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (script.content && script.content.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchText;
    });
  }, [scripts, ideas, searchTerm]);

  const handleOpenAdd = () => {
    setEditingScript(null);
    setFormData({
      ideaId: "",
      hook: "",
      introduction: "",
      content: "",
      cta: "",
      duration: 30,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (script: MarketingScript) => {
    setEditingScript(script);
    setFormData({
      ideaId: script.ideaId || "",
      hook: script.hook || "",
      introduction: script.introduction || "",
      content: script.content || "",
      cta: script.cta || "",
      duration: script.duration,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa kịch bản này?")) {
      try {
        await deleteScriptMutation.mutateAsync(id);
        showToast.success("Xóa kịch bản thành công!");
      } catch (err: any) {
        showToast.error("Không thể xóa kịch bản");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingScript) {
        await updateScriptMutation.mutateAsync({
          id: editingScript.id,
          updates: {
            ...formData,
            ideaId: formData.ideaId || undefined,
          },
        });
        showToast.success("Cập nhật kịch bản thành công!");
      } else {
        await createScriptMutation.mutateAsync({
          ...formData,
          ideaId: formData.ideaId || undefined,
        });
        showToast.success("Thêm kịch bản thành công!");
      }
      setShowModal(false);
    } catch (err: any) {
      showToast.error("Không thể lưu kịch bản");
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm kịch bản theo tiêu đề ý tưởng, hook, nội dung..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm"
          />
        </div>

        <button
          onClick={() => setAiModalOpen(true)}
          className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-650 hover:bg-purple-750 text-white rounded-lg text-xs font-bold shadow transition-colors"
        >
          <Sparkles className="w-4 h-4 text-white" />
          <span>AI Script Writer</span>
        </button>

        <button
          onClick={handleOpenAdd}
          className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm kịch bản</span>
        </button>
      </div>

      {/* Grid of Scripts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredScripts.map((script) => {
          const idea = ideas.find((i) => i.id === script.ideaId);
          const mappedVideo = videos.find((v) => v.scriptId === script.id);

          return (
            <div
              key={script.id}
              className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                {/* Title linking to Idea */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-bold uppercase tracking-wider block">
                      {idea ? `Ý TƯỞNG: ${idea.topic || "Khác"}` : "KỊCH BẢN TỰ DO"}
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-snug">
                      {idea ? idea.title : "Kịch bản chưa liên kết ý tưởng"}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded text-[10px] font-semibold whitespace-nowrap">
                    {script.duration} giây
                  </span>
                </div>

                {/* Script details */}
                <div className="space-y-3 mb-4">
                  {script.hook && (
                    <div className="p-2.5 bg-rose-50/50 dark:bg-rose-950/10 border-l-2 border-rose-400 rounded-r text-xs">
                      <strong className="text-rose-700 dark:text-rose-400 block mb-0.5">Hook:</strong>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic">"{script.hook}"</p>
                    </div>
                  )}

                  {script.introduction && (
                    <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/10 border-l-2 border-indigo-400 rounded-r text-xs">
                      <strong className="text-indigo-700 dark:text-indigo-400 block mb-0.5">Giới thiệu:</strong>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{script.introduction}</p>
                    </div>
                  )}

                  {script.content && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-700/20 border-l-2 border-slate-400 rounded-r text-xs">
                      <strong className="text-slate-600 dark:text-slate-400 block mb-0.5">Nội dung chính:</strong>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{script.content}</p>
                    </div>
                  )}

                  {script.cta && (
                    <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/10 border-l-2 border-emerald-400 rounded-r text-xs">
                      <strong className="text-emerald-700 dark:text-emerald-400 block mb-0.5">Kêu gọi hành động (CTA):</strong>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">"{script.cta}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                  {mappedVideo ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <VideoIcon className="w-3.5 h-3.5" />
                      <span>Đã dựng Video: {mappedVideo.title}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">Chưa dựng video</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenEdit(script)}
                    className="p-1 hover:text-blue-500 text-slate-400 transition-colors"
                    title="Chỉnh sửa"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(script.id)}
                    className="p-1 hover:text-red-500 text-slate-400 transition-colors"
                    title="Xóa kịch bản"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredScripts.length === 0 && (
          <div className="col-span-full bg-slate-50 dark:bg-slate-800/40 p-12 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Không tìm thấy kịch bản nào phù hợp.
            </p>
          </div>
        )}
      </div>

      {/* Script Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn border border-slate-100 dark:border-slate-700">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-fuchsia-600" />
                <span>{editingScript ? "Chỉnh sửa kịch bản" : "Thêm kịch bản mới"}</span>
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
                  Liên kết ý tưởng
                </label>
                <select
                  value={formData.ideaId}
                  onChange={(e) => setFormData({ ...formData, ideaId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                >
                  <option value="">-- Chọn ý tưởng kịch bản (không bắt buộc) --</option>
                  {ideas.map((idea) => (
                    <option key={idea.id} value={idea.id}>
                      [{idea.topic || "Khác"}] {idea.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Hook kịch bản (Lời mở đầu gây chú ý)
                </label>
                <textarea
                  value={formData.hook}
                  onChange={(e) => setFormData({ ...formData, hook: e.target.value })}
                  placeholder="Ví dụ: Dừng lại ngay nếu bạn đang đi xe tay ga mà có biểu hiện này..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Phần giới thiệu (Intro)
                </label>
                <textarea
                  value={formData.introduction}
                  onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                  placeholder="Ví dụ: Xin chào mọi người, mình là Kỹ thuật viên tại MotoCare..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Nội dung chính (Body)
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Ví dụ: Bước 1: Kiểm tra kim phun xăng... Bước 2: Vệ sinh nồi..."
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Kêu gọi hành động (CTA)
                </label>
                <textarea
                  value={formData.cta}
                  onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
                  placeholder="Ví dụ: Bấm follow kênh để theo dõi thêm các mẹo sửa xe cực đỉnh nhé!"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Thời lượng dự tính (giây)
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  min={0}
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <button
                  type="submit"
                  disabled={createScriptMutation.isPending || updateScriptMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{editingScript ? "Lưu thay đổi" : "Tạo kịch bản"}</span>
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
        onConfirm={handleConfirmAiScript}
        feature="script"
        title="✨ AI Script Writer"
        description="AI tự viết kịch bản quảng bá, chia đoạn Hook, Problem, Story, Solution, CTA thu hút người xem."
        variables={{ duration: 45, ideaTitle: "Bảo dưỡng nồi Honda Vision" }}
      />
    </div>
  );
};
