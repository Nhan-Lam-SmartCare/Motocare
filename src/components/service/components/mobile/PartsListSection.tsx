import React from "react";
import { Trash2, Minus, Plus } from "lucide-react";
import type { Part } from "../../../../types";
import { formatCurrency, formatNumberWithDots, parseFormattedNumber } from "../../../../utils/format";

interface SelectedPart extends Part {
    quantity: number;
    sellingPrice: number;
}

interface PartsListSectionProps {
    selectedCustomer: any;
    selectedVehicle: any;
    selectedParts: SelectedPart[];
    onRemovePart: (partId: string) => void;
    onUpdatePartQuantity: (partId: string, delta: number) => void;
    onUpdatePartPrice: (partId: string, newPrice: number) => void;
    onShowPartSearch: () => void;
}

export const PartsListSection: React.FC<PartsListSectionProps> = ({
    selectedCustomer,
    selectedVehicle,
    selectedParts,
    onRemovePart,
    onUpdatePartQuantity,
    onUpdatePartPrice,
    onShowPartSearch,
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
                <div className="space-y-2.5">
                    {selectedParts.map((part) => (
                        <div
                            key={part.id}
                            className="p-3 bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-700/30 rounded-2xl shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                        {part.name}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                        {part.sku}
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[10px] text-slate-500">Giá:</span>
                                        <input
                                            type="text"
                                            value={formatNumberWithDots(part.sellingPrice)}
                                            onChange={(e) => {
                                                const newPrice = parseFormattedNumber(e.target.value);
                                                onUpdatePartPrice(part.id, newPrice);
                                            }}
                                            inputMode="numeric"
                                            className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-blue-600 dark:text-blue-400 text-xs font-bold focus:border-blue-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Improved Action Buttons Layout */}
                                <div className="flex flex-col items-end gap-2">
                                    {/* Quantity Controls */}
                                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700/50">
                                        <button
                                            onClick={() => onUpdatePartQuantity(part.id, -1)}
                                            className="w-8 h-8 flex items-center justify-center text-slate-400 active:bg-slate-200 dark:active:bg-slate-700 rounded-md transition-all"
                                        >
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="w-6 text-center text-sm font-bold text-slate-900 dark:text-white">
                                            {part.quantity}
                                        </span>
                                        <button
                                            onClick={() => onUpdatePartQuantity(part.id, 1)}
                                            className="w-8 h-8 flex items-center justify-center text-blue-400 active:bg-slate-200 dark:active:bg-slate-700 rounded-md transition-all"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Delete Button - separated for clearer touch target */}
                                    <button
                                        onClick={() => onRemovePart(part.id)}
                                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Xóa
                                    </button>
                                </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/30 flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Thành tiền</span>
                                <span className="text-sm font-bold text-emerald-400">
                                    {formatCurrency(part.quantity * part.sellingPrice)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Part Button */}
            <button
                onClick={onShowPartSearch}
                className="w-full py-3.5 bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600/20 rounded-2xl text-blue-400 transition-all flex items-center justify-center gap-2 text-xs font-bold active:scale-[0.98]"
            >
                <Plus className="w-4 h-4" />
                Thêm phụ tùng
            </button>
        </div>
    );
};
