import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  orderId: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orderId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700/80 overflow-hidden transform transition-all scale-100">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
            Xác nhận xóa phiếu
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 bg-slate-100 dark:bg-slate-700 p-1.5 rounded-lg transition"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-650 dark:text-slate-300 leading-relaxed">
            Bạn có chắc chắn muốn xóa phiếu sửa chữa{" "}
            <strong className="text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
              {orderId}
            </strong>
            ? Hành động này sẽ xóa vĩnh viễn dữ liệu khỏi hệ thống và không thể
            hoàn tác.
          </p>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-4 flex justify-end gap-3 rounded-b-2xl border-t border-slate-200 dark:border-slate-750">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-medium transition"
          >
            Hủy bỏ
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition shadow-md shadow-red-500/15"
          >
            Xác nhận xóa
          </button>
        </div>
      </div>
    </div>
  );
};
