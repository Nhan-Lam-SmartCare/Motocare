import React from "react";
import {
    Users,
    UserCheck,
    DollarSign,
    ClipboardList,
    Clock,
    History,
    Search,
    Plus,
    Pencil,
    Trash2,
    Phone,
    Mail,
    Wallet,
    ChevronRight,
    Briefcase,
    Calendar,
} from "lucide-react";
import { Employee } from "../../types";
import { formatCurrency, formatDate } from "../../utils/format";
import { PayrollManagerMobile } from "../payroll/PayrollManagerMobile";
import { EmployeeAdvanceManagerMobile } from "./EmployeeAdvanceManagerMobile";

interface EmployeeManagerMobileProps {
    employees: Employee[];
    stats: {
        active: number;
        totalSalary: number;
        total: number;
    };
    activeTab: string;
    setActiveTab: (tab: any) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    onEdit: (emp: Employee) => void;
    onDelete: (emp: Employee) => void;
    onAdd: () => void;
}

export const EmployeeManagerMobile: React.FC<EmployeeManagerMobileProps> = ({
    employees,
    stats,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    onEdit,
    onDelete,
    onAdd,
}) => {
    // Filter employees based on search term
    const filteredEmployees = employees.filter(
        (emp) =>
            emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderEmployeeList = () => (
        <div className="space-y-4 pb-20">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Tìm nhân viên..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#1e1e2d] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Employee Cards */}
            <div className="space-y-3">
                {filteredEmployees.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                        Không tìm thấy nhân viên nào
                    </div>
                ) : (
                    filteredEmployees.map((emp) => (
                        <div
                            key={emp.id}
                            className="bg-[#1e1e2d] border border-slate-700/50 rounded-xl p-4 active:scale-[0.99] transition-transform"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-base font-bold text-white">{emp.name}</h3>
                                    <div className="text-xs text-blue-400 font-medium mt-0.5 flex items-center gap-1">
                                        <Briefcase className="w-3 h-3" /> {emp.position}
                                    </div>
                                </div>
                                <span
                                    className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${emp.status === "active"
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : emp.status === "inactive"
                                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                                        }`}
                                >
                                    {emp.status === "active"
                                        ? "Hoạt động"
                                        : emp.status === "inactive"
                                            ? "Tạm nghỉ"
                                            : "Nghỉ việc"}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-slate-800/50 rounded-lg p-2">
                                    <div className="text-[10px] text-slate-500 uppercase">Lương cơ bản</div>
                                    <div className="text-sm font-bold text-white">
                                        {formatCurrency(emp.baseSalary).replace("₫", "")}
                                        <span className="text-[10px] text-slate-400 font-normal ml-0.5">đ</span>
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-2">
                                    <div className="text-[10px] text-slate-500 uppercase">Phụ cấp</div>
                                    <div className="text-sm font-bold text-white">
                                        {formatCurrency(emp.allowances || 0).replace("₫", "")}
                                        <span className="text-[10px] text-slate-400 font-normal ml-0.5">đ</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                {emp.phone && (
                                    <a href={`tel:${emp.phone}`} className="flex items-center gap-2 text-sm text-slate-300 hover:text-blue-400 transition-colors">
                                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
                                            <Phone className="w-3 h-3" />
                                        </div>
                                        {emp.phone}
                                    </a>
                                )}
                                {emp.email && (
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
                                            <Mail className="w-3 h-3" />
                                        </div>
                                        {emp.email}
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
                                        <Calendar className="w-3 h-3" />
                                    </div>
                                    Vào làm: {formatDate(emp.startDate)}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-3 border-t border-slate-700/50">
                                <button
                                    onClick={() => onEdit(emp)}
                                    className="flex-1 py-2 bg-blue-600/10 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-600/20 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Pencil className="w-4 h-4" /> Sửa
                                </button>
                                <button
                                    onClick={() => onDelete(emp)}
                                    className="flex-1 py-2 bg-red-600/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-600/20 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> Xóa
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className="md:hidden min-h-screen bg-[#151521] text-white pb-20">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-[#151521]/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Nhân viên
                </h2>
                <button
                    onClick={onAdd}
                    className="p-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-600/20 active:scale-95 transition-transform"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {/* Stats Cards - Horizontal Scroll */}
            {activeTab === "list" && (
                <div className="px-4 py-4 overflow-x-auto no-scrollbar flex gap-3 snap-x">
                    <div className="snap-center shrink-0 w-[85%] bg-[#1e1e2d] border border-slate-700/50 p-4 rounded-xl shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-xl"></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-xs font-medium">Tổng nhân viên</span>
                            <Users className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="text-2xl font-bold text-white">{stats.total}</div>
                        <div className="text-slate-500 text-xs mt-1">{stats.active} đang làm việc</div>
                    </div>

                    <div className="snap-center shrink-0 w-[85%] bg-[#1e1e2d] border border-slate-700/50 p-4 rounded-xl shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 rounded-l-xl"></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-xs font-medium">Tổng lương tháng</span>
                            <DollarSign className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {formatCurrency(stats.totalSalary).replace("₫", "")}
                            <span className="text-sm font-normal ml-1">đ</span>
                        </div>
                        <div className="text-slate-500 text-xs mt-1">Ước tính</div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="px-4 mb-4">
                <div className="flex bg-[#1e1e2d] p-1 rounded-xl overflow-x-auto no-scrollbar">
                    {[
                        { key: "list", label: "Danh sách", icon: ClipboardList },
                        { key: "attendance", label: "Chấm công", icon: Clock },
                        { key: "payroll", label: "Lương", icon: DollarSign },
                        { key: "advance", label: "Ứng lương", icon: Wallet },
                        { key: "history", label: "Lịch sử", icon: History },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 min-w-[90px] py-2 px-3 rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-all ${activeTab === tab.key
                                ? "bg-blue-600 text-white shadow-md"
                                : "text-slate-400 hover:text-slate-200"
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="px-4">
                {activeTab === "list" && renderEmployeeList()}

                {activeTab === "attendance" && (
                    <div className="bg-[#1e1e2d] border border-slate-700/50 rounded-xl p-8 text-center">
                        <Clock className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                        <h3 className="text-lg font-bold text-white mb-2">Chấm công</h3>
                        <p className="text-slate-400 text-sm">Tính năng đang phát triển...</p>
                    </div>
                )}

                {activeTab === "payroll" && <PayrollManagerMobile />}

                {activeTab === "advance" && <EmployeeAdvanceManagerMobile />}

                {activeTab === "history" && (
                    <div className="bg-[#1e1e2d] border border-slate-700/50 rounded-xl p-8 text-center">
                        <History className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                        <h3 className="text-lg font-bold text-white mb-2">Lịch sử làm việc</h3>
                        <p className="text-slate-400 text-sm">Tính năng đang phát triển...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
