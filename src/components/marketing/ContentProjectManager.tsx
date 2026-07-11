import React, { useState, useMemo } from "react";
import {
  Folder,
  Plus,
  Pencil,
  Trash2,
  X,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  Lightbulb,
  FileText,
  Video as VideoIcon,
  Image as ImageIcon,
  MessageSquare,
  Tag,
  Target,
  Calendar as CalendarIcon,
  Tv,
  Facebook,
  Youtube,
  Globe,
  BarChart3,
  BookOpen,
  ClipboardList,
  History,
  TrendingUp,
  Award,
  Eye,
  Inbox,
  DollarSign,
  Copy,
  FolderOpen,
  Play,
} from "lucide-react";
import {
  MarketingProject,
  MarketingIdea,
  MarketingScript,
  MarketingVideo,
  MarketingThumbnail,
  MarketingCaption,
  MarketingHashtag,
  MarketingCalendarEvent,
  ContentProjectExtension,
  ProjectResearch,
  ShotListItem,
  ShootingChecklistItem,
  MediaVersion,
} from "../../types/marketing";
import { showToast } from "../../utils/toast";
import { formatCurrency, formatDate } from "../../utils/format";
import { AiPreviewModal } from "./AiPreviewModal";
import { Sparkles } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  useMarketingProjects,
  useCreateMarketingProject,
  useUpdateMarketingProject,
  useDeleteMarketingProject,
  useProjectExtensions,
  useUpdateProjectExtension,
  useMarketingIdeas,
  useCreateMarketingIdea,
  useUpdateMarketingIdea,
  useDeleteMarketingIdea,
  useMarketingScripts,
  useCreateMarketingScript,
  useUpdateMarketingScript,
  useDeleteMarketingScript,
  useMarketingVideos,
  useCreateMarketingVideo,
  useUpdateMarketingVideo,
  useDeleteMarketingVideo,
  useMarketingThumbnails,
  useCreateMarketingThumbnail,
  useDeleteMarketingThumbnail,
  useMarketingCaptions,
  useMarketingHashtags,
  useMarketingCalendarEvents,
  useProjectResearches,
  useCreateProjectResearch,
  useUpdateProjectResearch,
  useDeleteProjectResearch,
  useShotLists,
  useCreateShotList,
  useUpdateShotList,
  useDeleteShotList,
  useShootingChecklists,
  useCreateShootingChecklist,
  useUpdateShootingChecklist,
  useDeleteShootingChecklist,
  useMediaVersions,
  useCreateMediaVersion,
  useDeleteMediaVersion,
} from "../../hooks/useMarketingRepository";

const WORKFLOW_STAGES = [
  { key: "ideas", label: "Ý tưởng", color: "border-slate-400 bg-slate-900/30" },
  { key: "research", label: "Nghiên cứu", color: "border-indigo-400 bg-indigo-950/10" },
  { key: "scripting", label: "Viết Script", color: "border-blue-400 bg-blue-950/10" },
  { key: "review", label: "Review", color: "border-amber-400 bg-amber-950/10" },
  { key: "shooting", label: "Quay", color: "border-orange-400 bg-orange-950/10" },
  { key: "editing", label: "Dựng", color: "border-pink-400 bg-pink-950/10" },
  { key: "thumbnail", label: "Thumbnail", color: "border-rose-400 bg-rose-950/10" },
  { key: "caption", label: "Caption", color: "border-purple-400 bg-purple-950/10" },
  { key: "scheduling", label: "Lịch đăng", color: "border-cyan-400 bg-cyan-950/10" },
  { key: "posted", label: "Đã đăng", color: "border-teal-400 bg-teal-950/10" },
  { key: "kpi_tracking", label: "Theo dõi KPI", color: "border-emerald-400 bg-emerald-950/10" },
  { key: "completed", label: "Hoàn thành", color: "border-green-500 bg-green-950/20" },
];

