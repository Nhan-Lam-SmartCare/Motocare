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
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            <th className="px-4 py-4 text-center w-12">
              <input
                type="checkbox"
                checked={
                  selectedItems.length === filteredParts.length &&
                  filteredParts.length > 0
                }
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-md border-slate-300 dark:border-slate-700 focus:ring-blue-500/20 transition-all cursor-pointer"
              />
            </th>
            <th
              className="px-4 py-4 text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors select-none group"
              onClick={() => handleSort("name")}
            >
              <div className="flex items-center gap-1.5">
                <Package
                  className={`w-3.5 h-3.5 transition-colors ${
                    sortField === "name"
                      ? "text-blue-500"
                      : "text-slate-400 group-hover:text-blue-500"
                  }`}
                />
                <span
                  className={`transition-colors ${
                    sortField === "name"
                      ? "text-slate-900 dark:text-white"
                      : "group-hover:text-slate-900 dark:group-hover:text-white"
                  }`}
                >
                  Sản phẩm
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-all duration-300 ${
                    sortField === "name"
                      ? sortDirection === "asc"
                        ? "rotate-180 text-blue-500"
                        : "text-blue-500"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                />
              </div>
            </th>
            <th
              className="px-4 py-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors select-none group"
              onClick={() => handleSort("stock")}
            >
              <div className="flex items-center justify-end gap-1.5">
                <Hash
                  className={`w-3.5 h-3.5 transition-colors ${
                    sortField === "stock"
                      ? "text-amber-500"
                      : "text-slate-400 group-hover:text-amber-500"
                  }`}
                />
                <span
                  className={`transition-colors ${
                    sortField === "stock"
                      ? "text-slate-900 dark:text-white"
                      : "group-hover:text-slate-900 dark:group-hover:text-white"
                  }`}
                >
                  Tồn kho
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-all duration-300 ${
                    sortField === "stock"
                      ? sortDirection === "asc"
                        ? "rotate-180 text-amber-500"
                        : "text-amber-500"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                />
              </div>
            </th>
            {isOwner && (
              <th
                className="px-4 py-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors select-none group"
                onClick={() => handleSort("costPrice")}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <Banknote
                    className={`w-3.5 h-3.5 transition-colors ${
                      sortField === "costPrice"
                        ? "text-emerald-500"
                        : "text-slate-400 group-hover:text-emerald-500"
                    }`}
                  />
                  <span
                    className={`transition-colors ${
                      sortField === "costPrice"
                        ? "text-slate-900 dark:text-white"
                        : "group-hover:text-slate-900 dark:group-hover:text-white"
                    }`}
                  >
                    Giá nhập
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 transition-all duration-300 ${
                      sortField === "costPrice"
                        ? sortDirection === "asc"
                          ? "rotate-180 text-emerald-500"
                          : "text-emerald-500"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </div>
              </th>
            )}
            <th
              className="px-4 py-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors select-none group"
              onClick={() => handleSort("retailPrice")}
            >
              <div className="flex items-center justify-end gap-1.5">
                <Tags
                  className={`w-3.5 h-3.5 transition-colors ${
                    sortField === "retailPrice"
                      ? "text-blue-500"
                      : "text-slate-400 group-hover:text-blue-500"
                  }`}
                />
                <span
                  className={`transition-colors ${
                    sortField === "retailPrice"
                      ? "text-slate-900 dark:text-white"
                      : "group-hover:text-slate-900 dark:group-hover:text-white"
                  }`}
                >
                  Giá bán
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-all duration-300 ${
                    sortField === "retailPrice"
                      ? sortDirection === "asc"
                        ? "rotate-180 text-blue-500"
                        : "text-blue-500"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                />
              </div>
            </th>
            <th
              className="px-4 py-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors select-none group"
              onClick={() => handleSort("totalValue")}
            >
              <div className="flex items-center justify-end gap-1.5">
                <BarChart3
                  className={`w-3.5 h-3.5 transition-colors ${
                    sortField === "totalValue"
                      ? "text-purple-500"
                      : "text-slate-400 group-hover:text-purple-500"
                  }`}
                />
                <span
                  className={`transition-colors ${
                    sortField === "totalValue"
                      ? "text-slate-900 dark:text-white"
                      : "group-hover:text-slate-900 dark:group-hover:text-white"
                  }`}
                >
                  Giá trị tồn
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-all duration-300 ${
                    sortField === "totalValue"
                      ? sortDirection === "asc"
                        ? "rotate-180 text-purple-500"
                        : "text-purple-500"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                />
              </div>
            </th>
            <th className="px-4 py-4 text-center w-24">HÀNH ĐỘNG</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
          {filteredParts.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="px-4 py-6 text-center text-slate-400 dark:text-slate-500"
              >
                <div className="text-4xl mb-2">🗂️</div>
                <div className="text-sm">Không có sản phẩm nào</div>
                <div className="text-xs">
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

              const stockQtyClass =
                available === 0
                  ? "text-red-600 dark:text-red-400"
                  : available <= LOW_STOCK_THRESHOLD
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-900 dark:text-slate-100";
              const rowHighlight = isSelected
                ? "bg-blue-900/20 dark:bg-blue-900/20"
                : isDuplicate
                ? "bg-orange-500/10 border-l-4 border-l-orange-500"
                : "";

              return (
                <tr
                  key={part.id}
                  className={`group border-b border-slate-50 dark:border-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-200 ${rowHighlight}`}
                >
                  <td className="px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) =>
                        handleSelectItem(part.id, e.target.checked)
                      }
                      className="w-4 h-4 text-blue-600 rounded-md border-slate-300 dark:border-slate-700 focus:ring-blue-500/20 transition-all cursor-pointer opacity-50 group-hover:opacity-100"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 dark:text-white leading-none tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {part.name}
                          </span>
                          {isDuplicate && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-black text-amber-500 uppercase tracking-widest">
                              TRÙNG MÃ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
                            {part.sku || "N/A"}
                          </span>
                          {part.category && (
                            <span className="text-[10px] font-bold text-blue-500/70 uppercase tracking-widest">
                              {part.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[15px] font-black font-mono tracking-tight ${stockQtyClass}`}
                      >
                        {available.toLocaleString()}
                      </span>
                      {activeReserved > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReservedInfoPartId(part.id);
                          }}
                          className="text-[10px] font-bold text-amber-500 uppercase tracking-widest hover:underline active:scale-95 bg-amber-500/10 px-1.5 py-0.5 rounded"
                        >
                          Giữ: {activeReserved}
                        </button>
                      )}
                    </div>
                  </td>
                  {isOwner && (
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="text-[13px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                        {formatCurrency(costPrice)}
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <div className="text-[15px] font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
                      {formatCurrency(retailPrice)}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                      Sỉ: {formatCurrency(wholesalePrice)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <div className="text-[15px] font-black text-slate-900 dark:text-white font-mono tracking-tight">
                      {formatCurrency(value)}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <div className="relative flex justify-end">
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
                        className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded transition"
                        aria-haspopup="menu"
                        aria-expanded={openActionRow === part.id}
                        title="Thao tác nhanh"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      {openActionRow === part.id && (
                        <div
                          className="fixed w-44 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white shadow-xl dark:bg-slate-800 z-[9999]"
                          style={{
                            top: inventoryDropdownPos.top,
                            right: inventoryDropdownPos.right,
                          }}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedPartDetail(part);
                              setOpenActionRow(null);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-t-xl"
                          >
                            <Eye className="h-4 w-4 text-emerald-500" />
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
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-700"
                          >
                            <Edit className="h-4 w-4 text-blue-500" />
                            Chỉnh sửa
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenActionRow(null);
                              handleDeleteItem(part.id);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-slate-700/70 rounded-b-xl"
                          >
                            <Trash2 className="h-4 w-4" />
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
  );
};

export default InventoryDesktopTable;
