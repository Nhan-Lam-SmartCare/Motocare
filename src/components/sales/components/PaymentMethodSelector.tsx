import React from "react";
import { CreditCard, Banknote, Wallet, FileText } from "lucide-react";
import { NumberInput } from "../../common/NumberInput";
import { formatCurrency } from "../../../utils/format";
import type { InstallmentDetails } from "../hooks/useSalesFinalization";

interface PaymentMethodSelectorProps {
    paymentMethod: "cash" | "bank" | "card" | null;
    paymentType: "full" | "partial" | "note" | "installment" | null;
    partialAmount: number;
    total: number;
    onPaymentMethodChange: (method: "cash" | "bank" | "card") => void;
    onPaymentTypeChange: (type: "full" | "partial" | "note" | "installment") => void;
    onPartialAmountChange: (amount: number) => void;
    onOpenInstallmentSetup?: () => void;
    installmentDetails?: InstallmentDetails;
}

/**
 * Payment method and type selector component
 */
export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
    paymentMethod,
    paymentType,
    partialAmount,
    total,
    onPaymentMethodChange,
    onPaymentTypeChange,
    onPartialAmountChange,
    onOpenInstallmentSetup,
    installmentDetails
}) => {
    return (
        <div className="space-y-3">
            {/* Payment Method Selection - Compact Design */}
            <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                    Phương thức thanh toán
                </label>
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => onPaymentMethodChange("cash")}
                        className={`group flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl border transition-all duration-300 ${paymentMethod === "cash"
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/50"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:border-blue-300 hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
                            }`}
                    >
                        <div className={`p-2 rounded-xl transition-colors ${paymentMethod === 'cash' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 text-slate-500'}`}>
                            <Banknote className="w-5 h-5" strokeWidth={2} />
                        </div>
                        <span className="font-bold text-xs uppercase tracking-tight">Tiền mặt</span>
                    </button>
                    <button
                        onClick={() => onPaymentMethodChange("bank")}
                        className={`group flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl border transition-all duration-300 ${paymentMethod === "bank"
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/50"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:border-indigo-300 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10"
                            }`}
                    >
                        <div className={`p-2 rounded-xl transition-colors ${paymentMethod === 'bank' ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 text-slate-500'}`}>
                            <CreditCard className="w-5 h-5" strokeWidth={2} />
                        </div>
                        <span className="font-bold text-xs uppercase tracking-tight">Chuyển khoản</span>
                    </button>
                    <button
                        onClick={() => onPaymentMethodChange("card")}
                        className={`group flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl border transition-all duration-300 ${paymentMethod === "card"
                            ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.15)] ring-1 ring-violet-500/50"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:border-violet-300 hover:bg-violet-50/30 dark:hover:bg-violet-900/10"
                            }`}
                    >
                        <div className={`p-2 rounded-xl transition-colors ${paymentMethod === 'card' ? 'bg-violet-500 text-white' : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/50 text-slate-500'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <span className="font-bold text-xs uppercase tracking-tight">Quẹt thẻ</span>
                    </button>
                </div>
            </div>

            {/* Payment Type Selection (if method selected) */}
            {paymentMethod && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                        Hình thức thanh toán
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        <button
                            onClick={() => onPaymentTypeChange("full")}
                            className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl border transition-all duration-300 ${paymentType === "full"
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:border-emerald-300"
                                }`}
                        >
                            <Wallet className={`w-4 h-4 ${paymentType === 'full' ? 'text-emerald-500' : ''}`} />
                            <span className="font-bold text-[10px] uppercase">Toàn bộ</span>
                        </button>
                        <button
                            onClick={() => onPaymentTypeChange("partial")}
                            className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl border transition-all duration-300 ${paymentType === "partial"
                                ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:border-amber-300"
                                }`}
                        >
                            <Banknote className={`w-4 h-4 ${paymentType === 'partial' ? 'text-amber-500' : ''}`} />
                            <span className="font-bold text-[10px] uppercase">Trả 1 phần</span>
                        </button>
                        <button
                            onClick={() => onPaymentTypeChange("installment")}
                            className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl border transition-all duration-300 ${paymentType === "installment"
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:border-blue-300"
                                }`}
                        >
                            <svg className={`w-4 h-4 ${paymentType === 'installment' ? 'text-blue-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-bold text-[10px] uppercase">Trả góp</span>
                        </button>
                        <button
                            onClick={() => onPaymentTypeChange("note")}
                            className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl border transition-all duration-300 ${paymentType === "note"
                                ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.1)]"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:border-orange-300"
                                }`}
                        >
                            <FileText className={`w-4 h-4 ${paymentType === 'note' ? 'text-orange-500' : ''}`} />
                            <span className="font-bold text-[10px] uppercase">Ghi nợ</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Partial Amount Input */}
            {paymentType === "partial" && (
                <div className="space-y-2 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Số tiền trả trước
                    </label>
                    <NumberInput
                        value={partialAmount}
                        onChange={onPartialAmountChange}
                        min={0}
                        max={total}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                        <span>Còn lại (Nợ khách hàng):</span>
                        <span className="font-semibold text-red-600 dark:text-red-400">
                            {formatCurrency(total - partialAmount)}
                        </span>
                    </div>
                </div>
            )}

            {/* Installment Summary */}
            {paymentType === "installment" && (
                <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Thiết lập trả góp
                        </label>
                        <button
                            type="button"
                            onClick={onOpenInstallmentSetup}
                            className="text-xs px-3 py-1 bg-white dark:bg-slate-700 border border-blue-300 rounded shadow-sm text-blue-600 hover:bg-blue-50"
                        >
                            {installmentDetails?.financeCompany ? "Sửa thiết lập" : "Thiết lập ngay"}
                        </button>
                    </div>

                    {installmentDetails?.financeCompany ? (
                        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                            <div className="flex justify-between">
                                <span>Công ty:</span>
                                <span className="font-bold">{installmentDetails.financeCompany === "Store" ? "Cửa hàng" : installmentDetails.financeCompany}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Kỳ hạn:</span>
                                <span>{installmentDetails.term} tháng</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Trả trước:</span>
                                <span>{formatCurrency(installmentDetails.prepaidAmount)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 mt-2">
                                <span>Còn lại (Gốc):</span>
                                <span className="font-bold text-red-600">{formatCurrency(total - installmentDetails.prepaidAmount)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-center text-slate-500 py-2">
                            Chưa có thông tin trả góp
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
