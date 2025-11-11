import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "../../contexts/AuthContext";
import { canDo } from "../../utils/permissions";
import {
  BarChart3,
  Boxes,
  ShoppingCart,
  CreditCard,
  Banknote,
  Star,
  MapPin,
} from "lucide-react";
import { useAppContext } from "../../contexts/AppContext";
import {
  usePartsRepo,
  useUpdatePartRepo,
} from "../../hooks/usePartsRepository";
import {
  useSalesRepo,
  useSalesPagedRepo,
  useCreateSaleAtomicRepo,
  UseSalesPagedParams,
} from "../../hooks/useSalesRepository";
import { useLowStock } from "../../hooks/useLowStock";
import { useCreateInventoryTxRepo } from "../../hooks/useInventoryTransactionsRepository";
import { formatCurrency, formatDate } from "../../utils/format";
import { printElementById } from "../../utils/print";
import { showToast } from "../../utils/toast";
import { PlusIcon, XMarkIcon } from "../Icons";
import type { CartItem, Part, Customer, Sale } from "../../types";
import { useCreateCashTxRepo } from "../../hooks/useCashTransactionsRepository";
import { safeAudit } from "../../lib/repository/auditLogsRepository";
import { useUpdatePaymentSourceBalanceRepo } from "../../hooks/usePaymentSourcesRepository";

