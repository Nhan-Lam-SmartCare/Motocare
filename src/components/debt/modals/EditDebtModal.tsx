import React, { useState } from "react";
import { formatCurrency } from "../../../utils/format";
import { showToast } from "../../../utils/toast";
import type { CustomerDebt, SupplierDebt } from "../../../types";

interface EditDebtModalProps {
  debt: CustomerDebt | SupplierDebt;
  activeTab: "customer" | "supplier";
  customers: any[];
  suppliers: any[];
  onClose: () => void;
  onSave: (updates: any) => void;
}

export const EditDebtModal: React.FC<EditDebtModalProps> = ({
  debt,
  activeTab: _activeTab,
  customers: _customers,
  suppliers: _suppliers,
  onClose,
  onSave,
}) => {
  const isCustomerDebt = "customerName" in debt;
  const [formData, setFormData] = useState({
    description: debt.description,
    totalAmount: debt.totalAmount,
    paidAmount: debt.paidAmount,
    phone: isCustomerDebt ? (debt as CustomerDebt).phone : "",
    licensePlate: isCustomerDebt ? (debt as CustomerDebt).licensePlate : "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const remainingAmount = formData.totalAmount - formData.paidAmount;

    if (formData.paidAmount > formData.totalAmount) {
      showToast.error("Số tiền đã trả không được lớn hơn tổng tiền!");
      return;
    }

    onSave({
      description: formData.description,
      totalAmount: formData.totalAmount,
      paidAmount: formData.paidAmount,
      remainingAmount,
      ...(isCustomerDebt && {
        phone: formData.phone,
        licensePlate: formData.licensePlate,
      }),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Sửa công nợ</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {isCustomerDebt
                ? (debt as CustomerDebt).customerName
                : (debt as SupplierDebt).supplierName}
            </p>
          </div>

          {isCustomerDebt && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Biển số xe
                </label>
                <input
                  type="text"
                  value={formData.licensePlate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      licensePlate: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Nội dung công nợ
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tổng tiền
            </label>
            <input
              type="number"
              value={formData.totalAmount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  totalAmount: Number(e.target.value),
                })
              }
              min="0"
              className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Đã trả
            </label>
            <input
              type="number"
              value={formData.paidAmount}
              onChange={(e) => setFormData({ ...formData, paidAmount: Number(e.target.value) })}
              min="0"
              max={formData.totalAmount}
              className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Còn nợ:{" "}
              <span className="font-bold">
                {formatCurrency(formData.totalAmount - formData.paidAmount)}
              </span>
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
