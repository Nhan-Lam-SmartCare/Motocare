import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "../contexts/AppContext";
import type {
  KnowledgeCategory,
  KnowledgeTag,
  KnowledgeArticle,
  KnowledgeVersion,
  KnowledgeFile,
} from "../types/knowledge";
import {
  fetchKnowledgeCategories,
  createKnowledgeCategory,
  updateKnowledgeCategory,
  deleteKnowledgeCategory,
  fetchKnowledgeTags,
  createKnowledgeTag,
  deleteKnowledgeTag,
  fetchKnowledgeArticles,
  createKnowledgeArticle,
  updateKnowledgeArticle,
  deleteKnowledgeArticle,
  fetchKnowledgeVersions,
  fetchKnowledgeFiles,
  createKnowledgeFile,
  deleteKnowledgeFile,
  fetchArticleTagsMappings,
} from "../lib/repository/knowledgeRepository";

// =============================================
// KMS CATEGORIES HOOKS
// =============================================
export function useKnowledgeCategories() {
  const { currentBranchId } = useAppContext();

  return useQuery({
    queryKey: ["knowledge-categories", currentBranchId],
    queryFn: async () => {
      const res = await fetchKnowledgeCategories();
      if (!res.ok) throw new Error(res.error.message);
      return res.data.filter((item) => item.branchId === currentBranchId);
    },
    staleTime: 5 * 60_000, // 5 min cache
  });
}

export function useCreateKnowledgeCategory() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (cat: Omit<KnowledgeCategory, "id" | "created_at" | "updated_at" | "branchId">) => {
      const res = await createKnowledgeCategory({ ...cat, branchId: currentBranchId });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-categories", currentBranchId] });
    },
  });
}

export function useUpdateKnowledgeCategory() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<KnowledgeCategory, "id" | "branchId" | "created_at" | "updated_at">>;
    }) => {
      const res = await updateKnowledgeCategory(id, updates);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-categories", currentBranchId] });
    },
  });
}

export function useDeleteKnowledgeCategory() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteKnowledgeCategory(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-categories", currentBranchId] });
    },
  });
}

// =============================================
// KMS TAGS HOOKS
// =============================================
export function useKnowledgeTags() {
  return useQuery({
    queryKey: ["knowledge-tags"],
    queryFn: async () => {
      const res = await fetchKnowledgeTags();
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 10 * 60_000,
  });
}

export function useCreateKnowledgeTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const res = await createKnowledgeTag(name);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-tags"] });
    },
  });
}

export function useDeleteKnowledgeTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteKnowledgeTag(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-tags"] });
    },
  });
}

// =============================================
// KMS ARTICLES (KMS) HOOKS
// =============================================
export function useKnowledgeArticles() {
  const { currentBranchId } = useAppContext();

  return useQuery({
    queryKey: ["knowledge-articles", currentBranchId],
    queryFn: async () => {
      const res = await fetchKnowledgeArticles();
      if (!res.ok) throw new Error(res.error.message);
      return res.data.filter((item) => item.branchId === currentBranchId);
    },
    staleTime: 30_000,
  });
}

export function useArticleTagsMappings() {
  return useQuery({
    queryKey: ["knowledge-article-tags-mappings"],
    queryFn: async () => {
      const res = await fetchArticleTagsMappings();
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useCreateKnowledgeArticle() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (
      art: Omit<KnowledgeArticle, "id" | "version" | "created_at" | "updated_at" | "branchId"> & { tags?: string[] }
    ) => {
      const res = await createKnowledgeArticle({ ...art, branchId: currentBranchId });
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles", currentBranchId] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-article-tags-mappings"] });
    },
  });
}

export function useUpdateKnowledgeArticle() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<KnowledgeArticle, "id" | "branchId" | "created_at" | "updated_at">> & { tags?: string[] };
    }) => {
      const res = await updateKnowledgeArticle(id, updates);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles", currentBranchId] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-article-tags-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-versions", variables.id] });
    },
  });
}

export function useDeleteKnowledgeArticle() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteKnowledgeArticle(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles", currentBranchId] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-article-tags-mappings"] });
    },
  });
}

// =============================================
// KMS REVISION VERSIONS HOOKS
// =============================================
export function useKnowledgeVersions(articleId: string) {
  return useQuery({
    queryKey: ["knowledge-versions", articleId],
    queryFn: async () => {
      if (!articleId) return [];
      const res = await fetchKnowledgeVersions(articleId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!articleId,
    staleTime: 30_000,
  });
}

// =============================================
// KMS FILE ATTACHMENTS HOOKS
// =============================================
export function useKnowledgeFiles(articleId: string) {
  return useQuery({
    queryKey: ["knowledge-files", articleId],
    queryFn: async () => {
      if (!articleId) return [];
      const res = await fetchKnowledgeFiles(articleId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!articleId,
    staleTime: 30_000,
  });
}

export function useCreateKnowledgeFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: Omit<KnowledgeFile, "id" | "created_at">) => {
      const res = await createKnowledgeFile(file);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-files", data.articleId] });
    },
  });
}

export function useDeleteKnowledgeFile(articleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteKnowledgeFile(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-files", articleId] });
    },
  });
}
