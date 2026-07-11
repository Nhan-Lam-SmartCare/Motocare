import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Video as VideoIcon,
  CheckCircle,
} from "lucide-react";
import {
  MarketingCalendarEvent,
  MarketingVideo,
} from "../../types/marketing";
import { formatDate } from "../../utils/format";
import { showToast } from "../../utils/toast";
import {
  useCreateMarketingCalendarEvent,
  useUpdateMarketingCalendarEvent,
  useDeleteMarketingCalendarEvent,
} from "../../hooks/useMarketingRepository";
import { AiPreviewModal } from "./AiPreviewModal";
import { Sparkles } from "lucide-react";

interface CalendarManagerProps {
  events: MarketingCalendarEvent[];
  videos: MarketingVideo[];
}

export const CalendarManager: React.FC<CalendarManagerProps> = ({
  events = [],
  videos = [],
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<MarketingCalendarEvent[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const createEventMutation = useCreateMarketingCalendarEvent();
  const deleteEventMutation = useDeleteMarketingCalendarEvent();

  const handleConfirmAiBestTime = (data: any) => {
    showToast.success("AI đề xuất giờ vàng: " + data.suggestedTime);
    alert(`💡 Gợi ý khung giờ đăng từ SmartCare AI:\n\n- Giờ vàng: ${data.suggestedTime}\n- Các ngày đề xuất: ${data.suggestedDays.join(", ")}\n- Lý giải: ${data.reasoning}`);
  };

  // Form State
  const [formData, setFormData] = useState<{
    videoId: string;
    platforms: string[];
    status: "scheduled" | "posted" | "missed";
  }>({
    videoId: "",
    platforms: ["TikTok"],
    status: "scheduled",
  });

  // Calculate year, month, and calendar days
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthName = currentDate.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });

  // Days in current month
  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  // First day offset (0 = Sunday, 1 = Monday, etc.)
  const firstDayOffset = useMemo(() => {
    return new Date(year, month, 1).getDay();
  }, [year, month]);

  const daysArray = useMemo(() => {
    const arr = [];
    // Pad previous month days
    for (let i = 0; i < firstDayOffset; i++) {
      arr.push(null);
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push(d);
    }
    return arr;
  }, [daysInMonth, firstDayOffset]);

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  // Group events by date string (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, MarketingCalendarEvent[]>();
    events.forEach((event) => {
      const dateKey = event.scheduledDate.slice(0, 10);
      const existing = map.get(dateKey) || [];
      existing.push(event);
      map.set(dateKey, existing);
    });
    return map;
  }, [events]);

  const handleDayClick = (day: number) => {
    const formattedDay = day < 10 ? `0${day}` : day;
    const formattedMonth = (month + 1) < 10 ? `0${month + 1}` : month + 1;
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

    const dayEvents = eventsByDate.get(dateStr) || [];
    setSelectedDayEvents(dayEvents);
    setSelectedDateStr(dateStr);
    setShowAddForm(false);
    setShowModal(true);
  };

  const handlePlatformToggle = (platform: string) => {
    setFormData((prev) => {
      const exists = prev.platforms.includes(platform);
      return {
        ...prev,
        platforms: exists
          ? prev.platforms.filter((p) => p !== platform)
          : [...prev.platforms, platform],
      };
    });
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.videoId) {
      showToast.error("Vui lòng chọn video để lập lịch!");
      return;
    }
    if (formData.platforms.length === 0) {
      showToast.error("Vui lòng chọn ít nhất một nền tảng đăng bài!");
      return;
    }

    try {
      const created = await createEventMutation.mutateAsync({
        videoId: formData.videoId,
        scheduledDate: new Date(`${selectedDateStr}T10:00:00Z`).toISOString(), // default 10:00 AM UTC
        platforms: formData.platforms,
        status: formData.status,
      });

      showToast.success("Lên lịch đăng video thành công!");
      // Update local view list immediately
      const updatedEvents = [...selectedDayEvents, created];
      setSelectedDayEvents(updatedEvents);
      setShowAddForm(false);
      setFormData({
        videoId: "",
        platforms: ["TikTok"],
        status: "scheduled",
      });
    } catch (err: any) {
      showToast.error("Không thể lưu lịch đăng");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (confirm("Xóa lịch đăng này?")) {
      try {
        await deleteEventMutation.mutateAsync(id);
        showToast.success("Xóa lịch đăng thành công!");
        setSelectedDayEvents((prev) => prev.filter((ev) => ev.id !== id));
      } catch (err: any) {
        showToast.error("Lỗi khi xóa lịch đăng");
      }
    }
  };

  const getPlatformColors = (platform: string) => {
    const colors: Record<string, string> = {
      TikTok: "bg-fuchsia-500 text-white",
      Facebook: "bg-blue-600 text-white",
      YouTube: "bg-red-600 text-white",
    };
    return colors[platform] || "bg-slate-500 text-white";
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
        <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-2 capitalize">
          <CalendarIcon className="w-5 h-5 text-fuchsia-600" />
          <span>{monthName}</span>
        </h3>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-650 hover:bg-purple-750 text-white rounded-lg text-xs font-bold shadow transition-colors animate-pulse"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>AI Suggest Best Time</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekdays names */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
        <div>Chủ Nhật</div>
        <div>Thứ 2</div>
        <div>Thứ 3</div>
        <div>Thứ 4</div>
        <div>Thứ 5</div>
        <div>Thứ 6</div>
        <div>Thứ 7</div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-2">
        {daysArray.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square bg-slate-50/20 dark:bg-slate-800/10 rounded-xl" />;
          }

          const formattedDay = day < 10 ? `0${day}` : day;
          const formattedMonth = (month + 1) < 10 ? `0${month + 1}` : month + 1;
          const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

          const dayEvents = eventsByDate.get(dateStr) || [];

          return (
            <button
              key={`day-${day}`}
              onClick={() => handleDayClick(day)}
              className="aspect-square bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-fuchsia-500/40 text-left flex flex-col justify-between hover:shadow transition group relative"
            >
              <span className="font-bold text-xs text-slate-700 dark:text-slate-350 group-hover:text-fuchsia-500">
                {day}
              </span>
              
              {/* Event indicators */}
              <div className="flex flex-col gap-1 w-full overflow-hidden">
                {dayEvents.slice(0, 2).map((ev) => {
                  const video = videos.find((v) => v.id === ev.videoId);
                  return (
                    <div
                      key={ev.id}
                      className="text-[9px] px-1 py-0.5 rounded bg-fuchsia-50 dark:bg-fuchsia-950/20 border border-fuchsia-100/50 dark:border-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400 font-medium truncate"
                      title={video ? video.title : "Đăng bài"}
                    >
                      {video ? video.title : "Đăng bài"}
                    </div>
                  );
                })}
                {dayEvents.length > 2 && (
                  <div className="text-[8px] text-slate-400 dark:text-slate-500 font-medium text-center">
                    +{dayEvents.length - 2} bài khác
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Events Detail & Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full animate-scaleIn border border-slate-100 dark:border-slate-700">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Lịch đăng ngày: {formatDate(selectedDateStr)}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Event list */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Danh sách bài đăng ({selectedDayEvents.length})
                </h4>

                {selectedDayEvents.map((ev) => {
                  const video = videos.find((v) => v.id === ev.videoId);
                  return (
                    <div
                      key={ev.id}
                      className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700 rounded-xl flex justify-between items-center"
                    >
                      <div className="space-y-1 flex-1 pr-3">
                        <div className="text-xs font-bold text-slate-800 dark:text-white">
                          {video ? video.title : "Video không tìm thấy"}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {ev.platforms.map((p) => (
                            <span
                              key={p}
                              className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${getPlatformColors(p)}`}
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded transition"
                        title="Xóa lịch đăng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

                {selectedDayEvents.length === 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    Chưa lên lịch đăng video nào cho ngày này.
                  </p>
                )}
              </div>

              {/* Add form toggle */}
              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-fuchsia-500 text-slate-500 dark:text-slate-400 hover:text-fuchsia-600 rounded-xl text-xs font-semibold transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm lịch đăng video</span>
                </button>
              ) : (
                <form onSubmit={handleAddEvent} className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-450 mb-1">
                      Chọn video đăng bài <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.videoId}
                      onChange={(e) => setFormData({ ...formData, videoId: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-350 dark:border-slate-650 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-fuchsia-500"
                      required
                    >
                      <option value="">-- Chọn video --</option>
                      {videos.map((video) => (
                        <option key={video.id} value={video.id}>
                          {video.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-450 mb-1">
                      Chọn nền tảng đăng
                    </label>
                    <div className="flex gap-2">
                      {["TikTok", "Facebook", "YouTube"].map((platform) => {
                        const active = formData.platforms.includes(platform);
                        return (
                          <button
                            key={platform}
                            type="button"
                            onClick={() => handlePlatformToggle(platform)}
                            className={`flex-1 py-1 rounded text-[10px] font-bold transition ${
                              active
                                ? getPlatformColors(platform)
                                : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {platform}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="submit"
                      disabled={createEventMutation.isPending}
                      className="flex-1 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded text-xs font-semibold transition"
                    >
                      Xác nhận
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-355 rounded text-xs"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      {/* AI Preview Modal */}
      <AiPreviewModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onConfirm={handleConfirmAiBestTime}
        feature="best_time"
        title="✨ AI Suggest Best Time"
        description="AI đề xuất khung giờ vàng và ngày đăng bài tối ưu độ tiếp cận dựa trên thống kê hành vi ngành sửa xe."
        variables={{ videoTitle: "Bảo dưỡng nồi Honda Vision lì máy hao xăng" }}
      />
    </div>
  );
};
