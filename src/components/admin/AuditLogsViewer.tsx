import React, { useState } from "react";
import { useAuditLogs } from "../../hooks/useAuditLogs";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2, RefreshCcw, Shield } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Đăng nhập",
  "auth.logout": "Đăng xuất",
  "sale.create": "Tạo hóa đơn",
  "sale.delete": "Xóa hóa đơn",
  "part.update_price": "Cập nhật giá phụ tùng",
  "inventory.receipt": "Nhập kho",
  "settings.update": "Cập nhật cài đặt",
  "debt.customer_pay": "Thu nợ khách hàng",
  "debt.supplier_pay": "Trả nợ nhà cung cấp",
  "cash.manual": "Giao dịch quỹ thủ công",
};

export const AuditLogsViewer: React.FC = () => {
  const { profile } = useAuth();
  const [action, setAction] = useState<string>("");
  const [limit, setLimit] = useState<number>(50);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const {
    data: logsRes,
    isLoading,
    refetch,
  } = useAuditLogs({
    action: action || undefined,
    page,
    pageSize: limit,
    includeUser: true,
    startDate: startDate ? new Date(startDate).toISOString() : undefined,
    endDate: endDate
      ? new Date(endDate + "T23:59:59").toISOString()
      : undefined,
  });
  const logs = logsRes?.data || [];
  const total = logsRes?.meta?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (!profile || profile.role !== "owner") {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500 dark:text-slate-400">
        <Shield className="w-5 h-5 mr-2" /> Chỉ chủ cửa hàng được xem nhật ký hệ
        thống.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Nhật ký hệ thống
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
          >
            <option value="">Tất cả hành động</option>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
          />
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
          >
            {[25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} dòng
              </option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <RefreshCcw className="w-4 h-4" /> Tải lại
          </button>
          <button
            onClick={() => exportJSON(logs)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            JSON
          </button>
          <button
            onClick={() => exportCSV(logs)}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            CSV
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow divide-y divide-slate-200 dark:divide-slate-700">
        <div className="p-4 flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {isLoading
              ? "Đang tải..."
              : `Hiển thị ${logs.length} dòng • Trang ${page}/${totalPages} • Tổng ${total}`}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded disabled:opacity-50"
            >
              Trang trước
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded disabled:opacity-50"
            >
              Trang sau
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                <th className="text-left px-4 py-2 font-medium">Thời gian</th>
                <th className="text-left px-4 py-2 font-medium">Hành động</th>
                <th className="text-left px-4 py-2 font-medium">Bảng</th>
                <th className="text-left px-4 py-2 font-medium">ID bản ghi</th>
                <th className="text-left px-4 py-2 font-medium">Dữ liệu</th>
                <th className="text-left px-4 py-2 font-medium">User</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                  </td>
                </tr>
              )}
              {!isLoading && logs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              )}
              {!isLoading &&
                logs.map((log) => {
                  const actionLabel = ACTION_LABELS[log.action] || log.action;
                  return (
                    <tr
                      key={log.id}
                      className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                    >
                      <td className="px-4 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {new Date(log.created_at).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                        {actionLabel}
                      </td>
                      <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                        {log.table_name || "-"}
                      </td>
                      <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                        {log.record_id || "-"}
                      </td>
                      <td className="px-4 py-2 max-w-[280px]">
                        <pre className="text-xs whitespace-pre-wrap break-all bg-slate-50 dark:bg-slate-900/40 p-2 rounded border border-slate-200 dark:border-slate-700 max-h-32 overflow-y-auto">
                          {log.new_data || log.old_data
                            ? JSON.stringify(
                                {
                                  old: log.old_data
                                    ? safeParse(log.old_data)
                                    : undefined,
                                  new: log.new_data
                                    ? safeParse(log.new_data)
                                    : undefined,
                                },
                                null,
                                2
                              )
                            : "-"}
                        </pre>
                      </td>
                      <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                        {(log as any).user_email || (log as any).user_name
                          ? `${(log as any).user_name || ""} ${
                              (log as any).user_email
                                ? "<" + (log as any).user_email + ">"
                                : ""
                            }`.trim()
                          : log.user_id?.slice(0, 8) || "-"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function safeParse(data: unknown): unknown {
  try {
    if (typeof data === "string") return JSON.parse(data);
    return data;
  } catch {
    return data;
  }
}

function exportJSON(rows: unknown[]) {
  try {
    const blob = new Blob([JSON.stringify(rows, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // Silent fail for export
  }
}

function exportCSV(rows: unknown[]) {
  try {
    const headers = [
      "created_at",
      "action",
      "table_name",
      "record_id",
      "user_id",
      "old_data",
      "new_data",
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
      const line = [
        r.created_at,
        r.action,
        r.table_name ?? "",
        r.record_id ?? "",
        r.user_id ?? "",
        JSON.stringify(r.old_data ?? ""),
        JSON.stringify(r.new_data ?? ""),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
      lines.push(line);
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // Silent fail for export
  }
}

export default AuditLogsViewer;
