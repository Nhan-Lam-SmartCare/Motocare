import type { UserRole } from "../contexts/AuthContext";

export type AppAction =
  | "sale.create"
  | "sale.update"
  | "sale.delete"
  | "work_order.create"
  | "work_order.update"
  | "work_order.delete"
  | "work_order.collect_payment"
  | "work_order.status.update"
  | "inventory.import"
  | "inventory.adjust"
  | "part.create"
  | "part.update"
  | "part.update_price"
  | "part.delete"
  | "settings.update"
  | "finance.view"
  | "finance.collect_payment"
  | "payroll.view"
  | "analytics.view"
  | "reports.view"
  | "employees.view"
  | "employees.manage"
  | "debt.view"
  | "branches.manage";

export type PermissionOverrides = Partial<Record<AppAction, boolean>>;

// Runtime overrides for the currently authenticated user.
// This keeps old callsites intact because canDo() still accepts (role, action).
let currentPermissionOverrides: PermissionOverrides | null = null;

export const ACTION_LABELS: Record<AppAction, string> = {
  "sale.create": "Tạo phiếu bán hàng",
  "sale.update": "Sửa phiếu bán hàng",
  "sale.delete": "Xóa phiếu bán hàng",
  "work_order.create": "Tạo phiếu sửa chữa",
  "work_order.update": "Sửa phiếu sửa chữa",
  "work_order.delete": "Xóa phiếu sửa chữa",
  "work_order.collect_payment": "Thu tiền/ghi nhận thanh toán sửa chữa",
  "work_order.status.update": "Đổi trạng thái phiếu sửa chữa",
  "inventory.import": "Nhập kho",
  "inventory.adjust": "Điều chỉnh tồn kho",
  "part.create": "Thêm phụ tùng/dịch vụ",
  "part.update": "Sửa phụ tùng/dịch vụ",
  "part.update_price": "Sửa giá phụ tùng/dịch vụ",
  "part.delete": "Xóa phụ tùng/dịch vụ",
  "settings.update": "Cập nhật cài đặt hệ thống",
  "finance.view": "Xem tài chính",
  "finance.collect_payment": "Ghi nhận thu/chi tài chính",
  "payroll.view": "Xem bảng lương",
  "analytics.view": "Xem phân tích",
  "reports.view": "Xem báo cáo",
  "employees.view": "Xem danh sách nhân viên",
  "employees.manage": "Quản lý nhân viên",
  "debt.view": "Xem công nợ",
  "branches.manage": "Quản lý chi nhánh",
};

const POLICIES: Record<AppAction, UserRole[]> = {
  // Staff có thể tạo sale và work order
  "sale.create": ["owner", "manager", "staff"],
  "sale.update": ["owner", "manager", "staff"],
  "sale.delete": ["owner", "manager"],
  "work_order.create": ["owner", "manager", "staff"],
  "work_order.update": ["owner", "manager", "staff"],
  "work_order.delete": ["owner", "manager"],
  "work_order.collect_payment": ["owner", "manager", "staff"],
  "work_order.status.update": ["owner", "manager", "staff"],
  // Nhập kho, quản lý sản phẩm - chỉ owner/manager
  "inventory.import": ["owner", "manager"],
  "inventory.adjust": ["owner", "manager"],
  "part.create": ["owner", "manager"],
  "part.update": ["owner", "manager"],
  "part.update_price": ["owner", "manager"],
  "part.delete": ["owner", "manager"],
  // Settings & Finance
  "settings.update": ["owner", "manager"],
  "finance.view": ["owner", "manager"],
  "finance.collect_payment": ["owner", "manager"],
  "payroll.view": ["owner", "manager"],
  "analytics.view": ["owner", "manager"],
  "reports.view": ["owner", "manager", "staff"],
  "employees.view": ["owner", "manager"],
  "debt.view": ["owner", "manager"],
  "employees.manage": ["owner"],
  "branches.manage": ["owner"],
};

export function normalizePermissionOverrides(
  raw: unknown
): PermissionOverrides {
  if (!raw || typeof raw !== "object") return {};

  const result: PermissionOverrides = {};
  for (const action of Object.keys(POLICIES) as AppAction[]) {
    const value = (raw as Record<string, unknown>)[action];
    if (typeof value === "boolean") {
      result[action] = value;
    }
  }
  return result;
}

export function setCurrentPermissionOverrides(
  overrides: PermissionOverrides | null
) {
  currentPermissionOverrides = overrides;
}

export function getRoleDefaultPermissions(
  role: UserRole | undefined
): Record<AppAction, boolean> {
  const matrix = {} as Record<AppAction, boolean>;
  for (const action of Object.keys(POLICIES) as AppAction[]) {
    matrix[action] = !!role && (role === "owner" || POLICIES[action].includes(role));
  }
  return matrix;
}

export function canDo(role: UserRole | undefined, action: AppAction): boolean {
  if (!role) return false;
  if (role === "owner") return true;

  if (
    currentPermissionOverrides &&
    Object.prototype.hasOwnProperty.call(currentPermissionOverrides, action)
  ) {
    return !!currentPermissionOverrides[action];
  }

  return POLICIES[action].includes(role);
}
