import React, { useState, useEffect } from "react";
import {
  Wrench,
  Plus,
  RefreshCw,
  ChevronDown,
  Clock,
  Smartphone,
  PhoneCall,
  Bike,
  Eye,
  Printer,
  MoreVertical,
  Edit2,
  AlertTriangle,
  Settings,
} from "lucide-react";
import { WorkOrder, WorkOrderPart } from "../../../../types";
import {
  formatCurrency,
  formatDate,
  formatWorkOrderId,
  formatShortWorkOrderId,
} from "../../../../utils/format";
import StatusBadge from "../StatusBadge";
import { WorkOrderStatus } from "../StatusBadge";
import { formatMaskedPhone, handleCallCustomer as callCustomer } from "../../utils/service.utils";

interface WorkOrdersTableProps {
  paginatedOrders: WorkOrder[];
  filteredOrders: WorkOrder[];
  showTableSkeleton: boolean;
  showTableError: boolean;
  workOrdersError: any;
  refetchWorkOrders: () => void;
  workOrdersFetching: boolean;
  clearFilters: () => void;
  handleOpenModal: (order?: WorkOrder) => void;
  handlePrintOrder: (order: WorkOrder) => void;
  handleRefundOrder: (order: WorkOrder) => void;
  handleDelete: (order: WorkOrder) => void;
  visibleCount: number;
  hasMoreOrders: boolean;
  handleLoadMore: () => void;
  isOwner: boolean;
  showProfit: boolean;
  storeSettings: any;
}

