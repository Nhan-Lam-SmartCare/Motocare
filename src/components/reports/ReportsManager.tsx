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
import type { Sale, Part, WorkOrder } from "../../types";
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
import { DailyDetailModal } from "../reports/DailyDetailModal";
import { ReportsManagerMobile } from "../reports/ReportsManagerMobile";
import TaxReportExport from "../reports/TaxReportExport";

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
        "bg-white dark:bg-slate-900/60 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-700 hover:bg-blue-50/80 dark:hover:bg-blue-900/20",
      dotClass: "bg-blue-400",
    },
    {
      key: "cashflow",
      label: "Thu chi",
      icon: <Wallet className="w-4 h-4" />,
      activeClass:
        "bg-gradient-to-r from-emerald-500 to-lime-500 text-white border-transparent shadow-lg shadow-emerald-500/30",
      inactiveClass:
        "bg-white dark:bg-slate-900/60 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50/70 dark:hover:bg-emerald-900/20",
      dotClass: "bg-emerald-400",
    },
    {
      key: "inventory",
      label: "Tồn kho",
      icon: <Boxes className="w-4 h-4" />,
      activeClass:
        "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-lg shadow-orange-500/30",
      inactiveClass:
        "bg-white dark:bg-slate-900/60 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-800 hover:bg-amber-50/70 dark:hover:bg-amber-900/20",
      dotClass: "bg-amber-400",
    },
    {
      key: "payroll",
      label: "Lương",
      icon: <BriefcaseBusiness className="w-4 h-4" />,
      activeClass:
        "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-transparent shadow-lg shadow-violet-500/30",
      inactiveClass:
        "bg-white dark:bg-slate-900/60 text-violet-700 dark:text-violet-200 border-violet-200 dark:border-violet-800 hover:bg-violet-50/70 dark:hover:bg-violet-900/20",
      dotClass: "bg-violet-400",
    },
    {
      key: "debt",
      label: "Công nợ",
      icon: <ClipboardList className="w-4 h-4" />,
      activeClass:
        "bg-gradient-to-r from-rose-500 to-red-500 text-white border-transparent shadow-lg shadow-rose-500/30",
      inactiveClass:
        "bg-white dark:bg-slate-900/60 text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-800 hover:bg-rose-50/70 dark:hover:bg-rose-900/20",
      dotClass: "bg-rose-400",
    },
    {
      key: "tax",
      label: "Báo cáo thuế",
      icon: <FileText className="w-4 h-4" />,
      activeClass:
        "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent shadow-lg shadow-indigo-500/30",
      inactiveClass:
        "bg-white dark:bg-slate-900/60 text-indigo-700 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50/70 dark:hover:bg-indigo-900/20",
      dotClass: "bg-indigo-400",
    },
  ];

