import React from "react";
import { Truck } from "lucide-react";
import { CartSummary } from "../CartSummary";
import { PaymentMethodSelector } from "../PaymentMethodSelector";
import { InstallmentSetupModal } from "../../modals/InstallmentSetupModal";
import { NumberInput } from "../../../common/NumberInput";
import { formatCurrency } from "../../../../utils/format";

interface CheckoutSectionProps {
    subtotal: number;
    discount: number;
    total: number;
    discountType: "amount" | "percent";
    discountPercent: number;
    onDiscountChange: (discount: number) => void;
    onDiscountTypeChange: (type: "amount" | "percent") => void;
    onDiscountPercentChange: (percent: number) => void;

    paymentMethod: "cash" | "bank" | "card" | null;
    paymentType: "partial" | "note" | "full" | "installment" | null;
    partialAmount: number;
    onPaymentMethodChange: (method: "cash" | "bank" | "card" | null) => void;
    onPaymentTypeChange: (type: "partial" | "note" | "full" | "installment" | null) => void;
    onPartialAmountChange: (amount: number) => void;

    showInstallmentModal: boolean;
    setShowInstallmentModal: (show: boolean) => void;
    installmentDetails: any;
    onSaveInstallmentDetails: (details: any) => void;

    // Delivery settings
    deliveryMethod: "store_pickup" | "cod" | null;
    setDeliveryMethod: (method: "store_pickup" | "cod" | null) => void;
    deliveryAddress: string;
    setDeliveryAddress: (address: string) => void;
    deliveryPhone: string;
    setDeliveryPhone: (phone: string) => void;
    trackingNumber: string;
    setTrackingNumber: (trackingNum: string) => void;
    shippingCarrier: string;
    setShippingCarrier: (carrier: string) => void;
    shippingFee: number;
    setShippingFee: (fee: number) => void;

    // Options (time, note, print)
    useCurrentTime: boolean;
    setUseCurrentTime: (val: boolean) => void;
    customSaleTime: string;
    setCustomSaleTime: (val: string) => void;
    showOrderNote: boolean;
    setShowOrderNote: (val: boolean) => void;
    autoPrintReceipt: boolean;
    setAutoPrintReceipt: (val: boolean) => void;
    orderNote: string;
    setOrderNote: (note: string) => void;

    // Action buttons
    onSaveDraft: () => void;
    onFinalize: () => void;
    isProcessing: boolean;
    editingSaleId: string | null;
    canUpdateSale: boolean;
    canCreateSale: boolean;

    // Employee selection
    selectedEmployeeId: string | null;
    employees: { id: string; full_name?: string; name?: string; is_active?: boolean }[];
    onEmployeeChange: (id: string | null) => void;
}

