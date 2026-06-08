import React, { useState, useMemo, useEffect, useRef } from "react";
import { X, Search, ScanBarcode } from "lucide-react";
import BarcodeScannerModal from "../../../common/BarcodeScannerModal";
import { formatCurrency, normalizeSearchText } from "../../../../utils/format";
import { getCategoryColor } from "../../../../utils/categoryColors";
import { showToast } from "../../../../utils/toast";
import type { Part } from "../../../../types";

interface PartSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  parts: Part[];
  currentBranchId: string;
  onAddPart: (part: Part) => void;
}

export const PartSearchSheet: React.FC<PartSearchSheetProps> = ({
  isOpen,
  onClose,
  parts,
  currentBranchId,
  onAddPart,
}) => {
  const [partSearchTerm, setPartSearchTerm] = useState("");
  const [partCategoryFilter, setPartCategoryFilter] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const partResultsRef = useRef<HTMLDivElement>(null);

  // Filtered parts - first filter by stock > 0 (matching desktop behavior)
  const availableParts = useMemo(() => {
    return parts.filter((part) => {
      const stock = part.stock?.[currentBranchId] || 0;
      return stock > 0;
    });
  }, [parts, currentBranchId]);

  const filteredParts = useMemo(() => {
    const normalizedQuery = normalizeSearchText(partSearchTerm.trim());
    const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

    return availableParts.filter((p) => {
      if (partCategoryFilter && (p.category || "") !== partCategoryFilter) {
        return false;
      }
      if (queryWords.length === 0) return true;
      const combined = [
        normalizeSearchText(p.name),
        normalizeSearchText(p.category),
        normalizeSearchText((p as any).description),
        (p.sku || "").toLowerCase(),
      ].join(" ");
      return queryWords.every((word) => combined.includes(word));
    });
  }, [availableParts, partSearchTerm, partCategoryFilter]);

  const availablePartCategories = useMemo(() => {
    const unique = new Set<string>();
    for (const part of availableParts) {
      const c = part.category?.trim();
      if (c) unique.add(c);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "vi"));
  }, [availableParts]);

  // Auto-scroll to top of part results when search term changes and has results
  useEffect(() => {
    if (partSearchTerm && filteredParts.length > 0 && partResultsRef.current) {
      partResultsRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [partSearchTerm, filteredParts.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[110] flex flex-col">
      {/* Top Sheet Container - positioned at TOP so input is always visible above keyboard */}
      <div
        className="w-full bg-slate-50 dark:bg-[#151521] rounded-b-2xl flex flex-col transition-colors"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-slate-900 dark:text-white font-semibold text-sm">
            🔍 Tìm phụ tùng
          </h3>
          <button
            onClick={() => {
              onClose();
              setPartSearchTerm("");
            }}
            className="p-1.5 text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input - Always visible at top */}
        <div className="p-3 bg-slate-50 dark:bg-[#151521]">
          {/* Part Search Input */}
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={partSearchTerm}
                onChange={(e) => setPartSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && partSearchTerm.trim()) {
                    e.preventDefault();
                    // Auto-add first matching part when Enter is pressed
                    const firstMatch = filteredParts[0];
                    if (firstMatch) {
                      const stock = firstMatch.stock?.[currentBranchId] || 0;
                      if (stock <= 0) {
                        showToast.error("Sản phẩm đã hết hàng!");
                        return;
                      }
                      onAddPart(firstMatch);
                    }
                  }
                }}
                placeholder="Quét hoặc nhập mã phụ tùng..."
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#2b2b40] border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white text-sm focus:border-blue-500 transition-all"
                autoFocus
              />
            </div>
            <button
              onClick={() => setIsScanning(true)}
              className="p-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white flex items-center justify-center transition-colors"
              title="Quét bằng camera"
            >
              <ScanBarcode className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Nhấn Enter để thêm nhanh phụ tùng đầu tiên • Dùng camera để quét mã vạch
          </p>

          {/* Barcode Scanner Overlay */}
          <BarcodeScannerModal
            isOpen={isScanning}
            onClose={() => setIsScanning(false)}
            onScan={(barcode: string) => {
              setPartSearchTerm(barcode);
              // Auto-add first matching part if exact SKU found
              const exactMatch = parts.find(
                (p) =>
                  p.sku?.toLowerCase() === barcode.toLowerCase() ||
                  p.barcode?.toLowerCase() === barcode.toLowerCase()
              );
              if (exactMatch) {
                const stock = exactMatch.stock?.[currentBranchId] || 0;
                if (stock <= 0) {
                  showToast.error("Sản phẩm đã hết hàng!");
                  return;
                }
                onAddPart(exactMatch);
              }
            }}
            title="Quét mã phụ tùng"
          />

          <div className="mt-2">
            <select
              value={partCategoryFilter}
              onChange={(e) => setPartCategoryFilter(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-[#2b2b40] border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-white text-sm focus:border-blue-500 transition-all"
              aria-label="Danh mục phụ tùng"
            >
              <option value="">Tất cả danh mục</option>
              {availablePartCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count & List - Scrollable */}
        <div
          ref={partResultsRef}
          className="flex-1 overflow-y-auto px-3 pb-3 overscroll-contain"
        >
          {/* Show result count when searching */}
          {partSearchTerm && (
            <div className="mb-2 px-1 text-xs text-slate-400">
              Tìm thấy{" "}
              <span className="text-emerald-400 font-semibold">
                {filteredParts.length}
              </span>{" "}
              phụ tùng
              {filteredParts.length > 50 && " (hiển thị 50 đầu tiên)"}
            </div>
          )}
          <div className="space-y-2">
            {filteredParts.slice(0, 50).map((part) => {
              const stock = part.stock?.[currentBranchId] || 0;
              const price = part.retailPrice?.[currentBranchId] || 0;
              return (
                <div
                  key={part.id}
                  onClick={() => {
                    if (stock <= 0) {
                      showToast.error("Sản phẩm đã hết hàng!");
                      return;
                    }
                    onAddPart(part);
                  }}
                  className="p-2.5 bg-white dark:bg-[#1e1e2d] rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2b2b40] active:bg-blue-600/20 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="text-slate-900 dark:text-white font-medium text-xs truncate">
                        {part.name}
                      </div>
                      <div className="text-[11px] text-blue-400 font-mono mt-0.5">
                        SKU: {part.sku} • Tồn: {stock}
                      </div>
                      {part.category && (
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 mt-1 rounded-full text-[9px] font-medium ${
                            getCategoryColor(part.category).bg
                          } ${getCategoryColor(part.category).text}`}
                        >
                          {part.category}
                        </span>
                      )}
                    </div>
                    <div className="text-[#50cd89] font-bold text-xs flex-shrink-0">
                      {formatCurrency(price)}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredParts.length > 50 && (
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-500 italic border-t border-slate-100 dark:border-slate-600 rounded-b-lg">
                Đang hiển thị 50/{filteredParts.length} kết quả. Vui lòng tìm kiếm chi tiết hơn.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tap outside to close */}
      <div
        className="flex-1"
        onClick={() => {
          onClose();
          setPartSearchTerm("");
        }}
      />
    </div>
  );
};
