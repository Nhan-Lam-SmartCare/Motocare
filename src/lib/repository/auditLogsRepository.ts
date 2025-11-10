import { supabase } from "../../supabaseClient";
import { RepoResult, success, failure } from "./types";

export interface AuditLogInput {
  action: string; // e.g. 'sale.delete', 'part.update_price'
  tableName?: string;
  recordId?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string; // optional - can be set server-side or via edge func
  userAgent?: string;
}

export interface AuditLogRecord {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_data: any | null;
  new_data: any | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const TABLE = "audit_logs";

export async function createAuditLog(
  userId: string | null,
  input: AuditLogInput
): Promise<RepoResult<AuditLogRecord>> {
  try {
    const payload: any = {
      user_id: userId,
      action: input.action,
      table_name: input.tableName,
      record_id: input.recordId,
      old_data: input.oldData ? JSON.stringify(input.oldData) : null,
      new_data: input.newData ? JSON.stringify(input.newData) : null,
      ip_address: input.ipAddress || null,
      user_agent:
        input.userAgent ||
        (typeof navigator !== "undefined" ? navigator.userAgent : null),
    };
    const { data, error } = await supabase
      .from(TABLE)
      .insert([payload])
      .select()
      .single();
    if (error || !data) {
      return failure({
        code: "supabase",
        message: "Ghi audit log thất bại",
        cause: error,
      });
    }
    return success(data as AuditLogRecord);
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi mạng khi ghi audit log",
      cause: e,
    });
  }
}

// Best effort helper that never throws inside UI flows
export async function safeAudit(userId: string | null, input: AuditLogInput) {
  try {
    const res = await createAuditLog(userId, input);
    if (!res.ok && (import.meta as any)?.env?.DEV) {
      console.warn("Audit log failed", res.error);
    }
  } catch (e) {
    if ((import.meta as any)?.env?.DEV) {
      console.warn("Audit log exception", e);
    }
  }
}

export async function fetchAuditLogs(params?: {
  action?: string;
  startDate?: string; // ISO
  endDate?: string; // ISO
  limit?: number;
  page?: number; // 1-based page number
  pageSize?: number; // overrides limit if provided
  includeUser?: boolean; // when true, attempt to select from a view with user email/name
}): Promise<RepoResult<AuditLogRecord[]>> {
  try {
    const pageSize = params?.pageSize || params?.limit || 50;
    const page = params?.page && params.page > 0 ? params.page : 1;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const source = params?.includeUser ? "audit_logs_with_user" : TABLE;
    let query = supabase
      .from(source)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (params?.action) query = query.eq("action", params.action);
    if (params?.startDate) query = query.gte("created_at", params.startDate);
    if (params?.endDate) query = query.lte("created_at", params.endDate);
    const { data, error, count } = await query;
    if (error)
      return failure({
        code: "supabase",
        message: "Không thể tải audit logs",
        cause: error,
      });
    return success((data || []) as AuditLogRecord[], {
      total: count,
      page,
      pageSize,
    });
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi mạng khi tải audit logs",
      cause: e,
    });
  }
}
