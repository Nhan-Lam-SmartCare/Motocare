import React, { useState, useEffect } from "react";
import { Hourglass, Plus, Trash2, Edit } from "lucide-react";

interface CountdownEvent {
  title: string;
  timeStr: string; // "HH:MM"
}

const DEFAULT_EVENT: CountdownEvent = {
  title: "Livestream",
  timeStr: "20:00"
};

export const CountdownWidget: React.FC = () => {
  const [event, setEvent] = useState<CountdownEvent>(() => {
    const saved = localStorage.getItem("sc_countdown_event");
    return saved ? JSON.parse(saved) : DEFAULT_EVENT;
  });
  const [titleInput, setTitleInput] = useState("");
  const [timeInput, setTimeInput] = useState("20:00");
  const [isEditing, setIsEditing] = useState(false);
  const [remainingText, setRemainingText] = useState("0 giờ 0 phút");
  const [timeLeftSec, setTimeLeftSec] = useState(0);

  useEffect(() => {
    localStorage.setItem("sc_countdown_event", JSON.stringify(event));
  }, [event]);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const [h, m] = event.timeStr.split(":").map(Number);
      
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
      
      // If time has passed today, target is tomorrow
      if (target.getTime() < now.getTime()) {
        target.setDate(target.getDate() + 1);
      }

      const diffMs = target.getTime() - now.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      setTimeLeftSec(diffSec);

      const hours = Math.floor(diffSec / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      const seconds = diffSec % 60;

      if (hours > 0) {
        setRemainingText(`${hours} giờ ${minutes} phút ${seconds} giây`);
      } else if (minutes > 0) {
        setRemainingText(`${minutes} phút ${seconds} giây`);
      } else {
        setRemainingText(`${seconds} giây`);
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [event]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim() || !timeInput) return;
    setEvent({
      title: titleInput.trim(),
      timeStr: timeInput
    });
    setIsEditing(false);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur flex flex-col h-full justify-between">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">⏳ Countdown</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Bộ đếm ngược thời gian sự kiện trong ngày</p>
          </div>
          
          <button
            onClick={() => {
              setTitleInput(event.title);
              setTimeInput(event.timeStr);
              setIsEditing(!isEditing);
            }}
            className="text-[10.5px] font-bold text-fuchsia-400 hover:text-fuchsia-300 transition flex items-center gap-0.5"
          >
            {isEditing ? "Đóng" : "Cài đặt"}
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-3 bg-slate-950/40 p-4 border border-slate-850 rounded-xl">
            <div>
              <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Tên sự kiện</label>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Ví dụ: Livestream Tiktok"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Thời gian (Giờ:Phút)</label>
              <input
                type="time"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-bold transition shadow"
            >
              Lưu cấu hình
            </button>
          </form>
        ) : (
          <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-xl text-center space-y-3 flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center animate-pulse">
              <Hourglass className="w-5 h-5" />
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">{event.title} lúc {event.timeStr}</span>
              <span className="text-xl font-black text-white mt-1.5 block tracking-wide font-mono">
                {remainingText}
              </span>
              <span className="text-[9px] text-slate-550 mt-1 block">
                Còn khoảng {Math.round(timeLeftSec / 60)} phút nữa sự kiện sẽ diễn ra.
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="text-[9px] text-slate-550 border-t border-slate-850/50 pt-3 mt-4 text-left italic">
        * Đồng hồ cập nhật từng giây theo giờ hệ thống.
      </div>
    </div>
  );
};
