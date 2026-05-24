import React, { useState, useMemo } from "react";
import {
  DollarSign,
  Wallet,
  Boxes,
  BadgePercent,
  ClipboardList,
  Users,
  FileSpreadsheet,
  TrendingUp,
  Tag,
  Check,
  BriefcaseBusiness,
  FileText,
  Clock,
  Building,
  AlertTriangle,
  Calendar,
  Wrench,
  ShoppingBag,
  ArrowRightLeft,
  CheckCircle2,
} from "lucide-react";
import { useAppContext } from "../../contexts/AppContext";
import { useSalesRepo } from "../../hooks/useSalesRepository";
import { useCashTxRepo } from "../../hooks/useCashTransactionsRepository";
import { usePartsRepo } from "../../hooks/usePartsRepository";
import { useWorkOrders } from "../../hooks/useSupabase";
import {
  useCustomerDebtsRepo,
  useSupplierDebtsRepo,
} from "../../hooks/useDebtsRepository";
import { supabase } from "../../supabaseClient";
import type { Sale, Part } from "../../types";
import { showToast } from "../../utils/toast";
import { formatCurrency, formatDate } from "../../utils/format";
import {
  exportRevenueReport,
  exportCashflowReport,
  exportInventoryReport,
  exportPayrollReport,
  exportDebtReport,
  exportTopProductsReport,
  exportProductProfitReport,
  exportDetailedInventoryReport,
} from "../../utils/excelExport";
import { ReportsManagerMobile } from "../reports/ReportsManagerMobile";
import TaxReportExport from "../reports/TaxReportExport";
import { useDailyFinancials } from "./hooks/useDailyFinancials";

import {
  calculateFinancialSummary,
  REPORTS_EXCLUDED_EXPENSE_CATEGORIES,
  REPORTS_EXCLUDED_INCOME_CATEGORIES,
  isExcludedExpenseCategory,
  isExcludedIncomeCategory,
  isRefundCategory,
} from "../../lib/reports/financialSummary";

import {
  formatCashTxCategory,
  getCashTxCategoryKey,
} from "../../lib/finance/cashTxCategories";
import { useTheme } from "../../contexts/ThemeContext";



type ReportTab =
  | "revenue"
  | "cashflow"
  | "inventory"
  | "payroll"
  | "debt"
  | "tax";
type DateRange = "today" | "week" | "month" | "quarter" | "year" | "custom";

const REPORT_TAB_CONFIGS: Array<{
  key: ReportTab;
  label: string;
  icon: React.ReactNode;
  activeClass: string;
  inactiveClass: string;
  dotClass: string;
}> = [
    {
      key: "revenue",
      label: "Doanh thu",
      icon: <DollarSign className="w-4 h-4" />,
      activeClass:
        "bg-gradient-to-r from-blue-600 to-sky-500 text-white border-transparent shadow-lg shadow-blue-500/30",
      inactiveClass:
        "bg-transparent dark:bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-700",
      dotClass: "bg-blue-400",
    },
    {
      key: "cashflow",
      label: "Thu chi",
      icon: <Wallet className="w-4 h-4" />,
      activeClass:
        "bg-gradient-to-r from-emerald-500 to-lime-500 text-white border-transparent shadow-lg shadow-emerald-500/30",
      inactiveClass:
        "bg-transparent dark:bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-700",
      dotClass: "bg-emerald-400",
    },
    {
      key: "inventory",
      label: "Tồn kho",
      icon: <Boxes className="w-4 h-4" />,
      activeClass:
        "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-lg shadow-orange-500/30",
      inactiveClass:
        "bg-transparent dark:bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-700",
      dotClass: "bg-amber-400",
    },
    {
      key: "payroll",
      label: "Lương",
      icon: <BriefcaseBusiness className="w-4 h-4" />,
      activeClass:
        "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-transparent shadow-lg shadow-violet-500/30",
      inactiveClass:
        "bg-transparent dark:bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-700",
      dotClass: "bg-violet-400",
    },
    {
      key: "debt",
      label: "Công nợ",
      icon: <ClipboardList className="w-4 h-4" />,
      activeClass:
        "bg-gradient-to-r from-rose-500 to-red-500 text-white border-transparent shadow-lg shadow-rose-500/30",
      inactiveClass:
        "bg-transparent dark:bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-700",
      dotClass: "bg-rose-400",
    },
    {
      key: "tax",
      label: "Báo cáo thuế",
      icon: <FileText className="w-4 h-4" />,
      activeClass:
        "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent shadow-lg shadow-indigo-500/30",
      inactiveClass:
        "bg-transparent dark:bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-700",
      dotClass: "bg-indigo-400",
    },
  ];

const getCategoryIconAndColor = (categoryKey: string) => {
  switch (categoryKey) {
    case "sale_income":
    case "service_income":
      return {
        icon: <TrendingUp className="w-4 h-4" />,
        colorClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
        glow: "bg-emerald-500/5",
      };
    case "inventory_purchase":
    case "supplier_payment":
    case "debt_payment":
      return {
        icon: <Boxes className="w-4 h-4" />,
        colorClass: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
        glow: "bg-amber-500/5",
      };
    case "salary":
    case "employee_advance":
      return {
        icon: <BriefcaseBusiness className="w-4 h-4" />,
        colorClass: "bg-violet-500/10 text-violet-400 border-violet-500/20 shadow-[0_0_12px_rgba(139,92,246,0.15)]",
        glow: "bg-violet-500/5",
      };
    case "rent":
    case "utilities":
      return {
        icon: <Building className="w-4 h-4" />,
        colorClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.15)]",
        glow: "bg-indigo-500/5",
      };
    case "sale_refund":
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        colorClass: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
        glow: "bg-rose-500/5",
      };
    case "debt_collection":
      return {
        icon: <Users className="w-4 h-4" />,
        colorClass: "bg-sky-500/10 text-sky-400 border-sky-500/20 shadow-[0_0_12px_rgba(14,165,233,0.15)]",
        glow: "bg-sky-500/5",
      };
    default:
      return {
        icon: <Wallet className="w-4 h-4" />,
        colorClass: "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.15)]",
        glow: "bg-blue-500/5",
      };
  }
};

