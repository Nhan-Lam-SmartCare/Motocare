import React, { useState, useMemo, useEffect } from "react";
import {
  Bike,
  LayoutGrid,
  List,
  AlertTriangle,
  Droplets,
  Cog,
  Wind,
  Phone,
  Clock,
  User,
  Star,
  Calendar,
  History,
  Edit2,
  Trash2,
} from "lucide-react";
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from "../../hooks/useSupabase";
import { formatDate, formatCurrency, normalizeSearchText } from "../../utils/format";
import { PlusIcon, UsersIcon } from "../Icons";
import {
  useSuppliers,
  useDeleteSupplier,
} from "../../hooks/useSuppliers";
import type { Customer, Vehicle } from "../../types";
import { useSalesRepo } from "../../hooks/useSalesRepository";
import { useWorkOrdersRepo } from "../../hooks/useWorkOrdersRepository";
import { showToast } from "../../utils/toast";
import { getVehiclesNeedingMaintenance } from "../../utils/maintenanceReminder";
import { supabase } from "../../supabaseClient";
import { useDebounce } from "../../hooks/useDebounce";

// New sub-component and utility imports
import { classifyCustomer } from "./utils/classifyCustomer";
import { CustomerHistoryModal } from "./modals/CustomerHistoryModal";
import { CustomerModal } from "./modals/CustomerModal";
import { SupplierModal } from "./modals/SupplierModal";
import { ImportCSVModal } from "./modals/ImportCSVModal";
import { SuppliersList } from "./components/SuppliersList";

