import React from "react";
import type { WorkOrder } from "../../../../types";
import { NumberInput } from "../../../common/NumberInput";
import { formatCurrency } from "../../../../utils/format";

interface SummarySidebarProps {
  formData: Partial<WorkOrder>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<WorkOrder>>>;
  subtotal: number;
  total: number;
  partsTotal: number;
  servicesTotal: number;
  remainingAmount: number;
  depositAmount: number;
  setDepositAmount: (val: number) => void;
  partialPayment: number;
  setPartialPayment: (val: number) => void;
  showDepositInput: boolean;
  setShowDepositInput: (val: boolean) => void;
  showPartialPayment: boolean;
  setShowPartialPayment: (val: boolean) => void;
  discountType: "amount" | "percent";
  setDiscountType: (val: "amount" | "percent") => void;
  discountPercent: number;
  setDiscountPercent: (val: number) => void;
  maxAdditionalPayment: number;
  canEditPriceAndParts: boolean;
  isSubmitting: boolean;
  handleSave: () => Promise<void>;
  handleSaveOnly: () => Promise<void>;
  onClose: () => void;
  order: WorkOrder;
  totalDeposit: number;
  totalAdditionalPayment: number;
}

export const SummarySidebar: React.FC<SummarySidebarProps> = ({
  formData,
  setFormData,
  subtotal,
  total,
  partsTotal,
  servicesTotal,
  remainingAmount,
  depositAmount,
  setDepositAmount,
  partialPayment,
  setPartialPayment,
  showDepositInput,
  setShowDepositInput,
  showPartialPayment,
  setShowPartialPayment,
  discountType,
  setDiscountType,
  discountPercent,
  setDiscountPercent,
  maxAdditionalPayment,
  canEditPriceAndParts,
  isSubmitting,
  handleSave,
  handleSaveOnly,
  onClose,
  order,
  totalDeposit,
  totalAdditionalPayment,
}) => {
  const [cashReceived, setCashReceived] = React.useState(0);

  const paymentDueNow = React.useMemo(() => {
    if (showDepositInput && !order?.depositAmount) {
      return Math.max(0, depositAmount);
    }

    if (formData.status === "Trả máy") {
      return showPartialPayment
        ? Math.min(Math.max(0, partialPayment), maxAdditionalPayment)
        : Math.max(0, remainingAmount);
    }

    return Math.max(0, total);
  }, [
    depositAmount,
    formData.status,
    maxAdditionalPayment,
    order?.depositAmount,
    partialPayment,
    remainingAmount,
    showDepositInput,
    showPartialPayment,
    total,
  ]);

  const changeAmount = Math.max(0, cashReceived - paymentDueNow);
  const missingAmount = Math.max(0, paymentDueNow - cashReceived);

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-80 xl:w-96 border-l border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50 overflow-y-auto flex-shrink-0">
      <div className="p-4 space-y-4 flex flex-col h-full">
        {/* Summary Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <svg
              className="w-4 h-4 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Tổng kết</h3>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                Phí dịch vụ
                {!canEditPriceAndParts && (
                  <span className="block text-[10px] text-amber-500">(Không thể sửa)</span>
                )}
              </span>
              <div className="w-32">
                <NumberInput
                  placeholder="0"
                  value={formData.laborCost || ""}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      laborCost: val,
                    })
                  }
                  disabled={!canEditPriceAndParts}
                  className={`w-full px-2 py-1.5 text-right border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 ${
                    !canEditPriceAndParts ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                />
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Phụ tùng</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {formatCurrency(partsTotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Gia công/Đặt hàng</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {formatCurrency(servicesTotal)}
              </span>
            </div>
          </div>

          {/* Discount */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center text-sm">
              <span className="text-red-500 font-medium">Giảm giá</span>
              <div className="flex items-center gap-1.5">
                <NumberInput
                  value={discountType === "amount" ? formData.discount || "" : discountPercent}
                  onChange={(val) => {
                    if (discountType === "amount") {
                      setFormData({ ...formData, discount: Math.min(val, subtotal) });
                    } else {
                      const percent = Math.min(val, 100);
                      setDiscountPercent(percent);
                      setFormData({ ...formData, discount: Math.round((subtotal * percent) / 100) });
                    }
                  }}
                  allowNegative={false}
                  allowDecimal={false}
                  className="w-24 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs"
                  min={0}
                  max={discountType === "amount" ? subtotal : 100}
                  placeholder="0"
                />
                <select
                  value={discountType}
                  onChange={(e) => {
                    setDiscountType(e.target.value as "amount" | "percent");
                    setFormData({ ...formData, discount: 0 });
                    setDiscountPercent(0);
                  }}
                  className="px-1.5 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs"
                >
                  <option value="amount">đ</option>
                  <option value="percent">%</option>
                </select>
              </div>
            </div>
            {discountType === "percent" && (
              <div className="flex gap-1 justify-end mt-1.5">
                {[5, 10, 15, 20].map((percent) => (
                  <button
                    key={percent}
                    type="button"
                    onClick={() => {
                      setDiscountPercent(percent);
                      setFormData({ ...formData, discount: Math.round((subtotal * percent) / 100) });
                    }}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                      discountPercent === percent
                        ? "bg-blue-500 text-white"
                        : "bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {percent}%
                  </button>
                ))}
              </div>
            )}
            {discountType === "percent" && discountPercent > 0 && (
              <div className="text-[10px] text-slate-400 text-right mt-1">
                = {formatCurrency(formData.discount || 0)}
              </div>
            )}
          </div>

          {/* Total */}
          <div className="pt-3 border-t-2 border-blue-200 dark:border-blue-800">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Tổng cộng</span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(total)}
              </span>
            </div>
            {(totalDeposit > 0 || totalAdditionalPayment > 0) && (
              <div className="space-y-1 pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
                {totalDeposit > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600 dark:text-green-400">Đã đặt cọc</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      -{formatCurrency(totalDeposit)}
                    </span>
                  </div>
                )}
                {totalAdditionalPayment > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600 dark:text-green-400">TT thêm</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      -{formatCurrency(totalAdditionalPayment)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {remainingAmount > 0 ? "Còn phải thu" : "Đã thanh toán đủ"}
                  </span>
                  <span
                    className={`text-base font-bold ${
                      remainingAmount > 0 ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    {formatCurrency(remainingAmount)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Options Card */}
        <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <svg
              className="w-4 h-4 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Thanh toán</h3>
          </div>

          {/* Deposit */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showDepositInput}
              onChange={(e) => {
                setShowDepositInput(e.target.checked);
                if (!e.target.checked) setDepositAmount(0);
              }}
              disabled={!!order?.depositAmount}
              className="w-4 h-4 rounded text-violet-600 border-slate-300 dark:border-slate-700 focus:ring-violet-500/20 bg-white/40 dark:bg-slate-900/40 cursor-pointer transition disabled:opacity-50"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none">
              Đặt cọc {order?.depositAmount ? `(Đã cọc: ${formatCurrency(order.depositAmount)})` : ""}
            </span>
          </label>
          {showDepositInput && !order?.depositAmount && (
            <div className="pl-6">
              <NumberInput
                placeholder="Số tiền đặt cọc"
                value={depositAmount || ""}
                onChange={(val) => setDepositAmount(val)}
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 text-sm rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 shadow-inner placeholder-slate-400 dark:placeholder-slate-600 transition"
              />
            </div>
          )}

          <div className="border-t border-slate-200/50 dark:border-slate-800/50"></div>

          {/* Payment Method */}
          <div>
            <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2 block uppercase tracking-wider">
              Phương thức thanh toán
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, paymentMethod: "cash" })}
                className={`group relative flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl text-sm font-medium border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                  formData.paymentMethod === "cash"
                    ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/80 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/30"
                    : "bg-white/40 dark:bg-slate-900/20 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {formData.paymentMethod === "cash" && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
                <div
                  className={`p-2 rounded-lg transition-colors ${
                    formData.paymentMethod === "cash"
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-slate-100 dark:bg-slate-800/60 text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300"
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <rect x="2" y="6" width="20" height="12" rx="2" ry="2" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <span className="text-xs font-semibold tracking-wide">Tiền mặt</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, paymentMethod: "bank" })}
                className={`group relative flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl text-sm font-medium border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                  formData.paymentMethod === "bank"
                    ? "bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/80 text-blue-600 dark:text-blue-400 shadow-sm shadow-blue-500/10 ring-1 ring-blue-500/30"
                    : "bg-white/40 dark:bg-slate-900/20 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {formData.paymentMethod === "bank" && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                )}
                <div
                  className={`p-2 rounded-lg transition-colors ${
                    formData.paymentMethod === "bank"
                      ? "bg-blue-500/15 text-blue-500"
                      : "bg-slate-100 dark:bg-slate-800/60 text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300"
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 21h18M3 10h18M7 6h10l2 4H5l2-4Zm2 4v11m6-11v11"
                    />
                  </svg>
                </div>
                <span className="text-xs font-semibold tracking-wide">Chuyển khoản</span>
              </button>
            </div>
          </div>

          {/* Partial payment - Trả máy only */}
          {formData.status === "Trả máy" && (
            <>
              <div className="border-t border-slate-200/50 dark:border-slate-800/50"></div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPartialPayment}
                  onChange={(e) => {
                    setShowPartialPayment(e.target.checked);
                    if (e.target.checked) setPartialPayment(maxAdditionalPayment);
                    else setPartialPayment(0);
                  }}
                  className="w-4 h-4 rounded text-violet-600 border-slate-300 dark:border-slate-700 focus:ring-violet-500/20 bg-white/40 dark:bg-slate-900/40 cursor-pointer transition"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none">
                  Thanh toán khi trả xe
                </span>
              </label>
              {showPartialPayment && (
                <div className="pl-6 space-y-3">
                  <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    Số tiền thanh toán thêm:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <NumberInput
                      placeholder="0"
                      value={partialPayment || ""}
                      onChange={(val) => setPartialPayment(val)}
                      className="flex-1 px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 text-sm rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 shadow-inner transition"
                    />
                  </div>

                  <div className="flex bg-slate-100/80 dark:bg-slate-950/40 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800/60 w-full overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setPartialPayment(0)}
                      className={`flex-1 py-1 text-center text-xs font-semibold rounded-md transition-all duration-200 ${
                        partialPayment === 0
                          ? "bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm border border-slate-200/30 dark:border-slate-700/30"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      0%
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartialPayment(Math.round(maxAdditionalPayment * 0.5))}
                      className={`flex-1 py-1 text-center text-xs font-semibold rounded-md transition-all duration-200 ${
                        partialPayment === Math.round(maxAdditionalPayment * 0.5)
                          ? "bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm border border-slate-200/30 dark:border-slate-700/30"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartialPayment(maxAdditionalPayment)}
                      className={`flex-1 py-1 text-center text-xs font-semibold rounded-md transition-all duration-200 ${
                        partialPayment === maxAdditionalPayment
                          ? "bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm border border-slate-200/30 dark:border-slate-700/30"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      100%
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {formData.status !== "Trả máy" && (
            <p className="text-[10px] text-slate-400/80 dark:text-slate-500 italic leading-relaxed">
              * Thanh toán khi trả xe chỉ khả dụng khi trạng thái là "Trả máy"
            </p>
          )}

          {formData.paymentMethod === "cash" && paymentDueNow > 0 && (
            <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/50 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">
                  Cần thu
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {formatCurrency(paymentDueNow)}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  Khách đưa
                </label>
                <NumberInput
                  placeholder="Nhập số tiền khách đưa"
                  value={cashReceived || ""}
                  onChange={(val) => setCashReceived(Math.max(0, val))}
                  allowNegative={false}
                  allowDecimal={false}
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 text-sm rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-inner placeholder-slate-400 dark:placeholder-slate-600 transition"
                />
              </div>

              <div
                className={`rounded-xl border px-3 py-2 ${
                  cashReceived > 0 && missingAmount > 0
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                    : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`text-sm font-bold ${
                      cashReceived > 0 && missingAmount > 0
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {cashReceived > 0 && missingAmount > 0 ? "Còn thiếu" : "Tiền thối lại"}
                  </span>
                  <span
                    className={`text-lg font-black ${
                      cashReceived > 0 && missingAmount > 0
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {formatCurrency(cashReceived > 0 && missingAmount > 0 ? missingAmount : changeAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons - Sticky at bottom */}
        <div className="mt-auto pt-4 space-y-3">
          <div className="flex flex-col gap-2">
            {formData.status === "Trả máy" ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className={`w-full px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                  isSubmitting
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700 opacity-60"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20 active:scale-[0.98]"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Thanh toán & Trả máy
              </button>
            ) : showDepositInput && depositAmount > 0 ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className={`w-full px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                  isSubmitting
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700 opacity-60"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 active:scale-[0.98]"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Lưu & Nhận cọc
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleSaveOnly}
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                isSubmitting
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                  : formData.status === "Trả máy" || (showDepositInput && depositAmount > 0)
                  ? "bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800/50 active:scale-[0.98]"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 active:scale-[0.98]"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              {isSubmitting
                ? "Đang lưu..."
                : formData.status === "Trả máy" || (showDepositInput && depositAmount > 0)
                ? "Chỉ lưu thông tin"
                : "Lưu Phiếu"}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>
  );
};
