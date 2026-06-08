import React from "react";
import type { WorkOrder } from "../../../../types";
import { formatCurrency } from "../../../../utils/format";

interface MobileSummaryProps {
  formData: Partial<WorkOrder>;
  partsTotal: number;
  servicesTotal: number;
  total: number;
}

export const MobileSummary: React.FC<MobileSummaryProps> = ({
  formData,
  partsTotal,
  servicesTotal,
  total,
}) => {
  return (
    <div className="lg:hidden px-4 py-5 space-y-4 border-t border-slate-200 dark:border-slate-700">
      <div className="bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200/60 dark:border-slate-800 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Tổng kết</h3>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Phí dịch vụ</span>
          <span className="font-medium">{formatCurrency(formData.laborCost || 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Phụ tùng</span>
          <span className="font-medium">{formatCurrency(partsTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Gia công</span>
          <span className="font-medium">{formatCurrency(servicesTotal)}</span>
        </div>
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-900 dark:text-slate-100">Tổng cộng</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MobileActionsProps {
  formData: Partial<WorkOrder>;
  showDepositInput: boolean;
  isSubmitting: boolean;
  handleSave: () => Promise<void>;
  handleSaveOnly: () => Promise<void>;
  onClose: () => void;
}

export const MobileActions: React.FC<MobileActionsProps> = ({
  formData,
  showDepositInput,
  isSubmitting,
  handleSave,
  handleSaveOnly,
  onClose,
}) => {
  return (
    <div className="lg:hidden border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-end gap-2 bg-white dark:bg-slate-800 flex-shrink-0">
      <button
        onClick={onClose}
        className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent rounded-lg text-sm transition-colors"
      >
        Hủy
      </button>
      <button
        onClick={handleSaveOnly}
        disabled={isSubmitting}
        className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] ${
          isSubmitting
            ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700"
            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm"
        }`}
      >
        {isSubmitting ? "Đang lưu..." : "Lưu Phiếu"}
      </button>
      {formData.status !== "Trả máy" && showDepositInput && (
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] ${
            isSubmitting
              ? "bg-blue-400 cursor-not-allowed text-white"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm"
          }`}
        >
          Đặt cọc
        </button>
      )}
      {formData.status === "Trả máy" && (
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] ${
            isSubmitting
              ? "bg-emerald-400 cursor-not-allowed text-white"
              : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm"
          }`}
        >
          Thanh toán
        </button>
      )}
    </div>
  );
};
