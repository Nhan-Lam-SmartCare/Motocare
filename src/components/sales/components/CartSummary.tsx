import React from "react";
import { formatCurrency } from "../../../utils/format";
import { Receipt } from "lucide-react";

interface CartSummaryProps {
    subtotal: number;
    discount: number;
    total: number;
    discountType: "amount" | "percent";
    discountPercent: number;
    onDiscountChange: (discount: number) => void;
    onDiscountTypeChange: (type: "amount" | "percent") => void;
    onDiscountPercentChange: (percent: number) => void;
}

/**
 * Cart summary component displaying subtotal, discount, and total
 */
export const CartSummary: React.FC<CartSummaryProps> = ({
    subtotal,
    discount,
    total,
    discountType,
    discountPercent,
    onDiscountChange,
    onDiscountTypeChange,
    onDiscountPercentChange,
}) => {
    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-slate-900 dark:text-white text-[15px]">
                    Tổng kết đơn hàng
                </h3>
            </div>

            <div className="space-y-3">
                {/* Subtotal */}
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Tạm tính</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(subtotal)}
                    </span>
                </div>

                {/* Discount - Compact inline layout */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold min-w-[58px]">
                            Giảm giá:
                        </span>
                        <div className="flex items-center gap-1.5 flex-1">
                            <input
                                type="number"
                                value={discountType === "amount" ? discount : discountPercent}
                                onChange={(e) => {
                                    const value = Number(e.target.value) || 0;
                                    if (discountType === "amount") {
                                        onDiscountChange(Math.min(value, subtotal));
                                    } else {
                                        const percent = Math.min(value, 100);
                                        onDiscountPercentChange(percent);
                                        onDiscountChange(Math.round((subtotal * percent) / 100));
                                    }
                                }}
                                className="flex-1 px-2 py-1.5 text-right text-sm border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 font-semibold placeholder:text-slate-500 dark:placeholder:text-slate-400"
                                placeholder="0"
                                min="0"
                                max={discountType === "amount" ? subtotal : 100}
                            />
                            <select
                                value={discountType}
                                onChange={(e) => {
                                    const newType = e.target.value as "amount" | "percent";
                                    onDiscountTypeChange(newType);
                                    onDiscountChange(0);
                                    onDiscountPercentChange(0);
                                }}
                                className="px-2 py-1.5 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-bold"
                            >
                                <option value="amount">₫</option>
                                <option value="percent">%</option>
                            </select>
                        </div>
                    </div>

                    {/* Quick percent buttons */}
                    {discountType === "percent" && (
                        <div className="flex gap-1.5 justify-end flex-wrap">
                            {[5, 10, 15, 20].map((percent) => (
                                <button
                                    key={percent}
                                    onClick={() => {
                                        onDiscountPercentChange(percent);
                                        onDiscountChange(Math.round((subtotal * percent) / 100));
                                    }}
                                    className="px-2 py-1 text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-md transition-all"
                                >
                                    {percent}%
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="border-t-2 border-blue-300 dark:border-blue-700 my-3"></div>

                {/* Total */}
                <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-slate-900 dark:text-white">
                        Thành tiền
                    </span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(total)}
                    </span>
                </div>
            </div>
        </div>
    );
};
