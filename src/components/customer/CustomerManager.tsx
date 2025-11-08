import React, { useState, useMemo, useRef, useEffect } from "react";
import { useAppContext } from "../../contexts/AppContext";
import { formatDate } from "../../utils/format";
import { PlusIcon, TrashIcon, XMarkIcon, UsersIcon } from "../Icons";
import type { Customer } from "../../types";

// Auto-classify customer segment based on business rules
const classifyCustomer = (customer: Customer): Customer["segment"] => {
  const points = customer.loyaltyPoints || 0;
  const spent = customer.totalSpent || 0;
  const visits = customer.visitCount || 0;
  const lastVisit = customer.lastVisit
    ? new Date(customer.lastVisit)
    : new Date();
  const daysSinceLastVisit = Math.floor(
    (Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)
  );

  // VIP: >= 5000 points OR >= 20M spent OR >= 20 visits
  if (points >= 5000 || spent >= 20000000 || visits >= 20) {
    return "VIP";
  }

  // Loyal: >= 2000 points OR >= 10M spent OR >= 10 visits
  if (points >= 2000 || spent >= 10000000 || visits >= 10) {
    return "Loyal";
  }

  // Lost: No visit in 180+ days (6 months)
  if (daysSinceLastVisit > 180 && visits > 0) {
    return "Lost";
  }

  // At Risk: No visit in 90+ days (3 months) but not lost yet
  if (daysSinceLastVisit > 90 && visits > 0) {
    return "At Risk";
  }

  // Potential: Has visited 2-9 times
  if (visits >= 2 && visits < 10) {
    return "Potential";
  }

  // New: First time or very few visits
  return "New";
};

