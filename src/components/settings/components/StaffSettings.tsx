import React, { useState, useEffect, useMemo } from "react";
import { Lock, Shield, Users, UserPlus, Edit2, Trash2, Check, X, Building2, Info } from "lucide-react";
import { supabase } from "../../../supabaseClient";
import { showToast } from "../../../utils/toast";
import { safeAudit } from "../../../lib/repository/auditLogsRepository";
import { StaffMember, Branch } from "../SettingsManager";
import { AddStaffModal } from "./AddStaffModal";
import { ResetPasswordModal } from "./ResetPasswordModal";
import {
  ACTION_LABELS,
  AppAction,
  getRoleDefaultPermissions,
  normalizePermissionOverrides,
  PermissionOverrides,
} from "../../../utils/permissions";

interface StaffSettingsProps {
  staffList: StaffMember[];
  branches: Branch[];
  loadingStaff: boolean;
  profile: any;
  loadStaff: () => Promise<void>;
  loadBranches: () => Promise<void>;
}

export const StaffSettings: React.FC<StaffSettingsProps> = ({
  staffList,
  branches,
  loadingStaff,
  profile,
  loadStaff,
  loadBranches,
}) => {
  // Local states for sub-features
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [resetPasswordStaff, setResetPasswordStaff] = useState<StaffMember | null>(null);

  // Branch creation state
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranchCode, setNewBranchCode] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [savingStaff, setSavingStaff] = useState(false);

  // Permissions state
  const [selectedPermissionStaffId, setSelectedPermissionStaffId] = useState<string | null>(null);
  const [staffPermissionsMap, setStaffPermissionsMap] = useState<Record<string, PermissionOverrides>>({});

  useEffect(() => {
    if (staffList.length > 0) {
      loadStaffPermissions(staffList.map((s) => s.id));
    }
  }, [staffList]);

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

  const branchSet = new Set(staffList.map((staff) => staff.branch_id).filter(Boolean));
  const staffStats = {
    total: staffList.length,
    managers: staffList.filter((staff) => staff.role === "manager").length,
    branches: branchSet.size,
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
        showToast.error("Chưa có bảng staff_permissions. Hãy chạy script SQL nâng cấp quyền trước.");
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

  const selectedPermissionStaff = staffList.find((staff) => staff.id === selectedPermissionStaffId);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">
            Quản lý nhân viên
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tạo tài khoản và phân quyền cho nhân viên các chi nhánh
          </p>
        </div>
        <button
          onClick={() => setShowAddStaff(true)}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Thêm nhân viên</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Tổng nhân sự
          </p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {staffStats.total}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Cấp quản lý
          </p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {staffStats.managers}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Chi nhánh hoạt động
          </p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {staffStats.branches}
          </p>
        </div>
      </div>

      {/* Branch management */}
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

      {/* Add Staff form */}
      <AddStaffModal
        isOpen={showAddStaff}
        onClose={() => setShowAddStaff(false)}
        branches={branches}
        profile={profile}
        onSuccess={loadStaff}
      />

      {/* Staff Table */}
      {loadingStaff ? (
        <div className="text-center py-6 text-slate-500">Đang tải danh sách nhân viên...</div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <th className="p-3">Họ tên & Email</th>
                <th className="p-3">Vai trò</th>
                <th className="p-3">Chi nhánh</th>
                <th className="p-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => (
                <tr
                  key={staff.id}
                  className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-900 dark:text-slate-100"
                >
                  <td className="p-3">
                    <div>
                      <span className="font-semibold block">{staff.name || "Chưa đặt tên"}</span>
                      <span className="text-slate-500 text-[11px] block">{staff.email}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    {editingStaff?.id === staff.id ? (
                      <select
                        value={editingStaff.role}
                        onChange={(e) =>
                          setEditingStaff({
                            ...editingStaff,
                            role: e.target.value as "owner" | "manager" | "staff",
                          })
                        }
                        className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="staff">Nhân viên</option>
                        <option value="manager">Quản lý</option>
                        <option value="owner">Chủ cửa hàng</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${getRoleBadgeColor(
                          staff.role
                        )}`}
                      >
                        {getRoleLabel(staff.role)}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
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
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {branches.find((b) => b.id === staff.branch_id)?.name ||
                          staff.branch_id ||
                          "Mặc định"}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {editingStaff?.id === staff.id ? (
                        <>
                          <button
                            onClick={() =>
                              handleUpdateStaffRole(
                                editingStaff.id,
                                editingStaff.role,
                                editingStaff.branch_id
                              )
                            }
                            disabled={savingStaff}
                            className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                            title="Lưu"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingStaff(null)}
                            className="p-1 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded"
                            title="Hủy"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingStaff({ ...staff })}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                            title="Sửa vai trò / chi nhánh"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
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

      {/* Permissions Overrides Box */}
      {selectedPermissionStaff && (
        <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Phân quyền chi tiết: {selectedPermissionStaff.name || selectedPermissionStaff.email}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Mặc định theo vai trò: {getRoleLabel(selectedPermissionStaff.role)}. Các mục bạn
                tick/untick sẽ ghi đè.
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
                              await saveStaffPermissions(selectedPermissionStaff.id, nextOverrides);
                            } catch (error: any) {
                              showToast.error(error?.message || "Không thể cập nhật phân quyền");
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

      {/* Reset Password modal */}
      <ResetPasswordModal
        isOpen={!!resetPasswordStaff}
        onClose={() => setResetPasswordStaff(null)}
        staff={resetPasswordStaff}
        profile={profile}
      />

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
            <span>Toàn quyền: quản lý nhân viên, cài đặt, báo cáo, tài chính...</span>
          </div>
          <div className="flex items-start gap-2">
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                "manager"
              )}`}
            >
              Quản lý
            </span>
            <span>Xem báo cáo, quản lý phiếu, kho, khách hàng. Không thể cài đặt hệ thống.</span>
          </div>
          <div className="flex items-start gap-2">
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                "staff"
              )}`}
            >
              Nhân viên
            </span>
            <span>Tạo/sửa phiếu sửa chữa, bán hàng. Chỉ xem dữ liệu chi nhánh được gán.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
