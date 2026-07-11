import React, { useState, useMemo } from "react";
import { BookOpen, Plus, Pencil, Trash2, X, Search } from "lucide-react";
import { ProjectResearch, MarketingProject } from "../../types/marketing";
import { showToast } from "../../utils/toast";
import {
  useProjectResearches,
  useCreateProjectResearch,
  useUpdateProjectResearch,
  useDeleteProjectResearch,
  useMarketingProjects,
} from "../../hooks/useMarketingRepository";

export const ResearchManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingResearch, setEditingResearch] = useState<ProjectResearch | null>(null);

  // Queries
  const { data: researches = [], isLoading } = useProjectResearches();
  const { data: projects = [] } = useMarketingProjects();

  // Mutations
  const createMutation = useCreateProjectResearch();
  const updateMutation = useUpdateProjectResearch();
  const deleteMutation = useDeleteProjectResearch();

  // Form State
  const [formData, setFormData] = useState({
    projectId: "",
    title: "",
    content: "",
    linksString: "",
  });

  // Filtered List
  const filteredResearches = useMemo(() => {
    return researches.filter((res) => {
      const matchSearch =
        res.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchProject = selectedProjectId === "" || res.projectId === selectedProjectId;
      return matchSearch && matchProject;
    });
  }, [researches, searchTerm, selectedProjectId]);

  const handleOpenAdd = () => {
    setEditingResearch(null);
    setFormData({
      projectId: projects[0]?.id || "",
      title: "",
      content: "",
      linksString: "",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (res: ProjectResearch) => {
    setEditingResearch(res);
    setFormData({
      projectId: res.projectId,
      title: res.title,
      content: res.content,
      linksString: res.links ? res.links.join("\n") : "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Xóa tài liệu nghiên cứu này?")) {
      try {
        await deleteMutation.mutateAsync(id);
        showToast.success("Xóa nghiên cứu thành công!");
      } catch (err) {
        showToast.error("Không thể xóa");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.title.trim() || !formData.content.trim()) {
      showToast.error("Vui lòng điền đầy đủ tiêu đề, nội dung và liên kết dự án!");
      return;
    }

    const links = formData.linksString
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    try {
      if (editingResearch) {
        await updateMutation.mutateAsync({
          id: editingResearch.id,
          updates: {
            title: formData.title,
            content: formData.content,
            links,
          },
        });
        showToast.success("Cập nhật nghiên cứu thành công!");
      } else {
        await createMutation.mutateAsync({
          projectId: formData.projectId,
          title: formData.title,
          content: formData.content,
          links,
        });
        showToast.success("Đã ghi nhận tài liệu nghiên cứu!");
      }
      setShowModal(false);
    } catch (err) {
      showToast.error("Không thể lưu tài liệu");
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm tài liệu nghiên cứu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto items-center">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs"
          >
            <option value="">Tất cả dự án</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleOpenAdd}
            disabled={projects.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold shadow transition-colors whitespace-nowrap ml-auto md:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm tài liệu</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredResearches.map((res) => {
          const project = projects.find((p) => p.id === res.projectId);
          return (
            <div
              key={res.id}
              className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col justify-between hover:shadow transition-shadow group"
            >
              <div>
                <div className="flex justify-between items-start gap-3 mb-2.5">
                  <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 text-[9.5px] font-bold rounded">
                    DỰ ÁN: {project ? project.name : "Không xác định"}
                  </span>
                  
                  <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(res)}
                      className="p-1 hover:text-blue-500 text-slate-400 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(res.id)}
                      className="p-1 hover:text-red-500 text-slate-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-slate-850 dark:text-white truncate">
                  {res.title}
                </h4>
                <p className="text-xs text-slate-650 dark:text-slate-400 mt-2 whitespace-pre-line leading-relaxed line-clamp-5">
                  {res.content}
                </p>

                {res.links && res.links.length > 0 && (
                  <div className="mt-3.5 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Liên kết hữu ích:</span>
                    {res.links.map((link: string, idx: number) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-fuchsia-400 hover:underline block truncate"
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredResearches.length === 0 && (
          <div className="col-span-full bg-slate-50 dark:bg-slate-800/40 p-12 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Không có tài liệu nghiên cứu nào được ghi nhận.
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full animate-scaleIn border border-slate-100 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-fuchsia-600" />
                <span>{editingResearch ? "Sửa tài liệu nghiên cứu" : "Ghi nhận nghiên cứu mới"}</span>
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
                  Liên kết dự án <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none"
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Tiêu đề nghiên cứu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ví dụ: Đối thủ XYZ đăng video Vision kêu nồi"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Nội dung nghiên cứu / Bài phân tích <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Nhập ghi chú chi tiết về các lỗi kỹ thuật xe, xu hướng nội dung..."
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Danh sách liên kết (Mỗi liên kết một dòng)
                </label>
                <textarea
                  value={formData.linksString}
                  onChange={(e) => setFormData({ ...formData, linksString: e.target.value })}
                  placeholder="https://tiktok.com/...&#10;https://facebook.com/..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none font-mono"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
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
