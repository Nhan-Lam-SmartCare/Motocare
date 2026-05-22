import React from "react";
import {
  Boxes,
  Package,
  AlertTriangle,
  Search,
  AlertCircle,
  Filter,
  Trash2,
} from "lucide-react";
import { formatCurrency } from "../../../utils/format";

interface InventoryHeaderProps {
  totalStockQuantity: number;
  totalStockValue: number;
  stockHealth: { lowStock: number };
  handleStockFilterChange: (id: string) => void;
  searchInput: string;
  setSearchInput: (val: string) => void;
  setPage: (val: number) => void;
  filteredPartsLength: number;
  totalParts: number;
  isSearching: boolean;
  reorderGroupedBySupplierLength: number;
  duplicateSkusSize: number;
  showAlertsSection: boolean;
  setShowAlertsSection: React.Dispatch<React.SetStateAction<boolean>>;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: React.Dispatch<React.SetStateAction<boolean>>;
  stockQuickFilters: any[];
  stockFilter: string;
  setStockFilter: (val: string) => void;
  categoryFilter: string;
  handleCategoryFilterChange: (val: string) => void;
  allCategories: any[];
  showDuplicatesOnly: boolean;
  setShowDuplicatesOnly: React.Dispatch<React.SetStateAction<boolean>>;
  setCategoryFilter: (val: string) => void;
}

