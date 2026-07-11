import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";

interface TimelineEvent {
  time: string;
  label: string;
  done: boolean;
}

const DEFAULT_EVENTS: TimelineEvent[] = [
  { time: "08:00", label: "Sửa xe & Nhận xe buổi sáng", done: false },
  { time: "10:00", label: "Quay Video review xe / lỗi kỹ thuật", done: false },
  { time: "12:00", label: "Dựng Video ngắn (Edit CapCut / Premiere)", done: false },
  { time: "14:00", label: "Livestream giải đáp thắc mắc xe máy", done: false },
  { time: "17:00", label: "Đăng TikTok & Facebook Reels", done: false },
  { time: "20:00", label: "Đăng bài viết chia sẻ Group Facebook", done: false },
];

export const TimelineWidget: React.FC = () => {
  const [events, setEvents] = useState<TimelineEvent[]>(() => {
    const saved = localStorage.getItem("sc_timeline_events");
    return saved ? JSON.parse(saved) : DEFAULT_EVENTS;
  });

  useEffect(() => {
    localStorage.setItem("sc_timeline_events", JSON.stringify(events));
  }, [events]);

  const handleToggle = (idx: number) => {
    setEvents((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, done: !e.done } : e))
    );
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur flex flex-col h-full justify-between">
      <div className="space-y-4">
        {/* Header */}
        <div className="border-b border-slate-850 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">📅 Lịch hôm nay</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Timeline khung giờ hành động mẫu</p>
        </div>

        {/* Timeline Stack */}
        <div className="relative pl-6 border-l border-slate-800 space-y-5 py-2 max-h-[300px] overflow-y-auto pr-1">
          {events.map((evt, idx) => (
            <div key={idx} className="relative group">
              {/* Vertical Dot Indicator */}
              <button
                onClick={() => handleToggle(idx)}
                className={`absolute -left-[31px] w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                  evt.done
                    ? "bg-fuchsia-600 border-fuchsia-600 text-white"
                    : "bg-slate-950 border-slate-800 text-transparent hover:border-fuchsia-500 hover:text-fuchsia-400"
                }`}
                title={evt.done ? "Đánh dấu chưa làm" : "Đánh dấu hoàn thành"}
              >
                <Check className="w-3 h-3" />
              </button>

              {/* Event Content card */}
              <div
                onClick={() => handleToggle(idx)}
                className={`cursor-pointer p-3 rounded-xl border transition-all ${
                  evt.done
                    ? "bg-slate-950/20 border-slate-850/60 opacity-60"
                    : "bg-slate-900 border-slate-850 hover:border-slate-800"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-fuchsia-400 font-extrabold font-mono uppercase tracking-wider">
                    {evt.time}
                  </span>
                  {evt.done && (
                    <span className="text-[8px] bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 px-1.5 py-0.2 rounded font-bold uppercase">
                      Xong
                    </span>
                  )}
                </div>
                <div className={`text-xs font-semibold text-slate-200 mt-1 ${evt.done ? "line-through text-slate-550" : ""}`}>
                  {evt.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-slate-550 border-t border-slate-850/50 pt-3 mt-4 text-center italic">
        * Nhấn vào ô hoặc nút chấm tròn để tích hoàn thành khung giờ
      </div>
    </div>
  );
};
