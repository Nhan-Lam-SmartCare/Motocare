import React, { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "../../../utils/format";
import { supabase } from "../../../supabaseClient";
import type { CustomerDebt, SupplierDebt } from "../../../types";

interface DetailDebtModalProps {
  debt: CustomerDebt | SupplierDebt;
  activeTab: "customer" | "supplier";
  storeSettings: any;
  onClose: () => void;
}

export const DetailDebtModal: React.FC<DetailDebtModalProps> = ({
  debt,
  activeTab: _activeTab,
  storeSettings,
  onClose,
}) => {
  const isCustomerDebt = "customerName" in debt;

  // State for fetched receipt items
  const [receiptItems, setReceiptItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Parse receipt code from description (e.g., "Phiếu NH-20251223-135")
  useEffect(() => {
    const fetchReceiptItems = async () => {
      // Extract receipt code pattern from description
      const receiptCodeMatch = debt.description?.match(/NH-\d{8}-\d+/);
      if (!receiptCodeMatch) return;

      const receiptCode = receiptCodeMatch[0];
      setLoadingItems(true);

      try {
        // Fetch items from inventory_transactions where notes contains the receipt code
        const { data, error } = await supabase
          .from("inventory_transactions")
          .select("*")
          .ilike("notes", `%${receiptCode}%`)
          .eq("type", "Nhập kho")
          .order("created_at", { ascending: true });

        if (error) throw error;
        setReceiptItems(data || []);
      } catch (err) {
        console.error("Error fetching receipt items:", err);
      } finally {
        setLoadingItems(false);
      }
    };

    if (!isCustomerDebt) {
      fetchReceiptItems();
    }
  }, [debt.description, isCustomerDebt]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-[100]">
      <div className="bg-white dark:bg-slate-800 rounded-t-xl md:rounded-xl shadow-2xl max-w-2xl w-full border-x border-t border-slate-200 dark:border-slate-700 max-h-[80vh] mb-20 md:mb-0 flex flex-col">
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-none">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Chi tiết công nợ</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isCustomerDebt ? "Khách hàng" : "Nhà cung cấp"}
              </p>
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                {isCustomerDebt
                  ? (debt as CustomerDebt).customerName
                  : (debt as SupplierDebt).supplierName}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ngày tạo</p>
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                {formatDate(new Date(debt.createdDate))}
              </p>
            </div>
          </div>

          {isCustomerDebt && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Số điện thoại</p>
                <p className="text-base font-semibold text-slate-900 dark:text-white">
                  {(debt as CustomerDebt).phone || "--"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Biển số xe</p>
                <p className="text-base font-semibold text-slate-900 dark:text-white">
                  {(debt as CustomerDebt).licensePlate || "--"}
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Nội dung</p>
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
              <p className="text-slate-900 dark:text-white whitespace-pre-line leading-relaxed">
                {debt.description}
              </p>
            </div>
          </div>

          {/* Receipt Items List (for supplier debts) */}
          {!isCustomerDebt && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                <span>📦 Danh sách hàng nhập</span>
                {receiptItems.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-bold">
                    {receiptItems.length} sản phẩm
                  </span>
                )}
              </p>
              {loadingItems ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-slate-500">Đang tải...</span>
                </div>
              ) : receiptItems.length > 0 ? (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Sản phẩm
                        </th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          SL
                        </th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Giá nhập
                        </th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Thành tiền
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {receiptItems.map((item, index) => (
                        <tr key={item.id || index} className="hover:bg-slate-100 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-3">
                            <div className="font-medium text-slate-900 dark:text-white">
                              {item.partName}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">
                            {item.quantity}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-slate-900 dark:text-white">
                            {formatCurrency(item.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400 text-sm bg-slate-50 dark:bg-slate-900/30 rounded-lg">
                  Không tìm thấy chi tiết hàng nhập
                </div>
              )}
            </div>
          )}

          {/* Financial Summary */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="grid grid-cols-3 gap-2 md:gap-4 divide-x divide-slate-100 dark:divide-slate-700">
              <div className="text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Tổng tiền</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(debt.totalAmount)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Đã trả</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(debt.paidAmount)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Còn nợ</p>
                <p className="text-lg md:text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(debt.remainingAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
              <span>Tiến độ thanh toán</span>
              <span>{Math.round((debt.paidAmount / debt.totalAmount) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all"
                style={{
                  width: `${(debt.paidAmount / debt.totalAmount) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 flex justify-between flex-none bg-white dark:bg-slate-800 rounded-b-xl">
          <button
            onClick={() => {
              const printContent = document.getElementById("debt-print-area");
              if (printContent) {
                const printWindow = window.open("", "_blank");
                if (printWindow) {
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Phiếu Công Nợ - ${
                          isCustomerDebt
                            ? (debt as CustomerDebt).customerName
                            : (debt as SupplierDebt).supplierName
                        }</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
                          .store-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #ddd; }
                          .store-header h2 { margin: 0 0 10px 0; font-size: 24px; color: #0ea5e9; }
                          .store-header p { margin: 5px 0; color: #666; }
                          h1 { text-align: center; margin-bottom: 20px; }
                          .info { margin-bottom: 15px; }
                          .info label { font-weight: bold; }
                          .description { white-space: pre-line; margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }
                          .amounts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
                          .amount-box { padding: 15px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
                          .amount-box label { display: block; font-size: 12px; color: #666; margin-bottom: 5px; }
                          .amount-box .value { font-size: 20px; font-weight: bold; }
                          .total { color: #1e40af; }
                          .paid { color: #16a34a; }
                          .remaining { color: #dc2626; }
                          .bank-info { margin-top: 30px; padding: 20px; background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; }
                          .bank-info h3 { margin: 0 0 15px 0; color: #0369a1; text-align: center; }
                          .bank-info p { margin: 8px 0; }
                          .bank-info strong { display: inline-block; min-width: 150px; }
                          .bank-qr { text-align: center; margin-top: 15px; }
                          .bank-qr img { max-width: 200px; border: 1px solid #ddd; padding: 10px; background: white; }
                          @media print { button { display: none; } }
                        </style>
                      </head>
                      <body>
                        ${
                          storeSettings
                            ? `
                        <div class="store-header">
                          <h2>${storeSettings.store_name || "MOTOCARE"}</h2>
                          ${
                            storeSettings.address
                              ? `<p><svg style="width:12px;height:12px;vertical-align:middle;margin-right:4px" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>${storeSettings.address}</p>`
                              : ""
                          }
                          ${
                            storeSettings.phone
                              ? `<p><svg style="width:12px;height:12px;vertical-align:middle;margin-right:4px" viewBox="0 0 24 24" fill="#16a34a"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>${storeSettings.phone}</p>`
                              : ""
                          }
                        </div>
                        `
                            : ""
                        }
                        ${printContent.innerHTML}
                        ${
                          storeSettings &&
                          (storeSettings.bank_name || storeSettings.bank_account_number)
                            ? `
                        <div class="bank-info">
                          <h3><svg style="width:14px;height:14px;vertical-align:middle;margin-right:4px" viewBox="0 0 24 24" fill="#0891b2"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM4 0h16v2H4zm0 22h16v2H4zm8-10c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-4 4h8v-1c0-1.33-2.67-2-4-2s-4 .67-4 2v1z"/></svg>THÔNG TIN CHUYỂN KHOẢN</h3>
                          ${
                            storeSettings.bank_name
                              ? `<p><strong>Ngân hàng:</strong> ${storeSettings.bank_name}</p>`
                              : ""
                          }
                          ${
                            storeSettings.bank_account_number
                              ? `<p><strong>Số tài khoản:</strong> ${storeSettings.bank_account_number}</p>`
                              : ""
                          }
                          ${
                            storeSettings.bank_account_holder
                              ? `<p><strong>Chủ tài khoản:</strong> ${storeSettings.bank_account_holder}</p>`
                              : ""
                          }
                          ${
                            storeSettings.bank_branch
                              ? `<p><strong>Chi nhánh:</strong> ${storeSettings.bank_branch}</p>`
                              : ""
                          }
                          ${
                            storeSettings.bank_qr_url
                              ? `<div class="bank-qr"><img src="${storeSettings.bank_qr_url}" alt="QR Code" /></div>`
                              : ""
                          }
                        </div>
                        `
                            : ""
                        }
                        <div style="margin-top: 30px; text-align: center;">
                          <button onclick="window.print()" style="padding: 10px 20px; background: #0ea5e9; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">In Phiếu</button>
                        </div>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }
              }
            }}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            In phiếu
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
          >
            Đóng
          </button>
        </div>

        {/* Hidden print area */}
        <div id="debt-print-area" style={{ display: "none" }}>
          <h1>PHIẾU CÔNG NỢ</h1>
          <div className="info">
            <label>{isCustomerDebt ? "Khách hàng:" : "Nhà cung cấp:"}</label>{" "}
            {isCustomerDebt
              ? (debt as CustomerDebt).customerName
              : (debt as SupplierDebt).supplierName}
          </div>
          {isCustomerDebt && (
            <>
              <div className="info">
                <label>Số điện thoại:</label> {(debt as CustomerDebt).phone || "Chưa có"}
              </div>
              <div className="info">
                <label>Biển số xe:</label> {(debt as CustomerDebt).licensePlate || "Chưa có"}
              </div>
            </>
          )}
          <div className="info">
            <label>Ngày tạo:</label> {formatDate(new Date(debt.createdDate))}
          </div>
          <div className="description">
            <strong>Nội dung:</strong>
            <br />
            {debt.description}
          </div>
          <div className="amounts">
            <div className="amount-box">
              <label>Tổng tiền</label>
              <div className="value total">{formatCurrency(debt.totalAmount)}</div>
            </div>
            <div className="amount-box">
              <label>Đã trả</label>
              <div className="value paid">{formatCurrency(debt.paidAmount)}</div>
            </div>
            <div className="amount-box">
              <label>Còn nợ</label>
              <div className="value remaining">{formatCurrency(debt.remainingAmount)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
