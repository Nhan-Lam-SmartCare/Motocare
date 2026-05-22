import React from "react";
import {
  Package,
  Hash,
  Banknote,
  Tags,
  BarChart3,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "../../../utils/format";
import { showToast } from "../../../utils/toast";

interface InventoryDesktopTableProps {
  filteredParts: any[];
  currentBranchId: string;
  selectedItems: string[];
  handleSelectAll: (checked: boolean) => void;
  handleSelectItem: (id: string, checked: boolean) => void;
  handleSort: (field: string) => void;
  sortField: string | null;
  sortDirection: "asc" | "desc";
  isOwner: boolean;
  duplicateSkus: Set<string>;
  activeReservedByPartId: Map<string, number>;
  setReservedInfoPartId: (id: string) => void;
  LOW_STOCK_THRESHOLD: number;
  openActionRow: string | null;
  setOpenActionRow: React.Dispatch<React.SetStateAction<string | null>>;
  inventoryDropdownPos: { top: number; right: number };
  setInventoryDropdownPos: React.Dispatch<React.SetStateAction<{ top: number; right: number }>>;
  setSelectedPartDetail: (part: any) => void;
  setEditingPart: (part: any) => void;
  handleDeleteItem: (id: string) => void;
  canUpdatePart: boolean;
}

const InventoryDesktopTable: React.FC<InventoryDesktopTableProps> = ({
  filteredParts,
  currentBranchId,
  selectedItems,
  handleSelectAll,
  handleSelectItem,
  handleSort,
  sortField,
  sortDirection,
  isOwner,
  duplicateSkus,
  activeReservedByPartId,
  setReservedInfoPartId,
  LOW_STOCK_THRESHOLD,
  openActionRow,
  setOpenActionRow,
  inventoryDropdownPos,
  setInventoryDropdownPos,
  setSelectedPartDetail,
  setEditingPart,
  handleDeleteItem,
  canUpdatePart,
}) => {
  return (
    <div className="hidden sm:block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#131926]/20 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead className="bg-slate-50/90 dark:bg-[#0D121F]/90 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800/80">
            <tr className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="px-5 py-4 text-center w-14">
                <input
                  type="checkbox"
                  checked={
                    selectedItems.length === filteredParts.length &&
                    filteredParts.length > 0
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4.5 h-4.5 rounded-lg border-slate-300 dark:border-slate-700/80 bg-slate-50 dark:bg-[#0B0F19]/80 text-blue-500 focus:ring-blue-500/30 transition-all cursor-pointer focus:ring-offset-0 focus:outline-none accent-blue-600"
                />
              </th>
              <th
                className="px-5 py-4 text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors select-none group"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-2">
                  <Package
                    className={`w-4 h-4 transition-colors ${
                      sortField === "name"
                        ? "text-blue-400"
                        : "text-slate-500 group-hover:text-blue-400"
                    }`}
                  />
                  <span
                    className={`transition-colors ${
                      sortField === "name"
                        ? "text-slate-900 dark:text-white font-bold"
                        : "group-hover:text-slate-900 dark:group-hover:text-white"
                    }`}
                  >
                    Sản phẩm
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-all duration-300 ${
                      sortField === "name"
                        ? sortDirection === "asc"
                          ? "rotate-180 text-blue-400"
                          : "text-blue-400"
                        : "opacity-0 group-hover:opacity-100 text-slate-500 dark:text-slate-500"
                    }`}
                  />
                </div>
              </th>
              <th
                className="px-5 py-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors select-none group"
                onClick={() => handleSort("stock")}
              >
                <div className="flex items-center justify-end gap-2">
                  <Hash
                    className={`w-4 h-4 transition-colors ${
                      sortField === "stock"
                        ? "text-amber-400"
                        : "text-slate-500 group-hover:text-amber-400"
                    }`}
                  />
                  <span
                    className={`transition-colors ${
                      sortField === "stock"
                        ? "text-slate-900 dark:text-white font-bold"
                        : "group-hover:text-slate-900 dark:group-hover:text-white"
                    }`}
                  >
                    Tồn kho
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-all duration-300 ${
                      sortField === "stock"
                        ? sortDirection === "asc"
                          ? "rotate-180 text-amber-400"
                          : "text-amber-400"
                        : "opacity-0 group-hover:opacity-100 text-slate-500 dark:text-slate-500"
                    }`}
                  />
                </div>
              </th>
              {isOwner && (
                <th
                  className="px-5 py-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors select-none group"
                  onClick={() => handleSort("costPrice")}
                >
                  <div className="flex items-center justify-end gap-2">
                    <Banknote
                      className={`w-4 h-4 transition-colors ${
                        sortField === "costPrice"
                          ? "text-emerald-400"
                          : "text-slate-500 group-hover:text-emerald-400"
                      }`}
                    />
                    <span
                      className={`transition-colors ${
                        sortField === "costPrice"
                          ? "text-slate-900 dark:text-white font-bold"
                          : "group-hover:text-slate-900 dark:group-hover:text-white"
                      }`}
                    >
                      Giá nhập
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-all duration-300 ${
                        sortField === "costPrice"
                          ? sortDirection === "asc"
                            ? "rotate-180 text-emerald-400"
                            : "text-emerald-400"
                          : "opacity-0 group-hover:opacity-100 text-slate-500 dark:text-slate-500"
                      }`}
                    />
                  </div>
                </th>
              )}
              <th
                className="px-5 py-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors select-none group"
                onClick={() => handleSort("retailPrice")}
              >
                <div className="flex items-center justify-end gap-2">
                  <Tags
                    className={`w-4 h-4 transition-colors ${
                      sortField === "retailPrice"
                        ? "text-blue-400"
                        : "text-slate-500 group-hover:text-blue-400"
                    }`}
                  />
                  <span
                    className={`transition-colors ${
                      sortField === "retailPrice"
                        ? "text-slate-900 dark:text-white font-bold"
                        : "group-hover:text-slate-900 dark:group-hover:text-white"
                    }`}
                  >
                    Giá bán
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-all duration-300 ${
                      sortField === "retailPrice"
                        ? sortDirection === "asc"
                          ? "rotate-180 text-blue-400"
                          : "text-blue-400"
                        : "opacity-0 group-hover:opacity-100 text-slate-500 dark:text-slate-500"
                    }`}
                  />
                </div>
              </th>
              <th
                className="px-5 py-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors select-none group"
                onClick={() => handleSort("totalValue")}
              >
                <div className="flex items-center justify-end gap-2">
                  <BarChart3
                    className={`w-4 h-4 transition-colors ${
                      sortField === "totalValue"
                        ? "text-purple-400"
                        : "text-slate-500 group-hover:text-purple-400"
                    }`}
                  />
                  <span
                    className={`transition-colors ${
                      sortField === "totalValue"
                        ? "text-slate-900 dark:text-white font-bold"
                        : "group-hover:text-slate-900 dark:group-hover:text-white"
                    }`}
                  >
                    Giá trị tồn
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-all duration-300 ${
                      sortField === "totalValue"
                        ? sortDirection === "asc"
                          ? "rotate-180 text-purple-400"
                          : "text-purple-400"
                        : "opacity-0 group-hover:opacity-100 text-slate-500 dark:text-slate-500"
                    }`}
                  />
                </div>
              </th>
              <th className="px-5 py-4 text-center w-28 text-slate-500 dark:text-slate-400">HÀNH ĐỘNG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white/50 dark:bg-[#131926]/30">
          {filteredParts.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="px-5 py-12 text-center text-slate-500"
              >
                <div className="text-5xl mb-3 animate-pulse">🗂️</div>
                <div className="text-[15px] font-bold text-slate-300">Không có sản phẩm nào</div>
                <div className="text-xs text-slate-500 mt-1">
                  Hãy thử một bộ lọc khác hoặc thêm sản phẩm mới
                </div>
              </td>
            </tr>
          ) : (
            filteredParts.map((part) => {
              const branchKey = currentBranchId || "";
              const stock = part.stock?.[branchKey] || 0;
              const reserved = part.reservedstock?.[branchKey] || 0;
              const activeReserved = activeReservedByPartId.get(part.id) || 0;
              const available = Math.max(0, stock - reserved);
              const retailPrice = part.retailPrice?.[branchKey] || 0;
              const wholesalePrice = part.wholesalePrice?.[branchKey] || 0;
              const costPrice = part.costPrice?.[branchKey] || 0;
              const value = available * costPrice;
              const isSelected = selectedItems.includes(part.id);
              const isDuplicate = duplicateSkus.has(part.sku || "");

              // Sleek, glowing status dot & border indicator based on available quantity
              let stockStatusGlow = "text-emerald-605 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/30";
              let stockStatusText = "text-emerald-600 dark:text-emerald-400";
              let statusText = "Còn hàng";
              let statusDot = "bg-emerald-500 dark:shadow-[0_0_10px_#10b981]";

              if (available === 0) {
                stockStatusGlow = "text-rose-605 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/30";
                stockStatusText = "text-rose-600 dark:text-rose-400";
                statusText = "Hết hàng";
                statusDot = "bg-rose-500 dark:shadow-[0_0_10px_#f43f5e]";
              } else if (available <= LOW_STOCK_THRESHOLD) {
                stockStatusGlow = "text-amber-605 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/30";
                stockStatusText = "text-amber-600 dark:text-amber-400";
                statusText = "Sắp hết";
                statusDot = "bg-amber-500 dark:shadow-[0_0_10px_#f59e0b]";
              }

              const rowHighlight = isSelected
                ? "bg-blue-50 dark:bg-blue-600/10 border-l border-l-blue-500"
                : isDuplicate
                ? "bg-amber-50/50 dark:bg-amber-500/5 border-l border-l-amber-500/80"
                : "border-l border-l-transparent";

              const isActive = openActionRow === part.id;
              return (
                <tr
                  key={part.id}
                  className={`group hover:bg-slate-50 dark:hover:bg-[#1E293B]/45 transition-all duration-200 ${rowHighlight} ${
                    isActive ? "relative z-30" : ""
                  }`}
                >
                  <td className="px-5 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) =>
                        handleSelectItem(part.id, e.target.checked)
                      }
                      className="w-4.5 h-4.5 rounded-lg border-slate-305 dark:border-slate-700/80 bg-slate-50 dark:bg-[#0B0F19]/80 text-blue-500 focus:ring-blue-500/30 transition-all cursor-pointer accent-blue-600"
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-slate-800 dark:text-slate-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {part.name}
                          </span>
                          {isDuplicate && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[9px] font-black text-amber-500 tracking-wider">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              TRÙNG MÃ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black font-mono text-slate-600 dark:text-slate-400 tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-[#0B0F19]/80 rounded border border-slate-200 dark:border-slate-800/80">
                            {part.sku || "N/A"}
                          </span>
                          {part.category && (
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400/80 uppercase tracking-wider px-2 py-0.5 bg-blue-50 dark:bg-blue-500/5 rounded border border-blue-100 dark:border-blue-500/10">
                              {part.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${statusDot}`} />
                        <span className={`text-[15px] font-black font-mono tracking-tight ${stockStatusText}`}>
                          {available.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border ${stockStatusGlow}`}>
                          {statusText}
                        </span>
                        {activeReserved > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReservedInfoPartId(part.id);
                            }}
                            className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider hover:bg-amber-100 dark:hover:bg-amber-500/25 active:scale-95 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 px-1.5 py-0.5 rounded transition-all"
                          >
                            Giữ: {activeReserved}
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  {isOwner && (
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="text-[13px] font-bold text-slate-650 dark:text-slate-400 font-mono">
                        {formatCurrency(costPrice)}
                      </div>
                    </td>
                  )}
                  <td className="px-5 py-4 whitespace-nowrap text-right">
                    <div className="text-[15px] font-black text-cyan-600 dark:text-cyan-400 font-mono tracking-tight drop-shadow-[0_0_10px_rgba(34,211,238,0.15)]">
                      {formatCurrency(retailPrice)}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-none mt-1">
                      Sỉ: <span className="font-mono text-slate-600 dark:text-slate-400 font-bold">{formatCurrency(wholesalePrice)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right">
                    <div className="text-[15px] font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight drop-shadow-[0_0_10px_rgba(52,211,153,0.15)]">
                      {formatCurrency(value)}
                    </div>
                  </td>
                  <td className={`px-5 py-2 whitespace-nowrap text-center ${isActive ? "relative z-30" : ""}`}>
                    <div className="relative flex justify-center">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          const rect = event.currentTarget.getBoundingClientRect();
                          setInventoryDropdownPos({
                            top: rect.bottom + 4,
                            right: window.innerWidth - rect.right,
                          });
                          setOpenActionRow((prev) =>
                            prev === part.id ? null : part.id
                          );
                        }}
                        className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/80 active:scale-95"
                        aria-haspopup="menu"
                        aria-expanded={openActionRow === part.id}
                        title="Thao tác nhanh"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      {openActionRow === part.id && (
                        <div
                          className="absolute right-0 top-full mt-1.5 w-44 overflow-hidden rounded-2xl border border-slate-205 dark:border-slate-700/60 bg-white dark:bg-[#0F172A]/95 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl z-[9999] p-1.5 animate-in fade-in slide-in-from-top-2 duration-150"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedPartDetail(part);
                              setOpenActionRow(null);
                            }}
                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E293B]/80 rounded-xl transition-all duration-150"
                          >
                            <Eye className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                            Xem chi tiết
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!canUpdatePart) {
                                showToast.error("Bạn không có quyền sửa phụ tùng");
                                return;
                              }
                              setEditingPart(part);
                              setOpenActionRow(null);
                            }}
                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E293B]/80 rounded-xl transition-all duration-150"
                          >
                            <Edit className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                            Chỉnh sửa
                          </button>
                          <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1" />
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenActionRow(null);
                              handleDeleteItem(part.id);
                            }}
                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-rose-600 dark:text-rose-450 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all duration-150"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
  );
};

export default InventoryDesktopTable;
