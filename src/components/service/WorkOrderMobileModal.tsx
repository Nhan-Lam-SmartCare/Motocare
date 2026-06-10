import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  X,
  Check,
  Search,
  AlertTriangle,
  Printer,
  Share2,
  User,
  Bike,
  Wrench,
  FileText,
  CheckCircle,
  Clock,
  Edit2,
  PhoneCall,
  ChevronRight,
  TrendingUp,
  UserPlus,
  Banknote,
  MessageSquare,
  Package,
  ScanBarcode,
} from "lucide-react";
import BarcodeScannerModal from "../common/BarcodeScannerModal";
import { triggerHaptic } from "../../utils/haptics";
import { formatCurrency, formatWorkOrderId, normalizeSearchText } from "../../utils/format";
import { getCategoryColor } from "../../utils/categoryColors";
import type { WorkOrder, Part, Customer, Vehicle, Employee } from "../../types";
import {
  checkVehicleMaintenance,
  formatKm,
  type MaintenanceWarning,
} from "../../utils/maintenanceReminder";
import { WORK_ORDER_STATUS, type WorkOrderStatus } from "../../constants";
import { NumberInput } from "../common/NumberInput";
import { showToast } from "../../utils/toast";
import { supabase } from "../../supabaseClient";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useInputHistory } from "../../hooks/useInputHistory";
import { useAuth } from "../../contexts/AuthContext";
import { CustomerInfoSection } from "./components/mobile/CustomerInfoSection";
import { VehicleInfoSection } from "./components/mobile/VehicleInfoSection";
import { PartsListSection } from "./components/mobile/PartsListSection";
import { POPULAR_MOTORCYCLES } from "./constants/service.constants";
import { ServiceListSection } from "./components/mobile/ServiceListSection";
import { PaymentSection } from "./components/mobile/PaymentSection";
import { WorkOrderMobileDetailView } from "./components/mobile/WorkOrderMobileDetailView";
import { PartSearchSheet } from "./components/mobile/PartSearchSheet";
import { AddServiceModal } from "./components/mobile/AddServiceModal";
import { AddCustomerModal } from "./components/mobile/AddCustomerModal";



interface WorkOrderMobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workOrderData: any) => Promise<void> | void;
  onPrintWorkOrder?: (workOrder: WorkOrder) => void;
  workOrder?: WorkOrder | null;
  customers: Customer[];
  parts: Part[];
  employees: Employee[];
  currentBranchId: string;
  upsertCustomer?: (customer: any) => Promise<string> | void;
  viewMode?: boolean; // true = xem chi tiết, false = chỉnh sửa
  onSwitchToEdit?: () => void; // callback khi bấm nút chỉnh sửa từ view mode
  isOwner?: boolean; // true = chủ shop, có thể xem lợi nhuận
}

