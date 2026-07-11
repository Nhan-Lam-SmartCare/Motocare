import React, { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Send,
  Copy,
  Cpu,
  BookOpen,
  Zap,
  HelpCircle,
  FileSpreadsheet,
  BarChart,
  Tag,
  Video,
  X,
  RefreshCw,
} from "lucide-react";
import { useAiModels, useGenerateAiAction } from "../../hooks/useAiRepository";
import { showToast } from "../../utils/toast";

export const AiPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "kms" | "actions">("chat");
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-3.1-flash-lite");
  const [responseOutput, setResponseOutput] = useState("");

  const { data: models = [] } = useAiModels();
  const activeModels = useMemo(() => models.filter((m) => m.isActive), [models]);

  useEffect(() => {
    if (activeModels.length === 0) return;
    if (activeModels.some((m) => m.modelName === selectedModel)) return;

    const preferredModel =
      activeModels.find((m) => m.modelName === "gemini-3.1-flash-lite") ||
      activeModels.find((m) => m.modelName === "gemini-2.5-flash") ||
      activeModels.find((m) => m.modelName === "gemini-3.5-flash") ||
      activeModels.find((m) => m.modelName === "gpt-4o") ||
      activeModels[0];

    setSelectedModel(preferredModel.modelName);
  }, [activeModels, selectedModel]);

  // AI mutation
  const generateMutation = useGenerateAiAction();

  const handleCopy = () => {
    if (!responseOutput) return;
    navigator.clipboard.writeText(responseOutput);
    showToast.success("Đã sao chép nội dung gợi ý từ AI!");
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || generateMutation.isPending) return;

    const currentPrompt = prompt;
    setPrompt("");
    setResponseOutput("");

    try {
      const featureType = activeTab === "kms" ? "kms_qa" : "chat";
      const result = await generateMutation.mutateAsync({
        feature: featureType,
        modelName: selectedModel,
        variables: { question: currentPrompt },
      });

      // Stream typewriting simulation
      let i = 0;
      const fullText = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      const timer = setInterval(() => {
        setResponseOutput((prev) => prev + fullText.charAt(i));
        i++;
        if (i >= fullText.length) {
          clearInterval(timer);
        }
      }, 10);
    } catch (err) {
      setResponseOutput("❌ Lỗi sinh dữ liệu AI: " + (err as Error).message);
    }
  };

  const handleQuickAction = async (actionKey: string, desc: string) => {
    setPrompt(desc);
    setResponseOutput("");
    setActiveTab("chat");
    setIsOpen(true);

    try {
      const result = await generateMutation.mutateAsync({
        feature: actionKey,
        modelName: selectedModel,
        variables: { topic: "bảo dưỡng nồi xe tay ga", videoTitle: "Vision 2021 hao xăng", campaignName: "Chiến dịch Thu 2026" },
      });

      let i = 0;
      const fullText = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      const timer = setInterval(() => {
        setResponseOutput((prev) => prev + fullText.charAt(i));
        i++;
        if (i >= fullText.length) {
          clearInterval(timer);
        }
      }, 10);
    } catch (err) {
      setResponseOutput("❌ Lỗi: " + (err as Error).message);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-4 bottom-20 z-45 flex items-center justify-center w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg shadow-purple-500/30 transition-all hover:scale-105 border border-purple-500 animate-pulse"
        title="Trợ lý SmartCare AI"
      >
        <Sparkles className="w-5 h-5 text-white" />
      </button>

      {/* Main Slide Panel */}
      <div
        className={`fixed top-[110px] right-0 bottom-6 z-45 bg-slate-900 border-l border-slate-800 shadow-2xl transition-all duration-300 flex flex-col ${
          isOpen ? "w-80 sm:w-96 translate-x-0" : "w-0 translate-x-full overflow-hidden"
        }`}
      >
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400 animate-bounce" />
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Trợ lý SmartCare AI
              </h3>
              <span className="text-[9px] text-slate-500 font-mono">AI-First Copilot</span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex bg-slate-950 p-1 border-b border-slate-850">
          {[
            { key: "chat", label: "💬 AI Chat" },
            { key: "kms", label: "📖 Hỏi SOP (KMS)" },
            { key: "actions", label: "⚡ Tác vụ" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-1.5 rounded text-[10.5px] font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Console Output Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950/40 space-y-4">
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 min-h-[180px] max-h-[350px] overflow-y-auto relative flex flex-col justify-between shadow-inner">
            <div className="text-xs text-slate-250 font-mono whitespace-pre-line leading-relaxed pb-6">
              {responseOutput || (
                <span className="text-slate-600 italic">
                  {activeTab === "chat"
                    ? "Nhập câu hỏi để bắt đầu thảo luận với AI..."
                    : activeTab === "kms"
                    ? "Tìm kiếm tài liệu SOP nội bộ bằng RAG. Nhập từ khóa: 'Quy trình rửa xe', 'Thay dầu máy'..."
                    : "Chọn một tác vụ nhanh bên dưới để AI tự động soạn thảo..."}
                </span>
              )}
            </div>

            {responseOutput && !generateMutation.isPending && (
              <button
                onClick={handleCopy}
                className="absolute right-3 bottom-3 p-1.5 bg-slate-850 hover:bg-slate-800 rounded border border-slate-700 text-slate-400 hover:text-white flex items-center gap-1.5 text-[9px] font-bold"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            )}
          </div>

          {/* Action List Section */}
          {activeTab === "actions" && (
            <div className="space-y-3">
              <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest block">
                Tác vụ Soạn thảo nội dung
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "script", label: "📝 Viết Script", desc: "Viết kịch bản Vision 2021 hao xăng" },
                  { key: "idea", label: "💡 Sinh Ý tưởng", desc: "Sinh 20 ý tưởng sửa xe ga" },
                  { key: "caption", label: "✍ Viết Caption", desc: "Soạn caption TikTok vệ sinh nồi" },
                  { key: "hashtag", label: "🏷 Sinh Hashtag", desc: "Tạo hashtags xe ga Vision" },
                  { key: "thumbnail", label: "🖼 Thumbnail", desc: "Gợi ý bố cục thiết kế bìa ảnh" },
                  { key: "shot_list", label: "🎥 Đề xuất Shot List", desc: "Lập shot list bảo dưỡng côn" },
                  { key: "campaign_planner", label: "🎯 Lập Campaign", desc: "Tạo chiến dịch tri ân khách hàng" },
                  { key: "insight", label: "📊 Phân tích KPI", desc: "Đánh giá hiệu quả kinh doanh video" },
                ].map((act) => (
                  <button
                    key={act.key}
                    onClick={() => handleQuickAction(act.key, act.desc)}
                    disabled={generateMutation.isPending}
                    className="p-2.5 bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-lg text-left text-[10.5px] font-bold text-slate-300 hover:text-white transition flex flex-col justify-between h-14"
                  >
                    <span>{act.label}</span>
                    <span className="text-[8px] text-slate-500 font-normal truncate w-full">{act.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input Control Bottom Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 space-y-3">
          <div className="flex gap-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="flex-1 px-2.5 py-1.5 border border-slate-750 bg-slate-900 text-[10px] font-bold text-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              {activeModels.map((m) => (
                <option key={m.modelName} value={m.modelName}>
                  {m.displayName}
                </option>
              ))}
              {activeModels.length === 0 && <option value="gpt-4o">GPT-4o</option>}
            </select>
          </div>

          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                activeTab === "kms"
                  ? "Tìm tri thức (Ví dụ: Quy trình sửa xe)..."
                  : "Hỏi trợ lý AI..."
              }
              className="flex-1 px-3 py-2 border border-slate-700 bg-slate-800 text-white placeholder-slate-500 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              disabled={generateMutation.isPending}
            />
            <button
              type="submit"
              disabled={generateMutation.isPending || !prompt.trim()}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center"
            >
              {generateMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};
