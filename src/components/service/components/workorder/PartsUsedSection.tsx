import React, { useState, useMemo } from "react";
import type { Part, WorkOrderPart } from "../../../../types";
import { NumberInput } from "../../../common/NumberInput";
import { formatCurrency, normalizeSearchText } from "../../../../utils/format";
import { getCategoryColor } from "../../../../utils/categoryColors";
import { showToast } from "../../../../utils/toast";

interface PartsUsedSectionProps {
  parts: Part[];
  partsLoading: boolean;
  selectedParts: WorkOrderPart[];
  setSelectedParts: React.Dispatch<React.SetStateAction<WorkOrderPart[]>>;
  currentBranchId: string;
  canEditPriceAndParts: boolean;
  isOwner: boolean;
}

export const PartsUsedSection: React.FC<PartsUsedSectionProps> = ({
  parts,
  partsLoading,
  selectedParts,
  setSelectedParts,
  currentBranchId,
  canEditPriceAndParts,
  isOwner,
}) => {
  const [showPartSearch, setShowPartSearch] = useState(false);
  const [searchPart, setSearchPart] = useState("");
  const [searchPartCategory, setSearchPartCategory] = useState<string>("");

  // Filter parts available at current branch with stock
  const availableParts = useMemo(() => {
    return parts.filter((part) => {
      const stock = part.stock?.[currentBranchId] || 0;
      return stock > 0;
    });
  }, [parts, currentBranchId]);

  const availablePartCategories = useMemo(() => {
    const unique = new Set<string>();
    for (const part of availableParts) {
      const c = part.category?.trim();
      if (c) unique.add(c);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "vi"));
  }, [availableParts]);

  // Filter parts based on search - show all available parts if search is empty
  const filteredParts = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchPart.trim());
    const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

    return availableParts.filter((p) => {
      if (searchPartCategory && (p.category || "") !== searchPartCategory) {
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
  }, [availableParts, searchPart, searchPartCategory]);

  const handleAddPart = (part: Part) => {
    const existing = selectedParts.find((p) => p.partId === part.id);
    if (existing) {
      setSelectedParts(
        selectedParts.map((p) =>
          p.partId === part.id ? { ...p, quantity: p.quantity + 1 } : p
        )
      );
    } else {
      setSelectedParts([
        ...selectedParts,
        {
          partId: part.id,
          partName: part.name,
          sku: part.sku || "",
          category: part.category || "",
          quantity: 1,
          price: part.retailPrice?.[currentBranchId] || 0,
          costPrice: part.costPrice?.[currentBranchId] || 0,
        },
      ]);
    }
    setShowPartSearch(false);
    setSearchPart("");
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-xs font-bold">2</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Phụ tùng sử dụng
          </h3>
          {selectedParts.length > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              {selectedParts.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowPartSearch(!showPartSearch)}
          disabled={!canEditPriceAndParts}
          className={`px-3 py-1.5 rounded text-sm flex items-center gap-1 ${
            canEditPriceAndParts
              ? "border border-blue-500 text-blue-500 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-500/10"
              : "bg-slate-400 dark:bg-slate-600 text-white cursor-not-allowed opacity-50"
          }`}
          title={
            canEditPriceAndParts
              ? "Thêm phụ tùng"
              : "Không thể thêm phụ tùng cho phiếu đã thanh toán"
          }
        >
          + Thêm phụ tùng
        </button>
      </div>

      {showPartSearch && (
        <div className="relative">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Tìm kiếm phụ tùng theo tên hoặc SKU..."
              value={searchPart}
              onChange={(e) => setSearchPart(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              autoFocus
            />
            <select
              value={searchPartCategory}
              onChange={(e) => setSearchPartCategory(e.target.value)}
              className="w-48 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
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
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
            {partsLoading ? (
              <div className="px-4 py-3 text-sm text-slate-500">Đang tải phụ tùng...</div>
            ) : filteredParts.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500">Không tìm thấy phụ tùng</div>
            ) : (
              <>
                {filteredParts.slice(0, 50).map((part) => {
                  const stock = part.stock?.[currentBranchId] || 0;
                  return (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => {
                        if (stock <= 0) {
                          showToast.error("Sản phẩm đã hết hàng!");
                          return;
                        }
                        handleAddPart(part);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center justify-between border-b border-slate-100 dark:border-slate-600 last:border-b-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {part.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                            {part.sku}
                          </span>
                          <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
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
                      <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(part.retailPrice?.[currentBranchId] || 0)}
                      </div>
                    </button>
                  );
                })}
                {filteredParts.length > 50 && (
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-500 italic border-t border-slate-100 dark:border-slate-600">
                    Đang hiển thị 50/{filteredParts.length} kết quả. Vui lòng tìm kiếm chi tiết hơn.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="border border-slate-200/60 dark:border-slate-800/40 rounded-xl overflow-hidden shadow-sm bg-slate-500/[0.01] backdrop-blur-sm">
        <table className="w-full">
          <thead className="bg-slate-100/50 dark:bg-slate-900/40 border-b border-slate-200/50 dark:border-slate-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Tên
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                SL
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Đ.Giá
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                T.Tiền
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 bg-white/40 dark:bg-slate-900/10">
            {selectedParts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                  Chưa có phụ tùng nào
                </td>
              </tr>
            ) : (
              selectedParts.map((part, idx) => (
                <tr key={idx} className="hover:bg-slate-500/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="relative group/part">
                      <div className="text-sm text-slate-800 dark:text-slate-200 font-semibold cursor-default">
                        {part.partName}
                      </div>
                      {isOwner && (() => {
                        const snapshotCost = (part as any).costPrice ?? (part as any).costprice;
                        let costPrice = snapshotCost;
                        if (costPrice == null || costPrice === undefined) {
                          const catalogPart = parts.find(
                            (p) => p.id === part.partId || (part.sku && p.sku === part.sku)
                          );
                          if (catalogPart) {
                            costPrice = catalogPart.costPrice?.[currentBranchId] ?? 0;
                          }
                        }
                        return costPrice != null ? (
                          <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover/part:block z-20 pointer-events-none">
                            <div className="bg-slate-900 dark:bg-slate-950 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap border border-white/10 backdrop-blur-md">
                              <span className="text-slate-400">Giá nhập:</span>{" "}
                              <span className="font-semibold text-amber-400">
                                {formatCurrency(costPrice)}
                              </span>
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {part.sku && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono bg-blue-500/5 px-1.5 py-0.5 rounded border border-blue-500/10">
                          {part.sku}
                        </span>
                      )}
                      {part.category && (
                        <span
                          className={`inline-flex items-center px-1.5 py-0 rounded text-[9px] font-medium ${
                            getCategoryColor(part.category).bg
                          } ${getCategoryColor(part.category).text}`}
                        >
                          {part.category}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      min="1"
                      value={part.quantity}
                      disabled={!canEditPriceAndParts}
                      onChange={(e) => {
                        const newQty = Number(e.target.value);
                        setSelectedParts(
                          selectedParts.map((p, i) => (i === idx ? { ...p, quantity: newQty } : p))
                        );
                      }}
                      className={`w-16 px-2 py-1 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 text-slate-800 dark:text-slate-200 rounded-lg text-center transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none ${
                        !canEditPriceAndParts ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <NumberInput
                      placeholder="Đơn giá"
                      value={part.price || ""}
                      onChange={(val) => {
                        setSelectedParts(
                          selectedParts.map((p, i) => (i === idx ? { ...p, price: val } : p))
                        );
                      }}
                      disabled={!canEditPriceAndParts}
                      className={`w-28 px-2 py-1 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 text-slate-800 dark:text-slate-200 rounded-lg text-right transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none text-sm ${
                        !canEditPriceAndParts ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(part.price * part.quantity)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedParts(selectedParts.filter((_, i) => i !== idx))}
                      disabled={!canEditPriceAndParts}
                      className={`p-1.5 rounded-lg transition-colors flex items-center justify-center mx-auto ${
                        canEditPriceAndParts
                          ? "text-slate-400 hover:text-red-500 hover:bg-red-500/10"
                          : "text-slate-300 dark:text-slate-650 cursor-not-allowed"
                      }`}
                      aria-label="Xóa phụ tùng"
                      title={
                        canEditPriceAndParts
                          ? "Xóa phụ tùng"
                          : "Không thể xóa phụ tùng cho phiếu đã thanh toán"
                      }
                    >
                      <svg
                        xmlns="http://www.w3.org/2050/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="w-4 h-4"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M9 6V4h6v2m-7 4v8m4-8v8m4-8v8" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
