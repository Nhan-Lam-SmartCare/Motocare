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
  Shield,
  ChevronRight,
  ArrowDownToLine,
  Pencil,
  UserPlus,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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
import { showToast } from "../../utils/toast";

// Components
import StatCard from "./components/StatCard";
import StatusItem from "./components/StatusItem";
import QuickActionCard from "./components/QuickActionCard";
import TetBanner from "./components/TetBanner";
import TetConfetti from "../common/TetConfetti";

// Hooks
import { useDashboardData } from "./hooks/useDashboardData";

const Dashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
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
    unpaidWorkOrdersCount,
    lowStockCount,
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

  const handleLogout = async () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      try {
        await signOut();
        showToast.success("Đã đăng xuất");
        navigate("/login");
      } catch (err) {
        showToast.error("Lỗi khi đăng xuất");
      }
    }
  };

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
      <div className="relative md:hidden bg-[#0B0F19] min-h-screen -mx-4 -mt-4 px-6 py-5 pb-24 space-y-6 font-sans text-slate-200 overflow-hidden">
        {/* Ambient Glowing Background Backdrops */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-[35%] right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-10 w-56 h-56 bg-rose-500/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Báo cáo (Tháng này) */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-wide">Báo cáo</h2>
            <span className="text-xs text-slate-400 font-medium bg-slate-800/40 px-2.5 py-0.5 rounded-full">Tháng này</span>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-gradient-to-br from-[#182030] to-[#111723] rounded-2xl p-4 border border-slate-800/80 flex flex-col space-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
              <span className="text-xs text-slate-400 font-medium">Doanh thu</span>
              <span className="text-xl font-extrabold text-blue-400 tracking-tight">
                {formatCurrency(filteredStats.revenue)}
              </span>
            </div>
            <div className="bg-gradient-to-br from-[#182030] to-[#111723] rounded-2xl p-4 border border-slate-800/80 flex flex-col space-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
              <span className="text-xs text-slate-400 font-medium">Lợi nhuận</span>
              <span className="text-xl font-extrabold text-[#34d399] tracking-tight">
                {formatCurrency(filteredStats.profit)}
              </span>
            </div>
          </div>
        </div>

        {/* Hôm nay (Tổng nhanh) */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-wide">Hôm nay</h2>
            <span className="text-xs text-slate-400 font-medium bg-slate-800/40 px-2.5 py-0.5 rounded-full">Tổng nhanh</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-gradient-to-br from-[#182030] to-[#111723] rounded-2xl p-3 border border-slate-800/80 flex flex-col space-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Doanh thu</span>
              <span className="text-sm font-bold text-blue-400 truncate">
                {formatCurrency(todayStats.revenue)}
              </span>
            </div>
            <div className="bg-gradient-to-br from-[#182030] to-[#111723] rounded-2xl p-3 border border-slate-800/80 flex flex-col space-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Lợi nhuận</span>
              <span className="text-sm font-bold text-[#34d399] truncate">
                {formatCurrency(todayStats.profit)}
              </span>
            </div>
            <div className="bg-gradient-to-br from-[#182030] to-[#111723] rounded-2xl p-3 border border-slate-800/80 flex flex-col space-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Bill/phiếu</span>
              <span className="text-sm font-bold text-white truncate">
                {todayStats.orderCount}
              </span>
            </div>
          </div>
        </div>

        {/* Hiệu quả kinh doanh (Theo nguồn) */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-wide">Hiệu quả kinh doanh</h2>
            <span className="text-xs text-slate-400 font-medium bg-slate-800/40 px-2.5 py-0.5 rounded-full">Theo nguồn</span>
          </div>
          <div className="bg-gradient-to-br from-[#182030] to-[#111723] rounded-2xl border border-slate-800/80 p-4 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
            {/* Bán hàng */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-950/40 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-bold text-white">Bán hàng</span>
                  <span className="text-xs text-slate-400 mt-0.5">
                    Doanh thu {formatCurrency(filteredStats.salesRevenue)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Lợi nhuận</span>
                <span className="text-sm font-bold text-blue-400 mt-0.5">
                  {formatCurrency(filteredStats.salesProfit)}
                </span>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-slate-800/60 my-1" />

            {/* Sửa chữa */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Wrench className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-bold text-white">Sửa chữa</span>
                  <span className="text-xs text-slate-400 mt-0.5">
                    Doanh thu {formatCurrency(filteredStats.woRevenue)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Lợi nhuận</span>
                <span className="text-sm font-bold text-[#34d399] mt-0.5">
                  {formatCurrency(filteredStats.woProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cần xử lý (Ưu tiên) */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-wide">Cần xử lý</h2>
            <span className="text-xs text-slate-400 font-medium bg-slate-800/40 px-2.5 py-0.5 rounded-full">Ưu tiên</span>
          </div>
          <div className="space-y-3">
            {/* Tồn kho thấp */}
            <Link
              to="/inventory"
              className="flex items-center justify-between bg-gradient-to-br from-[#182030] to-[#111723] rounded-2xl p-4 border border-slate-800/80 active:from-[#202b40] active:to-[#171f30] transition shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-950/40 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-bold text-white">Tồn kho thấp</span>
                  <span className="text-xs text-slate-400 mt-0.5">
                    {lowStockCount} sản phẩm sắp hết hàng
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
            </Link>

            {/* Phiếu chưa thanh toán */}
            <Link
              to="/debt"
              className="flex items-center justify-between bg-gradient-to-br from-[#182030] to-[#111723] rounded-2xl p-4 border border-slate-800/80 active:from-[#202b40] active:to-[#171f30] transition shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-950/40 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5 text-rose-400" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-bold text-white">Phiếu chưa thanh toán</span>
                  <span className="text-xs text-slate-400 mt-0.5">
                    {unpaidWorkOrdersCount} phiếu sửa chữa còn chờ thu tiền
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
            </Link>
          </div>
        </div>

        {/* Tác vụ nhanh */}
        <div className="relative z-10 space-y-3">
          <h2 className="text-base font-bold text-white tracking-wide text-left">Tác vụ nhanh</h2>
          <div className="grid grid-cols-3 gap-3">
            {/* Tạo phiếu sửa */}
            <Link
              to="/service"
              className="flex flex-col items-center justify-center bg-gradient-to-br from-[#152e2a]/30 to-[#0e1d1b]/30 border border-[#1d4d44]/55 rounded-2xl p-4 active:from-[#152e2a]/55 active:to-[#0e1d1b]/55 transition space-y-2 text-center shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-[#152e2a]/80 flex items-center justify-center shrink-0 border border-[#34d399]/10">
                <Pencil className="w-5 h-5 text-[#34d399]" />
              </div>
              <span className="text-[11px] font-bold text-[#34d399] tracking-tight">Tạo phiếu sửa</span>
            </Link>

            {/* Bán nhanh */}
            <Link
              to="/sales"
              className="flex flex-col items-center justify-center bg-gradient-to-br from-[#17253d]/30 to-[#0f1726]/30 border border-[#233a61]/55 rounded-2xl p-4 active:from-[#17253d]/55 active:to-[#0f1726]/55 transition space-y-2 text-center shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-[#17253d]/80 flex items-center justify-center shrink-0 border border-[#60a5fa]/10">
                <ShoppingCart className="w-5 h-5 text-[#60a5fa]" />
              </div>
              <span className="text-[11px] font-bold text-[#60a5fa] tracking-tight">Bán nhanh</span>
            </Link>

            {/* Nhập kho */}
            <Link
              to="/inventory"
              className="flex flex-col items-center justify-center bg-gradient-to-br from-[#2d271b]/30 to-[#1e1a12]/30 border border-[#4d3f27]/55 rounded-2xl p-4 active:from-[#2d271b]/55 active:to-[#1e1a12]/55 transition space-y-2 text-center shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-[#2d271b]/80 flex items-center justify-center shrink-0 border border-[#f59e0b]/10">
                <ArrowDownToLine className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-[11px] font-bold text-amber-500 tracking-tight">Nhập kho</span>
            </Link>

            {/* Thêm khách */}
            <Link
              to="/customers"
              className="flex flex-col items-center justify-center bg-gradient-to-br from-[#241b35]/30 to-[#171122]/30 border border-[#3c285c]/55 rounded-2xl p-4 active:from-[#241b35]/55 active:to-[#171122]/55 transition space-y-2 text-center shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-[#241b35]/80 flex items-center justify-center shrink-0 border border-[#a78bfa]/10">
                <UserPlus className="w-5 h-5 text-violet-400" />
              </div>
              <span className="text-[11px] font-bold text-violet-400 tracking-tight">Thêm khách</span>
            </Link>

            {/* Thu công nợ */}
            <Link
              to="/debt"
              className="flex flex-col items-center justify-center bg-gradient-to-br from-[#2d1b22]/30 to-[#1e1216]/30 border border-[#4d2532]/55 rounded-2xl p-4 active:from-[#2d1b22]/55 active:to-[#1e1216]/55 transition space-y-2 text-center shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-[#2d1b22]/80 flex items-center justify-center shrink-0 border border-[#fb7185]/10">
                <Wallet className="w-5 h-5 text-rose-400" />
              </div>
              <span className="text-[11px] font-bold text-rose-400 tracking-tight">Thu công nợ</span>
            </Link>

            {/* Báo cáo */}
            <Link
              to="/reports"
              className="flex flex-col items-center justify-center bg-gradient-to-br from-[#1c1c38]/30 to-[#121224]/30 border border-[#2e2b5e]/55 rounded-2xl p-4 active:from-[#1c1c38]/55 active:to-[#121224]/55 transition space-y-2 text-center shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1c1c38]/80 flex items-center justify-center shrink-0 border border-[#818cf8]/10">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="text-[11px] font-bold text-indigo-400 tracking-tight">Báo cáo</span>
            </Link>
          </div>
        </div>

        {/* Đăng xuất */}
        <div className="relative z-10 pt-2">
          <button
            onClick={handleLogout}
            className="w-full py-3.5 bg-gradient-to-r from-red-800 to-rose-900 border border-red-700/30 rounded-2xl text-white font-bold transition shadow-lg active:from-red-900 active:to-rose-950 tracking-wide text-sm"
          >
            Đăng xuất
          </button>
        </div>
      </div>

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
