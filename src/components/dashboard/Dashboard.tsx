import React, { useState, useCallback, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  Landmark,
  BarChart3,
  Package,
  Trash2,
  Trophy,
  Users,
  BriefcaseBusiness,
  Boxes,
  AlertTriangle,
  Wrench,
  ShoppingCart,
  FileText,
  Search,
  Settings,
  List,
  Eye,
  EyeOff,
  Bell,
  CheckCircle2,
  Car,
  Clock,
  XCircle,
  HandCoins,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { useAuth } from "../../contexts/AuthContext";
import { formatCurrency } from "../../utils/format";
import { loadDemoData, clearDemoData } from "../../utils/demoData";

// Components
import StatCard from "./components/StatCard";
import StatusItem from "./components/StatusItem";
import QuickActionCard from "./components/QuickActionCard";
import TetBanner from "./components/TetBanner";
import TetConfetti from "../common/TetConfetti";

// Hooks
import { useDashboardData } from "./hooks/useDashboardData";

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [reportFilter, setReportFilter] = useState<string>("month");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.ceil((new Date().getMonth() + 1) / 3));
  const [isLoading, setIsLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(false);
  const [showRevenue, setShowRevenue] = useState(false);

  // Load data using custom hook
  const {
    todayStats,
    filteredStats,
    last7DaysRevenue,
    incomeExpenseData,
    topProducts,
    workOrderStats,
    alerts,
    cashBalance,
    bankBalance,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    debugData,
  } = useDashboardData(reportFilter);

  // ... (existing code)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleLoadDemo = useCallback(async () => {
    if (window.confirm("Bạn có chắc muốn nạp dữ liệu mẫu?")) {
      await loadDemoData();
      window.location.reload();
    }
  }, []);

  const handleClearDemo = useCallback(async () => {
    if (
      window.confirm(
        "CẢNH BÁO: Hành động này sẽ xóa toàn bộ dữ liệu! Bạn có chắc chắn?"
      )
    ) {
      await clearDemoData();
      window.location.reload();
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* <TetConfetti duration={6000} count={40} /> */}
      {/* <TetBanner /> */}
      {/* Header - Lời chào người dùng - Chỉ hiện trên mobile */}
      <div className="md:hidden bg-gradient-to-r from-red-600 to-yellow-500 rounded-2xl p-4 md:p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-lg md:text-xl font-semibold mb-1">
              Xin chào,{" "}
              {profile?.name ||
                profile?.full_name ||
                profile?.email?.split("@")[0] ||
                "Người dùng"}{" "}
              👋
            </h1>
            <p className="text-sm md:text-base text-blue-100 dark:text-violet-100">
              {new Date().toLocaleDateString("vi-VN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>

            {/* Mini stats trong header */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 hover:bg-white/30 transition-colors"
              >
                {showBalance ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <div className="text-left">
                  <p className="text-[10px] opacity-80">Tiền mặt</p>
                  <p className="text-xs font-semibold">
                    {showBalance ? formatCurrency(cashBalance) : "••••••"}
                  </p>
                </div>
              </button>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 hover:bg-white/30 transition-colors"
              >
                <Landmark className="w-3.5 h-3.5" />
                <div className="text-left">
                  <p className="text-[10px] opacity-80">Ngân hàng</p>
                  <p className="text-xs font-semibold">
                    {showBalance ? formatCurrency(bankBalance) : "••••••"}
                  </p>
                </div>
              </button>
            </div>
          </div>

          <Bell className="w-6 h-6 md:w-7 md:h-7 opacity-80 hover:opacity-100 cursor-pointer transition" />
        </div>
      </div>

      {/* Báo cáo - Dropdown với Doanh thu & Lợi nhuận - Chỉ hiện trên mobile */}
      <div className="md:hidden bg-white dark:bg-slate-800 rounded-xl p-4 md:p-5 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
              Báo cáo
            </h2>
            <button
              onClick={() => setShowRevenue(!showRevenue)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
            >
              {showRevenue ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <select
            value={reportFilter}
            onChange={(e) => setReportFilter(e.target.value)}
            className="text-sm bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <Link
            to="/reports"
            className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 md:p-4 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mb-1">
              Doanh thu
            </p>
            <p className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400">
              {showRevenue ? formatCurrency(filteredStats.revenue) : "******"}
            </p>
          </Link>
          <Link
            to="/reports"
            className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 md:p-4 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mb-1">
              Lợi nhuận
            </p>
            <p
              className={`text-lg md:text-2xl font-bold ${filteredStats.profit >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
                }`}
            >
              {showRevenue ? formatCurrency(filteredStats.profit) : "******"}
            </p>
          </Link>
        </div>
      </div>

      {/* Danh sách trạng thái phiếu sửa chữa - Chỉ hiện trên mobile */}
      <div className="md:hidden bg-white dark:bg-slate-800 rounded-xl p-4 md:p-5 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-sm md:text-base font-semibold text-slate-900 dark:text-white mb-3">
          Trạng thái phiếu sửa chữa
        </h3>
        <div className="space-y-2">
          <StatusItem
            icon={<Package className="w-5 h-5" />}
            label="Biên nhận mới"
            count={workOrderStats.newOrders}
            color="blue"
          />
          <StatusItem
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="Đã sửa xong"
            count={workOrderStats.completed}
            color="green"
          />
          <StatusItem
            icon={<Clock className="w-5 h-5" />}
            label="Đang sửa"
            count={workOrderStats.inProgress}
            color="amber"
          />
          <StatusItem
            icon={<Car className="w-5 h-5" />}
            label="Đã trả/giao xe"
            count={workOrderStats.delivered}
            color="slate"
          />
          <StatusItem
            icon={<XCircle className="w-5 h-5" />}
            label="Đã hủy"
            count={workOrderStats.cancelled}
            color="red"
          />
        </div>
      </div>

      {/* Quick Actions - Grid 4 cột với 12 tính năng - Chỉ hiện trên mobile */}
      <div className="md:hidden bg-white dark:bg-slate-800 rounded-xl p-4 md:p-5 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-sm md:text-base font-semibold text-slate-900 dark:text-white mb-4">
          Truy cập nhanh
        </h3>
        <div className="grid grid-cols-4 gap-3 md:gap-4">
          {/* Nhóm Chính - Hàng 1 */}
          <QuickActionCard
            to="/sales"
            icon={<ShoppingCart className="w-6 h-6 md:w-7 md:h-7" />}
            label="Bán hàng"
            color="emerald"
          />
          <QuickActionCard
            to="/service"
            icon={<Wrench className="w-6 h-6 md:w-7 md:h-7" />}
            label="Sửa chữa"
            color="blue"
          />
          <QuickActionCard
            to="/inventory"
            icon={<Boxes className="w-6 h-6 md:w-7 md:h-7" />}
            label="Kho hàng"
            color="orange"
          />
          <QuickActionCard
            to="/customers"
            icon={<Users className="w-6 h-6 md:w-7 md:h-7" />}
            label="Khách hàng"
            color="cyan"
          />

          {/* Nhóm Tài chính - Hàng 2 */}
          <QuickActionCard
            to="/finance"
            icon={<Landmark className="w-6 h-6 md:w-7 md:h-7" />}
            label="Tài chính"
            color="violet"
          />
          <QuickActionCard
            to="/debt"
            icon={<HandCoins className="w-6 h-6 md:w-7 md:h-7" />}
            label="Công nợ"
            color="rose"
          />
          <QuickActionCard
            to="/cashbook"
            icon={<Wallet className="w-6 h-6 md:w-7 md:h-7" />}
            label="Sổ quỹ"
            color="amber"
          />
          <QuickActionCard
            to="/reports"
            icon={<FileText className="w-6 h-6 md:w-7 md:h-7" />}
            label="Báo cáo"
            color="slate"
          />

          {/* Nhóm Quản lý & Khác - Hàng 3 */}
          <QuickActionCard
            to="/employees"
            icon={<BriefcaseBusiness className="w-6 h-6 md:w-7 md:h-7" />}
            label="Nhân viên"
            color="purple"
          />
          <QuickActionCard
            to="/categories"
            icon={<List className="w-6 h-6 md:w-7 md:h-7" />}
            label="Danh mục"
            color="slate"
          />
          <QuickActionCard
            to="/lookup"
            icon={<Search className="w-6 h-6 md:w-7 md:h-7" />}
            label="Tra cứu"
            color="slate"
          />
          <QuickActionCard
            to="/settings"
            icon={<Settings className="w-6 h-6 md:w-7 md:h-7" />}
            label="Cài đặt"
            color="slate"
          />
        </div>
      </div>

      {/* Cảnh báo quan trọng - Chỉ hiện trên mobile khi có cảnh báo */}
      {alerts.length > 0 && (
        <div className="md:hidden space-y-3">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-5 shadow-sm border-l-4 border-l-amber-500 border border-t-slate-200 border-r-slate-200 border-b-slate-200 dark:border-t-slate-700 dark:border-r-slate-700 dark:border-b-slate-700"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                    {alert.type}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {alert.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop View Helpers - Tiêu đề ngày tháng + Bộ lọc */}
      <div className="hidden md:flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
          Tổng quan{" "}
          {reportFilter === "today" && "hôm nay"}
          {reportFilter === "7days" && "7 ngày qua"}
          {reportFilter === "week" && "tuần này"}
          {reportFilter === "month" && "tháng này"}
          {reportFilter === "year" && `năm ${new Date().getFullYear()}`}
          {reportFilter.startsWith("month") && reportFilter.length > 5 && `tháng ${reportFilter.slice(5)}`}
          {reportFilter.startsWith("q") && reportFilter.length === 2 && `quý ${reportFilter.slice(1)}`}
          {" - "}
          {new Date().toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </h2>
        <select
          value={reportFilter}
          onChange={(e) => setReportFilter(e.target.value)}
          className="text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
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

      {/* Overview Cards (Desktop) */}
      <div className="hidden md:grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Doanh thu"
          value={formatCurrency(filteredStats.revenue)}
          subtitle={`${filteredStats.orderCount} đơn bán, ${todayStats.workOrdersCount} phiếu DV`}
          colorKey="blue"
          icon={DollarSign}
        />
        <StatCard
          title="Lợi nhuận"
          value={formatCurrency(filteredStats.profit)}
          subtitle={`Biên LN: ${filteredStats.revenue > 0
            ? Math.round((filteredStats.profit / filteredStats.revenue) * 100)
            : 0
            }%`}
          colorKey="emerald"
          icon={TrendingUp}
        />
        <StatCard
          title="Tiền mặt"
          value={formatCurrency(cashBalance)}
          subtitle="Trong két sắt"
          colorKey="amber"
          icon={Wallet}
        />
        <StatCard
          title="Ngân hàng"
          value={formatCurrency(bankBalance)}
          subtitle="Tài khoản chính"
          colorKey="violet"
          icon={Landmark}
        />
      </div>

      {/* Charts Section (Desktop) */}
      <div className="hidden md:grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Doanh thu 7 ngày */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Doanh thu 7 ngày qua
            </h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7DaysRevenue}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" fontSize={12} tickMargin={10} />
                <YAxis
                  fontSize={12}
                  tickFormatter={(val) =>
                    val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}K`
                  }
                />
                <Tooltip
                  formatter={(value: any) => formatCurrency(value)}
                  labelStyle={{ color: "#333" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Doanh thu"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="Chi phí"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Sản phẩm */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Top sản phẩm & dịch vụ
          </h3>
          <div className="space-y-4">
            {topProducts.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${idx === 0
                      ? "bg-amber-100 text-amber-600"
                      : idx === 1
                        ? "bg-slate-100 text-slate-600"
                        : idx === 2
                          ? "bg-orange-100 text-orange-600"
                          : "bg-slate-50 text-slate-400"
                      }`}
                  >
                    {idx + 1}
                  </div>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {product.name}
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                  {product.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden md:grid gap-4 md:grid-cols-3">
        {/* Alerts & Warnings */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Cần chú ý
          </h3>
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Mọi thứ đều ổn định!
              </div>
            ) : (
              alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20"
                >
                  <AlertTriangle className={`w-5 h-5 shrink-0 ${alert.color}`} />
                  <div>
                    <h4
                      className={`text-sm font-bold ${alert.color} mb-0.5`}
                    >
                      {alert.type}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {alert.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Work Order Stats */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-500" />
            Trạng thái sửa chữa
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Tiếp nhận mới
              </span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {workOrderStats.newOrders}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Đang sửa chữa
              </span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {workOrderStats.inProgress}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/10 rounded-xl">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Đã hoàn thành
              </span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {workOrderStats.completed}
              </span>
            </div>
          </div>
        </div>

        {/* Cấu trúc thu chi (Pie Chart) */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-violet-500" />
            Cấu trúc thu chi
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={incomeExpenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {incomeExpenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-slate-500">Tổng thu</p>
              <p className="font-bold text-emerald-600">
                {formatCurrency(incomeExpenseData[0].value)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Tổng chi</p>
              <p className="font-bold text-red-600">
                {formatCurrency(incomeExpenseData[1].value)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Controls - Dev only */}
      <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700 flex justify-center gap-4 hidden md:flex">
        <button
          onClick={handleLoadDemo}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition"
        >
          Nạp dữ liệu mẫu
        </button>
        <button
          onClick={handleClearDemo}
          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Xóa dữ liệu
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
