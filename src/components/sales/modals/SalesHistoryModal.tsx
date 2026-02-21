import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { formatCurrency, formatDate } from "../../../utils/format";
import type { Sale } from "../../../types";
import {
    Search,
    ChevronRight,
    ChevronLeft,
    Printer,
    Eye,
    Edit2,
    Trash2,
    CreditCard,
    Wallet,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    X,
    History,
    ShoppingBag,
    ReceiptText,
    Ban,
    RefreshCw,
} from "lucide-react";

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
    onViewDetail: (sale: Sale) => void;
    canDelete?: boolean;
}

const STATUS_CONFIG = {
    completed: { label: "Hoàn thành", icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30", border: "border-emerald-200 dark:border-emerald-800" },
    cancelled: { label: "Đã hủy", icon: Ban, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30", border: "border-red-200 dark:border-red-800" },
    refunded: { label: "Hoàn tiền", icon: RefreshCw, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30", border: "border-amber-200 dark:border-amber-800" },
    debt: { label: "Còn nợ", icon: AlertCircle, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/30", border: "border-orange-200 dark:border-orange-800" },
};

export const SalesHistoryModal: React.FC<SalesHistoryModalProps> = ({
    isOpen, onClose, sales, currentBranchId, onPrintReceipt, onEditSale,
    onDeleteSale, page, totalPages, total, hasMore, pageSize, onPrevPage,
    onNextPage, onPageSizeChange, search, onSearchChange, fromDate, toDate,
    onDateRangeChange, status = "all", onStatusChange, paymentMethodFilter = "all",
    onPaymentMethodFilterChange, keysetMode = false, onToggleKeyset,
    customerDebts = [], onViewDetail, canDelete = false,
}) => {
    const { profile } = useAuth();
    const [activeTimeFilter, setActiveTimeFilter] = useState("7days");
    const [searchText, setSearchText] = useState("");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");
    const [expandedSaleIds, setExpandedSaleIds] = useState<Set<string>>(new Set());
    const [actionSaleId, setActionSaleId] = useState<string | null>(null);

    const toggleExpand = (saleId: string) => {
        const newSet = new Set(expandedSaleIds);
        if (newSet.has(saleId)) newSet.delete(saleId); else newSet.add(saleId);
        setExpandedSaleIds(newSet);
    };

    useEffect(() => {
        const today = new Date();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        let from: Date | undefined, to: Date | undefined;
        switch (activeTimeFilter) {
            case "today": from = new Date(today.getFullYear(), today.getMonth(), today.getDate()); to = endOfDay; break;
            case "week": { const d = today.getDay(); const diff = d === 0 ? -6 : 1 - d; const mon = new Date(today); mon.setDate(today.getDate() + diff); from = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate()); to = endOfDay; break; }
            case "month": from = new Date(today.getFullYear(), today.getMonth(), 1); to = endOfDay; break;
            case "7days": { const s = new Date(today); s.setDate(s.getDate() - 6); from = new Date(s.getFullYear(), s.getMonth(), s.getDate()); to = endOfDay; break; }
            case "30days": { const s = new Date(today); s.setDate(s.getDate() - 29); from = new Date(s.getFullYear(), s.getMonth(), s.getDate()); to = endOfDay; break; }
            case "custom": if (customStartDate && customEndDate) { from = new Date(customStartDate); to = new Date(customEndDate + "T23:59:59"); } break;
            case "all": from = undefined; to = undefined; break;
        }
        onDateRangeChange(from ? from.toISOString() : undefined, to ? to.toISOString() : undefined);
    }, [activeTimeFilter, customStartDate, customEndDate, onDateRangeChange]);

    const filteredSales = useMemo(() => {
        let filtered = sales.filter(s => s.branchId === currentBranchId || (s as any).branchid === currentBranchId);
        if (searchText) {
            const q = searchText.toLowerCase();
            filtered = filtered.filter(s =>
                s.id.toLowerCase().includes(q) ||
                (s.sale_code || "").toLowerCase().includes(q) ||
                s.customer.name.toLowerCase().includes(q) ||
                ((s as any).username || s.userName || "").toLowerCase().includes(q)
            );
        }
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return filtered;
    }, [sales, currentBranchId, searchText]);

    const totalRevenue = useMemo(() => filteredSales.reduce((sum, s) => sum + s.total, 0), [filteredSales]);
    const cashTotal = useMemo(() => filteredSales.filter(s => s.paymentMethod === "cash").reduce((s, x) => s + x.total, 0), [filteredSales]);
    const bankTotal = useMemo(() => filteredSales.filter(s => s.paymentMethod !== "cash").reduce((s, x) => s + x.total, 0), [filteredSales]);

    useEffect(() => {
        const handle = (e: MouseEvent) => { if (!(e.target as Element).closest(".action-pop")) setActionSaleId(null); };
        if (actionSaleId) { document.addEventListener("mousedown", handle); return () => document.removeEventListener("mousedown", handle); }
    }, [actionSaleId]);

    if (!isOpen) return null;

    const TIME_FILTERS = [
        { id: "today", label: "Hôm nay" },
        { id: "7days", label: "7 ngày" },
        { id: "month", label: "Tháng này" },
        { id: "30days", label: "30 ngày" },
        { id: "all", label: "Tất cả" },
        { id: "custom", label: "Tùy chọn" },
    ];

    const STATUS_FILTERS: { id: "all" | "completed" | "cancelled" | "refunded"; label: string }[] = [
        { id: "all", label: "Tất cả" },
        { id: "completed", label: "Hoàn thành" },
        { id: "cancelled", label: "Đã hủy" },
        { id: "refunded", label: "Hoàn tiền" },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="bg-white dark:bg-slate-800 w-full md:max-w-7xl h-[95vh] md:h-[90vh] md:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col">

                {/* ── HEADER ── */}
                <div className="flex-shrink-0">
                    {/* Desktop Header */}
                    <div className="hidden md:block bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 pt-5 pb-0">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <History className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold">Lịch Sử Bán Hàng</h2>
                                    <p className="text-xs text-slate-400">Tổng {total} đơn hàng</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Tìm mã, tên khách..."
                                        value={searchText}
                                        onChange={e => setSearchText(e.target.value)}
                                        className="pl-9 pr-4 py-2 w-56 text-sm bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                                    />
                                </div>
                                <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Tổng doanh thu</div>
                                <div className="text-xl font-black text-emerald-400">{formatCurrency(totalRevenue)}</div>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1"><Wallet className="w-3 h-3" /> Tiền mặt</div>
                                <div className="text-base font-bold text-amber-400">{formatCurrency(cashTotal)}</div>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Chuyển khoản</div>
                                <div className="text-base font-bold text-blue-400">{formatCurrency(bankTotal)}</div>
                            </div>
                        </div>

                        {/* Time Filter Tabs */}
                        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                            {TIME_FILTERS.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setActiveTimeFilter(f.id)}
                                    className={`px-4 py-2 text-xs font-semibold rounded-t-lg whitespace-nowrap transition-all border-b-2 ${activeTimeFilter === f.id
                                        ? "bg-white text-slate-900 border-blue-500"
                                        : "text-slate-400 hover:text-white border-transparent hover:bg-white/5"
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mobile Header */}
                    <div className="md:hidden bg-gradient-to-b from-slate-900 to-slate-800">
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <History className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-white">Lịch Sử Bán Hàng</h2>
                                    <p className="text-[10px] text-slate-400">{total} đơn · {formatCurrency(totalRevenue)}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 text-slate-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {/* Search mobile */}
                        <div className="px-4 pb-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Tìm mã, tên khách..."
                                    value={searchText}
                                    onChange={e => setSearchText(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-white/10 border border-white/15 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                        {/* Time filter mobile */}
                        <div className="flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-hide">
                            {TIME_FILTERS.slice(0, 5).map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setActiveTimeFilter(f.id)}
                                    className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-all ${activeTimeFilter === f.id
                                        ? "bg-blue-600 text-white"
                                        : "bg-white/10 text-slate-400"
                                    }`}
                                >{f.label}</button>
                            ))}
                        </div>
                    </div>

                    {/* ── FILTERS BAR ── */}
                    <div className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-2.5 flex flex-wrap items-center gap-2">
                        {/* Status pills */}
                        <div className="flex gap-1 flex-wrap">
                            {STATUS_FILTERS.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => onStatusChange?.(f.id)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${status === f.id
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:border-blue-400"
                                    }`}
                                >{f.label}</button>
                            ))}
                        </div>

                        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 hidden md:block" />

                        {/* Payment method pills */}
                        {[
                            { id: "all", label: "Tất cả TT" },
                            { id: "cash", label: "💵 Tiền mặt" },
                            { id: "bank", label: "🏦 Chuyển khoản" },
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => onPaymentMethodFilterChange?.(f.id as "all" | "cash" | "bank")}
                                className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${paymentMethodFilter === f.id
                                    ? "bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-slate-800 dark:border-white"
                                    : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:border-slate-500"
                                }`}
                            >{f.label}</button>
                        ))}

                        {/* Custom date range */}
                        {activeTimeFilter === "custom" && (
                            <div className="flex items-center gap-2 ml-auto">
                                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)}
                                    className="border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
                                <span className="text-slate-400 text-xs">→</span>
                                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)}
                                    className="border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
                            </div>
                        )}

                        <div className="ml-auto hidden md:flex items-center gap-2">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-slate-500 dark:text-slate-400">
                                <input type="checkbox" checked={keysetMode} onChange={e => onToggleKeyset?.(e.target.checked)} className="rounded text-blue-600" />
                                Tải nhanh
                            </label>
                        </div>
                    </div>
                </div>

                {/* ── CONTENT ── */}
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
                    {filteredSales.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
                            <ShoppingBag className="w-16 h-16 opacity-20" />
                            <p className="text-sm font-medium">Không có đơn hàng nào</p>
                        </div>
                    ) : (
                        <>
                            {/* ── DESKTOP TABLE ── */}
                            <div className="hidden md:block">
                                <table className="w-full">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                            <th className="text-left pl-6 pr-3 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-44">Đơn hàng</th>
                                            <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-44">Khách hàng</th>
                                            <th className="text-left px-3 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sản phẩm</th>
                                            <th className="text-center px-3 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-28">Thanh toán</th>
                                            <th className="text-right px-3 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-36">Tổng tiền</th>
                                            <th className="text-center px-3 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-28">Trạng thái</th>
                                            <th className="pr-4 py-3 w-28"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {filteredSales.map((sale) => {
                                            const debt = customerDebts.find(d => d.order_id === sale.id);
                                            const hasDebt = debt && debt.remaining_amount > 0;
                                            const remainingDebt = debt ? debt.remaining_amount : 0;
                                            const isExpanded = expandedSaleIds.has(sale.id);
                                            const displayItems = isExpanded ? sale.items : sale.items.slice(0, 2);

                                            let statusKey: keyof typeof STATUS_CONFIG = "completed";
                                            if (hasDebt) statusKey = "debt";
                                            else if ((sale as any).status === "cancelled") statusKey = "cancelled";
                                            else if ((sale as any).status === "refunded") statusKey = "refunded";
                                            const statusCfg = STATUS_CONFIG[statusKey];
                                            const StatusIcon = statusCfg.icon;

                                            return (
                                                <tr key={sale.id} className="bg-white dark:bg-slate-800 hover:bg-blue-50/40 dark:hover:bg-slate-700/30 transition-colors group">
                                                    {/* Order info */}
                                                    <td className="pl-6 pr-3 py-3.5 align-top">
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                                {sale.sale_code || "#" + sale.id.slice(0, 8)}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                                                            {formatDate(new Date(sale.date))}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 mt-1 truncate max-w-[140px]">
                                                            NV: {(sale as any).username || sale.userName || "—"}
                                                        </div>
                                                    </td>

                                                    {/* Customer */}
                                                    <td className="px-3 py-3.5 align-top">
                                                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[160px]">
                                                            {sale.customer.name}
                                                        </div>
                                                        {sale.customer.phone && (
                                                            <div className="text-[11px] text-slate-400 mt-0.5">{sale.customer.phone}</div>
                                                        )}
                                                    </td>

                                                    {/* Items */}
                                                    <td className="px-3 py-3.5 align-top">
                                                        <div className="space-y-1">
                                                            {displayItems.map((item, idx) => (
                                                                <div key={idx} className="flex items-center gap-2 text-sm">
                                                                    <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">
                                                                        {item.quantity}
                                                                    </span>
                                                                    <span className="text-slate-700 dark:text-slate-300 truncate max-w-xs">{item.partName}</span>
                                                                    <span className="text-slate-400 text-xs ml-auto flex-shrink-0">{formatCurrency(item.sellingPrice)}</span>
                                                                </div>
                                                            ))}
                                                            {sale.items.length > 2 && (
                                                                <button onClick={() => toggleExpand(sale.id)} className="text-[11px] text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-0.5 mt-0.5">
                                                                    {isExpanded ? "Thu gọn" : `+${sale.items.length - 2} sản phẩm khác`}
                                                                    <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Payment method */}
                                                    <td className="px-3 py-3.5 align-top text-center">
                                                        {sale.paymentMethod === "cash" ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                                                <Wallet className="w-3 h-3" /> Tiền mặt
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                                                <CreditCard className="w-3 h-3" /> CK
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Total */}
                                                    <td className="px-3 py-3.5 align-top text-right">
                                                        <div className="text-base font-black text-slate-900 dark:text-slate-100">
                                                            {formatCurrency(sale.total)}
                                                        </div>
                                                        {hasDebt && (
                                                            <div className="text-[11px] text-red-500 font-semibold mt-0.5">
                                                                Còn nợ: {formatCurrency(remainingDebt)}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Status badge */}
                                                    <td className="px-3 py-3.5 align-top text-center">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                                                            <StatusIcon className="w-3 h-3" />
                                                            {statusCfg.label}
                                                        </span>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="pr-4 py-3.5 align-top">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => onPrintReceipt(sale)} title="In hóa đơn"
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all">
                                                                <Printer className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => onViewDetail(sale)} title="Xem chi tiết"
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => onEditSale(sale)} title="Chỉnh sửa"
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-all">
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            {canDelete && (
                                                                <button onClick={() => onDeleteSale(sale.id)} title="Xóa"
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-all">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── MOBILE CARDS ── */}
                            <div className="md:hidden p-3 space-y-2">
                                {filteredSales.map((sale) => {
                                    const debt = customerDebts.find(d => d.order_id === sale.id);
                                    const hasDebt = debt && debt.remaining_amount > 0;
                                    const remainingDebt = debt ? debt.remaining_amount : 0;
                                    const isExpanded = expandedSaleIds.has(sale.id);
                                    const isActionsOpen = actionSaleId === sale.id;

                                    let statusKey: keyof typeof STATUS_CONFIG = "completed";
                                    if (hasDebt) statusKey = "debt";
                                    else if ((sale as any).status === "cancelled") statusKey = "cancelled";
                                    else if ((sale as any).status === "refunded") statusKey = "refunded";
                                    const statusCfg = STATUS_CONFIG[statusKey];
                                    const StatusIcon = statusCfg.icon;

                                    return (
                                        <div key={sale.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                                            {/* Card top */}
                                            <div className="flex items-start justify-between px-4 pt-3.5 pb-2.5">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                            {sale.sale_code || "#" + sale.id.slice(0, 8)}
                                                        </span>
                                                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                                                            <StatusIcon className="w-2.5 h-2.5" />{statusCfg.label}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{sale.customer.name}</div>
                                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                                        {formatDate(new Date(sale.date))} · {(sale as any).username || sale.userName || ""}
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0 ml-2">
                                                    <div className="text-lg font-black text-slate-900 dark:text-slate-100">{formatCurrency(sale.total)}</div>
                                                    {hasDebt && <div className="text-[11px] text-red-500 font-semibold">Nợ: {formatCurrency(remainingDebt)}</div>}
                                                    <div className="flex items-center justify-end gap-1 mt-1">
                                                        {sale.paymentMethod === "cash"
                                                            ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400"><Wallet className="w-3 h-3" />Tiền mặt</span>
                                                            : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400"><CreditCard className="w-3 h-3" />CK</span>
                                                        }
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Items */}
                                            <div className="mx-3 mb-2 bg-slate-50 dark:bg-slate-700/30 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700">
                                                <div className="space-y-1.5">
                                                    {(isExpanded ? sale.items : sale.items.slice(0, 2)).map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-600 flex-shrink-0">
                                                                {item.quantity}
                                                            </span>
                                                            <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate">{item.partName}</span>
                                                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex-shrink-0">{formatCurrency(item.sellingPrice)}</span>
                                                        </div>
                                                    ))}
                                                    {sale.items.length > 2 && (
                                                        <button onClick={() => toggleExpand(sale.id)} className="w-full text-center text-[11px] font-semibold text-blue-500 pt-1 border-t border-slate-200 dark:border-slate-600 mt-1">
                                                            {isExpanded ? "Thu gọn" : `+${sale.items.length - 2} sản phẩm nữa`}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions bar */}
                                            <div className="flex border-t border-slate-100 dark:border-slate-700 divide-x divide-slate-100 dark:divide-slate-700">
                                                <button onClick={() => onPrintReceipt(sale)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors active:scale-95">
                                                    <Printer className="w-3.5 h-3.5" /> In
                                                </button>
                                                <button onClick={() => onViewDetail(sale)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors active:scale-95">
                                                    <Eye className="w-3.5 h-3.5" /> Chi tiết
                                                </button>
                                                <button onClick={() => onEditSale(sale)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors active:scale-95">
                                                    <Edit2 className="w-3.5 h-3.5" /> Sửa
                                                </button>
                                                {canDelete && (
                                                    <button onClick={() => onDeleteSale(sale.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors active:scale-95">
                                                        <Trash2 className="w-3.5 h-3.5" /> Xóa
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* ── FOOTER / PAGINATION ── */}
                <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 md:px-6 py-3 flex items-center justify-between gap-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        Hiển thị <span className="font-bold text-slate-700 dark:text-slate-200">{filteredSales.length}</span> / {total} đơn hàng
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onPrevPage} disabled={page === 1}
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 px-2">
                            Trang {page} / {totalPages || 1}
                        </span>
                        <button onClick={onNextPage} disabled={!hasMore}
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <select value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))}
                            className="hidden md:block border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/trang</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

