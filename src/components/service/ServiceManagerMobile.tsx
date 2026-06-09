import React, { useState, useMemo, useCallback } from "react";
import {
  FileText,
  Wrench,
  Check,
  Key,
  TrendingUp,
  DollarSign,
  Search,
  Plus,
  Phone,
  Edit2,
  Trash2,
  Printer,
  History,
  ClipboardList,
  Package,
  Eye,
  EyeOff,
  User,
  X,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Coins,
} from "lucide-react";
import type { WorkOrder } from "../../types";
import {
  formatCurrency,
  formatDate,
  formatWorkOrderId,
  formatShortWorkOrderId,
} from "../../utils/format";
import { useAuth } from "../../contexts/AuthContext";
import { canDo } from "../../utils/permissions";
import { ServiceHistory } from "./ServiceHistory";
import { useRepairTemplates, type RepairTemplate } from "../../hooks/useRepairTemplatesRepository";
import { PullToRefresh } from "../common/PullToRefresh";
import Skeleton from "../common/Skeleton";
import { triggerHaptic } from "../../utils/haptics";
import {
  calculateMobileServiceKpis,
  filterMobileWorkOrdersByDate,
  type MobileDateFilter,
} from "./utils";

const normalizePlateSearch = (value?: string | null) =>
  (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Modern sleek inline SVG Motorcycle Icon matching Lucide style
const MotorcycleIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Rear Wheel */}
    <circle cx="5" cy="18" r="3" />
    {/* Front Wheel */}
    <circle cx="19" cy="18" r="3" />
    {/* Frame and structures */}
    <path d="M12 18V13H7" />
    <path d="M7 18L10 11H15L17 18" />
    {/* Fork and handlebar */}
    <path d="M19 18L15 9" />
    <path d="M15 9L13 6h-2" />
    {/* Seat */}
    <path d="M7 11c0-1.5 1-2.5 2.5-2.5h3c.8 0 1.5.5 1.5 1.5v0" />
  </svg>
);

