import { useCallback, useMemo, useState } from "react";
import {
  useCreateSaleAtomicRepo,
  useUpdateSaleAtomicRepo,
} from "../useSalesRepository";

/**
 * V2 orchestration hook for the POS (retail) screen.
 *
 * GOAL (per Ke hoach.md, Giai đoạn 2): move ALL business logic out of the
 * SalesManager "God Component" into this hook, leaving the component to render
 * only. This hook composes the existing repository hooks — it does NOT talk to
 * Supabase directly, so the atomic-RPC + dual-write behavior stays in one place.
 *
 * Scope of logic to migrate here from SalesManager.tsx:
 *   - cart state (add / remove / change qty / clear)
 *   - quick-service line items (part_id = null, name/price preserved)
 *   - discount + subtotal + total calculation
 *   - payment method (cash / bank) + bank QR transfer payload
 *   - submitting via sale_create_atomic (idempotency-safe)
 *
 * This is a SKELETON: state shape and computed totals are wired; the TODOs mark
 * logic to lift from the current component one piece at a time.
 */

export interface POSCartItem {
  /** null for quick services that do not exist in the parts catalog */
  partId: string | null;
  partName: string;
  sku: string;
  price: number;
  costPrice?: number;
  quantity: number;
  /** true for quick service / manual labor lines */
  isQuickService?: boolean;
}

export type PaymentMethod = "cash" | "bank";

export interface UseSalesPOSResult {
  items: POSCartItem[];
  discount: number;
  paymentMethod: PaymentMethod;
  subtotal: number;
  total: number;
  isSubmitting: boolean;
  addItem: (item: POSCartItem) => void;
  removeItem: (index: number) => void;
  setQuantity: (index: number, quantity: number) => void;
  setDiscount: (value: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  clearCart: () => void;
  submitSale: (opts: SubmitSaleOptions) => Promise<unknown>;
}

export interface SubmitSaleOptions {
  branchId: string;
  userId: string;
  customer?: Record<string, unknown>;
  note?: string;
}

export function useSalesPOS(): UseSalesPOSResult {
  const [items, setItems] = useState<POSCartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  const createSale = useCreateSaleAtomicRepo();
  // Kept for the edit flow that SalesManager will delegate here later.
  const _updateSale = useUpdateSaleAtomicRepo();

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.price * it.quantity, 0),
    [items]
  );
  const total = useMemo(
    () => Math.max(0, subtotal - discount),
    [subtotal, discount]
  );

  const addItem = useCallback((item: POSCartItem) => {
    setItems((prev) => {
      // Merge same physical part; quick services always add a new line.
      if (!item.isQuickService && item.partId) {
        const idx = prev.findIndex(
          (p) => p.partId === item.partId && !p.isQuickService
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity };
          return next;
        }
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const setQuantity = useCallback((index: number, quantity: number) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, quantity: Math.max(1, quantity) } : it))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setDiscount(0);
    setPaymentMethod("cash");
  }, []);

  const submitSale = useCallback(
    async (opts: SubmitSaleOptions) => {
      // TODO: build the exact sale_create_atomic payload SalesManager builds
      // today (id generation, items mapping, discount, customer, note). Keep
      // the payload shape identical so V1 UI + V2 RPC contract stays 1:1.
      const payload = {
        p_items: items.map((it) => ({
          partId: it.partId,
          partName: it.partName,
          sku: it.sku,
          price: it.price,
          costPrice: it.costPrice,
          quantity: it.quantity,
        })),
        p_discount: discount,
        p_payment_method: paymentMethod,
        p_branch_id: opts.branchId,
        p_user_id: opts.userId,
        p_customer: opts.customer ?? {},
        p_note: opts.note ?? null,
      };
      const res = await createSale.mutateAsync(payload as never);
      clearCart();
      return res;
    },
    [items, discount, paymentMethod, createSale, clearCart]
  );

  return {
    items,
    discount,
    paymentMethod,
    subtotal,
    total,
    isSubmitting: createSale.isPending,
    addItem,
    removeItem,
    setQuantity,
    setDiscount,
    setPaymentMethod,
    clearCart,
    submitSale,
  };
}
