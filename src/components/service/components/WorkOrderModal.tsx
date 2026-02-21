import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import type { WorkOrder, Part, WorkOrderPart, Vehicle, InventoryTransaction } from "../../../types";
import { formatCurrency, formatWorkOrderId, normalizeSearchText } from "../../../utils/format";
import { NumberInput } from "../../common/NumberInput";
import { getCategoryColor } from "../../../utils/categoryColors";
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
  validateDepositAmount,
} from "../../../utils/validation";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { POPULAR_MOTORCYCLES } from "../constants/service.constants";

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const queryClient = useQueryClient();
    const { profile } = useAuth();
    const { mutateAsync: createWorkOrderAtomicAsync } =
      useCreateWorkOrderAtomicRepo();
    const { mutateAsync: updateWorkOrderAtomicAsync } =
      useUpdateWorkOrderAtomicRepo();

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

    const [searchPart, setSearchPart] = useState("");
    const [searchPartCategory, setSearchPartCategory] = useState<string>("");
    const [selectedParts, setSelectedParts] = useState<WorkOrderPart[]>([]);
    const [inventoryTxs, setInventoryTxs] = useState<InventoryTransaction[]>([]);
    const [inventoryTxLoading, setInventoryTxLoading] = useState(false);
    const [inventoryTxError, setInventoryTxError] = useState<string | null>(null);
    const [isDeductingInventory, setIsDeductingInventory] = useState(false);
    const [showInventoryCheck, setShowInventoryCheck] = useState(false);
    const [showPartSearch, setShowPartSearch] = useState(false);
    const [partialPayment, setPartialPayment] = useState(0);
    const [showPartialPayment, setShowPartialPayment] = useState(false);
    const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
    const [showAddVehicleModelDropdown, setShowAddVehicleModelDropdown] =
      useState(false);
    const [depositAmount, setDepositAmount] = useState(0);
    const [showDepositInput, setShowDepositInput] = useState(false);
    const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
      name: "",
      phone: "",
      vehicleModel: "",
      licensePlate: "",
    });
    const [customerSearch, setCustomerSearch] = useState("");

    // Server-side search state
    const [serverCustomers, setServerCustomers] = useState<any[]>([]);
    const debouncedCustomerSearch = useDebouncedValue(customerSearch, 500);
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
    const [customerPage, setCustomerPage] = useState(0);
    const [hasMoreCustomers, setHasMoreCustomers] = useState(true);
    const CUSTOMER_PAGE_SIZE = 20;

    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
    const [newVehicle, setNewVehicle] = useState({
      model: "",
      licensePlate: "",
    });

    // Edit customer state
    const [isEditingCustomer, setIsEditingCustomer] = useState(false);
    const [editCustomerName, setEditCustomerName] = useState("");
    const [editCustomerPhone, setEditCustomerPhone] = useState("");

    // Edit vehicle state
    const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
    const [editVehicleModel, setEditVehicleModel] = useState("");
    const [editVehicleLicensePlate, setEditVehicleLicensePlate] = useState("");

    // 🔹 Check if order is paid AND completed (lock sensitive fields)
    // Chỉ khóa khi đã thanh toán ĐẦY ĐỦ VÀ đã trả máy
    const isOrderPaid = order?.paymentStatus === "paid" && (order?.status === "Trả máy" || formData.status === "Trả máy");
    const isOrderRefunded = order?.refunded === true;
    // Allow editing if order is not refunded AND (not paid OR status is not "Trả máy")
    // This allows adding parts to a "paid" order if it's still being repaired
    const canEditPriceAndParts = (!isOrderPaid || formData.status !== "Trả máy") && !isOrderRefunded;

    const allCustomers = useMemo(() => {
      const allCandidates = [...customers, ...serverCustomers];
      return Array.from(new Map(allCandidates.map((c) => [c.id, c])).values());
    }, [customers, serverCustomers]);

    // Get customer's vehicles
    // 🔹 FIX: Ưu tiên tìm theo customerId (unique), chỉ fallback sang phone khi không có ID
    const customerById = formData.customerId
      ? allCustomers.find((c) => c.id === formData.customerId)
      : undefined;
    
    // Chỉ tìm theo phone khi KHÔNG có customerId (tránh match nhầm)
    const customerByPhone = !formData.customerId && formData.customerPhone
      ? allCustomers.find((c) => {
          if (!c.phone) return false;
          const normalizePhone = (p: string) => p.replace(/\D/g, "");
          const formPhone = normalizePhone(formData.customerPhone!);
          const customerPhones = c.phone.split(",").map((p: string) => normalizePhone(p.trim()));
          // Chỉ match khi phone khớp HOÀN TOÀN (không dùng includes để tránh match nhầm)
          return customerPhones.some((cp: string) => cp === formPhone);
        })
      : undefined;
    
    // Ưu tiên customerId, sau đó mới đến phone
    // Nếu có customerId thì KHÔNG fallback sang phone (để tránh hiển thị nhầm xe)
    const currentCustomer = customerById || customerByPhone || null;
    const customerVehicles = currentCustomer?.vehicles || [];

    // Discount state
    const [discountType, setDiscountType] = useState<"amount" | "percent">(
      "amount"
    );
    const [discountPercent, setDiscountPercent] = useState(0);

    // Submission guard to prevent duplicate submissions
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submittingRef = useRef(false); // Synchronous guard for double-click prevention

    // Additional services state (Báo giá - Gia công/ Đặt hàng)
    const [additionalServices, setAdditionalServices] = useState<
      Array<{
        id: string;
        description: string;
        quantity: number;
        price: number;
        costPrice?: number; // Giá nhập (chi phí gia công bên ngoài)
      }>
    >([]);
    const [newService, setNewService] = useState({
      description: "",
      quantity: 1,
      price: 0,
      costPrice: 0,
    });

    // Sync selectedParts and deposit with formData on order change
    useEffect(() => {
      if (order?.partsUsed) {
        setSelectedParts(order.partsUsed);
      } else {
        setSelectedParts([]);
      }

      // Sync customer search
      if (order?.customerName) {
        setCustomerSearch(order.customerName);
      } else {
        setCustomerSearch("");
      }

      // Sync additional services (Báo giá)
      if (order?.additionalServices && Array.isArray(order.additionalServices) && order.additionalServices.length > 0) {
        setAdditionalServices(order.additionalServices);
      } else {
        setAdditionalServices([]);
      }

      // Sync deposit amount
      if (order?.depositAmount) {
        setDepositAmount(order.depositAmount);
        setShowDepositInput(true);
      } else {
        setDepositAmount(0);
        setShowDepositInput(false);
      }

      // Sync partial payment
      if (order?.additionalPayment) {
        setPartialPayment(order.additionalPayment);
        setShowPartialPayment(true);
      } else {
        setPartialPayment(0);
        setShowPartialPayment(false);
      }

      // Reset discount type to amount when opening/changing order
      setDiscountType("amount");
      setDiscountPercent(0);

      // Reset edit customer state
      setIsEditingCustomer(false);
      setEditCustomerName("");
      setEditCustomerPhone("");
    }, [order]);

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
          setInventoryTxError(
            (error as any)?.message || "Không thể tải lịch sử xuất kho"
          );
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
        setInventoryTxError(
          (error as any)?.message || "Không thể tải lịch sử xuất kho"
        );
        setInventoryTxs([]);
      } else {
        setInventoryTxs((data || []) as InventoryTransaction[]);
      }
      setInventoryTxLoading(false);
    };

    const handleManualDeductInventory = async () => {
      if (!order?.id) return;
      if (formData.paymentStatus !== "paid") {
        showToast.warning("Phiếu chưa thanh toán đủ nên chưa thể trừ kho");
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
          showToast.warning(
            "Không thể trừ kho: " + (result.error.message || "Lỗi không xác định")
          );
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

    // Auto-restore draft after syncing from `order`
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

    // Auto-save draft while editing (debounced)
    useEffect(() => {
      if (!draftCheckedRef.current) return; // avoid overwriting before restore check

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

    // Search customers from Supabase when search term changes
    useEffect(() => {
      // Reset page when search term changes
      setCustomerPage(0);
      setHasMoreCustomers(true);
      // Logic handled in fetchCustomers
    }, [debouncedCustomerSearch]);

    // Combined fetch function
    const fetchCustomers = async (page: number, searchTerm: string, isLoadMore = false) => {
      if (!searchTerm.trim()) {
        if (!isLoadMore) setServerCustomers([]);
        return;
      }

      setIsSearchingCustomer(true);
      try {
        const from = page * CUSTOMER_PAGE_SIZE;
        const to = from + CUSTOMER_PAGE_SIZE - 1;

        // Use a simple OR query on name, phone, vehicle model, license plate
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
              // Deduplicate just in case
              const newIds = new Set(data.map(c => c.id));
              const filteredPrev = prev.filter(c => !newIds.has(c.id));
              return [...filteredPrev, ...data];
            });
          } else {
            setServerCustomers(data);
          }

          // Check if we reached the end
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

    // Effect to trigger search when debounced term changes
    useEffect(() => {
      // Only fetch if has search term
      if (debouncedCustomerSearch.trim()) {
        fetchCustomers(0, debouncedCustomerSearch.trim(), false);
      } else {
        setServerCustomers([]);
      }
    }, [debouncedCustomerSearch]);

    // Handler for Load More button
    const handleLoadMoreCustomers = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const nextPage = customerPage + 1;
      setCustomerPage(nextPage);
      fetchCustomers(nextPage, debouncedCustomerSearch.trim(), true);
    };

    // Filter customers based on search - show all if search is empty
    const filteredCustomers = useMemo(() => {
      if (!customerSearch.trim()) {
        return allCustomers.slice(0, 10); // Limit to first 10 for performance
      }

      const q = normalizeSearchText(customerSearch);
      return allCustomers.filter(
        (c) =>
          normalizeSearchText(c.name).includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          normalizeSearchText(c.vehicleModel || "").includes(q) ||
          normalizeSearchText(c.licensePlate || "").includes(q) ||
          (c.vehicles &&
            c.vehicles.some((v: any) =>
              normalizeSearchText(v.licensePlate).includes(q) ||
              normalizeSearchText(v.model || "").includes(q) ||
              v.licensePlate?.toLowerCase().includes(q.toLowerCase())
            ))
      );
    }, [allCustomers, customerSearch]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (!target.closest(".customer-search-container")) {
          setShowCustomerDropdown(false);
        }
        if (!target.closest(".vehicle-search-container")) {
          setShowVehicleDropdown(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle vehicle selection
    const handleSelectVehicle = (vehicle: any) => {
      setFormData({
        ...formData,
        vehicleId: vehicle.id,
        vehicleModel: vehicle.model,
        licensePlate: vehicle.licensePlate,
      });
      setShowVehicleDropdown(false);
    };

    // Handler: Add new vehicle to current customer
    const handleAddVehicle = () => {
      if (!currentCustomer) return;
      if (!newVehicle.model.trim() || !newVehicle.licensePlate.trim()) {
        showToast.error("Vui lòng nhập đầy đủ loại xe và biển số");
        return;
      }

      const vehicleId = `VEH-${Date.now()}`;
      const existingVehicles = currentCustomer.vehicles || [];

      const updatedVehicles = [
        ...existingVehicles,
        {
          id: vehicleId,
          model: newVehicle.model.trim(),
          licensePlate: newVehicle.licensePlate.trim(),
          isPrimary: existingVehicles.length === 0, // First vehicle is primary
        },
      ];

      // Update customer with new vehicle
      upsertCustomer({
        ...currentCustomer,
        vehicles: updatedVehicles,
      });

      // Auto-select the newly added vehicle
      setFormData({
        ...formData,
        vehicleId: vehicleId,
        vehicleModel: newVehicle.model.trim(),
        licensePlate: newVehicle.licensePlate.trim(),
      });

      // Reset and close modal
      setNewVehicle({ model: "", licensePlate: "" });
      setShowAddVehicleModal(false);
      showToast.success("Đã thêm xe mới");
    };

    // Handler: Save edited customer info
    const handleSaveEditedCustomer = async () => {
      if (!currentCustomer) return;
      if (!editCustomerName.trim() || !editCustomerPhone.trim()) {
        showToast.error("Vui lòng nhập đầy đủ tên và số điện thoại");
        return;
      }

      try {
        await upsertCustomer({
          ...currentCustomer,
          name: editCustomerName.trim(),
          phone: editCustomerPhone.trim(),
        });

        // Update formData with new customer info
        setFormData({
          ...formData,
          customerName: editCustomerName.trim(),
          customerPhone: editCustomerPhone.trim(),
        });

        // Update customer search
        setCustomerSearch(editCustomerName.trim());

        setIsEditingCustomer(false);
        showToast.success("Đã cập nhật thông tin khách hàng");
      } catch (error) {
        console.error("Error updating customer:", error);
        showToast.error("Có lỗi khi cập nhật thông tin");
      }
    };

    // Handler: Save edited vehicle info
    const handleSaveEditedVehicle = async () => {
      if (!currentCustomer || !editingVehicleId) return;
      if (!editVehicleModel.trim() && !editVehicleLicensePlate.trim()) {
        showToast.error("Vui lòng nhập ít nhất dòng xe hoặc biển số");
        return;
      }

      try {
        const updatedVehicles =
          currentCustomer.vehicles?.map((v: any) =>
            v.id === editingVehicleId
              ? {
                ...v,
                model: editVehicleModel.trim(),
                licensePlate: editVehicleLicensePlate.trim(),
              }
              : v
          ) || [];

        await upsertCustomer({
          ...currentCustomer,
          vehicles: updatedVehicles,
        });

        // Update formData if this is the selected vehicle
        if (formData.vehicleId === editingVehicleId) {
          setFormData({
            ...formData,
            vehicleModel: editVehicleModel.trim(),
            licensePlate: editVehicleLicensePlate.trim(),
          });
        }

        setEditingVehicleId(null);
        setEditVehicleModel("");
        setEditVehicleLicensePlate("");
        showToast.success("Đã cập nhật thông tin xe");
      } catch (error) {
        console.error("Error updating vehicle:", error);
        showToast.error("Có lỗi khi cập nhật thông tin xe");
      }
    };

    // Calculate totals
    const partsTotal = selectedParts.reduce(
      (sum, p) => sum + (p.price || 0) * (p.quantity || 0),
      0
    );
    const servicesTotal = additionalServices.reduce(
      (sum, s) => sum + (s.price || 0) * (s.quantity || 0),
      0
    );
    const subtotal = (formData.laborCost || 0) + partsTotal + servicesTotal;
    const discount = formData.discount || 0;
    const total = Math.max(0, subtotal - discount);

    // Calculate payment summary
    const totalDeposit = depositAmount ?? order.depositAmount ?? 0;

    // additionalPayment is treated as cumulative value on WorkOrder
    const additionalPaymentCumulative =
      formData.status === "Trả máy" && showPartialPayment
        ? Math.max(0, partialPayment)
        : 0;

    const maxAdditionalPayment = Math.max(0, total - totalDeposit);
    const additionalPaymentClamped = Math.min(
      additionalPaymentCumulative,
      maxAdditionalPayment
    );

    // Use clamped value to prevent recording overpayment in transactions
    const totalAdditionalPayment = additionalPaymentClamped;

    const totalPaid = totalDeposit + additionalPaymentClamped;

    const remainingAmount = Math.max(0, total - totalPaid);

    // Helper: Auto-create customer debt if there's remaining amount
    const createCustomerDebt = useCreateCustomerDebtRepo();
    const createCustomerDebtIfNeeded = async (
      workOrder: WorkOrder,
      remainingAmount: number,
      totalAmount: number,
      paidAmount: number
    ) => {
      if (remainingAmount <= 0) return;

      try {
        const safeCustomerId =
          workOrder.customerPhone || workOrder.id || `CUST-ANON-${Date.now()}`;
        const safeCustomerName =
          workOrder.customerName?.trim() ||
          workOrder.customerPhone ||
          "Khách vãng lai";

        // Tạo nội dung chi tiết từ phiếu sửa chữa
        const workOrderNumber =
          formatWorkOrderId(workOrder.id, storeSettings?.work_order_prefix)
            .split("-")
            .pop() || "";

        let description = `${workOrder.vehicleModel || "Xe"
          } (Phiếu sửa chữa #${workOrderNumber})`;

        // Mô tả vấn đề
        if (workOrder.issueDescription) {
          description += `\nVấn đề: ${workOrder.issueDescription}`;
        }

        // Danh sách phụ tùng đã sử dụng
        if (workOrder.partsUsed && workOrder.partsUsed.length > 0) {
          description += "\n\nPhụ tùng đã thay:";
          workOrder.partsUsed.forEach((part) => {
            description += `\n  - ${part.quantity} x ${part.partName
              } - ${formatCurrency(part.price * part.quantity)}`;
          });
        }

        // Danh sách dịch vụ bổ sung (gia công, đặt hàng)
        if (
          workOrder.additionalServices &&
          workOrder.additionalServices.length > 0
        ) {
          description += "\n\nDịch vụ:";
          workOrder.additionalServices.forEach((service) => {
            description += `\n  - ${service.quantity} x ${service.description
              } - ${formatCurrency(service.price * service.quantity)}`;
          });
        }

        // Công lao động
        if (workOrder.laborCost && workOrder.laborCost > 0) {
          description += `\n\nCông lao động: ${formatCurrency(
            workOrder.laborCost
          )}`;
        }

        // Giảm giá (nếu có)
        if (workOrder.discount && workOrder.discount > 0) {
          description += `\nGiảm giá: -${formatCurrency(workOrder.discount)}`;
        }

        // Thông tin nhân viên tạo phiếu
        const createdByDisplay = profile?.name || profile?.full_name || "N/A";
        description += `\n\nNV: ${createdByDisplay}`;

        // Thông tin nhân viên kỹ thuật
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
          workOrderId: workOrder.id, // 🔹 Link debt với work order
        };

        const result = await createCustomerDebt.mutateAsync(payload as any);
        showToast.success(
          `Đã tạo/cập nhật công nợ ${remainingAmount.toLocaleString()}đ (Mã: ${result?.id || "N/A"
          })`
        );
      } catch (error) {
        console.error("Error creating/updating customer debt:", error);
        showToast.error("Không thể tạo/cập nhật công nợ tự động");
      }
    };

    // 🔹 Function to save work order without payment processing
    const handleSaveOnly = async () => {
      // 🔹 PREVENT DUPLICATE SUBMISSIONS
      if (submittingRef.current || isSubmitting) {
        return;
      }
      submittingRef.current = true;
      setIsSubmitting(true);

      try {
      // Validation
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

      // Note: Không validate total > 0 vì có thể chỉ tiếp nhận thông tin, chưa báo giá

      // Add/update customer
      if (formData.customerName && formData.customerPhone) {
        const existingCustomer = customers.find(
          (c) => c.phone === formData.customerPhone
        );

        if (!existingCustomer) {
          // Chỉ tạo khách hàng mới nếu SĐT chưa tồn tại
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
          // Khách hàng đã tồn tại - chỉ cập nhật thông tin xe nếu cần
          if (
            formData.vehicleModel &&
            existingCustomer.vehicleModel !== formData.vehicleModel
          ) {
            await upsertCustomer({
              ...existingCustomer,
              vehicleModel: formData.vehicleModel,
              licensePlate: formData.licensePlate,
            });
          }
        }
      }

      // Determine payment status based on existing payments only (not new ones)
      // Use state `depositAmount` (from current UI) instead of stale `order?.depositAmount` prop
      let paymentStatus: "unpaid" | "paid" | "partial" = "unpaid";
      const existingPaid =
        (depositAmount || 0) + (order?.additionalPayment || 0);
      if (existingPaid >= total) {
        paymentStatus = "paid";
      } else if (existingPaid > 0) {
        paymentStatus = "partial";
      }

        const orderId =
          order?.id ||
          `${storeSettings?.work_order_prefix || "SC"}-${Date.now()}`;

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
          additionalservices:
            additionalServices.length > 0 ? additionalServices : undefined,
          total: total,
          branchid: currentBranchId,
          paymentstatus: paymentStatus,
          paymentmethod: formData.paymentMethod || null,
          depositamount: depositAmount || null, // use state value, not stale prop
          totalpaid: existingPaid > 0 ? existingPaid : null,
          remainingamount: Math.max(0, total - existingPaid),
          creationdate: order?.creationDate || new Date().toISOString(),
        };

        // Save to Supabase database
        if (order?.id) {
          // Update existing
          const { data, error } = await supabase
            .from("work_orders")
            .update(workOrderData)
            .eq("id", order.id)
            .select();

          if (error) {
            console.error("[UPDATE ERROR]", error);
            throw error;
          }

          // Update vehicle currentKm if km was provided
          if (
            formData.currentKm &&
            formData.vehicleId &&
            (formData.customerId || formData.customerPhone)
          ) {
            // Find customer by ID first (more reliable), fallback to phone
            const customer = (formData.customerId && customers.find(
              (c) => c.id === formData.customerId
            )) || customers.find(
              (c) => c.phone === formData.customerPhone
            );
            if (customer) {
              const existingVehicles = customer.vehicles || [];
              const vehicleExists = existingVehicles.some(
                (v: any) => v.id === formData.vehicleId
              );

              if (vehicleExists) {
                // Update km for existing vehicle
                const updatedVehicles = existingVehicles.map((v: any) =>
                  v.id === formData.vehicleId
                    ? { ...v, currentKm: formData.currentKm }
                    : v
                );

                // Use formData.customerId if available (more reliable from upsertCustomer)
                const customerIdToUpdate = formData.customerId || customer.id;

                // Save to Supabase database
                const { error: updateError } = await supabase
                  .from("customers")
                  .update({ vehicles: updatedVehicles })
                  .eq("id", customerIdToUpdate);

                if (updateError) {
                  console.error(
                    `[WorkOrderModal UPDATE] Failed to update km in DB:`,
                    updateError
                  );
                } else {
                  // Update local context
                  upsertCustomer({
                    ...customer,
                    id: customerIdToUpdate, // Ensure correct ID is used
                    vehicles: updatedVehicles,
                  });
                }
              }
            }
          }
        } else {
          // Insert new
          const { data, error } = await supabase
            .from("work_orders")
            .insert(workOrderData)
            .select();

          if (error) {
            console.error("[INSERT ERROR]", error);
            throw error;
          }

          // Update vehicle currentKm if km was provided
          if (
            formData.currentKm &&
            formData.vehicleId &&
            (formData.customerId || formData.customerPhone)
          ) {
            // Find customer by ID first (more reliable), fallback to phone
            const customer = (formData.customerId && customers.find(
              (c) => c.id === formData.customerId
            )) || customers.find(
              (c) => c.phone === formData.customerPhone
            );
            if (customer) {
              const existingVehicles = customer.vehicles || [];
              const vehicleExists = existingVehicles.some(
                (v: any) => v.id === formData.vehicleId
              );

              let updatedVehicles;
              if (vehicleExists) {
                // Update km for existing vehicle
                updatedVehicles = existingVehicles.map((v: any) =>
                  v.id === formData.vehicleId
                    ? { ...v, currentKm: formData.currentKm }
                    : v
                );
              } else {
                // Vehicle doesn't exist yet, add it with km
                const newVehicle = {
                  id: formData.vehicleId,
                  licensePlate: formData.licensePlate,
                  model: formData.vehicleModel,
                  currentKm: formData.currentKm,
                };
                updatedVehicles = [...existingVehicles, newVehicle];
              }

              // Use formData.customerId if available (more reliable from upsertCustomer)
              const customerIdToUpdate = formData.customerId || customer.id;

              // Save to Supabase database
              const { error: updateError } = await supabase
                .from("customers")
                .update({ vehicles: updatedVehicles })
                .eq("id", customerIdToUpdate);

              if (updateError) {
                console.error(
                  `[WorkOrderModal CREATE] Failed to update km in DB:`,
                  updateError
                );
              } else {
                // Update local context
                upsertCustomer({
                  ...customer,
                  id: customerIdToUpdate, // Ensure correct ID is used
                  vehicles: updatedVehicles,
                });
              }
            }
          }
        }

        // Invalidate queries to refresh the list
        if (invalidateWorkOrders) {
          invalidateWorkOrders();
        }

        onSave(workOrderData as unknown as WorkOrder);
        showToast.success(
          order?.id ? "Đã cập nhật phiếu" : "Đã lưu phiếu thành công"
        );
        clearDraft();
        onClose();
      } catch (error: any) {
        console.error("Error saving work order:", error);
        showToast.error(
          "Lỗi khi lưu phiếu: " +
          (error.message || error.hint || "Không xác định")
        );
      } finally {
        // 🔹 FIX: Reset submitting guard for handleSaveOnly
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    };

    // 🔹 Function to handle payment processing
    const handleSave = async () => {
      // 🔹 PREVENT DUPLICATE SUBMISSIONS (synchronous check with ref)
      if (submittingRef.current || isSubmitting) {
        return;
      }
      submittingRef.current = true; // Set immediately before async operations
      setIsSubmitting(true);

      // Helper function to reset submitting state
      const resetSubmitting = () => {
        submittingRef.current = false;
        setIsSubmitting(false);
      };

      try {
        // 🔹 VALIDATION FRONTEND
        // 1. Validate customer name & phone required
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

        // 2. Validate phone format (10-11 digits)
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(formData.customerPhone.trim())) {
          showToast.error("Số điện thoại không hợp lệ! (cần 10-11 chữ số)");
          resetSubmitting();
          return;
        }

        // ✅ FIX: Validate deposit cannot exceed total amount
        if (depositAmount > total && total > 0) {
          showToast.error(`Số tiền đặt cọc (${formatCurrency(depositAmount)}) không được lớn hơn tổng tiền (${formatCurrency(total)})!`);
          resetSubmitting();
          return;
        }

        if (
          formData.status === "Trả máy" &&
          showPartialPayment &&
          partialPayment > maxAdditionalPayment
        ) {
          showToast.error(
            `Số tiền thanh toán thêm không được vượt quá ${formatCurrency(maxAdditionalPayment)}!`
          );
          resetSubmitting();
          return;
        }

        // 3. Validate total > 0 ONLY if status is "Trả máy"
        if (total <= 0 && formData.status === "Trả máy") {
          showToast.error("Tổng tiền phải lớn hơn 0 khi trả máy");
          resetSubmitting();
          return;
        }

        // 4. Validate payment method when there's a payment (deposit or additional payment)
        if ((depositAmount > 0 || (formData.status === "Trả máy" && showPartialPayment && partialPayment > 0)) && !formData.paymentMethod) {
          showToast.error("Vui lòng chọn phương thức thanh toán");
          resetSubmitting();
          return;
        }

        // Add/update customer with duplicate check
        if (formData.customerName && formData.customerPhone) {
          const existingCustomer = customers.find(
            (c) => c.phone === formData.customerPhone
          );

          // 🔹 VALIDATE DUPLICATE PHONE
          if (!existingCustomer) {
            // Chỉ tạo khách hàng mới nếu SĐT chưa tồn tại
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
            // Khách hàng đã tồn tại - chỉ cập nhật thông tin xe nếu cần
            if (
              formData.vehicleModel &&
              existingCustomer.vehicleModel !== formData.vehicleModel
            ) {
              await upsertCustomer({
                ...existingCustomer,
                vehicleModel: formData.vehicleModel,
                licensePlate: formData.licensePlate,
              });
            }
          }
        }

        // Determine payment status
        let paymentStatus: "unpaid" | "paid" | "partial" = "unpaid";
        if (totalPaid >= total) {
          paymentStatus = "paid";
        } else if (totalPaid > 0) {
          paymentStatus = "partial";
        }

        // If this is a NEW work order, ALWAYS use atomic RPC
        if (!order?.id) {
          try {
            const orderId = `${storeSettings?.work_order_prefix || "SC"
              }-${Date.now()}`;

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
              additionalServices:
                additionalServices.length > 0 ? additionalServices : undefined,
              total: total,
              branchId: currentBranchId,
              paymentStatus: paymentStatus,
              paymentMethod: formData.paymentMethod,
              depositAmount: depositAmount > 0 ? depositAmount : undefined,
              // Use clamped value: prevents recording additionalPayment > (total - deposit)
              additionalPayment:
                additionalPaymentClamped > 0
                  ? additionalPaymentClamped
                  : undefined,
              totalPaid: totalPaid > 0 ? totalPaid : undefined,
              remainingAmount: remainingAmount,
              creationDate: new Date().toISOString(),
            } as any);

            // Extract transaction IDs from response
            const depositTxId = responseData?.depositTransactionId;
            const paymentTxId = responseData?.paymentTransactionId;

            // Create the finalOrder object to update the UI state
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
              additionalServices:
                additionalServices.length > 0 ? additionalServices : undefined,
              total: total,
              branchId: currentBranchId,
              depositAmount: depositAmount > 0 ? depositAmount : undefined,
              depositDate:
                depositAmount > 0 ? new Date().toISOString() : undefined,
              depositTransactionId: depositTxId,
              paymentStatus: paymentStatus,
              paymentMethod: formData.paymentMethod,
              additionalPayment:
                additionalPaymentClamped > 0
                  ? additionalPaymentClamped
                  : undefined,
              totalPaid: totalPaid > 0 ? totalPaid : undefined,
              remainingAmount: remainingAmount,
              cashTransactionId: paymentTxId,
              paymentDate: paymentTxId ? new Date().toISOString() : undefined,
              creationDate: new Date().toISOString(),
            };

            // Update cash transactions in context (for UI consistency)
            // ✅ No need to INSERT - stored procedure already created the transaction
            if (depositTxId && depositAmount > 0) {
              // Just update local state for UI consistency
              setCashTransactions((prev: any[]) => [
                ...prev,
                {
                  id: depositTxId,
                  type: "income",
                  category: "service_deposit",
                  amount: depositAmount,
                  date: new Date().toISOString(),
                  description: `Đặt cọc sửa chữa #${(
                    formatWorkOrderId(
                      orderId,
                      storeSettings?.work_order_prefix
                    ) || ""
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
                        [currentBranchId]:
                          (ps.balance[currentBranchId] || 0) + depositAmount,
                      },
                    };
                  }
                  return ps;
                })
              );
            }

            if (paymentTxId && totalAdditionalPayment > 0) {
              // ✅ No need to INSERT - stored procedure already created the transaction
              // Just update local state for UI consistency
              setCashTransactions((prev: any[]) => [
                ...prev,
                {
                  id: paymentTxId,
                  type: "income",
                  category: "service_income",
                  amount: totalAdditionalPayment,
                  date: new Date().toISOString(),
                  description: `Thu tiền sửa chữa #${(
                    formatWorkOrderId(
                      orderId,
                      storeSettings?.work_order_prefix
                    ) || ""
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
                        [currentBranchId]:
                          (ps.balance[currentBranchId] || 0) +
                          totalAdditionalPayment,
                      },
                    };
                  }
                  return ps;
                })
              );
            }

            // 🔹 Create cash transactions for outsourcing costs (Giá nhập từ gia công bên ngoài)
            if (additionalServices.length > 0) {
              const totalOutsourcingCost = additionalServices.reduce(
                (sum, service) =>
                  sum + (service.costPrice || 0) * service.quantity,
                0
              );

              // 🔹 TRƯỜNG HỢP ĐẶC BIỆT: Giá bán âm + Giá nhập = 0 → Tự động chi tiền
              const negativeSalesPayment = additionalServices.reduce(
                (sum, service) => {
                  // Chỉ tính các service có giá bán âm VÀ giá nhập = 0
                  if (service.price < 0 && (service.costPrice || 0) === 0) {
                    return sum + Math.abs(service.price * service.quantity);
                  }
                  return sum;
                },
                0
              );

              if (totalOutsourcingCost > 0) {
                const outsourcingTxId = `EXPENSE-${Date.now()}-${Math.random()
                  .toString(36)
                  .substr(2, 9)}`;

                // Create expense transaction
                try {
                  // Check if transaction already exists
                  const { data: existingTx } = await supabase
                    .from("cash_transactions")
                    .select("id")
                    .eq("reference", orderId)
                    .eq("category", "outsourcing")
                    .maybeSingle();

                  if (!existingTx) {
                    const { error: expenseError } = await supabase
                      .from("cash_transactions")
                      .insert({
                        id: outsourcingTxId,
                        type: "expense",
                        category: "outsourcing",
                        amount: -totalOutsourcingCost, // Negative for expense
                        date: new Date().toISOString(),
                        description: `Chi phí gia công bên ngoài - Phiếu #${orderId
                          .split("-")
                          .pop()} - ${additionalServices
                            .map((s) => s.description)
                            .join(", ")}`,
                        branchid: currentBranchId,
                        paymentsource: "cash",
                        reference: orderId,
                      });

                    if (expenseError) {
                      console.error("[Outsourcing] Insert FAILED:", expenseError);
                      showToast.error(
                        `Lỗi tạo phiếu chi gia công: ${expenseError.message}`
                      );
                    } else {
                      // Update context
                      setCashTransactions((prev: any[]) => [
                        ...prev,
                        {
                          id: outsourcingTxId,
                          type: "expense",
                          category: "outsourcing",
                          amount: -totalOutsourcingCost,
                          date: new Date().toISOString(),
                          description: `Chi phí gia công bên ngoài - Phiếu #${orderId
                            .split("-")
                            .pop()}`,
                          branchId: currentBranchId,
                          paymentSource: "cash",
                          reference: orderId,
                        },
                      ]);

                      // Update payment sources balance
                      setPaymentSources((prev: any[]) =>
                        prev.map((ps) => {
                          if (ps.id === "cash") {
                            return {
                              ...ps,
                              balance: {
                                ...ps.balance,
                                [currentBranchId]:
                                  (ps.balance[currentBranchId] || 0) -
                                  totalOutsourcingCost,
                              },
                            };
                          }
                          return ps;
                        })
                      );

                      showToast.info(
                        `Đã tạo phiếu chi ${formatCurrency(
                          totalOutsourcingCost
                        )} cho gia công bên ngoài`
                      );
                    }
                  }
                } catch (err) {
                  console.error("Error creating outsourcing expense:", err);
                }
              }

              // 🔹 Xử lý khoản chi từ giá bán âm (costPrice = 0)
              if (negativeSalesPayment > 0) {
                const negativeSalesTxId = `EXPENSE-NEG-${Date.now()}-${Math.random()
                  .toString(36)
                  .substr(2, 9)}`;

                try {
                  const negativeServices = additionalServices.filter(
                    (s) => s.price < 0 && (s.costPrice || 0) === 0
                  );

                  // Check if transaction already exists
                  const { data: existingNegTx } = await supabase
                    .from("cash_transactions")
                    .select("id")
                    .eq("reference", orderId)
                    .eq("category", "refund")
                    .maybeSingle();

                  if (!existingNegTx) {
                    const { error: negExpenseError } = await supabase
                      .from("cash_transactions")
                      .insert({
                        id: negativeSalesTxId,
                        type: "expense",
                        category: "refund", // Hoặc category phù hợp
                        amount: -negativeSalesPayment, // Negative for expense
                        date: new Date().toISOString(),
                        description: `Chi tiền (giá bán âm) - Phiếu #${orderId
                          .split("-")
                          .pop()} - ${negativeServices
                            .map((s) => s.description)
                            .join(", ")}`,
                        branchid: currentBranchId,
                        paymentsource: "cash",
                        reference: orderId,
                      });

                    if (negExpenseError) {
                      console.error(
                        "[Negative Sales] Insert FAILED:",
                        negExpenseError
                      );
                      showToast.error(
                        `Lỗi tạo phiếu chi (giá bán âm): ${negExpenseError.message}`
                      );
                    } else {
                      // Update context
                      setCashTransactions((prev: any[]) => [
                        ...prev,
                        {
                          id: negativeSalesTxId,
                          type: "expense",
                          category: "refund",
                          amount: -negativeSalesPayment,
                          date: new Date().toISOString(),
                          description: `Chi tiền (giá bán âm) - Phiếu #${orderId
                            .split("-")
                            .pop()}`,
                          branchId: currentBranchId,
                          paymentSource: "cash",
                          reference: orderId,
                        },
                      ]);

                      // Update payment sources balance
                      setPaymentSources((prev: any[]) =>
                        prev.map((ps) => {
                          if (ps.id === "cash") {
                            return {
                              ...ps,
                              balance: {
                                ...ps.balance,
                                [currentBranchId]:
                                  (ps.balance[currentBranchId] || 0) -
                                  negativeSalesPayment,
                              },
                            };
                          }
                          return ps;
                        })
                      );

                      showToast.info(
                        `Đã tạo phiếu chi ${formatCurrency(
                          negativeSalesPayment
                        )} từ giá bán âm`
                      );
                    }
                  }
                } catch (err) {
                  console.error("Error creating negative sales expense:", err);
                }
              }
            }

            // 🔹 Invalidate queries để refresh danh sách ngay
            if (invalidateWorkOrders) {
              invalidateWorkOrders();
            }

            // 🔹 FIX: Nếu tạo phiếu mới với paymentStatus = 'paid', gọi complete_payment để trừ kho
            // Kiểm tra flag inventoryDeducted từ response của atomic create
            // Nếu atomic create đã trừ kho rồi (inventoryDeducted = true) thì KHÔNG gọi complete_payment nữa
            if (
              paymentStatus === "paid" &&
              selectedParts.length > 0 &&
              !responseData?.inventoryDeducted
            ) {
              try {
                const result = await completeWorkOrderPayment(
                  orderId,
                  formData.paymentMethod || "cash",
                  0 // Số tiền = 0 vì đã thanh toán hết rồi, chỉ cần trừ kho
                );
                if (!result.ok) {
                  showToast.warning(
                    "Đã lưu phiếu nhưng có lỗi khi trừ kho: " +
                    (result.error.message || "Lỗi không xác định")
                  );
                }
              } catch (error: any) {
                console.error("[handleSave] Error deducting inventory:", error);
                showToast.warning(
                  "Đã lưu phiếu nhưng có lỗi khi trừ kho: " + error.message
                );
              }
            }

            // 🔹 Auto-create customer debt ONLY when status is "Trả máy" and there's remaining amount
            if (formData.status === "Trả máy" && remainingAmount > 0) {
              await createCustomerDebtIfNeeded(
                finalOrder,
                remainingAmount,
                total,
                totalPaid
              );
            }

            // 🔹 Call onSave AFTER all async operations complete (not before)
            // to prevent modal unmount before completePayment finishes
            onSave(finalOrder);

            // 🔹 Invalidate queries trước khi đóng modal để đảm bảo data mới được fetch
            if (invalidateWorkOrders) {
              invalidateWorkOrders();
            }

            // Close modal after successful save
            clearDraft();
            onClose();
          } catch (error: any) {
            console.error("Error creating work order (atomic):", error);
            // Error toast is already shown by the hook's onError
          }
          return;
        }

        // 🔹 If this is an UPDATE (with or without parts), use atomic RPC
        if (order?.id) {
          try {
            const responseData = await updateWorkOrderAtomicAsync({
              id: order.id,
              customerName: formData.customerName || "",
              customerPhone: formData.customerPhone || "",
              vehicleId: formData.vehicleId || "",
              vehicleModel: formData.vehicleModel || "",
              licensePlate: formData.licensePlate || "",
              currentKm: formData.currentKm,
              issueDescription: formData.issueDescription || "",
              technicianName: formData.technicianName || "",
              status: formData.status || "Tiếp nhận",
              laborCost: formData.laborCost || 0,
              discount: discount,
              partsUsed: selectedParts,
              additionalServices:
                additionalServices.length > 0 ? additionalServices : undefined,
              total: total,
              branchId: currentBranchId,
              paymentStatus: paymentStatus,
              paymentMethod: formData.paymentMethod,
              depositAmount: depositAmount > 0 ? depositAmount : undefined,
              // Use clamped value: prevents recording additionalPayment > (total - deposit)
              additionalPayment:
                additionalPaymentClamped > 0
                  ? additionalPaymentClamped
                  : undefined,
              totalPaid: totalPaid > 0 ? totalPaid : undefined,
              remainingAmount: remainingAmount,
            } as any);

            // 🔹 FIX: responseData IS already the normalized WorkOrder (from normalizeWorkOrder in repo)
            // No need for manual snake→camelCase conversion
            const depositTxId = responseData?.depositTransactionId;
            const paymentTxId = responseData?.paymentTransactionId;

            const finalOrder: WorkOrder = {
              ...(responseData as any),
              // Override with local values that may not be in the RPC response
              additionalServices:
                additionalServices.length > 0 ? additionalServices : undefined,
              depositTransactionId: depositTxId || order.depositTransactionId,
              cashTransactionId: paymentTxId || order.cashTransactionId,
            };

            // Update cash transactions in context if new deposit transaction created
            // ✅ No need to INSERT - stored procedure already created the transaction
            if (depositTxId && depositAmount > order.depositAmount!) {
              setCashTransactions((prev: any[]) => [
                ...prev,
                {
                  id: depositTxId,
                  type: "income",
                  category: "service_deposit",
                  amount: depositAmount - (order.depositAmount || 0),
                  date: new Date().toISOString(),
                  description: `Đặt cọc bổ sung #${(
                    formatWorkOrderId(
                      order.id,
                      storeSettings?.work_order_prefix
                    ) || ""
                  )
                    .split("-")
                    .pop()} - ${formData.customerName}`,
                  branchId: currentBranchId,
                  paymentSource: formData.paymentMethod,
                  reference: order.id,
                },
              ]);

              setPaymentSources((prev: any[]) =>
                prev.map((ps) => {
                  if (ps.id === formData.paymentMethod) {
                    return {
                      ...ps,
                      balance: {
                        ...ps.balance,
                        [currentBranchId]:
                          (ps.balance[currentBranchId] || 0) +
                          (depositAmount - (order.depositAmount || 0)),
                      },
                    };
                  }
                  return ps;
                })
              );
            }

            if (
              paymentTxId &&
              totalAdditionalPayment > (order.additionalPayment || 0)
            ) {
              const additionalPaymentAmount =
                totalAdditionalPayment - (order.additionalPayment || 0);

              // ✅ No need to INSERT - stored procedure already created the transaction
              // Just update local state for UI consistency
              setCashTransactions((prev: any[]) => [
                ...prev,
                {
                  id: paymentTxId,
                  type: "income",
                  category: "service_income",
                  amount: additionalPaymentAmount,
                  date: new Date().toISOString(),
                  description: `Thu tiền bổ sung #${(
                    formatWorkOrderId(
                      order.id,
                      storeSettings?.work_order_prefix
                    ) || ""
                  )
                    .split("-")
                    .pop()} - ${formData.customerName}`,
                  branchId: currentBranchId,
                  paymentSource: formData.paymentMethod,
                  reference: order.id,
                },
              ]);

              setPaymentSources((prev: any[]) =>
                prev.map((ps) => {
                  if (ps.id === formData.paymentMethod) {
                    return {
                      ...ps,
                      balance: {
                        ...ps.balance,
                        [currentBranchId]:
                          (ps.balance[currentBranchId] || 0) +
                          (totalAdditionalPayment -
                            (order.additionalPayment || 0)),
                      },
                    };
                  }
                  return ps;
                })
              );
            }

            // 🔹 Update/Create outsourcing expense when editing PAID order (gia công/đặt hàng)
            if (paymentStatus === "paid") {
              const outsourcingTotal = (additionalServices || []).reduce(
                (sum, service) =>
                  sum + (service.costPrice || 0) * (service.quantity || 1),
                0
              );
              const desiredAmount = -outsourcingTotal; // expense is negative

              try {
                const { data: existingTxs, error: fetchErr } = await supabase
                  .from("cash_transactions")
                  .select("id, amount, paymentsource, branchid, category")
                  .eq("reference", order.id)
                  .in("category", ["outsourcing", "outsourcing_expense", "service_cost"]);

                if (fetchErr) {
                  console.error(
                    "[Outsourcing-update] fetch error:",
                    fetchErr
                  );
                } else {
                  const existingTx = Array.isArray(existingTxs)
                    ? existingTxs[0]
                    : undefined;
                  const paymentSourceId =
                    (existingTx as any)?.paymentsource || "cash";

                  if (outsourcingTotal > 0) {
                    if (!existingTx) {
                      const outsourcingTxId = `EXPENSE-${Date.now()}-${Math.random()
                        .toString(36)
                        .substr(2, 9)}`;

                      const { error: insertErr } = await supabase
                        .from("cash_transactions")
                        .insert({
                          id: outsourcingTxId,
                          type: "expense",
                          category: "outsourcing",
                          amount: desiredAmount,
                          date: new Date().toISOString(),
                          description: `Chi phí gia công bên ngoài - Phiếu #${order.id
                            .split("-")
                            .pop()} - ${additionalServices
                              .map((s) => s.description)
                              .join(", ")}`,
                          branchid: currentBranchId,
                          paymentsource: "cash",
                          reference: order.id,
                        });

                      if (insertErr) {
                        console.error(
                          "[Outsourcing-update] insert error:",
                          insertErr
                        );
                      } else {
                        setCashTransactions((prev: any[]) => [
                          ...prev,
                          {
                            id: outsourcingTxId,
                            type: "expense",
                            category: "outsourcing",
                            amount: desiredAmount,
                            date: new Date().toISOString(),
                            description: `Chi phí gia công bên ngoài - Phiếu #${order.id
                              .split("-")
                              .pop()}`,
                            branchId: currentBranchId,
                            paymentSource: "cash",
                            reference: order.id,
                          },
                        ]);

                        setPaymentSources((prev: any[]) =>
                          prev.map((ps) => {
                            if (ps.id === "cash") {
                              return {
                                ...ps,
                                balance: {
                                  ...ps.balance,
                                  [currentBranchId]:
                                    (ps.balance[currentBranchId] || 0) -
                                    outsourcingTotal,
                                },
                              };
                            }
                            return ps;
                          })
                        );
                      }
                    } else if (existingTx.amount !== desiredAmount) {
                      const delta = desiredAmount - (existingTx.amount || 0);

                      const { error: updateErr } = await supabase
                        .from("cash_transactions")
                        .update({
                          amount: desiredAmount,
                          description: `Chi phí gia công bên ngoài - Phiếu #${order.id
                            .split("-")
                            .pop()} - ${additionalServices
                              .map((s) => s.description)
                              .join(", ")}`,
                        })
                        .eq("id", existingTx.id);

                      if (updateErr) {
                        console.error(
                          "[Outsourcing-update] update error:",
                          updateErr
                        );
                      } else {
                        setCashTransactions((prev: any[]) =>
                          prev.map((tx) =>
                            tx.id === existingTx.id
                              ? {
                                  ...tx,
                                  amount: desiredAmount,
                                  description: `Chi phí gia công bên ngoài - Phiếu #${order.id
                                    .split("-")
                                    .pop()}`,
                                }
                              : tx
                          )
                        );

                        if (delta !== 0) {
                          setPaymentSources((prev: any[]) =>
                            prev.map((ps) => {
                              if (ps.id === paymentSourceId) {
                                return {
                                  ...ps,
                                  balance: {
                                    ...ps.balance,
                                    [currentBranchId]:
                                      (ps.balance[currentBranchId] || 0) + delta,
                                  },
                                };
                              }
                              return ps;
                            })
                          );
                        }
                      }
                    }
                  } else if (existingTx) {
                    // If cost is cleared, remove existing expense
                    const { error: deleteErr } = await supabase
                      .from("cash_transactions")
                      .delete()
                      .eq("id", existingTx.id);

                    if (deleteErr) {
                      console.error(
                        "[Outsourcing-update] delete error:",
                        deleteErr
                      );
                    } else {
                      setCashTransactions((prev: any[]) =>
                        prev.filter((tx) => tx.id !== existingTx.id)
                      );

                      const refund = Math.abs(existingTx.amount || 0);
                      if (refund > 0) {
                        setPaymentSources((prev: any[]) =>
                          prev.map((ps) => {
                            if (ps.id === paymentSourceId) {
                              return {
                                ...ps,
                                balance: {
                                  ...ps.balance,
                                  [currentBranchId]:
                                    (ps.balance[currentBranchId] || 0) + refund,
                                },
                              };
                            }
                            return ps;
                          })
                        );
                      }
                    }
                  }
                }
              } catch (err) {
                console.error("[Outsourcing-update] unexpected error:", err);
              }
            }

            // 🔹 Force invalidate queries để refresh data mới từ DB
            if (invalidateWorkOrders) {
              invalidateWorkOrders();
            }

            // 🔹 FIX: Nếu cập nhật phiếu thành paymentStatus = 'paid', gọi complete_payment để trừ kho
            const wasUnpaidOrPartial = order.paymentStatus !== "paid";
            if (
              paymentStatus === "paid" &&
              wasUnpaidOrPartial &&
              selectedParts.length > 0
            ) {
              try {
                const result = await completeWorkOrderPayment(
                  order.id,
                  formData.paymentMethod || "cash",
                  0 // Số tiền = 0 vì đã thanh toán hết rồi, chỉ cần trừ kho
                );
                if (!result.ok) {
                  showToast.warning(
                    "Đã cập nhật phiếu nhưng có lỗi khi trừ kho: " +
                    (result.error.message || "Lỗi không xác định")
                  );
                }
              } catch (error: any) {
                console.error("[handleSave] Error deducting inventory:", error);
                showToast.warning(
                  "Đã cập nhật phiếu nhưng có lỗi khi trừ kho: " + error.message
                );
              }
            }

            // 🔹 Auto-create customer debt ONLY when status is "Trả máy" and there's remaining amount
            if (formData.status === "Trả máy" && remainingAmount > 0) {
              await createCustomerDebtIfNeeded(
                finalOrder,
                remainingAmount,
                total,
                totalPaid
              );
            }

            // 🔹 Call onSave AFTER all async operations complete (not before)
            onSave(finalOrder);

            // Close modal after successful update
            clearDraft();
            onClose();
          } catch (error: any) {
            console.error(
              "[handleSave] Error updating work order (atomic):",
              error
            );
            showToast.error(
              "Lỗi khi cập nhật phiếu: " +
              (error.message || error.hint || "Không xác định")
            );
          }
          return;
        }


      } finally {
        setIsSubmitting(false);
        submittingRef.current = false; // Reset synchronous guard
      }
    };

    const handleAddPart = (part: Part) => {
      const existing = selectedParts.find((p) => p.partId === part.id);
      if (existing) {
        setSelectedParts(
          selectedParts.map((p) =>
            p.partId === part.id ? { ...p, quantity: p.quantity + 1 } : p
          )
        );
      } else {
        setSelectedParts([
          ...selectedParts,
          {
            partId: part.id,
            partName: part.name,
            sku: part.sku || "",
            category: part.category || "",
            quantity: 1,
            price: part.retailPrice[currentBranchId] || 0,
            costPrice: part.costPrice?.[currentBranchId] || 0,
          },
        ]);
      }
      setShowPartSearch(false);
      setSearchPart("");
    };

    // Filter parts available at current branch with stock
    const availableParts = useMemo(() => {
      return parts.filter((part) => {
        const stock = part.stock?.[currentBranchId] || 0;
        return stock > 0;
      });
    }, [parts, currentBranchId]);

    const availablePartCategories = useMemo(() => {
      const unique = new Set<string>();
      for (const part of availableParts) {
        const c = part.category?.trim();
        if (c) unique.add(c);
      }
      return Array.from(unique).sort((a, b) => a.localeCompare(b, "vi"));
    }, [availableParts]);

    // Filter parts based on search - show all available parts if search is empty
    const filteredParts = useMemo(() => {
      const term = searchPart.trim().toLowerCase();

      return availableParts.filter((p) => {
        if (searchPartCategory && (p.category || "") !== searchPartCategory) {
          return false;
        }
        if (!term) return true;
        return (
          p.name.toLowerCase().includes(term) ||
          p.sku?.toLowerCase().includes(term)
        );
      });
    }, [availableParts, searchPart, searchPartCategory]);

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
        <div className="bg-white dark:bg-slate-800 w-full h-full md:h-auto md:max-h-[90vh] md:max-w-6xl rounded-t-3xl md:rounded-xl shadow-2xl md:shadow-lg flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2.5 md:px-6 flex-shrink-0">
            <div className="flex items-center justify-between">
              {/* Status Stepper */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 flex-1 mr-3">
              {[
                { key: "Tiếp nhận", icon: "📋", color: "blue" },
                { key: "Đang sửa", icon: "🔧", color: "orange" },
                { key: "Đã sửa xong", icon: "✅", color: "purple" },
                { key: "Trả máy", icon: "🏍️", color: "green" },
              ].map((step, idx, arr) => {
                const statuses = arr.map(s => s.key);
                const currentIdx = statuses.indexOf(formData.status || "Tiếp nhận");
                const stepIdx = idx;
                const isActive = stepIdx === currentIdx;
                const isPast = stepIdx < currentIdx;
                const colorMap: Record<string, string> = {
                  blue: isActive ? "bg-blue-500 text-white border-blue-500 shadow-blue-200 dark:shadow-blue-900" : isPast ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" : "bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600",
                  orange: isActive ? "bg-orange-500 text-white border-orange-500 shadow-orange-200 dark:shadow-orange-900" : isPast ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800" : "bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600",
                  purple: isActive ? "bg-purple-500 text-white border-purple-500 shadow-purple-200 dark:shadow-purple-900" : isPast ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" : "bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600",
                  green: isActive ? "bg-green-500 text-white border-green-500 shadow-green-200 dark:shadow-green-900" : isPast ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" : "bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600",
                };
                return (
                  <div key={step.key} className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: step.key as any })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${colorMap[step.color]} ${isActive ? "shadow-sm" : ""}`}
                    >
                      <span className="text-sm">{step.icon}</span>
                      <span className="hidden sm:inline">{step.key}</span>
                    </button>
                    {idx < arr.length - 1 && (
                      <div className={`w-4 h-0.5 rounded-full ${isPast ? "bg-slate-300 dark:bg-slate-500" : "bg-slate-200 dark:bg-slate-700"}`} />
                    )}
                  </div>
                );
              })}
              </div>

              {/* Right: Badge + Close Button */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {formData.id ? (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                    #{formatWorkOrderId(formData.id, storeSettings?.work_order_prefix)}
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                    Phiếu mới
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label="Đóng"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* 🔹 Warning Banner for Paid Orders */}
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
                    Tuy nhiên, bạn vẫn có thể cập nhật <b>Giá vốn (Cost)</b> của các dịch vụ để tính lợi nhuận chính xác, cũng như thông tin khách hàng và ghi chú.
                  </p>
                </div>
              </div>
            </div>
          )}

          {formData.id && selectedParts.length > 0 && (
            <div className="mx-4 mt-3 md:mx-6 p-3 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-lg">
              <button
                type="button"
                onClick={() => setShowInventoryCheck(!showInventoryCheck)}
                className="w-full flex items-center justify-between gap-2 text-left hover:opacity-80 transition-opacity"
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
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Kiểm tra trừ kho
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({inventoryTxs.length} dòng xuất kho)
                  </span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={handleRefreshInventoryTxs}
                    className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    Làm mới
                  </button>
                  {formData.paymentStatus === "paid" && inventoryTxs.length === 0 && (
                    <button
                      onClick={handleManualDeductInventory}
                      disabled={isDeductingInventory}
                      className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {isDeductingInventory ? "Đang trừ..." : "Trừ kho ngay"}
                    </button>
                  )}
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      (formData as any).inventory_deducted ||
                      (formData as any).inventoryDeducted
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    }`}
                  >
                    {(formData as any).inventory_deducted ||
                    (formData as any).inventoryDeducted
                      ? "Đã trừ kho"
                      : "Chưa trừ kho"}
                  </span>
                </div>
              </button>

              {showInventoryCheck && (
                <>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 pl-6">
                    Xuất kho ghi nhận: {inventoryTxs.length} dòng
                    {formData.paymentStatus !== "paid" && (
                      <> • Chưa thanh toán đủ nên chưa trừ kho (chỉ giữ)</>
                    )}
                  </div>

                  {inventoryTxLoading ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 pl-6">
                      Đang tải lịch sử xuất kho...
                    </div>
                  ) : inventoryTxError ? (
                    <div className="text-xs text-red-500 mt-2 pl-6">
                      {inventoryTxError}
                    </div>
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
                          <div className="font-medium text-slate-800 dark:text-slate-100 truncate">
                            {p.partName}
                          </div>
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
            <div className="flex-1 px-4 py-5 md:px-6 md:py-5 space-y-5 overflow-y-auto pb-24 md:pb-6">
            {/* Section 1: Customer & Vehicle Info */}
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Khách hàng & Xe
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Khách hàng <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative customer-search-container">
                      <input
                        type="text"
                        placeholder="Tìm khách hàng..."
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerDropdown(true);
                          setFormData({
                            ...formData,
                            customerId: "",
                            customerName: e.target.value,
                            customerPhone: "",
                            vehicleId: undefined,
                            vehicleModel: "",
                            licensePlate: "",
                          });
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      />

                      {/* Customer Dropdown */}
                      {showCustomerDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredCustomers.length > 0 ? (
                            <>
                              {filteredCustomers.map((customer) => (
                                <button
                                  key={customer.id}
                                  type="button"
                                  onClick={() => {
                                    // Find primary vehicle or first vehicle
                                    const primaryVehicle =
                                      customer.vehicles?.find(
                                        (v: Vehicle) => v.isPrimary
                                      ) || customer.vehicles?.[0];

                                    setFormData({
                                      ...formData,
                                      customerId: customer.id,
                                      customerName: customer.name,
                                      customerPhone: customer.phone,
                                      vehicleId: primaryVehicle?.id,
                                      vehicleModel:
                                        primaryVehicle?.model ||
                                        customer.vehicleModel ||
                                        "",
                                      licensePlate:
                                        primaryVehicle?.licensePlate ||
                                        customer.licensePlate ||
                                        "",
                                    });
                                    setCustomerSearch(customer.name);
                                    setShowCustomerDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 border-b border-slate-200 dark:border-slate-600 last:border-0"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
                                        {customer.name}
                                      </div>
                                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                        🔹 {customer.phone}
                                      </div>
                                      {(customer.vehicleModel ||
                                        customer.licensePlate ||
                                        customer.vehicles?.length > 0) && (
                                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1">
                                            <svg
                                              className="w-3 h-3"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <circle cx="6" cy="17" r="2" />
                                              <circle cx="18" cy="17" r="2" />
                                              <path d="M4 17h2l4-6h2l2 3h4" />
                                            </svg>
                                            {(() => {
                                              const primaryVehicle =
                                                customer.vehicles?.find(
                                                  (v: any) => v.isPrimary
                                                ) || customer.vehicles?.[0];
                                              const model =
                                                primaryVehicle?.model ||
                                                customer.vehicleModel;
                                              const plate =
                                                primaryVehicle?.licensePlate ||
                                                customer.licensePlate;
                                              return (
                                                <>
                                                  {model && <span>{model}</span>}
                                                  {plate && (
                                                    <span className="font-mono font-semibold text-yellow-600 dark:text-yellow-400">
                                                      {model && " - "}
                                                      {plate}
                                                    </span>
                                                  )}
                                                  {customer.vehicles?.length > 1 && (
                                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                                                      (+{customer.vehicles.length - 1}
                                                      )
                                                    </span>
                                                  )}
                                                </>
                                              );
                                            })()}
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                </button>
                              ))}
                              {hasMoreCustomers && customerSearch.trim() && (
                                <button
                                  type="button"
                                  onClick={handleLoadMoreCustomers}
                                  className="w-full text-center px-3 py-3 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 border-t border-slate-200 dark:border-slate-600"
                                >
                                  {isSearchingCustomer
                                    ? "Đang tải..."
                                    : "⬇️ Tải thêm khách hàng..."}
                                </button>
                              )}
                            </>
                          ) : (
                            <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                              {customers.length === 0
                                ? "Chưa có khách hàng nào. Nhấn '+' để thêm khách hàng mới."
                                : "Không tìm thấy khách hàng phù hợp"}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCustomerModal(true);
                        // Pre-fill phone if search term looks like a phone number
                        if (customerSearch && /^[0-9]+$/.test(customerSearch)) {
                          setNewCustomer({
                            ...newCustomer,
                            phone: customerSearch,
                          });
                        }
                      }}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-xl"
                      title="Thêm khách hàng mới"
                    >
                      +
                    </button>
                  </div>

                  {/* Display customer info after selection */}
                  {formData.customerName && formData.customerPhone && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start justify-between">
                        {/* View Mode */}
                        {!isEditingCustomer ? (
                          <>
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {formData.customerName}
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                <span className="inline-flex items-center gap-1">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="w-3.5 h-3.5"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M2.25 6.75c0 8.284 6.716 15 15 15 .828 0 1.5-.672 1.5-1.5v-2.25a1.5 1.5 0 00-1.5-1.5h-1.158a1.5 1.5 0 00-1.092.468l-.936.996a1.5 1.5 0 01-1.392.444 12.035 12.035 0 01-7.29-7.29 1.5 1.5 0 01.444-1.392l.996-.936a1.5 1.5 0 00.468-1.092V6.75A1.5 1.5 0 006.75 5.25H4.5c-.828 0-1.5.672-1.5 1.5z"
                                    />
                                  </svg>
                                  {formData.customerPhone}
                                </span>
                              </div>
                              {(formData.vehicleModel ||
                                formData.licensePlate) && (
                                  <div className="text-xs text-slate-600 dark:text-slate-400">
                                    <span className="inline-flex items-center gap-1">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="w-3.5 h-3.5"
                                      >
                                        <circle cx="6" cy="17" r="2" />
                                        <circle cx="18" cy="17" r="2" />
                                        <path d="M4 17h2l4-6h2l2 3h4" />
                                      </svg>
                                      {formData.vehicleModel}{" "}
                                      {formData.licensePlate &&
                                        `- ${formData.licensePlate}`}
                                    </span>
                                  </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Save Customer Button - Only show if customer not in DB yet */}
                              {!currentCustomer && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!formData.customerName?.trim() || !formData.customerPhone?.trim()) {
                                      showToast.error("Vui lòng nhập đầy đủ tên và số điện thoại");
                                      return;
                                    }
                                    
                                    // Validate phone
                                    const phoneValidation = validatePhoneNumber(formData.customerPhone);
                                    if (!phoneValidation.ok) {
                                      showToast.error(phoneValidation.error || "Số điện thoại không hợp lệ");
                                      return;
                                    }

                                    try {
                                      const tempCustomerId = `CUST-${Date.now()}`;
                                      const newCustomerData = {
                                        id: tempCustomerId,
                                        name: formData.customerName.trim(),
                                        phone: formData.customerPhone.trim(),
                                        created_at: new Date().toISOString(),
                                      };
                                      
                                      // Call upsertCustomer and get the real customer ID (new or existing)
                                      const realCustomerId = (await upsertCustomer(newCustomerData)) || tempCustomerId;
                                      
                                      // Update formData with the real customerId
                                      setFormData({
                                        ...formData,
                                        customerId: realCustomerId,
                                      });
                                      
                                      // Invalidate customers query to refresh data
                                      queryClient.invalidateQueries({ queryKey: ["customers"] });
                                    } catch (error: any) {
                                      console.error("Error saving customer:", error);
                                      
                                      // Check if it's a duplicate phone error
                                      const isDuplicatePhone = error?.code === '23505' || error?.message?.includes('customers_phone_unique');
                                      
                                      if (isDuplicatePhone) {
                                        // Phone already exists, find the existing customer
                                        const normalizePhone = (p: string) => p.replace(/\D/g, "");
                                        const searchPhoneDigits = normalizePhone(formData.customerPhone);
                                        
                                        const existingCustomer = allCustomers.find(c => {
                                          if (!c.phone) return false;
                                          const phones = c.phone.split(",").map((p: string) => normalizePhone(p.trim()));
                                          return phones.some((p: string) => p === searchPhoneDigits);
                                        });
                                        
                                        if (existingCustomer) {
                                          setFormData({
                                            ...formData,
                                            customerId: existingCustomer.id,
                                            customerName: existingCustomer.name,
                                            customerPhone: existingCustomer.phone,
                                          });
                                          setCustomerSearch(existingCustomer.name);
                                          showToast.info(`Số điện thoại đã tồn tại. Đã chọn khách hàng: ${existingCustomer.name}`);
                                        } else {
                                          showToast.error("Số điện thoại đã tồn tại trong hệ thống!");
                                        }
                                      } else {
                                        showToast.error("Không thể lưu khách hàng");
                                      }
                                    }
                                  }}
                                  className="text-green-500 hover:text-green-600 text-sm flex items-center gap-1 px-2 py-1 rounded border border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                                  title="Lưu khách hàng vào hệ thống"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="w-4 h-4"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                                    />
                                  </svg>
                                  <span className="text-xs font-medium">Lưu KH</span>
                                </button>
                              )}
                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditCustomerName(
                                    formData.customerName || ""
                                  );
                                  setEditCustomerPhone(
                                    formData.customerPhone || ""
                                  );
                                  setIsEditingCustomer(true);
                                }}
                                className="text-slate-400 hover:text-blue-500 text-sm flex items-center"
                                title="Sửa thông tin khách hàng"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  className="w-4 h-4"
                                  aria-hidden="true"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                                  />
                                </svg>
                              </button>
                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomerSearch("");
                                  setFormData({
                                    ...formData,
                                    customerName: "",
                                    customerPhone: "",
                                    customerId: "",
                                    vehicleId: undefined,
                                    vehicleModel: "",
                                    licensePlate: "",
                                  });
                                }}
                                className="text-slate-400 hover:text-red-500 text-sm flex items-center"
                                title="Xóa khách hàng"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  className="w-4 h-4"
                                  aria-hidden="true"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          </>
                        ) : (
                          /* Edit Mode */
                          <div className="w-full space-y-2">
                            <div>
                              <label className="text-xs text-slate-500 dark:text-slate-400">
                                Tên khách hàng
                              </label>
                              <input
                                type="text"
                                value={editCustomerName}
                                onChange={(e) =>
                                  setEditCustomerName(e.target.value)
                                }
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                placeholder="Nhập tên khách hàng"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 dark:text-slate-400">
                                Số điện thoại
                              </label>
                              <input
                                type="tel"
                                value={editCustomerPhone}
                                onChange={(e) =>
                                  setEditCustomerPhone(e.target.value)
                                }
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                placeholder="Nhập số điện thoại"
                              />
                            </div>
                            <div className="flex gap-2 justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => setIsEditingCustomer(false)}
                                className="px-3 py-1 text-xs bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500"
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveEditedCustomer}
                                className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600"
                              >
                                Lưu
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Vehicle Selection & Add Vehicle - Hiển thị khi đã có thông tin khách hàng */}
                  {(currentCustomer || formData.customerName) && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                          {customerVehicles.length > 0
                            ? "Chọn xe"
                            : "Xe của khách hàng"}
                          {customerVehicles.length > 0 && (
                            <span className="text-xs text-slate-500 ml-1">
                              ({customerVehicles.length} xe)
                            </span>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowAddVehicleModal(true)}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium"
                          title="Thêm xe mới"
                        >
                          + Thêm xe
                        </button>
                      </div>

                      {customerVehicles.length > 0 ? (
                        <div className="space-y-2">
                          {customerVehicles.map((vehicle: Vehicle) => {
                            const isSelected = formData.vehicleId === vehicle.id;
                            const isPrimary = vehicle.isPrimary;
                            const isEditing = editingVehicleId === vehicle.id;

                            return (
                              <div
                                key={vehicle.id}
                                className={`w-full rounded-lg border-2 transition-all ${isSelected
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                                  : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                                  }`}
                              >
                                {isEditing ? (
                                  // Edit mode
                                  <div className="p-3 space-y-2">
                                    <div>
                                      <label className="text-xs text-slate-500 dark:text-slate-400">
                                        Dòng xe
                                      </label>
                                      <input
                                        type="text"
                                        value={editVehicleModel}
                                        onChange={(e) =>
                                          setEditVehicleModel(e.target.value)
                                        }
                                        className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                        placeholder="Nhập dòng xe"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-slate-500 dark:text-slate-400">
                                        Biển số
                                      </label>
                                      <input
                                        type="text"
                                        value={editVehicleLicensePlate}
                                        onChange={(e) =>
                                          setEditVehicleLicensePlate(
                                            e.target.value.toUpperCase()
                                          )
                                        }
                                        className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                        placeholder="Nhập biển số"
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end pt-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingVehicleId(null);
                                          setEditVehicleModel("");
                                          setEditVehicleLicensePlate("");
                                        }}
                                        className="px-3 py-1 text-xs bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500"
                                      >
                                        Hủy
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleSaveEditedVehicle}
                                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                      >
                                        Lưu
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  // Display mode
                                  <button
                                    type="button"
                                    onClick={() => handleSelectVehicle(vehicle)}
                                    className="w-full text-left px-3 py-2.5"
                                  >
                                    <div className="flex items-center gap-2">
                                      {isPrimary && (
                                        <span
                                          className="text-yellow-500"
                                          title="Xe chính"
                                        >
                                          ⭐
                                        </span>
                                      )}
                                      <div className="flex-1">
                                        <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                                          {vehicle.model}
                                        </div>
                                        <div className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                                          {vehicle.licensePlate}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingVehicleId(vehicle.id);
                                            setEditVehicleModel(
                                              vehicle.model || ""
                                            );
                                            setEditVehicleLicensePlate(
                                              vehicle.licensePlate || ""
                                            );
                                          }}
                                          className="text-slate-400 hover:text-blue-500 p-1"
                                          title="Sửa thông tin xe"
                                        >
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="w-4 h-4"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                          </svg>
                                        </button>
                                        {isSelected && (
                                          <svg
                                            className="w-5 h-5 text-blue-500"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4 px-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Chưa có xe nào. Nhấn "+ Thêm xe" để thêm.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Số KM hiện tại
                  </label>
                  <input
                    type="number"
                    placeholder="15000"
                    value={formData.currentKm || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currentKm: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Mô tả sự cố
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Bảo dưỡng định kỳ, thay nhớt..."
                    value={formData.issueDescription || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        issueDescription: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">2</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Chi tiết Dịch vụ
                  </h3>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Kỹ thuật viên
                    </label>
                    <select
                      value={formData.technicianName || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          technicianName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">-- Chọn kỹ thuật viên --</option>
                      {employees
                        .filter(
                          (emp) =>
                            emp.status === "active" &&
                            (emp.department?.toLowerCase().includes("kỹ thuật") ||
                              emp.position?.toLowerCase().includes("kỹ thuật"))
                        )
                        .map((emp) => (
                          <option key={emp.id} value={emp.name}>
                            {emp.name}
                          </option>
                        ))}
                    </select>
                  </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phí dịch vụ (Công thợ)
                    {!canEditPriceAndParts && (
                      <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                        (Không thể sửa)
                      </span>
                    )}
                  </label>
                  <NumberInput
                    placeholder="100.000"
                    value={formData.laborCost || ""}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        laborCost: val,
                      })
                    }
                    disabled={!canEditPriceAndParts}
                    className={`w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 ${!canEditPriceAndParts ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Ghi chú nội bộ
                  </label>
                  <textarea
                    rows={4}
                    placeholder="VD: Khách yêu cầu kiểm tra thêm hệ thống điện"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Parts Used */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">3</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Phụ tùng sử dụng
                  </h3>
                  {selectedParts.length > 0 && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">{selectedParts.length}</span>
                  )}
                </div>
                <button
                  onClick={() => setShowPartSearch(!showPartSearch)}
                  disabled={!canEditPriceAndParts}
                  className={`px-3 py-1.5 text-white rounded text-sm flex items-center gap-1 ${canEditPriceAndParts
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-slate-400 dark:bg-slate-600 cursor-not-allowed opacity-50"
                    }`}
                  title={
                    canEditPriceAndParts
                      ? "Thêm phụ tùng"
                      : "Không thể thêm phụ tùng cho phiếu đã thanh toán"
                  }
                >
                  + Thêm phụ tùng
                </button>
              </div>

              {showPartSearch && (
                <div className="relative">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Tìm kiếm phụ tùng theo tên hoặc SKU..."
                      value={searchPart}
                      onChange={(e) => setSearchPart(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      autoFocus
                    />
                    <select
                      value={searchPartCategory}
                      onChange={(e) => setSearchPartCategory(e.target.value)}
                      className="w-48 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      aria-label="Danh mục phụ tùng"
                    >
                      <option value="">Tất cả danh mục</option>
                      {availablePartCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                    {partsLoading ? (
                      <div className="px-4 py-3 text-sm text-slate-500">
                        Đang tải phụ tùng...
                      </div>
                    ) : filteredParts.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-500">
                        Không tìm thấy phụ tùng
                      </div>
                    ) : (
                      <>
                        {filteredParts.slice(0, 50).map((part) => {
                          const stock = part.stock?.[currentBranchId] || 0;
                          return (
                            <button
                              key={part.id}
                              onClick={() => {
                                if (stock <= 0) {
                                  showToast.error("Sản phẩm đã hết hàng!");
                                  return;
                                }
                                handleAddPart(part);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center justify-between border-b border-slate-100 dark:border-slate-600 last:border-b-0"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {part.name}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                                    {part.sku}
                                  </span>
                                  <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                                    Tồn: {stock}
                                  </span>
                                  {part.category && (
                                    <span
                                      className={`inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-medium ${getCategoryColor(part.category).bg
                                        } ${getCategoryColor(part.category).text}`}
                                    >
                                      {part.category}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(
                                  part.retailPrice[currentBranchId] || 0
                                )}
                              </div>
                            </button>
                          );
                        })}
                        {filteredParts.length > 50 && (
                          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-500 italic border-t border-slate-100 dark:border-slate-600">
                            Đang hiển thị 50/{filteredParts.length} kết quả. Vui lòng tìm kiếm chi tiết hơn.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300">
                        Tên
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
                        SL
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-600 dark:text-slate-300">
                        Đ.Giá
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-600 dark:text-slate-300">
                        T.Tiền
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                    {selectedParts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-sm text-slate-400"
                        >
                          Chưa có phụ tùng nào
                        </td>
                      </tr>
                    ) : (
                      selectedParts.map((part, idx) => (
                        <tr key={idx} className="bg-white dark:bg-slate-800">
                          <td className="px-4 py-2">
                            <div className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                              {part.partName}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {part.sku && (
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                                  {part.sku}
                                </span>
                              )}
                              {part.category && (
                                <span
                                  className={`inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-medium ${getCategoryColor(part.category).bg
                                    } ${getCategoryColor(part.category).text}`}
                                >
                                  {part.category}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={part.quantity}
                              disabled={!canEditPriceAndParts}
                              onChange={(e) => {
                                const newQty = Number(e.target.value);
                                setSelectedParts(
                                  selectedParts.map((p, i) =>
                                    i === idx ? { ...p, quantity: newQty } : p
                                  )
                                );
                              }}
                              className={`w-16 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-center bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 ${!canEditPriceAndParts
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                                }`}
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <NumberInput
                              placeholder="Đơn giá"
                              value={part.price || ""}
                              onChange={(val) => {
                                setSelectedParts(
                                  selectedParts.map((p, i) =>
                                    i === idx ? { ...p, price: val } : p
                                  )
                                );
                              }}
                              disabled={!canEditPriceAndParts}
                              className={`w-28 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm ${!canEditPriceAndParts
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                                }`}
                            />
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(part.price * part.quantity)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() =>
                                setSelectedParts(
                                  selectedParts.filter((_, i) => i !== idx)
                                )
                              }
                              disabled={!canEditPriceAndParts}
                              className={`${canEditPriceAndParts
                                ? "text-red-500 hover:text-red-700"
                                : "text-slate-400 cursor-not-allowed"
                                }`}
                              aria-label="Xóa phụ tùng"
                              title={
                                canEditPriceAndParts
                                  ? "Xóa phụ tùng"
                                  : "Không thể xóa phụ tùng cho phiếu đã thanh toán"
                              }
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="w-4 h-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M3 6h18M9 6V4h6v2m-7 4v8m4-8v8m4-8v8"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quote/Estimate Section */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-purple-500/10 dark:bg-purple-400/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">4</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Báo giá (Gia công, Đặt hàng)
                </h3>
                {additionalServices.length > 0 && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">{additionalServices.length}</span>
                )}
              </div>

              <div className="border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300">
                        Mô tả
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
                        SL
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-600 dark:text-slate-300">
                        Giá nhập
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-600 dark:text-slate-300">
                        Đơn giá
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-600 dark:text-slate-300">
                        Thành tiền
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
                        <button
                          onClick={() => {
                            if (newService.description) {
                              setAdditionalServices([
                                ...additionalServices,
                                { ...newService, id: `SRV-${Date.now()}` },
                              ]);
                              setNewService({
                                description: "",
                                quantity: 1,
                                price: 0,
                                costPrice: 0,
                              });
                            }
                          }}
                          className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs"
                        >
                          Thêm
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Existing services */}
                    {additionalServices.map((service) => (
                      <tr
                        key={service.id}
                        className="border-b border-slate-200 dark:border-slate-700"
                      >
                        <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-100">
                          {service.description}
                        </td>
                        <td className="px-4 py-2 text-center text-sm text-slate-900 dark:text-slate-100">
                          <input
                            type="number"
                            value={service.quantity}
                            min="1"
                            onChange={(e) => {
                              const newQty = Math.max(1, Number(e.target.value));
                              setAdditionalServices(
                                additionalServices.map((s) =>
                                  s.id === service.id
                                    ? { ...s, quantity: newQty }
                                    : s
                                )
                              );
                            }}
                            className="w-16 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-center bg-white dark:bg-slate-700 focus:border-blue-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2 text-right relative">
                          <NumberInput
                            value={service.costPrice ?? 0}
                            onChange={(val) =>
                              setAdditionalServices(
                                additionalServices.map((s) =>
                                  s.id === service.id
                                    ? { ...s, costPrice: val }
                                    : s
                                )
                              )
                            }
                            // Always allow editing cost price for internal tracking
                            disabled={false}
                            className="w-full px-2 py-1 border border-orange-200 dark:border-orange-800 rounded text-right bg-orange-50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400 focus:border-orange-500 focus:bg-white dark:focus:bg-slate-700 transition-colors text-sm"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <NumberInput
                            value={service.price}
                            onChange={(val) =>
                              setAdditionalServices(
                                additionalServices.map((s) =>
                                  s.id === service.id
                                    ? { ...s, price: val }
                                    : s
                                )
                              )
                            }
                            disabled={!canEditPriceAndParts}
                            className={`w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none text-sm ${!canEditPriceAndParts
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                              }`}
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(service.price * service.quantity)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={async () => {
                              const newServices = additionalServices.filter(
                                (s) => s.id !== service.id
                              );
                              setAdditionalServices(newServices);
                              
                              // 🔹 FIX: Nếu xóa hết services VÀ đang edit order có sẵn → Update DB ngay
                              if (newServices.length === 0 && order?.id) {
                                try {
                                  await supabase
                                    .from('work_orders')
                                    .update({ additionalservices: null })
                                    .eq('id', order.id);
                                  showToast.success('Đã xóa phần gia công/đặt hàng');
                                } catch (error) {
                                  console.error('[WorkOrderModal] Error clearing additionalServices:', error);
                                  showToast.error('Lỗi khi xóa phần gia công/đặt hàng');
                                }
                              }
                            }}
                            className="text-red-500 hover:text-red-700 text-sm"
                            aria-label="Xóa dịch vụ"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 6h18M9 6V4h6v2m-7 4v8m4-8v8m4-8v8"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Input row */}
                    <tr className="bg-white dark:bg-slate-800">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          placeholder="Mô tả..."
                          value={newService.description}
                          onChange={(e) =>
                            setNewService({
                              ...newService,
                              description: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={newService.quantity}
                          onChange={(e) =>
                            setNewService({
                              ...newService,
                              quantity: Number(e.target.value),
                            })
                          }
                          className="w-16 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-center bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <NumberInput
                          placeholder="Giá nhập"
                          value={newService.costPrice ?? ""}
                          onChange={(val) =>
                            setNewService({
                              ...newService,
                              costPrice: Math.max(0, val), // Chỉ cho phép >= 0
                            })
                          }
                          className="w-full px-2 py-1 border border-orange-300 dark:border-orange-600 rounded text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <NumberInput
                          placeholder="Đơn giá"
                          value={newService.price ?? ""}
                          onChange={(val) =>
                            setNewService({
                              ...newService,
                              price: val, // Cho phép số âm
                            })
                          }
                          allowNegative={true}
                          className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-slate-400">
                        {newService.price > 0
                          ? formatCurrency(newService.price * newService.quantity)
                          : "Thành tiền"}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {/* Empty for add row */}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            {/* END Left Panel */}
            </div>

            {/* Right Panel - Sticky Sidebar */}
            <div className="hidden lg:flex lg:flex-col lg:w-80 xl:w-96 border-l border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 overflow-y-auto flex-shrink-0">
              <div className="p-4 space-y-4 flex flex-col h-full">
                {/* Summary Card */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Tổng kết
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Phí dịch vụ</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(formData.laborCost || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Phụ tùng</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(partsTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Gia công/Đặt hàng</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(servicesTotal)}</span>
                    </div>
                  </div>

                  {/* Discount */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-red-500 font-medium">Giảm giá</span>
                      <div className="flex items-center gap-1.5">
                        <NumberInput
                          value={discountType === "amount" ? formData.discount || "" : discountPercent}
                          onChange={(val) => {
                            if (discountType === "amount") {
                              setFormData({ ...formData, discount: Math.min(val, subtotal) });
                            } else {
                              const percent = Math.min(val, 100);
                              setDiscountPercent(percent);
                              setFormData({ ...formData, discount: Math.round((subtotal * percent) / 100) });
                            }
                          }}
                          allowNegative={false}
                          allowDecimal={false}
                          className="w-24 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs"
                          min={0}
                          max={discountType === "amount" ? subtotal : 100}
                          placeholder="0"
                        />
                        <select
                          value={discountType}
                          onChange={(e) => {
                            setDiscountType(e.target.value as "amount" | "percent");
                            setFormData({ ...formData, discount: 0 });
                            setDiscountPercent(0);
                          }}
                          className="px-1.5 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs"
                        >
                          <option value="amount">đ</option>
                          <option value="percent">%</option>
                        </select>
                      </div>
                    </div>
                    {discountType === "percent" && (
                      <div className="flex gap-1 justify-end mt-1.5">
                        {[5, 10, 15, 20].map((percent) => (
                          <button
                            key={percent}
                            onClick={() => {
                              setDiscountPercent(percent);
                              setFormData({ ...formData, discount: Math.round((subtotal * percent) / 100) });
                            }}
                            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${discountPercent === percent ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-300'}`}
                          >
                            {percent}%
                          </button>
                        ))}
                      </div>
                    )}
                    {discountType === "percent" && discountPercent > 0 && (
                      <div className="text-[10px] text-slate-400 text-right mt-1">= {formatCurrency(formData.discount || 0)}</div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="pt-3 border-t-2 border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Tổng cộng</span>
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(total)}</span>
                    </div>
                    {(totalDeposit > 0 || totalAdditionalPayment > 0) && (
                      <div className="space-y-1 pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
                        {totalDeposit > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-green-600 dark:text-green-400">Đã đặt cọc</span>
                            <span className="font-medium text-green-600 dark:text-green-400">-{formatCurrency(totalDeposit)}</span>
                          </div>
                        )}
                        {totalAdditionalPayment > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-green-600 dark:text-green-400">TT thêm</span>
                            <span className="font-medium text-green-600 dark:text-green-400">-{formatCurrency(totalAdditionalPayment)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {remainingAmount > 0 ? "Còn phải thu" : "Đã thanh toán đủ"}
                          </span>
                          <span className={`text-base font-bold ${remainingAmount > 0 ? "text-red-500" : "text-green-500"}`}>
                            {formatCurrency(remainingAmount)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Options Card */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Thanh toán</h3>
                  </div>

                  {/* Deposit */}
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showDepositInput}
                      onChange={(e) => { setShowDepositInput(e.target.checked); if (!e.target.checked) setDepositAmount(0); }}
                      disabled={!!order?.depositAmount}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Đặt cọc {order?.depositAmount ? `(Đã cọc: ${formatCurrency(order.depositAmount)})` : ""}
                    </span>
                  </label>
                  {showDepositInput && !order?.depositAmount && (
                    <div className="pl-6">
                      <NumberInput
                        placeholder="Số tiền đặt cọc"
                        value={depositAmount || ""}
                        onChange={(val) => setDepositAmount(val)}
                        className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                      />
                    </div>
                  )}

                  <div className="border-t border-slate-200 dark:border-slate-700"></div>

                  {/* Payment Method */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block uppercase tracking-wide">Phương thức</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: "cash" })}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${formData.paymentMethod === "cash" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300"}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <rect x="2" y="6" width="20" height="12" rx="2" ry="2" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Tiền mặt
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: "bank" })}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${formData.paymentMethod === "bank" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300"}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M7 6h10l2 4H5l2-4Zm2 4v11m6-11v11" />
                        </svg>
                        Chuyển khoản
                      </button>
                    </div>
                  </div>

                  {/* Partial payment - Trả máy only */}
                  {formData.status === "Trả máy" && (
                    <>
                      <div className="border-t border-slate-200 dark:border-slate-700"></div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={showPartialPayment}
                          onChange={(e) => { setShowPartialPayment(e.target.checked); if (!e.target.checked) setPartialPayment(0); }}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Thanh toán khi trả xe</span>
                      </label>
                      {showPartialPayment && (
                        <div className="pl-6 space-y-2">
                          <label className="text-xs text-slate-500 dark:text-slate-400">Số tiền thanh toán thêm:</label>
                          <div className="flex items-center gap-1.5">
                            <NumberInput
                              placeholder="0"
                              value={partialPayment || ""}
                              onChange={(val) => setPartialPayment(val)}
                              className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                            />
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => setPartialPayment(0)} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded text-xs">0%</button>
                            <button onClick={() => setPartialPayment(Math.round(maxAdditionalPayment * 0.5))} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded text-xs">50%</button>
                            <button onClick={() => setPartialPayment(maxAdditionalPayment)} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded text-xs">100%</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {formData.status !== "Trả máy" && (
                    <p className="text-[10px] text-slate-400 italic leading-relaxed">
                      * Thanh toán khi trả xe chỉ khả dụng khi trạng thái là "Trả máy"
                    </p>
                  )}
                </div>

                {/* Action Buttons - Sticky at bottom */}
                <div className="mt-auto pt-3 space-y-2">
                  <button
                    onClick={handleSaveOnly}
                    disabled={isSubmitting}
                    className={`w-full px-4 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${isSubmitting ? 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600'}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    {isSubmitting ? 'Đang lưu...' : 'Lưu Phiếu'}
                  </button>

                  {formData.status !== "Trả máy" && showDepositInput && (
                    <button
                      onClick={handleSave}
                      disabled={isSubmitting}
                      className={`w-full px-4 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${isSubmitting ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 shadow-sm shadow-blue-200 dark:shadow-blue-900'} text-white`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Đặt cọc
                    </button>
                  )}

                  {formData.status === "Trả máy" && (
                    <button
                      onClick={handleSave}
                      disabled={isSubmitting}
                      className={`w-full px-4 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${isSubmitting ? 'bg-green-300 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 shadow-sm shadow-green-200 dark:shadow-green-900'} text-white`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Thanh toán
                    </button>
                  )}

                  <button
                    onClick={onClose}
                    className="w-full px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile-only: Payment & Summary Section (shown below form on mobile) */}
            <div className="lg:hidden px-4 py-5 space-y-4 border-t border-slate-200 dark:border-slate-700">
              {/* Mobile Summary */}
              <div className="bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Tổng kết</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Phí dịch vụ</span>
                  <span className="font-medium">{formatCurrency(formData.laborCost || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Phụ tùng</span>
                  <span className="font-medium">{formatCurrency(partsTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Gia công</span>
                  <span className="font-medium">{formatCurrency(servicesTotal)}</span>
                </div>
                <div className="pt-2 border-t-2 border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 dark:text-slate-100">Tổng cộng</span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile-only Footer */}
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-end gap-2 bg-white dark:bg-slate-800 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm">
              Hủy
            </button>
            <button
              onClick={handleSaveOnly}
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-lg font-medium text-sm ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-500 hover:bg-slate-600'} text-white`}
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu Phiếu'}
            </button>
            {formData.status !== "Trả máy" && showDepositInput && (
              <button onClick={handleSave} disabled={isSubmitting} className={`px-5 py-2 rounded-lg font-medium text-sm ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white`}>
                Đặt cọc
              </button>
            )}
            {formData.status === "Trả máy" && (
              <button onClick={handleSave} disabled={isSubmitting} className={`px-5 py-2 rounded-lg font-medium text-sm ${isSubmitting ? 'bg-green-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'} text-white`}>
                Thanh toán
              </button>
            )}
          </div>
        </div>

        {/* Add Customer Modal */}
        {showAddCustomerModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-md p-6 m-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Thêm khách hàng
                </h3>
                <button
                  onClick={() => {
                    setShowAddCustomerModal(false);
                    setNewCustomer({
                      name: "",
                      phone: "",
                      vehicleModel: "",
                      licensePlate: "",
                    });
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tên khách
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập tên khách"
                    value={newCustomer.name}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    placeholder="VD: 09xxxx"
                    value={newCustomer.phone}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative vehicle-search-container">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Dòng xe
                    </label>
                    <input
                      type="text"
                      placeholder="Chọn hoặc nhập dòng xe"
                      value={newCustomer.vehicleModel}
                      onChange={(e) => {
                        setNewCustomer({
                          ...newCustomer,
                          vehicleModel: e.target.value,
                        });
                        setShowVehicleDropdown(true);
                      }}
                      onFocus={() => setShowVehicleDropdown(true)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />

                    {/* Vehicle Model Dropdown */}
                    {showVehicleDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                        {POPULAR_MOTORCYCLES.filter((model) =>
                          model
                            .toLowerCase()
                            .includes(newCustomer.vehicleModel.toLowerCase())
                        ).map((model: string) => (
                          <button
                            key={model}
                            type="button"
                            onClick={() => {
                              setNewCustomer({
                                ...newCustomer,
                                vehicleModel: model,
                              });
                              setShowVehicleDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 text-sm border-b border-slate-200 dark:border-slate-600 last:border-0 text-slate-900 dark:text-slate-100"
                          >
                            {model}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Biển số
                    </label>
                    <input
                      type="text"
                      placeholder="VD: 59A1-123.45"
                      value={newCustomer.licensePlate}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          licensePlate: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddCustomerModal(false);
                    setNewCustomer({
                      name: "",
                      phone: "",
                      vehicleModel: "",
                      licensePlate: "",
                    });
                  }}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (newCustomer.name && newCustomer.phone) {
                      // Check if customer already exists
                      const existingCustomer = customers.find(
                        (c) => c.phone === newCustomer.phone
                      );

                      if (!existingCustomer) {
                        // Customer doesn't exist - create new one
                        const customerId = `CUST-${Date.now()}`;
                        const vehicleId = `VEH-${Date.now()}`;
                        const vehicles = [];
                        if (
                          newCustomer.vehicleModel ||
                          newCustomer.licensePlate
                        ) {
                          vehicles.push({
                            id: vehicleId,
                            model: newCustomer.vehicleModel || "",
                            licensePlate: newCustomer.licensePlate || "",
                            isPrimary: true,
                          });
                        }

                        upsertCustomer({
                          id: customerId,
                          name: newCustomer.name,
                          phone: newCustomer.phone,
                          vehicles: vehicles.length > 0 ? vehicles : undefined,
                          vehicleModel: newCustomer.vehicleModel,
                          licensePlate: newCustomer.licensePlate,
                          created_at: new Date().toISOString(),
                        });

                        // Set the new customer to the form AND search field
                        setFormData({
                          ...formData,
                          customerId: customerId,
                          customerName: newCustomer.name,
                          customerPhone: newCustomer.phone,
                          vehicleId: vehicles.length > 0 ? vehicleId : undefined,
                          vehicleModel: newCustomer.vehicleModel,
                          licensePlate: newCustomer.licensePlate,
                        });
                      } else {
                        // Customer exists - just use existing customer and optionally update vehicle
                        const hasVehicleChange =
                          (newCustomer.vehicleModel &&
                            newCustomer.vehicleModel !==
                            existingCustomer.vehicleModel) ||
                          (newCustomer.licensePlate &&
                            newCustomer.licensePlate !==
                            existingCustomer.licensePlate);

                        let vehicleIdToUse = existingCustomer.vehicles?.[0]?.id;

                        if (hasVehicleChange) {
                          const vehicleId = `VEH-${Date.now()}`;
                          const vehicles = [...(existingCustomer.vehicles || [])];

                          // Check if vehicle with this license plate already exists
                          const existingVehicleIndex = vehicles.findIndex(
                            (v) => v.licensePlate === newCustomer.licensePlate
                          );

                          if (
                            existingVehicleIndex >= 0 &&
                            newCustomer.licensePlate
                          ) {
                            // Update existing vehicle
                            vehicles[existingVehicleIndex] = {
                              ...vehicles[existingVehicleIndex],
                              model:
                                newCustomer.vehicleModel ||
                                vehicles[existingVehicleIndex].model,
                            };
                            vehicleIdToUse = vehicles[existingVehicleIndex].id;
                          } else if (
                            newCustomer.vehicleModel ||
                            newCustomer.licensePlate
                          ) {
                            // Add new vehicle
                            vehicles.push({
                              id: vehicleId,
                              model: newCustomer.vehicleModel || "",
                              licensePlate: newCustomer.licensePlate || "",
                              isPrimary: vehicles.length === 0,
                            });
                            vehicleIdToUse = vehicleId;
                          }

                          upsertCustomer({
                            ...existingCustomer,
                            vehicles: vehicles.length > 0 ? vehicles : undefined,
                            vehicleModel:
                              newCustomer.vehicleModel ||
                              existingCustomer.vehicleModel,
                            licensePlate:
                              newCustomer.licensePlate ||
                              existingCustomer.licensePlate,
                          });
                        }

                        // Set the existing customer to the form
                        setFormData({
                          ...formData,
                          customerId: existingCustomer.id,
                          customerName: existingCustomer.name,
                          customerPhone: existingCustomer.phone,
                          vehicleId: vehicleIdToUse,
                          vehicleModel:
                            newCustomer.vehicleModel ||
                            existingCustomer.vehicleModel,
                          licensePlate:
                            newCustomer.licensePlate ||
                            existingCustomer.licensePlate,
                        });
                      }

                      // Update customer search to show the name
                      setCustomerSearch(newCustomer.name);

                      // Close modal and reset
                      setShowAddCustomerModal(false);
                      setNewCustomer({
                        name: "",
                        phone: "",
                        vehicleModel: "",
                        licensePlate: "",
                      });
                    }
                  }}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                  disabled={!newCustomer.name || !newCustomer.phone}
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Vehicle Modal */}
        {showAddVehicleModal && currentCustomer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Thêm xe cho {currentCustomer.name}
              </h3>

              <div className="space-y-4 mb-6">
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Loại xe <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Exciter, Vision, Wave..."
                    value={newVehicle.model}
                    onChange={(e) => {
                      setNewVehicle({ ...newVehicle, model: e.target.value });
                      setShowAddVehicleModelDropdown(true);
                    }}
                    onFocus={() => setShowAddVehicleModelDropdown(true)}
                    onBlur={() =>
                      setTimeout(() => setShowAddVehicleModelDropdown(false), 200)
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    autoFocus
                  />
                  {showAddVehicleModelDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {POPULAR_MOTORCYCLES.filter((model) =>
                        model
                          .toLowerCase()
                          .includes(newVehicle.model.toLowerCase())
                      )
                        .slice(0, 20)
                        .map((model, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setNewVehicle({ ...newVehicle, model });
                              setShowAddVehicleModelDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-600 text-sm border-b border-slate-200 dark:border-slate-600 last:border-0 text-slate-900 dark:text-slate-100"
                          >
                            {model}
                          </button>
                        ))}
                      {POPULAR_MOTORCYCLES.filter((model) =>
                        model
                          .toLowerCase()
                          .includes(newVehicle.model.toLowerCase())
                      ).length === 0 && (
                          <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 text-center">
                            Không tìm thấy - nhập tên xe mới
                          </div>
                        )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Biển số <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 29A 12345"
                    value={newVehicle.licensePlate}
                    onChange={(e) =>
                      setNewVehicle({
                        ...newVehicle,
                        licensePlate: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                  🔹 Xe mới sẽ tự động được chọn sau khi thêm
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowAddVehicleModal(false);
                    setNewVehicle({ model: "", licensePlate: "" });
                    setShowAddVehicleModelDropdown(false);
                  }}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddVehicle}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                  disabled={
                    !newVehicle.model.trim() || !newVehicle.licensePlate.trim()
                  }
                >
                  Thêm xe
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

export default WorkOrderModal;
