import React, { useState, useMemo } from "react";
import {
  X,
  Plus,
  Trash2,
  Search,
  ShoppingCart,
  AlertCircle,
  Package,
  Filter,
} from "lucide-react";
import { useSuppliers } from "../../hooks/useSuppliers";
import { useParts } from "../../hooks/useSupabase";
import { useCreatePurchaseOrder } from "../../hooks/usePurchaseOrders";
import { useAppContext } from "../../contexts/AppContext";
import { useCategories } from "../../hooks/useCategories";
import { useCreatePartRepo } from "../../hooks/usePartsRepository";
import { formatCurrency } from "../../utils/format";
import { showToast } from "../../utils/toast";
import FormattedNumberInput from "../common/FormattedNumberInput";
import type { CreatePurchaseOrderInput, Part } from "../../types";

interface CreatePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledPartIds?: string[];
}

interface POItem {
  part_id: string;
  quantity_ordered: number;
  unit_price: number;
}

export const CreatePOModal: React.FC<CreatePOModalProps> = ({
  isOpen,
  onClose,
  prefilledPartIds = [],
}) => {
  const { currentBranchId } = useAppContext();
  const branchId = currentBranchId || "";
  const { data: suppliers = [] } = useSuppliers();
  const { data: allParts = [] } = useParts();
  const { data: categories = [] } = useCategories();
  const createPOMutation = useCreatePurchaseOrder();
  const createPartMutation = useCreatePartRepo();

  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7); // Default to 7 days from now
    return date.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [items, setItems] = useState<POItem[]>(() => {
    return prefilledPartIds.map((id) => {
      const part = allParts.find((p) => p.id === id);
      const costPrice = part?.costPrice
        ? typeof part.costPrice === "object"
          ? part.costPrice[branchId] || 0
          : part.costPrice
        : 0;
      return {
        part_id: id,
        quantity_ordered: 1,
        unit_price: costPrice,
      };
    });
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState(true);
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(
    new Set(prefilledPartIds)
  );

  const partsMap = useMemo(() => {
    const map = new Map();
    allParts.forEach((p) => map.set(p.id, p));
    return map;
  }, [allParts]);

  // Filter parts: Low stock (< 2) + search + category
  const filteredParts = useMemo(() => {
    let filtered = allParts;

    // Filter by low stock
    if (showLowStockOnly) {
      filtered = filtered.filter((p) => {
        const stock =
          typeof p.stock === "object" ? p.stock[branchId] || 0 : p.stock || 0;
        return stock < 2;
      });
    }

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.barcode?.toLowerCase().includes(term) ||
          p.sku?.toLowerCase().includes(term) ||
          p.category?.toLowerCase().includes(term)
      );
    }

    // Sort by stock (lowest first)
    return filtered.sort((a, b) => {
      const stockA =
        typeof a.stock === "object" ? a.stock[branchId] || 0 : a.stock || 0;
      const stockB =
        typeof b.stock === "object" ? b.stock[branchId] || 0 : b.stock || 0;
      return stockA - stockB;
    });
  }, [allParts, showLowStockOnly, categoryFilter, searchTerm, branchId]);

  const togglePartSelection = (partId: string) => {
    const newSelected = new Set(selectedPartIds);
    if (newSelected.has(partId)) {
      newSelected.delete(partId);
      // Remove from cart
      setItems(items.filter((item) => item.part_id !== partId));
    } else {
      newSelected.add(partId);
      // Add to cart
      const part = partsMap.get(partId);
      const costPrice = part?.costPrice
        ? typeof part.costPrice === "object"
          ? part.costPrice[branchId] || 0
          : part.costPrice
        : 0;
      setItems([
        ...items,
        {
          part_id: partId,
          quantity_ordered: 1,
          unit_price: costPrice,
        },
      ]);
    }
    setSelectedPartIds(newSelected);
  };

  const updateItem = (partId: string, field: keyof POItem, value: number) => {
    setItems(
      items.map((item) =>
        item.part_id === partId ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (partId: string) => {
    setItems(items.filter((item) => item.part_id !== partId));
    const newSelected = new Set(selectedPartIds);
    newSelected.delete(partId);
    setSelectedPartIds(newSelected);
  };

  const handleSubmit = async () => {
    if (!supplierId) {
      showToast.error("Vui lòng chọn nhà cung cấp");
      return;
    }
    if (items.length === 0) {
      showToast.error("Vui lòng thêm ít nhất 1 sản phẩm");
      return;
    }
    if (
      items.some((item) => item.quantity_ordered <= 0 || item.unit_price < 0)
    ) {
      showToast.error("Số lượng và đơn giá phải hợp lệ");
      return;
    }

    const input: CreatePurchaseOrderInput = {
      supplier_id: supplierId,
      branch_id: branchId,
      expected_date: expectedDate || undefined,
      notes: notes || undefined,
      items,
    };

    try {
      await createPOMutation.mutateAsync(input);
      showToast.success("Đã tạo đơn đặt hàng");
      onClose();
      // Reset form
      setSupplierId("");
      setExpectedDate("");
      setNotes("");
      setItems([]);
    } catch (error) {
      console.error("Error creating PO:", error);
      showToast.error("Lỗi khi tạo đơn đặt hàng");
    }
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity_ordered * item.unit_price,
    0
  );

  if (!isOpen) return null;

  console.log("CreatePOModal rendering:", {
    isOpen,
    prefilledPartIds,
    itemsCount: items.length,
    filteredPartsCount: filteredParts.length,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-white" />
            <h2 className="text-base font-semibold text-white">
              Tạo đơn đặt hàng mới
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Body - Split Layout */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Product Selection */}
          <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-700">
            {/* Filters */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
              {/* Search & Create Button */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm theo tên, SKU, mã vạch..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateProduct(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                  title="Tạo sản phẩm mới"
                >
                  <Plus className="w-4 h-4" />
                  Tạo mới
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Category Dropdown */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả danh mục</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setShowLowStockOnly(false)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition ${
                    !showLowStockOnly
                      ? "bg-slate-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>Tất cả</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      !showLowStockOnly
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {allParts.length}
                  </span>
                </button>

                <button
                  onClick={() => setShowLowStockOnly(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition ${
                    showLowStockOnly
                      ? "bg-red-600 text-white"
                      : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100"
                  }`}
                >
                  <span>Sắp hết</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      showLowStockOnly
                        ? "bg-white/20 text-white"
                        : "bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {
                      allParts.filter((p) => {
                        const stock =
                          typeof p.stock === "object"
                            ? p.stock[branchId] || 0
                            : p.stock || 0;
                        return stock < 2;
                      }).length
                    }
                  </span>
                </button>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{filteredParts.length} sản phẩm</span>
                <span>{selectedPartIds.size} đã chọn</span>
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredParts.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    Không tìm thấy sản phẩm
                  </p>
                  {searchTerm && (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Bạn đang tìm:{" "}
                        <span className="font-semibold">"{searchTerm}"</span>
                      </p>
                      <button
                        onClick={() => setShowCreateProduct(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Tạo sản phẩm mới
                      </button>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Hoặc thử tìm kiếm với từ khóa khác
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                filteredParts.map((part) => {
                  const isSelected = selectedPartIds.has(part.id);
                  const stock =
                    typeof part.stock === "object"
                      ? part.stock[branchId] || 0
                      : part.stock || 0;
                  const isLowStock = stock < 2;

                  return (
                    <div
                      key={part.id}
                      onClick={() => togglePartSelection(part.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                                {part.name}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                                SKU: {part.sku || part.barcode || "—"} •{" "}
                                {part.category}
                              </div>
                            </div>

                            {/* Stock Badge */}
                            <div
                              className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                                stock === 0
                                  ? "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300"
                                  : isLowStock
                                  ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300"
                                  : "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300"
                              }`}
                            >
                              Tồn: {stock}
                            </div>
                          </div>

                          <div className="mt-1 flex items-center gap-4 text-sm">
                            <div className="text-slate-600 dark:text-slate-400">
                              Giá nhập:{" "}
                              <span className="font-medium text-blue-600 dark:text-blue-400">
                                {formatCurrency(
                                  typeof part.costPrice === "object"
                                    ? part.costPrice[branchId] || 0
                                    : part.costPrice || 0
                                )}
                              </span>
                            </div>
                            <div className="text-slate-600 dark:text-slate-400">
                              Giá bán:{" "}
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {formatCurrency(
                                  typeof part.retailPrice === "object"
                                    ? part.retailPrice[branchId] || 0
                                    : part.retailPrice || 0
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Shopping Cart */}
          <div className="w-[400px] flex flex-col bg-slate-50 dark:bg-slate-900">
            {/* Cart Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Giỏ hàng
                </h3>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                  {items.length} sản phẩm
                </span>
              </div>

              {/* Supplier & Date */}
              <div className="space-y-2">
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn nhà cung cấp --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  placeholder="Dự kiến giao hàng"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {items.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Chưa có sản phẩm nào
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Chọn sản phẩm bên trái
                  </p>
                </div>
              ) : (
                items.map((item) => {
                  const part = partsMap.get(item.part_id);
                  if (!part) return null;
                  const itemTotal = item.quantity_ordered * item.unit_price;

                  return (
                    <div
                      key={item.part_id}
                      className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      {/* Product Name & Remove */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
                            {part.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-500">
                            {part.sku || part.barcode}
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(item.part_id)}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>

                      {/* Quantity & Price */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                            Số lượng
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity_ordered}
                            onChange={(e) =>
                              updateItem(
                                item.part_id,
                                "quantity_ordered",
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-full px-2 py-1.5 text-sm text-right border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                            Đơn giá
                          </label>
                          <FormattedNumberInput
                            value={item.unit_price}
                            onValue={(val: number) =>
                              updateItem(item.part_id, "unit_price", val)
                            }
                            className="w-full px-2 py-1.5 text-sm text-right border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Total */}
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-right">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Thành tiền:{" "}
                        </span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {formatCurrency(itemTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Cart Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              {/* Notes */}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Ghi chú đơn hàng..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 mb-3"
              />

              {/* Total */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  Tổng cộng:
                </span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(totalAmount)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={createPOMutation.isPending || items.length === 0}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {createPOMutation.isPending ? "Đang tạo..." : "Tạo đơn"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Create Product Modal */}
        {showCreateProduct && (
          <CreateProductModal
            onClose={() => setShowCreateProduct(false)}
            onCreated={(newPart) => {
              setShowCreateProduct(false);
              // Auto-select the newly created product
              const costPrice =
                typeof newPart.costPrice === "object"
                  ? newPart.costPrice[branchId] || 0
                  : newPart.costPrice || 0;
              setSelectedPartIds(new Set([...selectedPartIds, newPart.id]));
              setItems([
                ...items,
                {
                  part_id: newPart.id,
                  quantity_ordered: 1,
                  unit_price: costPrice,
                },
              ]);
              showToast.success("Đã tạo và thêm sản phẩm vào đơn hàng");
            }}
          />
        )}
      </div>
    </div>
  );
};

// Create Product Modal Component
interface CreateProductModalProps {
  onClose: () => void;
  onCreated: (part: Part) => void;
}

const CreateProductModal: React.FC<CreateProductModalProps> = ({
  onClose,
  onCreated,
}) => {
  const { currentBranchId } = useAppContext();
  const branchId = currentBranchId || "";
  const { data: categories = [] } = useCategories();
  const createPartMutation = useCreatePartRepo();

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    category: "",
    costPrice: 0,
    retailPrice: 0,
    wholesalePrice: 0,
    stock: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast.warning("Vui lòng nhập tên sản phẩm");
      return;
    }

    try {
      const newPart = await createPartMutation.mutateAsync({
        name: formData.name.trim(),
        sku: formData.sku.trim() || `SP-${Date.now()}`,
        barcode: formData.barcode.trim(),
        category: formData.category,
        stock: { [branchId]: formData.stock },
        retailPrice: { [branchId]: formData.retailPrice },
        wholesalePrice: { [branchId]: formData.wholesalePrice },
        costPrice: { [branchId]: formData.costPrice },
      });

      showToast.success("Tạo sản phẩm thành công");
      onCreated(newPart);
    } catch (error) {
      console.error("Error creating part:", error);
      showToast.error("Lỗi khi tạo sản phẩm");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-green-600 to-green-700">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-white" />
            <h2 className="text-base font-semibold text-white">
              Tạo sản phẩm mới
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tên sản phẩm <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500"
                placeholder="Nhập tên sản phẩm"
                autoFocus
              />
            </div>

            {/* SKU & Barcode */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mã SKU
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500"
                  placeholder="Tự động nếu để trống"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mã vạch
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) =>
                    setFormData({ ...formData, barcode: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500"
                  placeholder="Mã vạch sản phẩm"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Danh mục
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500"
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Giá nhập
                </label>
                <FormattedNumberInput
                  value={formData.costPrice}
                  onChange={(value) =>
                    setFormData({ ...formData, costPrice: value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Giá bán lẻ
                </label>
                <FormattedNumberInput
                  value={formData.retailPrice}
                  onChange={(value) =>
                    setFormData({ ...formData, retailPrice: value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Giá bán sỉ
                </label>
                <FormattedNumberInput
                  value={formData.wholesalePrice}
                  onChange={(value) =>
                    setFormData({ ...formData, wholesalePrice: value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Stock */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tồn kho ban đầu
              </label>
              <FormattedNumberInput
                value={formData.stock}
                onChange={(value) => setFormData({ ...formData, stock: value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={createPartMutation.isPending}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createPartMutation.isPending ? "Đang tạo..." : "Tạo sản phẩm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePOModal;
