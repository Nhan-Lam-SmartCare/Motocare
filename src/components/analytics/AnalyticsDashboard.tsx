import React, { useState, useMemo } from "react";
import {
  Boxes,
  LineChart,
  HandCoins,
  AlertTriangle,
  FileText,
  Wrench,
  Users,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useAppContext } from "../../contexts/AppContext";
import InventoryAnalytics from "./InventoryAnalytics";
import SalesAnalytics from "./SalesAnalytics";
import FinancialAnalytics from "./FinancialAnalytics";
import ServiceAnalytics from "./ServiceAnalytics";
import CustomerAnalytics from "./CustomerAnalytics";
import KPICards from "./KPICards";
import {
  exportInventoryReport,
  exportSalesReport,
  exportFinancialReport,
  exportLowStockReport,
} from "../../utils/pdfExport";
import { showToast } from "../../utils/toast";
import { formatCurrency } from "../../utils/format";

// === FRESH DATA HOOKS (Real-time from Supabase) ===
import { useSalesRepo } from "../../hooks/useSalesRepository";
import { usePartsRepo } from "../../hooks/usePartsRepository";
import { useWorkOrdersRepo } from "../../hooks/useWorkOrdersRepository";
import { useCustomerDebtsRepo, useSupplierDebtsRepo } from "../../hooks/useDebtsRepository";
import { useInventoryTxRepo } from "../../hooks/useInventoryTransactionsRepository";
import { useCashTxRepo } from "../../hooks/useCashTransactionsRepository";

type TabType = "inventory" | "sales" | "financial" | "services" | "customers";

import { getDateRange } from "../../utils/dateUtils";

import { calculateFinancialSummary } from "../../lib/reports/financialSummary";

// Helper to get date range from filter (MOVED TO UTILS)
// const getDateRange = ... (removed)

// Get previous period for comparison
const getPreviousPeriodRange = (filter: string): { startDate: Date; endDate: Date } => {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (filter === "month" || filter === "Tháng này") {
    // Previous month
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  } else if (filter === "year") {
    // Previous year
    startDate = new Date(now.getFullYear() - 1, 0, 1);
    endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
  } else if (filter === "7days") {
    // Previous 7 days
    startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    endDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 - 1);
  } else {
    // Default: previous month
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  }

  return { startDate, endDate };
};

