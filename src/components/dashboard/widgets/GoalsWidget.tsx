import React, { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";

interface GoalItem {
  id: string;
  text: string;
  done: boolean;
}

const DEFAULT_GOALS: GoalItem[] = [
  { id: "1", text: "Sửa 8 xe", done: false },
  { id: "2", text: "Quay 2 video", done: false },
  { id: "3", text: "Đăng 2 video", done: false },
  { id: "4", text: "Viết 3 Script", done: false },
  { id: "5", text: "Chụp 10 ảnh", done: false },
  { id: "6", text: "Nhập kho", done: false },
  { id: "7", text: "Backup dữ liệu", done: false },
];

export const GoalsWidget: React.FC = () => {
  const [goals, setGoals] = useState<GoalItem[]>(() => {
    const saved = localStorage.getItem("sc_daily_goals");
    return saved ? JSON.parse(saved) : DEFAULT_GOALS;
  });
  const [newGoalText, setNewGoalText] = useState("");

  useEffect(() => {
    localStorage.setItem("sc_daily_goals", JSON.stringify(goals));
  }, [goals]);

  const handleToggle = (id: string) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g))
    );
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    const item: GoalItem = {
      id: Date.now().toString(),
      text: newGoalText.trim(),
      done: false,
    };
    setGoals((prev) => [...prev, item]);
    setNewGoalText("");
  };

  const handleDeleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  // Calculate percentage
  const total = goals.length;
  const completed = goals.filter((g) => g.done).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  // SVG parameters for progress ring
  const size = 96;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur flex flex-col h-full justify-between">
      <div className="space-y-4">
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">🎯 Mục tiêu hôm nay</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Tiến độ ngày làm việc của bạn</p>
          </div>

          {/* Mini progress text */}
          <span className="text-[10.5px] font-extrabold text-slate-450 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-md font-mono">
            {completed}/{total} Đã xong
          </span>
        </div>

        {/* Progress Ring and Metrics */}
        <div className="flex items-center gap-6 bg-slate-950/40 p-4 border border-slate-850 rounded-xl">
          <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background circle */}
              <circle
                className="text-slate-850"
                strokeWidth={strokeWidth}
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx={size / 2}
                cy={size / 2}
              />
              {/* Progress circle */}
              <circle
                className="text-fuchsia-500 transition-all duration-550 ease-in-out"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx={size / 2}
                cy={size / 2}
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-lg font-black text-white font-mono">{percent}%</span>
              <span className="text-[8px] text-slate-500 block uppercase font-bold tracking-wider">Hoàn thành</span>
            </div>
          </div>

          <div className="flex-1 space-y-1.5 text-xs text-slate-400">
            <p>
              Tỷ lệ hoàn thành công việc của bạn là <strong className="text-fuchsia-400 font-mono">{percent}%</strong>.
            </p>
            <p className="text-[11px] text-slate-500">
              {percent === 100
                ? "🎉 Tuyệt vời! Bạn đã hoàn thành 100% mục tiêu ngày!"
                : percent >= 70
                ? "👍 Sắp cán đích rồi, hãy giữ vững phong độ!"
                : "💪 Tiếp tục hành động để hoàn thành thêm mục tiêu!"}
            </p>
          </div>
        </div>

        {/* Checklist Scroll */}
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {goals.map((g) => (
            <div
              key={g.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                g.done
                  ? "bg-slate-950/20 border-slate-850/60 opacity-60"
                  : "bg-slate-900 border-slate-850 hover:border-slate-800"
              }`}
            >
              <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={g.done}
                  onChange={() => handleToggle(g.id)}
                  className="w-4 h-4 rounded text-fuchsia-600 bg-slate-950 border-slate-800 focus:ring-fuchsia-500 focus:ring-opacity-25 focus:ring-offset-0 focus:outline-none"
                />
                <span className={`text-xs font-medium text-slate-200 truncate ${g.done ? "line-through text-slate-550" : ""}`}>
                  {g.text}
                </span>
              </label>
              
              <button
                onClick={() => handleDeleteGoal(g.id)}
                className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add goal Input Form */}
      <form onSubmit={handleAddGoal} className="mt-4 flex gap-2 border-t border-slate-850/60 pt-4">
        <input
          type="text"
          value={newGoalText}
          onChange={(e) => setNewGoalText(e.target.value)}
          placeholder="Thêm mục tiêu mới..."
          className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
        />
        <button
          type="submit"
          className="p-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl transition shadow flex items-center justify-center shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
