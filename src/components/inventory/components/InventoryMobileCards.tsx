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
      <div className="space-y-4 p-4 bg-slate-50 dark:bg-[#0B0F19] text-slate-700 dark:text-slate-200">
        {filteredParts.map((part, index) => {
          const stock = part.stock?.[currentBranchId] || 0;
          const reserved = part.reservedstock?.[currentBranchId] || 0;
          const available = Math.max(0, stock - reserved);
          const retailPrice = part.retailPrice?.[currentBranchId] || 0;
          const wholesalePrice = part.wholesalePrice?.[currentBranchId] || 0;
          const costPrice = part.costPrice?.[currentBranchId] || 0;
          const isDuplicate = duplicateSkus.has(part.sku || "");

          return (
            <div
              key={part.id}
              className={`bg-white dark:bg-gradient-to-br dark:from-[#182030] dark:to-[#111723] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] active:scale-[0.98] transition-all ${
                isDuplicate ? "border-l-4 border-l-amber-500" : ""
              }`}
            >
              <div className="flex flex-col space-y-3.5">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                        {part.imageUrl ? (
                          <img
                            src={part.imageUrl}
                            alt={part.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Tags className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <h3 className="min-w-0 flex-1 text-[16px] font-extrabold text-slate-900 dark:text-white leading-snug truncate tracking-tight">
                        {part.name}
                      </h3>
                    </div>
                    <div className="relative shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMobileMenuOpenIndex(
                            mobileMenuOpenIndex === index ? null : index
                          );
                        }}
                        className="p-1.5 -m-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/30 rounded-lg transition"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      {mobileMenuOpenIndex === index && (
                        <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-[#182030] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl dark:shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                          <button
                            onClick={() => {
                              setSelectedPartDetail(part);
                              setMobileMenuOpenIndex(null);
                            }}
                            className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 border-b border-slate-100 dark:border-b-slate-800/60"
                          >
                            <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Xem chi tiết
                          </button>
                          <button
                            onClick={() => {
                              setEditingPart(part);
                              setMobileMenuOpenIndex(null);
                            }}
                            className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 border-b border-slate-100 dark:border-b-slate-800/60"
                          >
                            <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Chỉnh sửa
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteItem(part.id);
                              setMobileMenuOpenIndex(null);
                            }}
                            className="w-full text-left px-4 py-3 text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-3"
                          >
                            <Trash2 className="w-4 h-4" /> Xóa sản phẩm
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 px-2 py-0.5 rounded-lg font-mono">
                      #{part.sku || "NO SKU"}
                    </span>
                    {part.category && (
                      <span className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 px-2 py-0.5 rounded-lg uppercase tracking-wider flex items-center gap-1">
                        <Tags className="w-3 h-3 text-blue-500/80 dark:text-blue-400/80" />
                        {part.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom row: Business Indicators — Scientific Layout */}
                <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800/50">
                  <div className="flex items-center justify-between gap-4">
                    {/* Price Grid wrapped in a subtle glassy inner panel */}
                    <div className="flex-1 bg-slate-50 dark:bg-[#0B0F19]/60 border border-slate-200 dark:border-slate-800/50 rounded-xl px-3 py-2 flex items-center justify-between gap-3 shadow-inner">
                      {/* Giá bán lẻ - Nổi bật nhất */}
                      <div className="flex flex-col text-left">
                        <span className="text-[8px] font-bold text-blue-600/80 dark:text-blue-400/80 uppercase tracking-widest mb-0.5">
                          Giá Bán
                        </span>
                        <span className="text-[14px] font-extrabold text-blue-600 dark:text-blue-400 font-mono tracking-tight leading-none">
                          {formatCurrency(retailPrice)}
                        </span>
                      </div>

                      <div className="w-px h-5 bg-slate-200 dark:bg-slate-800/60 shrink-0" />

                      {/* Giá sỉ */}
                      <div className="flex flex-col text-left">
                        <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">
                          Giá Sỉ
                        </span>
                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300 font-mono tracking-tight leading-none">
                          {formatCurrency(wholesalePrice)}
                        </span>
                      </div>

                      {isOwner && (
                        <>
                          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800/60 shrink-0" />
                          {/* Giá nhập (chỉ Owner) */}
                          <div className="flex flex-col text-left">
                            <span className="text-[8px] font-bold text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-widest mb-0.5">
                              Giá Nhập
                            </span>
                            <span className="text-[13px] font-bold text-emerald-600 dark:text-[#34d399] font-mono tracking-tight leading-none">
                              {formatCurrency(costPrice)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Premium Glowing Stock Badge */}
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className={`relative flex items-center justify-center w-12 h-12 rounded-2xl border-2 transition-all shadow-md ${
                          available === 0
                            ? "bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-[0_2px_8px_rgba(239,68,68,0.08)] dark:shadow-[0_2px_8px_rgba(239,68,68,0.15)]"
                            : available <= LOW_STOCK_THRESHOLD
                            ? "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-[0_2px_8px_rgba(245,158,11,0.08)] dark:shadow-[0_2px_8px_rgba(245,158,11,0.15)]"
                            : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_2px_8px_rgba(16,185,129,0.08)] dark:shadow-[0_2px_8px_rgba(16,185,129,0.15)]"
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center leading-none">
                          <span className="text-[15px] font-extrabold">{available}</span>
                          <span className="text-[7.5px] font-black uppercase mt-0.5 opacity-80 tracking-widest">
                            Tồn
                          </span>
                        </div>
                        {/* Small indicator dot */}
                        <div
                          className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#131926] ${
                            available === 0
                              ? "bg-rose-500 animate-pulse"
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
          );
        })}
      </div>
    </div>
  );
};

export default InventoryMobileCards;
