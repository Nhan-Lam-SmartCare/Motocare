import React, { useState, useMemo, useEffect } from "react";
import { Banknote, CreditCard } from "lucide-react";
import { useAppContext } from "../../contexts/AppContext";
import { formatCurrency, formatDate } from "../../utils/format";
import { showToast } from "../../utils/toast";
import { PlusIcon } from "../Icons";
import { supabase } from "../../supabaseClient";
import type { CustomerDebt, SupplierDebt } from "../../types";
import {
  useCustomerDebtsRepo,
  useCreateCustomerDebtRepo,
  useUpdateCustomerDebtRepo,
  useDeleteCustomerDebtRepo,
  useSupplierDebtsRepo,
  useCreateSupplierDebtRepo,
  useUpdateSupplierDebtRepo,
  useDeleteSupplierDebtRepo,
} from "../../hooks/useDebtsRepository";
import { useInstallments } from "../../hooks/useInstallments";
import { createCashTransaction } from "../../lib/repository/cashTransactionsRepository";
import { useQueryClient } from "@tanstack/react-query";
import InstallmentList from "./components/InstallmentList";

// Modals
import { DebtReceiptModal } from "./modals/DebtReceiptModal";
import { CollectDebtModal } from "./modals/CollectDebtModal";
import { PaySupplierModal } from "./modals/PaySupplierModal";
import { BulkPaymentModal } from "./modals/BulkPaymentModal";
import { AddDebtModal } from "./modals/AddDebtModal";
import { EditDebtModal } from "./modals/EditDebtModal";
import { DetailDebtModal } from "./modals/DetailDebtModal";
import { DeleteConfirmDialog } from "./modals/DeleteConfirmDialog";

