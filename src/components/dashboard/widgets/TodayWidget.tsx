import React, { useState, useEffect } from "react";
import { Sun, CloudRain, Clock, Play, Pause, RefreshCw } from "lucide-react";
import { showToast } from "../../../utils/toast";

interface TodayWidgetProps {
  taskCount: number;
}

export const TodayWidget: React.FC<TodayWidgetProps> = ({ taskCount }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isWorking, setIsWorking] = useState(() => {
    return localStorage.getItem("sc_session_active") === "true";
  });
  const [startTime, setStartTime] = useState<number | null>(() => {
    const saved = localStorage.getItem("sc_session_start");
    return saved ? parseInt(saved, 10) : null;
  });
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isWorking || !startTime) {
      setElapsed("00:00:00");
      return;
    }

    const timer = setInterval(() => {
      const diff = Date.now() - startTime;
      const hours = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const minutes = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setElapsed(`${hours}:${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [isWorking, startTime]);

  const handleToggleSession = () => {
    if (isWorking) {
      setIsWorking(false);
      setStartTime(null);
      localStorage.removeItem("sc_session_active");
      localStorage.removeItem("sc_session_start");
      showToast.info("Đã kết thúc phiên làm việc hôm nay!");
    } else {
      const now = Date.now();
      setIsWorking(true);
      setStartTime(now);
      localStorage.setItem("sc_session_active", "true");
      localStorage.setItem("sc_session_start", String(now));
      showToast.success("Bắt đầu ngày làm việc mới! Chúc một ngày năng suất!");
    }
  };

  const getDayName = (date: Date) => {
    const days = [
      "Chủ nhật",
      "Thứ hai",
      "Thứ ba",
      "Thứ tư",
      "Thứ năm",
      "Thứ sáu",
      "Thứ bảy",
    ];
    return days[date.getDay()];
  };

  return (
    <div className="bg-primary-bg/80 border border-primary-border/60 rounded-2xl p-5 shadow-sm dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur flex flex-col justify-between h-full hover:shadow-md transition-all duration-300">
      <div className="space-y-4">
        {/* Header Greeting */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-black text-primary-text">Xin chào Nhạn</h2>
            <p className="text-xs text-secondary-text mt-1">Hôm nay là một ngày tuyệt vời để bứt phá doanh số!</p>
          </div>
          <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            <span>FOUNDER MODE</span>
          </div>
        </div>

        {/* Date and Time Display */}
        <div className="grid grid-cols-2 gap-4 bg-secondary-bg/50 p-4 border border-primary-border/50 rounded-xl">
          <div>
            <span className="text-[10px] text-secondary-text block uppercase font-bold">Thời gian hiện tại</span>
            <span className="text-base font-extrabold text-primary-text mt-1 block tracking-wider font-mono">
              {currentTime.toLocaleTimeString("vi-VN")}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-secondary-text block uppercase font-bold">Ngày hôm nay</span>
            <span className="text-xs font-bold text-primary-text mt-1 block">
              {getDayName(currentTime)}, {currentTime.toLocaleDateString("vi-VN")}
            </span>
          </div>
        </div>

        {/* Weather & Summary */}
        <div className="flex items-center gap-3 text-xs text-secondary-text leading-relaxed">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-primary-text">Dự báo thời tiết:</span> 29°C, Hà Nội - Trời nắng nhẹ rải rác, thích hợp cho khách bảo dưỡng xe.
          </div>
        </div>

        {/* Active job count info */}
        <p className="text-xs text-secondary-text">
          Bạn có <strong className="text-indigo-650 dark:text-indigo-400 font-bold">{taskCount}</strong> công việc/mục tiêu chính được thiết lập cho hôm nay.
        </p>
      </div>

      <div className="pt-4 border-t border-primary-border/40 mt-4 flex items-center gap-3">
        <button
          onClick={handleToggleSession}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow ${
            isWorking
              ? "bg-rose-500 hover:bg-rose-600 text-white"
              : "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-650 dark:hover:bg-emerald-600 text-white"
          }`}
        >
          {isWorking ? (
            <>
              <Pause className="w-4 h-4" />
              <span>Dừng làm việc</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Bắt đầu ngày làm việc</span>
            </>
          )}
        </button>

        {isWorking && (
          <div className="px-4 py-2.5 bg-secondary-bg/60 border border-primary-border/40 rounded-xl text-center shrink-0">
            <span className="text-[9px] text-secondary-text block uppercase font-extrabold tracking-wider">Thời gian chạy</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-widest">{elapsed}</span>
          </div>
        )}
      </div>
    </div>
  );
};
