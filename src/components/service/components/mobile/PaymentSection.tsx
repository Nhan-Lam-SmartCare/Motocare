import React, { useState } from "react";
import {
    TrendingUp,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    CreditCard,
    Banknote,
    Wallet,
    Landmark,
    Percent,
    DollarSign,
    Minus,
} from "lucide-react";
import { formatCurrency, formatNumberWithDots, parseFormattedNumber } from "../../../../utils/format";
import { NumberInput } from "../../../common/NumberInput";

interface PaymentSectionProps {
    laborCost: number;
    setLaborCost: (cost: number) => void;
    partsTotal: number;
    servicesTotal: number;
    discount: number;
    setDiscount: (discount: number) => void;
    discountType: "amount" | "percent";
    setDiscountType: (type: "amount" | "percent") => void;
    discountAmount: number;
    total: number;

    // Payment Props
    isDeposit: boolean;
    setIsDeposit: (isDeposit: boolean) => void;
    depositAmount: number;
    setDepositAmount: (amount: number) => void;
    paymentMethod: "cash" | "bank";
    setPaymentMethod: (method: "cash" | "bank") => void;

    // Status & Partial Payment
    status: string;
    showPaymentInput: boolean;
    setShowPaymentInput: (show: boolean) => void;
    partialAmount: number;
    setPartialAmount: (amount: number) => void;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({
    laborCost,
    setLaborCost,
    partsTotal,
    servicesTotal,
    discount,
    setDiscount,
    discountType,
    setDiscountType,
    discountAmount,
    total,
    isDeposit,
    setIsDeposit,
    depositAmount,
    setDepositAmount,
    paymentMethod,
    setPaymentMethod,
    status,
    showPaymentInput,
    setShowPaymentInput,
    partialAmount,
    setPartialAmount,
}) => {
    // Calculate paid/remaining for display
    const totalPaid = (isDeposit ? depositAmount : 0) + (showPaymentInput ? partialAmount : 0);
    const remaining = Math.max(0, total - (isDeposit ? depositAmount : 0) - (showPaymentInput ? partialAmount : 0));

    return (
        <div className="space-y-3 pb-20">
            {/* 1. Cost Details Card - Compact */}
            <div className="p-3 bg-white dark:bg-[#1e1e2d] rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-2.5 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                        Chi tiết chi phí
                    </span>
                </div>

                {/* Labor Cost - Compact */}
                <div className="bg-slate-50 dark:bg-[#151521] p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Tiền công thợ
                        </label>
                        <div className="flex items-center gap-1">
                            <span className="text-slate-400 text-xs">₫</span>
                            <NumberInput
                                value={laborCost}
                                onChange={(val) => setLaborCost(val)}
                                className="w-28 px-2 py-1.5 bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm text-slate-900 dark:text-white focus:border-blue-500 transition-all text-right"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>

                {/* Parts & Services Summary - Compact inline */}
                <div className="flex gap-2">
                    <div className="flex-1 p-2 bg-slate-50 dark:bg-[#151521] rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Phụ tùng</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {formatCurrency(partsTotal)}
                        </span>
                    </div>
                    <div className="flex-1 p-2 bg-slate-50 dark:bg-[#151521] rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Gia công</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {formatCurrency(servicesTotal)}
                        </span>
                    </div>
                </div>

                {/* Discount Section - Compact */}
                <div className="p-2.5 bg-slate-50 dark:bg-[#151521] rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1">
                            <Percent className="w-3 h-3" /> Giảm giá
                        </span>
                        <div className="flex items-center gap-2">
                            <div className="flex bg-white dark:bg-[#1e1e2d] rounded p-0.5 border border-slate-200 dark:border-slate-700">
                                <button
                                    onClick={() => setDiscountType("amount")}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${discountType === "amount"
                                        ? "bg-red-500 text-white"
                                        : "text-slate-400"
                                        }`}
                                >
                                    VNĐ
                                </button>
                                <button
                                    onClick={() => setDiscountType("percent")}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${discountType === "percent"
                                        ? "bg-red-500 text-white"
                                        : "text-slate-400"
                                        }`}
                                >
                                    %
                                </button>
                            </div>
                            <NumberInput
                                value={discount}
                                onChange={(val) => setDiscount(val)}
                                className="w-28 px-2 py-1 bg-white dark:bg-[#1e1e2d] border border-red-200 dark:border-red-900/30 focus:border-red-500 rounded-lg font-bold text-red-500 text-sm text-right"
                                placeholder="0"
                            />
                        </div>
                    </div>
                    {discountType === 'percent' && (
                        <div className="flex gap-1 mt-2">
                            {[10, 20, 50].map(pct => (
                                <button
                                    key={pct}
                                    onClick={() => setDiscount(pct)}
                                    className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-[10px] font-bold text-red-500 rounded hover:bg-red-200 transition-colors"
                                >
                                    -{pct}%
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Deposit & Payment Method */}
            <div className="p-4 bg-white dark:bg-[#1e1e2d] rounded-2xl border border-slate-200 dark:border-slate-700/50 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                            <Wallet className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                            Thanh toán
                        </span>
                    </div>

                    {/* Deposit Toggle */}
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#151521] px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className={`text-[10px] font-bold uppercase transition-colors ${isDeposit ? "text-purple-500" : "text-slate-400"}`}>
                            Cọc trước
                        </span>
                        <button
                            onClick={() => setIsDeposit(!isDeposit)}
                            className={`w-9 h-5 rounded-full transition-colors relative ${isDeposit ? "bg-purple-500" : "bg-slate-300 dark:bg-slate-600"}`}
                        >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${isDeposit ? "left-5" : "left-1"}`} />
                        </button>
                    </div>
                </div>

                {isDeposit && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-500/20 animate-in slide-in-from-top-2 duration-200">
                        <label className="text-[10px] font-bold text-purple-600 dark:text-purple-300 uppercase block mb-1.5">
                            Số tiền đặt cọc
                        </label>
                        <NumberInput
                            value={depositAmount}
                            onChange={(val) => setDepositAmount(val)}
                            className="w-full px-3 py-2 bg-white dark:bg-[#1e1e2d] border border-purple-200 dark:border-purple-500/30 rounded-lg font-bold text-purple-600 dark:text-purple-400 focus:border-purple-500"
                            placeholder="0"
                        />
                    </div>
                )}

                {/* Method Selection */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setPaymentMethod("cash")}
                        className={`relative p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === "cash"
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151521] text-slate-500 hover:border-emerald-200"
                            }`}
                    >
                        <Banknote className="w-6 h-6" />
                        <span className="text-xs font-bold uppercase">Tiền mặt</span>
                        {paymentMethod === "cash" && (
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                    </button>
                    <button
                        onClick={() => setPaymentMethod("bank")}
                        className={`relative p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === "bank"
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#151521] text-slate-500 hover:border-blue-200"
                            }`}
                    >
                        <Landmark className="w-6 h-6" />
                        <span className="text-xs font-bold uppercase">Chuyển khoản</span>
                        {paymentMethod === "bank" && (
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
                        )}
                    </button>
                </div>
            </div>

            {/* Payment at return - available when status is "Trả máy" */}
            {(status === "Trả máy" || status === "Delivered") && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                                <CheckCircle className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                                Thanh toán trả xe
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                const newValue = !showPaymentInput;
                                setShowPaymentInput(newValue);
                                // Default to 100% when toggled ON, 0 when OFF
                                if (newValue) {
                                    setPartialAmount(total - (isDeposit ? depositAmount : 0));
                                } else {
                                    setPartialAmount(0);
                                }
                            }}
                            className={`w-10 h-6 rounded-full transition-colors relative ${showPaymentInput ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${showPaymentInput ? "left-5" : "left-1"}`} />
                        </button>
                    </div>

                    {showPaymentInput && (
                        <div className="animate-in slide-in-from-top-2">
                            <NumberInput
                                value={partialAmount}
                                onChange={setPartialAmount}
                                className="w-full px-3 py-2 bg-white dark:bg-[#1e1e2d] border border-emerald-200 dark:border-emerald-500/30 rounded-lg font-bold text-emerald-600 focus:border-emerald-500"
                                placeholder="Nhập số tiền..."
                            />
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => setPartialAmount(0)} className="flex-1 py-1.5 text-xs bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">0%</button>
                                <button onClick={() => setPartialAmount(Math.round((total - (isDeposit ? depositAmount : 0)) * 0.5))} className="flex-1 py-1.5 text-xs bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">50%</button>
                                <button onClick={() => setPartialAmount(total - (isDeposit ? depositAmount : 0))} className="flex-1 py-1.5 text-xs bg-emerald-500 text-white rounded-lg font-bold shadow-sm hover:bg-emerald-600 transition-colors">100%</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 3. Total Summary */}
            <div className="p-5 bg-gradient-to-br from-[#1e1e2d] to-[#151521] rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden group">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 p-8 bg-blue-500/5 rounded-bl-[100px] transition-transform group-hover:scale-110" />

                <div className="relative">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                        Tổng thanh toán
                    </span>
                    <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-3xl font-black text-white tracking-tight">
                            {formatCurrency(total).replace("₫", "")}
                        </span>
                        <span className="text-sm font-bold text-slate-500">₫</span>
                    </div>

                    {/* Breakdown logic */}
                    <div className="space-y-2 pt-4 border-t border-slate-700/50">
                        {discountAmount > 0 && (
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Đã giảm giá</span>
                                <span className="font-bold text-red-400">-{formatCurrency(discountAmount)}</span>
                            </div>
                        )}
                        {totalPaid > 0 && (
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Đã thanh toán (Cọc)</span>
                                <span className="font-bold text-blue-400">-{formatCurrency(totalPaid)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2 mt-1">
                            <span className="text-sm font-bold text-slate-200">Còn lại cần thu</span>
                            <span className={`text-lg font-black ${remaining === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                                {formatCurrency(remaining)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
