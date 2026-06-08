import React, { useState } from "react";
import { formatCurrency } from "../../../utils/format";
import { showToast } from "../../../utils/toast";

interface AddDebtModalProps {
  activeTab: "customer" | "supplier";
  customers: any[];
  suppliers: any[];
  currentBranchId: string;
  onClose: () => void;
  onSave: (debt: any) => void;
}

export const AddDebtModal: React.FC<AddDebtModalProps> = ({
  activeTab,
  customers,
  suppliers,
  currentBranchId,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    customerId: "",
    supplierId: "",
    description: "",
    totalAmount: 0,
    phone: "",
    licensePlate: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === "customer") {
      const customer = customers.find((c) => c.id === formData.customerId);
      if (!customer) {
        showToast.error("Vui lòng chọn khách hàng");
        return;
      }

      onSave({
        customerId: formData.customerId,
        customerName: customer.name,
        phone: formData.phone || customer.phone,
        licensePlate: formData.licensePlate || customer.licensePlate,
        description: formData.description,
        totalAmount: formData.totalAmount,
        paidAmount: 0,
        remainingAmount: formData.totalAmount,
        createdDate: new Date().toISOString(),
        branchId: currentBranchId,
      });
    } else {
      const supplier = suppliers.find((s) => s.id === formData.supplierId);
      if (!supplier) {
        showToast.error("Vui lòng chọn nhà cung cấp");
        return;
      }

      onSave({
        supplierId: formData.supplierId,
        supplierName: supplier.name,
        description: formData.description,
        totalAmount: formData.totalAmount,
        paidAmount: 0,
        remainingAmount: formData.totalAmount,
        createdDate: new Date().toISOString(),
        branchId: currentBranchId,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Thêm công nợ {activeTab === "customer" ? "khách hàng" : "nhà cung cấp"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {activeTab === "customer" ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Khách hàng <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                required
                className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="">Chọn khách hàng...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.phone}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Nhà cung cấp <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                required
                className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="">Chọn nhà cung cấp...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === "customer" && (
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
              Nội dung công nợ <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
              className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              placeholder="Mô tả chi tiết công nợ..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Số tiền <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.totalAmount || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  totalAmount: Number(e.target.value),
                })
              }
              required
              min="0"
              className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              placeholder="0"
            />
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {formatCurrency(formData.totalAmount || 0)}
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
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
            >
              Thêm công nợ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
