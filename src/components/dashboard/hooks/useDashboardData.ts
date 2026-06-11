import { useMemo } from "react";
import { useSalesRepo } from "../../../hooks/useSalesRepository";
import { useWorkOrdersRepo } from "../../../hooks/useWorkOrdersRepository";
import { usePartsRepo } from "../../../hooks/usePartsRepository";
import { useCashTxRepo } from "../../../hooks/useCashTransactionsRepository";
import { useCashBalance } from "../../../hooks/useCashBalance";
import { useLoansRepo } from "../../../hooks/useLoansRepository";
import { useAppContext } from "../../../contexts/AppContext";

import { calculateFinancialSummary, buildPartsCostMap, getPartCost } from "../../../lib/reports/financialSummary";

export const useDashboardData = (
    reportFilter: string,
    _selectedMonth?: number,
    _selectedQuarter?: number
) => {
    const { data: sales = [] } = useSalesRepo();
    const { data: workOrders = [] } = useWorkOrdersRepo();
    const { data: parts = [] } = usePartsRepo();
    const { data: cashTransactions = [] } = useCashTxRepo();
    const { cashBalance, bankBalance } = useCashBalance();
    const { data: loans = [] } = useLoansRepo();
    const { currentBranchId } = useAppContext();

    // Thống kê hôm nay (bao gồm cả Sales và Work Orders đã thanh toán)
    const todayStats = useMemo(() => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const summary = calculateFinancialSummary({
            sales,
            workOrders,
            parts,
            cashTransactions,
            branchId: currentBranchId,
            start,
            end,
        });

        const revenue = summary.combinedRevenue;
        const grossProfit = summary.totalProfit;
        const profit = summary.netProfit;
        const income = summary.cashIncome;
        const expense = summary.cashExpense;

        const salesCustomers = summary.filteredSales.map(
            (s: any) => s?.customer?.phone || s?.customer?.name
        );
        const woCustomers = summary.filteredWorkOrders.map(
            (wo: any) =>
                wo?.customerPhone ||
                wo?.customerphone ||
                wo?.customerName ||
                wo?.customername
        );
        const customerCount = new Set([...salesCustomers, ...woCustomers].filter(Boolean)).size;

        return {
            revenue,
            profit,
            grossProfit,
            income,
            expense,
            customerCount,
            orderCount: summary.orderCount,
            salesCount: summary.salesCount,
            workOrdersCount: summary.workOrdersCount,
        };
    }, [sales, workOrders, parts, cashTransactions, currentBranchId]);

    // Thống kê theo filter (bao gồm cả Sales và Work Orders)
    const filteredStats = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now; // Ngày hiện tại

        // Handle specific month filters (month1, month2, ... month12)
        if (reportFilter.startsWith("month") && reportFilter.length > 5) {
            const monthNum = parseInt(reportFilter.slice(5), 10);
            if (monthNum >= 1 && monthNum <= 12) {
                startDate = new Date(now.getFullYear(), monthNum - 1, 1);
                endDate = new Date(now.getFullYear(), monthNum, 0); // Last day of month
            } else {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
        }
        // Handle quarter filters (q1, q2, q3, q4)
        else if (reportFilter.startsWith("q") && reportFilter.length === 2) {
            const quarterNum = parseInt(reportFilter.slice(1), 10);
            if (quarterNum >= 1 && quarterNum <= 4) {
                const startMonth = (quarterNum - 1) * 3;
                startDate = new Date(now.getFullYear(), startMonth, 1);
                endDate = new Date(now.getFullYear(), startMonth + 3, 0); // Last day of quarter
            } else {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
        }
        // Handle standard filters
        else {
            switch (reportFilter) {
                case "today":
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case "7days":
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case "week":
                {
                    const dayOfWeek = now.getDay();
                    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
                    startDate = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        now.getDate() - diff
                    );
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                }
                case "month":
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case "year":
                    startDate = new Date(now.getFullYear(), 0, 1);
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                default:
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            }
        }

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const summary = calculateFinancialSummary({
            sales,
            workOrders,
            parts,
            cashTransactions,
            branchId: currentBranchId,
            start: startDate,
            end: endDate,
        });

        const revenue = summary.combinedRevenue;
        const grossProfit = summary.totalProfit;
        const profit = summary.netProfit;
        const income = summary.cashIncome;
        const expense = summary.cashExpense;

        const salesCustomers = summary.filteredSales.map(
            (s: any) => s?.customer?.phone || s?.customer?.name
        );
        const woCustomers = summary.filteredWorkOrders.map(
            (wo: any) =>
                wo?.customerPhone ||
                wo?.customerphone ||
                wo?.customerName ||
                wo?.customername
        );
        const customerCount = new Set([...salesCustomers, ...woCustomers].filter(Boolean)).size;

        const salesRevenue = summary.salesRevenue;
        const salesProfit = summary.salesGrossProfit;
        const woRevenue = summary.woRevenue;
        const woProfit = summary.woGrossProfit;

        const partsSold = 
            summary.filteredSales.reduce((sum: number, sale: any) => {
                const items = sale.items || [];
                return sum + items.reduce((iSum: number, item: any) => iSum + (Number(item.quantity) || 0), 0);
            }, 0) +
            summary.filteredWorkOrders.reduce((sum: number, wo: any) => {
                const partsUsed = wo.partsUsed || wo.partsused || wo.parts || wo.items || [];
                return sum + partsUsed.reduce((pSum: number, part: any) => pSum + (Number(part.quantity) || Number(part.qty) || 0), 0);
            }, 0);

        // Calculate previous period for MoM comparison
        const getPreviousPeriod = (start: Date, end: Date, filter: string) => {
            const prevStart = new Date(start);
            const prevEnd = new Date(end);
            
            if (filter === "today") {
                prevStart.setDate(prevStart.getDate() - 1);
                prevEnd.setDate(prevEnd.getDate() - 1);
            } else if (filter === "7days" || filter === "week") {
                prevStart.setDate(prevStart.getDate() - 7);
                prevEnd.setDate(prevEnd.getDate() - 7);
            } else if (filter === "month") {
                prevStart.setMonth(prevStart.getMonth() - 1);
                prevEnd.setMonth(prevEnd.getMonth() - 1);
                if (prevEnd.getMonth() === prevStart.getMonth() && end.getDate() !== prevEnd.getDate()) {
                    prevEnd.setDate(0);
                }
            } else if (filter.startsWith("month")) {
                prevStart.setMonth(prevStart.getMonth() - 1);
                prevEnd.setDate(0);
            } else if (filter.startsWith("q")) {
                prevStart.setMonth(prevStart.getMonth() - 3);
                prevEnd.setMonth(prevEnd.getMonth() - 3);
                prevEnd.setDate(0);
            } else if (filter === "year") {
                prevStart.setFullYear(prevStart.getFullYear() - 1);
                prevEnd.setFullYear(prevEnd.getFullYear() - 1);
            } else {
                const diff = end.getTime() - start.getTime();
                prevStart.setTime(prevStart.getTime() - diff - 24*60*60*1000);
                prevEnd.setTime(prevStart.getTime() + diff);
            }
            return { start: prevStart, end: prevEnd };
        };

        const { start: prevStart, end: prevEnd } = getPreviousPeriod(startDate, endDate, reportFilter);
        prevStart.setHours(0, 0, 0, 0);
        prevEnd.setHours(23, 59, 59, 999);

        const prevSummary = calculateFinancialSummary({
            sales,
            workOrders,
            parts,
            cashTransactions,
            branchId: currentBranchId,
            start: prevStart,
            end: prevEnd,
        });

        const prevPartsMap: Record<string, number> = {};
        
        prevSummary.filteredSales.forEach((sale: any) => {
            const items = sale.items || [];
            items.forEach((item: any) => {
                if (item.isService) return;
                const pId = item.partId || item.id;
                const qty = Number(item.quantity) || 0;
                if (pId) {
                    prevPartsMap[pId] = (prevPartsMap[pId] || 0) + qty;
                }
            });
        });

        prevSummary.filteredWorkOrders.forEach((wo: any) => {
            const partsUsed = wo.partsUsed || wo.partsused || wo.parts || wo.items || [];
            partsUsed.forEach((part: any) => {
                const pId = part.partId || part.partid || part.id;
                const qty = Number(part.quantity) || 0;
                if (pId) {
                    prevPartsMap[pId] = (prevPartsMap[pId] || 0) + qty;
                }
            });
        });

        const partsCostMap = buildPartsCostMap(parts, currentBranchId);
        const partsMap: Record<string, { id: string; name: string; sku: string; quantity: number; revenue: number; cost: number; profit: number }> = {};
        
        summary.filteredSales.forEach((sale: any) => {
            const items = sale.items || [];
            items.forEach((item: any) => {
                if (item.isService) return;
                const pId = item.partId || item.id;
                const pName = item.partName || "Sản phẩm không xác định";
                const sku = item.sku || "";
                const qty = Number(item.quantity) || 0;
                const price = Number(item.sellingPrice ?? item.price ?? item.unitPrice ?? item.unitprice) || 0;
                const rawCost = item.costPrice ?? item.costprice ?? item.cost_price ?? item.giaNhap ?? item.gia_nhap;
                const fallbackCost = Number(rawCost) || 0;
                const cost = getPartCost(partsCostMap, pId, sku, fallbackCost);

                if (pId) {
                    if (!partsMap[pId]) {
                        partsMap[pId] = { id: pId, name: pName, sku, quantity: 0, revenue: 0, cost: 0, profit: 0 };
                    }
                    partsMap[pId].quantity += qty;
                    partsMap[pId].revenue += qty * price;
                    partsMap[pId].cost += qty * cost;
                    partsMap[pId].profit += qty * (price - cost);
                }
            });
        });

        summary.filteredWorkOrders.forEach((wo: any) => {
            const partsUsed = wo.partsUsed || wo.partsused || wo.parts || wo.items || [];
            partsUsed.forEach((part: any) => {
                const pId = part.partId || part.partid || part.id;
                const pName = part.partName || part.partname || part.name || "Phụ tùng không xác định";
                const sku = part.sku || "";
                const qty = Number(part.quantity) || 0;
                const price = Number(part.price ?? part.sellingPrice ?? part.unitPrice ?? part.unitprice) || 0;
                const rawCost = part.costPrice ?? part.costprice ?? part.cost_price ?? part.giaNhap ?? part.gia_nhap;
                const fallbackCost = Number(rawCost) || 0;
                const cost = getPartCost(partsCostMap, pId, sku, fallbackCost);

                if (pId) {
                    if (!partsMap[pId]) {
                        partsMap[pId] = { id: pId, name: pName, sku, quantity: 0, revenue: 0, cost: 0, profit: 0 };
                    }
                    partsMap[pId].quantity += qty;
                    partsMap[pId].revenue += qty * price;
                    partsMap[pId].cost += qty * cost;
                    partsMap[pId].profit += qty * (price - cost);
                }
            });
        });

        const detailedPartsSold = Object.values(partsMap).map((part) => ({
            ...part,
            prevQuantity: prevPartsMap[part.id] || 0
        })).sort((a, b) => b.quantity - a.quantity);

        return {
            revenue,
            profit,
            grossProfit,
            income,
            expense,
            customerCount,
            orderCount: summary.orderCount,
            salesRevenue,
            salesProfit,
            woRevenue,
            woProfit,
            salesCount: summary.salesCount,
            workOrdersCount: summary.workOrdersCount,
            partsSold,
            detailedPartsSold,
        };
    }, [sales, workOrders, parts, cashTransactions, reportFilter, currentBranchId]); // Added getPartCost to dependencyoanh thu 7 ngày gần nhất (bao gồm cả Sales và Work Orders)
    const last7DaysRevenue = useMemo(() => {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().slice(0, 10);

            // Sales revenue
            const daySales = sales.filter((s) => s.date.slice(0, 10) === dateStr);
            const salesRevenue = daySales.reduce((sum, s) => sum + s.total, 0);

            // Work Orders revenue (đã thanh toán)
            const dayWorkOrders = workOrders.filter((wo: any) => {
                const woDate =
                    wo.creationDate?.slice(0, 10) || wo.creationdate?.slice(0, 10);
                const isPaid =
                    wo.paymentStatus === "paid" ||
                    wo.paymentstatus === "paid" ||
                    wo.paymentStatus === "partial" ||
                    wo.paymentstatus === "partial";
                return woDate === dateStr && isPaid;
            });
            const woRevenue = dayWorkOrders.reduce(
                (sum, wo: any) => sum + (wo.totalPaid || wo.totalpaid || wo.total || 0),
                0
            );

            const revenue = salesRevenue + woRevenue;

            const expense = cashTransactions
                .filter((t) => t.type === "expense" && t.date.slice(0, 10) === dateStr)
                .reduce((sum, t) => sum + t.amount, 0);

            data.push({
                date: date.toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                }),
                revenue,
                expense,
                profit: revenue - expense, // FIXME: This profit calc is simplified for the chart, ideally should be grossProfit - expense
            });
        }
        return data;
    }, [sales, workOrders, cashTransactions]);

    // Dữ liệu thu chi (lọc theo filter)
    const incomeExpenseData = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;

        // Tính toán date range theo filter (giống filteredStats)
        if (reportFilter.startsWith("month") && reportFilter.length > 5) {
            const monthNum = parseInt(reportFilter.slice(5), 10);
            if (monthNum >= 1 && monthNum <= 12) {
                startDate = new Date(now.getFullYear(), monthNum - 1, 1);
                endDate = new Date(now.getFullYear(), monthNum, 0);
            } else {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
        } else if (reportFilter.startsWith("q") && reportFilter.length === 2) {
            const quarterNum = parseInt(reportFilter.slice(1), 10);
            if (quarterNum >= 1 && quarterNum <= 4) {
                const startMonth = (quarterNum - 1) * 3;
                startDate = new Date(now.getFullYear(), startMonth, 1);
                endDate = new Date(now.getFullYear(), startMonth + 3, 0);
            } else {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
        } else {
            switch (reportFilter) {
                case "today":
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case "7days":
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case "week":
                {
                    const dayOfWeek = now.getDay();
                    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
                    break;
                }
                case "month":
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case "year":
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
                default:
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
        }

        const formatLocalDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };
        const toLocalDateStr = (dateStr: string | undefined | null): string | null => {
            if (!dateStr) return null;
            try {
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return null;
                return formatLocalDate(d);
            } catch {
                return null;
            }
        };

        const startDateStr = formatLocalDate(startDate);
        const endDateStr = formatLocalDate(endDate);

        const income = cashTransactions
            .filter((t) => {
                const txDate = toLocalDateStr(t.date);
                return t.type === "income" && txDate && txDate >= startDateStr && txDate <= endDateStr;
            })
            .reduce((sum, t) => sum + t.amount, 0);
        const expense = cashTransactions
            .filter((t) => {
                const txDate = toLocalDateStr(t.date);
                return t.type === "expense" && txDate && txDate >= startDateStr && txDate <= endDateStr;
            })
            .reduce((sum, t) => sum + t.amount, 0);

        return [
            { name: "Thu", value: income, color: "#10b981" },
            { name: "Chi", value: expense, color: "#ef4444" },
        ];
    }, [cashTransactions, reportFilter]);

    // Top sản phẩm bán chạy (từ cả Sales và Work Orders - lọc theo filter)
    const topProducts = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;

        if (reportFilter.startsWith("month") && reportFilter.length > 5) {
            const monthNum = parseInt(reportFilter.slice(5), 10);
            if (monthNum >= 1 && monthNum <= 12) {
                startDate = new Date(now.getFullYear(), monthNum - 1, 1);
                endDate = new Date(now.getFullYear(), monthNum, 0);
            } else {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
        } else if (reportFilter.startsWith("q") && reportFilter.length === 2) {
            const quarterNum = parseInt(reportFilter.slice(1), 10);
            if (quarterNum >= 1 && quarterNum <= 4) {
                const startMonth = (quarterNum - 1) * 3;
                startDate = new Date(now.getFullYear(), startMonth, 1);
                endDate = new Date(now.getFullYear(), startMonth + 3, 0);
            } else {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
        } else {
            switch (reportFilter) {
                case "today":
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case "7days":
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case "week":
                {
                    const dayOfWeek = now.getDay();
                    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
                    break;
                }
                case "month":
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case "year":
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
                default:
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
        }

        const formatLocalDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };
        const toLocalDateStr = (dateStr: string | undefined | null): string | null => {
            if (!dateStr) return null;
            try {
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return null;
                return formatLocalDate(d);
            } catch {
                return null;
            }
        };

        const startDateStr = formatLocalDate(startDate);
        const endDateStr = formatLocalDate(endDate);

        console.warn(`[TopProducts] Filter range: ${startDateStr} to ${endDateStr}`);

        const productSales: Record<string, { name: string; quantity: number }> = {};

        // From sales (filtered)
        const filteredSales = sales.filter((s) => {
            const saleDate = toLocalDateStr(s.date);
            return saleDate && saleDate >= startDateStr && saleDate <= endDateStr;
        });

        filteredSales.forEach((sale) => {
            sale.items.forEach((item) => {
                // Ensure partId exists
                const pId = item.partId || (item as any).id;
                const pName = item.partName || "Sản phẩm không xác định";

                if (!pId) return;

                if (!productSales[pId]) {
                    productSales[pId] = {
                        name: pName,
                        quantity: 0,
                    };
                }
                productSales[pId].quantity += item.quantity || 0;
            });
        });

        console.warn(`[TopProducts] Processed ${filteredSales.length} sales`);

        // From work orders (filtered)
        const filteredWOs = workOrders.filter((wo: any) => {
            const woDate = toLocalDateStr(wo.creationDate || wo.creationdate);
            // EXCLUDE CANCELLED ORDERS
            const status = (wo.status || "").toLowerCase();
            const isCancelled = status === "đã hủy" || status === "cancelled";

            return woDate && woDate >= startDateStr && woDate <= endDateStr && !isCancelled;
        });

        filteredWOs.forEach((wo: any) => {
            const parts = wo.partsUsed || wo.partsused || wo.parts || wo.items || [];

            if (Array.isArray(parts)) {
                parts.forEach((part: any) => {
                    // Normalize part ID access
                    const partId = part.partId || part.partid || part.id;
                    const partName = part.partName || part.partname || part.name;
                    const qty = part.quantity || part.qty || 0;

                    if (partId && partName) {
                        if (!productSales[partId]) {
                            productSales[partId] = {
                                name: partName,
                                quantity: 0,
                            };
                        }
                        productSales[partId].quantity += qty;
                    }
                });
            }
        });

        console.warn(`[TopProducts] Processed ${filteredWOs.length} work orders`);

        const result = Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10); // Show top 10

        console.warn("[TopProducts] Result:", result);
        return result;

    }, [sales, workOrders, reportFilter]);

    // Thống kê work orders (phiếu sửa chữa - lọc theo filter)
    const workOrderStats = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;

        if (reportFilter.startsWith("month") && reportFilter.length > 5) {
            const monthNum = parseInt(reportFilter.slice(5), 10);
            if (monthNum >= 1 && monthNum <= 12) {
                startDate = new Date(now.getFullYear(), monthNum - 1, 1);
                endDate = new Date(now.getFullYear(), monthNum, 0);
            } else {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
        } else if (reportFilter.startsWith("q") && reportFilter.length === 2) {
            const quarterNum = parseInt(reportFilter.slice(1), 10);
            if (quarterNum >= 1 && quarterNum <= 4) {
                const startMonth = (quarterNum - 1) * 3;
                startDate = new Date(now.getFullYear(), startMonth, 1);
                endDate = new Date(now.getFullYear(), startMonth + 3, 0);
            } else {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
        } else {
            switch (reportFilter) {
                case "today":
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case "7days":
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case "week":
                {
                    const dayOfWeek = now.getDay();
                    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
                    break;
                }
                case "month":
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case "year":
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
                default:
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
        }

        const formatLocalDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };
        const toLocalDateStr = (dateStr: string | undefined | null): string | null => {
            if (!dateStr) return null;
            try {
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return null;
                return formatLocalDate(d);
            } catch {
                return null;
            }
        };

        const startDateStr = formatLocalDate(startDate);
        const endDateStr = formatLocalDate(endDate);

        // Filter work orders by date range
        const filteredWOs = (workOrders || []).filter((wo: any) => {
            const woDate = toLocalDateStr(wo.creationDate || wo.creationdate);
            return woDate && woDate >= startDateStr && woDate <= endDateStr;
        });

        const newOrders = filteredWOs.filter(
            (wo) => wo.status === "Tiếp nhận"
        ).length;
        const inProgress = filteredWOs.filter(
            (wo) => wo.status === "Đang sửa"
        ).length;
        const completed = filteredWOs.filter(
            (wo) => wo.status === "Đã sửa xong"
        ).length;
        const delivered = filteredWOs.filter(
            (wo) => wo.status === "Trả máy" || (wo.status as string) === "Đã giao"
        ).length;
        const cancelled = filteredWOs.filter(
            (wo) => (wo.status as string) === "Đã hủy"
        ).length;

        return { newOrders, inProgress, completed, delivered, cancelled };
    }, [workOrders, reportFilter]);

    // DEBUG DATA: Specific audit for "Elf 10W40"
    const debugData = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;

        if (reportFilter.startsWith("month") && reportFilter.length > 5) {
            const monthNum = parseInt(reportFilter.slice(5), 10);
            if (monthNum >= 1 && monthNum <= 12) {
                startDate = new Date(now.getFullYear(), monthNum - 1, 1);
                endDate = new Date(now.getFullYear(), monthNum, 0);
            } else {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
        } else {
            // Default to "month" logic for the user's specific question "from start of month"
            // regardless of filter, but let's stick to the filter if it's set to month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const formatLocalDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };
        const toLocalDateStr = (dateStr: string | undefined | null): string | null => {
            if (!dateStr) return null;
            try {
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return null;
                return formatLocalDate(d);
            } catch {
                return null;
            }
        };

        const startDateStr = formatLocalDate(startDate);
        const endDateStr = formatLocalDate(endDate);

        const transactions: any[] = [];

        // Scan Sales
        sales.forEach(s => {
            const d = toLocalDateStr(s.date);
            if (d && d >= startDateStr && d <= endDateStr) {
                s.items.forEach(item => {
                    const name = item.partName || "";
                    if (name.toLowerCase().includes("elf")) {
                        transactions.push({
                            source: "Bán hàng",
                            id: s.id,
                            code: (s as any).sale_code || "N/A",
                            date: d,
                            product: name,
                            quantity: item.quantity
                        });
                    }
                });
            }
        });

        // Scan Work Orders
        workOrders.forEach(wo => {
            const woAny = wo as any;
            const d = toLocalDateStr(woAny.creationDate || woAny.creationdate);
            const status = ((woAny.status || "") as string).toLowerCase();
            const isCancelled = status === "đã hủy" || status === "cancelled";

            if (!isCancelled && d && d >= startDateStr && d <= endDateStr) {
                const parts = woAny.partsUsed || woAny.partsused || woAny.parts || woAny.items || [];
                if (Array.isArray(parts)) {
                    parts.forEach((part: any) => {
                        const name = part.partName || part.partname || part.name || "";
                        if (name.toLowerCase().includes("elf")) {
                            transactions.push({
                                source: "Sửa chữa",
                                id: woAny.id,
                                code: String(woAny.id || "").slice(0, 8) + "...", // Short ID
                                date: d,
                                product: name,
                                quantity: part.quantity || part.qty || 0
                            });
                        }
                    });
                }
            }
        });

        return transactions;
    }, [sales, workOrders, reportFilter]); // Re-calculate when data changes

    // Cảnh báo
    const alerts = useMemo(() => {
        const warnings: Array<{ type: string; message: string; color: string }> =
            [];

        // Hàng sắp hết
        const lowStockParts = parts.filter((p) => {
            const stock = p.stock?.[currentBranchId] || 0;
            const reserved = p.reservedstock?.[currentBranchId] || 0;
            const available = Math.max(0, stock - reserved);
            const minLimit = p.minstock?.[currentBranchId] ?? 10;
            return available < minLimit;
        });
        if (lowStockParts.length > 0) {
            warnings.push({
                type: "Tồn kho thấp",
                message: `${lowStockParts.length} sản phẩm sắp hết hàng`,
                color: "text-rose-600 dark:text-rose-400 font-bold",
            });
        }

        // Khoản vay đến hạn
        const upcomingLoans = loans.filter((loan) => {
            const daysUntilDue = Math.ceil(
                (new Date(loan.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return daysUntilDue <= 30 && daysUntilDue > 0 && loan.status === "active";
        });
        if (upcomingLoans.length > 0) {
            warnings.push({
                type: "Nợ đến hạn",
                message: `${upcomingLoans.length} khoản vay sắp đến hạn`,
                color: "text-red-600 dark:text-red-400",
            });
        }

        // Số dư thấp
        if (cashBalance + bankBalance < 10000000) {
            warnings.push({
                type: "Số dư thấp",
                message: "Số dư tài khoản dưới 10 triệu",
                color: "text-amber-600 dark:text-amber-400",
            });
        }

        return warnings;
    }, [parts, loans, cashBalance, bankBalance, currentBranchId]);

    const unpaidWorkOrdersCount = useMemo(() => {
        return (workOrders || []).filter((wo: any) => {
            const statusRaw = wo?.paymentStatus ?? wo?.paymentstatus;
            const status = String(statusRaw || "").toLowerCase();
            const isPaid = status === "paid";
            const woStatus = String(wo?.status || "").toLowerCase();
            const isCancelled = woStatus === "đã hủy" || woStatus === "cancelled";
            return !isPaid && !isCancelled;
        }).length;
    }, [workOrders]);

    const lowStockCount = useMemo(() => {
        return (parts || []).filter((p: any) => {
            const stock = p.stock?.[currentBranchId] || 0;
            const reserved = p.reservedstock?.[currentBranchId] || 0;
            const available = Math.max(0, stock - reserved);
            const minLimit = p.minstock?.[currentBranchId] ?? 10;
            return available < minLimit;
        }).length;
    }, [parts, currentBranchId]);

    return {
        todayStats,
        filteredStats,
        topProducts,
        incomeExpenseData,
        last7DaysRevenue,
        workOrderStats,
        alerts,
        cashBalance,
        bankBalance,
        debugData, // EXPORT DEBUG DATA HERE
        unpaidWorkOrdersCount,
        lowStockCount,
    };
};
