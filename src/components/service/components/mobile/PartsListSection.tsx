import React from "react";
import { Trash2, Minus, Plus } from "lucide-react";
import { formatCurrency, formatNumberWithDots, parseFormattedNumber } from "../../../../utils/format";

// More flexible type that works with both Part and WorkOrder.partsUsed structure
interface SelectedPart {
    partId: string;
    partName: string;
    quantity: number;
    sellingPrice: number;
    costPrice?: number;
    sku?: string;
    category?: string;
    // Optional Part fields for backward compatibility
    id?: string;
    name?: string;
    stock?: any;
    retailPrice?: any;
}

interface PartsListSectionProps {
    selectedCustomer: any;
    selectedVehicle: any;
    selectedParts: SelectedPart[];
    onRemovePart: (partId: string) => void;
    onUpdatePartQuantity: (partId: string, delta: number) => void;
    onUpdatePartPrice: (partId: string, newPrice: number) => void;
    onShowPartSearch: () => void;
    canEditPriceAndParts: boolean;
}

export const PartsListSection: React.FC<PartsListSectionProps> = ({
    selectedCustomer,
    selectedVehicle,
    selectedParts,
    onRemovePart,
    onUpdatePartQuantity,
    onUpdatePartPrice,
    onShowPartSearch,
    canEditPriceAndParts,
}) => {
    if (!selectedCustomer || !selectedVehicle) return null;

    return (
        <div className="px-4 pb-4 space-y-3">
            <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Phụ tùng sử dụng
                </label>
                {selectedParts.length > 0 && (
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                        {selectedParts.length} món
                    </span>
                )}
            </div>

            {/* Parts List */}
            {selectedParts.length > 0 && (
                <div className="space-y-3">
                    {selectedParts.map((part) => {
                        const partKey = (part as any).partId || part.id;
                        return (
                        <div
                            key={partKey}
                            className="p-3 bg-[#1e1e2d] border border-gray-800 rounded-xl shadow-sm relative group overflow-hidden"
                        >
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                    <div className="mb-2">
                                        <div className="text-base font-bold text-white break-words leading-tight">
                                            {part.name || part.partName || "Tên phụ tùng"}
                                        </div>
                                        {part.sku && (
                                            <div className="text-[11px] text-blue-400 font-mono mt-0.5">
                                                #{part.sku}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemovePart(partKey)}
                                    disabled={!canEditPriceAndParts}
                                    className={`p-2 rounded-lg transition-colors ${canEditPriceAndParts
                                            ? "text-slate-500 hover:text-red-400 hover:bg-red-400/10"
                                            : "text-slate-600 opacity-50 cursor-not-allowed"
                                        }`}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Controls Row */}
                            <div className="flex items-center gap-3">
                                {/* Price Input - Clean Design */}
                                <div className="flex-1 relative">
                                    <label className="text-[10px] text-slate-500 absolute -top-2 left-0 bg-[#1e1e2d] px-1">Đơn giá</label>
                                    <div className="flex items-center px-3 py-2 bg-slate-900/50 border border-gray-700 rounded-lg focus-within:border-blue-500/50 focus-within:bg-slate-900 transition-colors">
                                        <input
                                            type="text"
                                            value={formatNumberWithDots(part.sellingPrice)}
                                            onChange={(e) => {
                                                const newPrice = parseFormattedNumber(e.target.value);
                                                onUpdatePartPrice(partKey, newPrice);
                                            }}
                                            inputMode="numeric"
                                            disabled={!canEditPriceAndParts}
                                            className={`w-full bg-transparent text-sm font-bold text-blue-400 focus:outline-none ${!canEditPriceAndParts ? "opacity-50 cursor-not-allowed" : ""}`}
                                        />
                                        <span className="text-xs text-slate-500 ml-1">đ</span>
                                    </div>
                                </div>

                                {/* Quantity Control */}
                                <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg border border-gray-700">
                                    <button
                                        onClick={() => onUpdatePartQuantity(partKey, -1)}
                                        disabled={!canEditPriceAndParts}
                                        className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${canEditPriceAndParts
                                                ? "text-slate-400 hover:text-white hover:bg-slate-700"
                                                : "text-slate-600 opacity-50 cursor-not-allowed"
                                            }`}
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-8 text-center text-sm font-bold text-white">
                                        {part.quantity}
                                    </span>
                                    <button
                                        onClick={() => onUpdatePartQuantity(partKey, 1)}
                                        disabled={!canEditPriceAndParts}
                                        className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${canEditPriceAndParts
                                                ? "text-blue-400 hover:bg-blue-500/20"
                                                : "text-slate-600 opacity-50 cursor-not-allowed"
                                            }`}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Total - Bottom highlight */}
                            <div className="mt-3 pt-2 border-t border-dashed border-gray-800 flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 font-medium">Thành tiền</span>
                                <span className="text-sm font-bold text-emerald-400">
                                    {formatCurrency(part.quantity * part.sellingPrice)}
                                </span>
                            </div>
                        </div>
                    );
                    })}
                </div>
            )}

            {/* Add Part Button - Modern & Premium */}
            <button
                onClick={onShowPartSearch}
                disabled={!canEditPriceAndParts}
                className={`group relative w-full overflow-hidden rounded-2xl p-[1px] focus:outline-none active:scale-[0.99] transition-transform ${!canEditPriceAndParts ? "opacity-50 cursor-not-allowed" : ""}`}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-30 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-center gap-2 bg-[#1e1e2d] dark:bg-[#151521] group-hover:bg-[#1e1e2d]/90 px-4 py-3.5 rounded-2xl transition-colors">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <span className="text-sm font-bold text-blue-400 group-hover:text-blue-300">
                        Thêm phụ tùng
                    </span>
                </div>
            </button>
        </div>
    );
};

