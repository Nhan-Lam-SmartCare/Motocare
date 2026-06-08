import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { useAppContext } from "../../contexts/AppContext";
import type {
  WorkOrder,
  Customer,
} from "../../types";
import {
  formatCurrency,
  formatWorkOrderId,
} from "../../utils/format";
import {
  useCreateWorkOrderAtomicRepo,
  useUpdateWorkOrderAtomicRepo,
  useRefundWorkOrderRepo,
  useDeleteWorkOrderRepo,
  useWorkOrdersFilteredRepo,
} from "../../hooks/useWorkOrdersRepository";
import { completeWorkOrderPayment, fetchWorkOrderById } from "../../lib/repository/workOrdersRepository";
import { usePartsRepo } from "../../hooks/usePartsRepository";
import { useEmployeesRepo } from "../../hooks/useEmployeesRepository";
import {
  useCreateCustomerDebtRepo,
  useUpdateCustomerDebtRepo,
} from "../../hooks/useDebtsRepository";
import { showToast } from "../../utils/toast";
import { supabase } from "../../supabaseClient";
import { WorkOrderMobileModal } from "./WorkOrderMobileModal";
import WorkOrderModal from "./components/WorkOrderModal";
import { ServiceManagerMobile } from "./ServiceManagerMobile";
import { getStatusSnapshotCards } from "./components/statusHelpers";
import {
  detectMaintenancesFromWorkOrder,
  updateVehicleMaintenances,
} from "../../utils/maintenanceReminder";
import { RepairTemplatesModal } from "./components/RepairTemplatesModal";
import { USER_ROLES } from "../../constants";

import { useServiceStats } from "./hooks/useServiceStats";
import { useWorkOrdersRealtime } from "../../hooks/useWorkOrdersRealtime";
import {
  StoreSettings,
  WorkOrderStatus,
  ServiceTabKey,
} from "./types/service.types";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import {
  PAGE_SIZE,
} from "./constants/service.constants";
import {
  handleCallCustomer as callCustomer,
  formatMaskedPhone,
} from "./utils/service.utils";
import { canDo } from "../../utils/permissions";

// Import manager sub-components
import {
  HeroStatsSection,
  FilterActionBar,
  WorkOrdersTable,
  PrintPreviewModal,
  RefundModal,
  DeleteConfirmModal,
} from "./components/manager";