const ReportsManager: React.FC = () => {
  const { payrollRecords, customers, suppliers, currentBranchId, employees } =
    useAppContext();
  // Repository data (Supabase-backed)
  const { data: salesData = [], isLoading: salesLoading } = useSalesRepo();
  const { data: partsData = [], isLoading: partsLoading } = usePartsRepo();
  const { data: workOrdersData = [], isLoading: workOrdersLoading } =
    useWorkOrders();
  const { data: customerDebtsData = [], isLoading: customerDebtsLoading } =
    useCustomerDebtsRepo();
  const { data: supplierDebtsData = [], isLoading: supplierDebtsLoading } =
    useSupplierDebtsRepo();

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

    const salesRevenue = summary.salesRevenue;
    const salesCost = summary.salesCost;
    const woRevenue = summary.woRevenue;
    const woCost = summary.woCost;

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
      const dateKey = new Date(sale.date).toISOString().split("T")[0];
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
      const dateKey = woDateObj.toISOString().split("T")[0];

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

  // Sorted daily report based on sortColumn and sortDirection
  const sortedDailyReport = useMemo(() => {
    if (!sortColumn) return revenueReport.dailyReport;

    return [...revenueReport.dailyReport].sort((a, b) => {
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
  }, [revenueReport.dailyReport, sortColumn, sortDirection]);

  // Báo cáo thu chi
  // Fetch cash transactions via repository with range filters
  const { data: cashTxData = [], isLoading: cashTxLoading } = useCashTxRepo({
    branchId: currentBranchId,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  });

  // Exclusion logic is shared (Dashboard/Analytics/Reports) to keep numbers consistent.

  const translateCategory = (category: string): string => {
    return formatCashTxCategory(category);
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
    console.log("[ReportsManager] Cash totals:", {
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
        case "payroll":
          const startMonth = start.toISOString().slice(0, 7);
          const endMonth = end.toISOString().slice(0, 7);
          exportPayrollReport(payrollReport.records, startMonth, endMonth);
          break;
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

  const printReport = () => {
    window.print();
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
      />

      {/* Desktop Controls - Hidden on Mobile */}
      <div className="hidden md:flex items-center gap-2 flex-wrap">
        {/* Report Tabs */}
        {REPORT_TAB_CONFIGS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              type="button"
              aria-pressed={isActive}
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border text-sm ${isActive ? tab.activeClass : tab.inactiveClass
                }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={`w-2 h-2 rounded-full ${isActive ? "bg-white/90" : tab.dotClass
                    }`}
                ></span>
                {tab.icon}
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Divider */}
        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>

        {/* Date Range Selector */}
        {(["today", "week", "month", "quarter", "year", "custom"] as const).map(
          (range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${dateRange === range
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
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

        {dateRange === "month" && (
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedMonth === month
                  ? "bg-blue-600 text-white shadow-md scale-105"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:scale-105"
                  }`}
              >
                T{month}
              </button>
            ))}
          </div>
        )}

        {dateRange === "custom" && (
          <>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            />
            <span className="text-slate-500 dark:text-slate-400">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            />
          </>
        )}

        {/* Export Excel Button */}
        <div className="ml-auto flex gap-2">
          <button
            onClick={exportToExcel}
            className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center gap-1.5 text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> Xuất Excel
          </button>

          {/* Advanced Reports Dropdown */}
          {activeTab === "revenue" && (
            <div className="relative group">
              <button className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center gap-1.5 text-sm">
                <TrendingUp className="w-4 h-4" /> Báo cáo nâng cao
              </button>

              {/* Dropdown menu */}
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
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
                  className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 rounded-t-lg"
                >
                  <Tag className="w-4 h-4 text-blue-600" />
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
                  className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 rounded-b-lg"
                >
                  <BadgePercent className="w-4 h-4 text-green-600" />
                  <span>Lợi nhuận theo sản phẩm</span>
                </button>
              </div>
            </div>
          )}

          {/* Inventory Advanced Report */}
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
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center gap-2"
            >
              <Boxes className="w-4 h-4" /> Tồn kho chi tiết
            </button>
          )}
        </div>
      </div>

      {/* Report Content - Desktop Only */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        {activeTab === "revenue" && (
          <div className="space-y-4">
            {salesLoading && (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Đang tải doanh thu...
              </div>
            )}
            {/* Thống kê cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 mb-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Tổng doanh thu
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(combinedRevenue).replace("₫", "")}
                </div>
                <div className="text-[10px] text-blue-600/70 dark:text-blue-400/70 mt-0.5">
                  đ (Bán hàng: {formatCurrency(revenueReport.totalRevenue)} +
                  Phiếu thu: {formatCurrency(cashTotals.totalIncome)})
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 mb-1.5">
                  <Wallet className="w-3.5 h-3.5" /> Tổng chi phí
                </div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(
                    revenueReport.totalCost + cashTotals.totalExpense
                  ).replace("₫", "")}
                </div>
                <div className="text-[10px] text-red-600/70 dark:text-red-400/70 mt-0.5">
                  đ (Giá vốn: {formatCurrency(revenueReport.totalCost)} + Phiếu
                  chi: {formatCurrency(cashTotals.totalExpense)})
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 mb-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Lợi nhuận thuần
                </div>
                <div
                  className={`text-2xl font-bold ${netProfit >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                    }`}
                >
                  {formatCurrency(netProfit).replace("₫", "")}
                </div>
                <div className="text-[10px] text-green-600/70 dark:text-green-400/70 mt-0.5">
                  đ (Lợi nhuận gộp: {formatCurrency(revenueReport.totalProfit)}{" "}
                  - Phiếu chi: {formatCurrency(cashTotals.totalExpense)})
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-1 text-xs font-medium text-purple-700 dark:text-purple-400 mb-1.5">
                  <BadgePercent className="w-3.5 h-3.5" /> Tỷ suất lợi nhuận
                  thuần
                </div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {combinedRevenue > 0
                    ? ((netProfit / combinedRevenue) * 100).toFixed(1)
                    : 0}
                </div>
                <div className="text-[10px] text-purple-600/70 dark:text-purple-400/70 mt-0.5">
                  % (Lợi nhuận thuần / Doanh thu tổng)
                </div>
              </div>
            </div>

            {/* Bảng chi tiết theo ngày - Redesigned */}
            <div className="bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden shadow-xl">
              {/* Table Header */}
              <div className="px-5 py-3.5 border-b border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-base">📅</span>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Chi tiết theo ngày
                  </h3>
                  <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 text-[11px] font-semibold rounded-full border border-amber-500/30">
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
                    <tr className="border-b border-slate-700/70">
                      <th rowSpan={2} className="px-2 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider w-8 bg-slate-800/50">
                        #
                      </th>
                      <th
                        rowSpan={2}
                        className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none bg-slate-800/50"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Ngày</span>
                          {sortColumn === "date" && (
                            <span className="text-amber-400 text-xs">
                              {sortDirection === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                      {/* DOANH THU group */}
                      <th colSpan={2} className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest bg-slate-800/30 border-l border-slate-700/50">
                        <span className="text-emerald-400">DOANH THU</span>
                      </th>
                      {/* GIÁ VỐN HÀNG BÁN group */}
                      <th colSpan={2} className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest bg-slate-800/30 border-l border-slate-700/50">
                        <span className="text-sky-400">GIÁ VỐN HÀNG BÁN</span>
                      </th>
                      {/* LỢI NHUẬN group */}
                      <th colSpan={3} className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest bg-slate-800/30 border-l border-slate-700/50">
                        <span className="text-rose-400">LỢI NHUẬN</span>
                      </th>
                    </tr>
                    <tr className="border-b border-slate-700/70 bg-slate-800/40">
                      {/* DOANH THU sub-columns */}
                      <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-slate-400 border-l border-slate-700/50">Bán hàng</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-slate-400">Sửa chữa</th>
                      {/* GIÁ VỐN sub-columns */}
                      <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-slate-400 border-l border-slate-700/50">Vốn BH</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-slate-400">Vật tư SC</th>
                      {/* LỢI NHUẬN sub-columns */}
                      <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-slate-400 border-l border-slate-700/50">Lãi gộp</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-slate-400">Thu/Chi khác</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-bold text-slate-300">Lãi ròng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDailyReport.map((day, index) => {
                      const isExpanded = selectedDate === day.date;
                      // Tách riêng doanh thu bán hàng và sửa chữa
                      const salesRevenue = day.sales.reduce((sum, s) => sum + s.total, 0);
                      const woRevenue = day.workOrders.reduce((sum, wo: any) => sum + (wo.totalPaid || wo.totalpaid || wo.total || 0), 0);
                      // Giá vốn: COGS (bán hàng), Vật tư SC (sửa chữa)
                      const salesCOGS = day.sales.reduce((sum, s) => {
                        return sum + s.items.reduce((c, it: any) => {
                          const cost = it.costPrice || partsCostMap.get(it.partId) || partsCostMap.get(it.sku) || 0;
                          return c + cost * it.quantity;
                        }, 0);
                      }, 0);
                      const woParts = day.workOrders.reduce((sum, wo: any) => {
                        const parts = wo.partsUsed || wo.partsused || [];
                        return sum + parts.reduce((c: number, p: any) => {
                          const partId = p.partId || p.partid;
                          const cost = p.costPrice || p.costprice || partsCostMap.get(partId) || partsCostMap.get(p.sku) || 0;
                          return c + cost * (p.quantity || 0);
                        }, 0);
                      }, 0);
                      const laiGop = (salesRevenue + woRevenue) - (salesCOGS + woParts);
                      // Tính phiếu thu/chi theo ngày
                      const dayDateStr = day.date;
                      const thuKhac = cashTxData
                        .filter(t => t.type === "income" && !isExcludedIncomeCategory(t.category) && t.date.slice(0, 10) === dayDateStr)
                        .reduce((sum, t) => sum + t.amount, 0);
                      const chiKhac = cashTxData
                        .filter(t => t.type === "expense" && t.amount > 0 && !isExcludedExpenseCategory(t.category) && t.date.slice(0, 10) === dayDateStr)
                        .reduce((sum, t) => sum + t.amount, 0);
                      // Hoàn tiền (giá bán âm): trừ vào doanh thu, hiện thị trong Thu/Chi khác
                      const chiHoan = cashTxData
                        .filter(t => t.type === "expense" && t.amount > 0 && isRefundCategory(t.category) && t.date.slice(0, 10) === dayDateStr)
                        .reduce((sum, t) => sum + t.amount, 0);
                      const thuChiKhac = thuKhac - chiKhac - chiHoan;
                      const laiRong = laiGop + thuKhac - chiKhac - chiHoan;
                      // Chi tiết giao dịch khác cho ngày (bao gồm cả hoàn tiền)
                      const dayCashTx = cashTxData.filter(t =>
                        t.date.slice(0, 10) === dayDateStr &&
                        (
                          (!isExcludedIncomeCategory(t.category) && !isExcludedExpenseCategory(t.category)) ||
                          (t.type === "expense" && t.amount > 0 && isRefundCategory(t.category))
                        )
                      );

                      return (
                        <React.Fragment key={day.date}>
                          <tr
                            className={`border-b border-slate-800 cursor-pointer transition-colors group ${isExpanded ? 'bg-slate-800/80' : 'hover:bg-slate-800/40'}`}
                            onClick={() => setSelectedDate(isExpanded ? null : day.date)}
                            title="Nhấn để xem chi tiết"
                          >
                            <td className="px-2 py-2.5 text-center text-xs font-medium text-slate-500">
                              {isExpanded ? (
                                <span className="text-amber-400 text-[10px]">▼</span>
                              ) : (
                                <span>{index + 1}</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-xs font-semibold text-blue-400 group-hover:text-blue-300">
                              {new Date(day.date).toLocaleDateString("vi-VN")}
                            </td>
                            {/* Bán hàng */}
                            <td className={`px-2 py-2.5 text-right text-xs font-semibold border-l border-slate-800 ${salesRevenue === 0 ? 'text-slate-600' : 'text-orange-400'}`}>
                              {salesRevenue === 0 ? '-' : formatCurrency(salesRevenue)}
                            </td>
                            {/* Sửa chữa */}
                            <td className={`px-2 py-2.5 text-right text-xs font-semibold ${woRevenue === 0 ? 'text-slate-600' : 'text-amber-400'}`}>
                              {woRevenue === 0 ? '-' : formatCurrency(woRevenue)}
                            </td>
                            {/* COGS */}
                            <td className={`px-2 py-2.5 text-right text-xs border-l border-slate-800 ${salesCOGS === 0 ? 'text-slate-600' : 'text-sky-400'}`}>
                              {salesCOGS === 0 ? '-' : formatCurrency(salesCOGS)}
                            </td>
                            {/* Vật tư SC */}
                            <td className={`px-2 py-2.5 text-right text-xs ${woParts === 0 ? 'text-slate-600' : 'text-cyan-400'}`}>
                              {woParts === 0 ? '-' : formatCurrency(woParts)}
                            </td>
                            {/* Lãi gộp */}
                            <td className={`px-2 py-2.5 text-right text-xs font-semibold border-l border-slate-800 ${laiGop === 0 ? 'text-slate-600' : 'text-emerald-400'}`}>
                              {laiGop === 0 ? '-' : formatCurrency(laiGop)}
                            </td>
                            {/* Thu/Chi khác */}
                            <td className={`px-2 py-2.5 text-right text-xs ${thuChiKhac === 0 ? 'text-slate-600' : thuChiKhac > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {thuChiKhac === 0 ? '-' : (thuChiKhac > 0 ? '+' : '') + formatCurrency(thuChiKhac)}
                            </td>
                            {/* Lãi ròng */}
                            <td className={`px-2 py-2.5 text-right text-xs font-bold ${laiRong === 0 ? 'text-slate-600' : laiRong > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {laiRong === 0 ? '-' : (laiRong > 0 ? '+' : '') + formatCurrency(laiRong)}
                            </td>
                          </tr>

                          {/* Expanded Detail Row */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={9} className="p-0">
                                <div className="bg-slate-850 border-t border-b border-slate-700/50 px-4 py-4" style={{ backgroundColor: 'rgb(17 24 39)' }}>
                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    {/* CÁCH TÍNH LỢI NHUẬN */}
                                    <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
                                      <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <span className="text-base">📊</span>
                                        CÁCH TÍNH LỢI NHUẬN NGÀY {new Date(day.date).toLocaleDateString('vi-VN')}
                                      </h4>
                                      <div className="space-y-2.5 text-xs">
                                        <div className="flex justify-between items-center">
                                          <span className="text-slate-400">Doanh thu bán hàng</span>
                                          <span className="font-bold text-white">{formatCurrency(salesRevenue + woRevenue)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-slate-400">(-) Giá vốn hàng bán</span>
                                          <span className="font-bold text-rose-400">- {formatCurrency(salesCOGS + woParts)}</span>
                                        </div>
                                        <div className="border-t border-slate-700/50 pt-2 flex justify-between items-center">
                                          <span className="text-slate-300 font-medium">= Lãi gộp bán hàng</span>
                                          <span className="font-bold text-emerald-400">{formatCurrency(laiGop)}</span>
                                        </div>
                                        {thuChiKhac !== 0 && (
                                          <div className="flex justify-between items-center">
                                            <span className="text-slate-400">{thuChiKhac > 0 ? '(+) Thu khác' : '(-) Chi khác'}</span>
                                            <span className={`font-bold ${thuChiKhac > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                              {thuChiKhac > 0 ? '+' : ''}{formatCurrency(thuChiKhac)}
                                            </span>
                                          </div>
                                        )}
                                        <div className="border-t-2 border-slate-600 pt-2.5 flex justify-between items-center">
                                          <span className="text-white font-black text-sm">= LÃI RÒNG</span>
                                          <span className={`font-black text-base ${laiRong >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {laiRong > 0 ? '+' : ''}{formatCurrency(laiRong)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* ĐƠN BÁN HÀNG */}
                                    <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
                                      <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <span className="text-base">📦</span>
                                        ĐƠN BÁN HÀNG ({day.sales.length})
                                      </h4>
                                      {day.sales.length === 0 ? (
                                        <div className="text-xs text-slate-500 py-4 text-center">Không có đơn BH</div>
                                      ) : (
                                        <>
                                        {/* Tổng bán hàng */}
                                        <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-slate-700/50">
                                          <div className="text-[11px] text-slate-400">Tổng doanh thu</div>
                                          <div className="text-right">
                                            <span className="font-bold text-sky-400 text-xs">{formatCurrency(salesRevenue)}</span>
                                            <span className={`text-[10px] ml-2 ${salesRevenue - salesCOGS >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                                              <div key={sale.id} className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/30">
                                                <div className="flex justify-between items-start mb-1.5">
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-white text-xs">{sale.customer.name}</span>
                                                    {saleProfit > 0 && <span className="text-amber-400 text-xs">⭐</span>}
                                                  </div>
                                                  <div className="text-right">
                                                    <div className="font-bold text-sky-400 text-xs">{formatCurrency(sale.total)}</div>
                                                    <div className={`text-[10px] mt-0.5 ${saleProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                      Lãi: {formatCurrency(saleProfit)}
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="text-[10px] text-slate-500 mb-1.5">
                                                  {sale.sale_code || '---'} • {sale.paymentMethod === 'bank' ? 'CK' : 'TM'}
                                                </div>
                                                <div className="space-y-0.5">
                                                  {sale.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-[10px]">
                                                      <span className="text-slate-400 truncate mr-2">{item.partName}</span>
                                                      <span className="text-slate-300 whitespace-nowrap flex-shrink-0">
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
                                      <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
                                        <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                                          <span className="text-base">⚙️</span>
                                          SỬA CHỮA ({day.workOrders.length})
                                        </h4>
                                        {day.workOrders.length === 0 ? (
                                          <div className="text-xs text-slate-500 py-2 text-center">Không có đơn SC</div>
                                        ) : (
                                          <>
                                          {/* Tổng sửa chữa */}
                                          <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-slate-700/50">
                                            <div className="text-[11px] text-slate-400">Tổng doanh thu</div>
                                            <div className="text-right">
                                              <span className="font-bold text-purple-400 text-xs">{formatCurrency(woRevenue)}</span>
                                              <span className={`text-[10px] ml-2 ${woRevenue - woParts >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                Lãi: {formatCurrency(woRevenue - woParts)}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                            {day.workOrders.map((wo: any) => {
                                              const woTotal = wo.totalPaid || wo.totalpaid || wo.total || 0;
                                              const woPartsCost = (wo.partsUsed || wo.partsused || []).reduce((c: number, p: any) => {
                                                const partId = p.partId || p.partid;
                                                const cost = p.costPrice || p.costprice || partsCostMap.get(partId) || partsCostMap.get(p.sku) || 0;
                                                return c + cost * (p.quantity || 0);
                                              }, 0);
                                              const woProfit = woTotal - woPartsCost;
                                              return (
                                                <div key={wo.id} className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-700/30">
                                                  <div className="flex justify-between items-start">
                                                    <div>
                                                      <div className="font-semibold text-white text-[11px]">{wo.customerName || wo.customername}</div>
                                                      <div className="text-[10px] text-slate-500">{wo.vehicleModel || wo.vehiclemodel || ''} {wo.licensePlate || wo.licenseplate || ''}</div>
                                                    </div>
                                                    <div className="text-right">
                                                      <div className="font-bold text-purple-400 text-xs">{formatCurrency(woTotal)}</div>
                                                      <div className={`text-[10px] mt-0.5 ${woProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        Lãi: {formatCurrency(woProfit)}
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
                                      <div className="bg-slate-800/80 rounded-xl border border-slate-700/50 p-4">
                                        <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                                          <span className="text-base">💰</span>
                                          GIAO DỊCH KHÁC ({dayCashTx.length})
                                        </h4>
                                        {dayCashTx.length === 0 ? (
                                          <div className="text-xs text-slate-500 py-2 text-center">Không có giao dịch</div>
                                        ) : (
                                          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                            {dayCashTx.map((tx) => (
                                              <div key={tx.id} className="flex justify-between items-center text-[11px]">
                                                <span className="text-slate-400 truncate mr-2">
                                                  {(tx as any).description || tx.notes || formatCashTxCategory(tx.category || '')}
                                                </span>
                                                <span className={`font-bold whitespace-nowrap flex-shrink-0 ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                        <tr className="border-t-2 border-slate-600 bg-slate-800/60">
                          <td colSpan={2} className="px-3 py-2.5 text-left text-xs font-black text-white uppercase tracking-wider">
                            Tổng:
                          </td>
                          <td className={`px-2 py-2.5 text-right text-xs font-bold border-l border-slate-700/50 ${totalSalesRev === 0 ? 'text-slate-600' : 'text-orange-400'}`}>
                            {formatCurrency(totalSalesRev)}
                          </td>
                          <td className={`px-2 py-2.5 text-right text-xs font-bold ${totalWoRev === 0 ? 'text-slate-600' : 'text-amber-400'}`}>
                            {formatCurrency(totalWoRev)}
                          </td>
                          <td className={`px-2 py-2.5 text-right text-xs font-bold border-l border-slate-700/50 ${totalSalesCOGS === 0 ? 'text-slate-600' : 'text-sky-400'}`}>
                            {formatCurrency(totalSalesCOGS)}
                          </td>
                          <td className={`px-2 py-2.5 text-right text-xs font-bold ${totalWoParts === 0 ? 'text-slate-600' : 'text-cyan-400'}`}>
                            {formatCurrency(totalWoParts)}
                          </td>
                          <td className={`px-2 py-2.5 text-right text-xs font-bold border-l border-slate-700/50 ${totalLaiGop === 0 ? 'text-slate-600' : 'text-emerald-400'}`}>
                            {formatCurrency(totalLaiGop)}
                          </td>
                          <td className={`px-2 py-2.5 text-right text-xs font-bold ${totalThuChiKhac === 0 ? 'text-slate-600' : totalThuChiKhac > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {totalThuChiKhac === 0 ? '-' : (totalThuChiKhac > 0 ? '+' : '') + formatCurrency(totalThuChiKhac)}
                          </td>
                          <td className={`px-2 py-2.5 text-right text-xs font-black ${netProfit === 0 ? 'text-slate-600' : netProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
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
            {false && (
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-1.5">
                  <span className="inline-flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5" /> Tổng thu
                  </span>
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(cashflowReport.totalIncome).replace("₫", "")}
                </div>
                <div className="text-[10px] text-green-600 dark:text-green-400 mt-0.5">
                  đ
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <div className="text-xs font-medium text-red-700 dark:text-red-400 mb-1.5 inline-flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-3.5 h-3.5"
                  >
                    <rect x="2" y="6" width="20" height="12" rx="2" ry="2" />
                    <circle cx="12" cy="12" r="2" />
                    <path d="M6 12h.01M18 12h.01" />
                  </svg>
                  Tổng chi
                </div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(cashflowReport.totalExpense).replace("₫", "")}
                </div>
                <div className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                  đ
                </div>
              </div>

              <div
                className={`bg-gradient-to-br rounded-lg p-4 border ${cashflowReport.netCashFlow >= 0
                  ? "from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800"
                  : "from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800"
                  }`}
              >
                <div
                  className={`text-sm font-medium mb-2 ${cashflowReport.netCashFlow >= 0
                    ? "text-blue-700 dark:text-blue-400"
                    : "text-orange-700 dark:text-orange-400"
                    }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <DollarSign className="w-4 h-4" /> Dòng tiền ròng
                  </span>
                </div>
                <div
                  className={`text-3xl font-bold ${cashflowReport.netCashFlow >= 0
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-orange-600 dark:text-orange-400"
                    }`}
                >
                  {formatCurrency(cashflowReport.netCashFlow).replace("₫", "")}
                </div>
                <div
                  className={`text-xs mt-1 ${cashflowReport.netCashFlow >= 0
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-orange-600 dark:text-orange-400"
                    }`}
                >
                  đ
                </div>
              </div>
            </div>

            {/* Thu chi theo danh mục */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Thu chi theo danh mục
              </h3>
              <div className="space-y-3">
                {Object.entries(cashflowReport.byCategory).map(
                  ([category, amounts]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {translateCategory(category)}
                      </span>
                      <div className="flex gap-6">
                        <div className="text-right">
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                            Thu
                          </div>
                          <div className="text-green-600 dark:text-green-400 font-bold">
                            {formatCurrency(amounts.income)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                            Chi
                          </div>
                          <div className="text-red-600 dark:text-red-400 font-bold">
                            {formatCurrency(amounts.expense)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
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
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                <div className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                  <span className="inline-flex items-center gap-1">
                    <Boxes className="w-4 h-4" /> Tổng giá trị tồn kho
                  </span>
                </div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(inventoryReport.totalValue).replace("₫", "")}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  đ
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
                <div className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-2">
                  <span className="inline-flex items-center gap-1">
                    <Tag className="w-4 h-4" /> Tổng sản phẩm
                  </span>
                </div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {inventoryReport.parts.length}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  sản phẩm
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
                <div className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                  <span className="inline-flex items-center gap-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4 text-amber-500"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v4m0 4h.01"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                      />
                    </svg>
                    Sản phẩm sắp hết
                  </span>
                </div>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {inventoryReport.lowStockCount}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  sản phẩm
                </div>
              </div>
            </div>

            {inventoryReport.lowStockCount > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  <span className="inline-flex items-center gap-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4 text-amber-500"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v4m0 4h.01"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                      />
                    </svg>
                    Cảnh báo hàng sắp hết
                  </span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                          Sản phẩm
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                          Tồn kho
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                          Đơn giá
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                          Giá trị
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {inventoryReport.lowStockItems.map((part) => (
                        <tr key={part.id}>
                          <td className="px-4 py-2 text-sm text-slate-900 dark:text-white">
                            {part.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-red-600 dark:text-red-400 font-medium">
                            {part.stock}
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-slate-900 dark:text-white">
                            {formatCurrency(part.price)}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-medium text-slate-900 dark:text-white">
                            {formatCurrency(part.value)}
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

        {activeTab === "payroll" && (
          <div className="space-y-6">
            {/* Thống kê cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                <div className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                  <span className="inline-flex items-center gap-1">
                    <DollarSign className="w-4 h-4" /> Tổng lương
                  </span>
                </div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(payrollReport.totalSalary).replace("₫", "")}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  đ
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
                <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                  <span className="inline-flex items-center gap-1">
                    <Check className="w-4 h-4" /> Đã thanh toán
                  </span>
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(payrollReport.paidSalary).replace("₫", "")}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  đ
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
                <div className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                  ⏳ Chưa thanh toán
                </div>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(payrollReport.unpaidSalary).replace("₫", "")}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  đ
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
                <div className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-2">
                  <span className="inline-flex items-center gap-1">
                    <BriefcaseBusiness className="w-4 h-4" /> Số nhân viên
                  </span>
                </div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {payrollReport.employeeCount}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  nhân viên
                </div>
              </div>
            </div>

            {/* Bảng chi tiết lương */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Chi tiết lương
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                        Tháng
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                        Nhân viên
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                        Lương thực nhận
                      </th>
                      <th className="px-4 py-2 text-center text-sm font-medium text-slate-700 dark:text-slate-300">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {payrollReport.records.map((record) => {
                      const employee = employees.find(
                        (e) => e.id === record.employeeId
                      );
                      return (
                        <tr key={record.id}>
                          <td className="px-4 py-2 text-sm text-slate-900 dark:text-white">
                            {record.month}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-900 dark:text-white">
                            {record.employeeName || employee?.name || "N/A"}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-medium text-slate-900 dark:text-white">
                            {formatCurrency(record.netSalary)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${record.paymentStatus === "paid"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                }`}
                            >
                              {record.paymentStatus === "paid"
                                ? "Đã trả"
                                : "Chưa trả"}
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
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
                <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                  Nợ khách hàng
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(debtReport.totalCustomerDebt)}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {debtReport.customerDebts.length} khách hàng
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
                <div className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                  Nợ nhà cung cấp
                </div>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(debtReport.totalSupplierDebt)}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {debtReport.supplierDebts.length} nhà cung cấp
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                <div className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                  Công nợ ròng
                </div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(debtReport.netDebt)}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Khách nợ - Nợ NCC
                </div>
              </div>
            </div>

            {/* Hai cột danh sách công nợ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Công nợ khách hàng */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                  Công nợ khách hàng
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {debtReport.customerDebts.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-3">✓</div>
                      <p className="text-slate-500 dark:text-slate-400">
                        Không có công nợ
                      </p>
                    </div>
                  ) : (
                    debtReport.customerDebts.map((customer, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <span className="font-medium text-slate-900 dark:text-white">
                          {customer.name}
                        </span>
                        <span className="text-green-600 dark:text-green-400 font-bold">
                          {formatCurrency(customer.debt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Công nợ nhà cung cấp */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="text-red-600 dark:text-red-400">🏢</span>
                  Công nợ nhà cung cấp
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {debtReport.supplierDebts.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-3">✓</div>
                      <p className="text-slate-500 dark:text-slate-400">
                        Không có công nợ
                      </p>
                    </div>
                  ) : (
                    debtReport.supplierDebts.map((supplier, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <span className="font-medium text-slate-900 dark:text-white">
                          {supplier.name}
                        </span>
                        <span className="text-red-600 dark:text-red-400 font-bold">
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

// Stat Card Component
const StatCard: React.FC<{
  label: string;
  value: string;
  color: "blue" | "green" | "red" | "purple";
}> = ({ label, value, color }) => {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    green:
      "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    purple:
      "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  };

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="text-sm font-medium opacity-75 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
};

export default ReportsManager;
