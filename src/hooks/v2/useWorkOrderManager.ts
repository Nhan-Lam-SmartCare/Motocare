import { useCallback, useMemo, useState } from "react";
import {
  useCreateWorkOrderAtomicRepo,
  useUpdateWorkOrderAtomicRepo,
  useRefundWorkOrderRepo,
} from "../useWorkOrdersRepository";

/**
 * V2 orchestration hook for the repair work-order screen.
 *
 * GOAL (per Ke hoach.md, Giai đoạn 2): extract ALL business logic from the
 * ServiceManager "God Component" into this hook. Composes existing repository
 * hooks so the atomic-RPC + dual-write (JSONB + work_order_items) behavior
 * lives in exactly one place.
 *
 * Scope of logic to migrate here from ServiceManager.tsx:
 *   - parts-used list (add / remove / change qty)
 *   - labor cost + technician assignment
 *   - discount + total calculation (parts + labor - discount)
 *   - deposit handling and remaining-amount tracking
 *   - create via work_order_create_atomic, complete payment, refund
 *
 * SKELETON: state + totals wired; TODOs mark logic to lift incrementally.
 */

export interface WorkOrderPartLine {
  /** null for quick services not present in the parts catalog */
  partId: string | null;
  partName: string;
  sku: string;
  category?: string;
  price: number;
  costPrice?: number;
  quantity: number;
}

export interface UseWorkOrderManagerResult {
  parts: WorkOrderPartLine[];
  laborCost: number;
  discount: number;
  technicianName: string;
  partsTotal: number;
  total: number;
  isSubmitting: boolean;
  addPart: (line: WorkOrderPartLine) => void;
  removePart: (index: number) => void;
  setQuantity: (index: number, quantity: number) => void;
  setLaborCost: (value: number) => void;
  setDiscount: (value: number) => void;
  setTechnicianName: (name: string) => void;
  reset: () => void;
  submitWorkOrder: (opts: SubmitWorkOrderOptions) => Promise<unknown>;
}

export interface SubmitWorkOrderOptions {
  branchId: string;
  userId: string;
  customerName: string;
  customerPhone?: string;
  vehicleModel?: string;
  licensePlate?: string;
  issueDescription?: string;
  depositAmount?: number;
  note?: string;
}

export function useWorkOrderManager(): UseWorkOrderManagerResult {
  const [parts, setParts] = useState<WorkOrderPartLine[]>([]);
  const [laborCost, setLaborCost] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [technicianName, setTechnicianName] = useState("");

  const createWorkOrder = useCreateWorkOrderAtomicRepo();
  // Kept for edit/refund flows ServiceManager will delegate here later.
  const _updateWorkOrder = useUpdateWorkOrderAtomicRepo();
  const _refundWorkOrder = useRefundWorkOrderRepo();

  const partsTotal = useMemo(
    () => parts.reduce((sum, p) => sum + p.price * p.quantity, 0),
    [parts]
  );
  const total = useMemo(
    () => Math.max(0, partsTotal + laborCost - discount),
    [partsTotal, laborCost, discount]
  );

  const addPart = useCallback((line: WorkOrderPartLine) => {
    setParts((prev) => {
      if (line.partId) {
        const idx = prev.findIndex((p) => p.partId === line.partId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + line.quantity };
          return next;
        }
      }
      return [...prev, line];
    });
  }, []);

  const removePart = useCallback((index: number) => {
    setParts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const setQuantity = useCallback((index: number, quantity: number) => {
    setParts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, quantity: Math.max(1, quantity) } : p))
    );
  }, []);

  const reset = useCallback(() => {
    setParts([]);
    setLaborCost(0);
    setDiscount(0);
    setTechnicianName("");
  }, []);

  const submitWorkOrder = useCallback(
    async (opts: SubmitWorkOrderOptions) => {
      // TODO: mirror the exact work_order_create_atomic payload ServiceManager
      // builds today (id gen, partsUsed mapping, labor, deposit, status).
      // Keep the shape identical so V1 UI + V2 RPC contract stays 1:1.
      const payload = {
        p_parts_used: parts.map((p) => ({
          partId: p.partId,
          partName: p.partName,
          sku: p.sku,
          category: p.category,
          price: p.price,
          costPrice: p.costPrice,
          quantity: p.quantity,
        })),
        p_labor_cost: laborCost,
        p_discount: discount,
        p_technician_name: technicianName,
        p_branch_id: opts.branchId,
        p_user_id: opts.userId,
        p_customer_name: opts.customerName,
        p_customer_phone: opts.customerPhone ?? null,
        p_vehicle_model: opts.vehicleModel ?? null,
        p_license_plate: opts.licensePlate ?? null,
        p_issue_description: opts.issueDescription ?? null,
        p_deposit_amount: opts.depositAmount ?? 0,
        p_note: opts.note ?? null,
      };
      const res = await createWorkOrder.mutateAsync(payload as never);
      reset();
      return res;
    },
    [parts, laborCost, discount, technicianName, createWorkOrder, reset]
  );

  return {
    parts,
    laborCost,
    discount,
    technicianName,
    partsTotal,
    total,
    isSubmitting: createWorkOrder.isPending,
    addPart,
    removePart,
    setQuantity,
    setLaborCost,
    setDiscount,
    setTechnicianName,
    reset,
    submitWorkOrder,
  };
}
