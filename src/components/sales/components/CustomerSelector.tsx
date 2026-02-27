import React from "react";
import type { Customer } from "../../../types";
import { Search, UserPlus, X, Bike, Loader2 } from "lucide-react";

interface CustomerSelectorProps {
    selectedCustomer: Customer | null;
    customers: Customer[];
    customerSearch: string;
    showDropdown: boolean;
    onSearchChange: (search: string) => void;
    onSelect: (customer: Customer) => void;
    onClear: () => void;
    onAddNew: () => void;
    onDropdownToggle: (show: boolean) => void;
    isSearching?: boolean;
    hasMoreCustomers?: boolean;
    onLoadMore?: (e: React.MouseEvent) => void;
}

/**
 * Customer selector dropdown component
 */
export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
    selectedCustomer,
    customers,
    customerSearch,
    showDropdown,
    onSearchChange,
    onSelect,
    onClear,
    onAddNew,
    onDropdownToggle,
    isSearching = false,
    hasMoreCustomers = false,
    onLoadMore,
}) => {
    return (
        <div className="relative customer-dropdown-container">
            {/* Selected Customer Display or Search Input */}
            {selectedCustomer ? (
                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg px-4 py-3">
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white">
                            {selectedCustomer.name}
                        </p>
                        {selectedCustomer.phone && (
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                {selectedCustomer.phone}
                            </p>
                        )}
                        {/* Vehicle list for selected customer */}
                        {(() => {
                            const vehicles = (selectedCustomer.vehicles || []).filter(v => v.model || v.licensePlate);
                            if (vehicles.length === 0) return null;

                            const displayVehicles = vehicles.slice(0, 3);
                            const hasMore = vehicles.length > 3;

                            return (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {displayVehicles.map((vehicle, idx) => (
                                        <div
                                            key={vehicle.id || idx}
                                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${vehicle.isPrimary
                                                    ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                                                    : 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300'
                                                }`}
                                        >
                                            <Bike className="w-3 h-3" />
                                            <span className="font-semibold">{vehicle.model || "Không rõ"}</span>
                                            {vehicle.licensePlate && (
                                                <span className="text-[10px] opacity-75">• {vehicle.licensePlate}</span>
                                            )}
                                        </div>
                                    ))}
                                    {hasMore && (
                                        <div className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300">
                                            +{vehicles.length - 3}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                    <button
                        onClick={onClear}
                        className="ml-2 p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={customerSearch}
                            onChange={(e) => {
                                onSearchChange(e.target.value);
                                onDropdownToggle(true);
                            }}
                            onFocus={() => onDropdownToggle(true)}
                            placeholder="Tìm khách hàng (tên, SĐT)..."
                            className="w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        {isSearching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />
                        )}
                    </div>
                    <button
                        onClick={onAddNew}
                        className="px-4 py-3 bg-slate-800/80 text-emerald-400 border border-slate-700/50 rounded-lg flex items-center gap-2 transition-all hover:bg-slate-700 hover:text-emerald-300 hover:border-emerald-500/30 font-semibold whitespace-nowrap"
                        title="Thêm khách hàng mới"
                    >
                        <UserPlus className="w-5 h-5" />
                        <span className="hidden sm:inline">Thêm</span>
                    </button>
                </div>
            )}

            {/* Dropdown */}
            {showDropdown && !selectedCustomer && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                    {/* Add New Button */}
                    <button
                        onClick={() => {
                            onAddNew();
                            onDropdownToggle(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-slate-200 dark:border-slate-700"
                    >
                        <UserPlus className="w-5 h-5" />
                        <span className="font-medium">Thêm khách hàng mới</span>
                    </button>

                    {/* Customer List */}
                    {customers.length > 0 ? (
                        <>
                            {customers.map((customer) => {
                                const vehicles = (customer.vehicles || []).filter(v => v.model || v.licensePlate);
                                const primaryVehicle = vehicles.find(v => v.isPrimary);
                                const displayVehicles = vehicles.slice(0, 2); // Show max 2 vehicles
                                const hasMoreVehicles = vehicles.length > 2;

                                return (
                                    <button
                                        key={customer.id}
                                        onClick={() => {
                                            onSelect(customer);
                                            onSearchChange(customer.name);
                                            onDropdownToggle(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                                    >
                                        <p className="font-medium text-slate-900 dark:text-white">
                                            {customer.name}
                                        </p>
                                        {customer.phone && (
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                {customer.phone}
                                            </p>
                                        )}
                                        {/* Vehicle List */}
                                        {displayVehicles.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {displayVehicles.map((vehicle, idx) => (
                                                    <div
                                                        key={vehicle.id || idx}
                                                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${vehicle.isPrimary
                                                                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                                                                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                                                            }`}
                                                    >
                                                        <Bike className="w-3 h-3" />
                                                        <span className="font-semibold">{vehicle.model || "Không rõ"}</span>
                                                        {vehicle.licensePlate && (
                                                            <span className="text-[10px] opacity-75">• {vehicle.licensePlate}</span>
                                                        )}
                                                    </div>
                                                ))}
                                                {hasMoreVehicles && (
                                                    <div className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                                                        +{vehicles.length - 2}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                            {/* Load More Button */}
                            {hasMoreCustomers && onLoadMore && (
                                <button
                                    onClick={onLoadMore}
                                    disabled={isSearching}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-t border-slate-200 dark:border-slate-700"
                                >
                                    {isSearching ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Đang tải...</span>
                                        </>
                                    ) : (
                                        <span className="font-medium">Tải thêm khách hàng...</span>
                                    )}
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                            {isSearching ? (
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Đang tìm kiếm...</span>
                                </div>
                            ) : (
                                "Không tìm thấy khách hàng"
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
