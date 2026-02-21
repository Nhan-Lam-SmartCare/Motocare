/**
 * Purchase Orders Repository
 * Quản lý đơn đặt hàng từ nhà cung cấp
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import type {
  PurchaseOrder,
  PurchaseOrderItem,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
} from "../types";

// =====================================================
// Query Keys
// =====================================================
export const PURCHASE_ORDERS_QUERY_KEY = "purchase_orders";
export const PURCHASE_ORDER_ITEMS_QUERY_KEY = "purchase_order_items";

// =====================================================
// Fetch all Purchase Orders
// =====================================================
export function usePurchaseOrders(branchId?: string) {
  return useQuery({
    queryKey: [PURCHASE_ORDERS_QUERY_KEY, branchId],
    queryFn: async () => {
      let query = supabase
        .from("purchase_orders")
        .select(
          `
          *,
          supplier:suppliers(*),
          items:purchase_order_items(
            *,
            part:parts(*)
          )
        `
        )
        .order("created_at", { ascending: false });

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user info for creators
      const pos = (data || []) as PurchaseOrder[];
      const userIds = [
        ...new Set(pos.map((po) => po.created_by).filter(Boolean)),
      ];

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("user_profiles")
          .select("id, email, full_name")
          .in("id", userIds);

        if (users) {
          const userMap = new Map(users.map((u) => [u.id, u]));
          pos.forEach((po) => {
            if (po.created_by) {
              const user = userMap.get(po.created_by);
              if (user) {
                po.creator = { email: user.email, name: user.full_name };
              }
            }
          });
        }
      }

      return pos;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// =====================================================
// Fetch single Purchase Order by ID
// =====================================================
export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: [PURCHASE_ORDERS_QUERY_KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(
          `
          *,
          supplier:suppliers(*),
          items:purchase_order_items(
            *,
            part:parts(*)
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      const po = data as PurchaseOrder;

      // Fetch creator info
      if (po.created_by) {
        const { data: user } = await supabase
          .from("user_profiles")
          .select("id, email, full_name")
          .eq("id", po.created_by)
          .single();

        if (user) {
          po.creator = { email: user.email, name: user.full_name };
        }
      }

      return po;
    },
    enabled: !!id,
  });
}

// =====================================================
// Fetch PO Items for a specific PO
// =====================================================
export function usePurchaseOrderItems(poId: string) {
  return useQuery({
    queryKey: [PURCHASE_ORDER_ITEMS_QUERY_KEY, poId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_order_items")
        .select(
          `
          *,
          part:parts(*)
        `
        )
        .eq("po_id", poId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as PurchaseOrderItem[];
    },
    enabled: !!poId,
  });
}

// =====================================================
// Check if part has pending/ordered POs
// Returns list of POs that contain this part
// =====================================================
export async function checkPartInPendingPOs(partId: string, branchId: string) {
  const { data, error } = await supabase
    .from("purchase_order_items")
    .select(
      `
      *,
      purchase_order:purchase_orders!inner(
        *,
        supplier:suppliers(name)
      )
    `
    )
    .eq("part_id", partId)
    .eq("purchase_order.branch_id", branchId)
    .in("purchase_order.status", ["draft", "ordered"]);

  if (error) throw error;
  return data || [];
}

// =====================================================
// Create Purchase Order
// =====================================================
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePurchaseOrderInput) => {
      // 1. Create PO header
      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .insert({
          supplier_id: input.supplier_id,
          branch_id: input.branch_id,
          expected_date: input.expected_date,
          notes: input.notes,
          status: "draft",
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (poError) throw poError;

      // 2. Create PO items
      const itemsToInsert = input.items.map((item) => ({
        po_id: po.id,
        part_id: item.part_id,
        quantity_ordered: item.quantity_ordered,
        unit_price: item.unit_price,
        notes: item.notes,
      }));

      const { error: itemsError } = await supabase
        .from("purchase_order_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PURCHASE_ORDERS_QUERY_KEY] });
    },
  });
}

// =====================================================
// Update Purchase Order
// =====================================================
// =====================================================
// Update Purchase Order (Full: Header + Items)
// =====================================================
export function useUpdatePurchaseOrderFull() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: CreatePurchaseOrderInput;
    }) => {
      // 1. Update PO Header
      const { error: poError } = await supabase
        .from("purchase_orders")
        .update({
          supplier_id: input.supplier_id,
          expected_date: input.expected_date,
          notes: input.notes,
        })
        .eq("id", id);

      if (poError) throw poError;

      // 2. Delete existing items
      const { error: deleteError } = await supabase
        .from("purchase_order_items")
        .delete()
        .eq("po_id", id);

      if (deleteError) throw deleteError;

      // 3. Insert new items
      const itemsToInsert = input.items.map((item) => ({
        po_id: id,
        part_id: item.part_id,
        quantity_ordered: item.quantity_ordered,
        unit_price: item.unit_price,
        notes: item.notes,
      }));

      const { error: insertError } = await supabase
        .from("purchase_order_items")
        .insert(itemsToInsert);

      if (insertError) throw insertError;

      return { id, ...input };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PURCHASE_ORDERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PURCHASE_ORDER_ITEMS_QUERY_KEY] });
    },
  });
}

// =====================================================
// Update Purchase Order (Header only)
// =====================================================
export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePurchaseOrderInput) => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PURCHASE_ORDERS_QUERY_KEY] });
    },
  });
}

// =====================================================
// Update PO Item (e.g., quantity received)
// =====================================================
export function useUpdatePurchaseOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      quantity_received,
      notes,
    }: {
      id: string;
      quantity_received?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("purchase_order_items")
        .update({ quantity_received, notes })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PURCHASE_ORDER_ITEMS_QUERY_KEY],
      });
    },
  });
}

// =====================================================
// Delete Purchase Order (and cascade items)
// =====================================================
export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("purchase_orders")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PURCHASE_ORDERS_QUERY_KEY] });
    },
  });
}

// =====================================================
// Convert PO to Receipt (Inventory Transaction)
// Đồng bộ với luồng nhập kho trực tiếp:
//   - Dùng receipt_create_atomic để cập nhật giá vốn/bán lẻ/sỉ
//   - Hỗ trợ 3 hình thức thanh toán: đủ / một phần / ghi nợ
//   - Ghi supplier_debts nếu còn nợ
// =====================================================
export async function convertPOToReceipt(
  poId: string,
  paymentSource: string = "cash",
  paymentType: "full" | "partial" | "note" = "full",
  partialAmount: number = 0
): Promise<{ receipt: any; cashTxCreated: boolean; cashTxError?: any }> {
  // 1. Fetch PO with items and supplier info
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .select(
      `
      *,
      items:purchase_order_items(
        *,
        part:parts(id, name, sku, stock, "retailPrice", "wholesalePrice", category)
      ),
      supplier:suppliers(id, name)
    `
    )
    .eq("id", poId)
    .single();

  if (poError) throw poError;
  if (!po) throw new Error("PO not found");
  if (po.status === "received") {
    throw new Error("Đơn đặt hàng này đã được nhập kho rồi");
  }

  const supplierName = po.supplier?.name || "Không xác định";
  const totalAmount = Math.max(0, po.final_amount || po.total_amount || 0);
  const currentDate = new Date().toISOString();
  const receiptCode = `PN-${po.po_number}`;
  const baseNotes = `${receiptCode} | NCC:${supplierName} | Nhập kho từ đơn đặt hàng ${po.po_number}`;

  // Tính tiền đã trả và còn nợ
  const rawPaid =
    paymentType === "full"
      ? totalAmount
      : paymentType === "partial"
      ? partialAmount
      : 0;
  const paidAmount = Math.min(Math.max(rawPaid, 0), totalAmount);
  const debtAmount = Math.max(0, totalAmount - paidAmount);

  // 2. Dùng receipt_create_atomic để tạo giao dịch kho VÀ cập nhật giá vốn/bán lẻ/sỉ
  const atomicItems = po.items.map((item: any) => ({
    partId: item.part_id,
    partName: item.part?.name || "Unknown",
    quantity: item.quantity_ordered,
    importPrice: item.unit_price,
    sellingPrice:
      item.part?.retailPrice?.[po.branch_id] ||
      Math.round(item.unit_price * 1.4),
    wholesalePrice:
      item.part?.wholesalePrice?.[po.branch_id] ||
      Math.round(item.unit_price * 1.25),
  }));

  const { data: atomicResult, error: atomicError } = await supabase.rpc(
    "receipt_create_atomic",
    {
      p_items: atomicItems,
      p_supplier_id: po.supplier_id,
      p_branch_id: po.branch_id,
      p_user_id: "system",
      p_notes: baseNotes,
    }
  );

  if (atomicError) throw atomicError;
  if (atomicResult && atomicResult.success === false) {
    throw new Error(atomicResult.message || "Lỗi tạo phiếu nhập kho");
  }

  // 3. Ghi sổ quỹ — chỉ khi có tiền trả
  let cashTxCreated = false;
  let cashTxError: any = null;

  if (paidAmount > 0) {
    const { error: cashErr } = await supabase.from("cash_transactions").insert({
      type: "expense",
      category: "supplier_payment",
      amount: paidAmount,
      date: currentDate,
      notes: `Chi trả NCC ${supplierName} - ${receiptCode}`,
      branchId: po.branch_id,
      paymentSourceId: paymentSource,
      supplierId: po.supplier_id,
      recipient: supplierName,
    });
    cashTxError = cashErr || null;
    cashTxCreated = !cashErr;
    if (cashErr) {
      console.error("Lỗi ghi sổ quỹ:", cashErr);
    }
  }

  // 4. Ghi công nợ NCC — chỉ khi còn nợ
  if (debtAmount > 0) {
    const debtId = `DEBT-${po.po_number}-${Math.random()
      .toString(36)
      .substring(2, 5)
      .toUpperCase()}`;
    const { error: debtError } = await supabase.from("supplier_debts").insert({
      id: debtId,
      supplier_id: po.supplier_id,
      supplier_name: supplierName,
      branch_id: po.branch_id,
      total_amount: debtAmount,
      paid_amount: 0,
      remaining_amount: debtAmount,
      description: `Nợ tiền nhập hàng (${receiptCode})`,
      created_at: currentDate,
    });
    if (debtError) {
      console.error("Lỗi tạo công nợ NCC:", debtError);
    }
  }

  // 5. Cập nhật trạng thái đơn đặt hàng
  const { error: updateError } = await supabase
    .from("purchase_orders")
    .update({
      status: "received",
      received_date: currentDate,
    })
    .eq("id", poId);

  if (updateError) throw updateError;

  return {
    receipt: atomicResult,
    cashTxCreated,
    cashTxError: cashTxError || undefined,
  };
}

// =====================================================
// Hook: useConvertPOToReceipt
// Convert PO to inventory receipt
// =====================================================
export function useConvertPOToReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      poId,
      paymentSource,
      paymentType,
      partialAmount,
    }: {
      poId: string;
      paymentSource: string;
      paymentType: "full" | "partial" | "note";
      partialAmount: number;
    }) => convertPOToReceipt(poId, paymentSource, paymentType, partialAmount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PURCHASE_ORDERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["parts"] });
      queryClient.invalidateQueries({ queryKey: ["partsRepo"] });
      queryClient.invalidateQueries({ queryKey: ["partsRepoPaged"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["cash_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["cashTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["supplierDebts"] });
    },
  });
}
