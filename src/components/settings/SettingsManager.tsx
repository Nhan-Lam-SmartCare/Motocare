import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { showToast } from "../../utils/toast";
import LoadingSpinner from "../common/LoadingSpinner";
import {
  Lock,
  Settings as SettingsIcon,
  Save,
  Info,
  Store,
  Palette,
  Landmark,
  FileText,
} from "lucide-react";

interface StoreSettings {
  id: string;
  store_name: string;
  store_name_en?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_code?: string;
  logo_url?: string;
  primary_color?: string;
  business_hours?: string;
  established_year?: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  bank_branch?: string;
  invoice_prefix?: string;
  receipt_prefix?: string;
  work_order_prefix?: string;
  invoice_footer_note?: string;
  currency?: string;
  date_format?: string;
  timezone?: string;
}

export const SettingsManager = () => {
  const { profile, hasRole } = useAuth();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "general" | "branding" | "banking" | "invoice"
  >("general");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error("Error loading settings:", error);
      showToast.error("Không thể tải cài đặt");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("store_settings")
        .update(settings)
        .eq("id", settings.id);

      if (error) throw error;
      showToast.success("Đã lưu cài đặt thành công!");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      showToast.error(error.message || "Không thể lưu cài đặt");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof StoreSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  // Check permissions
  if (!hasRole(["owner", "manager"])) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <Lock className="w-5 h-5" aria-hidden="true" />
          <p className="text-lg">
            Chỉ chủ cửa hàng và quản lý mới có quyền truy cập cài đặt
          </p>
        </div>
      </div>
    );
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const isOwner = hasRole(["owner"]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <SettingsIcon
              className="w-7 h-7 text-blue-600"
              aria-hidden="true"
            />
            <span>Cài đặt hệ thống</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Quản lý thông tin cửa hàng và cấu hình hệ thống
          </p>
        </div>
        {isOwner && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
            aria-label="Lưu thay đổi"
          >
            {saving ? (
              <span>Đang lưu...</span>
            ) : (
              <>
                <Save className="w-5 h-5" aria-hidden="true" />
                <span>Lưu thay đổi</span>
              </>
            )}
          </button>
        )}
      </div>

      {!isOwner && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-2">
          <Info
            className="w-5 h-5 text-yellow-700 dark:text-yellow-300 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Bạn chỉ có quyền xem. Chỉ chủ cửa hàng mới có thể chỉnh sửa cài đặt.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-4">
          {[
            {
              id: "general",
              label: "Thông tin chung",
              icon: <Store className="w-4 h-4" aria-hidden="true" />,
            },
            {
              id: "branding",
              label: "Thương hiệu",
              icon: <Palette className="w-4 h-4" aria-hidden="true" />,
            },
            {
              id: "banking",
              label: "Ngân hàng",
              icon: <Landmark className="w-4 h-4" aria-hidden="true" />,
            },
            {
              id: "invoice",
              label: "Hóa đơn",
              icon: <FileText className="w-4 h-4" aria-hidden="true" />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-3 font-medium border-b-2 transition-colors inline-flex items-center gap-2 ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
        {/* General Tab */}
        {activeTab === "general" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Thông tin cửa hàng
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tên cửa hàng *
                </label>
                <input
                  type="text"
                  value={settings.store_name || ""}
                  onChange={(e) => updateField("store_name", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tên tiếng Anh
                </label>
                <input
                  type="text"
                  value={settings.store_name_en || ""}
                  onChange={(e) => updateField("store_name_en", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Slogan
                </label>
                <input
                  type="text"
                  value={settings.slogan || ""}
                  onChange={(e) => updateField("slogan", e.target.value)}
                  disabled={!isOwner}
                  placeholder="Chăm sóc xe máy chuyên nghiệp"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  value={settings.address || ""}
                  onChange={(e) => updateField("address", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={settings.phone || ""}
                  onChange={(e) => updateField("phone", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.email || ""}
                  onChange={(e) => updateField("email", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={settings.website || ""}
                  onChange={(e) => updateField("website", e.target.value)}
                  disabled={!isOwner}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Mã số thuế
                </label>
                <input
                  type="text"
                  value={settings.tax_code || ""}
                  onChange={(e) => updateField("tax_code", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Giờ mở cửa
                </label>
                <input
                  type="text"
                  value={settings.business_hours || ""}
                  onChange={(e) =>
                    updateField("business_hours", e.target.value)
                  }
                  disabled={!isOwner}
                  placeholder="8:00 - 18:00 (T2-T7)"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Năm thành lập
                </label>
                <input
                  type="number"
                  value={settings.established_year || ""}
                  onChange={(e) =>
                    updateField("established_year", Number(e.target.value))
                  }
                  disabled={!isOwner}
                  placeholder="2020"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        )}

        {/* Branding Tab */}
        {activeTab === "branding" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Thương hiệu & Giao diện
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={settings.logo_url || ""}
                  onChange={(e) => updateField("logo_url", e.target.value)}
                  disabled={!isOwner}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Upload logo lên Imgur hoặc Cloudinary và dán link vào
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Màu chủ đạo
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.primary_color || "#3B82F6"}
                    onChange={(e) =>
                      updateField("primary_color", e.target.value)
                    }
                    disabled={!isOwner}
                    className="w-16 h-12 rounded border border-slate-300 dark:border-slate-600 cursor-pointer disabled:opacity-50"
                  />
                  <input
                    type="text"
                    value={settings.primary_color || "#3B82F6"}
                    onChange={(e) =>
                      updateField("primary_color", e.target.value)
                    }
                    disabled={!isOwner}
                    className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {settings.logo_url && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Preview Logo
                </label>
                <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg inline-block">
                  <img
                    src={settings.logo_url}
                    alt="Store Logo"
                    className="max-h-32 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Banking Tab */}
        {activeTab === "banking" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Thông tin ngân hàng
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tên ngân hàng
                </label>
                <input
                  type="text"
                  value={settings.bank_name || ""}
                  onChange={(e) => updateField("bank_name", e.target.value)}
                  disabled={!isOwner}
                  placeholder="Vietcombank"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Số tài khoản
                </label>
                <input
                  type="text"
                  value={settings.bank_account_number || ""}
                  onChange={(e) =>
                    updateField("bank_account_number", e.target.value)
                  }
                  disabled={!isOwner}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Chủ tài khoản
                </label>
                <input
                  type="text"
                  value={settings.bank_account_holder || ""}
                  onChange={(e) =>
                    updateField("bank_account_holder", e.target.value)
                  }
                  disabled={!isOwner}
                  placeholder="NGUYEN VAN A"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Chi nhánh
                </label>
                <input
                  type="text"
                  value={settings.bank_branch || ""}
                  onChange={(e) => updateField("bank_branch", e.target.value)}
                  disabled={!isOwner}
                  placeholder="CN Quận 1"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4 flex items-start gap-2">
              <Info
                className="w-5 h-5 text-blue-700 dark:text-blue-300 mt-0.5"
                aria-hidden="true"
              />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Thông tin này sẽ được in trên hóa đơn để khách hàng chuyển khoản
              </p>
            </div>
          </div>
        )}

        {/* Invoice Tab */}
        {activeTab === "invoice" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Cấu hình hóa đơn
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Mã hóa đơn bán
                </label>
                <input
                  type="text"
                  value={settings.invoice_prefix || "HD"}
                  onChange={(e) =>
                    updateField("invoice_prefix", e.target.value)
                  }
                  disabled={!isOwner}
                  placeholder="HD"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  VD: HD-001, HD-002
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Mã phiếu nhập
                </label>
                <input
                  type="text"
                  value={settings.receipt_prefix || "PN"}
                  onChange={(e) =>
                    updateField("receipt_prefix", e.target.value)
                  }
                  disabled={!isOwner}
                  placeholder="PN"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  VD: PN-001, PN-002
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Mã phiếu sửa chữa
                </label>
                <input
                  type="text"
                  value={settings.work_order_prefix || "SC"}
                  onChange={(e) =>
                    updateField("work_order_prefix", e.target.value)
                  }
                  disabled={!isOwner}
                  placeholder="SC"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  VD: SC-001, SC-002
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Ghi chú cuối hóa đơn
              </label>
              <textarea
                rows={3}
                value={settings.invoice_footer_note || ""}
                onChange={(e) =>
                  updateField("invoice_footer_note", e.target.value)
                }
                disabled={!isOwner}
                placeholder="Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ!"
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Định dạng ngày
                </label>
                <select
                  value={settings.date_format || "DD/MM/YYYY"}
                  onChange={(e) => updateField("date_format", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Đơn vị tiền tệ
                </label>
                <select
                  value={settings.currency || "VND"}
                  onChange={(e) => updateField("currency", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                >
                  <option value="VND">VND - Việt Nam Đồng</option>
                  <option value="USD">USD - US Dollar</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Múi giờ
                </label>
                <select
                  value={settings.timezone || "Asia/Ho_Chi_Minh"}
                  onChange={(e) => updateField("timezone", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                >
                  <option value="Asia/Ho_Chi_Minh">Hồ Chí Minh (GMT+7)</option>
                  <option value="Asia/Bangkok">Bangkok (GMT+7)</option>
                  <option value="Asia/Singapore">Singapore (GMT+8)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button (Bottom) */}
      {isOwner && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
            aria-label="Lưu tất cả thay đổi"
          >
            {saving ? (
              <span>Đang lưu...</span>
            ) : (
              <>
                <Save className="w-5 h-5" aria-hidden="true" />
                <span>Lưu tất cả thay đổi</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
