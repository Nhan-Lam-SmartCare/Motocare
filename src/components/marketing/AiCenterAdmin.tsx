import React, { useState, useMemo } from "react";
import {
  Cpu,
  LayoutDashboard,
  FileText,
  KeyRound,
  History,
  CheckCircle,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  useAiModels,
  useUpdateAiModel,
  useAiPrompts,
  useCreateAiPrompt,
  useUpdateAiPrompt,
  useDeleteAiPrompt,
  useAiKeys,
  useSaveAiKey,
  useAiLogs,
} from "../../hooks/useAiRepository";
import { showToast } from "../../utils/toast";
import { formatDate } from "../../utils/format";

export const AiCenterAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"dashboard" | "models" | "prompts" | "keys" | "logs">("dashboard");
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<any>(null);
  const [showKeyVal, setShowKeyVal] = useState(false);

  const { data: models = [] } = useAiModels();
  const { data: prompts = [] } = useAiPrompts();
  const { data: keys = [] } = useAiKeys();
  const { data: logs = [] } = useAiLogs();

  const updateModelMutation = useUpdateAiModel();
  const createPromptMutation = useCreateAiPrompt();
  const updatePromptMutation = useUpdateAiPrompt();
  const deletePromptMutation = useDeleteAiPrompt();
  const saveKeyMutation = useSaveAiKey();

  const [promptForm, setPromptForm] = useState({
    category: "script" as any,
    name: "",
    systemPrompt: "",
    userPromptTemplate: "",
    temperature: 0.7,
    isDefault: false,
  });

  const [keyForm, setKeyForm] = useState({
    provider: "OpenAI",
    keyVal: "",
    endpoint: "",
  });

  const stats = useMemo(() => {
    const totalCalls = logs.length;
    const totalCost = logs.reduce((acc, log) => acc + (log.costUsd || 0), 0);
    const avgLatency = totalCalls > 0 ? Math.round(logs.reduce((acc, log) => acc + log.latencyMs, 0) / totalCalls) : 0;
    const failureRate = totalCalls > 0 ? Math.round((logs.filter((l) => l.status === "failure").length / totalCalls) * 100) : 0;
    return { totalCalls, totalCost, avgLatency, failureRate };
  }, [logs]);

  const handleModelToggle = async (modelId: string, currentStatus: boolean) => {
    try {
      await updateModelMutation.mutateAsync({ id: modelId, isActive: !currentStatus });
      showToast.success("Đã cập nhật trạng thái model!");
    } catch {
      showToast.error("Lỗi cập nhật cấu hình model");
    }
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptForm.name.trim() || !promptForm.systemPrompt.trim()) {
      showToast.error("Vui lòng nhập tên prompt và system prompt!");
      return;
    }
    try {
      if (editingPrompt) {
        await updatePromptMutation.mutateAsync({ id: editingPrompt.id, updates: promptForm });
        showToast.success("Cập nhật prompt thành công!");
      } else {
        await createPromptMutation.mutateAsync(promptForm);
        showToast.success("Tạo prompt mới thành công!");
      }
      setShowPromptModal(false);
    } catch {
      showToast.error("Không thể lưu cấu hình prompt");
    }
  };

  const handleOpenAddPrompt = () => {
    setEditingPrompt(null);
    setPromptForm({ category: "script", name: "", systemPrompt: "", userPromptTemplate: "", temperature: 0.7, isDefault: false });
    setShowPromptModal(true);
  };

  const handleOpenEditPrompt = (p: any) => {
    setEditingPrompt(p);
    setPromptForm({ category: p.category, name: p.name, systemPrompt: p.systemPrompt, userPromptTemplate: p.userPromptTemplate, temperature: p.temperature, isDefault: p.isDefault });
    setShowPromptModal(true);
  };

  const handleDeletePrompt = async (id: string) => {
    if (confirm("Xóa prompt này khỏi thư viện?")) {
      try {
        await deletePromptMutation.mutateAsync(id);
        showToast.success("Đã xóa prompt!");
      } catch {
        showToast.error("Không thể xóa");
      }
    }
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyForm.keyVal.trim()) {
      showToast.error("Vui lòng nhập khóa API!");
      return;
    }
    try {
      await saveKeyMutation.mutateAsync({ provider: keyForm.provider, keyVal: keyForm.keyVal, endpoint: keyForm.endpoint });
      setKeyForm({ ...keyForm, keyVal: "", endpoint: "" });
      showToast.success("✅ Lưu API Key thành công! AI đã sẵn sàng sử dụng.");
    } catch {
      showToast.error("Lỗi khi lưu API Key");
    }
  };

  const inputCls = "w-full px-3 py-2 border border-slate-700 bg-slate-800 text-white text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-slate-500";
  const labelCls = "block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wide";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
        <Cpu className="w-6 h-6 text-purple-500" />
        <div>
          <h2 className="text-base font-bold text-white">🧠 SmartCare AI — Cấu hình &amp; Quản trị</h2>
          <p className="text-xs text-slate-500">Quản trị LLM API keys, kiểm toán Token, prompt template và kích hoạt model AI.</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
        {[
          { key: "dashboard", label: "Tổng quan", icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
          { key: "models",    label: "AI Models",      icon: <Cpu className="w-3.5 h-3.5" /> },
          { key: "prompts",   label: "Prompt Library", icon: <FileText className="w-3.5 h-3.5" /> },
          { key: "keys",      label: "API Keys",       icon: <KeyRound className="w-3.5 h-3.5" /> },
          { key: "logs",      label: "Audit Logs",     icon: <History className="w-3.5 h-3.5" /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`flex items-center justify-center gap-1.5 flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === t.key ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── 1. DASHBOARD ── */}
      {activeTab === "dashboard" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Lượt gọi AI",       value: stats.totalCalls.toLocaleString(), color: "text-white" },
              { label: "Chi phí dự toán",   value: `$${stats.totalCost.toFixed(4)}`,  color: "text-emerald-400" },
              { label: "Độ trễ TB",         value: `${stats.avgLatency} ms`,          color: "text-sky-400" },
              { label: "Tỷ lệ lỗi",         value: `${stats.failureRate}%`,           color: stats.failureRate > 0 ? "text-red-400" : "text-emerald-400" },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-purple-800/40 transition-colors">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{s.label}</span>
                <span className={`text-xl font-extrabold ${s.color} mt-2 block`}>{s.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái kết nối AI</h4>
            {keys.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {keys.map((k) => (
                  <span key={k.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 font-bold">
                    <CheckCircle className="w-3 h-3" /> {k.provider} — Đã kết nối
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-xs text-amber-400">Chưa có API Key. Vào tab <strong>API Keys</strong> để thêm và kích hoạt AI.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 2. MODELS ── */}
      {activeTab === "models" && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-800 text-slate-400 text-xs uppercase font-semibold">
              <tr>
                <th className="px-5 py-3">Nhà cung cấp</th>
                <th className="px-5 py-3">Model</th>
                <th className="px-5 py-3">Tên hiển thị</th>
                <th className="px-5 py-3 text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {models.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-white">{m.provider}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-300">{m.modelName}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-400">{m.displayName}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleModelToggle(m.id, m.isActive)}
                      className={`px-3 py-1 rounded-lg text-[10.5px] font-bold transition ${
                        m.isActive
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25"
                          : "bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      {m.isActive ? "✓ Hoạt động" : "Vô hiệu"}
                    </button>
                  </td>
                </tr>
              ))}
              {models.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500 text-xs">Chưa có model nào được cấu hình.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 3. PROMPTS ── */}
      {activeTab === "prompts" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thư viện Prompt ({prompts.length})</h4>
            <button onClick={handleOpenAddPrompt} className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition">
              <Plus className="w-3.5 h-3.5" /> Thêm Prompt
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prompts.map((p) => (
              <div key={p.id} className="bg-slate-900 p-4 border border-slate-800 rounded-xl space-y-2 hover:border-purple-500/40 transition group flex flex-col">
                <div className="flex justify-between items-start">
                  <span className="px-2 py-0.5 bg-purple-950/40 text-purple-400 border border-purple-800/30 text-[9.5px] font-bold rounded">
                    {p.category.toUpperCase()}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    <button onClick={() => handleOpenEditPrompt(p)} className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded transition"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDeletePrompt(p.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <h5 className="text-xs font-bold text-white">{p.name}</h5>
                <p className="text-[11px] text-slate-500 line-clamp-2 italic">"{p.systemPrompt}"</p>
              </div>
            ))}
            {prompts.length === 0 && (
              <div className="col-span-2 bg-slate-900 border border-dashed border-slate-700 rounded-xl p-10 text-center text-slate-500 text-xs">
                Chưa có Prompt. Nhấn <strong className="text-purple-400">+ Thêm Prompt</strong> để bắt đầu.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. API KEYS ── */}
      {activeTab === "keys" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={handleSaveKey} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Cập nhật API Key</h4>
            </div>

            <div>
              <label className={labelCls}>Nhà cung cấp</label>
              <select value={keyForm.provider} onChange={(e) => setKeyForm({ ...keyForm, provider: e.target.value })} className={inputCls}>
                <option value="OpenAI">OpenAI (GPT-4o, GPT-4)</option>
                <option value="Anthropic">Anthropic (Claude 3.5)</option>
                <option value="Google">Google Gemini</option>
                <option value="DeepSeek">DeepSeek</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Khóa bí mật API Key</label>
              <div className="relative">
                <input
                  type={showKeyVal ? "text" : "password"}
                  value={keyForm.keyVal}
                  onChange={(e) => setKeyForm({ ...keyForm, keyVal: e.target.value })}
                  placeholder="sk-••••••••"
                  className={`${inputCls} pr-9`}
                  required
                />
                <button type="button" onClick={() => setShowKeyVal(!showKeyVal)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                  {showKeyVal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-600 mt-1">Key được lưu bảo mật, không hiển thị lại sau khi lưu.</p>
            </div>

            <div>
              <label className={labelCls}>Endpoint (tùy chọn proxy)</label>
              <input type="text" value={keyForm.endpoint} onChange={(e) => setKeyForm({ ...keyForm, endpoint: e.target.value })} placeholder="https://api.openai.com/v1" className={inputCls} />
            </div>

            <button type="submit" disabled={saveKeyMutation.isPending} className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2">
              {saveKeyMutation.isPending ? <><span className="animate-spin inline-block">⟳</span> Đang lưu...</> : "💾 Lưu cấu hình"}
            </button>
          </form>

          <div className="md:col-span-2 bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Cấu hình bảo mật hiện tại</h4>
            <div className="divide-y divide-slate-800">
              {keys.map((key) => (
                <div key={key.id} className="py-3.5 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      {key.provider}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 pl-5">{key.apiEndpoint || "Default Endpoint"}</div>
                  </div>
                  <span className="font-mono bg-slate-800 border border-slate-700 px-3 py-1 rounded-lg text-[10.5px] text-slate-400">{key.apiKeyMasked}</span>
                </div>
              ))}
              {keys.length === 0 && (
                <div className="flex items-start gap-3 py-6">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-400">Chưa có API key nào được thiết lập</p>
                    <p className="text-xs text-slate-500 mt-0.5">Thêm API key để kích hoạt tính năng AI trong toàn bộ Marketing Hub.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. LOGS ── */}
      {activeTab === "logs" && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-800 text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3">Thời gian</th>
                  <th className="px-5 py-3">Tác vụ</th>
                  <th className="px-5 py-3">Model</th>
                  <th className="px-5 py-3">Tokens (In/Out)</th>
                  <th className="px-5 py-3">Độ trễ</th>
                  <th className="px-5 py-3">Chi phí</th>
                  <th className="px-5 py-3 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500">{formatDate(log.created_at)}</td>
                    <td className="px-5 py-3.5 font-bold text-white capitalize">{log.feature}</td>
                    <td className="px-5 py-3.5 font-mono text-[10.5px] text-slate-400">{log.modelUsed}</td>
                    <td className="px-5 py-3.5 text-slate-500">{log.promptTokens} / {log.completionTokens}</td>
                    <td className="px-5 py-3.5 text-slate-500">{log.latencyMs} ms</td>
                    <td className="px-5 py-3.5 text-emerald-400 font-bold">${log.costUsd.toFixed(5)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.status === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-500">Chưa có lịch sử cuộc gọi AI.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full border border-slate-700">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-500" />
                {editingPrompt ? "Chỉnh sửa Prompt" : "Thêm Prompt Preset mới"}
              </h3>
              <button onClick={() => setShowPromptModal(false)} className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handlePromptSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Phân mục tác vụ</label>
                  <select value={promptForm.category} onChange={(e) => setPromptForm({ ...promptForm, category: e.target.value as any })} className={inputCls}>
                    <option value="script">Kịch bản (Script)</option>
                    <option value="idea">Ý tưởng (Idea)</option>
                    <option value="caption">Caption bài viết</option>
                    <option value="hashtag">Hashtags</option>
                    <option value="planning">Lập kế hoạch</option>
                    <option value="shot_list">Góc máy (Shot list)</option>
                    <option value="checklist">Trợ lý quay phim</option>
                    <option value="thumbnail">Thumbnail</option>
                    <option value="best_time">Lịch đăng</option>
                    <option value="campaign_planner">Chiến dịch</option>
                    <option value="seo">SEO</option>
                    <option value="rewrite">Rewrite</option>
                    <option value="insight">Insight</option>
                    <option value="kms_qa">Q&A SOP</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Tên Prompt</label>
                  <input type="text" value={promptForm.name} onChange={(e) => setPromptForm({ ...promptForm, name: e.target.value })} placeholder="Mẫu kịch bản hài hước..." className={inputCls} required />
                </div>
              </div>
              <div>
                <label className={labelCls}>System Prompt</label>
                <textarea value={promptForm.systemPrompt} onChange={(e) => setPromptForm({ ...promptForm, systemPrompt: e.target.value })} placeholder="Bạn là chuyên gia về..." rows={4} className={`${inputCls} resize-none`} required />
              </div>
              <div>
                <label className={labelCls}>User Template</label>
                <textarea value={promptForm.userPromptTemplate} onChange={(e) => setPromptForm({ ...promptForm, userPromptTemplate: e.target.value })} placeholder="Ý tưởng: {{topic}}..." rows={2} className={`${inputCls} resize-none`} />
              </div>
              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button type="submit" className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition">Xác nhận</button>
                <button type="button" onClick={() => setShowPromptModal(false)} className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-700 transition">Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
