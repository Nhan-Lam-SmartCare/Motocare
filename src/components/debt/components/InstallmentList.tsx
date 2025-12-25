import React, { useState } from "react";
import { CreditCard, Calendar, DollarSign, Phone, User, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "../../../utils/format";
import { useInstallments, useRecordInstallmentPayment, type SalesInstallment } from "../../../hooks/useInstallments";
import { showToast } from "../../../utils/toast";

// Payment modal for collecting installment payment
const InstallmentPaymentModal: React.FC<{
    installment: SalesInstallment;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ installment, onClose, onSuccess }) => {
    const [amount, setAmount] = useState(installment.installment_amount);
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("cash");
    const recordPayment = useRecordInstallmentPayment();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0) {
            showToast.error("Vui lòng nhập số tiền hợp lệ");
            return;
        }

        try {
            await recordPayment.mutateAsync({
                installmentId: installment.id,
                amount,
                paymentMethod,
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error recording payment:", error);
        }
    };

    const currentInstallment = installment.current_installment + 1;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Thu tiền trả góp</h2>
                            <p className="text-white/80 text-sm">Ghi nhận thanh toán kỳ {currentInstallment}</p>
                        </div>
                    </div>
                </div>

                {/* Customer info */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-700">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs text-slate-500 mb-1">Khách hàng</p>
                            <p className="font-bold text-slate-900 dark:text-white">{installment.customer_name}</p>
                            {installment.customer_phone && (
                                <div className="flex items-center gap-1 mt-1 text-sm text-slate-500">
                                    <Phone className="w-3 h-3" />
                                    {installment.customer_phone}
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold">
                                Kỳ {currentInstallment}/{installment.num_installments}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <p className="text-xs text-slate-500">Đơn hàng</p>
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{installment.sale_id}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Mỗi kỳ</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(installment.installment_amount)}</p>
                        </div>
                    </div>

                    <div className="mt-3 pt-3 border-t dark:border-slate-700">
                        <p className="text-xs text-slate-500">Còn phải trả</p>
                        <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(installment.remaining_amount)}</p>
                    </div>
                </div>

                {/* Payment form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Amount */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            <DollarSign className="w-4 h-4" />
                            Số tiền thanh toán
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="w-full px-4 py-3 text-lg font-bold border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                        />
                        <div className="flex gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setAmount(installment.installment_amount)}
                                className="flex-1 py-2 text-sm rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 transition-colors"
                            >
                                Đúng kỳ ({formatCurrency(installment.installment_amount)})
                            </button>
                            <button
                                type="button"
                                onClick={() => setAmount(installment.remaining_amount)}
                                className="flex-1 py-2 text-sm rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 transition-colors"
                            >
                                Tất toán ({formatCurrency(installment.remaining_amount)})
                            </button>
                        </div>
                    </div>

                    {/* Payment method */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            <CreditCard className="w-4 h-4" />
                            Phương thức thanh toán
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod("cash")}
                                className={`py-3 px-4 rounded-xl border-2 transition-all ${paymentMethod === "cash"
                                        ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                                    }`}
                            >
                                <div className="font-bold">💵 Tiền mặt</div>
                                <div className="text-xs opacity-60">Cash</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod("bank")}
                                className={`py-3 px-4 rounded-xl border-2 transition-all ${paymentMethod === "bank"
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                                    }`}
                            >
                                <div className="font-bold">🏦 Chuyển khoản</div>
                                <div className="text-xs opacity-60">Bank Transfer</div>
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={recordPayment.isPending}
                            className="py-3 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold flex items-center justify-center gap-2 hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50"
                        >
                            {recordPayment.isPending ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : (
                                <>✓ Xác nhận thanh toán</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Main component
const InstallmentList: React.FC = () => {
    const { data: installments = [], isLoading } = useInstallments();
    const [selectedInstallment, setSelectedInstallment] = useState<SalesInstallment | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Statistics
    const stats = {
        total: installments.reduce((sum, item) => sum + item.remaining_amount, 0),
        activeCount: installments.filter(i => i.status === "active").length,
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return <span className="px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold">Đang trả góp</span>;
            case "completed":
                return <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">Đã hoàn tất</span>;
            case "overdue":
                return <span className="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold">Quá hạn</span>;
            default:
                return <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold">{status}</span>;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-3 text-secondary-text">Đang tải dữ liệu trả góp...</span>
            </div>
        );
    }

    return (
        <div className="p-2 md:p-6">
            {/* Stats card */}
            <div className="mb-4 p-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-white/80">Tổng còn phải thu</p>
                        <p className="text-2xl font-bold">{formatCurrency(stats.total)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-white/80">{stats.activeCount} khoản đang trả góp</p>
                    </div>
                </div>
            </div>

            {installments.length === 0 ? (
                <div className="text-center py-12 text-tertiary-text">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Chưa có đơn hàng trả góp nào.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Header Row */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <div className="col-span-3">Khách hàng</div>
                        <div className="col-span-2">Kỳ hạn</div>
                        <div className="col-span-2">Trạng thái</div>
                        <div className="col-span-2 text-right">Tổng tiền</div>
                        <div className="col-span-2 text-right">Còn lại</div>
                        <div className="col-span-1"></div>
                    </div>

                    {installments.map((item) => (
                        <div
                            key={item.id}
                            className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center bg-primary-bg border border-primary-border rounded-lg p-4 hover:border-purple-500 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => {
                                setSelectedInstallment(item);
                                setShowPaymentModal(true);
                            }}
                        >
                            {/* Customer */}
                            <div className="col-span-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                        <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white">{item.customer_name}</div>
                                        <div className="text-xs text-blue-600 dark:text-blue-400">Đơn: {item.sale_id}</div>
                                        <div className="text-xs text-slate-500">Bắt đầu: {formatDate(item.start_date)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Term */}
                            <div className="col-span-2">
                                <div className="text-sm font-bold text-slate-900 dark:text-white">
                                    {item.current_installment}/{item.num_installments} kỳ
                                </div>
                                <div className="text-xs text-purple-600 dark:text-purple-400">
                                    Mỗi kỳ: {formatCurrency(item.installment_amount)}
                                </div>
                                {item.interest_rate > 0 && (
                                    <div className="text-xs text-slate-500">Lãi suất: {item.interest_rate}%</div>
                                )}
                                {item.next_payment_date && (
                                    <div className="text-xs text-slate-500">Kỳ tiếp: {formatDate(item.next_payment_date)}</div>
                                )}
                            </div>

                            {/* Status */}
                            <div className="col-span-2">
                                {getStatusBadge(item.status)}
                            </div>

                            {/* Total */}
                            <div className="col-span-2 text-right">
                                <div className="text-sm text-slate-900 dark:text-white font-medium">
                                    {formatCurrency(item.total_with_interest)}
                                </div>
                                <div className="text-xs text-slate-500">
                                    Trả trước: {formatCurrency(item.prepaid_amount)}
                                </div>
                            </div>

                            {/* Remaining */}
                            <div className="col-span-2 text-right">
                                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                                    {formatCurrency(item.remaining_amount)}
                                </div>
                            </div>

                            {/* Action */}
                            <div className="col-span-1 flex justify-end">
                                {item.status === "active" && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedInstallment(item);
                                            setShowPaymentModal(true);
                                        }}
                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                                    >
                                        $ Thu tiền
                                    </button>
                                )}
                                <ChevronRight className="w-5 h-5 text-slate-400 ml-2 hidden md:block" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && selectedInstallment && (
                <InstallmentPaymentModal
                    installment={selectedInstallment}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setSelectedInstallment(null);
                    }}
                    onSuccess={() => {
                        showToast.success("Đã ghi nhận thanh toán kỳ trả góp!");
                    }}
                />
            )}
        </div>
    );
};

export default InstallmentList;
