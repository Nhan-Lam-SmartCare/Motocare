import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
// Dùng supabaseClient thống nhất để tránh nhiều phiên GoTrue
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { showToast } from "../../utils/toast";
import { safeAudit } from "../../lib/repository/auditLogsRepository";
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
  Shield,
  Users,
  Printer,
} from "lucide-react";

import {
  GeneralSettings,
  BrandingSettings,
  BankingSettings,
  InvoiceSettings,
  PrintSettings,
  SecuritySettings,
  StaffSettings,
} from "./components";

export interface StoreSettings {
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
  bank_qr_url?: string;
  primary_color?: string;
  theme_preset?: string;
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
  // Pricing markup percentages
  retail_markup_percent?: number; // % lợi nhuận giá lẻ (VD: 40 = 40%)
  wholesale_markup_percent?: number; // % lợi nhuận giá sỉ (VD: 25 = 25%)
  // Print settings
  print_paper_size?: "K80" | "A5";
  print_show_logo?: boolean;
  print_greeting?: string;
}

export interface StaffMember {
  id: string;
  email: string;
  name: string;
  role: "owner" | "manager" | "staff";
  branch_id: string;
  created_at: string;
}

export interface Branch {
  id: string;
  name: string;
}

export const SettingsManager = () => {
  const { profile, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "general" | "branding" | "banking" | "invoice" | "print" | "security" | "staff"
  >("general");

  // Staff management state
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  // Load staff when tab changes to staff
  useEffect(() => {
    if (activeTab === "staff" && hasRole(["owner"])) {
      loadStaff();
      loadBranches();
    }
  }, [activeTab]);

  const loadBranches = async () => {
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name")
        .order("name");

      if (!error && data && data.length > 0) {
        setBranches(data);
      } else {
        const { data: workOrders } = await supabase
          .from("work_orders")
          .select("branchid")
          .limit(100);

        const uniqueBranches = [
          ...new Set(workOrders?.map((w) => w.branchid).filter(Boolean) || []),
        ];

        if (uniqueBranches.length > 0) {
          const branchList = uniqueBranches.map((id) => ({
            id,
            name: id === "CN1" ? "Chi nhánh 1" : id,
          }));
          setBranches(branchList);
        } else {
          setBranches([{ id: "CN1", name: "Chi nhánh 1" }]);
        }
      }
    } catch (error) {
      console.error("Error loading branches:", error);
      setBranches([{ id: "CN1", name: "Chi nhánh 1" }]);
    }
  };

  const loadStaff = async () => {
    setLoadingStaff(true);
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_all_users_for_owner"
      );

      if (!rpcError && rpcData && rpcData.length > 0) {
        setStaffList(rpcData as StaffMember[]);
      } else {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, name, role, branch_id, created_at")
          .order("created_at", { ascending: false });

        if (!profilesError && profilesData && profilesData.length > 0) {
          setStaffList(profilesData as StaffMember[]);
        } else {
          if (profile) {
            setStaffList([
              {
                id: profile.id,
                email: profile.email,
                name: profile.name || profile.full_name || "",
                role: profile.role,
                branch_id: "CN1",
                created_at: profile.created_at,
              },
            ]);
          }

          if (rpcError) {
            console.warn(
              "RPC not available, using fallback. Run sql/2025-12-02_user_management_rpc.sql to enable full user management."
            );
          }
        }
      }
    } catch (error) {
      console.error("Error loading staff:", error);
      if (profile) {
        setStaffList([
          {
            id: profile.id,
            email: profile.email,
            name: profile.name || profile.full_name || "",
            role: profile.role,
            branch_id: "CN1",
            created_at: profile.created_at,
          },
        ]);
      }
    } finally {
      setLoadingStaff(false);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .order("created_at", { ascending: false })
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
      const previous = { ...settings };

      const { error } = await supabase
        .from("store_settings")
        .update(settings)
        .eq("id", settings.id)
        .select();

      if (error) {
        console.error("Update error:", error);
        throw error;
      }

      await loadSettings();
      await queryClient.invalidateQueries({ queryKey: ["store_settings"] });

      showToast.success("Đã lưu cài đặt thành công!");
      void safeAudit(profile?.id || null, {
        action: "settings.update",
        tableName: "store_settings",
        recordId: settings.id,
        oldData: previous,
        newData: settings,
      });
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast.error("Vui lòng chọn file ảnh");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast.error("Kích thước ảnh không được vượt quá 2MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `store-assets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("public-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("public-assets")
        .getPublicUrl(filePath);

      updateField("logo_url", data.publicUrl);
      showToast.success("Đã tải logo lên thành công!");
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      showToast.error(error.message || "Không thể tải logo lên");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast.error("Vui lòng chọn file ảnh");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast.error("Kích thước ảnh không được vượt quá 2MB");
      return;
    }

    setUploadingQR(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `bank-qr-${Date.now()}.${fileExt}`;
      const filePath = `store-assets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("public-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("public-assets")
        .getPublicUrl(filePath);

      updateField("bank_qr_url", data.publicUrl);
      showToast.success("Đã tải mã QR ngân hàng lên thành công!");
    } catch (error: any) {
      console.error("Error uploading QR:", error);
      showToast.error(error.message || "Không thể tải mã QR lên");
    } finally {
      setUploadingQR(false);
    }
  };

  const handleThemePresetSelect = (presetId: string) => {
    if (!settings) return;
    updateField("theme_preset", presetId);

    const themePresets = [
      {
        id: "logo",
        label: "Logo (Xanh/Vàng)",
        primary: "#10B981",
        secondary: "#F59E0B",
      },
      { id: "emerald", label: "Emerald", primary: "#10B981", secondary: "#059669" },
      { id: "amber", label: "Amber", primary: "#F59E0B", secondary: "#D97706" },
      { id: "blue", label: "Blue", primary: "#3B82F6", secondary: "#2563EB" },
    ];

    const preset = themePresets.find((p) => p.id === presetId);
    if (presetId !== "custom" && preset?.primary) {
      updateField("primary_color", preset.primary);
    }
  };

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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <SettingsIcon
              className="w-6 h-6 md:w-7 md:h-7 text-blue-600"
              aria-hidden="true"
            />
            <span>Cài đặt hệ thống</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Quản lý thông tin cửa hàng và cấu hình hệ thống
          </p>
        </div>
        {isOwner && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2 md:px-6 md:py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg text-sm md:text-base font-semibold transition-colors inline-flex items-center justify-center gap-2"
            aria-label="Lưu thay đổi"
          >
            {saving ? (
              <span>Đang lưu...</span>
            ) : (
              <>
                <Save className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
                <span>Lưu thay đổi</span>
              </>
            )}
          </button>
        )}
      </div>

      {!isOwner && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 md:p-4 flex items-start gap-2">
          <Info
            className="w-4 h-4 md:w-5 md:h-5 text-yellow-700 dark:text-yellow-300 mt-0.5 flex-shrink-0"
            aria-hidden="true"
          />
          <p className="text-xs md:text-sm text-yellow-800 dark:text-yellow-200">
            Bạn chỉ có quyền xem. Chỉ chủ cửa hàng mới có thể chỉnh sửa cài đặt.
          </p>
        </div>
      )}

      {/* Tabs Navigation */}
      <div>
        {/* Mobile View: Dropdown */}
        <div className="md:hidden mb-4">
          <label htmlFor="tabs" className="sr-only">
            Chọn mục cài đặt
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {(() => {
                const currentTab = [
                  { id: "general", icon: <Store className="w-5 h-5 text-slate-500" /> },
                  { id: "branding", icon: <Palette className="w-5 h-5 text-slate-500" /> },
                  { id: "banking", icon: <Landmark className="w-5 h-5 text-slate-500" /> },
                  { id: "invoice", icon: <FileText className="w-5 h-5 text-slate-500" /> },
                  { id: "print", icon: <Printer className="w-5 h-5 text-slate-500" /> },
                  { id: "security", icon: <Shield className="w-5 h-5 text-slate-500" /> },
                  { id: "staff", icon: <Users className="w-5 h-5 text-slate-500" /> },
                ].find((t) => t.id === activeTab);
                return currentTab?.icon;
              })()}
            </div>
            <select
              id="tabs"
              name="tabs"
              className="block w-full pl-10 pr-10 py-3 text-base border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm appearance-none"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
            >
              <option value="general">Thông tin chung</option>
              <option value="branding">Thương hiệu</option>
              <option value="banking">Ngân hàng</option>
              <option value="invoice">Hóa đơn</option>
              <option value="print">Mẫu in</option>
              <option value="security">Bảo mật</option>
              {hasRole(["owner"]) && <option value="staff">Nhân viên</option>}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Desktop View: Tabs */}
        <div className="hidden md:block border-b border-slate-200 dark:border-slate-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {[
              {
                id: "general",
                label: "Thông tin chung",
                icon: <Store className="w-4 h-4" />,
              },
              {
                id: "branding",
                label: "Thương hiệu",
                icon: <Palette className="w-4 h-4" />,
              },
              {
                id: "banking",
                label: "Ngân hàng",
                icon: <Landmark className="w-4 h-4" />,
              },
              {
                id: "invoice",
                label: "Hóa đơn",
                icon: <FileText className="w-4 h-4" />,
              },
              {
                id: "print",
                label: "Mẫu in",
                icon: <Printer className="w-4 h-4" />,
              },
              {
                id: "security",
                label: "Bảo mật",
                icon: <Shield className="w-4 h-4" />,
              },
              ...(hasRole(["owner"])
                ? [
                    {
                      id: "staff",
                      label: "Nhân viên",
                      icon: <Users className="w-4 h-4" />,
                    },
                  ]
                : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                  ${activeTab === tab.id
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300"
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 md:p-6">
        {activeTab === "general" && (
          <GeneralSettings
            settings={settings}
            updateField={updateField}
            isOwner={isOwner}
          />
        )}

        {activeTab === "branding" && (
          <BrandingSettings
            settings={settings}
            updateField={updateField}
            isOwner={isOwner}
            uploadingLogo={uploadingLogo}
            handleLogoUpload={handleLogoUpload}
            uploadingQR={uploadingQR}
            handleQRUpload={handleQRUpload}
            handleThemePresetSelect={handleThemePresetSelect}
          />
        )}

        {activeTab === "banking" && (
          <BankingSettings
            settings={settings}
            updateField={updateField}
            isOwner={isOwner}
          />
        )}

        {activeTab === "invoice" && (
          <InvoiceSettings
            settings={settings}
            updateField={updateField}
            isOwner={isOwner}
          />
        )}

        {activeTab === "print" && (
          <PrintSettings
            settings={settings}
            updateField={updateField}
            isOwner={isOwner}
          />
        )}

        {activeTab === "security" && (
          <SecuritySettings
            isOwner={isOwner}
          />
        )}

        {activeTab === "staff" && isOwner && (
          <StaffSettings
            staffList={staffList}
            branches={branches}
            loadingStaff={loadingStaff}
            profile={profile}
            loadStaff={loadStaff}
            loadBranches={loadBranches}
          />
        )}
      </div>

      {/* Save Button (Bottom) */}
      {isOwner && activeTab !== "staff" && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2 md:px-6 md:py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg text-sm md:text-base font-semibold transition-colors inline-flex items-center justify-center gap-2"
            aria-label="Lưu tất cả thay đổi"
          >
            {saving ? (
              <span>Đang lưu...</span>
            ) : (
              <>
                <Save className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
                <span>Lưu tất cả thay đổi</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
