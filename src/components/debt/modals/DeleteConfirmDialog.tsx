import React from "react";
import { formatCurrency } from "../../../utils/format";
import type { CustomerDebt, SupplierDebt } from "../../../types";

interface DeleteConfirmDialogProps {
  debt: CustomerDebt | SupplierDebt;
  activeTab: "customer" | "supplier";
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  debt,
  activeTab: _activeTab,
  onClose,
  onConfirm,
}) => {
  const isCustomerDebt = "customerName" in debt;
  const name = isCustomerDebt
    ? (debt as CustomerDebt).customerName
    : (debt as SupplierDebt).supplierName;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
            <svg
              className="w-6 h-6 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-center text-slate-900 dark:text-white mb-2">
            Xác nhận xóa công nợ
          </h3>

          <p className="text-center text-slate-600 dark:text-slate-400 mb-6 text-sm">
            Bạn có chắc chắn muốn xóa công nợ của <span className="font-semibold">{name}</span>?
            <br />
            <span className="text-red-600 dark:text-red-400 font-medium">
              Số tiền: {formatCurrency(debt.remainingAmount)}
            </span>
            <br />
            <span>Hành động này không thể hoàn tác!</span>
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
            >
              Hủy
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
            >
              Xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