export const CheckoutSection: React.FC<CheckoutSectionProps> = ({
    subtotal,
    discount,
    total,
    discountType,
    discountPercent,
    onDiscountChange,
    onDiscountTypeChange,
    onDiscountPercentChange,

    paymentMethod,
    paymentType,
    partialAmount,
    onPaymentMethodChange,
    onPaymentTypeChange,
    onPartialAmountChange,

    showInstallmentModal,
    setShowInstallmentModal,
    installmentDetails,
    onSaveInstallmentDetails,

    deliveryMethod,
    setDeliveryMethod,
    deliveryAddress,
    setDeliveryAddress,
    deliveryPhone,
    setDeliveryPhone,
    trackingNumber,
    setTrackingNumber,
    shippingCarrier,
    setShippingCarrier,
    shippingFee,
    setShippingFee,

    useCurrentTime,
    setUseCurrentTime,
    customSaleTime,
    setCustomSaleTime,
    showOrderNote,
    setShowOrderNote,
    autoPrintReceipt,
    setAutoPrintReceipt,
    orderNote,
    setOrderNote,

    onSaveDraft,
    onFinalize,
    isProcessing,
    editingSaleId,
    canUpdateSale,
    canCreateSale,
    selectedEmployeeId,
    employees,
    onEmployeeChange,
}) => {
    const [cashReceived, setCashReceived] = React.useState(0);

    const paymentDueNow = React.useMemo(() => {
        if (!paymentType || paymentType === "note") {
            return 0;
        }

        if (paymentType === "partial") {
            return Math.max(0, Math.min(partialAmount || 0, total));
        }

        if (paymentType === "installment") {
            return Math.max(0, Math.min(installmentDetails?.prepaidAmount || 0, total));
        }

        const fullPaymentTotal =
            deliveryMethod === "cod" ? total + Math.max(0, shippingFee || 0) : total;

        return Math.max(0, fullPaymentTotal);
    }, [
        deliveryMethod,
        installmentDetails?.prepaidAmount,
        partialAmount,
        paymentType,
        shippingFee,
        total,
    ]);

    const changeAmount = Math.max(0, cashReceived - paymentDueNow);
    const missingAmount = Math.max(0, paymentDueNow - cashReceived);

    return (
        <>
            <CartSummary
                subtotal={subtotal}
                discount={discount}
                total={total}
                discountType={discountType}
                discountPercent={discountPercent}
                onDiscountChange={onDiscountChange}
                onDiscountTypeChange={onDiscountTypeChange}
                onDiscountPercentChange={onDiscountPercentChange}
            />

            {/* Employee Selection */}
            <div className="mt-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Nhân viên bán
                    </label>
                    <select
                        value={selectedEmployeeId || ""}
                        onChange={(e) => onEmployeeChange(e.target.value || null)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    >
                        <option value="">-- Chọn nhân viên --</option>
                        {employees
                            .filter((e) => e.is_active !== false)
                            .map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.full_name || emp.name || emp.id}
                                </option>
                            ))}
                    </select>
                </div>
            </div>

            {/* Payment Selection */}
            <div className="mt-4" id="checkout-payment-section">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <PaymentMethodSelector
                        paymentMethod={paymentMethod}
                        paymentType={paymentType}
                        partialAmount={partialAmount}
                        total={total}
                        onPaymentMethodChange={onPaymentMethodChange}
                        onPaymentTypeChange={(type) => {
                            onPaymentTypeChange(type);
                            if (type === "installment") {
                                setShowInstallmentModal(true);
                            }
                        }}
                        onPartialAmountChange={onPartialAmountChange}
                        onOpenInstallmentSetup={() => setShowInstallmentModal(true)}
                        installmentDetails={installmentDetails}
                    />

                    {paymentMethod === "cash" && paymentDueNow > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                    Cần thu
                                </span>
                                <span className="font-black text-slate-900 dark:text-white">
                                    {formatCurrency(paymentDueNow)}
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Khách đưa
                                </label>
                                <NumberInput
                                    placeholder="Nhập số tiền khách đưa"
                                    value={cashReceived || ""}
                                    onChange={(val) => setCashReceived(Math.max(0, val))}
                                    allowNegative={false}
                                    allowDecimal={false}
                                    className="w-full px-4 py-2.5 text-right text-sm font-black bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                />
                            </div>

                            <div
                                className={`rounded-2xl border px-4 py-3 ${
                                    cashReceived > 0 && missingAmount > 0
                                        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                                        : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span
                                        className={`text-sm font-black uppercase tracking-wide ${
                                            cashReceived > 0 && missingAmount > 0
                                                ? "text-amber-700 dark:text-amber-300"
                                                : "text-emerald-700 dark:text-emerald-300"
                                        }`}
                                    >
                                        {cashReceived > 0 && missingAmount > 0 ? "Còn thiếu" : "Tiền thối lại"}
                                    </span>
                                    <span
                                        className={`text-xl font-black ${
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
            </div>

            <InstallmentSetupModal
                isOpen={showInstallmentModal}
                onClose={() => setShowInstallmentModal(false)}
                totalAmount={total}
                onSave={onSaveInstallmentDetails}
                initialDetails={installmentDetails}
            />

            {/* Delivery Form Section */}
            {paymentMethod && (
                <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Giao hàng
                    </h4>

                    {/* Pickup vs Delivery Toggle */}
                    <div className="flex gap-4 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                checked={deliveryMethod !== "cod"}
                                onChange={() => setDeliveryMethod("store_pickup")}
                                className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75v-2.25a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v2.25c0 .414.336.75.75.75z" /></svg>Tự lấy</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                checked={deliveryMethod === "cod"}
                                onChange={() => setDeliveryMethod("cod")}
                                className="w-4 h-4 text-orange-600"
                            />
                            <span className="text-sm flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>Giao hàng COD</span>
                        </label>
                    </div>

                    {/* Delivery Form (if COD selected) */}
                    {deliveryMethod === "cod" && (
                        <div className="space-y-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                            <div>
                                <label className="block text-xs font-medium mb-1">
                                    Địa chỉ <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={deliveryAddress}
                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                    placeholder="Nhập địa chỉ giao hàng"
                                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">SĐT nhận hàng</label>
                                <input
                                    type="tel"
                                    value={deliveryPhone}
                                    onChange={(e) => setDeliveryPhone(e.target.value)}
                                    placeholder="Số điện thoại"
                                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Mã vận đơn</label>
                                <input
                                    type="text"
                                    value={trackingNumber || ''}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="Nhập mã vận đơn (nếu có)"
                                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Đơn vị vận chuyển</label>
                                <select
                                    value={["GHTK", "GHN", "ViettelPost", "VNPost", "J&T", "NinjaVan", "BestExpress", "ShopeeXpress", "SuperShip", "Nasco", "EMS", "Ahamove", "GrabExpress"].includes(shippingCarrier || '') ? shippingCarrier : (shippingCarrier ? "Other" : "")}
                                    onChange={(e) => {
                                        if (e.target.value === "Other") {
                                            setShippingCarrier("other");
                                        } else {
                                            setShippingCarrier(e.target.value);
                                        }
                                    }}
                                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700"
                                >
                                    <option value="">-- Chọn đơn vị --</option>
                                    <option value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</option>
                                    <option value="GHN">Giao Hàng Nhanh (GHN)</option>
                                    <option value="ViettelPost">Viettel Post</option>
                                    <option value="VNPost">VNPost</option>
                                    <option value="J&T">J&T Express</option>
                                    <option value="NinjaVan">Ninja Van</option>
                                    <option value="BestExpress">Best Express</option>
                                    <option value="ShopeeXpress">Shopee Xpress (SPX)</option>
                                    <option value="SuperShip">SuperShip</option>
                                    <option value="Nasco">Nasco Express</option>
                                    <option value="EMS">EMS (Bưu điện)</option>
                                    <option value="Ahamove">Ahamove</option>
                                    <option value="GrabExpress">Grab Express</option>
                                    <option value="Other">Khác (Nhập tay)</option>
                                </select>
                                {shippingCarrier && !["GHTK", "GHN", "ViettelPost", "VNPost", "J&T", "NinjaVan", "BestExpress", "ShopeeXpress", "SuperShip", "Nasco", "EMS", "Ahamove", "GrabExpress"].includes(shippingCarrier) && (
                                    <input
                                        type="text"
                                        autoFocus
                                        value={shippingCarrier === "other" ? "" : shippingCarrier}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setShippingCarrier(val === "" ? "other" : val);
                                        }}
                                        placeholder="Nhập tên đơn vị vận chuyển..."
                                        className="mt-2 w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 border-blue-500 ring-1 ring-blue-500"
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Phí ship</label>
                                <input
                                    type="number"
                                    value={shippingFee || ''}
                                    onChange={(e) => setShippingFee(Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700"
                                />
                            </div>
                            <div className="pt-2 border-t border-orange-300 dark:border-orange-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">COD cần thu:</span>
                                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                        {formatCurrency(total + (shippingFee || 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Options Section - Time, Note, Auto-print */}
            {paymentMethod && paymentType && (
                <div className="mt-4 px-3 md:px-4 space-y-3">
                    {/* Time Options */}
                    <div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                            Thời gian bán hàng
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setUseCurrentTime(true)}
                                className={`px-3 py-2 rounded-lg border transition-all font-semibold ${useCurrentTime
                                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                    : "border-slate-200 dark:border-slate-700 bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}
                            >
                                <span className="text-xs flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Hiện tại</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setUseCurrentTime(false)}
                                className={`px-3 py-2 rounded-lg border transition-all font-semibold ${!useCurrentTime
                                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                    : "border-slate-200 dark:border-slate-700 bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}
                            >
                                <span className="text-xs flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>Tùy chỉnh</span>
                            </button>
                        </div>
                        {!useCurrentTime && (
                            <input
                                type="datetime-local"
                                value={customSaleTime}
                                onChange={(e) => setCustomSaleTime(e.target.value)}
                                className="mt-2 w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700"
                            />
                        )}
                    </div>

                    {/* Note & Auto-print Toggles */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setShowOrderNote(!showOrderNote)}
                            className={`px-3 py-2 rounded-lg border transition-all font-semibold ${showOrderNote
                                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                                : "border-slate-200 dark:border-slate-700 bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                }`}
                        >
                            <span className="text-xs flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>Ghi chú</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setAutoPrintReceipt(!autoPrintReceipt)}
                            className={`px-3 py-2 rounded-lg border transition-all font-semibold ${autoPrintReceipt
                                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                                : "border-slate-200 dark:border-slate-700 bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                }`}
                        >
                            <span className="text-xs flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>In hoá đơn</span>
                        </button>
                    </div>

                    {/* Note Textarea */}
                    {showOrderNote && (
                        <textarea
                            value={orderNote}
                            onChange={(e) => setOrderNote(e.target.value)}
                            placeholder="Nhập ghi chú cho đơn hàng..."
                            rows={3}
                            className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 resize-none"
                        />
                    )}
                </div>
            )}

            {/* Action Buttons - Save Draft + Finalize */}
            <div className="mt-4 p-3 md:p-4 pt-0 flex gap-3">
                <button
                    onClick={onSaveDraft}
                    className="flex-1 px-4 py-3 flex items-center justify-center gap-2 bg-transparent border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium rounded-xl transition-all text-sm"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                    Lưu nháp
                </button>
                <button
                    onClick={onFinalize}
                    disabled={isProcessing || !paymentMethod || !paymentType || (editingSaleId ? !canUpdateSale : !canCreateSale)}
                    className={`flex-[1.5] px-4 py-3 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 ${paymentMethod && paymentType
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:scale-[1.01]"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed opacity-60"
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {isProcessing ? "Đang xử lý..." : editingSaleId ? "Cập nhật" : "Xuất bán"}
                </button>
            </div>
        </>
    );
};
