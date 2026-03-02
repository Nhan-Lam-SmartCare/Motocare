import React, { useState, useEffect } from "react";
import { User, X, Phone, Save, Bike, Plus, Trash2, Edit2, Check } from "lucide-react";
import type { Customer, Vehicle } from "../../../types";
import { useUpdateCustomer } from "../../../hooks/useSupabase";
import { showToast } from "../../../utils/toast";

interface EditCustomerModalProps {
    isOpen: boolean;
    customer: Customer;
    onClose: () => void;
    onSaveSuccess: (updatedCustomer: Customer) => void;
}

const POPULAR_MOTORCYCLES = [
    // Honda
    "Air Blade", "Vision", "Lead", "SH 125/150", "SH Mode", "Wave Alpha", "Wave RSX", "Winner X", "Future 125", "Vario 160",
    // Yamaha
    "Exciter 155", "Exciter 150", "Grande", "Janus", "Sirius", "NVX 155", "FreeGo",
    // Suzuki
    "Raider R150", "Satria F150", "Burgman Street",
    // Piaggio
    "Vespa Sprint", "Vespa Primavera", "Liberty 125",
    // Generic
    "Khác"
];

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
    isOpen,
    customer,
    onClose,
    onSaveSuccess,
}) => {
    const updateCustomerMutation = useUpdateCustomer();

    const [name, setName] = useState(customer.name);
    const [phone, setPhone] = useState(customer.phone || "");
    const [vehicles, setVehicles] = useState<Vehicle[]>(customer.vehicles || []);

    const [isSaving, setIsSaving] = useState(false);

    // New vehicle input states
    const [isAddingVehicle, setIsAddingVehicle] = useState(false);
    const [newVehicleModel, setNewVehicleModel] = useState("");
    const [newVehiclePlate, setNewVehiclePlate] = useState("");

    // Edit existing vehicle states
    const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
    const [editVehicleModel, setEditVehicleModel] = useState("");
    const [editVehiclePlate, setEditVehiclePlate] = useState("");

    useEffect(() => {
        if (isOpen) {
            setName(customer.name);
            setPhone(customer.phone || "");
            setVehicles(customer.vehicles || []);
            setIsAddingVehicle(false);
            setEditingVehicleId(null);
            setNewVehicleModel("");
            setNewVehiclePlate("");
        }
    }, [isOpen, customer]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!name.trim()) {
            showToast.error("Vui lòng nhập tên khách hàng");
            return;
        }

        setIsSaving(true);
        try {
            const updatedData: Partial<Customer> = {
                name: name.trim(),
                phone: phone.trim(),
                vehicles: vehicles,
            };

            const updatedCustomerFromApi = await updateCustomerMutation.mutateAsync({
                id: customer.id,
                updates: updatedData,
            });

            const finalCustomerResult = updatedCustomerFromApi || { ...customer, ...updatedData };

            showToast.success("Đã cập nhật thông tin khách hàng");
            onSaveSuccess(finalCustomerResult as Customer);
            onClose();
        } catch (error) {
            console.error("Error updating customer:", error);
            showToast.error("Có lỗi xảy ra khi cập nhật");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddVehicle = () => {
        if (!newVehicleModel.trim() && !newVehiclePlate.trim()) {
            setIsAddingVehicle(false);
            return;
        }

        const newVehicle: Vehicle = {
            id: crypto.randomUUID(),
            model: newVehicleModel.trim() || "Không rõ",
            licensePlate: newVehiclePlate.trim(),
            isPrimary: vehicles.length === 0, // First vehicle is primary by default
        };

        setVehicles([...vehicles, newVehicle]);
        setNewVehicleModel("");
        setNewVehiclePlate("");
        setIsAddingVehicle(false);
    };

    const startEditingVehicle = (v: Vehicle) => {
        setEditingVehicleId(v.id);
        setEditVehicleModel(v.model);
        setEditVehiclePlate(v.licensePlate || "");
    };

    const saveEditedVehicle = () => {
        setVehicles(vehicles.map(v => {
            if (v.id === editingVehicleId) {
                return {
                    ...v,
                    model: editVehicleModel.trim() || "Không rõ",
                    licensePlate: editVehiclePlate.trim(),
                };
            }
            return v;
        }));
        setEditingVehicleId(null);
    };

    const handleDeleteVehicle = (id: string) => {
        if (confirm("Chắc chắn muốn xóa xe này?")) {
            setVehicles(vehicles.filter(v => v.id !== id));
        }
    };

    const setPrimaryVehicle = (id: string) => {
        setVehicles(vehicles.map(v => ({
            ...v,
            isPrimary: v.id === id
        })));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl shrink-0">
                    <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <User className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold">Chỉnh sửa thông tin</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Thông tin liên hệ</h3>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                                    Tên khách hàng <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="pl-10 w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="Nhập tên khách hàng"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                                    Số điện thoại
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Phone className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="pl-10 w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                                        placeholder="Nhập số điện thoại"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Vehicles section */}
                        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Danh sách xe</h3>
                                {!isAddingVehicle && (
                                    <button
                                        onClick={() => setIsAddingVehicle(true)}
                                        className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Thêm xe
                                    </button>
                                )}
                            </div>

                            {/* Add Vehicle Form */}
                            {isAddingVehicle && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30 animate-fade-in space-y-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Xe mới</span>
                                        <button onClick={() => setIsAddingVehicle(false)} className="text-slate-400 hover:text-slate-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-slate-700 dark:text-slate-300">Dòng xe</label>
                                            <input
                                                type="text"
                                                value={newVehicleModel}
                                                onChange={(e) => setNewVehicleModel(e.target.value)}
                                                list="popular-motorcycles-edit"
                                                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 transition-all"
                                                placeholder="VD: SH 150i"
                                            />
                                            <datalist id="popular-motorcycles-edit">
                                                {POPULAR_MOTORCYCLES.map(model => (
                                                    <option key={model} value={model} />
                                                ))}
                                            </datalist>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-slate-700 dark:text-slate-300">Biển số</label>
                                            <input
                                                type="text"
                                                value={newVehiclePlate}
                                                onChange={(e) => setNewVehiclePlate(e.target.value)}
                                                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 transition-all font-mono uppercase"
                                                placeholder="VD: 59-A1 123.45"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-2">
                                        <button
                                            onClick={handleAddVehicle}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Thêm vào danh sách
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Existing Vehicles List */}
                            <div className="space-y-2">
                                {vehicles.length === 0 ? (
                                    <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                        Khách hàng chưa có xe nào.
                                    </div>
                                ) : (
                                    vehicles.map((v) => (
                                        <div key={v.id} className={`p-3 rounded-xl border transition-all ${v.isPrimary ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-700/50' : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700'}`}>
                                            {editingVehicleId === v.id ? (
                                                <div className="space-y-3 animate-fade-in">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1 text-slate-700 dark:text-slate-300">Dòng xe</label>
                                                            <input
                                                                type="text"
                                                                value={editVehicleModel}
                                                                onChange={(e) => setEditVehicleModel(e.target.value)}
                                                                list="popular-motorcycles-edit"
                                                                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium mb-1 text-slate-700 dark:text-slate-300">Biển số</label>
                                                            <input
                                                                type="text"
                                                                value={editVehiclePlate}
                                                                onChange={(e) => setEditVehiclePlate(e.target.value)}
                                                                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={saveEditedVehicle}
                                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                                                        >
                                                            <Check className="w-3.5 h-3.5" /> Xong
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${v.isPrimary ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                                            <Bike className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-slate-900 dark:text-white">
                                                                    {v.model || "Không rõ"}
                                                                </span>
                                                                {v.isPrimary && (
                                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 rounded">
                                                                        Mặc định
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {v.licensePlate && (
                                                                <div className="text-sm font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                                                                    {v.licensePlate}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {!v.isPrimary && (
                                                            <button
                                                                onClick={() => setPrimaryVehicle(v.id)}
                                                                className="p-1.5 text-xs text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md transition-colors"
                                                                title="Đặt làm xe mặc định"
                                                            >
                                                                Chọn
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => startEditingVehicle(v)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                                            title="Sửa xe"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteVehicle(v.id)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                            title="Xóa xe"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl shrink-0 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${isSaving ? "opacity-75 cursor-not-allowed" : ""
                            }`}
                    >
                        {isSaving ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        <span>Cập nhật</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditCustomerModal;
