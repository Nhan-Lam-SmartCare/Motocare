import React from "react";
import { formatCurrency } from "../../../utils/format";
import { showToast } from "../../../utils/toast";

interface DebtReceiptModalProps {
  isOpen: boolean;
  data: any;
  onClose: () => void;
  onPrint: () => void;
}

export const DebtReceiptModal: React.FC<DebtReceiptModalProps> = ({
  isOpen,
  data,
  onClose,
  onPrint,
}) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-700 overflow-hidden relative">
        <div className="p-6 pb-2 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-slate-900 dark:text-white text-xl font-bold">Thanh toán thành công!</h2>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">
              {data.isCustomer ? "Người nộp tiền" : "Người thụ hưởng"}
            </p>
            <p className="text-slate-900 dark:text-white font-bold text-lg">
              {data.customerName || data.supplierName}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 text-center border border-slate-100 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Số tiền</p>
            <p
              className={`text-2xl font-bold ${
                data.type === "income"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatCurrency(data.amount)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {data.paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản"}
            </p>
          </div>

          <p className="text-center text-xs text-slate-400">{data.timestamp}</p>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={onPrint}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              In Phiếu
            </button>
            <button
              onClick={() => {
                onPrint();
                showToast.info(
                  "Hệ thống sẽ mở hộp thoại in. Bạn có thể chọn 'Lưu dưới dạng PDF' hoặc chụp ảnh màn hình để chia sẻ."
                );
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Chia sẻ
            </button>
          </div>
          <button onClick={onClose} className="w-full py-3 text-slate-500 hover:text-slate-700 font-medium">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
