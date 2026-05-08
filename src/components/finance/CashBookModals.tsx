import React, { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "../../utils/format";
import type { CashTransaction } from "../../types";
import { 
    Tag, Wrench, Download, 
    Package, Users, Home, Lightbulb, Undo2, LogOut 
} from "lucide-react";

// Add Transaction Modal Component
export const AddTransactionModal: React.FC<{
    onClose: () => void;
    onSave: (transaction: any) => void;
    initialData?: {
        type?: "income" | "expense";
        amount?: number;
        category?: string;
        paymentSource?: string;
        recipient?: string;
        notes?: string;
    };
}> = ({ onClose, onSave, initialData }) => {
    const [type, setType] = useState<"income" | "expense">(initialData?.type || "income");
    const [amount, setAmount] = useState(initialData?.amount ? initialData.amount.toLocaleString("vi-VN").replace(/,/g, ".") : "");
    const [category, setCategory] = useState(initialData?.category || "");
    const [paymentSource, setPaymentSource] = useState(initialData?.paymentSource || "cash");
    const [recipient, setRecipient] = useState(initialData?.recipient || "");
    const [notes, setNotes] = useState(initialData?.notes || "");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

    // Hide bottom navigation when modal is open
    useEffect(() => {
        document.body.classList.add("hide-bottom-nav");
        return () => {
            document.body.classList.remove("hide-bottom-nav");
        };
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount.replace(/\./g, "")) || 0;
        if (numAmount <= 0) {
            alert("Vui lòng nhập số tiền hợp lệ (lớn hơn 0)");
            return;
        }
        onSave({
            type,
            amount: numAmount,
            category,
            paymentSourceId: paymentSource,
            recipient,
            notes,
            date: new Date(date).toISOString(),
        });
    };

    const incomeCategories = [
        { value: "sale_income", label: "Tiền bán hàng", icon: <Tag className="w-6 h-6 stroke-[1.5]" /> },
        { value: "service_income", label: "Tiền dịch vụ", icon: <Wrench className="w-6 h-6 stroke-[1.5]" /> },
        { value: "other_income", label: "Thu nhập khác", icon: <Download className="w-6 h-6 stroke-[1.5]" /> },
    ];

    const expenseCategories = [
        { value: "inventory_purchase", label: "Mua hàng", icon: <Package className="w-6 h-6 stroke-[1.5]" /> },
        { value: "salary", label: "Lương nhân viên", icon: <Users className="w-6 h-6 stroke-[1.5]" /> },
        { value: "rent", label: "Tiền thuê kho/bãi", icon: <Home className="w-6 h-6 stroke-[1.5]" /> },
        { value: "utilities", label: "Điện nước", icon: <Lightbulb className="w-6 h-6 stroke-[1.5]" /> },
        { value: "sale_refund", label: "Hoàn trả khách", icon: <Undo2 className="w-6 h-6 stroke-[1.5]" /> },
        { value: "other_expense", label: "Chi phí khác", icon: <LogOut className="w-6 h-6 stroke-[1.5]" /> },
    ];

    const categories = type === "income" ? incomeCategories : expenseCategories;

    // Format number with dots
    const formatNumber = (value: string) => {
        const num = value.replace(/\D/g, "");
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-[60]">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden mb-16 sm:mb-0">
                {/* Header */}
                <div
                    className={`px-6 py-4 flex-shrink-0 flex items-center justify-between border-b ${type === "income"
                        ? "bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30"
                        : "bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30"
                        }`}
                >
                    <h2 className={`text-lg font-bold flex items-center gap-2 ${type === "income" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                        {type === "income" ? (
                            <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg> Thu tiền mới</>
                        ) : (
                            <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Phần chi mới</>
                        )}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form
                    id="cashTxForm"
                    onSubmit={handleSubmit}
                    className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
                >
                    {/* Toggle Type & Source in one row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Phân loại
                            </label>
                            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => { setType("income"); setCategory(""); }}
                                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${type === "income"
                                        ? "bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                        }`}
                                >
                                    Thu tiền
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setType("expense"); setCategory(""); }}
                                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${type === "expense"
                                        ? "bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                        }`}
                                >
                                    Chi tiền
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Nguồn tiền
                            </label>
                            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setPaymentSource("cash")}
                                    className={`flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-1.5 rounded-md transition-all ${paymentSource === "cash"
                                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                        }`}
                                >
                                    Tiền mặt
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentSource("bank")}
                                    className={`flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-1.5 rounded-md transition-all ${paymentSource === "bank"
                                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                        }`}
                                >
                                    Ngân hàng
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Số tiền giao dịch
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                inputMode="numeric"
                                value={amount}
                                onChange={(e) => setAmount(formatNumber(e.target.value))}
                                placeholder="0"
                                className={`w-full px-4 py-4 text-3xl sm:text-4xl font-black bg-white dark:bg-slate-800 border-2 rounded-xl text-right pr-12 transition-all focus:outline-none ${type === "income"
                                    ? "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 focus:border-green-500 focus:ring-4 focus:ring-green-500/20"
                                    : "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                                    }`}
                                required
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">
                                đ
                            </span>
                        </div>
                    </div>

                    {/* Category Grid */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Danh mục {type === "income" ? "nguồn thu" : "khoản chi"}
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => setCategory(cat.value)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${category === cat.value
                                        ? type === "income"
                                            ? "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400 shadow-sm"
                                            : "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400 shadow-sm"
                                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                                        }`}
                                >
                                    <div className="flex justify-center mb-1.5">{cat.icon}</div>
                                    <div className="text-[11px] font-medium text-center leading-tight">
                                        {cat.label}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recipient & Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {type === "income" ? "Người nộp nạp" : "Người nhận tiền"}
                            </label>
                            <input
                                type="text"
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                placeholder={type === "income" ? "Tên người nộp..." : "Tên người nhận..."}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent focus:ring-blue-500/50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Ngày ghi sổ
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent focus:ring-blue-500/50"
                                required
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Nội dung chi tiết
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent focus:ring-blue-500/50"
                            placeholder="Ghi chú thêm về giao dịch..."
                        />
                    </div>
                </form>

                {/* Footer */}
                <div
                    className="flex-shrink-0 p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 z-10"
                    style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
                >
                    <button
                        type="submit"
                        form="cashTxForm"
                        className={`w-full py-3.5 rounded-xl font-bold text-white text-base shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${type === "income"
                            ? "bg-green-600 hover:bg-green-700 hover:shadow-green-500/25"
                            : "bg-red-600 hover:bg-red-700 hover:shadow-red-500/25"
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        {type === "income" ? "Xác nhận tạo phiếu Thu" : "Xác nhận tạo phiếu Chi"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Edit Transaction Modal Component
export const EditTransactionModal: React.FC<{
    transaction: CashTransaction;
    onClose: () => void;
    onSave: (updatedData: any) => void;
}> = ({ transaction, onClose, onSave }) => {
    const [type, setType] = useState<"income" | "expense">(
        transaction.type === "income" || transaction.type === "deposit"
            ? "income"
            : "expense"
    );
    const [amount, setAmount] = useState(String(Math.abs(transaction.amount)));
    const [category, setCategory] = useState(transaction.category || "");
    const [paymentSource, setPaymentSource] = useState(
        transaction.paymentSourceId || (transaction as any).paymentsource || "cash"
    );
    const [recipient, setRecipient] = useState(
        (transaction as any).recipient || ""
    );
    const [notes, setNotes] = useState(
        transaction.notes || (transaction as any).description || ""
    );
    const [date, setDate] = useState(
        transaction.date
            ? new Date(transaction.date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0]
    );

    // Hide bottom navigation when modal is open
    useEffect(() => {
        document.body.classList.add("hide-bottom-nav");
        return () => {
            document.body.classList.remove("hide-bottom-nav");
        };
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate amount
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            alert("Vui lòng nhập số tiền hợp lệ (lớn hơn 0)");
            return;
        }

        onSave({
            type,
            amount: parsedAmount,
            category,
            paymentSourceId: paymentSource,
            recipient,
            notes,
            date: new Date(date).toISOString(),
        });
    };

    const incomeCategories = [
        { value: "sale_income", label: "Tiền bán hàng" },
        { value: "service_income", label: "Tiền dịch vụ" },
        { value: "service_deposit", label: "Đặt cọc dịch vụ" },
        { value: "debt_collection", label: "Thu nợ khách hàng" },
        { value: "other_income", label: "Thu nhập khác" },
        { value: "general_income", label: "Thu chung" },
    ];

    const expenseCategories = [
        { value: "inventory_purchase", label: "Mua hàng" },
        { value: "salary", label: "Lương nhân viên" },
        { value: "rent", label: "Tiền thuê mặt bằng" },
        { value: "utilities", label: "Điện nước" },
        { value: "outsourcing", label: "Gia công ngoài" },
        { value: "loan_payment", label: "Trả nợ vay" },
        { value: "debt_payment", label: "Trả nợ nhà cung cấp" },
        { value: "sale_refund", label: "Hoàn trả khách hàng" },
        { value: "other_expense", label: "Chi phí khác" },
        { value: "general_expense", label: "Chi chung" },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base sm:text-xl font-semibold text-slate-900 dark:text-white">
                            Chỉnh sửa giao dịch
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4"
                >
                    {/* Type Selection */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Loại giao dịch
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    value="income"
                                    checked={type === "income"}
                                    onChange={(e) => setType(e.target.value as "income")}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-slate-900 dark:text-white">
                                    Thu tiền
                                </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    value="expense"
                                    checked={type === "expense"}
                                    onChange={(e) => setType(e.target.value as "expense")}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-slate-900 dark:text-white">
                                    Chi tiền
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Số tiền
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-lg text-sm sm:text-base text-slate-900 dark:text-white transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500"
                            required
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Danh mục
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-lg text-sm sm:text-base text-slate-900 dark:text-white transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500"
                        >
                            <option value="">Chọn danh mục</option>
                            {(type === "income" ? incomeCategories : expenseCategories).map(
                                (cat) => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    {/* Recipient/Payer */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Đối tượng
                        </label>
                        <input
                            type="text"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder={
                                type === "income" ? "Thu tiền từ ai?" : "Chi tiền cho ai?"
                            }
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-lg text-sm sm:text-base text-slate-900 dark:text-white transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500"
                        />
                    </div>

                    {/* Payment Source */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Nguồn tiền
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    value="cash"
                                    checked={paymentSource === "cash"}
                                    onChange={(e) => setPaymentSource(e.target.value)}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-slate-900 dark:text-white">
                                    Tiền mặt
                                </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    value="bank"
                                    checked={paymentSource === "bank"}
                                    onChange={(e) => setPaymentSource(e.target.value)}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-slate-900 dark:text-white">
                                    Ngân hàng
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Ngày giao dịch
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-lg text-sm sm:text-base text-slate-900 dark:text-white transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500"
                            required
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Nội dung
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-lg text-sm sm:text-base text-slate-900 dark:text-white transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 resize-none"
                            placeholder="Ghi chú về giao dịch..."
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2 sm:gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg text-sm sm:text-base font-medium transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm sm:text-base font-medium transition-colors"
                        >
                            Cập nhật
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Delete Confirmation Modal Component
export const DeleteConfirmModal: React.FC<{
    transaction: CashTransaction;
    onClose: () => void;
    onConfirm: () => void;
}> = ({ transaction, onClose, onConfirm }) => {
    const isIncome =
        transaction.type === "income" || transaction.type === "deposit";

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700">
                <div className="p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                        <svg
                            className="w-6 h-6 text-red-600 dark:text-red-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>

                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white text-center mb-2">
                        Xác nhận xóa giao dịch
                    </h3>

                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                Loại:
                            </span>
                            <span
                                className={`text-sm font-medium ${isIncome ? "text-green-600" : "text-red-600"
                                    }`}
                            >
                                {isIncome ? "Thu" : "Chi"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                Số tiền:
                            </span>
                            <span
                                className={`text-sm font-bold ${isIncome ? "text-green-600" : "text-red-600"
                                    }`}
                            >
                                {isIncome ? "+" : "-"}
                                {formatCurrency(Math.abs(transaction.amount))}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                Ngày:
                            </span>
                            <span className="text-sm text-slate-900 dark:text-white">
                                {formatDate(new Date(transaction.date))}
                            </span>
                        </div>
                        {transaction.notes && (
                            <div className="flex justify-between items-start">
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    Nội dung:
                                </span>
                                <span className="text-sm text-slate-900 dark:text-white text-right max-w-[60%]">
                                    {transaction.notes}
                                </span>
                            </div>
                        )}
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-6">
                        Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa giao
                        dịch này?
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Xóa
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
