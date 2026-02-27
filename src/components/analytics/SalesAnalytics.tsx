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
  Area,
  AreaChart,
} from "recharts";
import { useAppContext } from "../../contexts/AppContext";
import { formatCurrency } from "../../utils/format";
import { getDateRange } from "../../utils/dateUtils";

interface SalesAnalyticsProps {
  sales: any[];
  workOrders: any[];
  parts: any[];
  currentBranchId: string;
  dateFilter?: string;
}

const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({
  sales,
  workOrders,
  parts,
  currentBranchId,
  dateFilter = "30days" // Default fallback
}) => {
  // Removed local timeRange state
  const isLoading = false; // Data comes from parent

  // Filter sales by time range
  const filteredSales = useMemo(() => {
    const { startDate, endDate } = getDateRange(dateFilter);
    return sales.filter((sale) => {
      const d = new Date(sale.date);
      return d >= startDate && d <= endDate;
    });
  }, [sales, dateFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce(
      (sum, sale) => sum + sale.total,
      0
    );
    const totalOrders = filteredSales.length;
    const totalItems = filteredSales.reduce(
      (sum, sale) => sum + sale.items.reduce((s: number, item: any) => s + item.quantity, 0),
      0
    );
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue,
      totalOrders,
      totalItems,
      avgOrderValue,
    };
  }, [filteredSales]);

  // Daily revenue
  const dailyRevenue = useMemo(() => {
    const revenueByDate = new Map<string, number>();

    filteredSales.forEach((sale) => {
      const date = sale.date.slice(0, 10);
      revenueByDate.set(date, (revenueByDate.get(date) || 0) + sale.total);
    });

    return Array.from(revenueByDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0])) // Sort by ISO date string (YYYY-MM-DD)
      .map(([date, revenue]) => ({
        date: new Date(date).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
        }),
        revenue: Math.round(revenue),
      }))
      .slice(-30); // Last 30 data points
  }, [filteredSales]);

  // Top selling products
  const topProducts = useMemo(() => {
    const productSales = new Map<
      string,
      { quantity: number; revenue: number; partName: string }
    >();

    // 1. Process Sales
    filteredSales.forEach((sale) => {
      sale.items.forEach((item: any) => {
        // Normalize ID access
        const pId = item.partId || (item as any).id;
        if (!pId) return;

        const existing = productSales.get(pId);
        // Try to get name from item first, then from parts list
        const partName = item.partName || parts.find((p) => p.id === pId)?.name || "Sản phẩm không xác định";

        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.sellingPrice * item.quantity;
        } else {
          productSales.set(pId, {
            quantity: item.quantity,
            revenue: item.sellingPrice * item.quantity,
            partName,
          });
        }
      });
    });

    // 2. Process Work Orders
    const { startDate, endDate } = getDateRange(dateFilter);

    workOrders.forEach((wo) => {
      // Filter by date
      const woDate = new Date(wo.creationDate || wo.creationdate);
      if (woDate < startDate || woDate > endDate) return;

      // Filter valid status (exclude cancelled)
      const status = (wo.status || "").toLowerCase();
      if (status === "đã hủy" || status === "cancelled") return;

      // Process parts
      const partsList = wo.partsUsed || wo.partsused || wo.parts || wo.items || [];
      if (Array.isArray(partsList)) {
        partsList.forEach((part: any) => {
          const partId = part.partId || part.partid || part.id;
          const qty = part.quantity || part.qty || 0;
          const price = part.unitPrice || part.unitprice || part.price || 0;

          if (!partId) return;

          const existing = productSales.get(partId);
          const partName = part.partName || part.partname || part.name || parts.find((p) => p.id === partId)?.name || "Sản phẩm không xác định";

          if (existing) {
            existing.quantity += qty;
            existing.revenue += price * qty;
          } else {
            productSales.set(partId, {
              quantity: qty,
              revenue: price * qty,
              partName,
            });
          }
        });
      }
    });

    return Array.from(productSales.entries())
      .map(([id, data]) => ({
        id,
        name: data.partName,
        quantity: data.quantity,
        revenue: Math.round(data.revenue),
      }))
      .sort((a, b) => b.quantity - a.quantity) // Sort by quantity to match Dashboard logic (was revenue)
      .slice(0, 10);
  }, [filteredSales, workOrders, dateFilter, parts]);

  // Sales by payment method
  const paymentMethodData = useMemo(() => {
    const methodMap = new Map<string, number>();

    // Translate payment method to Vietnamese
    const translateMethod = (method: string) => {
      const translations: Record<string, string> = {
        'cash': 'Tiền mặt',
        'bank': 'Chuyển khoản',
        'card': 'Thẻ',
        'momo': 'MoMo',
        'vnpay': 'VNPay',
        'zalopay': 'ZaloPay',
      };
      return translations[method.toLowerCase()] || method;
    };

    filteredSales.forEach((sale) => {
      const methodKey = translateMethod(sale.paymentMethod);
      methodMap.set(
        methodKey,
        (methodMap.get(methodKey) || 0) + sale.total
      );
    });

    return Array.from(methodMap.entries())
      .map(([method, revenue]) => ({
        method,
        revenue: Math.round(revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  // Hourly distribution
  const hourlyDistribution = useMemo(() => {
    const hourMap = new Map<number, number>();

    filteredSales.forEach((sale) => {
      const hour = new Date(sale.date).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });

    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}h`,
      orders: hourMap.get(i) || 0,
    }));
  }, [filteredSales]);

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800/80 p-4 rounded-lg border border-slate-200 dark:border-slate-700 border-t-2 border-t-blue-500 shadow-sm">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Doanh thu
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            {formatCurrency(stats.totalRevenue)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-4 rounded-lg border border-slate-200 dark:border-slate-700 border-t-2 border-t-emerald-500 shadow-sm">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Đơn hàng
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            {stats.totalOrders}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-4 rounded-lg border border-slate-200 dark:border-slate-700 border-t-2 border-t-amber-500 shadow-sm">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Sản phẩm bán
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            {stats.totalItems}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-4 rounded-lg border border-slate-200 dark:border-slate-700 border-t-2 border-t-purple-500 shadow-sm">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Giá trị TB/đơn
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            {formatCurrency(stats.avgOrderValue)}
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <div className="bg-white dark:bg-[#1e293b] p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Xu hướng doanh thu
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={dailyRevenue}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name === 'revenue' ? 'Doanh thu' : name]}
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                name="Doanh thu"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods */}
        <div className="bg-white dark:bg-[#1e293b] p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Phương thức thanh toán
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={paymentMethodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="method" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), 'Doanh thu']}
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} name="Doanh thu" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hourly Distribution */}
        <div className="bg-white dark:bg-[#1e293b] p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Phân bố theo giờ
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={hourlyDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hour" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                formatter={(value: number, name: string) => [value, 'Số đơn']}
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Số đơn"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-[#1e293b] p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Top 10 sản phẩm bán chạy
          </h3>
          <div className="space-y-2">
            {topProducts.map((product, index) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {product.name}
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400">
                      Đã bán: {product.quantity}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(product.revenue)}
                  </div>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <div className="text-center py-6 text-slate-600 dark:text-slate-400 text-sm">
                Chưa có dữ liệu bán hàng
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesAnalytics;
