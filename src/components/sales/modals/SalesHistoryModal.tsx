import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { formatCurrency, formatDate } from "../../../utils/format";
import type { Sale } from "../../../types";
import {
    Search,
    Calendar,
    Filter,
    ChevronRight,
    MoreVertical,
    Printer,
    Eye,
    Edit2,
    Trash2,
    CreditCard,
    Wallet,
    CheckCircle,
    Clock,
    AlertCircle,
    TrendingUp,
    Package,
    User,
    X,
    ChevronLeft,
    LayoutGrid,
    List,
    ArrowUpRight,
    History,
} from "lucide-react";

// Sales History Modal Component
export interface SalesHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    sales: Sale[];
    currentBranchId: string;
    onPrintReceipt: (sale: Sale) => void;
    onEditSale: (sale: Sale) => void;
    onDeleteSale: (saleId: string) => void;
    page: number;
    totalPages: number;
    total: number;
    hasMore: boolean;
    pageSize: number;
    onPrevPage: () => void;
    onNextPage: () => void;
    onPageSizeChange: (size: number) => void;
    search: string;
    onSearchChange: (s: string) => void;
    fromDate?: string;
    toDate?: string;
    onDateRangeChange: (from?: string, to?: string) => void;
    status?: "all" | "completed" | "cancelled" | "refunded";
    onStatusChange?: (s: "all" | "completed" | "cancelled" | "refunded") => void;
    paymentMethodFilter?: "all" | "cash" | "bank";
    onPaymentMethodFilterChange?: (m: "all" | "cash" | "bank") => void;
    keysetMode?: boolean;
    onToggleKeyset?: (checked: boolean) => void;
    customerDebts?: any[];
    // Props for handling sub-modals (Detail and Edit) which are managed by parent for now
    // or we can pass handlers to open them
    onViewDetail: (sale: Sale) => void;
    canDelete?: boolean;
}

