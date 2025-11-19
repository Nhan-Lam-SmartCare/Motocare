import React, { useState } from "react";
import { formatCurrency } from "../../utils/format";
import { SupplierSelectionModal } from "./SupplierSelectionModal";
import { useSuppliers } from "../../hooks/useSuppliers";

interface Part {
  id: string;
  name: string;
  sku: string;
  stock: { [branchId: string]: number };
  costPrice?: { [branchId: string]: number };
  retailPrice: { [branchId: string]: number };
  wholesalePrice?: { [branchId: string]: number };
  category?: string;
}

interface ReceiptItem {
  partId: string;
  partName: string;
  sku: string;
  quantity: number;
  importPrice: number;
  sellingPrice: number;
  wholesalePrice: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  receiptItems: ReceiptItem[];
  setReceiptItems: React.Dispatch<React.SetStateAction<ReceiptItem[]>>;
  selectedSupplier: string;
  setSelectedSupplier: (id: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSave: () => void;
  discount: number;
  setDiscount: (val: number) => void;
  discountType: "amount" | "percent";
  setDiscountType: (type: "amount" | "percent") => void;
  paymentMethod: "cash" | "bank";
  setPaymentMethod: (method: "cash" | "bank") => void;
  paymentType: "full" | "partial" | "note";
  setPaymentType: (type: "full" | "partial" | "note") => void;
  partialAmount: number;
  setPartialAmount: (val: number) => void;
  showAddProductModal: boolean;
  setShowAddProductModal: (show: boolean) => void;
  onAddNewProduct: (productData: any) => void;
  currentBranchId: string;
}

export const GoodsReceiptMobileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  parts,
  receiptItems,
  setReceiptItems,
  selectedSupplier,
  setSelectedSupplier,
  searchTerm,
  setSearchTerm,
  onSave,
  discount,
  setDiscount,
  discountType,
  setDiscountType,
  paymentMethod,
  setPaymentMethod,
  paymentType,
  setPaymentType,
  partialAmount,
  setPartialAmount,
  showAddProductModal,
  setShowAddProductModal,
  onAddNewProduct,
  currentBranchId,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const { data: suppliers = [] } = useSuppliers();

  if (!isOpen) return null;

  console.log(
    "🔍 GoodsReceiptMobileModal - parts:",
    parts?.length || 0,
    parts?.slice(0, 2)
  );
  console.log("🔍 searchTerm:", searchTerm);

  const filteredParts =
    parts?.filter((part) => {
      if (!searchTerm || searchTerm.trim() === "") return true; // Show all if no search
      const term = searchTerm.toLowerCase().trim();
      return (
        part.name?.toLowerCase().includes(term) ||
        part.sku?.toLowerCase().includes(term)
      );
    }) || [];

  console.log("🔍 filteredParts:", filteredParts?.length || 0);

