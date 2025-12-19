import React, { useState } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie,
    Legend,
} from "recharts";
import {
    DollarSign,
    Wallet,
    Boxes,
    BriefcaseBusiness,
    ClipboardList,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Filter,
    ChevronDown,
    ChevronUp,
    Search,
    FileText,
} from "lucide-react";
import { formatCurrency, formatDate } from "../../utils/format";
import type { Sale } from "../../types";

// Helper functions for cash flow filtering
const excludedIncomeCategories = [
    "service", "dịch vụ", "sale_income", "bán hàng", "service_income", "service_deposit",
];
const excludedExpenseCategories = [
    "supplier_payment", "nhập kho", "nhập hàng", "goods_receipt", "import", "outsourcing", "service_cost", "refund",
];

const isExcludedIncomeCategory = (category: string | undefined | null) => {
    if (!category) return false;
    const lowerCat = category.toLowerCase().trim();
    return excludedIncomeCategories.some((exc) => exc.toLowerCase() === lowerCat);
};

const isExcludedExpenseCategory = (category: string | undefined | null) => {
    if (!category) return false;
    const lowerCat = category.toLowerCase().trim();
    return excludedExpenseCategories.some((exc) => exc.toLowerCase() === lowerCat);
};

interface ReportsManagerMobileProps {
    revenueReport: {
        sales: Sale[];
        workOrders: any[];
        dailyReport: any[];
        totalRevenue: number;
        totalCost: number;
        totalProfit: number;
        profitMargin: number | string;
        orderCount: number;
    };
    cashflowReport: {
        transactions: any[];
        totalIncome: number;
        totalExpense: number;
        netCashFlow: number;
        byCategory: Record<string, { income: number; expense: number }>;
    };
    inventoryReport: {
        parts: any[];
        totalValue: number;
        lowStockCount: number;
        lowStockItems: any[];
    };
    payrollReport: {
        records: any[];
        totalSalary: number;
        paidSalary: number;
        unpaidSalary: number;
        employeeCount: number;
    };
    debtReport: {
        customerDebts: any[];
        supplierDebts: any[];
        totalCustomerDebt: number;
        totalSupplierDebt: number;
        netDebt: number;
    };
    dateRange: string;
    setDateRange: (range: any) => void;
    activeTab: string;
    setActiveTab: (tab: any) => void;
    onExportExcel: () => void;
    selectedMonth: number;
    setSelectedMonth: (month: number) => void;
    startDate: string;
    setStartDate: (date: string) => void;
    endDate: string;
    setEndDate: (date: string) => void;
    onDateClick: (date: string) => void;
    cashTotals: {
        totalIncome: number;
        totalExpense: number;
    };
}