export const WorkOrdersTable: React.FC<WorkOrdersTableProps> = ({
  paginatedOrders,
  filteredOrders,
  showTableSkeleton,
  showTableError,
  workOrdersError,
  refetchWorkOrders,
  workOrdersFetching,
  clearFilters,
  handleOpenModal,
  handlePrintOrder,
  handleRefundOrder,
  handleDelete,
  visibleCount,
  hasMoreOrders,
  handleLoadMore,
  isOwner,
  showProfit,
  storeSettings,
}) => {
  const [rowActionMenuId, setRowActionMenuId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    right: 0,
  });

  useEffect(() => {
    if (!rowActionMenuId) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".service-row-menu")) {
        setRowActionMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [rowActionMenuId]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      {showTableError && (
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-amber-50/60 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3">
          <div className="text-sm">
            Không thể tải dữ liệu mới. Bạn vẫn đang xem dữ liệu cũ.
          </div>
          <button
            onClick={refetchWorkOrders}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 hover:bg-white dark:hover:bg-slate-700"
          >
            <RefreshCw className="w-4 h-4" /> Thử lại
          </button>
        </div>
      )}

      {showTableSkeleton && (
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-blue-50/50 dark:bg-blue-900/10 text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
          Đang tải danh sách phiếu sửa chữa...
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-700/70">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-100 uppercase tracking-wide">
                Mã phiếu
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-100 uppercase tracking-wide">
                Khách hàng
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-100 uppercase tracking-wide">
                Chi tiết
              </th>
              <th className="hidden lg:table-cell px-4 py-3 text-right text-xs font-bold text-slate-700 dark:text-slate-100 uppercase tracking-wide">
                Thanh toán
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 dark:text-slate-100 uppercase tracking-wide">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody
            className="divide-y divide-slate-200 dark:divide-slate-700/80 bg-white dark:bg-slate-800"
            style={{ borderSpacing: "0 6px" }}
          >
            {showTableSkeleton ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse">
                  <td className="px-4 py-5">
                    <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
                    <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                  </td>
                  <td className="px-4 py-5">
                    <div className="h-5 w-44 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="mt-2 h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                  </td>
                  <td className="px-4 py-5">
                    <div className="h-3 w-56 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="mt-2 h-3 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                  </td>
                  <td className="px-4 py-5">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="mt-2 h-2 w-56 bg-slate-200 dark:bg-slate-700 rounded" />
                  </td>
                  <td className="px-4 py-5 text-right">
                    <div className="inline-flex gap-1.5">
                      <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                      <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                      <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                    </div>
                  </td>
                </tr>
              ))
            ) : showTableError ? (
              <tr>
                <td colSpan={5} className="px-4 py-12">
                  <div className="max-w-xl mx-auto text-center">
                    <div className="text-slate-700 dark:text-slate-200 font-semibold">
                      Không thể tải danh sách phiếu sửa chữa
                    </div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {String(workOrdersError?.message || "Vui lòng thử lại")}
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        onClick={refetchWorkOrders}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium"
                      >
                        <RefreshCw className="w-4 h-4" /> Thử lại
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16">
                  <div className="max-w-xl mx-auto text-center">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200">
                      <Wrench className="w-6 h-6" />
                    </div>
                    <div className="mt-4 text-slate-900 dark:text-slate-100 font-semibold">
                      Không có phiếu sửa chữa nào
                    </div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Thử đổi bộ lọc hoặc tạo phiếu mới.
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" /> Tạo phiếu
                      </button>
                      <button
                        onClick={clearFilters}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <RefreshCw className="w-4 h-4" /> Xóa bộ lọc
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => {
                const parts = order.partsUsed || [];
                const services = order.additionalServices || [];

                const partsCost =
                  parts.reduce((sum: number, p: WorkOrderPart) => sum + (p.isFree ? 0 : p.quantity * p.price - (p.discount || 0)), 0) || 0;

                const servicesTotal =
                  services.reduce(
                    (sum: number, s: any) =>
                      sum + (s.price || 0) * (s.quantity || 1),
                    0
                  ) || 0;

                const laborCost = order.laborCost || 0;
                const totalAmount = order.total || 0;
                const paidAmount = totalAmount - (order.remainingAmount || 0);
                const paymentProgress = totalAmount
                  ? Math.min(
                      100,
                      Math.round((paidAmount / totalAmount) * 100)
                    )
                  : 0;

                const partsCostPrice =
                  parts.reduce(
                    (sum: number, p: WorkOrderPart) => sum + (p.costPrice || 0) * (p.quantity || 1),
                    0
                  ) || 0;
                const servicesCostPrice =
                  services.reduce(
                    (sum: number, s: any) =>
                      sum + (s.costPrice || 0) * (s.quantity || 1),
                    0
                  ) || 0;
                const orderProfit =
                  totalAmount - partsCostPrice - servicesCostPrice;

                const partsSummary = parts
                  .slice(0, 2)
                  .map(
                    (p: WorkOrderPart) =>
                      `${p.partName || ""}${
                        p.quantity > 1 ? ` x${p.quantity}` : ""
                      }`.trim()
                  )
                  .filter(Boolean)
                  .join(", ")
                  .trim();
                const partsSuffix =
                  parts.length > 2 ? ` +${parts.length - 2}` : "";
                const partsTitle = parts
                  .map(
                    (p: WorkOrderPart) =>
                      `${p.partName || ""}${
                        p.quantity > 1 ? ` x${p.quantity}` : ""
                      }`.trim()
                  )
                  .filter(Boolean)
                  .join(", ");

                const servicesSummary = services
                  .slice(0, 2)
                  .map(
                    (s: any) =>
                      `${s.description || ""}${
                        (s.quantity || 1) > 1 ? ` x${s.quantity || 1}` : ""
                      }`.trim()
                  )
                  .filter(Boolean)
                  .join(", ")
                  .trim();
                const servicesSuffix =
                  services.length > 2 ? ` +${services.length - 2}` : "";
                const servicesTitle = services
                  .map(
                    (s: any) =>
                      `${s.description || ""}${
                        (s.quantity || 1) > 1 ? ` x${s.quantity || 1}` : ""
                      }`.trim()
                  )
                  .filter(Boolean)
                  .join(", ");

                return (
                  <tr
                    key={order.id}
                    onClick={() => handleOpenModal(order)}
                    className="group bg-white dark:bg-slate-800/80 hover:bg-blue-50/60 dark:hover:bg-slate-700/60 cursor-pointer transition-all duration-150 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500/30"
                  >
                    {/* Column 1: Mã phiếu + Status */}
                    <td className="px-4 py-6 xl:py-7 align-top">
                      <div className="space-y-3">
                        <StatusBadge status={order.status as WorkOrderStatus} />
                        <div className="flex flex-col gap-1.5">
                          <div
                            className="font-mono text-[13px] font-bold text-slate-800 dark:text-slate-200 cursor-help w-fit bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-600/50"
                            title={formatWorkOrderId(
                              order.id,
                              storeSettings?.work_order_prefix
                            )}
                          >
                            {
                              formatShortWorkOrderId(
                                order.id,
                                storeSettings?.work_order_prefix
                              ).short
                            }
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />{" "}
                            {formatDate(order.creationDate, true)}
                          </div>
                          <div className="text-[11px] text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 font-medium px-2 py-0.5 rounded-full w-fit">
                            {order.technicianName || "Chưa phân công"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Khách hàng */}
                    <td className="px-4 py-6 xl:py-7 align-top">
                      <div className="space-y-2">
                        <div className="font-bold text-sm xl:text-base text-slate-900 dark:text-slate-100 truncate pr-4">
                          {order.customerName}
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-xs text-slate-650 dark:text-slate-300">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0">
                              <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                            <span className="font-mono font-medium">
                              {formatMaskedPhone(order.customerPhone)}
                            </span>
                            {order.customerPhone && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  callCustomer(order.customerPhone || "");
                                }}
                                className="ml-2 inline-flex items-center justify-center w-7 h-7 rounded-full text-blue-500 hover:text-white hover:bg-blue-500 dark:hover:bg-blue-600 transition-colors bg-blue-50 dark:bg-blue-900/20"
                              >
                                <PhoneCall className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-1.5 border border-slate-100 dark:border-slate-700/60 w-fit">
                            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-white dark:bg-slate-700 shrink-0 shadow-sm border border-slate-100 dark:border-slate-600">
                              <Bike className="w-3 h-3 text-slate-500" />
                            </div>
                            <span className="truncate max-w-[120px]">
                              {order.vehicleModel || "N/A"}
                            </span>
                            {order.licensePlate && (
                              <>
                                <span className="w-px h-3 bg-slate-300 dark:bg-slate-600"></span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {order.licensePlate}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {order.issueDescription &&
                          order.issueDescription !== "Không có mô tả" && (
                            <div className="hidden xl:block text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2 mt-1">
                              "{order.issueDescription}"
                            </div>
                          )}
                      </div>
                    </td>

                    {/* Column 3: Chi tiết */}
                    <td className="px-4 py-6 xl:py-7 align-top">
                      <div className="space-y-2 max-w-[220px] xl:max-w-[280px]">
                        {servicesSummary && (
                          <div
                            className="text-xs flex items-start gap-2 group/item"
                            title={
                              servicesTitle
                                ? `Dịch vụ: ${servicesTitle}`
                                : "Dịch vụ"
                            }
                          >
                            <div className="mt-0.5 p-1 rounded-md bg-indigo-50 text-indigo-500 dark:bg-indigo-900/20 dark:text-indigo-400 shrink-0 group-hover/item:bg-indigo-100 transition-colors">
                              <Settings className="w-3 h-3" />
                            </div>
                            <span className="text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed pt-0.5">
                              {servicesSummary}
                              {servicesSuffix && (
                                <span className="text-indigo-500 font-medium ml-1">
                                  {servicesSuffix}
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        {partsSummary && (
                          <div
                            className="text-xs flex items-start gap-2 group/item"
                            title={
                              partsTitle
                                ? `Phụ tùng: ${partsTitle}`
                                : "Phụ tùng"
                            }
                          >
                            <div className="mt-0.5 p-1 rounded-md bg-orange-50 text-orange-500 dark:bg-orange-900/20 dark:text-orange-400 shrink-0 group-hover/item:bg-orange-100 transition-colors">
                              <Wrench className="w-3 h-3" />
                            </div>
                            <span className="text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed pt-0.5">
                              {partsSummary}
                              {partsSuffix && (
                                <span className="text-orange-500 font-medium ml-1">
                                  {partsSuffix}
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        {!partsSummary && !servicesSummary && (
                          <div className="text-[11px] text-slate-400 italic flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                            Chưa có chi tiết
                          </div>
                        )}

                        {/* Payment pill for tablet/mobile */}
                        <div className="lg:hidden mt-3">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-black tracking-wider uppercase border ${
                              order.paymentStatus === "paid"
                                ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
                                : order.paymentStatus === "partial"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-450 border-rose-500/20"
                            }`}
                          >
                            {order.paymentStatus === "paid"
                              ? "Đã Xong"
                              : order.paymentStatus === "partial"
                              ? "Còn Nợ"
                              : "Chưa TT"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Column 4: Thanh toán */}
                    <td className="hidden lg:table-cell px-4 py-6 xl:py-7 align-top">
                      <div className="space-y-3 min-w-[180px]">
                        <div className="flex items-center justify-end gap-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-black tracking-wider uppercase border ${
                              order.paymentStatus === "paid"
                                ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
                                : order.paymentStatus === "partial"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-450 border-rose-500/20"
                            }`}
                          >
                            {order.paymentStatus === "paid"
                              ? "Đã Xong"
                              : order.paymentStatus === "partial"
                              ? "Còn Nợ"
                              : "Chưa TT"}
                          </span>
                          <div className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
                            {formatCurrency(totalAmount)}
                          </div>
                        </div>

                        {totalAmount > 0 && order.paymentStatus !== "paid" && (
                          <div className="space-y-1.5 text-right">
                            <div
                              className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden border border-slate-200/50 dark:border-slate-600/50"
                              title={`Đã thanh toán ${paymentProgress}%`}
                            >
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  paymentProgress > 0
                                    ? "bg-gradient-to-r from-blue-500 to-blue-400"
                                    : "bg-transparent"
                                }`}
                                style={{
                                  width: `${Math.min(paymentProgress, 100)}%`,
                                }}
                              />
                            </div>
                            <div className="flex justify-end gap-2 items-center text-[11px]">
                              <span className="font-medium text-slate-500">
                                Thu:{" "}
                                <strong className="text-slate-700 dark:text-slate-300">
                                  {formatCurrency(Math.max(0, paidAmount))}
                                </strong>
                              </span>
                              {(order.remainingAmount ?? 0) > 0 && (
                                <span className="font-bold text-amber-650 dark:text-amber-500">
                                  Còn: {formatCurrency(order.remainingAmount ?? 0)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {Boolean(
                          (order.depositAmount && order.depositAmount > 0) ||
                            order.paymentStatus === "partial" ||
                            (order.paymentStatus === "paid" &&
                              order.depositAmount &&
                              order.depositAmount > 0)
                        ) && (
                          <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-700/50 text-right">
                            {order.depositAmount && order.depositAmount > 0 && (
                              <div className="flex items-center justify-end gap-2 text-[11px]">
                                <span className="text-slate-500">Đã cọc:</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  {formatCurrency(order.depositAmount)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {isOwner && showProfit && (
                          <div className="flex items-center justify-end gap-2 text-[11px] pt-2 border-t border-dashed border-slate-200 dark:border-slate-700 mt-2 text-right">
                            <span className="text-slate-550">Lợi nhuận:</span>
                            <span
                              className={`font-bold flex items-center gap-1 ${
                                orderProfit > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-505"
                              }`}
                            >
                              {orderProfit > 0 ? "+" : ""}
                              {formatCurrency(orderProfit)}
                              {totalAmount > 0 && (
                                <span className="text-[9px] text-slate-400 ml-0.5">
                                  (
                                  {Math.round(
                                    (orderProfit / totalAmount) * 100
                                  )}
                                  %)
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Column 5: Thao tác */}
                    <td
                      className="px-4 py-6 xl:py-7 align-top overflow-visible"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(order);
                          }}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 hover:scale-110 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintOrder(order);
                          }}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:text-purple-400 dark:hover:bg-purple-900/30 hover:scale-110 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                          title="In phiếu"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* More actions menu */}
                        <div className="relative service-row-menu">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              setDropdownPosition({
                                top: rect.bottom + window.scrollY,
                                right: window.innerWidth - (rect.right + window.scrollX),
                              });
                              setRowActionMenuId(
                                rowActionMenuId === order.id ? null : order.id
                              );
                            }}
                            aria-haspopup="menu"
                            aria-expanded={rowActionMenuId === order.id}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-110 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                            title="Thêm thao tác"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {rowActionMenuId === order.id && (
                            <div
                              className="fixed w-52 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-2xl z-[9999] overflow-hidden"
                              style={{
                                top: dropdownPosition.top,
                                right: dropdownPosition.right,
                              }}
                            >
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    handleOpenModal(order);
                                    setRowActionMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <span>Xem chi tiết</span>
                                </button>
                                <button
                                  onClick={() => {
                                    handlePrintOrder(order);
                                    setRowActionMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                    <Printer className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                  </div>
                                  <span>In phiếu</span>
                                </button>
                                <button
                                  onClick={() => {
                                    callCustomer(order.customerPhone || "");
                                    setRowActionMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <Smartphone className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  </div>
                                  <span>Gọi khách hàng</span>
                                </button>
                                {!order.refunded && (
                                  <>
                                    <div className="my-1 border-t border-slate-200 dark:border-slate-700"></div>
                                    <button
                                      onClick={() => {
                                        handleRefundOrder(order);
                                        setRowActionMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-650 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                      <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                        <AlertTriangle className="w-4 h-4 text-red-600" />
                                      </div>
                                      <span>Hủy / Hoàn tiền</span>
                                    </button>
                                    <div className="my-1 border-t border-slate-200 dark:border-slate-700"></div>
                                    <button
                                      onClick={() => {
                                        handleDelete(order);
                                        setRowActionMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-650 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                      <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                        <AlertTriangle className="w-4 h-4 text-red-650" />
                                      </div>
                                      <span>Xóa phiếu</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!showTableSkeleton && !showTableError && filteredOrders.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Hiển thị {Math.min(visibleCount, filteredOrders.length)} /{" "}
            {filteredOrders.length}
          </div>
          {hasMoreOrders && (
            <button
              onClick={handleLoadMore}
              disabled={workOrdersFetching}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              {workOrdersFetching ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              Xem thêm (còn {filteredOrders.length - visibleCount})
            </button>
          )}
        </div>
      )}

      <div
        id="service-table-scroll-sentinel"
        className="h-1"
        aria-hidden="true"
      />
    </div>
  );
};