  const addToReceipt = (part: Part) => {
    const existing = receiptItems.find((item) => item.partId === part.id);
    if (existing) {
      setReceiptItems((items) =>
        items.map((item) =>
          item.partId === part.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setReceiptItems((items) => [
        ...items,
        {
          partId: part.id,
          partName: part.name,
          sku: part.sku,
          quantity: 1,
          importPrice: part.costPrice?.[currentBranchId] || 0,
          sellingPrice: part.retailPrice?.[currentBranchId] || 0,
          wholesalePrice: part.wholesalePrice?.[currentBranchId] || 0,
        },
      ]);
    }
  };

  const removeFromReceipt = (index: number) => {
    setReceiptItems((items) => items.filter((_, i) => i !== index));
  };

  const subtotal = receiptItems.reduce(
    (sum, item) => sum + item.quantity * item.importPrice,
    0
  );

  const discountAmount =
    discountType === "percent"
      ? Math.round((subtotal * discount) / 100)
      : discount;

  const totalAmount = Math.max(0, subtotal - discountAmount);

  const handleContinue = () => {
    if (!selectedSupplier) {
      alert("Vui lòng chọn nhà cung cấp");
      return;
    }
    setStep(2);
  };

  const handleSaveDraft = () => {
    alert("Chức năng lưu nháp đang phát triển");
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center sm:hidden">
        <div className="bg-white dark:bg-slate-800 w-full h-[95vh] rounded-t-3xl overflow-hidden flex flex-col">
          {step === 1 ? (
            /* ===== BƯỚC 1: CHỌN HÀNG ===== */
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="text-white text-2xl leading-none"
                  >
                    ×
                  </button>
                  <h2 className="text-lg font-bold text-white">
                    Tạo phiếu nhập kho
                  </h2>
                </div>
              </div>

              {/* Supplier Selection Card */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <div
                  onClick={() => setShowSupplierModal(true)}
                  className={`p-4 rounded-xl border-2 cursor-pointer active:scale-98 transition-transform ${
                    selectedSupplier
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {selectedSupplier ? (
                        <>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                            NHÀ CUNG CẤP
                          </div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {suppliers.find(
                              (s: any) => s.id === selectedSupplier
                            )?.name || ""}
                          </div>
                          {suppliers.find((s: any) => s.id === selectedSupplier)
                            ?.phone && (
                            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              {
                                suppliers.find(
                                  (s: any) => s.id === selectedSupplier
                                )?.phone
                              }
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">👤</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            Chọn nhà cung cấp
                          </span>
                        </div>
                      )}
                    </div>
                    <svg
                      className="w-5 h-5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Sticky Search Bar */}
              <div className="p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 flex-shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm sản phẩm theo tên, SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pl-10 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
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
                </div>
              </div>

              {/* Product List */}
              <div className="flex-1 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-900">
                {!parts || parts.length === 0 ? (
                  <div className="text-center text-slate-500 py-12">
                    <div className="text-5xl mb-3">⏳</div>
                    <div>Đang tải danh sách sản phẩm...</div>
                  </div>
                ) : filteredParts.length === 0 ? (
                  <div className="text-center text-slate-500 py-12">
                    <div className="text-5xl mb-3">📦</div>
                    <div>Không tìm thấy sản phẩm</div>
                    {searchTerm && (
                      <div className="text-sm mt-2">
                        Tìm kiếm: "{searchTerm}"
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredParts.map((part) => {
                      const inCart = receiptItems.find(
                        (item) => item.partId === part.id
                      );
                      return (
                        <div
                          key={part.id}
                          className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight mb-1">
                                {part.name}
                              </div>
                              <div className="text-sm text-slate-500 dark:text-slate-400">
                                SKU: {part.sku}
                              </div>
                              <div className="mt-2 flex gap-3 text-xs">
                                <div>
                                  <span className="text-slate-500 dark:text-slate-400">
                                    Nhập:{" "}
                                  </span>
                                  <span className="font-medium text-orange-600 dark:text-orange-400">
                                    {formatCurrency(
                                      part.costPrice?.[currentBranchId] || 0
                                    )}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 dark:text-slate-400">
                                    Bán:{" "}
                                  </span>
                                  <span className="font-medium text-green-600 dark:text-green-400">
                                    {formatCurrency(
                                      part.retailPrice?.[currentBranchId] || 0
                                    )}
                                  </span>
                                </div>
                              </div>
                              {inCart && (
                                <div className="mt-2 text-sm">
                                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                                    Đã thêm: {inCart.quantity} ×{" "}
                                    {formatCurrency(inCart.importPrice)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => addToReceipt(part)}
                              className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl leading-none active:scale-95 transition-transform"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add New Product Button */}
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="w-full mt-3 py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-2xl">+</span>
                  <span className="font-medium">Tạo sản phẩm mới</span>
                </button>
              </div>

              {/* Floating Cart Footer */}
              {receiptItems.length > 0 && (
                <div className="flex-shrink-0 bg-gradient-to-t from-white via-white dark:from-slate-800 dark:via-slate-800 to-transparent pt-6 pb-safe pb-4 px-3">
                  <button
                    onClick={handleContinue}
                    className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-between px-6 shadow-lg transition-transform"
                  >
                    <div className="flex items-center gap-2">
                      <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center font-bold">
                        {receiptItems.reduce(
                          (sum, item) => sum + item.quantity,
                          0
                        )}
                      </div>
                      <span>Tiếp tục</span>
                    </div>
                    <span className="font-bold">
                      {formatCurrency(subtotal)}
                    </span>
                  </button>
                </div>
              )}
            </>
          ) : (
            /* ===== BƯỚC 2: THANH TOÁN ===== */
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="text-white text-xl leading-none"
                  >
                    ←
                  </button>
                  <h2 className="text-lg font-bold text-white">
                    Xác nhận nhập kho
                  </h2>
                </div>
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                <div className="p-3 space-y-2">
                  {receiptItems.map((item, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                            {item.partName}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            SKU: {item.sku}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromReceipt(index)}
                          className="text-red-500 hover:text-red-600 text-xl"
                        >
                          ×
                        </button>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (item.quantity > 1) {
                                const updated = [...receiptItems];
                                updated[index].quantity -= 1;
                                setReceiptItems(updated);
                              }
                            }}
                            className="w-8 h-8 rounded-lg border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold active:scale-95 transition-transform"
                          >
                            −
                          </button>
                          <div className="w-12 text-center font-bold text-lg text-slate-900 dark:text-slate-100">
                            {item.quantity}
                          </div>
                          <button
                            onClick={() => {
                              const updated = [...receiptItems];
                              updated[index].quantity += 1;
                              setReceiptItems(updated);
                            }}
                            className="w-8 h-8 rounded-lg border-2 border-blue-500 flex items-center justify-center text-blue-600 font-bold active:scale-95 transition-transform"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {formatCurrency(item.importPrice)} / cái
                          </div>
                          <div className="font-bold text-orange-600 dark:text-orange-400">
                            {formatCurrency(item.quantity * item.importPrice)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals Section */}
                <div className="p-3">
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                    {/* Subtotal */}
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span>Tổng tiền hàng</span>
                      <span className="font-medium">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>

                    {/* Discount */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700 dark:text-slate-300">
                        Giảm giá
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={discount}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          placeholder="0"
                          className="w-24 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        />
                        <select
                          value={discountType}
                          onChange={(e) =>
                            setDiscountType(
                              e.target.value as "amount" | "percent"
                            )
                          }
                          className="px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
                        >
                          <option value="amount">₫</option>
                          <option value="percent">%</option>
                        </select>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center pt-3 border-t-2 border-slate-200 dark:border-slate-700">
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        CẦN THANH TOÁN
                      </span>
                      <span className="text-xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Method Chips */}
                <div className="p-3">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Phương thức thanh toán
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaymentMethod("cash")}
                      className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                        paymentMethod === "cash"
                          ? "bg-green-600 text-white shadow-lg"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      💵 Tiền mặt
                    </button>
                    <button
                      onClick={() => setPaymentMethod("bank")}
                      className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                        paymentMethod === "bank"
                          ? "bg-blue-600 text-white shadow-lg"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      🏦 Chuyển khoản
                    </button>
                  </div>
                </div>

                {/* Payment Type Tabs */}
                <div className="p-3">
                  <div className="bg-slate-200 dark:bg-slate-700 rounded-xl p-1 flex gap-1">
                    <button
                      onClick={() => {
                        setPaymentType("full");
                        setPartialAmount(0);
                      }}
                      className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                        paymentType === "full"
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Đủ
                    </button>
                    <button
                      onClick={() => setPaymentType("partial")}
                      className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                        paymentType === "partial"
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      1 Phần
                    </button>
                    <button
                      onClick={() => {
                        setPaymentType("note");
                        setPartialAmount(0);
                      }}
                      className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                        paymentType === "note"
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Nợ
                    </button>
                  </div>
                </div>

                {/* Partial Payment Input */}
                {paymentType === "partial" && (
                  <div className="p-3">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-300 dark:border-slate-600">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Tiền trả NCC
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={partialAmount}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (value <= totalAmount) {
                            setPartialAmount(value);
                          } else {
                            alert("Số tiền trả không được vượt quá tổng tiền");
                          }
                        }}
                        placeholder="Nhập số tiền"
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-right text-lg font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                      <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                        Còn nợ: {formatCurrency(totalAmount - partialAmount)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Debt Info */}
                {paymentType === "note" && (
                  <div className="p-3">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                      <div className="text-sm text-red-700 dark:text-red-400 mb-1">
                        Số tiền nợ
                      </div>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(totalAmount)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 space-y-2 flex-shrink-0">
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDraft}
                    className="flex-1 py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium active:scale-98 transition-transform"
                  >
                    💾 Lưu Nháp
                  </button>
                  <button
                    onClick={onSave}
                    disabled={!selectedSupplier || receiptItems.length === 0}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-xl font-bold active:scale-98 transition-transform disabled:cursor-not-allowed"
                  >
                    ✅ NHẬP KHO
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Supplier Selection Modal */}
      <SupplierSelectionModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        selectedSupplierId={selectedSupplier}
        onSelectSupplier={setSelectedSupplier}
      />
    </>
  );
};
