import React, { useState } from "react";
import {
  Plus,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Trash2,
  Eye,
} from "lucide-react";
import {
  usePurchaseOrders,
  useDeletePurchaseOrder,
} from "../../hooks/usePurchaseOrders";
import { useAppContext } from "../../contexts/AppContext";
import { formatCurrency, formatDate } from "../../utils/format";
import { useConfirm } from "../../hooks/useConfirm";
import ConfirmModal from "../common/ConfirmModal";
import { showToast } from "../../utils/toast";
import type { PurchaseOrder } from "../../types";

interface PurchaseOrdersListProps {
  onCreateNew: () => void;
  onViewDetail: (po: PurchaseOrder) => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  draft: {
    label: "Nháp",
    icon: <FileText className="w-4 h-4" />,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800",
  },
  ordered: {
    label: "Đã đặt",
    icon: <Clock className="w-4 h-4" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
  },
  received: {
    label: "Đã nhận",
    icon: <CheckCircle className="w-4 h-4" />,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/50",
  },
  cancelled: {
    label: "Đã hủy",
    icon: <XCircle className="w-4 h-4" />,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/50",
  },
};

export const PurchaseOrdersList: React.FC<PurchaseOrdersListProps> = ({
  onCreateNew,
  onViewDetail,
}) => {
  const { currentBranchId } = useAppContext();
  const branchId = currentBranchId || "";
  const { data: purchaseOrders = [], isLoading } = usePurchaseOrders(branchId);
  const deletePOMutation = useDeletePurchaseOrder();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredOrders = purchaseOrders.filter(
    (po) => statusFilter === "all" || po.status === statusFilter
  );

  const handleDelete = async (po: PurchaseOrder) => {
    const confirmed = await confirm({
      title: "Xóa đơn đặt hàng",
      message: `Bạn có chắc muốn xóa đơn ${po.po_number}?`,
      confirmText: "Xóa",
      cancelText: "Hủy",
    });

    if (confirmed) {
      try {
        await deletePOMutation.mutateAsync(po.id);
        showToast.success("Đã xóa đơn đặt hàng");
      } catch (error) {
        console.error("Error deleting PO:", error);
        showToast.error("Lỗi khi xóa đơn đặt hàng");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Đơn đặt hàng
          </h2>
        </div>
        <button
          onClick={() => {
            console.log("PurchaseOrdersList: Tạo đơn mới button clicked");
            onCreateNew();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tạo đơn mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 rounded-lg border text-sm whitespace-nowrap transition-all ${
            statusFilter === "all"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-300"
          }`}
        >
          Tất cả ({purchaseOrders.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const count = purchaseOrders.filter(
            (po) => po.status === status
          ).length;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm whitespace-nowrap transition-all ${
                statusFilter === status
                  ? `${config.bgColor} ${config.color} border-current`
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              {config.icon}
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">
            {statusFilter === "all"
              ? "Chưa có đơn đặt hàng nào"
              : `Không có đơn ${STATUS_CONFIG[
                  statusFilter
                ]?.label.toLowerCase()}`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((po) => {
            const statusConfig =
              STATUS_CONFIG[po.status] || STATUS_CONFIG.draft;
            return (
              <div
                key={po.id}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer"
                onClick={() => onViewDetail(po)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* PO Number & Status */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {po.po_number}
                      </span>
                      <span
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                      >
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Supplier */}
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                      Nhà cung cấp:{" "}
                      <span className="font-medium">
                        {po.supplier?.name || "—"}
                      </span>
                    </div>

                    {/* Item count */}
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                      Số mặt hàng:{" "}
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {po.items?.length || 0} sản phẩm
                      </span>
                    </div>

                    {/* Created by */}
                    {po.created_by && (
                      <div className="text-xs text-slate-500 dark:text-slate-500 mb-1">
                        Người tạo:{" "}
                        <span className="font-medium">{po.created_by}</span>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
                      {po.order_date && (
                        <span>Ngày đặt: {formatDate(po.order_date)}</span>
                      )}
                      {po.expected_date && (
                        <span>Dự kiến: {formatDate(po.expected_date)}</span>
                      )}
                      {po.received_date && (
                        <span className="text-green-600 dark:text-green-400">
                          Đã nhận: {formatDate(po.received_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount & Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(po.final_amount || 0)}
                      </div>
                      {po.discount_amount > 0 && (
                        <div className="text-xs text-slate-500 dark:text-slate-500 line-through">
                          {formatCurrency(po.total_amount || 0)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetail(po);
                        }}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </button>
                      {po.status === "draft" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(po);
                          }}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {po.notes && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-500">
                    {po.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmColor={confirmState.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
};
