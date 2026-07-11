import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "../contexts/AppContext";
import {
  fetchAiModels,
  updateAiModel,
  fetchAiPrompts,
  createAiPrompt,
  updateAiPrompt,
  deleteAiPrompt,
  fetchAiKeys,
  saveAiKey,
  fetchAiLogs,
} from "../lib/repository/aiRepository";
import { generateAiResponse } from "../lib/services/aiService";
import type { AiModel, AiPrompt, AiKeySetting } from "../types/ai";

// =============================================
// AI MODELS HOOKS
// =============================================
export function useAiModels() {
  return useQuery({
    queryKey: ["ai-models"],
    queryFn: async () => {
      const res = await fetchAiModels();
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 5_000,
    refetchOnMount: "always",
  });
}

export function useUpdateAiModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await updateAiModel(id, isActive);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-models"] });
    },
  });
}

// =============================================
// AI PROMPTS HOOKS
// =============================================
export function useAiPrompts() {
  return useQuery({
    queryKey: ["ai-prompts"],
    queryFn: async () => {
      const res = await fetchAiPrompts();
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCreateAiPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prompt: Omit<AiPrompt, "id" | "created_at" | "updated_at">) => {
      const res = await createAiPrompt(prompt);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-prompts"] });
    },
  });
}

export function useUpdateAiPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<AiPrompt, "id" | "created_at" | "updated_at">>;
    }) => {
      const res = await updateAiPrompt(id, updates);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-prompts"] });
    },
  });
}

export function useDeleteAiPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteAiPrompt(id);
      if (!res.ok) throw new Error(res.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-prompts"] });
    },
  });
}

// =============================================
// AI KEYS HOOKS
// =============================================
export function useAiKeys() {
  return useQuery({
    queryKey: ["ai-keys"],
    queryFn: async () => {
      const res = await fetchAiKeys();
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useSaveAiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      provider,
      keyVal,
      endpoint,
    }: {
      provider: string;
      keyVal: string;
      endpoint?: string;
    }) => {
      const keyMasked = keyVal.length > 8
        ? `${keyVal.slice(0, 4)}${'•'.repeat(keyVal.length - 8)}${keyVal.slice(-4)}`
        : '••••••••';
      const res = await saveAiKey(provider, keyVal, keyMasked, endpoint);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-keys"] });
    },
  });
}

// =============================================
// AI LOGS HOOKS
// =============================================
export function useAiLogs() {
  const { currentBranchId } = useAppContext();

  return useQuery({
    queryKey: ["ai-logs", currentBranchId],
    queryFn: async () => {
      const res = await fetchAiLogs();
      if (!res.ok) throw new Error(res.error.message);
      return res.data.filter((item) => item.branchId === currentBranchId);
    },
    staleTime: 30_000,
  });
}

// =============================================
// AI GENERATION ACTION INVOCATION HOOK
// =============================================
export function useGenerateAiAction() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useAppContext();

  return useMutation({
    mutationFn: async ({
      feature,
      modelName,
      variables,
    }: {
      feature: string;
      modelName: string;
      variables: Record<string, any>;
    }) => {
      return await generateAiResponse(feature, modelName, variables, currentBranchId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-logs", currentBranchId] });
    },
  });
}
