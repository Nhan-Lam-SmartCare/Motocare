import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import type { WorkOrder, Part, WorkOrderPart, InventoryTransaction } from "../../../types";
import { formatCurrency, formatWorkOrderId, normalizeSearchText } from "../../../utils/format";
import { USER_ROLES } from "../../../constants";
import {
  useCreateWorkOrderAtomicRepo,
  useUpdateWorkOrderAtomicRepo,
} from "../../../hooks/useWorkOrdersRepository";
import { completeWorkOrderPayment } from "../../../lib/repository/workOrdersRepository";
import { useCreateCustomerDebtRepo } from "../../../hooks/useDebtsRepository";
import { showToast } from "../../../utils/toast";
import { supabase } from "../../../supabaseClient";
import {
  validatePhoneNumber,
} from "../../../utils/validation";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import {
  CustomerVehicleSection,
  ServiceInfoSection,
  PartsUsedSection,
  AdditionalServicesSection,
  SummarySidebar,
  MobileSummary,
  MobileActions,
} from "./workorder";

export interface StoreSettings {
  store_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  bank_qr_url?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  bank_branch?: string;
  work_order_prefix?: string;
}

const WorkOrderModal: React.FC<{
  order: WorkOrder;
  onClose: () => void;
  onSave: (order: WorkOrder) => void;
  parts: Part[];
  partsLoading: boolean;
  customers: any[];
  employees: any[];
  upsertCustomer: (customer: any) => Promise<string> | void;
  setCashTransactions: (fn: (prev: any[]) => any[]) => void;
  setPaymentSources: (fn: (prev: any[]) => any[]) => void;
  paymentSources: any[];
  currentBranchId: string;
  storeSettings?: StoreSettings | null;
  invalidateWorkOrders?: () => void;
}> = ({
  order,
  onClose,
  onSave,
  parts,
  partsLoading,
  customers,
  employees,
  upsertCustomer,
  setCashTransactions,
  setPaymentSources,
  paymentSources,
  currentBranchId,
  storeSettings,
  invalidateWorkOrders,
}) => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const isOwner = profile?.role === USER_ROLES.OWNER;
  const { mutateAsync: createWorkOrderAtomicAsync } = useCreateWorkOrderAtomicRepo();
  const { mutateAsync: updateWorkOrderAtomicAsync } = useUpdateWorkOrderAtomicRepo();

  const WORK_ORDER_DRAFT_VERSION = 1 as const;
  const WORK_ORDER_DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

  const profileId = (profile as any)?.id || (profile as any)?.user_id || "anon";

  const draftKey = useMemo(() => {
    const orderKey = order?.id || "new";
    return `workorder_draft_v${WORK_ORDER_DRAFT_VERSION}:${currentBranchId}:${profileId}:${orderKey}:desktop`;
  }, [WORK_ORDER_DRAFT_VERSION, currentBranchId, order?.id, profileId]);

  const draftCheckedRef = useRef(false);
  useEffect(() => {
    draftCheckedRef.current = false;
  }, [draftKey]);

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        v: number;
        updatedAt: number;
        data: any;
      };
      if (parsed?.v !== WORK_ORDER_DRAFT_VERSION) return null;
      if (!parsed?.updatedAt || Date.now() - parsed.updatedAt > WORK_ORDER_DRAFT_TTL_MS) {
        localStorage.removeItem(draftKey);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  };

  const saveDraft = (data: any) => {
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ v: WORK_ORDER_DRAFT_VERSION, updatedAt: Date.now(), data })
      );
    } catch {
      // ignore quota / storage errors
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
  };

  const [formData, setFormData] = useState<Partial<WorkOrder>>(() => {
    if (order?.id) return order;
    return {
      id: order?.id || "",
      customerId: order?.customerId || "",
      customerName: order?.customerName || "",
      customerPhone: order?.customerPhone || "",
      vehicleModel: order?.vehicleModel || "",
      licensePlate: order?.licensePlate || "",
      vehicleId: order?.vehicleId || "",
      currentKm: order?.currentKm || undefined,
      issueDescription: order?.issueDescription || "",
      technicianName: order?.technicianName || "",
      status: order?.status || "Tiếp nhận",
      laborCost: order?.laborCost || 0,
      discount: order?.discount || 0,
      partsUsed: order?.partsUsed || [],
      total: order?.total || 0,
      branchId: order?.branchId || currentBranchId,
      paymentStatus: order?.paymentStatus || "unpaid",
      creationDate: order?.creationDate || new Date().toISOString(),
    };
  });

  const [selectedParts, setSelectedParts] = useState<WorkOrderPart[]>([]);
  const [inventoryTxs, setInventoryTxs] = useState<InventoryTransaction[]>([]);
  const [inventoryTxLoading, setInventoryTxLoading] = useState(false);
  const [inventoryTxError, setInventoryTxError] = useState<string | null>(null);
  const [isDeductingInventory, setIsDeductingInventory] = useState(false);
  const [showInventoryCheck, setShowInventoryCheck] = useState(false);
  const [partialPayment, setPartialPayment] = useState(0);
  const [showPartialPayment, setShowPartialPayment] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);
  const [showDepositInput, setShowDepositInput] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  // Server-side search state
  const [serverCustomers, setServerCustomers] = useState<any[]>([]);
  const [customerSearchInput, setCustomerSearchInput] = useState("");
  const debouncedCustomerSearch = useDebouncedValue(customerSearchInput, 500);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerPage, setCustomerPage] = useState(0);
  const [hasMoreCustomers, setHasMoreCustomers] = useState(true);
  const CUSTOMER_PAGE_SIZE = 20;

  // Sync customer search input with parent search term
  useEffect(() => {
    setCustomerSearchInput(customerSearch);
  }, [customerSearch]);

  const isOrderPaid = order?.paymentStatus === "paid" && (order?.status === "Trả máy" || formData.status === "Trả máy");
  const isOrderRefunded = order?.refunded === true;
  const canEditPriceAndParts = (!isOrderPaid || formData.status !== "Trả máy") && !isOrderRefunded;

  const [freshCustomer, setFreshCustomer] = useState<any>(null);

  useEffect(() => {
    const customerId = formData.customerId;
    if (!customerId) {
      setFreshCustomer(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) setFreshCustomer(data);
      });
    return () => {
      cancelled = true;
    };
  }, [formData.customerId]);

  const allCustomers = useMemo(() => {
    const allCandidates = [
      ...(freshCustomer ? [freshCustomer] : []),
      ...customers,
      ...serverCustomers,
    ];
    return Array.from(new Map(allCandidates.map((c) => [c.id, c])).values());
  }, [freshCustomer, customers, serverCustomers]);

  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const [additionalServices, setAdditionalServices] = useState<
    Array<{
      id: string;
      description: string;
      quantity: number;
      price: number;
      costPrice?: number;
    }>
  >([]);

  // Sync from order prop
  useEffect(() => {
    if (order?.partsUsed) {
      setSelectedParts(order.partsUsed);
    } else {
      setSelectedParts([]);
    }

    if (order?.customerName) {
      setCustomerSearch(order.customerName);
    } else {
      setCustomerSearch("");
    }

    if (order?.additionalServices && Array.isArray(order.additionalServices) && order.additionalServices.length > 0) {
      setAdditionalServices(order.additionalServices);
    } else {
      setAdditionalServices([]);
    }

    if (order?.depositAmount) {
      setDepositAmount(order.depositAmount);
      setShowDepositInput(true);
    } else {
      setDepositAmount(0);
      setShowDepositInput(false);
    }

    if (order?.additionalPayment) {
      setPartialPayment(order.additionalPayment);
      setShowPartialPayment(true);
    } else {
      setPartialPayment(0);
      setShowPartialPayment(false);
    }

    setDiscountType("amount");
    setDiscountPercent(0);
  }, [order]);

  // Fetch inventory tx history
  useEffect(() => {
    let isMounted = true;
    const fetchInventoryTxs = async () => {
      if (!order?.id) return;
      setInventoryTxLoading(true);
      setInventoryTxError(null);
      const { data, error } = await supabase
        .from("inventory_transactions")
        .select(
          "id,type,partId,partName,quantity,date,unitPrice,totalPrice,branchId,notes,workOrderId"
        )
        .eq("workOrderId", order.id)
        .eq("type", "Xuất kho")
        .order("date", { ascending: false });

      if (!isMounted) return;
      if (error) {
        setInventoryTxError((error as any)?.message || "Không thể tải lịch sử xuất kho");
        setInventoryTxs([]);
      } else {
        setInventoryTxs((data || []) as InventoryTransaction[]);
      }
      setInventoryTxLoading(false);
    };

    fetchInventoryTxs();
    return () => {
      isMounted = false;
    };
  }, [order?.id]);

  const exportQtyByPartId = useMemo(() => {
    const map = new Map<string, number>();
    inventoryTxs.forEach((tx) => {
      map.set(tx.partId, (map.get(tx.partId) || 0) + (tx.quantity || 0));
    });
    return map;
  }, [inventoryTxs]);

  const handleRefreshInventoryTxs = async () => {
    if (!order?.id) return;
    setInventoryTxLoading(true);
    setInventoryTxError(null);
    const { data, error } = await supabase
      .from("inventory_transactions")
      .select(
        "id,type,partId,partName,quantity,date,unitPrice,totalPrice,branchId,notes,workOrderId"
      )
      .eq("workOrderId", order.id)
      .eq("type", "Xuất kho")
      .order("date", { ascending: false });
    if (error) {
      setInventoryTxError((error as any)?.message || "Không thể tải lịch sử xuất kho");
      setInventoryTxs([]);
    } else {
      setInventoryTxs((data || []) as InventoryTransaction[]);
    }
    setInventoryTxLoading(false);
  };

  const handleManualDeductInventory = async () => {
    if (!order?.id) return;
    if (formData.paymentStatus !== "paid" && formData.status !== "Trả máy") {
      showToast.warning("Phiếu chưa thanh toán đủ hoặc xe chưa trả nên chưa thể trừ kho");
      return;
    }
    setIsDeductingInventory(true);
    try {
      const result = await completeWorkOrderPayment(
        order.id,
        formData.paymentMethod || "cash",
        0
      );
      if (!result.ok) {
        showToast.warning("Không thể trừ kho: " + (result.error.message || "Lỗi không xác định"));
      } else {
        showToast.success("Đã trừ kho cho phiếu này");
      }
      await handleRefreshInventoryTxs();
    } catch (err: any) {
      showToast.error(err?.message || "Không thể trừ kho");
    } finally {
      setIsDeductingInventory(false);
    }
  };

  // Draft auto-restore
  useEffect(() => {
    if (draftCheckedRef.current) return;
    draftCheckedRef.current = true;

    const draft = loadDraft();
    if (!draft) return;

    if (draft.formData && typeof draft.formData === "object") {
      setFormData((prev) => ({
        ...prev,
        ...draft.formData,
        branchId: currentBranchId,
      }));
    }
    if (typeof draft.customerSearch === "string") setCustomerSearch(draft.customerSearch);
    if (Array.isArray(draft.selectedParts)) setSelectedParts(draft.selectedParts);
    if (Array.isArray(draft.additionalServices)) setAdditionalServices(draft.additionalServices);
    if (typeof draft.depositAmount === "number") setDepositAmount(draft.depositAmount);
    if (typeof draft.showDepositInput === "boolean") setShowDepositInput(draft.showDepositInput);
    if (typeof draft.partialPayment === "number") setPartialPayment(draft.partialPayment);
    if (typeof draft.showPartialPayment === "boolean") setShowPartialPayment(draft.showPartialPayment);
    if (draft.discountType === "amount" || draft.discountType === "percent") {
      setDiscountType(draft.discountType);
    }
    if (typeof draft.discountPercent === "number") setDiscountPercent(draft.discountPercent);
  }, [draftKey, currentBranchId]);

  // Draft auto-save
  useEffect(() => {
    if (!draftCheckedRef.current) return;

    const hasMeaningfulData =
      !!formData.customerName?.trim() ||
      !!formData.customerPhone?.trim() ||
      !!formData.issueDescription?.trim() ||
      !!String(formData.currentKm ?? "").trim() ||
      selectedParts.length > 0 ||
      additionalServices.length > 0 ||
      (depositAmount > 0 && showDepositInput) ||
      (partialPayment > 0 && showPartialPayment) ||
      (formData.laborCost || 0) > 0 ||
      (formData.discount || 0) > 0;

    const timer = setTimeout(() => {
      if (!hasMeaningfulData) {
        try {
          localStorage.removeItem(draftKey);
        } catch {
          // ignore
        }
        return;
      }

      saveDraft({
        formData,
        customerSearch,
        selectedParts,
        additionalServices,
        depositAmount,
        showDepositInput,
        partialPayment,
        showPartialPayment,
        discountType,
        discountPercent,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [
    draftKey,
    formData,
    customerSearch,
    selectedParts,
    additionalServices,
    depositAmount,
    showDepositInput,
    partialPayment,
    showPartialPayment,
    discountType,
    discountPercent,
  ]);

  // Server customers search
  const fetchCustomers = async (page: number, searchTerm: string, isLoadMore = false) => {
    if (!searchTerm.trim()) {
      if (!isLoadMore) setServerCustomers([]);
      return;
    }

    setIsSearchingCustomer(true);
    try {
      const from = page * CUSTOMER_PAGE_SIZE;
      const to = from + CUSTOMER_PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: false })
        .or(
          `name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,vehiclemodel.ilike.%${searchTerm}%,licenseplate.ilike.%${searchTerm}%`
        )
        .range(from, to);

      if (!error && data) {
        if (isLoadMore) {
          setServerCustomers((prev) => {
            const newIds = new Set(data.map((c) => c.id));
            const filteredPrev = prev.filter((c) => !newIds.has(c.id));
            return [...filteredPrev, ...data];
          });
        } else {
          setServerCustomers(data);
        }

        if (data.length < CUSTOMER_PAGE_SIZE || (count !== null && from + data.length >= count)) {
          setHasMoreCustomers(false);
        } else {
          setHasMoreCustomers(true);
        }
      }
    } catch (err) {
      console.error("Error searching customers:", err);
      showToast.error("Lỗi tìm kiếm khách hàng");
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  useEffect(() => {
    if (debouncedCustomerSearch.trim()) {
      fetchCustomers(0, debouncedCustomerSearch.trim(), false);
    } else {
      setServerCustomers([]);
    }
  }, [debouncedCustomerSearch]);

  const handleLoadMoreCustomers = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextPage = customerPage + 1;
    setCustomerPage(nextPage);
    fetchCustomers(nextPage, debouncedCustomerSearch.trim(), true);
  };

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) {
      return allCustomers.slice(0, 10);
    }

    const q = normalizeSearchText(customerSearch);
    return allCustomers.filter(
      (c) =>
        normalizeSearchText(c.name).includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        normalizeSearchText(c.vehicleModel || "").includes(q) ||
        normalizeSearchText(c.licensePlate || "").includes(q) ||
        (c.vehicles &&
          c.vehicles.some(
            (v: any) =>
              normalizeSearchText(v.licensePlate).includes(q) ||
              normalizeSearchText(v.model || "").includes(q) ||
              v.licensePlate?.toLowerCase().includes(q.toLowerCase())
          ))
    );
  }, [allCustomers, customerSearch]);

  // Totals calculations
  const partsTotal = selectedParts.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 0), 0);
  const servicesTotal = additionalServices.reduce(
    (sum, s) => sum + (s.price || 0) * (s.quantity || 0),
    0
  );
  const subtotal = (formData.laborCost || 0) + partsTotal + servicesTotal;
  const discount =
    discountType === "percent"
      ? Math.round((subtotal * discountPercent) / 100)
      : formData.discount || 0;
  const total = Math.max(0, subtotal - discount);

  const totalDeposit = depositAmount ?? order.depositAmount ?? 0;
  const additionalPaymentCumulative =
    formData.status === "Trả máy" && showPartialPayment ? Math.max(0, partialPayment) : 0;

  const maxAdditionalPayment = Math.max(0, total - totalDeposit);
  const additionalPaymentClamped = Math.min(additionalPaymentCumulative, maxAdditionalPayment);
  const totalAdditionalPayment = additionalPaymentClamped;
  const totalPaid = totalDeposit + additionalPaymentClamped;
  const remainingAmount = Math.max(0, total - totalPaid);

  const createCustomerDebt = useCreateCustomerDebtRepo();
  const createCustomerDebtIfNeeded = async (
    workOrder: WorkOrder,
    remainingAmount: number,
    totalAmount: number,
    paidAmount: number
  ) => {
    if (remainingAmount <= 0) return;

    try {
      const safeCustomerId = workOrder.customerPhone || workOrder.id || `CUST-ANON-${Date.now()}`;
      const safeCustomerName =
        workOrder.customerName?.trim() || workOrder.customerPhone || "Khách vãng lai";

      const workOrderNumber =
        formatWorkOrderId(workOrder.id, storeSettings?.work_order_prefix).split("-").pop() || "";

      let description = `${workOrder.vehicleModel || "Xe"} (Phiếu sửa chữa #${workOrderNumber})`;

      if (workOrder.issueDescription) {
        description += `\nVấn đề: ${workOrder.issueDescription}`;
      }

      if (workOrder.partsUsed && workOrder.partsUsed.length > 0) {
        description += "\n\nPhụ tùng đã thay:";
        workOrder.partsUsed.forEach((part) => {
          description += `\n  - ${part.quantity} x ${part.partName} - ${formatCurrency(
            part.price * part.quantity
          )}`;
        });
      }

      if (workOrder.additionalServices && workOrder.additionalServices.length > 0) {
        description += "\n\nDịch vụ:";
        workOrder.additionalServices.forEach((service) => {
          description += `\n  - ${service.quantity} x ${service.description} - ${formatCurrency(
            service.price * service.quantity
          )}`;
        });
      }

      if (workOrder.laborCost && workOrder.laborCost > 0) {
        description += `\n\nCông lao động: ${formatCurrency(workOrder.laborCost)}`;
      }

      if (workOrder.discount && workOrder.discount > 0) {
        description += `\nGiảm giá: -${formatCurrency(workOrder.discount)}`;
      }

      const createdByDisplay = profile?.name || profile?.full_name || "N/A";
      description += `\n\nNV: ${createdByDisplay}`;

      if (workOrder.technicianName) {
        description += `\nNVKỹ thuật: ${workOrder.technicianName}`;
      }

      const payload = {
        customerId: safeCustomerId,
        customerName: safeCustomerName,
        phone: workOrder.customerPhone || null,
        licensePlate: workOrder.licensePlate || null,
        description: description,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        remainingAmount: remainingAmount,
        createdDate: new Date().toISOString().split("T")[0],
        branchId: currentBranchId,
        workOrderId: workOrder.id,
      };

      const result = await createCustomerDebt.mutateAsync(payload as any);
      showToast.success(
        `Đã tạo/cập nhật công nợ ${remainingAmount.toLocaleString()}đ (Mã: ${result?.id || "N/A"})`
      );
    } catch (error) {
      console.error("Error creating/updating customer debt:", error);
      showToast.error("Không thể tạo/cập nhật công nợ tự động");
    }
  };

  const handleSaveOnly = async () => {
    if (submittingRef.current || isSubmitting) {
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      if (!formData.customerName?.trim()) {
        showToast.error("Vui lòng nhập tên khách hàng");
        return;
      }
      if (!formData.customerPhone?.trim()) {
        showToast.error("Vui lòng nhập số điện thoại");
        return;
      }

      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(formData.customerPhone.trim())) {
        showToast.error("Số điện thoại không hợp lệ! (cần 10-11 chữ số)");
        return;
      }

      if (formData.customerName && formData.customerPhone) {
        const existingCustomer = customers.find((c) => c.phone === formData.customerPhone);

        if (!existingCustomer) {
          const vehicleId = `VEH-${Date.now()}`;
          const vehicles = [];
          if (formData.vehicleModel || formData.licensePlate) {
            vehicles.push({
              id: vehicleId,
              model: formData.vehicleModel || "",
              licensePlate: formData.licensePlate || "",
              isPrimary: true,
            });
          }

          await upsertCustomer({
            id: `CUST-${Date.now()}`,
            name: formData.customerName,
            phone: formData.customerPhone,
            vehicles: vehicles.length > 0 ? vehicles : undefined,
            vehicleModel: formData.vehicleModel,
            licensePlate: formData.licensePlate,
            created_at: new Date().toISOString(),
          });
        } else {
          if (formData.vehicleModel && existingCustomer.vehicleModel !== formData.vehicleModel) {
            await upsertCustomer({
              ...existingCustomer,
              vehicleModel: formData.vehicleModel,
              licensePlate: formData.licensePlate,
            });
          }
        }
      }

      let paymentStatus: "unpaid" | "paid" | "partial" = "unpaid";
      const existingPaid = (depositAmount || 0) + (order?.additionalPayment || 0);
      if (existingPaid >= total) {
        paymentStatus = "paid";
      } else if (existingPaid > 0) {
        paymentStatus = "partial";
      }

      const orderId = order?.id || `${storeSettings?.work_order_prefix || "SC"}-${Date.now()}`;

      const workOrderData = {
        id: orderId,
        customername: formData.customerName || "",
        customerphone: formData.customerPhone || "",
        vehicleid: formData.vehicleId,
        vehiclemodel: formData.vehicleModel || "",
        licenseplate: formData.licensePlate || "",
        currentkm: formData.currentKm,
        issuedescription: formData.issueDescription || "",
        technicianname: formData.technicianName || "",
        status: formData.status || "Tiếp nhận",
        laborcost: formData.laborCost || 0,
        discount: discount,
        partsused: selectedParts,
        additionalservices: additionalServices.length > 0 ? additionalServices : undefined,
        total: total,
        branchid: currentBranchId,
        paymentstatus: paymentStatus,
        paymentmethod: formData.paymentMethod || null,
        depositamount: depositAmount || null,
        totalpaid: existingPaid > 0 ? existingPaid : null,
        remainingamount: Math.max(0, total - existingPaid),
        creationdate: order?.creationDate || new Date().toISOString(),
      };

      if (order?.id) {
        const { error } = await supabase.from("work_orders").update(workOrderData).eq("id", order.id).select();
        if (error) {
          console.error("[UPDATE ERROR]", error);
          throw error;
        }

        if (formData.currentKm && formData.vehicleId && (formData.customerId || formData.customerPhone)) {
          const customer =
            (formData.customerId && customers.find((c) => c.id === formData.customerId)) ||
            customers.find((c) => c.phone === formData.customerPhone);
          if (customer) {
            const existingVehicles = customer.vehicles || [];
            const vehicleExists = existingVehicles.some((v: any) => v.id === formData.vehicleId);

            if (vehicleExists) {
              const updatedVehicles = existingVehicles.map((v: any) =>
                v.id === formData.vehicleId ? { ...v, currentKm: formData.currentKm } : v
              );

              const customerIdToUpdate = formData.customerId || customer.id;

              const { error: updateError } = await supabase
                .from("customers")
                .update({ vehicles: updatedVehicles })
                .eq("id", customerIdToUpdate);

              if (updateError) {
                console.error(`[WorkOrderModal UPDATE] Failed to update km in DB:`, updateError);
              } else {
                upsertCustomer({
                  ...customer,
                  id: customerIdToUpdate,
                  vehicles: updatedVehicles,
                });
              }
            }
          }
        }
      } else {
        const { error } = await supabase.from("work_orders").insert(workOrderData).select();
        if (error) {
          console.error("[INSERT ERROR]", error);
          throw error;
        }

        if (formData.currentKm && formData.vehicleId && (formData.customerId || formData.customerPhone)) {
          const customer =
            (formData.customerId && customers.find((c) => c.id === formData.customerId)) ||
            customers.find((c) => c.phone === formData.customerPhone);
          if (customer) {
            const existingVehicles = customer.vehicles || [];
            const vehicleExists = existingVehicles.some((v: any) => v.id === formData.vehicleId);

            let updatedVehicles;
            if (vehicleExists) {
              updatedVehicles = existingVehicles.map((v: any) =>
                v.id === formData.vehicleId ? { ...v, currentKm: formData.currentKm } : v
              );
            } else {
              const newVehicle = {
                id: formData.vehicleId,
                licensePlate: formData.licensePlate,
                model: formData.vehicleModel,
                currentKm: formData.currentKm,
              };
              updatedVehicles = [...existingVehicles, newVehicle];
            }

            const customerIdToUpdate = formData.customerId || customer.id;

            const { error: updateError } = await supabase
              .from("customers")
              .update({ vehicles: updatedVehicles })
              .eq("id", customerIdToUpdate);

            if (updateError) {
              console.error(`[WorkOrderModal CREATE] Failed to update km in DB:`, updateError);
            } else {
              upsertCustomer({
                ...customer,
                id: customerIdToUpdate,
                vehicles: updatedVehicles,
              });
            }
          }
        }
      }

      if (invalidateWorkOrders) {
        invalidateWorkOrders();
      }

      onSave(workOrderData as unknown as WorkOrder);
      showToast.success(order?.id ? "Đã cập nhật phiếu" : "Đã lưu phiếu thành công");
      clearDraft();
      onClose();
    } catch (error: any) {
      console.error("Error saving work order:", error);
      showToast.error("Lỗi khi lưu phiếu: " + (error.message || error.hint || "Không xác định"));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (submittingRef.current || isSubmitting) {
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);

    const resetSubmitting = () => {
      submittingRef.current = false;
      setIsSubmitting(false);
    };

    try {
      if (!formData.customerName?.trim()) {
        showToast.error("Vui lòng nhập tên khách hàng");
        resetSubmitting();
        return;
      }
      if (!formData.customerPhone?.trim()) {
        showToast.error("Vui lòng nhập số điện thoại");
        resetSubmitting();
        return;
      }

      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(formData.customerPhone.trim())) {
        showToast.error("Số điện thoại không hợp lệ! (cần 10-11 chữ số)");
        resetSubmitting();
        return;
      }

      if (depositAmount > total && total > 0) {
        showToast.error(`Số tiền đặt cọc (${formatCurrency(depositAmount)}) không được lớn hơn tổng tiền (${formatCurrency(total)})!`);
        resetSubmitting();
        return;
      }

      if (formData.status === "Trả máy" && showPartialPayment && partialPayment > maxAdditionalPayment) {
        showToast.error(`Số tiền thanh toán thêm không được vượt quá ${formatCurrency(maxAdditionalPayment)}!`);
        resetSubmitting();
        return;
      }

      if (total <= 0 && formData.status === "Trả máy") {
        showToast.error("Tổng tiền phải lớn hơn 0 khi trả máy");
        resetSubmitting();
        return;
      }

      if ((depositAmount > 0 || (formData.status === "Trả máy" && showPartialPayment && partialPayment > 0)) && !formData.paymentMethod) {
        showToast.error("Vui lòng chọn phương thức thanh toán");
        resetSubmitting();
        return;
      }

      if (formData.customerName && formData.customerPhone) {
        const existingCustomer = customers.find((c) => c.phone === formData.customerPhone);

        if (!existingCustomer) {
          const vehicleId = `VEH-${Date.now()}`;
          const vehicles = [];
          if (formData.vehicleModel || formData.licensePlate) {
            vehicles.push({
              id: vehicleId,
              model: formData.vehicleModel || "",
              licensePlate: formData.licensePlate || "",
              isPrimary: true,
            });
          }

          await upsertCustomer({
            id: `CUST-${Date.now()}`,
            name: formData.customerName,
            phone: formData.customerPhone,
            vehicles: vehicles.length > 0 ? vehicles : undefined,
            vehicleModel: formData.vehicleModel,
            licensePlate: formData.licensePlate,
            created_at: new Date().toISOString(),
          });
        } else {
          if (formData.vehicleModel && existingCustomer.vehicleModel !== formData.vehicleModel) {
            await upsertCustomer({
              ...existingCustomer,
              vehicleModel: formData.vehicleModel,
              licensePlate: formData.licensePlate,
            });
          }
        }
      }

      let paymentStatus: "unpaid" | "paid" | "partial" = "unpaid";
      if (totalPaid >= total) {
        paymentStatus = "paid";
      } else if (totalPaid > 0) {
        paymentStatus = "partial";
      }

      if (!order?.id) {
        try {
          const orderId = `${storeSettings?.work_order_prefix || "SC"}-${Date.now()}`;

          const responseData = await createWorkOrderAtomicAsync({
            id: orderId,
            customerName: formData.customerName || "",
            customerPhone: formData.customerPhone || "",
            vehicleModel: formData.vehicleModel || "",
            licensePlate: formData.licensePlate || "",
            currentKm: formData.currentKm,
            issueDescription: formData.issueDescription || "",
            technicianName: formData.technicianName || "",
            status: formData.status || "Tiếp nhận",
            laborCost: formData.laborCost || 0,
            discount: discount,
            partsUsed: selectedParts,
            additionalServices: additionalServices.length > 0 ? additionalServices : undefined,
            total: total,
            branchId: currentBranchId,
            paymentStatus: paymentStatus,
            paymentMethod: formData.paymentMethod,
            depositAmount: depositAmount > 0 ? depositAmount : undefined,
            additionalPayment: additionalPaymentClamped > 0 ? additionalPaymentClamped : undefined,
            totalPaid: totalPaid > 0 ? totalPaid : undefined,
            remainingAmount: remainingAmount,
            creationDate: new Date().toISOString(),
          } as any);

          const depositTxId = responseData?.depositTransactionId;
          const paymentTxId = responseData?.paymentTransactionId;

          const finalOrder: WorkOrder = {
            id: orderId,
            customerName: formData.customerName || "",
            customerPhone: formData.customerPhone || "",
            vehicleModel: formData.vehicleModel || "",
            licensePlate: formData.licensePlate || "",
            currentKm: formData.currentKm,
            issueDescription: formData.issueDescription || "",
            technicianName: formData.technicianName || "",
            status: formData.status || "Tiếp nhận",
            laborCost: formData.laborCost || 0,
            discount: discount,
            partsUsed: selectedParts,
            additionalServices: additionalServices.length > 0 ? additionalServices : undefined,
            total: total,
            branchId: currentBranchId,
            depositAmount: depositAmount > 0 ? depositAmount : undefined,
            depositDate: depositAmount > 0 ? new Date().toISOString() : undefined,
            depositTransactionId: depositTxId,
            paymentStatus: paymentStatus,
            paymentMethod: formData.paymentMethod,
            additionalPayment: additionalPaymentClamped > 0 ? additionalPaymentClamped : undefined,
            totalPaid: totalPaid > 0 ? totalPaid : undefined,
            remainingAmount: remainingAmount,
            cashTransactionId: paymentTxId,
            paymentDate: paymentTxId ? new Date().toISOString() : undefined,
            creationDate: new Date().toISOString(),
          };

          if (depositTxId && depositAmount > 0) {
            setCashTransactions((prev: any[]) => [
              ...prev,
              {
                id: depositTxId,
                type: "income",
                category: "service_deposit",
                amount: depositAmount,
                date: new Date().toISOString(),
                description: `Đặt cọc sửa chữa #${(
                  formatWorkOrderId(orderId, storeSettings?.work_order_prefix) || ""
                )
                  .split("-")
                  .pop()} - ${formData.customerName}`,
                branchId: currentBranchId,
                paymentSource: formData.paymentMethod,
                reference: orderId,
              },
            ]);

            setPaymentSources((prev: any[]) =>
              prev.map((ps) => {
                if (ps.id === formData.paymentMethod) {
                  return {
                    ...ps,
                    balance: {
                      ...ps.balance,
                      [currentBranchId]: (ps.balance[currentBranchId] || 0) + depositAmount,
                    },
                  };
                }
                return ps;
              })
            );
          }

          if (paymentTxId && totalAdditionalPayment > 0) {
            setCashTransactions((prev: any[]) => [
              ...prev,
              {
                id: paymentTxId,
                type: "income",
                category: "service_income",
                amount: totalAdditionalPayment,
                date: new Date().toISOString(),
                description: `Thu tiền sửa chữa #${(
                  formatWorkOrderId(orderId, storeSettings?.work_order_prefix) || ""
                )
                  .split("-")
                  .pop()} - ${formData.customerName}`,
                branchId: currentBranchId,
                paymentSource: formData.paymentMethod,
                reference: orderId,
              },
            ]);

            setPaymentSources((prev: any[]) =>
              prev.map((ps) => {
                if (ps.id === formData.paymentMethod) {
                  return {
                    ...ps,
                    balance: {
                      ...ps.balance,
                      [currentBranchId]: (ps.balance[currentBranchId] || 0) + totalAdditionalPayment,
                    },
                  };
                }
                return ps;
              })
            );
          }

          if (additionalServices.length > 0) {
            const totalOutsourcingCost = additionalServices.reduce(
              (sum, service) => sum + (service.costPrice || 0) * service.quantity,
              0
            );

            const negativeSalesPayment = additionalServices.reduce((sum, service) => {
              if (service.price < 0 && (service.costPrice || 0) === 0) {
                return sum + Math.abs(service.price * service.quantity);
              }
              return sum;
            }, 0);

            if (totalOutsourcingCost > 0) {
              const outsourcingTxId = `EXPENSE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

              try {
                const { data: existingTx } = await supabase
                  .from("cash_transactions")
                  .select("id")
                  .eq("reference", orderId)
                  .eq("category", "outsourcing")
                  .maybeSingle();

                if (!existingTx) {
                  const { error: expenseError } = await supabase.from("cash_transactions").insert({
                    id: outsourcingTxId,
                    type: "expense",
                    category: "outsourcing",
                    amount: -totalOutsourcingCost,
                    date: new Date().toISOString(),
                    description: `Chi phí gia công bên ngoài - Phiếu #${orderId.split("-").pop()} - ${additionalServices
                      .map((s) => s.description)
                      .join(", ")}`,
                    branchid: currentBranchId,
                    paymentsource: "cash",
                    reference: orderId,
                  });

                  if (expenseError) {
                    console.error("[Outsourcing] Insert FAILED:", expenseError);
                    showToast.error(`Lỗi tạo phiếu chi gia công: ${expenseError.message}`);
                  } else {
                    setCashTransactions((prev: any[]) => [
                      ...prev,
                      {
                        id: outsourcingTxId,
                        type: "expense",
                        category: "outsourcing",
                        amount: -totalOutsourcingCost,
                        date: new Date().toISOString(),
                        description: `Chi phí gia công bên ngoài - Phiếu #${orderId.split("-").pop()}`,
                        branchId: currentBranchId,
                        paymentSource: "cash",
                        reference: orderId,
                      },
                    ]);

                    setPaymentSources((prev: any[]) =>
                      prev.map((ps) => {
                        if (ps.id === "cash") {
                          return {
                            ...ps,
                            balance: {
                              ...ps.balance,
                              [currentBranchId]: (ps.balance[currentBranchId] || 0) - totalOutsourcingCost,
                            },
                          };
                        }
                        return ps;
                      })
                    );

                    showToast.info(`Đã tạo phiếu chi ${formatCurrency(totalOutsourcingCost)} cho gia công bên ngoài`);
                  }
                }
              } catch (err) {
                console.error("Error creating outsourcing expense:", err);
              }
            }

            if (negativeSalesPayment > 0) {
              const negativeSalesTxId = `EXPENSE-NEG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

              try {
                const { data: existingNegTx } = await supabase
                  .from("cash_transactions")
                  .select("id")
                  .eq("reference", orderId)
                  .eq("category", "refund")
                  .maybeSingle();

                if (!existingNegTx) {
                  const { error: negExpenseError } = await supabase.from("cash_transactions").insert({
                    id: negativeSalesTxId,
                    type: "expense",
                    category: "refund",
                    amount: -negativeSalesPayment,
                    date: new Date().toISOString(),
                    description: `Chi âm dịch vụ/vật tư - Phiếu #${orderId.split("-").pop()} - ${additionalServices
                      .filter((s) => s.price < 0 && (s.costPrice || 0) === 0)
                      .map((s) => s.description)
                      .join(", ")}`,
                    branchid: currentBranchId,
                    paymentsource: formData.paymentMethod || "cash",
                    reference: orderId,
                  });

                  if (negExpenseError) {
                    console.error("[Negative Services] Insert FAILED:", negExpenseError);
                    showToast.error(`Lỗi tạo phiếu chi hoàn dịch vụ: ${negExpenseError.message}`);
                  } else {
                    setCashTransactions((prev: any[]) => [
                      ...prev,
                      {
                        id: negativeSalesTxId,
                        type: "expense",
                        category: "refund",
                        amount: -negativeSalesPayment,
                        date: new Date().toISOString(),
                        description: `Chi hoàn dịch vụ/vật tư - Phiếu #${orderId.split("-").pop()}`,
                        branchId: currentBranchId,
                        paymentSource: formData.paymentMethod || "cash",
                        reference: orderId,
                      },
                    ]);

                    setPaymentSources((prev: any[]) =>
                      prev.map((ps) => {
                        if (ps.id === (formData.paymentMethod || "cash")) {
                          return {
                            ...ps,
                            balance: {
                              ...ps.balance,
                              [currentBranchId]:
                                (ps.balance[currentBranchId] || 0) - negativeSalesPayment,
                            },
                          };
                        }
                        return ps;
                      })
                    );

                    showToast.info(`Đã tạo phiếu chi hoàn dịch vụ âm ${formatCurrency(negativeSalesPayment)}`);
                  }
                }
              } catch (err) {
                console.error("Error creating negative services expense:", err);
              }
            }
          }

          if (formData.currentKm && formData.vehicleId && (formData.customerId || formData.customerPhone)) {
            const customer =
              (formData.customerId && customers.find((c) => c.id === formData.customerId)) ||
              customers.find((c) => c.phone === formData.customerPhone);
            if (customer) {
              const existingVehicles = customer.vehicles || [];
              const vehicleExists = existingVehicles.some((v: any) => v.id === formData.vehicleId);

              let updatedVehicles;
              if (vehicleExists) {
                updatedVehicles = existingVehicles.map((v: any) =>
                  v.id === formData.vehicleId ? { ...v, currentKm: formData.currentKm } : v
                );
              } else {
                const newVehicle = {
                  id: formData.vehicleId,
                  licensePlate: formData.licensePlate,
                  model: formData.vehicleModel,
                  currentKm: formData.currentKm,
                };
                updatedVehicles = [...existingVehicles, newVehicle];
              }

              const customerIdToUpdate = formData.customerId || customer.id;

              const { error: updateError } = await supabase
                .from("customers")
                .update({ vehicles: updatedVehicles })
                .eq("id", customerIdToUpdate);

              if (updateError) {
                console.error(`[WorkOrderModal Atomic] Failed to update km in DB:`, updateError);
              } else {
                upsertCustomer({
                  ...customer,
                  id: customerIdToUpdate,
                  vehicles: updatedVehicles,
                });
              }
            }
          }

          if (formData.status === "Trả máy" && remainingAmount > 0) {
            await createCustomerDebtIfNeeded(finalOrder, remainingAmount, total, totalPaid);
          }

          if (invalidateWorkOrders) {
            invalidateWorkOrders();
          }

          onSave(finalOrder);
          showToast.success("Đã tạo phiếu thành công");
          clearDraft();
          onClose();
        } catch (error: any) {
          console.error("Error creating work order atomically:", error);
          showToast.error("Không thể tạo phiếu sửa chữa: " + (error?.message || "Lỗi máy chủ"));
        } finally {
          resetSubmitting();
        }
        return;
      }

      const orderId = order.id;

      try {
        const responseData = await updateWorkOrderAtomicAsync({
          id: orderId,
          customerName: formData.customerName || "",
          customerPhone: formData.customerPhone || "",
          vehicleModel: formData.vehicleModel || "",
          licensePlate: formData.licensePlate || "",
          currentKm: formData.currentKm,
          issueDescription: formData.issueDescription || "",
          technicianName: formData.technicianName || "",
          status: formData.status || "Tiếp nhận",
          laborCost: formData.laborCost || 0,
          discount: discount,
          partsUsed: selectedParts,
          additionalServices: additionalServices.length > 0 ? additionalServices : undefined,
          total: total,
          branchId: currentBranchId,
          paymentStatus: paymentStatus,
          paymentMethod: formData.paymentMethod,
          depositAmount: depositAmount > 0 ? depositAmount : undefined,
          additionalPayment: additionalPaymentClamped > 0 ? additionalPaymentClamped : undefined,
          totalPaid: totalPaid > 0 ? totalPaid : undefined,
          remainingAmount: remainingAmount,
          creationDate: order.creationDate,
        } as any);

        const depositTxId = responseData?.depositTransactionId;
        const paymentTxId = responseData?.paymentTransactionId;

        const finalOrder: WorkOrder = {
          ...order,
          customerName: formData.customerName || "",
          customerPhone: formData.customerPhone || "",
          vehicleModel: formData.vehicleModel || "",
          licensePlate: formData.licensePlate || "",
          currentKm: formData.currentKm,
          issueDescription: formData.issueDescription || "",
          technicianName: formData.technicianName || "",
          status: formData.status || "Tiếp nhận",
          laborCost: formData.laborCost || 0,
          discount: discount,
          partsUsed: selectedParts,
          additionalServices: additionalServices.length > 0 ? additionalServices : undefined,
          total: total,
          depositAmount: depositAmount > 0 ? depositAmount : undefined,
          depositTransactionId: depositTxId || order.depositTransactionId,
          paymentStatus: paymentStatus,
          paymentMethod: formData.paymentMethod,
          additionalPayment: additionalPaymentClamped > 0 ? additionalPaymentClamped : undefined,
          totalPaid: totalPaid > 0 ? totalPaid : undefined,
          remainingAmount: remainingAmount,
          cashTransactionId: paymentTxId || order.cashTransactionId,
          paymentDate: paymentTxId ? new Date().toISOString() : order.paymentDate,
        };

        if (depositTxId && depositAmount > 0 && depositTxId !== order.depositTransactionId) {
          setCashTransactions((prev: any[]) => [
            ...prev,
            {
              id: depositTxId,
              type: "income",
              category: "service_deposit",
              amount: depositAmount,
              date: new Date().toISOString(),
              description: `Đặt cọc sửa chữa #${(
                formatWorkOrderId(orderId, storeSettings?.work_order_prefix) || ""
              )
                .split("-")
                .pop()} - ${formData.customerName}`,
              branchId: currentBranchId,
              paymentSource: formData.paymentMethod,
              reference: orderId,
            },
          ]);

          setPaymentSources((prev: any[]) =>
            prev.map((ps) => {
              if (ps.id === formData.paymentMethod) {
                return {
                  ...ps,
                  balance: {
                    ...ps.balance,
                    [currentBranchId]: (ps.balance[currentBranchId] || 0) + depositAmount,
                  },
                };
              }
              return ps;
            })
          );
        }

        if (paymentTxId && totalAdditionalPayment > 0 && paymentTxId !== order.cashTransactionId) {
          setCashTransactions((prev: any[]) => [
            ...prev,
            {
              id: paymentTxId,
              type: "income",
              category: "service_income",
              amount: totalAdditionalPayment,
              date: new Date().toISOString(),
              description: `Thu tiền sửa chữa #${(
                formatWorkOrderId(orderId, storeSettings?.work_order_prefix) || ""
              )
                .split("-")
                .pop()} - ${formData.customerName}`,
              branchId: currentBranchId,
              paymentSource: formData.paymentMethod,
              reference: orderId,
            },
          ]);

          setPaymentSources((prev: any[]) =>
            prev.map((ps) => {
              if (ps.id === formData.paymentMethod) {
                return {
                  ...ps,
                  balance: {
                    ...ps.balance,
                    [currentBranchId]: (ps.balance[currentBranchId] || 0) + totalAdditionalPayment,
                  },
                };
              }
              return ps;
            })
          );
        }

        if (additionalServices.length > 0) {
          const totalOutsourcingCost = additionalServices.reduce(
            (sum, service) => sum + (service.costPrice || 0) * service.quantity,
            0
          );

          const negativeSalesPayment = additionalServices.reduce((sum, service) => {
            if (service.price < 0 && (service.costPrice || 0) === 0) {
              return sum + Math.abs(service.price * service.quantity);
            }
            return sum;
          }, 0);

          if (totalOutsourcingCost > 0) {
            const outsourcingTxId = `EXPENSE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            try {
              const { data: existingTx } = await supabase
                .from("cash_transactions")
                .select("id")
                .eq("reference", orderId)
                .eq("category", "outsourcing")
                .maybeSingle();

              if (!existingTx) {
                const { error: expenseError } = await supabase.from("cash_transactions").insert({
                  id: outsourcingTxId,
                  type: "expense",
                  category: "outsourcing",
                  amount: -totalOutsourcingCost,
                  date: new Date().toISOString(),
                  description: `Chi phí gia công bên ngoài - Phiếu #${orderId.split("-").pop()} - ${additionalServices
                    .map((s) => s.description)
                    .join(", ")}`,
                  branchid: currentBranchId,
                  paymentsource: "cash",
                  reference: orderId,
                });

                if (expenseError) {
                  console.error("[Outsourcing] Insert FAILED:", expenseError);
                  showToast.error(`Lỗi tạo phiếu chi gia công: ${expenseError.message}`);
                } else {
                  setCashTransactions((prev: any[]) => [
                    ...prev,
                    {
                      id: outsourcingTxId,
                      type: "expense",
                      category: "outsourcing",
                      amount: -totalOutsourcingCost,
                      date: new Date().toISOString(),
                      description: `Chi phí gia công bên ngoài - Phiếu #${orderId.split("-").pop()}`,
                      branchId: currentBranchId,
                      paymentSource: "cash",
                      reference: orderId,
                    },
                  ]);

                  setPaymentSources((prev: any[]) =>
                    prev.map((ps) => {
                      if (ps.id === "cash") {
                        return {
                          ...ps,
                          balance: {
                            ...ps.balance,
                            [currentBranchId]: (ps.balance[currentBranchId] || 0) - totalOutsourcingCost,
                          },
                        };
                      }
                      return ps;
                    })
                  );

                  showToast.info(`Đã tạo phiếu chi ${formatCurrency(totalOutsourcingCost)} cho gia công bên ngoài`);
                }
              }
            } catch (err) {
              console.error("Error creating outsourcing expense:", err);
            }
          }

          if (negativeSalesPayment > 0) {
            const negativeSalesTxId = `EXPENSE-NEG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            try {
              const { data: existingNegTx } = await supabase
                .from("cash_transactions")
                .select("id")
                .eq("reference", orderId)
                .eq("category", "refund")
                .maybeSingle();

              if (!existingNegTx) {
                const { error: negExpenseError } = await supabase.from("cash_transactions").insert({
                  id: negativeSalesTxId,
                  type: "expense",
                  category: "refund",
                  amount: -negativeSalesPayment,
                  date: new Date().toISOString(),
                  description: `Chi âm dịch vụ/vật tư - Phiếu #${orderId.split("-").pop()} - ${additionalServices
                    .filter((s) => s.price < 0 && (s.costPrice || 0) === 0)
                    .map((s) => s.description)
                    .join(", ")}`,
                  branchid: currentBranchId,
                  paymentsource: formData.paymentMethod || "cash",
                  reference: orderId,
                });

                if (negExpenseError) {
                  console.error("[Negative Services] Insert FAILED:", negExpenseError);
                  showToast.error(`Lỗi tạo phiếu chi hoàn dịch vụ: ${negExpenseError.message}`);
                } else {
                  setCashTransactions((prev: any[]) => [
                    ...prev,
                    {
                      id: negativeSalesTxId,
                      type: "expense",
                      category: "refund",
                      amount: -negativeSalesPayment,
                      date: new Date().toISOString(),
                      description: `Chi hoàn dịch vụ/vật tư - Phiếu #${orderId.split("-").pop()}`,
                      branchId: currentBranchId,
                      paymentSource: formData.paymentMethod || "cash",
                      reference: orderId,
                    },
                  ]);

                  setPaymentSources((prev: any[]) =>
                    prev.map((ps) => {
                      if (ps.id === (formData.paymentMethod || "cash")) {
                        return {
                          ...ps,
                          balance: {
                            ...ps.balance,
                            [currentBranchId]:
                              (ps.balance[currentBranchId] || 0) - negativeSalesPayment,
                          },
                        };
                      }
                      return ps;
                    })
                  );

                  showToast.info(`Đã tạo phiếu chi hoàn dịch vụ âm ${formatCurrency(negativeSalesPayment)}`);
                }
              }
            } catch (err) {
              console.error("Error creating negative services expense:", err);
            }
          }
        }

        if (formData.currentKm && formData.vehicleId && (formData.customerId || formData.customerPhone)) {
          const customer =
            (formData.customerId && customers.find((c) => c.id === formData.customerId)) ||
            customers.find((c) => c.phone === formData.customerPhone);
          if (customer) {
            const existingVehicles = customer.vehicles || [];
            const vehicleExists = existingVehicles.some((v: any) => v.id === formData.vehicleId);

            if (vehicleExists) {
              const updatedVehicles = existingVehicles.map((v: any) =>
                v.id === formData.vehicleId ? { ...v, currentKm: formData.currentKm } : v
              );

              const customerIdToUpdate = formData.customerId || customer.id;

              const { error: updateError } = await supabase
                .from("customers")
                .update({ vehicles: updatedVehicles })
                .eq("id", customerIdToUpdate);

              if (updateError) {
                console.error(`[WorkOrderModal UPDATE] Failed to update km in DB:`, updateError);
              } else {
                upsertCustomer({
                  ...customer,
                  id: customerIdToUpdate,
                  vehicles: updatedVehicles,
                });
              }
            }
          }
        }

        if (formData.status === "Trả máy" && remainingAmount > 0) {
          await createCustomerDebtIfNeeded(finalOrder, remainingAmount, total, totalPaid);
        }

        if (invalidateWorkOrders) {
          invalidateWorkOrders();
        }

        onSave(finalOrder);
        showToast.success("Đã cập nhật phiếu thành công");
        clearDraft();
        onClose();
      } catch (error: any) {
        console.error("Error updating work order atomically:", error);
        showToast.error("Không thể cập nhật phiếu: " + (error?.message || "Lỗi máy chủ"));
      } finally {
        resetSubmitting();
      }
    } catch (error: any) {
      console.error("Error saving work order:", error);
      showToast.error("Lỗi khi lưu phiếu: " + (error.message || "Không xác định"));
      resetSubmitting();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-slate-50 dark:bg-slate-900 w-full h-full md:h-auto md:max-h-[90vh] md:max-w-6xl rounded-t-3xl md:rounded-xl shadow-2xl flex flex-col overflow-hidden border border-white/5">
        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-950/20 backdrop-blur border-b border-slate-200 dark:border-slate-800/80 px-4 py-3 md:px-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Status Stepper */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-950/40 p-1 rounded-full border border-slate-200/50 dark:border-slate-800/60 overflow-x-auto flex-1 mr-3 max-w-max">
              {[
                {
                  key: "Tiếp nhận",
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  ),
                  color: "blue",
                },
                {
                  key: "Đang sửa",
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
                      />
                    </svg>
                  ),
                  color: "orange",
                },
                {
                  key: "Đã sửa xong",
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  color: "purple",
                },
                {
                  key: "Trả máy",
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                  ),
                  color: "green",
                },
              ].map((step, idx, arr) => {
                const statuses = arr.map((s) => s.key);
                const currentIdx = statuses.indexOf(formData.status || "Tiếp nhận");
                const stepIdx = idx;
                const isActive = stepIdx === currentIdx;
                const colorMap: Record<string, string> = {
                  blue: isActive
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25 shadow-sm shadow-blue-500/5"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/30 border-transparent",
                  orange: isActive
                    ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25 shadow-sm shadow-orange-500/5"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/30 border-transparent",
                  purple: isActive
                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25 shadow-sm shadow-purple-500/5"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/30 border-transparent",
                  green: isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 shadow-sm shadow-emerald-500/5"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/30 border-transparent",
                };
                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => setFormData({ ...formData, status: step.key as any })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      colorMap[step.color]
                    }`}
                  >
                    <span className="text-sm">{step.icon}</span>
                    <span className="hidden sm:inline">{step.key}</span>
                  </button>
                );
              })}
            </div>

            {/* Right: Badge + Close Button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {formData.id ? (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  #{formatWorkOrderId(formData.id, storeSettings?.work_order_prefix)}
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Phiếu mới
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label="Đóng"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Warning Banner for Paid Orders */}
        {isOrderPaid && (
          <div className="mx-4 mt-4 md:mx-6 md:mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                  ⚠️ Phiếu đã thanh toán
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Phiếu đã thanh toán: Không thể thay đổi danh sách dịch vụ và giá bán (Revenue).
                  <br className="mb-1" />
                  Tuy nhiên, bạn vẫn có thể cập nhật <b>Giá vốn (Cost)</b> của các dịch vụ để tính lợi nhuận chính xác,
                  cũng như thông tin khách hàng và ghi chú.
                </p>
              </div>
            </div>
          </div>
        )}

        {formData.id && selectedParts.length > 0 && (
          <div className="mx-4 mt-3 md:mx-6 p-3 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-lg">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setShowInventoryCheck(!showInventoryCheck)}
              onKeyDown={(e) => e.key === "Enter" && setShowInventoryCheck(!showInventoryCheck)}
              className="w-full flex items-center justify-between gap-2 text-left hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <svg
                  className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform ${
                    showInventoryCheck ? "rotate-90" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Kiểm tra trừ kho</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ({inventoryTxs.length} dòng xuất kho)
                </span>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={handleRefreshInventoryTxs}
                  className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Làm mới
                </button>
                {(formData.paymentStatus === "paid" || formData.status === "Trả máy") && inventoryTxs.length === 0 && (
                  <button
                    type="button"
                    onClick={handleManualDeductInventory}
                    disabled={isDeductingInventory}
                    className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {isDeductingInventory ? "Đang trừ..." : "Trừ kho ngay"}
                  </button>
                )}
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    (formData as any).inventory_deducted || (formData as any).inventoryDeducted
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  }`}
                >
                  {(formData as any).inventory_deducted || (formData as any).inventoryDeducted
                    ? "Đã trừ kho"
                    : "Chưa trừ kho"}
                </span>
              </div>
            </div>

            {showInventoryCheck && (
              <>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 pl-6">
                  Xuất kho ghi nhận: {inventoryTxs.length} dòng
                  {formData.paymentStatus !== "paid" &&
                    !((formData as any).inventory_deducted || (formData as any).inventoryDeducted) && (
                      <> • Chưa thanh toán đủ nên chưa trừ kho (chỉ giữ)</>
                    )}
                  {((formData as any).inventory_deducted || (formData as any).inventoryDeducted) &&
                    formData.status === "Trả máy" && <> • Đã trừ kho công nợ khi trả xe</>}
                </div>

                {inventoryTxLoading ? (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 pl-6">
                    Đang tải lịch sử xuất kho...
                  </div>
                ) : inventoryTxError ? (
                  <div className="text-xs text-red-500 mt-2 pl-6">{inventoryTxError}</div>
                ) : (
                  <div className="mt-3 space-y-2 max-h-[40vh] overflow-auto pr-1 pl-6">
                    {selectedParts.map((p) => {
                      const exportedQty = exportQtyByPartId.get(p.partId) || 0;
                      const missingQty = Math.max(0, p.quantity - exportedQty);
                      return (
                        <div
                          key={p.partId}
                          className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800 dark:text-slate-100 truncate">{p.partName}</div>
                            <div className="text-slate-500 dark:text-slate-400">
                              Dùng: {p.quantity} • Xuất: {exportedQty}
                            </div>
                          </div>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              missingQty === 0 && exportedQty > 0
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : exportedQty > 0
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {missingQty === 0 && exportedQty > 0
                              ? "Đã trừ"
                              : exportedQty > 0
                              ? `Thiếu ${missingQty}`
                              : "Chưa trừ"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Main Content: 2-Panel Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Scrollable Form */}
          <div className="flex-1 px-4 py-5 md:px-6 md:py-6 space-y-5 overflow-y-auto pb-24 md:pb-6 bg-slate-50/50 dark:bg-slate-900/20">
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                {/* Section 1: Customer & Vehicle */}
                <CustomerVehicleSection
                  formData={formData}
                  setFormData={setFormData}
                  customerSearch={customerSearch}
                  setCustomerSearch={setCustomerSearch}
                  customers={customers}
                  serverCustomers={serverCustomers}
                  isSearchingCustomer={isSearchingCustomer}
                  hasMoreCustomers={hasMoreCustomers}
                  customerPage={customerPage}
                  fetchCustomers={fetchCustomers}
                  handleLoadMoreCustomers={handleLoadMoreCustomers}
                  filteredCustomers={filteredCustomers}
                  upsertCustomer={upsertCustomer}
                  freshCustomer={freshCustomer}
                  setFreshCustomer={setFreshCustomer}
                  currentBranchId={currentBranchId}
                  storeSettings={storeSettings}
                  allCustomers={allCustomers}
                />

                {/* Section 2: Service Info & Notes */}
                <ServiceInfoSection
                  formData={formData}
                  setFormData={setFormData}
                  employees={employees}
                />
              </div>

              {/* Section 3: Parts Used */}
              <PartsUsedSection
                parts={parts}
                partsLoading={partsLoading}
                selectedParts={selectedParts}
                setSelectedParts={setSelectedParts}
                currentBranchId={currentBranchId}
                canEditPriceAndParts={canEditPriceAndParts}
                isOwner={isOwner}
              />

              {/* Section 4: Additional Services */}
              <AdditionalServicesSection
                additionalServices={additionalServices}
                setAdditionalServices={setAdditionalServices}
                canEditPriceAndParts={canEditPriceAndParts}
                order={order}
              />
            </div>

            {/* Mobile Summary Section (rendered inside scroll view, only visible on mobile) */}
            <MobileSummary
              formData={formData}
              partsTotal={partsTotal}
              servicesTotal={servicesTotal}
              total={total}
            />
          </div>

          {/* Right Panel - Sticky Sidebar (desktop only) */}
          <SummarySidebar
            formData={formData}
            setFormData={setFormData}
            subtotal={subtotal}
            total={total}
            partsTotal={partsTotal}
            servicesTotal={servicesTotal}
            remainingAmount={remainingAmount}
            depositAmount={depositAmount}
            setDepositAmount={setDepositAmount}
            partialPayment={partialPayment}
            setPartialPayment={setPartialPayment}
            showDepositInput={showDepositInput}
            setShowDepositInput={setShowDepositInput}
            showPartialPayment={showPartialPayment}
            setShowPartialPayment={setShowPartialPayment}
            discountType={discountType}
            setDiscountType={setDiscountType}
            discountPercent={discountPercent}
            setDiscountPercent={setDiscountPercent}
            maxAdditionalPayment={maxAdditionalPayment}
            canEditPriceAndParts={canEditPriceAndParts}
            isSubmitting={isSubmitting}
            handleSave={handleSave}
            handleSaveOnly={handleSaveOnly}
            onClose={onClose}
            order={order}
            totalDeposit={totalDeposit}
            totalAdditionalPayment={totalAdditionalPayment}
          />
        </div>

        {/* Mobile Actions Footer (mobile only) */}
        <MobileActions
          formData={formData}
          showDepositInput={showDepositInput}
          isSubmitting={isSubmitting}
          handleSave={handleSave}
          handleSaveOnly={handleSaveOnly}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

export default WorkOrderModal;
