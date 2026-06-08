import React, { useState } from "react";
import { formatCurrency } from "../../../utils/format";
import { showToast } from "../../../utils/toast";
import type { CustomerDebt, SupplierDebt } from "../../../types";

interface BulkPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDebts: (CustomerDebt | SupplierDebt)[];
  totalAmount: number;
  debtType: "customer" | "supplier";
  onConfirm: (paymentMethod: "cash" | "bank", paymentTime: string, shouldPrint: boolean) => void;
}

export const BulkPaymentModal: React.FC<BulkPaymentModalProps> = ({
  isOpen,
  onClose,
  selectedDebts,
  totalAmount,
  debtType,
  onConfirm,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank" | null>(null);
  const [paymentTime, setPaymentTime] = useState(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  });
  const [isPrintChecked, setIsPrintChecked] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentMethod) {
      showToast.warning("Vui lòng chọn hình thức thanh toán");
      return;
    }

    // Convert paymentTime to ISO string for storage
    const [datePart, timePart] = paymentTime.split(" ");
    const [day, month, year] = datePart.split("-");
    const [hours, minutes] = timePart.split(":");
    const isoTimestamp = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    ).toISOString();

    onConfirm(paymentMethod, isoTimestamp, isPrintChecked);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <svg
              className="w-6 h-6 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Trả hết nợ ({debtType === "customer" ? "nhiều đơn hàng" : "nhiều nhà cung cấp"})
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-350">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Selected Debts List */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 text-slate-500 dark:text-slate-400">
              <span className="text-sm font-medium">-</span>
              <span className="text-sm font-medium">Chi tiết</span>
              <span className="text-sm font-medium">Số tiền</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {selectedDebts.map((debt, index) => {
                const isCustomerDebt = "customerName" in debt;
                const name = isCustomerDebt
                  ? (debt as CustomerDebt).customerName
                  : (debt as SupplierDebt).supplierName;
                const detail = isCustomerDebt
                  ? (debt as CustomerDebt).description
                  : (debt as SupplierDebt).description;

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-900 rounded"
                  >
                    <span className="text-sm text-slate-500">{index + 1}</span>
                    <div className="flex-1 mx-3 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {detail}
                      </div>
                      <div className="text-xs text-slate-500">{name}</div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(debt.remainingAmount)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <span className="font-semibold text-slate-900 dark:text-white">TỔNG</span>
              <span className="text-lg font-bold text-red-500">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
              Hình thức thanh toán:
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-slate-900 dark:text-white">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={paymentMethod === "cash"}
                  onChange={(e) => setPaymentMethod(e.target.value as "cash" | "bank")}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span>Tiền mặt</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-900 dark:text-white">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bank"
                  checked={paymentMethod === "bank"}
                  onChange={(e) => setPaymentMethod(e.target.value as "cash" | "bank")}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span>Chuyển khoản</span>
              </label>
            </div>
          </div>

          {/* Payment Time */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
              Thời gian tạo phiếu thu
            </label>
            <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg">
              <input
                type="text"
                value={paymentTime}
                onChange={(e) => setPaymentTime(e.target.value)}
                className="flex-1 bg-transparent text-slate-900 dark:text-white outline-none"
              />
              <svg
                className="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <svg
                className="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          {/* Print Checkbox */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="print-receipt-bulk"
                checked={isPrintChecked}
                onChange={(e) => setIsPrintChecked(e.target.checked)}
                className="w-5 h-5 rounded border-slate-350 text-cyan-600 focus:ring-cyan-500"
              />
              <label
                htmlFor="print-receipt-bulk"
                className="text-sm font-medium text-slate-900 dark:text-white select-none cursor-pointer flex items-center gap-2"
              >
                <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                In phiếu thu ngay sau khi tạo
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
            >
              ĐÓNG
            </button>
            <button
              type="submit"
              disabled={!paymentMethod}
              className="flex-1 px-4 py-3 bg-blue-650 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              TẠO PHIẾU THU
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
