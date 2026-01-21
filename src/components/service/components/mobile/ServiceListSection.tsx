import React from "react";
import { Trash2, Plus } from "lucide-react";
import { formatCurrency, formatNumberWithDots, parseFormattedNumber } from "../../../../utils/format";

interface ServiceItem {
    id: string;
    name: string;
    quantity: number;
    sellingPrice: number;
    costPrice?: number;
}

interface ServiceListSectionProps {
    selectedCustomer: any;
    selectedVehicle: any;
    additionalServices: ServiceItem[];
    onRemoveService: (id: string) => void;
    onUpdateService: (id: string, updates: Partial<ServiceItem>) => void;
    onShowAddService: () => void;
}

export const ServiceListSection: React.FC<ServiceListSectionProps> = ({
    selectedCustomer,
    selectedVehicle,
    additionalServices,
    onRemoveService,
    onUpdateService,
    onShowAddService,
}) => {
    // Only show if customer and vehicle are selected
    if (!selectedCustomer || !selectedVehicle) return null;

    return (
        <div className="px-4 pb-4 space-y-3">
            <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Dịch vụ & Gia công
                </label>
                {additionalServices.length > 0 && (
                    <span className="text-[10px] font-bold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">
                        {additionalServices.length} mục
                    </span>
                )}
            </div>

            {/* Services List */}
            {additionalServices.length > 0 && (
                <div className="space-y-2.5">
                    {additionalServices.map((service) => (
                        <div
                            key={service.id}
                            className="p-4 bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-700/30 rounded-2xl shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                        {service.name}
                                    </div>
                                    <div className="mt-2 flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-500 w-8">Bán:</span>
                                            <input
                                                type="text"
                                                value={formatNumberWithDots(service.sellingPrice)}
                                                onChange={(e) => {
                                                    const newPrice = parseFormattedNumber(e.target.value);
                                                    onUpdateService(service.id, { sellingPrice: newPrice });
                                                }}
                                                inputMode="numeric"
                                                className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-orange-600 dark:text-orange-400 text-xs font-bold focus:border-blue-500 focus:outline-none transition-all"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-500 w-8">Vốn:</span>
                                            <input
                                                type="text"
                                                value={formatNumberWithDots(service.costPrice || 0)}
                                                onChange={(e) => {
                                                    const newCost = parseFormattedNumber(e.target.value);
                                                    onUpdateService(service.id, { costPrice: newCost });
                                                }}
                                                inputMode="numeric"
                                                className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 text-xs font-bold focus:border-blue-500 focus:outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemoveService(service.id)}
                                    className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-red-400 active:scale-95 transition-all bg-slate-50 dark:bg-slate-800 rounded-xl mt-1"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-700/30 flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                                    SL: {service.quantity} x {formatCurrency(service.sellingPrice)}
                                </span>
                                <span className="text-sm font-bold text-orange-400">
                                    {formatCurrency(service.sellingPrice * service.quantity)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Service Button */}
            <button
                onClick={onShowAddService}
                className="w-full py-3.5 bg-orange-600/10 border border-orange-500/30 hover:bg-orange-600/20 rounded-2xl text-orange-400 transition-all flex items-center justify-center gap-2 text-xs font-bold active:scale-[0.98]"
            >
                <Plus className="w-4 h-4" />
                Thêm dịch vụ ngoài
            </button>
        </div>
    );
};
