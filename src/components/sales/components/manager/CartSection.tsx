import React from "react";
import { Plus } from "lucide-react";
import { CartItemRow } from "../CartItemRow";
import { CustomerSelector } from "../CustomerSelector";
import { NumberInput } from "../../../common/NumberInput";
import type { Customer } from "../../../../types";

interface CartSectionProps {
    cartItems: any[];
    isWholesaleMode: boolean;
    hasDraft: boolean;
    onRestoreDraftManual: () => void;
    showManualItemForm: boolean;
    setShowManualItemForm: (show: boolean | ((prev: boolean) => boolean)) => void;
    manualItemName: string;
    setManualItemName: (name: string) => void;
    manualItemCost: number;
    setManualItemCost: (cost: number) => void;
    manualItemPrice: number;
    setManualItemPrice: (price: number) => void;
    manualItemQty: number;
    setManualItemQty: (qty: number) => void;
    onResetManualItemForm: () => void;
    onAddManualItem: () => void;
    
    // Customer Selection Props
    selectedCustomer: Customer | null;
    filteredCustomers: Customer[];
    customerSearch: string;
    showCustomerDropdown: boolean;
    setCustomerSearch: (search: string) => void;
    setSelectedCustomer: (customer: Customer | null) => void;
    setShowAddCustomerModal: (show: boolean) => void;
    setShowEditCustomerModal: (show: boolean) => void;
    setShowCustomerDropdown: (show: boolean) => void;
    isSearchingCustomer: boolean;
    hasMoreCustomers: boolean;
    onLoadMoreCustomers: () => void;

    // Cart Actions
    onUpdateCartQuantity: (partId: string, quantity: number) => void;
    onUpdateCartPrice: (partId: string, price: number) => void;
    onRemoveFromCart: (partId: string) => void;
}

export const CartSection: React.FC<CartSectionProps> = ({
    cartItems,
    isWholesaleMode,
    hasDraft,
    onRestoreDraftManual,
    showManualItemForm,
    setShowManualItemForm,
    manualItemName,
    setManualItemName,
    manualItemCost,
    setManualItemCost,
    manualItemPrice,
    setManualItemPrice,
    manualItemQty,
    setManualItemQty,
    onResetManualItemForm,
    onAddManualItem,

    selectedCustomer,
    filteredCustomers,
    customerSearch,
    showCustomerDropdown,
    setCustomerSearch,
    setSelectedCustomer,
    setShowAddCustomerModal,
    setShowEditCustomerModal,
    setShowCustomerDropdown,
    isSearchingCustomer,
    hasMoreCustomers,
    onLoadMoreCustomers,

    onUpdateCartQuantity,
    onUpdateCartPrice,
    onRemoveFromCart,
}) => {
    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Giỏ hàng</h2>
                    {cartItems.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">{cartItems.length}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isWholesaleMode && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded-full shadow-sm">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v1" /></svg>
                            Sỉ
                        </span>
                    )}
                    {hasDraft && (
                        <button
                            type="button"
                            onClick={onRestoreDraftManual}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-full text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            title="Khôi phục giỏ hàng nháp"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 4.79M9 11l3 3L22 4" /></svg>
                            Khôi phục nháp
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowManualItemForm((prev) => !prev)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-xs font-bold hover:bg-amber-200 transition-colors"
                    >
                        <Plus className="w-3 h-3" />
                        Ngoài kho
                    </button>
                </div>
            </div>

            {showManualItemForm && (
                <div className="mb-4 rounded-2xl border border-amber-300/80 bg-gradient-to-b from-amber-50 to-amber-100/70 dark:from-amber-900/25 dark:to-amber-900/10 dark:border-amber-700 p-3 md:p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-amber-900 dark:text-amber-200">
                            Thêm hàng ngoài kho
                        </div>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-amber-200/80 dark:bg-amber-800/70 text-amber-900 dark:text-amber-100 font-semibold">
                            Mobile nhanh
                        </span>
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold text-amber-900 dark:text-amber-200 mb-1">
                            Tên hàng
                        </label>
                        <input
                            type="text"
                            value={manualItemName}
                            onChange={(e) => setManualItemName(e.target.value)}
                            placeholder="VD: Thu bình cũ"
                            className="w-full px-3 py-2.5 text-sm border rounded-xl bg-white dark:bg-slate-700"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[11px] font-semibold text-amber-900 dark:text-amber-200 mb-1">
                                Giá nhập
                            </label>
                            <NumberInput
                                value={manualItemCost}
                                onChange={(value) => {
                                    const cost = Math.max(0, Number(value || 0));
                                    setManualItemCost(cost);
                                    setManualItemPrice(Math.round(cost * 1.4));
                                }}
                                placeholder="100000"
                                className="w-full px-3 py-2.5 text-sm border rounded-xl bg-white dark:bg-slate-700 text-right"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-amber-900 dark:text-amber-200 mb-1">
                                Số lượng
                            </label>
                            <input
                                type="number"
                                min={1}
                                value={manualItemQty}
                                onChange={(e) => setManualItemQty(Math.max(1, Number(e.target.value || 1)))}
                                placeholder="1"
                                className="w-full px-3 py-2.5 text-sm border rounded-xl bg-white dark:bg-slate-700 text-right"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold text-amber-900 dark:text-amber-200 mb-1">
                            Giá bán
                        </label>
                        <NumberInput
                            value={manualItemPrice}
                            onChange={(value) => setManualItemPrice(Number(value || 0))}
                            allowNegative
                            placeholder="140000 hoặc -50000"
                            className="w-full px-3 py-2.5 text-sm border rounded-xl bg-white dark:bg-slate-700 text-right"
                        />
                    </div>

                    <div className="text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-200/90 bg-amber-100/70 dark:bg-amber-900/20 rounded-lg px-2.5 py-2 border border-amber-200/70 dark:border-amber-800/60">
                        Nhập giá nhập để tự gợi ý giá bán +40%. Bạn vẫn có thể sửa tay giá bán, kể cả số âm để thu mua lại.
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => {
                                setShowManualItemForm(false);
                                onResetManualItemForm();
                            }}
                            className="w-full px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={onAddManualItem}
                            className="w-full px-3 py-2.5 text-sm font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
                        >
                            Thêm vào giỏ
                        </button>
                    </div>
                </div>
            )}

            {/* Customer Selection */}
            <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Khách hàng</label>
                <CustomerSelector
                    selectedCustomer={selectedCustomer}
                    customers={filteredCustomers}
                    customerSearch={customerSearch}
                    showDropdown={showCustomerDropdown}
                    onSearchChange={setCustomerSearch}
                    onSelect={setSelectedCustomer}
                    onClear={() => setSelectedCustomer(null)}
                    onAddNew={() => setShowAddCustomerModal(true)}
                    onEditCustomer={() => setShowEditCustomerModal(true)}
                    onDropdownToggle={setShowCustomerDropdown}
                    isSearching={isSearchingCustomer}
                    hasMoreCustomers={hasMoreCustomers}
                    onLoadMore={onLoadMoreCustomers}
                />
            </div>

            {/* Cart Items */}
            <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
                {cartItems.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">Giỏ hàng trống</div>
                ) : (
                    cartItems.map((item) => (
                        <CartItemRow
                            key={item.partId}
                            item={item}
                            onUpdateQuantity={onUpdateCartQuantity}
                            onUpdatePrice={onUpdateCartPrice}
                            onRemove={onRemoveFromCart}
                        />
                    ))
                )}
            </div>
        </>
    );
};