// Skeleton Loading Component
const AnalyticsSkeleton: React.FC = () => (
  <div className="animate-pulse">
    {/* KPI Cards Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div className="h-36 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
      <div className="h-36 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
    </div>
    {/* Chart Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
      <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
    </div>
  </div>
);

const AnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("inventory");
  const [dateFilter, setDateFilter] = useState<string>("month");

  // Get currentBranchId and customers from Context (customers don't have a separate hook)
  const { currentBranchId, customers } = useAppContext();

  // === FETCH FRESH DATA FROM HOOKS (Real-time from Supabase) ===
  const { data: sales = [], isLoading: salesLoading } = useSalesRepo();
  const { data: parts = [], isLoading: partsLoading } = usePartsRepo();
  const { data: workOrders = [], isLoading: workOrdersLoading } = useWorkOrdersRepo();
  const { data: customerDebts = [], isLoading: customerDebtsLoading } = useCustomerDebtsRepo();
  const { data: supplierDebts = [], isLoading: supplierDebtsLoading } = useSupplierDebtsRepo();
  const { data: inventoryTransactions = [], isLoading: txLoading } = useInventoryTxRepo();

  // Fetch ALL cash transactions for the branch from the earliest relevant date (start of last year)
  // We need "Last Year" data for YoY comparison
  const lastYearStart = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1, 0, 1); // Jan 1st last year
    return d.toISOString();
  }, []);

  const { data: cashTransactions = [], isLoading: cashTxLoading } = useCashTxRepo({
    branchId: currentBranchId,
    startDate: lastYearStart,
    // No endDate implies "to now"
  });

  const isLoading = salesLoading || partsLoading || workOrdersLoading ||
    customerDebtsLoading || supplierDebtsLoading || txLoading || cashTxLoading;

  // Get date range from filter
  const currentDateRange = useMemo(() => getDateRange(dateFilter), [dateFilter]);
  const previousDateRange = useMemo(() => getPreviousPeriodRange(dateFilter), [dateFilter]);

  const normalizeRange = (startDate: Date, endDate: Date) => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  // === STATS CALCULATION (filtered by date range) ===
  const { currentStats, previousStats } = useMemo(() => {
    const calculateStats = (startDate: Date, endDate: Date) => {
      const { start, end } = normalizeRange(startDate, endDate);
      const summary = calculateFinancialSummary({
        sales,
        workOrders,
        parts,
        cashTransactions,
        branchId: currentBranchId,
        start,
        end,
      });

      return { revenue: summary.combinedRevenue, profit: summary.netProfit };
    };

    return {
      currentStats: calculateStats(currentDateRange.startDate, currentDateRange.endDate),
      previousStats: calculateStats(previousDateRange.startDate, previousDateRange.endDate),
    };
  }, [sales, workOrders, parts, cashTransactions, currentBranchId, currentDateRange, previousDateRange]);

  // === 6-MONTH TREND DATA FOR SPARKLINE ===
  const monthlyTrendData = useMemo(() => {
    const now = new Date();
    const result: { month: string; revenue: number; profit: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59, 999);
      const { start, end } = normalizeRange(targetMonth, monthEnd);

      const summary = calculateFinancialSummary({
        sales,
        workOrders,
        parts,
        cashTransactions,
        branchId: currentBranchId,
        start,
        end,
      });

      result.push({
        month: targetMonth.toLocaleDateString('vi-VN', { month: 'short' }),
        revenue: Math.round(summary.combinedRevenue / 1000000), // In millions
        profit: Math.round(summary.netProfit / 1000000),
      });
    }
    return result;
  }, [sales, workOrders, parts, cashTransactions, currentBranchId]);

  // === PERFORMANCE COMPARISON ===

  // Month over Month comparison
  const monthOverMonth = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const calculateRevenue = (startDate: Date, endDate: Date) => {
      const { start, end } = normalizeRange(startDate, endDate);
      return calculateFinancialSummary({
        sales,
        workOrders,
        parts,
        cashTransactions,
        branchId: currentBranchId,
        start,
        end,
      }).combinedRevenue;
    };

    const thisMonth = calculateRevenue(thisMonthStart, thisMonthEnd);
    const lastMonth = calculateRevenue(lastMonthStart, lastMonthEnd);
    const change = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth * 100) : 0;

    return { thisMonth, lastMonth, change };
  }, [sales, workOrders, parts, cashTransactions, currentBranchId]);

  // Year over Year comparison
  const yearOverYear = useMemo(() => {
    const now = new Date();
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    const thisYearEnd = now;
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59);

    const calculateRevenue = (startDate: Date, endDate: Date) => {
      const { start, end } = normalizeRange(startDate, endDate);
      return calculateFinancialSummary({
        sales,
        workOrders,
        parts,
        cashTransactions,
        branchId: currentBranchId,
        start,
        end,
      }).combinedRevenue;
    };

    const thisYear = calculateRevenue(thisYearStart, thisYearEnd);
    const lastYear = calculateRevenue(lastYearStart, lastYearEnd);
    const change = lastYear > 0 ? ((thisYear - lastYear) / lastYear * 100) : 0;

    return { thisYear, lastYear, change };
  }, [sales, workOrders, parts, cashTransactions, currentBranchId]);

  // === FORECAST CHART DATA ===
  const forecastChartData = useMemo(() => {
    // Default empty state matching the expected shape
    const emptyResult = {
      data: [] as { month: string; actual: number | null; projected: number | null }[],
      growthRate: 0
    };

    if (monthlyTrendData.length < 2) return emptyResult;

    // 1. Format Historical Data
    const data: { month: string; actual: number | null; projected: number | null }[] = monthlyTrendData.map(d => ({
      month: d.month,
      actual: d.revenue,
      projected: null as number | null,
    }));

    // 2. Calculate Projections (Next 3 Months)
    const recentMonths = monthlyTrendData.slice(-3);
    const avgGrowth = recentMonths.reduce((sum, m, i) => {
      if (i === 0) return 0;
      const prev = recentMonths[i - 1].revenue;
      return sum + (prev > 0 ? (m.revenue - prev) / prev : 0);
    }, 0) / (recentMonths.length - 1);

    // Limit extreme growth rates for visual sanity (-20% to +20%)
    const clampedGrowth = Math.max(-0.2, Math.min(0.2, avgGrowth));

    let lastRevenue = monthlyTrendData[monthlyTrendData.length - 1].revenue;

    // Add last actual point as start of projection line (for continuity)
    const lastMonth = data[data.length - 1];
    if (lastMonth) {
      lastMonth.projected = lastMonth.actual;
    }

    const now = new Date();
    for (let i = 1; i <= 3; i++) {
      const nextRevenue = Math.round(lastRevenue * (1 + clampedGrowth));
      const nextDate = new Date(now.getFullYear(), now.getMonth() + i, 1);

      data.push({
        month: `T${nextDate.getMonth() + 1}`,
        actual: null,
        projected: nextRevenue
      });
      lastRevenue = nextRevenue;
    }

    return { data, growthRate: clampedGrowth * 100 };
  }, [monthlyTrendData]);

  // Mobile Collapsible Section
  const CollapsibleSection = ({ title, icon, children, defaultOpen = true }: { title: string, icon?: React.ReactNode, children: React.ReactNode, defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
      <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            {icon} {title}
          </h3>
          <div className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-400">
              <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>
        {isOpen && (
          <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-700/50">
            {children}
          </div>
        )}
      </div>
    );
  };

  const handleExportPDF = () => {
    try {
      switch (activeTab) {
        case "inventory":
          exportInventoryReport(parts, currentBranchId);
          showToast.success("Đã xuất báo cáo tồn kho thành công!");
          break;
        case "sales":
          exportSalesReport(sales, parts);
          showToast.success("Đã xuất báo cáo bán hàng thành công!");
          break;
        case "financial":
          exportFinancialReport(
            sales,
            inventoryTransactions,
            parts,
            currentBranchId,
            customerDebts,
            supplierDebts
          );
          showToast.success("Đã xuất báo cáo tài chính thành công!");
          break;
      }
    } catch (error) {
      console.error("Export error:", error);
      showToast.error("Lỗi khi xuất báo cáo PDF");
    }
  };

  const handleExportLowStock = () => {
    try {
      exportLowStockReport(parts, currentBranchId);
      showToast.success("Đã xuất báo cáo cảnh báo tồn kho!");
    } catch (error) {
      console.error("Export error:", error);
      showToast.error("Lỗi khi xuất báo cáo");
    }
  };

  const tabs = [
    { id: "inventory" as const, label: "Tồn kho", icon: <Boxes className="w-4 h-4" /> },
    { id: "sales" as const, label: "Bán hàng", icon: <HandCoins className="w-4 h-4" /> },
    { id: "financial" as const, label: "Tài chính", icon: <LineChart className="w-4 h-4" /> },
    { id: "services" as const, label: "Dịch vụ", icon: <Wrench className="w-4 h-4" /> },
    { id: "customers" as const, label: "Khách hàng", icon: <Users className="w-4 h-4" /> },
  ];

  // Show loading state with skeleton
  if (isLoading) {
    return (
      <div className="p-4 max-w-[1600px] mx-auto">
        <div className="mb-4">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2 animate-pulse"></div>
          <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
        </div>
        <AnalyticsSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Báo cáo & Phân tích
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Theo dõi và phân tích hiệu suất kinh doanh
            </p>
          </div>

          {/* Filter & Export Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Filter Dropdown */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
              <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-sm bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-200 cursor-pointer pr-6 dark:[color-scheme:dark] [&>optgroup]:bg-white [&>optgroup]:text-slate-900 dark:[&>optgroup]:bg-slate-800 dark:[&>optgroup]:text-slate-200"
              >
                <optgroup label="Thời gian">
                  <option value="today">Hôm nay</option>
                  <option value="7days">7 ngày qua</option>
                  <option value="week">Tuần này</option>
                  <option value="month">Tháng này</option>
                  <option value="year">Năm nay</option>
                </optgroup>
                <optgroup label="Theo tháng">
                  <option value="month1">Tháng 1</option>
                  <option value="month2">Tháng 2</option>
                  <option value="month3">Tháng 3</option>
                  <option value="month4">Tháng 4</option>
                  <option value="month5">Tháng 5</option>
                  <option value="month6">Tháng 6</option>
                  <option value="month7">Tháng 7</option>
                  <option value="month8">Tháng 8</option>
                  <option value="month9">Tháng 9</option>
                  <option value="month10">Tháng 10</option>
                  <option value="month11">Tháng 11</option>
                  <option value="month12">Tháng 12</option>
                </optgroup>
                <optgroup label="Theo quý">
                  <option value="q1">Quý 1 (T1-T3)</option>
                  <option value="q2">Quý 2 (T4-T6)</option>
                  <option value="q3">Quý 3 (T7-T9)</option>
                  <option value="q4">Quý 4 (T10-T12)</option>
                </optgroup>
              </select>
            </div>

            {activeTab === "inventory" && (
              <button
                onClick={handleExportLowStock}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors flex items-center gap-1.5 text-sm"
              >
                <AlertTriangle className="w-4 h-4" /> Cảnh báo tồn kho
              </button>
            )}
            {(activeTab === "inventory" || activeTab === "sales" || activeTab === "financial") && (
              <button
                onClick={handleExportPDF}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-1.5 text-sm"
              >
                <FileText className="w-4 h-4" /> Xuất PDF
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards - With comparison to previous period */}
        <div className="mb-4">
          <KPICards
            currentRevenue={currentStats.revenue}
            currentProfit={currentStats.profit}
            previousRevenue={previousStats.revenue}
            previousProfit={previousStats.profit}
            dateRange={{
              label: currentDateRange.label,
              from: currentDateRange.startDate,
              to: currentDateRange.endDate
            }}
          />
        </div>

        {/* Main Analytics Grid - Chart & Comparisons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column: 6-Month Revenue Trend Chart (Larger) */}
          <div className="lg:col-span-2">
            <CollapsibleSection title="Xu hướng & Dự báo" icon={<LineChart className="w-5 h-5 text-blue-500" />}>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastChartData.data.length > 0 ? forecastChartData.data : monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <pattern id="patternProjected" patternUnits="userSpaceOnUse" width="4" height="4">
                        <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#8b5cf6" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke="#94a3b8"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      width={35}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "13px",
                        padding: "8px 12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === "actual") return [`${value}M ₫`, "Doanh thu thực tế"];
                        if (name === "projected") return [`${value}M ₫`, "Dự báo"];
                        return [value, name];
                      }}
                      labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      strokeWidth={3}
                      name="actual"
                      connectNulls
                    />
                    <Area
                      type="monotone"
                      dataKey="projected"
                      stroke="#8b5cf6"
                      strokeDasharray="5 5"
                      fill="none"
                      strokeWidth={3}
                      name="projected"
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="font-medium">Thực tế</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="w-8 h-0.5 border-t-2 border-dashed border-violet-500"></div>
                  <span className="font-medium flex items-center gap-1">
                    Dự báo
                    <span className={`text-xs px-1.5 py-0.5 rounded ${forecastChartData.growthRate >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {forecastChartData.growthRate > 0 ? '+' : ''}{forecastChartData.growthRate.toFixed(1)}%
                    </span>
                  </span>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Right Column: Performance Comparisons (Stacked) */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            {/* Month over Month */}
            <div className="bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
                Tháng này vs Tháng trước
              </div>
              <div className="flex items-end justify-between mt-2">
                <div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(monthOverMonth.thisMonth)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Tháng trước: {formatCurrency(monthOverMonth.lastMonth)}
                  </div>
                </div>
                <div className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded bg-opacity-10 ${monthOverMonth.change >= 0 ? 'bg-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-red-500 text-red-600 dark:text-red-400'
                  }`}>
                  <span>{monthOverMonth.change >= 0 ? '▲' : '▼'}</span>
                  <span>{Math.abs(monthOverMonth.change).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Year over Year */}
            <div className="bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
                Năm nay vs Năm ngoái (YTD)
              </div>
              <div className="flex items-end justify-between mt-2">
                <div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(yearOverYear.thisYear)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Năm ngoái: {formatCurrency(yearOverYear.lastYear)}
                  </div>
                </div>
                <div className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded bg-opacity-10 ${yearOverYear.change >= 0 ? 'bg-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-red-500 text-red-600 dark:text-red-400'
                  }`}>
                  <span>{yearOverYear.change >= 0 ? '▲' : '▼'}</span>
                  <span>{Math.abs(yearOverYear.change).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Profit Margin Efficiency - Fills the gap */}
            <div className="bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors flex-1 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Hiệu suất lợi nhuận
                </div>
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <HandCoins className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {currentStats.revenue > 0 ? ((currentStats.profit / currentStats.revenue) * 100).toFixed(1) : 0}%
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">Biên lợi nhuận ròng</span>
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span>Mức an toàn (20%)</span>
                  <span>{currentStats.revenue > 0 ? ((currentStats.profit / currentStats.revenue) * 100).toFixed(1) : 0}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${(currentStats.revenue > 0 ? (currentStats.profit / currentStats.revenue) : 0) >= 0.2
                        ? 'bg-emerald-500'
                        : (currentStats.revenue > 0 ? (currentStats.profit / currentStats.revenue) : 0) >= 0.1
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                    style={{ width: `${Math.min(100, Math.max(0, (currentStats.revenue > 0 ? (currentStats.profit / currentStats.revenue) * 100 : 0)))}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Tỷ suất lợi nhuận ròng trên tổng doanh thu
                </p>
              </div>
            </div>

            {/* Third Card - could be expense summary or something else, but visual balance is good with just 2 if forecast is merged into chart */}
          </div>
        </div>

        {/* Tabs */}
        {/* Tabs - Pill Style */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-lg font-medium transition-all text-sm whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
            >
              <span className={activeTab === tab.id ? "text-white" : "text-slate-500 dark:text-slate-400"}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content - All children receive fresh data + dateFilter as props */}
      <div className="animate-fadeIn">
        {activeTab === "inventory" && (
          <InventoryAnalytics
            sales={sales}
            workOrders={workOrders}
            parts={parts}
            inventoryTransactions={inventoryTransactions}
            currentBranchId={currentBranchId}
            dateFilter={dateFilter}
          />
        )}
        {activeTab === "sales" && (
          <SalesAnalytics
            sales={sales}
            workOrders={workOrders}
            parts={parts}
            currentBranchId={currentBranchId}
            dateFilter={dateFilter}
          />
        )}
        {activeTab === "financial" && (
          <FinancialAnalytics
            sales={sales}
            workOrders={workOrders}
            parts={parts}
            customerDebts={customerDebts}
            supplierDebts={supplierDebts}
            currentBranchId={currentBranchId}
            dateFilter={dateFilter}
          />
        )}
        {activeTab === "services" && (
          <ServiceAnalytics
            workOrders={workOrders}
            currentBranchId={currentBranchId}
            dateFilter={dateFilter}
          />
        )}
        {activeTab === "customers" && (
          <CustomerAnalytics
            customers={customers}
            sales={sales}
            workOrders={workOrders}
            parts={parts}
            currentBranchId={currentBranchId}
            dateFilter={dateFilter}
          />
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
