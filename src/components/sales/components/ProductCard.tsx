import React from "react";
import type { Part, CartItem } from "../../../types";
import type { CategoryColors } from "../utils/categoryColors";
import { formatCurrency } from "../../../utils/format";
import { ShoppingCart, Package } from "lucide-react";
import { getAvailableStock } from "../../../lib/repository/partsRepository";

interface ProductCardProps {
    part: Part;
    currentBranchId: string;
    inCart: boolean;
    onAddToCart: (part: Part) => void;
    getCategoryColor: (category: string | undefined) => CategoryColors;
}

/**
 * Product card component for displaying a single product
 */
export const ProductCard: React.FC<ProductCardProps> = ({
    part,
    currentBranchId,
    inCart,
    onAddToCart,
    getCategoryColor,
}) => {
    const stock = getAvailableStock(part, currentBranchId);
    const price = part.retailPrice?.[currentBranchId] ?? 0;
    const wholesalePrice = part.wholesalePrice?.[currentBranchId] ?? 0;
    const isOutOfStock = stock <= 0;
    const isLowStock = stock > 0 && stock <= 5;
    const colors = getCategoryColor(part.category);

    return (
        <div
            onClick={() => !isOutOfStock && onAddToCart(part)}
            className={`group relative bg-white dark:bg-slate-800 rounded-xl border-2 transition-all duration-200 overflow-hidden ${isOutOfStock
                ? "border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed"
                : inCart
                    ? "border-blue-400 dark:border-blue-500 shadow-lg shadow-blue-500/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-xl hover:shadow-slate-500/10 cursor-pointer active:scale-98"
                }`}
        >
            {/* In Cart Indicator */}
            {inCart && !isOutOfStock && (
                <div className="absolute top-2 right-2 z-10">
                    <div className="bg-blue-500 text-white rounded-full p-1.5 shadow-lg">
                        <ShoppingCart className="w-4 h-4" />
                    </div>
                </div>
            )}

            {/* Out of Stock Badge */}
            {isOutOfStock && (
                <div className="absolute top-2 right-2 z-10">
                    <div className="bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-md shadow-md">
                        Hết hàng
                    </div>
                </div>
            )}

            {/* Low Stock Badge */}
            {isLowStock && !inCart && (
                <div className="absolute top-2 right-2 z-10">
                    <div className="bg-amber-500 text-white text-xs font-semibold px-2 py-1 rounded-md shadow-md">
                        Sắp hết
                    </div>
                </div>
            )}

            <div className="p-3 md:p-4 space-y-2 md:space-y-3">


                {/* Product Name */}
                <div className="min-h-[48px]">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-2 leading-tight">
                        {part.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                        {part.sku}
                    </p>
                </div>

                {/* Category Badge */}
                {part.category && (
                    <div className="flex items-center gap-2">
                        <span
                            className="inline-block px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-[10px] font-medium text-slate-500 dark:text-slate-400"
                        >
                            {part.category}
                        </span>
                    </div>
                )}

                {/* Price */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-slate-900 dark:text-white leading-none">
                                {formatCurrency(price)}
                            </span>
                            {wholesalePrice > 0 && wholesalePrice !== price && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                    Sỉ: {formatCurrency(wholesalePrice)}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-col items-end">
                            <span
                                className={`text-[11px] font-medium ${isOutOfStock
                                    ? "text-red-500"
                                    : isLowStock
                                        ? "text-amber-500"
                                        : "text-slate-500 dark:text-slate-400"
                                    }`}
                            >
                                Tồn: {stock}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hover Effect */}
            {!isOutOfStock && (
                <div className="absolute inset-0 bg-slate-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            )}
        </div>
    );
};
