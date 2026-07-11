import React, { useMemo } from "react";
import { Video, Trash2, CheckCircle2, Circle } from "lucide-react";
import { ShotListItem, MarketingProject } from "../../types/marketing";
import { showToast } from "../../utils/toast";
import {
  useShotLists,
  useUpdateShotList,
  useDeleteShotList,
  useMarketingProjects,
} from "../../hooks/useMarketingRepository";

export const ShotListManager: React.FC = () => {
  const { data: shotLists = [], isLoading } = useShotLists();
  const { data: projects = [] } = useMarketingProjects();

  const updateMutation = useUpdateShotList();
  const deleteMutation = useDeleteShotList();

  // Group shotlists by project
  const groupedShotLists = useMemo(() => {
    const map = new Map<string, ShotListItem[]>();
    shotLists.forEach((shot) => {
      const existing = map.get(shot.projectId) || [];
      existing.push(shot);
      map.set(shot.projectId, existing);
    });
    return map;
  }, [shotLists]);

  const handleToggle = async (shot: ShotListItem) => {
    try {
      await updateMutation.mutateAsync({
        id: shot.id,
        updates: { status: shot.status === "pending" ? "completed" : "pending" },
      });
      showToast.success("Đã cập nhật trạng thái quay!");
    } catch (err) {
      showToast.error("Lỗi cập nhật trạng thái");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Xóa cảnh quay này khỏi Shot List?")) {
      try {
        await deleteMutation.mutateAsync(id);
        showToast.success("Xóa shot thành công!");
      } catch (err) {
        showToast.error("Không thể xóa");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Danh sách cảnh quay toàn hệ thống
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Xem và kiểm tra tiến độ quay các shot cảnh của từng dự án content.
        </p>
      </div>

      <div className="space-y-6">
        {projects.map((project) => {
          const projectShots = groupedShotLists.get(project.id) || [];
          if (projectShots.length === 0) return null;

          return (
            <div
              key={project.id}
              className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Dự án: <span className="text-fuchsia-400">{project.name}</span> ({projectShots.length} cảnh)
              </h4>

              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {projectShots.map((shot, idx) => (
                  <div
                    key={shot.id}
                    className="py-3 flex justify-between items-center text-xs hover:bg-slate-50 dark:hover:bg-slate-800/10 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggle(shot)}
                        className="text-slate-400 hover:text-fuchsia-500 transition-colors"
                      >
                        {shot.status === "completed" ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>
                      <span
                        className={`font-semibold ${
                          shot.status === "completed"
                            ? "line-through text-slate-500"
                            : "text-slate-850 dark:text-slate-200"
                        }`}
                      >
                        Cảnh {idx + 1}: {shot.description}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded text-[10px]">
                        {shot.duration} giây
                      </span>
                      <button
                        onClick={() => handleDelete(shot.id)}
                        className="p-1 hover:text-red-500 text-slate-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {shotLists.length === 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/40 p-12 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            <Video className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Không có cảnh quay nào được thiết kế. Hãy vào từng Content Project để lập Shot List.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
