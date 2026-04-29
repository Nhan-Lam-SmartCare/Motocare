import { supabase } from "../../supabaseClient";
import type { CashTransaction } from "../../types";
import { RepoResult, success, failure } from "./types";
import { safeAudit } from "./auditLogsRepository";
import { canonicalizeMotocareCashTxCategory } from "../finance/cashTxCategories";

const TABLE = "cash_transactions";
const READ_TABLE = "cash_transactions_ledger";
const INCOME_CATEGORIES = new Set([
  "sale_income",
  "service_income",
  "other_income",
  "debt_collection",
  "service_deposit",
  "employee_advance_repayment",
  "general_income",
  "deposit",
]);
const EXPENSE_CATEGORIES = new Set([
  "inventory_purchase",
  "supplier_payment",
  "debt_payment",
  "salary",
  "employee_advance",
  "loan_payment",
  "rent",
  "utilities",
  "outsourcing",
  "service_cost",
  "sale_refund",
  "other_expense",
  "general_expense",
]);

export interface CreateCashTxInput {
  type: CashTransaction["type"]; // "income" | "expense"
  amount: number;
  branchId: string;
  paymentSourceId: string; // maps to paymentSource column in DB
  date?: string;
  notes?: string;
  category?: string; // e.g. sale_income, debt_collection
  saleId?: string;
  workOrderId?: string;
  payrollRecordId?: string;
  loanPaymentId?: string;
  supplierId?: string;
  customerId?: string;
  recipient?: string; // human readable target
}

// Fetch cash transactions (optional filters)
export async function fetchCashTransactions(params?: {
  branchId?: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
  type?: "income" | "expense";
}): Promise<RepoResult<CashTransaction[]>> {
  try {
    const runQuery = async (table: string) => {
      const effectiveLimit = params?.limit ?? 10000;
      const batchSize = Math.min(1000, effectiveLimit);
      const rows: any[] = [];
      let offset = 0;

      while (rows.length < effectiveLimit) {
        let query = supabase
          .from(table)
          .select("*")
          .order("date", { ascending: false });

        // Filter by branchId - PostgreSQL stores column as lowercase "branchid"
        if (params?.branchId) {
          query = query.eq("branchid", params.branchId);
        }
        if (params?.startDate) query = query.gte("date", params.startDate);
        if (params?.endDate) query = query.lte("date", params.endDate);

        const remaining = effectiveLimit - rows.length;
        const currentBatchSize = Math.min(batchSize, remaining);
        const from = offset;
        const to = offset + currentBatchSize - 1;

        const { data, error } = await query.range(from, to);
        if (error) {
          return { data: null, error };
        }

        const batch = data || [];
        rows.push(...batch);

        if (batch.length < currentBatchSize) {
          break;
        }

        offset += batch.length;
      }

      return { data: rows, error: null };
    };

    // Prefer normalized ledger view for consistent reads.
    // Safe fallback to base table when the view hasn't been deployed yet.
    let { data, error } = await runQuery(READ_TABLE);
    if (error && (error as any)?.message?.toLowerCase?.().includes("does not exist")) {
      ({ data, error } = await runQuery(TABLE));
    }

    if (error)
      return failure({
        code: "supabase",
        message: "Không thể tải sổ quỹ",
        cause: error,
      });

    // Map DB columns to TypeScript interface (handle both lowercase and camelCase)
    let mappedData = (data || []).map((row: any) => {
      const normalizedType = String(row.type || "")
        .trim()
        .toLowerCase();
      const canonicalCategory = canonicalizeMotocareCashTxCategory(row.category);
      const normalizedCategory = String(canonicalCategory || row.category || "")
        .trim()
        .toLowerCase();

      let normalizedTxType: "income" | "expense" = "expense";
      if (INCOME_CATEGORIES.has(normalizedCategory)) {
        normalizedTxType = "income";
      } else if (EXPENSE_CATEGORIES.has(normalizedCategory)) {
        normalizedTxType = "expense";
      } else if (normalizedType === "income" || normalizedType === "deposit") {
        normalizedTxType = "income";
      }

      return {
        ...row,
        paymentSourceId:
          row.paymentsource || row.paymentSource || row.paymentSourceId || "cash",
        branchId: row.branchid || row.branchId || row.branch_id,
        type: normalizedTxType,
      };
    }) as CashTransaction[];

    // Filter by type at client level (for backwards compatibility)
    if (params?.type) {
      mappedData = mappedData.filter((tx) => tx.type === params.type);
    }

    return success(mappedData);
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối khi tải sổ quỹ",
      cause: e,
    });
  }
}

