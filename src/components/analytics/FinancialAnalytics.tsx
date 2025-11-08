import React, { useMemo, useState } from "react";
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
import { useAppContext } from "../../contexts/AppContext";
import { formatCurrency } from "../../utils/format";

type TimeRange = "7days" | "30days" | "90days" | "all";

const FinancialAnalytics: React.FC = () => {
  const {
    sales,
    parts,
    inventoryTransactions,
    customerDebts,
    supplierDebts,
    currentBranchId,
  } = useAppContext();
  const [timeRange, setTimeRange] = useState<TimeRange>("30days");

  // Filter by time range
  const getCutoffDate = () => {
    if (timeRange === "all") return new Date(0);
    const days = timeRange === "7days" ? 7 : timeRange === "30days" ? 30 : 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return cutoffDate;
  };

  // Income from sales
  const salesIncome = useMemo(() => {
    const cutoffDate = getCutoffDate();
    return sales
      .filter((s) => new Date(s.date) >= cutoffDate)
      .reduce((sum, s) => sum + s.total, 0);
  }, [sales, timeRange]);

  // Expenses from inventory purchases
  const inventoryExpenses = useMemo(() => {
    const cutoffDate = getCutoffDate();
    return inventoryTransactions
      .filter((tx) => tx.type === "Nhập kho" && new Date(tx.date) >= cutoffDate)
      .reduce((sum, tx) => {
        const part = parts.find((p) => p.id === tx.partId);
        const cost = part?.wholesalePrice?.[currentBranchId] || 0;
        return sum + cost * tx.quantity;
      }, 0);
  }, [inventoryTransactions, parts, currentBranchId, timeRange]);

  // Net profit
  const netProfit = salesIncome - inventoryExpenses;
  const profitMargin = salesIncome > 0 ? (netProfit / salesIncome) * 100 : 0;

  // Daily income vs expenses
  const dailyFinancials = useMemo(() => {
    const cutoffDate = getCutoffDate();
    const financialMap = new Map<string, { income: number; expense: number }>();

    // Add sales income
    sales
      .filter((s) => new Date(s.date) >= cutoffDate)
      .forEach((sale) => {
        const date = sale.date.slice(0, 10);
        const existing = financialMap.get(date) || { income: 0, expense: 0 };
        existing.income += sale.total;
        financialMap.set(date, existing);
      });

    // Add inventory expenses
    inventoryTransactions
      .filter((tx) => tx.type === "Nhập kho" && new Date(tx.date) >= cutoffDate)
      .forEach((tx) => {
        const date = tx.date.slice(0, 10);
        const part = parts.find((p) => p.id === tx.partId);
        const cost = part?.wholesalePrice?.[currentBranchId] || 0;
        const existing = financialMap.get(date) || { income: 0, expense: 0 };
        existing.expense += cost * tx.quantity;
        financialMap.set(date, existing);
      });

    return Array.from(financialMap.entries())
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
        }),
        income: Math.round(data.income),
        expense: Math.round(data.expense),
        profit: Math.round(data.income - data.expense),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [sales, inventoryTransactions, parts, currentBranchId, timeRange]);

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

  // Inventory value
  const inventoryValue = useMemo(() => {
    return parts.reduce((sum, part) => {
      const stock = part.stock[currentBranchId] || 0;
      const price = part.retailPrice[currentBranchId] || 0;
      return sum + stock * price;
    }, 0);
  }, [parts, currentBranchId]);

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(
          [
            { value: "7days", label: "7 ngày" },
            { value: "30days", label: "30 ngày" },
            { value: "90days", label: "90 ngày" },
            { value: "all", label: "Tất cả" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            onClick={() => setTimeRange(option.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === option.value
                ? "bg-blue-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-6 rounded-lg border border-emerald-200 dark:border-emerald-700">
          <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2">
            Thu nhập
          </div>
          <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
            {formatCurrency(salesIncome)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-6 rounded-lg border border-red-200 dark:border-red-700">
          <div className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
            Chi phí
          </div>
          <div className="text-3xl font-bold text-red-900 dark:text-red-100">
            {formatCurrency(inventoryExpenses)}
          </div>
        </div>

        <div
          className={`bg-gradient-to-br p-6 rounded-lg border ${
            netProfit >= 0
              ? "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700"
              : "from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700"
          }`}
        >
          <div
            className={`text-sm font-medium mb-2 ${
              netProfit >= 0
                ? "text-blue-600 dark:text-blue-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            Lợi nhuận
          </div>
          <div
            className={`text-3xl font-bold ${
              netProfit >= 0
                ? "text-blue-900 dark:text-blue-100"
                : "text-red-900 dark:text-red-100"
            }`}
          >
            {formatCurrency(netProfit)}
          </div>
          <div
            className={`text-xs mt-1 ${
              netProfit >= 0
                ? "text-blue-600 dark:text-blue-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            Biên lợi nhuận: {profitMargin.toFixed(1)}%
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-lg border border-purple-200 dark:border-purple-700">
          <div className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-2">
            Giá trị tồn kho
          </div>
          <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {formatCurrency(inventoryValue)}
          </div>
        </div>
      </div>

      {/* Income vs Expense Chart */}
      <div className="bg-white dark:bg-[#1e293b] p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Thu - Chi - Lợi nhuận
        </h3>
        <ResponsiveContainer width="100%" height={350}>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Debts */}
        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Công nợ khách hàng
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
              <div>
                <div className="text-sm text-amber-600 dark:text-amber-400">
                  Tổng công nợ
                </div>
                <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {formatCurrency(customerDebtStats.totalDebt)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-amber-600 dark:text-amber-400">
                  Quá hạn
                </div>
                <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {customerDebtStats.overdueCount}
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Top 5 khách nợ nhiều nhất
              </div>
              <div className="space-y-2">
                {topDebtors.map((debt) => (
                  <div
                    key={debt.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {debt.customerName}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Ngày tạo:{" "}
                        {new Date(debt.createdDate).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-amber-600 dark:text-amber-400">
                        {formatCurrency(debt.remainingAmount)}
                      </div>
                    </div>
                  </div>
                ))}
                {topDebtors.length === 0 && (
                  <div className="text-center py-4 text-slate-600 dark:text-slate-400">
                    ✅ Không có công nợ
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Supplier Debts */}
        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Công nợ nhà cung cấp
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
              <div>
                <div className="text-sm text-red-600 dark:text-red-400">
                  Tổng công nợ
                </div>
                <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {formatCurrency(supplierDebtStats.totalDebt)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-red-600 dark:text-red-400">
                  Quá hạn
                </div>
                <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {supplierDebtStats.overdueCount}
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                💡 Mẹo quản lý tài chính
              </div>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Theo dõi biên lợi nhuận hàng tháng</li>
                <li>• Giữ tồn kho ở mức hợp lý</li>
                <li>• Thu hồi công nợ đúng hạn</li>
                <li>• Đàm phán điều khoản với nhà cung cấp</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Khách hàng nợ
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {customerDebtStats.count}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  NCC cần trả
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {supplierDebtStats.count}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialAnalytics;
