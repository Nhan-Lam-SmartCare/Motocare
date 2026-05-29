import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
// Dùng supabaseClient thống nhất để tránh nhiều phiên GoTrue
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { showToast } from "../../utils/toast";
import { safeAudit } from "../../lib/repository/auditLogsRepository";
import LoadingSpinner from "../common/LoadingSpinner";
import { MFASetup } from "../auth/MFASetup";
import {
  ACTION_LABELS,
  AppAction,
  getRoleDefaultPermissions,
  normalizePermissionOverrides,
  PermissionOverrides,
} from "../../utils/permissions";
import {
  Lock,
  Settings as SettingsIcon,
  Save,
  Info,
  Store,
  Palette,
  Landmark,
  FileText,
  Upload,
  Image as ImageIcon,
  Shield,
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Check,
  X,
  Mail,
  Building2,
  Printer,
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

interface StaffMember {
  id: string;
  email: string;
  name: string;
  role: "owner" | "manager" | "staff";
  branch_id: string;
  created_at: string;
}

interface Branch {
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
  const [previewDocType, setPreviewDocType] = useState<"sales" | "service">("sales");

  // Staff management state
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffPosition, setNewStaffPosition] = useState("");
  const [newStaffDepartment, setNewStaffDepartment] = useState("");
  const [newStaffBaseSalary, setNewStaffBaseSalary] = useState<number>(0);
  const [newStaffAllowances, setNewStaffAllowances] = useState<number>(0);
  const [newStaffStartDate, setNewStaffStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [newStaffStatus, setNewStaffStatus] = useState<
    "active" | "inactive" | "terminated"
  >("active");
  const [newStaffBankAccount, setNewStaffBankAccount] = useState("");
  const [newStaffBankName, setNewStaffBankName] = useState("");
  const [newStaffTaxCode, setNewStaffTaxCode] = useState("");
  const [newBranchCode, setNewBranchCode] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [selectedPermissionStaffId, setSelectedPermissionStaffId] = useState<
    string | null
  >(null);
  const [staffPermissionsMap, setStaffPermissionsMap] = useState<
    Record<string, PermissionOverrides>
  >({});
  const [newStaffPermissionMode, setNewStaffPermissionMode] = useState<
    "role-default" | "allow-all" | "custom"
  >("role-default");
  const [newStaffPermissions, setNewStaffPermissions] =
    useState<PermissionOverrides>({});
  const [resetPasswordStaff, setResetPasswordStaff] = useState<StaffMember | null>(
    null
  );
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  const permissionGroups = useMemo(
    () => [
      {
        key: "sales",
        label: "Bán hàng",
        actions: ["sale.create", "sale.update", "sale.delete"] as AppAction[],
      },
      {
        key: "service",
        label: "Sửa chữa",
        actions: [
          "work_order.create",
          "work_order.update",
          "work_order.delete",
          "work_order.status.update",
          "work_order.collect_payment",
        ] as AppAction[],
      },
      {
        key: "inventory",
        label: "Kho & Phụ tùng",
        actions: [
          "inventory.import",
          "inventory.adjust",
          "part.create",
          "part.update",
          "part.update_price",
          "part.delete",
        ] as AppAction[],
      },
      {
        key: "finance",
        label: "Tài chính & Báo cáo",
        actions: [
          "finance.view",
          "finance.collect_payment",
          "reports.view",
          "analytics.view",
          "payroll.view",
          "debt.view",
        ] as AppAction[],
      },
      {
        key: "admin",
        label: "Quản trị",
        actions: ["employees.view", "employees.manage", "settings.update", "branches.manage"] as AppAction[],
      },
    ],
    []
  );

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
    {
      id: "custom",
      label: "Tùy chỉnh",
      primary: settings?.primary_color || "#3B82F6",
      secondary: settings?.primary_color || "#3B82F6",
    },
  ];
  const [newStaffRole, setNewStaffRole] = useState<"manager" | "staff">(
    "staff"
  );
  const [newStaffBranch, setNewStaffBranch] = useState("");
  const [savingStaff, setSavingStaff] = useState(false);

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
      // Try to get branches from database first
      const { data, error } = await supabase
        .from("branches")
        .select("id, name")
        .order("name");

      if (!error && data && data.length > 0) {
        setBranches(data);
        if (!newStaffBranch) {
          setNewStaffBranch(data[0].id);
        }
      } else {
        // Fallback: Get unique branch IDs from work_orders or use default
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
          if (!newStaffBranch) {
            setNewStaffBranch(branchList[0].id);
          }
        } else {
          // Default branch if nothing found
          setBranches([{ id: "CN1", name: "Chi nhánh 1" }]);
          if (!newStaffBranch) {
            setNewStaffBranch("CN1");
          }
        }
      }
    } catch (error) {
      console.error("Error loading branches:", error);
      // Set default branch on error
      setBranches([{ id: "CN1", name: "Chi nhánh 1" }]);
      setNewStaffBranch("CN1");
    }
  };

  const loadStaff = async () => {
    setLoadingStaff(true);
    try {
      // Try RPC function first (bypasses RLS)
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_all_users_for_owner"
      );

      if (!rpcError && rpcData && rpcData.length > 0) {
        const normalized = rpcData as StaffMember[];
        setStaffList(normalized);
        await loadStaffPermissions(normalized.map((s) => s.id));
      } else {
        // Fallback: Try to get from profiles table
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, name, role, branch_id, created_at")
          .order("created_at", { ascending: false });

        if (!profilesError && profilesData && profilesData.length > 0) {
          const normalized = profilesData as StaffMember[];
          setStaffList(normalized);
          await loadStaffPermissions(normalized.map((s) => s.id));
        } else {
          // Last fallback: Show current user profile
          if (profile) {
            const fallbackData = [
              {
                id: profile.id,
                email: profile.email,
                name: profile.name || profile.full_name || "",
                role: profile.role,
                branch_id: "CN1",
                created_at: profile.created_at,
              },
            ];
            setStaffList(fallbackData);
            await loadStaffPermissions(fallbackData.map((s) => s.id));
          }

          // Show info toast about RPC function
          if (rpcError) {
            console.warn(
              "RPC not available, using fallback. Run sql/2025-12-02_user_management_rpc.sql to enable full user management."
            );
          }
        }
      }
    } catch (error) {
      console.error("Error loading staff:", error);
      // Show current user as fallback
      if (profile) {
        const fallbackData = [
          {
            id: profile.id,
            email: profile.email,
            name: profile.name || profile.full_name || "",
            role: profile.role,
            branch_id: "CN1",
            created_at: profile.created_at,
          },
        ];
        setStaffList(fallbackData);
        await loadStaffPermissions(fallbackData.map((s) => s.id));
      }
    } finally {
      setLoadingStaff(false);
    }
  };

  const isMissingRelationError = (error: any) => {
    const code = error?.code;
    if (["PGRST116", "PGRST205", "42P01"].includes(code)) return true;
    const message = String(error?.message || "").toLowerCase();
    return (
      message.includes("could not find") ||
      message.includes("relation") ||
      message.includes("does not exist")
    );
  };

  const isAuthAdminPermissionError = (error: any) => {
    const status = Number(error?.status || error?.statusCode || 0);
    const code = String(error?.code || "").toLowerCase();
    const message = String(error?.message || "").toLowerCase();

    if (status === 401 || status === 403) return true;
    if (code.includes("forbidden") || code.includes("unauthorized")) return true;

    return (
      message.includes("not authorized") ||
      message.includes("user not allowed") ||
      message.includes("forbidden") ||
      message.includes("insufficient") ||
      message.includes("permission") ||
      message.includes("admin")
    );
  };

  const loadStaffPermissions = async (staffIds: string[]) => {
    if (!staffIds.length) {
      setStaffPermissionsMap({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from("staff_permissions")
        .select("user_id, permissions")
        .in("user_id", staffIds);

      if (error) {
        if (!isMissingRelationError(error)) {
          console.warn("Error loading staff permissions:", error);
        }
        setStaffPermissionsMap({});
        return;
      }

      const map: Record<string, PermissionOverrides> = {};
      for (const row of data || []) {
        if (row?.user_id) {
          map[row.user_id] = normalizePermissionOverrides(row.permissions);
        }
      }
      setStaffPermissionsMap(map);
    } catch (error) {
      console.warn("Unable to load staff permissions:", error);
      setStaffPermissionsMap({});
    }
  };

  const saveStaffPermissions = async (
    staffId: string,
    permissions: PermissionOverrides
  ) => {
    const cleaned = normalizePermissionOverrides(permissions);
    const hasCustomPermissions = Object.keys(cleaned).length > 0;

    try {
      if (!hasCustomPermissions) {
        const { error } = await supabase
          .from("staff_permissions")
          .delete()
          .eq("user_id", staffId);
        if (error && !isMissingRelationError(error)) throw error;
      } else {
        const { error } = await supabase.from("staff_permissions").upsert(
          {
            user_id: staffId,
            permissions: cleaned,
            updated_by: profile?.id || null,
          },
          { onConflict: "user_id" }
        );
        if (error) throw error;
      }

      setStaffPermissionsMap((prev) => {
        const next = { ...prev };
        if (hasCustomPermissions) {
          next[staffId] = cleaned;
        } else {
          delete next[staffId];
        }
        return next;
      });
    } catch (error: any) {
      if (isMissingRelationError(error)) {
        showToast.error(
          "Chưa có bảng staff_permissions. Hãy chạy script SQL nâng cấp quyền trước."
        );
        return;
      }
      throw error;
    }
  };

  const resolvePermissionMatrix = (
    role: "owner" | "manager" | "staff",
    overrides?: PermissionOverrides
  ) => {
    const defaults = getRoleDefaultPermissions(role);
    return { ...defaults, ...(overrides || {}) };
  };

  const buildPermissionsByMode = (
    role: "owner" | "manager" | "staff",
    mode: "role-default" | "allow-all" | "custom",
    custom: PermissionOverrides
  ) => {
    if (mode === "role-default") return {};
    if (mode === "allow-all") {
      const all: PermissionOverrides = {};
      for (const action of Object.keys(ACTION_LABELS) as AppAction[]) {
        all[action] = true;
      }
      return all;
    }

    const defaults = getRoleDefaultPermissions(role);
    const result: PermissionOverrides = {};
    for (const action of Object.keys(ACTION_LABELS) as AppAction[]) {
      if (typeof custom[action] === "boolean" && custom[action] !== defaults[action]) {
        result[action] = !!custom[action];
      }
    }
    return result;
  };

  const handleUpdateStaffRole = async (
    staffId: string,
    newRole: "owner" | "manager" | "staff",
    newBranchId: string
  ) => {
    setSavingStaff(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole, branch_id: newBranchId })
        .eq("id", staffId);

      if (error) throw error;

      showToast.success("Đã cập nhật quyền nhân viên");
      setEditingStaff(null);
      await loadStaff();

      // Audit log
      void safeAudit(profile?.id || null, {
        action: "staff.update_role",
        tableName: "profiles",
        recordId: staffId,
        newData: { role: newRole, branch_id: newBranchId },
      });
    } catch (error: any) {
      console.error("Error updating staff role:", error);
      showToast.error(error.message || "Không thể cập nhật quyền");
    } finally {
      setSavingStaff(false);
    }
  };

  const closeResetPasswordModal = () => {
    setResetPasswordStaff(null);
    setResetPasswordValue("");
    setResetPasswordConfirm("");
  };

  const handleResetStaffPassword = async () => {
    if (!resetPasswordStaff) return;

    const nextPassword = resetPasswordValue.trim();
    const confirmPassword = resetPasswordConfirm.trim();

    if (nextPassword.length < 6) {
      showToast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    if (nextPassword !== confirmPassword) {
      showToast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    setResettingPassword(true);
    try {
      const { error } = await supabase.auth.admin.updateUserById(
        resetPasswordStaff.id,
        { password: nextPassword }
      );

      if (error) {
        if (!isAuthAdminPermissionError(error)) {
          throw error;
        }

        const redirectTo =
          typeof window !== "undefined"
            ? `${window.location.origin}/reset-password`
            : undefined;

        const { error: resetLinkError } = await supabase.auth.resetPasswordForEmail(
          resetPasswordStaff.email,
          redirectTo ? { redirectTo } : undefined
        );

        if (resetLinkError) {
          throw resetLinkError;
        }

        showToast.info(
          `Không thể đổi trực tiếp. Đã gửi link đặt lại mật khẩu đến ${resetPasswordStaff.email}`
        );
        closeResetPasswordModal();
        return;
      }

      showToast.success(
        `Đã đặt lại mật khẩu cho ${resetPasswordStaff.email} thành công`
      );
      void safeAudit(profile?.id || null, {
        action: "staff.reset_password",
        tableName: "profiles",
        recordId: resetPasswordStaff.id,
        newData: { email: resetPasswordStaff.email },
      });
      closeResetPasswordModal();
    } catch (error: any) {
      console.error("Error resetting staff password:", error);
      showToast.error(error?.message || "Không thể đặt lại mật khẩu");
    } finally {
      setResettingPassword(false);
    }
  };

  const syncEmployeeRecordForStaff = async (input: {
    email: string;
    name: string;
    role: "owner" | "manager" | "staff";
    branchId: string;
    phone?: string;
    position?: string;
    department?: string;
    baseSalary?: number;
    allowances?: number;
    startDate?: string;
    status?: "active" | "inactive" | "terminated";
    bankAccount?: string;
    bankName?: string;
    taxCode?: string;
  }) => {
    const {
      email,
      name,
      role,
      branchId,
      phone,
      position,
      department,
      baseSalary,
      allowances,
      startDate,
      status,
      bankAccount,
      bankName,
      taxCode,
    } = input;

    try {
      const { data: existingEmployee, error: findError } = await supabase
        .from("employees")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (findError && !isMissingRelationError(findError)) {
        console.warn("Unable to check employees table:", findError);
        return;
      }

      const defaultPosition = role === "manager" ? "Quản lý" : "Nhân viên";
      const today = new Date().toISOString().split("T")[0];

      const employeePayload = {
        name: name || email.split("@")[0],
        email,
        phone: phone?.trim() || null,
        position: position?.trim() || defaultPosition,
        department:
          department?.trim() || (role === "manager" ? "Quản lý" : "Vận hành"),
        base_salary: Math.max(0, Number(baseSalary || 0)),
        allowances: Math.max(0, Number(allowances || 0)),
        start_date: startDate || today,
        status: status || "active",
        branch_id: branchId,
        bank_account: bankAccount?.trim() || null,
        bank_name: bankName?.trim() || null,
        tax_code: taxCode?.trim() || null,
      };

      if (existingEmployee?.id) {
        const { error: updateEmployeeError } = await supabase
          .from("employees")
          .update(employeePayload)
          .eq("id", existingEmployee.id);

        if (updateEmployeeError) {
          if (!isMissingRelationError(updateEmployeeError)) {
            console.warn("Unable to update employee record from staff:", updateEmployeeError);
          }
          return;
        }

        await queryClient.invalidateQueries({ queryKey: ["employees"] });
        return;
      }

      const { error: insertEmployeeError } = await supabase.from("employees").insert({
        id: `EMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ...employeePayload,
      });

      if (insertEmployeeError) {
        if (!isMissingRelationError(insertEmployeeError)) {
          console.warn("Unable to create employee record from staff:", insertEmployeeError);
        }
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    } catch (error) {
      console.warn("Failed to sync staff account to employees:", error);
    }
  };

  const handleInviteStaff = async () => {
    if (!newStaffEmail.trim()) {
      showToast.error("Vui lòng nhập email");
      return;
    }

    if (newStaffPassword.trim().length < 6) {
      showToast.error("Vui lòng nhập mật khẩu tạm ít nhất 6 ký tự để tạo tài khoản dùng ngay");
      return;
    }

    setSavingStaff(true);
    try {
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", newStaffEmail.trim().toLowerCase())
        .maybeSingle();

      if (existingUser) {
        showToast.error("Email này đã tồn tại trong hệ thống");
        setSavingStaff(false);
        return;
      }

      const email = newStaffEmail.trim().toLowerCase();
      const metadata = {
        name: newStaffName.trim() || email.split("@")[0],
        role: newStaffRole,
        branch_id: newStaffBranch,
      };

      const hrName = newStaffName.trim() || email.split("@")[0];
      const hrPosition = newStaffPosition.trim() || (newStaffRole === "manager" ? "Quản lý" : "Nhân viên");
      const hrDepartment = newStaffDepartment.trim() || (newStaffRole === "manager" ? "Quản lý" : "Vận hành");

      const desiredOverrides = buildPermissionsByMode(
        newStaffRole,
        newStaffPermissionMode,
        newStaffPermissions
      );

      let createdUserId: string | null = null;
      let error: any = null;

      const createPayload = {
        email,
        password: newStaffPassword.trim(),
        name: metadata.name,
        role: newStaffRole,
        branch_id: newStaffBranch,
        permissions: desiredOverrides,
      };

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const token = session?.access_token;
        if (token) {
          const response = await fetch("/api/staff-create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(createPayload),
          });

          if (response.ok) {
            const payload = await response.json();
            createdUserId = payload?.userId || null;
          } else {
            const payload = await response.json().catch(() => null);
            const message = payload?.error || `HTTP ${response.status}`;
            error = new Error(message);
          }
        }
      } catch (serverCreateError: any) {
        error = serverCreateError;
      }

      if (!createdUserId) {
        const createResult = await supabase.auth.admin.createUser({
          email,
          password: newStaffPassword.trim(),
          email_confirm: true,
          user_metadata: metadata,
        });

        error = createResult.error || error;
        createdUserId = createResult.data.user?.id || null;
      }

      if (error) {
        if (isAuthAdminPermissionError(error)) {
          showToast.error(
            "Chưa có quyền tạo tài khoản trực tiếp. Cần cấu hình API server với SUPABASE_SERVICE_ROLE_KEY để owner tạo xong dùng ngay."
          );
          return;
        }
        throw error;
      }

      if (createdUserId) {
        await saveStaffPermissions(createdUserId, desiredOverrides);

        // Ensure profile reflects role/branch if project uses profiles table.
        await supabase
          .from("profiles")
          .upsert(
            {
              id: createdUserId,
              email,
              name: metadata.name,
              role: newStaffRole,
              branch_id: newStaffBranch,
            },
            { onConflict: "id" }
          );

      }

      await syncEmployeeRecordForStaff({
        email,
        name: hrName,
        role: newStaffRole,
        branchId: newStaffBranch,
        phone: newStaffPhone,
        position: hrPosition,
        department: hrDepartment,
        baseSalary: newStaffBaseSalary,
        allowances: newStaffAllowances,
        startDate: newStaffStartDate,
        status: newStaffStatus,
        bankAccount: newStaffBankAccount,
        bankName: newStaffBankName,
        taxCode: newStaffTaxCode,
      });

      showToast.success(`Đã tạo tài khoản cho ${email}. Nhân viên có thể đăng nhập ngay.`);
      setShowAddStaff(false);
      resetNewStaffForm();
      await loadStaff();

      void safeAudit(profile?.id || null, {
        action: "staff.invite",
        tableName: "profiles",
        newData: {
          email: newStaffEmail,
          role: newStaffRole,
          branch_id: newStaffBranch,
          permission_mode: newStaffPermissionMode,
        },
      });
    } catch (error: any) {
      console.error("Error inviting staff:", error);
      showToast.error(error.message || "Không thể tạo tài khoản nhân viên");
    } finally {
      setSavingStaff(false);
    }
  };

  const resetNewStaffForm = () => {
    setNewStaffEmail("");
    setNewStaffName("");
    setNewStaffPassword("");
    setNewStaffPhone("");
    setNewStaffPosition("");
    setNewStaffDepartment("");
    setNewStaffBaseSalary(0);
    setNewStaffAllowances(0);
    setNewStaffStartDate(new Date().toISOString().split("T")[0]);
    setNewStaffStatus("active");
    setNewStaffBankAccount("");
    setNewStaffBankName("");
    setNewStaffTaxCode("");
    setNewStaffRole("staff");
    setNewStaffBranch(branches[0]?.id || "");
    setNewStaffPermissionMode("role-default");
    setNewStaffPermissions({});
  };

  const handleCreateBranch = async () => {
    if (!newBranchCode.trim() || !newBranchName.trim()) {
      showToast.error("Vui lòng nhập mã chi nhánh và tên chi nhánh");
      return;
    }

    const branchId = newBranchCode.trim().toUpperCase();

    if (branches.some((branch) => branch.id === branchId)) {
      showToast.error("Mã chi nhánh đã tồn tại");
      return;
    }

    setSavingStaff(true);
    try {
      const { error } = await supabase.from("branches").insert({
        id: branchId,
        name: newBranchName.trim(),
      });

      if (error) throw error;

      await loadBranches();
      setNewStaffBranch(branchId);
      setShowAddBranch(false);
      setNewBranchCode("");
      setNewBranchName("");
      showToast.success("Đã thêm chi nhánh mới");
    } catch (error: any) {
      if (isMissingRelationError(error)) {
        showToast.error("Không tìm thấy bảng branches. Hãy tạo bảng chi nhánh trước.");
      } else {
        showToast.error(error?.message || "Không thể thêm chi nhánh");
      }
    } finally {
      setSavingStaff(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "manager":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner":
        return "Chủ cửa hàng";
      case "manager":
        return "Quản lý";
      default:
        return "Nhân viên";
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

      // Update settings
      const { error, data } = await supabase
        .from("store_settings")
        .update(settings)
        .eq("id", settings.id)
        .select();

      if (error) {
        console.error("Update error:", error);
        throw error;
      }

      // Reload settings after save to confirm changes
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

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showToast.error("Vui lòng chọn file ảnh");
      return;
    }

    // Validate file size (max 2MB)
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

    const preset = themePresets.find((p) => p.id === presetId);
    if (presetId !== "custom" && preset?.primary) {
      updateField("primary_color", preset.primary);
    }
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
  const selectedPermissionStaff = staffList.find(
    (staff) => staff.id === selectedPermissionStaffId
  );
  const branchSet = new Set(
    staffList.map((staff) => staff.branch_id).filter(Boolean)
  );
  const staffStats = {
    total: staffList.length,
    managers: staffList.filter((staff) => staff.role === "manager").length,
    branches: branchSet.size,
  };

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
        {/* General Tab */}
        {activeTab === "general" && (
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white mb-3 md:mb-4">
              Thông tin cửa hàng
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                  Tên cửa hàng *
                </label>
                <input
                  type="text"
                  value={settings.store_name || ""}
                  onChange={(e) => updateField("store_name", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                  Tên tiếng Anh
                </label>
                <input
                  type="text"
                  value={settings.store_name_en || ""}
                  onChange={(e) => updateField("store_name_en", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                  Slogan
                </label>
                <input
                  type="text"
                  value={settings.slogan || ""}
                  onChange={(e) => updateField("slogan", e.target.value)}
                  disabled={!isOwner}
                  placeholder="Chăm sóc xe máy chuyên nghiệp"
                  className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  value={settings.address || ""}
                  onChange={(e) => updateField("address", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={settings.phone || ""}
                  onChange={(e) => updateField("phone", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                  Facebook
                </label>
                <input
                  type="text"
                  value={settings.email || ""}
                  onChange={(e) => updateField("email", e.target.value)}
                  disabled={!isOwner}
                  placeholder="Link Facebook hoặc Tên Fanpage"
                  className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={settings.website || ""}
                  onChange={(e) => updateField("website", e.target.value)}
                  disabled={!isOwner}
                  placeholder="https://..."
                  className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                  Mã số thuế
                </label>
                <input
                  type="text"
                  value={settings.tax_code || ""}
                  onChange={(e) => updateField("tax_code", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
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
                  className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
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
                  className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        )}

        {/* Branding Tab */}
        {activeTab === "branding" && (
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
                      className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors ${isOwner
                        ? "cursor-pointer"
                        : "opacity-50 cursor-not-allowed"
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
                      className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors ${isOwner
                        ? "cursor-pointer"
                        : "opacity-50 cursor-not-allowed"
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
                    const isActive =
                      (settings.theme_preset || "blue") === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleThemePresetSelect(preset.id)}
                        disabled={!isOwner}
                        className={`group rounded-lg border transition p-2 text-left ${isActive
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
        )}

        {/* Banking Tab */}
        {activeTab === "banking" && (
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white mb-3 md:mb-4">
              Thông tin ngân hàng
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                  Tên ngân hàng *
                </label>
                <input
                  type="text"
                  value={settings.bank_name || ""}
                  onChange={(e) => updateField("bank_name", e.target.value)}
                  disabled={!isOwner}
                  placeholder="VD: Vietcombank, Techcombank, MB Bank..."
                  className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                  Số tài khoản *
                </label>
                <input
                  type="text"
                  value={settings.bank_account_number || ""}
                  onChange={(e) =>
                    updateField("bank_account_number", e.target.value)
                  }
                  disabled={!isOwner}
                  className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                  Chủ tài khoản *
                </label>
                <input
                  type="text"
                  value={settings.bank_account_holder || ""}
                  onChange={(e) =>
                    updateField("bank_account_holder", e.target.value)
                  }
                  disabled={!isOwner}
                  placeholder="VD: NGUYEN VAN A"
                  className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 md:mb-2">
                  Chi nhánh
                </label>
                <input
                  type="text"
                  value={settings.bank_branch || ""}
                  onChange={(e) => updateField("bank_branch", e.target.value)}
                  disabled={!isOwner}
                  placeholder="VD: Chi nhánh Quận 1, TP.HCM"
                  className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 md:p-4">
              <div className="flex gap-2 md:gap-3">
                <Info className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs md:text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-medium mb-1">Thông tin ngân hàng</p>
                  <p>
                    Thông tin này sẽ được hiển thị trên các hóa đơn, biên nhận
                    và phiếu dịch vụ. Khách hàng có thể quét mã QR hoặc chuyển
                    khoản theo thông tin này.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Tab */}
        {activeTab === "invoice" && (
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
                  onChange={(e) =>
                    updateField("invoice_prefix", e.target.value)
                  }
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
                  onChange={(e) =>
                    updateField("receipt_prefix", e.target.value)
                  }
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
                  onChange={(e) =>
                    updateField("work_order_prefix", e.target.value)
                  }
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
                onChange={(e) =>
                  updateField("invoice_footer_note", e.target.value)
                }
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
                      onChange={(e) =>
                        updateField("retail_markup_percent", Number(e.target.value))
                      }
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
                      onChange={(e) =>
                        updateField("wholesale_markup_percent", Number(e.target.value))
                      }
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
        )}

        {/* Print Templates Tab */}
        {activeTab === "print" && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Controls Column */}
              <div className="flex-1 space-y-6 max-w-xl">
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <Printer className="w-5 h-5 text-blue-600" />
                    <span>Cấu hình Mẫu in</span>
                  </h2>
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                    Cấu hình trực quan kích thước giấy, logo và chân trang cho hóa đơn bán hàng và phiếu sửa chữa.
                  </p>
                </div>

                {/* Paper Size selector */}
                <div className="space-y-3">
                  <label className="block text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Khổ giấy mặc định
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* K80 Selector Card */}
                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => updateField("print_paper_size", "K80")}
                      className={`relative flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                        (settings.print_paper_size || "K80") === "K80"
                          ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 ring-2 ring-blue-500/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800"
                      } ${!isOwner ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="w-12 h-14 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded flex flex-col justify-between p-1.5 shadow-sm mb-3">
                        <div className="h-1 bg-slate-300 dark:bg-slate-500 rounded w-full" />
                        <div className="space-y-0.5 w-full">
                          <div className="h-0.5 bg-slate-300 dark:bg-slate-500 rounded w-3/4 mx-auto" />
                          <div className="h-0.5 bg-slate-300 dark:bg-slate-500 rounded w-1/2 mx-auto" />
                        </div>
                        <div className="h-1 bg-blue-500 rounded w-2/3 mx-auto" />
                      </div>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Khổ giấy K80</span>
                      <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-1">In nhiệt (80mm) siêu nhanh</span>
                      {(settings.print_paper_size || "K80") === "K80" && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</div>
                      )}
                    </button>

                    {/* A5 Selector Card */}
                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => updateField("print_paper_size", "A5")}
                      className={`relative flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                        (settings.print_paper_size || "K80") === "A5"
                          ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 ring-2 ring-blue-500/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800"
                      } ${!isOwner ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="w-16 h-12 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded flex flex-col justify-between p-2 shadow-sm mb-3">
                        <div className="flex gap-2">
                          <div className="h-2 w-2 bg-slate-300 dark:bg-slate-500 rounded-full" />
                          <div className="h-1 bg-slate-300 dark:bg-slate-500 rounded flex-1 mt-0.5" />
                        </div>
                        <div className="space-y-0.5 w-full">
                          <div className="h-0.5 bg-slate-300 dark:bg-slate-500 rounded w-full" />
                          <div className="h-0.5 bg-slate-300 dark:bg-slate-500 rounded w-5/6" />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Khổ giấy A5</span>
                      <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-1">Nửa trang A4 (148mm) lịch sự</span>
                      {(settings.print_paper_size || "K80") === "A5" && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Show/Hide Logo */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700/50">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Hiển thị Logo cửa hàng</span>
                      <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400">Ẩn hoặc hiện logo thương hiệu trên phiếu in</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.print_show_logo !== false}
                        onChange={(e) => updateField("print_show_logo", e.target.checked)}
                        disabled={!isOwner}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Greeting bottom message */}
                <div className="space-y-2">
                  <label className="block text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Lời chào / Lời cảm ơn (Chân trang)
                  </label>
                  <textarea
                    rows={3}
                    value={settings.print_greeting || "Cảm ơn quý khách! Hẹn gặp lại"}
                    onChange={(e) => updateField("print_greeting", e.target.value)}
                    disabled={!isOwner}
                    placeholder="VD: Cảm ơn quý khách! Hẹn gặp lại..."
                    className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 self-center">Chọn nhanh:</span>
                    {[
                      "Cảm ơn quý khách! Hẹn gặp lại",
                      "Chúc quý khách thượng lộ bình an!",
                      "Cảm ơn quý khách! Bảo hành 6 tháng.",
                    ].map((tpl) => (
                      <button
                        key={tpl}
                        type="button"
                        disabled={!isOwner}
                        onClick={() => updateField("print_greeting", tpl)}
                        className="text-xs bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md transition-colors"
                      >
                        {tpl.length > 25 ? tpl.slice(0, 25) + "..." : tpl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Info edit */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Thông tin hiển thị tiêu đề in (Chỉnh sửa nhanh)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Tên cửa hàng</label>
                      <input
                        type="text"
                        value={settings.store_name || ""}
                        onChange={(e) => updateField("store_name", e.target.value)}
                        disabled={!isOwner}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Số điện thoại</label>
                      <input
                        type="text"
                        value={settings.phone || ""}
                        onChange={(e) => updateField("phone", e.target.value)}
                        disabled={!isOwner}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Địa chỉ</label>
                      <input
                        type="text"
                        value={settings.address || ""}
                        onChange={(e) => updateField("address", e.target.value)}
                        disabled={!isOwner}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Visual Preview Column */}
              <div className="flex-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl p-4 md:p-6 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-start min-h-[500px]">
                <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-200 dark:border-slate-800 pb-3 flex-shrink-0">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                      Xem trước trực quan (Live Preview)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Document Selector Segmented Control */}
                    <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setPreviewDocType("sales")}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          previewDocType === "sales"
                            ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                        }`}
                      >
                        Hóa đơn lẻ
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDocType("service")}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          previewDocType === "service"
                            ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                        }`}
                      >
                        Phiếu sửa chữa
                      </button>
                    </div>
                    <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2.5 py-1 rounded-full font-bold">
                      Khổ {(settings.print_paper_size || "K80")}
                    </span>
                  </div>
                </div>

                {/* Visual simulator container */}
                <div className="flex-grow w-full overflow-x-auto flex justify-center items-start pt-2">
                  <div
                    className="bg-white text-black shadow-lg rounded border border-slate-300 transition-all duration-300 font-sans"
                    style={{
                      width: (settings.print_paper_size || "K80") === "K80" ? "320px" : "500px",
                      minHeight: "450px",
                      padding: (settings.print_paper_size || "K80") === "K80" ? "12px" : "24px",
                      fontSize: (settings.print_paper_size || "K80") === "K80" ? "8pt" : "10pt",
                      lineHeight: "1.3",
                    }}
                  >
                    {previewDocType === "sales" ? (
                      /* RETAIL SALES RECEIPT PREVIEW */
                      <>
                        {/* Invoice Header */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            borderBottom: "1.5px solid #2563eb",
                            paddingBottom: "8px",
                            marginBottom: "10px",
                          }}
                        >
                          {/* Logo (if active) */}
                          {(settings.print_show_logo !== false) && (
                            <div style={{ flexShrink: 0 }}>
                              <img
                                src={settings.logo_url || "/logo-smartcare.png"}
                                alt="Preview Logo"
                                style={{
                                  width: (settings.print_paper_size || "K80") === "K80" ? "36px" : "48px",
                                  height: (settings.print_paper_size || "K80") === "K80" ? "36px" : "48px",
                                  objectFit: "contain",
                                  border: "1px solid #eee",
                                  borderRadius: "4px",
                                }}
                              />
                            </div>
                          )}

                          {/* Header details */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: "bold", fontSize: (settings.print_paper_size || "K80") === "K80" ? "9.5pt" : "12pt", color: "#1e40af", textTransform: "uppercase" }}>
                              {settings.store_name || "Nhạn Lâm SmartCare"}
                            </div>
                            <div style={{ fontSize: "7.5pt", color: "#444", marginTop: "1px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                              Địa chỉ: {settings.address || "Ấp Phú Lợi B, Xã Long Phú Thuận, Đông Tháp"}
                            </div>
                            <div style={{ fontSize: "7.5pt", color: "#444" }}>
                              SĐT: {settings.phone || "0907.239.337"}
                            </div>
                          </div>
                        </div>

                        {/* Invoice Title */}
                        <div style={{ textAlign: "center", marginBottom: "8px" }}>
                          <div style={{ fontWeight: "bold", fontSize: (settings.print_paper_size || "K80") === "K80" ? "11pt" : "14pt", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Hóa đơn bán lẻ
                          </div>
                          <div style={{ fontSize: "7.5pt", color: "#666", marginTop: "2px" }}>
                            Mã: <strong>#HD18549</strong> - 29/05/2026
                          </div>
                        </div>

                        {/* Customer Section */}
                        <div style={{ borderBottom: "1px dashed #bbb", paddingBottom: "6px", marginBottom: "8px", fontSize: "8pt" }}>
                          <div><strong>Khách hàng:</strong> Nguyễn Văn A</div>
                          <div><strong>SĐT:</strong> 0909xxxxxx</div>
                          <div><strong>NV bán hàng:</strong> Admin</div>
                        </div>

                        {/* Table of items */}
                        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px" }}>
                          <thead>
                            <tr style={{ borderBottom: "1.2px solid #000", fontWeight: "bold" }}>
                              <th style={{ textAlign: "left", paddingBottom: "4px" }}>Tên SP</th>
                              <th style={{ textAlign: "center", width: "30px", paddingBottom: "4px" }}>SL</th>
                              <th style={{ textAlign: "right", width: "80px", paddingBottom: "4px" }}>T.Tiền</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: "1px dashed #eee" }}>
                              <td style={{ paddingTop: "5px", paddingBottom: "5px" }}>
                                <div style={{ fontWeight: "bold" }}>Dầu nhớt Castrol Power1</div>
                                {(settings.print_paper_size || "K80") === "A5" && <div style={{ fontSize: "7.5pt", color: "#666" }}>Lon 1L - Bảo dưỡng máy</div>}
                              </td>
                              <td style={{ textAlign: "center", verticalAlign: "top", paddingTop: "5px" }}>1</td>
                              <td style={{ textAlign: "right", fontWeight: "bold", verticalAlign: "top", paddingTop: "5px" }}>150,000</td>
                            </tr>
                            <tr style={{ borderBottom: "1px dashed #eee" }}>
                              <td style={{ paddingTop: "5px", paddingBottom: "5px" }}>
                                <div style={{ fontWeight: "bold" }}>Bugi NGK chính hãng</div>
                                {(settings.print_paper_size || "K80") === "A5" && <div style={{ fontSize: "7.5pt", color: "#666" }}>Chân đồng nhập khẩu</div>}
                              </td>
                              <td style={{ textAlign: "center", verticalAlign: "top", paddingTop: "5px" }}>1</td>
                              <td style={{ textAlign: "right", fontWeight: "bold", verticalAlign: "top", paddingTop: "5px" }}>80,000</td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Totals section */}
                        <div style={{ borderTop: "1.5px solid #333", paddingTop: "6px", marginBottom: "10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", marginBottom: "3px" }}>
                            <span>Tổng tiền hàng:</span>
                            <span>230,000 đ</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: (settings.print_paper_size || "K80") === "K80" ? "9.5pt" : "11pt" }}>
                            <span>TỔNG CỘNG:</span>
                            <span style={{ color: "#2563eb" }}>230,000 đ</span>
                          </div>
                          <div style={{ fontSize: "7.5pt", fontStyle: "italic", textAlign: "right", marginTop: "3px", color: "#555" }}>
                            (Hình thức: Tiền mặt)
                          </div>
                        </div>

                        {/* Bank Transfer QR section if configured */}
                        {settings.bank_name && (
                          <div style={{ border: "1px solid #ddd", padding: "6px", borderRadius: "6px", backgroundColor: "#f0f9ff", display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px" }}>
                            <div style={{ width: "42px", height: "42px", backgroundColor: "#fff", border: "1px solid #ddd", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <span style={{ fontSize: "14px" }}>📱</span>
                            </div>
                            <div style={{ flex: 1, fontSize: "7pt" }}>
                              <div style={{ fontWeight: "bold", color: "#1e40af" }}>Chuyển khoản QR ngân hàng:</div>
                              <div>{settings.bank_name} - <strong>{settings.bank_account_number}</strong></div>
                              <div style={{ textTransform: "uppercase", fontSize: "6.5pt", color: "#555" }}>{settings.bank_account_holder}</div>
                            </div>
                          </div>
                        )}

                        {/* Custom Greeting Bottom Message */}
                        <div style={{ borderTop: "1px dashed #bbb", paddingTop: "8px", marginTop: "12px", textAlign: "center", fontSize: "7.5pt", color: "#666", fontStyle: "italic" }}>
                          <div>{settings.print_greeting || "Cảm ơn quý khách! Hẹn gặp lại"}</div>
                          <div style={{ fontSize: "6.5pt", color: "#999", marginTop: "2px" }}>Motocare SmartCare Systems</div>
                        </div>
                      </>
                    ) : (
                      /* SERVICE WORK ORDER PREVIEW */
                      <>
                        {/* Service Header */}
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            marginBottom: "10px",
                            borderBottom: "2px solid #3b82f6",
                            paddingBottom: "8px",
                            alignItems: "center",
                          }}
                        >
                          {/* Left: Logo */}
                          {(settings.print_show_logo !== false) && (
                            <img
                              src={settings.logo_url || "/logo-smartcare.png"}
                              alt="Logo"
                              style={{
                                height: (settings.print_paper_size || "K80") === "K80" ? "36px" : "48px",
                                width: (settings.print_paper_size || "K80") === "K80" ? "36px" : "48px",
                                objectFit: "contain",
                                flexShrink: 0,
                              }}
                            />
                          )}

                          {/* Center: Store Info */}
                          <div style={{ fontSize: "7.5pt", lineHeight: "1.3", flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: "bold", fontSize: (settings.print_paper_size || "K80") === "K80" ? "9.5pt" : "11pt", color: "#1e40af", marginBottom: "2px", textTransform: "uppercase" }}>
                              {settings.store_name || "Nhạn Lâm SmartCare"}
                            </div>
                            <div style={{ color: "#444", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                              📍 {settings.address || "Ấp Phú Lợi B, Xã Long Phú Thuận, Đông Tháp"}
                            </div>
                            <div style={{ color: "#444" }}>
                              📞 {settings.phone || "0907.239.337"}
                            </div>
                          </div>
                        </div>

                        {/* Title & Meta */}
                        <div style={{ marginBottom: "8px", textAlign: "center" }}>
                          <h1 style={{ fontSize: (settings.print_paper_size || "K80") === "K80" ? "11pt" : "13pt", fontWeight: "bold", margin: "0", textTransform: "uppercase", color: "#1e40af" }}>
                            PHIẾU DỊCH VỤ SỬA CHỮA
                          </h1>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "7pt", color: "#666", marginTop: "2px" }}>
                            <div>13:50 28/05/2026</div>
                            <div>Mã: <strong>#SC-20260528-024032</strong></div>
                          </div>
                        </div>

                        {/* Customer Info Card */}
                        <div
                          style={{
                            border: "1px solid #ddd",
                            padding: "8px",
                            marginBottom: "8px",
                            borderRadius: "6px",
                            backgroundColor: "#f8fafc",
                            fontSize: "7.5pt",
                            lineHeight: "1.4",
                          }}
                        >
                          <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: "bold" }}>Khách hàng:</span> Nguyễn Thị Lùn
                            </div>
                            <div>
                              <span style={{ fontWeight: "bold" }}>SĐT:</span> 0388696965
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: "bold" }}>Loại xe:</span> Honda Wave Alpha
                            </div>
                            <div>
                              <span style={{ fontWeight: "bold" }}>Biển số:</span> 67K1-82082
                            </div>
                          </div>
                        </div>

                        {/* Issue Description */}
                        <div
                          style={{
                            border: "1px solid #ddd",
                            padding: "6px",
                            marginBottom: "8px",
                            borderRadius: "6px",
                            fontSize: "7.5pt",
                            color: "#000",
                          }}
                        >
                          <div style={{ display: "flex", gap: "6px" }}>
                            <div style={{ fontWeight: "bold", minWidth: "60px", flexShrink: 0 }}>Mô tả sự cố:</div>
                            <div style={{ flex: 1 }}>Xe mất lửa bugi, thay cục sạc và bảo dưỡng định kỳ.</div>
                          </div>
                        </div>

                        {/* Parts and Services Table */}
                        <div style={{ marginBottom: "8px" }}>
                          <div style={{ fontWeight: "bold", marginBottom: "4px", fontSize: "8pt" }}>Phụ tùng và dịch vụ:</div>
                          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
                            <thead>
                              <tr style={{ backgroundColor: "#f5f5f5", fontSize: "7.5pt", fontWeight: "bold" }}>
                                <th style={{ border: "1px solid #ddd", padding: "4px", textAlign: "center", width: "10%" }}>STT</th>
                                <th style={{ border: "1px solid #ddd", padding: "4px", textAlign: "left" }}>Tên</th>
                                <th style={{ border: "1px solid #ddd", padding: "4px", textAlign: "center", width: "15%" }}>SL</th>
                                <th style={{ border: "1px solid #ddd", padding: "4px", textAlign: "right", width: "25%" }}>Đơn giá</th>
                                <th style={{ border: "1px solid #ddd", padding: "4px", textAlign: "right", width: "25%" }}>Thành tiền</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr style={{ fontSize: "7.5pt" }}>
                                <td style={{ border: "1px solid #ddd", padding: "4px", textAlign: "center" }}>1</td>
                                <td style={{ border: "1px solid #ddd", padding: "4px" }}>Cục sạc 110</td>
                                <td style={{ border: "1px solid #ddd", padding: "4px", textAlign: "center" }}>1</td>
                                <td style={{ border: "1px solid #ddd", padding: "4px", textAlign: "right" }}>200,000</td>
                                <td style={{ border: "1px solid #ddd", padding: "4px", textAlign: "right", fontWeight: "bold" }}>200,000</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Summary box */}
                        <div
                          style={{
                            border: "1px solid #ddd",
                            padding: "8px",
                            marginBottom: "8px",
                            borderRadius: "6px",
                            backgroundColor: "#f9f9f9",
                            fontSize: "7.5pt",
                          }}
                        >
                          <table style={{ width: "100%", borderSpacing: "0" }}>
                            <tbody>
                              <tr>
                                <td style={{ fontWeight: "bold", paddingBottom: "2px" }}>Tổng dịch vụ thêm:</td>
                                <td style={{ textAlign: "right", paddingBottom: "2px" }}>200,000 đ</td>
                              </tr>
                              <tr>
                                <td style={{ fontWeight: "bold", paddingBottom: "2px" }}>Phí dịch vụ:</td>
                                <td style={{ textAlign: "right", paddingBottom: "2px" }}>0 đ</td>
                              </tr>
                              <tr style={{ borderTop: "1px solid #ddd" }}>
                                <td style={{ fontWeight: "bold", paddingTop: "2px", fontSize: "8pt" }}>TỔNG CỘNG:</td>
                                <td style={{ textAlign: "right", paddingTop: "2px", fontWeight: "bold", color: "#2563eb", fontSize: "8.5pt" }}>200,000 đ</td>
                              </tr>
                              <tr>
                                <td style={{ fontWeight: "bold", color: "#16a34a" }}>Đã thanh toán:</td>
                                <td style={{ textAlign: "right", fontWeight: "bold", color: "#16a34a" }}>200,000 đ</td>
                              </tr>
                              <tr>
                                <td style={{ color: "#666" }}>Hình thức:</td>
                                <td style={{ textAlign: "right", color: "#666" }}>Tiền mặt</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* QR Code Payment Box (Horizontal Layout to match actual printed document) */}
                        {settings.bank_name && (
                          <div
                            style={{
                              marginTop: "8px",
                              padding: "6px 8px",
                              border: "2px solid #2563eb",
                              borderRadius: "8px",
                              backgroundColor: "#eff6ff",
                              color: "#000",
                              marginBottom: "8px",
                            }}
                          >
                            <p style={{ margin: "0 0 4px 0", fontSize: "8.5pt", fontWeight: "bold", color: "#2563eb", textAlign: "center" }}>
                              📱 QUÉT MÃ ĐỂ THANH TOÁN
                            </p>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "6px",
                              }}
                            >
                              {/* Left details */}
                              <div style={{ flex: 1, textAlign: "left", fontSize: "7.5pt", color: "#000", lineHeight: "1.3" }}>
                                <div style={{ fontSize: "8pt", color: "#333", marginBottom: "1px" }}>
                                  Số tiền: <strong style={{ color: "#2563eb" }}>200,000 đ</strong>
                                </div>
                                <div>
                                  Ngân hàng: <strong>{settings.bank_name}</strong>
                                </div>
                                <div>
                                  STK: <strong style={{ color: "#2563eb" }}>{settings.bank_account_number}</strong>
                                </div>
                                {settings.bank_account_holder && (
                                  <div style={{ fontSize: "7pt", color: "#555", textTransform: "uppercase" }}>
                                    Chủ TK: {settings.bank_account_holder}
                                  </div>
                                )}
                              </div>

                              {/* Right QR */}
                              <div style={{ padding: "2px", backgroundColor: "#fff", borderRadius: "4px", border: "1px solid #bfdbfe", flexShrink: 0 }}>
                                <div style={{ width: "60px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
                                  <span style={{ fontSize: "28px" }}>🔳</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Signatures Section */}
                        <div style={{ paddingTop: "8px", marginTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "7.5pt", fontWeight: "bold" }}>
                          <div style={{ textAlign: "center", width: "45%" }}>
                            <div>Khách hàng</div>
                            <div style={{ fontStyle: "italic", fontWeight: "normal", fontSize: "6.5pt", color: "#666", marginTop: "2px" }}>(Ký, ghi rõ họ tên)</div>
                          </div>
                          <div style={{ textAlign: "center", width: "45%" }}>
                            <div>Nhân viên</div>
                            <div style={{ fontStyle: "italic", fontWeight: "normal", fontSize: "6.5pt", color: "#666", marginTop: "2px" }}>Trương Văn Cuồng</div>
                          </div>
                        </div>

                        {/* Tra cứu tiến độ Online Yellow card */}
                        <div
                          style={{
                            marginTop: "8px",
                            padding: "6px",
                            border: "1px solid #fef08a",
                            borderRadius: "6px",
                            backgroundColor: "#fef9c3",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "6px",
                            fontSize: "7pt",
                          }}
                        >
                          <div style={{ flex: 1, color: "#854d0e" }}>
                            <div style={{ fontWeight: "bold" }}>📱 TRA CỨU TIẾN ĐỘ SỬA CHỮA ONLINE</div>
                            <div style={{ color: "#713f12", fontSize: "6.5pt" }}>Quét mã QR bên cạnh để theo dõi trạng thái xe thời gian thực.</div>
                          </div>
                          <div style={{ flexShrink: 0, padding: "2px", backgroundColor: "#fff", borderRadius: "4px", border: "1px solid #fef08a" }}>
                            <span style={{ fontSize: "16px" }}>🔳</span>
                          </div>
                        </div>

                        {/* Warranty Policies */}
                        <div
                          style={{
                            marginTop: "8px",
                            paddingTop: "6px",
                            borderTop: "1px solid #e5e7eb",
                            fontSize: "6.5pt",
                            color: "#666",
                            lineHeight: "1.3",
                          }}
                        >
                          <p style={{ margin: "0 0 2px 0", fontWeight: "bold" }}>Chính sách bảo hành:</p>
                          <ul style={{ margin: "0", paddingLeft: "8px", listStyleType: "disc" }}>
                            <li>Bảo hành áp dụng cho phụ tùng chính hãng và lỗi kỹ thuật do thợ</li>
                            <li>Không bảo hành đối với va chạm, ngã xe, ngập nước sau khi nhận xe</li>
                            <li>Mang theo phiếu này khi đến bảo hành.</li>
                          </ul>
                        </div>

                        {/* Greeting Footer message */}
                        <div
                          style={{
                            borderTop: "1px dashed #bbb",
                            paddingTop: "6px",
                            marginTop: "8px",
                            textAlign: "center",
                            fontSize: "7.5pt",
                            color: "#000",
                            fontWeight: "bold",
                          }}
                        >
                          {settings.print_greeting || "Cảm ơn quý khách! Hẹn gặp lại"}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white mb-3 md:mb-4">
              Bảo mật tài khoản
            </h2>

            {isOwner ? (
              <div className="space-y-6">
                {/* 2FA Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 md:p-6">
                  <div className="flex items-start gap-3 md:gap-4 mb-4">
                    <div className="p-2 md:p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                      <Shield className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">
                        Xác thực 2 bước (2FA)
                      </h3>
                      <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Bảo vệ tài khoản của bạn bằng một lớp bảo mật bổ sung.
                        Sau khi bật, bạn sẽ cần nhập mã từ ứng dụng
                        Authenticator mỗi khi đăng nhập.
                      </p>
                    </div>
                  </div>

                  {/* MFA Setup Component */}
                  <MFASetup />
                </div>

                {/* Security Tips */}
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 md:p-6">
                  <h3 className="text-sm md:text-base font-semibold text-slate-900 dark:text-white mb-3">
                    Mẹo bảo mật
                  </h3>
                  <ul className="space-y-2 text-xs md:text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      Sử dụng mật khẩu mạnh với ít nhất 8 ký tự, bao gồm chữ
                      hoa, chữ thường và số
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      Bật xác thực 2 bước (2FA) để bảo vệ tài khoản
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      Không chia sẻ mật khẩu hoặc mã xác thực với bất kỳ ai
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      Đăng xuất khi sử dụng máy tính công cộng
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      Thường xuyên kiểm tra nhật ký hoạt động của tài khoản
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-yellow-700 dark:text-yellow-300 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium mb-1">Quyền hạn chế</p>
                  <p>
                    Chỉ chủ cửa hàng (Owner) mới có thể thiết lập xác thực 2
                    bước. Liên hệ chủ cửa hàng để được hỗ trợ.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Staff Management Tab */}
        {activeTab === "staff" && isOwner && (
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">
                  Quản lý nhân viên
                </h2>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Thêm, sửa quyền và quản lý tài khoản nhân viên
                </p>
              </div>
              <button
                onClick={() => setShowAddStaff(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Thêm nhân viên
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-blue-200/70 dark:border-blue-800/60 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/20 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
                  Nhân sự
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {staffStats.total}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-800/60 bg-gradient-to-r from-emerald-50 to-lime-50 dark:from-emerald-950/30 dark:to-lime-950/20 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
                  Quản lý
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {staffStats.managers}
                </p>
              </div>
              <div className="rounded-xl border border-violet-200/70 dark:border-violet-800/60 bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/20 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
                  Chi nhánh
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {staffStats.branches}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                <button
                  onClick={() => setShowAddBranch((prev) => !prev)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  {showAddBranch ? "Ẩn thêm chi nhánh" : "Thêm chi nhánh"}
                </button>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
                  Quản lý mã CN ngay tại đây để gán cho tài khoản nhân viên.
                </p>
              </div>

              {showAddBranch && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-3">
                  <input
                    type="text"
                    value={newBranchCode}
                    onChange={(e) => setNewBranchCode(e.target.value)}
                    placeholder="Mã CN (vd: CN2)"
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="Tên chi nhánh"
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                  <button
                    onClick={handleCreateBranch}
                    disabled={savingStaff}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg text-sm font-medium"
                  >
                    {savingStaff ? "Đang thêm..." : "Thêm"}
                  </button>
                </div>
              )}
            </div>

            {/* Add Staff Form */}
            {showAddStaff && (
              <div className="rounded-xl border border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950 p-4 md:p-6 text-white">
                <h3 className="text-sm md:text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-green-600" />
                  Thêm nhân viên mới
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1.5">
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        value={newStaffEmail}
                        onChange={(e) => setNewStaffEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1.5">
                      Họ tên
                    </label>
                    <input
                      type="text"
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-4 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1.5">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      value={newStaffPhone}
                      onChange={(e) => setNewStaffPhone(e.target.value)}
                      placeholder="0909xxxxxx"
                      className="w-full px-4 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1.5">
                      Mật khẩu tạm
                    </label>
                    <input
                      type="password"
                      value={newStaffPassword}
                      onChange={(e) => setNewStaffPassword(e.target.value)}
                      placeholder="Nhập mật khẩu tạm ít nhất 6 ký tự"
                      className="w-full px-4 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1.5">
                      Chức vụ
                    </label>
                    <input
                      type="text"
                      value={newStaffPosition}
                      onChange={(e) => setNewStaffPosition(e.target.value)}
                      placeholder="Kỹ thuật viên / Thu ngân / Quản lý"
                      className="w-full px-4 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1.5">
                      Phòng ban
                    </label>
                    <input
                      type="text"
                      value={newStaffDepartment}
                      onChange={(e) => setNewStaffDepartment(e.target.value)}
                      placeholder="Vận hành / Dịch vụ / Kế toán"
                      className="w-full px-4 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1.5">
                      Lương cơ bản
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newStaffBaseSalary}
                      onChange={(e) => setNewStaffBaseSalary(Math.max(0, Number(e.target.value || 0)))}
                      placeholder="0"
                      className="w-full px-4 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1.5">
                      Phụ cấp
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newStaffAllowances}
                      onChange={(e) => setNewStaffAllowances(Math.max(0, Number(e.target.value || 0)))}
                      placeholder="0"
                      className="w-full px-4 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1.5">
                      Ngày vào làm
                    </label>
                    <input
                      type="date"
                      value={newStaffStartDate}
                      onChange={(e) => setNewStaffStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1.5">
                      Trạng thái
                    </label>
                    <select
                      value={newStaffStatus}
                      onChange={(e) =>
                        setNewStaffStatus(
                          e.target.value as "active" | "inactive" | "terminated"
                        )
                      }
                      className="w-full px-4 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100"
                    >
                      <option value="active">Đang làm việc</option>
                      <option value="inactive">Tạm nghỉ</option>
                      <option value="terminated">Đã nghỉ việc</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1.5">
                      Số tài khoản
                    </label>
                    <input
                      type="text"
                      value={newStaffBankAccount}
                      onChange={(e) => setNewStaffBankAccount(e.target.value)}
                      placeholder="0123456789"
                      className="w-full px-4 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1.5">
                      Ngân hàng
                    </label>
                    <input
                      type="text"
                      value={newStaffBankName}
                      onChange={(e) => setNewStaffBankName(e.target.value)}
                      placeholder="Vietcombank"
                      className="w-full px-4 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1.5">
                      Mã số thuế
                    </label>
                    <input
                      type="text"
                      value={newStaffTaxCode}
                      onChange={(e) => setNewStaffTaxCode(e.target.value)}
                      placeholder="MST cá nhân"
                      className="w-full px-4 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1.5">
                      Vai trò
                    </label>
                    <select
                      value={newStaffRole}
                      onChange={(e) =>
                        setNewStaffRole(e.target.value as "manager" | "staff")
                      }
                      className="w-full px-4 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100"
                    >
                      <option value="staff">Nhân viên</option>
                      <option value="manager">Quản lý</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-200 mb-1.5">
                      Chi nhánh
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <select
                        value={newStaffBranch}
                        onChange={(e) => setNewStaffBranch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-100"
                      >
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-4 bg-slate-800/70 border border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-100">
                      Phân quyền chi tiết
                    </h4>
                    <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setNewStaffPermissionMode("role-default")}
                        className={`px-3 py-1.5 text-xs font-medium ${newStaffPermissionMode === "role-default"
                          ? "bg-blue-600 text-white"
                          : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                      >
                        Theo vai trò mặc định
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewStaffPermissionMode("allow-all")}
                        className={`px-3 py-1.5 text-xs font-medium border-l border-slate-300 dark:border-slate-600 ${newStaffPermissionMode === "allow-all"
                          ? "bg-emerald-600 text-white"
                          : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                      >
                        Cho phép tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewStaffPermissionMode("custom");
                          setNewStaffPermissions(getRoleDefaultPermissions(newStaffRole));
                        }}
                        className={`px-3 py-1.5 text-xs font-medium border-l border-slate-300 dark:border-slate-600 ${newStaffPermissionMode === "custom"
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                      >
                        Tùy chỉnh
                      </button>
                    </div>
                  </div>

                  {newStaffPermissionMode === "custom" && (
                    <div className="space-y-3">
                      {permissionGroups.map((group) => (
                        <div
                          key={group.key}
                          className="rounded-lg border border-slate-700 overflow-hidden"
                        >
                          <div className="px-3 py-2 bg-slate-900 text-xs font-semibold uppercase tracking-wide text-slate-300">
                            {group.label}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3">
                            {group.actions.map((action) => (
                              <label
                                key={action}
                                className="inline-flex items-center gap-2 text-sm text-slate-200"
                              >
                                <input
                                  type="checkbox"
                                  checked={!!newStaffPermissions[action]}
                                  onChange={(e) =>
                                    setNewStaffPermissions((prev) => ({
                                      ...prev,
                                      [action]: e.target.checked,
                                    }))
                                  }
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>{ACTION_LABELS[action]}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => {
                      setShowAddStaff(false);
                      resetNewStaffForm();
                    }}
                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleInviteStaff}
                    disabled={savingStaff || !newStaffEmail.trim()}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2"
                  >
                    {savingStaff ? "Đang xử lý..." : "Tạo nhân viên"}
                  </button>
                </div>
                <p className="text-xs text-slate-300 mt-3">
                  💡 Nhập mật khẩu tạm để tạo tài khoản dùng ngay. Nhân viên có thể đăng nhập trực tiếp sau khi bạn bấm tạo.
                </p>
              </div>
            )}

            {/* Staff List */}
            {loadingStaff ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : staffList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Chưa có nhân viên nào</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Nhân viên
                      </th>
                      <th className="text-left py-3 px-4 text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Vai trò
                      </th>
                      <th className="text-left py-3 px-4 text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Chi nhánh
                      </th>
                      <th className="text-right py-3 px-4 text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((staff) => (
                      <tr
                        key={staff.id}
                        className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-sm font-medium text-slate-600 dark:text-slate-300">
                              {(staff.name ||
                                staff.email)?.[0]?.toUpperCase() || "?"}
                            </div>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {staff.name || "Chưa đặt tên"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                          {staff.email}
                        </td>
                        <td className="py-3 px-4">
                          {editingStaff?.id === staff.id ? (
                            <select
                              value={editingStaff.role}
                              onChange={(e) =>
                                setEditingStaff({
                                  ...editingStaff,
                                  role: e.target.value as
                                    | "owner"
                                    | "manager"
                                    | "staff",
                                })
                              }
                              className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            >
                              <option value="staff">Nhân viên</option>
                              <option value="manager">Quản lý</option>
                              {staff.role === "owner" && (
                                <option value="owner">Chủ cửa hàng</option>
                              )}
                            </select>
                          ) : (
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                                staff.role
                              )}`}
                            >
                              {getRoleLabel(staff.role)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {editingStaff?.id === staff.id ? (
                            <select
                              value={editingStaff.branch_id || ""}
                              onChange={(e) =>
                                setEditingStaff({
                                  ...editingStaff,
                                  branch_id: e.target.value,
                                })
                              }
                              className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            >
                              {branches.map((branch) => (
                                <option key={branch.id} value={branch.id}>
                                  {branch.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {branches.find((b) => b.id === staff.branch_id)
                                ?.name ||
                                staff.branch_id ||
                                "-"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {editingStaff?.id === staff.id ? (
                              <>
                                <button
                                  onClick={() =>
                                    handleUpdateStaffRole(
                                      staff.id,
                                      editingStaff.role,
                                      editingStaff.branch_id
                                    )
                                  }
                                  disabled={savingStaff}
                                  className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                  title="Lưu"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingStaff(null)}
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                  title="Hủy"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                {staff.role !== "owner" && (
                                  <button
                                    onClick={() =>
                                      setEditingStaff({ ...staff })
                                    }
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                    title="Sửa quyền"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                                {staff.role !== "owner" && (
                                  <button
                                    onClick={() => setResetPasswordStaff(staff)}
                                    className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded"
                                    title="Đặt lại mật khẩu"
                                  >
                                    <Lock className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() =>
                                    setSelectedPermissionStaffId((prev) =>
                                      prev === staff.id ? null : staff.id
                                    )
                                  }
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded"
                                  title="Phân quyền chi tiết"
                                >
                                  <Shield className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedPermissionStaff && (
              <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Phân quyền chi tiết: {selectedPermissionStaff.name || selectedPermissionStaff.email}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Mặc định theo vai trò: {getRoleLabel(selectedPermissionStaff.role)}. Các mục bạn tick/untick sẽ ghi đè.
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPermissionStaffId(null)}
                    className="px-3 py-1.5 text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  >
                    Đóng
                  </button>
                </div>

                <div className="p-4 space-y-3 bg-white dark:bg-slate-900/30">
                  {permissionGroups.map((group) => {
                    const effectiveMatrix = resolvePermissionMatrix(
                      selectedPermissionStaff.role,
                      staffPermissionsMap[selectedPermissionStaff.id]
                    );

                    return (
                      <div
                        key={group.key}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                      >
                        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                          {group.label}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3">
                          {group.actions.map((action) => (
                            <label
                              key={action}
                              className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                            >
                              <input
                                type="checkbox"
                                checked={!!effectiveMatrix[action]}
                                onChange={async (e) => {
                                  const roleDefaults = getRoleDefaultPermissions(
                                    selectedPermissionStaff.role
                                  );
                                  const currentOverrides =
                                    staffPermissionsMap[selectedPermissionStaff.id] || {};
                                  const nextOverrides = { ...currentOverrides };

                                  if (e.target.checked === roleDefaults[action]) {
                                    delete nextOverrides[action];
                                  } else {
                                    nextOverrides[action] = e.target.checked;
                                  }

                                  try {
                                    await saveStaffPermissions(
                                      selectedPermissionStaff.id,
                                      nextOverrides
                                    );
                                  } catch (error: any) {
                                    showToast.error(
                                      error?.message || "Không thể cập nhật phân quyền"
                                    );
                                  }
                                }}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>{ACTION_LABELS[action]}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {resetPasswordStaff && (
              <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
                <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm md:text-base font-semibold text-slate-900 dark:text-white">
                      Đặt lại mật khẩu nhân viên
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Tài khoản: {resetPasswordStaff.email}
                    </p>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Mật khẩu mới
                      </label>
                      <input
                        type="password"
                        value={resetPasswordValue}
                        onChange={(e) => setResetPasswordValue(e.target.value)}
                        placeholder="Ít nhất 6 ký tự"
                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Xác nhận mật khẩu mới
                      </label>
                      <input
                        type="password"
                        value={resetPasswordConfirm}
                        onChange={(e) => setResetPasswordConfirm(e.target.value)}
                        placeholder="Nhập lại mật khẩu"
                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Nếu hệ thống không có quyền đổi trực tiếp, hệ thống sẽ tự gửi email reset cho nhân viên.
                    </p>
                  </div>

                  <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
                    <button
                      onClick={closeResetPasswordModal}
                      disabled={resettingPassword}
                      className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleResetStaffPassword}
                      disabled={resettingPassword}
                      className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-slate-400 text-white text-sm font-medium inline-flex items-center gap-2"
                    >
                      {resettingPassword ? "Đang xử lý..." : "Đặt lại mật khẩu"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Help Section */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 md:p-6">
              <h3 className="text-sm md:text-base font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                Hướng dẫn phân quyền
              </h3>
              <div className="space-y-3 text-xs md:text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                      "owner"
                    )}`}
                  >
                    Chủ cửa hàng
                  </span>
                  <span>
                    Toàn quyền: quản lý nhân viên, cài đặt, báo cáo, tài
                    chính...
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                      "manager"
                    )}`}
                  >
                    Quản lý
                  </span>
                  <span>
                    Xem báo cáo, quản lý phiếu, kho, khách hàng. Không thể cài
                    đặt hệ thống.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                      "staff"
                    )}`}
                  >
                    Nhân viên
                  </span>
                  <span>
                    Tạo/sửa phiếu sửa chữa, bán hàng. Chỉ xem dữ liệu chi nhánh
                    được gán.
                  </span>
                </div>
              </div>
            </div>
          </div>
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