const normalizePlateSearch = (value?: string | null) =>
  (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export default function ServiceManager() {
  const queryClient = useQueryClient();
  useWorkOrdersRealtime();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();
  const isOwner = profile?.role === USER_ROLES.OWNER;
  const canCreateWorkOrder = canDo(profile?.role, "work_order.create");
  const canUpdateWorkOrder = canDo(profile?.role, "work_order.update");
  const canDeleteWorkOrder = canDo(profile?.role, "work_order.delete");
  const canCollectWorkOrderPayment = canDo(
    profile?.role,
    "work_order.collect_payment"
  );
  const canViewServiceFinancial = canDo(profile?.role, "finance.view");

  const {
    parts: contextParts,
    customers,
    employees,
    upsertCustomer,
    setCashTransactions,
    setPaymentSources,
    paymentSources,
    currentBranchId,
    workOrders,
    setWorkOrders,
  } = useAppContext();

  // Fetch parts from Supabase
  const { data: fetchedParts, isLoading: partsLoading } = usePartsRepo();

  // Fetch employees from Supabase
  const { data: fetchedEmployees, isLoading: employeesLoading } =
    useEmployeesRepo();

  // State for date range filter
  const [dateRangeDays, setDateRangeDays] = useState<number>(7);
  const [fetchLimit, setFetchLimit] = useState<number>(100);

  // Fetch work orders from Supabase with filtering (optimized)
  const {
    data: fetchedWorkOrders,
    isLoading: workOrdersLoading,
    isFetching: workOrdersFetching,
    isError: workOrdersIsError,
    error: workOrdersError,
    refetch: refetchWorkOrders,
  } = useWorkOrdersFilteredRepo({
    limit: fetchLimit,
    daysBack: dateRangeDays,
    branchId: currentBranchId,
  });

  // Fetch customers from Supabase directly
  const [fetchedCustomers, setFetchedCustomers] = useState<any[]>([]);
  useEffect(() => {
    let isMounted = true;
    const fetchCustomers = async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data && isMounted) {
        setFetchedCustomers(data);
      }
    };
    fetchCustomers();
    return () => {
      isMounted = false;
    };
  }, []);

  const parts = fetchedParts || contextParts;
  const displayCustomers =
    fetchedCustomers.length > 0 ? fetchedCustomers : customers;
  const displayEmployees = fetchedEmployees || employees;
  const displayWorkOrders = fetchedWorkOrders || workOrders;

  // Sync fetched work orders to context
  useEffect(() => {
    if (fetchedWorkOrders) {
      setWorkOrders(fetchedWorkOrders);
    }
  }, [fetchedWorkOrders, setWorkOrders]);

  const [showModal, setShowModal] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [mobileModalViewMode, setMobileModalViewMode] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | undefined>(
    undefined
  );
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const [activeTab, setActiveTab] = useState<ServiceTabKey>("all");

  // Read initial filter values from URL params
  const urlDateFilter = searchParams.get("date") || "week";
  const urlPaymentFilter = searchParams.get("payment") || "all";
  const urlSearch = searchParams.get("q") || "";

  const [dateFilter, setDateFilterState] = useState(urlDateFilter);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [customDateStart, setCustomDateStart] = useState(todayStr);
  const [customDateEnd, setCustomDateEnd] = useState(todayStr);
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [paymentFilter, setPaymentFilterState] = useState(urlPaymentFilter);

  // Ref for search input (keyboard shortcut focus)
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync search query from URL on mount
  useEffect(() => {
    if (urlSearch && !searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, []);

  // Wrapper functions to sync filters with URL
  const setDateFilter = (value: string) => {
    setDateFilterState(value);
    const newParams = new URLSearchParams(searchParams);
    if (value === "week") {
      newParams.delete("date");
    } else {
      newParams.set("date", value);
    }
    setSearchParams(newParams, { replace: true });
  };

  const setPaymentFilter = (value: string) => {
    setPaymentFilterState(value);
    const newParams = new URLSearchParams(searchParams);
    if (value === "all") {
      newParams.delete("payment");
    } else {
      newParams.set("payment", value);
    }
    setSearchParams(newParams, { replace: true });
  };

  // Sync search query to URL (debounced)
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    if (debouncedSearchQuery) {
      newParams.set("q", debouncedSearchQuery);
    } else {
      newParams.delete("q");
    }
    setSearchParams(newParams, { replace: true });
  }, [debouncedSearchQuery]);

  const [showProfit, setShowProfit] = useState(false);
  const [showFinancialOverview, setShowFinancialOverview] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  // Sync dateFilter with dateRangeDays for API query
  useEffect(() => {
    if (dateFilter === "all") {
      setDateRangeDays(0);
    } else if (dateFilter === "today") {
      setDateRangeDays(1);
    } else if (dateFilter === "week") {
      setDateRangeDays(7);
    } else if (dateFilter === "month") {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const elapsedDays =
        Math.floor((now.getTime() - startOfMonth.getTime()) / 86_400_000) + 1;
      setDateRangeDays(Math.max(elapsedDays, 1));
    } else if (dateFilter === "custom") {
      setDateRangeDays(0);
    }
  }, [dateFilter]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, activeTab, dateFilter, technicianFilter, paymentFilter]);

  useEffect(() => {
    if (dateRangeDays === 0) {
      setFetchLimit(500);
    } else {
      setFetchLimit(100);
    }
  }, [dateRangeDays, currentBranchId]);

  // Track mobile state for responsive layout
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const location = useLocation();

  // Read status filter from URL query params
  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam === "pending") {
      setActiveTab("pending");
      searchParams.delete("status");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Handle navigation from ServiceHistory with editOrder state
  useEffect(() => {
    let isMounted = true;
    const state = location.state as { editOrder?: WorkOrder } | null;
    const openOrderFromHistory = async () => {
      if (!state?.editOrder) return;

      let nextOrder = state.editOrder;
      if (state.editOrder.id) {
        const result = await fetchWorkOrderById(state.editOrder.id);
        if (result.ok) {
          nextOrder = result.data;
        } else {
          console.warn(
            "[ServiceManager] Failed to fetch fresh order from history, using navigation state:",
            result.error
          );
        }
      }

      if (!isMounted) return;

      setEditingOrder(nextOrder);
      if (isMobile) {
        setMobileModalViewMode(false);
        setShowMobileModal(true);
      } else {
        setShowModal(true);
      }
      window.history.replaceState({}, document.title);
    };
    openOrderFromHistory();
    return () => {
      isMounted = false;
    };
  }, [location.state, isMobile]);

  // State for print preview modal
  const [printOrder, setPrintOrder] = useState<WorkOrder | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(
    null
  );

  // State for refund modal
  const [refundingOrder, setRefundingOrder] = useState<WorkOrder | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);

  // State for delete confirm modal
  const [deletingOrder, setDeletingOrder] = useState<WorkOrder | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load store settings on mount for QR code generation
  useEffect(() => {
    const loadStoreSettings = async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("*")
        .limit(1)
        .single();
      if (data) {
        setStoreSettings(data);
      }
    };
    loadStoreSettings();
  }, []);

  // Keyboard shortcuts for power users
  useKeyboardShortcuts({
    enabled:
      !isMobile &&
      !showModal &&
      !showMobileModal &&
      !showPrintPreview &&
      !showRefundModal &&
      !showDeleteConfirm,
    onCreateNew: () => {
      handleOpenModal();
    },
    onFocusSearch: () => {
      searchInputRef.current?.focus();
    },
    onEscape: () => {
      if (showPrintPreview) {
        setShowPrintPreview(false);
      } else if (showRefundModal) {
        setShowRefundModal(false);
      } else if (showModal) {
        setShowModal(false);
      } else if (showMobileModal) {
        setShowMobileModal(false);
      } else if (showTemplateModal) {
        setShowTemplateModal(false);
      } else if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
      }
    },
  });

  const filteredOrders = useMemo(() => {
    let filtered = displayWorkOrders.filter((o) => !o.refunded);

    if (activeTab === "delivered") {
      filtered = filtered.filter((o) => o.status === "Trả máy");
    } else {
      filtered = filtered.filter((o) => o.status !== "Trả máy");
      if (activeTab === "pending")
        filtered = filtered.filter((o) => o.status === "Tiếp nhận");
      else if (activeTab === "inProgress")
        filtered = filtered.filter((o) => o.status === "Đang sửa");
      else if (activeTab === "done")
        filtered = filtered.filter((o) => o.status === "Đã sửa xong");
    }

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      const normalizedQuery = normalizePlateSearch(debouncedSearchQuery);
      filtered = filtered.filter((o) => {
        const normalizedPlate = normalizePlateSearch(o.licensePlate);
        const plateMatched =
          o.licensePlate?.toLowerCase().includes(query) ||
          (!!normalizedQuery && normalizedPlate.includes(normalizedQuery));

        return (
          o.id.toLowerCase().includes(query) ||
          formatWorkOrderId(o.id).toLowerCase().includes(query) ||
          o.customerName.toLowerCase().includes(query) ||
          o.vehicleModel?.toLowerCase().includes(query) ||
          plateMatched
        );
      });
    }

    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter((o) => {
        if (o.status === "Tiếp nhận" || o.status === "Đang sửa") {
          return true;
        }
        const orderDate = new Date(o.creationDate || (o as any).creationdate);
        if (dateFilter === "today") {
          return orderDate >= today;
        } else if (dateFilter === "week") {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return orderDate >= weekAgo;
        } else if (dateFilter === "month") {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          return orderDate >= startOfMonth;
        } else if (dateFilter === "custom") {
          if (!customDateStart || !customDateEnd) return true;
          const start = new Date(customDateStart);
          const end = new Date(customDateEnd);
          end.setHours(23, 59, 59, 999);
          return orderDate >= start && orderDate <= end;
        }
        return true;
      });
    }

    if (technicianFilter !== "all") {
      filtered = filtered.filter((o) => o.technicianName === technicianFilter);
    }

    if (paymentFilter !== "all") {
      filtered = filtered.filter((o) => {
        const status = o.paymentStatus || (o as any).paymentstatus;
        if (paymentFilter === "paid") return status === "paid";
        if (paymentFilter === "unpaid") return status === "unpaid";
        if (paymentFilter === "partial") return status === "partial";
        return true;
      });
    }

    return filtered.sort((a, b) => {
      const dateA = a.creationDate || (a as any).creationdate;
      const dateB = b.creationDate || (b as any).creationdate;
      if (!dateA || !dateB) return 0;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [
    displayWorkOrders,
    activeTab,
    debouncedSearchQuery,
    dateFilter,
    customDateStart,
    customDateEnd,
    technicianFilter,
    paymentFilter,
  ]);

  const paginatedOrders = useMemo(
    () => filteredOrders.slice(0, visibleCount),
    [filteredOrders, visibleCount]
  );
  const hasMoreOrders = filteredOrders.length > visibleCount;
  const showTableSkeleton =
    (workOrdersLoading || workOrdersFetching) &&
    (displayWorkOrders?.length ?? 0) === 0;
  const showTableError =
    workOrdersIsError && (displayWorkOrders?.length ?? 0) === 0;

  // Scroll-to-load sentinel observer
  useEffect(() => {
    const sentinel = document.getElementById("service-table-scroll-sentinel");
    if (!sentinel || !hasMoreOrders || workOrdersFetching) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreOrders, workOrdersFetching]);

  const {
    stats,
    dateFilteredOrders,
    totalOpenTickets,
    urgentTickets,
    completionRate,
    profitMargin,
  } = useServiceStats({
    workOrders: displayWorkOrders,
    dateFilter: dateFilter as "all" | "today" | "week" | "month",
  });

  const statusSnapshotCards = getStatusSnapshotCards(stats);

  const currentStaffTechnicianName = useMemo(() => {
    if (profile?.role !== USER_ROLES.STAFF) return "";
    const profileId = (profile as any)?.id;
    if (profileId) {
      const matchedEmployee = displayEmployees.find((emp: any) => emp?.id === profileId);
      if (matchedEmployee?.name) return matchedEmployee.name;
    }
    return profile?.name || profile?.full_name || "";
  }, [profile, displayEmployees]);

  const handleOpenModal = async (order?: WorkOrder) => {
    if (order?.id && !canUpdateWorkOrder) {
      showToast.error("Bạn không có quyền sửa phiếu sửa chữa");
      return;
    }
    if (!order?.id && !canCreateWorkOrder) {
      showToast.error("Bạn không có quyền tạo phiếu sửa chữa");
      return;
    }

    if (order && order.id) {
      const result = await fetchWorkOrderById(order.id);
      if (result.ok) {
        setEditingOrder(result.data);
      } else {
        console.warn("[handleOpenModal] Failed to fetch fresh data, using cached:", result.error);
        setEditingOrder(order);
      }
    } else {
      setEditingOrder({
        id: "",
        customerName: "",
        customerPhone: "",
        vehicleModel: "",
        licensePlate: "",
        issueDescription: "",
        technicianName: currentStaffTechnicianName,
        status: "Tiếp nhận",
        laborCost: 0,
        discount: 0,
        partsUsed: [],
        total: 0,
        branchId: currentBranchId,
        paymentStatus: "unpaid",
        creationDate: new Date().toISOString(),
      } as WorkOrder);
    }
    setShowModal(true);
  };

  const handleApplyRepairTemplate = (template: any) => {
    const partsTotal = template.parts.reduce(
      (sum: number, p: any) => sum + (p.price || 0) * (p.quantity || 1),
      0
    );
    const newOrder: Partial<WorkOrder> = {
      id: "",
      customerName: "",
      customerPhone: "",
      vehicleModel: "",
      licensePlate: "",
      issueDescription: template.description,
      laborCost: template.laborCost,
      partsUsed: template.parts.map((p: any, idx: number) => ({
        partId: p.partId || `TEMPLATE-${idx}`,
        partName: p.name,
        sku: p.sku || "",
        quantity: p.quantity,
        price: p.price,
      })),
      status: "Tiếp nhận",
      paymentStatus: "unpaid",
      discount: 0,
      total: (template.laborCost || 0) + partsTotal,
      creationDate: new Date().toISOString(),
      branchId: currentBranchId,
      technicianName: currentStaffTechnicianName,
    };
    setEditingOrder(newOrder as WorkOrder);
    setShowTemplateModal(false);
    setShowModal(true);
  };

  const handlePrintOrder = async (order: WorkOrder) => {
    setPrintOrder(order);
    setShowPrintPreview(true);
  };

  const { mutateAsync: refundWorkOrderAsync } = useRefundWorkOrderRepo();
  const { mutateAsync: deleteWorkOrderAsync } = useDeleteWorkOrderRepo();
  const { mutateAsync: createWorkOrderAtomicAsync } = useCreateWorkOrderAtomicRepo();
  const { mutateAsync: updateWorkOrderAtomicAsync } = useUpdateWorkOrderAtomicRepo();
  const createCustomerDebt = useCreateCustomerDebtRepo();
  const updateCustomerDebt = useUpdateCustomerDebtRepo();
  const mobileSaveInFlightRef = useRef(false);

  const createWorkOrderNotification = async (
    orderId: string,
    customerName: string,
    vehicleModel: string,
    licensePlate: string,
    total: number,
    createdByName: string
  ) => {
    try {
      await supabase.from("notifications").insert({
        id: crypto.randomUUID(),
        type: "work_order",
        title: "Phiếu sửa chữa mới",
        message: `${createdByName} tạo phiếu ${orderId} - ${customerName} (${licensePlate || vehicleModel}) - ${formatCurrency(total)}`,
        data: {
          workOrderId: orderId,
          customerName,
          vehicleModel,
          licensePlate,
          total,
          createdBy: createdByName,
        },
        created_by: profile?.id || null,
        recipient_role: "owner",
        branch_id: currentBranchId,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("❌ Error in createWorkOrderNotification:", err);
    }
  };

  const updateVehicleKmAndMaintenance = async (
    customer: Customer,
    vehicleId: string,
    currentKm: number,
    partsUsed: Array<{ partName: string }>,
    additionalServices: Array<{ description: string }>,
    issueDescription?: string
  ) => {
    try {
      const vehicle = customer.vehicles?.find((v) => v.id === vehicleId);
      if (!vehicle) return;

      const maintenanceTypes = detectMaintenancesFromWorkOrder(
        partsUsed,
        additionalServices,
        issueDescription
      );

      const updatedVehicle = updateVehicleMaintenances(
        { ...vehicle, currentKm },
        maintenanceTypes,
        currentKm
      );

      const updatedVehicles = customer.vehicles?.map((v) =>
        v.id === vehicleId ? updatedVehicle : v
      ) || [updatedVehicle];

      await upsertCustomer({
        ...customer,
        vehicles: updatedVehicles,
      });
    } catch (err) {
      console.error("[updateVehicleKmAndMaintenance] Error:", err);
    }
  };

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

      const workOrderNumber =
        formatWorkOrderId(workOrder.id, storeSettings?.work_order_prefix)
          .split("-")
          .pop() || "";

      let description = `${workOrder.vehicleModel || "Xe"
        } (Phiếu sửa chữa #${workOrderNumber})`;

      if (workOrder.issueDescription) {
        description += `\nVấn đề: ${workOrder.issueDescription}`;
      }

      if (workOrder.partsUsed && workOrder.partsUsed.length > 0) {
        description += "\n\nPhụ tùng đã thay:";
        workOrder.partsUsed.forEach((part) => {
          description += `\n  • ${part.quantity} x ${part.partName
            } - ${formatCurrency(part.price * part.quantity)}`;
        });
      }

      if (
        workOrder.additionalServices &&
        workOrder.additionalServices.length > 0
      ) {
        description += "\n\nDịch vụ:";
        workOrder.additionalServices.forEach((service) => {
          description += `\n  • ${service.quantity} x ${service.description
            } - ${formatCurrency(service.price * service.quantity)}`;
        });
      }

      if (workOrder.laborCost && workOrder.laborCost > 0) {
        description += `\n\nCông lao động: ${formatCurrency(
          workOrder.laborCost
        )}`;
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
        `Đã tạo/cập nhật công nợ ${remainingAmount.toLocaleString()}đ (Mã: ${result?.id || "N/A"
        })`
      );
    } catch (error) {
      console.error("Error creating/updating customer debt:", error);
      showToast.error("Không thể tạo/cập nhật công nợ tự động");
    }
  };

  const handleMobileSave = async (workOrderData: any) => {
    const isUpdateMode = !!editingOrder?.id;
    if (isUpdateMode && !canUpdateWorkOrder) {
      showToast.error("Bạn không có quyền cập nhật phiếu sửa chữa");
      throw new Error("NO_PERMISSION_WORK_ORDER_UPDATE");
    }
    if (!isUpdateMode && !canCreateWorkOrder) {
      showToast.error("Bạn không có quyền tạo phiếu sửa chữa");
      throw new Error("NO_PERMISSION_WORK_ORDER_CREATE");
    }

    if (mobileSaveInFlightRef.current) return;
    mobileSaveInFlightRef.current = true;

    try {
      if (!workOrderData.customer?.name) {
        showToast.error("Vui lòng nhập tên khách hàng");
        throw new Error("Vui lòng nhập tên khách hàng");
      }
      if (!workOrderData.customer?.phone) {
        showToast.error("Vui lòng nhập số điện thoại");
        throw new Error("Vui lòng nhập số điện thoại");
      }

      const {
        status,
        customer,
        vehicle,
        currentKm = 0,
        issueDescription,
        technicianId,
        parts = [],
        additionalServices = [],
        laborCost = 0,
        discount = 0,
        total = 0,
        depositAmount = 0,
        paymentMethod,
        totalPaid = 0,
        remainingAmount = 0,
      } = workOrderData;

      if (customer && vehicle && vehicle.licensePlate) {
        const existingCustomer = displayCustomers.find(
          (c: any) => c.id === customer.id || c.phone === customer.phone
        );

        if (existingCustomer) {
          const existingVehicles = existingCustomer.vehicles || [];
          const vehicleExists = existingVehicles.some(
            (v: any) => v.licensePlate === vehicle.licensePlate
          );

          if (!vehicleExists) {
            const updatedCustomer = {
              ...existingCustomer,
              vehicles: [
                ...existingVehicles,
                {
                  id: vehicle.id || `veh-${Date.now()}`,
                  licensePlate: vehicle.licensePlate,
                  model: vehicle.model || "",
                  currentKm: currentKm > 0 ? currentKm : undefined,
                },
              ],
              licensePlate: vehicle.licensePlate,
              vehicleModel: vehicle.model || existingCustomer.vehicleModel,
            };
            upsertCustomer(updatedCustomer);
          } else if (currentKm > 0) {
            const updatedVehicles = existingVehicles.map((v: any) =>
              v.licensePlate === vehicle.licensePlate
                ? { ...v, currentKm: currentKm }
                : v
            );
            const updatedCustomer = {
              ...existingCustomer,
              vehicles: updatedVehicles,
            };
            upsertCustomer(updatedCustomer);
          }
        } else {
          const newCustomer = {
            ...customer,
            vehicles: customer.vehicles || [
              {
                id: vehicle.id || `veh-${Date.now()}`,
                licensePlate: vehicle.licensePlate,
                model: vehicle.model || "",
                currentKm: currentKm > 0 ? currentKm : undefined,
              },
            ],
            licensePlate: vehicle.licensePlate,
            vehicleModel: vehicle.model,
          };
          upsertCustomer(newCustomer);
        }
      }

      let paymentStatus: "unpaid" | "paid" | "partial" = "unpaid";
      if (total > 0 && totalPaid >= total) {
        paymentStatus = "paid";
      } else if (totalPaid > 0) {
        paymentStatus = "partial";
      }

      if (
        !canCollectWorkOrderPayment &&
        (paymentStatus === "paid" || paymentStatus === "partial" || totalPaid > 0)
      ) {
        showToast.error("Bạn không có quyền thu tiền phiếu sửa chữa");
        throw new Error("NO_PERMISSION_WORK_ORDER_PAYMENT");
      }

      const technician = displayEmployees.find((e: any) => e.id === technicianId);
      const technicianName = technician?.name || "";

      let finalOrderId = "";
      let isNew = false;
      let finalOrderData: WorkOrder | null = null;

      if (!editingOrder?.id) {
        isNew = true;
        const orderId = `${storeSettings?.work_order_prefix || "SC"}-${Date.now()}`;
        finalOrderId = orderId;

        const createResponse = await createWorkOrderAtomicAsync({
          id: orderId,
          customerName: customer.name,
          customerPhone: customer.phone,
          vehicleModel: vehicle?.model || "",
          licensePlate: vehicle?.licensePlate || "",
          vehicleId: vehicle?.id || "",
          currentKm: currentKm > 0 ? currentKm : undefined,
          issueDescription: issueDescription || "",
          technicianName: technicianName,
          status: status,
          laborCost: laborCost,
          discount: discount,
          partsUsed: parts,
          additionalServices:
            additionalServices.length > 0 ? additionalServices : undefined,
          total: total,
          branchId: currentBranchId,
          paymentStatus: paymentStatus,
          paymentMethod: paymentMethod,
          depositAmount: depositAmount > 0 ? depositAmount : undefined,
          additionalPayment:
            totalPaid > depositAmount ? totalPaid - depositAmount : undefined,
          totalPaid: totalPaid > 0 ? totalPaid : undefined,
          remainingAmount: remainingAmount,
          creationDate: new Date().toISOString(),
        } as any);

        if (
          paymentStatus === "paid" &&
          parts.length > 0 &&
          !(createResponse as any)?.inventoryDeducted
        ) {
          try {
            await completeWorkOrderPayment(orderId, paymentMethod || "cash", 0);
          } catch (err) {
            console.error("[handleMobileSave] Error deducting inventory:", err);
          }
        }

        finalOrderData = {
          id: orderId,
          customerName: customer.name,
          customerPhone: customer.phone,
          vehicleModel: vehicle?.model || "",
          licensePlate: vehicle?.licensePlate || "",
          vehicleId: vehicle?.id || "",
          currentKm: currentKm > 0 ? currentKm : undefined,
          issueDescription: issueDescription || "",
          technicianName: technicianName,
          status: status,
          laborCost: laborCost,
          discount: discount,
          partsUsed: parts,
          additionalServices:
            additionalServices.length > 0 ? additionalServices : undefined,
          total: total,
          branchId: currentBranchId,
          depositAmount: depositAmount > 0 ? depositAmount : undefined,
          paymentStatus: paymentStatus,
          paymentMethod: paymentMethod,
          totalPaid: totalPaid > 0 ? totalPaid : undefined,
          remainingAmount: remainingAmount,
          creationDate: new Date().toISOString(),
        };

        if (additionalServices?.length) {
          try {
            await supabase
              .from("work_orders")
              .update({ additionalservices: additionalServices })
              .eq("id", orderId);
          } catch (err) {
            console.error(err);
          }
        }
        showToast.success("Tạo phiếu sửa chữa thành công!");
      } else {
        finalOrderId = editingOrder.id;

        await updateWorkOrderAtomicAsync({
          id: editingOrder.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          vehicleModel: vehicle?.model || "",
          licensePlate: vehicle?.licensePlate || "",
          vehicleId: vehicle?.id || "",
          currentKm: currentKm > 0 ? currentKm : undefined,
          issueDescription: issueDescription || "",
          technicianName: technicianName,
          status: status,
          laborCost: laborCost,
          discount: discount,
          partsUsed: parts,
          additionalServices:
            additionalServices.length > 0 ? additionalServices : undefined,
          total: total,
          branchId: currentBranchId,
          paymentStatus: paymentStatus,
          paymentMethod: paymentMethod,
          depositAmount: depositAmount > 0 ? depositAmount : undefined,
          additionalPayment:
            totalPaid > depositAmount ? totalPaid - depositAmount : undefined,
          totalPaid: totalPaid > 0 ? totalPaid : undefined,
          remainingAmount: remainingAmount,
        } as any);

        const wasUnpaidOrPartial = editingOrder.paymentStatus !== "paid";
        if (paymentStatus === "paid" && wasUnpaidOrPartial && parts.length > 0) {
          try {
            await completeWorkOrderPayment(editingOrder.id, paymentMethod || "cash", 0);
          } catch (err) {
            console.error("[handleMobileSave] Error deducting inventory:", err);
          }
        }

        finalOrderData = {
          ...editingOrder,
          customerName: customer.name,
          customerPhone: customer.phone,
          vehicleModel: vehicle?.model || "",
          licensePlate: vehicle?.licensePlate || "",
          vehicleId: vehicle?.id || "",
          currentKm: currentKm > 0 ? currentKm : undefined,
          issueDescription: issueDescription || "",
          technicianName: technicianName,
          status: status,
          laborCost: laborCost,
          discount: discount,
          partsUsed: parts,
          additionalServices:
            additionalServices.length > 0 ? additionalServices : undefined,
          total: total,
          paymentStatus: paymentStatus,
          paymentMethod: paymentMethod,
          totalPaid: totalPaid > 0 ? totalPaid : undefined,
          remainingAmount: remainingAmount,
        };

        if (additionalServices?.length) {
          try {
            await supabase
              .from("work_orders")
              .update({ additionalservices: additionalServices })
              .eq("id", editingOrder.id);
          } catch (err) {
            console.error(err);
          }
        }
        showToast.success("Cập nhật phiếu sửa chữa thành công!");
      }

      if (finalOrderData) {
        const orderForAsync = finalOrderData;
        Promise.all([
          (async () => {
            if (currentKm > 0 && customer?.id && vehicle?.id) {
              await updateVehicleKmAndMaintenance(
                customer,
                vehicle.id,
                currentKm,
                parts,
                additionalServices,
                issueDescription
              );
            }
          })(),
          (async () => {
            if (status === "Trả máy" && remainingAmount > 0) {
              await createCustomerDebtIfNeeded(
                orderForAsync,
                remainingAmount,
                total,
                totalPaid
              );
            }
          })(),
          (async () => {
            if (isNew) {
              const createdByName =
                profile?.name || profile?.full_name || profile?.email || "Nhân viên";
              await createWorkOrderNotification(
                finalOrderId,
                customer.name,
                vehicle?.model || "",
                vehicle?.licensePlate || "",
                total,
                createdByName
              );
            }
          })(),
        ]).catch((err) => {
          console.error("Background task error:", err);
        });
      }

      queryClient.invalidateQueries({ queryKey: ["workOrdersRepo"] });
      queryClient.invalidateQueries({ queryKey: ["workOrdersFiltered"] });

      setShowMobileModal(false);
      setEditingOrder(undefined);
    } catch (error: any) {
      console.error(error);
    } finally {
      mobileSaveInFlightRef.current = false;
    }
  };

  const handleRefundOrder = (order: WorkOrder) => {
    setRefundingOrder(order);
    setShowRefundModal(true);
  };

  const handleConfirmRefund = async (reason: string) => {
    if (!refundingOrder) return;
    if (!canCollectWorkOrderPayment) {
      showToast.error("Bạn không có quyền hoàn tiền phiếu sửa chữa");
      return;
    }
    if (!reason.trim()) {
      showToast.error("Vui lòng nhập lý do hủy");
      return;
    }

    try {
      const result = await refundWorkOrderAsync({
        orderId: refundingOrder.id,
        refundReason: reason,
      });

      if (!result || (result as any).error) {
        showToast.error("Không thể hủy đơn sửa chữa");
        return;
      }

      if (
        result &&
        "refund_transaction_id" in result &&
        "refundAmount" in result &&
        result.refund_transaction_id &&
        result.refundAmount
      ) {
        const refundAmount = result.refundAmount as number;
        setCashTransactions((prev: any[]) => [
          ...prev,
          {
            id: result.refund_transaction_id,
            type: "refund",
            category: "refund",
            amount: -refundAmount,
            date: new Date().toISOString(),
            description: `Hoàn tiền hủy phiếu #${formatWorkOrderId(
              refundingOrder.id,
              storeSettings?.work_order_prefix
            )
              .split("-")
              .pop()} - ${reason}`,
            branchId: currentBranchId,
            paymentSource: refundingOrder.paymentMethod,
            reference: refundingOrder.id,
          },
        ]);

        if (refundingOrder.paymentMethod) {
          setPaymentSources((prev: any[]) =>
            prev.map((ps) => {
              if (ps.id === refundingOrder.paymentMethod) {
                return {
                  ...ps,
                  balance: {
                    ...ps.balance,
                    [currentBranchId]:
                      (ps.balance[currentBranchId] || 0) - refundAmount,
                  },
                };
              }
              return ps;
            })
          );
        }
      }

      setWorkOrders((prev) =>
        prev.map((wo) =>
          wo.id === refundingOrder.id
            ? { ...wo, refunded: true, status: "Đã hủy" as any }
            : wo
        )
      );

      showToast.success("Đã hủy đơn sửa chữa thành công");
      setShowRefundModal(false);
      setRefundingOrder(null);
    } catch (error) {
      console.error(error);
      showToast.error("Lỗi khi hủy đơn sửa chữa");
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((c) => c + PAGE_SIZE);
    const loadedCount =
      fetchedWorkOrders?.length ?? displayWorkOrders?.length ?? 0;
    if (!workOrdersFetching && loadedCount >= fetchLimit) {
      setFetchLimit((l) => l + 100);
    }
  };

  const handleDelete = (order: WorkOrder) => {
    if (!canDeleteWorkOrder) {
      showToast.error("Bạn không có quyền xóa phiếu sửa chữa");
      return;
    }
    setDeletingOrder(order);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingOrder) return;
    try {
      await deleteWorkOrderAsync({ id: deletingOrder.id });
    } catch (error) {
      console.error(error);
    } finally {
      setDeletingOrder(null);
      setShowDeleteConfirm(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActiveTab("all");
    setTechnicianFilter("all");
    setPaymentFilter("all");
    setDateFilter("week");
    setCustomDateStart(todayStr);
    setCustomDateEnd(todayStr);
  };

  const chartData = useMemo(() => {
    if (dateFilter !== "week") return null;
    const days = 7;
    const data = Array.from({ length: days }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return { date: d.toISOString().split("T")[0], rev: 0, prof: 0 };
    });

    dateFilteredOrders.forEach((o) => {
      if (o.paymentStatus !== "paid" && o.paymentStatus !== "partial") return;
      const oDate = new Date(o.creationDate || (o as any).creationdate)
        .toISOString()
        .split("T")[0];
      const match = data.find((d) => d.date === oDate);
      if (match) {
        const rev = o.paymentStatus === "paid" ? (o.total || 0) : (o.totalPaid || 0);
        const partsCost =
          o.partsUsed?.reduce(
            (s, p) => s + (p.costPrice || 0) * (p.quantity || 1),
            0
          ) || 0;
        const servCost =
          o.additionalServices?.reduce(
            (s: any, svc: any) => s + (svc.costPrice || 0) * (svc.quantity || 1),
            0
          ) || 0;
        const prof = rev - partsCost - servCost;
        match.rev += rev;
        match.prof += prof;
      }
    });

    const maxRev = Math.max(...data.map((d) => d.rev), 1);
    const maxProf = Math.max(...data.map((d) => Math.abs(d.prof)), 1);
    return { data, maxRev, maxProf };
  }, [dateFilteredOrders, dateFilter]);

  if (isMobile) {
    return (
      <>
        <ServiceManagerMobile
          workOrders={displayWorkOrders || []}
          isLoading={workOrdersLoading || workOrdersFetching}
          onRefresh={async () => {
            await refetchWorkOrders();
          }}
          onCreateWorkOrder={() => {
            if (!canCreateWorkOrder) {
              showToast.error("Bạn không có quyền tạo phiếu sửa chữa");
              return;
            }
            setEditingOrder(undefined);
            setMobileModalViewMode(false);
            setShowMobileModal(true);
          }}
          onEditWorkOrder={async (workOrder) => {
            if (!canUpdateWorkOrder) {
              showToast.error("Bạn không có quyền sửa phiếu sửa chữa");
              return;
            }
            if (workOrder.id) {
              const result = await fetchWorkOrderById(workOrder.id);
              if (result.ok) {
                setEditingOrder(result.data);
              } else {
                console.warn(
                  "[onEditWorkOrder] Failed to fetch fresh data, using cached:",
                  result.error
                );
                setEditingOrder(workOrder);
              }
            } else {
              setEditingOrder(workOrder);
            }
            setMobileModalViewMode(true);
            setShowMobileModal(true);
          }}
          onDeleteWorkOrder={handleDelete}
          onCallCustomer={callCustomer}
          onPrintWorkOrder={handlePrintOrder}
          onOpenTemplates={() => setShowTemplateModal(true)}
          onApplyTemplate={handleApplyRepairTemplate}
          currentBranchId={currentBranchId}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          setDateRangeDays={setDateRangeDays}
        />

        {showMobileModal && (
          <WorkOrderMobileModal
            isOpen={showMobileModal}
            onClose={() => {
              setShowMobileModal(false);
              setEditingOrder(undefined);
              setMobileModalViewMode(false);
            }}
            onSave={handleMobileSave}
            onPrintWorkOrder={handlePrintOrder}
            workOrder={editingOrder}
            customers={displayCustomers}
            parts={fetchedParts || []}
            employees={displayEmployees}
            currentBranchId={currentBranchId}
            upsertCustomer={upsertCustomer}
            viewMode={mobileModalViewMode}
            onSwitchToEdit={() => setMobileModalViewMode(false)}
            isOwner={isOwner}
          />
        )}

        {showPrintPreview && printOrder && (
          <PrintPreviewModal
            isOpen={showPrintPreview}
            onClose={() => {
              setShowPrintPreview(false);
              setPrintOrder(null);
            }}
            printOrder={printOrder}
            storeSettings={storeSettings}
          />
        )}

        <RepairTemplatesModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onApplyTemplate={(template) => {
            const partsTotal = template.parts.reduce(
              (sum, p) => sum + (p.price || 0) * (p.quantity || 1),
              0
            );
            const newOrder: WorkOrder = {
              id: `WO-${Date.now()}`,
              customerName: "",
              customerPhone: "",
              vehicleModel: "",
              licensePlate: "",
              issueDescription: template.description,
              status: "Tiếp nhận",
              paymentStatus: "unpaid",
              discount: 0,
              creationDate: new Date().toISOString(),
              estimatedCompletion: new Date(
                Date.now() + template.duration * 60000
              ).toISOString(),
              assignedTechnician: "",
              branchId: currentBranchId || "",
              laborCost: template.laborCost,
              partsUsed: template.parts.map((p) => ({
                partId: (p as any).partId || "",
                partName: p.name,
                sku: (p as any).sku || "",
                quantity: p.quantity,
                price: p.price,
              })),
              notes: "",
              total: (template.laborCost || 0) + partsTotal,
            };
            setEditingOrder(newOrder);
            setShowTemplateModal(false);
            setShowModal(true);
          }}
          parts={fetchedParts || []}
          currentBranchId={currentBranchId}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Hero Stats Section */}
      <HeroStatsSection
        totalOpenTickets={totalOpenTickets}
        urgentTickets={urgentTickets}
        completionRate={completionRate}
        statusSnapshotCards={statusSnapshotCards}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        canViewServiceFinancial={canViewServiceFinancial}
        showFinancialOverview={showFinancialOverview}
        setShowFinancialOverview={setShowFinancialOverview}
        filteredRevenue={stats.filteredRevenue}
        filteredProfit={stats.filteredProfit}
        profitMargin={profitMargin}
        chartData={chartData}
      />

      {/* 2. Filter & Action Bar */}
      <FilterActionBar
        searchInputRef={searchInputRef}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        technicianFilter={technicianFilter}
        setTechnicianFilter={setTechnicianFilter}
        employees={employees}
        paymentFilter={paymentFilter}
        setPaymentFilter={setPaymentFilter}
        customDateStart={customDateStart}
        setCustomDateStart={setCustomDateStart}
        customDateEnd={customDateEnd}
        setCustomDateEnd={setCustomDateEnd}
        refetchWorkOrders={refetchWorkOrders}
        workOrdersFetching={workOrdersFetching}
        clearFilters={clearFilters}
        filteredOrdersCount={filteredOrders.length}
        isOwner={isOwner}
        showProfit={showProfit}
        setShowProfit={setShowProfit}
        setShowTemplateModal={setShowTemplateModal}
        handleOpenModal={handleOpenModal}
      />

      {/* 3. Work Orders Table */}
      <WorkOrdersTable
        paginatedOrders={paginatedOrders}
        filteredOrders={filteredOrders}
        showTableSkeleton={showTableSkeleton}
        showTableError={showTableError}
        workOrdersError={workOrdersError}
        refetchWorkOrders={refetchWorkOrders}
        workOrdersFetching={workOrdersFetching}
        clearFilters={clearFilters}
        handleOpenModal={handleOpenModal}
        handlePrintOrder={handlePrintOrder}
        handleRefundOrder={handleRefundOrder}
        handleDelete={handleDelete}
        visibleCount={visibleCount}
        hasMoreOrders={hasMoreOrders}
        handleLoadMore={handleLoadMore}
        isOwner={isOwner}
        showProfit={showProfit}
        storeSettings={storeSettings}
      />

      {/* 4. Repair Templates Modal */}
      <RepairTemplatesModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onApplyTemplate={(template) => {
          const partsTotal = template.parts.reduce(
            (sum, p) => sum + (p.price || 0) * (p.quantity || 1),
            0
          );
          const newOrder: WorkOrder = {
            id: `WO-${Date.now()}`,
            customerName: "",
            customerPhone: "",
            vehicleModel: "",
            licensePlate: "",
            issueDescription: template.description,
            status: "Tiếp nhận",
            paymentStatus: "unpaid",
            discount: 0,
            creationDate: new Date().toISOString(),
            estimatedCompletion: new Date(
              Date.now() + template.duration * 60000
            ).toISOString(),
            assignedTechnician: "",
            branchId: currentBranchId || "",
            laborCost: template.laborCost,
            partsUsed: template.parts.map((p) => ({
              partId: p.partId || "",
              partName: p.name,
              quantity: p.quantity,
              price: p.price,
              sku: p.sku || "",
            })),
            notes: "",
            total: (template.laborCost || 0) + partsTotal,
          };
          setEditingOrder(newOrder);
          setShowTemplateModal(false);
          setShowModal(true);
        }}
        parts={fetchedParts || []}
        currentBranchId={currentBranchId}
      />

      {/* 5. Work Order Modal */}
      {showModal && editingOrder && (
        <WorkOrderModal
          order={editingOrder}
          onClose={() => {
            setShowModal(false);
            setEditingOrder(undefined);
          }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ["workOrdersRepo"] });
            queryClient.invalidateQueries({ queryKey: ["workOrdersFiltered"] });
            setTimeout(() => refetchWorkOrders(), 100);
            setShowModal(false);
            setEditingOrder(undefined);
          }}
          parts={parts}
          partsLoading={partsLoading}
          customers={displayCustomers}
          employees={displayEmployees}
          upsertCustomer={upsertCustomer}
          setCashTransactions={setCashTransactions}
          setPaymentSources={setPaymentSources}
          paymentSources={paymentSources}
          currentBranchId={currentBranchId}
          storeSettings={storeSettings}
          invalidateWorkOrders={async () => {
            queryClient.invalidateQueries({ queryKey: ["workOrdersRepo"] });
            queryClient.invalidateQueries({ queryKey: ["workOrdersFiltered"] });
            setTimeout(() => {
              refetchWorkOrders();
            }, 100);
          }}
        />
      )}

      {/* 6. Print Preview Modal */}
      {showPrintPreview && printOrder && (
        <PrintPreviewModal
          isOpen={showPrintPreview}
          onClose={() => {
            setShowPrintPreview(false);
            setPrintOrder(null);
          }}
          printOrder={printOrder}
          storeSettings={storeSettings}
        />
      )}

      {/* 7. Refund Modal */}
      {showRefundModal && refundingOrder && (
        <RefundModal
          isOpen={showRefundModal}
          onClose={() => {
            setShowRefundModal(false);
            setRefundingOrder(null);
          }}
          refundingOrder={refundingOrder}
          onConfirm={handleConfirmRefund}
          storeSettings={storeSettings}
        />
      )}

      {/* 8. Delete Confirmation Modal */}
      {showDeleteConfirm && deletingOrder && (
        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setDeletingOrder(null);
          }}
          onConfirm={handleConfirmDelete}
          orderId={formatWorkOrderId(deletingOrder.id, storeSettings?.work_order_prefix)}
        />
      )}
    </div>
  );
}
