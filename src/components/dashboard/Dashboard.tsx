import React, { useState, useCallback } from "react";
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
  X,
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
import { useWorkOrdersRealtime } from "../../hooks/useWorkOrdersRealtime";

const Dashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  useWorkOrdersRealtime();
  const navigate = useNavigate();
  const [reportFilter, setReportFilter] = useState<string>("month");

  const [showBalance, setShowBalance] = useState(false);
  const [showPartsDetailModal, setShowPartsDetailModal] = useState(false);
  const [partsSearchQuery, setPartsSearchQuery] = useState("");

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

  // Fake loading delay removed – data is fetched by useDashboardData hooks

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



  return (
    <div className="space-y-3 md:space-y-4">
      {/* <TetConfetti duration={6000} count={40} /> */}
      {/* <TetBanner /> */}
      <div className="relative md:hidden bg-[#0B0F19] min-h-screen px-4 py-5 pb-24 space-y-6 font-sans text-slate-200 overflow-hidden">
        {/* Ambient Glowing Background Backdrops */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-[35%] right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-10 w-56 h-56 bg-rose-500/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Mobile Page Title */}
        <div className="relative z-10 flex items-center gap-3 border-b border-slate-800/60 pb-3">
          <img
            src="/logo-smartcare.png"
            alt="SmartCare Logo"
            className="w-10 h-10 rounded-xl shadow-md ring-1 ring-slate-800"
          />
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight leading-none">Nhạn Lâm SmartCare</h1>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Hệ thống quản lý cửa hàng</p>
          </div>
        </div>

        {/* Báo cáo (Tháng này) */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-wide">Báo cáo</h2>
            <span className="text-xs text-slate-400 font-medium bg-slate-800/40 px-2.5 py-0.5 rounded-full">Tháng này</span>
          </div>
          <div className="space-y-3">
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
            
            <button 
              onClick={() => setShowPartsDetailModal(true)}
              className="w-full bg-gradient-to-br from-[#182030] to-[#111723] rounded-2xl p-3 px-4 border border-slate-800/80 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.4)] active:from-[#202b40] active:to-[#171f30] transition text-left"
            >
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                Phụ tùng đã bán
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </span>
              <span className="text-sm font-bold text-[#60a5fa] bg-slate-800/60 border border-slate-700/30 px-3 py-1 rounded-xl">
                {filteredStats.partsSold} cái
              </span>
            </button>
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

        {/* Doanh thu 7 ngày (Mobile Chart) */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-wide">Xu hướng doanh thu</h2>
            <span className="text-xs text-slate-400 font-medium bg-slate-800/40 px-2.5 py-0.5 rounded-full">7 ngày qua</span>
          </div>
          <div className="bg-gradient-to-br from-[#182030] to-[#111723] rounded-2xl border border-slate-800/80 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
            <div className="h-44 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last7DaysRevenue} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8' }}
                    tickFormatter={(val) =>
                      val >= 1000000 ? `${(val / 1000000).toFixed(0)}M` : `${(val / 1000).toFixed(0)}K`
                    }
                  />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderColor: '#334155', 
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Doanh thu"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Sản phẩm (Mobile) */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-wide">Top sản phẩm bán chạy</h2>
            <span className="text-xs text-slate-400 font-medium bg-slate-800/40 px-2.5 py-0.5 rounded-full">Tháng này</span>
          </div>
          <div className="bg-gradient-to-br from-[#182030] to-[#111723] rounded-2xl border border-slate-800/80 p-4 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
            {topProducts.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500">
                Chưa có dữ liệu sản phẩm bán chạy
              </div>
            ) : (
              topProducts.slice(0, 5).map((product, idx) => (
                <div key={idx} className="flex items-center justify-between text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        idx === 0
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : idx === 1
                            ? "bg-slate-400/20 text-slate-300 border border-slate-400/30"
                            : idx === 2
                              ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                              : "bg-slate-800 text-slate-400 border border-slate-700/50"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium text-white truncate">
                      {product.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-blue-400 bg-blue-950/40 border border-blue-500/20 px-2 py-0.5 rounded-md shrink-0 ml-2">
                    SL: {product.quantity}
                  </span>
                </div>
              ))
            )}
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

            {/* Dynamic Alerts for Mobile (Loans, Low balance) */}
            {alerts.filter(a => a.type !== "Tồn kho thấp").map((alert, idx) => {
              const isLoan = alert.type === "Nợ đến hạn";
              const toPath = isLoan ? "/loans" : "/finance";
              const IconComponent = isLoan ? Landmark : Wallet;
              const bgClass = isLoan 
                ? "bg-rose-950/40 border-rose-500/20" 
                : "bg-amber-950/40 border-amber-500/20";
              const textIconClass = isLoan ? "text-rose-400" : "text-amber-500";
              
              return (
                <Link
                  key={idx}
                  to={toPath}
                  className="flex items-center justify-between bg-gradient-to-br from-[#182030] to-[#111723] rounded-2xl p-4 border border-slate-800/80 active:from-[#202b40] active:to-[#171f30] transition shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center shrink-0 border`}>
                      <IconComponent className={`w-5 h-5 ${textIconClass}`} />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-bold text-white">{alert.type}</span>
                      <span className="text-xs text-slate-400 mt-0.5">
                        {alert.message}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
                </Link>
              );
            })}
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
          subtitle={`${filteredStats.salesCount} hóa đơn, ${filteredStats.workOrdersCount} phiếu dịch vụ`}
          colorKey="blue"
          icon={DollarSign}
        />
        <StatCard
          title="Lợi nhuận"
          value={formatCurrency(filteredStats.profit)}
          subtitle={
            <div className="flex items-center justify-between w-full">
              <span>
                LN: {filteredStats.revenue > 0 ? Math.round((filteredStats.profit / filteredStats.revenue) * 100) : 0}%
              </span>
              <button 
                onClick={() => setShowPartsDetailModal(true)}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold ml-2"
              >
                Chi tiết: {filteredStats.partsSold} cái
              </button>
            </div>
          }
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

      {showPartsDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Chi tiết phụ tùng đã bán
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Lọc theo: {
                    reportFilter === "today" && "Hôm nay" ||
                    reportFilter === "7days" && "7 ngày qua" ||
                    reportFilter === "week" && "Tuần này" ||
                    reportFilter === "month" && "Tháng này" ||
                    reportFilter === "year" && "Năm nay" ||
                    reportFilter.startsWith("month") && `Tháng ${reportFilter.slice(5)}` ||
                    reportFilter.startsWith("q") && `Quý ${reportFilter.slice(1)}` ||
                    "Tháng này"
                  }
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPartsDetailModal(false);
                  setPartsSearchQuery("");
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search and Total Summary */}
            <div className="p-5 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc mã SKU..."
                  value={partsSearchQuery}
                  onChange={(e) => setPartsSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <div>Tổng phụ tùng: <span className="text-blue-600 dark:text-blue-400">{filteredStats.partsSold} cái</span></div>
                <div className="hidden sm:block">Mặt hàng khác nhau: <span className="text-emerald-600 dark:text-emerald-400">{(filteredStats.detailedPartsSold || []).length}</span></div>
              </div>
            </div>

            {/* Modal Content - Scrollable List */}
            <div className="px-5 pb-5 pt-0 flex-1 overflow-y-auto min-h-0">
              {/* Mobile View: Cards */}
              <div className="block md:hidden space-y-3 mt-4">
                {(filteredStats.detailedPartsSold || [])
                  .filter((p: any) => 
                    p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(partsSearchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")) ||
                    p.sku.toLowerCase().includes(partsSearchQuery.toLowerCase())
                  ).length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      Không tìm thấy phụ tùng phù hợp
                    </div>
                  ) : (
                    (filteredStats.detailedPartsSold || [])
                      .filter((p: any) => 
                        p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(partsSearchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")) ||
                        p.sku.toLowerCase().includes(partsSearchQuery.toLowerCase())
                      )
                      .map((part: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 p-3.5 rounded-xl space-y-2.5">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {part.name}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                                SKU: {part.sku || "N/A"}
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-extrabold px-2.5 py-0.5 rounded-lg">
                                SL: {part.quantity} cái
                              </span>
                              {part.prevQuantity !== undefined && (
                                <span className="text-[9px] text-slate-400">
                                  Kỳ trước: {part.prevQuantity} {
                                    part.prevQuantity === 0 ? (
                                      <span className="text-emerald-500 font-extrabold bg-emerald-500/10 dark:bg-emerald-500/20 px-1 rounded text-[8px] uppercase">Mới</span>
                                    ) : part.quantity > part.prevQuantity ? (
                                      <span className="text-emerald-500 font-bold">▲{part.quantity - part.prevQuantity}</span>
                                    ) : part.quantity < part.prevQuantity ? (
                                      <span className="text-rose-500 font-bold">▼{part.prevQuantity - part.quantity}</span>
                                    ) : (
                                      <span className="text-slate-400 font-bold">=</span>
                                    )
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 dark:border-slate-800/60 pt-2 text-slate-500 dark:text-slate-400">
                            <div>
                              Doanh thu: <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(part.revenue)}</span>
                            </div>
                            <div>
                              Lợi nhuận: <span className="font-semibold text-[#34d399]">{formatCurrency(part.profit)}</span>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 mt-4">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                      <th className="py-3 px-4 w-12 text-center rounded-tl-xl">STT</th>
                      <th className="py-3 px-4">Tên phụ tùng / SKU</th>
                      <th className="py-3 px-4 text-center">Số lượng bán</th>
                      <th className="py-3 px-4 text-right">Doanh thu</th>
                      <th className="py-3 px-4 text-right">Lợi nhuận</th>
                      <th className="py-3 px-4 text-center rounded-tr-xl">Biên LN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(filteredStats.detailedPartsSold || [])
                      .filter((p: any) => 
                        p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(partsSearchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")) ||
                        p.sku.toLowerCase().includes(partsSearchQuery.toLowerCase())
                      ).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-500">
                            Không tìm thấy phụ tùng phù hợp
                          </td>
                        </tr>
                      ) : (
                        (filteredStats.detailedPartsSold || [])
                          .filter((p: any) => 
                            p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(partsSearchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")) ||
                            p.sku.toLowerCase().includes(partsSearchQuery.toLowerCase())
                          )
                          .map((part: any, idx: number) => {
                            const margin = part.revenue > 0 ? Math.round((part.profit / part.revenue) * 100) : 0;
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-300">
                                <td className="py-3 px-4 text-center font-medium text-slate-400">{idx + 1}</td>
                                <td className="py-3 px-4">
                                  <p className="font-bold text-slate-900 dark:text-white">{part.name}</p>
                                  <span className="text-[10px] text-slate-400 font-mono tracking-wider">SKU: {part.sku || "N/A"}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex flex-col items-center justify-center">
                                    <span className="font-bold text-blue-600 dark:text-blue-400">{part.quantity}</span>
                                    {part.prevQuantity !== undefined && (
                                      <div className="flex items-center gap-1 mt-0.5 text-[10px]">
                                        <span className="text-slate-400">Kỳ trước: {part.prevQuantity}</span>
                                        {part.prevQuantity === 0 ? (
                                          <span className="text-emerald-500 font-extrabold bg-emerald-500/10 dark:bg-emerald-500/20 px-1 rounded text-[8px] uppercase">Mới</span>
                                        ) : part.quantity > part.prevQuantity ? (
                                          <span className="text-emerald-500 font-bold text-[9px]">▲{part.quantity - part.prevQuantity}</span>
                                        ) : part.quantity < part.prevQuantity ? (
                                          <span className="text-rose-500 font-bold text-[9px]">▼{part.prevQuantity - part.quantity}</span>
                                        ) : (
                                          <span className="text-slate-400 font-bold">=</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right font-medium">{formatCurrency(part.revenue)}</td>
                                <td className="py-3 px-4 text-right font-bold text-[#34d399]">{formatCurrency(part.profit)}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                                    margin >= 40 
                                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" 
                                      : margin >= 20 
                                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                                  }`}>
                                    {margin}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                      )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  setShowPartsDetailModal(false);
                  setPartsSearchQuery("");
                }}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
