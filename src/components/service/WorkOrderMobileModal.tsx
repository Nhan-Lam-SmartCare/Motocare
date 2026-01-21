import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Minus,
  Check,
  ChevronDown,
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
  Trash2,
  Smartphone,
  PhoneCall,
  ChevronRight,
  TrendingUp,
  UserPlus,
  CreditCard,
  Banknote,
  MessageSquare,
  Package,
  ScanBarcode,
} from "lucide-react";
import BarcodeScannerModal from "../common/BarcodeScannerModal";
import { formatCurrency, formatWorkOrderId, normalizeSearchText } from "../../utils/format";
import { getCategoryColor } from "../../utils/categoryColors";
import type { WorkOrder, Part, Customer, Vehicle, Employee } from "../../types";
import {
  checkVehicleMaintenance,
  formatKm,
  getWarningBadgeColor,
  type MaintenanceWarning,
} from "../../utils/maintenanceReminder";
import { WORK_ORDER_STATUS, type WorkOrderStatus } from "../../constants";
import { NumberInput } from "../common/NumberInput";
import { showToast } from "../../utils/toast";
import { supabase } from "../../supabaseClient";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { CustomerInfoSection } from "./components/mobile/CustomerInfoSection";
import { VehicleInfoSection } from "./components/mobile/VehicleInfoSection";
import { PartsListSection } from "./components/mobile/PartsListSection";
import { ServiceListSection } from "./components/mobile/ServiceListSection";
import { PaymentSection } from "./components/mobile/PaymentSection";

interface WorkOrderMobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workOrderData: any) => Promise<void> | void;
  workOrder?: WorkOrder | null;
  customers: Customer[];
  parts: Part[];
  employees: Employee[];
  currentBranchId: string;
  upsertCustomer?: (customer: any) => void;
  viewMode?: boolean; // true = xem chi tiết, false = chỉnh sửa
  onSwitchToEdit?: () => void; // callback khi bấm nút chỉnh sửa từ view mode
  isOwner?: boolean; // true = chủ shop, có thể xem lợi nhuận
}

// Local type for status options if needed, or just use the one from constants
type LocalWorkOrderStatus = "Tiếp nhận" | "Đang sửa" | "Đã sửa xong" | "Trả máy";

