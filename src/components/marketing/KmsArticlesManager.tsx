import React, { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  Paperclip,
  History,
  CheckCircle,
  AlertTriangle,
  Download,
  Calendar,
  Filter,
  Search,
  BookOpen,
} from "lucide-react";
import {
  KnowledgeArticle,
  KnowledgeCategory,
  KnowledgeTag,
  KnowledgeFile,
  KnowledgeVersion,
} from "../../types/knowledge";
import { showToast } from "../../utils/toast";
import { formatDate } from "../../utils/format";
import {
  useKnowledgeArticles,
  useKnowledgeCategories,
  useKnowledgeTags,
  useArticleTagsMappings,
  useCreateKnowledgeArticle,
  useUpdateKnowledgeArticle,
  useDeleteKnowledgeArticle,
  useKnowledgeVersions,
  useKnowledgeFiles,
  useCreateKnowledgeFile,
  useDeleteKnowledgeFile,
} from "../../hooks/useKnowledgeRepository";

interface KmsArticlesManagerProps {
  initialCategoryId?: string;
  initialArticleId?: string;
}

export const KmsArticlesManager: React.FC<KmsArticlesManagerProps> = ({
  initialCategoryId = "",
  initialArticleId = "",
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);
  const [selectedArticleId, setSelectedArticleId] = useState(initialArticleId);
  const [filterType, setFilterType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);

  // Attachment & revision panel details
  const [attachmentForm, setAttachmentForm] = useState({ name: "", fileUrl: "", fileType: "pdf", fileSize: 1024 });

  // Repository Hooks
  const { data: articles = [], isLoading: loadingArticles } = useKnowledgeArticles();
  const { data: categories = [] } = useKnowledgeCategories();
  const { data: tags = [] } = useKnowledgeTags();
  const { data: mappings = [] } = useArticleTagsMappings();

  // Selected subqueries
  const { data: articleVersions = [] } = useKnowledgeVersions(selectedArticleId);
  const { data: articleFiles = [] } = useKnowledgeFiles(selectedArticleId);

  // Mutations
  const createArtMutation = useCreateKnowledgeArticle();
  const updateArtMutation = useUpdateKnowledgeArticle();
  const deleteArtMutation = useDeleteKnowledgeArticle();
  const createFileMutation = useCreateKnowledgeFile();
  const deleteFileMutation = useDeleteKnowledgeFile(selectedArticleId);

  // Form State
  const [formData, setFormData] = useState({
    type: "sop" as any,
    title: "",
    content: "",
    categoryId: "",
    authorId: "",
    approvedBy: "",
    effectiveDate: "",
    status: "draft" as any,
    selectedTagIds: [] as string[],
    metadata: {} as any,
  });

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchCategory = selectedCategoryId === "" || art.categoryId === selectedCategoryId;
      const matchType = filterType === "" || art.type === filterType;
      const matchSearch =
        art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        art.content.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCategory && matchType && matchSearch;
    });
  }, [articles, selectedCategoryId, filterType, searchTerm]);

  // Selected Article
  const activeArticle = useMemo(() => {
    return articles.find((a) => a.id === selectedArticleId) || filteredArticles[0] || null;
  }, [articles, selectedArticleId, filteredArticles]);

  // Set default selection if none
  React.useEffect(() => {
    if (activeArticle && activeArticle.id !== selectedArticleId) {
      setSelectedArticleId(activeArticle.id);
    }
  }, [activeArticle, selectedArticleId]);

  const handleOpenAdd = () => {
    setEditingArticle(null);
    setFormData({
      type: "sop",
      title: "",
      content: "",
      categoryId: categories[0]?.id || "",
      authorId: "",
      approvedBy: "",
      effectiveDate: new Date().toISOString().split("T")[0],
      status: "draft",
      selectedTagIds: [],
      metadata: {},
    });
    setShowModal(true);
  };

  const handleOpenEdit = (art: KnowledgeArticle) => {
    setEditingArticle(art);
    // Find active mapped tag ids
    const activeTagIds = mappings.filter((m) => m.articleId === art.id).map((m) => m.tagId);

    setFormData({
      type: art.type,
      title: art.title,
      content: art.content,
      categoryId: art.categoryId || "",
      authorId: art.authorId || "",
      approvedBy: art.approvedBy || "",
      effectiveDate: art.effectiveDate ? art.effectiveDate.split("T")[0] : "",
      status: art.status,
      selectedTagIds: activeTagIds,
      metadata: art.metadata || {},
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc muốn xóa tri thức này? Mọi file đính kèm và lịch sử phiên bản sẽ bị xóa vĩnh viễn!")) {
      try {
        await deleteArtMutation.mutateAsync(id);
        showToast.success("Xóa tài liệu thành công!");
        setSelectedArticleId("");
      } catch (err) {
        showToast.error("Lỗi xóa tài liệu");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim() || !formData.categoryId) {
      showToast.error("Vui lòng điền đủ thông tin bắt buộc!");
      return;
    }

    try {
      const payload = {
        type: formData.type,
        title: formData.title,
        content: formData.content,
        categoryId: formData.categoryId,
        authorId: formData.authorId || undefined,
        approvedBy: formData.approvedBy || undefined,
        effectiveDate: formData.effectiveDate ? new Date(formData.effectiveDate).toISOString() : undefined,
        status: formData.status,
        tags: formData.selectedTagIds,
        metadata: formData.metadata,
      };

      if (editingArticle) {
        await updateArtMutation.mutateAsync({
          id: editingArticle.id,
          updates: payload,
        });
        showToast.success("Đã ghi nhận bản chỉnh sửa & Lưu phiên bản mới!");
      } else {
        const created = await createArtMutation.mutateAsync(payload);
        setSelectedArticleId(created.id);
        showToast.success("Tạo tài liệu tri thức thành công!");
      }
      setShowModal(false);
    } catch (err) {
      showToast.error("Không thể lưu tài liệu");
    }
  };

  // Attachments CRUD
  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachmentForm.name.trim() || !attachmentForm.fileUrl.trim()) return;

    try {
      await createFileMutation.mutateAsync({
        articleId: selectedArticleId,
        name: attachmentForm.name,
        fileUrl: attachmentForm.fileUrl,
        fileType: attachmentForm.fileType,
        fileSize: attachmentForm.fileSize,
      });
      setAttachmentForm({ name: "", fileUrl: "", fileType: "pdf", fileSize: 1024 });
      showToast.success("Đã đính kèm file thành công!");
    } catch (err) {
      showToast.error("Lỗi khi tải đính kèm");
    }
  };

  const handleDeleteFile = async (id: string) => {
    try {
      await deleteFileMutation.mutateAsync(id);
      showToast.success("Xóa file đính kèm thành công!");
    } catch (err) {
      showToast.error("Lỗi xóa file");
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 min-h-[500px]">
      {/* LEFT PANEL: FILTERS & INDEX list */}
      <div className="w-full xl:w-72 flex-shrink-0 space-y-4">
        {/* Search & Quick Action */}
        <div className="space-y-2">
          <button
            onClick={handleOpenAdd}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg text-xs font-semibold shadow transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm tài liệu tri thức</span>
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tri thức..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
          </div>
        </div>

        {/* Category Selector Side Menu */}
        <div className="bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-750 rounded-xl space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Danh mục tri thức
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
            >
              <option value="">-- Tất cả danh mục --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Phân loại bài viết
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
            >
              <option value="">-- Tất cả loại --</option>
              <option value="sop">Quy trình (SOP)</option>
              <option value="brand_book">Brand Book</option>
              <option value="training">Tài liệu Đào tạo</option>
              <option value="technical">Thư viện Kỹ thuật</option>
              <option value="bible">Content Bible</option>
              <option value="case_study">Case Study thực tế</option>
              <option value="lessons">Bài học kinh nghiệm</option>
              <option value="faq">FAQ câu hỏi thường gặp</option>
              <option value="policies">Chính sách ban hành</option>
              <option value="template">Mẫu / Checklists</option>
            </select>
          </div>
        </div>

        {/* Index list of matching articles */}
        <div className="space-y-2 max-h-[350px] xl:max-h-[500px] overflow-y-auto pr-1">
          {filteredArticles.map((art) => {
            const active = art.id === selectedArticleId;
            return (
              <div
                key={art.id}
                onClick={() => setSelectedArticleId(art.id)}
                className={`p-3 rounded-xl border cursor-pointer transition select-none flex flex-col justify-between h-20 ${
                  active
                    ? "bg-slate-900 border-fuchsia-600 text-white"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-350"
                }`}
              >
                <div className="text-[11.5px] font-bold truncate">{art.title}</div>
                <div className="flex justify-between items-center text-[9px] text-slate-400 mt-2">
                  <span className="uppercase font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-655 dark:text-slate-300 px-1 py-0.5 rounded">
                    {art.type}
                  </span>
                  <span>v{art.version}</span>
                </div>
              </div>
            );
          })}
          {filteredArticles.length === 0 && (
            <div className="text-center py-10 text-xs text-slate-500 italic">
              Không tìm thấy tài liệu phù hợp.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: FULL DOCUMENT VIEW WORKSPACE */}
      <div className="flex-1 min-w-0 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col xl:flex-row gap-6">
        {activeArticle ? (
          <>
            {/* Left side: Body content of active tri thức */}
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-start gap-4 pb-3 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>
                      {categories.find((c) => c.id === activeArticle.categoryId)?.name || "Kho tài liệu"}
                    </span>
                    <span>•</span>
                    <span className="text-fuchsia-500">Phiên bản v{activeArticle.version}</span>
                  </div>
                  <h2 className="text-sm font-extrabold text-slate-850 dark:text-white mt-1 leading-snug">
                    {activeArticle.title}
                  </h2>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenEdit(activeArticle)}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-blue-500 rounded-lg transition"
                    title="Chỉnh sửa / Cập nhật phiên bản mới"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(activeArticle.id)}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-red-500 rounded-lg transition"
                    title="Xóa tài liệu"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Document details block */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-350">
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Ngày hiệu lực</span>
                  <span className="font-semibold">{activeArticle.effectiveDate ? formatDate(activeArticle.effectiveDate) : "Chưa đặt"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Trạng thái</span>
                  <span className={`font-semibold uppercase text-[9.5px] ${activeArticle.status === "published" ? "text-emerald-500" : "text-amber-500"}`}>
                    {activeArticle.status === "published" ? "Đã phê duyệt" : "Bản nháp"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Tác giả</span>
                  <span className="font-semibold">{activeArticle.authorId || "Quản trị viên"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Người duyệt</span>
                  <span className="font-semibold">{activeArticle.approvedBy || "Chưa duyệt"}</span>
                </div>
              </div>

              {/* Render article markdown text content */}
              <div className="text-xs text-slate-750 dark:text-slate-300 whitespace-pre-line leading-relaxed border border-slate-100 dark:border-slate-800/80 p-4 rounded-xl max-h-[400px] overflow-y-auto bg-slate-50/50 dark:bg-slate-900/10">
                {activeArticle.content}
              </div>
            </div>

            {/* Right side: Attachment files list & Revision logs */}
            <div className="w-full xl:w-60 flex-shrink-0 space-y-5 pt-4 xl:pt-0 xl:border-l xl:border-slate-100 xl:dark:border-slate-700/65 xl:pl-6">
              {/* Attachment PDFs/Files */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Tài liệu đính kèm ({articleFiles.length})</span>
                </span>
                
                <div className="space-y-1.5">
                  {articleFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-2.5 bg-slate-50 dark:bg-slate-900/35 border border-slate-100 dark:border-slate-800 rounded-lg flex justify-between items-center text-xs"
                    >
                      <div className="truncate flex-1">
                        <div className="font-bold text-slate-800 dark:text-slate-300 truncate" title={file.name}>
                          {file.name}
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {(file.fileSize / 1024).toFixed(1)} KB
                        </span>
                      </div>

                      <div className="flex gap-1.5 ml-2">
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 hover:text-fuchsia-500 text-slate-400"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="p-1 hover:text-red-500 text-slate-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {articleFiles.length === 0 && (
                    <span className="text-[11px] text-slate-500 italic block">Không có tài liệu đính kèm.</span>
                  )}
                </div>

                {/* File attach input form */}
                <form onSubmit={handleAddFile} className="space-y-1.5 bg-slate-50 dark:bg-slate-900/10 p-2.5 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <input
                    type="text"
                    placeholder="Tên tệp (SOP Quy chuẩn...)"
                    value={attachmentForm.name}
                    onChange={(e) => setAttachmentForm({ ...attachmentForm, name: e.target.value })}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10.5px] text-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Đường dẫn url file tài liệu..."
                    value={attachmentForm.fileUrl}
                    onChange={(e) => setAttachmentForm({ ...attachmentForm, fileUrl: e.target.value })}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10.5px] font-mono text-white"
                    required
                  />
                  <button type="submit" className="w-full py-1 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded text-[10px] font-bold transition">
                    Đính kèm file URL
                  </button>
                </form>
              </div>

              {/* Revision Versions History */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  <span>Nhật ký sửa đổi ({articleVersions.length})</span>
                </span>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {articleVersions.map((v) => (
                    <div key={v.id} className="text-[10.5px] border-l-2 border-fuchsia-500 pl-2.5 py-0.5 space-y-0.5">
                      <div className="flex justify-between font-bold text-slate-800 dark:text-slate-350">
                        <span>v{v.versionNumber}</span>
                        <span>{formatDate(v.created_at)}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 italic truncate" title={v.title}>
                        Sửa đổi tiêu đề: {v.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 py-16 text-center text-slate-500 italic text-xs">
            Chưa có tài liệu tri thức nào. Vui lòng thêm bài viết mới để bắt đầu xây dựng Bộ não công ty.
          </div>
        )}
      </div>

      {/* CREATE/EDIT KNOWLEDGE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn border border-slate-100 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-fuchsia-600" />
                <span>{editingArticle ? "Sửa & Nâng phiên bản tri thức" : "Tạo bài viết tri thức mới"}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Danh mục tri thức <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    required
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Phân loại loại bài viết <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none"
                    required
                  >
                    <option value="sop">Quy trình (SOP)</option>
                    <option value="brand_book">Brand Book</option>
                    <option value="training">Cẩm nang Đào tạo</option>
                    <option value="technical">Kỹ thuật mẫu</option>
                    <option value="bible">Content Bible</option>
                    <option value="case_study">Case Study thực tế</option>
                    <option value="lessons">Bài học rút ra</option>
                    <option value="faq">FAQ hỏi đáp</option>
                    <option value="policies">Chính sách chung</option>
                    <option value="template">Mẫu chuẩn hóa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Tiêu đề tài liệu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ví dụ: SOP thay nhớt láp xe tay ga Yamaha"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Người biên soạn
                  </label>
                  <input
                    type="text"
                    value={formData.authorId}
                    onChange={(e) => setFormData({ ...formData, authorId: e.target.value })}
                    placeholder="Họ tên tác giả..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Người phê duyệt
                  </label>
                  <input
                    type="text"
                    value={formData.approvedBy}
                    onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })}
                    placeholder="Quản lý duyệt..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Ngày hiệu lực
                  </label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Trạng thái phê duyệt
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none"
                >
                  <option value="draft">Bản nháp (Draft)</option>
                  <option value="review">Chờ duyệt (Under Review)</option>
                  <option value="published">Đã ban hành phê duyệt (Approved)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Chọn các Tags (Thẻ phân mục liên kết)
                </label>
                <div className="flex flex-wrap gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-900/20 max-h-24 overflow-y-auto">
                  {tags.map((tag) => {
                    const selected = formData.selectedTagIds.includes(tag.id);
                    return (
                      <span
                        key={tag.id}
                        onClick={() => {
                          const nextIds = selected
                            ? formData.selectedTagIds.filter((tid) => tid !== tag.id)
                            : [...formData.selectedTagIds, tag.id];
                          setFormData({ ...formData, selectedTagIds: nextIds });
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition select-none ${
                          selected
                            ? "bg-fuchsia-600 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {tag.name}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Nội dung tri thức / SOP chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Nhập nội dung quy trình các bước chi tiết..."
                  rows={8}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none font-mono"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <button
                  type="submit"
                  disabled={createArtMutation.isPending || updateArtMutation.isPending}
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