const ReportsManager: React.FC = () => {
  const { theme } = useTheme();
  const { payrollRecords, customers, suppliers, currentBranchId, employees } =
    useAppContext();
  // Repository data (Supabase-backed)
  const { data: salesData = [], isLoading: salesLoading } = useSalesRepo();
  const { data: partsData = [], isLoading: partsLoading } = usePartsRepo();
  const { data: workOrdersData = [] } = useWorkOrders();
  const { data: customerDebtsData = [] } = useCustomerDebtsRepo();
  const { data: supplierDebtsData = [] } = useSupplierDebtsRepo();

  // Fetch unpaid work orders for debt calculation (same as DebtManager)
  const [unpaidWorkOrders, setUnpaidWorkOrders] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchUnpaidWorkOrders = async () => {
      try {
        const { data, error } = await supabase
          .from("work_orders")
          .select("*")
          .eq("status", "Trả máy")
          .eq("branchid", currentBranchId)
          .gt("remainingamount", 0);

        if (!error && data) {
          setUnpaidWorkOrders(data);
        }
      } catch (err) {
        console.error("Error fetching unpaid work orders:", err);
      }
    };

    fetchUnpaidWorkOrders();
  }, [currentBranchId]);

  // Build parts cost lookup map
  const partsCostMap = useMemo(() => {
    const map = new Map<string, number>();
    partsData.forEach((part: Part) => {
      const costPrice = part.costPrice?.[currentBranchId] || 0;
      map.set(part.id, costPrice);
      map.set(part.sku, costPrice); // Also lookup by SKU
    });
    return map;
  }, [partsData, currentBranchId]);

  const [activeTab, setActiveTab] = useState<ReportTab>("revenue");
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1
  ); // 1-12
  const [selectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showOrderDetails] = useState(false);

  const getLocalDateKey = (input: string | Date): string => {
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) {
      return String(input).slice(0, 10);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };


  // Function to handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc"); // Default to descending for numbers
    }
  };

  // Tính toán khoảng thời gian
  const { start, end } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (dateRange === "custom" && startDate && endDate) {
      return { start: new Date(startDate), end: new Date(endDate) };
    }

    switch (dateRange) {
      case "today":
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "week":
        start = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        // Use selectedMonth instead of current month
        start = new Date(selectedYear, selectedMonth - 1, 1);
        end = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
        break;
      case "quarter":
        start = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case "year":
        start = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
    }

    return { start, end };
  }, [dateRange, startDate, endDate, selectedMonth, selectedYear]);

  // Báo cáo doanh thu (bao gồm cả Sales và Work Orders đã thanh toán)
  const revenueReport = useMemo(() => {
    const summary = calculateFinancialSummary({
      sales: salesData,
      workOrders: workOrdersData,
      parts: partsData,
      cashTransactions: [],
      branchId: currentBranchId,
      start,
      end,
    });

    const filteredSales = summary.filteredSales as Sale[];
    const filteredWorkOrders = summary.filteredWorkOrders;



    // Helper function to get cost price from map or fallback
    const getPartCost = (partId: string, sku: string, fallbackCost: number) => {
      // Priority: Historical value (fallbackCost) > Current master value > 0
      if (fallbackCost && fallbackCost > 0) return fallbackCost;
      return (
        partsCostMap.get(partId) || partsCostMap.get(sku) || 0
      );
    };

    const totalRevenue = summary.totalRevenue;
    const totalCost = summary.totalCost;
    const totalProfit = summary.totalProfit;

    // Group by date for daily report (combine sales and work orders)
    const dataByDate = new Map<
      string,
      {
        date: string;
        sales: Sale[];
        workOrders: any[];
        totalRevenue: number;
        totalCost: number;
        partsCost: number;
        servicesCost: number;
        totalProfit: number;
        orderCount: number;
      }
    >();

    // Add sales to daily data
    filteredSales.forEach((sale) => {
      const dateKey = getLocalDateKey(sale.date);
      if (!dataByDate.has(dateKey)) {
        dataByDate.set(dateKey, {
          date: dateKey,
          sales: [],
          workOrders: [],
          totalRevenue: 0,
          totalCost: 0,
          partsCost: 0,
          servicesCost: 0,
          totalProfit: 0,
          orderCount: 0,
        });
      }
      const dayData = dataByDate.get(dateKey)!;
      const saleCost = sale.items.reduce((c: number, it: any) => {
        const partCost = getPartCost(
          it.partId,
          it.sku,
          (it as any).costPrice || 0
        );
        return c + partCost * it.quantity;
      }, 0);
      dayData.sales.push(sale);
      dayData.totalRevenue += sale.total;
      dayData.totalCost += saleCost;
      dayData.partsCost += saleCost;
      dayData.totalProfit += sale.total - saleCost;
      dayData.orderCount += 1;
    });

    // Add work orders to daily data - paymentDate first, fallback for legacy paid orders
    filteredWorkOrders.forEach((wo: any) => {
      const paymentDateRaw = wo.paymentDate || wo.paymentdate;

      let accountingDateRaw = paymentDateRaw;
      if (!accountingDateRaw) {
        const creationDateRaw = wo.creationDate || wo.creationdate;
        if (creationDateRaw) {
          console.warn(
            `[ReportsManager] Work order ${wo.id} missing paymentDate, fallback to creationDate (legacy)`
          );
          accountingDateRaw = creationDateRaw;
        }
      }

      if (!accountingDateRaw) {
        console.warn(
          `[ReportsManager] Work order ${wo.id} has no accounting date, skipping from daily revenue report`
        );
        return;
      }

      const woDateObj = new Date(accountingDateRaw);
  const dateKey = getLocalDateKey(woDateObj);

      if (!dataByDate.has(dateKey)) {
        dataByDate.set(dateKey, {
          date: dateKey,
          sales: [],
          workOrders: [],
          totalRevenue: 0,
          totalCost: 0,
          partsCost: 0,
          servicesCost: 0,
          totalProfit: 0,
          orderCount: 0,
        });
      }
      const dayData = dataByDate.get(dateKey)!;
      const parts = wo.partsUsed || wo.partsused || [];
      const partsCost = parts.reduce((c: number, p: any) => {
        const partId = p.partId || p.partid;
        const sku = p.sku;
        const cost = getPartCost(partId, sku, p.costPrice || p.costprice || 0);
        return c + cost * (p.quantity || 0);
      }, 0);

      // IMPORTANT: Giá vốn dịch vụ gia công/đặt ngoài phải ghi nhận bằng phiếu chi
      // để tránh đếm 2 lần (không trừ ở WorkOrder nữa).
      const servicesCost = 0;
      const woCost = partsCost;
      const woTotal = wo.totalPaid || wo.totalpaid || wo.total || 0;
      dayData.workOrders.push(wo);
      dayData.totalRevenue += woTotal;
      dayData.totalCost += woCost;
      dayData.partsCost += partsCost;
      dayData.servicesCost += servicesCost;
      dayData.totalProfit += woTotal - woCost;
      dayData.orderCount += 1;
    });

    // Convert to array and sort by date
    const dailyReport = Array.from(dataByDate.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      sales: filteredSales,
      workOrders: filteredWorkOrders,
      dailyReport,
      totalRevenue,
      totalCost,
      totalProfit, // Lợi nhuận gộp (chưa trừ chi phí vận hành)
      profitMargin:
        totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0,
      orderCount: filteredSales.length + filteredWorkOrders.length,
      salesCount: filteredSales.length,
      workOrdersCount: filteredWorkOrders.length,
    };
  }, [salesData, workOrdersData, partsData, currentBranchId, partsCostMap, start, end]);

  // Báo cáo thu chi
  // Fetch cash transactions via repository with range filters
  const { data: cashTxData = [], isLoading: cashTxLoading } = useCashTxRepo({
    branchId: currentBranchId,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });

  // Sorted daily report based on sortColumn and sortDirection
  const sortedDailyReport = useMemo(() => {
    const reportableCashTx = cashTxData.filter((t) => {
      const txDate = new Date(t.date);
      if (Number.isNaN(txDate.getTime()) || txDate < start || txDate > end) {
        return false;
      }

      if (t.type === "income") {
        return !isExcludedIncomeCategory(t.category);
      }

      if (t.type === "expense") {
        return t.amount > 0 && (!isExcludedExpenseCategory(t.category) || isRefundCategory(t.category));
      }

      return false;
    });

    const mergedReportMap = new Map(
      revenueReport.dailyReport.map((d) => [d.date, d])
    );

    reportableCashTx.forEach((t) => {
      const dateKey = getLocalDateKey(t.date);
      if (!mergedReportMap.has(dateKey)) {
        mergedReportMap.set(dateKey, {
          date: dateKey,
          sales: [],
          workOrders: [],
          totalRevenue: 0,
          totalCost: 0,
          partsCost: 0,
          servicesCost: 0,
          totalProfit: 0,
          orderCount: 0,
        });
      }
    });

    const baseDailyReport = Array.from(mergedReportMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (!sortColumn) return baseDailyReport;

    return [...baseDailyReport].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "date":
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case "totalCost":
          aValue = a.totalCost;
          bValue = b.totalCost;
          break;
        case "totalRevenue":
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
          break;
        case "totalProfit":
          aValue = a.totalProfit;
          bValue = b.totalProfit;
          break;
        case "orderCount":
          aValue = a.orderCount;
          bValue = b.orderCount;
          break;
        default:
          return 0;
      }

      if (sortDirection === "asc") {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  }, [revenueReport.dailyReport, cashTxData, start, end, sortColumn, sortDirection]);

  const dailyFinancials = useDailyFinancials({
    sortedDailyReport,
    cashTxData,
    partsCostMap,
  });

  // Exclusion logic is shared (Dashboard/Analytics/Reports) to keep numbers consistent.

  const translateCategory = (category: string): string => {
    const formatted = formatCashTxCategory(category);
    if (!formatted || formatted === "refund" || category === "refund" || category === "sale_refund") {
      return "Hoàn tiền trả hàng";
    }
    if (category === "salary" || category === "payroll") {
      return "Chi trả lương nhân viên";
    }
    if (category === "inventory_purchase" || category === "purchase") {
      return "Nhập hàng / Mua sắm";
    }
    if (category === "utilities") {
      return "Chi phí điện nước, internet";
    }
    if (category === "rent") {
      return "Chi phí mặt bằng";
    }
    if (category === "other_expense" || category === "other") {
      return "Chi phí khác";
    }
    if (category === "other_income") {
      return "Thu nhập khác";
    }
    return formatted;
  };

  const cashTotals = useMemo(() => {
    const filteredTransactions = cashTxData.filter((t) => {
      const txDate = new Date(t.date);
      return txDate >= start && txDate <= end;
    });
    // Phiếu thu: loại trừ thu từ dịch vụ/bán hàng (đã tính trong Sales/Work Orders)
    const totalIncome = filteredTransactions
      .filter(
        (t) => t.type === "income" && !isExcludedIncomeCategory(t.category)
      )
      .reduce((sum, t) => sum + t.amount, 0);
    // Phiếu chi: loại trừ chi nhập kho (đã tính trong giá vốn hàng bán)
    // CHỈ TÍNH expense với amount DƯƠNG (chi thực tế)
    const totalExpense = filteredTransactions
      .filter(
        (t) =>
          t.type === "expense" &&
          t.amount > 0 && // CHỈ LẤY SỐ DƯƠNG
          !isExcludedExpenseCategory(t.category)
      )
      .reduce((sum, t) => sum + t.amount, 0);

    // Hoàn tiền (giá bán âm): trừ vào doanh thu, hiện trong Thu/Chi khác
    const totalRefund = filteredTransactions
      .filter((t) => t.type === "expense" && t.amount > 0 && isRefundCategory(t.category))
      .reduce((sum, t) => sum + t.amount, 0);

    // Debug log
    console.warn("[ReportsManager] Cash totals:", {
      totalTransactions: filteredTransactions.length,
      incomeAfterFilter: totalIncome,
      expense: totalExpense,
      excludedIncomeCategories: REPORTS_EXCLUDED_INCOME_CATEGORIES,
      excludedExpenseCategories: REPORTS_EXCLUDED_EXPENSE_CATEGORIES,
      expenseByCategory: filteredTransactions
        .filter((t) => t.type === "expense")
        .reduce((acc, t) => {
          const cat = t.category || "unknown";
          acc[cat] = (acc[cat] || 0) + t.amount;
          return acc;
        }, {} as Record<string, number>),
    });

    return { totalIncome, totalExpense, totalRefund };
  }, [cashTxData, start, end]);

  const financialSummary = useMemo(() => {
    return calculateFinancialSummary({
      sales: salesData,
      workOrders: workOrdersData,
      parts: partsData,
      cashTransactions: cashTxData,
      branchId: currentBranchId,
      start,
      end,
    });
  }, [salesData, workOrdersData, partsData, cashTxData, currentBranchId, start, end]);

  // Doanh thu tổng hợp = Doanh thu bán hàng + Phiếu thu
  const combinedRevenue = financialSummary.combinedRevenue;
  // Lợi nhuận ròng = Lợi nhuận + Thu khác - Chi khác
  const netProfit = financialSummary.netProfit;

  const cashflowReport = useMemo(() => {
    const filteredTransactions = cashTxData.filter((t) => {
      const txDate = new Date(t.date);
      return txDate >= start && txDate <= end;
    });

    const income = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const byCategory: Record<string, { income: number; expense: number }> = {};
    filteredTransactions.forEach((t) => {
      const categoryKey = getCashTxCategoryKey(t.category);
      const groupKey = categoryKey || t.category || "other";
      if (!byCategory[groupKey]) {
        byCategory[groupKey] = { income: 0, expense: 0 };
      }
      if (t.type === "income") {
        byCategory[groupKey].income += t.amount;
      } else {
        byCategory[groupKey].expense += t.amount;
      }
    });

    return {
      transactions: filteredTransactions,
      totalIncome: income,
      totalExpense: expense,
      netCashFlow: income - expense,
      byCategory,
    };
  }, [cashTxData, start, end]);

  // Báo cáo tồn kho
  const inventoryReport = useMemo(() => {
    const currentStock = partsData.map((p: Part) => ({
      ...p,
      stock: p.stock[currentBranchId] || 0,
      price: p.retailPrice[currentBranchId] || 0,
      value:
        (p.stock[currentBranchId] || 0) * (p.retailPrice[currentBranchId] || 0),
    }));

    const totalValue = currentStock.reduce(
      (sum: number, p: any) => sum + p.value,
      0
    );
    const lowStock = currentStock.filter((p: any) => p.stock < 10);

    return {
      parts: currentStock,
      totalValue,
      lowStockCount: lowStock.length,
      lowStockItems: lowStock,
    };
  }, [partsData, currentBranchId]);

  // Báo cáo lương
  const payrollReport = useMemo(() => {
    const filteredRecords = payrollRecords.filter((r) => {
      const recordDate = new Date(r.month);
      return recordDate >= start && recordDate <= end;
    });

    const totalSalary = filteredRecords.reduce(
      (sum, r) => sum + r.netSalary,
      0
    );
    const paidSalary = filteredRecords
      .filter((r) => r.paymentStatus === "paid")
      .reduce((sum, r) => sum + r.netSalary, 0);
    const unpaidSalary = totalSalary - paidSalary;

    return {
      records: filteredRecords,
      totalSalary,
      paidSalary,
      unpaidSalary,
      employeeCount: new Set(filteredRecords.map((r) => r.employeeId)).size,
    };
  }, [payrollRecords, start, end]);

  // Báo cáo công nợ
  const debtReport = useMemo(() => {
    // Convert unpaid work orders to debt format
    const existingWorkOrderIds = new Set(
      customerDebtsData
        .filter((d: any) => d.workOrderId)
        .map((d: any) => d.workOrderId)
    );

    const workOrderDebts = unpaidWorkOrders
      .filter((wo) => !existingWorkOrderIds.has(wo.id))
      .map((wo) => {
        const totalPaid = (wo.depositamount || 0) + (wo.additionalpayment || 0);
        const remainingAmount = Math.max(0, (wo.total || 0) - totalPaid);

        return {
          id: `WO-${wo.id}`,
          customerId: wo.customerphone || wo.id,
          customerName: wo.customername || "Khách vãng lai",
          phone: wo.customerphone || null,
          totalAmount: wo.total || 0,
          paidAmount: totalPaid,
          remainingAmount: remainingAmount,
          createdDate: wo.creationdate || wo.created_at,
          branchId: wo.branchid || currentBranchId,
          workOrderId: wo.id,
        };
      });

    // Lọc công nợ theo branch - combine DB debts + work order debts
    const allCustomerDebts = [...customerDebtsData, ...workOrderDebts];

    const branchCustomerDebts = allCustomerDebts.filter(
      (debt: any) =>
        debt.branchId === currentBranchId && debt.remainingAmount > 0
    );
    const branchSupplierDebts = supplierDebtsData.filter(
      (debt) => debt.branchId === currentBranchId && debt.remainingAmount > 0
    );

    // Tổng hợp theo khách hàng
    const customerDebtMap = new Map<
      string,
      { name: string; phone?: string; debt: number }
    >();
    branchCustomerDebts.forEach((debt) => {
      // Use phone as primary key, fallback to lowercase customerName for consistency
      const key =
        debt.phone || debt.customerName?.toLowerCase() || debt.customerName;
      if (!customerDebtMap.has(key)) {
        customerDebtMap.set(key, {
          name: debt.customerName,
          phone: debt.phone,
          debt: 0,
        });
      }
      const current = customerDebtMap.get(key)!;
      current.debt += debt.remainingAmount;
    });

    // Tổng hợp theo nhà cung cấp
    const supplierDebtMap = new Map<string, { name: string; debt: number }>();
    branchSupplierDebts.forEach((debt) => {
      const key = debt.supplierName;
      if (!supplierDebtMap.has(key)) {
        supplierDebtMap.set(key, {
          name: debt.supplierName,
          debt: 0,
        });
      }
      const current = supplierDebtMap.get(key)!;
      current.debt += debt.remainingAmount;
    });

    const customerDebts = Array.from(customerDebtMap.values()).sort(
      (a, b) => b.debt - a.debt
    );
    const supplierDebts = Array.from(supplierDebtMap.values()).sort(
      (a, b) => b.debt - a.debt
    );

    const totalCustomerDebt = customerDebts.reduce((sum, c) => sum + c.debt, 0);
    const totalSupplierDebt = supplierDebts.reduce((sum, s) => sum + s.debt, 0);

    return {
      customerDebts,
      supplierDebts,
      totalCustomerDebt,
      totalSupplierDebt,
      netDebt: totalCustomerDebt - totalSupplierDebt,
    };
  }, [customerDebtsData, supplierDebtsData, currentBranchId, unpaidWorkOrders]);

  const exportToExcel = () => {
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    try {
      switch (activeTab) {
        case "revenue":
          exportRevenueReport(revenueReport.sales, startStr, endStr);
          break;
        case "cashflow":
          exportCashflowReport(cashflowReport.transactions, startStr, endStr);
          break;
        case "inventory":
          exportInventoryReport(partsData, currentBranchId, startStr, endStr);
          break;
        case "payroll": {
          const startMonth = start.toISOString().slice(0, 7);
          const endMonth = end.toISOString().slice(0, 7);
          exportPayrollReport(payrollReport.records, startMonth, endMonth);
          break;
        }
        case "debt":
          exportDebtReport(
            customers,
            suppliers,
            revenueReport.sales,
            startStr,
            endStr
          );
          break;
      }
      showToast.success("Xuất Excel thành công! File đã được tải xuống.");
    } catch (error) {
      console.error("Export error:", error);
      showToast.error("Có lỗi khi xuất Excel. Vui lòng thử lại.");
    }
  };

  return (
    <div className="space-y-3">
      {/* Mobile View - New Component */}
      <ReportsManagerMobile
        revenueReport={revenueReport}
        cashflowReport={cashflowReport}
        inventoryReport={inventoryReport}
        payrollReport={payrollReport}
        debtReport={debtReport}
        dateRange={dateRange}
        setDateRange={setDateRange}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExportExcel={exportToExcel}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        onDateClick={setSelectedDate}
        cashTotals={cashTotals}
        selectedDate={selectedDate}
      />

      {/* Desktop Controls - Hidden on Mobile */}
      <div className="hidden md:flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4 bg-white/80 dark:bg-[#0D121F]/60 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 p-2 rounded-2xl shadow-sm dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          {/* Report Tabs */}
          <div className="flex items-center gap-1.5">
            {REPORT_TAB_CONFIGS.map((tab) => {
              const isActive = activeTab === tab.key;
              let iconColorSchema = "";
              switch (tab.key) {
                case "revenue":
                  iconColorSchema = isActive ? "bg-white/20 text-white" : "bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20";
                  break;
                case "cashflow":
                  iconColorSchema = isActive ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20";
                  break;
                case "inventory":
                  iconColorSchema = isActive ? "bg-white/20 text-white" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20";
                  break;
                case "payroll":
                  iconColorSchema = isActive ? "bg-white/20 text-white" : "bg-violet-500/10 text-violet-650 dark:text-violet-400 group-hover:bg-violet-500/20";
                  break;
                case "debt":
                  iconColorSchema = isActive ? "bg-white/20 text-white" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500/20";
                  break;
                case "tax":
                  iconColorSchema = isActive ? "bg-white/20 text-white" : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500/20";
                  break;
              }

              return (
                <button
                  type="button"
                  aria-pressed={isActive}
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`group px-3.5 py-2 rounded-xl font-black whitespace-nowrap transition-all duration-300 flex items-center gap-2.5 text-xs uppercase tracking-wider ${
                    isActive
                      ? tab.activeClass
                      : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40 border-transparent"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg transition-all duration-300 ${iconColorSchema}`}>
                    {tab.icon}
                  </div>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Export Excel Button & Advanced Reports */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl font-black shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.4)] active:scale-95 transition-all duration-200 flex items-center gap-2 text-xs uppercase tracking-wider border border-emerald-500/30"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>

            {/* Advanced Reports Dropdown */}
            {activeTab === "revenue" && (
              <div className="relative group">
                <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white rounded-xl font-black shadow-[0_4px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.4)] active:scale-95 transition-all duration-200 flex items-center gap-2 text-xs uppercase tracking-wider border border-blue-500/30">
                  <TrendingUp className="w-4 h-4" />
                  <span>Báo cáo nâng cao</span>
                </button>

                {/* Dropdown menu */}
                <div className="absolute right-0 top-full mt-2 w-64 bg-white/95 dark:bg-[#0F172A]/95 shadow-lg dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-1.5 backdrop-blur-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={() => {
                      const startStr = start.toISOString().split("T")[0];
                      const endStr = end.toISOString().split("T")[0];
                      exportTopProductsReport(
                        revenueReport.sales,
                        startStr,
                        endStr,
                        20
                      );
                      showToast.success("Xuất Top sản phẩm thành công!");
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-[#1E293B]/80 transition-colors flex items-center gap-3 text-xs uppercase font-bold tracking-wider text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl"
                  >
                    <Tag className="w-4 h-4 text-blue-550 dark:text-blue-400" />
                    <span>Top sản phẩm bán chạy</span>
                  </button>

                  <button
                    onClick={() => {
                      const startStr = start.toISOString().split("T")[0];
                      const endStr = end.toISOString().split("T")[0];
                      exportProductProfitReport(
                        revenueReport.sales,
                        startStr,
                        endStr
                      );
                      showToast.success("Xuất lợi nhuận sản phẩm thành công!");
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-[#1E293B]/80 transition-colors flex items-center gap-3 text-xs uppercase font-bold tracking-wider text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl"
                  >
                    <BadgePercent className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Lợi nhuận theo sản phẩm</span>
                  </button>
                </div>
              </div>
            )}

            {/* Advanced Report */}
            {activeTab === "inventory" && (
              <button
                onClick={() => {
                  const startStr = start.toISOString().split("T")[0];
                  const endStr = end.toISOString().split("T")[0];
                  exportDetailedInventoryReport(
                    partsData,
                    currentBranchId,
                    startStr,
                    endStr
                  );
                  showToast.success("Xuất báo cáo tồn kho chi tiết thành công!");
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white rounded-xl font-black shadow-[0_4px_20px_rgba(168,85,247,0.25)] hover:shadow-[0_4px_25px_rgba(168,85,247,0.4)] active:scale-95 transition-all duration-200 flex items-center gap-2 text-xs uppercase tracking-wider border border-purple-500/30"
              >
                <Boxes className="w-4 h-4" />
                <span>Tồn kho chi tiết</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-bar for Date Range and Month selectors */}
        <div className="flex items-center gap-4 flex-wrap bg-white/40 dark:bg-[#131926]/30 border border-slate-200 dark:border-slate-800/60 p-2 rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgb(0,0,0,0.15)]">
          {/* Date Range Selector Pill */}
          <div className="bg-slate-50 dark:bg-[#0B0F19]/80 border border-slate-200 dark:border-slate-800/80 p-1 rounded-xl flex items-center gap-1 shadow-inner">
            {(["today", "week", "month", "quarter", "year", "custom"] as const).map(
              (range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all duration-200 ${
                    dateRange === range
                      ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                      : "text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/40"
                  }`}
                >
                  {range === "today"
                    ? "Hôm nay"
                    : range === "week"
                      ? "7 ngày"
                      : range === "month"
                        ? "Tháng"
                        : range === "quarter"
                          ? "Quý"
                          : range === "year"
                            ? "Năm"
                            : "Tùy chỉnh"}
                </button>
              )
            )}
          </div>

          {/* Month selector T1..T12 */}
          {dateRange === "month" && (
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#0B0F19]/80 border border-slate-200 dark:border-slate-800/80 p-1 rounded-xl shadow-inner flex-wrap">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all duration-200 hover:scale-105 ${
                    selectedMonth === month
                      ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400"
                  }`}
                >
                  T{month}
                </button>
              ))}
            </div>
          )}

          {/* Custom Date inputs */}
          {dateRange === "custom" && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0B0F19]/80 border border-slate-200 dark:border-slate-800/80 px-3 py-1.5 rounded-xl shadow-inner">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 border border-slate-200 dark:border-slate-800/85 rounded-lg bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-slate-550 dark:text-slate-500 text-xs font-bold">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 border border-slate-200 dark:border-slate-800/85 rounded-lg bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Report Content - Desktop Only */}
      <div className="hidden md:block bg-white/80 dark:bg-[#131926]/20 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 shadow-sm dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
        {activeTab === "revenue" && (
          <div className="space-y-4">
            {salesLoading && (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Đang tải doanh thu...
              </div>
            )}
            {/* Thống kê cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Card 1: Tổng doanh thu */}
              <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600/80 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:shadow-md dark:hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)] transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-555 dark:text-slate-300">
                    Tổng doanh thu
                  </span>
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] group-hover:scale-110 transition-transform duration-300">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white leading-none font-mono tracking-tight group-hover:text-blue-650 dark:group-hover:text-blue-400 transition-colors">
                  {formatCurrency(combinedRevenue).replace("₫", "")}
                </div>
                <div className="text-[11px] text-slate-555 dark:text-slate-350 mt-3 leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  Bán hàng: <span className="font-mono text-slate-850 dark:text-white font-bold">{formatCurrency(revenueReport.totalRevenue)}</span> <br/>
                  Phiếu thu: <span className="font-mono text-slate-850 dark:text-white font-bold">{formatCurrency(cashTotals.totalIncome)}</span>
                </div>
              </div>

              {/* Card 2: Tổng chi phí */}
              <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600/80 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:shadow-md dark:hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)] transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-555 dark:text-slate-300">
                    Tổng chi phí
                  </span>
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-650 dark:text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)] group-hover:scale-110 transition-transform duration-300">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white leading-none font-mono tracking-tight group-hover:text-rose-650 dark:group-hover:text-rose-400 transition-colors">
                  {formatCurrency(revenueReport.totalCost + cashTotals.totalExpense).replace("₫", "")}
                </div>
                <div className="text-[11px] text-slate-555 dark:text-slate-350 mt-3 leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  Giá vốn: <span className="font-mono text-slate-850 dark:text-white font-bold">{formatCurrency(revenueReport.totalCost)}</span> <br/>
                  Phiếu chi: <span className="font-mono text-slate-850 dark:text-white font-bold">{formatCurrency(cashTotals.totalExpense)}</span>
                </div>
              </div>

              {/* Card 3: Lợi nhuận thuần */}
              <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600/80 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:shadow-md dark:hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)] transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-555 dark:text-slate-300">
                    Lợi nhuận thuần
                  </span>
                  <div className={`p-2.5 rounded-xl border group-hover:scale-110 transition-transform duration-300 ${
                    netProfit >= 0
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                      : "bg-rose-500/10 text-rose-650 dark:text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                  }`}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className={`text-2xl font-black leading-none font-mono tracking-tight ${
                  netProfit >= 0
                    ? "text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                    : "text-rose-605 dark:text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.15)]"
                }`}>
                  {formatCurrency(netProfit).replace("₫", "")}
                </div>
                <div className="text-[11px] text-slate-555 dark:text-slate-350 mt-3 leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  Lãi gộp: <span className="font-mono text-slate-850 dark:text-white font-bold">{formatCurrency(revenueReport.totalProfit)}</span> <br/>
                  Chi phí khác: <span className="font-mono text-slate-850 dark:text-white font-bold">{formatCurrency(cashTotals.totalExpense)}</span>
                </div>
              </div>

              {/* Card 4: Tỷ suất lợi nhuận */}
              <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600/80 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:shadow-md dark:hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)] transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-555 dark:text-slate-300">
                    Tỷ suất lợi nhuận
                  </span>
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] group-hover:scale-110 transition-transform duration-300">
                    <BadgePercent className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white leading-none font-mono tracking-tight group-hover:text-purple-650 dark:group-hover:text-purple-400 transition-colors">
                  {combinedRevenue > 0
                    ? ((netProfit / combinedRevenue) * 100).toFixed(1)
                    : "0.0"}%
                </div>
                <div className="text-[11px] text-slate-555 dark:text-slate-355 mt-3 leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  Lợi nhuận ròng / Tổng doanh thu
                </div>
              </div>
            </div>

            {/* Bảng chi tiết theo ngày - Redesigned */}
            <div className="bg-white dark:bg-[#0D121F]/60 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
              {/* Table Header */}
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-850 dark:text-slate-200 tracking-wide uppercase">
                    Chi tiết theo ngày
                  </h3>
                  <span className="px-2.5 py-0.5 bg-amber-550/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase rounded-full border border-amber-500/30">
                    {revenueReport.dailyReport.length} ngày
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 italic hidden sm:block">
                  Nhấn vào ngày để xem chi tiết
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  {/* Grouped Column Headers */}
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/70">
                      <th rowSpan={2} className="px-2 py-2 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-8 bg-slate-50 dark:bg-slate-800/50">
                        #
                      </th>
                      <th
                        rowSpan={2}
                        className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors select-none bg-slate-50 dark:bg-slate-800/50"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Ngày</span>
                          {sortColumn === "date" && (
                            <span className="text-amber-500 dark:text-amber-400 text-xs">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                      {/* DOANH THU group */}
                      <th colSpan={2} className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-800/30 border-l border-slate-200 dark:border-slate-700/50">
                        <span className="text-slate-600 dark:text-slate-300">DOANH THU</span>
                      </th>
                      {/* GIÁ VỐN HÀNG BÁN group */}
                      <th colSpan={2} className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-800/30 border-l border-slate-200 dark:border-slate-700/50">
                        <span className="text-slate-600 dark:text-slate-300">GIÁ VỐN HÀNG BÁN</span>
                      </th>
                      {/* LỢI NHUẬN group */}
                      <th colSpan={3} className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-800/30 border-l border-slate-200 dark:border-slate-700/50">
                        <span className="text-slate-600 dark:text-slate-300">LỢI NHUẬN</span>
                      </th>
                    </tr>
                    <tr className="border-b border-slate-200 dark:border-slate-700/70 bg-slate-100/40 dark:bg-slate-800/40">
                      {/* DOANH THU sub-columns */}
                      <th className="px-2 py-1.5 text-right text-[11px] font-bold text-slate-600 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700/50">Bán hàng</th>
                      <th className="px-2 py-1.5 text-right text-[11px] font-bold text-slate-600 dark:text-slate-300">Sửa chữa</th>
                      {/* GIÁ VỐN sub-columns */}
                      <th className="px-2 py-1.5 text-right text-[11px] font-bold text-slate-600 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700/50">Vốn BH</th>
                      <th className="px-2 py-1.5 text-right text-[11px] font-bold text-slate-600 dark:text-slate-300">Vật tư SC</th>
                      {/* LỢI NHUẬN sub-columns */}
                      <th className="px-2 py-1.5 text-right text-[11px] font-bold text-slate-600 dark:text-slate-300 border-l border-slate-200 dark:border-slate-700/50">Lãi gộp</th>
                      <th className="px-2 py-1.5 text-right text-[11px] font-bold text-slate-600 dark:text-slate-300">Thu/Chi khác</th>
                      <th className="px-2 py-1.5 text-right text-[11px] font-black text-slate-850 dark:text-white">Lãi ròng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyFinancials.map((day, index) => {
                      const isExpanded = selectedDate === day.date;
                      const {
                        salesRevenue,
                        woRevenue,
                        salesCOGS,
                        woParts,
                        laiGop,
                        thuChiKhac,
                        laiRong,
                        dayCashTx,
                        sales,
                        workOrders,
                      } = day;

                      return (
                        <React.Fragment key={day.date}>
                          <tr
                            className={`border-b border-slate-150 dark:border-slate-800 cursor-pointer transition-colors group ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/80' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                            onClick={() => setSelectedDate(isExpanded ? null : day.date)}
                            title="Nhấn để xem chi tiết"
                          >
                            <td className="px-2 py-2.5 text-center text-xs font-medium text-slate-500">
                              {isExpanded ? (
                                <span className="text-amber-500 dark:text-amber-400 text-[10px]">▼</span>
                              ) : (
                                <span>{index + 1}</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                              {new Date(day.date).toLocaleDateString("vi-VN")}
                            </td>
                            {/* Bán hàng */}
                            <td className={`px-2 py-2.5 text-right text-xs font-semibold border-l border-slate-200 dark:border-slate-700/50 ${salesRevenue === 0 ? 'text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}`}>
                              {salesRevenue === 0 ? '-' : formatCurrency(salesRevenue)}
                            </td>
                            {/* Sửa chữa */}
                            <td className={`px-2 py-2.5 text-right text-xs font-semibold ${woRevenue === 0 ? 'text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}`}>
                              {woRevenue === 0 ? '-' : formatCurrency(woRevenue)}
                            </td>
                            {/* COGS */}
                            <td className={`px-2 py-2.5 text-right text-xs border-l border-slate-200 dark:border-slate-700/50 ${salesCOGS === 0 ? 'text-slate-400 dark:text-slate-600' : 'text-slate-600 dark:text-slate-300'}`}>
                              {salesCOGS === 0 ? '-' : formatCurrency(salesCOGS)}
                            </td>
                            {/* Vật tư SC */}
                            <td className={`px-2 py-2.5 text-right text-xs ${woParts === 0 ? 'text-slate-400 dark:text-slate-600' : 'text-slate-600 dark:text-slate-300'}`}>
                              {woParts === 0 ? '-' : formatCurrency(woParts)}
                            </td>
                            {/* Lãi gộp */}
                            <td className={`px-2 py-2.5 text-right text-xs font-semibold border-l border-slate-200 dark:border-slate-700/50 ${laiGop === 0 ? 'text-slate-400 dark:text-slate-600' : 'text-slate-800 dark:text-slate-200'}`}>
                              {laiGop === 0 ? '-' : formatCurrency(laiGop)}
                            </td>
                            {/* Thu/Chi khác */}
                            <td className={`px-2 py-2.5 text-right text-xs ${thuChiKhac === 0 ? 'text-slate-400 dark:text-slate-650' : 'text-slate-700 dark:text-slate-300'}`}>
                              {thuChiKhac === 0 ? '-' : (thuChiKhac > 0 ? '+' : '') + formatCurrency(thuChiKhac)}
                            </td>
                            {/* Lãi ròng */}
                            <td className={`px-2 py-2.5 text-right text-xs font-black border-l border-slate-200 dark:border-slate-700/50 ${laiRong === 0 ? 'text-slate-400 dark:text-slate-650' : laiRong > 0 ? 'text-green-600 dark:text-green-400 font-extrabold' : 'text-rose-600 dark:text-rose-400 font-extrabold'}`}>
                              {laiRong > 0 ? '+' : ''}{formatCurrency(laiRong)}
                            </td>
                          </tr>

                          {/* Expanded Detail Row */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={9} className="p-0">
                                <div className="bg-slate-50/90 dark:bg-[#0B0F19]/90 border-t border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-md px-6 py-6">
                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* CÁCH TÍNH LỢI NHUẬN */}
                                    <div className="bg-white dark:bg-[#0D121F]/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-2xl rounded-2xl p-5 relative overflow-hidden group transition-all duration-300 hover:scale-[1.01]">
                                      {/* Ambient Glow */}
                                      <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full pointer-events-none" />
                                      <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)] group-hover:scale-110 transition-transform duration-300">
                                          <TrendingUp className="w-4 h-4" />
                                        </div>
                                        <span>Cách tính lợi nhuận</span>
                                      </h4>
                                      <div className="space-y-3 text-xs">
                                        <div className="flex justify-between items-center p-2.5 bg-slate-100/50 dark:bg-[#131926]/30 border border-slate-200 dark:border-slate-800/40 rounded-xl">
                                          <span className="text-slate-500 dark:text-slate-400 font-medium">Doanh thu bán hàng</span>
                                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(salesRevenue + woRevenue)}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-2.5 bg-slate-100/50 dark:bg-[#131926]/30 border border-slate-200 dark:border-slate-800/40 rounded-xl">
                                          <span className="text-slate-500 dark:text-slate-400 font-medium">(-) Giá vốn hàng bán</span>
                                          <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">- {formatCurrency(salesCOGS + woParts)}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-2.5 bg-emerald-50/60 dark:bg-[#131926]/50 border border-emerald-100 dark:border-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400/90">
                                          <span className="font-bold">= Lãi gộp bán hàng</span>
                                          <span className="font-extrabold font-mono">{formatCurrency(laiGop)}</span>
                                        </div>
                                        {thuChiKhac !== 0 && (
                                          <div className="flex justify-between items-center p-2.5 bg-slate-100/50 dark:bg-[#131926]/30 border border-slate-200 dark:border-slate-800/40 rounded-xl">
                                            <span className="text-slate-500 dark:text-slate-400 font-medium">{thuChiKhac > 0 ? '(+) Thu khác' : '(-) Chi khác'}</span>
                                            <span className={`font-bold font-mono ${thuChiKhac > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                              {thuChiKhac > 0 ? '+' : ''}{formatCurrency(thuChiKhac)}
                                            </span>
                                          </div>
                                        )}
                                        <div className="p-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 border border-slate-250 dark:border-slate-700/50 rounded-xl flex justify-between items-center shadow-inner mt-4">
                                          <span className="text-slate-900 dark:text-white font-black text-xs tracking-wider">LÃI RÒNG</span>
                                          <span className={`font-black text-sm font-mono tracking-tight ${laiRong >= 0 ? 'text-emerald-600 dark:text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.25)]' : 'text-rose-600 dark:text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.25)]'}`}>
                                            {laiRong > 0 ? '+' : ''}{formatCurrency(laiRong)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* ĐƠN BÁN HÀNG */}
                                    <div className="bg-white dark:bg-[#0D121F]/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-2xl rounded-2xl p-5 relative overflow-hidden group transition-all duration-300 hover:scale-[1.01]">
                                      {/* Ambient Glow */}
                                      <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full pointer-events-none" />
                                      <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.15)] group-hover:scale-110 transition-transform duration-300">
                                          <ShoppingBag className="w-4 h-4" />
                                        </div>
                                        <span>Đơn bán hàng ({day.sales.length})</span>
                                      </h4>
                                      {day.sales.length === 0 ? (
                                        <div className="text-xs text-slate-500 py-8 text-center bg-slate-100/50 dark:bg-[#131926]/20 border border-slate-200 dark:border-slate-800/40 rounded-xl">Không có đơn bán hàng</div>
                                      ) : (
                                        <>
                                          {/* Tổng bán hàng */}
                                          <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-200 dark:border-slate-800/60">
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Tổng doanh thu</div>
                                            <div className="text-right">
                                              <span className="font-black text-slate-800 dark:text-slate-200 text-xs font-mono">{formatCurrency(salesRevenue)}</span>
                                              <span className="px-2 py-0.5 ml-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 text-[9px] font-black uppercase rounded-full">
                                                Lãi: {formatCurrency(salesRevenue - salesCOGS)}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                            {day.sales.map((sale) => {
                                              const saleCost = sale.items.reduce((c, it: any) => {
                                                const cost = it.costPrice || partsCostMap.get(it.partId) || partsCostMap.get(it.sku) || 0;
                                                return c + cost * it.quantity;
                                              }, 0);
                                              const saleProfit = sale.total - saleCost;
                                              return (
                                                <div key={sale.id} className="bg-slate-50 hover:bg-slate-100/80 dark:bg-[#131926]/40 dark:hover:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-800/60 rounded-xl p-3.5 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_4px_15px_rgba(0,0,0,0.3)]">
                                                  <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                      <div className="p-1 rounded-md bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20">
                                                        <Users className="w-3 h-3" />
                                                      </div>
                                                      <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">{sale.customer.name}</span>
                                                    </div>
                                                    <div className="text-right">
                                                      <div className="font-black text-slate-800 dark:text-slate-200 text-xs font-mono">{formatCurrency(sale.total)}</div>
                                                      <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                        Lãi: +{formatCurrency(saleProfit)}
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div className="text-[10px] text-slate-500 font-medium mb-2.5 pb-2 border-b border-slate-200 dark:border-slate-800/40 flex justify-between">
                                                    <span>{sale.sale_code || '---'}</span>
                                                    <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-[#0D121F] rounded text-[9px] font-black uppercase text-slate-650 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                                                      {sale.paymentMethod === 'bank' ? 'CK' : 'TM'}
                                                    </span>
                                                  </div>
                                                  <div className="space-y-1">
                                                    {sale.items.map((item, idx) => (
                                                      <div key={idx} className="flex justify-between text-[10px] bg-white dark:bg-[#0D121F]/40 p-1.5 rounded-lg border border-slate-150 dark:border-slate-800/20">
                                                        <span className="text-slate-500 dark:text-slate-400 truncate mr-2 font-medium">{item.partName}</span>
                                                        <span className="text-slate-700 dark:text-slate-350 font-mono font-bold whitespace-nowrap flex-shrink-0">
                                                          x{item.quantity} = {formatCurrency(item.sellingPrice * item.quantity)}
                                                        </span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </>
                                      )}
                                    </div>

                                    {/* SỬA CHỮA + GIAO DỊCH KHÁC */}
                                    <div className="space-y-4">
                                      {/* SỬA CHỮA */}
                                      <div className="bg-white dark:bg-[#0D121F]/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-2xl rounded-2xl p-5 relative overflow-hidden group transition-all duration-300 hover:scale-[1.01]">
                                        {/* Ambient Glow */}
                                        <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-violet-500/5 blur-2xl rounded-full pointer-events-none" />
                                        <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2.5">
                                          <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-500 dark:text-violet-400 border border-violet-500/20 shadow-[0_0_12px_rgba(139,92,246,0.15)] group-hover:scale-110 transition-transform duration-300">
                                            <Wrench className="w-4 h-4" />
                                          </div>
                                          <span>Sửa chữa ({day.workOrders.length})</span>
                                        </h4>
                                        {day.workOrders.length === 0 ? (
                                          <div className="text-xs text-slate-500 py-8 text-center bg-slate-100/50 dark:bg-[#131926]/20 border border-slate-200 dark:border-slate-800/40 rounded-xl">Không có phiếu sửa chữa</div>
                                        ) : (
                                          <>
                                            {/* Tổng sửa chữa */}
                                            <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-200 dark:border-slate-800/60">
                                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Tổng doanh thu</div>
                                              <div className="text-right">
                                                <span className="font-black text-slate-800 dark:text-slate-200 text-xs font-mono">{formatCurrency(woRevenue)}</span>
                                                <span className="px-2 py-0.5 ml-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 text-[9px] font-black uppercase rounded-full">
                                                  Lãi: {formatCurrency(woRevenue - woParts)}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                                              {day.workOrders.map((wo: any) => {
                                                const woTotal = wo.totalPaid || wo.totalpaid || wo.total || 0;
                                                const woPartsCost = (wo.partsUsed || wo.partsused || []).reduce((c: number, p: any) => {
                                                  const partId = p.partId || p.partid;
                                                  const cost = p.costPrice || p.costprice || partsCostMap.get(partId) || partsCostMap.get(p.sku) || 0;
                                                  return c + cost * (p.quantity || 0);
                                                }, 0);
                                                const woProfit = woTotal - woPartsCost;
                                                return (
                                                  <div key={wo.id} className="bg-slate-50 hover:bg-slate-100/80 dark:bg-[#131926]/40 dark:hover:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-800/60 rounded-xl p-3 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_4px_15px_rgba(0,0,0,0.3)]">
                                                    <div className="flex justify-between items-start">
                                                      <div className="flex items-start gap-2">
                                                        <div className="p-1 rounded-md bg-violet-500/10 text-violet-550 dark:text-violet-400 border border-violet-500/20 mt-0.5">
                                                          <Wrench className="w-3 h-3" />
                                                        </div>
                                                        <div>
                                                          <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">{wo.customerName || wo.customername}</div>
                                                          <div className="text-[9px] font-medium text-slate-500 mt-0.5">{wo.vehicleModel || wo.vehiclemodel || ''} • {wo.licensePlate || wo.licenseplate || ''}</div>
                                                        </div>
                                                      </div>
                                                      <div className="text-right">
                                                        <div className="font-black text-slate-800 dark:text-slate-200 text-xs font-mono">{formatCurrency(woTotal)}</div>
                                                        <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                          Lãi: +{formatCurrency(woProfit)}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </>
                                        )}
                                      </div>

                                      {/* GIAO DỊCH KHÁC */}
                                      <div className="bg-white dark:bg-[#0D121F]/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-2xl rounded-2xl p-5 relative overflow-hidden group transition-all duration-300 hover:scale-[1.01]">
                                        {/* Ambient Glow */}
                                        <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full pointer-events-none" />
                                        <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2.5">
                                          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)] group-hover:scale-110 transition-transform duration-300">
                                            <ArrowRightLeft className="w-4 h-4" />
                                          </div>
                                          <span>Giao dịch khác ({dayCashTx.length})</span>
                                        </h4>
                                        {dayCashTx.length === 0 ? (
                                          <div className="text-xs text-slate-500 py-8 text-center bg-slate-100/50 dark:bg-[#131926]/20 border border-slate-200 dark:border-slate-800/40 rounded-xl">Không có giao dịch khác</div>
                                        ) : (
                                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                            {dayCashTx.map((tx) => (
                                              <div key={tx.id} className="flex justify-between items-center text-xs py-2 px-3 bg-slate-50 hover:bg-slate-100/80 dark:bg-[#131926]/40 dark:hover:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-800/40 rounded-xl transition-all duration-200">
                                                <div className="flex items-center gap-2">
                                                  <div className={`w-1.5 h-1.5 rounded-full ${tx.type === 'income' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`} />
                                                  <span className="text-slate-700 dark:text-slate-300 font-bold">
                                                    {(tx as any).description || tx.notes || formatCashTxCategory(tx.category || '')}
                                                  </span>
                                                </div>
                                                <span className={`font-mono text-xs font-extrabold ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {/* Tổng hàng */}
                    {revenueReport.dailyReport.length > 0 && (() => {
                      const totalSalesRev = revenueReport.dailyReport.reduce((sum, d) => sum + d.sales.reduce((s, sale) => s + sale.total, 0), 0);
                      const totalWoRev = revenueReport.dailyReport.reduce((sum, d) => sum + d.workOrders.reduce((s, wo: any) => s + (wo.totalPaid || wo.totalpaid || wo.total || 0), 0), 0);
                      const totalSalesCOGS = revenueReport.dailyReport.reduce((sum, d) => sum + d.sales.reduce((s, sale) => s + sale.items.reduce((c, it: any) => c + ((it.costPrice || partsCostMap.get(it.partId) || partsCostMap.get(it.sku) || 0) * it.quantity), 0), 0), 0);
                      const totalWoParts = revenueReport.dailyReport.reduce((sum, d) => sum + d.workOrders.reduce((s, wo: any) => {
                        const parts = wo.partsUsed || wo.partsused || [];
                        return s + parts.reduce((c: number, p: any) => c + ((p.costPrice || p.costprice || partsCostMap.get(p.partId || p.partid) || partsCostMap.get(p.sku) || 0) * (p.quantity || 0)), 0);
                      }, 0), 0);
                      const totalLaiGop = (totalSalesRev + totalWoRev) - (totalSalesCOGS + totalWoParts);
                      const totalThuChiKhac = cashTotals.totalIncome - cashTotals.totalExpense - cashTotals.totalRefund;
                      return (
                        <tr className="border-t-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800/60">
                          <td colSpan={2} className="px-3 py-2.5 text-left text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                            Tổng:
                          </td>
                          <td className={`px-2 py-2.5 text-right text-xs font-bold border-l border-slate-200 dark:border-slate-700/50 ${totalSalesRev === 0 ? 'text-slate-400 dark:text-slate-650' : 'text-slate-700 dark:text-slate-300'}`}>
                            {formatCurrency(totalSalesRev)}
                          </td>
                          <td className={`px-2 py-2.5 text-right text-xs font-bold ${totalWoRev === 0 ? 'text-slate-400 dark:text-slate-650' : 'text-slate-700 dark:text-slate-300'}`}>
                            {formatCurrency(totalWoRev)}
                          </td>
                          <td className={`px-2 py-2.5 text-right text-xs font-bold border-l border-slate-200 dark:border-slate-700/50 ${totalSalesCOGS === 0 ? 'text-slate-400 dark:text-slate-650' : 'text-slate-600 dark:text-slate-300'}`}>
                            {formatCurrency(totalSalesCOGS)}
                          </td>
                          <td className={`px-2 py-2.5 text-right text-xs font-bold ${totalWoParts === 0 ? 'text-slate-400 dark:text-slate-650' : 'text-slate-600 dark:text-slate-300'}`}>
                            {formatCurrency(totalWoParts)}
                          </td>
                          <td className={`px-2 py-2.5 text-right text-xs font-bold border-l border-slate-200 dark:border-slate-700/50 ${totalLaiGop === 0 ? 'text-slate-400 dark:text-slate-650' : 'text-slate-800 dark:text-slate-200'}`}>
                            {formatCurrency(totalLaiGop)}
                          </td>
                          <td className={`px-2 py-2.5 text-right text-xs font-bold ${totalThuChiKhac === 0 ? 'text-slate-400 dark:text-slate-650' : 'text-slate-700 dark:text-slate-300'}`}>
                            {totalThuChiKhac === 0 ? '-' : (totalThuChiKhac > 0 ? '+' : '') + formatCurrency(totalThuChiKhac)}
                          </td>
                          <td className={`px-2 py-2.5 text-right text-xs font-black ${netProfit === 0 ? 'text-slate-400 dark:text-slate-650' : netProfit > 0 ? 'text-emerald-600 dark:text-green-400' : 'text-rose-600 dark:text-red-400'}`}>
                            {netProfit > 0 ? '+' : ''}{formatCurrency(netProfit)}
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bảng chi tiết đơn hàng - Ẩn vì không cần thiết */}
            {showOrderDetails && (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Chi tiết tất cả đơn hàng ({revenueReport.orderCount} đơn)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Ngày
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Khách hàng
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Tổng tiền
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Trạng thái
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {revenueReport.sales.map((sale) => (
                        <tr
                          key={sale.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700/30"
                        >
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-900 dark:text-white">
                            {formatDate(sale.date)}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium text-slate-900 dark:text-white">
                            {sale.customer.name}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-xs text-right font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(sale.total)}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${(sale as any).paymentStatus === "paid"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                }`}
                            >
                              {(sale as any).paymentStatus === "paid"
                                ? "Đã thanh toán"
                                : "Chưa thanh toán"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "cashflow" && (
          <div className="space-y-4">
            {cashTxLoading && (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Đang tải sổ quỹ...
              </div>
            )}
            {/* Thống kê cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Tổng thu */}
              <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600/80 shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)] transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-555 dark:text-slate-300">
                    Tổng thu
                  </span>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:scale-110 transition-transform duration-300">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none font-mono tracking-tight drop-shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                  {formatCurrency(cashflowReport.totalIncome).replace("₫", "")}
                </div>
                <div className="text-[10px] text-slate-555 dark:text-slate-355 mt-3 leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  Tổng hợp tất cả khoản thu thực tế <br/>
                  (Đã bao gồm doanh thu bán hàng & dịch vụ)
                </div>
              </div>

              {/* Card 2: Tổng chi */}
              <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600/80 shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)] transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-555 dark:text-slate-300">
                    Tổng chi
                  </span>
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)] group-hover:scale-110 transition-transform duration-300">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400 leading-none font-mono tracking-tight drop-shadow-[0_0_10px_rgba(244,63,94,0.15)]">
                  {formatCurrency(cashflowReport.totalExpense).replace("₫", "")}
                </div>
                <div className="text-[10px] text-slate-555 dark:text-slate-355 mt-3 leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  Tổng hợp tất cả khoản chi thực tế <br/>
                  (Chi phí nhập kho, vận hành, lương, mặt bằng...)
                </div>
              </div>

              {/* Card 3: Dòng tiền ròng */}
              <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600/80 shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)] transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-555 dark:text-slate-300">
                    Dòng tiền ròng
                  </span>
                  <div className={`p-2.5 rounded-xl border group-hover:scale-110 transition-transform duration-300 ${
                    cashflowReport.netCashFlow >= 0
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                  }`}>
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className={`text-2xl font-black leading-none font-mono tracking-tight ${
                  cashflowReport.netCashFlow >= 0
                    ? "text-blue-650 dark:text-blue-400"
                    : "text-amber-650 dark:text-amber-400"
                }`}>
                  {formatCurrency(cashflowReport.netCashFlow).replace("₫", "")}
                </div>
                <div className="text-[10px] text-slate-555 dark:text-slate-355 mt-3 leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  Chênh lệch Thu - Chi thực tế của cửa hàng <br/>
                  (Phản ánh tính thanh khoản dòng tiền mặt/chuyển khoản)
                </div>
              </div>
            </div>

            {/* Thu chi theo danh mục - Redesigned */}
            <div className="bg-white/80 dark:bg-[#0D121F]/60 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm dark:shadow-2xl relative overflow-hidden group">
              {/* Ambient Glow */}
              <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />
              
              <h3 className="text-sm font-black text-slate-850 dark:text-slate-200 tracking-wide uppercase mb-5 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <Wallet className="w-4 h-4" />
                </div>
                <span>Thu chi theo danh mục</span>
              </h3>
              
              <div className="space-y-3">
                {Object.entries(cashflowReport.byCategory).map(
                  ([category, amounts]) => {
                    const catKey = getCashTxCategoryKey(category);
                    const design = getCategoryIconAndColor(catKey);
                    
                    const isIncome = amounts.income > amounts.expense || (amounts.income > 0 && amounts.expense === 0);
                    const amount = isIncome ? amounts.income : amounts.expense;
                    
                    // Share calculation relative to total income or total expense
                    const total = isIncome ? cashflowReport.totalIncome : cashflowReport.totalExpense;
                    const percentage = total > 0 ? (amount / total) * 100 : 0;
                    
                    const typeLabel = isIncome ? "Thu" : "Chi";
                    const typeColorClass = isIncome 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]";
                    const barColorClass = isIncome ? "bg-emerald-400 animate-pulse" : "bg-rose-400 animate-pulse";
                    const amountColorClass = isIncome ? "text-emerald-400" : "text-rose-400";
                    const amountSign = isIncome ? "+" : "-";

                    return (
                      <div
                        key={category}
                        className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 dark:bg-[#131926]/40 dark:hover:bg-[#1E293B]/60 border border-slate-200 dark:border-slate-800/50 dark:hover:border-slate-700/50 rounded-xl hover:shadow-md dark:hover:shadow-[0_4px_15px_rgba(0,0,0,0.3)] transition-all duration-300 group/item relative overflow-hidden"
                      >
                        {/* Internal hover ambient glow */}
                        <div className={`absolute -right-10 -bottom-10 w-20 h-20 ${design.glow} blur-2xl rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                        
                        {/* Left: Icon, Category Name, and Type Badge */}
                        <div className="flex items-center gap-3 min-w-[150px] sm:min-w-[200px]">
                          <div className={`p-2 rounded-lg border transition-transform duration-300 group-hover/item:scale-110 ${design.colorClass}`}>
                            {design.icon}
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                              {translateCategory(category)}
                            </span>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider w-fit ${typeColorClass}`}>
                              {typeLabel}
                            </span>
                          </div>
                        </div>
                        
                        {/* Center: Share Track (hidden on mobile) */}
                        <div className="hidden md:flex flex-col flex-1 max-w-xs lg:max-w-md mx-8 gap-1.5">
                          <div className="flex justify-between text-[9px] font-black uppercase text-slate-550 dark:text-slate-400 tracking-wider">
                            <span>Tỉ lệ trong tổng {isIncome ? "thu" : "chi"}</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">{percentage.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-slate-200 dark:bg-slate-900/60 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800/40 p-[2px]">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ease-out ${barColorClass}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        
                        {/* Right: Clean Cash Amount */}
                        <div className="text-right">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                            Số tiền thực tế
                          </div>
                          <div className={`font-black font-mono text-sm sm:text-base ${amountColorClass}`}>
                            {amountSign}{formatCurrency(amount)}
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
                
                {/* Net Summary Footer */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border ${
                      cashflowReport.netCashFlow >= 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    }`}>
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-550 dark:text-slate-400">Dòng tiền ròng (Thu − Chi)</div>
                      <div className="text-[9px] text-slate-500 dark:text-slate-600 mt-0.5">Tổng thu thực tế trừ tổng chi thực tế</div>
                    </div>
                  </div>
                  <div className={`font-black font-mono text-base ${
                    cashflowReport.netCashFlow >= 0
                      ? "text-emerald-650 dark:text-emerald-400"
                      : "text-rose-650 dark:text-rose-400"
                  }`}>
                    {cashflowReport.netCashFlow >= 0 ? "+" : ""}{formatCurrency(cashflowReport.netCashFlow)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "inventory" && (
          <div className="space-y-6">
            {partsLoading && (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Đang tải tồn kho...
              </div>
            )}
            {/* Thống kê cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Tổng giá trị tồn */}
              <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600/80 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-md dark:hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)] transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-555 dark:text-slate-300">
                    Tổng giá trị tồn kho
                  </span>
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-655 dark:text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] group-hover:scale-110 transition-transform duration-300">
                    <Boxes className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400 leading-none font-mono tracking-tight transition-colors">
                  {formatCurrency(inventoryReport.totalValue).replace("₫", "")}
                </div>
                <div className="text-[10px] text-slate-555 dark:text-slate-355 mt-3 leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  Tính theo giá bán lẻ hiện hành <br/>
                  (Giá trị hàng hóa sẵn có tại kho chi nhánh)
                </div>
              </div>

              {/* Card 2: Tổng sản phẩm */}
              <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600/80 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-md dark:hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)] transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-555 dark:text-slate-300">
                    Tổng danh mục sản phẩm
                  </span>
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-650 dark:text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] group-hover:scale-110 transition-transform duration-300">
                    <Tag className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400 leading-none font-mono tracking-tight transition-colors">
                  {inventoryReport.parts.length}
                </div>
                <div className="text-[10px] text-slate-555 dark:text-slate-355 mt-3 leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  Số lượng mã sản phẩm khác nhau <br/>
                  đang có hồ sơ lưu trữ và kiểm soát kho
                </div>
              </div>

              {/* Card 3: Sản phẩm sắp hết */}
              <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600/80 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-md dark:hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)] transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-555 dark:text-slate-300">
                    Sản phẩm sắp hết hàng
                  </span>
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-650 dark:text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)] group-hover:scale-110 transition-transform duration-300">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-rose-600 dark:text-rose-455 leading-none font-mono tracking-tight">
                  {inventoryReport.lowStockCount}
                </div>
                <div className="text-[10px] text-slate-555 dark:text-slate-355 mt-3 leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  Số lượng mã hàng sắp hết hàng <br/>
                  (Có tồn kho thực tế dưới 10 cái)
                </div>
              </div>
            </div>

            {inventoryReport.lowStockCount > 0 && (
              <div className="bg-white/80 dark:bg-[#0D121F]/60 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm dark:shadow-2xl mt-6">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-650 dark:text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)] animate-pulse">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black text-slate-850 dark:text-slate-200 tracking-wide uppercase">
                      Cảnh báo hàng sắp hết
                    </h3>
                    <span className="px-2.5 py-0.5 bg-rose-50 text-rose-650 dark:bg-rose-500/20 dark:text-rose-400 text-[10px] font-black uppercase rounded-full border border-rose-100 dark:border-rose-500/30">
                      {inventoryReport.lowStockCount} sản phẩm
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/40">
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                          Sản phẩm
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider w-32">
                          Tồn kho
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider w-40">
                          Đơn giá bán lẻ
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider w-44">
                          Tổng giá trị tồn
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                      {inventoryReport.lowStockItems.map((part) => (
                        <tr key={part.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="px-4 py-3 text-slate-800 dark:text-slate-300 font-extrabold">
                            {part.name}
                          </td>
                          <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400 font-black font-mono">
                            {part.stock}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 font-mono font-semibold">
                            {formatCurrency(part.price)}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-705 dark:text-slate-300 font-mono">
                            {formatCurrency(part.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Danh sách toàn bộ tồn kho */}
            <div className="bg-white/80 dark:bg-[#0D121F]/60 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm dark:shadow-2xl">
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 shadow-sm">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-wide uppercase">
                    Danh sách tồn kho
                  </h3>
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 text-[10px] font-black uppercase rounded-full border border-blue-100 dark:border-blue-500/30">
                    {inventoryReport.parts.length} sản phẩm
                  </span>
                </div>
                <div className="text-[10px] text-slate-550 dark:text-slate-500 hidden sm:block italic">
                  Đỏ: Sắp hết · Vàng: Ít hàng · Xanh: Đủ hàng
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/40">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                        Tên sản phẩm
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider w-28">
                        Tồn kho
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider w-40">
                        Đơn giá bán lẻ
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider w-44">
                        Tổng giá trị tồn
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {inventoryReport.parts
                      .slice()
                      .sort((a: any, b: any) => a.stock - b.stock)
                      .map((part: any) => {
                        const isLow = part.stock < 5;
                        const isWarning = part.stock >= 5 && part.stock < 10;
                        const stockColorClass = isLow
                          ? "text-rose-650 dark:text-rose-400 font-black"
                          : isWarning
                          ? "text-amber-600 dark:text-amber-400 font-black"
                          : "text-emerald-650 dark:text-emerald-400 font-semibold";
                        const dotColor = isLow
                          ? "bg-rose-500 dark:bg-rose-400 animate-pulse"
                          : isWarning
                          ? "bg-amber-500 dark:bg-amber-400"
                          : "bg-emerald-500/60 dark:bg-emerald-400/60";
                        return (
                          <tr key={part.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                                <span className="text-slate-800 dark:text-slate-200 font-semibold">{part.name}</span>
                              </div>
                            </td>
                            <td className={`px-4 py-3 text-center font-mono ${stockColorClass}`}>
                              {part.stock}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 font-mono">
                              {formatCurrency(part.price)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-300 font-mono">
                              {formatCurrency(part.value)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "payroll" && (
          <div className="space-y-6">
            {/* Thống kê cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Card 1: Tổng lương */}
              <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600/80 shadow-sm hover:shadow-md dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)] transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-555 dark:text-slate-300">
                    Tổng quỹ lương
                  </span>
                  <div className="p-2.5 rounded-xl bg-blue-55 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400 leading-none font-mono tracking-tight transition-colors">
                  {formatCurrency(payrollReport.totalSalary).replace("₫", "")}
                </div>
                <div className="text-[10px] text-slate-555 dark:text-slate-355 mt-3 leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  Tổng lương thực nhận của nhân viên <br/>
                  (Bao gồm lương cứng + hoa hồng thưởng)
                </div>
              </div>

              {/* Card 2: Đã thanh toán */}
              <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600/80 shadow-sm hover:shadow-md dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)] transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-555 dark:text-slate-300">
                    Đã thanh toán
                  </span>
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <Check className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none font-mono tracking-tight">
                  {formatCurrency(payrollReport.paidSalary).replace("₫", "")}
                </div>
                <div className="text-[10px] text-slate-555 dark:text-slate-355 mt-3 leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  Khoản quỹ lương đã được chi trả <br/>
                  hoàn tất và ghi nhận vào sổ quỹ
                </div>
              </div>

              {/* Card 3: Chưa thanh toán */}
              <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600/80 shadow-sm hover:shadow-md dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)] transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-555 dark:text-slate-300">
                    Lương còn nợ
                  </span>
                  <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-rose-650 dark:text-rose-400 leading-none font-mono tracking-tight">
                  {formatCurrency(payrollReport.unpaidSalary).replace("₫", "")}
                </div>
                <div className="text-[10px] text-slate-555 dark:text-slate-355 mt-3 leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  Khoản quỹ lương chưa được chi trả <br/>
                  (Tính lũy kế đến kỳ hiện tại)
                </div>
              </div>

              {/* Card 4: Số nhân viên */}
              <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600/80 shadow-sm hover:shadow-md dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)] transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-555 dark:text-slate-300">
                    Tổng số nhân viên
                  </span>
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <BriefcaseBusiness className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400 leading-none font-mono tracking-tight">
                  {payrollReport.employeeCount}
                </div>
                <div className="text-[10px] text-slate-555 dark:text-slate-355 mt-3 leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  Số nhân sự phát sinh ghi nhận công <br/>
                  và lương trong khoảng thời gian lọc
                </div>
              </div>
            </div>

            {/* Bảng chi tiết lương */}
            <div className="bg-white/80 dark:bg-[#0D121F]/60 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm dark:shadow-2xl">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400 border border-violet-100 dark:border-violet-500/20 shadow-sm">
                    <BriefcaseBusiness className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-wide uppercase">
                    Chi tiết lương nhân viên
                  </h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800/40">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                        Tháng
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                        Nhân viên
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider w-44">
                        Lương thực nhận
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider w-36">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {payrollReport.records.map((record) => {
                      const employee = employees.find(
                        (e) => e.id === record.employeeId
                      );
                      const isPaid = record.paymentStatus === "paid";
                      return (
                        <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">
                            {record.month}
                          </td>
                          <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-extrabold">
                            {record.employeeName || employee?.name || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-805 dark:text-slate-300 font-mono text-sm">
                            {formatCurrency(record.netSalary)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border tracking-wider ${
                                isPaid
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-250 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 shadow-sm dark:shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                                  : "bg-amber-50 text-amber-600 border-amber-250 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 shadow-sm dark:shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                              }`}
                            >
                              <span
                                className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse ${
                                  isPaid ? "bg-emerald-500 dark:bg-emerald-400" : "bg-amber-500 dark:bg-amber-400"
                                }`}
                              />
                              {isPaid ? "Đã trả" : "Chưa trả"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "debt" && (
          <div className="space-y-6">
            {/* Thống kê tổng quan - 3 cards ngang */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Nợ khách hàng */}
              <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600/80 shadow-sm hover:shadow-md dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)] transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-555 dark:text-slate-300">
                    Phải thu khách hàng
                  </span>
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none font-mono tracking-tight">
                  {formatCurrency(debtReport.totalCustomerDebt)}
                </div>
                <div className="text-[10px] text-slate-555 dark:text-slate-355 mt-3 leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  Lũy kế nợ từ tất cả người mua hàng <br/>
                  ({debtReport.customerDebts.length} khách hàng phát sinh công nợ)
                </div>
              </div>

              {/* Card 2: Nợ nhà cung cấp */}
              <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600/80 shadow-sm hover:shadow-md dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)] transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-555 dark:text-slate-300">
                    Phải trả nhà cung cấp
                  </span>
                  <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <Building className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-rose-650 dark:text-rose-400 leading-none font-mono tracking-tight">
                  {formatCurrency(debtReport.totalSupplierDebt)}
                </div>
                <div className="text-[10px] text-slate-555 dark:text-slate-355 mt-3 leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  Lũy kế nợ nhập kho đối với đối tác <br/>
                  ({debtReport.supplierDebts.length} nhà cung cấp phát sinh công nợ)
                </div>
              </div>

              {/* Card 3: Công nợ ròng */}
              <div className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 hover:border-slate-350 dark:hover:border-slate-600/80 shadow-sm hover:shadow-md dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_15px_45px_rgba(0,0,0,0.4)] transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-555 dark:text-slate-300">
                    Dư nợ ròng
                  </span>
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-655 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400 leading-none font-mono tracking-tight">
                  {formatCurrency(debtReport.netDebt)}
                </div>
                <div className="text-[10px] text-slate-550 dark:text-slate-400 mt-3 leading-relaxed border-t border-slate-100 dark:border-slate-850 pt-2.5">
                  Chênh lệch Phải thu - Phải trả <br/>
                  (Số tiền thực thu về sau khi cấn trừ nợ NCC)
                </div>
              </div>
            </div>

            {/* Hai cột danh sách công nợ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Công nợ khách hàng */}
              <div className="bg-white/80 dark:bg-[#0D121F]/60 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm dark:shadow-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-wide uppercase">
                    Phải thu khách hàng
                  </h3>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {debtReport.customerDebts.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 shadow-sm mb-3">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                        Không phát sinh công nợ
                      </p>
                    </div>
                  ) : (
                    debtReport.customerDebts.map((customer, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/20 rounded-xl transition-all duration-300 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-300">
                            {(customer.name || "K").charAt(0).toUpperCase()}
                          </div>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                            {customer.name}
                          </span>
                        </div>
                        <span className="text-emerald-650 dark:text-emerald-400 font-mono font-black text-xs">
                          {formatCurrency(customer.debt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Công nợ nhà cung cấp */}
              <div className="bg-white/80 dark:bg-[#0D121F]/60 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm dark:shadow-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 shadow-sm">
                    <Building className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-wide uppercase">
                    Phải trả nhà cung cấp
                  </h3>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {debtReport.supplierDebts.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 shadow-sm mb-3">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-black uppercase text-slate-550 dark:text-slate-400 tracking-wider">
                        Không phát sinh công nợ
                      </p>
                    </div>
                  ) : (
                    debtReport.supplierDebts.map((supplier, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/20 rounded-xl transition-all duration-300 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-300">
                            {(supplier.name || "N").charAt(0).toUpperCase()}
                          </div>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                            {supplier.name}
                          </span>
                        </div>
                        <span className="text-rose-650 dark:text-rose-400 font-mono font-black text-xs">
                          {formatCurrency(supplier.debt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "tax" && (
          <TaxReportExport />
        )}
      </div>
      {/* Daily Detail - now inline in table, modal removed */}
    </div>
  );
};

export default ReportsManager;
