import React, { useMemo, useState, useEffect } from "react";
import { Sparkles, X, Play, RefreshCw, Check, Settings, Sliders } from "lucide-react";
import { useAiModels, useGenerateAiAction } from "../../hooks/useAiRepository";
import { showToast } from "../../utils/toast";

interface AiPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
  feature: string;
  title: string;
  description: string;
  variables: Record<string, any>;
}

export const AiPreviewModal: React.FC<AiPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  feature,
  title,
  description,
  variables,
}) => {
  const [selectedModel, setSelectedModel] = useState("gemini-3.1-flash-lite");
  const [temperature, setTemperature] = useState(0.7);
  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [outputText, setOutputText] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  const { data: models = [] } = useAiModels();
  const activeModels = useMemo(() => models.filter((m) => m.isActive), [models]);

  const generateMutation = useGenerateAiAction();

  // Reset states on open
  useEffect(() => {
    if (isOpen) {
      setGeneratedResult(null);
      setOutputText("");
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setOutputText("");
    setGeneratedResult(null);

    try {
      const result = await generateMutation.mutateAsync({
        feature,
        modelName: selectedModel,
        variables,
      });

      setGeneratedResult(result);

      // Typing animation
      const fullText = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      let i = 0;
      const timer = setInterval(() => {
        setOutputText((prev) => prev + fullText.charAt(i));
        i++;
        if (i >= fullText.length) {
          clearInterval(timer);
        }
      }, 8);
    } catch (err) {
      showToast.error("Lỗi khi sinh nội dung AI");
      setOutputText("❌ Lỗi: " + (err as Error).message);
    }
  };

  const handleApply = () => {
    if (!generatedResult) {
      showToast.error("Vui lòng nhấn nút Tạo nội dung trước!");
      return;
    }
    onConfirm(generatedResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full animate-scaleIn flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration toggle */}
        <div className="p-4 bg-slate-950 border-b border-slate-850 flex justify-between items-center text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[9px] text-slate-500 block uppercase font-bold">Model AI</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[10.5px] font-bold text-slate-300 focus:outline-none"
              >
                {activeModels.map((m) => (
                  <option key={m.modelName} value={m.modelName}>
                    {m.displayName}
                  </option>
                ))}
                {activeModels.length === 0 && <option value="gpt-4o">GPT-4o</option>}
              </select>
            </div>
            
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="text-slate-450 hover:text-white flex items-center gap-1 mt-3"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Tham số nâng cao</span>
            </button>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition"
          >
            {generateMutation.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>Tạo nội dung</span>
          </button>
        </div>

        {/* Advanced settings block */}
        {showConfig && (
          <div className="p-4 bg-slate-950/80 border-b border-slate-850 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Độ sáng tạo (Temperature): {temperature}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
        )}

        {/* Console Text Preview Area */}
        <div className="flex-1 p-6 bg-slate-950/50 overflow-y-auto min-h-[220px]">
          <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 min-h-[180px] shadow-inner relative">
            {generateMutation.isPending && !outputText && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400 text-xs">
                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                <span className="font-mono">SmartCare AI đang phân tích dữ liệu...</span>
              </div>
            )}
            <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
              {outputText || (!generateMutation.isPending && (
                <span className="text-slate-600 italic">Nhấn nút "Tạo nội dung" để bắt đầu sinh kết quả.</span>
              ))}
            </pre>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/80">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition"
          >
            Hủy
          </button>
          <button
            onClick={handleApply}
            disabled={!generatedResult}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Check className="w-4 h-4" />
            <span>Áp dụng</span>
          </button>
        </div>
      </div>
    </div>
  );
};
