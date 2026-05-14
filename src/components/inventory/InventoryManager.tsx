import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { canDo } from "../../utils/permissions";
import {
  Boxes,
  Package,
  Search,
  FileText,
  Filter,
  Edit,
  Trash2,
  Plus,
  Repeat,
  UploadCloud,
  DownloadCloud,
  MoreHorizontal,
  ShoppingCart,
  ScanLine,
  Eye,
  X,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  Hash,
  Banknote,
  Tags,
  BarChart3,
  Settings,
} from "lucide-react";
import { useAppContext } from "../../contexts/AppContext";
import { safeAudit } from "../../lib/repository/auditLogsRepository";
import { supabase } from "../../supabaseClient";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  usePartsRepoPaged,
  useCreatePartRepo,
  useUpdatePartRepo,
  useDeletePartRepo,
} from "../../hooks/usePartsRepository";
import { formatCurrency, formatDate, normalizeSearchText } from "../../utils/format";
import { getCategoryColor } from "../../utils/categoryColors";
import {
  exportPartsToExcel,
  exportInventoryTemplate,
  importPartsFromExcelDetailed,
} from "../../utils/excel";
import { showToast } from "../../utils/toast";
import { useConfirm } from "../../hooks/useConfirm";
import ConfirmModal from "../common/ConfirmModal";
import CategoriesManager from "../categories/CategoriesManager";
import LookupManager from "../lookup/LookupManager";
import ExternalPartsLookup from "../inventory/ExternalPartsLookup";
import LookupManagerMobile from "../lookup/LookupManagerMobile";
import {
  useInventoryTxRepo,
  useCreateInventoryTxRepo,
  useCreateReceiptAtomicRepo,
} from "../../hooks/useInventoryTransactionsRepository";
import {
  useWorkOrdersRepo,
  useUpdateWorkOrderAtomicRepo,
} from "../../hooks/useWorkOrdersRepository";
import { useSuppliers } from "../../hooks/useSuppliers";
import { useCategories } from "../../hooks/useCategories";
import { useStoreSettings } from "../../hooks/useStoreSettings";
import type { Part, WorkOrder, InventoryTransaction } from "../../types";
import { createPart } from "../../lib/repository/partsRepository";
import { createCashTransaction } from "../../lib/repository/cashTransactionsRepository";
import InventoryHistorySectionMobile from "../inventory/InventoryHistorySectionMobile";
import BatchPrintBarcodeModal from "../inventory/BatchPrintBarcodeModal";
import BarcodeScannerModal from "../common/BarcodeScannerModal";
import { PurchaseOrdersList } from "../purchase-orders/PurchaseOrdersList";
import CreatePOModal from "../purchase-orders/CreatePOModal";
import { PODetailView } from "../purchase-orders/PODetailView";
import { ExternalDataImport } from "../inventory/ExternalDataImport";
import type { PurchaseOrder } from "../../types";
import EditReceiptModal from "../inventory/components/EditReceiptModal";
// Extracted modals
import GoodsReceiptMobileWrapper from "./modals/GoodsReceiptMobileWrapper";
import GoodsReceiptModal from "./modals/GoodsReceiptModal";
import InventoryHistorySection from "./InventoryHistorySection";
import ImportInventoryModal from "./modals/ImportInventoryModal";
import EditPartModal from "./modals/EditPartModal";
import InventoryMobileCards from "./components/InventoryMobileCards";
import InventoryDesktopTable from "./components/InventoryDesktopTable";
import InventoryHeader from "./components/InventoryHeader";
import { useInventoryManager } from "./hooks/useInventoryManager";

const LOW_STOCK_THRESHOLD = 5;


