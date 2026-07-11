import { supabase } from "../../supabaseClient";
import { RepoResult, success, failure } from "./types";
import type {
  KnowledgeCategory,
  KnowledgeTag,
  KnowledgeArticle,
  KnowledgeVersion,
  KnowledgeFile,
} from "../../types/knowledge";

// Helpers
const cleanText = (v: any) => (typeof v === "string" && v.trim() === "" ? null : v);

// =============================================
// KNOWLEDGE CATEGORIES
// =============================================
export async function fetchKnowledgeCategories(): Promise<RepoResult<KnowledgeCategory[]>> {
  try {
    const { data, error } = await supabase
      .from("knowledge_categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải danh mục tri thức", cause: error });
    }

    const categories: KnowledgeCategory[] = (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      parentId: item.parent_id,
      branchId: item.branch_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return success(categories);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải danh mục tri thức", cause: e });
  }
}

export async function createKnowledgeCategory(
  cat: Omit<KnowledgeCategory, "id" | "created_at" | "updated_at">
): Promise<RepoResult<KnowledgeCategory>> {
  try {
    const { data, error } = await supabase
      .from("knowledge_categories")
      .insert({
        name: cat.name,
        parent_id: cat.parentId || null,
        branch_id: cat.branchId,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể tạo danh mục tri thức mới", cause: error });
    }

    return success({
      id: data.id,
      name: data.name,
      parentId: data.parent_id,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tạo danh mục tri thức", cause: e });
  }
}

export async function updateKnowledgeCategory(
  id: string,
  updates: Partial<Omit<KnowledgeCategory, "id" | "branchId" | "created_at" | "updated_at">>
): Promise<RepoResult<KnowledgeCategory>> {
  try {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.parentId !== undefined) payload.parent_id = updates.parentId || null;

    const { data, error } = await supabase
      .from("knowledge_categories")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể cập nhật danh mục tri thức", cause: error });
    }

    return success({
      id: data.id,
      name: data.name,
      parentId: data.parent_id,
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi cập nhật danh mục tri thức", cause: e });
  }
}

export async function deleteKnowledgeCategory(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase.from("knowledge_categories").delete().eq("id", id);
    if (error) {
      return failure({ code: "supabase", message: "Không thể xóa danh mục tri thức", cause: error });
    }
    return success(undefined);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi xóa danh mục tri thức", cause: e });
  }
}

// =============================================
// KNOWLEDGE TAGS
// =============================================
export async function fetchKnowledgeTags(): Promise<RepoResult<KnowledgeTag[]>> {
  try {
    const { data, error } = await supabase
      .from("knowledge_tags")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải danh sách thẻ", cause: error });
    }

    const tags: KnowledgeTag[] = (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      created_at: item.created_at,
    }));

    return success(tags);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải danh sách thẻ", cause: e });
  }
}

export async function createKnowledgeTag(name: string): Promise<RepoResult<KnowledgeTag>> {
  try {
    const { data, error } = await supabase
      .from("knowledge_tags")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể thêm thẻ mới", cause: error });
    }

    return success({
      id: data.id,
      name: data.name,
      created_at: data.created_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi thêm thẻ mới", cause: e });
  }
}

export async function deleteKnowledgeTag(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase.from("knowledge_tags").delete().eq("id", id);
    if (error) {
      return failure({ code: "supabase", message: "Không thể xóa thẻ", cause: error });
    }
    return success(undefined);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi xóa thẻ", cause: e });
  }
}

// =============================================
// KNOWLEDGE ARTICLES (KMS)
// =============================================
export async function fetchKnowledgeArticles(): Promise<RepoResult<KnowledgeArticle[]>> {
  try {
    const { data, error } = await supabase
      .from("knowledge_articles")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải bài viết tri thức", cause: error });
    }

    const articles: KnowledgeArticle[] = (data || []).map((item: any) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      content: item.content,
      categoryId: item.category_id,
      authorId: item.author_id,
      approvedBy: item.approved_by,
      effectiveDate: item.effective_date,
      status: item.status,
      version: item.version,
      metadata: item.metadata || {},
      branchId: item.branch_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return success(articles);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải bài viết tri thức", cause: e });
  }
}

