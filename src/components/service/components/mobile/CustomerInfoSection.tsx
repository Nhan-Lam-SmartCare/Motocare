import React from "react";
import {
    Search,
    ChevronRight,
    Smartphone,
    Bike,
    Plus,
    Edit2,
    X,
    PhoneCall,
    UserPlus,
} from "lucide-react";
import type { Customer } from "../../../../types";

interface CustomerInfoSectionProps {
    selectedCustomer: Customer | null;
    showCustomerSearch: boolean;
    customerSearchTerm: string;
    setCustomerSearchTerm: (term: string) => void;
    filteredCustomers: Customer[];
    onSelectCustomer: (customer: Customer) => void;
    onLoadMoreCustomers: (e: React.MouseEvent) => void;
    hasMoreCustomers: boolean;
    isSearchingCustomer: boolean;
    onShowAddCustomer: () => void;
    // Pre-fill helpers for add customer
    setNewCustomerName: (name: string) => void;
    setNewCustomerPhone: (phone: string) => void;
    // Edit customer
    isEditingCustomer: boolean;
    setIsEditingCustomer: (isEditing: boolean) => void;
    editCustomerName: string;
    setEditCustomerName: (name: string) => void;
    editCustomerPhone: string;
    setEditCustomerPhone: (phone: string) => void;
    onSaveEditedCustomer: () => void;
    onClearCustomer: () => void;
}

export const CustomerInfoSection: React.FC<CustomerInfoSectionProps> = ({
    selectedCustomer,
    showCustomerSearch,
    customerSearchTerm,
    setCustomerSearchTerm,
    filteredCustomers,
    onSelectCustomer,
    onLoadMoreCustomers,
    hasMoreCustomers,
    isSearchingCustomer,
    onShowAddCustomer,
    setNewCustomerName,
    setNewCustomerPhone,
    isEditingCustomer,
    setIsEditingCustomer,
    editCustomerName,
    setEditCustomerName,
    editCustomerPhone,
    setEditCustomerPhone,
    onSaveEditedCustomer,
    onClearCustomer,
}) => {
    return (
        <div className="px-4 pb-4 space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                Thông tin khách hàng
            </label>

            {/* Customer Selection */}
            {showCustomerSearch ? (
                <div className="space-y-3">
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            value={customerSearchTerm}
                            onChange={(e) => setCustomerSearchTerm(e.target.value)}
                            placeholder="Tìm tên hoặc số điện thoại..."
                            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-700/50 rounded-2xl text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                            autoFocus
                        />
                    </div>

                    {/* Customer List */}
                    <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                        {filteredCustomers.map((customer) => {
                            const primaryVehicle =
                                customer.vehicles?.find((v: any) => v.isPrimary) ||
                                customer.vehicles?.[0];

                            return (
                                <div
                                    key={customer.id}
                                    onClick={() => onSelectCustomer(customer)}
                                    className="p-4 bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-700/30 rounded-2xl cursor-pointer hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold">
                                                {customer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-slate-900 dark:text-white font-bold text-sm">
                                                    {customer.name}
                                                </div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Smartphone className="w-3 h-3" />
                                                    {customer.phone}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-600" />
                                    </div>

                                    {(primaryVehicle?.model || customer.vehicleModel) && (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-xl">
                                            <Bike className="w-3.5 h-3.5 text-blue-400" />
                                            <span className="text-xs text-slate-300 font-medium truncate">
                                                {primaryVehicle?.model || customer.vehicleModel}
                                            </span>
                                            {(primaryVehicle?.licensePlate || customer.licensePlate) && (
                                                <span className="text-[10px] font-mono font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                                                    {primaryVehicle?.licensePlate || customer.licensePlate}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Load More Button */}
                        {hasMoreCustomers && customerSearchTerm && (
                            <button
                                type="button"
                                onClick={onLoadMoreCustomers}
                                className="w-full py-3 text-blue-500 font-medium text-xs bg-blue-500/10 rounded-xl active:scale-[0.98] transition-transform"
                            >
                                {isSearchingCustomer
                                    ? "Đang tải..."
                                    : "⬇️ Tải thêm khách hàng..."}
                            </button>
                        )}

                        {/* Show add new customer when no results or always at bottom */}
                        {customerSearchTerm && filteredCustomers.length === 0 && (
                            <div className="text-center py-3 text-slate-400 text-xs">
                                Không tìm thấy khách hàng
                            </div>
                        )}

                        {/* Add new customer button */}
                        <button
                            type="button"
                            onClick={() => {
                                onShowAddCustomer();
                                // Pre-fill phone if search term looks like a phone number
                                if (/^[0-9]+$/.test(customerSearchTerm)) {
                                    setNewCustomerPhone(customerSearchTerm);
                                    setNewCustomerName("");
                                } else {
                                    setNewCustomerName(customerSearchTerm);
                                    setNewCustomerPhone("");
                                }
                            }}
                            className="w-full p-3 bg-green-500/20 border-2 border-dashed border-green-500/50 rounded-lg text-green-400 font-medium flex items-center justify-center gap-2 hover:bg-green-500/30 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Thêm khách hàng mới
                        </button>
                    </div>
                </div>
            ) : selectedCustomer ? (
                <div className="p-4 bg-white dark:bg-[#1e1e2d] border border-blue-200 dark:border-blue-500/30 rounded-2xl shadow-lg shadow-blue-500/5">
                    {isEditingCustomer ? (
                        // Edit mode - show input fields
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                    Tên khách hàng
                                </label>
                                <input
                                    type="text"
                                    value={editCustomerName}
                                    onChange={(e) => setEditCustomerName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-blue-500 transition-all"
                                    placeholder="Nhập tên khách hàng"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                    Số điện thoại
                                </label>
                                <input
                                    type="tel"
                                    value={editCustomerPhone}
                                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-blue-500 transition-all"
                                    placeholder="Nhập số điện thoại"
                                />
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={() => {
                                        setIsEditingCustomer(false);
                                        setEditCustomerName(selectedCustomer.name);
                                        setEditCustomerPhone(selectedCustomer.phone || "");
                                    }}
                                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-xl text-xs font-bold active:scale-95 transition-all"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={onSaveEditedCustomer}
                                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    Lưu thay đổi
                                </button>
                            </div>
                        </div>
                    ) : (
                        // View mode - show customer info with edit button
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-lg shadow-inner">
                                    {selectedCustomer.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-slate-900 dark:text-white font-bold text-base">
                                        {selectedCustomer.name}
                                    </div>
                                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                                        <PhoneCall className="w-3 h-3 text-blue-400" />
                                        {selectedCustomer.phone}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setEditCustomerName(selectedCustomer.name);
                                        setEditCustomerPhone(selectedCustomer.phone || "");
                                        setIsEditingCustomer(true);
                                    }}
                                    className="w-9 h-9 flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl active:scale-95 transition-all"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={onClearCustomer}
                                    className="w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl active:scale-95 transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
};
