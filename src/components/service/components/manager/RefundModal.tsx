import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { WorkOrder } from "../../../../types";
import { formatCurrency, formatWorkOrderId } from "../../../../utils/format";

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  refundingOrder: WorkOrder;
  onConfirm: (reason: string) => void;
  storeSettings: any;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  refundingOrder,
  onConfirm,
  storeSettings,
}) => {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Xác nhận hủy phiếu
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-355 bg-slate-100 dark:bg-slate-700 p-1.5 rounded-lg transition"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <strong>Cảnh báo:</strong> Hành động này sẽ:
            </p>
            <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1 pl-1">
              <li>Hoàn trả tồn kho các phụ tùng đã sử dụng</li>
              <li>
                Hoàn tiền {formatCurrency(refundingOrder.totalPaid || 0)} cho
                khách
              </li>
              <li>Đánh dấu phiếu là "Đã hủy"</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Lý do hủy phiếu <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Vd: Khách hàng không đồng ý chi phí, sửa nhầm xe..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-red-500/50"
              rows={3}
            />
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Phiếu:</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                #
                {formatWorkOrderId(
                  refundingOrder.id,
                  storeSettings?.work_order_prefix
                )
                  .split("-")
                  .pop()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                Khách hàng:
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {refundingOrder.customerName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                Phụ tùng:
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {refundingOrder.partsUsed?.length || 0} món
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-600 pt-2">
              <span className="text-slate-600 dark:text-slate-400">
                Số tiền hoàn:
              </span>
              <span className="font-bold text-red-650 dark:text-red-400">
                {formatCurrency(refundingOrder.totalPaid || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t border-slate-200 dark:border-slate-750">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-medium"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-900 text-white rounded-lg font-medium disabled:cursor-not-allowed"
          >
            Xác nhận hủy phiếu
          </button>
        </div>
      </div>
    </div>
  );
};