export const ReportsManagerMobile: React.FC<ReportsManagerMobileProps> = ({
    revenueReport,
    cashflowReport,
    inventoryReport,
    payrollReport,
    debtReport,
    dateRange,
    setDateRange,
    activeTab,
    setActiveTab,
    onExportExcel,
    selectedMonth,
    setSelectedMonth,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    onDateClick,
    cashTotals,
}) => {
    const [showFilters, setShowFilters] = useState(false);
    const [showReportMenu, setShowReportMenu] = useState(false);

    // Helper to get tab label
    const getTabLabel = (tab: string) => {
        switch (tab) {
            case "revenue":
                return "Doanh thu";
            case "cashflow":
                return "Thu chi";
            case "inventory":
                return "Tồn kho";
            case "payroll":
                return "Lương";
            case "debt":
                return "Công nợ";
            case "tax":
                return "Thuế";
            default:
                return "Báo cáo";
        }
    };

    // Helper to get date range label
    const getDateRangeLabel = (range: string) => {
        switch (range) {
            case "today":
                return "Hôm nay";
            case "week":
                return "7 ngày qua";
            case "month":
                return "Tháng này";
            case "quarter":
                return "Quý này";
            case "year":
                return "Năm nay";
            case "custom":
                return "Tùy chỉnh";
            default:
                return range;
        }
    };

    // Custom Tooltip for Charts
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#1e1e2d] border border-slate-700 p-3 rounded-lg shadow-xl">
                    <p className="text-slate-300 text-xs mb-1">{formatDate(label)}</p>
                    {payload.map((entry: any, index: number) => (
                        <p
                            key={index}
                            className="text-xs font-bold"
                            style={{ color: entry.color }}
                        >
                            {entry.name}: {formatCurrency(entry.value)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const renderRevenueTab = () => (
        <div className="space-y-4 pb-20">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 border border-blue-500/30 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-blue-500/20 rounded-lg">
                            <DollarSign className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="text-xs text-blue-300 font-medium">Doanh thu</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                        {formatCurrency(revenueReport.totalRevenue + cashTotals.totalIncome).replace("₫", "")}
                        <span className="text-xs text-slate-400 font-normal ml-1">đ</span>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-600/20 to-green-900/20 border border-green-500/30 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-green-500/20 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-green-400" />
                        </div>
                        <span className="text-xs text-green-300 font-medium">Lợi nhuận</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                        {formatCurrency(revenueReport.totalProfit).replace("₫", "")}
                        <span className="text-xs text-slate-400 font-normal ml-1">đ</span>
                    </div>
                </div>
            </div>

            {/* Net Profit Card */}
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-900/20 border border-purple-500/30 p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-purple-500/20 rounded-lg">
                        <Wallet className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-xs text-purple-300 font-medium">Lợi nhuận ròng</span>
                </div>
                <div className="text-lg font-bold text-white">
                    {formatCurrency(
                        (revenueReport.totalProfit + cashTotals.totalIncome) - cashTotals.totalExpense
                    ).replace("₫", "")}
                    <span className="text-xs text-slate-400 font-normal ml-1">đ</span>
                </div>
                <div className="text-[10px] text-purple-300/70 mt-1">
                    (Lợi nhuận + Thu khác) - Chi phí
                </div>
            </div>

            {/* Chart */}
            <div className="bg-[#1e1e2d] border border-slate-700/50 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    Xu hướng doanh thu
                </h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={revenueReport.dailyReport}
                            margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(date) => new Date(date).getDate().toString()}
                                stroke="#94a3b8"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={10}
                                tickFormatter={(val) => `${val / 1000000}M`}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="totalRevenue"
                                name="Doanh thu"
                                stroke="#3b82f6"
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                                strokeWidth={2}
                            />
                            <Area
                                type="monotone"
                                dataKey="totalProfit"
                                name="Lợi nhuận"
                                stroke="#10b981"
                                fillOpacity={1}
                                fill="url(#colorProfit)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
            {/* Daily List */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Chi tiết theo ngày
                </h3>
                {revenueReport.dailyReport.map((day, idx) => {
                    // Calculate daily cash flow
                    const dailyTransactions = cashflowReport.transactions.filter(t => {
                        const tDate = new Date(t.date);
                        const dDate = new Date(day.date);
                        return tDate.getDate() === dDate.getDate() &&
                            tDate.getMonth() === dDate.getMonth() &&
                            tDate.getFullYear() === dDate.getFullYear();
                    });

                    const dailyOtherIncome = dailyTransactions
                        .filter(t => t.type === 'income' && !isExcludedIncomeCategory(t.category))
                        .reduce((sum, t) => sum + t.amount, 0);

                    const dailyOtherExpense = dailyTransactions
                        .filter(t => t.type === 'expense' && t.amount > 0 && !isExcludedExpenseCategory(t.category))
                        .reduce((sum, t) => sum + t.amount, 0);

                    const dailyNetProfit = day.totalProfit + dailyOtherIncome - dailyOtherExpense;

                    return (
                        <button
                            key={idx}
                            onClick={() => onDateClick(day.date)}
                            className="w-full bg-[#1e1e2d] border border-slate-700/50 p-4 rounded-xl flex flex-col gap-3 active:scale-[0.98] transition-transform"
                        >
                            <div className="flex items-center justify-between w-full border-b border-slate-700/50 pb-3">
                                <div className="text-left">
                                    <div className="text-sm font-bold text-white">
                                        {formatDate(day.date)}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-0.5">
                                        {day.orderCount} đơn hàng
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-400 mb-0.5">Lợi nhuận ròng</div>
                                    <div className="text-sm font-bold text-purple-400">
                                        {formatCurrency(dailyNetProfit).replace("₫", "")}đ
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400">Doanh thu</span>
                                    <span className="text-xs font-medium text-blue-400">
                                        {formatCurrency(day.totalRevenue).replace("₫", "")}đ
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400">Lợi nhuận</span>
                                    <span className="text-xs font-medium text-green-400">
                                        {formatCurrency(day.totalProfit).replace("₫", "")}đ
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400">Thu khác</span>
                                    <span className="text-xs font-medium text-emerald-400">
                                        {formatCurrency(dailyOtherIncome).replace("₫", "")}đ
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400">Chi khác</span>
                                    <span className="text-xs font-medium text-red-400">
                                        {formatCurrency(dailyOtherExpense).replace("₫", "")}đ
                                    </span>
                                </div>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    );

    const renderCashflowTab = () => (
        <div className="space-y-4 pb-20">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1e1e2d] border border-slate-700/50 p-4 rounded-2xl">
                    <div className="text-xs text-slate-400 mb-1">Tổng thu</div>
                    <div className="text-lg font-bold text-green-400">
                        {formatCurrency(cashflowReport.totalIncome)}
                    </div>
                </div>
                <div className="bg-[#1e1e2d] border border-slate-700/50 p-4 rounded-2xl">
                    <div className="text-xs text-slate-400 mb-1">Tổng chi</div>
                    <div className="text-lg font-bold text-red-400">
                        {formatCurrency(cashflowReport.totalExpense)}
                    </div>
                </div>
            </div>

            {/* Net Cashflow */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 p-5 rounded-2xl flex items-center justify-between">
                <div>
                    <div className="text-sm text-slate-400 font-medium">Dòng tiền ròng</div>
                    <div className={`text-2xl font-bold mt-1 ${cashflowReport.netCashFlow >= 0 ? "text-blue-400" : "text-orange-400"}`}>
                        {formatCurrency(cashflowReport.netCashFlow)}
                    </div>
                </div>
                <div className={`p-3 rounded-full ${cashflowReport.netCashFlow >= 0 ? "bg-blue-500/20" : "bg-orange-500/20"}`}>
                    <Wallet className={`w-6 h-6 ${cashflowReport.netCashFlow >= 0 ? "text-blue-400" : "text-orange-400"}`} />
                </div>
            </div>

            {/* Categories */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Theo danh mục
                </h3>
                {Object.entries(cashflowReport.byCategory).map(([cat, val], idx) => (
                    <div key={idx} className="bg-[#1e1e2d] border border-slate-700/50 p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-white capitalize">{cat}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase">Thu</div>
                                <div className="text-sm font-bold text-green-400">
                                    {formatCurrency(val.income)}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-slate-500 uppercase">Chi</div>
                                <div className="text-sm font-bold text-red-400">
                                    {formatCurrency(val.expense)}
                                </div>
                            </div>
                        </div>
                        {/* Mini Bar */}
                        <div className="mt-3 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden flex">
                            <div
                                className="h-full bg-green-500"
                                style={{ width: `${(val.income / (val.income + val.expense || 1)) * 100}%` }}
                            />
                            <div
                                className="h-full bg-red-500"
                                style={{ width: `${(val.expense / (val.income + val.expense || 1)) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderInventoryTab = () => (
        <div className="space-y-4 pb-20">
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-900/20 border border-purple-500/30 p-5 rounded-2xl text-center">
                <div className="text-sm text-purple-300 font-medium mb-2">Tổng giá trị tồn kho</div>
                <div className="text-3xl font-bold text-white">
                    {formatCurrency(inventoryReport.totalValue).replace("₫", "")}
                    <span className="text-sm text-purple-300 font-normal ml-1">đ</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1e1e2d] border border-slate-700/50 p-4 rounded-2xl">
                    <div className="text-xs text-slate-400 mb-1">Tổng sản phẩm</div>
                    <div className="text-xl font-bold text-white">{inventoryReport.parts.length}</div>
                </div>
                <div className="bg-[#1e1e2d] border border-slate-700/50 p-4 rounded-2xl">
                    <div className="text-xs text-slate-400 mb-1">Sắp hết hàng</div>
                    <div className="text-xl font-bold text-orange-400">{inventoryReport.lowStockCount}</div>
                </div>
            </div>

            {inventoryReport.lowStockCount > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                        <Search className="w-4 h-4" /> Cần nhập hàng
                    </h3>
                    {inventoryReport.lowStockItems.map((item, idx) => (
                        <div key={idx} className="bg-[#1e1e2d] border border-slate-700/50 p-4 rounded-xl flex justify-between items-center">
                            <div>
                                <div className="text-sm font-bold text-white">{item.name}</div>
                                <div className="text-xs text-slate-500 mt-1">Giá nhập: {formatCurrency(item.price)}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-400">Tồn</div>
                                <div className="text-lg font-bold text-red-400">{item.stock}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="md:hidden min-h-screen bg-[#151521] text-white">
            {/* Header with Dropdown Selector */}
            <div className="sticky top-0 z-20 bg-[#151521]/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="relative">
                        <button
                            onClick={() => setShowReportMenu(!showReportMenu)}
                            className="flex items-center gap-2 text-lg font-bold text-white active:scale-95 transition-transform"
                        >
                            Báo cáo: <span className="text-blue-400">{getTabLabel(activeTab)}</span>
                            {showReportMenu ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </button>

                        {/* Dropdown Menu */}
                        {showReportMenu && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setShowReportMenu(false)} />
                                <div className="absolute top-full left-0 mt-2 w-56 bg-[#1e1e2d] border border-slate-700 rounded-xl shadow-2xl z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    {["revenue", "cashflow", "inventory", "debt", "payroll", "tax"].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => {
                                                setActiveTab(tab);
                                                setShowReportMenu(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-3 transition-colors ${activeTab === tab
                                                ? "bg-blue-600/10 text-blue-400"
                                                : "text-slate-300 hover:bg-slate-800"
                                                }`}
                                        >
                                            {tab === "revenue" && <DollarSign className="w-4 h-4" />}
                                            {tab === "cashflow" && <Wallet className="w-4 h-4" />}
                                            {tab === "inventory" && <Boxes className="w-4 h-4" />}
                                            {tab === "debt" && <ClipboardList className="w-4 h-4" />}
                                            {tab === "payroll" && <BriefcaseBusiness className="w-4 h-4" />}
                                            {tab === "tax" && <FileText className="w-4 h-4" />}
                                            {getTabLabel(tab)}
                                            {activeTab === tab && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={onExportExcel}
                        className="p-2 bg-green-600/20 text-green-400 rounded-lg active:scale-95 transition-transform"
                    >
                        <FileText className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="px-4 py-3">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full flex items-center justify-between bg-[#1e1e2d] border border-slate-700 p-3 rounded-xl"
                >
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        {getDateRangeLabel(dateRange)}
                        {dateRange === "month" && ` ${selectedMonth}`}
                    </div>
                    {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showFilters && (
                    <div className="mt-2 bg-[#1e1e2d] border border-slate-700 rounded-xl p-3 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-3 gap-2">
                            {["today", "week", "month", "quarter", "year", "custom"].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => {
                                        setDateRange(range);
                                        if (range !== "month" && range !== "custom") setShowFilters(false);
                                    }}
                                    className={`p-2 rounded-lg text-xs font-medium ${dateRange === range
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-800 text-slate-400"
                                        }`}
                                >
                                    {getDateRangeLabel(range)}
                                </button>
                            ))}
                        </div>

                        {dateRange === "month" && (
                            <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-6 gap-2">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => {
                                            setSelectedMonth(m);
                                            setShowFilters(false);
                                        }}
                                        className={`p-2 rounded-lg text-xs font-bold ${selectedMonth === m
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-800 text-slate-400"
                                            }`}
                                    >
                                        T{m}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="px-4">
                {activeTab === "revenue" && renderRevenueTab()}
                {activeTab === "cashflow" && renderCashflowTab()}
                {activeTab === "inventory" && renderInventoryTab()}
                {activeTab === "debt" && (
                    <div className="text-center py-10 text-slate-500">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Tính năng đang được cập nhật giao diện mobile</p>
                    </div>
                )}
                {activeTab === "payroll" && (
                    <div className="text-center py-10 text-slate-500">
                        <BriefcaseBusiness className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Tính năng đang được cập nhật giao diện mobile</p>
                    </div>
                )}
            </div>
        </div>
    );
};