export const WorkOrderMobileModal: React.FC<WorkOrderMobileModalProps> = ({
  isOpen,
  onClose,
  onSave,
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
  const WORK_ORDER_DRAFT_VERSION = 1 as const;
  const WORK_ORDER_DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

  // Popular motorcycle models in Vietnam - same as desktop
  const POPULAR_MOTORCYCLES = [
    // === HONDA ===
    "Honda Wave Alpha",
    "Honda Wave RSX",
    "Honda Wave RSX FI",
    "Honda Wave 110",
    "Honda Wave S110",
    "Honda Super Dream",
    "Honda Dream",
    "Honda Blade 110",
    "Honda Future 125",
    "Honda Future Neo",
    "Honda Winner X",
    "Honda Winner 150",
    "Honda CB150R",
    "Honda CB150X",
    "Honda CB300R",
    "Honda Vision",
    "Honda Air Blade 125",
    "Honda Air Blade 150",
    "Honda Air Blade 160",
    "Honda SH Mode 125",
    "Honda SH 125i",
    "Honda SH 150i",
    "Honda SH 160i",
    "Honda SH 350i",
    "Honda Lead 125",
    "Honda PCX 125",
    "Honda PCX 160",
    "Honda Vario 125",
    "Honda Vario 150",
    "Honda Vario 160",
    "Honda ADV 150",
    "Honda ADV 160",
    "Honda ADV 350",
    "Honda Forza 250",
    "Honda Forza 300",
    "Honda Forza 350",
    "Honda Giorno",
    "Honda Stylo 160",
    "Honda Click",
    "Honda Super Cub",
    "Honda Dream II",
    // === YAMAHA ===
    "Yamaha Sirius",
    "Yamaha Sirius FI",
    "Yamaha Sirius RC",
    "Yamaha Jupiter",
    "Yamaha Jupiter FI",
    "Yamaha Jupiter Finn",
    "Yamaha Exciter 135",
    "Yamaha Exciter 150",
    "Yamaha Exciter 155",
    "Yamaha FZ150i",
    "Yamaha MT-15",
    "Yamaha R15",
    "Yamaha Grande",
    "Yamaha Grande Hybrid",
    "Yamaha Janus",
    "Yamaha FreeGo",
    "Yamaha FreeGo S",
    "Yamaha Latte",
    "Yamaha NVX 125",
    "Yamaha NVX 155",
    "Yamaha NMAX",
    "Yamaha NMAX 155",
    "Yamaha XMAX 300",
    "Yamaha Nouvo",
    "Yamaha Nouvo LX",
    "Yamaha Mio",
    "Yamaha Mio Classico",
    // === SUZUKI ===
    "Suzuki Axelo",
    "Suzuki Viva",
    "Suzuki Smash",
    "Suzuki Revo",
    "Suzuki Raider 150",
    "Suzuki Raider R150",
    "Suzuki Satria F150",
    "Suzuki GSX-R150",
    "Suzuki GSX-S150",
    "Suzuki Address",
    "Suzuki Address 110",
    "Suzuki Impulse",
    "Suzuki Burgman Street",
    // === SYM ===
    "SYM Elegant",
    "SYM Attila",
    "SYM Attila Venus",
    "SYM Angela",
    "SYM Galaxy",
    "SYM Star SR",
    "SYM Shark",
    // === PIAGGIO & VESPA ===
    "Piaggio Liberty",
    "Piaggio Liberty 125",
    "Piaggio Liberty 150",
    "Piaggio Medley",
    "Piaggio Medley 125",
    "Vespa Sprint",
    "Vespa Sprint 125",
    "Vespa Sprint 150",
    "Vespa Primavera",
    "Vespa Primavera 125",
    "Vespa LX",
    "Vespa S",
    "Vespa GTS",
    "Vespa GTS 125",
    "Vespa GTS 300",
    // === KYMCO ===
    "Kymco Like",
    "Kymco Like 125",
    "Kymco Like 150",
    "Kymco Many",
    "Kymco Many 110",
    "Kymco Many 125",
    // === VINFAST ===
    "VinFast Klara",
    "VinFast Klara S",
    "VinFast Ludo",
    "VinFast Impes",
    "VinFast Tempest",
    "VinFast Vento",
    "VinFast Evo200",
    "VinFast Feliz",
    "VinFast Feliz S",
    "VinFast Theon",
    // === KHÁC ===
    "Xe điện khác",
    "Xe 50cc khác",
    "Xe nhập khẩu khác",
    "Khác",
  ];

  // Find customer and vehicle from workOrder data
  const initialCustomer = useMemo(() => {
    if (!workOrder) return null;
    const foundCustomer = customers.find(
      (c) =>
        c.phone === workOrder.customerPhone || c.name === workOrder.customerName
    );

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
    employees.find((e) => e.name === workOrder?.technicianName)?.id || ""
  );
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Update selectedCustomer and selectedVehicle when workOrder changes
  useEffect(() => {
    console.log("[WorkOrderMobileModal] workOrder:", workOrder);
    console.log("[WorkOrderMobileModal] initialCustomer:", initialCustomer);
    console.log("[WorkOrderMobileModal] initialVehicle:", initialVehicle);

    if (workOrder) {
      setSelectedCustomer(initialCustomer);
      setSelectedVehicle(initialVehicle);
      // Load currentKm: ưu tiên từ workOrder, nếu không có thì từ vehicle
      if (workOrder.currentKm) {
        setCurrentKm(workOrder.currentKm.toString());
      } else if (initialVehicle?.currentKm) {
        setCurrentKm(initialVehicle.currentKm.toString());
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
    } else {
      setSelectedCustomer(null);
      setSelectedVehicle(null);
      setCurrentKm("");
      setShowCustomerSearch(true);
      setDepositAmount(0);
      setIsDeposit(false);
    }
  }, [workOrder, initialCustomer, initialVehicle]);

  const draftKey = useMemo(() => {
    const orderKey = workOrder?.id || "new";
    return `workorder_draft_v${WORK_ORDER_DRAFT_VERSION}:${currentBranchId}:${orderKey}:mobile`;
  }, [WORK_ORDER_DRAFT_VERSION, currentBranchId, workOrder?.id]);

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

  // Helper functions for number formatting
  const formatNumberWithDots = (value: number | string): string => {
    if (value === 0 || value === "0") return "0";
    if (!value) return "";
    const numStr = value.toString().replace(/\D/g, "");
    if (!numStr) return "";
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseFormattedNumber = (value: string): number => {
    const cleaned = value.replace(/\./g, "");
    return cleaned ? Number(cleaned) : 0;
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

  // Filtered parts
  const filteredParts = useMemo(() => {
    const term = partSearchTerm.trim().toLowerCase();

    return parts.filter((p) => {
      if (partCategoryFilter && (p.category || "") !== partCategoryFilter) {
        return false;
      }
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term)
      );
    });
  }, [parts, partSearchTerm, partCategoryFilter]);

  const availablePartCategories = useMemo(() => {
    const unique = new Set<string>();
    for (const part of parts) {
      const c = part.category?.trim();
      if (c) unique.add(c);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "vi"));
  }, [parts]);

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
      return (subtotal * discount) / 100;
    }
    return discount;
  }, [subtotal, discount, discountType]);

  const total = Math.max(0, subtotal - discountAmount);

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
  const handleSaveEditedCustomer = () => {
    if (!selectedCustomer) return;
    if (!editCustomerName.trim()) {
      alert("Vui lòng nhập tên khách hàng");
      return;
    }
    if (!editCustomerPhone.trim()) {
      alert("Vui lòng nhập số điện thoại");
      return;
    }

    const updatedCustomer = {
      ...selectedCustomer,
      name: editCustomerName.trim(),
      phone: editCustomerPhone.trim(),
    };

    // Save to database if upsertCustomer is available
    if (upsertCustomer) {
      upsertCustomer(updatedCustomer);
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

  const handleAddVehicle = () => {
    if (!newVehiclePlate || !newVehicleName) return;
    const newVehicle: Vehicle = {
      id: `veh-${Date.now()}`,
      licensePlate: newVehiclePlate,
      model: newVehicleName,
    };

    // Add to customer vehicles
    if (selectedCustomer) {
      const updatedVehicles = [
        ...(selectedCustomer.vehicles || []),
        newVehicle,
      ];

      // Update customer with new vehicle and save to database
      const updatedCustomer = {
        ...selectedCustomer,
        vehicles: updatedVehicles,
      };

      // Save to database via upsertCustomer
      if (upsertCustomer) {
        upsertCustomer(updatedCustomer);
      }

      // Update local state
      setSelectedCustomer(updatedCustomer);
      setSelectedVehicle(newVehicle);
    }

    setNewVehiclePlate("");
    setNewVehicleName("");
    setShowAddVehicle(false);
  };

  const handleAddNewCustomer = () => {
    if (!newCustomerName || !newCustomerPhone) return;

    const customerId = `CUST-${Date.now()}`;
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
      id: customerId,
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
    if (upsertCustomer) {
      upsertCustomer(newCustomerObj);
    }

    // Set selected customer and vehicle
    setSelectedCustomer(newCustomerObj);
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

  const handleSave = async () => {
    // Prevent duplicate submissions
    if (isSubmitting) return;

    if (!selectedCustomer || !selectedVehicle) {
      alert("Vui lòng chọn khách hàng và xe");
      return;
    }

    // Set submitting state to disable buttons
    setIsSubmitting(true);

    // Calculate total paid and remaining based on deposit + additional payment
    const totalDeposit = isDeposit ? depositAmount : 0;
    const additionalPayment = showPaymentInput ? partialAmount : 0;
    const totalPaid = totalDeposit + additionalPayment;
    const remainingAmount = total - totalPaid;

    // Transform parts to use 'price' field (as expected by SQL/types)
    const transformedParts = selectedParts.map((p) => ({
      partId: p.partId,
      partName: p.partName,
      quantity: p.quantity,
      price: p.sellingPrice, // Map sellingPrice to price for SQL
      costPrice: p.costPrice || 0, // Cost price for profit calculation
      sku: p.sku || "",
      category: p.category || "",
    }));

    // Transform additional services to use 'price' field
    const transformedServices = additionalServices.map((s) => ({
      id: s.id,
      description: s.name,
      quantity: s.quantity,
      price: s.sellingPrice, // Map sellingPrice to price
      costPrice: s.costPrice,
    }));

    const workOrderData = {
      status,
      technicianId: selectedTechnicianId,
      customer: selectedCustomer,
      vehicle: selectedVehicle,
      currentKm:
        currentKm && parseInt(currentKm) > 0 ? parseInt(currentKm) : undefined,
      issueDescription,
      parts: transformedParts,
      additionalServices: transformedServices,
      laborCost,
      discount: discountAmount,
      total: total,
      depositAmount: totalDeposit,
      paymentMethod,
      // Pass payment totals to ServiceManager.handleMobileSave so it can persist payment fields
      totalPaid,
      remainingAmount,
    };

    console.log(
      "[WorkOrderMobileModal] currentKm state:",
      currentKm,
      "parsed:",
      parseInt(currentKm),
      "final:",
      workOrderData.currentKm
    );

    // Execute save callback with offline fallback
    try {
      await onSave(workOrderData);
      clearDraft();
      // Note: Not resetting isSubmitting here because modal will close on success
      // Parent component is responsible for closing the modal
    } catch (error: any) {
      console.error("Error saving work order:", error);
      console.error("Error details:", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      });
      setIsSubmitting(false); // Reset on error so user can retry

      // Fallback: Save to Local Storage as draft
      const drafts = JSON.parse(localStorage.getItem("offline_drafts") || "[]");
      drafts.push({
        ...workOrderData,
        tempId: `draft-${Date.now()}`,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem("offline_drafts", JSON.stringify(drafts));

      // Show detailed error message
      let errorMessage = "Có lỗi khi lưu";
      if (error?.message) {
        const msg = error.message.toUpperCase();
        if (msg.includes("UNAUTHORIZED")) {
          errorMessage = "❌ Bạn không có quyền tạo phiếu sửa chữa. Vui lòng liên hệ quản lý để được cấp quyền.";
        } else if (msg.includes("BRANCH_MISMATCH")) {
          errorMessage = "❌ Chi nhánh không khớp. Bạn chỉ có thể tạo phiếu cho chi nhánh của mình.";
        } else if (msg.includes("INSUFFICIENT_STOCK") || msg.includes("THIẾU TỒN KHO")) {
          errorMessage = "❌ Tồn kho không đủ cho một hoặc nhiều phụ tùng.";
        } else if (msg.includes("PART_NOT_FOUND")) {
          errorMessage = "❌ Không tìm thấy phụ tùng trong kho.";
        } else {
          errorMessage = `❌ ${error.message}`;
        }
      } else {
        errorMessage = "❌ Lỗi kết nối (Timeout/Mạng). Vui lòng kiểm tra kết nối mạng.";
      }

      alert(errorMessage + "\n\nDữ liệu đã được lưu tạm. Bạn có thể thử lại hoặc chụp màn hình.");
      // onClose(); // Don't close so user can retry
    }
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
      <div className="fixed inset-0 bg-black/50 z-[100] flex items-end md:items-center justify-center">
        {/* Mobile Full Screen */}
        <div className="md:hidden w-full h-full bg-slate-50 dark:bg-[#151521] flex flex-col transition-colors">
          {/* Header */}
          <div className="flex-shrink-0 bg-white dark:bg-[#1e1e2d] px-4 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Chi tiết phiếu
                </h2>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-medium">
                  #{formatWorkOrderId(workOrder.id)}
                </div>
              </div>
            </div>
            {onSwitchToEdit && (
              <button
                onClick={onSwitchToEdit}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Sửa phiếu
              </button>
            )}
          </div>

          {/* Scrollable Content - View Only */}
          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#151521]">
            {/* Trạng thái & Thời gian */}
            <div className="p-3 bg-white dark:bg-[#1e1e2d] border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${getStatusColor(
                    workOrder.status
                  )}`}
                >
                  {workOrder.status}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(workOrder.creationDate).toLocaleDateString("vi-VN")}{" "}
                  {new Date(workOrder.creationDate).toLocaleTimeString(
                    "vi-VN",
                    { hour: "2-digit", minute: "2-digit" }
                  )}
                </span>
              </div>
              {workOrder.technicianName && (
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  KTV:{" "}
                  <span className="font-medium text-slate-900 dark:text-white">
                    {workOrder.technicianName}
                  </span>
                </div>
              )}
            </div>

            {/* Thông tin khách hàng */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                KHÁCH HÀNG
              </h3>
              <div className="bg-white dark:bg-[#1e1e2d] rounded-xl p-3 space-y-2 border border-slate-200 dark:border-transparent">
                <div className="flex items-center justify-between">
                  <span className="text-slate-900 dark:text-white font-medium">
                    {workOrder.customerName || "—"}
                  </span>
                  {workOrder.customerPhone && (
                    <a
                      href={`tel:${workOrder.customerPhone}`}
                      className="text-blue-600 dark:text-blue-400 text-sm flex items-center gap-1.5"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      {workOrder.customerPhone}
                    </a>
                  )}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5 text-slate-400" />
                  {workOrder.vehicleModel || "—"} •{" "}
                  <span className="text-yellow-600 dark:text-yellow-400 font-mono">
                    {workOrder.licensePlate || "—"}
                  </span>
                </div>
                {workOrder.currentKm && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Số km hiện tại: {formatKm(workOrder.currentKm)} km
                  </div>
                )}
              </div>
            </div>

            {/* Mô tả vấn đề */}
            {workOrder.issueDescription && (
              <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  MÔ TẢ VẤN ĐỀ
                </h3>
                <div className="bg-white dark:bg-[#1e1e2d] rounded-xl p-3 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap border border-slate-200 dark:border-transparent">
                  {workOrder.issueDescription}
                </div>
              </div>
            )}

            {/* Phụ tùng */}
            {workOrder.partsUsed && workOrder.partsUsed.length > 0 && (
              <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  PHỤ TÙNG ({workOrder.partsUsed.length})
                </h3>
                <div className="space-y-2">
                  {workOrder.partsUsed.map((part, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#1e1e2d] rounded-xl p-3 border border-slate-200 dark:border-transparent">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="text-sm text-slate-900 dark:text-white font-medium truncate">
                            {part.partName || "Phụ tùng"}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            SL: {part.quantity} {part.sku && `• ${part.sku}`}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(part.price * part.quantity)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatCurrency(part.price)}/cái
                          </div>
                        </div>
                      </div>
                      {/* Hiển thị giá vốn để debug */}
                      <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 flex justify-between">
                        <span>
                          Giá vốn: {formatCurrency(part.costPrice || 0)}/cái
                        </span>
                        <span className="text-yellow-600 dark:text-yellow-400">
                          Lãi:{" "}
                          {formatCurrency(
                            (part.price - (part.costPrice || 0)) * part.quantity
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dịch vụ */}
            {workOrder.additionalServices &&
              workOrder.additionalServices.length > 0 && (
                <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    DỊCH VỤ ({workOrder.additionalServices.length})
                  </h3>
                  <div className="space-y-2">
                    {workOrder.additionalServices.map((svc, idx) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-[#1e1e2d] rounded-xl p-3 flex items-center justify-between border border-slate-200 dark:border-transparent"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="text-sm text-slate-900 dark:text-white font-medium truncate">
                            {svc.description || "Dịch vụ"}
                          </div>
                          {svc.quantity > 1 && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              SL: {svc.quantity}
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-bold text-purple-600 dark:text-purple-400 flex-shrink-0">
                          {formatCurrency(svc.price * (svc.quantity || 1))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Ghi chú */}
            {workOrder.notes && (
              <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  GHI CHÚ
                </h3>
                <div className="bg-white dark:bg-[#1e1e2d] rounded-xl p-3 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap border border-slate-200 dark:border-transparent">
                  {workOrder.notes}
                </div>
              </div>
            )}

            {/* Tổng tiền */}
            <div className="p-3">
              <div className="bg-white dark:bg-[#1e1e2d] rounded-xl p-4 border border-slate-200 dark:border-slate-700/50 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Tổng phụ tùng</span>
                  <span className="text-slate-900 dark:text-white font-medium text-sm">
                    {formatCurrency(
                      workOrder.partsUsed?.reduce(
                        (s, p) => s + p.price * p.quantity,
                        0
                      ) || 0
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Tổng dịch vụ</span>
                  <span className="text-slate-900 dark:text-white font-medium text-sm">
                    {formatCurrency(
                      workOrder.additionalServices?.reduce(
                        (s, svc) => s + svc.price * (svc.quantity || 1),
                        0
                      ) || 0
                    )}
                  </span>
                </div>
                {(workOrder.discount || 0) > 0 && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-500 dark:text-slate-400 text-xs">Giảm giá</span>
                    <span className="text-red-500 dark:text-red-400 font-medium text-sm">
                      -{formatCurrency(workOrder.discount || 0)}
                    </span>
                  </div>
                )}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-2 flex items-center justify-between">
                  <span className="text-base font-bold text-slate-900 dark:text-white uppercase">
                    TỔNG CỘNG
                  </span>
                  <span className="text-xl font-black text-blue-600 dark:text-blue-500">
                    {formatCurrency(workOrder.total)}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/30 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Trạng thái thanh toán</span>
                  <span
                    className={`font-bold flex items-center gap-1.5 ${workOrder.paymentStatus === "paid"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                      }`}
                  >
                    {workOrder.paymentStatus === "paid" ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        Đã thanh toán
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        Chưa thanh toán
                      </>
                    )}
                  </span>
                </div>

                {/* Profit display - only for owner */}
                {isOwner && (workOrder as any).profit != null && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/30 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Lợi nhuận</span>
                    <span
                      className={`font-bold ${(workOrder as any).profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
                    >
                      {formatCurrency((workOrder as any).profit)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer - Nút chỉnh sửa */}
          {onSwitchToEdit && (
            <div className="flex-shrink-0 p-3 bg-white dark:bg-[#1e1e2d] border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={onSwitchToEdit}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                ✏️ Chỉnh sửa phiếu
              </button>
            </div>
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block max-w-2xl w-full max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden">
          {/* Similar content for desktop - simplified */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
            <h2 className="text-base font-bold">
              Chi tiết phiếu #{formatWorkOrderId(workOrder.id)}
            </h2>
            <div className="flex items-center gap-2">
              {onSwitchToEdit && (
                <button
                  onClick={onSwitchToEdit}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  ✏️ Chỉnh sửa
                </button>
              )}
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
            {/* Desktop content similar to mobile */}
            <div className="text-center text-slate-500 py-8">
              Vui lòng bấm "Chỉnh sửa" để xem và sửa chi tiết phiếu
            </div>
          </div>
        </div>
      </div>
    );
  }

  // EDIT MODE - Form chỉnh sửa (code cũ)
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-end md:items-center justify-center">
      {/* Mobile Full Screen */}
      <div className="md:hidden w-full h-full bg-slate-50 dark:bg-[#151521] flex flex-col transition-colors">
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-32">
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
          />

          {/* KHỐI 3A: PHỤ TÙNG & 3B: DỊCH VỤ */}
          {selectedCustomer && selectedVehicle && (
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
              />
            </>
          )}

          {/* KHỐI 4: TÀI CHÍNH */}
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
          />
        </div>

        {/* STICKY FOOTER - Action Buttons */}
        <div className="flex-shrink-0 bg-white dark:bg-[#1e1e2d] border-t border-slate-200 dark:border-slate-700 p-3">
          {/* Row 1: Print/Share buttons - only show when editing existing order */}
          {workOrder?.id && (
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => {
                  // Trigger print functionality
                  window.print();
                }}
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
                    alert(
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
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-slate-600 hover:bg-slate-500 rounded-lg font-medium text-white transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "⏳ Đang lưu..." : "💾 LƯU"}
            </button>
            {/* Nút Đặt cọc - chỉ hiển thị khi có đặt cọc và không phải trạng thái Trả máy */}
            {status !== "Trả máy" && isDeposit && depositAmount > 0 && (
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-white transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "⏳ Đang xử lý..." : "💰 ĐẶT CỌC"}
              </button>
            )}
            {/* Nút Thanh toán - chỉ hiển thị khi trạng thái Trả máy */}
            {status === "Trả máy" && (
              <button
                onClick={handleSave}
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

      {/* Part Search Top Sheet - Fixed at top for keyboard visibility */}
      {
        showPartSearch && (
          <div className="fixed inset-0 bg-black/70 z-[110] flex flex-col">
            {/* Top Sheet Container - positioned at TOP so input is always visible above keyboard */}
            <div
              className="w-full bg-slate-50 dark:bg-[#151521] rounded-b-2xl flex flex-col transition-colors"
              style={{ maxHeight: "60vh" }}
            >
              {/* Header */}
              <div className="flex-shrink-0 p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-slate-900 dark:text-white font-semibold text-sm">
                  🔍 Tìm phụ tùng
                </h3>
                <button
                  onClick={() => {
                    setShowPartSearch(false);
                    setPartSearchTerm("");
                  }}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Input - Always visible at top */}
              <div className="flex-shrink-0 p-3 bg-slate-50 dark:bg-[#151521]">
                {/* Part Search Input */}
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={partSearchTerm}
                      onChange={(e) => setPartSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && partSearchTerm.trim()) {
                          e.preventDefault();
                          // Auto-add first matching part when Enter is pressed
                          const firstMatch = filteredParts[0];
                          if (firstMatch) {
                            const stock = firstMatch.stock?.[currentBranchId] || 0;
                            if (stock <= 0) {
                              showToast.error("Sản phẩm đã hết hàng!");
                              return;
                            }
                            handleAddPart(firstMatch);
                          }
                        }
                      }}
                      placeholder="Quét hoặc nhập mã phụ tùng..."
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#2b2b40] border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white text-sm focus:border-blue-500 transition-all"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={() => setIsScanning(true)}
                    className="p-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white flex items-center justify-center transition-colors"
                    title="Quét bằng camera"
                  >
                    <ScanBarcode className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Nhấn Enter để thêm nhanh phụ tùng đầu tiên • Dùng camera để quét mã vạch
                </p>

                {/* Barcode Scanner Overlay */}
                <BarcodeScannerModal
                  isOpen={isScanning}
                  onClose={() => setIsScanning(false)}
                  onScan={(barcode: string) => {
                    setPartSearchTerm(barcode);
                    // Auto-add first matching part if exact SKU found
                    const exactMatch = parts.find(
                      (p) => p.sku?.toLowerCase() === barcode.toLowerCase() ||
                        p.barcode?.toLowerCase() === barcode.toLowerCase()
                    );
                    if (exactMatch) {
                      const stock = exactMatch.stock?.[currentBranchId] || 0;
                      if (stock <= 0) {
                        showToast.error("Sản phẩm đã hết hàng!");
                        return;
                      }
                      handleAddPart(exactMatch);
                    }
                  }}
                  title="Quét mã phụ tùng"
                />

                <div className="mt-2">
                  <select
                    value={partCategoryFilter}
                    onChange={(e) => setPartCategoryFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-[#2b2b40] border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white text-sm focus:border-blue-500 transition-all"
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
              </div>

              {/* Results Count & List - Scrollable */}
              <div
                ref={partResultsRef}
                className="flex-1 overflow-y-auto px-3 pb-3 overscroll-contain"
              >
                {/* Show result count when searching */}
                {partSearchTerm && (
                  <div className="mb-2 px-1 text-xs text-slate-400">
                    Tìm thấy{" "}
                    <span className="text-emerald-400 font-semibold">
                      {filteredParts.length}
                    </span>{" "}
                    phụ tùng
                    {filteredParts.length > 50 && " (hiển thị 50 đầu tiên)"}
                  </div>
                )}
                <div className="space-y-2">
                  {filteredParts.slice(0, 50).map((part) => {
                    const stock = part.stock?.[currentBranchId] || 0;
                    const price = part.retailPrice?.[currentBranchId] || 0;
                    return (
                      <div
                        key={part.id}
                        onClick={() => {
                          if (stock <= 0) {
                            showToast.error("Sản phẩm đã hết hàng!");
                            return;
                          }
                          handleAddPart(part);
                        }}
                        className="p-2.5 bg-white dark:bg-[#1e1e2d] rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2b2b40] active:bg-blue-600/20 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-slate-900 dark:text-white font-medium text-xs">
                              {part.name}
                            </div>
                            <div className="text-[11px] text-blue-400 font-mono mt-0.5">
                              SKU: {part.sku} • Tồn: {stock}
                            </div>
                            {part.category && (
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 mt-1 rounded-full text-[9px] font-medium ${getCategoryColor(part.category).bg
                                  } ${getCategoryColor(part.category).text}`}
                              >
                                {part.category}
                              </span>
                            )}
                          </div>
                          <div className="text-[#50cd89] font-bold text-xs flex-shrink-0">
                            {formatCurrency(price)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredParts.length > 50 && (
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-500 italic border-t border-slate-100 dark:border-slate-600 rounded-b-lg">
                      Đang hiển thị 50/{filteredParts.length} kết quả. Vui lòng tìm kiếm chi tiết hơn.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tap outside to close */}
            <div
              className="flex-1"
              onClick={() => {
                setShowPartSearch(false);
                setPartSearchTerm("");
              }}
            />
          </div>
        )
      }

      {/* Add Service Modal - Bottom Sheet Design */}
      {
        showAddService && (
          <div className="fixed inset-0 bg-black/70 z-[110] flex items-end md:items-center md:justify-center">
            <div className="w-full md:max-w-md bg-white dark:bg-[#1e1e2d] rounded-t-2xl md:rounded-xl overflow-hidden transition-colors">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-slate-900 dark:text-white font-semibold text-base">
                  THÊM DỊCH VỤ GIA CÔNG
                </h3>
                <button
                  onClick={() => {
                    setShowAddService(false);
                    setNewServiceName("");
                    setNewServiceCost(0);
                    setNewServicePrice(0);
                    setNewServiceQuantity(1);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Service Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-2">
                    Tên công việc / Mô tả:
                  </label>
                  <input
                    type="text"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="Nhập tên (VD: Hàn yếm, Sơn...)"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#009ef7] focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>

                {/* Quantity Stepper */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Số lượng:
                  </label>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() =>
                        setNewServiceQuantity(Math.max(1, newServiceQuantity - 1))
                      }
                      className="w-12 h-12 bg-slate-100 dark:bg-[#2b2b40] hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center text-slate-900 dark:text-white text-2xl font-bold transition-colors"
                    >
                      −
                    </button>
                    <div className="w-20 h-12 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center">
                      <span className="text-slate-900 dark:text-white text-xl font-bold">
                        {newServiceQuantity}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setNewServiceQuantity(newServiceQuantity + 1)
                      }
                      className="w-12 h-12 bg-slate-100 dark:bg-[#2b2b40] hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center text-slate-900 dark:text-white text-2xl font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Cost & Price Section */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-300 mb-3 uppercase tracking-wide">
                    CHI PHÍ & GIÁ BÁN
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Cost Price */}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5">
                        Giá nhập (Vốn):
                      </label>
                      <div className="relative">
                        <NumberInput
                          value={newServiceCost}
                          onChange={(val: number) => setNewServiceCost(val)}
                          placeholder="0"
                          className="w-full px-3 py-3 pr-8 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 text-sm focus:border-slate-400 dark:focus:border-slate-600 focus:outline-none transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                          đ
                        </span>
                      </div>
                    </div>

                    {/* Selling Price */}
                    <div>
                      <label className="block text-xs text-[#ffc700] mb-1.5 font-medium">
                        Đơn giá (Báo khách):
                      </label>
                      <div className="relative">
                        <NumberInput
                          value={newServicePrice}
                          onChange={(val: number) => setNewServicePrice(val)}
                          allowNegative={true}
                          placeholder="0"
                          className="w-full px-3 py-3 pr-8 bg-slate-50 dark:bg-[#151521] border-2 border-[#009ef7] rounded-lg text-slate-900 dark:text-white text-sm font-semibold focus:border-[#0077c7] focus:outline-none transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#009ef7] text-xs font-bold pointer-events-none">
                          đ
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Amount - Auto Calculate */}
                <div className="p-4 bg-slate-50 dark:bg-[#151521] border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">
                      Thành tiền (Tự tính):
                    </span>
                    <span className="text-[#50cd89] text-xl font-bold">
                      {formatCurrency(newServicePrice * newServiceQuantity)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Button */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={handleAddService}
                  disabled={!newServiceName.trim()}
                  className="w-full py-4 bg-gradient-to-r from-[#009ef7] to-purple-600 hover:from-[#0077c7] hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold text-sm rounded-lg transition-all shadow-lg"
                >
                  LƯU VÀO PHIẾU
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Add Vehicle Modal - Premium Redesign */}
      {showAddVehicle && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1e1e2d] rounded-3xl p-5 border border-slate-200 dark:border-slate-700/50 shadow-2xl transition-colors">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Bike className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-slate-900 dark:text-white font-bold text-base">Thêm xe mới</h3>
              </div>
              <button
                onClick={() => setShowAddVehicle(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-95 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Biển số xe
                </label>
                <input
                  type="text"
                  value={newVehiclePlate}
                  onChange={(e) => setNewVehiclePlate(e.target.value.toUpperCase())}
                  placeholder="59G1-123.45"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-bold uppercase focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5 relative">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Tên xe
                </label>
                <input
                  type="text"
                  value={newVehicleName}
                  onChange={(e) => {
                    setNewVehicleName(e.target.value);
                    setShowVehicleDropdown(true);
                  }}
                  onFocus={() => setShowVehicleDropdown(true)}
                  placeholder="Chọn hoặc nhập dòng xe"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-blue-500 transition-all"
                />
                {/* Vehicle Model Dropdown */}
                {showVehicleDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-[200px] overflow-y-auto scrollbar-hide">
                    {POPULAR_MOTORCYCLES.filter((model) =>
                      model.toLowerCase().includes(newVehicleName.toLowerCase())
                    )
                      .slice(0, 10)
                      .map((model) => (
                        <button
                          key={model}
                          type="button"
                          onClick={() => {
                            setNewVehicleName(model);
                            setShowVehicleDropdown(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700/50 last:border-0 transition-colors"
                        >
                          {model}
                        </button>
                      ))}
                    {POPULAR_MOTORCYCLES.filter((model) =>
                      model.toLowerCase().includes(newVehicleName.toLowerCase())
                    ).length === 0 && (
                        <div className="px-4 py-3 text-xs text-slate-500 text-center italic">
                          Không tìm thấy - nhập tên xe mới
                        </div>
                      )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddVehicle(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-bold text-xs active:scale-95 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddVehicle}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                >
                  Thêm xe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal - Premium Redesign */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1e1e2d] rounded-3xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide transition-colors">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-slate-900 dark:text-white font-bold text-base">Thêm khách hàng mới</h3>
              </div>
              <button
                onClick={() => {
                  setShowAddCustomer(false);
                  setNewCustomerName("");
                  setNewCustomerPhone("");
                  setNewCustomerVehicleModel("");
                  setNewCustomerLicensePlate("");
                }}

                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Customer Info Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 ml-1">
                  <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Thông tin khách hàng
                  </h4>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Tên khách hàng <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-blue-500 transition-all"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Số điện thoại <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="0901234567"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Vehicle Info Section */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 ml-1">
                  <div className="w-1 h-3 bg-green-500 rounded-full"></div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Thông tin xe
                  </h4>
                </div>

                <div className="space-y-1.5 relative">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Loại xe
                  </label>
                  <input
                    type="text"
                    value={newCustomerVehicleModel}
                    onChange={(e) => {
                      setNewCustomerVehicleModel(e.target.value);
                      setShowCustomerVehicleDropdown(true);
                    }}
                    onFocus={() => setShowCustomerVehicleDropdown(true)}
                    placeholder="Chọn hoặc nhập dòng xe..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-blue-500 transition-all"
                  />
                  {/* Vehicle Model Dropdown for New Customer */}
                  {showCustomerVehicleDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-[200px] overflow-y-auto scrollbar-hide">
                      {POPULAR_MOTORCYCLES.filter((model) =>
                        model
                          .toLowerCase()
                          .includes(newCustomerVehicleModel.toLowerCase())
                      )
                        .slice(0, 10)
                        .map((model) => (
                          <button
                            key={model}
                            type="button"
                            onClick={() => {
                              setNewCustomerVehicleModel(model);
                              setShowCustomerVehicleDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700/50 last:border-0 transition-colors"
                          >
                            {model}
                          </button>
                        ))}
                      {POPULAR_MOTORCYCLES.filter((model) =>
                        model
                          .toLowerCase()
                          .includes(newCustomerVehicleModel.toLowerCase())
                      ).length === 0 && (
                          <div className="px-4 py-3 text-xs text-slate-500 text-center italic">
                            Không tìm thấy - nhập tên xe mới
                          </div>
                        )}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Biển số xe
                  </label>
                  <input
                    type="text"
                    value={newCustomerLicensePlate}
                    onChange={(e) =>
                      setNewCustomerLicensePlate(e.target.value.toUpperCase())
                    }
                    placeholder="59G1-12345"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-bold uppercase focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddCustomer(false);
                    setNewCustomerName("");
                    setNewCustomerPhone("");
                    setNewCustomerVehicleModel("");
                    setNewCustomerLicensePlate("");
                  }}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-bold text-xs active:scale-95 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddNewCustomer}
                  disabled={!newCustomerName || !newCustomerPhone}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-green-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lưu khách hàng
                </button>
              </div>
            </div>
          </div>
        </div>
      )
      }
    </div>
  );
};