// Helper to generate dynamic colors based on name hash
const getAvatarColor = (name: string) => {
  const colors = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#ef4444', // Red
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Helper to get name initials (e.g. Nguyễn Văn An -> NA)
const getInitials = (name: string) => {
  if (!name) return 'K';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

interface ServiceManagerMobileProps {
  workOrders: WorkOrder[];
  onCreateWorkOrder: () => void;
  onEditWorkOrder: (workOrder: WorkOrder) => void | Promise<void>;
  onDeleteWorkOrder: (workOrder: WorkOrder) => void;
  onCallCustomer: (phone: string) => void;
  onPrintWorkOrder: (workOrder: WorkOrder) => void;
  onOpenTemplates: () => void;
  onApplyTemplate: (template: RepairTemplate) => void;
  currentBranchId: string;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  setDateRangeDays: (days: number) => void;
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
}

type StatusFilter =
  | "all"
  | "Tiếp nhận"
  | "Đang sửa"
  | "Đã sửa xong"
  | "Trả máy";

// Memoized WorkOrder Card Component
const WorkOrderCard = React.memo(({
  workOrder,
  onEdit,
  onCall,
  onPrint,
  onDelete,
  canDelete,
  canViewFinancials = false,
  showFinancials = false
}: {
  workOrder: WorkOrder;
  onEdit: (wo: WorkOrder) => void;
  onCall: (phone: string) => void;
  onPrint: (wo: WorkOrder) => void;
  onDelete: (wo: WorkOrder) => void;
  canDelete: boolean;
  canViewFinancials?: boolean;
  showFinancials?: boolean;
}) => {
  const avatarColor = getAvatarColor(workOrder.customerName);
  const initials = getInitials(workOrder.customerName);

  // Get status color matching design
  const getStatusColors = (status: string) => {
    switch (status) {
      case "Tiếp nhận":
        return { text: "text-[#009ef7]", bg: "bg-[#009ef7]/10", border: "border-[#009ef7]/20", dot: "bg-[#009ef7]" };
      case "Đang sửa":
        return { text: "text-[#f1416c]", bg: "bg-[#f1416c]/10", border: "border-[#f1416c]/20", dot: "bg-[#f1416c]" };
      case "Đã sửa xong":
        return { text: "text-[#50cd89]", bg: "bg-[#50cd89]/10", border: "border-[#50cd89]/20", dot: "bg-[#50cd89]" };
      case "Trả máy":
        return { text: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20", dot: "bg-purple-500" };
      default:
        return { text: "text-gray-500", bg: "bg-gray-500/10", border: "border-gray-500/20", dot: "bg-gray-500" };
    }
  };
  const statusColors = getStatusColors(workOrder.status);

  return (
    <div
      onClick={() => onEdit(workOrder)}
      className="bg-white dark:bg-[#1e1e2d] rounded-xl border border-slate-200 dark:border-gray-800/80 overflow-hidden active:scale-[0.99] transition-all hover:border-slate-300 dark:hover:border-gray-700 shadow-sm hover:shadow-md cursor-pointer duration-200"
    >
      {/* Card Content */}
      <div className="p-3">
        {/* Header - Avatar + Customer Info & Code Badge + Date */}
        <div className="flex items-center gap-2.5 mb-2">
          {/* Avatar Column */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
          
          {/* Customer & Vehicle Info Column */}
          <div className="flex-1 min-w-0">
            <h4 className="text-slate-900 dark:text-white font-bold text-sm leading-tight truncate">
              {workOrder.customerName}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5 text-slate-500 dark:text-gray-400">
              <MotorcycleIcon className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500 shrink-0" />
              <span className="text-[11px] font-medium truncate">
                {workOrder.vehicleModel || "Xe máy"}
              </span>
              {workOrder.licensePlate && (
                <span className="text-[9px] font-mono bg-slate-100 dark:bg-gray-800 px-1 py-0.2 rounded text-slate-600 dark:text-gray-300">
                  {workOrder.licensePlate}
                </span>
              )}
            </div>
          </div>
          
          {/* Code Badge column */}
          <div className="flex flex-col items-end shrink-0 gap-0.5">
            <span
              className="text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 px-1.5 py-0.5 rounded"
              title={formatWorkOrderId(workOrder.id)}
            >
              {formatShortWorkOrderId(workOrder.id).short}
            </span>
            <span className="text-[9px] text-slate-400 dark:text-gray-500 font-medium">
              {formatDate(workOrder.creationDate)}
            </span>
          </div>
        </div>

        {/* Issue Description enclosed in beautiful accent box */}
        {workOrder.issueDescription && (
          <div className={`text-xs pl-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/10 rounded-r-md border-l-2 mb-2 flex items-start gap-1.5 ${
            workOrder.status === 'Tiếp nhận' ? 'border-[#009ef7]' :
            workOrder.status === 'Đang sửa' ? 'border-[#f1416c]' :
            workOrder.status === 'Đã sửa xong' ? 'border-[#50cd89]' :
            workOrder.status === 'Trả máy' ? 'border-purple-500' : 'border-gray-400'
          }`}>
            <span className="text-slate-400 dark:text-gray-500 mt-0.5">🔧</span>
            <span className="text-slate-600 dark:text-gray-400 leading-relaxed truncate flex-1 font-medium">
              {workOrder.issueDescription}
            </span>
          </div>
        )}

        {/* Info & Footer row: KTV, Payment status and Total price */}
        <div className="pt-2 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] flex-1 min-w-0">
            <span className="text-slate-400 dark:text-gray-500 shrink-0">KTV:</span>
            <span className="text-slate-600 dark:text-gray-300 font-semibold truncate max-w-[100px]">
              {workOrder.technicianName || "Chưa phân"}
            </span>
            
            {/* Payment badge styled as pills */}
            {workOrder.paymentStatus === "paid" && workOrder.remainingAmount === 0 && (
              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 font-bold rounded text-[9px] shrink-0">
                ✓ Đủ
              </span>
            )}
            {((workOrder.depositAmount && workOrder.depositAmount > 0) || workOrder.paymentStatus === "partial") && (workOrder.remainingAmount ?? 0) > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 dark:text-amber-400 font-bold rounded text-[9px] shrink-0">
                Nợ {formatCurrency(workOrder.remainingAmount || 0)}
              </span>
            )}
            {workOrder.paymentStatus === "unpaid" && (!workOrder.depositAmount || workOrder.depositAmount === 0) && (
              <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 dark:text-red-400 font-bold rounded text-[9px] shrink-0">
                Chưa TT
              </span>
            )}
          </div>
          
          <div className="flex flex-col items-end shrink-0">
            <div className={`font-black text-sm ${
              workOrder.paymentStatus === "paid" ? "text-emerald-500" :
              (workOrder.depositAmount && workOrder.depositAmount > 0) || workOrder.paymentStatus === "partial" ? "text-amber-500" : "text-red-500"
            }`}>
              {formatCurrency(workOrder.total || 0)}
            </div>
            {canViewFinancials && showFinancials && (() => {
              const partsCost = workOrder.partsUsed?.reduce((sum, p) => sum + ((p.costPrice || 0) * p.quantity), 0) || 0;
              const servicesCost = workOrder.additionalServices?.reduce((sum, s) => sum + ((s.costPrice || 0) * (s.quantity || 1)), 0) || 0;
              const totalCost = partsCost + servicesCost;
              const profit = (workOrder.total || 0) - totalCost;

              return (
                <div className={`text-[9px] font-bold mt-0.5 ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  Lãi: {formatCurrency(profit)}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Action Row - Beautiful Native Circular Buttons & Status Badge */}
      <div className="px-3 py-2 bg-slate-50/50 dark:bg-slate-800/15 border-t border-slate-100 dark:border-gray-800/60 flex justify-between items-center">
        {/* Left Status Badge */}
        <div 
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`} />
          {workOrder.status}
        </div>
        
        {/* Right Circle Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCall(workOrder.customerPhone || "");
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 transition-colors border border-blue-100 dark:border-blue-900/30 shadow-sm"
            aria-label="Gọi"
          >
            <Phone className="w-4 h-4" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrint(workOrder);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-500 dark:text-gray-400 transition-colors border border-slate-200 dark:border-gray-700 shadow-sm"
            aria-label="In"
          >
            <Printer className="w-4 h-4" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(workOrder);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-[#009ef7]/10 hover:bg-[#009ef7]/20 text-[#009ef7] transition-colors border border-[#009ef7]/20 shadow-sm"
            aria-label="Sửa"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(workOrder);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f1416c]/10 hover:bg-[#f1416c]/20 text-[#f1416c] transition-colors border border-[#f1416c]/20 shadow-sm"
              aria-label="Xóa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export function ServiceManagerMobile({
  workOrders,
  onCreateWorkOrder,
  onEditWorkOrder,
  onDeleteWorkOrder,
  onCallCustomer,
  onPrintWorkOrder,
  onOpenTemplates,
  onApplyTemplate,
  currentBranchId,
  dateFilter,
  setDateFilter,
  isLoading = false,
  onRefresh,
}: ServiceManagerMobileProps) {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [collapseFinance, setCollapseFinance] = useState(false);
  const [activeTab, setActiveTabRaw] = useState<"orders" | "history" | "templates">("orders");

  // Scroll tracking and scroll-to-top behavior for summary metrics
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowScrollTop(e.currentTarget.scrollTop > 250);
  };

  const scrollToTop = () => {
    triggerHaptic("medium");
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setActiveTab = (tab: "orders" | "history" | "templates") => {
    triggerHaptic("selection");
    setActiveTabRaw(tab);
    setShowScrollTop(false); // Reset floating button on tab change
  };

  // Financial data visibility state (permission-based feature)
  const [showFinancials, setShowFinancials] = useState(false);
  const canViewFinancials = canDo(profile?.role, "finance.view");

  // Templates data
  const { data: templates } = useRepairTemplates();

  // Debounced create work order handler to prevent duplicate creation
  const handleCreateWorkOrder = useCallback(() => {
    if (isCreating) return;

    setIsCreating(true);
    triggerHaptic("medium");
    onCreateWorkOrder();

    // Reset after 2 seconds to allow new creation
    setTimeout(() => {
      setIsCreating(false);
    }, 2000);
  }, [isCreating, onCreateWorkOrder]);

  // Filter work orders by date first
  const dateFilteredWorkOrders = useMemo(() => {
    return filterMobileWorkOrdersByDate(
      workOrders,
      dateFilter as MobileDateFilter
    );
  }, [workOrders, dateFilter]);

  // Optimized KPI Calculation - Single pass
  const kpis = useMemo(() => {
    return calculateMobileServiceKpis(dateFilteredWorkOrders);
  }, [dateFilteredWorkOrders]);

  // Get date label
  const getDateLabel = () => {
    switch (dateFilter) {
      case "today":
        return "hôm nay";
      case "week":
        return "7 ngày qua";
      case "month":
        return "tháng này";
      case "all":
        return "tất cả";
      default:
        return "";
    }
  };

  // Filter work orders
  const filteredWorkOrders = useMemo(() => {
    let filtered = dateFilteredWorkOrders;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((w) => w.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      const normalizedQuery = normalizePlateSearch(searchQuery);
      filtered = filtered.filter((w) => {
        const partsText = (w.partsUsed || [])
          .map((p) => [p.partName, p.sku, p.category].filter(Boolean).join(" "))
          .join(" ");
        const servicesText = (w.additionalServices || [])
          .map((s) => [s.description].filter(Boolean).join(" "))
          .join(" ");

        const text = [
          w.id,
          formatWorkOrderId(w.id),
          w.customerName,
          w.customerPhone,
          w.vehicleModel,
          w.licensePlate,
          w.issueDescription,
          w.technicianName,
          w.assignedTechnician,
          w.status,
          w.paymentStatus,
          w.paymentMethod,
          w.notes,
          w.currentKm != null ? String(w.currentKm) : "",
          w.total != null ? String(w.total) : "",
          partsText,
          servicesText,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const normalizedPlate = normalizePlateSearch(w.licensePlate);
        const plateMatched =
          w.licensePlate?.toLowerCase().includes(query) ||
          (!!normalizedQuery && normalizedPlate.includes(normalizedQuery));

        return text.includes(query) || plateMatched;
      });
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.creationDate || 0).getTime();
      const dateB = new Date(b.creationDate || 0).getTime();
      return dateB - dateA;
    });
  }, [dateFilteredWorkOrders, statusFilter, searchQuery]);

  const canDeleteWorkOrder = canDo(profile?.role, "work_order.delete");

  return (
    <div className="md:hidden flex flex-col h-screen bg-slate-50 dark:bg-[#151521]">
      {/* Top Capsule Tabs Navigation - FIXED HEADER */}
      <div className="px-3 pt-3 pb-1.5 flex gap-2 overflow-x-auto scrollbar-hide bg-slate-50 dark:bg-[#151521] shrink-0 z-10">
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 border ${
            activeTab === "orders"
              ? "bg-[#009ef7] text-white border-[#009ef7] shadow-sm shadow-[#009ef7]/20"
              : "bg-white dark:bg-[#1e1e2d] text-slate-600 dark:text-gray-400 border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Phiếu sửa</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 border ${
            activeTab === "history"
              ? "bg-[#009ef7] text-white border-[#009ef7] shadow-sm shadow-[#009ef7]/20"
              : "bg-white dark:bg-[#1e1e2d] text-slate-600 dark:text-gray-400 border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Lịch sử</span>
        </button>

        <button
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 border ${
            activeTab === "templates"
              ? "bg-[#009ef7] text-white border-[#009ef7] shadow-sm shadow-[#009ef7]/20"
              : "bg-white dark:bg-[#1e1e2d] text-slate-600 dark:text-gray-400 border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Mẫu</span>
        </button>
      </div>

      {/* CONTENT BASED ON TAB - UNIFIED SCROLL CONTAINER */}
      <PullToRefresh
        ref={scrollRef}
        onScroll={handleScroll}
        onRefresh={onRefresh || (async () => { })}
        disabled={activeTab !== "orders" || isLoading}
        className="flex-1 pb-24 scrollbar-hide"
      >
        {activeTab === "orders" && (
          <>
            {/* KPI CARDS */}
            <div className="bg-white dark:bg-[#1e1e2d] border-b border-slate-200 dark:border-gray-800/80 p-3">
              <div className="grid grid-cols-4 gap-2">
                {/* Tiếp nhận */}
                <button
                  onClick={() => {
                    setStatusFilter(
                      statusFilter === "Tiếp nhận" ? "all" : "Tiếp nhận"
                    );
                    triggerHaptic("selection");
                  }}
                  className={`py-2 px-1 rounded-xl text-center transition-all border backdrop-blur-md ${statusFilter === "Tiếp nhận"
                    ? "bg-[#009ef7]/10 border-[#009ef7]/60 shadow-sm shadow-[#009ef7]/20 scale-105"
                    : "bg-slate-50/60 dark:bg-slate-800/20 border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                    }`}
                >
                  <FileText className={`w-4 h-4 mx-auto mb-1 ${statusFilter === "Tiếp nhận" ? "text-[#009ef7]" : "text-[#009ef7]/60"}`} />
                  <div className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">{kpis.tiepNhan}</div>
                  <span className="text-[9px] font-bold text-slate-500 dark:text-gray-400">Tiếp nhận</span>
                </button>

                {/* Đang sửa */}
                <button
                  onClick={() => {
                    setStatusFilter(statusFilter === "Đang sửa" ? "all" : "Đang sửa");
                    triggerHaptic("selection");
                  }}
                  className={`py-2 px-1 rounded-xl text-center transition-all border backdrop-blur-md ${statusFilter === "Đang sửa"
                    ? "bg-[#f1416c]/10 border-[#f1416c]/60 shadow-sm shadow-[#f1416c]/20 scale-105"
                    : "bg-slate-50/60 dark:bg-slate-800/20 border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                    }`}
                >
                  <Wrench className={`w-4 h-4 mx-auto mb-1 ${statusFilter === "Đang sửa" ? "text-[#f1416c]" : "text-[#f1416c]/60"}`} />
                  <div className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">{kpis.dangSua}</div>
                  <span className="text-[9px] font-bold text-slate-500 dark:text-gray-400">Đang sửa</span>
                </button>

                {/* Đã sửa xong */}
                <button
                  onClick={() => {
                    setStatusFilter(
                      statusFilter === "Đã sửa xong" ? "all" : "Đã sửa xong"
                    );
                    triggerHaptic("selection");
                  }}
                  className={`py-2 px-1 rounded-xl text-center transition-all border backdrop-blur-md ${statusFilter === "Đã sửa xong"
                    ? "bg-[#50cd89]/10 border-[#50cd89]/60 shadow-sm shadow-[#50cd89]/20 scale-105"
                    : "bg-slate-50/60 dark:bg-slate-800/20 border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                    }`}
                >
                  <Check className={`w-4 h-4 mx-auto mb-1 ${statusFilter === "Đã sửa xong" ? "text-[#50cd89]" : "text-[#50cd89]/60"}`} />
                  <div className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                    {kpis.daHoanThanh}
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 dark:text-gray-400">Đã sửa xong</span>
                </button>

                {/* Trả máy */}
                <button
                  onClick={() => {
                    setStatusFilter(statusFilter === "Trả máy" ? "all" : "Trả máy");
                    triggerHaptic("selection");
                  }}
                  className={`py-2 px-1 rounded-xl text-center transition-all border backdrop-blur-md ${statusFilter === "Trả máy"
                    ? "bg-purple-500/10 border-purple-500/60 shadow-sm shadow-purple-500/20 scale-105"
                    : "bg-slate-50/60 dark:bg-slate-800/20 border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                    }`}
                >
                  <Key className={`w-4 h-4 mx-auto mb-1 ${statusFilter === "Trả máy" ? "text-purple-500" : "text-purple-500/60"}`} />
                  <div className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">{kpis.traMay}</div>
                  <span className="text-[9px] font-bold text-slate-500 dark:text-gray-400">Trả máy</span>
                </button>
              </div>

              {/* Collapsible Gradient Financial panel */}
              {canViewFinancials && (
                <div className="mt-3.5 border border-slate-200/80 dark:border-gray-800/80 rounded-2xl bg-white dark:bg-[#1e1e2d]/60 backdrop-blur-md overflow-hidden shadow-sm shadow-slate-100/50 dark:shadow-none hover:shadow-md transition-all duration-300">
                  {/* Panel Header */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/10 border-b border-slate-100 dark:border-gray-800/60">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      <span className="text-xs font-extrabold text-slate-800 dark:text-white leading-tight">
                        Báo cáo tài chính
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 text-[9px] font-bold uppercase tracking-wider flex items-center justify-center h-4.5">
                        {getDateLabel()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowFinancials(!showFinancials)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-800/80 text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 rounded-lg transition-colors flex items-center justify-center"
                        title="Ẩn/hiện doanh số"
                      >
                        {showFinancials ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => setCollapseFinance(!collapseFinance)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-800/80 text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 rounded-lg transition-colors flex items-center justify-center"
                      >
                        {collapseFinance ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Panel Cards - soft gradient styling */}
                  {!collapseFinance && (
                    <div className="p-3 grid grid-cols-2 gap-3">
                      {/* Doanh thu */}
                      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50/70 to-indigo-50/40 dark:from-blue-950/15 dark:to-indigo-950/5 border border-blue-100/50 dark:border-blue-900/20 relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:border-blue-200/50 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            Doanh thu
                          </span>
                          <div className="w-5.5 h-5.5 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                            <Coins className="w-3 h-3" />
                          </div>
                        </div>
                        <div className="text-sm font-black text-slate-800 dark:text-white font-mono tracking-tight leading-tight">
                          {showFinancials ? formatCurrency(kpis.doanhThu) : "•••••••"}
                        </div>
                      </div>
                      
                      {/* Lợi nhuận */}
                      <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50/70 to-teal-50/40 dark:from-emerald-950/15 dark:to-teal-950/5 border border-emerald-100/50 dark:border-emerald-900/20 relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:border-emerald-200/50 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Lợi nhuận
                          </span>
                          <div className="w-5.5 h-5.5 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                            <TrendingUp className="w-3 h-3" />
                          </div>
                        </div>
                        <div className="text-sm font-black text-slate-800 dark:text-white font-mono tracking-tight leading-tight">
                          {showFinancials ? formatCurrency(kpis.loiNhuan) : "•••••••"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SEARCH BAR & DATE FILTER */}
            <div className="bg-white dark:bg-[#1e1e2d] border-b border-slate-200 dark:border-gray-800/80 px-3 py-2 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Tìm tên, SĐT, biển số, dòng xe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 bg-slate-100 dark:bg-[#2b2b40] border border-slate-200 dark:border-gray-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-xs focus:outline-none focus:border-[#009ef7] focus:bg-white dark:focus:bg-[#1e1e2d] transition-all"
                />
                {searchQuery.length > 0 && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-full transition-colors text-slate-400 dark:text-gray-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date Filter Segmented Control */}
              <div className="bg-slate-100 dark:bg-[#2b2b40]/60 p-1 rounded-xl flex items-center justify-between mt-2.5 border border-slate-200/50 dark:border-gray-800/40">
                {[
                  { label: "Hôm nay", value: "today" },
                  { label: "7 ngày", value: "week" },
                  { label: "Tháng này", value: "month" },
                  { label: "Tất cả", value: "all" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDateFilter(option.value)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 ${dateFilter === option.value
                      ? "bg-white dark:bg-[#32324d] text-[#009ef7] shadow-sm border border-slate-200/50 dark:border-slate-700/30"
                      : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300"
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* DANH SÁCH PHIẾU SỬA CHỮA */}
            <div className="space-y-2.5 px-3 pt-3 pb-28 min-h-[50vh]">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-[#1e1e2d] rounded-xl border border-slate-200 dark:border-gray-800 p-4 space-y-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-2">
                        <Skeleton width={60} height={20} className="bg-slate-700/50" />
                        <Skeleton width={80} height={20} className="bg-slate-700/50" />
                      </div>
                      <Skeleton width={70} height={24} className="rounded-full bg-slate-700/50" />
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Skeleton variant="circle" width={16} height={16} className="bg-slate-700/50" />
                        <Skeleton width="60%" height={16} className="bg-slate-300 dark:bg-slate-700/50" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton variant="circle" width={16} height={16} className="bg-slate-700/50" />
                        <Skeleton width="40%" height={16} className="bg-slate-700/50" />
                      </div>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-slate-200 dark:border-gray-800 items-end">
                      <div className="flex gap-2">
                        <Skeleton width={24} height={24} className="rounded-md bg-slate-700/50" />
                        <Skeleton width={24} height={24} className="rounded-md bg-slate-700/50" />
                      </div>
                      <Skeleton width={90} height={20} className="bg-slate-700/50" />
                    </div>
                  </div>
                ))
              ) : filteredWorkOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                  <div className="w-24 h-24 mb-4 flex items-center justify-center text-slate-300 dark:text-gray-600">
                    <ClipboardList className="w-16 h-16 stroke-[1.2]" />
                  </div>
                  <h3 className="text-base font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Chưa có phiếu sửa chữa nào!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-500 mb-5">
                    Hãy tạo phiếu đầu tiên để quản lý dịch vụ sửa chữa
                  </p>
                  <button
                    onClick={handleCreateWorkOrder}
                    disabled={isCreating}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-xs font-bold hover:from-blue-600 hover:to-blue-700 transition-all shadow-md shadow-blue-500/10 disabled:opacity-50"
                  >
                    + Tạo phiếu mới
                  </button>
                </div>
              ) : (
                filteredWorkOrders.map((workOrder) => (
                  <WorkOrderCard
                    key={workOrder.id}
                    workOrder={workOrder}
                    onEdit={onEditWorkOrder}
                    onCall={onCallCustomer}
                    onPrint={onPrintWorkOrder}
                    onDelete={onDeleteWorkOrder}
                    canDelete={canDeleteWorkOrder}
                    canViewFinancials={canViewFinancials}
                    showFinancials={showFinancials}
                  />
                ))
              )}
            </div>


          </>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="pb-20">
            <ServiceHistory currentBranchId={currentBranchId} />
          </div>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === "templates" && (
          <div className="p-3">
            <div className="space-y-3">
              {templates?.map((template) => (
                <div
                  key={template.id}
                  className="bg-white dark:bg-[#1e1e2d] rounded-xl p-4 border border-slate-200 dark:border-gray-800 active:bg-slate-50 dark:active:bg-[#2b2b40] transition-colors cursor-pointer"
                  onClick={() => onApplyTemplate(template)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{template.name}</h3>
                      <p className="text-xs text-slate-600 dark:text-gray-500 mt-1">
                        {template.description}
                      </p>
                    </div>
                    <span className="text-[#009ef7] font-bold">
                      {formatCurrency(
                        template.labor_cost +
                        (template.parts?.reduce(
                          (s: number, p: any) => s + p.price * p.quantity,
                          0
                        ) || 0)
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-gray-400 mt-3 pt-3 border-t border-slate-200 dark:border-gray-800">
                    <div className="flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5" />
                      {template.duration} phút
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      {template.parts?.length || 0} phụ tùng
                    </div>
                  </div>
                </div>
              ))}

              {(!templates || templates.length === 0) && (
                <div className="text-center py-10 text-slate-600 dark:text-gray-500">
                  Chưa có mẫu sửa chữa nào
                </div>
              )}
            </div>


          </div>
        )}

        {/* Filter Popup */}
        {showFilterPopup && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center modal-bottom-safe">
            <div className="bg-white dark:bg-[#1e1e2d] rounded-t-3xl md:rounded-2xl w-full md:max-w-md p-6 space-y-4 animate-slide-up border border-slate-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Bộ lọc nâng cao
                </h3>
                <button
                  onClick={() => setShowFilterPopup(false)}
                  className="text-slate-600 dark:text-gray-500 hover:text-slate-900 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
              <div className="text-slate-600 dark:text-gray-400 text-sm text-center py-8">
                Các tùy chọn lọc sẽ được bổ sung...
              </div>
            </div>
          </div>
        )}

        <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
      </PullToRefresh>

      {/* FAB and Floating Buttons outside transforms context to avoid browser clip bugs */}
      {activeTab === "orders" && (
        <>
          {/* FAB (Floating Action Button) */}
          <button
            onClick={handleCreateWorkOrder}
            disabled={isCreating}
            className="fixed bottom-20 right-4 w-12 h-12 bg-gradient-to-br from-[#009ef7] to-[#0077b6] rounded-full shadow-lg shadow-[#009ef7]/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-[60] border border-white/10"
            aria-label="Tạo phiếu mới"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>

          {/* Floating Summary Shortcut Button */}
          {showScrollTop && (
            <button
              onClick={scrollToTop}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/90 dark:bg-slate-800/95 backdrop-blur-md text-white font-extrabold px-4.5 py-2.5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 z-[60] border border-slate-700/60 dark:border-slate-600/50 flex items-center gap-1.5 text-xs tracking-wide cursor-pointer"
              aria-label="Xem doanh thu và tiến độ"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#009ef7] animate-pulse" />
              <span>Xem doanh thu & tiến độ</span>
            </button>
          )}
        </>
      )}

      {activeTab === "templates" && (
        <button
          onClick={onOpenTemplates}
          className="fixed bottom-20 right-4 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full shadow-lg shadow-purple-500/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-[60]"
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      )}
    </div>
  );
}