export const ContentProjectManager: React.FC = () => {
  const { profile } = useAuth();
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [selectedProject, setSelectedProject] = useState<MarketingProject | null>(null);
  const [activeTabGroup, setActiveTabGroup] = useState<"production" | "marketing">("production");
  const [activeSubTab, setActiveSubTab] = useState<string>("ideas");
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<MarketingProject | null>(null);

  // Forms
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    status: "active" as "active" | "completed" | "archived",
  });

  // Query Data
  const { data: projects = [], isLoading: loadingProjects } = useMarketingProjects();
  const { data: extensions = [] } = useProjectExtensions();
  const { data: ideas = [] } = useMarketingIdeas();
  const { data: scripts = [] } = useMarketingScripts();
  const { data: videos = [] } = useMarketingVideos();
  const { data: thumbnails = [] } = useMarketingThumbnails();
  const { data: captions = [] } = useMarketingCaptions();
  const { data: hashtags = [] } = useMarketingHashtags();
  const { data: calendarEvents = [] } = useMarketingCalendarEvents();
  const { data: researches = [] } = useProjectResearches();
  const { data: shotLists = [] } = useShotLists();
  const { data: checklists = [] } = useShootingChecklists();
  const { data: mediaVersions = [] } = useMediaVersions();

  // Mutations
  const createProjectMutation = useCreateMarketingProject();
  const updateProjectMutation = useUpdateMarketingProject();
  const deleteProjectMutation = useDeleteMarketingProject();
  const updateExtensionMutation = useUpdateProjectExtension();

  // Map project extensions
  const projectExtensionsMap = useMemo(() => {
    const map = new Map<string, ContentProjectExtension>();
    extensions.forEach((ext) => {
      map.set(ext.projectId, ext);
    });
    return map;
  }, [extensions]);

  // Combine project status details
  const projectsWithStatus = useMemo(() => {
    return projects.map((p) => {
      const ext = projectExtensionsMap.get(p.id);
      return {
        ...p,
        workflowStatus: ext?.workflowStatus || "ideas",
        lessonsLearned: ext?.lessonsLearned || "",
      };
    });
  }, [projects, projectExtensionsMap]);

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData("text/plain", projectId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, statusKey: any) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData("text/plain");
    if (!projectId) return;

    try {
      await updateExtensionMutation.mutateAsync({
        projectId,
        updates: { workflowStatus: statusKey },
      });
      showToast.success("Đã di chuyển trạng thái dự án!");
    } catch (err) {
      showToast.error("Không thể thay đổi trạng thái dự án");
    }
  };

  const handleOpenAdd = () => {
    setEditingProject(null);
    setProjectForm({ name: "", description: "", status: "active" });
    setShowProjectModal(true);
  };

  const handleOpenEdit = (p: MarketingProject) => {
    setEditingProject(p);
    setProjectForm({
      name: p.name,
      description: p.description || "",
      status: p.status,
    });
    setShowProjectModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Xóa dự án này? Mọi dữ liệu liên quan sẽ bị xóa!")) {
      try {
        await deleteProjectMutation.mutateAsync(id);
        showToast.success("Xóa dự án thành công!");
      } catch (err) {
        showToast.error("Lỗi khi xóa dự án");
      }
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.name.trim()) {
      showToast.error("Tên dự án không được để trống!");
      return;
    }

    try {
      if (editingProject) {
        await updateProjectMutation.mutateAsync({
          id: editingProject.id,
          updates: projectForm,
        });
        showToast.success("Cập nhật dự án thành công!");
      } else {
        const created = await createProjectMutation.mutateAsync(projectForm);
        // Initialize extension pipeline status
        await updateExtensionMutation.mutateAsync({
          projectId: created.id,
          updates: { workflowStatus: "ideas" },
        });
        showToast.success("Tạo dự án mới thành công!");
      }
      setShowProjectModal(false);
    } catch (err) {
      showToast.error("Lỗi lưu dự án");
    }
  };

  // Subpage Render scoped to project details
  if (selectedProject) {
    return (
      <ProjectWorkspace
        project={projectsWithStatus.find((p) => p.id === selectedProject.id) || { ...selectedProject, workflowStatus: "ideas", lessonsLearned: "" }}
        onClose={() => setSelectedProject(null)}
        ideas={ideas}
        scripts={scripts}
        videos={videos}
        thumbnails={thumbnails}
        captions={captions}
        hashtags={hashtags}
        calendarEvents={calendarEvents}
        researches={researches}
        shotLists={shotLists}
        checklists={checklists}
        mediaVersions={mediaVersions}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Controller Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Folder className="w-5 h-5 text-fuchsia-600" />
            <span>Content Projects ({projects.length})</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Quản lý quy trình sản xuất content theo chu kỳ khép kín từ ý tưởng đến thành phẩm.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Toggle View Mode */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-md ${viewMode === "kanban" ? "bg-white dark:bg-slate-750 text-fuchsia-500 shadow-sm" : "text-slate-450 hover:text-slate-200"}`}
              title="Kanban Board Pipeline"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md ${viewMode === "list" ? "bg-white dark:bg-slate-750 text-fuchsia-500 shadow-sm" : "text-slate-450 hover:text-slate-200"}`}
              title="Danh sách dự án"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold shadow transition-colors ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Project</span>
          </button>
        </div>
      </div>

      {/* Main Board/List Container */}
      {viewMode === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin select-none">
          {WORKFLOW_STAGES.map((stage) => {
            const stageProjects = projectsWithStatus.filter((p) => p.workflowStatus === stage.key);
            return (
              <div
                key={stage.key}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.key)}
                className={`w-64 flex-shrink-0 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 flex flex-col min-h-[480px] ${stage.color}`}
              >
                {/* Column header */}
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-300">
                    {stage.label}
                  </span>
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-750 font-bold px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-400">
                    {stageProjects.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {stageProjects.map((p) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, p.id)}
                      onClick={() => setSelectedProject(p)}
                      className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-fuchsia-500/40 shadow-sm cursor-pointer hover:shadow transition group flex flex-col justify-between"
                    >
                      <h4 className="text-xs font-bold text-slate-850 dark:text-white leading-snug truncate group-hover:text-fuchsia-500 transition-colors">
                        {p.name}
                      </h4>
                      {p.description && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                          {p.description}
                        </p>
                      )}
                      
                      <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(p);
                          }}
                          className="p-1 hover:text-blue-500 text-slate-400"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(p.id);
                          }}
                          className="p-1 hover:text-red-500 text-slate-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {stageProjects.length === 0 && (
                    <div className="h-full border-2 border-dashed border-slate-200 dark:border-slate-800/40 rounded-xl flex items-center justify-center py-10">
                      <span className="text-[10px] text-slate-400 dark:text-slate-600 font-medium">Thả dự án vào đây</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Mode */
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-750 text-slate-600 dark:text-slate-300 font-semibold text-xs uppercase">
                <tr>
                  <th className="px-6 py-3">Tên dự án</th>
                  <th className="px-6 py-3">Trạng thái Pipeline</th>
                  <th className="px-6 py-3">Ngày tạo</th>
                  <th className="px-6 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-700">
                {projectsWithStatus.map((p) => {
                  const stage = WORKFLOW_STAGES.find((s) => s.key === p.workflowStatus);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedProject(p)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-bold text-slate-850 dark:text-white">
                        {p.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-50 dark:bg-fuchsia-950/20 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-100 dark:border-fuchsia-900/30">
                          {stage?.label || "Ý tưởng"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-semibold"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                      Chưa lập dự án marketing nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full animate-scaleIn border border-slate-100 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-fuchsia-600" />
                <span>{editingProject ? "Chỉnh sửa dự án" : "Tạo dự án mới"}</span>
              </h3>
              <button
                onClick={() => setShowProjectModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProjectSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Tên dự án (Chủ đề) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="Ví dụ: VISION HAO XĂNG"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Mô tả dự án
                </label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  placeholder="Mô tả tóm tắt mục tiêu dự án..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <button
                  type="submit"
                  disabled={createProjectMutation.isPending || updateProjectMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <span>Xác nhận</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
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

// =========================================================================
// NESTED COMPONENT: PROJECT WORKSPACE
// =========================================================================
interface ProjectWorkspaceProps {
  project: MarketingProject & { workflowStatus: string; lessonsLearned: string };
  onClose: () => void;
  ideas: MarketingIdea[];
  scripts: MarketingScript[];
  videos: MarketingVideo[];
  thumbnails: MarketingThumbnail[];
  captions: MarketingCaption[];
  hashtags: MarketingHashtag[];
  calendarEvents: MarketingCalendarEvent[];
  researches: ProjectResearch[];
  shotLists: ShotListItem[];
  checklists: ShootingChecklistItem[];
  mediaVersions: MediaVersion[];
}

const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  project,
  onClose,
  ideas,
  scripts,
  videos,
  thumbnails,
  captions,
  hashtags,
  calendarEvents,
  researches,
  shotLists,
  checklists,
  mediaVersions,
}) => {
  const [activeTabGroup, setActiveTabGroup] = useState<"production" | "marketing">("production");
  const [activeSubTab, setActiveSubTab] = useState<string>("ideas");
  const [editingLessons, setEditingLessons] = useState(project.lessonsLearned);
  const updateExtensionMutation = useUpdateProjectExtension();

  const [aiModal, setAiModal] = useState<{
    isOpen: boolean;
    feature: string;
    title: string;
    description: string;
    variables: Record<string, any>;
    onConfirm: (data: any) => void;
  }>({
    isOpen: false,
    feature: "",
    title: "",
    description: "",
    variables: {},
    onConfirm: () => {},
  });

  const handleAiPlanning = () => {
    setAiModal({
      isOpen: true,
      feature: "planning",
      title: "✨ AI Planning",
      description: "AI sẽ chia nhỏ dự án thành các đầu việc sản xuất kịch bản, quay dựng, phân vai và deadline đề xuất.",
      variables: { projectName: project.name, description: project.description },
      onConfirm: (data: any[]) => {
        showToast.success(`AI đề xuất ${data.length} tasks thành công!`);
        data.forEach(async (item: any) => {
          await createChecklistMutation.mutateAsync({
            projectId: project.id,
            itemName: `[AI Plan - ${item.role}] ${item.title} (Deadline: ${item.deadlineDays} ngày, Ước lượng: ${item.estimatedHours}h)`,
            isChecked: false,
            category: "personnel",
          });
        });
        showToast.info("Các nhiệm vụ đã được nạp tự động vào Checklist chuẩn bị quay!");
      },
    });
  };

  const handleAiShotPlanner = () => {
    setAiModal({
      isOpen: true,
      feature: "shot_list",
      title: "✨ AI Shot Planner",
      description: "AI tự động phân rã kịch bản thành danh sách phân cảnh quay (Shot List), đề xuất góc máy và B-roll phù hợp.",
      variables: { scriptContent: projectScripts[0]?.content || "Bảo dưỡng bộ nồi Honda Vision 2021 lì máy hao xăng" },
      onConfirm: (data: any[]) => {
        showToast.success(`AI sinh ${data.length} cảnh quay thành công!`);
        data.forEach(async (item: any) => {
          await createShotMutation.mutateAsync({
            projectId: project.id,
            description: `[${item.cameraAngle} - ${item.cameraMovement}] ${item.description} (B-roll: ${item.bRoll}, Transition: ${item.transition})`,
            duration: 5,
            sequenceOrder: item.sequenceOrder,
            status: "pending",
          });
        });
        showToast.info("Đã tự động thêm các cảnh quay vào Shot List!");
      },
    });
  };

  const handleAiChecklist = () => {
    setAiModal({
      isOpen: true,
      feature: "checklist",
      title: "✨ AI Audit Checklist",
      description: "AI tự kiểm tra chất lượng shot list/kịch bản (xem đã đủ intro, logo, hook, CTA chưa) và đề xuất checklist tương ứng.",
      variables: { content: `${projectScripts[0]?.content || ""} ${projectShotLists.map(s => s.description).join(" ")}` },
      onConfirm: (data: any[]) => {
        showToast.success(`AI sinh ${data.length} hạng mục checklist chuẩn bị!`);
        data.forEach(async (item: any) => {
          await createChecklistMutation.mutateAsync({
            projectId: project.id,
            itemName: `[AI Check] ${item.itemName} (${item.remarks})`,
            isChecked: item.isChecked,
            category: item.category,
          });
        });
        showToast.info("Đã tự động thêm các hạng mục chuẩn bị vào Checklist!");
      },
    });
  };

  const handleAiVideoAnalyzer = (video: MarketingVideo) => {
    setAiModal({
      isOpen: true,
      feature: "video_analyzer",
      title: "✨ AI Video Analyzer",
      description: "AI phân tích nhanh metadata tệp video local (FPS, độ phân giải, độ dài) để đánh giá tiêu chuẩn SEO.",
      variables: { filename: video.localPath || "clip_quay_nhap_v1.mp4", resolution: "1080x1920" },
      onConfirm: (data: any) => {
        showToast.success("Phân tích video hoàn tất!");
        alert(data.report);
      },
    });
  };

  // Create sub-entities linked to this project
  const createIdeaMutation = useCreateMarketingIdea();
  const createResearchMutation = useCreateProjectResearch();
  const createScriptMutation = useCreateMarketingScript();
  const createShotMutation = useCreateShotList();
  const createChecklistMutation = useCreateShootingChecklist();
  const createVersionMutation = useCreateMediaVersion();
  
  // Scoped Data Queries
  const projectIdeas = useMemo(() => ideas.filter((i) => i.projectId === project.id), [ideas, project.id]);
  const projectResearches = useMemo(() => researches.filter((r) => r.projectId === project.id), [researches, project.id]);
  const ideaIds = useMemo(() => projectIdeas.map((i) => i.id), [projectIdeas]);
  const projectScripts = useMemo(() => scripts.filter((s) => s.ideaId && ideaIds.includes(s.ideaId)), [scripts, ideaIds]);
  const scriptIds = useMemo(() => projectScripts.map((s) => s.id), [projectScripts]);
  const projectVideos = useMemo(() => videos.filter((v) => v.scriptId && scriptIds.includes(v.scriptId)), [videos, scriptIds]);
  const videoIds = useMemo(() => projectVideos.map((v) => v.id), [projectVideos]);
  const projectThumbnails = useMemo(() => thumbnails.filter((t) => videoIds.includes(t.videoId)), [thumbnails, videoIds]);
  const projectCalendar = useMemo(() => calendarEvents.filter((c) => videoIds.includes(c.videoId)), [calendarEvents, videoIds]);
  const projectShotLists = useMemo(() => shotLists.filter((sl) => sl.projectId === project.id), [shotLists, project.id]);
  const projectChecklists = useMemo(() => checklists.filter((cl) => cl.projectId === project.id), [checklists, project.id]);
  const projectVersions = useMemo(() => mediaVersions.filter((mv) => videoIds.includes(mv.videoId)), [mediaVersions, videoIds]);

  // Aggregated Marketing KPIs
  const projectKpis = useMemo(() => {
    return projectVideos.reduce(
      (acc, v) => {
        acc.views += v.views || 0;
        acc.comments += v.comments || 0;
        acc.shares += v.shares || 0;
        acc.saves += v.saves || 0;
        acc.inboxes += v.inboxes || 0;
        acc.visitors += v.visitors || 0;
        acc.revenue += v.revenue || 0;
        return acc;
      },
      { views: 0, comments: 0, shares: 0, saves: 0, inboxes: 0, visitors: 0, revenue: 0 }
    );
  }, [projectVideos]);

  const handleSaveLessons = async () => {
    try {
      await updateExtensionMutation.mutateAsync({
        projectId: project.id,
        updates: { lessonsLearned: editingLessons },
      });
      showToast.success("Đã cập nhật bài học kinh nghiệm!");
    } catch (err) {
      showToast.error("Không thể lưu bài học kinh nghiệm");
    }
  };

  const handleCreateScopeIdea = async () => {
    const title = prompt("Nhập tiêu đề ý tưởng mới cho dự án này:");
    if (!title) return;
    try {
      await createIdeaMutation.mutateAsync({
        projectId: project.id,
        title,
        priority: "medium",
        status: "draft",
      });
      showToast.success("Thêm ý tưởng mới!");
    } catch (err) {
      showToast.error("Không thể thêm ý tưởng");
    }
  };

  const handleCreateScopeResearch = async () => {
    const title = prompt("Nhập chủ đề nghiên cứu/tài liệu tham khảo:");
    if (!title) return;
    const content = prompt("Nhập nội dung/đường dẫn chi tiết:");
    if (!content) return;
    try {
      await createResearchMutation.mutateAsync({
        projectId: project.id,
        title,
        content,
        links: [],
      });
      showToast.success("Đã ghi nhận nghiên cứu!");
    } catch (err) {
      showToast.error("Lỗi khi thêm nghiên cứu");
    }
  };

  const stageLabel = WORKFLOW_STAGES.find((s) => s.key === project.workflowStatus)?.label || "Ý tưởng";

  return (
    <div className="space-y-4">
      {/* Workspace Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
            <span className="hover:underline cursor-pointer" onClick={onClose}>Content Projects</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-300">{project.name}</span>
          </div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>Dự án: {project.name}</span>
            <span className="px-2 py-0.5 bg-fuchsia-950/40 border border-fuchsia-900/30 text-fuchsia-400 rounded text-[10px] font-bold">
              Trạng thái: {stageLabel}
            </span>
          </h3>
          {project.description && (
            <p className="text-xs text-slate-400 mt-1">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAiPlanning}
            className="px-3.5 py-1.5 bg-purple-650 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>AI Planning</span>
          </button>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-755 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>Đóng Workspace</span>
          </button>
        </div>
      </div>

      {/* Tab Group Selector */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => {
            setActiveTabGroup("production");
            setActiveSubTab("ideas");
          }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTabGroup === "production"
              ? "bg-fuchsia-600 text-white"
              : "text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Sản xuất (Production)
        </button>
        <button
          onClick={() => {
            setActiveTabGroup("marketing");
            setActiveSubTab("schedule");
          }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTabGroup === "marketing"
              ? "bg-indigo-600 text-white"
              : "text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Phân phối & Hiệu quả (Distribution & Performance)
        </button>
      </div>

      {/* Sub Tabs Container */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sub-Tab bar */}
        <div className="w-full lg:w-48 flex-shrink-0 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 select-none">
          {activeTabGroup === "production" ? (
            <>
              {[
                { key: "ideas", label: "💡 Ý tưởng", count: projectIdeas.length },
                { key: "research", label: "📚 Nghiên cứu", count: projectResearches.length },
                { key: "script", label: "📝 Kịch bản", count: projectScripts.length },
                { key: "shotlist", label: "🎥 Shot List", count: projectShotLists.length },
                { key: "checklist", label: "📋 Checklist quay", count: projectChecklists.length },
                { key: "media", label: "🎬 Media & Versions", count: projectVideos.length },
                { key: "thumbnail", label: "🖼 Thumbnail", count: projectThumbnails.length },
                { key: "lessons", label: "📖 Lessons Learned" },
              ].map((sub) => (
                <button
                  key={sub.key}
                  onClick={() => setActiveSubTab(sub.key)}
                  className={`flex justify-between items-center px-3 py-2 rounded-lg text-[11px] font-semibold text-left transition ${
                    activeSubTab === sub.key
                      ? "bg-slate-900 text-white font-bold"
                      : "text-slate-450 hover:bg-slate-800/20"
                  }`}
                >
                  <span>{sub.label}</span>
                  {sub.count !== undefined && (
                    <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-400">
                      {sub.count}
                    </span>
                  )}
                </button>
              ))}
            </>
          ) : (
            <>
              {[
                { key: "schedule", label: "📅 Lịch đăng", count: projectCalendar.length },
                { key: "tiktok", label: "📱 TikTok", count: projectVideos.filter((v) => v.tiktokLink).length },
                { key: "facebook", label: "📘 Facebook", count: projectVideos.filter((v) => v.facebookLink).length },
                { key: "youtube", label: "▶ YouTube", count: projectVideos.filter((v) => v.youtubeLink).length },
                { key: "website", label: "🌐 Website", count: projectVideos.filter((v) => !v.tiktokLink && !v.facebookLink && !v.youtubeLink).length },
                { key: "analytics", label: "📊 Analytics" },
              ].map((sub) => (
                <button
                  key={sub.key}
                  onClick={() => setActiveSubTab(sub.key)}
                  className={`flex justify-between items-center px-3 py-2 rounded-lg text-[11px] font-semibold text-left transition ${
                    activeSubTab === sub.key
                      ? "bg-slate-900 text-white font-bold"
                      : "text-slate-450 hover:bg-slate-800/20"
                  }`}
                >
                  <span>{sub.label}</span>
                  {sub.count !== undefined && (
                    <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-400">
                      {sub.count}
                    </span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Right workspace sub-panel */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 min-h-[380px]">
          {/* 1. IDEAS (Production Tab) */}
          {activeSubTab === "ideas" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Ý tưởng của dự án ({projectIdeas.length})
                </h4>
                <button
                  onClick={handleCreateScopeIdea}
                  className="px-2.5 py-1 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded text-xs font-semibold transition"
                >
                  Thêm ý tưởng
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projectIdeas.map((idea) => (
                  <div key={idea.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between h-28">
                    <div>
                      <div className="text-[10px] font-bold text-fuchsia-500 uppercase">#{idea.topic || "Khác"}</div>
                      <h5 className="text-xs font-bold text-slate-850 dark:text-white line-clamp-2 mt-1">{idea.title}</h5>
                    </div>
                    <div className="text-[10px] text-slate-500 flex justify-between items-center">
                      <span>Độ ưu tiên: {idea.priority}</span>
                      <span>{formatDate(idea.created_at)}</span>
                    </div>
                  </div>
                ))}
                {projectIdeas.length === 0 && (
                  <div className="col-span-full py-10 text-center text-slate-500 text-xs italic">
                    Chưa có ý tưởng nào trong dự án này.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. RESEARCH (Production Tab) */}
          {activeSubTab === "research" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Kho nghiên cứu dự án ({projectResearches.length})
                </h4>
                <button
                  onClick={handleCreateScopeResearch}
                  className="px-2.5 py-1 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded text-xs font-semibold transition"
                >
                  Thêm tài liệu
                </button>
              </div>
              <div className="space-y-3">
                {projectResearches.map((res) => (
                  <div key={res.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white mb-2">{res.title}</h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">{res.content}</p>
                  </div>
                ))}
                {projectResearches.length === 0 && (
                  <div className="py-10 text-center text-slate-500 text-xs italic">
                    Chưa thu thập tài liệu nghiên cứu nào.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. SCRIPT (Production Tab) */}
          {activeSubTab === "script" && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Kịch bản trong dự án ({projectScripts.length})
              </h4>
              <div className="space-y-3.5">
                {projectScripts.map((script) => (
                  <div key={script.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-fuchsia-500">Kịch bản chi tiết</span>
                      <span className="text-slate-500">{script.duration} giây</span>
                    </div>
                    {script.hook && (
                      <div className="p-2.5 bg-rose-50/50 dark:bg-rose-950/10 border-l-2 border-rose-400 rounded text-xs italic">
                        <strong>Hook:</strong> "{script.hook}"
                      </div>
                    )}
                    {script.content && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 border-l-2 border-slate-400 rounded text-xs whitespace-pre-line">
                        <strong>Nội dung:</strong> {script.content}
                      </div>
                    )}
                  </div>
                ))}
                {projectScripts.length === 0 && (
                  <div className="py-10 text-center text-slate-500 text-xs italic">
                    Chưa tạo kịch bản nào. Hãy liên kết một kịch bản với các ý tưởng thuộc dự án này.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. SHOT LIST (Production Tab) */}
          {activeSubTab === "shotlist" && (
            <ShotListSubManager projectId={project.id} shotLists={projectShotLists} onAiShotPlanner={handleAiShotPlanner} />
          )}

          {/* 5. CHECKLIST (Production Tab) */}
          {activeSubTab === "checklist" && (
            <ChecklistSubManager projectId={project.id} checklists={projectChecklists} onAiChecklist={handleAiChecklist} />
          )}

          {/* 6. MEDIA & VERSIONS (Production Tab - Hide stats/views) */}
          {activeSubTab === "media" && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Quản lý Media & Phiên bản sửa đổi ({projectVideos.length})
              </h4>
              <div className="space-y-4">
                {projectVideos.map((video) => {
                  const versions = projectVersions.filter((v) => v.videoId === video.id);
                  return (
                    <div key={video.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white">{video.title}</h5>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{video.localPath}</p>
                        </div>
                        <button
                          onClick={() => handleAiVideoAnalyzer(video)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded text-[10px] font-bold transition"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>AI Analyzer</span>
                        </button>
                      </div>
                      
                      {/* Versions log */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg space-y-2 border border-slate-100 dark:border-slate-850">
                        <span className="text-[10px] font-bold text-slate-400 block">LỊCH SỬ PHIÊN BẢN ({versions.length})</span>
                        {versions.map((ver) => (
                          <div key={ver.id} className="text-xs flex justify-between items-center text-slate-600 dark:text-slate-350">
                            <span>v{ver.versionNumber}: <span className="font-mono text-[10.5px] select-all">{ver.filePath}</span></span>
                            <span className="text-[10px] text-slate-450 italic">{ver.notes || "Không ghi chú"}</span>
                          </div>
                        ))}
                        {versions.length === 0 && (
                          <span className="text-[11px] text-slate-500 italic block">Chưa lưu phiên bản chỉnh sửa nào.</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {projectVideos.length === 0 && (
                  <div className="py-10 text-center text-slate-500 text-xs italic">
                    Chưa liên kết video media nào.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. THUMBNAIL (Production Tab) */}
          {activeSubTab === "thumbnail" && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Hình thu nhỏ dự án ({projectThumbnails.length})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {projectThumbnails.map((thumb) => (
                  <div key={thumb.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="aspect-video w-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center border-b border-slate-150 dark:border-slate-700">
                      {thumb.previewData ? (
                        <img src={thumb.previewData} alt={thumb.title} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="p-2.5">
                      <h5 className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{thumb.title}</h5>
                    </div>
                  </div>
                ))}
                {projectThumbnails.length === 0 && (
                  <div className="col-span-full py-10 text-center text-slate-500 text-xs italic">
                    Không có hình thu nhỏ.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 8. LESSONS LEARNED (Production Tab) */}
          {activeSubTab === "lessons" && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Bài học kinh nghiệm (Lessons Learned)
              </h4>
              <p className="text-xs text-slate-500">
                Ghi chép đúc kết sau khi hoàn thành dự án (ví dụ: lý do viral, lỗi kỹ thuật thiết bị quay, phản hồi của người xem).
              </p>
              <textarea
                value={editingLessons}
                onChange={(e) => setEditingLessons(e.target.value)}
                placeholder="Ghi nhận bài học kinh nghiệm tại đây..."
                rows={8}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-fuchsia-500 font-mono"
              />
              <button
                onClick={handleSaveLessons}
                disabled={updateExtensionMutation.isPending}
                className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded text-xs font-semibold transition"
              >
                Lưu ghi chú
              </button>
            </div>
          )}

          {/* 9. SCHEDULE (Marketing Tab) */}
          {activeSubTab === "schedule" && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Lịch đăng phân phối dự án ({projectCalendar.length})
              </h4>
              <div className="space-y-2">
                {projectCalendar.map((ev) => {
                  const video = projectVideos.find((v) => v.id === ev.videoId);
                  return (
                    <div key={ev.id} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{video?.title}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Ngày đăng: {formatDate(ev.scheduledDate)}</div>
                      </div>
                      <div className="flex gap-1.5">
                        {ev.platforms.map((p) => (
                          <span key={p} className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-900/30 text-indigo-500">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {projectCalendar.length === 0 && (
                  <div className="py-10 text-center text-slate-500 text-xs italic">
                    Chưa lên lịch đăng cho video nào.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 10. TIKTOK / FACEBOOK / YOUTUBE / WEBSITE (Marketing Tab - Display stats & links) */}
          {["tiktok", "facebook", "youtube", "website"].includes(activeSubTab) && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider capitalize">
                Chi tiết Phân phối: {activeSubTab}
              </h4>
              <div className="space-y-3">
                {projectVideos
                  .filter((v) => {
                    if (activeSubTab === "tiktok") return !!v.tiktokLink;
                    if (activeSubTab === "facebook") return !!v.facebookLink;
                    if (activeSubTab === "youtube") return !!v.youtubeLink;
                    return !v.tiktokLink && !v.facebookLink && !v.youtubeLink; // website
                  })
                  .map((v) => (
                    <div key={v.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{v.title}</div>
                        <a
                          href={activeSubTab === "tiktok" ? v.tiktokLink : activeSubTab === "facebook" ? v.facebookLink : v.youtubeLink || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-fuchsia-400 hover:underline flex items-center gap-1.5 mt-1"
                        >
                          Xem bài đăng <Play className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="text-right text-xs space-y-1">
                        <div className="font-bold text-slate-900 dark:text-white">{v.views.toLocaleString()} xem</div>
                        <div className="text-[10px] text-slate-455">Inbox: {v.inboxes} | Khách: {v.visitors}</div>
                      </div>
                    </div>
                  ))}
                {projectVideos.filter((v) => {
                  if (activeSubTab === "tiktok") return !!v.tiktokLink;
                  if (activeSubTab === "facebook") return !!v.facebookLink;
                  if (activeSubTab === "youtube") return !!v.youtubeLink;
                  return !v.tiktokLink && !v.facebookLink && !v.youtubeLink;
                }).length === 0 && (
                  <div className="py-10 text-center text-slate-500 text-xs italic">
                    Chưa đăng tải hoặc liên kết video nào lên kênh này.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 11. ANALYTICS (Marketing Tab - Scoped KPI charts & KPI metrics) */}
          {activeSubTab === "analytics" && (
            <div className="space-y-6">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Thống kê hiệu quả dự án
              </h4>
              
              {/* Aggregated KPIs grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Lượt xem</span>
                  <span className="text-sm font-extrabold text-slate-850 dark:text-white mt-2">{projectKpis.views.toLocaleString()}</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Inbox chuyển đổi</span>
                  <span className="text-sm font-extrabold text-slate-850 dark:text-white mt-2">{projectKpis.inboxes.toLocaleString()}</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Khách đến cửa hàng</span>
                  <span className="text-sm font-extrabold text-slate-850 dark:text-white mt-2">{projectKpis.visitors.toLocaleString()}</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Doanh thu đem lại</span>
                  <span className="text-sm font-extrabold text-emerald-500 mt-2">{formatCurrency(projectKpis.revenue)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AiPreviewModal
        isOpen={aiModal.isOpen}
        onClose={() => setAiModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={aiModal.onConfirm}
        feature={aiModal.feature}
        title={aiModal.title}
        description={aiModal.description}
        variables={aiModal.variables}
      />
    </div>
  );
};

// =========================================================================
// SUB PANELS: SHOT LIST SUB-MANAGER
// =========================================================================
interface ShotListSubManagerProps {
  projectId: string;
  shotLists: ShotListItem[];
  onAiShotPlanner?: () => void;
}

const ShotListSubManager: React.FC<ShotListSubManagerProps> = ({ projectId, shotLists, onAiShotPlanner }) => {
  const createShotMutation = useCreateShotList();
  const updateShotMutation = useUpdateShotList();
  const deleteShotMutation = useDeleteShotList();
  const [desc, setDesc] = useState("");
  const [dur, setDur] = useState(5);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) return;
    try {
      await createShotMutation.mutateAsync({
        projectId,
        description: desc,
        duration: dur,
        sequenceOrder: shotLists.length,
        status: "pending",
      });
      setDesc("");
      setDur(5);
      showToast.success("Đã thêm shot mới!");
    } catch (err) {
      showToast.error("Lỗi khi thêm shot");
    }
  };

  const handleToggle = async (shot: ShotListItem) => {
    try {
      await updateShotMutation.mutateAsync({
        id: shot.id,
        updates: { status: shot.status === "pending" ? "completed" : "pending" },
      });
    } catch (err) {
      showToast.error("Không thể cập nhật trạng thái");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteShotMutation.mutateAsync(id);
      showToast.success("Xóa shot thành công!");
    } catch (err) {
      showToast.error("Không thể xóa");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Shot List quy trình quay ({shotLists.length})
        </h4>
        {onAiShotPlanner && (
          <button
            type="button"
            onClick={onAiShotPlanner}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold transition shadow"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>✨ AI Shot Planner</span>
          </button>
        )}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
        <input
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Mô tả cảnh quay (e.g. Cận cảnh xả nhớt bẩn)..."
          className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none"
          required
        />
        <input
          type="number"
          value={dur}
          onChange={(e) => setDur(Number(e.target.value))}
          placeholder="Giây"
          className="w-16 px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-xs text-white focus:outline-none text-center"
          min={1}
          required
        />
        <button type="submit" className="px-4 py-1.5 bg-fuchsia-600 text-white rounded text-xs font-semibold">
          Thêm
        </button>
      </form>

      <div className="space-y-2">
        {shotLists.map((shot, idx) => (
          <div key={shot.id} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg flex justify-between items-center text-xs">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={shot.status === "completed"}
                onChange={() => handleToggle(shot)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-fuchsia-600 focus:ring-fuchsia-500"
              />
              <span className={`font-semibold ${shot.status === "completed" ? "line-through text-slate-500" : "text-slate-800 dark:text-slate-200"}`}>
                Cảnh {idx + 1}: {shot.description}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-500">{shot.duration}s</span>
              <button onClick={() => handleDelete(shot.id)} className="text-red-500 hover:text-red-650">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {shotLists.length === 0 && (
          <div className="py-8 text-center text-slate-500 text-xs italic border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            Chưa lập Shot List cảnh quay nào.
          </div>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// SUB PANELS: SHOOTING CHECKLIST SUB-MANAGER
// =========================================================================
interface ChecklistSubManagerProps {
  projectId: string;
  checklists: ShootingChecklistItem[];
  onAiChecklist?: () => void;
}

const ChecklistSubManager: React.FC<ChecklistSubManagerProps> = ({ projectId, checklists, onAiChecklist }) => {
  const createChecklistMutation = useCreateShootingChecklist();
  const updateChecklistMutation = useUpdateShootingChecklist();
  const deleteChecklistMutation = useDeleteShootingChecklist();
  const [itemName, setItemName] = useState("");
  const [cat, setCat] = useState("equipment");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    try {
      await createChecklistMutation.mutateAsync({
        projectId,
        itemName,
        isChecked: false,
        category: cat,
      });
      setItemName("");
      showToast.success("Đã thêm hạng mục checklist!");
    } catch (err) {
      showToast.error("Lỗi thêm checklist");
    }
  };

  const handleToggle = async (item: ShootingChecklistItem) => {
    try {
      await updateChecklistMutation.mutateAsync({
        id: item.id,
        updates: { isChecked: !item.isChecked },
      });
    } catch (err) {
      showToast.error("Lỗi cập nhật checklist");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteChecklistMutation.mutateAsync(id);
      showToast.success("Xóa checklist thành công!");
    } catch (err) {
      showToast.error("Không thể xóa");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Checklist chuẩn bị quay ({checklists.length})
        </h4>
        {onAiChecklist && (
          <button
            type="button"
            onClick={onAiChecklist}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold transition shadow"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>✨ AI Audit Checklist</span>
          </button>
        )}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
        <input
          type="text"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="Hạng mục chuẩn bị (e.g. Sạc đầy pin máy quay, mic không dây)..."
          className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none"
          required
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-xs text-white focus:outline-none"
        >
          <option value="equipment">Thiết bị</option>
          <option value="props">Đạo cụ</option>
          <option value="location">Bối cảnh</option>
          <option value="personnel">Nhân lực</option>
        </select>
        <button type="submit" className="px-4 py-1.5 bg-fuchsia-600 text-white rounded text-xs font-semibold">
          Thêm
        </button>
      </form>

      <div className="space-y-2">
        {checklists.map((item) => (
          <div key={item.id} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg flex justify-between items-center text-xs">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={item.isChecked}
                onChange={() => handleToggle(item)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-fuchsia-600 focus:ring-fuchsia-500"
              />
              <span className={`font-semibold ${item.isChecked ? "line-through text-slate-500" : "text-slate-800 dark:text-slate-200"}`}>
                [{item.category === "equipment" ? "Thiết bị" : item.category === "props" ? "Đạo cụ" : item.category === "location" ? "Bối cảnh" : "Nhân sự"}] {item.itemName}
              </span>
            </div>
            <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-650">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {checklists.length === 0 && (
          <div className="py-8 text-center text-slate-500 text-xs italic border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            Chưa có hạng mục checklist nào.
          </div>
        )}
      </div>
    </div>
  );
};
