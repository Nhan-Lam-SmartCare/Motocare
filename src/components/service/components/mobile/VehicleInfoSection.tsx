import React, { useMemo } from "react";
import {
    Bike,
    CheckCircle,
    Plus,
    TrendingUp,
    AlertTriangle,
    Wrench,
    X,
    ChevronDown,
} from "lucide-react";
import type { Vehicle } from "../../../../types";
import { formatKm, type MaintenanceWarning } from "../../../../utils/maintenanceReminder";

// Organized by brand for better UX
const VEHICLES_BY_BRAND: Record<string, string[]> = {
    Honda: [
        "Honda Wave Alpha", "Honda Wave RSX", "Honda Wave RSX FI", "Honda Wave 110", "Honda Wave S110",
        "Honda Super Dream", "Honda Dream", "Honda Blade 110",
        "Honda Future 125", "Honda Future Neo",
        "Honda Winner X", "Honda Winner 150",
        "Honda CB150R", "Honda CB150X", "Honda CB300R",
        "Honda Vision", "Honda Air Blade 125", "Honda Air Blade 150", "Honda Air Blade 160",
        "Honda Lead 125", "Honda SH Mode", "Honda SH 125i", "Honda SH 150i", "Honda SH 160i", "Honda SH 350i",
        "Honda PCX 125", "Honda PCX 150", "Honda PCX 160",
        "Honda Vario 125", "Honda Vario 150", "Honda Vario 160",
    ],
    Yamaha: [
        "Yamaha Sirius", "Yamaha Sirius FI", "Yamaha Jupiter", "Yamaha Jupiter FI", "Yamaha Jupiter Finn",
        "Yamaha Exciter 135", "Yamaha Exciter 150", "Yamaha Exciter 155 VVA",
        "Yamaha Grande", "Yamaha Janus", "Yamaha Latte", "Yamaha FreeGo",
        "Yamaha NVX 125", "Yamaha NVX 155",
        "Yamaha R15", "Yamaha MT-15", "Yamaha R3", "Yamaha MT-03",
    ],
    Suzuki: [
        "Suzuki Raider R150", "Suzuki Satria F150", "Suzuki Burgman Street", "Suzuki Impulse 125",
    ],
    Piaggio: [
        "Vespa Sprint", "Vespa Primavera", "Vespa GTS", "Vespa LX",
        "Piaggio Liberty", "Piaggio Medley",
    ],
    SYM: [
        "SYM Attila", "SYM Passing", "SYM Shark", "SYM Galaxy", "SYM Elegant", "SYM Angela",
    ],
    Khác: ["Xe điện VinFast", "Xe 50cc", "Xe Đạp Điện", "Khác"],
};

// Flat list for searching
const ALL_VEHICLES = Object.values(VEHICLES_BY_BRAND).flat();

interface VehicleInfoSectionProps {
    selectedCustomer: any; // Type as needed
    selectedVehicle: Vehicle | null;
    customerVehicles: Vehicle[];
    onSelectVehicle: (vehicle: Vehicle) => void;
    onClearVehicle: () => void;
    showAddVehicle: boolean;
    setShowAddVehicle: (show: boolean) => void;

    // Add Vehicle Form Props
    newVehiclePlate: string;
    setNewVehiclePlate: (plate: string) => void;
    newVehicleName: string;
    setNewVehicleName: (name: string) => void;
    showVehicleDropdown: boolean;
    setShowVehicleDropdown: (show: boolean) => void;
    onAddVehicle: () => void;

    // Vehicle State Props
    currentKm: string;
    setCurrentKm: (km: string) => void;
    maintenanceWarnings: MaintenanceWarning[];
    issueDescription: string;
    setIssueDescription: (desc: string) => void;
}

