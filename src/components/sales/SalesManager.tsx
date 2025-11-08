import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useAppContext } from "../../contexts/AppContext";
import { formatCurrency, formatDate } from "../../utils/format";
import { printElementById } from "../../utils/print";
import { PlusIcon, XMarkIcon } from "../Icons";
import type { CartItem, Part, Customer, Sale } from "../../types";

// Sales History Modal Component
const SalesHistoryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  currentBranchId: string;
  onPrintReceipt: (sale: Sale) => void;
  onEditSale: (sale: Sale) => void;
  onDeleteSale: (saleId: string) => void;
}> = ({
  isOpen,
  onClose,
  sales,
  currentBranchId,
  onPrintReceipt,
  onEditSale,
  onDeleteSale,
}) => {
  const [activeTimeFilter, setActiveTimeFilter] = useState("today");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [customStartDate, setCustomStartDate] = useState(
    formatDate(new Date(), true)
  );
  const [customEndDate, setCustomEndDate] = useState(
    formatDate(new Date(), true)
  );

  // Filter sales based on selected criteria
  const filteredSales = useMemo(() => {
    let filtered = sales.filter((sale) => sale.branchId === currentBranchId);

    // Time filter
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59
    );

    switch (activeTimeFilter) {
      case "today":
        filtered = filtered.filter((sale) => {
          const saleDate = new Date(sale.date);
          return saleDate >= startOfDay && saleDate <= endOfDay;
        });
        break;
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const startOfYesterday = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate()
        );
        const endOfYesterday = new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate(),
          23,
          59,
          59
        );
        filtered = filtered.filter((sale) => {
          const saleDate = new Date(sale.date);
          return saleDate >= startOfYesterday && saleDate <= endOfYesterday;
        });
        break;
      case "7days":
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filtered = filtered.filter(
          (sale) => new Date(sale.date) >= sevenDaysAgo
        );
        break;
      case "30days":
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filtered = filtered.filter(
          (sale) => new Date(sale.date) >= thirtyDaysAgo
        );
        break;
      case "custom":
        const customStart = new Date(customStartDate);
        const customEnd = new Date(customEndDate + "T23:59:59");
        filtered = filtered.filter((sale) => {
          const saleDate = new Date(sale.date);
          return saleDate >= customStart && saleDate <= customEnd;
        });
        break;
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (sale) =>
          sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sale.customer.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortOrder) {
        case "newest":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "oldest":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    sales,
    currentBranchId,
    activeTimeFilter,
    searchTerm,
    statusFilter,
    sortOrder,
    customStartDate,
    customEndDate,
  ]);

  // Calculate statistics
  const stats = useMemo(() => {
    const revenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const profit = filteredSales.reduce(
      (sum, sale) => sum + (sale.total - sale.discount),
      0
    );
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const orderCount = filteredSales.length;

    return { revenue, profit, profitMargin, orderCount };
  }, [filteredSales]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Lịch sử hóa đơn
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          {/* Time Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: "today", label: "Hôm nay" },
              { key: "yesterday", label: "Hôm qua" },
              { key: "7days", label: "7 ngày" },
              { key: "30days", label: "30 ngày" },
              { key: "custom", label: "Tùy chỉnh" },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveTimeFilter(filter.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTimeFilter === filter.key
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {activeTimeFilter === "custom" && (
            <div className="flex items-center gap-4 mb-4">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
              <span className="text-slate-500">đến</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          {/* Search and Sort */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Tìm mã hóa đơn hoặc tên khách hàng"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="all">Tất cả</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
            </select>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="p-6 grid grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="text-blue-600 dark:text-blue-400 text-sm font-medium">
              Doanh thu
            </div>
            <div className="text-blue-900 dark:text-blue-100 text-2xl font-bold">
              {formatCurrency(stats.revenue)}
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="text-green-600 dark:text-green-400 text-sm font-medium">
              Lợi nhuận gộp
            </div>
            <div className="text-green-900 dark:text-green-100 text-2xl font-bold">
              {formatCurrency(stats.profit)}
            </div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <div className="text-orange-600 dark:text-orange-400 text-sm font-medium">
              GM%
            </div>
            <div className="text-orange-900 dark:text-orange-100 text-2xl font-bold">
              {stats.profitMargin.toFixed(1)}%
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="text-purple-600 dark:text-purple-400 text-sm font-medium">
              Số hóa đơn
            </div>
            <div className="text-purple-900 dark:text-purple-100 text-2xl font-bold">
              {stats.orderCount}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {filteredSales.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              Không có hóa đơn nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    MÃ
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    THỜI GIAN
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    TỔNG
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    SL HÀNG
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    KHÁCH HÀNG
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    THANH TOÁN
                  </th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    THAO TÁC
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {sale.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-slate-100">
                        {formatDate(new Date(sale.date), false)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(sale.date).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(sale.total)}
                      </div>
                      {sale.discount > 0 && (
                        <div className="text-xs text-slate-500">
                          Giảm: {formatCurrency(sale.discount)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-slate-100">
                        {sale.items.reduce(
                          (sum, item) => sum + item.quantity,
                          0
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900 dark:text-slate-100">
                        {sale.customer.name}
                      </div>
                      {sale.customer.phone && (
                        <div className="text-xs text-slate-500">
                          {sale.customer.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sale.paymentMethod === "cash"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                        }`}
                      >
                        {sale.paymentMethod === "cash"
                          ? "Tiền mặt"
                          : "Chuyển khoản"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onPrintReceipt(sale)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="In lại hóa đơn"
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
                              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => onEditSale(sale)}
                          className="p-2 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                          title="Chỉnh sửa hóa đơn"
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDeleteSale(sale.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Xóa hóa đơn"
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div className="text-sm text-slate-500">Trang 1 / 1</div>
          <div className="text-sm text-slate-500">
            Hiển thị {filteredSales.length} hóa đơn
          </div>
        </div>
      </div>
    </div>
  );
};

const SalesManager: React.FC = () => {
  const {
    parts,
    customers,
    upsertCustomer,
    sales,
    cartItems,
    setCartItems,
    clearCart,
    deleteSale,
    currentBranchId,
    finalizeSale,
  } = useAppContext();

  // States
  const [partSearch, setPartSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    vehicleModel: "",
    licensePlate: "",
  });
  const [receiptId, setReceiptId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [receiptItems, setReceiptItems] = useState<CartItem[]>([]);
  const [receiptDiscount, setReceiptDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank" | null>(
    null
  );
  const [paymentType, setPaymentType] = useState<
    "full" | "partial" | "note" | null
  >(null);
  const [partialAmount, setPartialAmount] = useState(0);

  // Cart functions
  const addToCart = useCallback(
    (part: Part) => {
      const price = part.retailPrice?.[currentBranchId] ?? 0;
      const existing = cartItems.find((item) => item.partId === part.id);

      if (existing) {
        setCartItems((prev) =>
          prev.map((item) =>
            item.partId === part.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      } else {
        const newItem: CartItem = {
          partId: part.id,
          partName: part.name,
          sku: part.sku,
          quantity: 1,
          sellingPrice: price,
          stockSnapshot: part.stock?.[currentBranchId] ?? 0,
          discount: 0,
        };
        setCartItems((prev) => [...prev, newItem]);
      }
    },
    [cartItems, setCartItems, currentBranchId]
  );

  const removeFromCart = useCallback(
    (partId: string) => {
      setCartItems((prev) => prev.filter((item) => item.partId !== partId));
    },
    [setCartItems]
  );

  const updateCartQuantity = useCallback(
    (partId: string, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(partId);
        return;
      }

      setCartItems((prev) =>
        prev.map((item) =>
          item.partId === partId ? { ...item, quantity } : item
        )
      );
    },
    [setCartItems, removeFromCart]
  );

  // Calculate totals
  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + item.sellingPrice * item.quantity,
        0
      ),
    [cartItems]
  );

  const total = useMemo(
    () => Math.max(0, subtotal - orderDiscount),
    [subtotal, orderDiscount]
  );

  // Receipt calculations
  const receiptSubtotal = useMemo(
    () =>
      receiptItems.reduce(
        (sum, item) => sum + item.sellingPrice * item.quantity,
        0
      ),
    [receiptItems]
  );

  const receiptTotal = useMemo(
    () => Math.max(0, receiptSubtotal - receiptDiscount),
    [receiptSubtotal, receiptDiscount]
  );

  const receiptTotalQuantity = useMemo(
    () => receiptItems.reduce((sum, item) => sum + item.quantity, 0),
    [receiptItems]
  );

  // Filter parts by search
  const filteredParts = useMemo(() => {
    if (!partSearch) return parts;
    return parts.filter(
      (part) =>
        part.name.toLowerCase().includes(partSearch.toLowerCase()) ||
        part.sku.toLowerCase().includes(partSearch.toLowerCase())
    );
  }, [parts, partSearch]);

  // Filter customers by search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 10);
    return customers
      .filter(
        (customer) =>
          customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          customer.phone?.includes(customerSearch) ||
          false
      )
      .slice(0, 10);
  }, [customers, customerSearch]);

  // Handle add new customer
  const handleSaveNewCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) {
      alert("Vui lòng nhập tên và số điện thoại");
      return;
    }

    // Check if customer already exists
    const existingCustomer = customers.find(
      (c) => c.phone === newCustomer.phone
    );
    if (existingCustomer) {
      alert("Số điện thoại này đã tồn tại!");
      return;
    }

    // Create new customer
    const customer = {
      id: `CUST-${Date.now()}`,
      name: newCustomer.name,
      phone: newCustomer.phone,
      vehicleModel: newCustomer.vehicleModel,
      licensePlate: newCustomer.licensePlate,
      status: "active" as const,
      segment: "New" as const,
      loyaltyPoints: 0,
      totalSpent: 0,
      visitCount: 1,
      lastVisit: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    upsertCustomer(customer);

    // Select the new customer
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);

    // Reset form and close modal
    setNewCustomer({
      name: "",
      phone: "",
      vehicleModel: "",
      licensePlate: "",
    });
    setShowAddCustomerModal(false);
  };

  // Handle print receipt
  const handlePrintReceipt = (sale: Sale) => {
    // Set receipt data
    setReceiptId(sale.id);
    setCustomerName(sale.customer.name);
    setCustomerPhone(sale.customer.phone || "");
    setReceiptItems(sale.items);
    setReceiptDiscount(sale.discount || 0);

    // Wait for state update then print
    setTimeout(() => {
      printElementById("last-receipt");
    }, 100);
  };

  // Handle delete sale
  const handleDeleteSale = (saleId: string) => {
    if (
      !confirm("Xác nhận xóa hóa đơn này? Hành động này không thể hoàn tác.")
    ) {
      return;
    }

    // Delete using context function
    deleteSale(saleId);
    alert("Đã xóa hóa đơn thành công!");
  };

  // Handle edit sale (reopen in cart)
  const handleEditSale = (sale: Sale) => {
    if (
      !confirm("Mở lại hóa đơn này để chỉnh sửa? Giỏ hàng hiện tại sẽ bị xóa.")
    ) {
      return;
    }

    // Clear current cart
    clearCart();

    // Load sale items into cart
    sale.items.forEach((item) => {
      // Find the part to add to cart
      const part = parts.find((p) => p.id === item.partId);
      if (part) {
        for (let i = 0; i < item.quantity; i++) {
          addToCart(part);
        }
      }
    });

    // Load customer if exists
    if (sale.customer.id) {
      const customer = customers.find((c) => c.id === sale.customer.id);
      if (customer) {
        setSelectedCustomer(customer);
        setCustomerSearch(customer.name);
      }
    } else {
      setCustomerName(sale.customer.name);
      setCustomerPhone(sale.customer.phone || "");
    }

    // Load discount
    setOrderDiscount(sale.discount || 0);

    // Close history modal
    setShowSalesHistory(false);

    alert("Hóa đơn đã được tải vào giỏ hàng để chỉnh sửa");
  };

  // Handle finalize sale
  const handleFinalize = async () => {
    if (cartItems.length === 0) {
      alert("Vui lòng thêm sản phẩm vào giỏ hàng");
      return;
    }

    if (!paymentMethod) {
      alert("Vui lòng chọn phương thức thanh toán");
      return;
    }

    if (!paymentType) {
      alert("Vui lòng chọn hình thức thanh toán");
      return;
    }

    if (paymentType === "partial" && partialAmount <= 0) {
      alert("Vui lòng nhập số tiền khách trả");
      return;
    }

    try {
      const saleData = {
        items: cartItems,
        customer: {
          id: selectedCustomer?.id,
          name: selectedCustomer?.name || customerName || "Khách lẻ",
          phone: selectedCustomer?.phone || customerPhone,
        },
        discount: orderDiscount,
        paymentMethod: paymentMethod,
        note: "",
      };

      // Set receipt info for printing BEFORE clearing cart
      setReceiptId(`INV-${Date.now()}`);
      setCustomerName(saleData.customer.name);
      setCustomerPhone(saleData.customer.phone || "");
      setReceiptItems([...cartItems]); // Copy cart items for receipt
      setReceiptDiscount(orderDiscount); // Copy discount for receipt

      // Create customer if new (has phone but not selected from list)
      if (!selectedCustomer && customerPhone && customerName) {
        const existingCustomer = customers.find(
          (c) => c.phone === customerPhone
        );
        if (!existingCustomer) {
          upsertCustomer({
            id: `CUST-${Date.now()}`,
            name: customerName,
            phone: customerPhone,
            status: "active",
            segment: "New",
            loyaltyPoints: 0,
            totalSpent: 0,
            visitCount: 1,
            lastVisit: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
        }
      }

      // Now finalize sale (this will clear the cart)
      finalizeSale(saleData);

      // Clear form
      setSelectedCustomer(null);
      setCustomerSearch("");
      setOrderDiscount(0);
      setPaymentMethod(null);
      setPaymentType(null);
      setPartialAmount(0);

      // Print receipt after state updates
      setTimeout(() => {
        printElementById("last-receipt");
      }, 100);
    } catch (error) {
      console.error("Error finalizing sale:", error);
      alert("Có lỗi xảy ra khi hoàn tất giao dịch");
    }
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".customer-dropdown-container")) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="flex h-screen">
        {/* Main Content Area - Products Grid */}
        <div className="flex-1 flex flex-col">
          {/* Search Bar */}
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Tìm theo tên sản phẩm hoặc SKU..."
                  value={partSearch}
                  onChange={(e) => setPartSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => setShowSalesHistory(true)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg whitespace-nowrap transition-colors"
              >
                📊 Lịch sử bán hàng
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900">
            {filteredParts.length === 0 ? (
              <div className="text-center text-slate-400 mt-20">
                <div className="text-6xl mb-4">📦</div>
                <div className="text-xl font-medium mb-2">
                  {partSearch
                    ? "Không tìm thấy sản phẩm nào"
                    : "Chưa có sản phẩm"}
                </div>
                <div className="text-sm">
                  {partSearch
                    ? "Hãy thử một từ khóa tìm kiếm khác"
                    : "Vui lòng thêm sản phẩm vào hệ thống"}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {filteredParts.map((part) => {
                  const price = part.retailPrice?.[currentBranchId] ?? 0;
                  const stock = part.stock?.[currentBranchId] ?? 0;
                  const isOutOfStock = stock <= 0;

                  return (
                    <button
                      key={part.id}
                      onClick={() => !isOutOfStock && addToCart(part)}
                      disabled={isOutOfStock}
                      className={`group relative p-4 rounded-xl transition-all duration-200 ${
                        isOutOfStock
                          ? "bg-slate-700/50 dark:bg-slate-800/50 opacity-50 cursor-not-allowed"
                          : "bg-slate-700 dark:bg-slate-800 hover:bg-slate-600 dark:hover:bg-slate-700 hover:shadow-xl hover:scale-105"
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        {/* Product Image with Icon */}
                        <div className="flex items-center justify-center mb-3">
                          <div className="w-20 h-20 bg-orange-500/20 dark:bg-orange-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="text-4xl">📦</span>
                          </div>
                        </div>

                        {/* Product Name */}
                        <div className="text-left mb-2 flex-1">
                          <h3
                            className="font-semibold text-base text-white line-clamp-2 mb-1"
                            title={part.name}
                          >
                            {part.name}
                          </h3>
                          <div className="text-xs text-slate-400">
                            SKU: {part.sku}
                          </div>
                        </div>

                        {/* Price and Stock */}
                        <div className="flex justify-between items-end mt-auto">
                          <div className="text-left">
                            <div className="text-lg font-bold text-blue-400">
                              {formatCurrency(price)}
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 text-xs font-bold rounded-md ${
                                isOutOfStock
                                  ? "bg-red-600 text-white"
                                  : stock <= 5
                                  ? "bg-orange-600 text-white"
                                  : "bg-green-600 text-white"
                              }`}
                            >
                              {isOutOfStock ? "Hết" : stock}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Customer, Cart & Checkout */}
        <div className="w-96 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col">
          {/* Customer Selection */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="customer-dropdown-container">
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                Chọn khách hàng
              </label>
              <div className="relative flex gap-2">
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc số điện thoại..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center transition-colors"
                  title="Thêm khách hàng mới"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerSearch(customer.name);
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-600 border-b border-slate-100 dark:border-slate-600 last:border-b-0"
                      >
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {customer.name}
                        </div>
                        {customer.phone && (
                          <div className="text-sm text-slate-500">
                            {customer.phone}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedCustomer && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    {selectedCustomer.name}
                  </div>
                  {selectedCustomer.phone && (
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      {selectedCustomer.phone}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch("");
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                  >
                    Xóa khách hàng
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Giỏ hàng
              </h3>
              <span className="text-sm text-slate-500">
                ({cartItems.length} sản phẩm)
              </span>
            </div>

            {cartItems.length === 0 ? (
              <div className="text-center text-slate-400 py-12">
                <div className="text-4xl mb-2">🛒</div>
                <div className="text-sm">Giỏ hàng trống</div>
                <div className="text-xs text-slate-400 mt-1">
                  Chọn sản phẩm để thêm vào giỏ
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div
                    key={item.partId}
                    className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-lg"
                  >
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                      <span className="text-lg">📦</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                        {item.partName}
                      </div>
                      <div className="text-xs text-slate-500">
                        SKU: {item.sku}
                      </div>
                      <div className="text-sm text-blue-600 font-semibold">
                        {formatCurrency(item.sellingPrice)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateCartQuantity(
                            item.partId,
                            Math.max(1, item.quantity - 1)
                          )
                        }
                        className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-600 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium text-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateCartQuantity(item.partId, item.quantity + 1)
                        }
                        className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-600 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromCart(item.partId)}
                        className="w-8 h-8 flex items-center justify-center bg-red-100 dark:bg-red-900/20 rounded-full text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout Section */}
          {cartItems.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              {/* Summary */}
              <div className="p-4 space-y-2">
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>Tổng tiền hàng</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Giảm giá
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={orderDiscount}
                      onChange={(e) =>
                        setOrderDiscount(Number(e.target.value) || 0)
                      }
                      className="w-24 px-2 py-1 text-right text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                      placeholder="0"
                    />
                    <span className="text-slate-500">đ</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Khách phải trả
                  </span>
                  <span className="font-bold text-xl text-slate-900 dark:text-slate-100">
                    {formatCurrency(Math.max(0, total - orderDiscount))} đ
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="px-4 pb-3">
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Phương thức thanh toán <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all ${
                      paymentMethod === "cash"
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                    }`}
                  >
                    <span className="text-base">💵</span>
                    <span className="font-medium text-sm">Tiền mặt</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("bank")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all ${
                      paymentMethod === "bank"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                        : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                    }`}
                  >
                    <span className="text-base">💳</span>
                    <span className="font-medium text-sm">Chuyển khoản</span>
                  </button>
                </div>
              </div>

              {/* Payment Type */}
              {paymentMethod && (
                <div className="px-4 pb-3">
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Hình thức
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setPaymentType("full");
                        setPartialAmount(0);
                      }}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        paymentType === "full"
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-semibold"
                          : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                      }`}
                    >
                      Thanh toán đủ
                    </button>
                    <button
                      onClick={() => setPaymentType("partial")}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        paymentType === "partial"
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-semibold"
                          : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                      }`}
                    >
                      Thanh toán 1 phần
                    </button>
                    <button
                      onClick={() => {
                        setPaymentType("note");
                        setPartialAmount(0);
                      }}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        paymentType === "note"
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-semibold"
                          : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                      }`}
                    >
                      Ghi nợ
                    </button>
                  </div>
                </div>
              )}

              {/* Partial Payment Amount */}
              {paymentType === "partial" && (
                <div className="px-4 pb-3">
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Số tiền khách trả
                  </label>
                  <input
                    type="number"
                    value={partialAmount}
                    onChange={(e) =>
                      setPartialAmount(Number(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    placeholder="0"
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    Còn lại:{" "}
                    {formatCurrency(
                      Math.max(0, total - orderDiscount - partialAmount)
                    )}{" "}
                    đ
                  </div>
                </div>
              )}

              {/* Checkboxes */}
              <div className="px-4 pb-3 space-y-2">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Thời gian bán hàng
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="salesTime"
                    defaultChecked
                    className="w-4 h-4 text-pink-600 focus:ring-pink-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Thời gian hiện tại
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="salesTime"
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Tùy chỉnh
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Ghi chú riêng cho đơn hàng
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Đóng thời in hoá đơn
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="p-4 pt-0 flex gap-3">
                <button
                  onClick={clearCart}
                  className="flex-1 px-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
                >
                  LƯU NHẬP
                </button>
                <button
                  onClick={handleFinalize}
                  disabled={!paymentMethod || !paymentType}
                  className={`flex-1 px-4 py-3 font-bold rounded-lg transition-all ${
                    paymentMethod && paymentType
                      ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl"
                      : "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-500 cursor-not-allowed"
                  }`}
                >
                  XUẤT BÁN
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sales History Modal */}
      <SalesHistoryModal
        isOpen={showSalesHistory}
        onClose={() => setShowSalesHistory(false)}
        sales={sales}
        currentBranchId={currentBranchId}
        onPrintReceipt={handlePrintReceipt}
        onEditSale={handleEditSale}
        onDeleteSale={handleDeleteSale}
      />

      {/* Receipt Print Section (Hidden) - A5 Format */}
      {receiptId && (
        <div id="last-receipt" className="hidden print:block">
          <div
            style={{
              width: "148mm",
              minHeight: "210mm",
              margin: "0 auto",
              padding: "15mm",
              fontFamily: "Arial, sans-serif",
              fontSize: "12px",
              backgroundColor: "white",
              color: "#000",
              boxSizing: "border-box",
            }}
          >
            {/* Header with Logo */}
            <div
              style={{
                textAlign: "center",
                marginBottom: "20px",
                borderBottom: "2px solid #333",
                paddingBottom: "15px",
              }}
            >
              <img
                src="https://raw.githubusercontent.com/Nhan-Lam-SmartCare/Motocare/main/public/logo.png"
                alt="Nhận-Lâm SmartCare"
                style={{
                  width: "120px",
                  height: "120px",
                  margin: "0 auto 10px",
                  display: "block",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <h1
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  margin: "0 0 8px 0",
                  color: "#c92a2a",
                }}
              >
                Nhận-Lâm SmartCare
              </h1>
              <div style={{ fontSize: "11px", lineHeight: "1.6" }}>
                <div>
                  📍 Địa chỉ: 4p Phú Lợi B, Phú Thuận B, Hồng Ngự, Đồng Tháp
                </div>
                <div>📞 Điện thoại: 0947747907</div>
              </div>
            </div>

            {/* Bank Info Box */}
            <div
              style={{
                backgroundColor: "#f8f9fa",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                padding: "10px 12px",
                marginBottom: "20px",
                fontSize: "11px",
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
                💳 Thông tin chuyển khoản:
              </div>
              <div style={{ lineHeight: "1.6" }}>
                <div>
                  • Ngân hàng: <strong>NH Liên Việt (LPBank)</strong>
                </div>
                <div>
                  • Số tài khoản: <strong>LAMVOT</strong>
                </div>
                <div>
                  • Chủ tài khoản: <strong>VO THANH LAM</strong>
                </div>
              </div>
            </div>

            {/* Invoice Title */}
            <div
              style={{
                textAlign: "center",
                marginBottom: "15px",
              }}
            >
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  margin: "0 0 8px 0",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                HÓA ĐƠN BÁN HÀNG
              </h2>
              <div style={{ fontSize: "11px", color: "#666" }}>
                Số: <strong style={{ color: "#000" }}>{receiptId}</strong> -
                Ngày:{" "}
                <strong style={{ color: "#000" }}>
                  {formatDate(new Date(), true)}
                </strong>
              </div>
            </div>

            {/* Customer Info */}
            <div
              style={{
                marginBottom: "15px",
                padding: "10px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
              }}
            >
              <div style={{ fontSize: "12px", lineHeight: "1.8" }}>
                <div>
                  <strong>Khách hàng:</strong> {customerName || "Khách lẻ"}
                </div>
                {customerPhone && (
                  <div>
                    <strong>Điện thoại:</strong> {customerPhone}
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "15px",
                fontSize: "11px",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f1f3f5",
                    borderTop: "2px solid #333",
                    borderBottom: "2px solid #333",
                  }}
                >
                  <th
                    style={{
                      textAlign: "center",
                      padding: "8px 4px",
                      width: "8%",
                      fontWeight: "bold",
                    }}
                  >
                    STT
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 6px",
                      width: "37%",
                      fontWeight: "bold",
                    }}
                  >
                    Tên sản phẩm
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "8px 4px",
                      width: "10%",
                      fontWeight: "bold",
                    }}
                  >
                    SL
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 6px",
                      width: "20%",
                      fontWeight: "bold",
                    }}
                  >
                    Đơn giá
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 6px",
                      width: "25%",
                      fontWeight: "bold",
                    }}
                  >
                    Thành tiền
                  </th>
                </tr>
              </thead>
              <tbody>
                {receiptItems.map((item, index) => (
                  <React.Fragment key={item.partId}>
                    <tr style={{ borderBottom: "1px solid #e9ecef" }}>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "10px 4px",
                          verticalAlign: "top",
                        }}
                      >
                        {index + 1}
                      </td>
                      <td style={{ padding: "10px 6px", verticalAlign: "top" }}>
                        <div style={{ fontWeight: "600", marginBottom: "3px" }}>
                          {item.partName}
                        </div>
                        <div style={{ fontSize: "9px", color: "#868e96" }}>
                          SKU: {item.sku}
                        </div>
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "10px 4px",
                          verticalAlign: "top",
                          fontWeight: "600",
                        }}
                      >
                        {item.quantity}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "10px 6px",
                          verticalAlign: "top",
                        }}
                      >
                        {formatCurrency(item.sellingPrice)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "10px 6px",
                          verticalAlign: "top",
                          fontWeight: "600",
                        }}
                      >
                        {formatCurrency(item.sellingPrice * item.quantity)}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {/* Summary Section */}
            <div
              style={{
                borderTop: "2px solid #333",
                paddingTop: "12px",
                marginBottom: "15px",
              }}
            >
              <table style={{ width: "100%", fontSize: "12px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "6px 0", textAlign: "right" }}>
                      Tổng cộng ({receiptTotalQuantity} sản phẩm):
                    </td>
                    <td
                      style={{
                        padding: "6px 0 6px 20px",
                        textAlign: "right",
                        width: "30%",
                        fontWeight: "600",
                      }}
                    >
                      {formatCurrency(receiptSubtotal)}
                    </td>
                  </tr>
                  {receiptDiscount > 0 && (
                    <tr>
                      <td
                        style={{
                          padding: "6px 0",
                          textAlign: "right",
                          color: "#c92a2a",
                        }}
                      >
                        Giảm giá:
                      </td>
                      <td
                        style={{
                          padding: "6px 0 6px 20px",
                          textAlign: "right",
                          fontWeight: "600",
                          color: "#c92a2a",
                        }}
                      >
                        -{formatCurrency(receiptDiscount)}
                      </td>
                    </tr>
                  )}
                  <tr
                    style={{
                      borderTop: "1px solid #dee2e6",
                      fontSize: "14px",
                    }}
                  >
                    <td
                      style={{
                        padding: "10px 0",
                        textAlign: "right",
                        fontWeight: "bold",
                      }}
                    >
                      TỔNG THANH TOÁN:
                    </td>
                    <td
                      style={{
                        padding: "10px 0 10px 20px",
                        textAlign: "right",
                        fontWeight: "bold",
                        fontSize: "16px",
                        color: "#2f9e44",
                      }}
                    >
                      {formatCurrency(receiptTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Method */}
            <div
              style={{
                marginBottom: "20px",
                padding: "10px 12px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                fontSize: "11px",
              }}
            >
              <div style={{ marginBottom: "4px" }}>
                <strong>Hình thức thanh toán:</strong>{" "}
                {paymentMethod === "cash" ? "💵 Tiền mặt" : "💳 Chuyển khoản"}
              </div>
              <div style={{ fontStyle: "italic", color: "#495057" }}>
                {paymentType === "full"
                  ? "✓ Đã thanh toán đủ"
                  : paymentType === "partial"
                  ? `Thanh toán một phần: ${formatCurrency(partialAmount)}`
                  : "Ghi nợ"}
              </div>
            </div>

            {/* Footer Signatures */}
            <div
              style={{
                marginTop: "30px",
                borderTop: "1px solid #dee2e6",
                paddingTop: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                }}
              >
                <div style={{ textAlign: "center", width: "40%" }}>
                  <div
                    style={{
                      fontWeight: "bold",
                      marginBottom: "50px",
                      fontSize: "12px",
                    }}
                  >
                    Khách hàng
                  </div>
                  <div style={{ fontStyle: "italic", color: "#868e96" }}>
                    (Ký và ghi rõ họ tên)
                  </div>
                </div>
                <div style={{ textAlign: "center", width: "40%" }}>
                  <div
                    style={{
                      fontWeight: "bold",
                      marginBottom: "50px",
                      fontSize: "12px",
                    }}
                  >
                    Người bán hàng
                  </div>
                  <div style={{ fontStyle: "italic", color: "#868e96" }}>
                    (Ký và ghi rõ họ tên)
                  </div>
                </div>
              </div>
            </div>

            {/* Thank You Note */}
            <div
              style={{
                textAlign: "center",
                marginTop: "25px",
                paddingTop: "15px",
                borderTop: "1px dashed #adb5bd",
                fontSize: "11px",
                fontStyle: "italic",
                color: "#495057",
              }}
            >
              <div style={{ marginBottom: "5px" }}>
                ⭐ Cảm ơn quý khách đã sử dụng dịch vụ ⭐
              </div>
              <div>Hẹn gặp lại quý khách!</div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Thêm khách hàng mới
              </h3>
              <button
                onClick={() => {
                  setShowAddCustomerModal(false);
                  setNewCustomer({
                    name: "",
                    phone: "",
                    vehicleModel: "",
                    licensePlate: "",
                  });
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tên khách hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tên khách hàng"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Dòng xe
                </label>
                <input
                  type="text"
                  value={newCustomer.vehicleModel}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      vehicleModel: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Honda SH 2023"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Biển số xe
                </label>
                <input
                  type="text"
                  value={newCustomer.licensePlate}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      licensePlate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: 30A-12345"
                />
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowAddCustomerModal(false);
                  setNewCustomer({
                    name: "",
                    phone: "",
                    vehicleModel: "",
                    licensePlate: "",
                  });
                }}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveNewCustomer}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesManager;
