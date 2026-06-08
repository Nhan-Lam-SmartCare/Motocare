import React, { useState, useMemo } from "react";
import { User, Phone, Star, MapPin, X, Bike } from "lucide-react";
import { PlusIcon, TrashIcon, UsersIcon } from "../../Icons";
import { POPULAR_MOTORCYCLES } from "../../../constants/vehicleModels";
import { validatePhoneNumber } from "../../../utils/validation";
import { showToast } from "../../../utils/toast";
import type { Customer, Vehicle } from "../../../types";

interface CustomerModalProps {
  customer: Customer;
  onSave: (c: Partial<Customer> & { id?: string }) => Promise<void>;
  onClose: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ customer, onSave, onClose }) => {
  const [name, setName] = useState(customer.name || "");
  const [phone, setPhone] = useState(customer.phone || "");
  const [saving, setSaving] = useState(false);

  const initVehicles = () => {
    if (customer.vehicles && customer.vehicles.length > 0) {
      return customer.vehicles;
    }
    if (customer.vehicleModel || customer.licensePlate) {
      return [
        {
          id: `VEH-${Date.now()}`,
          model: customer.vehicleModel || "",
          licensePlate: customer.licensePlate || "",
          isPrimary: true,
        },
      ];
    }
    return [];
  };

  const [vehicles, setVehicles] = useState<Vehicle[]>(initVehicles());
  const [newVehicle, setNewVehicle] = useState({ model: "", licensePlate: "" });
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);

  // Lọc gợi ý dòng xe theo input
  const filteredModels = useMemo(() => {
    if (!newVehicle.model.trim()) return POPULAR_MOTORCYCLES.slice(0, 20);
    const search = newVehicle.model.toLowerCase();
    return POPULAR_MOTORCYCLES.filter((m) =>
      m.toLowerCase().includes(search)
    ).slice(0, 15);
  }, [newVehicle.model]);

  const addVehicle = () => {
    if (!newVehicle.model.trim() && !newVehicle.licensePlate.trim()) return;
    const vehicle: Vehicle = {
      id: `VEH-${Date.now()}`,
      model: newVehicle.model.trim(),
      licensePlate: newVehicle.licensePlate.trim(),
      isPrimary: vehicles.length === 0,
    };
    setVehicles([...vehicles, vehicle]);
    setNewVehicle({ model: "", licensePlate: "" });
  };

  const removeVehicle = (id: string) => {
    setVehicles(vehicles.filter((v) => v.id !== id));
  };

  const setPrimaryVehicle = (id: string) => {
    setVehicles(
      vehicles.map((v) => ({
        ...v,
        isPrimary: v.id === id,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      showToast.error("Vui lòng nhập tên khách hàng");
      return;
    }

    // Validate phone if provided
    if (phone.trim()) {
      const phoneValidation = validatePhoneNumber(phone.trim());
      if (!phoneValidation.ok) {
        showToast.error(phoneValidation.error || "Số điện thoại không hợp lệ");
        return;
      }
    }

    const primaryVehicle = vehicles.find((v) => v.isPrimary) || vehicles[0];
    setSaving(true);
    try {
      await onSave({
        id: customer.id,
        name: name.trim(),
        phone: phone.trim(),
        vehicles: vehicles,
        vehicleModel: primaryVehicle?.model || "",
        licensePlate: primaryVehicle?.licensePlate || "",
      });
      onClose();
    } catch (error: any) {
      showToast.error(error?.message || "Lưu khách hàng thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-0 md:p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 md:rounded-2xl w-full h-full md:h-auto md:max-w-xl overflow-hidden flex flex-col shadow-2xl border-0 md:border border-slate-200 dark:border-slate-700">
        {/* Header - Desktop */}
        <div className="hidden md:flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            {customer.id ? "Chỉnh sửa khách hàng" : "Thêm khách hàng mới"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Header - Mobile */}
        <div className="flex md:hidden flex-col bg-[#1e1e2d] border-b border-slate-700/50">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                <User className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-base font-bold text-white">
                {customer.id ? "Sửa khách hàng" : "Thêm khách hàng"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 active:scale-90 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/30 dark:bg-slate-900/10 custom-scrollbar">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <UsersIcon className="w-3.5 h-3.5" />
              Thông tin cơ bản
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                  Tên khách hàng <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Nhập tên khách hàng..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                  Số điện thoại
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="tel"
                    placeholder="VD: 0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vehicles Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Bike className="w-3.5 h-3.5" />
                Danh sách xe ({vehicles.length})
              </div>
            </div>

            {/* Vehicle List */}
            <div className="space-y-3">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between group hover:border-blue-500/30 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPrimaryVehicle(vehicle.id)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${vehicle.isPrimary
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-500 border border-amber-200 dark:border-amber-800/50"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-amber-500 border border-slate-200 dark:border-slate-600"
                        }`}
                      title={vehicle.isPrimary ? "Xe chính" : "Đặt làm xe chính"}
                    >
                      <Star className={`w-5 h-5 ${vehicle.isPrimary ? "fill-current" : ""}`} />
                    </button>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {vehicle.model || "Chưa rõ dòng xe"}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {vehicle.licensePlate || "Chưa có biển số"}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVehicle(vehicle.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 md:opacity-100"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}

              {vehicles.length === 0 && (
                <div className="text-center py-8 bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <Bike className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có xe nào được thêm</p>
                </div>
              )}
            </div>

            {/* Add Vehicle Form */}
            <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 space-y-4">
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Thêm xe mới
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Dòng xe (VD: SH 150i...)"
                    value={newVehicle.model}
                    onChange={(e) => {
                      setNewVehicle({ ...newVehicle, model: e.target.value });
                      setShowModelSuggestions(true);
                    }}
                    onFocus={() => setShowModelSuggestions(true)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {showModelSuggestions && filteredModels.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto custom-scrollbar">
                      {filteredModels.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setNewVehicle({ ...newVehicle, model: m });
                            setShowModelSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Biển số (VD: 29A1-12345)"
                  value={newVehicle.licensePlate}
                  onChange={(e) => setNewVehicle({ ...newVehicle, licensePlate: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <button
                type="button"
                onClick={addVehicle}
                disabled={!newVehicle.model.trim() && !newVehicle.licensePlate.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Thêm vào danh sách
              </button>
            </div>
          </div>
        </div>

        {/* Footer - Desktop */}
        <div className="hidden md:flex p-4 border-t border-slate-200 dark:border-slate-700 justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-200 dark:shadow-none"
          >
            Lưu khách hàng
          </button>
        </div>

        {/* Footer - Mobile (Sticky) */}
        <div className="flex md:hidden p-4 border-t border-slate-700/30 bg-[#1e1e2d] pb-safe gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-slate-800 text-white font-bold rounded-2xl active:scale-[0.98] transition-all border border-slate-700/50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-[2] py-4 bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20"
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
};