export const VehicleInfoSection: React.FC<VehicleInfoSectionProps> = ({
    selectedCustomer,
    selectedVehicle,
    customerVehicles,
    onSelectVehicle,
    onClearVehicle,
    showAddVehicle,
    setShowAddVehicle,
    newVehiclePlate,
    setNewVehiclePlate,
    newVehicleName,
    setNewVehicleName,
    showVehicleDropdown,
    setShowVehicleDropdown,
    onAddVehicle,
    currentKm,
    setCurrentKm,
    maintenanceWarnings,
    issueDescription,
    setIssueDescription,
}) => {
    return (
        <div className="px-4 pb-4 space-y-3">
            {selectedCustomer && (
                <div className="space-y-3 pt-2">
                    {!selectedVehicle && (
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                            Chọn xe sửa chữa
                        </label>
                    )}

                    {/* Vehicle List */}
                    {customerVehicles.length > 0 && (
                        <div className="grid grid-cols-1 gap-2.5">
                            {customerVehicles.map((vehicle) => {
                                const isActive = selectedVehicle?.id === vehicle.id;
                                return (
                                    <div
                                        key={vehicle.id}
                                        onClick={() => onSelectVehicle(vehicle)}
                                        className={`p-4 rounded-2xl cursor-pointer transition-all border ${isActive
                                            ? "bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20"
                                            : "bg-white dark:bg-[#1e1e2d] border-slate-200 dark:border-slate-700/30 hover:border-slate-400 dark:hover:border-slate-600"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive
                                                        ? "bg-white/20 text-white"
                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                                                        }`}
                                                >
                                                    <Bike className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div
                                                        className={`font-bold text-sm ${isActive
                                                            ? "text-white"
                                                            : "text-slate-900 dark:text-slate-200"
                                                            }`}
                                                    >
                                                        {vehicle.model}
                                                    </div>
                                                    <div
                                                        className={`text-xs font-mono ${isActive ? "text-blue-100" : "text-slate-500"
                                                            }`}
                                                    >
                                                        {vehicle.licensePlate}
                                                    </div>
                                                </div>
                                            </div>
                                            {isActive && <CheckCircle className="w-5 h-5 text-white" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Add New Vehicle Button - Always visible when customer selected */}
                    <button
                        onClick={() => setShowAddVehicle(true)}
                        className="w-full py-3.5 border-2 border-dashed border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-2xl text-blue-500 hover:text-blue-400 transition-all flex items-center justify-center gap-2 text-xs font-bold"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm xe mới
                    </button>
                </div>
            )}

            {/* Vehicle Info Inputs */}
            {selectedVehicle && (
                <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                            Số KM hiện tại
                        </label>
                        <div className="relative">
                            <TrendingUp className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="number"
                                value={currentKm}
                                onChange={(e) => setCurrentKm(e.target.value)}
                                placeholder="Nhập số KM..."
                                inputMode="numeric"
                                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white text-sm focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Maintenance Warnings */}
                    {maintenanceWarnings.length > 0 && (
                        <div className="p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                                    <AlertTriangle className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-orange-400 uppercase tracking-tight">
                                    Cần bảo dưỡng định kỳ
                                </span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {maintenanceWarnings.map((warning) => (
                                    <div
                                        key={warning.type}
                                        className={`flex items-center justify-between p-3 rounded-xl border ${warning.isOverdue
                                            ? "bg-red-500/10 border-red-500/20 text-red-300"
                                            : "bg-orange-500/5 border-orange-500/10 text-orange-300"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">{warning.icon}</span>
                                            <span className="text-xs font-bold">{warning.name}</span>
                                        </div>
                                        <div className="text-[10px] font-mono font-bold bg-black/20 px-2 py-1 rounded">
                                            {warning.isOverdue
                                                ? `QUÁ ${formatKm(Math.abs(warning.kmUntilDue))}`
                                                : `CÒN ${formatKm(warning.kmUntilDue)}`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                            Mô tả tình trạng xe
                        </label>
                        <div className="relative">
                            <Wrench className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                            <textarea
                                value={issueDescription}
                                onChange={(e) => setIssueDescription(e.target.value)}
                                placeholder="Mô tả các vấn đề cần sửa chữa..."
                                rows={3}
                                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white text-sm resize-none focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Add Vehicle Modal */}
            {showAddVehicle && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white dark:bg-[#1e1e2d] rounded-3xl p-5 border border-slate-200 dark:border-slate-700/50 shadow-2xl transition-colors">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Bike className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="text-slate-900 dark:text-white font-bold text-base">
                                    Thêm xe mới
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowAddVehicle(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-95 transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                    Biển số xe
                                </label>
                                <input
                                    type="text"
                                    value={newVehiclePlate}
                                    onChange={(e) =>
                                        setNewVehiclePlate(e.target.value.toUpperCase())
                                    }
                                    placeholder="59G1-123.45"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-bold uppercase focus:border-blue-500 transition-all"
                                />
                            </div>

                            <div className="space-y-1.5 relative">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                    Tên xe
                                </label>
                                <input
                                    type="text"
                                    value={newVehicleName}
                                    onChange={(e) => {
                                        setNewVehicleName(e.target.value);
                                        setShowVehicleDropdown(true);
                                    }}
                                    onFocus={() => setShowVehicleDropdown(true)}
                                    placeholder="Chọn hoặc nhập dòng xe"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-blue-500 transition-all"
                                />

                                {/* IMPROVED VEHICLE DROPDOWN - GROUPED BY BRAND */}
                                {showVehicleDropdown && (
                                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-[200px] overflow-y-auto scrollbar-hide">

                                        {/* Filter and group vehicles */}
                                        {(() => {
                                            const searchTerm = newVehicleName.toLowerCase();
                                            let hasResults = false;

                                            return (
                                                <>
                                                    {Object.entries(VEHICLES_BY_BRAND).map(([brand, models]) => {
                                                        const matchingModels = models.filter(m => m.toLowerCase().includes(searchTerm));
                                                        if (matchingModels.length === 0) return null;
                                                        hasResults = true;

                                                        return (
                                                            <div key={brand}>
                                                                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0">
                                                                    {brand}
                                                                </div>
                                                                {matchingModels.map(model => (
                                                                    <button
                                                                        key={model}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setNewVehicleName(model);
                                                                            setShowVehicleDropdown(false);
                                                                        }}
                                                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-xs text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700/30 last:border-0 transition-colors"
                                                                    >
                                                                        {model}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        );
                                                    })}

                                                    {!hasResults && (
                                                        <div className="px-4 py-3 text-xs text-slate-500 text-center italic">
                                                            Không tìm thấy - nhập tên xe mới
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowAddVehicle(false)}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-bold text-xs active:scale-95 transition-all"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={onAddVehicle}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                                >
                                    Thêm xe
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
