import React, { useState, useEffect, useMemo } from "react";
import { Sliders, RefreshCw, Layers, CheckCircle2, Play, ToggleLeft, ToggleRight, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { TodayWidget } from "./widgets/TodayWidget";
import { GoalsWidget } from "./widgets/GoalsWidget";
import { TimelineWidget } from "./widgets/TimelineWidget";
import { PrioritiesWidget } from "./widgets/PrioritiesWidget";
import { RepairTodayWidget } from "./widgets/RepairTodayWidget";
import { ContentTodayWidget } from "./widgets/ContentTodayWidget";
import { BusinessTodayWidget } from "./widgets/BusinessTodayWidget";
import { GrowthWidget } from "./widgets/GrowthWidget";
import { QuickNoteWidget } from "./widgets/QuickNoteWidget";
import { KnowledgeWidget } from "./widgets/KnowledgeWidget";
import { SmartCareAiWidget } from "./widgets/SmartCareAiWidget";
import { CountdownWidget } from "./widgets/CountdownWidget";
import { WeeklyProgressWidget } from "./widgets/WeeklyProgressWidget";
import { AchievementsWidget } from "./widgets/AchievementsWidget";
import { showToast } from "../../utils/toast";

interface WidgetLayoutItem {
  id: string;
  title: string;
  visible: boolean;
  width: "full" | "half" | "third";
  order: number;
}

interface AutomationRule {
  id: string;
  trigger: string;
  action: string;
  active: boolean;
}

const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  { id: "today", title: "👋 TODAY BRIEFING", visible: true, width: "half", order: 1 },
  { id: "smartcare_ai", title: "🧠 SMARTCARE AI BRIEF", visible: true, width: "half", order: 2 },
  { id: "goals", title: "🎯 DAILY GOALS", visible: true, width: "third", order: 3 },
  { id: "timeline", title: "📅 DAILY TIMELINE", visible: true, width: "third", order: 4 },
  { id: "priorities", title: "🔥 TASK PRIORITIES", visible: true, width: "third", order: 5 },
  { id: "repair_today", title: "🚗 REPAIR STATUS", visible: true, width: "half", order: 6 },
  { id: "content_today", title: "🎬 CONTENT STUDIO", visible: true, width: "half", order: 7 },
  { id: "business_today", title: "💰 BUSINESS METRICS", visible: true, width: "half", order: 8 },
  { id: "growth", title: "📈 BRAND GROWTH", visible: true, width: "half", order: 9 },
  { id: "countdown", title: "⏳ EVENT COUNTDOWN", visible: true, width: "third", order: 10 },
  { id: "weekly_progress", title: "📊 WEEKLY PROGRESS", visible: true, width: "third", order: 11 },
  { id: "achievements", title: "🏆 PRODUCTIVITY STREAK", visible: true, width: "third", order: 12 },
  { id: "quick_note", title: "📝 QUICK NOTEPAD", visible: true, width: "half", order: 13 },
  { id: "knowledge", title: "📚 RECENT SOP ARTICLES", visible: true, width: "half", order: 14 }
];

const DEFAULT_RULES: AutomationRule[] = [
  { id: "r1", trigger: "Đăng TikTok xong", action: "Nhắc đăng Facebook Reels", active: true },
  { id: "r2", trigger: "Video Done", action: "Nhắc viết Case Study", active: true },
  { id: "r3", trigger: "Sửa xe xong", action: "Nhắc quay Video nếu đây là xe hiếm/ca đặc biệt", active: false }
];

