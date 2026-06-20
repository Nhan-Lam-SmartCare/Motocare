import React from "react";
import {
  X,
  User,
  PhoneCall,
  Bike,
  TrendingUp,
  FileText,
  Package,
  Wrench,
  MessageSquare,
  CheckCircle,
  Clock,
  Edit2,
} from "lucide-react";
import { formatCurrency, formatWorkOrderId } from "../../../../utils/format";
import { formatKm } from "../../../../utils/maintenanceReminder";
import type { WorkOrder } from "../../../../types";
import { WORK_ORDER_STATUS, type WorkOrderStatus } from "../../../../constants";

interface WorkOrderMobileDetailViewProps {
  workOrder: WorkOrder;
  onClose: () => void;
  onSwitchToEdit?: () => void;
  isOwner: boolean;
  viewportHeight?: number;
}

export const WorkOrderMobileDetailView: React.FC<WorkOrderMobileDetailViewProps> = ({
  workOrder,
  onClose,
  onSwitchToEdit,
  isOwner,
  viewportHeight,
}) => {
  const getStatusColor = (s: WorkOrderStatus) => {
    switch (s) {
      case WORK_ORDER_STATUS.RECEIVED:
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case WORK_ORDER_STATUS.IN_PROGRESS:
        return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case WORK_ORDER_STATUS.COMPLETED:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case WORK_ORDER_STATUS.DELIVERED:
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-end md:items-center justify-center">
      {/* Mobile Full Screen */}
      <div className="md:hidden w-full h-full bg-slate-50 dark:bg-[#151521] flex flex-col transition-colors">
        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-[#1e1e2d] px-4 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-95 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Chi tiết phiếu
              </h2>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-medium">
                #{formatWorkOrderId(workOrder.id)}
              </div>
            </div>
          </div>
          {onSwitchToEdit && (
            <button
              onClick={onSwitchToEdit}
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Sửa phiếu
            </button>
          )}
        </div>

        {/* Scrollable Content - View Only */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#151521]">
          {/* Trạng thái & Thời gian */}
          <div className="p-3 bg-white dark:bg-[#1e1e2d] border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${getStatusColor(
                  workOrder.status as WorkOrderStatus
                )}`}
              >
                {workOrder.status}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(workOrder.creationDate).toLocaleDateString("vi-VN")}{" "}
                {new Date(workOrder.creationDate).toLocaleTimeString(
                  "vi-VN",
                  { hour: "2-digit", minute: "2-digit" }
                )}
              </span>
            </div>
            {workOrder.technicianName && (
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                KTV:{" "}
                <span className="font-medium text-slate-900 dark:text-white">
                  {workOrder.technicianName}
                </span>
              </div>
            )}
          </div>

          {/* Thông tin khách hàng */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              KHÁCH HÀNG
            </h3>
            <div className="bg-white dark:bg-[#1e1e2d] rounded-xl p-3 space-y-2 border border-slate-200 dark:border-transparent">
              <div className="flex items-center justify-between">
                <span className="text-slate-900 dark:text-white font-medium">
                  {workOrder.customerName || "—"}
                </span>
                {workOrder.customerPhone && (
                  <a
                    href={`tel:${workOrder.customerPhone}`}
                    className="text-blue-600 dark:text-blue-400 text-sm flex items-center gap-1.5"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    {workOrder.customerPhone}
                  </a>
                )}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5 text-slate-400" />
                {workOrder.vehicleModel || "—"} •{" "}
                <span className="text-yellow-600 dark:text-yellow-400 font-mono font-semibold">
                  {workOrder.licensePlate || "—"}
                </span>
              </div>
              {workOrder.currentKm && (
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Số km hiện tại: {formatKm(workOrder.currentKm)} km
                </div>
              )}
            </div>
          </div>

          {/* Mô tả vấn đề */}
          {workOrder.issueDescription && (
            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                MÔ TẢ VẤN ĐỀ
              </h3>
              <div className="bg-white dark:bg-[#1e1e2d] rounded-xl p-3 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap border border-slate-200 dark:border-transparent">
                {workOrder.issueDescription}
              </div>
            </div>
          )}

          {workOrder.partsUsed && workOrder.partsUsed.length > 0 && (
            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                PHỤ TÙNG ({workOrder.partsUsed.length})
              </h3>
              <div className="space-y-2">
                {workOrder.partsUsed.map((part, idx) => {
                  const partIsFree = part.isFree || (part as any).isfree;
                  return (
                    <div key={idx} className={`bg-white dark:bg-[#1e1e2d] rounded-xl p-3 border ${partIsFree ? 'border-emerald-500/40 bg-emerald-500/[0.02]' : 'border-slate-200 dark:border-transparent'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="text-sm text-slate-900 dark:text-white font-medium truncate flex items-center gap-1.5">
                            {part.partName || "Phụ tùng"}
                            {partIsFree && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                🎁 Tặng
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            SL: {part.quantity} {part.sku && `• ${part.sku}`}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {partIsFree ? (
                            <>
                              <div className="text-xs text-slate-400 line-through">
                                {formatCurrency(part.price * part.quantity)}
                              </div>
                              <div className="text-sm font-bold text-emerald-500">Tặng</div>
                            </>
                          ) : part.discount && part.discount > 0 ? (
                            <>
                              <div className="text-xs text-slate-400 line-through">
                                {formatCurrency(part.price * part.quantity)}
                              </div>
                              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(part.price * part.quantity - part.discount)}
                              </div>
                              <div className="text-[10px] text-red-500 font-bold">
                                Giảm -{formatCurrency(part.discount)}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(part.price * part.quantity)}
                              </div>
                              <div className="text-xs text-slate-500">
                                {formatCurrency(part.price)}/cái
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      {isOwner && (
                        <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 flex justify-between">
                          <span>
                            Giá vốn: {formatCurrency(part.costPrice || 0)}/cái
                          </span>
                          <span className="text-yellow-600 dark:text-yellow-400">
                            Lãi:{" "}
                            {formatCurrency(
                              (part.price - (part.costPrice || 0)) * part.quantity - (part.discount || 0)
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dịch vụ */}
          {workOrder.additionalServices &&
            workOrder.additionalServices.length > 0 && (
              <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  DỊCH VỤ ({workOrder.additionalServices.length})
                </h3>
                <div className="space-y-2">
                  {workOrder.additionalServices.map((svc, idx) => {
                    const serviceIsFree = svc.isFree || (svc as any).isfree;
                    const serviceTotal = svc.price * (svc.quantity || 1);
                    return (
                    <div
                      key={idx}
                      className="bg-white dark:bg-[#1e1e2d] rounded-xl p-3 flex items-center justify-between border border-slate-200 dark:border-transparent"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="text-sm text-slate-900 dark:text-white font-medium truncate">
                          {svc.description || "Dịch vụ"}
                        </div>
                        {svc.quantity > 1 && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            SL: {svc.quantity}
                          </div>
                        )}
                      </div>
                      {serviceIsFree ? (
                        <div className="flex-shrink-0 text-right">
                          <div className="text-xs text-slate-400 line-through">
                            {formatCurrency(serviceTotal)}
                          </div>
                          <div className="text-sm font-bold text-emerald-500">Tặng</div>
                        </div>
                      ) : (
                        <div className="text-sm font-bold text-purple-600 dark:text-purple-400 flex-shrink-0">
                          {formatCurrency(serviceTotal)}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Ghi chú */}
          {workOrder.notes && (
            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                GHI CHÚ
              </h3>
              <div className="bg-white dark:bg-[#1e1e2d] rounded-xl p-3 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap border border-slate-200 dark:border-transparent">
                {workOrder.notes}
              </div>
            </div>
          )}

          {/* Tổng tiền */}
          <div className="p-3">
            <div className="bg-white dark:bg-[#1e1e2d] rounded-xl p-4 border border-slate-200 dark:border-slate-700/50 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 dark:text-slate-400 text-xs">Tổng phụ tùng</span>
                <span className="text-slate-900 dark:text-white font-medium text-sm">
                  {formatCurrency(
                    workOrder.partsUsed?.reduce(
                      (s, p) => s + (p.isFree || (p as any).isfree ? 0 : p.price * p.quantity - (p.discount || 0)),
                      0
                    ) || 0
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 dark:text-slate-400 text-xs">Tổng dịch vụ</span>
                <span className="text-slate-900 dark:text-white font-medium text-sm">
                  {formatCurrency(
                    workOrder.additionalServices?.reduce(
                      (s, svc) =>
                        s + (svc.isFree || (svc as any).isfree ? 0 : svc.price * (svc.quantity || 1)),
                      0
                    ) || 0
                  )}
                </span>
              </div>
              {(workOrder.discount || 0) > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Giảm giá</span>
                  <span className="text-red-500 dark:text-red-400 font-medium text-sm">
                    -{formatCurrency(workOrder.discount || 0)}
                  </span>
                </div>
              )}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-2 flex items-center justify-between">
                <span className="text-base font-bold text-slate-900 dark:text-white uppercase">
                  TỔNG CỘNG
                </span>
                <span className="text-xl font-black text-blue-600 dark:text-blue-500">
                  {formatCurrency(workOrder.total)}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/30 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Trạng thái thanh toán</span>
                <span
                  className={`font-bold flex items-center gap-1.5 ${
                    workOrder.paymentStatus === "paid"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {workOrder.paymentStatus === "paid" ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      Đã thanh toán
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5" />
                      Chưa thanh toán
                    </>
                  )}
                </span>
              </div>

              {/* Profit display - only for owner */}
              {isOwner && (workOrder as any).profit != null && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/30 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Lợi nhuận</span>
                  <span
                    className={`font-bold ${
                      (workOrder as any).profit >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500 dark:text-red-400"
                    }`}
                  >
                    {formatCurrency((workOrder as any).profit)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Nút chỉnh sửa */}
        {onSwitchToEdit && (
          <div className="flex-shrink-0 p-3 bg-white dark:bg-[#1e1e2d] border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={onSwitchToEdit}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              ✏️ Chỉnh sửa phiếu
            </button>
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block max-w-2xl w-full max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
          <h2 className="text-base font-bold">
            Chi tiết phiếu #{formatWorkOrderId(workOrder.id)}
          </h2>
          <div className="flex items-center gap-2">
            {onSwitchToEdit && (
              <button
                onClick={onSwitchToEdit}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                ✏️ Chỉnh sửa
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
          <div className="text-center text-slate-500 py-8">
            Vui lòng bấm "Chỉnh sửa" để xem và sửa chi tiết phiếu
          </div>
        </div>
      </div>
    </div>
  );
};