const CustomerManager: React.FC = () => {
  // Lấy danh sách khách hàng từ Supabase
  const { data: customers = [], isLoading, refetch } = useCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  // Lấy danh sách nhà cung cấp từ Supabase
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
  const deleteSupplierMutation = useDeleteSupplier();

  // State cho Load More
  const [displayCount, setDisplayCount] = useState(20);
  const [search, setSearch] = useState("");
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);

  // Debounce search để tránh query liên tục
  const debouncedSearch = useDebounce(search, 300);
  const [serverCustomers, setServerCustomers] = useState<Customer[]>([]);
  const [isSearchingServer, setIsSearchingServer] = useState(false);

  const normalizePlate = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Hàm lưu khách hàng (tạo mới hoặc cập nhật)
  const handleSaveCustomer = async (c: Partial<Customer> & { id?: string }) => {
    if (c.id) {
      await updateCustomer.mutateAsync({ id: c.id, updates: c });
    } else {
      const newCustomer = {
        ...c,
        id: `CUS-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      };
      await createCustomer.mutateAsync(newCustomer);
    }
    refetch();
    setEditCustomer(null);
  };

  // Search từ server khi có từ khóa (để tìm khách hàng không nằm trong page hiện tại)
  useEffect(() => {
    const searchFromServer = async () => {
      const keyword = debouncedSearch.trim();
      if (!keyword) {
        setServerCustomers([]);
        return;
      }

      const keywordDigits = keyword.replace(/\D/g, "");
      const plateKeyword = normalizePlate(keyword);
      const normalizedKeyword = normalizeSearchText(keyword);
      const orParts = [
        `name.ilike.%${keyword}%`,
        `phone.ilike.%${keyword}%`,
        `vehiclemodel.ilike.%${keyword}%`,
        `licenseplate.ilike.%${keyword}%`,
      ];

      if (keywordDigits) {
        orParts.push(`phone.ilike.%${keywordDigits}%`);
      }
      if (plateKeyword && plateKeyword !== keyword.toLowerCase()) {
        orParts.push(`licenseplate.ilike.%${plateKeyword}%`);
      }
      if (normalizedKeyword && normalizedKeyword !== keyword.toLowerCase()) {
        orParts.push(
          `name.ilike.%${normalizedKeyword}%`,
          `vehiclemodel.ilike.%${normalizedKeyword}%`
        );
      }

      setIsSearchingServer(true);
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .or(orParts.join(","))
          .limit(120);

        if (error) throw error;

        if (Array.isArray(data)) {
          const mappedData = data.map((c: any) => ({
            ...c,
            totalSpent: c.totalSpent ?? c.totalspent ?? 0,
            visitCount: c.visitCount ?? c.visitcount ?? 0,
            lastVisit: c.lastVisit ?? c.lastvisit ?? null,
            vehicleModel: c.vehicleModel ?? c.vehiclemodel ?? null,
            licensePlate: c.licensePlate ?? c.licenseplate ?? null,
            loyaltyPoints: c.loyaltyPoints ?? c.loyaltypoints ?? 0,
          }));
          setServerCustomers(mappedData);
        }
      } catch (err) {
        console.error("Error searching customers from server:", err);
      } finally {
        setIsSearchingServer(false);
      }
    };

    searchFromServer();
  }, [debouncedSearch]);

  // Merge customers từ react-query và server search (loại bỏ trùng lặp)
  const allCustomers = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return customers;
    }

    const customerMap = new Map<string, Customer>();
    customers.forEach((c) => customerMap.set(c.id, c));
    serverCustomers.forEach((c) => customerMap.set(c.id, c));
    return Array.from(customerMap.values());
  }, [customers, serverCustomers, debouncedSearch]);

  // STATE MỚI: Cho việc thêm Nhà cung cấp
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState<"customers" | "suppliers">(
    "customers"
  );
  const [activeFilter, setActiveFilter] = useState("all");
  const [viewHistoryCustomer, setViewHistoryCustomer] =
    useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showMaintenanceVehicles, setShowMaintenanceVehicles] = useState(false);

  // Fetch sales and work orders for history
  const { data: allSales = [] } = useSalesRepo();
  const { data: allWorkOrders = [] } = useWorkOrdersRepo();

  // Reset display count khi search hoặc filter thay đổi
  useEffect(() => {
    setDisplayCount(20);
  }, [search, activeFilter]);

  // Auto-open edit form if editCustomerId is in localStorage (from SalesManager)
  useEffect(() => {
    const editCustomerId = localStorage.getItem("editCustomerId");

    if (editCustomerId && customers.length > 0) {
      const customerToEdit = customers.find((c) => c.id === editCustomerId);

      if (customerToEdit) {
        setEditCustomer(customerToEdit);
        localStorage.removeItem("editCustomerId"); // Clear after using
      }
    }
  }, [customers]);

  // Check immediately when component mounts or becomes visible
  useEffect(() => {
    const checkAndOpenEdit = () => {
      const editCustomerId = localStorage.getItem("editCustomerId");

      if (editCustomerId && customers.length > 0) {
        const customerToEdit = customers.find((c) => c.id === editCustomerId);

        if (customerToEdit) {
          setTimeout(() => {
            setEditCustomer(customerToEdit);
            localStorage.removeItem("editCustomerId");
          }, 100);
        }
      }
    };

    // Check immediately
    checkAndOpenEdit();

    // Also check after a delay to handle race conditions
    const timer1 = setTimeout(checkAndOpenEdit, 300);
    const timer2 = setTimeout(checkAndOpenEdit, 800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [customers.length]);

  // Helper function to calculate actual stats for a customer (consistent with CustomerHistoryModal)
  const calculateCustomerStats = (customer: Customer) => {
    const customerSales = allSales.filter(
      (s) =>
        s.customer?.id === customer.id || s.customer?.phone === customer.phone
    );
    const customerWorkOrders = allWorkOrders.filter(
      (wo) => wo.customerPhone === customer.phone && wo.status !== "Đã hủy"
    );

    const totalFromSales = customerSales.reduce(
      (sum, s) => sum + (s.total || 0),
      0
    );
    const totalFromWorkOrders = customerWorkOrders.reduce(
      (sum, wo) => sum + (wo.total || 0),
      0
    );
    const totalSpent = totalFromSales + totalFromWorkOrders;

    // Calculate visit count from unique dates
    const allVisitDates = [
      ...customerSales.map((s) => new Date(s.date).toDateString()),
      ...customerWorkOrders.map((wo) =>
        new Date(wo.creationDate || wo.id).toDateString()
      ),
    ];
    const visitCount = new Set(allVisitDates).size;

    // Calculate last visit date (most recent transaction)
    const allTransactionDates = [
      ...customerSales.map((s) => new Date(s.date)),
      ...customerWorkOrders.map((wo) => new Date(wo.creationDate || wo.id)),
    ];
    const lastVisit =
      allTransactionDates.length > 0
        ? new Date(
            Math.max(...allTransactionDates.map((d) => d.getTime()))
          ).toISOString()
        : null;

    // Get latest km from most recent work order
    const sortedWorkOrders = [...customerWorkOrders].sort((a, b) => {
      const dateA = new Date(a.creationDate || a.id).getTime();
      const dateB = new Date(b.creationDate || b.id).getTime();
      return dateB - dateA;
    });
    const latestKm = sortedWorkOrders[0]?.currentKm || null;

    // 1 điểm = 10,000đ
    const loyaltyPoints = Math.floor(totalSpent / 10000);

    return { totalSpent, visitCount, loyaltyPoints, lastVisit, latestKm };
  };

  // Auto-classify customers on mount only
  useEffect(() => {
    customers.forEach((customer) => {
      if (!customer.segment) {
        const newSegment = classifyCustomer(customer);
        // Cập nhật segment lên Supabase
        updateCustomer.mutate({
          id: customer.id,
          updates: { segment: newSegment },
        });
      }
    });
  }, [customers.length]);

  // Tính segment ĐỘNG từ giao dịch thực tế (không dùng giá trị lưu trong DB vì chưa được cập nhật)
  const liveSegmentMap = useMemo(() => {
    // Index sales theo customer id và phone để tra cứu O(1)
    const salesById = new Map<string, typeof allSales>();
    const salesByPhone = new Map<string, typeof allSales>();
    allSales.forEach((s) => {
      if (s.customer?.id) {
        if (!salesById.has(s.customer.id)) salesById.set(s.customer.id, []);
        salesById.get(s.customer.id)!.push(s);
      }
      if (s.customer?.phone) {
        if (!salesByPhone.has(s.customer.phone)) salesByPhone.set(s.customer.phone, []);
        salesByPhone.get(s.customer.phone)!.push(s);
      }
    });
    // Index work orders theo phone
    const woByPhone = new Map<string, typeof allWorkOrders>();
    allWorkOrders.forEach((wo) => {
      if (wo.customerPhone && wo.status !== "Đã hủy") {
        if (!woByPhone.has(wo.customerPhone)) woByPhone.set(wo.customerPhone, []);
        woByPhone.get(wo.customerPhone)!.push(wo);
      }
    });

    const map = new Map<string, Customer["segment"]>();
    customers.forEach((customer) => {
      // Gộp sales theo id + phone, loại trùng
      const seen = new Set<string>();
      const cSales = [
        ...(customer.id ? salesById.get(customer.id) || [] : []),
        ...(customer.phone ? salesByPhone.get(customer.phone) || [] : []),
      ].filter((s) => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
      const cWOs = customer.phone ? woByPhone.get(customer.phone) || [] : [];

      const totalSpent =
        cSales.reduce((sum, s) => sum + (s.total || 0), 0) +
        cWOs.reduce((sum, wo) => sum + (wo.total || 0), 0);

      const visitCount = new Set([
        ...cSales.map((s) => new Date(s.date).toDateString()),
        ...cWOs.map((wo) => new Date(wo.creationDate || wo.id).toDateString()),
      ]).size;

      const allDates = [
        ...cSales.map((s) => new Date(s.date).getTime()),
        ...cWOs.map((wo) => new Date(wo.creationDate || wo.id).getTime()),
      ];
      const lastVisit = allDates.length > 0
        ? new Date(Math.max(...allDates)).toISOString()
        : null;

      const loyaltyPoints = Math.floor(totalSpent / 10000);
      map.set(customer.id, classifyCustomer({ ...customer, totalSpent, visitCount, loyaltyPoints, lastVisit: lastVisit ?? undefined }));
    });
    return map;
     
  }, [customers, allSales, allWorkOrders]);

  const customerSearchIndex = useMemo(() => {
    const map = new Map<
      string,
      {
        text: string;
        phoneDigits: string;
        plateCompacts: string[];
      }
    >();

    allCustomers.forEach((c) => {
      const vehicles = (c.vehicles || []) as Array<{
        licensePlate?: string;
        model?: string;
      }>;
      const plates = [c.licensePlate || "", ...vehicles.map((v) => v.licensePlate || "")]
        .map((p) => p.trim())
        .filter(Boolean);
      const models = [c.vehicleModel || "", ...vehicles.map((v) => v.model || "")]
        .map((m) => m.trim())
        .filter(Boolean);

      const text = normalizeSearchText(
        [c.name || "", c.email || "", ...models, ...plates].join(" ")
      );
      const phoneDigits = (c.phone || "").replace(/\D/g, "");
      const plateCompacts = plates.map((p) => normalizePlate(p)).filter(Boolean);

      map.set(c.id, { text, phoneDigits, plateCompacts });
    });

    return map;
  }, [allCustomers]);

  const filtered = useMemo(() => {
    const searchTerm = search.trim();
    if (!searchTerm) {
      let result = allCustomers;
      if (activeFilter !== "all") {
        const segmentMap: Record<string, string> = {
          vip: "VIP",
          loyal: "Loyal",
          potential: "Potential",
          "at-risk": "At Risk",
          lost: "Lost",
          new: "New",
        };
        const targetSegment = segmentMap[activeFilter];
        result = result.filter((c) => liveSegmentMap.get(c.id) === targetSegment);
      }
      return result;
    }

    // Normalize search text (bỏ dấu tiếng Việt)
    const q = normalizeSearchText(searchTerm);
    const tokens = q.split(/\s+/).filter(Boolean);
    const searchDigits = searchTerm.replace(/\D/g, "");
    const searchPlate = normalizePlate(searchTerm);

    let result = allCustomers.filter((c) => {
      const index = customerSearchIndex.get(c.id);
      if (!index) return false;

      if (searchDigits.length > 0 && index.phoneDigits) {
        if (
          index.phoneDigits.includes(searchDigits) ||
          searchDigits.includes(index.phoneDigits)
        ) {
          return true;
        }
      }

      if (searchPlate.length > 0 && index.plateCompacts.length > 0) {
        const plateMatched = index.plateCompacts.some(
          (p) => p.includes(searchPlate) || searchPlate.includes(p)
        );
        if (plateMatched) return true;
      }

      if (tokens.length === 0) return true;
      return tokens.every((t) => index.text.includes(t));
    });

    if (activeFilter !== "all") {
      const segmentMap: Record<string, string> = {
        vip: "VIP",
        loyal: "Loyal",
        potential: "Potential",
        "at-risk": "At Risk",
        lost: "Lost",
        new: "New",
      };
      const targetSegment = segmentMap[activeFilter];
      result = result.filter((c) => liveSegmentMap.get(c.id) === targetSegment);
    }

    return result;
  }, [allCustomers, search, activeFilter, liveSegmentMap, customerSearchIndex]);

  const displayedCustomers = useMemo(
    () => filtered.slice(0, displayCount),
    [filtered, displayCount]
  );

  // Cache customer stats calculation for performance
  const customerStatsMap = useMemo(() => {
    const map = new Map();
    displayedCustomers.forEach((customer) => {
      map.set(customer.id, calculateCustomerStats(customer));
    });
    return map;
     
  }, [displayedCustomers, allSales, allWorkOrders]);

  const handleDelete = async (id: string) => {
    if (
      !confirm("Xác nhận xoá khách hàng này? Hành động này không thể hoàn tác.")
    )
      return;
    try {
      // Xóa khách hàng thực sự từ Supabase
      await deleteCustomer.mutateAsync(id);
      showToast.success("Đã xóa khách hàng thành công");
      refetch();
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      showToast.error(
        "Không thể xóa khách hàng: " + (error.message || "Lỗi không xác định")
      );
    }
  };

  // Statistics calculations — dùng liveSegmentMap để đếm chính xác
  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.status === "active").length;
    let vip = 0, loyal = 0, potential = 0, atRisk = 0, lost = 0, newSeg = 0;
    customers.forEach((c) => {
      const seg = liveSegmentMap.get(c.id);
      if (seg === "VIP") vip++;
      else if (seg === "Loyal") loyal++;
      else if (seg === "Potential") potential++;
      else if (seg === "At Risk") atRisk++;
      else if (seg === "Lost") lost++;
      else newSeg++;
    });
    return {
      total,
      active,
      newThisMonth: customers.filter((c) => {
        if (!c.created_at) return false;
        const date = new Date(c.created_at);
        const now = new Date();
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      }).length,
      revenue: 0,
      vip, loyal, potential, atRisk, lost,
      new: newSeg,
    };
  }, [customers, liveSegmentMap]);

  // Vehicles needing maintenance for customer care team
  const vehiclesNeedingMaintenance = useMemo(() => {
    return getVehiclesNeedingMaintenance(customers);
  }, [customers]);

  const filterOptions = useMemo(
    () => [
      {
        id: "all",
        label: "Tất cả",
        hint: "Toàn bộ danh sách",
        count: stats.total,
        icon: "🌐",
        activeClasses:
          "border-slate-300 bg-slate-100/80 text-slate-900 shadow-sm",
      },
      {
        id: "vip",
        label: "VIP",
        hint: "≥ 5.000 điểm",
        count: stats.vip,
        icon: "👑",
        activeClasses:
          "border-purple-200 bg-purple-50 text-purple-700 shadow-sm",
      },
      {
        id: "loyal",
        label: "Trung thành",
        hint: "10+ lượt",
        count: stats.loyal,
        icon: "💎",
        activeClasses: "border-blue-200 bg-blue-50 text-blue-700 shadow-sm",
      },
      {
        id: "potential",
        label: "Tiềm năng",
        hint: "2-9 lượt",
        count: stats.potential,
        icon: "⭐",
        activeClasses: "border-green-200 bg-green-50 text-green-700 shadow-sm",
      },
      {
        id: "at-risk",
        label: "Cần chăm sóc",
        hint: ">90 ngày chưa đến",
        count: stats.atRisk,
        icon: "⚠️",
        activeClasses:
          "border-orange-200 bg-orange-50 text-orange-700 shadow-sm",
      },
      {
        id: "lost",
        label: "Đã mất",
        hint: "Không quay lại",
        count: stats.lost,
        icon: "❌",
        activeClasses: "border-red-200 bg-red-50 text-red-700 shadow-sm",
      },
      {
        id: "new",
        label: "Khách mới",
        hint: "Tháng này",
        count: stats.new,
        icon: "🆕",
        activeClasses: "border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm",
      },
    ],
    [stats]
  );

  const overviewCards = useMemo(
    () => [
      {
        id: "total",
        title: "Tổng KH",
        value: stats.total.toLocaleString(),
        subLabel: `${stats.active} hoạt động`,
        gradient:
          "from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20",
        border: "border-blue-200 dark:border-blue-800",
        labelClass: "text-blue-700 dark:text-blue-300",
        valueClass: "text-blue-900 dark:text-blue-100",
      },
      {
        id: "new",
        title: "Khách mới",
        value: stats.newThisMonth.toLocaleString(),
        subLabel: "↑ 0% tháng này",
        gradient:
          "from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-800/20",
        border: "border-green-200 dark:border-green-800",
        labelClass: "text-green-700 dark:text-green-300",
        valueClass: "text-green-900 dark:text-green-100",
      },
      {
        id: "avg",
        title: "DT TB",
        value: "0 đ",
        subLabel: "/ khách hàng",
        gradient:
          "from-purple-50 to-violet-100 dark:from-purple-900/30 dark:to-violet-800/20",
        border: "border-purple-200 dark:border-purple-800",
        labelClass: "text-purple-700 dark:text-purple-300",
        valueClass: "text-purple-900 dark:text-purple-100",
      },
      {
        id: "atRisk",
        title: "Cần CS",
        value: stats.atRisk.toLocaleString(),
        subLabel: "0đ tiềm năng",
        gradient:
          "from-orange-50 to-amber-100 dark:from-orange-900/30 dark:to-amber-800/20",
        border: "border-orange-200 dark:border-orange-800",
        labelClass: "text-orange-700 dark:text-orange-300",
        valueClass: "text-orange-900 dark:text-orange-100",
      },
    ],
    [stats]
  );

  const segmentStyles: Record<
    string,
    {
      label: string;
      badgeClass: string;
      avatarClass: string;
      icon: string;
    }
  > = {
    VIP: {
      label: "VIP",
      badgeClass:
        "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700",
      avatarClass: "bg-purple-50 text-purple-700 dark:bg-purple-900/40",
      icon: "👑",
    },
    Loyal: {
      label: "Trung thành",
      badgeClass:
        "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700",
      avatarClass: "bg-blue-50 text-blue-700 dark:bg-blue-900/40",
      icon: "💎",
    },
    Potential: {
      label: "Tiềm năng",
      badgeClass:
        "bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700",
      avatarClass: "bg-green-50 text-green-700 dark:bg-green-900/40",
      icon: "⭐",
    },
    "At Risk": {
      label: "Cần chăm sóc",
      badgeClass:
        "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-700",
      avatarClass: "bg-orange-50 text-orange-700 dark:bg-orange-900/40",
      icon: "⚠️",
    },
    Lost: {
      label: "Đã mất",
      badgeClass:
        "bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700",
      avatarClass: "bg-red-50 text-red-600 dark:bg-red-900/40",
      icon: "❌",
    },
    New: {
      label: "Khách mới",
      badgeClass:
        "bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-200 dark:border-cyan-700",
      avatarClass: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/40",
      icon: "🆕",
    },
    default: {
      label: "Khách hàng",
      badgeClass:
        "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600",
      avatarClass: "bg-slate-100 text-slate-600 dark:bg-slate-800",
      icon: "👤",
    },
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Tabs Header - Fixed */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-none z-20 shadow-sm">
        <div className="flex items-center px-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("customers")}
            className={`flex items-center gap-1.5 px-3 py-2 md:py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === "customers"
              ? "border-blue-500 text-slate-900 dark:text-white"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
          >
            <UsersIcon className="w-4 h-4" />
            <span>Khách hàng ({stats.total})</span>
          </button>
          <button
            onClick={() => setActiveTab("suppliers")}
            className={`flex items-center gap-1.5 px-3 py-2 md:py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === "suppliers"
              ? "border-blue-500 text-slate-900 dark:text-white"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <span>Nhà cung cấp ({suppliers?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* Main Scrollable Area */}
      {activeTab === "customers" ? (
        <div 
          className="flex-1 overflow-y-auto p-4 custom-scrollbar relative flex flex-col gap-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* 1. TOP KPI & MAINTENANCE ALERTS */}
          <div className="flex flex-col lg:flex-row gap-4 mb-2">
            {/* Left: KPIs */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
              {overviewCards.map((card) => (
                <div
                  key={card.id}
                  className={`rounded-xl p-4 border ${card.gradient} ${card.border} flex flex-col justify-center`}
                >
                  <span className={`text-xs font-semibold uppercase mb-1 ${card.labelClass}`}>
                    {card.title}
                  </span>
                  <span className={`text-2xl font-black ${card.valueClass}`}>
                    {card.value}
                  </span>
                  {card.subLabel && (
                    <span className="text-[10px] md:text-xs mt-0.5 text-slate-600 dark:text-slate-300">
                      {card.subLabel}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Right: Maintenance Alerts (Compact) */}
            {vehiclesNeedingMaintenance.length > 0 && (
              <div className="lg:w-1/3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 flex flex-col justify-center gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <h3 className="font-bold text-orange-800 dark:text-orange-400">
                    Cần bảo dưỡng ({vehiclesNeedingMaintenance.length})
                  </h3>
                </div>
                <button
                  onClick={() => setShowMaintenanceVehicles(!showMaintenanceVehicles)}
                  className="text-sm text-center bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-700 text-orange-600 dark:text-orange-400 rounded-lg py-1.5 font-medium hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors w-full shadow-sm"
                >
                  {showMaintenanceVehicles ? "Ẩn danh sách" : "Xem danh sách xe"}
                </button>
              </div>
            )}
          </div>

          {/* Maintenance Vehicles List (Expandable) */}
          {showMaintenanceVehicles && vehiclesNeedingMaintenance.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-orange-200 dark:border-orange-800 p-4 -mt-2">
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:snap-none">
                {vehiclesNeedingMaintenance.slice(0, 9).map((item, index) => {
                  if (!item.customer) return null;
                  return (
                    <div
                      key={`${item.customer.id}-${item.vehicle.licensePlate}-${index}`}
                      className="snap-start min-w-[280px] md:min-w-0 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm">
                            {item.customer.name || "Khách hàng"}
                          </p>
                          <a
                            href={`tel:${item.customer.phone}`}
                            className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {item.customer.phone}
                          </a>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg">
                            <Bike className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                              {item.vehicle.licensePlate}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                        Số km hiện tại:{" "}
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {(item.vehicle.currentKm || 0).toLocaleString()} km
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {item.warnings.map((warning, wIdx) => {
                          const IconComponent =
                            warning.type === "oilChange"
                              ? Droplets
                              : warning.type === "gearboxOil"
                                ? Cog
                                : Wind;
                          return (
                            <div
                              key={wIdx}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] ${warning.isOverdue
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                }`}
                            >
                              <IconComponent className="w-3.5 h-3.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="font-medium">
                                  {warning.name}
                                </span>
                                <span className="ml-1">
                                  {warning.isOverdue
                                    ? `(quá ${Math.abs(
                                      warning.kmUntilDue
                                    ).toLocaleString()} km)`
                                    : `(còn ${warning.kmUntilDue.toLocaleString()} km)`}
                                </span>
                              </div>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${warning.isOverdue
                                    ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-100"
                                    : "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-100"
                                  }`}
                              >
                                {warning.isOverdue ? "QUÁ HẠN" : "SẮP ĐẾN"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {vehiclesNeedingMaintenance.length > 9 && (
                <p className="text-center text-xs text-orange-600 dark:text-orange-400 mt-2 font-medium">
                  Và {vehiclesNeedingMaintenance.length - 9} xe khác cần bảo
                  dưỡng...
                </p>
              )}
            </div>
          )}

          {/* 2. STICKY TOOLBAR (Search & Pill Filters) */}
          <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 pt-2 pb-3 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <svg
                  className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Tìm theo tên, SĐT, biển số..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
                />
                {isSearchingServer && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowImport(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors whitespace-nowrap shadow-sm text-sm"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span className="hidden sm:inline">Tải lên DS</span>
                </button>
                <div className="hidden sm:inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold dark:border-slate-600 dark:bg-slate-900/40">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`flex items-center justify-center gap-1 rounded-md px-2 py-1.5 transition-colors ${viewMode === "grid"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex items-center justify-center gap-1 rounded-md px-2 py-1.5 transition-colors ${viewMode === "list"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => setEditCustomer({} as Customer)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap shadow-sm text-sm"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Thêm KH</span>
                </button>
              </div>
            </div>

            {/* Segmented Pill Filters */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
              {filterOptions.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeFilter === filter.id
                      ? "bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{filter.icon}</span>
                  <span>{filter.label}</span>
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                      activeFilter === filter.id
                        ? "bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Customer Cards Grid */}
          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
              <div className="flex justify-center mb-4">
                <svg
                  className="w-16 h-16 text-slate-300 dark:text-slate-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-lg">
                Không tìm thấy khách hàng nào.
              </p>
            </div>
          ) : (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {displayedCustomers.map((customer) => {
                    const liveSegment = liveSegmentMap.get(customer.id);
                    const config =
                      (liveSegment && segmentStyles[liveSegment]) ||
                      segmentStyles.default;
                    // Use cached stats for performance (consistent with CustomerHistoryModal)
                    const {
                      totalSpent,
                      visitCount,
                      loyaltyPoints: points,
                      lastVisit,
                      latestKm,
                    } = customerStatsMap.get(customer.id) || {
                      totalSpent: 0,
                      visitCount: 0,
                      loyaltyPoints: 0,
                      lastVisit: null,
                      latestKm: null,
                    };
                    const pointsPercent = Math.min((points / 10000) * 100, 100);
                    const vehicles =
                      (customer.vehicles as Vehicle[] | undefined) || [];
                    const hasExtraVehicles = vehicles.length > 2;

                    return (
                      <div
                        key={customer.id}
                        className="group relative bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 overflow-hidden flex flex-col"
                      >
                        {/* Card Header - Clickable for fast editing on mobile */}
                        <div 
                          onClick={() => setEditCustomer(customer)}
                          className="p-5 flex items-start justify-between gap-3 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div
                              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-inner ${config.avatarClass}`}
                            >
                              {config.icon}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 transition-colors">
                                {customer.name || "Chưa đặt tên"}
                              </h3>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                <a
                                  href={`tel:${customer.phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span className="font-bold">{customer.phone || "N/A"}</span>
                                </a>
                                {lastVisit && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(lastVisit)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${config.badgeClass}`}
                          >
                            {config.label}
                          </span>
                        </div>

                        {/* Vehicles Section */}
                        <div className="px-5 pb-4">
                          <div className="flex flex-wrap gap-2">
                            {vehicles.length > 0 ? (
                              <>
                                {vehicles.slice(0, 2).map((vehicle) => (
                                  <div
                                    key={vehicle.id}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200"
                                  >
                                    <Bike className={`w-3.5 h-3.5 ${vehicle.isPrimary ? "text-amber-500" : "text-blue-500"}`} />
                                    <span>{vehicle.model || "Không rõ"}</span>
                                    {vehicle.licensePlate && (
                                      <span className="text-[10px] text-slate-400 font-medium">
                                        • {vehicle.licensePlate}
                                      </span>
                                    )}
                                  </div>
                                ))}
                                {hasExtraVehicles && (
                                  <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 text-[10px] font-black text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                                    +{vehicles.length - 2} XE KHÁC
                                  </div>
                                )}
                              </>
                            ) : customer.vehicleModel ? (
                              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                                <Bike className="h-3.5 w-3.5 text-blue-500" />
                                <span>
                                  {customer.vehicleModel}
                                  {customer.licensePlate
                                    ? ` • ${customer.licensePlate}`
                                    : ""}
                                </span>
                              </div>
                            ) : (
                              <div className="text-[10px] font-bold text-slate-400 italic">Chưa cập nhật thông tin xe</div>
                            )}
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="px-5 pb-5 grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-3 border border-slate-100 dark:border-slate-700/50">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tổng chi tiêu</div>
                            <div className="text-base font-black text-slate-900 dark:text-slate-100">{formatCurrency(totalSpent)}</div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-3 border border-slate-100 dark:border-slate-700/50">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Số lần đến</div>
                            <div className="text-base font-black text-slate-900 dark:text-slate-100">{visitCount} lần</div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-3 border border-slate-100 dark:border-slate-700/50">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Km hiện tại</div>
                            <div className="text-base font-black text-blue-600 dark:text-blue-400">
                              {latestKm ? `${latestKm.toLocaleString()} km` : "—"}
                            </div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-3 border border-slate-100 dark:border-slate-700/50">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Điểm tích lũy</div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-base font-black text-amber-500">⭐ {points.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Loyalty Progress */}
                        <div className="px-5 pb-5">
                          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                              style={{ width: `${pointsPercent}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-auto bg-slate-50/50 dark:bg-slate-900/20 p-4 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700/50">
                          <button
                            onClick={() => setViewHistoryCustomer(customer)}
                            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                          >
                            <History className="w-4 h-4 text-blue-500" />
                            LỊCH SỬ
                          </button>
                          <button
                            onClick={() => setEditCustomer(customer)}
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-95 shadow-sm"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 custom-scrollbar">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50/50 text-left text-[11px] font-black uppercase tracking-widest text-slate-400 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700/50">
                      <tr>
                        <th className="px-6 py-4">Khách hàng</th>
                        <th className="px-6 py-4">Liên hệ</th>
                        <th className="px-6 py-4">Phương tiện</th>
                        <th className="px-6 py-4">Tổng chi tiêu</th>
                        <th className="px-6 py-4">Lần đến</th>
                        <th className="px-6 py-4">Lần cuối</th>
                        <th className="px-6 py-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {displayedCustomers.map((customer) => {
                        const config =
                          (liveSegmentMap.get(customer.id) &&
                            segmentStyles[liveSegmentMap.get(customer.id)!]) ||
                          segmentStyles.default;
                        const vehicles =
                          (customer.vehicles as Vehicle[] | undefined) || [];
                        const primaryVehicle =
                          vehicles.find((v) => v.isPrimary) || vehicles[0];
                        const vehicleLabel = primaryVehicle
                          ? `${primaryVehicle.model || "Không rõ"}${primaryVehicle.licensePlate
                            ? ` • ${primaryVehicle.licensePlate}`
                            : ""
                          }`
                          : customer.vehicleModel
                            ? `${customer.vehicleModel}${customer.licensePlate
                              ? ` • ${customer.licensePlate}`
                              : ""
                            }`
                            : "—";

                        const stats = customerStatsMap.get(customer.id);

                        return (
                          <tr
                            key={customer.id}
                            className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm ${config.avatarClass}`}>
                                  {config.icon}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                                    {customer.name || "Chưa đặt tên"}
                                  </div>
                                  <span
                                    className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase border ${config.badgeClass}`}
                                  >
                                    {config.label}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <a
                                  href={`tel:${customer.phone}`}
                                  className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {customer.phone || "—"}
                                </a>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                  {(stats?.loyaltyPoints || 0).toLocaleString()} điểm
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                                <Bike className="w-4 h-4 text-blue-500" />
                                {vehicleLabel}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-black text-slate-900 dark:text-slate-100">
                                {formatCurrency(stats?.totalSpent || 0)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">
                                {stats?.visitCount || 0} lần
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                                <Calendar className="w-3.5 h-3.5" />
                                {stats?.lastVisit ? formatDate(stats.lastVisit) : "—"}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setViewHistoryCustomer(customer)}
                                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-all active:scale-90"
                                  title="Xem lịch sử"
                                >
                                  <History className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditCustomer(customer)}
                                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all active:scale-90"
                                  title="Chỉnh sửa"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(customer.id)}
                                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-90"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {displayCount < filtered.length && (
                <div className="flex justify-center pb-4 pt-8">
                  <button
                    onClick={() => setDisplayCount((prev) => prev + 20)}
                    className="group flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-blue-500 hover:text-blue-600 hover:shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <span>
                      Hiển thị thêm{" "}
                      {Math.min(20, filtered.length - displayCount)} khách hàng
                    </span>
                    <svg
                      className="h-4 w-4 transition-transform group-hover:translate-y-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Floating Add Button for mobile */}
          <button
            onClick={() => setEditCustomer({} as Customer)}
            className="md:hidden fixed bottom-28 right-5 z-40 inline-flex items-center justify-center rounded-full bg-white dark:bg-slate-800 p-4 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-lg transition hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <PlusIcon className="h-6 w-6" />
            <span className="sr-only">Thêm khách hàng</span>
          </button>

          {/* Mobile action sheet */}
          {showActionSheet && (
            <div className="md:hidden fixed inset-0 z-30">
              <button
                onClick={() => setShowActionSheet(false)}
                className="absolute inset-0 bg-black/40"
                aria-label="Đóng"
              ></button>
              <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-slate-800">
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-600" />
                <h3 className="mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Tác vụ nhanh
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShowActionSheet(false);
                      setShowImport(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-blue-500 dark:border-slate-700 dark:bg-slate-700/40 dark:text-slate-200"
                  >
                    <svg
                      className="h-5 w-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    Upload danh sách
                  </button>
                  <button
                    onClick={() => {
                      setShowActionSheet(false);
                      alert("Tính năng đang phát triển");
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-blue-500 dark:border-slate-700 dark:bg-slate-700/40 dark:text-slate-200"
                  >
                    <svg
                      className="h-5 w-5 text-orange-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    Nhắc bảo dưỡng
                  </button>
                  <button
                    onClick={() => {
                      setShowActionSheet(false);
                      setEditCustomer({} as Customer);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <PlusIcon className="h-5 w-5" /> Thêm khách hàng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          {/* Suppliers Tab Content */}
          <SuppliersList
            suppliers={suppliers}
            isLoading={suppliersLoading}
            onAdd={() => setShowSupplierModal(true)}
            onImport={() => setShowImport(true)}
            onDelete={(id) => deleteSupplierMutation.mutate({ id })}
          />
        </div>
      )}

      {/* Modals */}
      <CustomerHistoryModal
        isOpen={!!viewHistoryCustomer}
        onClose={() => setViewHistoryCustomer(null)}
        customer={viewHistoryCustomer}
        sales={allSales}
        workOrders={allWorkOrders}
      />

      {editCustomer && (
        <CustomerModal
          customer={editCustomer}
          onSave={handleSaveCustomer}
          onClose={() => setEditCustomer(null)}
        />
      )}

      {showSupplierModal && (
        <SupplierModal onClose={() => setShowSupplierModal(false)} />
      )}

      {showImport && (
        <ImportCSVModal onClose={() => setShowImport(false)} type={activeTab} />
      )}
    </div>
  );
};

export default CustomerManager;
