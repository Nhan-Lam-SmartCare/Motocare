import React from "react";
import { MoreHorizontal, Eye, Edit, Trash2, Tags, Banknote } from "lucide-react";
import { formatCurrency } from "../../../utils/format";

interface InventoryMobileCardsProps {
  filteredParts: any[];
  currentBranchId: string;
  duplicateSkus: Set<string>;
  mobileMenuOpenIndex: number | null;
  setMobileMenuOpenIndex: (index: number | null) => void;
  setSelectedPartDetail: (part: any) => void;
  setEditingPart: (part: any) => void;
  handleDeleteItem: (id: string) => void;
  LOW_STOCK_THRESHOLD: number;
  isOwner?: boolean;
}

const InventoryMobileCards: React.FC<InventoryMobileCardsProps> = ({
  filteredParts,
  currentBranchId,
  duplicateSkus,
  mobileMenuOpenIndex,
  setMobileMenuOpenIndex,
  setSelectedPartDetail,
  setEditingPart,
  handleDeleteItem,
  LOW_STOCK_THRESHOLD,
  isOwner,
}) => {
  return (
    <div className="block sm:hidden">
      <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/50">
        {filteredParts.map((part, index) => {
          const stock = part.stock[currentBranchId] || 0;
          const reserved = part.reservedstock?.[currentBranchId] || 0;
          const available = Math.max(0, stock - reserved);
          const retailPrice = part.retailPrice[currentBranchId] || 0;
          const wholesalePrice = part.wholesalePrice?.[currentBranchId] || 0;
          const costPrice = part.costPrice?.[currentBranchId] || 0;
          const isDuplicate = duplicateSkus.has(part.sku || "");

          return (
            <div
              key={part.id}
              className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all ${
                isDuplicate ? "border-l-4 border-l-amber-500" : ""
              }`}
            >
              <div className="flex gap-4">
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[15px] font-black text-slate-900 dark:text-white leading-tight truncate tracking-tight">
                        {part.name}
                      </h3>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMobileMenuOpenIndex(
                              mobileMenuOpenIndex === index ? null : index
                            );
                          }}
                          className="p-1 -m-1 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                        {mobileMenuOpenIndex === index && (
                          <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                            <button
                              onClick={() => {
                                setSelectedPartDetail(part);
                                setMobileMenuOpenIndex(null);
                              }}
                              className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700"
                            >
                              <Eye className="w-4 h-4 text-emerald-500" /> Xem chi tiết
                            </button>
                            <button
                              onClick={() => {
                                setEditingPart(part);
                                setMobileMenuOpenIndex(null);
                              }}
                              className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700"
                            >
                              <Edit className="w-4 h-4 text-blue-500" /> Chỉnh sửa
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteItem(part.id);
                                setMobileMenuOpenIndex(null);
                              }}
                              className="w-full text-left px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-3"
                            >
                              <Trash2 className="w-4 h-4" /> Xóa sản phẩm
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {part.sku || "N/A"}
                      </span>
                      {part.category && (
                        <span className="text-[10px] font-black text-blue-500/80 uppercase tracking-widest">
                          {part.category}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Bottom row: Business Indicators — Scientific Layout */}
                  <div className="mt-4 pt-3 border-t border-slate-100/50 dark:border-slate-800/50">
                    <div className="flex items-center justify-between">
                      {/* Price Grid with Micro-icons */}
                      <div className="flex items-center gap-4 flex-1">
                        {/* Giá bán lẻ - Nổi bật nhất */}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1 mb-1">
                            <Tags className="w-3 h-3 text-blue-500/70" />
                            <span className="text-[9px] font-black text-blue-500/80 uppercase tracking-widest">
                              Giá Bán
                            </span>
                          </div>
                          <span className="text-[15px] font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight leading-none">
                            {formatCurrency(retailPrice)}
                          </span>
                        </div>

                        {/* Giá sỉ */}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              Giá Sỉ
                            </span>
                          </div>
                          <span className="text-[13px] font-bold text-slate-600 dark:text-slate-300 font-mono tracking-tight leading-none">
                            {formatCurrency(wholesalePrice)}
                          </span>
                        </div>

                        {/* Giá nhập (chỉ Owner) */}
                        {isOwner && (
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1 mb-1">
                              <Banknote className="w-3 h-3 text-emerald-500/70" />
                              <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest">
                                Giá Nhập
                              </span>
                            </div>
                            <span className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight leading-none">
                              {formatCurrency(costPrice)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Modern Stock Badge */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`relative flex items-center justify-center w-11 h-11 rounded-xl border-2 transition-all shadow-sm ${
                            available === 0
                              ? "bg-rose-500/5 border-rose-500/20 text-rose-500"
                              : available <= LOW_STOCK_THRESHOLD
                              ? "bg-amber-500/5 border-amber-500/20 text-amber-500"
                              : "bg-emerald-500/5 border-emerald-500/20 text-emerald-500"
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center leading-none">
                            <span className="text-[14px] font-black">{available}</span>
                            <span className="text-[7px] font-bold uppercase mt-0.5 opacity-70">
                              Tồn
                            </span>
                          </div>
                          {/* Small indicator dot */}
                          <div
                            className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                              available === 0
                                ? "bg-rose-500"
                                : available <= LOW_STOCK_THRESHOLD
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InventoryMobileCards;
