import React from "react";
import type { Part } from "../../../types";
import { formatCurrency } from "../../../utils/format";
import { ShoppingCart, Package, X } from "lucide-react";
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
    const [showZoom, setShowZoom] = React.useState(false);

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

            {/* Product Image */}
            <div className={`aspect-square w-full flex items-center justify-center border-b border-slate-100 dark:border-slate-700/50 relative overflow-hidden select-none ${
                part.imageUrl ? "bg-white" : "bg-slate-50 dark:bg-[#0B0F19]/40"
            }`}>
                {part.imageUrl ? (
                    <img
                        src={part.imageUrl}
                        alt={part.name}
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowZoom(true);
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Package className="w-5 h-5 text-slate-350 dark:text-slate-650" />
                        <span className="text-[9px] font-bold text-slate-405 dark:text-slate-500 uppercase tracking-wider">No Image</span>
                    </div>
                )}
            </div>

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
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1.5">
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 leading-none truncate">
                                {formatCurrency(price)}
                            </span>
                            {wholesalePrice > 0 && wholesalePrice !== price && (
                                <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                                    Sỉ: {formatCurrency(wholesalePrice)}
                                </span>
                            )}
                        </div>
                        <span
                            className={`text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full self-start sm:self-auto whitespace-nowrap ${isOutOfStock
                                ? "text-red-50 bg-red-500 dark:bg-red-600"
                                : isLowStock
                                    ? "text-amber-50 bg-amber-500 dark:bg-amber-600"
                                    : "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 font-semibold"
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

            {/* Zoom Overlay Modal */}
            {showZoom && part.imageUrl && (
                <div
                    className="fixed inset-0 bg-black/90 z-[9999] flex flex-col items-center justify-center p-4"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowZoom(false);
                    }}
                >
                    {/* Close button */}
                    <button
                        className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white z-10"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowZoom(false);
                        }}
                        aria-label="Đóng ảnh"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    
                    {/* Zoomed Image Container */}
                    <div className="relative max-w-full max-h-[80vh] flex items-center justify-center rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-2xl p-2 animate-[scaleIn_0.25s_ease-out_1]">
                        <img
                            src={part.imageUrl}
                            alt={part.name}
                            className="max-w-full max-h-[75vh] object-contain rounded-xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    
                    {/* Product Name */}
                    <div className="mt-4 text-center max-w-md px-4">
                        <h4 className="text-white font-bold text-sm line-clamp-2 leading-snug">
                            {part.name}
                        </h4>
                        <p className="text-slate-400 text-xs mt-1">
                            Nhấn bất kỳ đâu để đóng
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
