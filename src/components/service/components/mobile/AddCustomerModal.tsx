import React, { useState, useEffect } from "react";
import { X, UserPlus } from "lucide-react";
import { POPULAR_MOTORCYCLES } from "../../constants/service.constants";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomer: (customerData: {
    name: string;
    phone: string;
    vehicleModel: string;
    licensePlate: string;
  }) => void;
  initialName?: string;
  initialPhone?: string;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onAddCustomer,
  initialName = "",
  initialPhone = "",
}) => {
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerVehicleModel, setNewCustomerVehicleModel] = useState("");
  const [newCustomerLicensePlate, setNewCustomerLicensePlate] = useState("");
  const [showCustomerVehicleDropdown, setShowCustomerVehicleDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewCustomerName(initialName);
      setNewCustomerPhone(initialPhone);
      setNewCustomerVehicleModel("");
      setNewCustomerLicensePlate("");
    }
  }, [isOpen, initialName, initialPhone]);

  const handleSave = () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) return;
    onAddCustomer({
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim(),
      vehicleModel: newCustomerVehicleModel.trim(),
      licensePlate: newCustomerLicensePlate.trim().toUpperCase(),
    });
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#1e1e2d] rounded-3xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide transition-colors">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold text-base">Thêm khách hàng mới</h3>
          </div>
          <button
            onClick={handleCancel}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-95 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Customer Info Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 ml-1">
              <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Thông tin khách hàng
              </h4>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Tên khách hàng <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-blue-500 transition-all"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Số điện thoại <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="0901234567"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Vehicle Info Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 ml-1">
              <div className="w-1 h-3 bg-green-500 rounded-full"></div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Thông tin xe
              </h4>
            </div>

            <div className="space-y-1.5 relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Loại xe
              </label>
              <input
                type="text"
                value={newCustomerVehicleModel}
                onChange={(e) => {
                  setNewCustomerVehicleModel(e.target.value);
                  setShowCustomerVehicleDropdown(true);
                }}
                onFocus={() => setShowCustomerVehicleDropdown(true)}
                placeholder="Chọn hoặc nhập dòng xe..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-blue-500 transition-all"
              />
              {/* Vehicle Model Dropdown for New Customer */}
              {showCustomerVehicleDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-[200px] overflow-y-auto scrollbar-hide">
                  {POPULAR_MOTORCYCLES.filter((model) =>
                    model.toLowerCase().includes(newCustomerVehicleModel.toLowerCase())
                  )
                    .slice(0, 10)
                    .map((model) => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => {
                          setNewCustomerVehicleModel(model);
                          setShowCustomerVehicleDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700/50 last:border-0 transition-colors"
                      >
                        {model}
                      </button>
                    ))}
                  {POPULAR_MOTORCYCLES.filter((model) =>
                    model.toLowerCase().includes(newCustomerVehicleModel.toLowerCase())
                  ).length === 0 && (
                    <div className="px-4 py-3 text-xs text-slate-500 text-center italic">
                      Không tìm thấy - nhập tên xe mới
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Biển số xe
              </label>
              <input
                type="text"
                value={newCustomerLicensePlate}
                onChange={(e) => setNewCustomerLicensePlate(e.target.value.toUpperCase())}
                placeholder="59G1-12345"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-bold uppercase focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-bold text-xs active:scale-95 transition-all"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!newCustomerName || !newCustomerPhone}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-green-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Lưu khách hàng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
