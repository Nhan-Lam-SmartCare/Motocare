import React, { useState } from "react";
import {
  History,
  Phone,
  X,
  User,
  Package,
  Wrench,
  Clock,
  Bike,
  Calendar,
  CreditCard,
} from "lucide-react";
import { formatDate, formatCurrency, formatAnyId } from "../../../utils/format";
import type { Customer, Sale, WorkOrder } from "../../../types";

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  sales: Sale[];
  workOrders: WorkOrder[];
}

export const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  isOpen,
  onClose,
  customer,
  sales,
  workOrders,
}) => {
  const [activeTab, setActiveTab] = useState<"sales" | "workorders">("sales");

  if (!isOpen || !customer) return null;

  // Filter by customer
  const customerSales = sales.filter(
    (s) =>
      s.customer?.id === customer.id || s.customer?.phone === customer.phone
  );
  const customerWorkOrders = workOrders.filter(
    (wo) => wo.customerPhone === customer.phone
  );

  // Calculate actual total spent from sales and work orders
  const totalSpentFromSales = customerSales.reduce(
    (sum, sale) => sum + (sale.total || 0),
    0
  );
  const totalSpentFromWorkOrders = customerWorkOrders.reduce(
    (sum, wo) => sum + (wo.total || 0),
    0
  );
  const actualTotalSpent = totalSpentFromSales + totalSpentFromWorkOrders;

  // Calculate actual visit count from unique dates
  const allVisitDates = [
    ...customerSales.map((s) => new Date(s.date).toDateString()),
    ...customerWorkOrders.map((wo) =>
      new Date(wo.creationDate || wo.id).toDateString()
    ),
  ];
  const uniqueVisitDates = new Set(allVisitDates);
  const actualVisitCount = uniqueVisitDates.size;

  // Calculate loyalty points: 1 point = 10,000đ
  const actualLoyaltyPoints = Math.floor(actualTotalSpent / 10000);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-0 md:p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 md:rounded-2xl w-full h-full md:h-auto md:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-0 md:border border-slate-200 dark:border-slate-700">
        {/* Header - Desktop */}
        <div className="hidden md:flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-500" />
              Lịch sử: {customer.name}
            </h2>
            <a
              href={`tel:${customer.phone}`}
              className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              {customer.phone}
            </a>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Header - Mobile */}
        <div className="flex md:hidden flex-col bg-[#1e1e2d] border-b border-slate-700/50">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                <User className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">
                  {customer.name}
                </h2>
                <a
                  href={`tel:${customer.phone}`}
                  className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 active:text-blue-400 transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  {customer.phone}
                </a>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 active:scale-90 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Summary - Desktop */}
        <div className="hidden md:grid grid-cols-5 gap-4 p-5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 border-t-2 border-t-blue-500 shadow-sm text-center">
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {customerSales.length}
            </div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
              Hóa đơn
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 border-t-2 border-t-emerald-500 shadow-sm text-center">
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {customerWorkOrders.length}
            </div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
              Phiếu SC
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 border-t-2 border-t-purple-500 shadow-sm text-center">
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {formatCurrency(actualTotalSpent)}
            </div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
              Tổng chi
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 border-t-2 border-t-orange-500 shadow-sm text-center">
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {actualVisitCount}
            </div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
              Lần đến
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 border-t-2 border-t-amber-500 shadow-sm text-center">
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              ⭐ {actualLoyaltyPoints.toLocaleString()}
            </div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
              Điểm TL
            </div>
          </div>
        </div>

        {/* Stats Summary - Mobile */}
        <div className="flex md:hidden overflow-x-auto p-4 bg-[#1e1e2d] gap-3 no-scrollbar border-b border-slate-700/30">
          <div className="flex-shrink-0 bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 min-w-[100px]">
            <div className="text-xs text-slate-400 mb-1">Tổng chi</div>
            <div className="text-sm font-bold text-white">{formatCurrency(actualTotalSpent)}</div>
          </div>
          <div className="flex-shrink-0 bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 min-w-[80px]">
            <div className="text-xs text-slate-400 mb-1">Lần đến</div>
            <div className="text-sm font-bold text-white">{actualVisitCount}</div>
          </div>
          <div className="flex-shrink-0 bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 min-w-[80px]">
            <div className="text-xs text-slate-400 mb-1">Điểm TL</div>
            <div className="text-sm font-bold text-amber-400">⭐ {actualLoyaltyPoints.toLocaleString()}</div>
          </div>
          <div className="flex-shrink-0 bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 min-w-[80px]">
            <div className="text-xs text-slate-400 mb-1">Hóa đơn</div>
            <div className="text-sm font-bold text-blue-400">{customerSales.length}</div>
          </div>
          <div className="flex-shrink-0 bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 min-w-[80px]">
            <div className="text-xs text-slate-400 mb-1">Phiếu SC</div>
            <div className="text-sm font-bold text-emerald-400">{customerWorkOrders.length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 px-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 md:pt-0 pt-2">
          <button
            onClick={() => setActiveTab("sales")}
            className={`pb-3 pt-4 font-bold text-sm transition-all relative ${activeTab === "sales"
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
          >
            🛒 Hóa đơn ({customerSales.length})
            {activeTab === "sales" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("workorders")}
            className={`pb-3 pt-4 font-bold text-sm transition-all relative ${activeTab === "workorders"
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
          >
            🔧 Phiếu sửa chữa ({customerWorkOrders.length})
            {activeTab === "workorders" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/30 dark:bg-slate-900/10 custom-scrollbar">
          {activeTab === "sales" ? (
            <div className="space-y-4">
              {customerSales.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Chưa có hóa đơn nào</p>
                </div>
              ) : (
                customerSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 md:p-5 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border border-blue-100 dark:border-blue-800/50">
                          <CreditCard className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                            {sale.sale_code || sale.id.substring(0, 8)}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {formatDate(sale.date)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                          {formatCurrency(sale.total)}
                        </div>
                        <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-1 ${sale.paymentMethod === "cash"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          }`}>
                          {sale.paymentMethod === "cash" ? "💵 Tiền mặt" : "🏦 Chuyển khoản"}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-3 space-y-2">
                      {sale.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="text-sm text-slate-700 dark:text-slate-300 flex justify-between items-center"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold">
                              {item.quantity}
                            </span>
                            <span className="font-medium truncate max-w-[150px] md:max-w-xs">{item.partName}</span>
                          </div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(item.quantity * item.sellingPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {customerWorkOrders.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wrench className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Chưa có phiếu sửa chữa nào</p>
                </div>
              ) : (
                customerWorkOrders.map((wo) => {
                  const isCompleted =
                    wo.status === "Trả máy" || wo.status === "Đã sửa xong";
                  const isInProgress = wo.status === "Đang sửa";
                  const statusClass = isCompleted
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50"
                    : isInProgress
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/50"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600";

                  return (
                    <div
                      key={wo.id}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 md:p-5 shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/50">
                            <Wrench className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors">
                              {formatAnyId(wo.id)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Bike className="w-3 h-3" />
                              {wo.vehicleModel} • {wo.licensePlate}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                            {formatCurrency(wo.total)}
                          </div>
                          <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border mt-1 ${statusClass}`}>
                            {wo.status}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-start gap-2 text-sm">
                          <div className="mt-0.5 p-1 rounded bg-slate-100 dark:bg-slate-700">
                            <Clock className="w-3 h-3 text-slate-500" />
                          </div>
                          <div className="flex-1">
                            <span className="text-slate-500 dark:text-slate-400">Vấn đề:</span>
                            <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{wo.issueDescription}</p>
                          </div>
                        </div>

                        {wo.partsUsed && wo.partsUsed.length > 0 && (
                          <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-3">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Phụ tùng sử dụng</div>
                            <div className="space-y-2">
                              {wo.partsUsed.map((part: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="text-xs flex justify-between items-center"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500">{part.quantity} x</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{part.partName || part.name}</span>
                                  </div>
                                  <span className="font-bold text-slate-900 dark:text-slate-100">
                                    {formatCurrency(part.price * part.quantity)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer - Desktop */}
        <div className="hidden md:flex p-4 border-t border-slate-200 dark:border-slate-700 justify-end bg-slate-50/50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-slate-200 dark:shadow-none"
          >
            Đóng
          </button>
        </div>

        {/* Footer - Mobile (Sticky) */}
        <div className="flex md:hidden p-4 border-t border-slate-700/30 bg-[#1e1e2d] pb-safe">
          <button
            onClick={onClose}
            className="w-full py-4 bg-slate-800 text-white font-bold rounded-2xl active:scale-[0.98] transition-all border border-slate-700/50"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
