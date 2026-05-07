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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="relative p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Chi Tiết Đơn Hàng</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-[10px] font-bold uppercase tracking-wider">
                    {sale.sale_code || formatAnyId(sale.id)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {formatDate(new Date(sale.date), false)} • {new Date(sale.date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <span className="text-[11px] font-bold uppercase tracking-widest">Khách hàng</span>
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white">{sale.customer.name}</div>
              {sale.customer.phone && (
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                  {sale.customer.phone}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2 mb-3 text-emerald-600 dark:text-emerald-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                <span className="text-[11px] font-bold uppercase tracking-widest">Thanh toán</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {sale.paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản"}
                </span>
                <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-bold uppercase tracking-tight">
                  Đã quyết toán
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Lập bởi: <span className="font-semibold text-slate-700 dark:text-slate-300">{(sale as any).username || sale.userName || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Danh sách sản phẩm</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{sale.items.length} mặt hàng</span>
            </div>
            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Sản phẩm</th>
                    <th className="text-center px-4 py-3.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">SL</th>
                    <th className="text-right px-4 py-3.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{item.partName}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                          Đơn giá: {formatCurrency(item.sellingPrice)}
                          {item.sku && <span className="ml-2">• SKU: {item.sku}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.quantity * item.sellingPrice)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-slate-900 dark:bg-slate-950 p-6 rounded-3xl text-white shadow-xl">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-medium uppercase tracking-widest text-[10px]">Tạm tính</span>
                <span className="font-bold">{formatCurrency(itemsTotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-medium uppercase tracking-widest text-[10px]">Giảm giá</span>
                  <span className="font-bold text-rose-400">-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="h-px bg-slate-800 my-2"></div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-blue-400 font-black uppercase tracking-[0.2em] text-[11px]">Tổng thanh toán</span>
                <span className="text-2xl font-black text-white">{formatCurrency(sale.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
          >
            Đóng
          </button>
          <button
            onClick={() => {
              onPrint(sale);
              onClose();
            }}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            In Hóa Đơn
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaleDetailModal;
