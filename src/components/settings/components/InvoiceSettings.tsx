import React from "react";
import { Info } from "lucide-react";
import { StoreSettings } from "../SettingsManager";

interface InvoiceSettingsProps {
  settings: StoreSettings;
  updateField: (field: keyof StoreSettings, value: any) => void;
  isOwner: boolean;
}

export const InvoiceSettings: React.FC<InvoiceSettingsProps> = ({
  settings,
  updateField,
  isOwner,
}) => {
  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white mb-3 md:mb-4">
        Cấu hình hóa đơn
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div>
          <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
            Mã hóa đơn bán
          </label>
          <input
            type="text"
            value={settings.invoice_prefix || "HD"}
            onChange={(e) => updateField("invoice_prefix", e.target.value)}
            disabled={!isOwner}
            placeholder="HD"
            className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
          />
          <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-1">
            VD: HD-001, HD-002
          </p>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
            Mã phiếu nhập
          </label>
          <input
            type="text"
            value={settings.receipt_prefix || "PN"}
            onChange={(e) => updateField("receipt_prefix", e.target.value)}
            disabled={!isOwner}
            placeholder="PN"
            className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
          />
          <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-1">
            VD: PN-001, PN-002
          </p>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
            Mã phiếu sửa chữa
          </label>
          <input
            type="text"
            value={settings.work_order_prefix || "SC"}
            onChange={(e) => updateField("work_order_prefix", e.target.value)}
            disabled={!isOwner}
            placeholder="SC"
            className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
          />
          <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-1">
            VD: SC-001, SC-002
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
          Ghi chú cuối hóa đơn
        </label>
        <textarea
          rows={3}
          value={settings.invoice_footer_note || ""}
          onChange={(e) => updateField("invoice_footer_note", e.target.value)}
          disabled={!isOwner}
          placeholder="Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ!"
          className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div>
          <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
            Định dạng ngày
          </label>
          <select
            value={settings.date_format || "DD/MM/YYYY"}
            onChange={(e) => updateField("date_format", e.target.value)}
            disabled={!isOwner}
            className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
            Đơn vị tiền tệ
          </label>
          <select
            value={settings.currency || "VND"}
            onChange={(e) => updateField("currency", e.target.value)}
            disabled={!isOwner}
            className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
          >
            <option value="VND">VND - Việt Nam Đồng</option>
            <option value="USD">USD - Đô la Mỹ</option>
          </select>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
            Múi giờ
          </label>
          <select
            value={settings.timezone || "Asia/Ho_Chi_Minh"}
            onChange={(e) => updateField("timezone", e.target.value)}
            disabled={!isOwner}
            className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
          >
            <option value="Asia/Ho_Chi_Minh">Hồ Chí Minh (GMT+7)</option>
            <option value="Asia/Bangkok">Bangkok (GMT+7)</option>
            <option value="Asia/Singapore">Singapore (GMT+8)</option>
          </select>
        </div>
      </div>

      {/* Pricing Markup Section */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-4 md:pt-6 mt-4 md:mt-6">
        <h3 className="text-sm md:text-base font-semibold text-slate-900 dark:text-white mb-3 md:mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Cấu hình tỷ lệ giá bán
        </h3>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mb-4">
          Thiết lập % lợi nhuận tự động khi nhập hàng mới. Giá bán = Giá nhập × (1 + % lợi nhuận / 100)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
              % Lợi nhuận giá bán lẻ
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="200"
                value={settings.retail_markup_percent ?? 40}
                onChange={(e) => updateField("retail_markup_percent", Number(e.target.value))}
                disabled={!isOwner}
                placeholder="40"
                className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50 pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-sm">%</span>
            </div>
            <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-1">
              VD: 40% → Giá nhập 100,000đ → Giá lẻ 140,000đ
            </p>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
              % Lợi nhuận giá bán sỉ
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="200"
                value={settings.wholesale_markup_percent ?? 25}
                onChange={(e) => updateField("wholesale_markup_percent", Number(e.target.value))}
                disabled={!isOwner}
                placeholder="25"
                className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50 pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-sm">%</span>
            </div>
            <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-1">
              VD: 25% → Giá nhập 100,000đ → Giá sỉ 125,000đ
            </p>
          </div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 md:p-4 mt-4">
          <div className="flex gap-2 md:gap-3">
            <Info className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs md:text-sm text-emerald-800 dark:text-emerald-300">
              <p className="font-medium mb-1">Ví dụ với giá nhập 100,000đ</p>
              <p>• Giá lẻ ({settings.retail_markup_percent ?? 40}%): <strong>{((100000 * (1 + (settings.retail_markup_percent ?? 40) / 100))).toLocaleString()}đ</strong></p>
              <p>• Giá sỉ ({settings.wholesale_markup_percent ?? 25}%): <strong>{((100000 * (1 + (settings.wholesale_markup_percent ?? 25) / 100))).toLocaleString()}đ</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
