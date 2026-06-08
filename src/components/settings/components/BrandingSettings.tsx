import React from "react";
import { Upload, Image as ImageIcon } from "lucide-react";
import { StoreSettings } from "../SettingsManager";

interface ThemePreset {
  id: string;
  label: string;
  primary: string;
  secondary: string;
}

interface BrandingSettingsProps {
  settings: StoreSettings;
  updateField: (field: keyof StoreSettings, value: any) => void;
  isOwner: boolean;
  uploadingLogo: boolean;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  uploadingQR: boolean;
  handleQRUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleThemePresetSelect: (presetId: string) => void;
}

export const BrandingSettings: React.FC<BrandingSettingsProps> = ({
  settings,
  updateField,
  isOwner,
  uploadingLogo,
  handleLogoUpload,
  uploadingQR,
  handleQRUpload,
  handleThemePresetSelect,
}) => {
  const themePresets: ThemePreset[] = [
    {
      id: "logo",
      label: "Logo (Xanh/Vàng)",
      primary: "#10B981",
      secondary: "#F59E0B",
    },
    { id: "emerald", label: "Emerald", primary: "#10B981", secondary: "#059669" },
    { id: "amber", label: "Amber", primary: "#F59E0B", secondary: "#D97706" },
    { id: "blue", label: "Blue", primary: "#3B82F6", secondary: "#2563EB" },
    {
      id: "custom",
      label: "Tùy chỉnh",
      primary: settings?.primary_color || "#3B82F6",
      secondary: settings?.primary_color || "#3B82F6",
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white mb-3 md:mb-4">
        Thương hiệu & Hình ảnh
      </h2>

      {/* Logo Upload */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
            Logo cửa hàng
          </label>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <label
                className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors ${
                  isOwner ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
                }`}
              >
                <Upload className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
                <span className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
                  {uploadingLogo ? "Đang tải lên..." : "Chọn ảnh logo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={!isOwner || uploadingLogo}
                  className="hidden"
                />
              </label>
              <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-1">
                Kích thước tối đa: 2MB. Định dạng: JPG, PNG, SVG
              </p>
            </div>
            {settings.logo_url && (
              <div className="w-24 h-24 md:w-32 md:h-32 border-2 border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-700 flex items-center justify-center">
                <img
                  src={settings.logo_url}
                  alt="Store Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
            Hoặc nhập URL Logo
          </label>
          <input
            type="url"
            value={settings.logo_url || ""}
            onChange={(e) => updateField("logo_url", e.target.value)}
            disabled={!isOwner}
            placeholder="https://..."
            className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
          />
        </div>
      </div>

      {/* QR Code Upload */}
      <div className="space-y-4 pt-4 md:pt-6 border-t border-slate-200 dark:border-slate-700">
        <div>
          <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
            Mã QR ngân hàng
          </label>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <label
                className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors ${
                  isOwner ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
                }`}
              >
                <ImageIcon className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
                <span className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
                  {uploadingQR ? "Đang tải lên..." : "Chọn ảnh QR Code"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQRUpload}
                  disabled={!isOwner || uploadingQR}
                  className="hidden"
                />
              </label>
              <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-1">
                Kích thước tối đa: 2MB. Định dạng: JPG, PNG
              </p>
            </div>
            {settings.bank_qr_url && (
              <div className="w-24 h-24 md:w-32 md:h-32 border-2 border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-700 flex items-center justify-center">
                <img
                  src={settings.bank_qr_url}
                  alt="Bank QR Code"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
            Hoặc nhập URL mã QR
          </label>
          <input
            type="url"
            value={settings.bank_qr_url || ""}
            onChange={(e) => updateField("bank_qr_url", e.target.value)}
            disabled={!isOwner}
            placeholder="https://..."
            className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
          />
        </div>
      </div>

      {/* Theme Presets */}
      <div className="pt-4 md:pt-6 border-t border-slate-200 dark:border-slate-700">
        <div>
          <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Chủ đề giao diện
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {themePresets.map((preset) => {
              const isActive = (settings.theme_preset || "blue") === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleThemePresetSelect(preset.id)}
                  disabled={!isOwner}
                  className={`group rounded-lg border transition p-2 text-left ${
                    isActive
                      ? "border-emerald-500 ring-2 ring-emerald-500/30"
                      : "border-slate-200 dark:border-slate-700"
                  } ${!isOwner ? "opacity-50 cursor-not-allowed" : "hover:border-emerald-400"}`}
                >
                  <div
                    className="h-9 rounded-md mb-2"
                    style={{
                      background:
                        preset.id === "custom"
                          ? preset.primary
                          : `linear-gradient(90deg, ${preset.primary}, ${preset.secondary})`,
                    }}
                  />
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {preset.label}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-2">
            Chọn chủ đề để thay đổi nhanh giao diện theo logo
          </p>
        </div>

        <div className="mt-4">
          <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
            Màu chủ đạo (tùy chỉnh)
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={settings.primary_color || "#3B82F6"}
              onChange={(e) => {
                updateField("primary_color", e.target.value);
                updateField("theme_preset", "custom");
              }}
              disabled={!isOwner}
              className="w-12 h-10 md:w-16 md:h-12 rounded border border-slate-300 dark:border-slate-600 cursor-pointer disabled:opacity-50"
            />
            <input
              type="text"
              value={settings.primary_color || "#3B82F6"}
              onChange={(e) => {
                updateField("primary_color", e.target.value);
                updateField("theme_preset", "custom");
              }}
              disabled={!isOwner}
              placeholder="#3B82F6"
              className="flex-1 px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
            />
          </div>
          <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-1">
            Màu này sẽ được dùng khi chọn preset "Tùy chỉnh"
          </p>
        </div>
      </div>
    </div>
  );
};
