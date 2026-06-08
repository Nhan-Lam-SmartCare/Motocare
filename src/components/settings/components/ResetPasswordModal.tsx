import React, { useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "../../../supabaseClient";
import { showToast } from "../../../utils/toast";
import { safeAudit } from "../../../lib/repository/auditLogsRepository";
import { StaffMember } from "../SettingsManager";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMember | null;
  profile: any;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  staff,
  profile,
}) => {
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  if (!isOpen || !staff) return null;

  const closeResetPasswordModal = () => {
    setResetPasswordValue("");
    setResetPasswordConfirm("");
    onClose();
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

  const handleResetStaffPassword = async () => {
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
      const { error } = await supabase.auth.admin.updateUserById(staff.id, {
        password: nextPassword,
      });

      if (error) {
        if (!isAuthAdminPermissionError(error)) {
          throw error;
        }

        const redirectTo =
          typeof window !== "undefined"
            ? `${window.location.origin}/reset-password`
            : undefined;

        const { error: resetLinkError } = await supabase.auth.resetPasswordForEmail(
          staff.email,
          redirectTo ? { redirectTo } : undefined
        );

        if (resetLinkError) {
          throw resetLinkError;
        }

        showToast.info(
          `Không thể đổi trực tiếp. Đã gửi link đặt lại mật khẩu đến ${staff.email}`
        );
        closeResetPasswordModal();
        return;
      }

      showToast.success(`Đã đặt lại mật khẩu cho ${staff.email} thành công`);
      void safeAudit(profile?.id || null, {
        action: "staff.reset_password",
        tableName: "profiles",
        recordId: staff.id,
        newData: { email: staff.email },
      });
      closeResetPasswordModal();
    } catch (error: any) {
      console.error("Error resetting staff password:", error);
      showToast.error(error?.message || "Không thể đặt lại mật khẩu");
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h4 className="text-sm md:text-base font-semibold text-slate-900 dark:text-white">
            Đặt lại mật khẩu nhân viên
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Tài khoản: {staff.email}
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
            {resettingPassword ? (
              "Đang xử lý..."
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Đặt lại mật khẩu</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
