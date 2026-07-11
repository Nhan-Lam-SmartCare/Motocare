import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  X,
  Target,
  Video as VideoIcon,
  Eye,
  Inbox,
  CheckCircle,
} from "lucide-react";
import { MarketingCampaign, MarketingVideo } from "../../types/marketing";
import { showToast } from "../../utils/toast";
import {
  useCreateMarketingCampaign,
  useUpdateMarketingCampaign,
  useDeleteMarketingCampaign,
} from "../../hooks/useMarketingRepository";
import { AiPreviewModal } from "./AiPreviewModal";
import { Sparkles } from "lucide-react";

interface CampaignsManagerProps {
  campaigns: MarketingCampaign[];
  videos: MarketingVideo[];
}

export const CampaignsManager: React.FC<CampaignsManagerProps> = ({
  campaigns = [],
  videos = [],
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaign | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const createCampaignMutation = useCreateMarketingCampaign();
  const updateCampaignMutation = useUpdateMarketingCampaign();
  const deleteCampaignMutation = useDeleteMarketingCampaign();

  const handleConfirmAiCampaign = (data: any) => {
    setFormData({
      name: `[AI Plan] Chiến dịch bão video ${new Date().getMonth() + 1}`,
      targetMonth: new Date().toISOString().slice(0, 7),
      targetVideos: 20,
      targetViews: 500000,
      targetInboxes: 100,
      description: `Mục tiêu chiến dịch: ${data.campaignGoal}\nThời lượng: ${data.timelineWeeks} tuần\nKPIs đề xuất: ${data.suggestedKpis.join(", ")}`,
    });
    setEditingCampaign(null);
    setShowModal(true);
    showToast.success("Đã nạp kế hoạch chiến dịch gợi ý của AI vào Form!");
  };

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    targetMonth: "",
    targetVideos: 0,
    targetViews: 0,
    targetInboxes: 0,
    description: "",
  });

  // Calculate actual statistics for each campaign based on month
  const campaignsWithProgress = useMemo(() => {
    return campaigns.map((camp) => {
      // Find all videos posted in this campaign's target month (targetMonth format: YYYY-MM)
      const monthlyVideos = videos.filter((video) => {
        const dateStr = video.postingDate || video.created_at;
        return dateStr && dateStr.startsWith(camp.targetMonth);
      });

      const actualVideos = monthlyVideos.length;
      const actualViews = monthlyVideos.reduce((acc, v) => acc + (v.views || 0), 0);
      const actualInboxes = monthlyVideos.reduce((acc, v) => acc + (v.inboxes || 0), 0);

      // Percentage progress (capped at 100 for visual bars, uncapped for text)
      const rawVideoProg = camp.targetVideos > 0 ? Math.round((actualVideos / camp.targetVideos) * 100) : 0;
      const rawViewProg = camp.targetViews > 0 ? Math.round((actualViews / camp.targetViews) * 100) : 0;
      const rawInboxProg = camp.targetInboxes > 0 ? Math.round((actualInboxes / camp.targetInboxes) * 100) : 0;

      return {
        ...camp,
        actualVideos,
        actualViews,
        actualInboxes,
        progress: {
          videos: Math.min(rawVideoProg, 100),
          views: Math.min(rawViewProg, 100),
          inboxes: Math.min(rawInboxProg, 100),
          rawVideos: rawVideoProg,
          rawViews: rawViewProg,
          rawInboxes: rawInboxProg,
        },
      };
    });
  }, [campaigns, videos]);

  const handleOpenAdd = () => {
    setEditingCampaign(null);
    setFormData({
      name: "",
      targetMonth: new Date().toISOString().slice(0, 7), // default current month YYYY-MM
      targetVideos: 30,
      targetViews: 1000000,
      targetInboxes: 50,
      description: "",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (camp: MarketingCampaign) => {
    setEditingCampaign(camp);
    setFormData({
      name: camp.name,
      targetMonth: camp.targetMonth,
      targetVideos: camp.targetVideos,
      targetViews: camp.targetViews,
      targetInboxes: camp.targetInboxes,
      description: camp.description || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc muốn xóa chiến dịch này không?")) {
      try {
        await deleteCampaignMutation.mutateAsync(id);
        showToast.success("Xóa chiến dịch thành công!");
      } catch (err: any) {
        showToast.error("Không thể xóa chiến dịch");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.targetMonth.trim()) {
      showToast.error("Vui lòng nhập tên chiến dịch và tháng mục tiêu!");
      return;
    }

    try {
      if (editingCampaign) {
        await updateCampaignMutation.mutateAsync({
          id: editingCampaign.id,
          updates: formData,
        });
        showToast.success("Cập nhật chiến dịch thành công!");
      } else {
        await createCampaignMutation.mutateAsync(formData);
        showToast.success("Tạo chiến dịch mới thành công!");
      }
      setShowModal(false);
    } catch (err: any) {
      showToast.error("Lỗi khi lưu chiến dịch");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Add Action */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Chiến dịch của cửa hàng
        </h3>

        <div className="flex gap-2">
          <button
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-650 hover:bg-purple-750 text-white rounded-lg text-xs font-bold shadow transition-colors animate-pulse"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>AI Campaign Planner</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold shadow transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm chiến dịch</span>
          </button>
        </div>
      </div>

      {/* Grid of Campaign progress cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaignsWithProgress.map((camp) => (
          <div
            key={camp.id}
            className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4 relative overflow-hidden"
          >
            {/* Top info */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-bold uppercase tracking-wider">
                  Tháng mục tiêu: {camp.targetMonth}
                </span>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {camp.name}
                </h4>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenEdit(camp)}
                  className="p-1 hover:text-blue-500 text-slate-400 transition-colors"
                  title="Sửa mục tiêu"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(camp.id)}
                  className="p-1 hover:text-red-500 text-slate-400 transition-colors"
                  title="Xóa chiến dịch"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {camp.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded border border-slate-100 dark:border-slate-700">
                {camp.description}
              </p>
            )}

            {/* Target Progress bars */}
            <div className="space-y-3.5 pt-2">
              {/* Goal 1: Videos */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1 text-slate-650 dark:text-slate-400">
                    <VideoIcon className="w-3.5 h-3.5 text-fuchsia-500" />
                    <span>Số lượng Video:</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {camp.actualVideos} / {camp.targetVideos} video ({camp.progress.rawVideos}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-fuchsia-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${camp.progress.videos}%` }}
                  />
                </div>
              </div>

              {/* Goal 2: Views */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1 text-slate-650 dark:text-slate-400">
                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                    <span>Mục tiêu lượt xem:</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {(camp.actualViews / 1000000).toFixed(2)}M / {(camp.targetViews / 1000000).toFixed(1)}M ({camp.progress.rawViews}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${camp.progress.views}%` }}
                  />
                </div>
              </div>

              {/* Goal 3: Inbox */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1 text-slate-650 dark:text-slate-400">
                    <Inbox className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Số lượng Inbox:</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {camp.actualInboxes} / {camp.targetInboxes} inbox ({camp.progress.rawInboxes}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${camp.progress.inboxes}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {campaigns.length === 0 && (
          <div className="col-span-full bg-slate-50 dark:bg-slate-800/40 p-12 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Không có chiến dịch mục tiêu nào được lập.
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full animate-scaleIn border border-slate-100 dark:border-slate-700">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-fuchsia-600" />
                <span>{editingCampaign ? "Sửa thông tin chiến dịch" : "Tạo chiến dịch mục tiêu mới"}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Tên chiến dịch <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Chiến dịch bão Video tháng 7"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Tháng mục tiêu (Định dạng YYYY-MM) <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={formData.targetMonth}
                  onChange={(e) => setFormData({ ...formData, targetMonth: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-450 mb-1">
                    Số Video
                  </label>
                  <input
                    type="number"
                    value={formData.targetVideos}
                    onChange={(e) => setFormData({ ...formData, targetVideos: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-650 rounded bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-xs"
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-450 mb-1">
                    Số Lượt Xem
                  </label>
                  <input
                    type="number"
                    value={formData.targetViews}
                    onChange={(e) => setFormData({ ...formData, targetViews: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-650 rounded bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-xs"
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-450 mb-1">
                    Số Inbox
                  </label>
                  <input
                    type="number"
                    value={formData.targetInboxes}
                    onChange={(e) => setFormData({ ...formData, targetInboxes: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-650 rounded bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-xs"
                    min={0}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Mô tả chiến dịch
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ghi chú chi tiết chiến dịch truyền thông..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <button
                  type="submit"
                  disabled={createCampaignMutation.isPending || updateCampaignMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Xác nhận</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* AI Preview Modal */}
      <AiPreviewModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onConfirm={handleConfirmAiCampaign}
        feature="campaign_planner"
        title="✨ AI Campaign Planner"
        description="AI tự lập kế hoạch chiến dịch truyền thông: đưa ra mục tiêu, đề xuất KPIs chuyển đổi thực tế."
        variables={{ campaignName: "Chiến dịch Tri ân Khách hàng mùa mưa 2026" }}
      />
    </div>
  );
};
