import React from "react";
import { formatCurrency } from "../../../utils/format";

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
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                    </svg>
                </div>
                <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wider">
                    Thanh toán
                </h3>
            </div>

            <div className="space-y-4">
                {/* Subtotal */}
                <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tạm tính</span>
                    <span className="font-black text-slate-900 dark:text-white">
                        {formatCurrency(subtotal)}
                    </span>
                </div>

                {/* Discount Section */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Giảm giá</span>
                        <div className="flex bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <button 
                                onClick={() => onDiscountTypeChange("amount")}
                                className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all ${discountType === 'amount' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >₫</button>
                            <button 
                                onClick={() => onDiscountTypeChange("percent")}
                                className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all ${discountType === 'percent' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >%</button>
                        </div>
                    </div>
                    
                    <div className="relative">
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
                            className="w-full px-4 py-2 text-right text-sm font-black bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-rose-500"
                            placeholder="0"
                        />
                    </div>

                    {discountType === "percent" && (
                        <div className="flex gap-1.5 justify-end">
                            {[5, 10, 15, 20].map((percent) => (
                                <button
                                    key={percent}
                                    onClick={() => {
                                        onDiscountPercentChange(percent);
                                        onDiscountChange(Math.round((subtotal * percent) / 100));
                                    }}
                                    className="px-2 py-1 text-[10px] font-black bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-slate-500 rounded-lg transition-all active:scale-95"
                                >
                                    {percent}%
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Final Total */}
                <div className="pt-2">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Tổng cộng</span>
                        <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            {formatCurrency(total)}
                        </span>
                    </div>
                    <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
