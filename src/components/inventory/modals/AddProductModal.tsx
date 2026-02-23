import React, { useState, useEffect } from 'react';
import { useCreatePartRepo } from '../../../hooks/usePartsRepository';
import { useStoreSettings } from '../../../hooks/useStoreSettings';
import { showToast } from '../../../utils/toast';
import { formatCurrency } from '../../../utils/format';
import { validatePriceAndQty } from '../../../utils/validation';
import { getCategoryColor } from '../../../utils/categoryColors';
import FormattedNumberInput from '../../common/FormattedNumberInput';
import SupplierModal from '../../inventory/components/SupplierModal';
import { X, Plus, Save, Scan, Printer, ShoppingCart, Trash2, Search, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { useCategories, useCreateCategory } from '../../../hooks/useCategories';
import { useSuppliers } from '../../../hooks/useSuppliers';
import { canDo } from '../../../utils/permissions';
import { useAuth } from '../../../contexts/AuthContext';
// Add New Product Modal Component
const AddProductModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: {
    name: string;
    description: string;
    barcode: string;
    category: string;
    quantity: number;
    importPrice: number;
    retailPrice: number;
    warranty: number;
    warrantyUnit: string;
  }) => void;
}> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [importPrice, setImportPrice] = useState<number>(0);
  const [retailPrice, setRetailPrice] = useState<number>(0);
  const [warranty, setWarranty] = useState<number>(0);
  const [warrantyUnit, setWarrantyUnit] = useState("tháng");
  const [retailOverridden, setRetailOverridden] = useState<boolean>(false);
  const { data: categories = [] } = useCategories();
  const { data: storeSettings } = useStoreSettings();
  const retailMarkup = (storeSettings?.retail_markup_percent ?? 40) / 100 + 1; // VD: 40% => 1.4
  const createCategory = useCreateCategory();
  const [showInlineCat, setShowInlineCat] = useState(false);
  const [inlineCatName, setInlineCatName] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) {
      showToast.warning("Vui lòng nhập tên sản phẩm");
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      barcode: barcode.trim(),
      category: category || "Chưa phân loại",
      quantity: Number(quantity) || 1,
      importPrice: Number(importPrice) || 0,
      retailPrice: Number(retailPrice) || 0,
      warranty: Number(warranty) || 0,
      warrantyUnit,
    });

    // Reset form
    setName("");
    setDescription("");
    setBarcode("");
    setCategory("");
    setQuantity(1);
    setImportPrice(0);
    setRetailPrice(0);
    setWarranty(0);
    setRetailOverridden(false);
    setWarrantyUnit("tháng");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-800 w-full sm:rounded-2xl sm:max-w-lg max-h-[95vh] sm:max-h-[85vh] overflow-hidden flex flex-col rounded-t-2xl shadow-2xl">

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 bg-gradient-to-r from-violet-600 to-blue-600">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-bold text-white">Thêm sản phẩm mới</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">

          {/* Card: Thông tin sản phẩm */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
            <p className="text-[11px] font-bold text-violet-500 uppercase tracking-widest mb-3">📦 Thông tin sản phẩm</p>

            {/* Tên sản phẩm */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Tên sản phẩm <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-slate-400 transition-all"
                placeholder="VD: Nhớt Motul 10W40, Lọc dầu Honda..."
                autoFocus
              />
            </div>

            {/* Danh mục + Mã vạch in 2 cols */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Danh mục
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex-1 min-w-0 px-2.5 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">-- Chọn --</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowInlineCat(!showInlineCat)}
                    className={`w-9 flex-shrink-0 flex items-center justify-center rounded-xl border transition-colors ${showInlineCat ? 'bg-violet-600 border-violet-600 text-white' : 'bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50'}`}
                    title="Thêm danh mục mới"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Mã vạch / SKU
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500 placeholder:text-slate-400"
                  placeholder="Tùy chọn"
                />
              </div>
            </div>

            {/* Inline category form */}
            {showInlineCat && (
              <div className="mb-3 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-700/50">
                <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wide mb-2">Tạo danh mục mới</p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const trimmed = inlineCatName.trim();
                    if (!trimmed) { showToast.warning("Vui lòng nhập tên danh mục"); return; }
                    if (trimmed.length < 2) { showToast.warning("Tên quá ngắn"); return; }
                    try {
                      const res = await createCategory.mutateAsync({ name: trimmed });
                      setCategory(res.name);
                      setInlineCatName("");
                      setShowInlineCat(false);
                    } catch (err: any) {
                      showToast.error(err?.message || "Lỗi tạo danh mục");
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    autoFocus
                    type="text"
                    value={inlineCatName}
                    onChange={(e) => setInlineCatName(e.target.value)}
                    placeholder="Tên danh mục mới..."
                    className="flex-1 px-3 py-2 text-sm border border-violet-200 dark:border-violet-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500"
                  />
                  <button type="submit" className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium whitespace-nowrap">
                    Lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowInlineCat(false); setInlineCatName(""); }}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700"
                  >
                    Hủy
                  </button>
                </form>
              </div>
            )}

            {/* Mô tả */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Mô tả <span className="text-slate-400 font-normal">(tùy chọn)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500 resize-none placeholder:text-slate-400"
                placeholder="Mô tả chi tiết sản phẩm..."
              />
            </div>
          </div>

          {/* Card: Thông tin nhập kho */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
            <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest mb-3">💰 Thông tin nhập kho</p>

            <div className="grid grid-cols-2 gap-3">
              {/* Số lượng */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Số lượng
                </label>
                <FormattedNumberInput
                  value={quantity}
                  onValue={(v) => {
                    const result = validatePriceAndQty(importPrice, v);
                    if (result.warnings.length)
                      result.warnings.forEach((w) => showToast.warning(w));
                    setQuantity(Math.max(1, result.clean.quantity));
                  }}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 text-center font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Giá nhập */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Giá nhập (đ)
                </label>
                <FormattedNumberInput
                  value={importPrice}
                  onValue={(v) => {
                    const result = validatePriceAndQty(v, quantity);
                    if (result.warnings.length)
                      result.warnings.forEach((w) => showToast.warning(w));
                    setImportPrice(result.clean.importPrice);
                    if (!retailOverridden) {
                      setRetailPrice(
                        Math.round(result.clean.importPrice * retailMarkup)
                      );
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 text-right focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Giá bán lẻ */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Giá bán lẻ (đ)
                  {!retailOverridden && importPrice > 0 && (
                    <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-bold">
                      tự động +{Math.round((retailMarkup - 1) * 100)}%
                    </span>
                  )}
                </label>
                <FormattedNumberInput
                  value={retailPrice}
                  onValue={(v) => {
                    setRetailPrice(Math.max(0, Math.round(v)));
                    setRetailOverridden(true);
                  }}
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-xl text-slate-900 dark:text-slate-100 text-right focus:ring-2 focus:ring-emerald-500 transition-colors ${!retailOverridden && importPrice > 0
                    ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50'}`}
                />
              </div>

              {/* Bảo hành */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Bảo hành
                </label>
                <div className="flex gap-2">
                  <FormattedNumberInput
                    value={warranty}
                    onValue={(v) => setWarranty(Math.max(0, Math.floor(v)))}
                    className="w-16 px-2 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 text-center focus:ring-2 focus:ring-emerald-500"
                  />
                  <select
                    value={warrantyUnit}
                    onChange={(e) => setWarrantyUnit(e.target.value)}
                    className="flex-1 px-2 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="tháng">tháng</option>
                    <option value="năm">năm</option>
                    <option value="ngày">ngày</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-[0.98] text-white px-4 py-3.5 rounded-xl font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            Lưu và Thêm vào giỏ hàng
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProductModal;