export const SalesHistoryModal: React.FC<SalesHistoryModalProps> = ({
    isOpen,
    onClose,
    sales,
    currentBranchId,
    onPrintReceipt,
    onEditSale,
    onDeleteSale,
    page,
    totalPages,
    total,
    hasMore,
    pageSize,
    onPrevPage,
    onNextPage,
    onPageSizeChange,
    search,
    onSearchChange,
    fromDate,
    toDate,
    onDateRangeChange,
    status = "all",
    onStatusChange,
    paymentMethodFilter = "all",
    onPaymentMethodFilterChange,
    keysetMode = false,
    onToggleKeyset,
    customerDebts = [],
    onViewDetail,
    canDelete = false,
}) => {
    const { profile } = useAuth();
    const [activeTimeFilter, setActiveTimeFilter] = useState("7days");
    const [searchText, setSearchText] = useState("");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");
    const [dropdownOpenSaleId, setDropdownOpenSaleId] = useState<string | null>(
        null
    );
    const [salesDropdownPos, setSalesDropdownPos] = useState({
        top: 0,
        right: 0,
    });
    const [expandedSaleIds, setExpandedSaleIds] = useState<Set<string>>(new Set());

    const toggleExpand = (saleId: string) => {
        const newSet = new Set(expandedSaleIds);
        if (newSet.has(saleId)) {
            newSet.delete(saleId);
        } else {
            newSet.add(saleId);
        }
        setExpandedSaleIds(newSet);
    };

    // Compute date range when filter changes
    useEffect(() => {
        const today = new Date();
        const startOfDay = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        );
        const endOfDay = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            23,
            59,
            59,
            999
        );
        let from: Date | undefined;
        let to: Date | undefined;
        switch (activeTimeFilter) {
            case "today":
                from = startOfDay;
                to = endOfDay;
                break;
            case "week": {
                // Current week (Monday to Sunday)
                const dayOfWeek = today.getDay();
                const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday
                const monday = new Date(today);
                monday.setDate(today.getDate() + diff);
                from = new Date(
                    monday.getFullYear(),
                    monday.getMonth(),
                    monday.getDate()
                );
                to = endOfDay;
                break;
            }
            case "month": {
                // Current month
                from = new Date(today.getFullYear(), today.getMonth(), 1);
                to = endOfDay;
                break;
            }
            case "7days": {
                const s = new Date(today);
                s.setDate(s.getDate() - 6);
                from = new Date(s.getFullYear(), s.getMonth(), s.getDate());
                to = endOfDay;
                break;
            }
            case "30days": {
                const s = new Date(today);
                s.setDate(s.getDate() - 29);
                from = new Date(s.getFullYear(), s.getMonth(), s.getDate());
                to = endOfDay;
                break;
            }
            case "custom": {
                if (customStartDate && customEndDate) {
                    from = new Date(customStartDate);
                    to = new Date(customEndDate + "T23:59:59");
                }
                break;
            }
            case "all":
                from = undefined;
                to = undefined;
                break;
        }
        onDateRangeChange(
            from ? from.toISOString() : undefined,
            to ? to.toISOString() : undefined
        );
    }, [activeTimeFilter, customStartDate, customEndDate, onDateRangeChange]);

    // Filter and sort sales
    const filteredSales = useMemo(() => {
        let filtered = sales.filter(
            (sale) =>
                sale.branchId === currentBranchId ||
                (sale as any).branchid === currentBranchId
        );

        // Search filter
        if (searchText) {
            filtered = filtered.filter(
                (sale) =>
                    sale.id.toLowerCase().includes(searchText.toLowerCase()) ||
                    (sale.sale_code || "")
                        .toLowerCase()
                        .includes(searchText.toLowerCase()) ||
                    sale.customer.name.toLowerCase().includes(searchText.toLowerCase()) ||
                    ((sale as any).username || sale.userName || "")
                        .toLowerCase()
                        .includes(searchText.toLowerCase())
            );
        }

        // Sort by date desc
        filtered.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return filtered;
    }, [sales, currentBranchId, searchText]);

    // Calculate total revenue
    const totalRevenue = useMemo(() => {
        return filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    }, [filteredSales]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest(".dropdown-menu-container")) {
                setDropdownOpenSaleId(null);
            }
        };
        if (dropdownOpenSaleId) {
            document.addEventListener("mousedown", handleClickOutside);
            return () =>
                document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [dropdownOpenSaleId]);

    if (!isOpen) return null;

    return (
        <React.Fragment>
            <div className="fixed inset-0 bg-black/60 z-50 flex md:items-center md:justify-center items-end justify-center p-0 md:p-4">
                <div className="bg-white dark:bg-slate-800 w-full md:max-w-7xl max-h-[95vh] md:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up-bottom">
                    {/* Header with time filter and stats */}
                    {/* Header - Desktop */}
                    <div className="hidden md:flex flex-row justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <History className="w-5 h-5 text-blue-500" />
                                Lịch Sử Bán Hàng
                                <span className="text-sm font-normal text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
                                    {total} đơn
                                </span>
                            </h2>
                            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Tổng doanh thu:{" "}
                                <span className="font-bold text-green-600 dark:text-green-400 text-lg">
                                    {formatCurrency(totalRevenue)}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Search Box */}
                            <div className="relative w-64">
                                <input
                                    type="text"
                                    placeholder="Tìm theo mã, tên KH..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            </div>

                            {/* Time Filters */}
                            <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
                                {[
                                    { id: "today", label: "Hôm nay" },
                                    { id: "7days", label: "7 ngày" },
                                    { id: "month", label: "Tháng này" },
                                    { id: "all", label: "Tất cả" },
                                ].map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() => setActiveTimeFilter(filter.id)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${activeTimeFilter === filter.id
                                            ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                            }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Header - Mobile */}
                    <div className="flex md:hidden flex-col bg-[#1e1e2d] border-b border-slate-700/50">
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <History className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">Lịch Sử Bán Hàng</h2>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                                        {total} đơn hàng
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 active:scale-95 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Stats Cards - Mobile */}
                        <div className="px-4 pb-4 grid grid-cols-2 gap-3">
                            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Doanh thu</div>
                                <div className="text-sm font-bold text-green-400">{formatCurrency(totalRevenue)}</div>
                            </div>
                            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Số lượng</div>
                                <div className="text-sm font-bold text-blue-400">{total} đơn</div>
                            </div>
                        </div>

                        {/* Search & Time Filter - Mobile */}
                        <div className="px-4 pb-4 space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Tìm theo mã, tên KH..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white text-sm focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div className="flex bg-slate-800/50 border border-slate-700 rounded-xl p-1 overflow-x-auto scrollbar-hide">
                                {[
                                    { id: "today", label: "Hôm nay" },
                                    { id: "7days", label: "7 ngày" },
                                    { id: "month", label: "Tháng này" },
                                    { id: "all", label: "Tất cả" },
                                ].map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() => setActiveTimeFilter(filter.id)}
                                        className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${activeTimeFilter === filter.id
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                            : "text-slate-400 hover:text-slate-200"
                                            }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Filters Row */}
                    {/* Filters Row - Desktop */}
                    <div className="hidden md:flex px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-wrap gap-3 items-center text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Trạng thái:</span>
                            <select
                                value={status}
                                onChange={(e) =>
                                    onStatusChange?.(
                                        e.target.value as "all" | "completed" | "cancelled" | "refunded"
                                    )
                                }
                                className="border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs"
                            >
                                <option value="all">Tất cả</option>
                                <option value="completed">Hoàn thành</option>
                                <option value="cancelled">Đã hủy</option>
                                <option value="refunded">Hoàn tiền</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Thanh toán:</span>
                            <select
                                value={paymentMethodFilter}
                                onChange={(e) =>
                                    onPaymentMethodFilterChange?.(
                                        e.target.value as "all" | "cash" | "bank"
                                    )
                                }
                                className="border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs"
                            >
                                <option value="all">Tất cả</option>
                                <option value="cash">Tiền mặt</option>
                                <option value="bank">Chuyển khoản</option>
                            </select>
                        </div>

                        {activeTimeFilter === "custom" && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs"
                                />
                                <span>-</span>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs"
                                />
                            </div>
                        )}

                        <div className="ml-auto flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={keysetMode}
                                    onChange={(e) => onToggleKeyset?.(e.target.checked)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-slate-600 dark:text-slate-400 text-xs">
                                    Tải nhanh
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Filters Row - Mobile */}
                    <div className="flex md:hidden px-4 py-3 bg-[#1e1e2d] border-b border-slate-700/50 flex-col gap-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Trạng thái</label>
                                <select
                                    value={status}
                                    onChange={(e) =>
                                        onStatusChange?.(
                                            e.target.value as "all" | "completed" | "cancelled" | "refunded"
                                        )
                                    }
                                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white text-xs focus:border-blue-500 transition-all appearance-none"
                                >
                                    <option value="all">Tất cả trạng thái</option>
                                    <option value="completed">Hoàn thành</option>
                                    <option value="cancelled">Đã hủy</option>
                                    <option value="refunded">Hoàn tiền</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Thanh toán</label>
                                <select
                                    value={paymentMethodFilter}
                                    onChange={(e) =>
                                        onPaymentMethodFilterChange?.(
                                            e.target.value as "all" | "cash" | "bank"
                                        )
                                    }
                                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white text-xs focus:border-blue-500 transition-all appearance-none"
                                >
                                    <option value="all">Tất cả PTTT</option>
                                    <option value="cash">Tiền mặt</option>
                                    <option value="bank">Chuyển khoản</option>
                                </select>
                            </div>
                        </div>
                        {activeTimeFilter === "custom" && (
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white text-xs"
                                />
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white text-xs"
                                />
                            </div>
                        )}
                    </div>

                    {/* Sales List */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50">
                        {filteredSales.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <svg
                                    className="w-16 h-16 mb-4 opacity-50"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                    />
                                </svg>
                                <p>Không tìm thấy đơn hàng nào</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">

                                    {/* Table Header - Visible on Desktop */}
                                    <div className="hidden md:flex gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <div className="w-48">Thông tin đơn hàng</div>
                                        <div className="flex-1">Sản phẩm</div>
                                        <div className="w-48 text-right">Thanh toán</div>
                                        <div className="w-8"></div>
                                    </div>

                                    {filteredSales.map((sale) => {
                                        // Check debt status
                                        const debt = customerDebts.find(
                                            (d) => d.order_id === sale.id
                                        );
                                        const hasDebt = debt && debt.remaining_amount > 0;
                                        const paidAmount = debt ? debt.paid_amount : sale.total;
                                        const remainingDebt = debt ? debt.remaining_amount : 0;

                                        return (
                                            <div key={sale.id} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                                                {/* Desktop View */}
                                                <div className="hidden md:flex p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group gap-4">
                                                    {/* Left: Time & ID */}
                                                    <div className="w-48 flex-shrink-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="px-2 py-0.5 rounded text-sm font-extrabold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-mono">
                                                                #{sale.sale_code || sale.id.slice(0, 8)}
                                                            </span>
                                                            <span className="text-xs text-slate-500">
                                                                {formatDate(new Date(sale.date))}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                            {sale.customer.name}
                                                        </div>
                                                        {sale.customer.phone && (
                                                            <div className="text-xs text-slate-500">
                                                                {sale.customer.phone}
                                                            </div>
                                                        )}
                                                        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                                                            <User className="w-3 h-3" />
                                                            {(sale as any).username || sale.userName}
                                                        </div>
                                                    </div>

                                                    {/* Middle: Items */}
                                                    <div className="flex-1">
                                                        <div className="space-y-1">
                                                            {sale.items.slice(0, expandedSaleIds.has(sale.id) ? undefined : 3).map((item, idx) => (
                                                                <div key={idx} className="flex justify-between text-sm">
                                                                    <span className="text-slate-700 dark:text-slate-300">
                                                                        <span className="font-medium text-slate-900 dark:text-slate-100">
                                                                            {item.quantity}x
                                                                        </span>{" "}
                                                                        {item.partName}
                                                                    </span>
                                                                    <span className="text-slate-500 text-xs">
                                                                        {formatCurrency(item.sellingPrice)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {sale.items.length > 3 && (
                                                                <button
                                                                    onClick={() => toggleExpand(sale.id)}
                                                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline italic mt-1 block"
                                                                >
                                                                    {expandedSaleIds.has(sale.id)
                                                                        ? "Thu gọn"
                                                                        : `+ ${sale.items.length - 3} sản phẩm khác...`}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Right: Total & Status */}
                                                    <div className="w-48 flex-shrink-0 flex flex-col items-end gap-1">
                                                        <div className="text-right">
                                                            <div className="text-xs text-slate-500 mb-0.5">Tổng tiền</div>
                                                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                                                {formatCurrency(sale.total)}
                                                            </div>

                                                            {/* Payment details */}
                                                            {hasDebt ? (
                                                                <div className="mt-2 space-y-1">
                                                                    <div className="text-xs text-green-600 dark:text-green-400">
                                                                        Đã trả: {formatCurrency(paidAmount)}
                                                                    </div>
                                                                    <div className="text-xs font-semibold text-red-600 dark:text-red-400">
                                                                        Còn nợ: {formatCurrency(remainingDebt)}
                                                                    </div>
                                                                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                                                        <AlertCircle className="w-3 h-3" /> Còn nợ
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="mt-2">
                                                                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                                                        <CheckCircle className="w-3 h-3" /> Đã thanh toán
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="text-xs text-slate-500 mt-1">
                                                                {sale.paymentMethod === "cash" ? "💵 Tiền mặt" : "🏦 Chuyển khoản"}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Actions - Desktop */}
                                                    <div className="flex items-start justify-end gap-1 pt-1">
                                                        <button
                                                            onClick={() => onEditSale(sale)}
                                                            className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                                                            title="Chỉnh sửa"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <div className="relative dropdown-menu-container">
                                                            <button
                                                                onClick={(e) => {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setSalesDropdownPos({
                                                                        top: rect.bottom + 4,
                                                                        right: window.innerWidth - rect.right,
                                                                    });
                                                                    setDropdownOpenSaleId(dropdownOpenSaleId === sale.id ? null : sale.id);
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                                            >
                                                                <MoreVertical className="w-4 h-4" />
                                                            </button>
                                                            {dropdownOpenSaleId === sale.id && (
                                                                <div
                                                                    className="fixed w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-[9999]"
                                                                    style={{
                                                                        top: salesDropdownPos.top,
                                                                        right: salesDropdownPos.right,
                                                                    }}
                                                                >
                                                                    <button
                                                                        onClick={() => { onPrintReceipt(sale); setDropdownOpenSaleId(null); }}
                                                                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 rounded-t-lg"
                                                                    >
                                                                        <Printer className="w-4 h-4" /> In lại hóa đơn
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { onViewDetail(sale); setDropdownOpenSaleId(null); }}
                                                                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                                                    >
                                                                        <Eye className="w-4 h-4" /> Xem chi tiết
                                                                    </button>
                                                                    {canDelete && (
                                                                        <button
                                                                            onClick={() => { onDeleteSale(sale.id); setDropdownOpenSaleId(null); }}
                                                                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded-b-lg"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" /> Xóa hóa đơn
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Mobile View */}
                                                <div className="md:hidden p-4 bg-[#1e1e2d] hover:bg-[#252538] transition-all">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                                                                    #{sale.sale_code || sale.id.slice(0, 8)}
                                                                </span>
                                                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    {formatDate(new Date(sale.date))}
                                                                </span>
                                                            </div>
                                                            <div className="text-sm font-bold text-white">{sale.customer.name}</div>
                                                            {sale.customer.phone && (
                                                                <div className="text-xs text-slate-400">{sale.customer.phone}</div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            {!hasDebt ? (
                                                                <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                                                    <CheckCircle className="w-3 h-3" /> Đã xong
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1">
                                                                    <AlertCircle className="w-3 h-3" /> Còn nợ
                                                                </span>
                                                            )}
                                                            <div className="relative dropdown-menu-container">
                                                                <button
                                                                    onClick={(e) => {
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        setSalesDropdownPos({
                                                                            top: rect.bottom + 4,
                                                                            right: window.innerWidth - rect.right,
                                                                        });
                                                                        setDropdownOpenSaleId(dropdownOpenSaleId === sale.id ? null : sale.id);
                                                                    }}
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 active:scale-95 transition-all"
                                                                >
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </button>
                                                                {dropdownOpenSaleId === sale.id && (
                                                                    <div
                                                                        className="fixed w-48 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 z-[9999] overflow-hidden"
                                                                        style={{
                                                                            top: salesDropdownPos.top,
                                                                            right: salesDropdownPos.right,
                                                                        }}
                                                                    >
                                                                        <button
                                                                            onClick={() => { onPrintReceipt(sale); setDropdownOpenSaleId(null); }}
                                                                            className="w-full text-left px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700 flex items-center gap-3 border-b border-slate-700/50"
                                                                        >
                                                                            <Printer className="w-4 h-4 text-blue-400" /> In lại hóa đơn
                                                                        </button>
                                                                        <button
                                                                            onClick={() => { onViewDetail(sale); setDropdownOpenSaleId(null); }}
                                                                            className="w-full text-left px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700 flex items-center gap-3 border-b border-slate-700/50"
                                                                        >
                                                                            <Eye className="w-4 h-4 text-emerald-400" /> Xem chi tiết
                                                                        </button>
                                                                        <button
                                                                            onClick={() => { onEditSale(sale); setDropdownOpenSaleId(null); }}
                                                                            className="w-full text-left px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700 flex items-center gap-3 border-b border-slate-700/50"
                                                                        >
                                                                            <Edit2 className="w-4 h-4 text-amber-400" /> Chỉnh sửa
                                                                        </button>
                                                                        {canDelete && (
                                                                            <button
                                                                                onClick={() => { onDeleteSale(sale.id); setDropdownOpenSaleId(null); }}
                                                                                className="w-full text-left px-4 py-3 text-xs font-bold text-red-400 hover:bg-red-500/10 flex items-center gap-3"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" /> Xóa hóa đơn
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Items List - Mobile */}
                                                    <div className="bg-slate-800/30 rounded-xl p-3 mb-3 border border-slate-700/30">
                                                        <div className="space-y-2">
                                                            {sale.items.slice(0, expandedSaleIds.has(sale.id) ? undefined : 2).map((item, idx) => (
                                                                <div key={idx} className="flex justify-between items-center text-[11px]">
                                                                    <div className="flex items-center gap-2 text-slate-300">
                                                                        <span className="w-5 h-5 rounded bg-slate-700 flex items-center justify-center text-[10px] font-bold text-blue-400">{item.quantity}</span>
                                                                        <span className="font-medium truncate max-w-[150px]">{item.partName}</span>
                                                                    </div>
                                                                    <span className="font-bold text-slate-400">{formatCurrency(item.sellingPrice)}</span>
                                                                </div>
                                                            ))}
                                                            {sale.items.length > 2 && (
                                                                <button
                                                                    onClick={() => toggleExpand(sale.id)}
                                                                    className="w-full pt-2 mt-2 border-t border-slate-700/50 text-[10px] font-bold text-blue-400 flex items-center justify-center gap-1"
                                                                >
                                                                    {expandedSaleIds.has(sale.id) ? "Thu gọn" : `Xem thêm ${sale.items.length - 2} sản phẩm...`}
                                                                    <ChevronRight className={`w-3 h-3 transition-transform ${expandedSaleIds.has(sale.id) ? "-rotate-90" : "rotate-90"}`} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Footer - Mobile */}
                                                    <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                                                                {sale.paymentMethod === "cash" ? <Wallet className="w-4 h-4 text-amber-400" /> : <CreditCard className="w-4 h-4 text-blue-400" />}
                                                            </div>
                                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                                {sale.paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản"}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Tổng tiền</div>
                                                            <div className="text-base font-black text-blue-400">{formatCurrency(sale.total)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                </div>
                            </div>

                        )}
                    </div>

                    {/* Footer with pagination */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 md:flex hidden">
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                            Hiển thị {filteredSales.length} đơn hàng
                        </div>
                    </div>

                    {/* Footer - Mobile */}
                    <div className="md:hidden p-4 bg-[#1e1e2d] border-t border-slate-700/50 flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {filteredSales.length} đơn hàng
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onPrevPage}
                                disabled={page === 1}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 disabled:opacity-30 active:scale-95 transition-all"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="px-3 py-2 rounded-xl bg-slate-800 text-xs font-bold text-white border border-slate-700">
                                {page} / {totalPages || 1}
                            </div>
                            <button
                                onClick={onNextPage}
                                disabled={!hasMore}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 disabled:opacity-30 active:scale-95 transition-all"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </React.Fragment >
    );
};
