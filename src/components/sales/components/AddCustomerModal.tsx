import React from "react";
import { XMarkIcon } from "../../Icons";

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
  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
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
              placeholder="Nhập số điện thoại"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Dòng xe
            </label>
            <input
              type="text"
              value={newCustomer.vehicleModel}
              onChange={(e) =>
                onCustomerChange({
                  ...newCustomer,
                  vehicleModel: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              placeholder="VD: Honda SH 2023"
            />
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
                  licensePlate: e.target.value,
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
