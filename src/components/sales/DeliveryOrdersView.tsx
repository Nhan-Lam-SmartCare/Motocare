import React, { useState, useMemo } from "react";
import { Search, Package, User, Calendar } from "lucide-react";
import type { Sale, Employee } from "../../types";
import { DeliveryStatusBadge } from "./DeliveryStatusBadge";
import { formatCurrency, formatDate } from "../../utils/format";

interface DeliveryOrdersViewProps {
    sales: Sale[];
    employees: Employee[];
    onUpdateStatus: (saleId: string, status: DeliveryStatus, shipperId?: string) => void;
    onCompleteDelivery: (saleId: string) => void;
    onRefund?: (saleId: string) => void;
    isLoading?: boolean;
}

type DeliveryStatus = "pending" | "preparing" | "shipping" | "delivered" | "cancelled";
type StatusFilter = "all" | "pending" | "preparing" | "shipping" | "delivered" | "cancelled";

export const DeliveryOrdersView: React.FC<DeliveryOrdersViewProps> = ({
    sales,
    employees,
    onUpdateStatus,
    onCompleteDelivery,
    onRefund,
    isLoading = false,
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [selectedShipper, setSelectedShipper] = useState<{ [saleId: string]: string }>({});

    // Filter delivery orders only
    const deliveryOrders = useMemo(() => {
        return sales
            .filter(sale => sale.delivery_method === "delivery")
            .filter(sale => {
                if (statusFilter !== "all" && sale.delivery_status !== statusFilter) {
                    return false;
                }
                if (searchQuery.trim()) {
                    const query = searchQuery.toLowerCase();
                    return (
                        sale.customer.name?.toLowerCase().includes(query) ||
                        sale.customer.phone?.toLowerCase().includes(query) ||
                        sale.delivery_address?.toLowerCase().includes(query) ||
                        sale.sale_code?.toLowerCase().includes(query)
                    );
                }
                return true;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, statusFilter, searchQuery]);

    // Count by status
    const statusCounts = useMemo(() => {
        const delivery = sales.filter(s => s.delivery_method === "delivery");
        return {
            all: delivery.length,
            pending: delivery.filter(s => s.delivery_status === "pending").length,
            preparing: delivery.filter(s => s.delivery_status === "preparing").length,
            shipping: delivery.filter(s => s.delivery_status === "shipping").length,
            delivered: delivery.filter(s => s.delivery_status === "delivered").length,
            cancelled: delivery.filter(s => s.delivery_status === "cancelled").length,
        };
    }, [sales]);

    const handleAssignShipper = (saleId: string) => {
        const shipperId = selectedShipper[saleId];
        if (shipperId) {
            onUpdateStatus(saleId, "shipping", shipperId);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                    📦 Quản lý đơn giao hàng
                </h2>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm theo tên, SĐT, địa chỉ, mã đơn..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Status Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {[
                        { value: "all", label: "Tất cả", count: statusCounts.all },
                        { value: "pending", label: "Chờ xử lý", count: statusCounts.pending },
                        { value: "preparing", label: "Đang chuẩn bị", count: statusCounts.preparing },
                        { value: "shipping", label: "Đang giao", count: statusCounts.shipping },
                        { value: "delivered", label: "Đã giao", count: statusCounts.delivered },
                        { value: "cancelled", label: "Đã hủy", count: statusCounts.cancelled },
                    ].map((filter) => (
                        <button
                            key={filter.value}
                            onClick={() => setStatusFilter(filter.value as StatusFilter)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${statusFilter === filter.value
                                ? "bg-blue-600 text-white shadow-lg"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                                }`}
                        >
                            {filter.label} ({filter.count})
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900">
                {isLoading ? (
                    <div className="text-center py-12 text-slate-500">Đang tải...</div>
                ) : deliveryOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <p className="text-slate-500 dark:text-slate-400">Không có đơn giao hàng nào</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {deliveryOrders.map((sale) => (
                            <div
                                key={sale.id}
                                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow"
                            >
                                {/* Header Row */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                                                {sale.sale_code}
                                            </span>
                                            <DeliveryStatusBadge status={sale.delivery_status} />
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            <Calendar className="w-3 h-3 inline mr-1" />
                                            {formatDate(sale.date)}
                                            {sale.estimated_delivery_date && (
                                                <span className="ml-2">
                                                    | Dự kiến: {formatDate(sale.estimated_delivery_date)}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-slate-900 dark:text-white">
                                            {formatCurrency(sale.total + (sale.shipping_fee || 0))}
                                        </div>
                                        {sale.shipping_fee && sale.shipping_fee > 0 && (
                                            <div className="text-xs text-slate-500">
                                                (+ ship {formatCurrency(sale.shipping_fee)})
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Customer Info */}
                                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Khách hàng</p>
                                        <p className="font-medium text-slate-900 dark:text-white">{sale.customer.name}</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-300">{sale.customer.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Địa chỉ giao hàng</p>
                                        <p className="text-xs text-slate-700 dark:text-slate-300">{sale.delivery_address}</p>
                                        {sale.delivery_phone && (
                                            <p className="text-xs text-slate-600 dark:text-slate-400">SĐT: {sale.delivery_phone}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Shipper Info */}
                                {sale.shipper_name && (
                                    <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                                            <User className="w-3 h-3 inline mr-1" />
                                            Người giao: {sale.shipper_name}
                                        </p>
                                    </div>
                                )}

                                {/* Note */}
                                {sale.delivery_note && (
                                    <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-800 dark:text-amber-300">
                                        📝 {sale.delivery_note}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                                    {sale.delivery_status === "pending" && (
                                        <button
                                            onClick={() => onUpdateStatus(sale.id, "preparing")}
                                            className="flex-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Chuẩn bị hàng
                                        </button>
                                    )}

                                    {sale.delivery_status === "preparing" && (
                                        <>
                                            <select
                                                value={selectedShipper[sale.id] || ""}
                                                onChange={(e) => setSelectedShipper({ ...selectedShipper, [sale.id]: e.target.value })}
                                                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                                            >
                                                <option value="">Chọn người giao...</option>
                                                {employees.map((emp) => (
                                                    <option key={emp.id} value={emp.id}>
                                                        {emp.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => handleAssignShipper(sale.id)}
                                                disabled={!selectedShipper[sale.id]}
                                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Giao hàng
                                            </button>
                                        </>
                                    )}

                                    {sale.delivery_status === "shipping" && (
                                        <button
                                            onClick={() => onCompleteDelivery(sale.id)}
                                            className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            ✓ Đã giao xong
                                        </button>
                                    )}

                                    {sale.delivery_status === "delivered" && onRefund && (
                                        <button
                                            onClick={() => onRefund(sale.id)}
                                            className="flex-1 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            ↩️ Hoàn trả
                                        </button>
                                    )}

                                    {sale.delivery_status !== "delivered" && sale.delivery_status !== "cancelled" && (
                                        <button
                                            onClick={() => onUpdateStatus(sale.id, "cancelled")}
                                            className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Hủy đơn
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
