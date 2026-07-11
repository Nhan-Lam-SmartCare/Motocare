import React, { useState, useEffect, useRef } from "react";
import { FileText, Save, CheckCircle } from "lucide-react";

type NoteTab = "ideas" | "customers" | "issues" | "content";

export const QuickNoteWidget: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NoteTab>("ideas");
  const [noteContent, setNoteContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load note content on tab change
  useEffect(() => {
    const saved = localStorage.getItem(`sc_quicknote_${activeTab}`) || "";
    setNoteContent(saved);
  }, [activeTab]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNoteContent(val);
    setIsSaving(true);

    // Debounce save to localStorage
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(`sc_quicknote_${activeTab}`, val);
      setIsSaving(false);
    }, 800);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const tabs: { key: NoteTab; label: string }[] = [
    { key: "ideas", label: "💡 Ý tưởng" },
    { key: "customers", label: "👤 Khách" },
    { key: "issues", label: "🛠️ Lỗi xe" },
    { key: "content", label: "📝 Nội dung" }
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur flex flex-col h-full justify-between">
      <div className="space-y-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">📝 Quick Note</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Ghi chép nhanh tự động lưu</p>
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            {isSaving ? (
              <span className="text-amber-400 animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                Đang lưu...
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Đã lưu
              </span>
            )}
          </div>
        </div>

        {/* Tab buttons switcher */}
        <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-850">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 text-center py-1.5 rounded-lg text-[10.5px] font-bold transition ${
                activeTab === tab.key
                  ? "bg-slate-850 text-white shadow-sm border border-slate-750/30"
                  : "text-slate-500 hover:text-slate-350"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Note Editor area */}
        <div className="flex-1 flex min-h-[140px]">
          <textarea
            value={noteContent}
            onChange={handleChange}
            placeholder={`Ghi chú nhanh cho ${tabs.find((t) => t.key === activeTab)?.label.toLowerCase()}...`}
            className="w-full h-full min-h-[140px] bg-slate-950/40 border border-slate-850 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-600 focus:border-transparent resize-none leading-relaxed font-sans"
          />
        </div>
      </div>

      <div className="text-[9px] text-slate-550 border-t border-slate-850/50 pt-3 mt-4 text-left italic">
        * Tự động lưu trữ cục bộ khi ngừng gõ 0.8 giây.
      </div>
    </div>
  );
};