// Main Inventory Manager Component (New)
const InventoryManagerNew: React.FC = () => {
  const {
    searchParams, setSearchParams, activeTab, setActiveTab, showGoodsReceipt, setShowGoodsReceipt, showCreatePO, setShowCreatePO, selectedPO, setSelectedPO, editingPO, setEditingPO, searchInput, setSearchInput, search, setSearch, categoryFilter, setCategoryFilter, stockFilter, setStockFilter, showDuplicatesOnly, setShowDuplicatesOnly, showBarcodeScanner, setShowBarcodeScanner, page, setPage, pageSize, setPageSize, sortField, setSortField, sortDirection, setSortDirection, selectedItems, setSelectedItems, editingPart, setEditingPart, selectedPartDetail, setSelectedPartDetail, editingReceipt, setEditingReceipt, showImportModal, setShowImportModal, reservedInfoPartId, setReservedInfoPartId, showExternalImport, setShowExternalImport, showBatchPrintModal, setShowBatchPrintModal, mobileMenuOpenIndex, setMobileMenuOpenIndex, showAdvancedFilters, setShowAdvancedFilters, showAlertsSection, setShowAlertsSection, openActionRow, setOpenActionRow, inventoryDropdownPos, setInventoryDropdownPos, showReorderAlert, setShowReorderAlert, reorderSelectedIds, setReorderSelectedIds, currentBranchId, createInventoryTxAsync, updateWorkOrderAtomic, invTx, storeSettings, confirm, confirmState, handleConfirm, handleCancel, workOrders, suppliers, allPartsData, refetchAllParts, duplicatePartsData, allCategories, profile, createReceiptAtomicMutation, retailMarkup, wholesaleMarkup, allImports, lastImport, extractSupplierName, getAvatarColor, isSearching, effectivePage, effectivePageSize, partsLoading, refetchInventory, activeReservedByPartId, repoParts, totalParts, totalPages, stockHealth, reorderAlertItems, reorderGroupedBySupplier, stockQuickFilters, duplicateSkus, hasDuplicateSku, filteredParts, totalStockQuantity, totalStockValue, queryClient, updatePartMutation, createPartMutation, deletePartMutation, canImportInventory, canUpdatePart, canDeletePart, handleSaveGoodsReceipt, handleSelectAll, handleSelectItem, handleDeleteItem, handleBulkDelete, handleSaveEditedReceipt, handleDeleteReceipt, handleStockFilterChange, handleCategoryFilterChange, handleSort, shouldShowLowStockBanner, handleExportExcel, handleDownloadTemplate
  } = useInventoryManager();
  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 sm:bg-[#1e293b]">
      {/* Desktop Header - Compact */}
      <div className="hidden sm:block bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-1.5">
        <div className="flex items-center justify-between gap-3">
          {/* Tabs - Compact */}
          <div className="flex gap-1">
            {[
              {
                key: "stock",
                label: "Tồn kho",
                icon: <Boxes className="w-3.5 h-3.5" />,
              },
              {
                key: "categories",
                label: "Danh mục",
                icon: <Package className="w-3.5 h-3.5" />,
              },
              {
                key: "purchase-orders",
                label: "Đơn đặt hàng",
                icon: <Package className="w-3.5 h-3.5" />,
              },
              {
                key: "lookup",
                label: "Tra cứu",
                icon: <Search className="w-3.5 h-3.5" />,
              },
              {
                key: "history",
                label: "Lịch sử",
                icon: <FileText className="w-3.5 h-3.5" />,
              },
              {
                key: "external-lookup",
                label: "Tra cứu ngoài",
                icon: <Search className="w-3.5 h-3.5" />,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-700"
                  }`}
              >
                <span className="inline-flex items-center gap-1">
                  {tab.icon}
                  {tab.label}
                </span>
              </button>
            ))}
          </div>

          {/* Action Buttons - Compact */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBatchPrintModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 text-emerald-400 border border-slate-700/50 text-xs font-medium hover:bg-slate-700 hover:text-emerald-300 hover:border-emerald-500/30 transition"
              title="In mã vạch hàng loạt"
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
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
              In mã vạch
            </button>

            {canDo(profile?.role, "inventory.import") && (
              <button
                onClick={() => setShowGoodsReceipt(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 text-blue-400 border border-slate-700/50 text-xs font-medium hover:bg-slate-700 hover:text-blue-300 hover:border-blue-500/30 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Tạo phiếu nhập
              </button>
            )}
            <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 px-1 py-0.5">
              {canDo(profile?.role, "inventory.import") && (
                <button
                  onClick={() => {
                    showToast.info("Tính năng chuyển kho đang phát triển");
                  }}
                  className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-white dark:bg-slate-800 transition"
                  title="Chuyển kho"
                >
                  <Repeat className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleExportExcel}
                className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-white dark:bg-slate-800 transition"
                title="Xuất Excel"
              >
                <UploadCloud className="w-3.5 h-3.5" />
              </button>
              {canDo(profile?.role, "inventory.import") && (
                <>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-white dark:bg-slate-800 transition"
                    title="Nhập CSV"
                  >
                    <DownloadCloud className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowExternalImport(true)}
                    className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-white dark:bg-slate-800 transition"
                    title="Nhập dữ liệu từ bên ngoài"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleDownloadTemplate}
                    className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-white dark:bg-slate-800 transition"
                    title="Tải mẫu import"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header - Compact & Clean */}
      <div className="sm:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-3">
        {/* Search and Create Button Row */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, SKU, danh mục..."
              value={searchInput}
              onChange={(e) => {
                setPage(1);
                setSearchInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchInput.trim()) {
                  // Search on Enter
                  setSearch(searchInput);
                }
              }}
              className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Barcode Scan Button */}
          <button
            onClick={() => setShowBarcodeScanner(true)}
            className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors border border-slate-300 dark:border-slate-600"
            title="Quét mã vạch"
          >
            <ScanLine className="w-5 h-5 text-purple-500" />
          </button>

          {/* Create Button */}
          {canDo(profile?.role, "inventory.import") && (
            <button
              onClick={() => setShowGoodsReceipt(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-lg text-sm font-semibold transition whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Tạo phiếu
            </button>
          )}
        </div>

        {/* Inline Stats */}
        <div className="flex items-center justify-between text-xs mt-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-slate-500 dark:text-slate-400">Tổng:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {totalStockQuantity.toLocaleString()} sp
              </span>
            </div>
            <div className="h-3 w-px bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 dark:text-slate-400">
                Giá trị:
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatCurrency(totalStockValue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Filters - Compact for small screens */}
      {activeTab === "stock" && (
        <InventoryHeader
          totalStockQuantity={totalStockQuantity}
          totalStockValue={totalStockValue}
          stockHealth={stockHealth}
          handleStockFilterChange={handleStockFilterChange}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          setPage={setPage}
          filteredPartsLength={filteredParts.length}
          totalParts={totalParts}
          isSearching={isSearching}
          reorderGroupedBySupplierLength={reorderGroupedBySupplier.length}
          duplicateSkusSize={duplicateSkus.size}
          showAlertsSection={showAlertsSection}
          setShowAlertsSection={setShowAlertsSection}
          showAdvancedFilters={showAdvancedFilters}
          setShowAdvancedFilters={setShowAdvancedFilters}
          stockQuickFilters={stockQuickFilters}
          stockFilter={stockFilter}
          setStockFilter={setStockFilter}
          categoryFilter={categoryFilter}
          handleCategoryFilterChange={handleCategoryFilterChange}
          allCategories={allCategories}
          showDuplicatesOnly={showDuplicatesOnly}
          setShowDuplicatesOnly={setShowDuplicatesOnly}
          setCategoryFilter={setCategoryFilter}
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3">
        {activeTab === "stock" && (
          <div className="space-y-2">
            {showAlertsSection && (
              <>
                {/* Reorder Alert Banner */}
            {reorderGroupedBySupplier.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-600 rounded-lg overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setShowReorderAlert((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-amber-500/20 rounded-lg group-hover:scale-110 transition-transform">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-black text-amber-900 dark:text-amber-300 leading-tight">Đề nghị nhập hàng</div>
                      <div className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">
                        {reorderAlertItems.length} sản phẩm bán chạy sắp hết — {reorderGroupedBySupplier.length} nhà cung cấp
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-amber-500 transition-transform duration-300 ${showReorderAlert ? "rotate-180" : ""}`} />
                </button>

                {showReorderAlert && (
                  <div className="border-t border-amber-200 dark:border-amber-700 divide-y divide-amber-100 dark:divide-amber-800/50">
                    {reorderGroupedBySupplier.map((group) => {
                      const groupIds = group.items.map((i: any) => i.id);
                      const allGroupSelected = groupIds.every((id: string) => reorderSelectedIds.has(id));
                      const someGroupSelected = groupIds.some((id: string) => reorderSelectedIds.has(id));

                      return (
                        <div key={group.supplierName} className="">
                          {/* Group header */}
                          <div className="flex items-center justify-between px-3 py-1.5 bg-amber-100/70 dark:bg-amber-900/30">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="rounded border-amber-400"
                                checked={allGroupSelected}
                                ref={(el) => { if (el) el.indeterminate = !allGroupSelected && someGroupSelected; }}
                                onChange={(e) => {
                                  setReorderSelectedIds(prev => {
                                    const next = new Set(prev);
                                    if (e.target.checked) groupIds.forEach((id: string) => next.add(id));
                                    else groupIds.forEach((id: string) => next.delete(id));
                                    return next;
                                  });
                                }}
                              />
                              <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                🏪 {group.supplierName}
                              </span>
                              <span className="text-[10px] text-amber-600 dark:text-amber-400">({group.items.length} sản phẩm)</span>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedItems(groupIds);
                                setShowCreatePO(true);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white transition"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              Đặt hàng NCC này
                            </button>
                          </div>

                          {/* Desktop table */}
                          <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-amber-50 dark:bg-amber-900/10">
                                <tr>
                                  <th className="px-3 py-1.5 w-8"></th>
                                  <th className="text-left px-3 py-1.5 font-semibold text-amber-700 dark:text-amber-400">Tên sản phẩm</th>
                                  <th className="text-left px-3 py-1.5 font-semibold text-amber-700 dark:text-amber-400">Mã SKU</th>
                                  <th className="text-left px-3 py-1.5 font-semibold text-amber-700 dark:text-amber-400">Danh mục</th>
                                  <th className="text-center px-3 py-1.5 font-semibold text-amber-700 dark:text-amber-400">Tồn</th>
                                  <th className="text-center px-3 py-1.5 font-semibold text-amber-700 dark:text-amber-400">Bán 90ng</th>
                                  <th className="text-right px-3 py-1.5 font-semibold text-amber-700 dark:text-amber-400">Giá bán</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.items.map((item: any, idx: number) => {
                                  const isChecked = reorderSelectedIds.has(item.id);
                                  return (
                                    <tr
                                      key={item.id}
                                      onClick={() => setReorderSelectedIds(prev => { const next = new Set(prev); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })}
                                      className={`border-t border-amber-100 dark:border-amber-800/30 cursor-pointer transition ${isChecked ? "bg-amber-100 dark:bg-amber-800/40" : idx % 2 === 0 ? "bg-white dark:bg-slate-800/30 hover:bg-amber-50" : "bg-amber-50/40 dark:bg-amber-900/10 hover:bg-amber-100"
                                        }`}
                                    >
                                      <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                                        <input type="checkbox" className="rounded border-amber-400" checked={isChecked}
                                          onChange={() => setReorderSelectedIds(prev => { const next = new Set(prev); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })}
                                        />
                                      </td>
                                      <td className="px-3 py-1.5 font-medium text-slate-900 dark:text-slate-100">{item.name}</td>
                                      <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400">{item.sku || "—"}</td>
                                      <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{item.category || "Chưa phân loại"}</span></td>
                                      <td className="px-3 py-1.5 text-center"><span className={`font-bold ${item.stock === 0 ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"}`}>{item.stock}</span></td>
                                      <td className="px-3 py-1.5 text-center"><span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold"><TrendingUp className="w-3 h-3" />{item.soldQty}</span></td>
                                      <td className="px-3 py-1.5 text-right text-slate-700 dark:text-slate-300">{formatCurrency(item.retailPrice)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile cards */}
                          <div className="block sm:hidden p-2 space-y-2">
                            {group.items.map((item: any) => {
                              const isChecked = reorderSelectedIds.has(item.id);
                              return (
                                <div key={item.id}
                                  onClick={() => setReorderSelectedIds(prev => { const next = new Set(prev); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })}
                                  className={`rounded-lg p-3 border cursor-pointer transition ${isChecked ? "bg-amber-100 dark:bg-amber-800/40 border-amber-400" : "bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-700"
                                    }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                      <input type="checkbox" className="rounded border-amber-400 mt-0.5 flex-shrink-0" checked={isChecked} onChange={() => { }} onClick={(e) => e.stopPropagation()} />
                                      <div className="min-w-0">
                                        <div className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{item.name}</div>
                                        {item.sku && <div className="text-[10px] text-slate-400 mt-0.5">{item.sku}</div>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                      <div className="text-center"><div className="text-[10px] text-slate-400">Tồn</div><div className={`font-bold text-sm ${item.stock === 0 ? "text-red-600" : "text-orange-500"}`}>{item.stock}</div></div>
                                      <div className="text-center"><div className="text-[10px] text-slate-400">Bán 90ng</div><div className="font-bold text-sm text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />{item.soldQty}</div></div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Footer: global order button */}
                    <div className="px-3 py-2 flex items-center justify-between gap-3 bg-amber-50/70 dark:bg-amber-900/10">
                      <div className="text-[10px] text-amber-700 dark:text-amber-400">
                        * Nhóm theo NCC lần nhập cuối. Bán ≥ 3 trong 90 ngày, tồn ≤ 2.
                      </div>
                      <button
                        disabled={reorderSelectedIds.size === 0}
                        onClick={() => {
                          setSelectedItems(Array.from(reorderSelectedIds));
                          setShowCreatePO(true);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex-shrink-0 ${reorderSelectedIds.size > 0
                          ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                          }`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Đặt hàng đã chọn {reorderSelectedIds.size > 0 ? `(${reorderSelectedIds.size})` : ""}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Duplicate Warning Banner - More compact */}
            {duplicateSkus.size > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/50 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-rose-500/20 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Cảnh báo trùng mã SKU</div>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Phát hiện <span className="text-rose-500">{duplicateSkus.size}</span> bộ mã trùng lặp trong kho hàng.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowDuplicatesOnly((prev) => !prev)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all active:scale-95 ${showDuplicatesOnly
                    ? "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-rose-500 hover:text-rose-500"
                  }`}
                >
                  {showDuplicatesOnly ? "✓ Đang lọc" : "🔍 Xử lý ngay"}
                </button>
              </div>
            )}
              </>
            )}

            {/* Stock Table + Pagination */}
            <div className="rounded-lg overflow-hidden bg-white dark:bg-slate-800">
              {/* Bulk Actions Bar */}
              {selectedItems.length > 0 && (
                <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="text-xs font-medium text-blue-900 dark:text-blue-100">
                    Đã chọn {selectedItems.length} sản phẩm
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowCreatePO(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Đặt hàng ({selectedItems.length})
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Xóa đã chọn
                    </button>
                  </div>
                </div>
              )}
              {/* Mobile Layout: Premium Card Grid */}
              <InventoryMobileCards
                filteredParts={filteredParts}
                currentBranchId={currentBranchId || ""}
                duplicateSkus={duplicateSkus}
                mobileMenuOpenIndex={mobileMenuOpenIndex}
                setMobileMenuOpenIndex={setMobileMenuOpenIndex}
                setSelectedPartDetail={setSelectedPartDetail}
                setEditingPart={setEditingPart}
                handleDeleteItem={handleDeleteItem}
                LOW_STOCK_THRESHOLD={LOW_STOCK_THRESHOLD}
                isOwner={profile?.role === "owner"}
              />

              {/* Desktop / tablet: wide table (hidden on small screens) */}
              <InventoryDesktopTable
                filteredParts={filteredParts}
                currentBranchId={currentBranchId || ""}
                selectedItems={selectedItems}
                handleSelectAll={handleSelectAll}
                handleSelectItem={handleSelectItem}
                handleSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
                isOwner={profile?.role === "owner"}
                duplicateSkus={duplicateSkus}
                activeReservedByPartId={activeReservedByPartId}
                setReservedInfoPartId={setReservedInfoPartId}
                LOW_STOCK_THRESHOLD={LOW_STOCK_THRESHOLD}
                openActionRow={openActionRow}
                setOpenActionRow={setOpenActionRow}
                inventoryDropdownPos={inventoryDropdownPos}
                setInventoryDropdownPos={setInventoryDropdownPos}
                setSelectedPartDetail={setSelectedPartDetail}
                setEditingPart={setEditingPart}
                handleDeleteItem={handleDeleteItem}
                canUpdatePart={canUpdatePart}
              />
              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-center sm:text-left">
                  <span className="font-medium">
                    Trang {isSearching ? 1 : page}/{totalPages}
                  </span>
                  <span className="mx-1">•</span>
                  <span>{isSearching ? filteredParts.length : totalParts} phụ tùng</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    disabled={page === 1 || partsLoading}
                    onClick={() => setPage((p: any) => Math.max(1, p - 1))}
                    className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded disabled:opacity-40 hover:bg-slate-700/50 transition-colors"
                  >
                    ←
                  </button>
                  <span className="px-2 py-1 text-xs sm:text-sm font-medium text-slate-300 min-w-[2rem] text-center">
                    {page}
                  </span>
                  <button
                    disabled={page >= totalPages || partsLoading}
                    onClick={() => setPage((p: any) => Math.min(totalPages, p + 1))}
                    className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded disabled:opacity-40 hover:bg-slate-700/50 transition-colors"
                  >
                    →
                  </button>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      const newSize = Number(e.target.value) || 20;
                      setPageSize(newSize);
                      setPage(1);
                    }}
                    className="px-1.5 sm:px-2 py-1.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded bg-slate-800 text-slate-200"
                  >
                    {[10, 20, 50, 100].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <>
            {/* Desktop Version */}
            <div className="hidden sm:block">
              <InventoryHistorySection transactions={invTx} />
            </div>
            {/* Mobile Version */}
            <div className="sm:hidden">
              <InventoryHistorySectionMobile
                transactions={invTx}
                onEdit={(receipt) => {
                  // Reconstruct the receipt object for editing
                  // We need to find the original transaction or construct a compatible object
                  // For now, we'll use the receipt object passed from the mobile component
                  // which has { receiptCode, date, supplier, items, total }
                  setEditingReceipt(receipt);
                }}
                onDelete={(receipt) => {
                  handleDeleteReceipt(receipt.receiptCode);
                }}
              />
            </div>
          </>
        )}

        {activeTab === "categories" && (
          <div className="bg-[#0f172a] -m-3 sm:-m-6">
            <CategoriesManager />
          </div>
        )}

        {activeTab === "purchase-orders" && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
            {selectedPO ? (
              <PODetailView
                poId={selectedPO.id}
                onClose={() => setSelectedPO(null)}
                onConverted={() => {
                  setSelectedPO(null);
                  refetchInventory();
                }}
              />
            ) : (
              <PurchaseOrdersList
                onCreateNew={() => {
                  setShowCreatePO(true);
                }}
                onViewDetail={(po) => setSelectedPO(po)}
                onEdit={(po) => setEditingPO(po)}
              />
            )}
          </div>
        )}

        {activeTab === "lookup" && (
          <div className="bg-[#0f172a] -m-3 sm:-m-6">
            {/* Desktop Version */}
            <div className="hidden sm:block">
              <LookupManager />
            </div>
            {/* Mobile Version */}
            <div className="sm:hidden">
              <LookupManagerMobile />
            </div>
          </div>
        )}

        {activeTab === "external-lookup" && (
          <div className="bg-white dark:bg-slate-800 -m-3 sm:-m-6 h-full">
            <ExternalPartsLookup />
          </div>
        )}
      </div>

      {/* Modals */}
      {/* Desktop Version - Original */}
      <div className="hidden sm:block">
        <GoodsReceiptModal
          isOpen={showGoodsReceipt}
          onClose={() => setShowGoodsReceipt(false)}
          parts={allPartsData || []}
          currentBranchId={currentBranchId}
          onSave={handleSaveGoodsReceipt}
        />
      </div>

      {/* Mobile Version - New 2-step design */}
      <div className="sm:hidden">
        <GoodsReceiptMobileWrapper
          isOpen={showGoodsReceipt}
          onClose={() => setShowGoodsReceipt(false)}
          parts={allPartsData || []}
          currentBranchId={currentBranchId}
          onSave={handleSaveGoodsReceipt}
        />
      </div>

      {/* Batch Print Barcode Modal */}
      {showBatchPrintModal && (
        <BatchPrintBarcodeModal
          parts={allPartsData || []}
          currentBranchId={currentBranchId}
          onClose={() => setShowBatchPrintModal(false)}
        />
      )}

      {/* Edit Part Modal */}
      {reservedInfoPartId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                Chi tiết hàng đang đặt trước
              </h3>
              <button
                onClick={() => setReservedInfoPartId(null)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <div className="h-5 w-5 flex items-center justify-center text-slate-500">✕</div>
              </button>
            </div>
            <div className="p-0 max-h-[60vh] overflow-y-auto">
              {(() => {
                const part = allPartsData?.find(p => p.id === reservedInfoPartId);

                const reservingOrders = workOrders.filter((wo: WorkOrder) => {
                  if (!wo.partsUsed) return false;

                  // Check if part exists in Work Order
                  const hasPart = wo.partsUsed.some(p => p.partId === reservedInfoPartId);

                  // Logic reserved: 
                  // Chỉ những phiếu CHƯA THANH TOÁN (unpaid/partial) và KHÔNG HỦY mới giữ hàng (Reserved).
                  // Nếu đã thanh toán (paid), hàng đã bị trừ kho (Deducted) nên không còn là Reserved nữa.
                  const isNotCancelled = wo.status !== "Đã hủy";
                  const isNotPaid = wo.paymentStatus !== "paid";

                  return hasPart && isNotCancelled && isNotPaid;
                });

                if (!part) return <div className="p-6 text-center text-slate-500">Không tìm thấy thông tin sản phẩm</div>;

                // const { mutate: updateWorkOrderAtomic } = useUpdateWorkOrderAtomicRepo(); // Moved to top level

                const handleQuickPay = (orderId: string) => {
                  if (window.confirm("Xác nhận đánh dấu phiếu này là ĐÃ THANH TOÁN? Việc này sẽ giải phóng tồn kho đang giữ.")) {
                    updateWorkOrderAtomic({
                      id: orderId,
                      paymentStatus: "paid",
                      totalPaid: reservingOrders.find((wo: any) => wo.id === orderId)?.total || 0,
                    } as any);
                  }
                };

                if (reservingOrders.length === 0) {
                  return (
                    <div className="p-8 text-center flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="text-2xl">✓</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">
                        Không tìm thấy phiếu nào đang giữ hàng này.
                      </p>
                      <p className="text-xs text-slate-500">
                        (Có thể số liệu "Đặt trước" trong kho đang bị lệch so với thực tế)
                      </p>
                      {/* Debug Info */}
                      <div className="mt-4 p-2 bg-slate-100 dark:bg-slate-900 rounded text-[10px] text-slate-400 font-mono text-left w-full overflow-hidden">
                        Part Reserved Qty: {part.reservedstock?.[currentBranchId] || 0} <br />
                        Nghi vấn: Số liệu bị lệch. Hãy thử tạo phiếu mới rồi xóa để reset.
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 border-b border-blue-100 dark:border-blue-900/30">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Sản phẩm: <span className="font-semibold text-blue-600 dark:text-blue-400">{part.name}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Tổng đang giữ: <span className="font-medium text-amber-600">{reservingOrders.reduce((sum: any, wo: any) => sum + (wo.partsUsed?.find((p: any) => p.partId === reservedInfoPartId)?.quantity || 0), 0)}</span>
                      </p>
                    </div>
                    {reservingOrders.map((wo: WorkOrder) => {
                      const item = wo.partsUsed?.find((p: any) => p.partId === reservedInfoPartId);
                      return (
                        <div key={wo.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                {wo.customerName}
                              </div>
                              <div className="text-xs text-slate-500 flex gap-2">
                                <span>{wo.vehicleModel || "Xe lai vãng"}</span>
                                {wo.licensePlate && <span>• {wo.licensePlate}</span>}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className={`px-2 py-0.5 rounded text-[10px] font-medium border
                                 ${wo.status === 'Tiếp nhận' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                  wo.status === 'Đang sửa' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                    wo.status === 'Đã sửa xong' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                      'bg-slate-100 text-slate-600 border-slate-200'}`}
                              >
                                {wo.status}
                              </div>
                              <div className={`text-[10px] font-bold ${wo.paymentStatus === 'paid' ? 'text-emerald-500' :
                                wo.paymentStatus === 'partial' ? 'text-amber-500' : 'text-red-500'
                                }`}>
                                {wo.paymentStatus === 'paid' ? 'Đã TT' : wo.paymentStatus === 'partial' ? 'TT 1 phần' : 'Chưa TT'}
                              </div>
                              {/* Quick Pay Button - Atomic Fix */}
                              {wo.paymentStatus !== 'paid' && (
                                <button
                                  onClick={() => handleQuickPay(wo.id)}
                                  className="mt-1 px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded text-[10px] font-medium transition-colors flex items-center gap-1"
                                  title="Đánh dấu đã thanh toán để trừ tồn kho"
                                >
                                  <span>✓ Đã TT & Trừ kho</span>
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-2 text-sm">
                            <span className="text-slate-500 dark:text-slate-400 text-xs">
                              LH: {wo.customerPhone || "---"}
                            </span>
                            <span className="font-medium text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              SL: {item?.quantity || 0}
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] text-slate-400">
                            Ngày tạo: {new Date(wo.creationDate).toLocaleString('vi-VN')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
              <button
                onClick={() => setReservedInfoPartId(null)}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPartDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Chi tiết phụ tùng
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {selectedPartDetail.name}
                </div>
              </div>
              <button
                onClick={() => setSelectedPartDetail(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Mã/Barcode
                  </div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {selectedPartDetail.barcode || selectedPartDetail.sku || "--"}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Tồn kho hiện tại
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedPartDetail.stock?.[currentBranchId || ""]?.toLocaleString() || 0}
                  </div>
                </div>
              </div>

              <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3">
                <div className="text-xs text-cyan-600 dark:text-cyan-400 mb-1">
                  Lần nhập gần nhất
                </div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {lastImport?.date ? formatDate(new Date(lastImport.date), false) : "--"}
                </div>
                {lastImport && (
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <div>SL: {lastImport.quantity}</div>
                    <div>
                      NCC: {extractSupplierName(lastImport.notes) || "--"}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Lịch sử nhập ({allImports.length})
                </h4>
                {allImports.length === 0 ? (
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Chưa có dữ liệu nhập
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[40vh] overflow-auto pr-1">
                    {allImports.map((tx: any) => (
                      <div
                        key={tx.id}
                        className="flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {formatDate(new Date(tx.date), false)}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            SL: {tx.quantity} • NCC: {extractSupplierName(tx.notes) || "--"}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {formatCurrency(tx.totalPrice || tx.quantity * (tx.unitPrice || 0))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Part Modal */}
      {editingPart && (
        <EditPartModal
          part={editingPart}
          onClose={() => setEditingPart(null)}
          onSave={(updatedPart) => {
            if (!canUpdatePart) {
              showToast.error("Bạn không có quyền sửa phụ tùng");
              return;
            }

            // Only send fields that are allowed in database schema
            const updates: Partial<Part> = {
              name: updatedPart.name,
              barcode: updatedPart.barcode,
              category: updatedPart.category,
              stock: updatedPart.stock,
              retailPrice: updatedPart.retailPrice,
              wholesalePrice: updatedPart.wholesalePrice,
            };
            // Try to add costPrice if it exists in schema
            if (updatedPart.costPrice) {
              updates.costPrice = updatedPart.costPrice;
            }
            updatePartMutation.mutate({
              id: updatedPart.id,
              updates,
            });
            setEditingPart(null);
          }}
          currentBranchId={currentBranchId}
        />
      )}

      {/* Edit Receipt Modal */}
      {editingReceipt && (
        <EditReceiptModal
          onClose={() => setEditingReceipt(null)}
          receipt={editingReceipt}
          onSave={handleSaveEditedReceipt}
          currentBranchId={currentBranchId}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportInventoryModal
          onClose={() => setShowImportModal(false)}
          onDownloadTemplate={handleDownloadTemplate}
          onImport={async (file) => {
            try {
              const { items: importedData, errors: rowErrors } =
                await importPartsFromExcelDetailed(file, currentBranchId);

              if (importedData.length === 0) {
                const msg = rowErrors.length
                  ? `Không import được: ${rowErrors.slice(0, 3).join("; ")}`
                  : "File không có dữ liệu hợp lệ";
                throw new Error(msg);
              }

              // OPTIMIZATION: Batch fetch all parts by SKU in one query
              const allSkus = importedData.map((item) => item.sku);

              // Check for duplicate SKUs in import file
              const skuCounts = new Map<string, number>();
              allSkus.forEach((sku) => {
                skuCounts.set(sku, (skuCounts.get(sku) || 0) + 1);
              });
              const duplicates = Array.from(skuCounts.entries())
                .filter(([_, count]) => count > 1)
                .map(([sku, count]) => `${sku}(${count}x)`);

              if (duplicates.length > 0) {
                console.warn(
                  `⚠️ Duplicate SKUs in file: ${duplicates
                    .slice(0, 5)
                    .join(", ")}`
                );
              }

              // Fetch existing parts in chunks (Supabase .in() has URL length limit)
              const uniqueSkus = Array.from(new Set(allSkus));
              const CHUNK_SIZE = 100; // Process 100 SKUs per request
              const allExistingParts: any[] = [];

              for (let i = 0; i < uniqueSkus.length; i += CHUNK_SIZE) {
                const chunk = uniqueSkus.slice(i, i + CHUNK_SIZE);
                const { data, error } = await supabase
                  .from("parts")
                  .select("*")
                  .in("sku", chunk);

                if (error) {
                  console.error(
                    `❌ Fetch chunk ${i / CHUNK_SIZE + 1} error:`,
                    error
                  );
                  throw new Error(`Lỗi kiểm tra phụ tùng: ${error.message}`);
                }

                if (data) {
                  allExistingParts.push(...data);
                }
              }

              const existingPartsMap = new Map(
                allExistingParts.map((p: any) => [p.sku, p])
              );

              // Prepare batch operations
              const partsToCreate: any[] = [];
              const partsToUpdate: any[] = [];
              const inventoryTxToCreate: any[] = [];
              const processedSkus = new Set<string>(); // Track processed SKUs to avoid duplicates
              let createdCount = 0;
              let updatedCount = 0;
              let skippedCount = 0;
              const importDate = new Date().toISOString();

              for (const item of importedData) {
                // Skip if SKU already processed (duplicate in file)
                if (processedSkus.has(item.sku)) {
                  console.warn(
                    `⚠️ Skipping duplicate SKU in file: ${item.sku}`
                  );
                  skippedCount++;
                  continue;
                }
                processedSkus.add(item.sku);

                const existingPart = existingPartsMap.get(item.sku);

                if (existingPart) {
                  // Update existing part
                  updatedCount += 1;
                  partsToUpdate.push({
                    id: existingPart.id,
                    stock: {
                      ...existingPart.stock,
                      [currentBranchId]:
                        (existingPart.stock[currentBranchId] || 0) +
                        item.quantity,
                    },
                    costPrice: {
                      ...existingPart.costPrice,
                      [currentBranchId]: item.costPrice,
                    },
                    retailPrice: {
                      ...existingPart.retailPrice,
                      [currentBranchId]: item.retailPrice,
                    },
                    wholesalePrice: {
                      ...existingPart.wholesalePrice,
                      [currentBranchId]: item.wholesalePrice,
                    },
                  });

                  // Prepare inventory transaction
                  inventoryTxToCreate.push({
                    type: "Nhập kho",
                    date: importDate,
                    branchId: currentBranchId,
                    partId: existingPart.id,
                    partName: item.name,
                    quantity: item.quantity,
                    unitPrice: item.retailPrice,
                    totalPrice: item.quantity * item.retailPrice,
                    notes: `Nhập kho từ file Excel`,
                  });
                } else {
                  // Create new part
                  createdCount += 1;
                  const newPartId =
                    crypto?.randomUUID?.() ||
                    `${Math.random().toString(36).slice(2)}-${Date.now()}`;

                  partsToCreate.push({
                    id: newPartId,
                    name: item.name,
                    sku: item.sku,
                    category: item.category,
                    description: item.description,
                    stock: {
                      [currentBranchId]: item.quantity,
                    },
                    costPrice: {
                      [currentBranchId]: item.costPrice,
                    },
                    retailPrice: {
                      [currentBranchId]: item.retailPrice,
                    },
                    wholesalePrice: {
                      [currentBranchId]: item.wholesalePrice,
                    },
                  });

                  // Prepare inventory transaction
                  inventoryTxToCreate.push({
                    type: "Nhập kho",
                    date: importDate,
                    branchId: currentBranchId,
                    partId: newPartId,
                    partName: item.name,
                    quantity: item.quantity,
                    unitPrice: item.retailPrice,
                    totalPrice: item.quantity * item.retailPrice,
                    notes: `Nhập kho từ file Excel`,
                  });
                }
              }

              // BATCH: Execute all creates
              if (partsToCreate.length > 0) {
                const { data: createdParts, error: createError } =
                  await supabase.from("parts").insert(partsToCreate).select();

                if (createError) {
                  console.error("❌ Batch create error:", createError);
                  throw new Error(`Lỗi tạo phụ tùng: ${createError.message}`);
                }
                void createdParts;
              }

              // BATCH: Execute all updates
              if (partsToUpdate.length > 0) {
                let updateSuccess = 0;

                for (const update of partsToUpdate) {
                  const { error } = await supabase
                    .from("parts")
                    .update({
                      stock: update.stock,
                      costPrice: update.costPrice,
                      retailPrice: update.retailPrice,
                      wholesalePrice: update.wholesalePrice,
                    })
                    .eq("id", update.id);

                  if (error) {
                    console.error(
                      `❌ Update error for part ${update.id}:`,
                      error
                    );
                  } else {
                    updateSuccess++;
                  }
                }
                void updateSuccess;
              }

              // BATCH: Create inventory transactions
              if (inventoryTxToCreate.length > 0) {
                const { error: txError } = await supabase
                  .from("inventory_transactions")
                  .insert(inventoryTxToCreate);

                if (txError) {
                  console.warn("⚠️ Inventory transactions error:", txError);
                  // Don't throw - transactions are not critical
                }
              }

              // Invalidate queries to refresh UI
              queryClient.invalidateQueries({ queryKey: ["partsRepo"] });
              queryClient.invalidateQueries({ queryKey: ["partsRepoPaged"] });

              // Audit summary for import (best-effort)
              try {
                const { data: userData } = await supabase.auth.getUser();
                await safeAudit(userData?.user?.id || null, {
                  action: "inventory.import",
                  tableName: "inventory_transactions",
                  oldData: null,
                  newData: {
                    totalRows: importedData.length + rowErrors.length,
                    created: createdCount,
                    updated: updatedCount,
                    skipped: rowErrors.length,
                    sampleErrors: rowErrors.slice(0, 10),
                    branchId: currentBranchId,
                    at: importDate,
                  },
                });
              } catch {
                /* best-effort audit: ignore */
              }

              setShowImportModal(false);

              let summaryMsg = `Import: tạo mới ${createdCount}, cập nhật ${updatedCount}`;
              if (skippedCount > 0) {
                summaryMsg += `, bỏ qua ${skippedCount} SKU trùng`;
              }
              if (rowErrors.length > 0) {
                summaryMsg += `, ${rowErrors.length} dòng lỗi`;
              }

              showToast.success(summaryMsg);
            } catch (error) {
              console.error("❌ Import error:", error);
              showToast.error(`Lỗi import: ${error}`);
            }
          }}
        />
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmColor={confirmState.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />


      {/* Custom Bottom Navigation for Inventory */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-50 safe-area-bottom">
        {/* Backdrop blur effect */}
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg -z-10"></div>
        <div className="grid grid-cols-4 gap-1 px-2 py-2">
          <button
            onClick={() => setActiveTab("stock")}
            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all duration-200 ${activeTab === "stock"
              ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 scale-105"
              : "text-slate-500 dark:text-slate-400 active:scale-95"
              }`}
          >
            <Boxes
              className={`w-5 h-5 ${activeTab === "stock" ? "scale-110" : ""
                } transition-transform`}
            />
            <span
              className={`text-[10px] font-medium ${activeTab === "stock" ? "font-semibold" : ""
                }`}
            >
              Tồn kho
            </span>
          </button>
          <button
            onClick={() => setActiveTab("purchase-orders")}
            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all duration-200 ${activeTab === "purchase-orders"
              ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 scale-105"
              : "text-slate-500 dark:text-slate-400 active:scale-95"
              }`}
          >
            <svg
              className={`w-5 h-5 ${activeTab === "purchase-orders" ? "scale-110" : ""
                } transition-transform`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span
              className={`text-[10px] font-medium ${activeTab === "purchase-orders" ? "font-semibold" : ""
                }`}
            >
              Đặt hàng
            </span>
          </button>
          <button
            onClick={() => setActiveTab("external-lookup")}
            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all duration-200 ${activeTab === "external-lookup"
              ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 scale-105"
              : "text-slate-500 dark:text-slate-400 active:scale-95"
              }`}
          >
            <svg
              className={`w-5 h-5 ${activeTab === "external-lookup" ? "scale-110" : ""
                } transition-transform`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span
              className={`text-[10px] font-medium ${activeTab === "external-lookup" ? "font-semibold" : ""
                }`}
            >
              Tra cứu
            </span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all duration-200 ${activeTab === "history"
              ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 scale-105"
              : "text-slate-500 dark:text-slate-400 active:scale-95"
              }`}
          >
            <FileText
              className={`w-5 h-5 ${activeTab === "history" ? "scale-110" : ""
                } transition-transform`}
            />
            <span
              className={`text-[10px] font-medium ${activeTab === "history" ? "font-semibold" : ""
                }`}
            >
              Lịch sử
            </span>
          </button>
        </div>
      </div>

      {/* Create Purchase Order Modal */}
      {(showCreatePO || editingPO) && (
        <>
          <CreatePOModal
            isOpen={!!(showCreatePO || editingPO)}
            onClose={() => {
              setShowCreatePO(false);
              setEditingPO(null); // Reset editingPO
              setSelectedItems([]);
            }}
            prefilledPartIds={selectedItems}
            existingPO={editingPO || undefined}
          />
        </>
      )}

      {/* External Import Modal */}
      {showExternalImport && (
        <ExternalDataImport
          onClose={() => setShowExternalImport(false)}
          onImported={() => {
            // Optional: refresh parts if we implement sync later
            // partsRepo.refetch();
          }}
        />
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={(barcode: string) => {
          // Set the search term to the scanned barcode
          setSearchInput(barcode);
          setSearch(barcode);
          setPage(1);
        }}
        title="Quét mã sản phẩm"
      />
    </div>
  );
};

export default InventoryManagerNew;
