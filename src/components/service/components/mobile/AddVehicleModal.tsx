import React, { useState, useEffect } from "react";
import { X, Bike } from "lucide-react";
import type { Vehicle } from "../../../../types";

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

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVehicle: (licensePlate: string, model: string) => void;
  editingVehicle: Vehicle | null;
}

export const AddVehicleModal: React.FC<AddVehicleModalProps> = ({
  isOpen,
  onClose,
  onAddVehicle,
  editingVehicle,
}) => {
  const [newVehiclePlate, setNewVehiclePlate] = useState("");
  const [newVehicleName, setNewVehicleName] = useState("");
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);

  useEffect(() => {
    if (editingVehicle) {
      setNewVehiclePlate(editingVehicle.licensePlate);
      setNewVehicleName(editingVehicle.model);
    } else {
      setNewVehiclePlate("");
      setNewVehicleName("");
    }
  }, [editingVehicle, isOpen]);

  const handleSave = () => {
    if (!newVehiclePlate.trim() || !newVehicleName.trim()) return;
    onAddVehicle(newVehiclePlate.trim().toUpperCase(), newVehicleName.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#1e1e2d] rounded-3xl p-5 border border-slate-200 dark:border-slate-700/50 shadow-2xl transition-colors">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Bike className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold text-base">
              {editingVehicle ? "Sửa thông tin xe" : "Thêm xe mới"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-95 transition-all"
            style={{ minWidth: "36px", minHeight: "36px" }}
            aria-label="Close"
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
              onChange={(e) => setNewVehiclePlate(e.target.value.toUpperCase())}
              placeholder="59G1-123.45"
              className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-bold uppercase focus:border-blue-500 transition-all"
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
              className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:border-blue-500 transition-all"
            />

            {showVehicleDropdown && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-[200px] overflow-y-auto scrollbar-hide">
                {(() => {
                  const searchTerm = newVehicleName.toLowerCase();
                  let hasResults = false;

                  return (
                    <>
                      {Object.entries(VEHICLES_BY_BRAND).map(([brand, models]) => {
                        const matchingModels = models.filter((m) =>
                          m.toLowerCase().includes(searchTerm)
                        );
                        if (matchingModels.length === 0) return null;
                        hasResults = true;

                        return (
                          <div key={brand}>
                            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0">
                              {brand}
                            </div>
                            {matchingModels.map((model) => (
                              <button
                                key={model}
                                type="button"
                                onClick={() => {
                                  setNewVehicleName(model);
                                  setShowVehicleDropdown(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-xs text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700/30 last:border-0 transition-colors"
                                style={{ minHeight: "44px" }}
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
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-bold text-xs active:scale-95 transition-all"
              style={{ minHeight: "44px" }}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
              style={{ minHeight: "44px" }}
            >
              {editingVehicle ? "Lưu thay đổi" : "Thêm xe"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
