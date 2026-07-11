import React, { useState, useMemo } from "react";
import { History, Plus, Trash2, X, Copy, Play } from "lucide-react";
import { MediaVersion, MarketingVideo } from "../../types/marketing";
import { showToast } from "../../utils/toast";
import {
  useMediaVersions,
  useCreateMediaVersion,
  useDeleteMediaVersion,
  useMarketingVideos,
} from "../../hooks/useMarketingRepository";

export const VersionsManager: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState("");

  const { data: versions = [], isLoading } = useMediaVersions();
  const { data: videos = [] } = useMarketingVideos();

  const createMutation = useCreateMediaVersion();
  const deleteMutation = useDeleteMediaVersion();

  // Form State
  const [formData, setFormData] = useState({
    videoId: "",
    versionNumber: 1,
    filePath: "",
    notes: "",
  });

  const filteredVersions = useMemo(() => {
    if (!selectedVideoId) return versions;
    return versions.filter((v) => v.videoId === selectedVideoId);
  }, [versions, selectedVideoId]);

  const handleOpenAdd = () => {
    const defaultVid = videos[0]?.id || "";
    const currentMax = versions.filter((v) => v.videoId === defaultVid).length;
    setFormData({
      videoId: defaultVid,
      versionNumber: currentMax + 1,
      filePath: "D:\\NL SmartCare Media\\2026\\07\\Vision\\",
      notes: "",
    });
    setShowModal(true);
  };

  const handleVideoSelectChange = (videoId: string) => {
    const currentMax = versions.filter((v) => v.videoId === videoId).length;
    setFormData((prev) => ({
      ...prev,
      videoId,
      versionNumber: currentMax + 1,
    }));
  };

  const handleDelete = async (id: string) => {
    if (confirm("Xóa lịch sử phiên bản này?")) {
      try {
        await deleteMutation.mutateAsync(id);
        showToast.success("Xóa phiên bản thành công!");
      } catch (err) {
        showToast.error("Không thể xóa");
      }
    }
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    showToast.success(`Đã sao chép đường dẫn: ${path}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.videoId || !formData.filePath.trim()) {
      showToast.error("Vui lòng điền đầy đủ video và đường dẫn tệp!");
      return;
    }

    try {
      await createMutation.mutateAsync(formData);
      showToast.success("Thêm phiên bản mới thành công!");
      setShowModal(false);
    } catch (err) {
      showToast.error("Lỗi khi thêm phiên bản");
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Lịch sử phiên bản dựng video
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Theo dõi quá trình sửa đổi bản nháp video từ lúc dựng thô đến khi xuất bản thành phẩm.
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto items-center">
          <select
            value={selectedVideoId}
            onChange={(e) => setSelectedVideoId(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-850 dark:text-white text-xs w-full sm:w-48"
          >
            <option value="">Tất cả video</option>
            {videos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>

          <button
            onClick={handleOpenAdd}
            disabled={videos.length === 0}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold shadow transition-colors whitespace-nowrap ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm phiên bản</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-750 text-slate-655 dark:text-slate-300 font-semibold text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Tên video</th>
                <th className="px-6 py-3">Phiên bản</th>
                <th className="px-6 py-3">Đường dẫn tệp local</th>
                <th className="px-6 py-3">Ghi chú sửa đổi</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-700">
              {filteredVersions.map((ver) => {
                const video = videos.find((v) => v.id === ver.videoId);
                return (
                  <tr key={ver.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">
                      {video ? video.title : "Không xác định"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10.5px] font-extrabold text-slate-700 dark:text-slate-300">
                        v{ver.versionNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 max-w-sm">
                        <span className="font-mono text-[10.5px] select-all truncate text-slate-600 dark:text-slate-400">
                          {ver.filePath}
                        </span>
                        <button
                          onClick={() => handleCopyPath(ver.filePath)}
                          className="text-slate-400 hover:text-blue-500 transition-colors"
                          title="Sao chép đường dẫn"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-650 dark:text-slate-450 italic">
                      {ver.notes || "Không ghi chú"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(ver.id)}
                        className="text-red-500 hover:text-red-650"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {versions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400 text-xs">
                    Chưa lưu phiên bản media nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Version Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full animate-scaleIn border border-slate-100 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-fuchsia-600" />
                <span>Ghi nhận phiên bản chỉnh sửa</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Chọn video gốc <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.videoId}
                  onChange={(e) => handleVideoSelectChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none"
                  required
                >
                  {videos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Số phiên bản (vX) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.versionNumber}
                    onChange={(e) => setFormData({ ...formData, versionNumber: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none"
                    min={1}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Đường dẫn tệp cục bộ (Local File Path) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.filePath}
                  onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
                  placeholder="Ví dụ: D:\NL SmartCare Media\2026\07\Vision\Vision_v2.mp4"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Ghi chú nội dung chỉnh sửa (Feedback)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ví dụ: Sửa lại nhạc nền, cắt bớt 2s đầu..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Xác nhận</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-200"
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
