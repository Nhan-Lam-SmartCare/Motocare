import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { canDo } from '../../../utils/permissions';
import { useSuppliers } from '../../../hooks/useSuppliers';
import { useCreatePartRepo } from '../../../hooks/usePartsRepository';
import { useStoreSettings } from '../../../hooks/useStoreSettings';
import { showToast } from '../../../utils/toast';
import { formatCurrency } from '../../../utils/format';
import { getCategoryColor } from '../../../utils/categoryColors';
import { validatePriceAndQty } from '../../../utils/validation';
import FormattedNumberInput from '../../common/FormattedNumberInput';
import BarcodeScannerModal from '../../common/BarcodeScannerModal';
import SupplierModal from '../../inventory/components/SupplierModal';
import AddProductModal from './AddProductModal';
import type { Part } from '../../../types';
import { Banknote, CreditCard, Save } from 'lucide-react';

// Goods Receipt Modal Component (Ảnh 2)
const GoodsReceiptModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  currentBranchId: string;
  onSave: (
    items: Array<{
      partId: string;
      partName: string;
      quantity: number;
      importPrice: number;
      sellingPrice: number;
      wholesalePrice?: number;
    }>,
    supplierId: string,
    totalAmount: number,
    note: string,
    paymentInfo?: {
      paymentMethod: "cash" | "bank";
      paymentType: "full" | "partial" | "note";
      paidAmount: number;
    }
  ) => void;
}> = ({ isOpen, onClose, parts, currentBranchId, onSave }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showBarcodeInput, setShowBarcodeInput] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const { data: suppliers = [] } = useSuppliers();
  const { data: storeSettings } = useStoreSettings();
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const createPartMutation = useCreatePartRepo();
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Get markup percentages from settings (with fallbacks)
  const retailMarkup = (storeSettings?.retail_markup_percent ?? 40) / 100 + 1; // VD: 40% => 1.4
  const wholesaleMarkup = (storeSettings?.wholesale_markup_percent ?? 25) / 100 + 1; // VD: 25% => 1.25

  const [receiptItems, setReceiptItems] = useState<
    Array<{
      partId: string;
      partName: string;
      sku: string;
      quantity: number;
      importPrice: number;
      sellingPrice: number;
      wholesalePrice: number;
    }>
  >([]);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank" | null>(
    null
  );
  const [paymentType, setPaymentType] = useState<
    "full" | "partial" | "note" | null
  >(null);
  const [partialAmount, setPartialAmount] = useState(0);

  // Auto-save key cho localStorage
  const DRAFT_KEY = `goods_receipt_draft_${currentBranchId}`;

  // Khôi phục dữ liệu từ localStorage khi mở modal
  useEffect(() => {
    if (isOpen) {
      // ✅ Wrap trong setTimeout để không block UI render ban đầu
      setTimeout(() => {
        try {
          const savedDraft = localStorage.getItem(DRAFT_KEY);
          if (savedDraft) {
            const draft = JSON.parse(savedDraft);
            // Kiểm tra draft không quá 24h
            if (
              draft.timestamp &&
              Date.now() - draft.timestamp < 24 * 60 * 60 * 1000
            ) {
              if (draft.receiptItems?.length > 0 || draft.selectedSupplier) {
                const shouldRestore = window.confirm(
                  `Phát hiện phiếu nhập chưa hoàn tất (${draft.receiptItems?.length || 0
                  } sản phẩm).\n\nBạn có muốn khôi phục không?`
                );
                if (shouldRestore) {
                  setReceiptItems(draft.receiptItems || []);
                  setSelectedSupplier(draft.selectedSupplier || "");
                  showToast.success("Đã khôi phục phiếu nhập từ bản nháp");
                } else {
                  localStorage.removeItem(DRAFT_KEY);
                }
              }
            } else {
              // Draft quá cũ, xóa đi
              localStorage.removeItem(DRAFT_KEY);
            }
          }
        } catch (e) {
          console.error("Lỗi khôi phục draft:", e);
        }
      }, 100); // Delay 100ms để modal render trước
    }
  }, [isOpen, DRAFT_KEY]);

  // Auto-save vào localStorage mỗi khi có thay đổi
  useEffect(() => {
    if (isOpen && (receiptItems.length > 0 || selectedSupplier)) {
      const draft = {
        receiptItems,
        selectedSupplier,
        timestamp: Date.now(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  }, [
    isOpen,
    receiptItems,
    selectedSupplier,
    DRAFT_KEY,
  ]);

  // Xóa draft khi hoàn tất phiếu nhập thành công
  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
  };

  const filteredParts = useMemo(() => {
    if (!parts || parts.length === 0) {
      return [];
    }

    if (!searchTerm || searchTerm.trim() === "") {
      // ✅ Không có search term: Limit 100 sản phẩm đầu để tránh render lag
      return parts.slice(0, 100);
    }

    const q = searchTerm.toLowerCase().trim();
    const filtered = parts.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    );
    // ✅ Có search: giới hạn 50 kết quả
    return filtered.slice(0, 50);
  }, [parts, searchTerm]);

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
      // Không hiện toast khi tăng số lượng để tránh spam
    } else {
      setReceiptItems([
        ...receiptItems,
        {
          partId: part.id,
          partName: part.name,
          sku: part.sku,
          quantity: 1,
          importPrice: part.costPrice?.[currentBranchId] || 0,
          sellingPrice: part.retailPrice[currentBranchId] || 0,
          wholesalePrice: part.wholesalePrice?.[currentBranchId] || 0,
        },
      ]);
      showToast.success(`Đã thêm ${part.name} vào phiếu nhập`);
    }
    setSearchTerm("");
    // Auto focus back to barcode input
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  };

  // Handle barcode scan
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const barcode = barcodeInput.trim();
    // Normalize: loại bỏ ký tự đặc biệt để so sánh
    const normalizeCode = (code: string): string =>
      code.toLowerCase().replace(/[-\s./\\]/g, "");
    const normalizedBarcode = normalizeCode(barcode);

    // Tìm part với logic ưu tiên: barcode > SKU > tên
    const foundPart = parts.find(
      (p) =>
        // 1. Khớp barcode (field mới)
        normalizeCode(p.barcode || "") === normalizedBarcode ||
        p.barcode?.toLowerCase() === barcode.toLowerCase() ||
        // 2. Khớp SKU
        normalizeCode(p.sku || "") === normalizedBarcode ||
        p.sku?.toLowerCase() === barcode.toLowerCase() ||
        // 3. Tìm trong tên
        p.name?.toLowerCase().includes(barcode.toLowerCase())
    );

    if (foundPart) {
      addToReceipt(foundPart);
      setBarcodeInput("");
    } else {
      showToast.error(`Không tìm thấy sản phẩm có mã: ${barcode}`);
      setBarcodeInput("");
    }
  };

  // Handle camera barcode scan - Modal tự đóng sau khi quét
  const handleCameraScan = (barcode: string) => {
    const normalizeCode = (code: string): string =>
      code.toLowerCase().replace(/[-\s./\\]/g, "");
    const normalizedBarcode = normalizeCode(barcode);

    const foundPart = parts.find(
      (p) =>
        normalizeCode(p.barcode || "") === normalizedBarcode ||
        p.barcode?.toLowerCase() === barcode.toLowerCase() ||
        normalizeCode(p.sku || "") === normalizedBarcode ||
        p.sku?.toLowerCase() === barcode.toLowerCase()
    );

    // KHÔNG cần đóng scanner - BarcodeScannerModal tự đóng

    if (foundPart) {
      // Kiểm tra đã có trong phiếu chưa
      const existingItem = receiptItems.find(
        (item) => item.partId === foundPart.id
      );
      if (existingItem) {
        // Chỉ tăng số lượng, KHÔNG hiện toast để tránh spam
        setReceiptItems((items) =>
          items.map((item) =>
            item.partId === foundPart.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      } else {
        // Thêm mới - chỉ hiện 1 toast
        setReceiptItems((items) => [
          ...items,
          {
            partId: foundPart.id,
            partName: foundPart.name,
            sku: foundPart.sku,
            quantity: 1,
            importPrice: foundPart.costPrice?.[currentBranchId] || 0,
            sellingPrice: foundPart.retailPrice[currentBranchId] || 0,
            wholesalePrice: foundPart.wholesalePrice?.[currentBranchId] || 0,
          },
        ]);
        showToast.success(`Đã thêm ${foundPart.name}`);
      }
      setSearchTerm("");
    } else {
      showToast.error(`Không tìm thấy: ${barcode}`);
    }
  };

  // Auto focus barcode input when showBarcodeInput is enabled
  useEffect(() => {
    if (showBarcodeInput) {
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    }
  }, [showBarcodeInput]);

  const updateReceiptItem = (
    partId: string,
    field: "quantity" | "importPrice" | "sellingPrice" | "wholesalePrice",
    value: number
  ) => {
    setReceiptItems((items) =>
      items.map((item) => {
        if (item.partId !== partId) return item;
        const newItem = { ...item, [field]: value };
        if (field === "importPrice") {
          const prevAutoRetail = Math.round((item.importPrice || 0) * retailMarkup);
          const prevAutoWholesale = Math.round(
            (item.importPrice || 0) * wholesaleMarkup
          );
          const nextAutoRetail = Math.round(value * retailMarkup);
          const nextAutoWholesale = Math.round(value * wholesaleMarkup);

          if (item.sellingPrice === 0 || item.sellingPrice === prevAutoRetail) {
            newItem.sellingPrice = nextAutoRetail;
          }
          if (
            item.wholesalePrice === 0 ||
            item.wholesalePrice === prevAutoWholesale
          ) {
            newItem.wholesalePrice = nextAutoWholesale;
          }
        }
        return newItem;
      })
    );
  };

  const removeReceiptItem = (partId: string) => {
    setReceiptItems((items) => items.filter((item) => item.partId !== partId));
  };

  const subtotal = useMemo(() => {
    return receiptItems.reduce(
      (sum, item) => sum + item.importPrice * item.quantity,
      0
    );
  }, [receiptItems]);

  const totalAmount = useMemo(() => subtotal, [subtotal]);

  const { profile } = useAuth();
  const handleSave = () => {
    if (!canDo(profile?.role, "part.update_price")) {
      showToast.error("Bạn không có quyền cập nhật giá");
      return;
    }
    if (receiptItems.length === 0) {
      showToast.warning("Vui lòng chọn sản phẩm nhập kho");
      return;
    }
    if (!selectedSupplier) {
      showToast.warning("Vui lòng chọn nhà cung cấp");
      return;
    }

    // Calculate paidAmount based on paymentType
    // Default to "full" if paymentType is null (user selected payment method but didn't explicitly click payment type)
    const effectivePaymentType = paymentType || "full";

    if (effectivePaymentType === "partial") {
      if (!partialAmount || partialAmount <= 0) {
        showToast.warning("Vui lòng nhập số tiền trả trước");
        return;
      }
      if (partialAmount > totalAmount) {
        showToast.warning(
          `Số tiền trả trước không được vượt quá tổng tiền (${formatCurrency(
            totalAmount
          )})`
        );
        return;
      }
    }

    const calculatedPaidAmount =
      effectivePaymentType === "full"
        ? totalAmount
        : effectivePaymentType === "partial"
          ? partialAmount
          : 0;

    // BUG 16 fix: warn (non-blocking) if any item has sellingPrice < importPrice (selling below cost)
    const belowCostItems = receiptItems.filter(
      (item) => item.sellingPrice > 0 && item.sellingPrice < item.importPrice
    );
    if (belowCostItems.length > 0) {
      const names = belowCostItems.map((it) => it.partName).join(", ");
      showToast.warning(`Cảnh báo: Giá bán thấp hơn giá nhập cho: ${names}`);
      // Non-blocking: save continues but staff is notified
    }

    onSave(receiptItems, selectedSupplier, totalAmount, "", {
      paymentMethod: paymentMethod || "cash",
      paymentType: effectivePaymentType,
      paidAmount: calculatedPaidAmount,
    });
    clearDraft(); // Xóa draft sau khi hoàn tất
    setReceiptItems([]);
    setSelectedSupplier("");
    setSearchTerm("");
  };

  const handleAddNewProduct = (productData: any) => {
    // Tạo sản phẩm mới với stock = 0, stock sẽ được cập nhật khi hoàn tất phiếu nhập
    (async () => {
      try {
        // Nếu người dùng nhập mã (Honda/Yamaha) thì dùng, không thì tự sinh PT-xxx
        const productSku = productData.barcode?.trim() || `PT-${Date.now()}`;
        const createRes = await createPartMutation.mutateAsync({
          name: productData.name,
          sku: productSku,
          barcode: productData.barcode?.trim() || "", // Lưu lại để tìm kiếm
          category: productData.category,
          description: productData.description,
          stock: { [currentBranchId]: 0 }, // Stock = 0, sẽ cập nhật khi hoàn tất phiếu nhập
          costPrice: { [currentBranchId]: productData.importPrice },
          retailPrice: { [currentBranchId]: productData.retailPrice },
          wholesalePrice: {
            [currentBranchId]: productData.wholesalePrice || Math.round(productData.importPrice * wholesaleMarkup),
          },
        });

        // Xử lý response - có thể là { ok, data } hoặc trực tiếp Part object
        const partData = (createRes as any)?.data || createRes;
        const partId =
          partData?.id ||
          `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const partSku = partData?.sku || productSku;

        // Add to receipt items from persisted part
        setReceiptItems((prev) => [
          ...prev,
          {
            partId: partId,
            partName: productData.name,
            sku: partSku,
            quantity: productData.quantity,
            importPrice: productData.importPrice,
            sellingPrice: productData.retailPrice,
            wholesalePrice: productData.wholesalePrice || 0,
          },
        ]);
        showToast.success("Đã tạo phụ tùng mới và thêm vào phiếu nhập");
      } catch (e: any) {
        showToast.error(e?.message || "Lỗi tạo phụ tùng mới");
      } finally {
        setShowAddProductModal(false);
      }
    })();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-[#0D121F] to-[#080B12] border border-slate-800/80 w-full max-w-7xl h-[92vh] rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] overflow-hidden flex animate-in zoom-in-95 duration-200">
          {/* Left Panel - Product Browser (50%) */}
          <div className="w-1/2 flex flex-col bg-[#0F1424]/40 backdrop-blur-xl border-r border-slate-800/80">
            {/* Modern Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800/60 bg-[#13192B]/50">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="w-9 h-9 flex items-center justify-center bg-[#0B0F19]/80 border border-slate-800 hover:border-slate-700 hover:text-white rounded-xl text-slate-400 transition-all hover:scale-105 active:scale-95"
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
                      strokeWidth={2.5}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-100">
                    Danh mục sản phẩm
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                    Chọn để thêm vào giỏ hàng
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddProductModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
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
                    strokeWidth={2.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>Thêm mới</span>
              </button>
            </div>

            {/* Search Bar with Icon */}
            <div className="p-4 bg-[#13192B]/30 space-y-3">
              {/* Barcode Scanner Input - Toggle visibility */}
              {showBarcodeInput && (
                <form onSubmit={handleBarcodeSubmit} className="animate-in slide-in-from-top-2 duration-150">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <svg
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                        />
                      </svg>
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        placeholder="Quét mã vạch hoặc nhập SKU..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        className="w-full pl-11 pr-9 py-3 border border-blue-500/40 rounded-2xl bg-[#0B0F19]/60 text-white text-sm font-mono placeholder:text-blue-500/40 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all outline-none"
                      />
                      {barcodeInput && (
                        <button
                          type="button"
                          onClick={() => setBarcodeInput("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBarcodeInput(false);
                        setBarcodeInput("");
                      }}
                      className="px-3.5 rounded-2xl border border-slate-800 bg-[#0B0F19]/80 text-slate-400 hover:text-white hover:border-slate-700 transition-all active:scale-95"
                      title="Đóng"
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
                          strokeWidth={2.5}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </form>
              )}

              {/* Manual Search with barcode toggle */}
              <div className="flex gap-2.5">
                <div className="relative flex-1">
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
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
                    placeholder="Tìm kiếm thủ công tên hoặc mã phụ tùng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-slate-800/80 rounded-2xl bg-[#0B0F19]/60 text-white text-sm placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/10 focus:border-slate-700/80 transition-all outline-none"
                  />
                </div>

                {/* Barcode Toggle Button */}
                {!showBarcodeInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowBarcodeInput(true);
                      setTimeout(() => barcodeInputRef.current?.focus(), 100);
                    }}
                    className="px-4 rounded-2xl border border-blue-500/30 text-blue-400 bg-blue-500/5 font-semibold text-sm flex items-center gap-2 transition-all hover:bg-blue-500/10 active:scale-95"
                    title="Quét mã vạch"
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
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                      />
                    </svg>
                  </button>
                )}

                {/* Camera Scanner Button */}
                <button
                  type="button"
                  onClick={() => setShowCameraScanner(true)}
                  className="px-4 rounded-2xl border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 font-semibold text-sm flex items-center gap-2 transition-all hover:bg-emerald-500/10 active:scale-95"
                  title="Quét bằng camera"
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
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {filteredParts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <svg
                    className="w-14 h-14 mb-3 opacity-20 animate-pulse text-blue-500"
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
                  <p className="text-sm font-bold text-slate-400">Không tìm thấy sản phẩm</p>
                  <p className="text-xs text-slate-600 mt-1">Thử tìm kiếm với mã hoặc tên khác</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Hint nếu danh sách bị giới hạn */}
                  {!searchTerm && parts.length > 100 && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-2.5 text-[11px] text-amber-400 mb-2">
                      💡 Đang hiển thị 100 sản phẩm đầu tiên. Quét mã hoặc gõ để tìm cụ thể hơn.
                    </div>
                  )}
                  {searchTerm && filteredParts.length >= 50 && (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-2.5 text-[11px] text-blue-400 mb-2">
                      ℹ️ Giới hạn 50 kết quả đầu tiên. Hãy gõ cụ thể hơn nếu chưa tìm thấy sản phẩm.
                    </div>
                  )}
                  {filteredParts.map((part) => {
                    const stock = part.stock?.[currentBranchId] || 0;
                    const isInCart = receiptItems.some(item => item.partId === part.id);
                    return (
                      <div
                        key={part.id}
                        onClick={() => addToReceipt(part)}
                        className={`group flex items-center gap-3.5 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 border bg-[#131926]/40 ${isInCart
                          ? 'border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.06)] border-l-4 border-l-emerald-500'
                          : 'border-slate-800/80 hover:border-slate-700/80 hover:bg-[#1E293B]/30 hover:scale-[1.01]'
                          }`}
                      >
                        {/* Selected check indicator */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isInCart
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-[#0B0F19]/80 text-slate-500 border border-slate-800 group-hover:text-blue-400 group-hover:border-blue-500/30'
                          }`}>
                          {isInCart ? (
                            <svg className="w-4 h-4 animate-in zoom-in-50 duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-100 group-hover:text-blue-400 transition-colors truncate">
                              {part.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[9px] font-black font-mono text-slate-400 bg-[#0B0F19]/80 px-2 py-0.5 rounded border border-slate-800/60 tracking-wider">
                              {part.sku}
                            </span>
                            {part.category && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${getCategoryColor(part.category).bg} ${getCategoryColor(part.category).text} border border-blue-500/10`}>
                                {part.category}
                              </span>
                            )}
                            <span className={`text-[9px] font-bold ${stock > 0 ? 'text-slate-300' : 'text-slate-500'}`}>
                              Tồn: <span className="font-mono">{stock}</span>
                            </span>
                          </div>
                        </div>

                        {/* Prices */}
                        <div className="flex flex-col items-end flex-shrink-0 gap-1 select-none text-right">
                          <span className="text-[10px] font-bold text-slate-400">
                            Nhập: <span className="font-mono font-black text-slate-300">{formatCurrency(part.costPrice?.[currentBranchId] || 0)}</span>
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            Bán: <span className="font-mono font-black text-blue-400">{formatCurrency(part.retailPrice?.[currentBranchId] || 0)}</span>
                          </span>
                        </div>

                        {/* Arrow */}
                        <svg
                          className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-colors flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Cart & Checkout (50%) */}
          <div className="w-1/2 bg-[#0B0F19]/80 backdrop-blur-xl flex flex-col">
            {/* Supplier Selection - Modern */}
            <div className="p-4 border-b border-slate-800/60 bg-gradient-to-r from-emerald-950/10 to-transparent">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-4 h-4 text-emerald-400"
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
                <label className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Nhà cung cấp hàng hóa
                </label>
                <button
                  onClick={() => {
                    setShowSupplierModal(true);
                  }}
                  className="ml-auto flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 font-black uppercase tracking-wider transition-all duration-200 active:scale-95"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>Thêm NCC</span>
                </button>
              </div>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-[#13192B]/80 text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 outline-none cursor-pointer"
              >
                <option value="" className="bg-[#0D121F]">Chọn nhà cung cấp...</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id} className="bg-[#0D121F]">
                    {s.name} {s.phone ? `• ${s.phone}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Giỏ hàng nhập kho
                  </h3>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-md shadow">
                  {receiptItems.length} sản phẩm
                </span>
              </div>

              {receiptItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <div className="w-20 h-20 bg-[#13192B]/40 border border-slate-800 rounded-2xl flex items-center justify-center mb-3">
                    <svg
                      className="w-10 h-10 text-slate-600 animate-bounce duration-1000"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-slate-400">Giỏ hàng trống</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Chọn sản phẩm bên trái để thêm vào
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 px-3 mb-1 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    <span className="flex-1 text-left">Sản phẩm</span>
                    <span className="w-[96px] text-center">SL</span>
                    <span className="w-[90px] text-right pr-2">Giá nhập</span>
                    <span className="w-[90px] text-right pr-2">Giá bán</span>
                    <span className="w-[90px] text-right pr-2">Giá sỉ</span>
                  </div>

                  {receiptItems.map((item, index) => {
                    const originalPart = parts.find((p) => p.id === item.partId);
                    return (
                      <div key={item.partId} className="bg-[#131926]/40 border border-slate-800/80 rounded-2xl p-3.5 hover:border-blue-500/30 transition-all duration-200">
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <div className="w-5 h-5 bg-[#0B0F19]/80 border border-slate-800 rounded flex items-center justify-center">
                            <span className="text-[10px] font-black text-slate-400">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs text-slate-200 truncate">{item.partName}</div>
                          </div>
                          <button onClick={() => removeReceiptItem(item.partId)} className="text-slate-400 hover:text-rose-400">×</button>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <div className="flex-1"></div>
                          <div className="w-[96px] flex items-center justify-center bg-[#0B0F19]/80 border border-slate-800 rounded-xl p-0.5">
                            <button onClick={() => updateReceiptItem(item.partId, "quantity", Math.max(1, item.quantity - 1))} className="w-6 h-6 text-slate-400 hover:text-white">-</button>
                            <input type="number" value={item.quantity} onChange={(e) => updateReceiptItem(item.partId, "quantity", Math.max(1, parseInt(e.target.value) || 1))} className="w-9 text-center bg-transparent text-white text-xs font-black font-mono outline-none" />
                            <button onClick={() => updateReceiptItem(item.partId, "quantity", item.quantity + 1)} className="w-6 h-6 text-slate-400 hover:text-white">+</button>
                          </div>
                          <div className="w-[90px]"><FormattedNumberInput value={item.importPrice} onValue={(v) => updateReceiptItem(item.partId, "importPrice", v)} className="w-full px-2 py-1.5 border border-slate-800 rounded-xl bg-[#0B0F19]/80 text-white text-right text-xs font-bold font-mono outline-none" /></div>
                          <div className="w-[90px]"><FormattedNumberInput value={item.sellingPrice} onValue={(v) => updateReceiptItem(item.partId, "sellingPrice", Math.max(0, Math.round(v)))} className="w-full px-2 py-1.5 border border-slate-800 rounded-xl bg-[#0B0F19]/80 text-white text-right text-xs font-bold font-mono outline-none" /></div>
                          <div className="w-[90px]"><FormattedNumberInput value={item.wholesalePrice} onValue={(v) => updateReceiptItem(item.partId, "wholesalePrice", Math.max(0, Math.round(v)))} className="w-full px-2 py-1.5 border border-slate-800 rounded-xl bg-[#0B0F19]/80 text-white text-right text-xs font-bold font-mono outline-none" /></div>
                          <div className="w-[85px] text-right text-xs font-black text-blue-400 font-mono">{formatCurrency(item.importPrice * item.quantity)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800/60 bg-[#0A0D16]/95 backdrop-blur-md space-y-4">
              {/* Checkout Summary Box (Breathtaking neon-accented card) */}
              <div className="relative overflow-hidden p-4 bg-gradient-to-r from-[#182030]/80 to-[#111723]/80 border border-blue-500/20 rounded-2xl shadow-[0_0_25px_rgba(56,189,248,0.15)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Tổng thanh toán</span>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold font-mono text-[#38bdf8]">{formatCurrency(totalAmount)}</div>
                    <div className="text-[10px] font-bold text-slate-500 mt-0.5">{receiptItems.length} sản phẩm</div>
                  </div>
                </div>
              </div>

              {/* Payment Method - Compact buttons */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  Phương thức thanh toán <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex items-center justify-center gap-2.5 px-4 py-3 border rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                      paymentMethod === "cash"
                        ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                        : "border-slate-800 bg-[#131926]/40 text-slate-400 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    Tiền mặt
                  </button>
                  <button
                    onClick={() => setPaymentMethod("bank")}
                    className={`flex items-center justify-center gap-2.5 px-4 py-3 border rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                      paymentMethod === "bank"
                        ? "border-blue-500/60 bg-blue-500/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                        : "border-slate-800 bg-[#131926]/40 text-slate-400 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Chuyển khoản
                  </button>
                </div>
              </div>

              {/* Show details only when payment method is selected */}
              {paymentMethod && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  {/* Payment Type */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                      Hình thức thanh toán
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          setPaymentType("full");
                          setPartialAmount(0);
                        }}
                        className={`px-3 py-2.5 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                          paymentType === "full"
                            ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                            : "border-slate-800 bg-[#131926]/40 text-slate-400 hover:text-white hover:border-slate-700"
                        }`}
                      >
                        Thanh toán Đủ
                      </button>
                      <button
                        onClick={() => setPaymentType("partial")}
                        className={`px-3 py-2.5 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                          paymentType === "partial"
                            ? "border-blue-500/60 bg-blue-500/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                            : "border-slate-800 bg-[#131926]/40 text-slate-400 hover:text-white hover:border-slate-700"
                        }`}
                      >
                        Trả 1 phần
                      </button>
                      <button
                        onClick={() => {
                          setPaymentType("note");
                          setPartialAmount(0);
                        }}
                        className={`px-3 py-2.5 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                          paymentType === "note"
                            ? "border-amber-500/60 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                            : "border-slate-800 bg-[#131926]/40 text-slate-400 hover:text-white hover:border-slate-700"
                        }`}
                      >
                        Ghi nợ/Note
                      </button>
                    </div>
                  </div>

                  {/* Partial Payment Input */}
                  {paymentType === "partial" && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                        Số tiền trả trước
                      </label>
                      <FormattedNumberInput
                        value={partialAmount}
                        onValue={(v) =>
                          setPartialAmount(Math.max(0, Math.round(v)))
                        }
                        className="w-full px-4 py-3 border border-blue-500/40 rounded-xl bg-[#0B0F19]/80 text-white text-right text-base font-black font-mono focus:border-blue-400 transition-all duration-200 outline-none shadow-[0_0_15px_rgba(59,130,246,0.05)]"
                        placeholder="Nhập số tiền..."
                      />
                      <div className="flex items-center justify-between text-[11px] font-bold px-1.5">
                        <span className="text-slate-500">Còn lại ghi nợ:</span>
                        <span className="font-bold font-mono text-rose-400">
                          {formatCurrency(
                            Math.max(0, totalAmount - partialAmount)
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3.5 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 bg-[#131926]/80 hover:bg-[#1E293B] border border-slate-800 text-slate-300 px-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4 text-blue-400" />
                  LƯU NHÁP
                </button>
                <button
                  onClick={() => {
                    if (!paymentMethod) {
                      showToast.warning("Vui lòng chọn phương thức thanh toán");
                      return;
                    }
                    if (!paymentType) {
                      showToast.warning("Vui lòng chọn hình thức thanh toán");
                      return;
                    }
                    if (paymentType === "partial" && partialAmount <= 0) {
                      showToast.warning("Vui lòng nhập số tiền trả trước");
                      return;
                    }
                    handleSave();
                  }}
                  disabled={
                    !paymentMethod ||
                    !paymentType ||
                    (paymentType === "partial" && partialAmount <= 0)
                  }
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-500 disabled:shadow-none disabled:border disabled:border-slate-800 disabled:cursor-not-allowed"
                >
                  NHẬP KHO
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCameraScanner && (
        <BarcodeScannerModal
          isOpen={showCameraScanner}
          onClose={() => setShowCameraScanner(false)}
          onScan={handleCameraScan}
        />
      )}

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onSave={handleAddNewProduct}
      />
    </>
  );
};

export default GoodsReceiptModal;
