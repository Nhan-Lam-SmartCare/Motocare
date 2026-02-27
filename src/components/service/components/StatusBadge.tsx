import React from "react";
import {
  Inbox,
  Wrench,
  CheckCircle2,
  Truck,
  XCircle,
} from "lucide-react";

export type WorkOrderStatus =
  | "Tiếp nhận"
  | "Đang sửa"
  | "Đã sửa xong"
  | "Trả máy"
  | "Đã hủy";

const statusConfig: Record<
  WorkOrderStatus,
  {
    bg: string;
    text: string;
    border: string;
    icon: React.ElementType;
    dot: string;
  }
> = {
  "Tiếp nhận": {
    bg: "bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-500/30",
    icon: Inbox,
    dot: "bg-blue-500",
  },
  "Đang sửa": {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-500/30",
    icon: Wrench,
    dot: "bg-amber-500 animate-pulse",
  },
  "Đã sửa xong": {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-500/30",
    icon: CheckCircle2,
    dot: "bg-emerald-500",
  },
  "Trả máy": {
    bg: "bg-purple-50 dark:bg-purple-500/10",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-500/30",
    icon: Truck,
    dot: "bg-purple-500",
  },
  "Đã hủy": {
    bg: "bg-red-50 dark:bg-red-500/10",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-500/30",
    icon: XCircle,
    dot: "bg-red-500",
  },
};

/** Returns the Tailwind border-l color class for a given work order status */
export const getStatusBorderColor = (status: WorkOrderStatus): string => {
  const map: Record<WorkOrderStatus, string> = {
    "Tiếp nhận": "border-l-blue-500",
    "Đang sửa": "border-l-amber-500",
    "Đã sửa xong": "border-l-emerald-500",
    "Trả máy": "border-l-purple-500",
    "Đã hủy": "border-l-red-400",
  };
  return map[status] || "border-l-transparent";
};

const StatusBadge: React.FC<{ status: WorkOrderStatus }> = ({ status }) => {
  const config = statusConfig[status];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <Icon className="w-3.5 h-3.5" />
      {status}
    </span>
  );
};

export default StatusBadge;
