import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { formatCurrency } from "../../../utils/format";
import { NumberInput } from "../../common/NumberInput";

interface InstallmentDetails {
    financeCompany: string;
    prepaidAmount: number;
    term: number;
    monthlyPayment: number;
    interestRate: number;
    totalDetail: number;
}

interface InstallmentSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number;
    onSave: (details: InstallmentDetails) => void;
    initialDetails?: InstallmentDetails;
}

export const InstallmentSetupModal: React.FC<InstallmentSetupModalProps> = ({
    isOpen,
    onClose,
    totalAmount,
    onSave,
    initialDetails
}) => {
    // State
    const [financeCompany, setFinanceCompany] = useState("Store");
    const [prepaidAmount, setPrepaidAmount] = useState(0);
    const [term, setTerm] = useState(6);
    const [interestRate, setInterestRate] = useState(0);

    // Calculated state
    const [remainingAmount, setRemainingAmount] = useState(0);
    const [monthlyPayment, setMonthlyPayment] = useState(0);
    const [totalDetail, setTotalDetail] = useState(0);

    // Initialize state
    useEffect(() => {
        if (isOpen) {
            // Lock body scroll
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';

            if (initialDetails && initialDetails.financeCompany) {
                setFinanceCompany(initialDetails.financeCompany);
                setPrepaidAmount(initialDetails.prepaidAmount);
                setTerm(initialDetails.term);
                setInterestRate(initialDetails.interestRate);
            } else {
                // Defaults
                setFinanceCompany("Store");
                setPrepaidAmount(totalAmount * 0.3); // 30% default
                setTerm(6);
                setInterestRate(0);
            }
        } else {
            // Ensure unlock if isOpen becomes false (though cleanup handles unmount)
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }

        return () => {
            // Unlock body scroll on cleanup
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
     
    }, [isOpen]); // Reduced dependencies to avoid re-locking/unlocking on unrelated changes

    // Update initial details when they change, separate from scroll locking
    useEffect(() => {
        if (isOpen && initialDetails && initialDetails.financeCompany) {
            setFinanceCompany(initialDetails.financeCompany);
            setPrepaidAmount(initialDetails.prepaidAmount);
            setTerm(initialDetails.term);
            setInterestRate(initialDetails.interestRate);
        }
    }, [initialDetails, isOpen]); // React to initialDetails changes


    // Recalculate whenever inputs change
    useEffect(() => {
        const remaining = Math.max(0, totalAmount - prepaidAmount);
        setRemainingAmount(remaining);

        // Simple interest formula: Interest = Principal * Rate * Time(years) ??
        // Usually Installment logic: Monthly Payment = (Principal + Principal * Rate/100 * Months) / Months
        // OR: Monthly Payment = (Principal / Months) + (Principal * Rate/100)
        // Let's assume Rate is % per month on the principal.

        const totalInterest = remaining * (interestRate / 100) * term;
        const totalToPay = remaining + totalInterest;
        const monthly = term > 0 ? totalToPay / term : 0;

        setTotalDetail(prepaidAmount + totalToPay);
        setMonthlyPayment(Math.round(monthly)); // Round to integer
    }, [totalAmount, prepaidAmount, term, interestRate]);

    const handleSave = () => {
        onSave({
            financeCompany,
            prepaidAmount,
            term,
            monthlyPayment,
            interestRate,
            totalDetail
        });
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 z-[100000]">
            <div className="relative z-[100001] bg-white dark:bg-slate-800 rounded-none md:rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-full md:h-auto md:max-h-[90vh]">
                {/* Header */}
                <div className="bg-purple-600 p-3 md:p-4 flex flex-col md:flex-row justify-between items-start md:items-center text-white flex-none gap-2 md:gap-0">
                    <div className="flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <h2 className="text-lg font-bold">Thiết lập Trả góp</h2>
                    </div>
                    <div className="text-sm font-medium bg-purple-700/50 px-3 py-1 rounded-full self-start md:self-auto">
                        Tổng đơn: {formatCurrency(totalAmount)}
                    </div>
                </div>

                {/* Body - Scrollable */}
                <div className="p-4 md:p-6 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 h-full">
                        {/* LEFT COLUMN: Inputs */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200 border-b pb-2 hidden md:block">1. Thông tin khoản vay</h3>

                            {/* Finance Company */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Đơn vị trả góp
                                </label>
                                <select
                                    value={financeCompany}
                                    onChange={(e) => setFinanceCompany(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                    <option value="Store">Cửa hàng (Tự quản lý)</option>
                                    <option value="FE Credit">FE Credit</option>
                                    <option value="Home Credit">Home Credit</option>
                                    <option value="HD Saison">HD Saison</option>
                                    <option value="Mirae Asset">Mirae Asset</option>
                                    <option value="Shinhan Finance">Shinhan Finance</option>
                                    <option value="VietCredit">VietCredit</option>
                                    <option value="Other">Khác</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-1">
                                    {financeCompany === 'Store'
                                        ? "Cửa hàng tự theo dõi và thu tiền định kỳ của khách."
                                        : "Công ty tài chính sẽ giải ngân tiền cho cửa hàng."}
                                </p>
                            </div>

                            {/* Prepaid Amount */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Tiền đặt cọc / Trả trước
                                </label>
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <NumberInput
                                        value={prepaidAmount}
                                        onChange={setPrepaidAmount}
                                        min={0}
                                        max={totalAmount}
                                        className="w-full p-2 text-xl font-bold text-center text-green-600 bg-transparent border-0 focus:ring-0 placeholder-slate-300"
                                    />
                                    <div className="grid grid-cols-4 gap-1 mt-1">
                                        {[10, 20, 30, 50].map(percent => (
                                            <button
                                                key={percent}
                                                onClick={() => setPrepaidAmount(Math.round(totalAmount * (percent / 100)))}
                                                className="py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-slate-700 shadow-sm hover:bg-purple-50 dark:hover:bg-purple-900/20 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-600"
                                            >
                                                {percent}%
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Term & Interest */}
                            <div className="space-y-3">
                                {/* Term Presets */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Chọn kỳ hạn (tháng)
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[3, 6, 9, 12].map(m => (
                                            <button
                                                key={m}
                                                onClick={() => setTerm(m)}
                                                className={`py-2 text-sm font-medium rounded-lg border transition-all ${term === m
                                                    ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20"
                                                    : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-purple-300"
                                                    }`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Term & Interest Inputs */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                                            Số kỳ khác
                                        </label>
                                        <NumberInput
                                            value={term}
                                            onChange={setTerm}
                                            min={1}
                                            className="w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-slate-700 text-center font-bold text-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                                            Lãi suất (%)
                                        </label>
                                        <input
                                            type="number"
                                            value={interestRate}
                                            onChange={(e) => setInterestRate(Number(e.target.value))}
                                            step="0.01"
                                            className="w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-slate-700 text-center font-bold text-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 text-center italic">
                                * Lãi suất 0% nếu không nhập
                            </p>
                        </div>

                        {/* RIGHT COLUMN: Summary & Schedule */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200 border-b pb-2">2. Chi tiết thanh toán</h3>

                            {/* Summary Card */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-purple-200 dark:border-purple-900/30 shadow-sm">
                                <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-2 text-sm uppercase">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                    Tóm tắt kế hoạch
                                </h4>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 dark:text-slate-400">Tổng đơn hàng:</span>
                                        <span className="font-medium">{formatCurrency(totalAmount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600 dark:text-slate-400">Trả trước:</span>
                                        <span className="font-medium text-green-600">{formatCurrency(prepaidAmount)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-dashed pb-2">
                                        <span className="text-slate-600 dark:text-slate-400">Vay lại:</span>
                                        <span className="font-medium">{formatCurrency(remainingAmount)}</span>
                                    </div>
                                    <div className="flex justify-between pt-1">
                                        <span className="text-slate-600 dark:text-slate-400">Tổng lãi dự kiến:</span>
                                        <span className="font-medium text-amber-600">{formatCurrency(totalDetail - prepaidAmount - remainingAmount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-lg border mt-2 shadow-sm">
                                        <span className="font-bold text-slate-700 dark:text-slate-200">Góp mỗi tháng:</span>
                                        <span className="font-bold text-xl text-red-600">{formatCurrency(monthlyPayment)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Repayment Schedule (Conditionally Visible) */}
                            {financeCompany === 'Store' && (
                                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-60">
                                    <div className="bg-slate-100 dark:bg-slate-700/50 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        Lịch trả nợ dự kiến
                                    </div>
                                    <div className="overflow-y-auto flex-1 p-0">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0 z-10 shadow-sm">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Kỳ</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Ngày trả</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Số tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {Array.from({ length: term }).map((_, idx) => {
                                                    const date = new Date();
                                                    date.setMonth(date.getMonth() + idx + 1);
                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                            <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{idx + 1}</td>
                                                            <td className="px-4 py-2 text-slate-800 dark:text-slate-200">
                                                                {date.toLocaleDateString('vi-VN')}
                                                            </td>
                                                            <td className="px-4 py-2 text-right font-medium text-slate-700 dark:text-slate-300">
                                                                {formatCurrency(monthlyPayment)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                {/* Footer */}
                <div className="bg-slate-50 dark:bg-slate-900 p-3 md:p-4 border-t dark:border-slate-700 flex-none flex flex-col gap-3">
                    {/* Mobile Only Summary Row */}
                    <div className="flex justify-between items-center md:hidden">
                        <span className="text-sm text-slate-500">Góp mỗi tháng:</span>
                        <span className="text-xl font-bold text-red-600">{formatCurrency(monthlyPayment)}</span>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 md:flex-none px-4 py-2.5 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition-colors border border-slate-200 md:border-transparent bg-white md:bg-transparent"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-[2] md:flex-none px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-lg shadow-purple-500/30 transition-all"
                        >
                            Xác nhận trả góp
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

