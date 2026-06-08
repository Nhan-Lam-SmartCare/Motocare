import React from "react";
import { ScanLine } from "lucide-react";
import { ProductCard } from "../ProductCard";
import type { Part } from "../../../../types";

interface ProductCatalogSectionProps {
    partSearch: string;
    setPartSearch: (val: string) => void;
    isWholesaleMode: boolean;
    setIsWholesaleMode: (val: boolean) => void;
    showBarcodeInput: boolean;
    setShowBarcodeInput: (val: boolean) => void;
    displayedParts: Part[];
    filteredParts: Part[];
    repoParts: Part[];
    stockFilter: "all" | "low" | "out";
    setStockFilter: (val: "all" | "low" | "out") => void;
    currentBranchId: string;
    cartItemById: Map<string, any>;
    onAddToCart: (part: Part) => void;
    actionFeedback: string | null;
}

export const ProductCatalogSection: React.FC<ProductCatalogSectionProps> = ({
    partSearch,
    setPartSearch,
    isWholesaleMode,
    setIsWholesaleMode,
    showBarcodeInput,
    setShowBarcodeInput,
    displayedParts,
    filteredParts,
    repoParts,
    stockFilter,
    setStockFilter,
    currentBranchId,
    cartItemById,
    onAddToCart,
    actionFeedback,
}) => {
    return (
        <>
            {/* Search Bar with Scan Button + Wholesale Toggle */}
            <div className="mb-3 flex items-center gap-2">
                <div className="flex-1 relative">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Tìm sản phẩm..."
                        value={partSearch}
                        onChange={(e) => setPartSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    />
                </div>
                {/* Mobile Wholesale Toggle */}
                <button
                    type="button"
                    onClick={() => setIsWholesaleMode(!isWholesaleMode)}
                    className={`md:hidden flex items-center gap-1 px-3 py-3 rounded-lg text-xs font-bold transition-all shrink-0 ${isWholesaleMode
                        ? "bg-green-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                    title="Bật/tắt giá sỉ"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {isWholesaleMode && <span>Sỉ</span>}
                </button>
                <button
                    onClick={() => setShowBarcodeInput(!showBarcodeInput)}
                    className="flex items-center gap-2 px-4 py-3 bg-slate-800/80 text-slate-300 rounded-lg hover:text-purple-400 hover:bg-slate-700 transition-all shrink-0 border border-slate-700/50 hover:border-purple-500/30 group"
                >
                    <ScanLine className="w-5 h-5 group-hover:text-purple-400 transition-colors text-slate-400" />
                    <span className="font-medium hidden md:inline">Quét mã</span>
                </button>
            </div>

            {actionFeedback && (
                <div className="mb-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
                    <span className="text-base leading-none">✓</span>
                    <span className="line-clamp-1">{actionFeedback}</span>
                </div>
            )}

            {/* Filter Pills with Counts */}
            <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                    Hiển thị {displayedParts.length} / {filteredParts.length} sản phẩm
                    {partSearch && " theo từ khóa"}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <button
                        type="button"
                        onClick={() => setStockFilter("all")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${stockFilter === "all"
                            ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                            }`}
                    >
                        <span>Tất cả</span>
                        <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${stockFilter === "all"
                                ? "bg-blue-100 dark:bg-blue-500/20"
                                : "bg-slate-200 dark:bg-slate-700"
                                }`}
                        >
                            {repoParts.length}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setStockFilter("low")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${stockFilter === "low"
                            ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                            }`}
                    >
                        <span>Tồn thấp</span>
                        <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${stockFilter === "low"
                                ? "bg-amber-100 dark:bg-amber-500/20"
                                : "bg-slate-200 dark:bg-slate-700"
                                }`}
                        >
                            {repoParts.filter(p => {
                                const stock = Number(p.stock?.[currentBranchId] ?? 0);
                                return stock > 0 && stock <= 5;
                            }).length}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setStockFilter("out")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${stockFilter === "out"
                            ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                            }`}
                    >
                        <span>Hết hàng</span>
                        <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${stockFilter === "out"
                                ? "bg-red-100 dark:bg-red-500/20"
                                : "bg-slate-200 dark:bg-slate-700"
                                }`}
                        >
                            {repoParts.filter(p => {
                                const stock = Number(p.stock?.[currentBranchId] ?? 0);
                                return stock <= 0;
                            }).length}
                        </span>
                    </button>

                    {/* Wholesale Toggle */}
                    <div className="hidden md:block h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <button
                        type="button"
                        onClick={() => setIsWholesaleMode(!isWholesaleMode)}
                        className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${isWholesaleMode
                            ? "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                            }`}
                        title="Bật để tự động áp dụng giá sỉ khi thêm sản phẩm"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v1" /></svg>
                        <span>Giá sỉ</span>
                        {isWholesaleMode && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-green-500/20">
                                ON
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                {displayedParts.map((part) => (
                    <ProductCard
                        key={part.id}
                        part={part}
                        currentBranchId={currentBranchId}
                        inCart={cartItemById.has(part.id)}
                        onAddToCart={onAddToCart}
                    />
                ))}
            </div>
        </>
    );
};