export async function createKnowledgeArticle(
  art: Omit<KnowledgeArticle, "id" | "version" | "created_at" | "updated_at"> & { tags?: string[] }
): Promise<RepoResult<KnowledgeArticle>> {
  try {
    // 1. Insert article
    const { data, error } = await supabase
      .from("knowledge_articles")
      .insert({
        type: art.type,
        title: art.title,
        content: art.content,
        category_id: art.categoryId || null,
        author_id: art.authorId || null,
        approved_by: art.approvedBy || null,
        effective_date: art.effectiveDate || null,
        status: art.status,
        metadata: art.metadata || {},
        branch_id: art.branchId,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể tạo bài viết tri thức mới", cause: error });
    }

    const createdArticle: KnowledgeArticle = {
      id: data.id,
      type: data.type,
      title: data.title,
      content: data.content,
      categoryId: data.category_id,
      authorId: data.author_id,
      approvedBy: data.approved_by,
      effectiveDate: data.effective_date,
      status: data.status,
      version: data.version,
      metadata: data.metadata || {},
      branchId: data.branch_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    // 2. Insert tags mapping if any
    if (art.tags && art.tags.length > 0) {
      const tagRows = art.tags.map((tagId) => ({
        article_id: data.id,
        tag_id: tagId,
      }));
      await supabase.from("knowledge_article_tags").insert(tagRows);
    }

    // 3. Create initial revision version
    await supabase.from("knowledge_versions").insert({
      article_id: data.id,
      version_number: 1,
      title: data.title,
      content: data.content,
      metadata: data.metadata || {},
      modified_by: art.authorId || null,
    });

    return success(createdArticle);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tạo bài viết", cause: e });
  }
}

export async function updateKnowledgeArticle(
  id: string,
  updates: Partial<Omit<KnowledgeArticle, "id" | "branchId" | "created_at" | "updated_at">> & { tags?: string[] }
): Promise<RepoResult<KnowledgeArticle>> {
  try {
    // 1. Get current version of the article
    const { data: current, error: fetchErr } = await supabase
      .from("knowledge_articles")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !current) {
      return failure({ code: "supabase", message: "Không thể tìm thấy bài viết để cập nhật", cause: fetchErr });
    }

    const nextVer = current.version + 1;

    // 2. Perform DB update
    const payload: any = {};
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.content !== undefined) payload.content = updates.content;
    if (updates.categoryId !== undefined) payload.category_id = updates.categoryId || null;
    if (updates.authorId !== undefined) payload.author_id = updates.authorId || null;
    if (updates.approvedBy !== undefined) payload.approved_by = updates.approvedBy || null;
    if (updates.effectiveDate !== undefined) payload.effective_date = updates.effectiveDate || null;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.metadata !== undefined) payload.metadata = updates.metadata;
    payload.version = nextVer;

    const { data: updated, error: updateErr } = await supabase
      .from("knowledge_articles")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (updateErr || !updated) {
      return failure({ code: "supabase", message: "Lỗi khi cập nhật bài viết", cause: updateErr });
    }

    // 3. Update tags if present
    if (updates.tags !== undefined) {
      // Clear old mappings
      await supabase.from("knowledge_article_tags").delete().eq("article_id", id);
      // Re-insert mappings
      if (updates.tags.length > 0) {
        const tagRows = updates.tags.map((tagId) => ({
          article_id: id,
          tag_id: tagId,
        }));
        await supabase.from("knowledge_article_tags").insert(tagRows);
      }
    }

    // 4. Create historical snapshot revision
    await supabase.from("knowledge_versions").insert({
      article_id: id,
      version_number: nextVer,
      title: updated.title,
      content: updated.content,
      metadata: updated.metadata || {},
      modified_by: updates.authorId || null,
    });

    return success({
      id: updated.id,
      type: updated.type,
      title: updated.title,
      content: updated.content,
      categoryId: updated.category_id,
      authorId: updated.author_id,
      approvedBy: updated.approved_by,
      effectiveDate: updated.effective_date,
      status: updated.status,
      version: updated.version,
      metadata: updated.metadata || {},
      branchId: updated.branch_id,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi cập nhật bài viết", cause: e });
  }
}

export async function deleteKnowledgeArticle(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase.from("knowledge_articles").delete().eq("id", id);
    if (error) {
      return failure({ code: "supabase", message: "Không thể xóa bài viết tri thức", cause: error });
    }
    return success(undefined);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi xóa bài viết", cause: e });
  }
}