const DebtManager: React.FC = () => {
  const {
    customers,
    suppliers,
    currentBranchId,
  } = useAppContext();

  // Fetch debts from Supabase
  const { data: customerDebts = [], isLoading: loadingCustomerDebts } =
    useCustomerDebtsRepo();
  const { data: supplierDebts = [], isLoading: loadingSupplierDebts } =
    useSupplierDebtsRepo();
  const createCustomerDebt = useCreateCustomerDebtRepo();
  const updateCustomerDebt = useUpdateCustomerDebtRepo();
  const deleteCustomerDebt = useDeleteCustomerDebtRepo();
  const createSupplierDebt = useCreateSupplierDebtRepo();
  const updateSupplierDebt = useUpdateSupplierDebtRepo();
  const deleteSupplierDebt = useDeleteSupplierDebtRepo();
  const queryClient = useQueryClient();

  // Fetch installments for stats
  const { data: installments = [] } = useInstallments();

  // 🔹 Fetch unpaid work orders (status="Trả máy" and remainingamount > 0)
  const [unpaidWorkOrders, setUnpaidWorkOrders] = useState<any[]>([]);
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(true);

  // 🔹 Fetch unpaid sales (remainingamount > 0)
  const [unpaidSales, setUnpaidSales] = useState<any[]>([]);
  const [, setLoadingSales] = useState(true);

  useEffect(() => {
    const fetchUnpaidWorkOrders = async () => {
      setLoadingWorkOrders(true);
      try {
        const { data, error } = await supabase
          .from("work_orders")
          .select("*")
          .eq("status", "Trả máy")
          .eq("branchid", currentBranchId)
          .gt("remainingamount", 0);

        if (error) {
          console.error("Error fetching unpaid work orders:", error);
        } else {
          setUnpaidWorkOrders(data || []);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoadingWorkOrders(false);
      }
    };

    const fetchUnpaidSales = async () => {
      setLoadingSales(true);
      try {
        const { data, error } = await supabase
          .from("sales")
          .select("*")
          .eq("branchid", currentBranchId)
          .gt("remainingamount", 0);

        if (error) {
          console.error("Error fetching unpaid sales:", error);
        } else {
          setUnpaidSales(data || []);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoadingSales(false);
      }
    };

    // Sales table doesn't have remainingamount column yet, so we skip this
    // fetchUnpaidSales();
    setUnpaidSales([]);
    setLoadingSales(false);

    fetchUnpaidWorkOrders();

    // 🔹 Realtime subscription for work_orders changes
    const workOrdersChannel = supabase
      .channel("work_orders_debt_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "work_orders",
          filter: `branchid=eq.${currentBranchId}`,
        },
        () => {
          fetchUnpaidWorkOrders(); // Refetch when any change happens
        }
      )
      .subscribe();

    // 🔹 Realtime subscription for sales changes
    const salesChannel = supabase
      .channel("sales_debt_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
          filter: `branchid=eq.${currentBranchId}`,
        },
        () => {
          fetchUnpaidSales(); // Refetch when any change happens
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(workOrdersChannel);
      supabase.removeChannel(salesChannel);
    };
  }, [currentBranchId]);

  // 🔹 Convert work orders to debt-like format for display
  const workOrderDebts = useMemo(() => {
    // Get work order IDs that already have a debt record
    const existingWorkOrderIds = new Set(
      customerDebts
        .filter((d: any) => d.workOrderId)
        .map((d: any) => d.workOrderId)
    );

    // Filter out work orders that already have debt records
    return unpaidWorkOrders
      .filter((wo) => !existingWorkOrderIds.has(wo.id))
      .map((wo) => {
        const totalPaid = (wo.depositamount || 0) + (wo.additionalpayment || 0);
        const remainingAmount = Math.max(0, (wo.total || 0) - totalPaid);

        // Build description from parts
        let description = `Phiếu: ${wo.id}`;
        if (wo.partsused && wo.partsused.length > 0) {
          const partsText = wo.partsused
            .map((p: any) => `${p.quantity}x ${p.partName}`)
            .join(", ");
          description += `\n${partsText}`;
        }
        if (wo.laborcost > 0) {
          description += `\nCông: ${(wo.laborcost || 0).toLocaleString()}đ`;
        }
        // Add technician info
        if (wo.technicianname) {
          description += `\nNV: ${wo.technicianname}`;
        }

        return {
          id: `WO-${wo.id}`, // Prefix to distinguish from regular debts
          customerId: wo.customerphone || wo.id,
          customerName: wo.customername || "Khách vãng lai",
          phone: wo.customerphone || null,
          licensePlate: wo.licenseplate || null,
          description: description,
          totalAmount: wo.total || 0,
          paidAmount: totalPaid,
          remainingAmount: remainingAmount,
          createdDate: wo.creationdate || wo.created_at,
          branchId: wo.branchid || currentBranchId,
          workOrderId: wo.id,
          isFromWorkOrder: true, // Flag to identify source
          technicianName: wo.technicianname || null, // Store directly too
        };
      });
  }, [unpaidWorkOrders, customerDebts, currentBranchId]);

  // Fetch store settings
  const [storeSettings, setStoreSettings] = useState<any>(null);
  useEffect(() => {
    const fetchStoreSettings = async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("*")
        .single();
      if (data) setStoreSettings(data);
    };
    fetchStoreSettings();
  }, []);

  const [activeTab, setActiveTab] = useState<"customer" | "supplier" | "installment">(
    "customer"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);

  // New states for enhanced features
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [showEditDebtModal, setShowEditDebtModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<
    CustomerDebt | SupplierDebt | null
  >(null);

  // 🔹 Print Handler (Iframe based to avoid popup blockers)
  const handlePrintDebt = (debt: CustomerDebt | SupplierDebt) => {
    const isCustomerDebt = "customerName" in debt;

    // Create or get print iframe
    let iframe = document.getElementById("print-receipt-frame") as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "print-receipt-frame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);
    }

    const html = `
      <html>
        <head>
          <title>Phiếu ${isCustomerDebt ? "Thu" : "Chi"}</title>
          <style>
            @page { size: auto; margin: 5mm; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 20px; 
              max-width: 800px; 
              margin: 0 auto; 
              color: #333; 
            }
            .store-header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #0ea5e9; }
            .store-header h2 { margin: 0 0 10px 0; font-size: 24px; color: #0ea5e9; text-transform: uppercase; letter-spacing: 1px; }
            .store-header p { margin: 2px 0; color: #666; font-size: 13px; }
            h1 { text-align: center; margin-bottom: 20px; font-size: 26px; color: #1e293b; text-transform: uppercase; }
            .receipt-box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background: #fff; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; }
            .info-row:last-child { border-bottom: none; }
            .info-label { font-weight: 600; color: #64748b; font-size: 14px; }
            .info-value { font-weight: 700; color: #0f172a; font-size: 15px; }
            .total-row { display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 2px solid #0ea5e9; }
            .total-label { font-size: 16px; font-weight: 700; color: #0ea5e9; }
            .total-value { font-size: 20px; font-weight: 800; color: #0f172a; }
            .notes { margin-top: 20px; font-size: 13px; color: #64748b; font-style: italic; text-align: center; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; }
            .signature-box { width: 45%; }
            .signature-line { margin-top: 50px; border-top: 1px solid #94a3b8; width: 80%; margin-left: auto; margin-right: auto; }
            @media print { 
               body { -webkit-print-color-adjust: exact; } 
            }
          </style>
        </head>
        <body>
           <div class="store-header">
              <h2>${storeSettings?.store_name || "MOTOCARE"}</h2>
              ${storeSettings?.address ? `<p>Địa chỉ: ${storeSettings.address}</p>` : ""}
              ${storeSettings?.phone ? `<p>Hotline: ${storeSettings.phone}</p>` : ""}
           </div>
           
           <h1>PHIẾU ${isCustomerDebt ? "THU TIỀN" : "CHI TIỀN"}</h1>
           
           <div class="receipt-box">
              <div class="info-row">
                 <span class="info-label">${isCustomerDebt ? "Người nộp tiền" : "Người nhận tiền"}:</span>
                 <span class="info-value">${isCustomerDebt ? (debt as CustomerDebt).customerName : (debt as SupplierDebt).supplierName}</span>
              </div>
              <div class="info-row">
                 <span class="info-label">Ngày giao dịch:</span>
                 <span class="info-value">${formatDate(new Date())}</span>
              </div>
              <div class="info-row">
                 <span class="info-label">Nội dung:</span>
                 <span class="info-value">${debt.description}</span>
              </div>
              <div class="total-row">
                 <span class="total-label">Số tiền:</span>
                 <span class="total-value">${formatCurrency(debt.totalAmount)}</span>
              </div>
           </div>

           <div class="footer">
             <div class="signature-box">
               <p style="font-weight: bold; margin-bottom: 5px;">Người lập phiếu</p>
               <p style="font-size: 11px; font-style: italic;">(Ký, họ tên)</p>
               <div class="signature-line"></div>
             </div>
             <div class="signature-box">
               <p style="font-weight: bold; margin-bottom: 5px;">${isCustomerDebt ? "Người nộp tiền" : "Người nhận tiền"}</p>
               <p style="font-size: 11px; font-style: italic;">(Ký, họ tên)</p>
               <div class="signature-line"></div>
             </div>
           </div>

           <div class="notes">
             Cảm ơn quý khách đã sử dụng dịch vụ!
           </div>
        </body>
      </html>
    `;

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 500);
    }
  };

  // Filter by branch
  const branchCustomerDebts = useMemo(() => {
    const dbDebts = customerDebts.filter(
      (debt) => debt.branchId === currentBranchId
    );

    // 🔹 Filter out debts linked to fully paid work orders or sales
    const activeDbDebts = dbDebts.filter((debt: any) => {
      if ((debt.remainingAmount || 0) <= 0) return false;

      if (debt.workOrderId) {
        const workOrderStillUnpaid = unpaidWorkOrders.some(
          (wo) => wo.id === debt.workOrderId
        );
        if (!workOrderStillUnpaid) return false;
      }

      if (debt.saleId && unpaidSales.length > 0) {
        const saleStillUnpaid = unpaidSales.some(
          (sale) => sale.id === debt.saleId
        );
        if (!saleStillUnpaid) return false;
      }

      return true;
    });

    return [...activeDbDebts, ...workOrderDebts] as any[];
  }, [
    customerDebts,
    currentBranchId,
    workOrderDebts,
    unpaidWorkOrders,
    unpaidSales,
  ]);

  const branchSupplierDebts = useMemo(() => {
    return supplierDebts
      .filter((debt) => debt.branchId === currentBranchId)
      .filter((debt) => {
        const val = Number(debt.remainingAmount);
        if (isNaN(val) || val <= 0) return false;
        return true;
      });
  }, [supplierDebts, currentBranchId]);

  // Filter debts based on search and sort: unpaid debts first, then by date
  const filteredCustomerDebts = useMemo(() => {
    let filtered = branchCustomerDebts;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (debt: any) =>
          debt.customerName?.toLowerCase().includes(term) ||
          debt.phone?.includes(term) ||
          debt.licensePlate?.toLowerCase().includes(term) ||
          debt.description?.toLowerCase().includes(term)
      );
    }

    return filtered.sort((a: any, b: any) => {
      if (a.remainingAmount > 0 && b.remainingAmount === 0) return -1;
      if (a.remainingAmount === 0 && b.remainingAmount > 0) return 1;

      return (
        new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
      );
    });
  }, [branchCustomerDebts, searchTerm]);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".debt-menu-dropdown")) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSupplierDebts = useMemo(() => {
    if (!searchTerm) return branchSupplierDebts;
    const term = searchTerm.toLowerCase();
    return branchSupplierDebts.filter((debt) =>
      debt.supplierName.toLowerCase().includes(term)
    );
  }, [branchSupplierDebts, searchTerm]);

  // Calculate totals
  const customerTotal = useMemo(
    () =>
      branchCustomerDebts.reduce((sum, debt) => sum + debt.remainingAmount, 0),
    [branchCustomerDebts]
  );

  const supplierTotal = useMemo(
    () =>
      branchSupplierDebts.reduce((sum, debt) => sum + debt.remainingAmount, 0),
    [branchSupplierDebts]
  );

  // Calculate selected debt total
  const selectedCustomerTotal = useMemo(() => {
    return selectedCustomerIds.reduce((sum, id) => {
      const debt = branchCustomerDebts.find((d) => d.customerId === id);
      return sum + (debt?.remainingAmount || 0);
    }, 0);
  }, [selectedCustomerIds, branchCustomerDebts]);

  const selectedSupplierTotal = useMemo(() => {
    return selectedSupplierIds.reduce((sum, id) => {
      const debt = branchSupplierDebts.find((d) => d.id === id);
      return sum + (debt?.remainingAmount || 0);
    }, 0);
  }, [selectedSupplierIds, branchSupplierDebts]);

  // Handle checkbox change
  const handleCustomerCheckbox = (customerId: string, checked: boolean) => {
    if (checked) {
      setSelectedCustomerIds([...selectedCustomerIds, customerId]);
    } else {
      setSelectedCustomerIds(
        selectedCustomerIds.filter((id) => id !== customerId)
      );
    }
  };

  const handleSupplierCheckbox = (debtId: string, checked: boolean) => {
    if (checked) {
      setSelectedSupplierIds([...selectedSupplierIds, debtId]);
    } else {
      setSelectedSupplierIds(
        selectedSupplierIds.filter((id) => id !== debtId)
      );
    }
  };

  // Handle pay all selected debts
  const handlePaySelectedDebts = () => {
    setShowBulkPaymentModal(true);
  };

  return (
    <div className="h-full flex flex-col bg-secondary-bg">
      {/* Page Header with Title and Stats */}
      <div className="bg-primary-bg px-4 py-4 border-b border-primary-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Title Section */}
          <div>
            <h1 className="text-xl font-bold text-primary-text">Quản lý Công Nợ</h1>
            <p className="text-sm text-secondary-text">Theo dõi công nợ khách hàng và nhà cung cấp</p>
          </div>

          {/* Stats Boxes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {/* Total Debt */}
            <div className="bg-white dark:bg-slate-800/80 rounded-lg p-3 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 border-t-2 border-t-cyan-500 shadow-sm">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tổng công nợ</div>
              <div className="text-lg font-bold">{formatCurrency(customerTotal + supplierTotal)}</div>
              <div className="text-[10px] text-slate-400">~{branchCustomerDebts.length + branchSupplierDebts.length} khoản</div>
            </div>

            {/* Customer Debt */}
            <div className="bg-white dark:bg-slate-800/80 rounded-lg p-3 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 border-t-2 border-t-amber-500 shadow-sm">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Công nợ KH</div>
              <div className="text-lg font-bold">{formatCurrency(customerTotal)}</div>
              <div className="text-[10px] text-slate-400">~{branchCustomerDebts.length} khoản</div>
            </div>

            {/* Supplier Debt */}
            <div className="bg-white dark:bg-slate-800/80 rounded-lg p-3 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 border-t-2 border-t-red-500 shadow-sm">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Công nợ NCC</div>
              <div className="text-lg font-bold">{formatCurrency(supplierTotal)}</div>
              <div className="text-[10px] text-slate-400">~{branchSupplierDebts.length} khoản</div>
            </div>

            {/* Installment */}
            <div className="bg-white dark:bg-slate-800/80 rounded-lg p-3 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 border-t-2 border-t-purple-500 shadow-sm">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Trả góp</div>
              <div className="text-lg font-bold">{formatCurrency(installments.filter((i: any) => i.status === "active").reduce((sum: number, item: any) => sum + (item.remaining_amount || 0), 0))}</div>
              <div className="text-[10px] text-slate-400">~{installments.filter((i: any) => i.status === "active").length} khoản</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs with Badges */}
      <div className="bg-primary-bg border-b border-primary-border">
        <div className="flex items-center px-4 gap-1">
          <button
            onClick={() => setActiveTab("customer")}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm transition-all rounded-t-lg ${activeTab === "customer"
              ? "bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-none"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"
              }`}
          >
            <span>👤 Công nợKH</span>
            <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full ${activeTab === "customer" ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
              {branchCustomerDebts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("supplier")}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm transition-all rounded-t-lg ${activeTab === "supplier"
              ? "bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-none"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"
              }`}
          >
            <span>🏭 Công nợNCC</span>
            <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full ${activeTab === "supplier" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
              {branchSupplierDebts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("installment")}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm transition-all rounded-t-lg ${activeTab === "installment"
              ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-none"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"
              }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Trả góp</span>
            <span className="px-1.5 py-0.5 text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
              {installments.filter((i: any) => i.status === "active").length}
            </span>
          </button>
        </div>
      </div>

      {/* Search and Actions Bar */}
      <div className="bg-primary-bg px-4 py-3 border-b border-primary-border">
        {loadingCustomerDebts || loadingSupplierDebts ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            <span className="ml-3 text-secondary-text">Đang tải dữ liệu...</span>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-full md:flex-1 relative">
              <svg
                className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-tertiary-text"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder={
                  activeTab === "customer"
                    ? "Tìm SĐT / Tên KH / Tên sản phẩm / IMEI"
                    : activeTab === "supplier"
                      ? "Tìm tên / SĐT nhà cung cấp"
                      : "Tìm tên khách hàng / mã đơn"
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-primary-bg border border-secondary-border rounded-lg text-primary-text placeholder-tertiary-text focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {activeTab !== "installment" && (
              <>
                <div className="text-secondary-text text-sm whitespace-nowrap">
                  Tổng công nợ:{" "}
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(
                      activeTab === "customer" ? customerTotal : supplierTotal
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                  <button
                    onClick={() => setShowAddDebtModal(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span>Thêm công nợ</span>
                  </button>
                  <button
                    onClick={() =>
                      activeTab === "customer"
                        ? setShowCollectModal(true)
                        : setShowPaymentModal(true)
                    }
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{activeTab === "customer" ? "Thu nợ" : "Chi trả nợ"}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {activeTab === "customer" ? (
          <div className="p-2 md:p-6">
            {loadingCustomerDebts || loadingWorkOrders ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                <span className="ml-3 text-secondary-text">Đang tải...</span>
              </div>
            ) : filteredCustomerDebts.length === 0 ? (
              <div className="text-center py-12 text-tertiary-text">Không có công nợ.</div>
            ) : (
              <div className="space-y-3">
                {/* Header Row - Hidden on Mobile */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <div className="col-span-4">Khách hàng nợ</div>
                  <div className="col-span-3">Nội dung</div>
                  <div className="col-span-1 text-right">Số tiền</div>
                  <div className="col-span-1 text-right">Đã trả</div>
                  <div className="col-span-2 text-right">Còn nợ</div>
                  <div className="col-span-1"></div>
                </div>

                {filteredCustomerDebts.map((debt: any) => {
                  const isPaid = debt.remainingAmount === 0;

                  return (
                    <div
                      key={debt.id}
                      className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-start bg-primary-bg border rounded-lg p-3 md:p-4 transition-all ${
                        isPaid
                          ? "opacity-60 cursor-not-allowed border-gray-300 dark:border-gray-600"
                          : "hover:border-cyan-500 hover:shadow-md cursor-pointer"
                      } ${
                        debt.isFromWorkOrder
                          ? "border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/10"
                          : "border-primary-border"
                      }`}
                      onClick={() => {
                        if (!isPaid) {
                          setSelectedDebt(debt);
                          setShowDetailModal(true);
                        }
                      }}
                    >
                      {/* Badge for paid status */}
                      {isPaid && (
                        <div className="col-span-full mb-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full font-semibold">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Đã thanh toán
                          </span>
                        </div>
                      )}
                      {/* Badge for work order debts */}
                      {debt.isFromWorkOrder && (
                        <div className="col-span-full md:hidden mb-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded-full">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                            </svg>
                            Từ phiếu sửa chữa
                          </span>
                        </div>
                      )}
                      {/* Cột 1: Khách hàng nợ (4 cols) */}
                      <div className="col-span-1 md:col-span-4 flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedCustomerIds.includes(debt.customerId)}
                          disabled={isPaid}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleCustomerCheckbox(debt.customerId, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`hidden md:block mt-1 w-4 h-4 rounded border-secondary-border text-cyan-600 focus:ring-cyan-500 ${
                            isPaid ? "cursor-not-allowed opacity-50" : ""
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-primary-text font-semibold text-base mb-1 truncate">
                            {debt.customerName}
                          </h3>
                          <div className="space-y-0.5 text-xs text-secondary-text">
                            <div className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                />
                              </svg>
                              <span>{debt.phone || "--"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M9 22V12h6v10"
                                />
                              </svg>
                              <span className="font-mono text-xs font-semibold">
                                {debt.licensePlate || "--"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              <span>{formatDate(new Date(debt.createdDate))}</span>
                            </div>
                            <div className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                              <span>
                                NV:{" "}
                                {debt.technicianName ||
                                  debt.description
                                    .match(/NVKỹ thuật:([^\n]+)/)?.[1]
                                    ?.trim() ||
                                  debt.description.match(/NV:([^\n]+)/)?.[1]?.trim() ||
                                  "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Cột 2: Nội dung - Chi tiết sửa chữa/mua hàng (3 cols) */}
                      <div className="col-span-1 md:col-span-3">
                        <div className="text-sm text-primary-text space-y-1">
                          {(() => {
                            const lines: string[] = String(debt.description ?? "").split("\n");
                            const firstLine = lines[0];

                            const partsSection = lines.find((l) =>
                              l.includes("Phụ tùng đã thay:")
                            );
                            const partsLines = partsSection
                              ? lines
                                  .slice(
                                    lines.indexOf(partsSection) + 1,
                                    lines.findIndex(
                                      (l: string, i: number) =>
                                        i > lines.indexOf(partsSection) &&
                                        (l.includes("Dịch vụ:") || l.includes("Công lao động:"))
                                    ) || lines.length
                                  )
                                  .filter((l: string) => l.trim().startsWith("•"))
                              : [];

                            const serviceSection = lines.find((l) => l.includes("Dịch vụ:"));
                            const serviceLines = serviceSection
                              ? lines
                                  .slice(
                                    lines.indexOf(serviceSection) + 1,
                                    lines.findIndex(
                                      (l: string, i: number) =>
                                        i > lines.indexOf(serviceSection) &&
                                        l.includes("Công lao động:")
                                    ) || lines.length
                                  )
                                  .filter((l: string) => l.trim().startsWith("•"))
                              : [];

                            const laborLine = lines.find((l) => l.includes("Công lao động:"));

                            return (
                              <>
                                <div className="font-medium">{firstLine}</div>
                                {partsLines.length > 0 && (
                                  <div className="text-xs text-secondary-text">
                                    <span className="font-semibold">Phụ tùng:</span>{" "}
                                    {partsLines.length} món
                                  </div>
                                )}
                                {serviceLines.length > 0 && (
                                  <div className="text-xs text-secondary-text">
                                    <span className="font-semibold">Dịch vụ:</span>{" "}
                                    {serviceLines.length} món
                                  </div>
                                )}
                                {laborLine && (
                                  <div className="text-xs text-cyan-600 dark:text-cyan-400">
                                    {laborLine}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Cột 3: Số tiền (1 col) - Desktop Only */}
                      <div className="hidden md:block col-span-1 text-right">
                        <div className="text-sm font-semibold text-primary-text font-mono">
                          {formatCurrency(debt.totalAmount)}
                        </div>
                      </div>

                      {/* Cột 4: Đã trả (1 col) - Desktop Only */}
                      <div className="hidden md:block col-span-1 text-right">
                        <div className="text-sm font-semibold text-green-600 dark:text-green-400 font-mono">
                          {formatCurrency(debt.paidAmount)}
                        </div>
                      </div>

                      {/* Cột 5: Còn nợ (2 cols) - Desktop Only */}
                      <div className="hidden md:block col-span-1 md:col-span-2 text-right">
                        <div className="text-lg font-bold text-red-600 dark:text-red-400 font-mono">
                          {formatCurrency(debt.remainingAmount)}
                        </div>
                      </div>

                      {/* Mobile Financial Summary Block */}
                      <div className="col-span-full md:hidden bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg mt-1 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Tổng tiền:</span>
                          <span className="font-semibold text-slate-900 dark:text-white font-mono">
                            {formatCurrency(debt.totalAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Đã trả:</span>
                          <span className="font-semibold text-green-600 dark:text-green-400 font-mono">
                            {formatCurrency(debt.paidAmount)}
                          </span>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Còn nợ:</span>
                          <span className="text-xl font-bold text-red-600 dark:text-red-400 font-mono">
                            {formatCurrency(debt.remainingAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Mobile Action Button */}
                      {!isPaid && (
                        <div className="col-span-full md:hidden mt-2 border-t pt-2 dark:border-gray-700">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDebt(debt);
                              setShowCollectModal(true);
                            }}
                            className="w-full py-2.5 bg-cyan-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-sm"
                          >
                            <Banknote className="w-4 h-4" />
                            Thanh toán công nợ
                          </button>
                        </div>
                      )}

                      {/* Menu dropdown (1 col) */}
                      <div className="col-span-1 flex justify-end hidden md:flex">
                        <div className="relative debt-menu-dropdown">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === debt.id ? null : debt.id);
                            }}
                            className="p-2 text-secondary-text hover:text-primary-text transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                              />
                            </svg>
                          </button>

                          {openMenuId === debt.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDebt(debt);
                                  setShowDetailModal(true);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                                Xem chi tiết
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDebt(debt);
                                  setShowEditDebtModal(true);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                                Sửa
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDebt(debt);
                                  setShowDeleteConfirm(true);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                Xóa
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === "supplier" ? (
          <div className="p-2 md:p-6">
            {filteredSupplierDebts.length === 0 ? (
              <div className="text-center py-12 text-tertiary-text">Không có công nợ.</div>
            ) : (
              <div className="space-y-3">
                {/* Header Row - Hidden on Mobile */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <div className="col-span-4">Nhà cung cấp</div>
                  <div className="col-span-3">Nội dung</div>
                  <div className="col-span-1 text-right">Số tiền</div>
                  <div className="col-span-1 text-right">Đã trả</div>
                  <div className="col-span-2 text-right">Còn nợ</div>
                  <div className="col-span-1"></div>
                </div>

                {filteredSupplierDebts.map((debt) => (
                  <div
                    key={debt.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 md:gap-4 md:p-4 items-start bg-primary-bg border border-primary-border rounded-lg hover:border-cyan-500 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => {
                      setSelectedDebt(debt);
                      setShowDetailModal(true);
                    }}
                  >
                    {/* Cột 1: Nhà cung cấp (4 cols) */}
                    <div className="col-span-1 md:col-span-4 flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedSupplierIds.includes(debt.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSupplierCheckbox(debt.id, e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="hidden md:block mt-1 w-4 h-4 rounded border-secondary-border text-cyan-600 focus:ring-cyan-500"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-primary-text font-semibold text-base mb-1 truncate">
                          {debt.supplierName}
                        </h3>
                        <div className="space-y-0.5 text-xs text-secondary-text">
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span>{formatDate(new Date(debt.createdDate))}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cột 2: Nội dung (3 cols) */}
                    <div className="col-span-1 md:col-span-3">
                      <div className="text-sm text-primary-text">{debt.description}</div>

                      {/* Mobile Financial Summary */}
                      <div className="md:hidden mt-1 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-secondary-text min-w-[60px]">Tổng:</span>
                          <span className="font-medium text-primary-text font-mono">
                            {formatCurrency(debt.totalAmount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-secondary-text min-w-[60px]">Đã trả:</span>
                          <span className="font-medium text-green-600 dark:text-green-400 font-mono">
                            {formatCurrency(debt.paidAmount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-secondary-text min-w-[60px]">Còn nợ:</span>
                          <span className="font-bold text-red-600 dark:text-red-400 font-mono">
                            {formatCurrency(debt.remainingAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Mobile Action Buttons - "Chi trả nợ" */}
                      <div className="md:hidden mt-2 pt-2 border-t border-secondary-border flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDebt(debt);
                            setShowPaymentModal(true);
                          }}
                          className="px-3 py-1.5 bg-green-600/10 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-600/20 flex items-center gap-1.5"
                        >
                          <Banknote className="w-4 h-4" />
                          Chi trả nợ
                        </button>
                      </div>
                    </div>

                    {/* Cột 3: Số tiền (1 col) */}
                    <div className="col-span-1 text-right md:text-right hidden md:block">
                      <span className="md:hidden text-sm text-secondary-text">Số tiền:</span>
                      <div className="text-sm text-primary-text font-semibold font-mono">
                        {formatCurrency(debt.totalAmount)}
                      </div>
                    </div>

                    {/* Cột 4: Đã trả (1 col) */}
                    <div className="col-span-1 text-right md:text-right hidden md:block">
                      <span className="md:hidden text-sm text-secondary-text">Đã trả:</span>
                      <div className="text-sm text-green-600 dark:text-green-400 font-semibold font-mono">
                        {formatCurrency(debt.paidAmount)}
                      </div>
                    </div>

                    {/* Cột 5: Còn nợ (2 cols) */}
                    <div className="col-span-1 md:col-span-2 text-right md:text-right hidden md:block">
                      <span className="md:hidden text-sm font-bold text-secondary-text">Còn nợ:</span>
                      <div className="text-base text-red-600 dark:text-red-400 font-bold font-mono">
                        {formatCurrency(debt.remainingAmount)}
                      </div>
                    </div>

                    {/* Cột 6: Menu actions (1 col) */}
                    <div className="col-span-1 flex justify-end relative debt-menu-dropdown hidden md:flex">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === debt.id ? null : debt.id);
                        }}
                        className="p-1 text-secondary-text hover:text-primary-text transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                          />
                        </svg>
                      </button>

                      {openMenuId === debt.id && (
                        <div className="absolute right-0 top-8 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDebt(debt);
                              setShowDetailModal(true);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                            Xem chi tiết
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDebt(debt);
                              setShowEditDebtModal(true);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                            Sửa
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDebt(debt);
                              setShowDeleteConfirm(true);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "installment" ? (
          <InstallmentList />
        ) : null}
      </div>

      {/* Fixed Bottom Button - Pay All Selected */}
      {((activeTab === "customer" && selectedCustomerIds.length > 0) ||
        (activeTab === "supplier" && selectedSupplierIds.length > 0)) && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={handlePaySelectedDebts}
            className="flex items-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-2xl transition-all hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              Đã chọn {activeTab === "customer" ? selectedCustomerIds.length : selectedSupplierIds.length}{" "}
              đơn
            </span>
            <span className="mx-2">|</span>
            <span className="text-xl font-bold">
              Trả hết nợ (
              {formatCurrency(activeTab === "customer" ? selectedCustomerTotal : selectedSupplierTotal)})
            </span>
          </button>
        </div>
      )}

      {/* Modals */}
      {showCollectModal && (
        <CollectDebtModal
          customers={customers}
          customerDebts={customerDebts}
          initialDebt={selectedDebt as CustomerDebt}
          onClose={() => setShowCollectModal(false)}
          onCollect={async (data) => {
            try {
              const debtToUpdate = branchCustomerDebts.find((d) => d.customerId === data.customerId);

              if (debtToUpdate) {
                const newPaidAmount = (debtToUpdate.paidAmount || 0) + data.amount;
                const newRemainingAmount = Math.max(0, debtToUpdate.totalAmount - newPaidAmount);

                if ((debtToUpdate as any).isFromWorkOrder && (debtToUpdate as any).workOrderId) {
                  await supabase
                    .from("work_orders")
                    .update({ remainingamount: newRemainingAmount })
                    .eq("id", (debtToUpdate as any).workOrderId);
                } else {
                  await updateCustomerDebt.mutateAsync({
                    id: debtToUpdate.id,
                    updates: {
                      paidAmount: newPaidAmount,
                      remainingAmount: newRemainingAmount,
                    },
                  });

                  if ((debtToUpdate as any).workOrderId) {
                    await supabase
                      .from("work_orders")
                      .update({ remainingamount: newRemainingAmount })
                      .eq("id", (debtToUpdate as any).workOrderId);
                  }

                  if ((debtToUpdate as any).saleId) {
                    await supabase
                      .from("sales")
                      .update({ remainingamount: newRemainingAmount })
                      .eq("id", (debtToUpdate as any).saleId);
                  }
                }

                queryClient.invalidateQueries({ queryKey: ["workOrdersRepo"] });
                queryClient.invalidateQueries({ queryKey: ["workOrdersFiltered"] });
                queryClient.invalidateQueries({ queryKey: ["salesRepo"] });
              }

              const cashTxResult = await createCashTransaction({
                type: "income",
                amount: data.amount,
                branchId: currentBranchId,
                paymentSourceId: data.paymentMethod,
                date: data.timestamp,
                notes: `Thu nợ khách hàng - ${data.customerName}`,
                category: "debt_collection",
                recipient: data.customerName,
                customerId: data.customerId,
              });

              if (!cashTxResult.ok) {
                console.error("❌ Lỗi ghi sổ quỹ:", cashTxResult.error);
              }

              setReceiptData({
                ...data,
                type: "income",
                isCustomer: true,
              });
              setShowReceiptModal(true);

              if (data.shouldPrint) {
                const debtForPrint = {
                  customerName: data.customerName,
                  totalAmount: data.amount,
                  remainingAmount: 0,
                  paidAmount: data.amount,
                  createdDate: new Date().toISOString(),
                  description: "Thu nợ (Thanh toán ngay)",
                };
                setTimeout(() => handlePrintDebt(debtForPrint as any), 500);
              }

              showToast.success(`Đã thu thành công ${formatCurrency(data.amount)} từ ${data.customerName}`);
            } catch (error: any) {
              console.error("❌ Lỗi thanh toán:", error);
              showToast.error(error.message || "Không thể thanh toán. Vui lòng thử lại.");
            }

            setShowCollectModal(false);
          }}
        />
      )}

      {/* Bulk Payment Modal */}
      {showBulkPaymentModal && (
        <BulkPaymentModal
          isOpen={showBulkPaymentModal}
          onClose={() => {
            setShowBulkPaymentModal(false);
          }}
          selectedDebts={
            activeTab === "customer"
              ? branchCustomerDebts.filter((d) => selectedCustomerIds.includes(d.customerId))
              : branchSupplierDebts.filter((d) => selectedSupplierIds.includes(d.id))
          }
          totalAmount={activeTab === "customer" ? selectedCustomerTotal : selectedSupplierTotal}
          debtType={activeTab === "installment" ? "customer" : activeTab}
          onConfirm={async (paymentMethod, paymentTime, shouldPrint) => {
            try {
              const totalAmount = activeTab === "customer" ? selectedCustomerTotal : selectedSupplierTotal;

              if (activeTab === "customer") {
                for (const customerId of selectedCustomerIds) {
                  const debt = branchCustomerDebts.find((d) => d.customerId === customerId);
                  if (debt) {
                    if ((debt as any).isFromWorkOrder && (debt as any).workOrderId) {
                      await supabase
                        .from("work_orders")
                        .update({ remainingamount: 0 })
                        .eq("id", (debt as any).workOrderId);
                    } else {
                      await updateCustomerDebt.mutateAsync({
                        id: debt.id,
                        updates: {
                          paidAmount: debt.totalAmount,
                          remainingAmount: 0,
                        },
                      });

                      if ((debt as any).workOrderId) {
                        await supabase
                          .from("work_orders")
                          .update({ remainingamount: 0 })
                          .eq("id", (debt as any).workOrderId);
                      }

                      if ((debt as any).saleId) {
                        await supabase
                          .from("sales")
                          .update({ remainingamount: 0 })
                          .eq("id", (debt as any).saleId);
                      }
                    }
                  }
                }

                let notesText = `Thu nợ hàng loạt - ${selectedCustomerIds.length} khách hàng`;
                let recipientText = `${selectedCustomerIds.length} khách hàng`;

                if (selectedCustomerIds.length === 1) {
                  const singleDebt = branchCustomerDebts.find((d) => d.customerId === selectedCustomerIds[0]);

                  if (singleDebt) {
                    const saleCodeMatch = singleDebt.description?.match(/[A-Z]+-\d{8}-\d{3}/);
                    const saleCode = saleCodeMatch ? saleCodeMatch[0] : null;

                    if (saleCode) {
                      notesText = `Thu nợ từ đơn hàng ${saleCode}`;
                      recipientText = singleDebt.customerName;
                    } else if ((singleDebt as any).workOrderId) {
                      notesText = `Thu nợ từ phiếu ${(singleDebt as any).workOrderId}`;
                      recipientText = singleDebt.customerName;
                    } else {
                      notesText = `Thu nợ khách hàng - ${singleDebt.customerName}`;
                      recipientText = singleDebt.customerName;
                    }
                  }
                }

                setSelectedCustomerIds([]);

                const cashTxResult = await createCashTransaction({
                  type: "income",
                  amount: totalAmount,
                  branchId: currentBranchId,
                  paymentSourceId: paymentMethod,
                  date: paymentTime,
                  notes: notesText,
                  category: "debt_collection",
                  recipient: recipientText,
                });

                if (!cashTxResult.ok) {
                  console.error("❌ Lỗi ghi sổ quỹ:", cashTxResult.error);
                }

                queryClient.invalidateQueries({ queryKey: ["workOrdersRepo"] });
                queryClient.invalidateQueries({ queryKey: ["workOrdersFiltered"] });
                queryClient.invalidateQueries({ queryKey: ["salesRepo"] });
                queryClient.invalidateQueries({ queryKey: ["cashTransactions"] });
                queryClient.invalidateQueries({ queryKey: ["paymentSources"] });
              } else {
                for (const debtId of selectedSupplierIds) {
                  const debt = branchSupplierDebts.find((d) => d.id === debtId);
                  if (debt) {
                    await updateSupplierDebt.mutateAsync({
                      id: debt.id,
                      updates: {
                        paidAmount: debt.totalAmount,
                        remainingAmount: 0,
                      },
                    });
                  }
                }
                setSelectedSupplierIds([]);

                const cashTxResult = await createCashTransaction({
                  type: "expense",
                  amount: totalAmount,
                  branchId: currentBranchId,
                  paymentSourceId: paymentMethod,
                  date: paymentTime,
                  notes: `Trả nợ hàng loạt - ${selectedSupplierIds.length} công nợ`,
                  category: "debt_payment",
                  recipient: `${selectedSupplierIds.length} công nợ`,
                });

                if (!cashTxResult.ok) {
                  console.error("❌ Lỗi ghi sổ quỹ:", cashTxResult.error);
                }
              }

              setShowBulkPaymentModal(false);

              showToast.success(
                `Đã thanh toán thành công ${formatCurrency(totalAmount)} qua ${
                  paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản"
                }`
              );

              if (shouldPrint) {
                const bulkDebtForPrint = {
                  customerName: activeTab === "customer" ? `${selectedCustomerIds.length} khách hàng` : undefined,
                  supplierName: activeTab === "supplier" ? `${selectedSupplierIds.length} nhà cung cấp` : undefined,
                  totalAmount: totalAmount,
                  remainingAmount: 0,
                  paidAmount: totalAmount,
                  createdDate: new Date().toISOString(),
                  description: activeTab === "customer" ? "Thu nợ hàng loạt" : "Trả nợ hàng loạt",
                };
                setTimeout(() => handlePrintDebt(bulkDebtForPrint as any), 500);
              }
            } catch (error: any) {
              showToast.error(error.message || "Không thể thanh toán");
            }
          }}
        />
      )}

      {showPaymentModal && (
        <PaySupplierModal
          suppliers={suppliers}
          supplierDebts={supplierDebts}
          initialDebt={selectedDebt as SupplierDebt}
          onClose={() => setShowPaymentModal(false)}
          onPay={async (data) => {
            try {
              const debtToUpdate = branchSupplierDebts.find((d) => d.supplierId === data.supplierId);

              if (debtToUpdate) {
                const newPaidAmount = (debtToUpdate.paidAmount || 0) + data.amount;
                const newRemainingAmount = Math.max(0, debtToUpdate.totalAmount - newPaidAmount);

                await updateSupplierDebt.mutateAsync({
                  id: debtToUpdate.id,
                  updates: {
                    paidAmount: newPaidAmount,
                    remainingAmount: newRemainingAmount,
                  },
                });
              }

              const cashTxResult = await createCashTransaction({
                type: "expense",
                amount: data.amount,
                branchId: currentBranchId,
                paymentSourceId: data.paymentMethod,
                date: data.timestamp,
                notes: `Trả nợ nhà cung cấp - ${data.supplierName}`,
                category: "debt_payment",
                recipient: data.supplierName,
                supplierId: data.supplierId,
              });

              if (cashTxResult.ok) {
                queryClient.invalidateQueries({ queryKey: ["cashTransactions"] });
                queryClient.invalidateQueries({ queryKey: ["paymentSources"] });
              } else {
                console.error("❌ Lỗi ghi sổ quỹ:", cashTxResult.error);
              }

              setReceiptData({
                ...data,
                type: "expense",
                isCustomer: false,
              });
              setShowReceiptModal(true);

              if (data.shouldPrint) {
                const debtForPrint = {
                  supplierName: data.supplierName,
                  totalAmount: data.amount,
                  remainingAmount: 0,
                  paidAmount: data.amount,
                  createdDate: new Date().toISOString(),
                  description: "Chi trả nợ (Thanh toán ngay)",
                };
                setTimeout(() => handlePrintDebt(debtForPrint as any), 500);
              }

              showToast.success(`Đã trả thành công ${formatCurrency(data.amount)} cho ${data.supplierName}`);
            } catch (error: any) {
              console.error("❌ Lỗi thanh toán:", error);
              showToast.error(error.message || "Không thể thanh toán. Vui lòng thử lại.");
            }

            setShowPaymentModal(false);
          }}
        />
      )}

      {/* Success Receipt Modal */}
      {showReceiptModal && receiptData && (
        <DebtReceiptModal
          isOpen={showReceiptModal}
          data={receiptData}
          onClose={() => setShowReceiptModal(false)}
          onPrint={() => {
            const debtForPrint = {
              customerName: receiptData.customerName,
              supplierName: receiptData.supplierName,
              totalAmount: receiptData.amount,
              remainingAmount: 0,
              paidAmount: receiptData.amount,
              createdDate: new Date().toISOString(),
              description: receiptData.isCustomer
                ? "Thu nợ (Thanh toán)"
                : "Chi trả nợ (Thanh toán)",
            };
            handlePrintDebt(debtForPrint as any);
          }}
        />
      )}

      {/* Add Debt Modal */}
      {showAddDebtModal && (
        <AddDebtModal
          activeTab={activeTab === "installment" ? "customer" : activeTab}
          customers={customers}
          suppliers={suppliers}
          currentBranchId={currentBranchId}
          onClose={() => setShowAddDebtModal(false)}
          onSave={async (debt) => {
            if (activeTab === "customer") {
              await createCustomerDebt.mutateAsync(debt as any);
            } else {
              await createSupplierDebt.mutateAsync(debt as any);
            }
            setShowAddDebtModal(false);
          }}
        />
      )}

      {/* Edit Debt Modal */}
      {showEditDebtModal && selectedDebt && (
        <EditDebtModal
          debt={selectedDebt}
          activeTab={activeTab === "installment" ? "customer" : activeTab}
          customers={customers}
          suppliers={suppliers}
          onClose={() => {
            setShowEditDebtModal(false);
            setSelectedDebt(null);
          }}
          onSave={async (updates) => {
            if (activeTab === "customer") {
              await updateCustomerDebt.mutateAsync({
                id: selectedDebt.id,
                updates: updates as any,
              });
            } else {
              await updateSupplierDebt.mutateAsync({
                id: selectedDebt.id,
                updates: updates as any,
              });
            }
            setShowEditDebtModal(false);
            setSelectedDebt(null);
          }}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedDebt && (
        <DetailDebtModal
          debt={selectedDebt}
          activeTab={activeTab === "installment" ? "customer" : activeTab}
          storeSettings={storeSettings}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedDebt(null);
          }}
        />
      )}

      {/* Delete Confirm Dialog */}
      {showDeleteConfirm && selectedDebt && (
        <DeleteConfirmDialog
          debt={selectedDebt}
          activeTab={activeTab === "installment" ? "customer" : activeTab}
          onClose={() => {
            setShowDeleteConfirm(false);
            setSelectedDebt(null);
          }}
          onConfirm={async () => {
            if (activeTab === "customer") {
              await deleteCustomerDebt.mutateAsync(selectedDebt.id);
            } else {
              await deleteSupplierDebt.mutateAsync(selectedDebt.id);
            }
            setShowDeleteConfirm(false);
            setSelectedDebt(null);

            queryClient.invalidateQueries({ queryKey: ["customer_debts"] });
            queryClient.invalidateQueries({ queryKey: ["supplier_debts"] });
          }}
        />
      )}
    </div>
  );
};

export default DebtManager;
