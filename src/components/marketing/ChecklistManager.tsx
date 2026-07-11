import React, { useMemo } from "react";
import { ClipboardList, Trash2, CheckSquare, Square } from "lucide-react";
import { ShootingChecklistItem, MarketingProject } from "../../types/marketing";
import { showToast } from "../../utils/toast";
import {
  useShootingChecklists,
  useUpdateShootingChecklist,
  useDeleteShootingChecklist,
  useMarketingProjects,
} from "../../hooks/useMarketingRepository";

export const ChecklistManager: React.FC = () => {
  const { data: checklists = [], isLoading } = useShootingChecklists();
  const { data: projects = [] } = useMarketingProjects();

  const updateMutation = useUpdateShootingChecklist();
  const deleteMutation = useDeleteShootingChecklist();

  // Group checklists by project
  const groupedChecklists = useMemo(() => {
    const map = new Map<string, ShootingChecklistItem[]>();
    checklists.forEach((item) => {
      const existing = map.get(item.projectId) || [];
      existing.push(item);
      map.set(item.projectId, existing);
    });
    return map;
  }, [checklists]);

  const handleToggle = async (item: ShootingChecklistItem) => {
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        updates: { isChecked: !item.isChecked },
      });
      showToast.success("Đã cập nhật checklist!");
    } catch (err) {
      showToast.error("Lỗi cập nhật checklist");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Xóa hạng mục chuẩn bị này?")) {
      try {
        await deleteMutation.mutateAsync(id);
        showToast.success("Xóa checklist thành công!");
      } catch (err) {
        showToast.error("Không thể xóa");
      }
    }
  };

  const getCategoryLabel = (cat?: string) => {
    const labels: Record<string, string> = {
      equipment: "Thiết bị",
      props: "Đạo cụ",
      location: "Bối cảnh",
      personnel: "Nhân lực",
    };
    return labels[cat || ""] || "Khác";
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Checklist chuẩn bị quay toàn hệ thống
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Xem và kiểm tra công tác chuẩn bị thiết bị quay, đạo cụ và nhân sự cho từng dự án content.
        </p>
      </div>

      <div className="space-y-6">
        {projects.map((project) => {
          const projectItems = groupedChecklists.get(project.id) || [];
          if (projectItems.length === 0) return null;

          return (
            <div
              key={project.id}
              className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Dự án: <span className="text-fuchsia-400">{project.name}</span> ({projectItems.length} hạng mục)
              </h4>

              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {projectItems.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex justify-between items-center text-xs hover:bg-slate-50 dark:hover:bg-slate-800/10 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggle(item)}
                        className="text-slate-400 hover:text-fuchsia-500 transition-colors"
                      >
                        {item.isChecked ? (
                          <CheckSquare className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                      <span
                        className={`font-semibold ${
                          item.isChecked
                            ? "line-through text-slate-500"
                            : "text-slate-850 dark:text-slate-200"
                        }`}
                      >
                        [{getCategoryLabel(item.category)}] {item.itemName}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 hover:text-red-500 text-slate-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {checklists.length === 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/40 p-12 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Không có checklist nào được thiết kế. Hãy vào từng Content Project để lập checklist.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