const InventoryHeader: React.FC<InventoryHeaderProps> = ({
  totalStockQuantity,
  totalStockValue,
  stockHealth,
  handleStockFilterChange,
  searchInput,
  setSearchInput,
  setPage,
  filteredPartsLength,
  totalParts,
  isSearching,
  reorderGroupedBySupplierLength,
  duplicateSkusSize,
  showAlertsSection,
  setShowAlertsSection,
  showAdvancedFilters,
  setShowAdvancedFilters,
  stockQuickFilters,
  stockFilter,
  setStockFilter,
  categoryFilter,
  handleCategoryFilterChange,
  allCategories,
  showDuplicatesOnly,
  setShowDuplicatesOnly,
  setCategoryFilter,
}) => {
  return (
    <div className="hidden sm:block bg-white dark:bg-[#0B0F19] border-b border-slate-200 dark:border-slate-800/40 px-4 py-3">
      <div className="space-y-3">
        {/* Row 1: Stats inline + Search */}
        <div className="flex items-center gap-3">
          {/* Premium Stats Cards in Header */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl border border-blue-100 dark:border-blue-500/25 bg-blue-50/50 dark:bg-blue-500/5 shadow-sm dark:shadow-md transition-all hover:bg-blue-100/40 dark:hover:bg-blue-500/10 hover:border-blue-200 dark:hover:border-blue-500/40 group">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-500/20 rounded-lg group-hover:scale-110 transition-transform">
                <Boxes className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-[9px] uppercase font-black text-blue-600 dark:text-blue-400/80 tracking-widest leading-none mb-0.5">
                  Tồn kho
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-slate-900 dark:text-white leading-none">
                    {totalStockQuantity.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    SP
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl border border-emerald-100 dark:border-emerald-500/25 bg-emerald-50/50 dark:bg-emerald-500/5 shadow-sm dark:shadow-md transition-all hover:bg-emerald-100/40 dark:hover:bg-emerald-500/10 hover:border-emerald-200 dark:hover:border-emerald-500/40 group">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg group-hover:scale-110 transition-transform">
                <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-450" />
              </div>
              <div>
                <div className="text-[9px] uppercase font-black text-emerald-600 dark:text-emerald-400/80 tracking-widest leading-none mb-0.5">
                  Giá trị tồn
                </div>
                <div className="text-lg font-black text-emerald-650 dark:text-[#34d399] leading-none">
                  {formatCurrency(totalStockValue)}
                </div>
              </div>
            </div>

            {stockHealth.lowStock > 0 && (
              <div
                onClick={() => handleStockFilterChange("low-stock")}
                className="flex items-center gap-3 px-4 py-2 rounded-2xl border border-amber-100 dark:border-amber-500/25 bg-amber-50/50 dark:bg-amber-500/5 shadow-sm dark:shadow-md transition-all hover:bg-amber-100/40 dark:hover:bg-amber-500/10 hover:border-amber-200 dark:hover:border-amber-500/40 group cursor-pointer"
              >
                <div className="p-1.5 bg-amber-100 dark:bg-amber-500/20 rounded-lg group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="text-[9px] uppercase font-black text-amber-600 dark:text-amber-400/80 tracking-widest leading-none mb-0.5">
                    Sắp hết
                  </div>
                  <div className="text-lg font-black text-amber-650 dark:text-amber-400 leading-none">
                    {stockHealth.lowStock}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search Bar - Modernized */}
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm theo tên, SKU, mã vạch hoặc danh mục..."
              value={searchInput}
              onChange={(e) => {
                setPage(1);
                setSearchInput(e.target.value);
              }}
              className="w-full pl-11 pr-20 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-[#131926] text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <div className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-[#0B0F19] text-[10px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                {filteredPartsLength} / {isSearching ? filteredPartsLength : totalParts}
              </div>
            </div>
          </div>
          {/* Alert button */}
          {(reorderGroupedBySupplierLength > 0 || duplicateSkusSize > 0) && (
            <button
              onClick={() => setShowAlertsSection((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition flex-shrink-0 ${
                showAlertsSection
                  ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 shadow-sm"
                  : "border-slate-200 dark:border-amber-500/20 text-slate-600 dark:text-amber-500 hover:border-amber-300 dark:hover:border-amber-500/40 bg-slate-50 dark:bg-amber-500/5 hover:bg-slate-100"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <AlertCircle className="w-3.5 h-3.5" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-slate-800 animate-pulse"></div>
              </div>
              Cảnh báo
            </button>
          )}
          {/* Filter button */}
          <button
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition flex-shrink-0 ${
              showAdvancedFilters
                ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
                : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#131926] hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Bộ lọc nâng cao
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-4">
          {stockQuickFilters.map((filter) => {
            const isActive = stockFilter === filter.id;
            const variants: Record<string, string> = {
              neutral: isActive
                ? "bg-slate-900 text-white dark:bg-white dark:text-[#0B0F19] border-transparent shadow-[0_2px_8px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                : "bg-slate-50 dark:bg-[#131926] text-slate-650 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white",
              success: isActive
                ? "bg-emerald-600 text-white border-transparent shadow-[0_0_15px_rgba(16,185,129,0.3)] font-bold"
                : "bg-emerald-50/50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-450 border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/10",
              warning: isActive
                ? "bg-amber-500 text-white border-transparent shadow-[0_0_15px_rgba(245,158,11,0.3)] font-bold"
                : "bg-amber-50/50 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/10",
              danger: isActive
                ? "bg-rose-500 text-white border-transparent shadow-[0_0_15px_rgba(244,63,94,0.3)] font-bold"
                : "bg-rose-50/50 dark:bg-rose-500/5 text-rose-600 dark:text-rose-450 border-rose-100 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/10",
            };

            return (
              <button
                key={filter.id}
                onClick={() => handleStockFilterChange(filter.id)}
                className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-200 active:scale-95 ${
                  variants[filter.variant || "neutral"]
                }`}
              >
                <span className="leading-none">{filter.label}</span>
                <span
                  className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-black leading-none ${
                    isActive
                      ? "bg-black/10 dark:bg-black/20"
                      : "bg-slate-100 dark:bg-[#0B0F19] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800/40"
                  }`}
                >
                  {filter.count}
                </span>
              </button>
            );
          })}
        </div>

        {showAdvancedFilters && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#131926]/90 backdrop-blur-lg p-4 grid gap-4 md:grid-cols-3 shadow-xl dark:shadow-2xl animate-in zoom-in-95 duration-200">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">
                Trạng thái tồn kho
              </label>
              <select
                value={stockFilter}
                onChange={(e) => handleStockFilterChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F19] px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              >
                <option value="all">Tất cả tồn kho</option>
                <option value="in-stock">Còn hàng</option>
                <option value="low-stock">Sắp hết</option>
                <option value="out-of-stock">Hết hàng</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">
                Danh mục sản phẩm
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => handleCategoryFilterChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F19] px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              >
                <option value="all">Tất cả danh mục</option>
                {allCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">
                Xử lý dữ liệu
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDuplicatesOnly((prev) => !prev)}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                    showDuplicatesOnly
                      ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20"
                      : "bg-slate-50 dark:bg-[#0B0F19] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-slate-100"
                  }`}
                >
                  {showDuplicatesOnly ? "✓ Đang lọc trùng" : "🔍 Lọc trùng SKU"}
                </button>
                {(stockFilter !== "all" ||
                  categoryFilter !== "all" ||
                  showDuplicatesOnly) && (
                  <button
                    onClick={() => {
                      setStockFilter("all");
                      setCategoryFilter("all");
                      setShowDuplicatesOnly(false);
                    }}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-500 hover:border-rose-350 dark:hover:border-rose-500/30 hover:bg-slate-100 transition-all"
                    title="Xóa tất cả bộ lọc"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryHeader;
