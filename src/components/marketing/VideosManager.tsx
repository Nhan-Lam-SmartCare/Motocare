import React, { useState, useMemo } from "react";
import {
  Video as VideoIcon,
  Search,
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  Play,
  Copy,
  ExternalLink,
  X,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { MarketingVideo, MarketingScript } from "../../types/marketing";
import { formatCurrency, formatDate } from "../../utils/format";
import { showToast } from "../../utils/toast";
import {
  useCreateMarketingVideo,
  useUpdateMarketingVideo,
  useDeleteMarketingVideo,
} from "../../hooks/useMarketingRepository";

interface VideosManagerProps {
  videos: MarketingVideo[];
  scripts: MarketingScript[];
  hideMetrics?: boolean;
}

export const VideosManager: React.FC<VideosManagerProps> = ({
  videos = [],
  scripts = [],
  hideMetrics = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<MarketingVideo | null>(null);

  // Mutations
  const createVideoMutation = useCreateMarketingVideo();
  const updateVideoMutation = useUpdateMarketingVideo();
  const deleteVideoMutation = useDeleteMarketingVideo();

  // Form State
  const [formData, setFormData] = useState({
    scriptId: "",
    title: "",
    localPath: "",
    thumbnail: "",
    filmingDate: "",
    editingDate: "",
    postingDate: "",
    tiktokLink: "",
    facebookLink: "",
    youtubeLink: "",
    views: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    inboxes: 0,
    visitors: 0,
    revenue: 0,
  });

  // Filters
  const filteredVideos = useMemo(() => {
    return videos.filter((video) =>
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.localPath.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [videos, searchTerm]);

  // Copy local path
  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    showToast.success(`Đã sao chép đường dẫn: ${path}`);
  };

  // Open Folder (Copy Folder path)
  const handleOpenFolder = (path: string) => {
    const parts = path.split("\\");
    parts.pop(); // Remove file name
    const folderPath = parts.join("\\");
    navigator.clipboard.writeText(folderPath);
    showToast.success(`Đã sao chép đường dẫn thư mục: ${folderPath}`);
  };

  // Open Video (Copy video path & inform)
  const handleOpenVideo = (path: string) => {
    navigator.clipboard.writeText(path);
    showToast.info(`Đã sao chép đường dẫn video. Dán vào File Explorer để mở: ${path}`);
  };

  const handleOpenAdd = () => {
    setEditingVideo(null);
    setFormData({
      scriptId: "",
      title: "",
      localPath: "D:\\NL SmartCare Media\\2026\\07\\Vision\\",
      thumbnail: "",
      filmingDate: new Date().toISOString().split("T")[0],
      editingDate: "",
      postingDate: "",
      tiktokLink: "",
      facebookLink: "",
      youtubeLink: "",
      views: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      inboxes: 0,
      visitors: 0,
      revenue: 0,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (video: MarketingVideo) => {
    setEditingVideo(video);
    setFormData({
      scriptId: video.scriptId || "",
      title: video.title,
      localPath: video.localPath,
      thumbnail: video.thumbnail || "",
      filmingDate: video.filmingDate ? video.filmingDate.split("T")[0] : "",
      editingDate: video.editingDate ? video.editingDate.split("T")[0] : "",
      postingDate: video.postingDate ? video.postingDate.split("T")[0] : "",
      tiktokLink: video.tiktokLink || "",
      facebookLink: video.facebookLink || "",
      youtubeLink: video.youtubeLink || "",
      views: video.views,
      comments: video.comments,
      shares: video.shares,
      saves: video.saves,
      inboxes: video.inboxes,
      visitors: video.visitors,
      revenue: video.revenue,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa video này?")) {
      try {
        await deleteVideoMutation.mutateAsync(id);
        showToast.success("Xóa video thành công!");
      } catch (err: any) {
        showToast.error("Không thể xóa video");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.localPath.trim()) {
      showToast.error("Vui lòng nhập tên video và đường dẫn local!");
      return;
    }

    try {
      const payload = {
        ...formData,
        scriptId: formData.scriptId || undefined,
        filmingDate: formData.filmingDate ? new Date(formData.filmingDate).toISOString() : undefined,
        editingDate: formData.editingDate ? new Date(formData.editingDate).toISOString() : undefined,
        postingDate: formData.postingDate ? new Date(formData.postingDate).toISOString() : undefined,
      };

      if (editingVideo) {
        await updateVideoMutation.mutateAsync({
          id: editingVideo.id,
          updates: payload,
        });
        showToast.success("Cập nhật video thành công!");
      } else {
        await createVideoMutation.mutateAsync(payload);
        showToast.success("Thêm video thành công!");
      }
      setShowModal(false);
    } catch (err: any) {
      showToast.error("Không thể lưu video");
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Action */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm video theo tên, đường dẫn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm"
          />
        </div>

        <button
          onClick={handleOpenAdd}
          className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm video metadata</span>
        </button>
      </div>

      {/* Videos List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Tên video / Đường dẫn local</th>
                <th className="px-6 py-3">Thời gian (Quay / Dựng / Đăng)</th>
                {!hideMetrics && (
                  <>
                    <th className="px-6 py-3">Lượt Xem / Bình Luận</th>
                    <th className="px-6 py-3">Inbox / Khách đến</th>
                    <th className="px-6 py-3">Doanh thu</th>
                  </>
                )}
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredVideos.map((video) => (
                <tr
                  key={video.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-950/20 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-400 mt-0.5">
                        <VideoIcon className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5 max-w-md">
                        <div className="font-bold text-slate-850 dark:text-white">
                          {video.title}
                        </div>
                        <div className="text-[10.5px] text-slate-450 dark:text-slate-400 font-mono select-all truncate">
                          {video.localPath}
                        </div>
                        <div className="flex gap-2.5 mt-2">
                          <button
                            onClick={() => handleCopyPath(video.localPath)}
                            className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline dark:text-blue-400 font-semibold"
                          >
                            <Copy className="w-3 h-3" /> Sao chép đường dẫn
                          </button>
                          <button
                            onClick={() => handleOpenFolder(video.localPath)}
                            className="inline-flex items-center gap-1 text-[10px] text-teal-600 hover:underline dark:text-teal-400 font-semibold"
                          >
                            <FolderOpen className="w-3 h-3" /> Mở thư mục
                          </button>
                          <button
                            onClick={() => handleOpenVideo(video.localPath)}
                            className="inline-flex items-center gap-1 text-[10px] text-purple-600 hover:underline dark:text-purple-400 font-semibold"
                          >
                            <Play className="w-3 h-3" /> Mở video
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 space-y-1">
                    {video.filmingDate && (
                      <div className="text-xs text-slate-650 dark:text-slate-355">
                        Quay: <span className="font-medium">{formatDate(video.filmingDate)}</span>
                      </div>
                    )}
                    {video.editingDate && (
                      <div className="text-xs text-slate-650 dark:text-slate-355">
                        Dựng: <span className="font-medium">{formatDate(video.editingDate)}</span>
                      </div>
                    )}
                    {video.postingDate && (
                      <div className="text-xs text-slate-650 dark:text-slate-355">
                        Đăng: <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatDate(video.postingDate)}</span>
                      </div>
                    )}
                  </td>
                  {!hideMetrics && (
                    <>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {video.views.toLocaleString()} xem
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {video.comments.toLocaleString()} bình luận
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {video.inboxes.toLocaleString()} Inbox
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {video.visitors.toLocaleString()} khách đến
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(video.revenue)}
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => handleOpenEdit(video)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(video.id)}
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredVideos.length === 0 && (
                <tr>
                  <td
                    colSpan={hideMetrics ? 3 : 6}
                    className="px-6 py-10 text-center text-slate-500 dark:text-slate-400"
                  >
                    Chưa có video metadata nào được lưu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Video Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn border border-slate-100 dark:border-slate-700">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <VideoIcon className="w-5 h-5 text-fuchsia-600" />
                <span>{editingVideo ? "Chỉnh sửa video metadata" : "Thêm video metadata mới"}</span>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Liên kết kịch bản
                  </label>
                  <select
                    value={formData.scriptId}
                    onChange={(e) => setFormData({ ...formData, scriptId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  >
                    <option value="">-- Chọn kịch bản (không bắt buộc) --</option>
                    {scripts.map((s) => (
                      <option key={s.id} value={s.id}>
                        [Kịch bản {s.duration}s] - {s.hook?.slice(0, 40)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Tên video <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ví dụ: Vision Hao Xang Part 1"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Đường dẫn tệp cục bộ (Local Path) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.localPath}
                  onChange={(e) => setFormData({ ...formData, localPath: e.target.value })}
                  placeholder="Ví dụ: D:\NL SmartCare Media\2026\07\Vision\Vision_HaoXang_001.mp4"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Ngày quay
                  </label>
                  <input
                    type="date"
                    value={formData.filmingDate}
                    onChange={(e) => setFormData({ ...formData, filmingDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Ngày dựng
                  </label>
                  <input
                    type="date"
                    value={formData.editingDate}
                    onChange={(e) => setFormData({ ...formData, editingDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Ngày đăng
                  </label>
                  <input
                    type="date"
                    value={formData.postingDate}
                    onChange={(e) => setFormData({ ...formData, postingDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Link TikTok
                  </label>
                  <input
                    type="text"
                    value={formData.tiktokLink}
                    onChange={(e) => setFormData({ ...formData, tiktokLink: e.target.value })}
                    placeholder="https://tiktok.com/..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Link Facebook
                  </label>
                  <input
                    type="text"
                    value={formData.facebookLink}
                    onChange={(e) => setFormData({ ...formData, facebookLink: e.target.value })}
                    placeholder="https://facebook.com/..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Link YouTube
                  </label>
                  <input
                    type="text"
                    value={formData.youtubeLink}
                    onChange={(e) => setFormData({ ...formData, youtubeLink: e.target.value })}
                    placeholder="https://youtube.com/..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>
            </div>

            {/* Performance Metrics Inputs */}
            {!hideMetrics && (
              <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-fuchsia-600" />
                  <span>Chỉ số hiệu quả truyền thông & chuyển đổi</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-450 mb-0.5">
                      Lượt xem (Views)
                    </label>
                    <input
                      type="number"
                      value={formData.views}
                      onChange={(e) => setFormData({ ...formData, views: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-655 rounded bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-xs"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-450 mb-0.5">
                      Bình luận
                    </label>
                    <input
                      type="number"
                      value={formData.comments}
                      onChange={(e) => setFormData({ ...formData, comments: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-655 rounded bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-xs"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-450 mb-0.5">
                      Chia sẻ
                    </label>
                    <input
                      type="number"
                      value={formData.shares}
                      onChange={(e) => setFormData({ ...formData, shares: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-655 rounded bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-xs"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-450 mb-0.5">
                      Lượt lưu
                    </label>
                    <input
                      type="number"
                      value={formData.saves}
                      onChange={(e) => setFormData({ ...formData, saves: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-655 rounded bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-xs"
                      min={0}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-600/50">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-455 mb-0.5">
                      Số Inbox mới
                    </label>
                    <input
                      type="number"
                      value={formData.inboxes}
                      onChange={(e) => setFormData({ ...formData, inboxes: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-655 rounded bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-xs"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-455 mb-0.5">
                      Khách tới cửa hàng
                    </label>
                    <input
                      type="number"
                      value={formData.visitors}
                      onChange={(e) => setFormData({ ...formData, visitors: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-655 rounded bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-xs"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-455 mb-0.5">
                      Doanh thu đem lại
                    </label>
                    <input
                      type="number"
                      value={formData.revenue}
                      onChange={(e) => setFormData({ ...formData, revenue: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-655 rounded bg-white dark:bg-slate-750 text-slate-900 dark:text-white text-xs"
                      min={0}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
              <button
                type="submit"
                disabled={createVideoMutation.isPending || updateVideoMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{editingVideo ? "Lưu thay đổi" : "Tạo video metadata"}</span>
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
    </div>
  );
};
