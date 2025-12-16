import React, { useState } from "react";
import {
  X,
  Edit2,
  Save,
  XCircle,
  CheckCircle,
  Package,
  Trash2,
  FileCheck,
} from "lucide-react";
import {
  usePurchaseOrder,
  usePurchaseOrderItems,
  useUpdatePurchaseOrder,
  useUpdatePurchaseOrderItem,
  useConvertPOToReceipt,
} from "../../hooks/usePurchaseOrders";
import { formatCurrency, formatDate } from "../../utils/format";
import { showToast } from "../../utils/toast";
import { useConfirm } from "../../hooks/useConfirm";
import ConfirmModal from "../common/ConfirmModal";
import type {
  PurchaseOrder,
  UpdatePurchaseOrderInput,
  PurchaseOrderStatus,
} from "../../types";

interface PODetailViewProps {
  poId: string;
  onClose: () => void;
  onConverted?: () => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  draft: {
    label: "Nháp",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800",
  },
  ordered: {
    label: "Đã đặt",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
  },
  received: {
    label: "Đã nhận",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/50",
  },
  cancelled: {
    label: "Đã hủy",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/50",
  },
};

export const PODetailView: React.FC<PODetailViewProps> = ({
  poId,
  onClose,
  onConverted,
}) => {
  const { data: po, isLoading: poLoading } = usePurchaseOrder(poId);
  const { data: items = [], isLoading: itemsLoading } =
    usePurchaseOrderItems(poId);
  const updatePOMutation = useUpdatePurchaseOrder();
  const updateItemMutation = useUpdatePurchaseOrderItem();
  const convertMutation = useConvertPOToReceipt();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [receivedQuantities, setReceivedQuantities] = useState<
    Record<string, number>
  >({});

  if (poLoading || itemsLoading || !po) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8">
          <div className="text-slate-500">Đang tải...</div>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[po.status] || STATUS_CONFIG.draft;

  const handleUpdateStatus = async (status: string) => {
    const update: UpdatePurchaseOrderInput = {
      id: po.id,
      status: status as PurchaseOrderStatus,
    };

    if (status === "cancelled") {
      const reason = prompt("Lý do hủy đơn:");
      if (!reason) return;
      update.cancellation_reason = reason;
    }

    try {
      await updatePOMutation.mutateAsync(update);
      showToast.success("Đã cập nhật trạng thái");
      setEditingStatus(false);
    } catch (error) {
      console.error("Error updating status:", error);
      showToast.error("Lỗi khi cập nhật trạng thái");
    }
  };

  const handleMarkAsOrdered = async () => {
    const confirmed = await confirm({
      title: "Xác nhận đặt hàng",
      message: "Xác nhận đơn hàng này đã được đặt với nhà cung cấp?",
      confirmText: "Xác nhận",
      cancelText: "Hủy",
    });

    if (confirmed) {
      await handleUpdateStatus("ordered");
    }
  };

  const handleConvertToReceipt = async () => {
    const confirmed = await confirm({
      title: "Nhập kho",
      message: "Xác nhận đã nhận hàng và tạo phiếu nhập kho?",
      confirmText: "Xác nhận",
      cancelText: "Hủy",
    });

    if (confirmed) {
      try {
        await convertMutation.mutateAsync(po.id);
        showToast.success("Đã tạo phiếu nhập kho");
        onConverted?.();
        onClose();
      } catch (error: any) {
        console.error("Error converting PO:", error);
        showToast.error(error.message || "Lỗi khi tạo phiếu nhập kho");
      }
    }
  };

  const handleCancelPO = async () => {
    const confirmed = await confirm({
      title: "Hủy đơn hàng",
      message: "Bạn có chắc muốn hủy đơn hàng này?",
      confirmText: "Hủy đơn",
      cancelText: "Không",
    });

    if (confirmed) {
      await handleUpdateStatus("cancelled");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {po.po_number}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                {editingStatus ? (
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="draft">Nháp</option>
                    <option value="ordered">Đã đặt</option>
                    <option value="received">Đã nhận</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                ) : (
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>
                )}
                {editingStatus ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleUpdateStatus(newStatus)}
                      className="p-1 hover:bg-green-50 dark:hover:bg-green-950/50 rounded"
                    >
                      <Save className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </button>
                    <button
                      onClick={() => setEditingStatus(false)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                    >
                      <XCircle className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingStatus(true);
                      setNewStatus(po.status);
                    }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  >
                    <Edit2 className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-500 mb-1">
                Nhà cung cấp
              </div>
              <div className="font-medium text-slate-900 dark:text-slate-100">
                {po.supplier?.name || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-500 mb-1">
                Chi nhánh
              </div>
              <div className="font-medium text-slate-900 dark:text-slate-100">
                {po.branch_id}
              </div>
            </div>
            {po.order_date && (
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-500 mb-1">
                  Ngày đặt
                </div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {formatDate(po.order_date)}
                </div>
              </div>
            )}
            {po.expected_date && (
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-500 mb-1">
                  Dự kiến giao
                </div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {formatDate(po.expected_date)}
                </div>
              </div>
            )}
            {po.received_date && (
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-500 mb-1">
                  Ngày nhận
                </div>
                <div className="font-medium text-green-600 dark:text-green-400">
                  {formatDate(po.received_date)}
                </div>
              </div>
            )}
            {po.notes && (
              <div className="md:col-span-2">
                <div className="text-xs text-slate-500 dark:text-slate-500 mb-1">
                  Ghi chú
                </div>
                <div className="text-slate-900 dark:text-slate-100">
                  {po.notes}
                </div>
              </div>
            )}
            {po.cancellation_reason && (
              <div className="md:col-span-2">
                <div className="text-xs text-slate-500 dark:text-slate-500 mb-1">
                  Lý do hủy
                </div>
                <div className="text-red-600 dark:text-red-400">
                  {po.cancellation_reason}
                </div>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Chi tiết sản phẩm
            </h3>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-400">
                      Sản phẩm
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-600 dark:text-slate-400">
                      SL đặt
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-600 dark:text-slate-400">
                      SL nhận
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-600 dark:text-slate-400">
                      Đơn giá
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-600 dark:text-slate-400">
                      Thành tiền
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {items.map((item) => (
                    <tr key={item.id} className="bg-white dark:bg-slate-800">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                          {item.part?.name || "—"}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-500">
                          {item.part?.barcode}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-900 dark:text-slate-100">
                        {item.quantity_ordered}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={
                            item.quantity_received === item.quantity_ordered
                              ? "text-green-600 dark:text-green-400 font-medium"
                              : "text-slate-500 dark:text-slate-500"
                          }
                        >
                          {item.quantity_received}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-900 dark:text-slate-100">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(item.total_price || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100"
                    >
                      Tổng:
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(po.total_amount || 0)}
                    </td>
                  </tr>
                  {po.discount_amount > 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-2 text-right text-slate-600 dark:text-slate-400"
                      >
                        Giảm giá:
                      </td>
                      <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">
                        -{formatCurrency(po.discount_amount)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-2 text-right font-bold text-slate-900 dark:text-slate-100"
                    >
                      Thành tiền:
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-lg text-blue-600 dark:text-blue-400">
                      {formatCurrency(po.final_amount || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            {po.status === "draft" && (
              <button
                onClick={handleCancelPO}
                className="flex items-center gap-1 px-3 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Hủy đơn
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Đóng
            </button>
            {po.status === "draft" && (
              <button
                onClick={handleMarkAsOrdered}
                disabled={updatePOMutation.isPending}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Đã đặt hàng
              </button>
            )}
            {po.status === "ordered" && (
              <button
                onClick={handleConvertToReceipt}
                disabled={convertMutation.isPending}
                className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <FileCheck className="w-4 h-4" />
                {convertMutation.isPending ? "Đang xử lý..." : "Nhập kho"}
              </button>
            )}
          </div>
        </div>
      </div>

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
