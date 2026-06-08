import React, { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus, Mail, Building2 } from "lucide-react";
import { supabase } from "../../../supabaseClient";
import { showToast } from "../../../utils/toast";
import { safeAudit } from "../../../lib/repository/auditLogsRepository";
import { Branch } from "../SettingsManager";
import {
  ACTION_LABELS,
  AppAction,
  getRoleDefaultPermissions,
  normalizePermissionOverrides,
  PermissionOverrides,
} from "../../../utils/permissions";

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  profile: any;
  onSuccess: () => void;
}

export const AddStaffModal: React.FC<AddStaffModalProps> = ({
  isOpen,
  onClose,
  branches,
  profile,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

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
  const [newStaffRole, setNewStaffRole] = useState<"manager" | "staff">("staff");
  const [newStaffBranch, setNewStaffBranch] = useState("");
  const [newStaffPermissionMode, setNewStaffPermissionMode] = useState<
    "role-default" | "allow-all" | "custom"
  >("role-default");
  const [newStaffPermissions, setNewStaffPermissions] = useState<PermissionOverrides>({});
  const [savingStaff, setSavingStaff] = useState(false);

  useEffect(() => {
    if (branches.length > 0 && !newStaffBranch) {
      setNewStaffBranch(branches[0].id);
    }
  }, [branches, newStaffBranch]);

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
        actions: [
          "employees.view",
          "employees.manage",
          "settings.update",
          "branches.manage",
        ] as AppAction[],
      },
    ],
    []
  );

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

  const saveStaffPermissions = async (staffId: string, permissions: PermissionOverrides) => {
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
    } catch (error: any) {
      if (isMissingRelationError(error)) {
        showToast.error("Chưa có bảng staff_permissions. Hãy chạy script SQL nâng cấp quyền trước.");
        return;
      }
      throw error;
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
        department: department?.trim() || (role === "manager" ? "Quản lý" : "Vận hành"),
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

        await supabase.from("profiles").upsert(
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
      resetNewStaffForm();
      onSuccess();
      onClose();

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

  if (!isOpen) return null;

  return (
    <div className="rounded-xl border border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950 p-4 md:p-6 text-white mb-6">
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
            onChange={(e) => setNewStaffStatus(e.target.value as "active" | "inactive" | "terminated")}
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
            onChange={(e) => setNewStaffRole(e.target.value as "manager" | "staff")}
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
          <h4 className="text-sm font-semibold text-slate-100">Phân quyền chi tiết</h4>
          <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
            <button
              type="button"
              onClick={() => setNewStaffPermissionMode("role-default")}
              className={`px-3 py-1.5 text-xs font-medium ${
                newStaffPermissionMode === "role-default"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              Theo vai trò mặc định
            </button>
            <button
              type="button"
              onClick={() => setNewStaffPermissionMode("allow-all")}
              className={`px-3 py-1.5 text-xs font-medium border-l border-slate-300 dark:border-slate-600 ${
                newStaffPermissionMode === "allow-all"
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
              className={`px-3 py-1.5 text-xs font-medium border-l border-slate-300 dark:border-slate-600 ${
                newStaffPermissionMode === "custom"
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
              <div key={group.key} className="rounded-lg border border-slate-700 overflow-hidden">
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
            resetNewStaffForm();
            onClose();
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
  );
};