const CommandCenter: React.FC = () => {
  const [layout, setLayout] = useState<WidgetLayoutItem[]>(() => {
    const saved = localStorage.getItem("sc_commandcenter_layout");
    return saved ? JSON.parse(saved) : DEFAULT_LAYOUT;
  });

  const [rules, setRules] = useState<AutomationRule[]>(() => {
    const saved = localStorage.getItem("sc_automation_rules");
    return saved ? JSON.parse(saved) : DEFAULT_RULES;
  });

  const [showConfig, setShowConfig] = useState(false);
  const [newTrigger, setNewTrigger] = useState("");
  const [newAction, setNewAction] = useState("");

  // Persist settings
  useEffect(() => {
    localStorage.setItem("sc_commandcenter_layout", JSON.stringify(layout));
  }, [layout]);

  useEffect(() => {
    localStorage.setItem("sc_automation_rules", JSON.stringify(rules));
  }, [rules]);

  // Order sorting helper
  const sortedLayout = useMemo(() => {
    return [...layout].sort((a, b) => a.order - b.order);
  }, [layout]);

  const handleToggleVisibility = (id: string) => {
    setLayout((prev) =>
      prev.map((item) => (item.id === id ? { ...item, visible: !item.visible } : item))
    );
  };

  const handleWidthChange = (id: string, width: "full" | "half" | "third") => {
    setLayout((prev) =>
      prev.map((item) => (item.id === id ? { ...item, width } : item))
    );
  };

  const handleMoveOrder = (idx: number, direction: "up" | "down") => {
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sortedLayout.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const itemA = sortedLayout[idx];
    const itemB = sortedLayout[swapIdx];

    setLayout((prev) =>
      prev.map((item) => {
        if (item.id === itemA.id) return { ...item, order: itemB.order };
        if (item.id === itemB.id) return { ...item, order: itemA.order };
        return item;
      })
    );
  };

  const handleResetLayout = () => {
    if (window.confirm("Đặt lại bố cục Widget mặc định?")) {
      setLayout(DEFAULT_LAYOUT);
      showToast.success("Đã khôi phục bố cục mặc định!");
    }
  };

  // Rule actions
  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrigger.trim() || !newAction.trim()) return;
    const rule: AutomationRule = {
      id: Date.now().toString(),
      trigger: newTrigger.trim(),
      action: newAction.trim(),
      active: true
    };
    setRules((prev) => [...prev, rule]);
    setNewTrigger("");
    setNewAction("");
    showToast.success("Đã thêm quy tắc tự động hóa mới!");
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  // Count goals for Today widget stats
  const activeGoalsCount = useMemo(() => {
    const saved = localStorage.getItem("sc_daily_goals");
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.length;
    }
    return 7;
  }, []);

  // Map widget rendering
  const renderWidget = (id: string) => {
    switch (id) {
      case "today":
        return <TodayWidget taskCount={activeGoalsCount} />;
      case "goals":
        return <GoalsWidget />;
      case "timeline":
        return <TimelineWidget />;
      case "priorities":
        return <PrioritiesWidget />;
      case "repair_today":
        return <RepairTodayWidget />;
      case "content_today":
        return <ContentTodayWidget />;
      case "business_today":
        return <BusinessTodayWidget />;
      case "growth":
        return <GrowthWidget />;
      case "quick_note":
        return <QuickNoteWidget />;
      case "knowledge":
        return <KnowledgeWidget />;
      case "smartcare_ai":
        return <SmartCareAiWidget />;
      case "countdown":
        return <CountdownWidget />;
      case "weekly_progress":
        return <WeeklyProgressWidget />;
      case "achievements":
        return <AchievementsWidget />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 min-h-screen bg-secondary-bg text-primary-text p-4 md:p-6 rounded-2xl relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[20%] w-[400px] h-[400px] bg-blue-500/5 dark:bg-fuchsia-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-5%] w-[450px] h-[450px] bg-emerald-500/5 dark:bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Main Header bar */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-primary-border pb-5">
        <div>
          <h1 className="text-2xl font-black text-primary-text flex items-center gap-2 tracking-tight">
            🚀 COMMAND CENTER
          </h1>
          <p className="text-xs text-secondary-text mt-1">
            Trung tâm điều hành cửa hàng thông minh dành riêng cho Founder Nhạn Lâm
          </p>
        </div>

        {/* Layout customize triggers */}
        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 border rounded-xl text-xs font-bold transition ${
              showConfig
                ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-650 dark:text-indigo-400"
                : "bg-primary-bg border-primary-border text-secondary-text hover:bg-tertiary-bg"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Tùy chỉnh Widget</span>
          </button>
          
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="p-2 bg-primary-bg border border-primary-border text-secondary-text hover:text-primary-text rounded-xl transition shadow hover:bg-tertiary-bg"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Config Panel Drawer */}
      {showConfig && (
        <div className="relative z-20 bg-primary-bg border border-primary-border p-5 rounded-2xl shadow-xl backdrop-blur animate-slide-in-top space-y-4">
          <div className="flex items-center justify-between border-b border-primary-border pb-3">
            <h3 className="text-sm font-bold text-primary-text uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Bố cục Trung tâm Điều hành</span>
            </h3>
            <button
              onClick={handleResetLayout}
              className="text-xs text-red-500 hover:text-red-600 dark:text-rose-455 dark:hover:text-rose-355 transition font-bold"
            >
              Đặt lại mặc định
            </button>
          </div>

          {/* Config Grid table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
            {sortedLayout.map((item, idx) => (
              <div
                key={item.id}
                className="bg-secondary-bg/40 border border-primary-border p-3.5 rounded-xl flex items-center justify-between gap-3 hover:border-secondary-border hover:shadow-sm transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={item.visible}
                    onChange={() => handleToggleVisibility(item.id)}
                    className="w-4 h-4 rounded text-indigo-600 bg-secondary-bg border-primary-border focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-primary-text truncate">{item.title}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={item.width}
                    onChange={(e) => handleWidthChange(item.id, e.target.value as any)}
                    className="bg-secondary-bg border border-primary-border rounded-lg px-2 py-1 text-[10.5px] font-bold text-secondary-text focus:outline-none"
                  >
                    <option value="third">1/3 dòng</option>
                    <option value="half">1/2 dòng</option>
                    <option value="full">Toàn dòng</option>
                  </select>

                  <div className="flex items-center bg-secondary-bg border border-primary-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => handleMoveOrder(idx, "up")}
                      disabled={idx === 0}
                      className="p-1 hover:bg-tertiary-bg text-secondary-text hover:text-primary-text disabled:opacity-30"
                      title="Di chuyển lên"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveOrder(idx, "down")}
                      disabled={idx === sortedLayout.length - 1}
                      className="p-1 hover:bg-tertiary-bg text-secondary-text hover:text-primary-text disabled:opacity-30"
                      title="Di chuyển xuống"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid Widgets Container */}
      <div className="grid grid-cols-12 gap-5 relative z-10">
        {sortedLayout
          .filter((item) => item.visible)
          .map((item) => {
            let spanClass = "col-span-12";
            if (item.width === "half") spanClass = "col-span-12 lg:col-span-6";
            if (item.width === "third") spanClass = "col-span-12 md:col-span-6 lg:col-span-4";

            return (
              <div key={item.id} className={`${spanClass} transition-all duration-300`}>
                {renderWidget(item.id)}
              </div>
            );
          })}
      </div>

      {/* Automation Rule Panel section */}
      <div className="relative z-10 border-t border-primary-border pt-6 mt-6 space-y-4">
        <div>
          <h3 className="text-sm font-extrabold text-primary-text uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Quy tắc vận hành tự động (Automation)</span>
          </h3>
          <p className="text-[11px] text-secondary-text mt-1">
            Thiết lập luồng hoạt động tự động nhắc việc khi một mục tiêu được Founder hoàn thành
          </p>
        </div>

        {/* Rules Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-4 rounded-xl border flex flex-col justify-between h-full transition ${
                rule.active
                  ? "bg-primary-bg/70 border-primary-border hover:border-secondary-border hover:shadow-sm"
                  : "bg-secondary-bg/20 border-primary-border/40 opacity-55"
              }`}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] bg-secondary-bg border border-primary-border px-2 py-0.5 rounded font-extrabold text-secondary-text uppercase">
                    Nếu
                  </span>
                  
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    className="text-secondary-text hover:text-primary-text transition"
                    title={rule.active ? "Tắt quy tắc" : "Bật quy tắc"}
                  >
                    {rule.active ? (
                      <ToggleRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-400 dark:text-slate-600" />
                    )}
                  </button>
                </div>
                <div className="text-xs font-bold text-primary-text">{rule.trigger}</div>
                <div className="text-[10px] bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded font-extrabold text-indigo-650 dark:text-indigo-400 uppercase inline-block">
                  Thì tự động
                </div>
                <div className="text-xs text-secondary-text">{rule.action}</div>
              </div>

              <div className="flex justify-end pt-3 mt-3 border-t border-primary-border/40">
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="p-1 hover:bg-tertiary-bg text-secondary-text hover:text-red-500 rounded transition"
                  title="Xóa quy tắc"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* New Rule form */}
          <form onSubmit={handleAddRule} className="p-4 bg-secondary-bg/20 border border-primary-border border-dashed rounded-xl flex flex-col justify-between gap-3 h-full">
            <span className="text-[10px] font-bold text-secondary-text uppercase tracking-widest block">Thêm quy tắc mới</span>
            
            <div className="space-y-2 flex-1">
              <input
                type="text"
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value)}
                placeholder="Khi... (ví dụ: Video Done)"
                className="w-full bg-primary-bg border border-primary-border rounded-lg px-2.5 py-1.5 text-xs text-primary-text placeholder:text-tertiary-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
              <input
                type="text"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                placeholder="Thì... (ví dụ: Nhắc viết Case Study)"
                className="w-full bg-primary-bg border border-primary-border rounded-lg px-2.5 py-1.5 text-xs text-primary-text placeholder:text-tertiary-text focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Rule</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;