export async function createCashTransaction(
  input: CreateCashTxInput
): Promise<RepoResult<CashTransaction>> {
  try {
    if (!input.amount || input.amount <= 0)
      return failure({ code: "validation", message: "Số tiền phải > 0" });
    if (!input.branchId)
      return failure({ code: "validation", message: "Thiếu chi nhánh" });
    if (!input.paymentSourceId)
      return failure({ code: "validation", message: "Thiếu nguồn tiền" });
    if (!input.type)
      return failure({ code: "validation", message: "Thiếu loại thu/chi" });

    // Build payload with lowercase column names (PostgreSQL converts to lowercase)
    // DB columns: id, type, category, amount, date, description, branchid, paymentsource, reference, created_at, recipient
    const payload: any = {
      id: crypto.randomUUID(),
      type: input.type, // Required: "income" or "expense"
      amount: input.amount,
      branchid: input.branchId,
      paymentsource: input.paymentSourceId,
      category:
        canonicalizeMotocareCashTxCategory(input.category) ||
        (input.type === "income" ? "general_income" : "general_expense"),
      date: input.date || new Date().toISOString(),
      description: input.notes || "",
      notes: input.notes || "",
      recipient: input.recipient || null,
      saleid: input.saleId || null,
      workorderid: input.workOrderId || null,
      payrollrecordid: input.payrollRecordId || null,
      loanpaymentid: input.loanPaymentId || null,
      supplierid: input.supplierId || null,
      customerid: input.customerId || null,
    };

    const { data, error } = await supabase
      .from(TABLE)
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("[CashTx] Supabase error:", error);
      console.error(
        "[CashTx] Error details - code:",
        error.code,
        "message:",
        error.message,
        "details:",
        error.details,
        "hint:",
        error.hint
      );
    }

    if (error || !data)
      return failure({
        code: "supabase",
        message: "Ghi sổ quỹ thất bại",
        cause: error,
      });

    // Map lowercase DB columns to camelCase for TypeScript interface
    const created: CashTransaction = {
      ...data,
      branchId: data.branchid || data.branchId,
      paymentSourceId:
        data.paymentsource ||
        data.paymentSource ||
        data.paymentSourceId ||
        "cash",
    };

    // Best-effort audit: manual cash entry (exclude those tied to sale/debt if category already specific?)
    try {
      // Determine if this is manual: no saleId/workOrderId/payrollRecordId/loanPaymentId
      const isManual =
        !payload.saleId &&
        !payload.workOrderId &&
        !payload.payrollRecordId &&
        !payload.loanPaymentId;
      if (isManual) {
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes?.user?.id || null;
        void safeAudit(userId, {
          action: "cash.manual",
          tableName: TABLE,
          recordId: created.id,
          oldData: null,
          newData: created,
        });
      }
    } catch (auditError) {
      console.warn("[CashTx] Audit failed for cash.manual:", auditError);
    }
    return success(created);
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối khi ghi sổ quỹ",
      cause: e,
    });
  }
}

export interface UpdateCashTxInput {
  id: string;
  type?: CashTransaction["type"];
  amount?: number;
  paymentSourceId?: string;
  date?: string;
  notes?: string;
  category?: string;
  recipient?: string;
}

