import React from "react";
import type { WorkOrder } from "../../../../types";

interface ServiceInfoSectionProps {
  formData: Partial<WorkOrder>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<WorkOrder>>>;
  employees: any[];
}

export const ServiceInfoSection: React.FC<ServiceInfoSectionProps> = ({
  formData,
  setFormData,
  employees,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-xs font-bold">2</span>
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Chi tiết Dịch vụ
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Kỹ thuật viên
          </label>
          <select
            value={formData.technicianName || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                technicianName: e.target.value,
              })
            }
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
          >
            <option value="">-- Chọn kỹ thuật viên --</option>
            {employees
              .filter(
                (emp) =>
                  emp.status === "active" &&
                  (emp.department?.toLowerCase().includes("kỹ thuật") ||
                    emp.position?.toLowerCase().includes("kỹ thuật") ||
                    emp.department?.toLowerCase().includes("ky thuat") ||
                    emp.position?.toLowerCase().includes("ky thuat"))
              )
              .map((emp) => (
                <option key={emp.id} value={emp.name}>
                  {emp.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Ghi chú nội bộ
          </label>
          <textarea
            rows={5}
            placeholder="VD: Khách yêu cầu kiểm tra thêm hệ thống điện"
            value={formData.notes || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                notes: e.target.value,
              })
            }
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
};