// =============================================
// KNOWLEDGE VERSIONS
// =============================================
export async function fetchKnowledgeVersions(articleId: string): Promise<RepoResult<KnowledgeVersion[]>> {
  try {
    const { data, error } = await supabase
      .from("knowledge_versions")
      .select("*")
      .eq("article_id", articleId)
      .order("version_number", { ascending: false });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải lịch sử phiên bản", cause: error });
    }

    const versions: KnowledgeVersion[] = (data || []).map((item: any) => ({
      id: item.id,
      articleId: item.article_id,
      versionNumber: item.version_number,
      title: item.title,
      content: item.content,
      metadata: item.metadata || {},
      modifiedBy: item.modified_by,
      created_at: item.created_at,
    }));

    return success(versions);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải phiên bản", cause: e });
  }
}

// =============================================
// KNOWLEDGE FILES
// =============================================
export async function fetchKnowledgeFiles(articleId: string): Promise<RepoResult<KnowledgeFile[]>> {
  try {
    const { data, error } = await supabase
      .from("knowledge_files")
      .select("*")
      .eq("article_id", articleId)
      .order("created_at", { ascending: true });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải tài liệu đính kèm", cause: error });
    }

    const files: KnowledgeFile[] = (data || []).map((item: any) => ({
      id: item.id,
      articleId: item.article_id,
      name: item.name,
      fileUrl: item.file_url,
      fileType: item.file_type,
      fileSize: item.file_size,
      created_at: item.created_at,
    }));

    return success(files);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải tài liệu đính kèm", cause: e });
  }
}

export async function createKnowledgeFile(
  file: Omit<KnowledgeFile, "id" | "created_at">
): Promise<RepoResult<KnowledgeFile>> {
  try {
    const { data, error } = await supabase
      .from("knowledge_files")
      .insert({
        article_id: file.articleId,
        name: file.name,
        file_url: file.fileUrl,
        file_type: file.fileType,
        file_size: file.fileSize,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể đính kèm tài liệu", cause: error });
    }

    return success({
      id: data.id,
      articleId: data.article_id,
      name: data.name,
      fileUrl: data.file_url,
      fileType: data.file_type,
      fileSize: data.file_size,
      created_at: data.created_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi đính kèm tài liệu", cause: e });
  }
}

export async function deleteKnowledgeFile(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase.from("knowledge_files").delete().eq("id", id);
    if (error) {
      return failure({ code: "supabase", message: "Không thể xóa tài liệu đính kèm", cause: error });
    }
    return success(undefined);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi xóa tài liệu đính kèm", cause: e });
  }
}

// Fetch Article Tags mappings
export async function fetchArticleTagsMappings(): Promise<RepoResult<{articleId: string, tagId: string}[]>> {
  try {
    const { data, error } = await supabase
      .from("knowledge_article_tags")
      .select("*");

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải liên kết thẻ bài viết", cause: error });
    }

    const mappings = (data || []).map((item: any) => ({
      articleId: item.article_id,
      tagId: item.tag_id,
    }));

    return success(mappings);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải liên kết thẻ", cause: e });
  }
}
