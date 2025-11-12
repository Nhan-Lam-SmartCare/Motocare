import React, { useState, useMemo } from "react";
import { useAppContext } from "../../contexts/AppContext";
import { formatCurrency, formatDate } from "../../utils/format";
import { Calendar, Search, Download, ChevronDown } from "lucide-react";

interface ServiceHistoryProps {
  currentBranchId: string;
}

export const ServiceHistory: React.FC<ServiceHistoryProps> = ({
  currentBranchId,
}) => {
  const { workOrders } = useAppContext();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("Tháng 09/2025");
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const getDateRange = (filter: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    if (filter.includes("Tháng")) {
      const match = filter.match(/Tháng (\d+)\/(\d+)/);
      if (match) {
        const filterMonth = parseInt(match[1]) - 1;
        const filterYear = parseInt(match[2]);
        const start = new Date(filterYear, filterMonth, 1);
        const end = new Date(filterYear, filterMonth + 1, 0, 23, 59, 59);
        return { start, end };
      }
    }
    
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 0, 23, 59, 59),
    };
  };

  const filteredOrders = useMemo(() => {
    const { start, end } = getDateRange(dateFilter);
    
    return workOrders
      .filter((order) => {
        if (order.branchId !== currentBranchId) return false;

        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          const matches = [
            order.id?.toLowerCase(),
            order.customerName?.toLowerCase(),
            order.customerPhone?.toLowerCase(),
            order.vehicleModel?.toLowerCase(),
            order.licensePlate?.toLowerCase(),
          ].some((field) => field?.includes(search));

          if (!matches) return false;
        }

        if (statusFilter !== "all" && order.status !== statusFilter)
          return false;

        if (technicianFilter !== "all" && order.technicianName !== technicianFilter)
          return false;

        if (paymentFilter !== "all") {
          if (paymentFilter === "paid" && order.paymentStatus !== "paid") return false;
          if (paymentFilter === "unpaid" && order.paymentStatus !== "unpaid") return false;
        }

        if (order.creationDate) {
          const orderDate = new Date(order.creationDate);
          if (orderDate < start || orderDate > end) return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.creationDate || 0).getTime() -
          new Date(a.creationDate || 0).getTime()
      );
  }, [
    workOrders,
    searchTerm,
    statusFilter,
    dateFilter,
    technicianFilter,
    paymentFilter,
    currentBranchId,
  ]);

  const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);

  const exportToCSV = () => {
    const headers = ["Mã Phiếu", "Ngày tạo", "Khách hàng", "Xe", "Biển số", "Trạng thái", "Tổng chi phí"];
    const csvContent = [
      headers.join(","),
      ...filteredOrders.map((order) =>
        [
          order.id || "",
          formatDate(order.creationDate, true),
          order.customerName || "",
          order.vehicleModel || "",
          order.licensePlate || "",
          order.status || "",
          order.total?.toString() || "0",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `lich-su-sua-chua-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig: Record<string, { icon: string; color: string }> = {
      "Tiếp nhận": { icon: "📋", color: "text-blue-600 dark:text-blue-400" },
      "Đang sửa": { icon: "🔧", color: "text-orange-600 dark:text-orange-400" },
      "Đã sửa xong": { icon: "✓", color: "text-purple-600 dark:text-purple-400" },
      "Trả máy": { icon: "✓", color: "text-green-600 dark:text-green-400" },
    };
    const config = statusConfig[status] || statusConfig["Tiếp nhận"];
    return (
      <span className={`flex items-center gap-1 text-sm ${config.color}`}>
        <span>{config.icon}</span>
        <span>{status}</span>
      </span>
    );
  };

  const PaymentBadge = ({ status }: { status?: string }) => {
    if (status === "paid") {
      return <span className="text-xs text-green-600 dark:text-green-400">✓ Đã thanh toán</span>;
    }
    return <span className="text-xs text-slate-500 dark:text-slate-400">○ Chưa thanh toán</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">🕐 Lịch sử SC</h1>
            <button onClick={exportToCSV} className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" />
              Xuất Excel
            </button>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-sm opacity-90 mb-1">Tổng doanh thu</div>
            <div className="text-3xl font-bold">{formatCurrency(totalRevenue)}</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full pl-10 pr-8 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 appearance-none cursor-pointer">
                <option value="Tháng 09/2025">Tháng 09/2025</option>
                <option value="Tháng 08/2025">Tháng 08/2025</option>
                <option value="Tháng 07/2025">Tháng 07/2025</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Tìm 1 biên nhận sửa chữa" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100" />
            </div>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100">
              <option value="all">Tất cả trạng thái</option>
              <option value="Tiếp nhận">Tiếp nhận</option>
              <option value="Đang sửa">Đang sửa</option>
              <option value="Đã sửa xong">Đã sửa xong</option>
              <option value="Trả máy">Trả máy</option>
            </select>

            <select value={technicianFilter} onChange={(e) => setTechnicianFilter(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100">
              <option value="all">Tất cả KTV</option>
              <option value="KTV 1">KTV 1</option>
              <option value="KTV 2">KTV 2</option>
            </select>

            <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100">
              <option value="all">Tất cả thanh toán</option>
              <option value="paid">Đã thanh toán</option>
              <option value="unpaid">Chưa thanh toán</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-12 text-center border border-slate-200 dark:border-slate-700">
              <p className="text-slate-400 dark:text-slate-500">Không có phiếu sửa chữa nào</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{formatDate(order.creationDate, true)}</span>
                      <StatusBadge status={order.status || "Tiếp nhận"} />
                    </div>
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">{order.vehicleModel || "N/A"}</div>
                    <div className="text-sm text-blue-600 dark:text-blue-400 mb-2">Imei: {order.id?.slice(-10) || "N/A"}</div>
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-slate-500 dark:text-slate-400 min-w-[100px]">Khách hàng</span>
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{order.customerName || "N/A"}</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">{order.customerPhone || ""}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-slate-500 dark:text-slate-400 min-w-[100px]">Chi tiết</span>
                        <div className="text-sm text-slate-900 dark:text-slate-100">{order.issueDescription || "Không có mô tả"}</div>
                      </div>
                      {order.technicianName && (
                        <div className="flex items-start gap-2">
                          <span className="text-sm text-slate-500 dark:text-slate-400 min-w-[100px]">KTV</span>
                          <span className="text-sm text-blue-600 dark:text-blue-400">🔧 {order.technicianName}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-slate-500 dark:text-slate-400 min-w-[100px]">Biển số/Imei</span>
                        <div className="text-sm text-slate-900 dark:text-slate-100">{order.licensePlate || "N/A"}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <PaymentBadge status={order.paymentStatus} />
                    <div className="mt-2">
                      <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Tổng chi phí</div>
                      <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(order.total || 0)}</div>
                    </div>
                    <button className="mt-3 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors">Xem</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
