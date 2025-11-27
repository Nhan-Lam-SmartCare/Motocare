import React, { useMemo, useState, useEffect } from "react";
import { Banknote, CreditCard, CalendarDays, Receipt } from "lucide-react";
import type { Sale, CartItem } from "../../../types";
import { formatCurrency, formatDate, formatAnyId } from "../../../utils/format";
import { showToast } from "../../../utils/toast";
import { safeAudit } from "../../../lib/repository/auditLogsRepository";
import { supabase } from "../../../supabaseClient";
import SaleDetailModal from "./SaleDetailModal";
import EditSaleModal from "./EditSaleModal";

export interface SalesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  currentBranchId: string;
  onPrintReceipt: (sale: Sale) => void;
  onEditSale: (sale: Sale) => void;
  onDeleteSale: (saleId: string) => void;
  page: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
  pageSize: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onPageSizeChange: (size: number) => void;
  search: string;
  onSearchChange: (s: string) => void;
  fromDate?: string;
  toDate?: string;
  onDateRangeChange: (from?: string, to?: string) => void;
  status?: "all" | "completed" | "cancelled" | "refunded";
  onStatusChange?: (s: "all" | "completed" | "cancelled" | "refunded") => void;
  paymentMethodFilter?: "all" | "cash" | "bank";
  onPaymentMethodFilterChange?: (m: "all" | "cash" | "bank") => void;
  keysetMode?: boolean;
  onToggleKeyset?: (checked: boolean) => void;
  customerDebts?: any[];
}