const CustomerManager: React.FC = () => {
  const { customers, upsertCustomer, setCustomers } = useAppContext();
  const [search, setSearch] = useState("");
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState<"customers" | "suppliers">(
    "customers"
  );
  const [activeFilter, setActiveFilter] = useState("all");

  // Auto-classify customers on mount only (not on every change to avoid conflicts)
  useEffect(() => {
    let hasChanges = false;
    const updatedCustomers = customers.map((customer) => {
      // Only classify if segment is missing or undefined
      if (!customer.segment) {
        const newSegment = classifyCustomer(customer);
        hasChanges = true;
        return { ...customer, segment: newSegment };
      }
      return customer;
    });

    if (hasChanges) {
      setCustomers(updatedCustomers);
    }
  }, [customers.length]); // Only run when customer count changes

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    );

    // Apply segment filter
    if (activeFilter !== "all") {
      const segmentMap: Record<string, string> = {
        vip: "VIP",
        loyal: "Loyal",
        potential: "Potential",
        "at-risk": "At Risk",
        lost: "Lost",
        new: "New",
      };
      const targetSegment = segmentMap[activeFilter];
      result = result.filter((c) => c.segment === targetSegment);
    }

    return result;
  }, [customers, search, activeFilter]);

  const handleDelete = (id: string) => {
    if (!confirm("Xác nhận xoá khách hàng này?")) return;
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  // Statistics calculations
  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.status === "active").length;
    return {
      total,
      active,
      newThisMonth: customers.filter((c) => {
        if (!c.created_at) return false;
        const date = new Date(c.created_at);
        const now = new Date();
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      }).length,
      revenue: 0, // Placeholder
      vip: customers.filter((c) => c.segment === "VIP").length,
      loyal: customers.filter((c) => c.segment === "Loyal").length,
      potential: customers.filter((c) => c.segment === "Potential").length,
      atRisk: customers.filter((c) => c.segment === "At Risk").length,
      lost: customers.filter((c) => c.segment === "Lost").length,
      new: customers.filter((c) => c.segment === "New").length,
    };
  }, [customers]);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center px-6">
          <button
            onClick={() => setActiveTab("customers")}
            className={`flex items-center gap-2 px-4 py-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "customers"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <UsersIcon className="w-5 h-5" />
            <span>Khách hàng ({stats.total})</span>
          </button>
          <button
            onClick={() => setActiveTab("suppliers")}
            className={`flex items-center gap-2 px-4 py-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "suppliers"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <span>Nhà cung cấp (0)</span>
          </button>
        </div>
      </div>

      {activeTab === "customers" ? (
        <div className="flex-1 overflow-auto p-6">
          {/* Search and Actions */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 relative">
              <svg
                className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Tìm theo tên, SĐT, biển số xe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span>Upload DS</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span>Nhắc BD</span>
            </button>
            <button
              onClick={() => setEditCustomer({} as Customer)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Thêm KH</span>
            </button>
          </div>

          {/* Statistics Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-slate-600 dark:text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Thống kê khách hàng
              </h2>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              {/* Total Customers */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-1">
                  Tổng khách hàng
                </div>
                <div className="text-blue-900 dark:text-blue-100 text-3xl font-bold">
                  {stats.total}
                </div>
                <div className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                  0 hoạt động
                </div>
              </div>

              {/* New This Month */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="text-green-600 dark:text-green-400 text-sm font-medium mb-1">
                  Khách mới tháng này
                </div>
                <div className="text-green-900 dark:text-green-100 text-3xl font-bold">
                  {stats.newThisMonth}
                </div>
                <div className="text-green-600 dark:text-green-400 text-xs mt-1">
                  ↑ 0.0% so với tháng trước
                </div>
              </div>

              {/* Average Revenue */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <div className="text-purple-600 dark:text-purple-400 text-sm font-medium mb-1">
                  Doanh thu trung bình
                </div>
                <div className="text-purple-900 dark:text-purple-100 text-3xl font-bold">
                  0 đ
                </div>
                <div className="text-purple-600 dark:text-purple-400 text-xs mt-1">
                  / khách hàng
                </div>
              </div>

              {/* At Risk */}
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                <div className="text-orange-600 dark:text-orange-400 text-sm font-medium mb-1">
                  Cần chăm sóc
                </div>
                <div className="text-orange-900 dark:text-orange-100 text-3xl font-bold">
                  {stats.atRisk}
                </div>
                <div className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                  0 đ tiềm năng
                </div>
              </div>
            </div>
          </div>

          {/* Customer Segments */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-slate-600 dark:text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Phân khúc khách hàng
              </h2>
            </div>

            <div className="grid grid-cols-6 gap-4 mb-6">
              {/* VIP */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border-2 border-purple-200 dark:border-purple-800">
                <div className="text-purple-600 dark:text-purple-400 text-xs font-medium mb-1">
                  VIP
                </div>
                <div className="text-purple-900 dark:text-purple-100 text-2xl font-bold">
                  {stats.vip}
                </div>
                <div className="text-purple-600 dark:text-purple-400 text-xs mt-1">
                  0.0%
                </div>
              </div>

              {/* Loyal */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800">
                <div className="text-blue-600 dark:text-blue-400 text-xs font-medium mb-1">
                  Loyal
                </div>
                <div className="text-blue-900 dark:text-blue-100 text-2xl font-bold">
                  {stats.loyal}
                </div>
                <div className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                  0.0%
                </div>
              </div>

              {/* Potential */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border-2 border-green-200 dark:border-green-800">
                <div className="text-green-600 dark:text-green-400 text-xs font-medium mb-1">
                  Potential
                </div>
                <div className="text-green-900 dark:text-green-100 text-2xl font-bold">
                  {stats.potential}
                </div>
                <div className="text-green-600 dark:text-green-400 text-xs mt-1">
                  0.0%
                </div>
              </div>

              {/* At Risk */}
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border-2 border-orange-200 dark:border-orange-800">
                <div className="text-orange-600 dark:text-orange-400 text-xs font-medium mb-1">
                  At Risk
                </div>
                <div className="text-orange-900 dark:text-orange-100 text-2xl font-bold">
                  {stats.atRisk}
                </div>
                <div className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                  0.0%
                </div>
              </div>

              {/* Lost */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border-2 border-red-200 dark:border-red-800">
                <div className="text-red-600 dark:text-red-400 text-xs font-medium mb-1">
                  Lost
                </div>
                <div className="text-red-900 dark:text-red-100 text-2xl font-bold">
                  {stats.lost}
                </div>
                <div className="text-red-600 dark:text-red-400 text-xs mt-1">
                  0.0%
                </div>
              </div>

              {/* New */}
              <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-4 border-2 border-cyan-200 dark:border-cyan-800">
                <div className="text-cyan-600 dark:text-cyan-400 text-xs font-medium mb-1">
                  New
                </div>
                <div className="text-cyan-900 dark:text-cyan-100 text-2xl font-bold">
                  {stats.new}
                </div>
                <div className="text-cyan-600 dark:text-cyan-400 text-xs mt-1">
                  0.0%
                </div>
              </div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-slate-600 dark:text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Phân loại khách hàng
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                Tất cả khách hàng
              </button>
              <button
                onClick={() => setActiveFilter("vip")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === "vip"
                    ? "bg-purple-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                VIP - Khách hàng quý
              </button>
              <button
                onClick={() => setActiveFilter("loyal")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === "loyal"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                Trung thành
              </button>
              <button
                onClick={() => setActiveFilter("potential")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === "potential"
                    ? "bg-green-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                Tiềm năng
              </button>
              <button
                onClick={() => setActiveFilter("at-risk")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === "at-risk"
                    ? "bg-orange-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-2"></span>
                Cần chăm sóc
              </button>
              <button
                onClick={() => setActiveFilter("lost")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === "lost"
                    ? "bg-red-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                Đã mất
              </button>
              <button
                onClick={() => setActiveFilter("new")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === "new"
                    ? "bg-cyan-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <span className="inline-block w-2 h-2 rounded-full bg-cyan-500 mr-2"></span>
                Khách mới
              </button>
            </div>
          </div>

          {/* Customer Cards */}
          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
              <div className="flex justify-center mb-4">
                <svg
                  className="w-16 h-16 text-slate-300 dark:text-slate-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-lg">
                Không có khách hàng nào.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((customer) => {
                const segmentConfig = {
                  VIP: {
                    bg: "bg-gradient-to-br from-purple-500 to-purple-700",
                    text: "VIP",
                    icon: "👑",
                  },
                  Loyal: {
                    bg: "bg-gradient-to-br from-blue-500 to-blue-700",
                    text: "Trung thành",
                    icon: "⭐",
                  },
                  Potential: {
                    bg: "bg-gradient-to-br from-green-500 to-green-700",
                    text: "Tiềm năng",
                    icon: "🌱",
                  },
                  "At Risk": {
                    bg: "bg-gradient-to-br from-orange-500 to-orange-700",
                    text: "Cần chăm sóc",
                    icon: "⚠️",
                  },
                  Lost: {
                    bg: "bg-gradient-to-br from-red-500 to-red-700",
                    text: "Đã mất",
                    icon: "❌",
                  },
                  New: {
                    bg: "bg-gradient-to-br from-cyan-500 to-cyan-700",
                    text: "Khách mới",
                    icon: "✨",
                  },
                };

                const config = customer.segment
                  ? segmentConfig[customer.segment]
                  : {
                      bg: "bg-gradient-to-br from-slate-500 to-slate-700",
                      text: "Khách hàng",
                      icon: "👤",
                    };
                const points = customer.loyaltyPoints || 0;
                const pointsPercent = Math.min((points / 10000) * 100, 100);

                return (
                  <div
                    key={customer.id}
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow"
                  >
                    {/* Card Header with Gradient */}
                    <div className={`${config.bg} p-4 text-white relative`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{config.icon}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 bg-white/20 rounded-full backdrop-blur">
                            {config.text}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditCustomer(customer)}
                            className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur"
                            title="Chỉnh sửa"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="p-1.5 bg-white/20 hover:bg-red-500 rounded-lg transition-colors backdrop-blur"
                            title="Xóa"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold mb-1">
                          {customer.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm opacity-90">
                          <span>📞 {customer.phone || "—"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3">
                      {/* Vehicle Info */}
                      {customer.vehicleModel && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-400 dark:text-slate-500">
                            🏍️
                          </span>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {customer.vehicleModel}
                            </div>
                            {customer.licensePlate && (
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                Biển số: {customer.licensePlate}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Loyalty Points Section */}
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🎁</span>
                            <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                              ĐIỂM TÍCH LŨY
                            </span>
                          </div>
                          <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                            {points.toLocaleString()}
                          </span>
                        </div>

                        {/* Points Progress Bar */}
                        <div className="mb-1">
                          <div className="h-2 bg-amber-200 dark:bg-amber-900/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                              style={{ width: `${pointsPercent}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-[10px] text-amber-700 dark:text-amber-300 text-right">
                          Mục tiêu: 10,000 điểm
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <div className="text-center">
                          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {customer.visitCount || 0}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Lần đến
                          </div>
                        </div>
                        <div className="text-center border-x border-slate-200 dark:border-slate-700">
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            {((customer.totalSpent || 0) / 1000000).toFixed(1)}M
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Chi tiêu
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                            {customer.lastVisit
                              ? `${Math.floor(
                                  (Date.now() -
                                    new Date(customer.lastVisit).getTime()) /
                                    (1000 * 60 * 60 * 24)
                                )} ngày`
                              : "—"}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Ghé cuối
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          {/* Suppliers Tab */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 relative">
              <svg
                className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Tìm theo tên hoặc số điện thoại..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-slate-600 dark:text-slate-400 text-sm font-medium">
              Tổng: <span className="font-bold">0</span> nhà cung cấp
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span>Upload CSV</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              <PlusIcon className="w-5 h-5" />
              <span>Thêm mới</span>
            </button>
          </div>

          {/* Empty State */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="flex justify-center mb-4">
              <svg
                className="w-16 h-16 text-slate-300 dark:text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              Chưa có nhà cung cấp.
            </p>
          </div>
        </div>
      )}

      {editCustomer && (
        <CustomerModal
          customer={editCustomer}
          onSave={upsertCustomer}
          onClose={() => setEditCustomer(null)}
        />
      )}
      {showImport && <ImportCSVModal onClose={() => setShowImport(false)} />}
    </div>
  );
};

const CustomerModal: React.FC<{
  customer: Customer;
  onSave: (c: Partial<Customer> & { id?: string }) => void;
  onClose: () => void;
}> = ({ customer, onSave, onClose }) => {
  const [name, setName] = useState(customer.name || "");
  const [phone, setPhone] = useState(customer.phone || "");
  const [vehicleModel, setVehicleModel] = useState(customer.vehicleModel || "");
  const [licensePlate, setLicensePlate] = useState(customer.licensePlate || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: customer.id,
      name: name.trim(),
      phone: phone.trim(),
      vehicleModel: vehicleModel.trim(),
      licensePlate: licensePlate.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            {customer.id ? "Sửa khách hàng" : "Thêm khách hàng"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tên khách */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tên khách
            </label>
            <input
              type="text"
              placeholder="Nhập tên khách"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Số điện thoại */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Số điện thoại
            </label>
            <input
              type="text"
              placeholder="VD: 09xxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Xe và Biển số */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Xe
              </label>
              <input
                type="text"
                placeholder="Dòng xe"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Biển số
              </label>
              <input
                type="text"
                placeholder="VD: 59A1-123.45"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ImportCSVModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { setCustomers } = useAppContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<
    Array<{ name: string; phone?: string }>
  >([]);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) {
        setError("File CSV trống.");
        return;
      }
      // Phát hiện header tự động: nếu dòng đầu chứa "name" hoặc "phone" (không phân biệt hoa thường) → bỏ qua
      const firstLine = lines[0].toLowerCase();
      const hasHeader =
        firstLine.includes("name") ||
        firstLine.includes("phone") ||
        firstLine.includes("tên") ||
        firstLine.includes("sđt");
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const parsed: Array<{ name: string; phone?: string }> = [];
      for (const line of dataLines) {
        const cols = line.split(",").map((c) => c.trim());
        if (cols.length === 0 || !cols[0]) continue;
        parsed.push({ name: cols[0], phone: cols[1] || undefined });
      }
      if (parsed.length === 0) {
        setError("Không tìm thấy dữ liệu hợp lệ trong CSV.");
        return;
      }
      setPreview(parsed);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (preview.length === 0) return;
    const newCustomers = preview.map((p) => ({
      id: `CUS-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: p.name,
      phone: p.phone,
      created_at: new Date().toISOString(),
    }));
    setCustomers((prev) => [...newCustomers, ...prev]);
    alert(`Đã import ${newCustomers.length} khách hàng.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Import khách hàng từ CSV</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <p className="text-slate-600">
            Chọn file CSV với cột đầu tiên là <strong>tên khách hàng</strong>,
            cột thứ hai là <strong>số điện thoại</strong> (tùy chọn).
          </p>
          <p className="text-slate-600 text-xs">
            Dòng đầu tiên nếu chứa "name", "phone", "tên", "sđt" sẽ tự động bỏ
            qua (header).
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm"
          />
          {error && <div className="text-red-600 text-xs">{error}</div>}
          {preview.length > 0 && (
            <div className="border rounded p-3 bg-slate-50 dark:bg-slate-900 max-h-64 overflow-y-auto">
              <div className="font-semibold mb-2">
                Xem trước ({preview.length} khách hàng):
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-1">Tên</th>
                    <th className="p-1">SĐT</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((p, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-1">{p.name}</td>
                      <td className="p-1">{p.phone || "--"}</td>
                    </tr>
                  ))}
                  {preview.length > 20 && (
                    <tr>
                      <td colSpan={2} className="p-1 text-slate-500">
                        ... và {preview.length - 20} khách hàng nữa
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-slate-50"
            >
              Huỷ
            </button>
            <button
              disabled={preview.length === 0}
              onClick={handleImport}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import {preview.length > 0 && `(${preview.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerManager;
