import React, { useState, useMemo, useEffect, useRef } from "react";
import { X, Search, ScanBarcode, Package } from "lucide-react";
import BarcodeScannerModal from "../../../common/BarcodeScannerModal";
import { formatCurrency, normalizeSearchText } from "../../../../utils/format";
import { getCategoryColor } from "../../../../utils/categoryColors";
import { showToast } from "../../../../utils/toast";
import type { Part } from "../../../../types";
import { useSalesRepo } from "../../../../hooks/useSalesRepository";
import { useWorkOrdersRepo } from "../../../../hooks/useWorkOrdersRepository";
import { getPartsPopularityMap } from "../../../../utils/partsPopularity";

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
  const [zoomedImage, setZoomedImage] = useState<{ url: string; name: string } | null>(null);

  // Fetch sales and work orders for calculating parts popularity
  const { data: sales = [] } = useSalesRepo();
  const { data: workOrders = [] } = useWorkOrdersRepo();

  const popularityMap = useMemo(() => {
    return getPartsPopularityMap(sales, workOrders);
  }, [sales, workOrders]);

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

    const filtered = availableParts.filter((p) => {
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

    // Sort by popularity (descending) first, then alphabetical by name
    return filtered.sort((a, b) => {
      const aPop = popularityMap.get(a.id) || 0;
      const bPop = popularityMap.get(b.id) || 0;
      if (bPop !== aPop) return bPop - aPop;
      return a.name.localeCompare(b.name, "vi");
    });
  }, [availableParts, partSearchTerm, partCategoryFilter, popularityMap]);

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
                  className="p-2.5 bg-white dark:bg-[#1e1e2d] rounded-lg border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 active:bg-blue-600/20 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Thumbnail Image */}
                    <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-700 relative">
                      {part.imageUrl ? (
                        <img
                          src={part.imageUrl}
                          alt={part.name}
                          onClick={() => setZoomedImage({ url: part.imageUrl!, name: part.name })}
                          className="w-full h-full object-cover rounded-lg cursor-zoom-in"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        if (stock <= 0) {
                          showToast.error("Sản phẩm đã hết hàng!");
                          return;
                        }
                        onAddPart(part);
                      }}
                    >
                      <div className="text-slate-900 dark:text-white font-medium text-xs truncate">
                        {part.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-blue-400 font-mono">
                          SKU: {part.sku}
                        </span>
                        <span className="text-[10px] text-orange-400 font-medium">
                          Tồn: {stock}
                        </span>
                        {part.category && (
                          <span
                            className={`inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-medium ${
                              getCategoryColor(part.category).bg
                            } ${getCategoryColor(part.category).text}`}
                          >
                            {part.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div
                    className="text-[#50cd89] font-bold text-xs flex-shrink-0 cursor-pointer"
                    onClick={() => {
                      if (stock <= 0) {
                        showToast.error("Sản phẩm đã hết hàng!");
                        return;
                      }
                      onAddPart(part);
                    }}
                  >
                    {formatCurrency(price)}
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

      {/* Zoom Overlay Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[9999] flex flex-col items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white z-10"
            onClick={() => setZoomedImage(null)}
            aria-label="Đóng ảnh"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* Zoomed Image Container */}
          <div className="relative max-w-full max-h-[80vh] flex items-center justify-center rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-2xl p-2 animate-[scaleIn_0.25s_ease-out_1]">
            <img
              src={zoomedImage.url}
              alt={zoomedImage.name}
              className="max-w-full max-h-[75vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          {/* Product Name */}
          <div className="mt-4 text-center max-w-md px-4">
            <h4 className="text-white font-bold text-sm line-clamp-2 leading-snug">
              {zoomedImage.name}
            </h4>
            <p className="text-slate-400 text-xs mt-1">
              Nhấn bất kỳ đâu để đóng
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