// Sales History Modal Component (refactored to accept pagination & search props)
interface SalesHistoryModalProps {
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
}) => {
  const [activeTimeFilter, setActiveTimeFilter] = useState("today");
  const [statusFilter, setStatusFilter] = useState(status);
  const [sortOrder, setSortOrder] = useState("newest");
  const [customStartDate, setCustomStartDate] = useState(
    formatDate(new Date(), true)
  );
  const [customEndDate, setCustomEndDate] = useState(
    formatDate(new Date(), true)
  );

  // Compute and push date range to parent when filter changes
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
      case "yesterday": {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        from = new Date(y.getFullYear(), y.getMonth(), y.getDate());
        to = new Date(
          y.getFullYear(),
          y.getMonth(),
          y.getDate(),
          23,
          59,
          59,
          999
        );
        break;
      }
      case "7days": {
        const s = new Date(today);
        s.setDate(s.getDate() - 6); // include today
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
      case "mtd": {
        const s = new Date(today.getFullYear(), today.getMonth(), 1);
        from = s;
        to = endOfDay;
        break;
      }
      case "qtd": {
        const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
        const s = new Date(today.getFullYear(), quarterStartMonth, 1);
        from = s;
        to = endOfDay;
        break;
      }
      case "custom": {
        const cs = new Date(customStartDate);
        const ce = new Date(customEndDate + "T23:59:59");
        from = cs;
        to = ce;
        break;
      }
    }
    onDateRangeChange(
      from ? from.toISOString() : undefined,
      to ? to.toISOString() : undefined
    );
  }, [activeTimeFilter, customStartDate, customEndDate, onDateRangeChange]);

  // Filter sales based on selected criteria
  const filteredSales = useMemo(() => {
    let filtered = sales.filter((sale) => sale.branchId === currentBranchId);

    // Time filter
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
      59
    );

    switch (activeTimeFilter) {
      case "today":
        filtered = filtered.filter((sale) => {
          const saleDate = new Date(sale.date);
          return saleDate >= startOfDay && saleDate <= endOfDay;
        });
        break;
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const startOfYesterday = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate()
        );
        const endOfYesterday = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate(),
          23,
          59,
          59
        );
        filtered = filtered.filter((sale) => {
          const saleDate = new Date(sale.date);
          return saleDate >= startOfYesterday && saleDate <= endOfYesterday;
        });
        break;
      case "7days":
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filtered = filtered.filter(
          (sale) => new Date(sale.date) >= sevenDaysAgo
        );
        break;
      case "30days":
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filtered = filtered.filter(
          (sale) => new Date(sale.date) >= thirtyDaysAgo
        );
        break;
      case "custom":
        const customStart = new Date(customStartDate);
        const customEnd = new Date(customEndDate + "T23:59:59");
        filtered = filtered.filter((sale) => {
          const saleDate = new Date(sale.date);
          return saleDate >= customStart && saleDate <= customEnd;
        });
        break;
    }

    // Status filter (client-side fallback for now; server already filters)
    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "refunded")
        filtered = filtered.filter((s) => (s as any).refunded === true);
      else if (statusFilter === "completed")
        filtered = filtered.filter((s) => !(s as any).refunded);
      else if (statusFilter === "cancelled")
        filtered = filtered.filter((s) => (s as any).refunded === true); // alias
    }
    // Payment method filter (client-side fallback)
    if (paymentMethodFilter && paymentMethodFilter !== "all") {
      filtered = filtered.filter(
        (s) => s.paymentMethod === paymentMethodFilter
      );
    }
    // Search filter
    if (search) {
      filtered = filtered.filter(
        (sale) =>
          sale.id.toLowerCase().includes(search.toLowerCase()) ||
          sale.customer.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortOrder) {
        case "newest":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "oldest":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    sales,
    currentBranchId,
    activeTimeFilter,
    search,
    statusFilter,
    sortOrder,
    customStartDate,
    customEndDate,
  ]);

  // Calculate statistics
  const stats = useMemo(() => {
    const revenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const profit = filteredSales.reduce(
      (sum, sale) => sum + (sale.total - sale.discount),
      0
    );
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const orderCount = filteredSales.length;

    return { revenue, profit, profitMargin, orderCount };
  }, [filteredSales]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Lịch sử hóa đơn
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          {/* Time Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: "today", label: "Hôm nay" },
              { key: "yesterday", label: "Hôm qua" },
              { key: "7days", label: "7 ngày" },
              { key: "30days", label: "30 ngày" },
              { key: "mtd", label: "Tháng này" },
              { key: "qtd", label: "Quý này" },
              { key: "custom", label: "Tùy chỉnh" },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveTimeFilter(filter.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTimeFilter === filter.key
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {activeTimeFilter === "custom" && (
            <div className="flex items-center gap-4 mb-4">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
              <span className="text-slate-500">đến</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          {/* Search and Sort */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64 relative">
              <input
                type="text"
                placeholder="Tìm mã hóa đơn hoặc tên khách hàng"
                value={search}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                }}
                className="w-full pr-10 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
              {search?.length ? (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Xoá tìm kiếm"
                  title="Xoá tìm kiếm"
                >
                  ×
                </button>
              ) : null}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                const v = e.target.value as any;
                setStatusFilter(v);
                onStatusChange?.(v);
              }}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="all">Tất cả</option>
              <option value="completed">Hoàn thành</option>
              <option value="refunded">Hoàn tiền</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <select
              value={paymentMethodFilter}
              onChange={(e) =>
                onPaymentMethodFilterChange?.(e.target.value as any)
              }
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="all">Mọi PTTT</option>
              <option value="cash">Tiền mặt</option>
              <option value="bank">Chuyển khoản</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
            </select>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="p-6 grid grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="text-blue-600 dark:text-blue-400 text-sm font-medium">
              Doanh thu
            </div>
            <div className="text-blue-900 dark:text-blue-100 text-2xl font-bold">
              {formatCurrency(stats.revenue)}
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="text-green-600 dark:text-green-400 text-sm font-medium">
              Lợi nhuận gộp
            </div>
            <div className="text-green-900 dark:text-green-100 text-2xl font-bold">
              {formatCurrency(stats.profit)}
            </div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <div className="text-orange-600 dark:text-orange-400 text-sm font-medium">
              GM%
            </div>
            <div className="text-orange-900 dark:text-orange-100 text-2xl font-bold">
              {stats.profitMargin.toFixed(1)}%
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="text-purple-600 dark:text-purple-400 text-sm font-medium">
              Số hóa đơn
            </div>
            <div className="text-purple-900 dark:text-purple-100 text-2xl font-bold">
              {stats.orderCount}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {filteredSales.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              Không có hóa đơn nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    MÃ
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    THỜI GIAN
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    TỔNG
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    SL HÀNG
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    KHÁCH HÀNG
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    THANH TOÁN
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    THAO TÁC
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {sale.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-slate-100">
                        {formatDate(new Date(sale.date), false)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(sale.date).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(sale.total)}
                      </div>
                      {sale.discount > 0 && (
                        <div className="text-xs text-slate-500">
                          Giảm: {formatCurrency(sale.discount)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-slate-100">
                        {sale.items.reduce(
                          (sum, item) => sum + item.quantity,
                          0
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900 dark:text-slate-100">
                        {sale.customer.name}
                      </div>
                      {sale.customer.phone && (
                        <div className="text-xs text-slate-500">
                          {sale.customer.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sale.paymentMethod === "cash"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                        }`}
                      >
                        {sale.paymentMethod === "cash"
                          ? "Tiền mặt"
                          : "Chuyển khoản"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onPrintReceipt(sale)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="In lại hóa đơn"
                        >
                          <svg
                            className="w-5 h-5"
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
                        </button>
                        <button
                          onClick={() => onEditSale(sale)}
                          className="p-2 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                          title="Chỉnh sửa hóa đơn"
                        >
                          <svg
                            className="w-5 h-5"
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
                        <button
                          onClick={() => onDeleteSale(sale.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Xóa hóa đơn"
                        >
                          <svg
                            className="w-5 h-5"
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
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-700 disabled:opacity-40"
              disabled={keysetMode ? true : page <= 1}
              onClick={onPrevPage}
            >
              ← Trước
            </button>
            {!keysetMode && (
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Trang {page} / {totalPages}
              </span>
            )}
            <button
              className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-700 disabled:opacity-40"
              disabled={!hasMore}
              onClick={onNextPage}
            >
              {keysetMode ? "Tải thêm" : "Sau →"}
            </button>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
              }}
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-sm"
            >
              {[10, 20, 50].map((sz) => (
                <option key={sz} value={sz}>
                  {sz}/trang
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            {!keysetMode && <span>Tổng: {total} hóa đơn</span>}
            {keysetMode && (
              <span>
                Keyset mode · pageSize {pageSize}
                {hasMore ? " (còn nữa)" : " (hết)"}
              </span>
            )}
            <label className="inline-flex items-center gap-1 text-xs font-medium">
              <input
                type="checkbox"
                className="accent-indigo-600"
                checked={!!keysetMode}
                onChange={(e) =>
                  onToggleKeyset && onToggleKeyset(e.target.checked)
                }
              />
              Keyset
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

const SalesManager: React.FC = () => {
  const {
    customers,
    upsertCustomer,
    cartItems,
    setCartItems,
    clearCart,
    deleteSale,
    currentBranchId,
    finalizeSale,
    setCashTransactions,
    setPaymentSources,
  } = useAppContext();

  // Repository (read-only step 1)
  const {
    data: repoParts = [],
    isLoading: loadingParts,
    error: partsError,
  } = usePartsRepo();
  // Server-side sales pagination parameters
  const [salesPage, setSalesPage] = useState(1);
  const [salesPageSize, setSalesPageSize] = useState(20);
  const [salesSearchInput, setSalesSearchInput] = useState("");
  const [salesSearch, setSalesSearch] = useState("");
  const [salesFromDate, setSalesFromDate] = useState<string | undefined>();
  const [salesToDate, setSalesToDate] = useState<string | undefined>();
  const [salesStatus, setSalesStatus] = useState<
    "all" | "completed" | "cancelled" | "refunded"
  >("all");
  const [salesPaymentMethod, setSalesPaymentMethod] = useState<
    "all" | "cash" | "bank"
  >("all");
  const [useKeysetMode, setUseKeysetMode] = useState(false);
  const [keysetCursor, setKeysetCursor] = useState<{
    afterDate?: string;
    afterId?: string;
  } | null>(null);
  const salesParams: UseSalesPagedParams = {
    branchId: currentBranchId,
    page: useKeysetMode ? undefined : salesPage,
    pageSize: salesPageSize,
    search: salesSearch || undefined,
    fromDate: salesFromDate,
    toDate: salesToDate,
    mode: useKeysetMode ? "keyset" : "offset",
    afterDate: useKeysetMode ? keysetCursor?.afterDate : undefined,
    afterId: useKeysetMode ? keysetCursor?.afterId : undefined,
    status:
      salesStatus === "all"
        ? undefined
        : salesStatus === "cancelled"
        ? "refunded"
        : salesStatus === "completed"
        ? "completed"
        : salesStatus,
    paymentMethod:
      salesPaymentMethod === "all" ? undefined : salesPaymentMethod,
  };
  const {
    data: pagedSalesData,
    isLoading: loadingSales,
    error: salesError,
  } = useSalesPagedRepo(salesParams);
  const repoSales = pagedSalesData?.data || [];
  const salesMeta = pagedSalesData?.meta || {
    page: 1,
    totalPages: 1,
    total: repoSales.length,
    hasMore: false,
  };
  // Advance keyset cursor when in keyset mode and new page loaded
  useEffect(() => {
    if (useKeysetMode && pagedSalesData?.meta?.mode === "keyset") {
      setKeysetCursor({
        afterDate: (pagedSalesData.meta as any).nextAfterDate,
        afterId: (pagedSalesData.meta as any).nextAfterId,
      });
    }
  }, [useKeysetMode, pagedSalesData]);
  const { mutateAsync: createSaleAtomicAsync } = useCreateSaleAtomicRepo();
  const { mutateAsync: updatePartAsync } = useUpdatePartRepo();
  const { mutateAsync: createInventoryTxAsync } = useCreateInventoryTxRepo();
  const { mutateAsync: createCashTxAsync } = useCreateCashTxRepo();
  const { mutateAsync: updatePaymentSourceBalanceAsync } =
    useUpdatePaymentSourceBalanceRepo();

  // Pagination handlers
  const goPrevPage = useCallback(
    () => setSalesPage((p) => Math.max(1, p - 1)),
    []
  );
  const goNextPage = useCallback(() => setSalesPage((p) => p + 1), []);
  const changePageSize = useCallback((sz: number) => {
    setSalesPageSize(sz);
    setSalesPage(1);
    if (useKeysetMode) setKeysetCursor(null);
  }, []);

  // Debounce search (300ms) áp dụng vào tham số query
  useEffect(() => {
    const h = setTimeout(() => {
      setSalesSearch(salesSearchInput);
      setSalesPage(1);
    }, 300);
    return () => clearTimeout(h);
  }, [salesSearchInput]);

  // States
  const [partSearch, setPartSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"amount" | "percent">(
    "amount"
  ); // VNĐ or %
  const [discountPercent, setDiscountPercent] = useState(0);
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    vehicleModel: "",
    licensePlate: "",
  });
  const [receiptId, setReceiptId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [receiptItems, setReceiptItems] = useState<CartItem[]>([]);
  const [receiptDiscount, setReceiptDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank" | null>(
    null
  );
  const [paymentType, setPaymentType] = useState<
    "full" | "partial" | "note" | null
  >(null);
  const [partialAmount, setPartialAmount] = useState(0);

  // Cart functions
  const addToCart = useCallback(
    (part: Part) => {
      const price = part.retailPrice?.[currentBranchId] ?? 0;
      const stock = part.stock?.[currentBranchId] ?? 0;
      const existing = cartItems.find((item) => item.partId === part.id);

      if (existing) {
        // Validate stock before adding more
        const newQuantity = existing.quantity + 1;
        if (newQuantity > stock) {
          showToast.error(`Không đủ hàng! Tồn kho: ${stock}`);
          return;
        }
        setCartItems((prev) =>
          prev.map((item) =>
            item.partId === part.id ? { ...item, quantity: newQuantity } : item
          )
        );
      } else {
        // Check if stock available
        if (stock < 1) {
          showToast.error("Sản phẩm đã hết hàng!");
          return;
        }
        const newItem: CartItem = {
          partId: part.id,
          partName: part.name,
          sku: part.sku,
          quantity: 1,
          sellingPrice: price,
          stockSnapshot: stock,
          discount: 0,
        };
        setCartItems((prev) => [...prev, newItem]);
      }
    },
    [cartItems, setCartItems, currentBranchId]
  );

  const removeFromCart = useCallback(
    (partId: string) => {
      setCartItems((prev) => prev.filter((item) => item.partId !== partId));
    },
    [setCartItems]
  );

  const updateCartQuantity = useCallback(
    (partId: string, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(partId);
        return;
      }

      // Validate against stock
      const item = cartItems.find((i) => i.partId === partId);
      if (item && quantity > item.stockSnapshot) {
        showToast.error(`Không đủ hàng! Tồn kho: ${item.stockSnapshot}`);
        return;
      }

      setCartItems((prev) =>
        prev.map((item) =>
          item.partId === partId ? { ...item, quantity } : item
        )
      );
    },
    [cartItems, setCartItems, removeFromCart]
  );

  // Calculate totals
  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + item.sellingPrice * item.quantity,
        0
      ),
    [cartItems]
  );

  const total = useMemo(
    () => Math.max(0, subtotal - orderDiscount),
    [subtotal, orderDiscount]
  );

  // Receipt calculations
  const receiptSubtotal = useMemo(
    () =>
      receiptItems.reduce(
        (sum, item) => sum + item.sellingPrice * item.quantity,
        0
      ),
    [receiptItems]
  );

  const receiptTotal = useMemo(
    () => Math.max(0, receiptSubtotal - receiptDiscount),
    [receiptSubtotal, receiptDiscount]
  );

  const receiptTotalQuantity = useMemo(
    () => receiptItems.reduce((sum, item) => sum + item.quantity, 0),
    [receiptItems]
  );

  // Filter parts by search
  const filteredParts = useMemo(() => {
    if (loadingParts || partsError) return [];
    if (!partSearch) return repoParts;
    return repoParts.filter(
      (part) =>
        part.name.toLowerCase().includes(partSearch.toLowerCase()) ||
        part.sku.toLowerCase().includes(partSearch.toLowerCase())
    );
  }, [repoParts, partSearch, loadingParts, partsError]);

  // Low stock monitoring (threshold = 5)
  const { lowStockCount, outOfStockCount } = useLowStock(
    repoParts,
    currentBranchId,
    5
  );

  // One-time toast to notify low stock when opening screen
  const lowStockToastShown = useRef(false);
  useEffect(() => {
    if (
      !lowStockToastShown.current &&
      (lowStockCount > 0 || outOfStockCount > 0)
    ) {
      const msgParts = [] as string[];
      if (outOfStockCount > 0) msgParts.push(`Hết hàng: ${outOfStockCount}`);
      if (lowStockCount > 0) msgParts.push(`Tồn thấp: ${lowStockCount}`);
      showToast.info(msgParts.join(" · "));
      lowStockToastShown.current = true;
    }
  }, [lowStockCount, outOfStockCount]);

  // Filter customers by search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 10);
    return customers
      .filter(
        (customer) =>
          customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          customer.phone?.includes(customerSearch) ||
          false
      )
      .slice(0, 10);
  }, [customers, customerSearch]);

  // Handle add new customer
  const handleSaveNewCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) {
      alert("Vui lòng nhập tên và số điện thoại");
      return;
    }

    // Check if customer already exists
    const existingCustomer = customers.find(
      (c) => c.phone === newCustomer.phone
    );
    if (existingCustomer) {
      alert("Số điện thoại này đã tồn tại!");
      return;
    }

    // Create new customer
    const customer = {
      id: `CUST-${Date.now()}`,
      name: newCustomer.name,
      phone: newCustomer.phone,
      vehicleModel: newCustomer.vehicleModel,
      licensePlate: newCustomer.licensePlate,
      status: "active" as const,
      segment: "New" as const,
      loyaltyPoints: 0,
      totalSpent: 0,
      visitCount: 1,
      lastVisit: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    upsertCustomer(customer);

    // Select the new customer
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);

    // Reset form and close modal
    setNewCustomer({
      name: "",
      phone: "",
      vehicleModel: "",
      licensePlate: "",
    });
    setShowAddCustomerModal(false);
  };

  // Handle print receipt
  const handlePrintReceipt = (sale: Sale) => {
    // Set receipt data
    setReceiptId(sale.id);
    setCustomerName(sale.customer.name);
    setCustomerPhone(sale.customer.phone || "");
    setReceiptItems(sale.items);
    setReceiptDiscount(sale.discount || 0);

    // Wait for state update then print
    setTimeout(() => {
      printElementById("last-receipt");
    }, 100);
  };

  // Handle delete sale
  const { profile } = useAuth();
  const handleDeleteSale = (saleId: string) => {
    if (!canDo(profile?.role, "sale.delete")) {
      showToast.error("Bạn không có quyền xóa hóa đơn");
      return;
    }
    if (
      !confirm("Xác nhận xóa hóa đơn này? Hành động này không thể hoàn tác.")
    ) {
      return;
    }
    // Try to capture old sale data for audit (best effort)
    const oldSale = repoSales.find((s) => s.id === saleId) || null;
    deleteSale(saleId);
    showToast.success("Đã xóa hóa đơn thành công!");
    // Best-effort audit log (non-blocking)
    void safeAudit(profile?.id || null, {
      action: "sale.delete",
      tableName: "sales",
      recordId: saleId,
      oldData: oldSale,
      newData: null,
    });
  };

  // Handle edit sale (reopen in cart)
  const handleEditSale = (sale: Sale) => {
    if (
      !confirm("Mở lại hóa đơn này để chỉnh sửa? Giỏ hàng hiện tại sẽ bị xóa.")
    ) {
      return;
    }

    // Clear current cart
    clearCart();

    // Load sale items into cart
    sale.items.forEach((item) => {
      // Find the part to add to cart
      const part = repoParts.find((p) => p.id === item.partId);
      if (part) {
        for (let i = 0; i < item.quantity; i++) {
          addToCart(part);
        }
      }
    });

    // Load customer if exists
    if (sale.customer.id) {
      const customer = customers.find((c) => c.id === sale.customer.id);
      if (customer) {
        setSelectedCustomer(customer);
        setCustomerSearch(customer.name);
      }
    } else {
      setCustomerName(sale.customer.name);
      setCustomerPhone(sale.customer.phone || "");
    }

    // Load discount
    setOrderDiscount(sale.discount || 0);

    // Close history modal
    setShowSalesHistory(false);

    alert("Hóa đơn đã được tải vào giỏ hàng để chỉnh sửa");
  };

  // Handle finalize sale
  const handleFinalize = async () => {
    if (cartItems.length === 0) {
      alert("Vui lòng thêm sản phẩm vào giỏ hàng");
      return;
    }

    if (!paymentMethod) {
      alert("Vui lòng chọn phương thức thanh toán");
      return;
    }

    if (!paymentType) {
      alert("Vui lòng chọn hình thức thanh toán");
      return;
    }

    if (paymentType === "partial" && partialAmount <= 0) {
      alert("Vui lòng nhập số tiền khách trả");
      return;
    }

    try {
      // Kiểm tra tồn kho mới nhất trước khi tạo đơn
      for (const item of cartItems) {
        const part = repoParts.find((p) => p.id === item.partId);
        if (!part) {
          showToast.error(`Không tìm thấy sản phẩm: ${item.partName}`);
          return;
        }
        const stock = part.stock?.[currentBranchId] ?? 0;
        if (item.quantity > stock) {
          showToast.error(`Không đủ hàng cho ${part.name}. Tồn kho: ${stock}`);
          return;
        }
      }
      const saleId = `SALE-${Date.now()}`;
      const lineSubtotal = cartItems.reduce(
        (sum, it) => sum + it.sellingPrice * it.quantity,
        0
      );
      const lineDiscounts = cartItems.reduce(
        (sum, it) => sum + (it.discount || 0),
        0
      );
      const total = Math.max(0, lineSubtotal - lineDiscounts - orderDiscount);
      const customerObj = {
        id: selectedCustomer?.id,
        name: selectedCustomer?.name || customerName || "Khách lẻ",
        phone: selectedCustomer?.phone || customerPhone,
      };

      // Set receipt info for printing BEFORE clearing cart
      setReceiptId(saleId);
      setCustomerName(customerObj.name);
      setCustomerPhone(customerObj.phone || "");
      setReceiptItems([...cartItems]);
      setReceiptDiscount(orderDiscount + lineDiscounts);

      // Create customer if new (has phone nhưng chưa chọn từ danh sách)
      if (!selectedCustomer && customerPhone && customerName) {
        const existingCustomer = customers.find(
          (c) => c.phone === customerPhone
        );
        if (!existingCustomer) {
          upsertCustomer({
            id: `CUST-${Date.now()}`,
            name: customerName,
            phone: customerPhone,
            status: "active",
            segment: "New",
            loyaltyPoints: 0,
            totalSpent: 0,
            visitCount: 1,
            lastVisit: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
        }
      }
      // Gọi RPC atomic đảm bảo tất cả bước (xuất kho, tiền mặt, cập nhật tồn, ghi hóa đơn, audit) thực hiện trong 1 transaction server
      const rpcRes = await createSaleAtomicAsync({
        id: saleId,
        items: cartItems,
        discount: orderDiscount + lineDiscounts,
        customer: customerObj,
        paymentMethod: paymentMethod!,
        userId: profile?.id || "local-user",
        userName: profile?.full_name || profile?.email || "Local User",
        branchId: currentBranchId,
      } as any);
      if ((rpcRes as any)?.error) throw (rpcRes as any).error;

      // Clear form
      setSelectedCustomer(null);
      setCustomerSearch("");
      setOrderDiscount(0);
      setDiscountPercent(0);
      setDiscountType("amount");
      setPaymentMethod(null);
      setPaymentType(null);
      setPartialAmount(0);
      clearCart();

      // Print receipt after state updates
      setTimeout(() => {
        printElementById("last-receipt");
      }, 100);
    } catch (error: any) {
      console.error("Error finalizing sale (atomic):", error);
      showToast.error(error?.message || "Có lỗi khi tạo hóa đơn (atomic)");
    }
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".customer-dropdown-container")) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="flex h-screen">
        {/* Main Content Area - Products Grid */}
        <div className="flex-1 flex flex-col">
          {/* Search Bar */}
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Tìm theo tên sản phẩm hoặc SKU..."
                  value={partSearch}
                  onChange={(e) => setPartSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                  Tồn thấp: {lowStockCount}
                </span>
                <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  Hết hàng: {outOfStockCount}
                </span>
              </div>
              <button
                onClick={() => setShowSalesHistory(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg whitespace-nowrap transition-colors inline-flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Lịch sử bán hàng
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900">
            {filteredParts.length === 0 ? (
              <div className="text-center text-slate-400 mt-20">
                <div className="mb-4 flex items-center justify-center">
                  <Boxes className="w-16 h-16 text-slate-300" />
                </div>
                <div className="text-xl font-medium mb-2">
                  {partSearch
                    ? "Không tìm thấy sản phẩm nào"
                    : "Chưa có sản phẩm"}
                </div>
                <div className="text-sm">
                  {partSearch
                    ? "Hãy thử một từ khóa tìm kiếm khác"
                    : "Vui lòng thêm sản phẩm vào hệ thống"}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {filteredParts.map((part) => {
                  const price = part.retailPrice?.[currentBranchId] ?? 0;
                  const stock = part.stock?.[currentBranchId] ?? 0;
                  const isOutOfStock = stock <= 0;

                  return (
                    <button
                      key={part.id}
                      onClick={() => !isOutOfStock && addToCart(part)}
                      disabled={isOutOfStock}
                      className={`group relative p-4 rounded-xl border transition-all duration-200 ${
                        isOutOfStock
                          ? "bg-primary-bg/50 border-primary-border opacity-50 cursor-not-allowed"
                          : "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 border-blue-200 dark:border-slate-600 hover:shadow-xl hover:scale-105"
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        {/* Product Image with Icon */}
                        <div className="flex items-center justify-center mb-3">
                          <div className="w-20 h-20 bg-orange-100 dark:bg-orange-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Boxes className="w-10 h-10 text-orange-500 dark:text-orange-300" />
                          </div>
                        </div>

                        {/* Product Name */}
                        <div className="text-left mb-2 flex-1">
                          <h3
                            className="font-semibold text-base text-primary-text line-clamp-2 mb-1"
                            title={part.name}
                          >
                            {part.name}
                          </h3>
                          <div className="text-xs text-tertiary-text">
                            SKU: {part.sku}
                          </div>
                        </div>

                        {/* Price and Stock */}
                        <div className="flex justify-between items-end mt-auto">
                          <div className="text-left">
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {formatCurrency(price)}
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 text-xs font-bold rounded-md ${
                                isOutOfStock
                                  ? "bg-red-600 text-white"
                                  : stock <= 5
                                  ? "bg-orange-600 text-white"
                                  : "bg-green-600 text-white"
                              }`}
                            >
                              {isOutOfStock ? "Hết" : stock}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Customer, Cart & Checkout */}
        <div className="w-96 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col">
          {/* Customer Selection */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="customer-dropdown-container">
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                Chọn khách hàng
              </label>
              <div className="relative flex gap-2">
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc số điện thoại..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center transition-colors"
                  title="Thêm khách hàng mới"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerSearch(customer.name);
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-600 border-b border-slate-100 dark:border-slate-600 last:border-b-0"
                      >
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {customer.name}
                        </div>
                        {customer.phone && (
                          <div className="text-sm text-slate-500">
                            {customer.phone}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedCustomer && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    {selectedCustomer.name}
                  </div>
                  {selectedCustomer.phone && (
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      {selectedCustomer.phone}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch("");
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                  >
                    Xóa khách hàng
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Giỏ hàng
              </h3>
              <span className="text-sm text-slate-500">
                ({cartItems.length} sản phẩm)
              </span>
            </div>

            {cartItems.length === 0 ? (
              <div className="text-center text-slate-400 py-12">
                <div className="mb-2 flex items-center justify-center">
                  <ShoppingCart className="w-10 h-10 text-slate-300" />
                </div>
                <div className="text-sm">Giỏ hàng trống</div>
                <div className="text-xs text-slate-400 mt-1">
                  Chọn sản phẩm để thêm vào giỏ
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div
                    key={item.partId}
                    className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-lg"
                  >
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                      <Boxes className="w-6 h-6 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                        {item.partName}
                      </div>
                      <div className="text-xs text-slate-500">
                        SKU: {item.sku}
                      </div>
                      <div className="text-sm text-blue-600 font-semibold">
                        {formatCurrency(item.sellingPrice)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateCartQuantity(
                            item.partId,
                            Math.max(1, item.quantity - 1)
                          )
                        }
                        className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-600 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium text-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateCartQuantity(item.partId, item.quantity + 1)
                        }
                        className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-600 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromCart(item.partId)}
                        className="w-8 h-8 flex items-center justify-center bg-red-100 dark:bg-red-900/20 rounded-full text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout Section */}
          {cartItems.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              {/* Summary */}
              <div className="p-4 space-y-2">
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>Tổng tiền hàng</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      Giảm giá:
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={
                          discountType === "amount"
                            ? orderDiscount
                            : discountPercent
                        }
                        onChange={(e) => {
                          const value = Number(e.target.value) || 0;
                          if (discountType === "amount") {
                            setOrderDiscount(Math.min(value, subtotal));
                          } else {
                            const percent = Math.min(value, 100);
                            setDiscountPercent(percent);
                            setOrderDiscount(
                              Math.round((subtotal * percent) / 100)
                            );
                          }
                        }}
                        className="w-20 px-2 py-1 text-right text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        placeholder="0"
                        min="0"
                        max={discountType === "amount" ? subtotal : 100}
                      />
                      <select
                        value={discountType}
                        onChange={(e) => {
                          const newType = e.target.value as
                            | "amount"
                            | "percent";
                          setDiscountType(newType);
                          setOrderDiscount(0);
                          setDiscountPercent(0);
                        }}
                        className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                      >
                        <option value="amount">₫</option>
                        <option value="percent">%</option>
                      </select>
                    </div>
                  </div>

                  {/* Quick percent buttons */}
                  {discountType === "percent" && (
                    <div className="flex gap-1 justify-end">
                      {[5, 10, 15, 20].map((percent) => (
                        <button
                          key={percent}
                          onClick={() => {
                            setDiscountPercent(percent);
                            setOrderDiscount(
                              Math.round((subtotal * percent) / 100)
                            );
                          }}
                          className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 rounded transition-colors"
                        >
                          {percent}%
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Show amount if percent mode */}
                  {discountType === "percent" && discountPercent > 0 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 text-right">
                      = {formatCurrency(orderDiscount)}
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Khách phải trả
                  </span>
                  <span className="font-bold text-xl text-slate-900 dark:text-slate-100">
                    {formatCurrency(Math.max(0, total - orderDiscount))} đ
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="px-4 pb-3">
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Phương thức thanh toán <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all ${
                      paymentMethod === "cash"
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span className="font-medium text-sm">Tiền mặt</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("bank")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all ${
                      paymentMethod === "bank"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                        : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span className="font-medium text-sm">Chuyển khoản</span>
                  </button>
                </div>
              </div>

              {/* Payment Type */}
              {paymentMethod && (
                <div className="px-4 pb-3">
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Hình thức
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setPaymentType("full");
                        setPartialAmount(0);
                      }}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        paymentType === "full"
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-semibold"
                          : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                      }`}
                    >
                      Thanh toán đủ
                    </button>
                    <button
                      onClick={() => setPaymentType("partial")}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        paymentType === "partial"
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-semibold"
                          : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                      }`}
                    >
                      Thanh toán 1 phần
                    </button>
                    <button
                      onClick={() => {
                        setPaymentType("note");
                        setPartialAmount(0);
                      }}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        paymentType === "note"
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-semibold"
                          : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                      }`}
                    >
                      Ghi nợ
                    </button>
                  </div>
                </div>
              )}

              {/* Partial Payment Amount */}
              {paymentType === "partial" && (
                <div className="px-4 pb-3">
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Số tiền khách trả
                  </label>
                  <input
                    type="number"
                    value={partialAmount}
                    onChange={(e) =>
                      setPartialAmount(Number(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    placeholder="0"
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    Còn lại:{" "}
                    {formatCurrency(
                      Math.max(0, total - orderDiscount - partialAmount)
                    )}{" "}
                    đ
                  </div>
                </div>
              )}

              {/* Checkboxes */}
              <div className="px-4 pb-3 space-y-2">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Thời gian bán hàng
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="salesTime"
                    defaultChecked
                    className="w-4 h-4 text-pink-600 focus:ring-pink-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Thời gian hiện tại
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="salesTime"
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Tùy chỉnh
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Ghi chú riêng cho đơn hàng
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Đóng thời in hoá đơn
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="p-4 pt-0 flex gap-3">
                <button
                  onClick={clearCart}
                  className="flex-1 px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
                >
                  LƯU NHẬP
                </button>
                <button
                  onClick={handleFinalize}
                  disabled={!paymentMethod || !paymentType}
                  className={`flex-1 px-4 py-3 font-bold rounded-lg transition-all ${
                    paymentMethod && paymentType
                      ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl"
                      : "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-500 cursor-not-allowed"
                  }`}
                >
                  XUẤT BÁN
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sales History Modal */}
      <SalesHistoryModal
        isOpen={showSalesHistory}
        onClose={() => setShowSalesHistory(false)}
        sales={repoSales}
        currentBranchId={currentBranchId}
        onPrintReceipt={handlePrintReceipt}
        onEditSale={handleEditSale}
        onDeleteSale={handleDeleteSale}
        page={salesMeta.page}
        totalPages={salesMeta.totalPages}
        total={salesMeta.total}
        hasMore={salesMeta.hasMore}
        pageSize={salesPageSize}
        onPrevPage={goPrevPage}
        onNextPage={() => {
          if (useKeysetMode) {
            const nextAfterDate = (pagedSalesData?.meta as any)?.nextAfterDate;
            const nextAfterId = (pagedSalesData?.meta as any)?.nextAfterId;
            if (nextAfterDate || nextAfterId) {
              setKeysetCursor({
                afterDate: nextAfterDate,
                afterId: nextAfterId,
              });
            }
          } else {
            goNextPage();
          }
        }}
        onPageSizeChange={changePageSize}
        search={salesSearchInput}
        onSearchChange={(s) => {
          setSalesSearchInput(s);
          if (!s) {
            // Khi xoá nhanh chuỗi tìm kiếm, reset ngay về trang 1 để UX tốt hơn
            setSalesPage(1);
          }
        }}
        fromDate={salesFromDate}
        toDate={salesToDate}
        onDateRangeChange={(from?: string, to?: string) => {
          setSalesFromDate(from);
          setSalesToDate(to);
          setSalesPage(1);
          if (useKeysetMode) setKeysetCursor(null);
        }}
        status={salesStatus}
        onStatusChange={(s) => {
          setSalesStatus(s);
          setSalesPage(1);
          if (useKeysetMode) setKeysetCursor(null);
        }}
        paymentMethodFilter={salesPaymentMethod}
        onPaymentMethodFilterChange={(m) => {
          setSalesPaymentMethod(m);
          setSalesPage(1);
          if (useKeysetMode) setKeysetCursor(null);
        }}
        keysetMode={useKeysetMode}
        onToggleKeyset={(checked) => {
          setUseKeysetMode(checked);
          setSalesPage(1);
          setKeysetCursor(null);
        }}
      />

      {/* Receipt Print Section (Hidden) - A5 Format */}
      {receiptId && (
        <div id="last-receipt" className="hidden print:block">
          <div
            style={{
              width: "148mm",
              minHeight: "210mm",
              margin: "0 auto",
              padding: "15mm",
              fontFamily: "Arial, sans-serif",
              fontSize: "12px",
              backgroundColor: "white",
              color: "#000",
              boxSizing: "border-box",
            }}
          >
            {/* Header with Logo */}
            <div
              style={{
                textAlign: "center",
                marginBottom: "20px",
                borderBottom: "2px solid #333",
                paddingBottom: "15px",
              }}
            >
              <img
                src="https://raw.githubusercontent.com/Nhan-Lam-SmartCare/Motocare/main/public/logo.png"
                alt="Nhận-Lâm SmartCare"
                style={{
                  width: "120px",
                  height: "120px",
                  margin: "0 auto 10px",
                  display: "block",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <h1
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  margin: "0 0 8px 0",
                  color: "#c92a2a",
                }}
              >
                Nhận-Lâm SmartCare
              </h1>
              <div style={{ fontSize: "11px", lineHeight: "1.6" }}>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  <span>
                    Địa chỉ: 4p Phú Lợi B, Phú Thuận B, Hồng Ngự, Đồng Tháp
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 6.75c0 8.284 6.716 15 15 15 .828 0 1.5-.672 1.5-1.5v-2.25a1.5 1.5 0 00-1.5-1.5h-1.158a1.5 1.5 0 00-1.092.468l-.936.996a1.5 1.5 0 01-1.392.444 12.035 12.035 0 01-7.29-7.29 1.5 1.5 0 01.444-1.392l.996-.936a1.5 1.5 0 00.468-1.092V6.75A1.5 1.5 0 006.75 5.25H4.5c-.828 0-1.5.672-1.5 1.5z"
                    />
                  </svg>
                  <span>Điện thoại: 0947747907</span>
                </div>
              </div>
            </div>

            {/* Bank Info Box */}
            <div
              style={{
                backgroundColor: "#f8f9fa",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                padding: "10px 12px",
                marginBottom: "20px",
                fontSize: "11px",
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
                💳 Thông tin chuyển khoản:
              </div>
              <div style={{ lineHeight: "1.6" }}>
                <div>
                  • Ngân hàng: <strong>NH Liên Việt (LPBank)</strong>
                </div>
                <div>
                  • Số tài khoản: <strong>LAMVOT</strong>
                </div>
                <div>
                  • Chủ tài khoản: <strong>VO THANH LAM</strong>
                </div>
              </div>
            </div>

            {/* Invoice Title */}
            <div
              style={{
                textAlign: "center",
                marginBottom: "15px",
              }}
            >
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  margin: "0 0 8px 0",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                HÓA ĐƠN BÁN HÀNG
              </h2>
              <div style={{ fontSize: "11px", color: "#666" }}>
                Số: <strong style={{ color: "#000" }}>{receiptId}</strong> -
                Ngày:{" "}
                <strong style={{ color: "#000" }}>
                  {formatDate(new Date(), true)}
                </strong>
              </div>
            </div>

            {/* Customer Info */}
            <div
              style={{
                marginBottom: "15px",
                padding: "10px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
              }}
            >
              <div style={{ fontSize: "12px", lineHeight: "1.8" }}>
                <div>
                  <strong>Khách hàng:</strong> {customerName || "Khách lẻ"}
                </div>
                {customerPhone && (
                  <div>
                    <strong>Điện thoại:</strong> {customerPhone}
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "15px",
                fontSize: "11px",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f1f3f5",
                    borderTop: "2px solid #333",
                    borderBottom: "2px solid #333",
                  }}
                >
                  <th
                    style={{
                      textAlign: "center",
                      padding: "8px 4px",
                      width: "8%",
                      fontWeight: "bold",
                    }}
                  >
                    STT
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 6px",
                      width: "37%",
                      fontWeight: "bold",
                    }}
                  >
                    Tên sản phẩm
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "8px 4px",
                      width: "10%",
                      fontWeight: "bold",
                    }}
                  >
                    SL
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 6px",
                      width: "20%",
                      fontWeight: "bold",
                    }}
                  >
                    Đơn giá
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 6px",
                      width: "25%",
                      fontWeight: "bold",
                    }}
                  >
                    Thành tiền
                  </th>
                </tr>
              </thead>
              <tbody>
                {receiptItems.map((item, index) => (
                  <React.Fragment key={item.partId}>
                    <tr style={{ borderBottom: "1px solid #e9ecef" }}>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "10px 4px",
                          verticalAlign: "top",
                        }}
                      >
                        {index + 1}
                      </td>
                      <td style={{ padding: "10px 6px", verticalAlign: "top" }}>
                        <div style={{ fontWeight: "600", marginBottom: "3px" }}>
                          {item.partName}
                        </div>
                        <div style={{ fontSize: "9px", color: "#868e96" }}>
                          SKU: {item.sku}
                        </div>
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "10px 4px",
                          verticalAlign: "top",
                          fontWeight: "600",
                        }}
                      >
                        {item.quantity}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "10px 6px",
                          verticalAlign: "top",
                        }}
                      >
                        {formatCurrency(item.sellingPrice)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "10px 6px",
                          verticalAlign: "top",
                          fontWeight: "600",
                        }}
                      >
                        {formatCurrency(item.sellingPrice * item.quantity)}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {/* Summary Section */}
            <div
              style={{
                borderTop: "2px solid #333",
                paddingTop: "12px",
                marginBottom: "15px",
              }}
            >
              <table style={{ width: "100%", fontSize: "12px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "6px 0", textAlign: "right" }}>
                      Tổng cộng ({receiptTotalQuantity} sản phẩm):
                    </td>
                    <td
                      style={{
                        padding: "6px 0 6px 20px",
                        textAlign: "right",
                        width: "30%",
                        fontWeight: "600",
                      }}
                    >
                      {formatCurrency(receiptSubtotal)}
                    </td>
                  </tr>
                  {receiptDiscount > 0 && (
                    <tr>
                      <td
                        style={{
                          padding: "6px 0",
                          textAlign: "right",
                          color: "#c92a2a",
                        }}
                      >
                        Giảm giá:
                      </td>
                      <td
                        style={{
                          padding: "6px 0 6px 20px",
                          textAlign: "right",
                          fontWeight: "600",
                          color: "#c92a2a",
                        }}
                      >
                        -{formatCurrency(receiptDiscount)}
                      </td>
                    </tr>
                  )}
                  <tr
                    style={{
                      borderTop: "1px solid #dee2e6",
                      fontSize: "14px",
                    }}
                  >
                    <td
                      style={{
                        padding: "10px 0",
                        textAlign: "right",
                        fontWeight: "bold",
                      }}
                    >
                      TỔNG THANH TOÁN:
                    </td>
                    <td
                      style={{
                        padding: "10px 0 10px 20px",
                        textAlign: "right",
                        fontWeight: "bold",
                        fontSize: "16px",
                        color: "#2f9e44",
                      }}
                    >
                      {formatCurrency(receiptTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Method */}
            <div
              style={{
                marginBottom: "20px",
                padding: "10px 12px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                fontSize: "11px",
              }}
            >
              <div style={{ marginBottom: "4px" }}>
                <strong>Hình thức thanh toán:</strong>{" "}
                {paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản"}
              </div>
              <div style={{ fontStyle: "italic", color: "#495057" }}>
                {paymentType === "full"
                  ? "✓ Đã thanh toán đủ"
                  : paymentType === "partial"
                  ? `Thanh toán một phần: ${formatCurrency(partialAmount)}`
                  : "Ghi nợ"}
              </div>
            </div>

            {/* Footer Signatures */}
            <div
              style={{
                marginTop: "30px",
                borderTop: "1px solid #dee2e6",
                paddingTop: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                }}
              >
                <div style={{ textAlign: "center", width: "40%" }}>
                  <div
                    style={{
                      fontWeight: "bold",
                      marginBottom: "50px",
                      fontSize: "12px",
                    }}
                  >
                    Khách hàng
                  </div>
                  <div style={{ fontStyle: "italic", color: "#868e96" }}>
                    (Ký và ghi rõ họ tên)
                  </div>
                </div>
                <div style={{ textAlign: "center", width: "40%" }}>
                  <div
                    style={{
                      fontWeight: "bold",
                      marginBottom: "50px",
                      fontSize: "12px",
                    }}
                  >
                    Người bán hàng
                  </div>
                  <div style={{ fontStyle: "italic", color: "#868e96" }}>
                    (Ký và ghi rõ họ tên)
                  </div>
                </div>
              </div>
            </div>

            {/* Thank You Note */}
            <div
              style={{
                textAlign: "center",
                marginTop: "25px",
                paddingTop: "15px",
                borderTop: "1px dashed #adb5bd",
                fontSize: "11px",
                fontStyle: "italic",
                color: "#495057",
              }}
            >
              <div
                style={{
                  marginBottom: "5px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <span style={{ display: "inline-flex" }}>
                  {/* Decorative star icon replaced by text to keep receipt plain; could inject SVG if needed */}
                  *
                </span>
                Cảm ơn quý khách đã sử dụng dịch vụ
                <span style={{ display: "inline-flex" }}>*</span>
              </div>
              <div>Hẹn gặp lại quý khách!</div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Thêm khách hàng mới
              </h3>
              <button
                onClick={() => {
                  setShowAddCustomerModal(false);
                  setNewCustomer({
                    name: "",
                    phone: "",
                    vehicleModel: "",
                    licensePlate: "",
                  });
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tên khách hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tên khách hàng"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Dòng xe
                </label>
                <input
                  type="text"
                  value={newCustomer.vehicleModel}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      vehicleModel: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Honda SH 2023"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Biển số xe
                </label>
                <input
                  type="text"
                  value={newCustomer.licensePlate}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      licensePlate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: 30A-12345"
                />
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowAddCustomerModal(false);
                  setNewCustomer({
                    name: "",
                    phone: "",
                    vehicleModel: "",
                    licensePlate: "",
                  });
                }}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveNewCustomer}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesManager;