const SalesHistoryModal: React.FC<SalesHistoryModalProps> = ({
  isOpen,
  onClose,
  sales,
  currentBranchId,
  onPrintReceipt,
  onEditSale,
  onDeleteSale,
  page,
  totalPages,
  total,
  hasMore,
  pageSize,
  onPrevPage,
  onNextPage,
  onPageSizeChange,
  search,
  onSearchChange,
  fromDate,
  toDate,
  onDateRangeChange,
  status = "all",
  onStatusChange,
  paymentMethodFilter = "all",
  onPaymentMethodFilterChange,
  keysetMode = false,
  onToggleKeyset,
  customerDebts = [],
}) => {
  const [activeTimeFilter, setActiveTimeFilter] = useState("7days");
  const [searchText, setSearchText] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [dropdownOpenSaleId, setDropdownOpenSaleId] = useState<string | null>(
    null
  );

  // Compute date range when filter changes
  useEffect(() => {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999
    );
    let from: Date | undefined;
    let to: Date | undefined;
    switch (activeTimeFilter) {
      case "today":
        from = startOfDay;
        to = endOfDay;
        break;
      case "week": {
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diff);
        from = new Date(
          monday.getFullYear(),
          monday.getMonth(),
          monday.getDate()
        );
        to = endOfDay;
        break;
      }
      case "month": {
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        to = endOfDay;
        break;
      }
      case "7days": {
        const s = new Date(today);
        s.setDate(s.getDate() - 6);
        from = new Date(s.getFullYear(), s.getMonth(), s.getDate());
        to = endOfDay;
        break;
      }
      case "30days": {
        const s = new Date(today);
        s.setDate(s.getDate() - 29);
        from = new Date(s.getFullYear(), s.getMonth(), s.getDate());
        to = endOfDay;
        break;
      }
      case "custom": {
        if (customStartDate && customEndDate) {
          from = new Date(customStartDate);
          to = new Date(customEndDate + "T23:59:59");
        }
        break;
      }
      case "all":
        from = undefined;
        to = undefined;
        break;
    }
    onDateRangeChange(
      from ? from.toISOString() : undefined,
      to ? to.toISOString() : undefined
    );
  }, [activeTimeFilter, customStartDate, customEndDate, onDateRangeChange]);

  // Filter and sort sales
  const filteredSales = useMemo(() => {
    let filtered = sales.filter(
      (sale) =>
        sale.branchId === currentBranchId ||
        (sale as any).branchid === currentBranchId
    );

    if (searchText) {
      filtered = filtered.filter(
        (sale) =>
          sale.id.toLowerCase().includes(searchText.toLowerCase()) ||
          (sale.sale_code || "")
            .toLowerCase()
            .includes(searchText.toLowerCase()) ||
          sale.customer.name.toLowerCase().includes(searchText.toLowerCase()) ||
          ((sale as any).username || sale.userName || "")
            .toLowerCase()
            .includes(searchText.toLowerCase())
      );
    }

    filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return filtered;
  }, [sales, currentBranchId, searchText]);

  // Calculate total revenue
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  }, [filteredSales]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".dropdown-menu-container")) {
        setDropdownOpenSaleId(null);
      }
    };
    if (dropdownOpenSaleId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpenSaleId]);

  if (!isOpen) return null;

  return (
    <React.Fragment>
      <div className="fixed inset-0 bg-black/60 z-50 flex md:items-center md:justify-center items-end justify-center p-0 md:p-4">
        <div className="bg-white dark:bg-slate-800 w-full md:max-w-7xl max-h-[95vh] md:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up-bottom">
          {/* Header with time filter and stats */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/70 backdrop-blur">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Lịch sử bán hàng
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  Theo dõi giao dịch gần đây
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white text-2xl leading-none px-2"
                aria-label="Đóng lịch sử bán hàng"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Time filter buttons */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-thin">
                {[
                  { key: "7days", label: "7 ngày qua" },
                  { key: "week", label: "Tuần" },
                  { key: "month", label: "Tháng" },
                  { key: "30days", label: "30 ngày qua" },
                  { key: "custom", label: "Tùy chọn" },
                  { key: "all", label: "Tất cả" },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setActiveTimeFilter(filter.key)}
                    className={`px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap border transition-all min-w-[96px] ${
                      activeTimeFilter === filter.key
                        ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30"
                        : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-transparent"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Search and stats */}
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="w-full md:flex-1 relative">
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Tìm hóa đơn, khách hàng hoặc mã phiếu"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                  <svg
                    className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11 19a8 8 0 100-16 8 8 0 000 16z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-4.3-4.3"
                    />
                  </svg>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                  <div className="text-right">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Tổng doanh thu
                    </div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(totalRevenue)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom date range picker */}
              {activeTimeFilter === "custom" && (
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <label className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    Từ
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                    />
                  </label>
                  <label className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    Đến
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Sales list */}
          <div className="flex-1 overflow-y-auto">
            {filteredSales.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                Không có hóa đơn nào
              </div>
            ) : (
              <div>
                {/* Header Row */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 sticky top-0 z-10">
                  <div className="col-span-1 text-xs font-semibold text-slate-600 dark:text-slate-300"></div>
                  <div className="col-span-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Mã phiếu
                  </div>
                  <div className="col-span-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Khách hàng
                  </div>
                  <div className="col-span-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Chi tiết
                  </div>
                  <div className="col-span-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Thanh toán
                  </div>
                  <div className="col-span-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Thao tác
                  </div>
                </div>

                {/* Sales List */}
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredSales.map((sale) => {
                    const saleDate = new Date(sale.date);
                    const subtotal = sale.items.reduce(
                      (sum, item) =>
                        sum + item.quantity * (item as any).sellingPrice,
                      0
                    );

                    const saleDebt = (customerDebts || []).find((debt) =>
                      debt.description?.includes(sale.sale_code || sale.id)
                    );

                    const paidAmount = saleDebt
                      ? saleDebt.totalAmount - saleDebt.remainingAmount
                      : sale.total;
                    const remainingDebt = saleDebt?.remainingAmount || 0;
                    const hasDebt = remainingDebt > 0;
                    const itemDisplayLimit = 3;
                    const displayItems = sale.items.slice(0, itemDisplayLimit);
                    const remainingItems =
                      sale.items.length - displayItems.length;
                    const formattedDate = saleDate.toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    });
                    const formattedTime = saleDate.toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const customerInitial = (
                      sale.customer?.name?.charAt(0) || "K"
                    ).toUpperCase();
                    const paymentLabel =
                      sale.paymentMethod === "cash"
                        ? "Tiền mặt"
                        : "Chuyển khoản";

                    return (
                      <div
                        key={sale.id}
                        className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        {/* Mobile friendly card */}
                        <div className="md:hidden flex flex-col gap-3 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              {sale.sale_code && (
                                <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-300">
                                  <Receipt className="w-4 h-4" />
                                  {sale.sale_code}
                                </div>
                              )}
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                                <CalendarDays className="w-3.5 h-3.5" />
                                <span>
                                  {formattedDate} · {formattedTime}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                                <span className="font-medium text-slate-600 dark:text-slate-300">
                                  NV
                                </span>
                                <span>
                                  {sale.userName ||
                                    (sale as any).username ||
                                    "N/A"}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                Tổng tiền
                              </div>
                              <div className="text-lg font-bold text-slate-900 dark:text-white">
                                {formatCurrency(sale.total)}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 justify-end mt-1">
                                {sale.paymentMethod === "cash" ? (
                                  <Banknote className="w-4 h-4" />
                                ) : (
                                  <CreditCard className="w-4 h-4" />
                                )}
                                <span>{paymentLabel}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-3">
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-200 font-semibold">
                              {customerInitial}
                            </div>
                            <div>
                              <div className="text-base font-semibold text-slate-900 dark:text-white">
                                {sale.customer?.name || "Khách vãng lai"}
                              </div>
                              {sale.customer?.phone && (
                                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M2 5.5C2 4.119 3.12 3 4.5 3h1.76c.636 0 1.197.4 1.39 1.005l.8 2.47a1.5 1.5 0 01-.35 1.46L7.11 8.94a12.044 12.044 0 005.95 5.95l1.006-1.002a1.5 1.5 0 011.46-.349l2.469.8c.606.193 1.005.754 1.005 1.39V19.5c0 1.38-1.119 2.5-2.5 2.5h-.25C8.268 22 2 15.732 2 7.75v-.25z"
                                    />
                                  </svg>
                                  {sale.customer.phone}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            {displayItems.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-start justify-between text-sm text-slate-700 dark:text-slate-200"
                              >
                                <div>
                                  <span className="font-semibold">
                                    {item.quantity} x {item.partName}
                                  </span>
                                  <div className="text-xs text-slate-400">
                                    {formatCurrency(
                                      (item as any).sellingPrice || 0
                                    )}{" "}
                                    / sản phẩm
                                  </div>
                                </div>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {formatCurrency(
                                    item.quantity *
                                      ((item as any).sellingPrice || 0)
                                  )}
                                </span>
                              </div>
                            ))}
                            {remainingItems > 0 && (
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                +{remainingItems} sản phẩm khác
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {hasDebt ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200">
                                ⚠️ Còn nợ {formatCurrency(remainingDebt)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200">
                                ✓ Đã thanh toán
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {paymentLabel}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700">
                            <button
                              onClick={() => onPrintReceipt(sale)}
                              className="flex-1 min-w-[120px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium"
                            >
                              In hoá đơn
                            </button>
                            <button
                              onClick={() => {
                                setSelectedSale(sale);
                                setShowDetailModal(true);
                              }}
                              className="flex-1 min-w-[120px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium"
                            >
                              Xem chi tiết
                            </button>
                            <button
                              onClick={() => {
                                setSelectedSale(sale);
                                setShowEditModal(true);
                              }}
                              className="flex-1 min-w-[120px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium"
                            >
                              Chỉnh sửa
                            </button>
                            <button
                              onClick={() => onDeleteSale(sale.id)}
                              className="flex-1 min-w-[120px] px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm font-medium"
                            >
                              Xóa đơn
                            </button>
                          </div>
                        </div>

                        {/* Desktop layout */}
                        <div className="hidden md:grid grid-cols-12 gap-4 items-start">
                          {/* Checkbox */}
                          <div className="col-span-1 flex items-start pt-1">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300"
                            />
                          </div>

                          {/* Cột 1: Mã Phiếu + Thông tin */}
                          <div className="col-span-2">
                            <div className="space-y-1">
                              {sale.sale_code && (
                                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                  {sale.sale_code}
                                </div>
                              )}
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {saleDate.getDate()}/{saleDate.getMonth() + 1}/
                                {saleDate.getFullYear()}{" "}
                                {String(saleDate.getHours()).padStart(2, "0")}:
                                {String(saleDate.getMinutes()).padStart(2, "0")}
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-300">
                                <span className="font-medium">NV:</span>{" "}
                                {sale.userName ||
                                  (sale as any).username ||
                                  "N/A"}
                              </div>
                            </div>
                          </div>

                          {/* Cột 2: Khách hàng */}
                          <div className="col-span-2">
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {sale.customer?.name || "Khách vãng lai"}
                              </div>
                              {sale.customer?.phone && (
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  📞 {sale.customer.phone}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Cột 3: Chi tiết sản phẩm */}
                          <div className="col-span-4">
                            <div className="space-y-1">
                              {sale.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs text-slate-700 dark:text-slate-300"
                                >
                                  <span className="font-medium">
                                    {item.quantity} x
                                  </span>{" "}
                                  {item.partName}
                                  <span className="text-slate-400 ml-1">
                                    (
                                    {formatCurrency(
                                      (item as any).sellingPrice || 0
                                    )}
                                    )
                                  </span>
                                  {" = "}
                                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    {formatCurrency(
                                      item.quantity *
                                        ((item as any).sellingPrice || 0)
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Cột 4: Thông tin thanh toán */}
                          <div className="col-span-2">
                            <div className="space-y-1">
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                Tổng tiền:
                              </div>
                              <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                                {formatCurrency(sale.total)}
                              </div>

                              {hasDebt ? (
                                <div className="mt-2 space-y-1">
                                  <div className="text-xs text-green-600 dark:text-green-400">
                                    Đã trả: {formatCurrency(paidAmount)}
                                  </div>
                                  <div className="text-xs font-semibold text-red-600 dark:text-red-400">
                                    Còn nợ: {formatCurrency(remainingDebt)}
                                  </div>
                                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                    ⚠️ Còn nợ
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-2">
                                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                    ✓ Đã thanh toán
                                  </div>
                                </div>
                              )}

                              <div className="text-xs text-slate-500 mt-1">
                                {sale.paymentMethod === "cash"
                                  ? "💵 Tiền mặt"
                                  : "🏦 Chuyển khoản"}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="col-span-1 flex items-start justify-end gap-2 pt-1">
                            <button
                              onClick={() => {
                                setSelectedSale(sale);
                                setShowEditModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                              title="Chỉnh sửa"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <div className="relative dropdown-menu-container">
                              <button
                                onClick={() =>
                                  setDropdownOpenSaleId(
                                    dropdownOpenSaleId === sale.id
                                      ? null
                                      : sale.id
                                  )
                                }
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                title="Tùy chọn"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <circle cx="12" cy="5" r="2" />
                                  <circle cx="12" cy="12" r="2" />
                                  <circle cx="12" cy="19" r="2" />
                                </svg>
                              </button>
                              {dropdownOpenSaleId === sale.id && (
                                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
                                  <button
                                    onClick={() => {
                                      onPrintReceipt(sale);
                                      setDropdownOpenSaleId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 rounded-t-lg"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                                      />
                                    </svg>
                                    In lại hóa đơn
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedSale(sale);
                                      setShowDetailModal(true);
                                      setDropdownOpenSaleId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                      />
                                    </svg>
                                    Xem chi tiết
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (onDeleteSale) {
                                        onDeleteSale(sale.id);
                                      }
                                      setDropdownOpenSaleId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded-b-lg"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                    Xóa hóa đơn
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer with pagination */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Hiển thị {filteredSales.length} đơn hàng
            </div>
          </div>
        </div>
      </div>

      {/* Sale Detail Modal */}
      <SaleDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedSale(null);
        }}
        sale={selectedSale}
        onPrint={onPrintReceipt}
      />

      {/* Edit Sale Modal */}
      <EditSaleModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedSale(null);
        }}
        sale={selectedSale}
        onSave={async (updatedSale) => {
          try {
            const subtotal = updatedSale.items.reduce(
              (sum, item) => sum + item.quantity * item.sellingPrice,
              0
            );
            const newTotal = subtotal - updatedSale.discount;

            const { error: updateError } = await supabase
              .from("sales")
              .update({
                items: updatedSale.items,
                customer: updatedSale.customer,
                paymentmethod: updatedSale.paymentMethod,
                discount: updatedSale.discount,
                total: newTotal,
              })
              .eq("id", updatedSale.id);

            if (updateError) {
              throw updateError;
            }

            await safeAudit(null, {
              action: "sale_update",
              tableName: "sales",
              recordId: updatedSale.id,
              newData: {
                items: updatedSale.items,
                customer: updatedSale.customer,
                paymentMethod: updatedSale.paymentMethod,
                discount: updatedSale.discount,
                total: newTotal,
              },
            });

            showToast.success("Đã cập nhật đơn hàng thành công");
            setShowEditModal(false);
            setSelectedSale(null);
          } catch (error) {
            console.error("Error updating sale:", error);
            showToast.error(
              "Lỗi khi cập nhật đơn hàng: " + (error as any).message
            );
          }
        }}
      />
    </React.Fragment>
  );
};

export default SalesHistoryModal;
