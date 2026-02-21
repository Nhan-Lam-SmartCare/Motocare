import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { useSalesRepo } from "../../hooks/useSalesRepository";
import { usePartsRepo } from "../../hooks/usePartsRepository";
import { useWorkOrdersRepo } from "../../hooks/useWorkOrdersRepository";
import {
  useCustomerDebtsRepo,
  useSupplierDebtsRepo,
} from "../../hooks/useDebtsRepository";
import { useAppContext } from "../../contexts/AppContext";
import { formatCurrency } from "../../utils/format";
import { getDateRange } from "../../utils/dateUtils";

interface FinancialAnalyticsProps {
  sales: any[];
  workOrders: any[];
  parts: any[];
  customerDebts: any[];
  supplierDebts: any[];
  currentBranchId: string;
  dateFilter?: string;
}

const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({
  sales,
  workOrders,
  parts,
  customerDebts,
  supplierDebts,
  currentBranchId,
  dateFilter = "30days"
}) => {
  const isLoading = false; // Data comes from parent

  // Removed local timeRange state

  // Filter by time range
  const { startDate, endDate } = getDateRange(dateFilter);

  // Income from Sales (bán hàng)
  const salesIncome = useMemo(() => {
    return sales
      .filter((s) => {
        const d = new Date(s.date);
        return d >= startDate && d <= endDate;
      })
      .reduce((sum, s) => sum + s.total, 0);
  }, [sales, dateFilter, startDate, endDate]);

  // Income from Work Orders (sửa chữa) - tính các đơn đã trả máy hoặc đã thanh toán
  const workOrderIncome = useMemo(() => {
    return workOrders
      .filter((wo) => {
        // ✅ FIX: Dùng paymentDate (ngày thanh toán) nếu có, fallback về creationDate
        // Đảm bảo nhất quán với dashboard KPI (financialSummary.ts)
        const woDate = new Date(wo.paymentDate || wo.creationDate);
        // Tính đơn đã trả máy HOẶC đã thanh toán (paid/partial) trong khoảng thời gian
        // Không tính đơn đã hoàn tiền (refunded)
        const isCompleted = wo.status === "Trả máy" ||
          wo.paymentStatus === "paid" ||
          wo.paymentStatus === "partial" ||
          (wo.totalPaid && wo.totalPaid > 0);
        return woDate >= startDate && woDate <= endDate && isCompleted && !wo.refunded;
      })
      .reduce((sum, wo) => sum + (wo.totalPaid || wo.total || 0), 0);
  }, [workOrders, dateFilter, startDate, endDate]);

  // Total Income
  const totalIncome = salesIncome + workOrderIncome;

  // Cost of Goods Sold from Sales
  const salesCOGS = useMemo(() => {
    return sales
      .filter((s) => {
        const d = new Date(s.date);
        return d >= startDate && d <= endDate;
      })
      .reduce((sum, sale) => {
        const saleCost = sale.items.reduce((itemSum: number, item: any) => {
          const part = parts.find((p) => p.id === item.partId);
          // ✅ FIX: Use costPrice (giá vốn) instead of wholesalePrice for COGS calculation
          const costPrice = part?.costPrice?.[currentBranchId] || part?.wholesalePrice?.[currentBranchId] || 0;
          return itemSum + costPrice * item.quantity;
        }, 0);
        return sum + saleCost;
      }, 0);
  }, [sales, parts, currentBranchId, dateFilter, startDate, endDate]);

  // Cost of Goods Sold from Work Orders
  const workOrderCOGS = useMemo(() => {
    return workOrders
      .filter((wo) => {
        // ✅ FIX: Dùng paymentDate cho nhất quán với dashboard KPI
        const woDate = new Date(wo.paymentDate || wo.creationDate);
        const isCompleted = wo.status === "Trả máy" ||
          wo.paymentStatus === "paid" ||
          wo.paymentStatus === "partial" ||
          (wo.totalPaid && wo.totalPaid > 0);
        return woDate >= startDate && woDate <= endDate && isCompleted && !wo.refunded;
      })
      .reduce((sum, wo) => {
        // Giá vốn phụ tùng trong work order
        const partsCost = (wo.partsUsed || []).reduce((partSum: number, woPart: any) => {
          const part = parts.find((p) => p.id === woPart.partId);
          // ✅ FIX: Use costPrice (giá vốn) instead of wholesalePrice for COGS calculation
          const costPrice = part?.costPrice?.[currentBranchId] || part?.wholesalePrice?.[currentBranchId] || 0;
          return partSum + costPrice * woPart.quantity;
        }, 0);
        // Giá vốn dịch vụ bên ngoài (gia công)
        const servicesCost = (wo.additionalServices || []).reduce(
          (svcSum: number, svc: any) => svcSum + (svc.costPrice || 0) * svc.quantity,
          0
        );
        return sum + partsCost + servicesCost;
      }, 0);
  }, [workOrders, parts, currentBranchId, dateFilter, startDate, endDate]);

  // Total Cost of Goods Sold
  const totalCOGS = salesCOGS + workOrderCOGS;

  // Net profit = Doanh thu - Giá vốn hàng bán
  const netProfit = totalIncome - totalCOGS;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  // Daily income vs cost of goods sold
  const dailyFinancials = useMemo(() => {
    const financialMap = new Map<string, { income: number; expense: number }>();

    // Add sales income and calculate COGS for each sale
    sales
      .filter((s) => {
        const d = new Date(s.date);
        return d >= startDate && d <= endDate;
      })
      .forEach((sale) => {
        const date = sale.date.slice(0, 10);
        const existing = financialMap.get(date) || { income: 0, expense: 0 };
        existing.income += sale.total;

        // Calculate cost of goods sold for this sale
        const saleCost = sale.items.reduce((itemSum: number, item: any) => {
          const part = parts.find((p) => p.id === item.partId);
          // ✅ FIX: Use costPrice (giá vốn) instead of wholesalePrice for COGS calculation
          const costPrice = part?.costPrice?.[currentBranchId] || part?.wholesalePrice?.[currentBranchId] || 0;
          return itemSum + costPrice * item.quantity;
        }, 0);
        existing.expense += saleCost;

        financialMap.set(date, existing);
      });

    // Add work order income and COGS
    workOrders
      .filter((wo) => {
        // ✅ FIX: Dùng paymentDate cho nhất quán với dashboard KPI
        const woDate = new Date(wo.paymentDate || wo.creationDate);
        const isCompleted = wo.status === "Trả máy" ||
          wo.paymentStatus === "paid" ||
          wo.paymentStatus === "partial" ||
          (wo.totalPaid && wo.totalPaid > 0);
        return woDate >= startDate && woDate <= endDate && isCompleted && !wo.refunded;
      })
      .forEach((wo) => {
        // Dùng paymentDate để hiển thị biểu đồ theo ngày tiền vào, không phải ngày tạo phiếu
        const dateStr = (wo.paymentDate || wo.creationDate);
        const date = dateStr.slice(0, 10);
        const existing = financialMap.get(date) || { income: 0, expense: 0 };
        existing.income += wo.totalPaid || wo.total || 0;

        // Calculate COGS for work order
        const partsCost = (wo.partsUsed || []).reduce((partSum: number, woPart: any) => {
          const part = parts.find((p) => p.id === woPart.partId);
          // ✅ FIX: Use costPrice (giá vốn) instead of wholesalePrice for COGS calculation
          const costPrice = part?.costPrice?.[currentBranchId] || part?.wholesalePrice?.[currentBranchId] || 0;
          return partSum + costPrice * woPart.quantity;
        }, 0);
        const servicesCost = (wo.additionalServices || []).reduce(
          (svcSum: number, svc: any) => svcSum + (svc.costPrice || 0) * svc.quantity,
          0
        );
        existing.expense += partsCost + servicesCost;

        financialMap.set(date, existing);
      });

    return Array.from(financialMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0])) // Sort by ISO date string (YYYY-MM-DD)
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
        }),
        income: Math.round(data.income),
        expense: Math.round(data.expense),
        profit: Math.round(data.income - data.expense),
      }))
      .slice(-30);
  }, [sales, workOrders, parts, currentBranchId, dateFilter, startDate, endDate]);

  // Customer debts summary
  const customerDebtStats = useMemo(() => {
    const totalDebt = customerDebts.reduce(
      (sum, d) => sum + d.remainingAmount,
      0
    );
    const overdueCount = customerDebts.filter((d) => {
      return d.remainingAmount > 0;
    }).length;

    return { totalDebt, overdueCount, count: customerDebts.length };
  }, [customerDebts]);

  // Supplier debts summary
  const supplierDebtStats = useMemo(() => {
    const totalDebt = supplierDebts.reduce(
      (sum, d) => sum + d.remainingAmount,
      0
    );
    const overdueCount = supplierDebts.filter((d) => {
      return d.remainingAmount > 0;
    }).length;

    return { totalDebt, overdueCount, count: supplierDebts.length };
  }, [supplierDebts]);

  // Top customers by debt
  const topDebtors = useMemo(() => {
    return [...customerDebts]
      .filter((d) => d.remainingAmount > 0)
      .sort((a, b) => b.remainingAmount - a.remainingAmount)
      .slice(0, 5);
  }, [customerDebts]);

  // Inventory value — dùng giá vốn (costPrice) để phản ánh đúng giá trị tồn kho trên sổ sách
  // Fallback: wholesalePrice nếu chưa nhập costPrice, cuối cùng là retailPrice
  const inventoryValue = useMemo(() => {
    return parts.reduce((sum, part) => {
      const stock = part.stock[currentBranchId] || 0;
      const price =
        part.costPrice?.[currentBranchId] ||
        part.wholesalePrice?.[currentBranchId] ||
        part.retailPrice[currentBranchId] ||
        0;
      return sum + stock * price;
    }, 0);
  }, [parts, currentBranchId]);

  // === PROFIT ANALYSIS ===

  // Product profitability analysis
  const productProfitability = useMemo(() => {
    const productMap = new Map<string, {
      name: string;
      category: string;
      revenue: number;
      cost: number;
      quantity: number;
    }>();

    // Build cost map
    const costMap = new Map<string, number>();
    parts.forEach((p) => {
      costMap.set(p.id, p.costPrice?.[currentBranchId] || p.wholesalePrice?.[currentBranchId] || 0);
    });

    // Build name/category map
    const nameMap = new Map<string, { name: string; category: string }>();
    parts.forEach((p) => {
      nameMap.set(p.id, { name: p.name, category: p.category || 'Không phân loại' });
    });

    // Process sales
    sales
      .filter((s) => {
        const d = new Date(s.date);
        return d >= startDate && d <= endDate;
      })
      .forEach((sale: any) => {
        (sale.items || []).forEach((item: any) => {
          if (item.isService) return;

          const partInfo = nameMap.get(item.partId) || { name: item.name || 'Unknown', category: 'Không phân loại' };
          const cost = costMap.get(item.partId) || 0;
          const revenue = (item.sellingPrice || item.price || 0) * (item.quantity || 0);
          const itemCost = cost * (item.quantity || 0);

          const existing = productMap.get(item.partId);
          if (existing) {
            existing.revenue += revenue;
            existing.cost += itemCost;
            existing.quantity += item.quantity || 0;
          } else {
            productMap.set(item.partId, {
              name: partInfo.name,
              category: partInfo.category,
              revenue,
              cost: itemCost,
              quantity: item.quantity || 0,
            });
          }
        });
      });

    // Process work orders
    workOrders
      .filter((wo) => {
        // ✅ FIX: Dùng paymentDate cho nhất quán
        const d = new Date(wo.paymentDate || wo.creationDate);
        return d >= startDate && d <= endDate && wo.status !== "Đã hủy" && !wo.refunded;
      })
      .forEach((wo: any) => {
        (wo.partsUsed || []).forEach((part: any) => {
          const partInfo = nameMap.get(part.partId) || { name: part.name || 'Unknown', category: 'Không phân loại' };
          const cost = part.costPrice || costMap.get(part.partId) || 0;
          const revenue = (part.sellingPrice || part.price || 0) * (part.quantity || 0);
          const itemCost = cost * (part.quantity || 0);

          const existing = productMap.get(part.partId);
          if (existing) {
            existing.revenue += revenue;
            existing.cost += itemCost;
            existing.quantity += part.quantity || 0;
          } else {
            productMap.set(part.partId, {
              name: partInfo.name,
              category: partInfo.category,
              revenue,
              cost: itemCost,
              quantity: part.quantity || 0,
            });
          }
        });
      });

    // Calculate profit and margin
    const allProducts = Array.from(productMap.entries())
      .map(([id, data]) => ({
        id,
        ...data,
        profit: data.revenue - data.cost,
        margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue * 100) : 0,
      }))
      .filter((p) => p.revenue > 0);

    // Top 10 most profitable
    const topProfit = [...allProducts]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

    // Top 10 least profitable (but still has sales)
    const leastProfit = [...allProducts]
      .sort((a, b) => a.margin - b.margin)
      .slice(0, 10);

    return { topProfit, leastProfit };
  }, [sales, workOrders, parts, currentBranchId, dateFilter, startDate, endDate]);

  // Category margin analysis
  const categoryMargin = useMemo(() => {
    const categoryMap = new Map<string, { revenue: number; cost: number }>();

    // Build cost map
    const costMap = new Map<string, number>();
    parts.forEach((p) => {
      costMap.set(p.id, p.costPrice?.[currentBranchId] || p.wholesalePrice?.[currentBranchId] || 0);
    });

    // Build category map
    const partCategoryMap = new Map<string, string>();
    parts.forEach((p) => {
      partCategoryMap.set(p.id, p.category || 'Không phân loại');
    });

    // Process sales
    sales
      .filter((s) => {
        const d = new Date(s.date);
        return d >= startDate && d <= endDate;
      })
      .forEach((sale: any) => {
        (sale.items || []).forEach((item: any) => {
          if (item.isService) return;

          const category = partCategoryMap.get(item.partId) || 'Không phân loại';
          const cost = costMap.get(item.partId) || 0;
          const revenue = (item.sellingPrice || item.price || 0) * (item.quantity || 0);
          const itemCost = cost * (item.quantity || 0);

          const existing = categoryMap.get(category);
          if (existing) {
            existing.revenue += revenue;
            existing.cost += itemCost;
          } else {
            categoryMap.set(category, { revenue, cost: itemCost });
          }
        });
      });

    // Process work orders
    workOrders
      .filter((wo) => {
        // ✅ FIX: Dùng paymentDate cho nhất quán
        const d = new Date(wo.paymentDate || wo.creationDate);
        return d >= startDate && d <= endDate && wo.status !== "Đã hủy" && !wo.refunded;
      })
      .forEach((wo: any) => {
        (wo.partsUsed || []).forEach((part: any) => {
          const category = partCategoryMap.get(part.partId) || 'Không phân loại';
          const cost = part.costPrice || costMap.get(part.partId) || 0;
          const revenue = (part.sellingPrice || part.price || 0) * (part.quantity || 0);
          const itemCost = cost * (part.quantity || 0);

          const existing = categoryMap.get(category);
          if (existing) {
            existing.revenue += revenue;
            existing.cost += itemCost;
          } else {
            categoryMap.set(category, { revenue, cost: itemCost });
          }
        });
      });

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.revenue - data.cost,
        margin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue * 100) : 0,
      }))
      .filter((c) => c.revenue > 0)
      .sort((a, b) => b.margin - a.margin);
  }, [sales, workOrders, parts, currentBranchId, dateFilter, startDate, endDate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Time Range Selector removed */}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-700">
          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
            Thu nhập
          </div>
          <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
            {formatCurrency(totalIncome)}
          </div>
          <div className="text-[10px] mt-1 text-emerald-600 dark:text-emerald-400">
            Bán hàng: {formatCurrency(salesIncome)} | Sửa chữa: {formatCurrency(workOrderIncome)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-lg border border-red-200 dark:border-red-700">
          <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
            Chi phí (Giá vốn)
          </div>
          <div className="text-2xl font-bold text-red-900 dark:text-red-100">
            {formatCurrency(totalCOGS)}
          </div>
          <div className="text-[10px] mt-1 text-red-600 dark:text-red-400">
            Bán hàng: {formatCurrency(salesCOGS)} | Sửa chữa: {formatCurrency(workOrderCOGS)}
          </div>
        </div>

        <div
          className={`bg-gradient-to-br p-4 rounded-lg border ${netProfit >= 0
            ? "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700"
            : "from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700"
            }`}
        >
          <div
            className={`text-xs font-medium mb-1 ${netProfit >= 0
              ? "text-blue-600 dark:text-blue-400"
              : "text-red-600 dark:text-red-400"
              }`}
          >
            Lợi nhuận
          </div>
          <div
            className={`text-2xl font-bold ${netProfit >= 0
              ? "text-blue-900 dark:text-blue-100"
              : "text-red-900 dark:text-red-100"
              }`}
          >
            {formatCurrency(netProfit)}
          </div>
          <div
            className={`text-[10px] mt-0.5 ${netProfit >= 0
              ? "text-blue-600 dark:text-blue-400"
              : "text-red-600 dark:text-red-400"
              }`}
          >
            Biên lợi nhuận: {profitMargin.toFixed(1)}%
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
          <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
            Giá trị tồn kho
          </div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {formatCurrency(inventoryValue)}
          </div>
        </div>
      </div>

      {/* Income vs Expense Chart */}
      <div className="bg-white dark:bg-[#1e293b] p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Thu - Chi - Lợi nhuận
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={dailyFinancials}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
            <Legend />
            <Bar dataKey="income" fill="#10b981" name="Thu nhập" />
            <Bar dataKey="expense" fill="#ef4444" name="Chi phí" />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="#3b82f6"
              strokeWidth={3}
              name="Lợi nhuận"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Debts Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer Debts */}
        <div className="bg-white dark:bg-[#1e293b] p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Công nợ khách hàng
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
              <div>
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  Tổng công nợ
                </div>
                <div className="text-xl font-bold text-amber-900 dark:text-amber-100">
                  {formatCurrency(customerDebtStats.totalDebt)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  Quá hạn
                </div>
                <div className="text-xl font-bold text-amber-900 dark:text-amber-100">
                  {customerDebtStats.overdueCount}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Top 5 khách nợ nhiều nhất
              </div>
              <div className="space-y-1.5">
                {topDebtors.map((debt) => (
                  <div
                    key={debt.id}
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {debt.customerName}
                      </div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-400">
                        Ngày tạo:{" "}
                        {new Date(debt.createdDate).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                        {formatCurrency(debt.remainingAmount)}
                      </div>
                    </div>
                  </div>
                ))}
                {topDebtors.length === 0 && (
                  <div className="text-center py-3 text-slate-600 dark:text-slate-400 inline-flex items-center justify-center gap-2 text-sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Không có công nợ
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Supplier Debts */}
        <div className="bg-white dark:bg-[#1e293b] p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Công nợ nhà cung cấp
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
              <div>
                <div className="text-xs text-red-600 dark:text-red-400">
                  Tổng công nợ
                </div>
                <div className="text-xl font-bold text-red-900 dark:text-red-100">
                  {formatCurrency(supplierDebtStats.totalDebt)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-red-600 dark:text-red-400">
                  Quá hạn
                </div>
                <div className="text-xl font-bold text-red-900 dark:text-red-100">
                  {supplierDebtStats.overdueCount}
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="text-xs text-blue-600 dark:text-blue-400 mb-1.5 inline-flex items-center gap-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M11 2a1 1 0 011 1v1.07A7.002 7.002 0 0119 11a6.97 6.97 0 01-2.05 4.95A3.5 3.5 0 0014 19.5V20a1 1 0 11-2 0v-.5a3.5 3.5 0 00-2.95-3.45A6.97 6.97 0 017 11a7.002 7.002 0 016-6.93V3a1 1 0 011-1z" />
                  <path d="M13 22a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
                Mẹo quản lý tài chính
              </div>
              <ul className="text-[10px] text-blue-700 dark:text-blue-300 space-y-0.5">
                <li>• Theo dõi biên lợi nhuận hàng tháng</li>
                <li>• Giữ tồn kho ở mức hợp lý</li>
                <li>• Thu hồi công nợ đúng hạn</li>
                <li>• Đàm phán điều khoản với nhà cung cấp</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                <div className="text-[10px] text-slate-600 dark:text-slate-400">
                  Khách hàng nợ
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {customerDebtStats.count}
                </div>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                <div className="text-[10px] text-slate-600 dark:text-slate-400">
                  NCC cần trả
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {supplierDebtStats.count}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === PROFIT ANALYSIS === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Profit Products */}
        <div className="bg-white dark:bg-[#1e293b] p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-semibold text-emerald-900 dark:text-emerald-100 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            Top 10 sản phẩm lãi nhiều nhất
          </h3>
          <div className="overflow-auto max-h-[300px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Sản phẩm</th>
                  <th className="px-2 py-2 text-right font-medium">Lợi nhuận</th>
                  <th className="px-2 py-2 text-right font-medium">Biên LN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {productProfitability.topProfit.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <div className="truncate max-w-[150px]">
                          <div className="font-medium text-slate-900 dark:text-slate-100 text-xs">{item.name}</div>
                          <div className="text-[10px] text-slate-500">SL: {item.quantity}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                      {formatCurrency(item.profit)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {item.margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {productProfitability.topProfit.length === 0 && (
                  <tr><td colSpan={3} className="text-center py-4 text-slate-500">Chưa có dữ liệu</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Least Profit Products */}
        <div className="bg-white dark:bg-[#1e293b] p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-semibold text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
            Top 10 sản phẩm biên lợi nhuận thấp
          </h3>
          <div className="overflow-auto max-h-[300px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Sản phẩm</th>
                  <th className="px-2 py-2 text-right font-medium">Lợi nhuận</th>
                  <th className="px-2 py-2 text-right font-medium">Biên LN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {productProfitability.leastProfit.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <div className="truncate max-w-[150px]">
                          <div className="font-medium text-slate-900 dark:text-slate-100 text-xs">{item.name}</div>
                          <div className="text-[10px] text-slate-500">SL: {item.quantity}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right font-semibold text-amber-600 dark:text-amber-400 text-xs">
                      {formatCurrency(item.profit)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${item.margin < 10
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                        {item.margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {productProfitability.leastProfit.length === 0 && (
                  <tr><td colSpan={3} className="text-center py-4 text-slate-500">Chưa có dữ liệu</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Category Margin */}
      {categoryMargin.length > 0 && (
        <div className="bg-white dark:bg-[#1e293b] p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Biên lợi nhuận theo danh mục
          </h3>
          <div className="space-y-3">
            {categoryMargin.slice(0, 8).map((cat, idx) => (
              <div key={cat.category} className="flex items-center gap-3">
                <div className="w-28 text-sm text-slate-700 dark:text-slate-300 truncate">{cat.category}</div>
                <div className="flex-1 h-5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all ${cat.margin >= 30 ? 'bg-emerald-500' : cat.margin >= 20 ? 'bg-blue-500' : cat.margin >= 10 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                    style={{ width: `${Math.min(cat.margin, 100)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white mix-blend-difference">
                    {cat.margin.toFixed(1)}%
                  </span>
                </div>
                <div className="w-24 text-right">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(cat.profit)}</div>
                  <div className="text-[9px] text-slate-500">DT: {formatCurrency(cat.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialAnalytics;
