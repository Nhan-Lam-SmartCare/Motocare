export interface KnowledgeCategory {
  id: string;
  name: string;
  parentId?: string;
  branchId: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeTag {
  id: string;
  name: string;
  created_at: string;
}

export interface KnowledgeArticle {
  id: string;
  type:
    | "brand_book"
    | "sop"
    | "training"
    | "technical"
    | "content_bible"
    | "script_library"
    | "prompt_library"
    | "case_study"
    | "lessons_learned"
    | "faq"
    | "document"
    | "template"
    | "checklist"
    | "form"
    | "policy";
  title: string;
  content: string;
  categoryId?: string;
  authorId?: string;
  approvedBy?: string;
  effectiveDate?: string; // ISO string
  status: "draft" | "review" | "published" | "archived";
  version: number;
  metadata: Record<string, any>; // flexible JSONB data
  branchId: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeVersion {
  id: string;
  articleId: string;
  versionNumber: number;
  title: string;
  content: string;
  metadata: Record<string, any>;
  modifiedBy?: string;
  created_at: string;
}

export interface KnowledgeFile {
  id: string;
  articleId: string;
  name: string;
  fileUrl: string;
  fileType: string; // pdf, docx, xlsx
  fileSize: number; // bytes
  created_at: string;
}
