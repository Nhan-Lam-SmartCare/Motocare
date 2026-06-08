import React from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ChevronDown,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  FileText,
  History,
  Plus,
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
}

interface FilterActionBarProps {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dateFilter: string;
  setDateFilter: (value: string) => void;
  technicianFilter: string;
  setTechnicianFilter: (value: string) => void;
  employees: Employee[];
  paymentFilter: string;
  setPaymentFilter: (value: string) => void;
  customDateStart: string;
  setCustomDateStart: (value: string) => void;
  customDateEnd: string;
  setCustomDateEnd: (value: string) => void;
  refetchWorkOrders: () => void;
  workOrdersFetching: boolean;
  clearFilters: () => void;
  filteredOrdersCount: number;
  isOwner: boolean;
  showProfit: boolean;
  setShowProfit: (value: boolean) => void;
  setShowTemplateModal: (value: boolean) => void;
  handleOpenModal: () => void;
}

export const FilterActionBar: React.FC<FilterActionBarProps> = ({
  searchInputRef,
  searchQuery,
  setSearchQuery,
  dateFilter,
  setDateFilter,
  technicianFilter,
  setTechnicianFilter,
  employees,
  paymentFilter,
  setPaymentFilter,
  customDateStart,
  setCustomDateStart,
  customDateEnd,
  setCustomDateEnd,
  refetchWorkOrders,
  workOrdersFetching,
  clearFilters,
  filteredOrdersCount,
  isOwner,
  showProfit,
  setShowProfit,
  setShowTemplateModal,
  handleOpenModal,
}) => {
  const hasActiveFilters =
    searchQuery ||
    dateFilter !== "week" ||
    technicianFilter !== "all" ||
    paymentFilter !== "all";

  return (
    <div className="sticky top-2 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl px-4 py-3 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
      {/* Left: Search & Filters */}
      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[280px]">
          <input
            ref={searchInputRef as any}
            type="text"
            placeholder="Tìm mã phiếu, tên, biển số..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-full text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
          />
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            aria-hidden="true"
          />
        </div>

        {/* Group Dropdowns in a clean pill style */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-full border border-slate-100 dark:border-slate-700/50 overflow-hidden">
          <div className="relative flex items-center">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-3 pr-7 py-1.5 text-[13px] bg-transparent border-none text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-0 cursor-pointer appearance-none hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-full transition-colors"
            >
              <option value="today">Hôm nay</option>
              <option value="week">7 ngày</option>
              <option value="month">Tháng này</option>
              <option value="custom">Tùy chọn</option>
              <option value="all">Tất cả</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>

          <div className="w-px h-4 bg-slate-200 dark:bg-slate-600"></div>

          <div className="relative flex items-center">
            <select
              value={technicianFilter}
              onChange={(e) => setTechnicianFilter(e.target.value)}
              className="pl-3 pr-7 py-1.5 text-[13px] bg-transparent border-none text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-0 cursor-pointer appearance-none hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-full transition-colors"
            >
              <option value="all">KTV: Tất cả</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.name}>
                  {emp.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>

          <div className="w-px h-4 bg-slate-200 dark:bg-slate-600"></div>

          <div className="relative flex items-center">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="pl-3 pr-7 py-1.5 text-[13px] bg-transparent border-none text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-0 cursor-pointer appearance-none hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-full transition-colors"
            >
              <option value="all">TT: Tất cả</option>
              <option value="paid">Đã thu</option>
              <option value="unpaid">Chưa thu</option>
              <option value="partial">Nợ</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>
        </div>

        {dateFilter === "custom" && (
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-full border border-slate-100 dark:border-slate-700/50">
            <input
              type="date"
              value={customDateStart}
              onChange={(e) => setCustomDateStart(e.target.value)}
              className="px-2 py-1 text-xs bg-transparent border-none text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-0"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={customDateEnd}
              onChange={(e) => setCustomDateEnd(e.target.value)}
              className="px-2 py-1 text-xs bg-transparent border-none text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-0"
            />
          </div>
        )}

        {/* Icon buttons for clear/refresh */}
        <div className="flex items-center gap-1">
          <button
            onClick={refetchWorkOrders}
            disabled={workOrdersFetching}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-full transition-colors"
            title="Làm mới"
          >
            <RefreshCw
              className={`w-4 h-4 ${workOrdersFetching ? "animate-spin" : ""}`}
            />
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-full transition-colors"
              title="Xóa bộ lọc"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end gap-3 w-full lg:w-auto shrink-0">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700/50">
          {filteredOrdersCount} KQ
        </span>

        <div className="flex items-center gap-1.5">
          {isOwner && (
            <button
              onClick={() => setShowProfit(!showProfit)}
              className={`p-2 rounded-full transition-colors ${
                showProfit
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title={showProfit ? "Ẩn LN" : "Hiện LN"}
            >
              {showProfit ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            onClick={() => setShowTemplateModal(true)}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-full transition-colors"
            title="Mẫu SC"
          >
            <FileText className="w-4 h-4" />
          </button>
          <Link
            to="/service-history"
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-full transition-colors"
            title="Lịch sử"
          >
            <History className="w-4 h-4" />
          </Link>
        </div>

        <button
          onClick={handleOpenModal}
          className="pl-3 pr-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ml-2"
        >
          <div className="bg-white/25 p-1 rounded-full">
            <Plus className="w-3.5 h-3.5" />
          </div>
          <span>{filteredOrdersCount === 0 ? "Tạo Phiếu" : "Thêm Phiếu"}</span>
        </button>
      </div>
    </div>
  );
};
