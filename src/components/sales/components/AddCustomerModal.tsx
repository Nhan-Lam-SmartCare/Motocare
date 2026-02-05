import React, { useState, useMemo, useRef, useEffect } from "react";
import { XMarkIcon } from "../../Icons";

// Danh sách dòng xe phổ biến tại Việt Nam
const POPULAR_MOTORCYCLES = [
  // === HONDA ===
  "Honda Wave Alpha",
  "Honda Wave RSX",
  "Honda Wave 110i",
  "Honda Future 125",
  "Honda Blade 110",
  "Honda Air Blade 125",
  "Honda Air Blade 160",
  "Honda Vision",
  "Honda Lead 125",
  "Honda SH Mode 125",
  "Honda SH 125i",
  "Honda SH 160i",
  "Honda PCX 125",
  "Honda PCX 160",
  "Honda Vario 125",
  "Honda Vario 160",
  "Honda Winner X",
  "Honda Winner 150",
  "Honda CB150R",
  "Honda CBR150R",
  "Honda MSX 125",
  "Honda Monkey 125",
  "Honda Super Cub C125",
  "Honda Rebel 300",
  "Honda Rebel 500",
  "Honda CB500X",
  "Honda Africa Twin",
  // === YAMAHA ===
  "Yamaha Sirius",
  "Yamaha Jupiter",
  "Yamaha Exciter 150",
  "Yamaha Exciter 155",
  "Yamaha Grande",
  "Yamaha Latte",
  "Yamaha Janus",
  "Yamaha FreeGo 125",
  "Yamaha FreeGo S",
  "Yamaha NVX 125",
  "Yamaha NVX 155",
  "Yamaha Nmax 155",
  "Yamaha Xmax 300",
  "Yamaha R15",
  "Yamaha MT-15",
  "Yamaha TFX 150",
  "Yamaha XSR 155",
  "Yamaha XSR 900",
  "Yamaha Tenere 700",
  // === SUZUKI ===
  "Suzuki Raider 150",
  "Suzuki Satria F150",
  "Suzuki GSX-R150",
  "Suzuki GSX-S150",
  "Suzuki Address",
  "Suzuki Impulse",
  "Suzuki V-Strom 250",
  // === SYM ===
  "SYM Angela",
  "SYM Attila",
  "SYM Shark Mini",
  "SYM Elegant",
  "SYM Star SR",
  // === PIAGGIO/VESPA ===
  "Vespa Sprint",
  "Vespa Primavera",
  "Vespa LX",
  "Vespa GTS",
  "Piaggio Medley",
  "Piaggio Liberty",
  "Piaggio Zip",
  // === VINFAST ===
  "VinFast Klara",
  "VinFast Ludo",
  "VinFast Impes",
  "VinFast Feliz",
  "VinFast Theon",
  "VinFast Evo200",
  // === Khác ===
  "Xe điện khác",
  "Khác",
];

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  newCustomer: {
    name: string;
    phone: string;
    vehicleModel: string;
    licensePlate: string;
  };
  onCustomerChange: (customer: {
    name: string;
    phone: string;
    vehicleModel: string;
    licensePlate: string;
  }) => void;
  onSave: () => void;
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  newCustomer,
  onCustomerChange,
  onSave,
}) => {
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const vehicleInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter vehicle models based on input
  const filteredModels = useMemo(() => {
    if (!newCustomer.vehicleModel.trim()) return POPULAR_MOTORCYCLES.slice(0, 15);
    const search = newCustomer.vehicleModel.toLowerCase();
    return POPULAR_MOTORCYCLES.filter((m) =>
      m.toLowerCase().includes(search)
    ).slice(0, 10);
  }, [newCustomer.vehicleModel]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        vehicleInputRef.current &&
        !vehicleInputRef.current.contains(e.target as Node)
      ) {
        setShowVehicleDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setShowVehicleDropdown(false);
    onCustomerChange({
      name: "",
      phone: "",
      vehicleModel: "",
      licensePlate: "",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Thêm khách hàng mới
          </h3>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tên khách hàng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newCustomer.name}
              onChange={(e) =>
                onCustomerChange({ ...newCustomer, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập tên khách hàng"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Số điện thoại <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={newCustomer.phone}
              onChange={(e) =>
                onCustomerChange({ ...newCustomer, phone: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập SĐT (nhiều số, cách nhau dấu phẩy)"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Dòng xe
            </label>
            <input
              ref={vehicleInputRef}
              type="text"
              value={newCustomer.vehicleModel}
              onChange={(e) => {
                onCustomerChange({
                  ...newCustomer,
                  vehicleModel: e.target.value,
                });
                setShowVehicleDropdown(true);
              }}
              onFocus={() => setShowVehicleDropdown(true)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              placeholder="Chọn hoặc nhập dòng xe..."
              autoComplete="off"
            />
            {/* Vehicle Model Dropdown */}
            {showVehicleDropdown && filteredModels.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-xl max-h-[200px] overflow-y-auto"
              >
                {filteredModels.map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => {
                      onCustomerChange({
                        ...newCustomer,
                        vehicleModel: model,
                      });
                      setShowVehicleDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-600 last:border-0 transition-colors"
                  >
                    {model}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Biển số xe
            </label>
            <input
              type="text"
              value={newCustomer.licensePlate}
              onChange={(e) =>
                onCustomerChange({
                  ...newCustomer,
                  licensePlate: e.target.value.toUpperCase(),
                })
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              placeholder="VD: 30A-12345"
            />
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            Hủy
          </button>
          <button
            onClick={onSave}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCustomerModal;
