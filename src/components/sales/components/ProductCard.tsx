import React from "react";
import type { Part } from "../../../types";
import { formatCurrency } from "../../../utils/format";
import { ShoppingCart } from "lucide-react";
import { getAvailableStock } from "../../../lib/repository/partsRepository";

interface ProductCardProps {
    part: Part;
    currentBranchId: string;
    inCart: boolean;
    onAddToCart: (part: Part) => void;
}

/**
 * Product card component for displaying a single product
 */
export const ProductCard: React.FC<ProductCardProps> = ({
    part,
    currentBranchId,
    inCart,
    onAddToCart,
}) => {
    const stock = getAvailableStock(part, currentBranchId);
    const price = part.retailPrice?.[currentBranchId] ?? 0;
    const wholesalePrice = part.wholesalePrice?.[currentBranchId] ?? 0;
    const isOutOfStock = stock <= 0;
    const isLowStock = stock > 0 && stock <= 5;

    return (
        <div
            onClick={() => !isOutOfStock && onAddToCart(part)}
            className={`group relative bg-white dark:bg-slate-800 rounded-xl border transition-all duration-200 overflow-hidden ${isOutOfStock
                ? "border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed"
                : inCart
                    ? "border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/50"
                    : "border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer active:scale-[0.98]"
                }`}
        >
            {/* In Cart Indicator */}
            {inCart && !isOutOfStock && (
                <div className="absolute top-2.5 right-2.5 z-10">
                    <div className="bg-blue-500 text-white rounded-full p-1.5 shadow-lg animate-[bounce_1s_ease-in-out_1]">
                        <ShoppingCart className="w-3.5 h-3.5" />
                    </div>
                </div>
            )}

            {/* Top accent bar for items in cart */}
            {inCart && (
                <div className="h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            )}

            <div className="p-3 md:p-4 space-y-2 md:space-y-2.5">
                {/* Product Name */}
                <div className="min-h-[44px]">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">
                        {part.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono tracking-wide">
                        {part.sku}
                    </p>
                </div>

                {/* Category Badge */}
                {part.category && (
                    <span className="inline-block text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-md">
                        {part.category}
                    </span>
                )}

                {/* Price & Stock */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 leading-none">
                                {formatCurrency(price)}
                            </span>
                            {wholesalePrice > 0 && wholesalePrice !== price && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                    Sỉ: {formatCurrency(wholesalePrice)}
                                </span>
                            )}
                        </div>
                        <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isOutOfStock
                                ? "text-red-50 bg-red-500 dark:bg-red-600"
                                : isLowStock
                                    ? "text-amber-50 bg-amber-500 dark:bg-amber-600"
                                    : "text-slate-500 dark:text-slate-400 font-semibold"
                                }`}
                        >
                            {isOutOfStock ? "Hết hàng" : isLowStock ? `Còn ${stock}` : `Tồn: ${stock}`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Hover Overlay */}
            {!isOutOfStock && (
                <div className="absolute inset-0 bg-blue-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            )}
        </div>
    );
};
