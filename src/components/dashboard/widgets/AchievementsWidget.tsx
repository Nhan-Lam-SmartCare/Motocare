import React, { useState, useEffect } from "react";
import { Trophy, Flame, ShieldAlert, Award, Star } from "lucide-react";

interface Achievement {
  id: string;
  title: string;
  desc: string;
  unlocked: boolean;
  icon: React.ReactNode;
}

export const AchievementsWidget: React.FC = () => {
  const [streakDays, setStreakDays] = useState(() => {
    const saved = localStorage.getItem("sc_streak_days");
    return saved ? parseInt(saved, 10) : 12; // Default starting streak
  });

  const achievements: Achievement[] = [
    {
      id: "a1",
      title: "Kỷ lục gia tiếp thị",
      desc: "Đăng video liên tiếp trong 12 ngày",
      unlocked: streakDays >= 12,
      icon: <Flame className="w-5 h-5 text-orange-500" />
    },
    {
      id: "a2",
      title: "Vận hành không nghỉ",
      desc: "30 ngày liên tục hoạt động trên hệ thống",
      unlocked: streakDays >= 30,
      icon: <Trophy className="w-5 h-5 text-yellow-500" />
    },
    {
      id: "a3",
      title: "Chăm xe hoàn hảo",
      desc: "Hoàn thành sửa chữa hơn 100 chiếc xe máy",
      unlocked: true,
      icon: <Award className="w-5 h-5 text-emerald-400" />
    },
    {
      id: "a4",
      title: "Tối ưu hóa lợi nhuận",
      desc: "Doanh thu ngày đạt mốc trên 15,000,000 đ",
      unlocked: true,
      icon: <Star className="w-5 h-5 text-indigo-400" />
    }
  ];

  const handleIncrementStreak = () => {
    setStreakDays((prev) => {
      const next = prev + 1;
      localStorage.setItem("sc_streak_days", String(next));
      return next;
    });
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden backdrop-blur flex flex-col h-full justify-between">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">🏆 Thành tích</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Duy trì kỷ luật làm việc & năng suất</p>
          </div>
          
          <button
            onClick={handleIncrementStreak}
            className="text-[10px] font-bold text-orange-500 hover:text-orange-400 transition bg-orange-500/10 border border-orange-500/25 px-2 py-0.5 rounded-lg flex items-center gap-1 animate-pulse"
          >
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>+1 Ngày Streak</span>
          </button>
        </div>

        {/* Streak Flame Display */}
        <div className="bg-gradient-to-r from-orange-950/20 to-slate-950/40 border border-orange-900/20 p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
            <Flame className="w-7 h-7 text-orange-500 fill-current animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] text-orange-400 font-extrabold uppercase tracking-widest">Chuỗi năng suất hiện tại</span>
            <span className="text-lg font-black text-white mt-0.5 block font-mono">
              {streakDays} ngày liên tiếp
            </span>
            <span className="text-[9px] text-slate-500 mt-0.5 block">
              Duy trì lịch đăng video & sửa xe đều đặn mỗi ngày!
            </span>
          </div>
        </div>

        {/* Badges list */}
        <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-2.5 border rounded-xl flex items-center gap-3 transition ${
                ach.unlocked
                  ? "bg-slate-950/40 border-slate-850"
                  : "bg-slate-950/10 border-slate-900/60 opacity-40"
              }`}
            >
              <div className="shrink-0">{ach.icon}</div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white leading-snug">{ach.title}</div>
                <div className="text-[9.5px] text-slate-500 mt-0.5 leading-relaxed">{ach.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[9px] text-slate-550 border-t border-slate-850/50 pt-3 mt-4 text-left italic">
        * Thành tích sẽ tiếp tục mở khóa khi chuỗi streak của bạn tăng lên.
      </div>
    </div>
  );
};
