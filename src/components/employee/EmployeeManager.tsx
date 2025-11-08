import React, { useState, useMemo } from "react";
import { useAppContext } from "../../contexts/AppContext";
import { Employee, AttendanceRecord } from "../../types";
import { formatCurrency, formatDate } from "../../utils/format";
import PayrollManager from "../payroll/PayrollManager";

type Tab = "list" | "attendance" | "payroll" | "history";

const EmployeeManager: React.FC = () => {
  const { employees, upsertEmployee, setEmployees } = useAppContext();

  // Helper wrappers
  const addEmployee = (emp: Employee) => upsertEmployee(emp);
  const updateEmployee = (emp: Employee) => upsertEmployee(emp);
  const deleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };
  const [activeTab, setActiveTab] = useState<Tab>("list");
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: "",
    phone: "",
    email: "",
    position: "",
    department: "",
    baseSalary: 0,
    allowances: 0,
    status: "active",
    startDate: new Date().toISOString().split("T")[0],
  });

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.position.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.position || !formData.baseSalary) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc!");
      return;
    }

    if (editingEmployee) {
      updateEmployee({ ...editingEmployee, ...formData } as Employee);
      alert("✅ Cập nhật nhân viên thành công!");
    } else {
      const newEmployee: Employee = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name!,
        phone: formData.phone,
        email: formData.email,
        position: formData.position!,
        department: formData.department,
        baseSalary: formData.baseSalary!,
        allowances: formData.allowances,
        startDate: formData.startDate!,
        status: formData.status as "active" | "inactive" | "terminated",
        bankAccount: formData.bankAccount,
        bankName: formData.bankName,
        taxCode: formData.taxCode,
        created_at: new Date().toISOString(),
      };
      addEmployee(newEmployee);
      alert("✅ Thêm nhân viên thành công!");
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      position: "",
      department: "",
      baseSalary: 0,
      allowances: 0,
      status: "active",
      startDate: new Date().toISOString().split("T")[0],
    });
    setEditingEmployee(null);
    setShowForm(false);
  };

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData(emp);
    setShowForm(true);
  };

  const handleDelete = (emp: Employee) => {
    if (confirm(`Bạn có chắc muốn xóa nhân viên "${emp.name}" không?`)) {
      deleteEmployee(emp.id);
      alert("✅ Đã xóa nhân viên!");
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const active = employees.filter((e) => e.status === "active").length;
    const totalSalary = employees
      .filter((e) => e.status === "active")
      .reduce((sum, e) => sum + e.baseSalary + (e.allowances || 0), 0);

    return { active, totalSalary, total: employees.length };
  }, [employees]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="text-3xl">👔</span>
          Quản lý nhân viên
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium shadow-md hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
        >
          ➕ Thêm nhân viên
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">
              Tổng nhân viên
            </span>
            <span className="text-3xl">👥</span>
          </div>
          <div className="text-3xl font-bold">{stats.total}</div>
          <div className="text-white/70 text-sm mt-1">
            {stats.active} đang làm việc
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">
              Đang hoạt động
            </span>
            <span className="text-3xl">✅</span>
          </div>
          <div className="text-3xl font-bold">{stats.active}</div>
          <div className="text-white/70 text-sm mt-1">Nhân viên active</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">
              Tổng lương tháng
            </span>
            <span className="text-3xl">💰</span>
          </div>
          <div className="text-2xl font-bold">
            {formatCurrency(stats.totalSalary)}
          </div>
          <div className="text-white/70 text-sm mt-1">Ước tính</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {[
          { key: "list", label: "📋 Danh sách" },
          { key: "attendance", label: "⏰ Chấm công" },
          { key: "payroll", label: "💰 Quản lý lương" },
          { key: "history", label: "📜 Lịch sử" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as Tab)}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === tab.key
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      {activeTab === "list" && (
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="🔍 Tìm kiếm nhân viên (tên, SĐT, chức vụ)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Content */}
      {activeTab === "list" && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Nhân viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Chức vụ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Phòng ban
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Lương CB
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Phụ cấp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Ngày vào
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                    >
                      Không tìm thấy nhân viên nào
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {emp.name}
                          </div>
                          {emp.phone && (
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              📞 {emp.phone}
                            </div>
                          )}
                          {emp.email && (
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              📧 {emp.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {emp.position}
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {emp.department || "-"}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {formatCurrency(emp.baseSalary)}
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {formatCurrency(emp.allowances || 0)}
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                        {formatDate(emp.startDate)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            emp.status === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : emp.status === "inactive"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {emp.status === "active"
                            ? "Hoạt động"
                            : emp.status === "inactive"
                            ? "Tạm nghỉ"
                            : "Nghỉ việc"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(emp)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm"
                        >
                          ✏️ Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(emp)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium text-sm"
                        >
                          🗑️ Xóa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            Chức năng chấm công
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Tính năng quản lý chấm công đang được phát triển...
          </p>
        </div>
      )}

      {activeTab === "payroll" && <PayrollManager />}

      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
          <div className="text-6xl mb-4">📜</div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            Lịch sử làm việc
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Tính năng xem lịch sử làm việc đang được phát triển...
          </p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingEmployee ? "✏️ Sửa nhân viên" : "➕ Thêm nhân viên mới"}
              </h3>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Họ tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Chức vụ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phòng ban
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Lương cơ bản <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.baseSalary}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        baseSalary: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phụ cấp
                  </label>
                  <input
                    type="number"
                    value={formData.allowances}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allowances: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Ngày vào làm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Tạm nghỉ</option>
                    <option value="terminated">Nghỉ việc</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Số tài khoản
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccount}
                    onChange={(e) =>
                      setFormData({ ...formData, bankAccount: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Ngân hàng
                  </label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) =>
                      setFormData({ ...formData, bankName: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Mã số thuế
                  </label>
                  <input
                    type="text"
                    value={formData.taxCode}
                    onChange={(e) =>
                      setFormData({ ...formData, taxCode: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium shadow-md hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  {editingEmployee ? "💾 Lưu thay đổi" : "➕ Thêm nhân viên"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  ❌ Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManager;
