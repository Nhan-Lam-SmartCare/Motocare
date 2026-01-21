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
                <div className="space-y-3">
                    {additionalServices.map((service) => (
                        <div
                            key={service.id}
                            className="p-3 bg-[#1e1e2d] border border-gray-800 rounded-xl shadow-sm relative group overflow-hidden"
                        >
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                    <div className="mb-2">
                                        <div className="text-base font-bold text-white break-words leading-tight">
                                            {service.name}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemoveService(service.id)}
                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Selling Price */}
                                <div className="flex-1 relative">
                                    <label className="text-[10px] text-slate-500 absolute -top-2 left-0 bg-[#1e1e2d] px-1">Giá bán</label>
                                    <div className="flex items-center px-3 py-2 bg-slate-900/50 border border-gray-700 rounded-lg focus-within:border-orange-500/50 focus-within:bg-slate-900 transition-colors">
                                        <input
                                            type="text"
                                            value={formatNumberWithDots(service.sellingPrice)}
                                            onChange={(e) => {
                                                const newPrice = parseFormattedNumber(e.target.value);
                                                onUpdateService(service.id, { sellingPrice: newPrice });
                                            }}
                                            inputMode="numeric"
                                            className="w-full bg-transparent text-sm font-bold text-orange-400 focus:outline-none"
                                        />
                                        <span className="text-xs text-slate-500 ml-1">đ</span>
                                    </div>
                                </div>

                                {/* Cost Price (Small) */}
                                <div className="w-24 relative">
                                    <label className="text-[10px] text-slate-500 absolute -top-2 left-0 bg-[#1e1e2d] px-1">Giá vốn</label>
                                    <div className="flex items-center px-2 py-2 bg-slate-900/50 border border-gray-700 rounded-lg focus-within:border-slate-500/50 focus-within:bg-slate-900 transition-colors">
                                        <input
                                            type="text"
                                            value={formatNumberWithDots(service.costPrice || 0)}
                                            onChange={(e) => {
                                                const newCost = parseFormattedNumber(e.target.value);
                                                onUpdateService(service.id, { costPrice: newCost });
                                            }}
                                            inputMode="numeric"
                                            className="w-full bg-transparent text-xs font-medium text-slate-400 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Total - Bottom highlight */}
                            <div className="mt-3 pt-2 border-t border-dashed border-gray-800 flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 font-medium">
                                    SL: {service.quantity || 1}
                                </span>
                                <span className="text-sm font-bold text-orange-400">
                                    {formatCurrency(service.sellingPrice * (service.quantity || 1))}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Service Button */}
            <button
                onClick={onShowAddService}
                className="group relative w-full overflow-hidden rounded-2xl p-[1px] focus:outline-none active:scale-[0.99] transition-transform"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 opacity-30 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-center gap-2 bg-[#1e1e2d] dark:bg-[#151521] group-hover:bg-[#1e1e2d]/90 px-4 py-3.5 rounded-2xl transition-colors">
                    <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="w-3.5 h-3.5 text-orange-400" />
                    </div>
                    <span className="text-sm font-bold text-orange-400 group-hover:text-orange-300">
                        Thêm dịch vụ ngoài
                    </span>
                </div>
            </button>
        </div>
    );
};
