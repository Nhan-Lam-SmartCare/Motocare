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
    EyeOff,
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
    customers?: any[]; // Full customer data for checking vehicles
    onViewDetail: (sale: Sale) => void;
    canDelete?: boolean;
    canEdit?: boolean;
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
    onNextPage, onPageSizeChange, search: _search, onSearchChange: _onSearchChange, fromDate: _fromDate, toDate: _toDate,
    onDateRangeChange, status = "all", onStatusChange, paymentMethodFilter = "all",
    onPaymentMethodFilterChange, keysetMode = false, onToggleKeyset,
    customerDebts = [], customers = [], onViewDetail, canDelete = false,
    canEdit = true,
}) => {
    const { profile } = useAuth();
    const isOwner = profile?.role === "owner";
    const [showFinancials, setShowFinancials] = useState(true);

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
    
    const { totalCost, totalProfit, profitMargin, cashTotal, bankTotal } = useMemo(() => {
        let cost = 0;
        let cash = 0;
        let bank = 0;
        for (const sale of filteredSales) {
            for (const item of sale.items) {
                const itemCost = Number((item as any).costPrice || 0);
                cost += itemCost * item.quantity;
            }
            if (sale.paymentMethod === "cash") {
                cash += sale.total;
            } else {
                bank += sale.total;
            }
        }
        const profit = totalRevenue - cost;
        const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
        return { totalCost: cost, totalProfit: profit, profitMargin: margin, cashTotal: cash, bankTotal: bank };
    }, [filteredSales, totalRevenue]);

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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 modal-bottom-safe">
            <div className="bg-white dark:bg-slate-800 w-full md:max-w-7xl h-[calc(95vh-4rem)] md:h-[90vh] md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">

                {/* ── HEADER ── */}
                <div className="flex-shrink-0">
                    {/* Desktop Header */}
                    <div className="hidden md:block bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-6 pt-6 pb-2">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-400/20 shadow-inner">
                                    <History className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-tight">Lịch Sử Bán Hàng</h2>
                                    <p className="text-xs text-slate-400 font-medium opacity-80 uppercase tracking-widest">Hệ thống quản lý đơn hàng</p>
                                </div>
                                {isOwner && (
                                    <button 
                                        onClick={() => setShowFinancials(!showFinancials)}
                                        className={`w-10 h-10 flex items-center justify-center rounded-2xl border transition-all active:scale-90 ${
                                            showFinancials 
                                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20" 
                                            : "bg-slate-500/10 text-slate-400 border-white/10 hover:bg-white/10"
                                        }`}
                                        title={showFinancials ? "Ẩn số liệu tài chính" : "Hiện số liệu tài chính"}
                                    >
                                        {showFinancials ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Search */}
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Tìm mã đơn, tên khách hàng..."
                                        value={searchText}
                                        onChange={e => setSearchText(e.target.value)}
                                        className="pl-10 pr-4 py-2.5 w-72 text-sm bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:bg-white/10 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    />
                                </div>
                                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 border border-white/10 transition-all active:scale-90">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Premium Stats Row - 4 Cards (Only for Owner) */}
                        {isOwner && (
                            <div className="grid grid-cols-4 gap-4 mb-6 animate-in slide-in-from-top duration-500">
                                {/* Doanh thu */}
                                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-4 shadow-lg shadow-emerald-950/20 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-125 transition-transform">
                                        <TrendingUp className="w-12 h-12 text-emerald-400" />
                                    </div>
                                    <div className="text-[10px] text-emerald-400 uppercase tracking-[0.2em] font-black mb-1">Doanh thu</div>
                                    <div className="text-2xl font-black text-emerald-400 tracking-tight">
                                        {showFinancials ? formatCurrency(totalRevenue) : "••••••"}
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400">Tiền mặt: <span className="text-amber-400 font-bold">{showFinancials ? formatCurrency(cashTotal) : "••••••"}</span></span>
                                    </div>
                                </div>
                                {/* Giá vốn */}
                                <div className="bg-gradient-to-br from-slate-500/10 to-slate-600/5 border border-slate-500/20 rounded-2xl p-4 shadow-lg shadow-slate-950/20">
                                    <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mb-1">Giá vốn</div>
                                    <div className="text-2xl font-black text-slate-300 tracking-tight">
                                        {showFinancials ? formatCurrency(totalCost) : "••••••"}
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400">Chuyển khoản: <span className="text-blue-400 font-bold">{showFinancials ? formatCurrency(bankTotal) : "••••••"}</span></span>
                                    </div>
                                </div>
                                {/* Lợi nhuận */}
                                <div className={`bg-gradient-to-br ${totalProfit >= 0 ? 'from-blue-500/10 to-blue-600/5 border-blue-500/20 shadow-blue-950/20' : 'from-rose-500/10 to-rose-600/5 border-rose-500/20 shadow-rose-950/20'} border rounded-2xl p-4 shadow-lg`}>
                                    <div className={`text-[10px] uppercase tracking-[0.2em] font-black mb-1 ${totalProfit >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>Lợi nhuận</div>
                                    <div className={`text-2xl font-black tracking-tight ${totalProfit >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                                        {showFinancials ? formatCurrency(totalProfit) : "••••••"}
                                    </div>
                                    <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                                        <span className={totalProfit >= 0 ? 'text-blue-400 font-bold' : 'text-rose-400 font-bold'}>
                                            {totalProfit >= 0 ? 'Lãi ròng' : 'Lỗ'}
                                        </span>
                                    </div>
                                </div>
                                {/* Biên lợi nhuận */}
                                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-4 shadow-lg shadow-purple-950/20">
                                    <div className="text-[10px] text-purple-400 uppercase tracking-[0.2em] font-black mb-1">Biên LN</div>
                                    <div className="text-2xl font-black text-purple-400 tracking-tight">
                                        {showFinancials ? `${profitMargin.toFixed(1)}%` : "•••%"}
                                    </div>
                                    <div className="mt-2 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500 rounded-full transition-all duration-1000" style={{ width: showFinancials ? `${Math.min(profitMargin, 100)}%` : "0%" }}></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Time Filter Tabs */}
                        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                            {TIME_FILTERS.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setActiveTimeFilter(f.id)}
                                    className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-t-2xl whitespace-nowrap transition-all border-b-4 ${activeTimeFilter === f.id
                                        ? "bg-slate-50 dark:bg-slate-900 text-blue-600 border-blue-500"
                                        : "text-slate-500 hover:text-white border-transparent hover:bg-white/5"
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mobile Header */}
                    <div className="md:hidden bg-gradient-to-b from-slate-900 to-slate-800 p-4 pb-2">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <History className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-white">Lịch Sử Bán Hàng</h2>
                                    {isOwner && (
                                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                            LN: {showFinancials ? formatCurrency(totalProfit) : "••••••"}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {isOwner && (
                                <button 
                                    onClick={() => setShowFinancials(!showFinancials)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-slate-300 ml-2"
                                >
                                    {showFinancials ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                </button>
                            )}
                            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-slate-300 ml-auto">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        {/* Summary Mobile Cards (Only for Owner) */}
                        {isOwner && (
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <div className="bg-white/5 border border-white/10 rounded-xl p-2">
                                    <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Doanh thu</div>
                                    <div className="text-sm font-black text-emerald-400">
                                        {showFinancials ? formatCurrency(totalRevenue) : "••••••"}
                                    </div>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-2">
                                    <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Biên LN</div>
                                    <div className="text-sm font-black text-purple-400">
                                        {showFinancials ? `${profitMargin.toFixed(1)}%` : "•••%"}
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Search mobile */}
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Tìm mã đơn, khách hàng..."
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/15 rounded-2xl text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        {/* Time filter mobile */}
                        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                            {TIME_FILTERS.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setActiveTimeFilter(f.id)}
                                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl whitespace-nowrap transition-all ${activeTimeFilter === f.id
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                                        : "bg-white/10 text-slate-400"
                                    }`}
                                >{f.label}</button>
                            ))}
                        </div>
                    </div>

                    {/* ── FILTERS BAR ── */}
                    <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">
                        <div className="flex gap-1 flex-wrap">
                            {STATUS_FILTERS.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => onStatusChange?.(f.id)}
                                    className={`px-4 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-full border transition-all ${status === f.id
                                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                                    }`}
                                >{f.label}</button>
                            ))}
                        </div>

                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 hidden md:block" />

                        <div className="flex gap-1">
                            {[
                                { id: "all", label: "Tất cả TT", icon: null },
                                { id: "cash", label: "Tiền mặt", icon: Wallet },
                                { id: "bank", label: "Chuyển khoản", icon: CreditCard },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => onPaymentMethodFilterChange?.(f.id as "all" | "cash" | "bank")}
                                    className={`px-4 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-full border transition-all flex items-center gap-2 ${paymentMethodFilter === f.id
                                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md"
                                        : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                                    }`}
                                >
                                    {f.icon && <f.icon className="w-3.5 h-3.5" />}
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {activeTimeFilter === "custom" && (
                            <div className="flex items-center gap-2 ml-auto p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)}
                                    className="px-2 py-1 text-[11px] font-bold bg-transparent text-slate-900 dark:text-slate-100 outline-none" />
                                <ChevronRight className="w-3 h-3 text-slate-400" />
                                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)}
                                    className="px-2 py-1 text-[11px] font-bold bg-transparent text-slate-900 dark:text-slate-100 outline-none" />
                            </div>
                        )}

                        <div className="ml-auto hidden md:flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none group">
                                <div className="relative">
                                    <input type="checkbox" checked={keysetMode} onChange={e => onToggleKeyset?.(e.target.checked)} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-blue-500 transition-colors">Tải nhanh</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* ── CONTENT ── */}
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950/30 scrollbar-thin">
                    {filteredSales.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-6 animate-in fade-in duration-700">
                            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <ShoppingBag className="w-12 h-12 opacity-20" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-black uppercase tracking-[0.2em]">Không tìm thấy đơn hàng</p>
                                <p className="text-[11px] text-slate-500 mt-1">Vui lòng thử lại với bộ lọc khác</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 md:p-6">
                            {/* ── DESKTOP TABLE ── */}
                            <div className="hidden md:block overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                            <th className="text-left pl-6 pr-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] w-48">Đơn hàng</th>
                                            <th className="text-left px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] w-48">Khách hàng</th>
                                            <th className="text-left px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Chi tiết sản phẩm</th>
                                            <th className="text-center px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] w-32">Thanh toán</th>
                                            <th className="text-right px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] w-40">Giá trị</th>
                                            <th className="text-center px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] w-32">Trạng thái</th>
                                            <th className="pr-6 py-4 w-32"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                                                <tr key={sale.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all">
                                                    <td className="pl-6 pr-3 py-4 align-top">
                                                        <div className="flex flex-col gap-1.5">
                                                            <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-black font-mono bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 w-fit">
                                                                {sale.sale_code || "#" + sale.id.slice(0, 8)}
                                                            </span>
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-[11px] font-bold text-slate-900 dark:text-slate-200">{formatDate(new Date(sale.date))}</span>
                                                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">NV: {(sale as any).username || sale.userName || "—"}</span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-3 py-4 align-top">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                                                                {sale.customer.name}
                                                            </div>
                                                            {sale.customer.phone && (
                                                                <div className="text-[11px] font-bold text-slate-400">{sale.customer.phone}</div>
                                                            )}
                                                            {(() => {
                                                                const fullCustomer = customers.find(c => c.id === sale.customer.id);
                                                                const primaryVehicle = fullCustomer?.vehicles?.find((v: any) => v.isPrimary) || fullCustomer?.vehicles?.[0];
                                                                const plate = primaryVehicle?.licensePlate || fullCustomer?.licensePlate;
                                                                if (!plate) return null;
                                                                return (
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] font-black text-slate-500 border border-slate-200 dark:border-slate-700 w-fit mt-1 uppercase tracking-tighter">
                                                                        {plate}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    </td>

                                                    <td className="px-3 py-4 align-top">
                                                        <div className="space-y-1.5">
                                                            {displayItems.map((item, idx) => (
                                                                <div key={idx} className="flex items-center gap-2.5 group/item">
                                                                    <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[11px] font-black text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 flex-shrink-0">
                                                                        {item.quantity}
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[240px]">{item.partName}</span>
                                                                    <span className="text-[11px] font-bold text-slate-400 ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                                        {formatCurrency(item.sellingPrice)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {sale.items.length > 2 && (
                                                                <button onClick={() => toggleExpand(sale.id)} className="text-[10px] text-blue-600 hover:text-blue-700 font-black uppercase tracking-[0.1em] flex items-center gap-1 mt-2 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg transition-all">
                                                                    {isExpanded ? "Thu gọn" : `+${sale.items.length - 2} sản phẩm khác`}
                                                                    <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="px-3 py-4 align-top text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            {sale.paymentMethod === "cash" ? (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50 shadow-sm shadow-amber-500/10">
                                                                    <Wallet className="w-3.5 h-3.5" /> Tiền mặt
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 shadow-sm shadow-blue-500/10">
                                                                    <CreditCard className="w-3.5 h-3.5" /> Chuyển khoản
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="px-3 py-4 align-top text-right">
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="text-base font-black text-slate-950 dark:text-white tracking-tight">
                                                                {formatCurrency(sale.total)}
                                                            </div>
                                                            {hasDebt && (
                                                                <div className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">
                                                                    Nợ: {formatCurrency(remainingDebt)}
                                                                </div>
                                                            )}
                                                            <div className="text-[10px] font-bold text-slate-400">
                                                                {sale.items.length} món
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-3 py-4 align-top text-center">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                                                            <StatusIcon className="w-3.5 h-3.5" />
                                                            {statusCfg.label}
                                                        </span>
                                                    </td>

                                                    <td className="pr-6 py-4 align-top">
                                                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                            <button onClick={() => onPrintReceipt(sale)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300" title="In">
                                                                <Printer className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => onViewDetail(sale)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300" title="Chi tiết">
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            {canEdit && (
                                                                <button onClick={() => onEditSale(sale)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-amber-500 hover:text-white hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-300" title="Sửa">
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {canDelete && (
                                                                <button onClick={() => onDeleteSale(sale.id)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-500 hover:text-white hover:shadow-lg hover:shadow-rose-500/30 transition-all duration-300" title="Xóa">
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

                            {/* ── MOBILE LIST ── */}
                            <div className="md:hidden space-y-4">
                                {filteredSales.map((sale) => {
                                    const debt = customerDebts.find(d => d.order_id === sale.id);
                                    const hasDebt = debt && debt.remaining_amount > 0;
                                    const isExpanded = expandedSaleIds.has(sale.id);

                                    let statusKey: keyof typeof STATUS_CONFIG = "completed";
                                    if (hasDebt) statusKey = "debt";
                                    else if ((sale as any).status === "cancelled") statusKey = "cancelled";
                                    else if ((sale as any).status === "refunded") statusKey = "refunded";
                                    const statusCfg = STATUS_CONFIG[statusKey];
                                    const StatusIcon = statusCfg.icon;

                                    return (
                                        <div key={sale.id} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden active:scale-[0.98] transition-all">
                                            <div className="p-5">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="space-y-1.5">
                                                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black font-mono bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                                                            {sale.sale_code || "#" + sale.id.slice(0, 8)}
                                                        </span>
                                                        <div className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">{sale.customer.name}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(new Date(sale.date))}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xl font-black text-slate-950 dark:text-white leading-none">{formatCurrency(sale.total)}</div>
                                                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border mt-2 ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                                                            <StatusIcon className="w-2.5 h-2.5" />{statusCfg.label}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/50 space-y-2">
                                                    {(isExpanded ? sale.items : sale.items.slice(0, 2)).map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-3">
                                                            <div className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-blue-600 border border-slate-200 dark:border-slate-600 flex-shrink-0">
                                                                {item.quantity}
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex-1 truncate">{item.partName}</span>
                                                            <span className="text-[10px] font-black text-slate-400">{formatCurrency(item.sellingPrice)}</span>
                                                        </div>
                                                    ))}
                                                    {sale.items.length > 2 && (
                                                        <button onClick={() => toggleExpand(sale.id)} className="w-full text-center text-[10px] font-black uppercase tracking-widest text-blue-500 pt-2 border-t border-slate-200 dark:border-slate-700/50 mt-1">
                                                            {isExpanded ? "Thu gọn" : `+${sale.items.length - 2} sản phẩm nữa`}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex bg-slate-50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800">
                                                <button onClick={() => onViewDetail(sale)} className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-blue-500 border-r border-slate-100 dark:border-slate-800 active:bg-blue-50 transition-colors">Chi tiết</button>
                                                <button onClick={() => onPrintReceipt(sale)} className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500 border-r border-slate-100 dark:border-slate-800 active:bg-slate-100 transition-colors">In</button>
                                                {canEdit && <button onClick={() => onEditSale(sale)} className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-amber-600 border-r border-slate-100 dark:border-slate-800 active:bg-amber-50 transition-colors">Sửa</button>}
                                                {canDelete && <button onClick={() => onDeleteSale(sale.id)} className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-rose-500 active:bg-rose-50 transition-colors">Xóa</button>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── FOOTER ── */}
                <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        Trang <span className="text-slate-900 dark:text-white font-black">{page}</span> / {totalPages || 1} · {total} Đơn hàng
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                            <button onClick={onPrevPage} disabled={page === 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm disabled:opacity-20 transition-all">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button onClick={onNextPage} disabled={!hasMore} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm disabled:opacity-20 transition-all">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                        <select value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))}
                            className="hidden md:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/20 transition-all">
                            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / Trang</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

