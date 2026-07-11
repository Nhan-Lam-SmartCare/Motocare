import { supabase } from "../../supabaseClient";
import { RepoResult, success, failure } from "./types";
import type { AiModel, AiPrompt, AiKeySetting, AiLog } from "../../types/ai";

// =============================================
// AI MODELS
// =============================================
export async function fetchAiModels(): Promise<RepoResult<AiModel[]>> {
  try {
    const { data, error } = await supabase
      .from("ai_models")
      .select("*")
      .order("provider", { ascending: true });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải cấu hình AI Models", cause: error });
    }

    const models: AiModel[] = (data || []).map((item: any) => ({
      id: item.id,
      provider: item.provider,
      modelName: item.model_name,
      displayName: item.display_name,
      isActive: item.is_active,
      created_at: item.created_at,
    }));

    return success(models);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải AI Models", cause: e });
  }
}

export async function updateAiModel(id: string, isActive: boolean): Promise<RepoResult<AiModel>> {
  try {
    const { data, error } = await supabase
      .from("ai_models")
      .update({ is_active: isActive })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể cập nhật cấu hình Model", cause: error });
    }

    return success({
      id: data.id,
      provider: data.provider,
      modelName: data.model_name,
      displayName: data.display_name,
      isActive: data.is_active,
      created_at: data.created_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi cập nhật cấu hình Model", cause: e });
  }
}

// =============================================
// AI PROMPT LIBRARY
// =============================================
export async function fetchAiPrompts(): Promise<RepoResult<AiPrompt[]>> {
  try {
    const { data, error } = await supabase
      .from("ai_prompt_library")
      .select("*")
      .order("category", { ascending: true });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải thư viện Prompt", cause: error });
    }

    const prompts: AiPrompt[] = (data || []).map((item: any) => ({
      id: item.id,
      category: item.category,
      name: item.name,
      systemPrompt: item.system_prompt,
      userPromptTemplate: item.user_prompt_template,
      temperature: Number(item.temperature),
      isDefault: item.is_default,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));

    return success(prompts);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải thư viện Prompt", cause: e });
  }
}

export async function createAiPrompt(prompt: Omit<AiPrompt, "id" | "created_at" | "updated_at">): Promise<RepoResult<AiPrompt>> {
  try {
    const { data, error } = await supabase
      .from("ai_prompt_library")
      .insert({
        category: prompt.category,
        name: prompt.name,
        system_prompt: prompt.systemPrompt,
        user_prompt_template: prompt.userPromptTemplate,
        temperature: prompt.temperature,
        is_default: prompt.isDefault,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể tạo Prompt mới", cause: error });
    }

    return success({
      id: data.id,
      category: data.category,
      name: data.name,
      systemPrompt: data.system_prompt,
      userPromptTemplate: data.user_prompt_template,
      temperature: Number(data.temperature),
      isDefault: data.is_default,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tạo Prompt", cause: e });
  }
}

export async function updateAiPrompt(
  id: string,
  updates: Partial<Omit<AiPrompt, "id" | "created_at" | "updated_at">>
): Promise<RepoResult<AiPrompt>> {
  try {
    const payload: any = {};
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.systemPrompt !== undefined) payload.system_prompt = updates.systemPrompt;
    if (updates.userPromptTemplate !== undefined) payload.user_prompt_template = updates.userPromptTemplate;
    if (updates.temperature !== undefined) payload.temperature = updates.temperature;
    if (updates.isDefault !== undefined) payload.is_default = updates.isDefault;

    const { data, error } = await supabase
      .from("ai_prompt_library")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể cập nhật Prompt", cause: error });
    }

    return success({
      id: data.id,
      category: data.category,
      name: data.name,
      systemPrompt: data.system_prompt,
      userPromptTemplate: data.user_prompt_template,
      temperature: Number(data.temperature),
      isDefault: data.is_default,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi cập nhật Prompt", cause: e });
  }
}

export async function deleteAiPrompt(id: string): Promise<RepoResult<void>> {
  try {
    const { error } = await supabase.from("ai_prompt_library").delete().eq("id", id);
    if (error) {
      return failure({ code: "supabase", message: "Không thể xóa Prompt", cause: error });
    }
    return success(undefined);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi xóa Prompt", cause: e });
  }
}

// =============================================
// AI KEYS
// =============================================
export async function fetchAiKeys(): Promise<RepoResult<AiKeySetting[]>> {
  try {
    const { data, error } = await supabase
      .from("ai_keys")
      .select("*")
      .order("provider", { ascending: true });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải API Keys settings", cause: error });
    }

    const keys: AiKeySetting[] = (data || []).map((item: any) => ({
      id: item.id,
      provider: item.provider,
      apiKeyMasked: item.api_key_masked,
      apiEndpoint: item.api_endpoint,
      updated_at: item.updated_at,
    }));

    return success(keys);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải API Keys", cause: e });
  }
}

export async function saveAiKey(
  provider: string,
  keyVal: string,
  keyMasked: string,
  endpoint?: string
): Promise<RepoResult<AiKeySetting>> {
  try {
    const { data, error } = await supabase
      .from("ai_keys")
      .upsert(
        {
          provider,
          api_key_value: keyVal,
          api_key_masked: keyMasked,
          api_endpoint: endpoint || null,
        },
        { onConflict: "provider" }
      )
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể lưu API Key", cause: error });
    }

    return success({
      id: data.id,
      provider: data.provider,
      apiKeyMasked: data.api_key_masked,
      apiEndpoint: data.api_endpoint,
      updated_at: data.updated_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi lưu API Key", cause: e });
  }
}

// Fetch real key value for AI service use (not exposed to UI)
export async function fetchAiKeyValue(provider: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("ai_keys")
      .select("api_key_value, api_endpoint")
      .eq("provider", provider)
      .single();

    if (error || !data) return null;
    return data.api_key_value || null;
  } catch {
    return null;
  }
}

export async function fetchAiKeyConfig(provider: string): Promise<{
  apiKey: string | null;
  endpoint: string | null;
  errorMessage?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("ai_keys")
      .select("api_key_value, api_endpoint")
      .eq("provider", provider)
      .maybeSingle();

    if (error) {
      const message = String(error.message || "");
      if (message.includes("api_key_value")) {
        return {
          apiKey: null,
          endpoint: null,
          errorMessage: "Thiếu cột ai_keys.api_key_value. Hãy chạy migration sql/2026-07-10_ai_key_value_column.sql rồi lưu lại API key.",
        };
      }
      return { apiKey: null, endpoint: null, errorMessage: `Không đọc được API key ${provider}: ${message}` };
    }

    if (!data?.api_key_value) {
      return {
        apiKey: null,
        endpoint: data?.api_endpoint || null,
        errorMessage: `Chưa lưu API key thật cho ${provider}. Vào SmartCare AI > API Keys, chọn ${provider}, nhập key rồi bấm Lưu cấu hình.`,
      };
    }

    return { apiKey: data.api_key_value, endpoint: data.api_endpoint || null };
  } catch (e: any) {
    return { apiKey: null, endpoint: null, errorMessage: e?.message || `Không đọc được API key ${provider}` };
  }
}

// =============================================
// AI GENERATION LOGS
// =============================================
export async function fetchAiLogs(): Promise<RepoResult<AiLog[]>> {
  try {
    const { data, error } = await supabase
      .from("ai_generation_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return failure({ code: "supabase", message: "Không thể tải nhật ký AI generation logs", cause: error });
    }

    const logs: AiLog[] = (data || []).map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      feature: item.feature,
      modelUsed: item.model_used,
      promptTokens: item.prompt_tokens,
      completionTokens: item.completion_tokens,
      costUsd: Number(item.cost_usd),
      latencyMs: item.latency_ms,
      status: item.status,
      errorMessage: item.error_message,
      branchId: item.branch_id,
      created_at: item.created_at,
    }));

    return success(logs);
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi tải logs", cause: e });
  }
}

export async function createAiLog(log: Omit<AiLog, "id" | "created_at">): Promise<RepoResult<AiLog>> {
  try {
    const { data, error } = await supabase
      .from("ai_generation_logs")
      .insert({
        user_id: log.userId || null,
        feature: log.feature,
        model_used: log.modelUsed,
        prompt_tokens: log.promptTokens,
        completion_tokens: log.completionTokens,
        cost_usd: log.costUsd,
        latency_ms: log.latencyMs,
        status: log.status,
        error_message: log.errorMessage || null,
        branch_id: log.branchId,
      })
      .select()
      .single();

    if (error || !data) {
      return failure({ code: "supabase", message: "Không thể ghi nhật ký AI log", cause: error });
    }

    return success({
      id: data.id,
      userId: data.user_id,
      feature: data.feature,
      modelUsed: data.model_used,
      promptTokens: data.prompt_tokens,
      completionTokens: data.completion_tokens,
      costUsd: Number(data.cost_usd),
      latencyMs: data.latency_ms,
      status: data.status,
      errorMessage: data.error_message,
      branchId: data.branch_id,
      created_at: data.created_at,
    });
  } catch (e: any) {
    return failure({ code: "network", message: "Lỗi kết nối khi lưu log", cause: e });
  }
}
