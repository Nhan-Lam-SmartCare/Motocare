import React, { useState, useMemo } from "react";
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  X,
  Upload,
  Video as VideoIcon,
  CheckCircle,
} from "lucide-react";
import { MarketingThumbnail, MarketingVideo } from "../../types/marketing";
import { showToast } from "../../utils/toast";
import {
  useCreateMarketingThumbnail,
  useDeleteMarketingThumbnail,
} from "../../hooks/useMarketingRepository";
import { AiPreviewModal } from "./AiPreviewModal";
import { Sparkles } from "lucide-react";

interface ThumbnailsManagerProps {
  thumbnails: MarketingThumbnail[];
  videos: MarketingVideo[];
}

export const ThumbnailsManager: React.FC<ThumbnailsManagerProps> = ({
  thumbnails = [],
  videos = [],
}) => {
  const [showModal, setShowModal] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const createThumbnailMutation = useCreateMarketingThumbnail();
  const deleteThumbnailMutation = useDeleteMarketingThumbnail();

  const handleConfirmAiThumbnail = (data: any) => {
    const videoObj = videos.find((v) => v.id === formData.videoId);
    const videoTitle = videoObj ? videoObj.title : "";
    setFormData((prev) => ({
      ...prev,
      title: `[AI: ${data.overlayText || "Click ngay"}] ${prev.title || videoTitle || "Mới"}`,
    }));
    showToast.success("Đã ghi nhận gợi ý thiết kế: " + data.overlayText);
  };

  // Form State
  const [formData, setFormData] = useState({
    videoId: "",
    title: "",
    previewData: "",
  });

  const handleOpenAdd = () => {
    setFormData({
      videoId: "",
      title: "",
      previewData: "",
    });
    setShowModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast.error("Vui lòng chọn tệp hình ảnh!");
      return;
    }

    if (file.size > 200 * 1024) {
      showToast.error("Hình ảnh thu nhỏ không được vượt quá 200KB!");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        previewData: reader.result as string,
        title: prev.title || file.name.split(".")[0], // default title
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa hình thu nhỏ này?")) {
      try {
        await deleteThumbnailMutation.mutateAsync(id);
        showToast.success("Xóa hình thu nhỏ thành công!");
      } catch (err: any) {
        showToast.error("Không thể xóa hình thu nhỏ");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.videoId) {
      showToast.error("Vui lòng liên kết hình ảnh với một video!");
      return;
    }
    if (!formData.previewData) {
      showToast.error("Vui lòng chọn hình ảnh để tải lên!");
      return;
    }

    try {
      await createThumbnailMutation.mutateAsync(formData);
      showToast.success("Thêm hình thu nhỏ thành công!");
      setShowModal(false);
    } catch (err: any) {
      showToast.error("Không thể lưu hình thu nhỏ");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Add Action */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Hình thu nhỏ ({thumbnails.length})
        </h3>

        <div className="flex gap-2">
          <button
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-650 hover:bg-purple-750 text-white rounded-lg text-xs font-bold shadow transition-colors"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>AI Thumbnail Advisor</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold shadow transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Thumbnail</span>
          </button>
        </div>
      </div>

      {/* Grid of Thumbnails */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {thumbnails.map((thumb) => {
          const video = videos.find((v) => v.id === thumb.videoId);
          return (
            <div
              key={thumb.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden flex flex-col justify-between group"
            >
              {/* Image Preview */}
              <div className="aspect-video w-full bg-slate-100 dark:bg-slate-900 relative overflow-hidden flex items-center justify-center border-b border-slate-100 dark:border-slate-700">
                {thumb.previewData ? (
                  <img
                    src={thumb.previewData}
                    alt={thumb.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-355" />
                )}
                
                {/* Hover overlay with actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                  <button
                    onClick={() => handleDelete(thumb.id)}
                    className="p-1.5 bg-red-600 hover:bg-red-750 text-white rounded-full transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Title & Info */}
              <div className="p-3 space-y-1">
                <h5 className="font-bold text-xs text-slate-850 dark:text-white truncate">
                  {thumb.title}
                </h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-0.5">
                  <VideoIcon className="w-3 h-3 text-fuchsia-500" />
                  <span>Video: {video ? video.title : "Chưa liên kết"}</span>
                </p>
              </div>
            </div>
          );
        })}

        {thumbnails.length === 0 && (
          <div className="col-span-full bg-slate-50 dark:bg-slate-800/40 p-12 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Không có hình thu nhỏ nào được tải lên.
            </p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full animate-scaleIn border border-slate-100 dark:border-slate-700">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-fuchsia-600" />
                <span>Thêm hình thu nhỏ</span>
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
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Liên kết video <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.videoId}
                    onChange={(e) => setFormData({ ...formData, videoId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    required
                  >
                    <option value="">-- Chọn video được thiết kế hình thu nhỏ --</option>
                    {videos.map((video) => (
                      <option key={video.id} value={video.id}>
                        {video.title}
                      </option>
                    ))}
                  </select>
                </div>
                {formData.videoId && (
                  <button
                    type="button"
                    onClick={() => setAiModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-650 hover:bg-purple-750 text-white rounded-lg text-xs font-bold h-[38px] transition-colors shadow"
                    title="AI gợi ý thiết kế thumbnail dựa trên tiêu đề video"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>AI Gợi ý</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Tên hình thu nhỏ
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ví dụ: Vision Hao Xang Thumb 1"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>

              {/* Upload Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Tải lên tệp ảnh (Hỗ trợ định dạng jpg/png, dung lượng tối đa 200KB)
                </label>
                
                {formData.previewData ? (
                  <div className="relative aspect-video w-full rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center">
                    <img src={formData.previewData} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, previewData: "" })}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-750 transition"
                      title="Gỡ ảnh"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center py-8 px-4 cursor-pointer hover:border-fuchsia-500 transition-colors">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">Chọn tệp hình ảnh để xem trước</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <button
                  type="submit"
                  disabled={createThumbnailMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Tải lên</span>
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
        onConfirm={handleConfirmAiThumbnail}
        feature="thumbnail"
        title="✨ AI Thumbnail Advisor"
        description="AI gợi ý cách thiết kế ảnh bìa (Thumbnail) tối ưu tỷ lệ click: từ tiêu đề phụ họa, cách bố trí chủ thể thợ/máy, đến cách phối tương phản màu."
        variables={{
          videoTitle: videos.find((v) => v.id === formData.videoId)?.title || "Bảo dưỡng xe ga Honda"
        }}
      />
    </div>
  );
};
