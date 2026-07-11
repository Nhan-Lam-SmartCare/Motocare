import React, { useState, useEffect } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface PriorityTask {
  id: string;
  text: string;
  category: "emergency" | "important" | "backlog";
}

const DEFAULT_PRIORITIES: PriorityTask[] = [
  { id: "p1", text: "Xử lý xe Honda SH hư côn gấp", category: "emergency" },
  { id: "p2", text: "Liên hệ NCC phụ tùng hỏi giá sỉ Bugi", category: "emergency" },
  { id: "p3", text: "Quay demo video hướng dẫn vệ sinh nhông sên dĩa", category: "important" },
  { id: "p4", text: "Thiết kế ảnh bìa Fanpage Tết/Hè", category: "backlog" },
];

export const PrioritiesWidget: React.FC = () => {
  const [tasks, setTasks] = useState<PriorityTask[]>(() => {
    const saved = localStorage.getItem("sc_priorities_list");
    return saved ? JSON.parse(saved) : DEFAULT_PRIORITIES;
  });
  const [inputText, setInputText] = useState("");
  const [inputCat, setInputCat] = useState<"emergency" | "important" | "backlog">("important");

  useEffect(() => {
    localStorage.setItem("sc_priorities_list", JSON.stringify(tasks));
  }, [tasks]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const item: PriorityTask = {
      id: Date.now().toString(),
      text: inputText.trim(),
      category: inputCat,
    };
    setTasks((prev) => [...prev, item]);
    setInputText("");
  };

  const handleRemoveTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleMoveCategory = (id: string, direction: "up" | "down") => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        let nextCat = t.category;
        if (t.category === "emergency" && direction === "down") nextCat = "important";
        else if (t.category === "important" && direction === "up") nextCat = "emergency";
        else if (t.category === "important" && direction === "down") nextCat = "backlog";
        else if (t.category === "backlog" && direction === "up") nextCat = "important";
        return { ...t, category: nextCat };
      })
    );
  };

  const renderCategoryList = (cat: "emergency" | "important" | "backlog", title: string, colorClass: string, borderClass: string) => {
    const filtered = tasks.filter((t) => t.category === cat);
    return (
      <div className={`p-3 bg-slate-950/40 border rounded-xl space-y-2 ${borderClass}`}>
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-350">{title}</span>
          <span className="text-[9px] bg-slate-900 text-slate-500 font-mono px-1.5 py-0.2 rounded ml-auto">
            {filtered.length}
          </span>
        </div>

        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg flex items-center justify-between gap-2 hover:border-slate-800 transition group"
            >
              <span className="text-xs text-slate-200 font-medium truncate flex-1 leading-snug">{t.text}</span>
              <div className="flex items-center gap-1 shrink-0">
                {cat !== "emergency" && (
                  <button
                    onClick={() => handleMoveCategory(t.id, "up")}
                    className="p-1 hover:bg-slate-800 text-slate-500 hover:text-white rounded transition"
                    title="Đẩy độ ưu tiên lên"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                )}
                {cat !== "backlog" && (
                  <button
                    onClick={() => handleMoveCategory(t.id, "down")}
                    className="p-1 hover:bg-slate-800 text-slate-500 hover:text-white rounded transition"
                    title="Hạ độ ưu tiên xuống"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => handleRemoveTask(t.id)}
                  className="p-1 hover:bg-slate-800 text-slate-500 hover:text-red-400 rounded transition"
                  title="Xóa / Hoàn thành"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-4 text-[10px] text-slate-600 italic">Trống</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur flex flex-col h-full justify-between">
      <div className="space-y-4">
        {/* Header */}
        <div className="border-b border-slate-850 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">🔥 Việc ưu tiên</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Phân loại việc để giải quyết hiệu quả</p>
        </div>

        {/* 3 Categories Stack */}
        <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
          {renderCategoryList("emergency", "🔴 Khẩn cấp", "bg-rose-500", "border-rose-950/40")}
          {renderCategoryList("important", "🟠 Quan trọng", "bg-amber-500", "border-amber-950/40")}
          {renderCategoryList("backlog", "🟢 Có thể làm sau", "bg-emerald-500", "border-emerald-950/40")}
        </div>
      </div>

      {/* Form Input to Add Priority Task */}
      <form onSubmit={handleAddTask} className="mt-4 flex gap-2 border-t border-slate-850/60 pt-4">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Thêm việc cần làm..."
          className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          required
        />
        <select
          value={inputCat}
          onChange={(e) => setInputCat(e.target.value as any)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-2 text-xs text-slate-350 focus:outline-none"
        >
          <option value="emergency">🔴 Khẩn cấp</option>
          <option value="important">🟠 Quan trọng</option>
          <option value="backlog">🟢 Để sau</option>
        </select>
        <button
          type="submit"
          className="p-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl transition flex items-center justify-center shrink-0 shadow"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
