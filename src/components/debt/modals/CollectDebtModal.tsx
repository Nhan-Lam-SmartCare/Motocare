import React, { useState, useMemo } from "react";
import { formatCurrency } from "../../../utils/format";
import { showToast } from "../../../utils/toast";
import type { CustomerDebt } from "../../../types";

interface CollectDebtModalProps {
  customers: any[];
  customerDebts: CustomerDebt[];
  initialDebt?: CustomerDebt | null;
  onClose: () => void;
  onCollect?: (data: {
    customerName: string;
    customerId: string;
    amount: number;
    paymentMethod: "cash" | "bank";
    timestamp: string;
    shouldPrint?: boolean;
  }) => void;
}

export const CollectDebtModal: React.FC<CollectDebtModalProps> = ({
  customers,
  customerDebts,
  initialDebt,
  onClose,
  onCollect,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialDebt?.customerId || ""
  );
  const [paymentAmount, setPaymentAmount] = useState(
    initialDebt ? initialDebt.remainingAmount.toString() : "0"
  );
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("cash");
  const [createTime, setCreateTime] = useState(
    new Date()
      .toLocaleString("sv-SE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      .replace(" ", " ")
  );

  const selectedDebt = useMemo(() => {
    return customerDebts.find((d) => d.customerId === selectedCustomerId);
  }, [selectedCustomerId, customerDebts]);

  const remainingAmount = selectedDebt?.remainingAmount ?? initialDebt?.remainingAmount ?? 0;
  const [isPrintChecked, setIsPrintChecked] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const paymentAmountNum = parseFloat(paymentAmount);

    // Validation
    if (paymentAmountNum <= 0) {
      showToast.error("Số tiền thanh toán phải lớn hơn 0");
      return;
    }

    if (paymentAmountNum > remainingAmount) {
      showToast.error(
        `Số tiền thanh toán không được vượt quá số nợ còn lại (${formatCurrency(
          remainingAmount
        )})`
      );
      return;
    }

    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (customer && onCollect) {
      setIsSubmitting(true);
      try {
        await onCollect({
          customerName: customer.name,
          customerId: customer.id,
          amount: paymentAmountNum,
          paymentMethod,
          timestamp: createTime,
          shouldPrint: isPrintChecked,
        });
      } catch (error) {
        console.error(error);
        setIsSubmitting(false);
      }
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-[100]">
      <div className="bg-white dark:bg-slate-800 rounded-t-xl md:rounded-xl shadow-2xl max-w-lg w-full border-x border-t border-slate-200 dark:border-slate-700 max-h-[85vh] mb-20 md:mb-0 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-none">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Thu nợ khách hàng
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <form id="collect-debt-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                Tìm kiếm và chọn một khách hàng đang nợ
              </label>
              {initialDebt ? (
                <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium flex items-center justify-between">
                  <span>{initialDebt.customerName}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">
                    (Nợ: {formatCurrency(initialDebt.remainingAmount)})
                  </span>
                </div>
              ) : (
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Chọn khách hàng...</option>
                  {customerDebts.map((debt) => (
                    <option key={debt.customerId} value={debt.customerId}>
                      {debt.customerName} - {formatCurrency(debt.remainingAmount)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Payment Amount */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">
                  Nhập số tiền thanh toán
                </label>
                <span className="text-cyan-600 dark:text-cyan-400 text-sm">
                  {formatCurrency(parseFloat(paymentAmount) || 0)}
                </span>
              </div>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Remaining Amount */}
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Còn nợ:</span>
                <span className="text-red-600 dark:text-red-400 font-bold text-base">
                  {formatCurrency(remainingAmount)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPaymentAmount(remainingAmount.toString())}
                className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 text-sm mt-1"
              >
                Điền số còn nợ
              </button>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
                Hình thức thanh toán:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`cursor-pointer border rounded-lg p-3 flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === "cash"
                      ? "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-500 text-cyan-700 dark:text-cyan-400"
                      : "border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={paymentMethod === "cash"}
                    onChange={(e) => setPaymentMethod(e.target.value as "cash")}
                    className="hidden"
                  />
                  <span className="font-medium">Tiền mặt</span>
                </label>
                <label
                  className={`cursor-pointer border rounded-lg p-3 flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === "bank"
                      ? "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-500 text-cyan-700 dark:text-cyan-400"
                      : "border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank"
                    checked={paymentMethod === "bank"}
                    onChange={(e) => setPaymentMethod(e.target.value as "bank")}
                    className="hidden"
                  />
                  <span className="font-medium">Chuyển khoản</span>
                </label>
              </div>
            </div>

            {/* Create Time */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="print-receipt-customer"
                  checked={isPrintChecked}
                  onChange={(e) => setIsPrintChecked(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-350 text-cyan-600 focus:ring-cyan-500"
                />
                <label
                  htmlFor="print-receipt-customer"
                  className="text-sm font-medium text-slate-800 dark:text-slate-200 select-none cursor-pointer"
                >
                  In phiếu thu ngay sau khi tạo
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                Thời gian tạo phiếu thu
              </label>
              <input
                type="text"
                value={createTime}
                onChange={(e) => setCreateTime(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-3 justify-end flex-none rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium">
            Đóng
          </button>
          <button
            type="submit"
            form="collect-debt-form"
            disabled={!selectedCustomerId || parseFloat(paymentAmount) <= 0 || isSubmitting}
            className="flex-1 md:flex-none px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Đang xử lý..." : "Tạo phiếu thu"}
          </button>
        </div>
      </div>
    </div>
  );
};