export const WorkOrderMobileModal: React.FC<WorkOrderMobileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onPrintWorkOrder,
  workOrder,
  customers,
  parts,
  employees,
  currentBranchId,
  upsertCustomer,
  viewMode = false,
  onSwitchToEdit,
  isOwner = false,
}) => {
  const { profile } = useAuth();
  const profileId = (profile as any)?.id || (profile as any)?.user_id || "anon";
  const currentTechnicianId = useMemo(() => {
    if (profile?.role !== "staff") return "";

    const profileAny = profile as any;
    const profileUserId = profileAny?.id;
    const profileEmail = String(profileAny?.email || "").toLowerCase();
    const profileName = profileAny?.name || profileAny?.full_name || "";

    if (profileUserId) {
      const byId = employees.find((e: any) => e?.id === profileUserId)?.id;
      if (byId) return byId;
    }

    if (profileEmail) {
      const byEmail = employees.find(
        (e: any) => String(e?.email || "").toLowerCase() === profileEmail
      )?.id;
      if (byEmail) return byEmail;
    }

    if (profileName) {
      const byName = employees.find((e: any) => e?.name === profileName)?.id;
      if (byName) return byName;
    }

    return "";
  }, [profile, employees]);
  
  const WORK_ORDER_DRAFT_VERSION = 1 as const;
  const WORK_ORDER_DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

  // Find customer and vehicle from workOrder data
  const initialCustomer = useMemo(() => {
    if (!workOrder) return null;
    
    // 🔹 FIX: Ưu tiên tìm theo customerId (unique), sau đó phone (unique), cuối cùng mới name
    let foundCustomer = workOrder.customerId
      ? customers.find((c) => c.id === workOrder.customerId)
      : undefined;
    
    // Nếu không tìm thấy theo ID, thử tìm theo phone (chính xác)
    if (!foundCustomer && workOrder.customerPhone) {
      foundCustomer = customers.find((c) => c.phone === workOrder.customerPhone);
    }
    
    // Cuối cùng mới tìm theo name (không tin cậy vì có thể trùng)
    if (!foundCustomer && workOrder.customerName) {
      foundCustomer = customers.find((c) => c.name === workOrder.customerName);
    }

    // If not found, create a temporary customer object from workOrder data
    if (!foundCustomer && workOrder.customerName) {
      return {
        id: `temp-${Date.now()}`,
        name: workOrder.customerName,
        phone: workOrder.customerPhone || "",
        vehicles: workOrder.licensePlate
          ? [
            {
              id: `temp-veh-${Date.now()}`,
              licensePlate: workOrder.licensePlate,
              model: workOrder.vehicleModel || "",
            },
          ]
          : [],
      } as Customer;
    }

    // If found customer, check if workOrder's vehicle exists in customer's vehicles
    // If not, add it as a temporary vehicle
    if (foundCustomer && workOrder.licensePlate) {
      const vehicleExists = foundCustomer.vehicles?.some(
        (v) => v.licensePlate === workOrder.licensePlate
      );

      if (!vehicleExists) {
        // Clone customer and add temp vehicle
        return {
          ...foundCustomer,
          vehicles: [
            ...(foundCustomer.vehicles || []),
            {
              id: `temp-veh-${Date.now()}`,
              licensePlate: workOrder.licensePlate,
              model: workOrder.vehicleModel || "",
            },
          ],
        } as Customer;
      }
    }

    return foundCustomer || null;
  }, [workOrder, customers]);

  const initialVehicles = useMemo(() => {
    if (!initialCustomer?.vehicles) return [];
    return initialCustomer.vehicles;
  }, [initialCustomer]);

  const initialVehicle = useMemo(() => {
    if (!workOrder) return null;
    if (!initialVehicles.length) return null;

    // Try to find by license plate first
    let foundVehicle = initialVehicles.find(
      (v) => v.licensePlate === workOrder.licensePlate
    );

    // If not found by license plate, try by model
    if (!foundVehicle && workOrder.vehicleModel) {
      foundVehicle = initialVehicles.find(
        (v) => v.model === workOrder.vehicleModel
      );
    }

    // If still not found, use first vehicle or create temp vehicle from workOrder data
    if (!foundVehicle) {
      if (workOrder.licensePlate || workOrder.vehicleModel) {
        return {
          id: `temp-veh-${Date.now()}`,
          licensePlate: workOrder.licensePlate || "",
          model: workOrder.vehicleModel || "",
          customerId: initialCustomer?.id || "",
        } as Vehicle;
      }
      return initialVehicles[0] || null;
    }

    return foundVehicle;
  }, [workOrder, initialVehicles, initialCustomer]);

  // States
  const [status, setStatus] = useState<WorkOrderStatus>(
    (workOrder?.status as WorkOrderStatus) || WORK_ORDER_STATUS.RECEIVED
  );
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(
    employees.find((e) => e.name === workOrder?.technicianName)?.id || currentTechnicianId
  );
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Update selectedCustomer and selectedVehicle when workOrder changes
  useEffect(() => {
    if (workOrder) {
      setStatus((workOrder.status as WorkOrderStatus) || WORK_ORDER_STATUS.RECEIVED);
      setSelectedTechnicianId(
        employees.find((e) => e.name === workOrder?.technicianName)?.id || ""
      );
      setIssueDescription(workOrder.issueDescription || "");
      setLaborCost(workOrder.laborCost || 0);
      setDiscount(workOrder.discount || 0);
      // BUG 7/10 note: discountType is NOT stored in the DB (WorkOrder type has no `discountType` field).
      // When reloading, workOrder.discount is always the absolute computed value.
      // We reset discountType to "amount" so the UI shows the correct absolute number.
      // To fully fix this, add a `discountType` column to the work_orders table.
      setDiscountType("amount");
      setSelectedParts(
        workOrder.partsUsed?.map((p) => ({
          partId: p.partId || "",
          partName: p.partName,
          quantity: p.quantity,
          sellingPrice: p.price || 0,
          costPrice: p.costPrice || 0,
          sku: p.sku || "",
          category: p.category || "",
        })) || []
      );
      setAdditionalServices(
        workOrder.additionalServices?.map((s) => ({
          id: s.id || `srv-${Date.now()}-${Math.random()}`,
          name: s.description || "",
          quantity: s.quantity || 1,
          costPrice: s.costPrice || 0,
          sellingPrice: s.price || 0,
        })) || []
      );
      setSelectedCustomer(initialCustomer);
      setSelectedVehicle(initialVehicle);
      // Load currentKm: ưu tiên từ workOrder, nếu không có thì từ vehicle
      if (workOrder.currentKm) {
        setCurrentKm(workOrder.currentKm.toString());
      } else if (initialVehicle?.currentKm) {
        setCurrentKm(initialVehicle.currentKm.toString());
      }
      if (workOrder.paymentMethod === "cash" || workOrder.paymentMethod === "bank") {
        setPaymentMethod(workOrder.paymentMethod);
      }
      // Nếu đang edit và có initialCustomer, ẩn form tìm kiếm
      setShowCustomerSearch(!initialCustomer);

      // Sync deposit amount từ workOrder (để hiển thị số tiền đã đặt cọc)
      if (workOrder.depositAmount && workOrder.depositAmount > 0) {
        setDepositAmount(workOrder.depositAmount);
        setIsDeposit(true);
      } else {
        setDepositAmount(0);
        setIsDeposit(false);
      }

      if (workOrder.additionalPayment && workOrder.additionalPayment > 0) {
        setPartialAmount(workOrder.additionalPayment);
        setShowPaymentInput(true);
      } else {
        setPartialAmount(0);
        setShowPaymentInput(false);
      }
    } else {
      setStatus(WORK_ORDER_STATUS.RECEIVED);
      setSelectedTechnicianId(currentTechnicianId);
      setIssueDescription("");
      setLaborCost(0);
      setDiscount(0);
      setDiscountType("amount");
      setSelectedParts([]);
      setAdditionalServices([]);
      setSelectedCustomer(null);
      setSelectedVehicle(null);
      setCurrentKm("");
      setShowCustomerSearch(true);
      setDepositAmount(0);
      setIsDeposit(false);
      setPartialAmount(0);
      setShowPaymentInput(false);
    }
  }, [workOrder, initialCustomer, initialVehicle, employees, currentTechnicianId]);

  // Keep default technician applied for new order if employees/profile loads after modal opened.
  useEffect(() => {
    if (!isOpen) return;
    if (workOrder) return;
    if (!currentTechnicianId) return;
    if (selectedTechnicianId) return;

    setSelectedTechnicianId(currentTechnicianId);
  }, [isOpen, workOrder, currentTechnicianId, selectedTechnicianId]);

  const draftKey = useMemo(() => {
    const orderKey = workOrder?.id || "new";
    return `workorder_draft_v${WORK_ORDER_DRAFT_VERSION}:${currentBranchId}:${profileId}:${orderKey}:mobile`;
  }, [WORK_ORDER_DRAFT_VERSION, currentBranchId, profileId, workOrder?.id]);

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

  const [currentKm, setCurrentKm] = useState(
    workOrder?.currentKm?.toString() || ""
  );
  const [issueDescription, setIssueDescription] = useState(
    workOrder?.issueDescription || ""
  );
  const [selectedParts, setSelectedParts] = useState<
    Array<{
      partId: string;
      partName: string;
      quantity: number;
      sellingPrice: number;
      costPrice?: number;
      sku?: string;
      category?: string;
    }>
  >(
    workOrder?.partsUsed?.map((p) => ({
      partId: p.partId || "",
      partName: p.partName,
      quantity: p.quantity,
      sellingPrice: p.price || 0,
      costPrice: p.costPrice || 0,
      sku: p.sku || "",
      category: p.category || "",
    })) || []
  );
  const [additionalServices, setAdditionalServices] = useState<
    Array<{
      id: string;
      name: string;
      quantity: number;
      costPrice: number;
      sellingPrice: number;
    }>
  >(
    workOrder?.additionalServices?.map((s) => ({
      id: s.id || `srv-${Date.now()}-${Math.random()}`,
      name: s.description || "",
      quantity: s.quantity || 1,
      costPrice: s.costPrice || 0,
      sellingPrice: s.price || 0,
    })) || []
  );
  const [laborCost, setLaborCost] = useState(workOrder?.laborCost || 0);
  const [discount, setDiscount] = useState(workOrder?.discount || 0);
  const [discountType, setDiscountType] = useState<"amount" | "percent">(
    "amount"
  );
  const [isDeposit, setIsDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("cash");
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [partialAmount, setPartialAmount] = useState(0);

  // Auto-restore draft (new/edit) when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (draftCheckedRef.current) return;
    draftCheckedRef.current = true;

    const draft = loadDraft();
    if (!draft) return;

    // Restore primitives
    if (draft.status) setStatus(draft.status);
    if (typeof draft.selectedTechnicianId === "string") {
      setSelectedTechnicianId(draft.selectedTechnicianId);
    }
    if (typeof draft.currentKm === "string") setCurrentKm(draft.currentKm);
    if (typeof draft.issueDescription === "string") setIssueDescription(draft.issueDescription);
    if (Array.isArray(draft.selectedParts)) setSelectedParts(draft.selectedParts);
    if (Array.isArray(draft.additionalServices)) setAdditionalServices(draft.additionalServices);
    if (typeof draft.laborCost === "number") setLaborCost(draft.laborCost);
    if (typeof draft.discount === "number") setDiscount(draft.discount);
    if (draft.discountType === "amount" || draft.discountType === "percent") {
      setDiscountType(draft.discountType);
    }
    if (typeof draft.isDeposit === "boolean") setIsDeposit(draft.isDeposit);
    if (typeof draft.depositAmount === "number") setDepositAmount(draft.depositAmount);
    if (draft.paymentMethod === "cash" || draft.paymentMethod === "bank") {
      setPaymentMethod(draft.paymentMethod);
    }
    if (typeof draft.showPaymentInput === "boolean") setShowPaymentInput(draft.showPaymentInput);
    if (typeof draft.partialAmount === "number") setPartialAmount(draft.partialAmount);

    // Restore customer/vehicle (best-effort)
    if (draft.customer) {
      const foundCustomer = customers.find(
        (c) => c.id === draft.customer.id || c.phone === draft.customer.phone
      );
      setSelectedCustomer(foundCustomer || draft.customer);
      setShowCustomerSearch(false);
    }
    if (draft.vehicle) {
      const current = draft.customer
        ? customers.find((c) => c.id === draft.customer.id || c.phone === draft.customer.phone)
        : null;
      const vehicles = current?.vehicles || [];
      const foundVehicle = vehicles.find(
        (v: any) => v.id === draft.vehicle.id || v.licensePlate === draft.vehicle.licensePlate
      );
      setSelectedVehicle(foundVehicle || draft.vehicle);
    }
  }, [isOpen, customers, draftKey]);

  // Auto-save draft while editing (debounced)
  useEffect(() => {
    if (!isOpen) return;
    if (!draftCheckedRef.current) return; // avoid overwriting before restore check
    if (viewMode) return;

    const hasMeaningfulData =
      !!selectedCustomer ||
      !!selectedVehicle ||
      !!currentKm.trim() ||
      !!issueDescription.trim() ||
      selectedParts.length > 0 ||
      additionalServices.length > 0 ||
      laborCost > 0 ||
      discount > 0 ||
      (isDeposit && depositAmount > 0) ||
      (showPaymentInput && partialAmount > 0);

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
        status,
        selectedTechnicianId,
        customer: selectedCustomer
          ? {
            id: (selectedCustomer as any).id,
            name: (selectedCustomer as any).name,
            phone: (selectedCustomer as any).phone,
          }
          : null,
        vehicle: selectedVehicle
          ? {
            id: (selectedVehicle as any).id,
            licensePlate: (selectedVehicle as any).licensePlate,
            model: (selectedVehicle as any).model,
            currentKm: (selectedVehicle as any).currentKm,
            customerId: (selectedVehicle as any).customerId,
          }
          : null,
        currentKm,
        issueDescription,
        selectedParts,
        additionalServices,
        laborCost,
        discount,
        discountType,
        isDeposit,
        depositAmount,
        paymentMethod,
        showPaymentInput,
        partialAmount,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [
    isOpen,
    viewMode,
    draftKey,
    status,
    selectedTechnicianId,
    selectedCustomer,
    selectedVehicle,
    currentKm,
    issueDescription,
    selectedParts,
    additionalServices,
    laborCost,
    discount,
    discountType,
    isDeposit,
    depositAmount,
    paymentMethod,
    showPaymentInput,
    partialAmount,
  ]);

  // UI States - khởi tạo showCustomerSearch dựa trên initialCustomer để đảm bảo đúng khi edit
  const [showCustomerSearch, setShowCustomerSearch] = useState(
    !initialCustomer
  );
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  // Server-side search state
  const [serverCustomers, setServerCustomers] = useState<Customer[]>([]);
  const debouncedCustomerSearch = useDebouncedValue(customerSearchTerm, 500);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerPage, setCustomerPage] = useState(0);
  const [hasMoreCustomers, setHasMoreCustomers] = useState(true);
  const CUSTOMER_PAGE_SIZE = 20;
  const [showPartSearch, setShowPartSearch] = useState(false);
  const [partSearchTerm, setPartSearchTerm] = useState("");
  const [partCategoryFilter, setPartCategoryFilter] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);

  // Ref for part search results scrolling
  const partResultsRef = useRef<HTMLDivElement>(null);
  const [showAddService, setShowAddService] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceCost, setNewServiceCost] = useState(0);
  const [newServicePrice, setNewServicePrice] = useState(0);
  const [newServiceQuantity, setNewServiceQuantity] = useState(1);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehiclePlate, setNewVehiclePlate] = useState("");
  const [newVehicleName, setNewVehicleName] = useState("");
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerVehicleModel, setNewCustomerVehicleModel] = useState("");
  const [newCustomerLicensePlate, setNewCustomerLicensePlate] = useState("");

  // State for vehicle model dropdowns
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [showCustomerVehicleDropdown, setShowCustomerVehicleDropdown] =
    useState(false);

  // State for editing existing customer
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");

  // State for preventing duplicate submissions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Input history for auto-complete
  const customerNameHistory = useInputHistory('customer_name');
  const licensePlateHistory = useInputHistory('license_plate');
  const phoneHistory = useInputHistory('phone');

  // Tab navigation state
  type TabType = 'info' | 'parts' | 'payment';
  const [activeTab, setActiveTabRaw] = useState<TabType>('info');
  const setActiveTab = (tab: TabType) => {
    triggerHaptic("selection");
    setActiveTabRaw(tab);
  };

  // --- KEYBOARD & VIEWPORT HANDLING ---
  // Fix for mobile keyboard covering the Save button
  // We use window.visualViewport to detect the actual visible height and position the modal correctly
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [viewportStyle, setViewportStyle] = useState<React.CSSProperties>({
    top: 0,
    height: "100vh",
  });

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
        setViewportStyle({
          top: `${window.visualViewport.offsetTop}px`,
          height: `${window.visualViewport.height}px`,
        });
      }
    };

    window.visualViewport?.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("scroll", handleResize);

    // Initial set
    handleResize();

    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("scroll", handleResize);
    };
  }, [isOpen]);

  const isKeyboardOpen = typeof window !== 'undefined' && viewportHeight ? viewportHeight < window.innerHeight - 150 : false;

  // Handle Save with Haptics and Validation
  const handleSaveInternal = async () => {
    // Prevent duplicate taps before React state is flushed
    if (submittingRef.current || isSubmitting) {
      return;
    }

    // Basic validation
    if (!selectedVehicle && !newVehiclePlate) {
      showToast.error("Vui lòng chọn hoặc thêm xe");
      triggerHaptic("error");
      return;
    }

    try {
      submittingRef.current = true;
      setIsSubmitting(true);
      const transformedParts = selectedParts.map((p) => ({
        partId: p.partId,
        partName: p.partName,
        quantity: p.quantity,
        price: p.sellingPrice,
        costPrice: p.costPrice || 0,
        sku: p.sku || "",
        category: p.category || "",
      }));

      const transformedServices = additionalServices.map((s) => ({
        id: s.id,
        description: s.name,
        quantity: s.quantity,
        price: s.sellingPrice,
        costPrice: s.costPrice,
      }));

      // BUG 9 fix: also validate deposit when total === 0 (no charge but deposit was set)
      if (isDeposit && depositAmount > 0 && total === 0) {
        showToast.error("Tổng tiền bằng 0, không cần đặt cọc");
        setIsSubmitting(false);
        return;
      }
      if (isDeposit && depositAmount > total && total > 0) {
        showToast.error("Số tiền đặt cọc không được lớn hơn tổng tiền");
        setIsSubmitting(false);
        return;
      }

      const totalDeposit = isDeposit ? depositAmount : 0;
      // BUG 8 fix: remove auto-fill of full remaining payment when status="Trả máy".
      // Staff must explicitly toggle payment input. Matches desktop behavior.
      let additionalPayment = showPaymentInput ? partialAmount : 0;

      // additionalPayment is cumulative; clamp to valid range
      const maxAdditionalPayment = Math.max(0, total - totalDeposit);
      additionalPayment = Math.min(
        Math.max(0, additionalPayment),
        maxAdditionalPayment
      );

      const totalPaid = totalDeposit + additionalPayment;
      const remainingAmount = Math.max(0, total - totalPaid);

      // Wait for onSave to complete (it might throw if invalid)
      await onSave({
        ...workOrder,
        customer: selectedCustomer,
        vehicle: selectedVehicle,
        parts: transformedParts,
        partsUsed: transformedParts,
        additionalServices: transformedServices,
        laborCost,
        discount: discountAmount,
        discountType,
        total,
        isDeposit,
        depositAmount,
        paymentMethod,
        currentKm,
        issueDescription,
        status,
        technicianId: selectedTechnicianId,
        partialAmount: showPaymentInput ? partialAmount : 0,
        totalPaid,
        remainingAmount,
      });
      triggerHaptic("success");
      clearDraft();

      // Save to input history for future auto-complete
      if (selectedCustomer?.name) {
        customerNameHistory.addToHistory(selectedCustomer.name);
      }
      if (selectedCustomer?.phone) {
        phoneHistory.addToHistory(selectedCustomer.phone);
      }
      if (selectedVehicle?.licensePlate) {
        licensePlateHistory.addToHistory(selectedVehicle.licensePlate);
      }
    } catch (error) {
      console.error("Save error:", error);
      triggerHaptic("error");
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  // Combined fetch function
  const fetchCustomers = async (page: number, searchTerm: string, isLoadMore = false) => {
    if (!searchTerm || !searchTerm.trim()) {
      if (!isLoadMore) setServerCustomers([]);
      return;
    }

    setIsSearchingCustomer(true);
    try {
      const from = page * CUSTOMER_PAGE_SIZE;
      const to = from + CUSTOMER_PAGE_SIZE - 1;

      // Extract digits for better phone search (supports multiple phone numbers)
      const searchDigits = searchTerm.replace(/\D/g, "");
      const isPhoneSearch = searchDigits.length >= 10; // Chỉ tìm SĐT khi đủ 10 số

      // Build OR query - only include phone search if digits >= 10
      const orConditions = [
        `name.ilike.%${searchTerm}%`,
        `vehiclemodel.ilike.%${searchTerm}%`,
        `licenseplate.ilike.%${searchTerm}%`
      ];
      if (isPhoneSearch) {
        orConditions.push(`phone.ilike.%${searchDigits}%`);
      }

      const { data, error, count } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: false })
        .or(orConditions.join(","))
        .range(from, to);

      if (!error && data) {
        if (isLoadMore) {
          setServerCustomers((prev) => {
            // Deduplicate just in case
            const newIds = new Set(data.map(c => c.id));
            const filteredPrev = prev.filter(c => !newIds.has(c.id));
            return [...filteredPrev, ...data as Customer[]];
          });
        } else {
          setServerCustomers(data as Customer[]);
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
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  // Effect to trigger search when debounced term changes
  useEffect(() => {
    // Reset page when search term changes
    setCustomerPage(0);
    setHasMoreCustomers(true);

    // Only fetch if has search term
    if (debouncedCustomerSearch && debouncedCustomerSearch.trim()) {
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

  // Filtered customers (combining local and server results)
  const filteredCustomers = useMemo(() => {
    // Merge local customers and server customers, removing duplicates by ID
    const allCandidates = [...customers, ...serverCustomers];
    const uniqueCandidates = Array.from(new Map(allCandidates.map(c => [c.id, c])).values());

    if (!customerSearchTerm) return uniqueCandidates;
    const term = normalizeSearchText(customerSearchTerm);
    const filtered = uniqueCandidates.filter(
      (c) =>
        normalizeSearchText(c.name).includes(term) ||
        c.phone?.toLowerCase().includes(term) ||
        normalizeSearchText(c.vehicleModel || "").includes(term) ||
        normalizeSearchText(c.licensePlate || "").includes(term) ||
        (c.vehicles &&
          c.vehicles.some((v: any) =>
            normalizeSearchText(v.licensePlate).includes(term) ||
            normalizeSearchText(v.model || "").includes(term) ||
            v.licensePlate?.toLowerCase().includes(term.toLowerCase())
          ))
    );
    return filtered;
  }, [customers, serverCustomers, customerSearchTerm]);

  // Filtered parts - first filter by stock > 0 (matching desktop behavior)
  const availableParts = useMemo(() => {
    return parts.filter((part) => {
      const stock = part.stock?.[currentBranchId] || 0;
      return stock > 0;
    });
  }, [parts, currentBranchId]);

  const filteredParts = useMemo(() => {
    const normalizedQuery = normalizeSearchText(partSearchTerm.trim());
    const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

    return availableParts.filter((p) => {
      if (partCategoryFilter && (p.category || "") !== partCategoryFilter) {
        return false;
      }
      if (queryWords.length === 0) return true;
      const combined = [
        normalizeSearchText(p.name),
        normalizeSearchText(p.category),
        normalizeSearchText((p as any).description),
        (p.sku || "").toLowerCase(),
      ].join(" ");
      return queryWords.every((word) => combined.includes(word));
    });
  }, [availableParts, partSearchTerm, partCategoryFilter]);

  const availablePartCategories = useMemo(() => {
    const unique = new Set<string>();
    for (const part of availableParts) {
      const c = part.category?.trim();
      if (c) unique.add(c);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "vi"));
  }, [availableParts]);

  // Auto-scroll to top of part results when search term changes and has results
  useEffect(() => {
    if (partSearchTerm && filteredParts.length > 0 && partResultsRef.current) {
      // Scroll to top of results with smooth animation
      partResultsRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [partSearchTerm, filteredParts.length]);

  // Customer vehicles - bao gồm cả xe từ workOrder nếu đang edit
  const customerVehicles = useMemo(() => {
    if (!selectedCustomer) return [];
    const existingVehicles = selectedCustomer.vehicles || [];

    // Nếu đang edit workOrder và có selectedVehicle là temp vehicle (không có trong danh sách)
    // thì thêm nó vào để hiển thị
    if (
      selectedVehicle &&
      !existingVehicles.find((v) => v.id === selectedVehicle.id)
    ) {
      return [...existingVehicles, selectedVehicle];
    }

    return existingVehicles;
  }, [selectedCustomer, selectedVehicle]);

  // Check maintenance warnings for selected vehicle
  const maintenanceWarnings = useMemo((): MaintenanceWarning[] => {
    if (!selectedVehicle) return [];
    // Update currentKm in vehicle for accurate check
    const vehicleWithKm = {
      ...selectedVehicle,
      currentKm: currentKm ? parseInt(currentKm) : selectedVehicle.currentKm,
    };
    return checkVehicleMaintenance(vehicleWithKm);
  }, [selectedVehicle, currentKm]);

  // Auto-select vehicle if customer has only one and load km
  React.useEffect(() => {
    if (customerVehicles.length === 1 && !selectedVehicle) {
      const vehicle = customerVehicles[0];
      setSelectedVehicle(vehicle);
      // Load currentKm from vehicle if exists
      if (vehicle.currentKm) {
        setCurrentKm(vehicle.currentKm.toString());
      }
    }
  }, [customerVehicles, selectedVehicle]);

  // Calculations
  const partsTotal = useMemo(() => {
    return selectedParts.reduce(
      (sum, p) => sum + p.quantity * p.sellingPrice,
      0
    );
  }, [selectedParts]);

  const servicesTotal = useMemo(() => {
    return additionalServices.reduce((sum, s) => sum + s.sellingPrice * s.quantity, 0);
  }, [additionalServices]);

  const subtotal = partsTotal + servicesTotal + laborCost;

  const discountAmount = useMemo(() => {
    if (discountType === "percent") {
      return Math.round((subtotal * discount) / 100);
    }
    return discount;
  }, [subtotal, discount, discountType]);

  const total = Math.max(0, subtotal - discountAmount);

  const isOrderPaid = workOrder?.paymentStatus === "paid" && (workOrder?.status === "Trả máy" || status === "Trả máy");
  const canEditPriceAndParts = !isOrderPaid;

  // Handlers
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerSearch(false);
    setCustomerSearchTerm("");
    setSelectedVehicle(null);
    setCurrentKm(""); // Reset km when changing customer
    // Reset edit mode
    setIsEditingCustomer(false);
    setEditCustomerName(customer.name);
    setEditCustomerPhone(customer.phone || "");
  };

  // Handle save edited customer info
  const handleSaveEditedCustomer = async () => {
    if (!selectedCustomer) return;
    if (!editCustomerName.trim()) {
      showToast.error("Vui lòng nhập tên khách hàng");
      return;
    }
    if (!editCustomerPhone.trim()) {
      showToast.error("Vui lòng nhập số điện thoại");
      return;
    }

    const updatedCustomer = {
      ...selectedCustomer,
      name: editCustomerName.trim(),
      phone: editCustomerPhone.trim(),
    };

    // Save to database if upsertCustomer is available
    if (upsertCustomer) {
      await upsertCustomer(updatedCustomer);
    }

    // Update local state
    setSelectedCustomer(updatedCustomer);
    setIsEditingCustomer(false);
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    // Load currentKm from vehicle if exists
    if (vehicle.currentKm) {
      setCurrentKm(vehicle.currentKm.toString());
    } else {
      setCurrentKm("");
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
          quantity: 1,
          sellingPrice: part.retailPrice?.[currentBranchId] || 0,
          costPrice: part.costPrice?.[currentBranchId] || 0,
          sku: part.sku || "",
          category: part.category || "",
        },
      ]);
    }
    setShowPartSearch(false);
    setPartSearchTerm("");
  };

  const handleUpdatePartQuantity = (partId: string, delta: number) => {
    setSelectedParts((prev) =>
      prev
        .map((p) =>
          p.partId === partId ? { ...p, quantity: p.quantity + delta } : p
        )
        .filter((p) => p.quantity > 0)
    );
  };

  const handleRemovePart = (partId: string) => {
    setSelectedParts((prev) => prev.filter((p) => p.partId !== partId));
  };

  const handleAddService = () => {
    if (!newServiceName) return;
    setAdditionalServices([
      ...additionalServices,
      {
        id: `srv-${Date.now()}`,
        name: newServiceName,
        quantity: newServiceQuantity,
        costPrice: newServiceCost,
        sellingPrice: newServicePrice,
      },
    ]);
    setNewServiceName("");
    setNewServiceCost(0);
    setNewServicePrice(0);
    setNewServiceQuantity(1);
    setShowAddService(false);
  };

  const handleRemoveService = (id: string) => {
    setAdditionalServices(additionalServices.filter((s) => s.id !== id));
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!selectedCustomer) return;
    if (!confirm("Bạn có chắc chắn muốn xóa xe này khỏi danh sách xe của khách hàng?")) return;

    const updatedVehicles = (selectedCustomer.vehicles || []).filter(
      (v: Vehicle) => v.id !== vehicleId
    );

    const updatedCustomer = {
      ...selectedCustomer,
      vehicles: updatedVehicles,
    };

    if (upsertCustomer) {
      await upsertCustomer(updatedCustomer);
    }

    setSelectedCustomer(updatedCustomer);
    if (selectedVehicle?.id === vehicleId) {
      setSelectedVehicle(updatedVehicles[0] || null);
    }
    showToast.success("Đã xóa xe khỏi danh sách!");
  };

  const handleAddVehicle = async () => {
    if (!newVehiclePlate || !newVehicleName) return;

    if (editingVehicle) {
      // Edit mode
      const updatedVehicle: Vehicle = {
        ...editingVehicle,
        licensePlate: newVehiclePlate,
        model: newVehicleName,
      };

      if (selectedCustomer) {
        const updatedVehicles = (selectedCustomer.vehicles || []).map((v: Vehicle) =>
          v.id === editingVehicle.id ? updatedVehicle : v
        );

        const updatedCustomer = {
          ...selectedCustomer,
          vehicles: updatedVehicles,
        };

        if (upsertCustomer) {
          await upsertCustomer(updatedCustomer);
        }

        setSelectedCustomer(updatedCustomer);
        if (selectedVehicle?.id === editingVehicle.id) {
          setSelectedVehicle(updatedVehicle);
        }
        showToast.success("Đã cập nhật thông tin xe!");
      }
      setEditingVehicle(null);
    } else {
      // Add mode
      const newVehicle: Vehicle = {
        id: `veh-${Date.now()}`,
        licensePlate: newVehiclePlate,
        model: newVehicleName,
      };

      if (selectedCustomer) {
        const updatedVehicles = [
          ...(selectedCustomer.vehicles || []),
          newVehicle,
        ];

        const updatedCustomer = {
          ...selectedCustomer,
          vehicles: updatedVehicles,
        };

        if (upsertCustomer) {
          await upsertCustomer(updatedCustomer);
        }

        setSelectedCustomer(updatedCustomer);
        setSelectedVehicle(newVehicle);
        showToast.success("Đã thêm xe mới thành công!");
      }
    }

    setNewVehiclePlate("");
    setNewVehicleName("");
    setShowAddVehicle(false);
  };

  const handleAddNewCustomer = async () => {
    if (!newCustomerName || !newCustomerPhone) return;

    const tempCustomerId = `CUST-${Date.now()}`;
    const vehicleId = `VEH-${Date.now()}`;

    // Create vehicles array if vehicle info provided
    const vehicles: Vehicle[] = [];
    if (newCustomerVehicleModel || newCustomerLicensePlate) {
      vehicles.push({
        id: vehicleId,
        model: newCustomerVehicleModel || "",
        licensePlate: newCustomerLicensePlate || "",
        isPrimary: true,
      } as Vehicle);
    }

    // Create new customer object
    const newCustomerObj: Customer = {
      id: tempCustomerId,
      name: newCustomerName,
      phone: newCustomerPhone,
      vehicles: vehicles,
      vehicleModel: newCustomerVehicleModel,
      licensePlate: newCustomerLicensePlate,
      status: "active",
      segment: "New",
      loyaltyPoints: 0,
      totalSpent: 0,
      visitCount: 1,
      lastVisit: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    // Save to database if upsertCustomer is available
    // Get the real customer ID (could be existing customer with same phone)
    let realCustomerId = tempCustomerId;
    if (upsertCustomer) {
      realCustomerId = (await upsertCustomer(newCustomerObj)) || tempCustomerId;
    }

    // Set selected customer and vehicle with the real ID
    setSelectedCustomer({ ...newCustomerObj, id: realCustomerId });
    if (vehicles.length > 0) {
      setSelectedVehicle(vehicles[0]);
    }

    // Reset form and close modal
    setShowCustomerSearch(false);
    setShowAddCustomer(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerVehicleModel("");
    setNewCustomerLicensePlate("");
    setCustomerSearchTerm("");
  };

  const getStatusColor = (s: WorkOrderStatus) => {
    switch (s) {
      case WORK_ORDER_STATUS.RECEIVED:
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case WORK_ORDER_STATUS.IN_PROGRESS:
        return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case WORK_ORDER_STATUS.COMPLETED:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case WORK_ORDER_STATUS.DELIVERED:
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  // Hide bottom navigation when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("hide-bottom-nav");
    } else {
      document.body.classList.remove("hide-bottom-nav");
    }

    return () => {
      document.body.classList.remove("hide-bottom-nav");
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // VIEW MODE - Hiển thị chi tiết phiếu (không cho chỉnh sửa)
  if (viewMode && workOrder) {
    return (
      <WorkOrderMobileDetailView
        workOrder={workOrder}
        onClose={onClose}
        onSwitchToEdit={onSwitchToEdit}
        isOwner={isOwner}
      />
    );
  }

  // EDIT MODE - Form chỉnh sửa (code cũ)
  return (
    <div 
      className="fixed inset-x-0 bg-black/50 z-[100] flex items-start md:items-center justify-center"
      style={viewportStyle}
    >
      {/* Mobile Full Screen */}
      <div
        className="md:hidden w-full h-full bg-slate-50 dark:bg-[#151521] flex flex-col transition-colors"
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-[#1e1e2d] px-4 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-95 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {workOrder
                ? `Sửa phiếu #${formatWorkOrderId(workOrder.id)}`
                : "Tạo phiếu mới"}
            </h2>
          </div>
          <div className="w-9"></div>
        </div>

        {isOrderPaid && (
          <div className="mx-4 mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-xs text-amber-700 dark:text-amber-300">
                Phiếu đã thanh toán: Không thể sửa giá và phụ tùng.
                <br />
                Bạn vẫn có thể cập nhật giá vốn dịch vụ.
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation Bar */}
        <div className="flex-shrink-0 bg-white dark:bg-[#1e1e2d] border-b border-slate-200 dark:border-slate-700/50">
          <div className="grid grid-cols-3 gap-0">
            {[
              { id: 'info' as const, label: 'THÔNG TIN', icon: User },
              { id: 'parts' as const, label: 'PHỤ TÙNG', icon: Package },
              { id: 'payment' as const, label: 'T.TOÁN', icon: Banknote },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex flex-col items-center justify-center py-2.5 transition-all ${isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                >
                  <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                  <span className="text-[9px] font-bold tracking-tight">{tab.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-32">

          {/* TAB 1: THÔNG TIN - Status, Technician, Customer, Vehicle */}
          {activeTab === 'info' && (
            <>
              {/* KHỐI 1: TRẠNG THÁI & KỸ THUẬT VIÊN */}
              <div className="p-4 space-y-4">
                {/* Status Segmented Control */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                    Trạng thái sửa chữa
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 p-1 bg-white dark:bg-[#1e1e2d] rounded-xl border border-slate-200 dark:border-slate-700/50">
                    {[
                      { id: WORK_ORDER_STATUS.RECEIVED, label: "Nhận", icon: FileText },
                      { id: WORK_ORDER_STATUS.IN_PROGRESS, label: "Sửa", icon: Wrench },
                      { id: WORK_ORDER_STATUS.COMPLETED, label: "Xong", icon: CheckCircle },
                      { id: WORK_ORDER_STATUS.DELIVERED, label: "Trả", icon: Bike },
                    ].map((item) => {
                      const isActive = status === item.id;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setStatus(item.id as WorkOrderStatus)}
                          className={`flex flex-col items-center justify-center py-2.5 rounded-lg transition-all ${isActive
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]"
                            : "text-slate-500 hover:text-slate-300"
                            }`}
                        >
                          <Icon className={`w-4 h-4 mb-1 ${isActive ? "text-white" : "text-slate-500"}`} />
                          <span className="text-[10px] font-bold">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Technician Selection - Premium Chips */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                    Kỹ thuật viên phụ trách
                  </label>
                  <div className="relative">
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                      {employees
                        .filter(emp => !["Nguyễn Xuân Nhạn", "Võ Thanh Lâm"].includes(emp.name))
                        .map((emp) => {
                          const isActive = selectedTechnicianId === emp.id;
                          return (
                            <button
                              key={emp.id}
                              onClick={() => setSelectedTechnicianId(emp.id)}
                              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${isActive
                                ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20 scale-[1.02]"
                                : "bg-white dark:bg-[#1e1e2d] border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600"
                                }`}
                            >
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                }`}>
                                {emp.name.split(" ").pop()?.charAt(0) || "T"}
                              </div>
                              <span className="text-xs font-bold whitespace-nowrap">{emp.name}</span>
                              {isActive && <Check className="w-3 h-3" />}
                            </button>
                          );
                        })}
                    </div>
                    {/* Shadow overlay/gradient to show it's scrollable */}
                    <div className="absolute top-0 right-0 bottom-1 w-10 bg-gradient-to-l from-slate-50 dark:from-[#151521] to-transparent pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* KHỐI 2: KHÁCH HÀNG & XE */}
              <CustomerInfoSection
                selectedCustomer={selectedCustomer}
                showCustomerSearch={showCustomerSearch}
                customerSearchTerm={customerSearchTerm}
                setCustomerSearchTerm={setCustomerSearchTerm}
                filteredCustomers={filteredCustomers}
                onSelectCustomer={handleSelectCustomer}
                onLoadMoreCustomers={handleLoadMoreCustomers}
                hasMoreCustomers={hasMoreCustomers}
                isSearchingCustomer={isSearchingCustomer}
                onShowAddCustomer={() => setShowAddCustomer(true)}
                setNewCustomerName={setNewCustomerName}
                setNewCustomerPhone={setNewCustomerPhone}
                isEditingCustomer={isEditingCustomer}
                setIsEditingCustomer={setIsEditingCustomer}
                editCustomerName={editCustomerName}
                setEditCustomerName={setEditCustomerName}
                editCustomerPhone={editCustomerPhone}
                setEditCustomerPhone={setEditCustomerPhone}
                onSaveEditedCustomer={handleSaveEditedCustomer}
                onClearCustomer={() => {
                  setSelectedCustomer(null);
                  setSelectedVehicle(null);
                  setShowCustomerSearch(true);
                  setIsEditingCustomer(false);
                }}
              />

              <VehicleInfoSection
                selectedCustomer={selectedCustomer}
                selectedVehicle={selectedVehicle}
                customerVehicles={customerVehicles}
                onSelectVehicle={handleSelectVehicle}
                onClearVehicle={() => {
                  setSelectedVehicle(null);
                  setCurrentKm("");
                }}
                showAddVehicle={showAddVehicle}
                setShowAddVehicle={setShowAddVehicle}
                newVehiclePlate={newVehiclePlate}
                setNewVehiclePlate={setNewVehiclePlate}
                newVehicleName={newVehicleName}
                setNewVehicleName={setNewVehicleName}
                showVehicleDropdown={showVehicleDropdown}
                setShowVehicleDropdown={setShowVehicleDropdown}
                onAddVehicle={handleAddVehicle}
                currentKm={currentKm}
                setCurrentKm={setCurrentKm}
                maintenanceWarnings={maintenanceWarnings}
                issueDescription={issueDescription}
                setIssueDescription={setIssueDescription}
                editingVehicle={editingVehicle}
                setEditingVehicle={setEditingVehicle}
                onDeleteVehicle={handleDeleteVehicle}
              />

              {/* Next Button */}
              <div className="p-4 pt-2">
                <button
                  onClick={() => setActiveTab('parts')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  Tiếp tục: Phụ tùng & Dịch vụ
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* TAB 2: PHỤ TÙNG - Parts & Services */}
          {activeTab === 'parts' && (
            <>
              {selectedCustomer && selectedVehicle ? (
                <>
                  <PartsListSection
                    selectedCustomer={selectedCustomer}
                    selectedVehicle={selectedVehicle}
                    selectedParts={selectedParts}
                    onRemovePart={handleRemovePart}
                    onUpdatePartQuantity={handleUpdatePartQuantity}
                    onUpdatePartPrice={(partId, newPrice) => {
                      setSelectedParts(
                        selectedParts.map((p) =>
                          p.partId === partId ? { ...p, sellingPrice: newPrice } : p
                        )
                      );
                    }}
                    onShowPartSearch={() => setShowPartSearch(true)}
                    canEditPriceAndParts={canEditPriceAndParts}
                  />

                  <ServiceListSection
                    selectedCustomer={selectedCustomer}
                    selectedVehicle={selectedVehicle}
                    additionalServices={additionalServices}
                    onRemoveService={handleRemoveService}
                    onUpdateService={(id, updates) => {
                      setAdditionalServices(
                        additionalServices.map((s) =>
                          s.id === id ? { ...s, ...updates } : s
                        )
                      );
                    }}
                    onShowAddService={() => setShowAddService(true)}
                    canEditPriceAndParts={canEditPriceAndParts}
                  />

                  {/* Next Button */}
                  <div className="p-4 pt-2">
                    <button
                      onClick={() => setActiveTab('payment')}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      Tiếp tục: Thanh toán
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-4">
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                    <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                      Vui lòng chọn khách hàng và xe trước
                    </p>
                    <button
                      onClick={() => setActiveTab('info')}
                      className="mt-3 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-bold transition-all"
                    >
                      Quay lại tab Thông tin
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 4: T.TOÁN - Payment */}
          {activeTab === 'payment' && (
            <PaymentSection
              laborCost={laborCost}
              setLaborCost={setLaborCost}
              partsTotal={partsTotal}
              servicesTotal={servicesTotal}
              discount={discount}
              setDiscount={setDiscount}
              discountType={discountType}
              setDiscountType={setDiscountType}
              discountAmount={discountAmount}
              total={total}
              isDeposit={isDeposit}
              setIsDeposit={setIsDeposit}
              depositAmount={depositAmount}
              setDepositAmount={setDepositAmount}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              status={status}
              showPaymentInput={showPaymentInput}
              setShowPaymentInput={setShowPaymentInput}
              partialAmount={partialAmount}
              setPartialAmount={setPartialAmount}
              canEditPriceAndParts={canEditPriceAndParts}
            />
          )}
        </div>

        {/* STICKY FOOTER - Action Buttons */}
        <div className="flex-shrink-0 bg-white dark:bg-[#1e1e2d] border-t border-slate-200 dark:border-slate-700 p-3">
          {/* Row 1: Print/Share buttons - only show when editing existing order */}
          {workOrder?.id && !isKeyboardOpen && (
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => {
                  if (workOrder && onPrintWorkOrder) {
                    onPrintWorkOrder(workOrder);
                  }
                }}
                disabled={!workOrder || !onPrintWorkOrder}
                className="flex-1 py-2 bg-slate-100 dark:bg-[#2b2b40] text-slate-500 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                In phiếu
              </button>
              <button
                onClick={() => {
                  // Share functionality
                  if (navigator.share) {
                    navigator
                      .share({
                        title: `Phiếu sửa chữa #${workOrder!.id}`,
                        text: `Phiếu sửa chữa cho ${selectedCustomer?.name || workOrder!.customerName
                          } - ${selectedVehicle?.licensePlate ||
                          workOrder!.licensePlate
                          }`,
                      })
                      .catch(() => { });
                  } else {
                    showToast.warning(
                      "Chức năng chia sẻ không khả dụng trên trình duyệt này"
                    );
                  }
                }}
                className="flex-1 py-2 bg-slate-100 dark:bg-[#2b2b40] text-slate-500 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                Chia sẻ
              </button>
            </div>
          )}
          {/* Row 2: Main action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Confirm Close
                if (window.confirm("Bạn có chắc muốn thoát? Các thay đổi sẽ được lưu nháp nhưng chưa được cập nhật lên hệ thống.")) {
                  onClose();
                }
              }}
              className="px-3 py-2.5 bg-slate-100 dark:bg-[#2b2b40] text-slate-500 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs"
            >
              Hủy
            </button>
            {/* Nút Lưu Phiếu - luôn hiển thị */}
            <button
              onClick={handleSaveInternal}
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-slate-600 hover:bg-slate-500 rounded-lg font-medium text-white transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "⏳ Đang lưu..." : "💾 LƯU"}
            </button>
            {/* Nút Đặt cọc - chỉ hiển thị khi có đặt cọc và không phải trạng thái Trả máy */}
            {status !== "Trả máy" && isDeposit && depositAmount > 0 && (
              <button
                onClick={handleSaveInternal}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-white transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "⏳ Đang xử lý..." : "💰 ĐẶT CỌC"}
              </button>
            )}
            {/* Nút Thanh toán - chỉ hiển thị khi trạng thái Trả máy */}
            {status === "Trả máy" && (
              <button
                onClick={handleSaveInternal}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-medium text-white transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "⏳ Đang xử lý..." : "✅ THANH TOÁN"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop - Keep Original (Not Changed) */}
      <div className="hidden md:block">
        {/* Desktop modal would go here - keeping original unchanged */}
      </div>

      {/* Part Search Top Sheet */}
      <PartSearchSheet
        isOpen={showPartSearch}
        onClose={() => {
          setShowPartSearch(false);
          setPartSearchTerm("");
        }}
        parts={parts}
        currentBranchId={currentBranchId}
        onAddPart={handleAddPart}
      />

      {/* Add Service Modal */}
      <AddServiceModal
        isOpen={showAddService}
        onClose={() => setShowAddService(false)}
        onAddService={(service) => {
          setAdditionalServices([
            ...additionalServices,
            {
              id: `srv-${Date.now()}`,
              name: service.name,
              quantity: service.quantity,
              costPrice: service.costPrice,
              sellingPrice: service.sellingPrice,
            },
          ]);
        }}
      />

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onAddCustomer={(customerData) => {
          setNewCustomerName(customerData.name);
          setNewCustomerPhone(customerData.phone);
          setNewCustomerVehicleModel(customerData.vehicleModel);
          setNewCustomerLicensePlate(customerData.licensePlate);
          setTimeout(() => {
            handleAddNewCustomer();
          }, 0);
        }}
        initialName={newCustomerName}
        initialPhone={newCustomerPhone}
      />
    </div>
  );
};