// Update cash transaction
export async function updateCashTransaction(
  input: UpdateCashTxInput
): Promise<RepoResult<CashTransaction>> {
  try {
    if (!input.id) {
      return failure({ code: "validation", message: "Thiếu ID giao dịch" });
    }

    // Build payload with only provided fields, using lowercase column names
    const payload: any = {};
    if (input.type !== undefined) payload.type = input.type;
    if (input.amount !== undefined) payload.amount = input.amount;
    if (input.paymentSourceId !== undefined)
      payload.paymentsource = input.paymentSourceId;
    if (input.date !== undefined) payload.date = input.date;
    if (input.notes !== undefined) payload.description = input.notes;
    if (input.category !== undefined)
      payload.category =
        canonicalizeMotocareCashTxCategory(input.category) ?? input.category;
    if (input.recipient !== undefined) payload.recipient = input.recipient;

    // Get old data for audit
    const { data: oldData } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", input.id)
      .single();

    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq("id", input.id)
      .select()
      .single();

    if (error || !data) {
      return failure({
        code: "supabase",
        message: "Cập nhật giao dịch thất bại",
        cause: error,
      });
    }

    // Map to TypeScript interface
    const updated: CashTransaction = {
      ...data,
      branchId: data.branchid || data.branchId,
      paymentSourceId:
        data.paymentsource ||
        data.paymentSource ||
        data.paymentSourceId ||
        "cash",
    };

    // Keep revenue reports consistent when user edits date of a sale-linked cash tx.
    // Resolve linked sale by saleid first, then fallback to reference / sale_code in notes.
    if (input.date && oldData) {
      let linkedSaleId: string | null =
        (oldData as any).saleid || (oldData as any).saleId || null;

      // Fallback 1: resolve from reference (may store sale UUID or sale_code)
      if (!linkedSaleId) {
        const ref = String((oldData as any).reference || "").trim();
        if (ref) {
          const { data: saleByRef } = await supabase
            .from("sales")
            .select("id")
            .or(`id.eq.${ref},sale_code.eq.${ref}`)
            .limit(1)
            .maybeSingle();
          linkedSaleId = (saleByRef as any)?.id || null;
        }
      }

      // Fallback 2: parse BH code in description/notes (e.g. BH-20260414-001)
      if (!linkedSaleId) {
        const desc = String((oldData as any).description || (oldData as any).notes || "");
        const saleCodeMatch = desc.match(/(BH-\d{8}-\d{3})/i);
        const saleCode = saleCodeMatch?.[1] || null;
        if (saleCode) {
          const { data: saleByCode } = await supabase
            .from("sales")
            .select("id")
            .eq("sale_code", saleCode)
            .limit(1)
            .maybeSingle();
          linkedSaleId = (saleByCode as any)?.id || null;
        }
      }

      if (linkedSaleId) {
        const { error: saleUpdateError } = await supabase
          .from("sales")
          .update({ date: input.date })
          .eq("id", linkedSaleId);

        if (saleUpdateError) {
          console.warn(
            "[CashTx] Updated cash tx date but failed to sync sales.date:",
            saleUpdateError
          );
        }
      } else {
        console.warn(
          "[CashTx] Updated cash tx date but could not resolve linked sale from saleid/reference/description"
        );
      }
    }

    // Audit
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id || null;
      void safeAudit(userId, {
        action: "cash.update",
        tableName: TABLE,
        recordId: updated.id,
        oldData,
        newData: updated,
      });
    } catch (auditError) {
      console.warn("[CashTx] Audit failed for cash.update:", auditError);
    }

    return success(updated);
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối khi cập nhật giao dịch",
      cause: e,
    });
  }
}

// Delete cash transaction
export async function deleteCashTransaction(
  id: string
): Promise<RepoResult<{ id: string }>> {
  try {
    if (!id) {
      return failure({ code: "validation", message: "Thiếu ID giao dịch" });
    }

    // Get old data for audit
    const { data: oldData } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .single();

    const { error } = await supabase.from(TABLE).delete().eq("id", id);

    if (error) {
      return failure({
        code: "supabase",
        message: "Xóa giao dịch thất bại",
        cause: error,
      });
    }

    // Audit
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id || null;
      void safeAudit(userId, {
        action: "cash.delete",
        tableName: TABLE,
        recordId: id,
        oldData,
        newData: null,
      });
    } catch (auditError) {
      console.warn("[CashTx] Audit failed for cash.delete:", auditError);
    }

    return success({ id });
  } catch (e: any) {
    return failure({
      code: "network",
      message: "Lỗi kết nối khi xóa giao dịch",
      cause: e,
    });
  }
}
