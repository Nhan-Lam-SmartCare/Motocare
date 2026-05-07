import React from "react";
import type { CartItem } from "../../../types";
import { formatCurrency } from "../../../utils/format";
import { Trash2, Package } from "lucide-react";
import { NumberInput } from "../../common/NumberInput";

interface CartItemRowProps {
    item: CartItem;
    onUpdateQuantity: (partId: string, quantity: number) => void;
    onUpdatePrice: (partId: string, price: number) => void;
    onRemove: (partId: string) => void;
}

/**
 * Cart item row component - Compact design matching original
 */
export const CartItemRow: React.FC<CartItemRowProps> = ({
    item,
    onUpdateQuantity,
    onUpdatePrice,
    onRemove,
}) => {
    const itemTotal = item.sellingPrice * item.quantity;

    return (
        <div className="group relative p-3 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50 hover:border-blue-300 dark:hover:border-blue-700/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300">
            {/* Top Row: Icon, Name, Delete */}
            <div className="flex items-start gap-3 mb-3">
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                    <Package className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.partName}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {item.sku}
                        </span>
                        {item.stockSnapshot <= 5 && (
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-black uppercase">
                                Sắp hết hàng
                            </span>
                        )}
                    </div>
                </div>

                {/* Delete Button */}
                <button
                    onClick={() => onRemove(item.partId)}
                    className="p-1.5 text-slate-300 dark:text-slate-700 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                    title="Xóa"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Bottom Row: Quantity + Price inline */}
            <div className="flex items-center gap-3">
                {/* Quantity Controls - Compact */}
                <div className="flex items-center bg-slate-50 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-100 dark:border-slate-700">
                    <button
                        onClick={() => onUpdateQuantity(item.partId, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-700 hover:bg-rose-500 hover:text-white rounded-lg transition-all font-black text-sm shadow-sm active:scale-90 disabled:opacity-30"
                        disabled={item.quantity <= 1}
                    >
                        −
                    </button>
                    <span className="w-9 text-center font-black text-sm text-slate-900 dark:text-white">
                        {item.quantity}
                    </span>
                    <button
                        onClick={() => onUpdateQuantity(item.partId, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-700 hover:bg-blue-600 hover:text-white rounded-lg transition-all font-black text-sm shadow-sm active:scale-90 disabled:opacity-30"
                        disabled={item.quantity >= item.stockSnapshot}
                    >
                        +
                    </button>
                </div>

                {/* Price - Compact */}
                <div className="flex-1 relative">
                    <NumberInput
                        value={item.sellingPrice}
                        onChange={(val: number) => onUpdatePrice(item.partId, val || 0)}
                        className="w-full pl-3 pr-2 py-1.5 text-sm font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right outline-none"
                        allowNegative
                    />
                </div>

                {/* Item Total */}
                <div className="text-right min-w-[90px]">
                    <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                        {formatCurrency(itemTotal)}
                    </span>
                </div>
            </div>
        </div>
    );
};
