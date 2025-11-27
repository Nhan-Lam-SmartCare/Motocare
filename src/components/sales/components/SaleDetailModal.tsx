import React from "react";
import type { Sale } from "../../../types";
import { formatCurrency, formatDate, formatAnyId } from "../../../utils/format";

export interface SaleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onPrint: (sale: Sale) => void;
}

const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  isOpen,
  onClose,
  sale,
  onPrint,
}) => {
  if (!isOpen || !sale) return null;

  const itemsTotal = sale.items.reduce(
    (sum, item) => sum + item.quantity * item.sellingPrice,
    0
  );
  const totalDiscount = itemsTotal - sale.total;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Chi tiết đơn hàng
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Sale Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-500 dark:text-slate-400">
                Mã đơn hàng
              </label>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {sale.sale_code || formatAnyId(sale.id) || sale.id}
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-500 dark:text-slate-400">
                Ngày tạo
              </label>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {formatDate(new Date(sale.date), false)}{" "}
                {new Date(sale.date).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-500 dark:text-slate-400">
                Khách hàng
              </label>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {sale.customer.name}
              </div>
              {sale.customer.phone && (
                <div className="text-sm text-slate-500">
                  {sale.customer.phone}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm text-slate-500 dark:text-slate-400">
                Nhân viên bán hàng
              </label>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {(sale as any).username || sale.userName || "N/A"}
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-500 dark:text-slate-400">
                Phương thức thanh toán
              </label>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {sale.paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản"}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Sản phẩm
            </h3>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Tên sản phẩm
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      SL
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Đơn giá
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Thành tiền
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {sale.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                        {item.partName}
                        {item.sku && (
                          <div className="text-xs text-slate-500">
                            SKU: {item.sku}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-900 dark:text-slate-100">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-900 dark:text-slate-100">
                        {formatCurrency(item.sellingPrice)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(item.quantity * item.sellingPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Tạm tính:
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(itemsTotal)}
                </span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Giảm giá:
                  </span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    -{formatCurrency(totalDiscount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-700 pt-2">
                <span className="text-slate-900 dark:text-slate-100">
                  Tổng cộng:
                </span>
                <span className="text-green-600 dark:text-green-400">
                  {formatCurrency(sale.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={() => {
              onPrint(sale);
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            In hóa đơn
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaleDetailModal;
