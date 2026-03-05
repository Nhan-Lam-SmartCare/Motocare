import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { InstallmentSetupModal } from "./modals/InstallmentSetupModal";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import {
    Boxes,
    ShoppingCart,
    History,
    Zap,
    Truck,
    ScanLine,
} from "lucide-react";
import { useAppContext } from "../../contexts/AppContext";
import { usePartsRepo } from "../../hooks/usePartsRepository";
import {
    useSalesPagedRepo,
    useCreateSaleAtomicRepo,
    useDeleteSaleRepo,
} from "../../hooks/useSalesRepository";
import { showToast } from "../../utils/toast";
import { getAvailableStock } from "../../lib/repository/partsRepository";

import { formatCurrency } from "../../utils/format";
import { useCustomers, useCreateCustomer } from "../../hooks/useSupabase";
import { useEmployeesRepo } from "../../hooks/useEmployeesRepository";
import { updateDeliveryStatus, completeDelivery } from "../../lib/repository/salesRepository";
import {
    useCreateCustomerDebtRepo,
    useCustomerDebtsRepo,
} from "../../hooks/useDebtsRepository";

// Modals
import { SaleDetailModal } from "./modals/SaleDetailModal";
import { ReceiptTemplateModal } from "./modals/ReceiptTemplateModal";
import { SalesHistoryModal } from "./modals/SalesHistoryModal";
import QuickServiceModal from "./QuickServiceModal";
import BarcodeScannerModal from "../common/BarcodeScannerModal";
import { DeliveryOrdersView } from "./DeliveryOrdersView";

// Custom Hooks
import { useSalesCart } from "./hooks/useSalesCart";
import { useCustomerSelection } from "./hooks/useCustomerSelection";
import { useBarcodeScanner } from "./hooks/useBarcodeScanner";
import { usePartInventory } from "./hooks/usePartInventory";
import { useSalesFinalization } from "./hooks/useSalesFinalization";
import { useSalesHistory } from "./hooks/useSalesHistory";
import { usePrintReceipt } from "./hooks/usePrintReceipt";

// Shared Components
import { ProductCard } from "./components/ProductCard";
import { CartItemRow } from "./components/CartItemRow";
import { CartSummary } from "./components/CartSummary";
import { CustomerSelector } from "./components/CustomerSelector";
import { PaymentMethodSelector } from "./components/PaymentMethodSelector";
import { BarcodeInputBar } from "./components/BarcodeInputBar";
import AddCustomerModal from "./components/AddCustomerModal";
import EditCustomerModal from "./components/EditCustomerModal";

import type { Sale, Part } from "../../types";

type DeliveryStatus = "pending" | "preparing" | "shipping" | "delivered" | "cancelled";

/**
 * SalesManager - Refactored version
 * This component is organized with custom hooks and shared components
 * for better maintainability and code reusability.
 */
const SalesManager: React.FC = () => {
    const { user, profile } = useAuth();
    const {
        cartItems,
        setCartItems,
        clearCart,
        currentBranchId,
    } = useAppContext();

    const queryClient = useQueryClient();

    // Data fetching hooks
    const { data: customers = [] } = useCustomers();
    const createCustomerMutation = useCreateCustomer();
    const {
        data: repoParts = [],
        isLoading: loadingParts,
        error: partsError,
    } = usePartsRepo();
    const { data: customerDebts = [] } = useCustomerDebtsRepo();
    const { mutateAsync: createSaleAtomicAsync } = useCreateSaleAtomicRepo();
    const { mutateAsync: deleteSaleAsync } = useDeleteSaleRepo();
    const createCustomerDebt = useCreateCustomerDebtRepo();

    // Mobile tab state
    const [mobileTab, setMobileTab] = useState<"products" | "cart" | "history">(
        "products"
    );
    const [showQuickServiceModal, setShowQuickServiceModal] = useState(false);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [showInstallmentModal, setShowInstallmentModal] = useState(false);
    const [actionFeedback, setActionFeedback] = useState<string | null>(null);
    const [cartPulse, setCartPulse] = useState(false);

    // Custom hooks
    const cart = useSalesCart(cartItems, setCartItems, clearCart);
    const customer = useCustomerSelection(customers);
    const barcode = useBarcodeScanner();
    const inventory = usePartInventory(
        repoParts,
        currentBranchId,
        loadingParts,
        partsError
    );
    const finalization = useSalesFinalization();
    const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const { data: employees = [] } = useEmployeesRepo();
    const history = useSalesHistory();
    const print = usePrintReceipt();

    const triggerCartFeedback = (message: string) => {
        setActionFeedback(message);
        setCartPulse(true);

        window.setTimeout(() => setCartPulse(false), 700);
        window.setTimeout(() => {
            setActionFeedback((current) => (current === message ? null : current));
        }, 1800);
    };

    const handleAddToCartWithFeedback = (part: Part, source: "tap" | "scan" = "tap") => {
        const stock = getAvailableStock(part, currentBranchId);
        const existingItem = cart.cartItemById.get(part.id);

        cart.addToCart(part, currentBranchId);

        if (stock <= 0 || (existingItem && existingItem.quantity >= stock)) {
            return;
        }

        const nextQuantity = (existingItem?.quantity ?? 0) + 1;
        const prefix = source === "scan" ? "Quét mã" : "Đã thêm";
        triggerCartFeedback(`${prefix}: ${part.name} x${nextQuantity}`);
    };

    // 🔹 REALTIME SUBSCRIPTION - Auto refresh when sales change
    useEffect(() => {
        const channel = supabase
            .channel("sales_realtime")
            .on(
                "postgres_changes",
                {
                    event: "*", // Listen to INSERT, UPDATE, DELETE
                    schema: "public",
                    table: "sales",
                },
                () => {
                    // Invalidate all sales queries to refetch data
                    queryClient.invalidateQueries({ queryKey: ["salesRepo"] });
                    queryClient.invalidateQueries({ queryKey: ["salesRepoPaged"] });
                    queryClient.invalidateQueries({ queryKey: ["salesRepoKeyset"] });
                }
            )
            .subscribe();

        // Cleanup on unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    // Delivery wrappers
    const handleUpdateDeliveryStatus = async (saleId: string, status: DeliveryStatus, shipperId?: string) => {
        await updateDeliveryStatus(saleId, status, shipperId);
        queryClient.invalidateQueries({ queryKey: ["salesRepoPaged"] });
    };

    const handleCompleteDelivery = async (saleId: string) => {
        await completeDelivery(saleId, currentBranchId);
        queryClient.invalidateQueries({ queryKey: ["salesRepoPaged"] });
    };

    // Sales history data
    const salesParams = {
        branchId: currentBranchId,
        page: history.useKeysetMode ? undefined : history.salesPage,
        pageSize: history.salesPageSize,
        search: history.salesSearch || undefined,
        fromDate: history.salesFromDate,
        toDate: history.salesToDate,
        mode: history.useKeysetMode ? ("keyset" as const) : ("offset" as const),
        afterDate: history.useKeysetMode ? history.keysetCursor?.afterDate : undefined,
        afterId: history.useKeysetMode ? history.keysetCursor?.afterId : undefined,
        status:
            history.salesStatus === "all"
                ? undefined
                : history.salesStatus === "cancelled"
                    ? ("refunded" as const)
                    : history.salesStatus === "completed"
                        ? ("completed" as const)
                        : (history.salesStatus as "refunded"),
        paymentMethod:
            history.salesPaymentMethod === "all" ? undefined : history.salesPaymentMethod,
    };

    const { data: pagedSalesData } = useSalesPagedRepo(salesParams);

    const repoSales = pagedSalesData?.data || [];
    const salesMeta = pagedSalesData?.meta || {
        page: 1,
        totalPages: 1,
        total: repoSales.length,
        hasMore: false,
    };

    // Handle edit sale (reopen in cart)
    const handleEditSale = (sale: Sale) => {
        if (
            !confirm("Mở lại hóa đơn này để chỉnh sửa? Giỏ hàng hiện tại sẽ bị xóa.")
        ) {
            return;
        }

        // Clear current cart
        cart.clearCart();

        // Load sale items into cart
        sale.items.forEach((item) => {
            const part = repoParts.find((p) => p.id === item.partId);
            if (part) {
                // Add to cart with correct quantity
                for (let i = 0; i < item.quantity; i++) {
                    cart.addToCart(part, currentBranchId);
                }
            }
        });

        // Load customer if exists
        if (sale.customer.id) {
            const cust = customers.find((c) => c.id === sale.customer.id);
            if (cust) {
                customer.setSelectedCustomer(cust);
                customer.setCustomerSearch(cust.name);
            }
        }

        // Load discount
        cart.setOrderDiscount(sale.discount || 0);

        // Set editing state
        setEditingSaleId(sale.id);

        // Close history modal
        history.setShowSalesHistory(false);

        showToast.success(`Đang sửa hóa đơn #${sale.sale_code || sale.id}. Lưu ý: Khi lưu, hóa đơn cũ sẽ bị xóa và tạo hóa đơn mới.`);
    };


    // Handle delete sale - Using atomic RPC for safety
    const handleDeleteSale = async (saleId: string) => {
        if (!confirm("Xác nhận xóa hóa đơn này? Hành động này không thể hoàn tác.")) {
            return;
        }

        try {
            // Use the atomic delete function
            await deleteSaleAsync({ id: saleId });

            // Invalidate all related queries
            queryClient.invalidateQueries({ queryKey: ["salesRepo"] });
            queryClient.invalidateQueries({ queryKey: ["salesRepoPaged"] });
            queryClient.invalidateQueries({ queryKey: ["salesRepoKeyset"] });
            queryClient.invalidateQueries({ queryKey: ["partsRepo"] });
            queryClient.invalidateQueries({ queryKey: ["inventoryTxRepo"] });
            queryClient.invalidateQueries({ queryKey: ["cashTransactions"] });

            showToast.success("Đã xóa hóa đơn và hoàn kho/tiền thành công!");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Lỗi không xác định";
            showToast.error(`Xóa hóa đơn thất bại: ${message}`);
            console.error("Delete sale error:", error);
        }
    };

    // Handle quick service complete
    const handleQuickServiceComplete = async (
        service: { id: string; name: string; price: number; category?: string },
        quantity: number,
        paymentMethod: "cash" | "bank",
        customer: {
            id?: string;
            name: string;
            phone: string;
            vehicleModel: string;
            licensePlate: string;
        },
        quickServiceNote?: string
    ) => {
        try {
            const finalQuickServiceNote = quickServiceNote?.trim()
                ? `Dịch vụ nhanh: ${service.name}\nGhi chú: ${quickServiceNote.trim()}`
                : `Dịch vụ nhanh: ${service.name}`;

            const saleData = {
                id: crypto.randomUUID(), // Required by createSaleAtomic
                items: [
                    {
                        partId: `quick_service_${service.id}`, // Prefix for RPC to skip stock validation
                        partName: service.name,
                        sku: `quick_service_${service.id}`,
                        quantity,
                        sellingPrice: service.price,
                        stockSnapshot: 999, // Quick service không cần validate stock
                        discount: 0,
                        isService: true, // Flag for RPC to skip stock operations
                    },
                ],
                customer: {
                    id: customer.id,
                    name: customer.name,
                    phone: customer.phone,
                },
                paymentMethod,
                discount: 0,
                branchId: currentBranchId,
                userId: user?.id || undefined,
                userName: profile?.name || profile?.full_name || user?.email || "Unknown",
                createdBy: user?.id || "",
                saleTime: new Date().toISOString(),
                paidAmount: service.price * quantity,
                note: finalQuickServiceNote,
            };

            const createdQuickSale = await createSaleAtomicAsync(saleData as unknown as Partial<Sale>);
            const quickSaleId = createdQuickSale?.id || saleData.id;

            // Backup update: ensure customer snapshot is persisted correctly
            if (quickSaleId) {
                await supabase
                    .from("sales")
                    .update({ customer: saleData.customer })
                    .eq("id", quickSaleId);
            }

            // Backup update: atomic RPC may not persist note field
            if (quickSaleId && finalQuickServiceNote) {
                await supabase
                    .from("sales")
                    .update({ note: finalQuickServiceNote })
                    .eq("id", quickSaleId);
            }

            showToast.success("Tạo đơn dịch vụ nhanh thành công!");

            // Refresh data
            queryClient.invalidateQueries({ queryKey: ["salesRepoPaged"] });
            queryClient.invalidateQueries({ queryKey: ["salesRepoKeyset"] });
            queryClient.invalidateQueries({ queryKey: ["salesRepo"] });
        } catch (error) {
            console.error("Error creating quick service sale:", error);
            const message = error instanceof Error ? error.message : "Không thể tạo đơn dịch vụ. Vui lòng thử lại.";
            showToast.error(message);
        }
    };

    // Handle finalize sale
    const handleFinalize = async () => {
        if (cart.cartItems.length === 0) {
            showToast.error("Giỏ hàng trống!");
            return;
        }

        // ✅ FIX: Validate stock availability before finalizing
        const outOfStockItems = cart.cartItems.filter(item => {
            const part = repoParts.find(p => p.id === item.partId);
            if (!part) return true; // Part not found = out of stock

            const available = getAvailableStock(part, currentBranchId);

            return item.quantity > available;
        });

        if (outOfStockItems.length > 0) {
            const itemNames = outOfStockItems.map(i => i.partName).join(", ");
            showToast.error(`Không đủ hàng trong kho: ${itemNames}`);
            return;
        }

        if (!finalization.paymentMethod) {
            showToast.error("Vui lòng chọn phương thức thanh toán!");
            return;
        }

        if (!finalization.paymentType) {
            showToast.error("Vui lòng chọn hình thức thanh toán!");
            return;
        }

        // Validate partial payment
        if (finalization.paymentType === "partial") {
            if (finalization.partialAmount <= 0 || finalization.partialAmount > cart.total) {
                showToast.error("Số tiền trả trước không hợp lệ!");
                return;
            }
        }

        // Validate COD delivery
        if (finalization.deliveryMethod === "cod") {
            if (!finalization.deliveryAddress || !finalization.deliveryPhone) {
                showToast.error("Vui lòng nhập địa chỉ và SĐT giao hàng!");
                return;
            }
        }

        try {
            const saleTime = finalization.useCurrentTime
                ? new Date().toISOString()
                : finalization.customSaleTime
                    ? new Date(finalization.customSaleTime).toISOString()
                    : new Date().toISOString();

            const paidAmount =
                finalization.paymentType === "full"
                    ? cart.total
                    : finalization.paymentType === "partial"
                        ? finalization.partialAmount
                        : finalization.paymentType === "installment"
                            ? finalization.installmentDetails.prepaidAmount
                            : 0;

            // Construct installment note
            let finalNote = finalization.orderNote || "";
            if (finalization.paymentType === "installment") {
                const { financeCompany, term, interestRate } = finalization.installmentDetails;
                const installmentText = `[TRẢ GÓP] ${financeCompany === 'Store' ? 'Cửa hàng' : financeCompany} - Trả trước: ${finalization.installmentDetails.prepaidAmount.toLocaleString()}đ - Kỳ hạn: ${term} tháng - Lãi: ${interestRate}%/tháng - Gốc+Lãi: ${finalization.installmentDetails.totalDetail.toLocaleString()}đ`;
                finalNote = finalNote ? `${finalNote}\n${installmentText}` : installmentText;
            }

            const saleData = {
                id: crypto.randomUUID(),
                items: cart.cartItems,
                customer: customer.selectedCustomer
                    ? {
                        id: customer.selectedCustomer.id,
                        name: customer.selectedCustomer.name,
                        phone: customer.selectedCustomer.phone || "",
                    }
                    : { name: "Khách vãng lai", phone: "" },
                paymentMethod: finalization.paymentMethod,
                discount: cart.effectiveDiscount, // Use recomputed discount (correct when discountType=percent)
                branchId: currentBranchId,
                userId: user?.id || undefined,
                userName: profile?.name || profile?.full_name || user?.email || "Unknown",
                createdBy: user?.id || "",
                saleTime,
                paidAmount,
                note: finalNote, // Use the constructed note
                delivery: finalization.deliveryMethod === "cod"
                    ? {
                        method: "cod" as const,
                        address: finalization.deliveryAddress,
                        phone: finalization.deliveryPhone,
                        notes: finalization.deliveryNotes || undefined,
                        shipperId: finalization.shipperId || undefined,
                        codAmount: finalization.codAmount || cart.total,
                        shippingFee: finalization.shippingFee || 0,
                        trackingNumber: finalization.trackingNumber || undefined,
                        shippingCarrier: finalization.shippingCarrier || undefined,
                        estimatedDeliveryDate: finalization.estimatedDeliveryDate || undefined,
                    }
                    : undefined,
            };

            const newSale = await createSaleAtomicAsync(saleData as unknown as Partial<Sale>);
            const saleId = newSale?.id;

            // Backup update: ensure customer snapshot is persisted correctly
            if (saleId) {
                await supabase
                    .from("sales")
                    .update({ customer: saleData.customer })
                    .eq("id", saleId);
            }

            // Force update note if it wasn't saved by RPC (backup)
            if (finalization.paymentType === "installment" && saleId) {
                await supabase.from("sales").update({ note: finalNote }).eq("id", saleId);
            }

            // Create customer debt if needed
            if (finalization.paymentType === "partial" || finalization.paymentType === "note") {
                const remainingAmount = cart.total - paidAmount;
                if (remainingAmount > 0 && customer.selectedCustomer) {
                    await createCustomerDebt.mutateAsync({
                        customerId: customer.selectedCustomer.id!,
                        customerName: customer.selectedCustomer.name,
                        totalAmount: remainingAmount,
                        paidAmount: 0,
                        remainingAmount: remainingAmount,
                        description: `Nợ từ đơn hàng ${saleId}`,
                        branchId: currentBranchId,
                        createdDate: new Date().toISOString(),
                    });
                }
            } else if (finalization.paymentType === "installment" && customer.selectedCustomer) {
                const remaining = cart.total - paidAmount;
                // We track the PRINCIPAL debt here. Interest is usually tracked separately or added later? 
                // User requirement: "ghi nhận vào trang công nợ". Usually debt record is the principal remaining.

                const { financeCompany, term } = finalization.installmentDetails;
                let description = "";

                if (financeCompany === "Store") {
                    description = `Trả góp cửa hàng - Đơn ${saleId} (${term} tháng)`;
                } else {
                    description = `Chờ giải ngân - ${financeCompany} (${term} tháng) - Đơn ${saleId}`;
                }

                await createCustomerDebt.mutateAsync({
                    customerId: customer.selectedCustomer.id!,
                    customerName: customer.selectedCustomer.name,
                    totalAmount: remaining,
                    paidAmount: 0, // Haven't paid the debt yet
                    remainingAmount: remaining,
                    description: description,
                    branchId: currentBranchId,
                    createdDate: new Date().toISOString(),
                });
            }

            showToast.success("Tạo đơn hàng thành công!");
            triggerCartFeedback("Thanh toán thành công");

            // Auto print if enabled
            if (finalization.autoPrintReceipt) {
                print.handlePrintReceipt(newSale);
            }

            // Reset all states
            cart.clearCart();
            cart.setOrderDiscount(0);
            customer.setSelectedCustomer(null);
            customer.setCustomerSearch("");
            finalization.resetFinalizationState();

            // Refresh data
            queryClient.invalidateQueries({ queryKey: ["sales"] });
            queryClient.invalidateQueries({ queryKey: ["parts"] });
        } catch (error) {
            console.error("Error creating sale:", error);
            const message = error instanceof Error ? error.message : "Không thể tạo đơn hàng. Vui lòng thử lại.";
            showToast.error(message);
        }
    };

    return (
        <div className="min-h-screen max-w-full overflow-x-hidden bg-slate-50 dark:bg-slate-900 pb-16 md:pb-0">
            {/* Mobile Bottom Tabs */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 safe-area-bottom">
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg -z-10"></div>
                <div className="grid grid-cols-4 gap-1 px-2 py-2">
                    <button
                        onClick={() => setMobileTab("products")}
                        className={`flex flex-col items-center gap-1 px-1 py-1.5 rounded-lg transition-all duration-200 ${mobileTab === "products"
                            ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
                            : "text-slate-600 dark:text-slate-400 active:scale-95"
                            }`}
                    >
                        <Boxes className={`w-6 h-6 ${mobileTab === "products" ? "scale-105" : ""}`} />
                        <span className={`text-[9px] font-medium ${mobileTab === "products" ? "font-semibold" : ""}`}>
                            Sản phẩm
                        </span>
                    </button>

                    <button
                        onClick={() => setMobileTab("cart")}
                        className={`flex flex-col items-center gap-1 px-1 py-1.5 rounded-lg transition-all relative ${mobileTab === "cart"
                            ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
                            : "text-slate-600 dark:text-slate-400"
                            }`}
                    >
                        <ShoppingCart className={`w-6 h-6 ${mobileTab === "cart" ? "scale-105" : ""}`} />
                        {cart.cartItems.length > 0 && (
                            <span className="absolute top-0 right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {cart.cartItems.length}
                            </span>
                        )}
                        <span className={`text-[9px] font-medium ${mobileTab === "cart" ? "font-semibold" : ""}`}>
                            Giỏ hàng
                        </span>
                    </button>

                    <button
                        onClick={() => setShowQuickServiceModal(true)}
                        className="flex flex-col items-center gap-1 px-1 py-1.5 rounded-lg text-amber-600 dark:text-amber-400 active:scale-95"
                    >
                        <Zap className="w-6 h-6" />
                        <span className="text-[9px] font-medium">DV nhanh</span>
                    </button>

                    <button
                        onClick={() => {
                            history.setShowSalesHistory(true);
                            setMobileTab("history");
                        }}
                        className={`flex flex-col items-center gap-1 px-1 py-1.5 rounded-lg transition-all ${mobileTab === "history"
                            ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
                            : "text-slate-600 dark:text-slate-400"
                            }`}
                    >
                        <History className={`w-6 h-6 ${mobileTab === "history" ? "scale-105" : ""}`} />
                        <span className={`text-[9px] font-medium ${mobileTab === "history" ? "font-semibold" : ""}`}>
                            Lịch sử
                        </span>
                    </button>
                </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:block bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 backdrop-blur-lg bg-white/80 dark:bg-slate-800/80">
                <div className="mx-auto px-6 py-4 space-y-4">
                    {/* <TetBanner compact /> */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
                                    <ShoppingCart className="w-5 h-5 text-white" />
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    Quản lý bán hàng
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">

                            <button
                                onClick={() => setShowQuickServiceModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 text-slate-300 border border-slate-700/50 rounded-lg hover:text-amber-400 hover:bg-slate-700 hover:border-amber-500/30 transition-all"
                            >
                                <Zap className="w-5 h-5" />
                                <span className="font-medium">Dịch vụ nhanh</span>
                            </button>

                            <button
                                onClick={() => history.setShowSalesHistory(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 text-slate-300 border border-slate-700/50 rounded-lg hover:text-blue-400 hover:bg-slate-700 hover:border-blue-500/30 transition-all"
                            >
                                <History className="w-5 h-5" />
                                <span className="font-medium">Lịch sử</span>
                            </button>

                            <button
                                onClick={() => setShowDeliveryModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 text-slate-300 border border-slate-700/50 rounded-lg hover:text-emerald-400 hover:bg-slate-700 hover:border-emerald-500/30 transition-all"
                            >
                                <Truck className="w-5 h-5" />
                                <span className="font-medium">Giao hàng</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Barcode Input Bar (Desktop) */}
            {barcode.showBarcodeInput && (
                <BarcodeInputBar
                    value={barcode.barcodeInput}
                    onChange={barcode.setBarcodeInput}
                    onSubmit={(e) =>
                        barcode.handleBarcodeSubmit(e, inventory.filteredParts, (part) =>
                            handleAddToCartWithFeedback(part, "scan")
                        )
                    }
                    onCameraClick={() => barcode.setShowCameraScanner(true)}
                    onClose={() => barcode.setShowBarcodeInput(false)}
                    inputRef={barcode.barcodeInputRef}
                    showCloseButton
                />
            )}

            {/* Main Content */}
            <div className="mx-auto px-4 md:px-6 py-6 space-y-4">
                {/* <div className="md:hidden">
                    <TetBanner compact />
                </div> */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Products (Desktop) / Mobile Tab Content */}
                    <div className={`lg:col-span-2 ${mobileTab !== "products" ? "hidden md:block" : ""}`}>
                        {/* Search Bar with Scan Button + Wholesale Toggle */}
                        <div className="mb-3 flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Tìm sản phẩm..."
                                value={inventory.partSearch}
                                onChange={(e) => inventory.setPartSearch(e.target.value)}
                                className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg text-base text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/30"
                            />
                            {/* Mobile Wholesale Toggle */}
                            <button
                                type="button"
                                onClick={() => cart.setIsWholesaleMode(!cart.isWholesaleMode)}
                                className={`md:hidden flex items-center gap-1 px-3 py-3 rounded-lg text-xs font-bold transition-all shrink-0 ${cart.isWholesaleMode
                                    ? "bg-green-600 text-white shadow-sm"
                                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                                    }`}
                                title="Bật/tắt giá sỉ"
                            >
                                💰
                                {cart.isWholesaleMode && <span>Sỉ</span>}
                            </button>
                            <button
                                onClick={() => barcode.setShowBarcodeInput(!barcode.showBarcodeInput)}
                                className="flex items-center gap-2 px-4 py-3 bg-slate-800/80 text-slate-300 rounded-lg hover:text-purple-400 hover:bg-slate-700 transition-all shrink-0 border border-slate-700/50 hover:border-purple-500/30 group"
                            >
                                <ScanLine className="w-5 h-5 group-hover:text-purple-400 transition-colors text-slate-400" />
                                <span className="font-medium hidden md:inline">Quét mã</span>
                            </button>
                        </div>

                        {actionFeedback && (
                            <div className="mb-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
                                <span className="text-base leading-none">✓</span>
                                <span className="line-clamp-1">{actionFeedback}</span>
                            </div>
                        )}

                        {/* Filter Pills with Counts */}
                        <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                Hiển thị {inventory.displayedParts.length} / {inventory.filteredParts.length} sản phẩm
                                {inventory.partSearch && " theo từ khóa"}
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                <button
                                    type="button"
                                    onClick={() => inventory.setStockFilter("all")}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${inventory.stockFilter === "all"
                                        ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                        : "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                                        }`}
                                >
                                    <span>Tất cả</span>
                                    <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${inventory.stockFilter === "all"
                                            ? "bg-blue-100 dark:bg-blue-500/20"
                                            : "bg-slate-200 dark:bg-slate-700"
                                            }`}
                                    >
                                        {inventory.repoParts.length}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => inventory.setStockFilter("low")}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${inventory.stockFilter === "low"
                                        ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                        : "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                                        }`}
                                >
                                    <span>Tồn thấp</span>
                                    <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${inventory.stockFilter === "low"
                                            ? "bg-amber-100 dark:bg-amber-500/20"
                                            : "bg-slate-200 dark:bg-slate-700"
                                            }`}
                                    >
                                        {inventory.repoParts.filter(p => {
                                            const stock = Number(p.stock?.[currentBranchId] ?? 0);
                                            return stock > 0 && stock <= 5;
                                        }).length}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => inventory.setStockFilter("out")}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${inventory.stockFilter === "out"
                                        ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                                        : "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                                        }`}
                                >
                                    <span>Hết hàng</span>
                                    <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${inventory.stockFilter === "out"
                                            ? "bg-red-100 dark:bg-red-500/20"
                                            : "bg-slate-200 dark:bg-slate-700"
                                            }`}
                                    >
                                        {inventory.repoParts.filter(p => {
                                            const stock = Number(p.stock?.[currentBranchId] ?? 0);
                                            return stock <= 0;
                                        }).length}
                                    </span>
                                </button>

                                {/* Wholesale Toggle */}
                                <div className="hidden md:block h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                <button
                                    type="button"
                                    onClick={() => cart.setIsWholesaleMode(!cart.isWholesaleMode)}
                                    className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${cart.isWholesaleMode
                                        ? "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400"
                                        : "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                                        }`}
                                    title="Bật để tự động áp dụng giá sỉ khi thêm sản phẩm"
                                >
                                    <span>💰 Giá sỉ</span>
                                    {cart.isWholesaleMode && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-green-500/20">
                                            ON
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Products Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                            {inventory.displayedParts.map((part) => (
                                <ProductCard
                                    key={part.id}
                                    part={part}
                                    currentBranchId={currentBranchId}
                                    inCart={cart.cartItemById.has(part.id)}
                                    onAddToCart={(p) => handleAddToCartWithFeedback(p, "tap")}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right: Cart (Desktop) / Mobile Tab Content */}
                    <div className={`lg:col-span-1 ${mobileTab !== "cart" ? "hidden lg:block" : ""}`}>
                        <div className={`sticky top-24 transition-all ${cartPulse ? "ring-2 ring-emerald-400/70 rounded-2xl" : ""}`}>
                            {editingSaleId && (
                                <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 flex justify-between items-center animate-pulse">
                                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                                        <span className="text-xl">✏️</span>
                                        <div>
                                            <div className="text-sm">Đang sửa hóa đơn</div>
                                            <div className="text-xs font-normal opacity-80">Thay đổi sẽ tạo hóa đơn mới</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (confirm("Hủy sửa? Các thay đổi sẽ mất.")) {
                                                setEditingSaleId(null);
                                                cart.clearCart();
                                                showToast.info("Đã hủy chế độ sửa");
                                            }
                                        }}
                                        className="text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded border hover:bg-slate-50"
                                    >
                                        Hủy
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold">Giỏ hàng</h2>
                                {cart.isWholesaleMode && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs font-bold rounded-full shadow-sm">
                                        💰 Giá sỉ
                                    </span>
                                )}
                            </div>

                            {/* Customer Selection */}
                            <div className="mb-4">
                                <label className="block text-sm font-semibold mb-2">Khách hàng</label>
                                <CustomerSelector
                                    selectedCustomer={customer.selectedCustomer}
                                    customers={customer.filteredCustomers}
                                    customerSearch={customer.customerSearch}
                                    showDropdown={customer.showCustomerDropdown}
                                    onSearchChange={customer.setCustomerSearch}
                                    onSelect={(c) => customer.setSelectedCustomer(c)}
                                    onClear={() => customer.setSelectedCustomer(null)}
                                    onAddNew={() => customer.setShowAddCustomerModal(true)}
                                    onEditCustomer={() => customer.setShowEditCustomerModal(true)}
                                    onDropdownToggle={customer.setShowCustomerDropdown}
                                    isSearching={customer.isSearchingCustomer}
                                    hasMoreCustomers={customer.hasMoreCustomers}
                                    onLoadMore={customer.handleLoadMoreCustomers}
                                />
                            </div>

                            {/* Cart Items */}
                            <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
                                {cart.cartItems.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">Giỏ hàng trống</div>
                                ) : (
                                    cart.cartItems.map((item) => (
                                        <CartItemRow
                                            key={item.partId}
                                            item={item}
                                            onUpdateQuantity={cart.updateCartQuantity}
                                            onUpdatePrice={cart.updateCartPrice}
                                            onRemove={cart.removeFromCart}
                                        />
                                    ))
                                )}
                            </div>

                            {/* Cart Summary */}
                            {cart.cartItems.length > 0 && (
                                <>
                                    <CartSummary
                                        subtotal={cart.subtotal}
                                        discount={cart.orderDiscount}
                                        total={cart.total}
                                        discountType={cart.discountType}
                                        discountPercent={cart.discountPercent}
                                        onDiscountChange={cart.setOrderDiscount}
                                        onDiscountTypeChange={cart.setDiscountType}
                                        onDiscountPercentChange={cart.setDiscountPercent}
                                    />

                                    {/* Payment Selection */}
                                    <div className="mt-4">
                                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                                            <PaymentMethodSelector
                                                paymentMethod={finalization.paymentMethod}
                                                paymentType={finalization.paymentType}
                                                partialAmount={finalization.partialAmount}
                                                total={cart.total}
                                                onPaymentMethodChange={finalization.setPaymentMethod}
                                                onPaymentTypeChange={(type) => {
                                                    finalization.setPaymentType(type);
                                                    if (type === "installment") {
                                                        setShowInstallmentModal(true);
                                                    }
                                                }}
                                                onPartialAmountChange={finalization.setPartialAmount}
                                                onOpenInstallmentSetup={() => setShowInstallmentModal(true)}
                                                installmentDetails={finalization.installmentDetails}
                                            />
                                        </div>
                                    </div>

                                    {/* ... Note and Time ... */}

                                    <InstallmentSetupModal
                                        isOpen={showInstallmentModal}
                                        onClose={() => setShowInstallmentModal(false)}
                                        totalAmount={cart.total}
                                        onSave={finalization.setInstallmentDetails}
                                        initialDetails={finalization.installmentDetails}
                                    />
                                    {/* Delivery Form Section */}
                                    {finalization.paymentMethod && (
                                        <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                                <Truck className="w-4 h-4" />
                                                🚚 Giao hàng
                                            </h4>

                                            {/* Pickup vs Delivery Toggle */}
                                            <div className="flex gap-4 mb-3">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        checked={finalization.deliveryMethod !== "cod"}
                                                        onChange={() => finalization.setDeliveryMethod("store_pickup")}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    <span className="text-sm">🏪 Tự lấy</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        checked={finalization.deliveryMethod === "cod"}
                                                        onChange={() => finalization.setDeliveryMethod("cod")}
                                                        className="w-4 h-4 text-orange-600"
                                                    />
                                                    <span className="text-sm">🚚 Giao hàng COD</span>
                                                </label>
                                            </div>

                                            {/* Delivery Form (if COD selected) */}
                                            {finalization.deliveryMethod === "cod" && (
                                                <div className="space-y-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">
                                                            Địa chỉ <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={finalization.deliveryAddress}
                                                            onChange={(e) => finalization.setDeliveryAddress(e.target.value)}
                                                            placeholder="Nhập địa chỉ giao hàng"
                                                            className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">SĐT nhận hàng</label>
                                                        <input
                                                            type="tel"
                                                            value={finalization.deliveryPhone}
                                                            onChange={(e) => finalization.setDeliveryPhone(e.target.value)}
                                                            placeholder="Số điện thoại"
                                                            className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">Mã vận đơn</label>
                                                        <input
                                                            type="text"
                                                            value={finalization.trackingNumber || ''}
                                                            onChange={(e) => finalization.setTrackingNumber(e.target.value)}
                                                            placeholder="Nhập mã vận đơn (nếu có)"
                                                            className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 font-mono"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">Đơn vị vận chuyển</label>
                                                        <select
                                                            value={["GHTK", "GHN", "ViettelPost", "VNPost", "J&T", "NinjaVan", "BestExpress", "ShopeeXpress", "SuperShip", "Nasco", "EMS", "Ahamove", "GrabExpress"].includes(finalization.shippingCarrier || '') ? finalization.shippingCarrier : (finalization.shippingCarrier ? "Other" : "")}
                                                            onChange={(e) => {
                                                                if (e.target.value === "Other") {
                                                                    finalization.setShippingCarrier(" ");
                                                                } else {
                                                                    finalization.setShippingCarrier(e.target.value);
                                                                }
                                                            }}
                                                            className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700"
                                                        >
                                                            <option value="">-- Chọn đơn vị --</option>
                                                            <option value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</option>
                                                            <option value="GHN">Giao Hàng Nhanh (GHN)</option>
                                                            <option value="ViettelPost">Viettel Post</option>
                                                            <option value="VNPost">VNPost</option>
                                                            <option value="J&T">J&T Express</option>
                                                            <option value="NinjaVan">Ninja Van</option>
                                                            <option value="BestExpress">Best Express</option>
                                                            <option value="ShopeeXpress">Shopee Xpress (SPX)</option>
                                                            <option value="SuperShip">SuperShip</option>
                                                            <option value="Nasco">Nasco Express</option>
                                                            <option value="EMS">EMS (Bưu điện)</option>
                                                            <option value="Ahamove">Ahamove</option>
                                                            <option value="GrabExpress">Grab Express</option>
                                                            <option value="Other">Khác (Nhập tay)</option>
                                                        </select>
                                                        {finalization.shippingCarrier && !["GHTK", "GHN", "ViettelPost", "VNPost", "J&T", "NinjaVan", "BestExpress", "ShopeeXpress", "SuperShip", "Nasco", "EMS", "Ahamove", "GrabExpress"].includes(finalization.shippingCarrier) && (
                                                            <input
                                                                type="text"
                                                                autoFocus
                                                                value={finalization.shippingCarrier.trim()}
                                                                onChange={(e) => finalization.setShippingCarrier(e.target.value)}
                                                                placeholder="Nhập tên đơn vị vận chuyển..."
                                                                className="mt-2 w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 border-blue-500 ring-1 ring-blue-500"
                                                            />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1">Phí ship</label>
                                                        <input
                                                            type="number"
                                                            value={finalization.shippingFee || ''}
                                                            onChange={(e) => finalization.setShippingFee(Number(e.target.value))}
                                                            placeholder="0"
                                                            className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700"
                                                        />
                                                    </div>
                                                    <div className="pt-2 border-t border-orange-300 dark:border-orange-700">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm font-medium">COD cần thu:</span>
                                                            <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                                                {formatCurrency(cart.total + (finalization.shippingFee || 0))}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Options Section - Time, Note, Auto-print */}
                                    {finalization.paymentMethod && finalization.paymentType && (
                                        <div className="mt-4 px-3 md:px-4 space-y-3">
                                            {/* Time Options */}
                                            <div>
                                                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                                                    Thời gian bán hàng
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => finalization.setUseCurrentTime(true)}
                                                        className={`px-3 py-2 rounded-lg border transition-all font-semibold ${finalization.useCurrentTime
                                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                                            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                                            }`}
                                                    >
                                                        <span className="text-xs">🕐 Hiện tại</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => finalization.setUseCurrentTime(false)}
                                                        className={`px-3 py-2 rounded-lg border transition-all font-semibold ${!finalization.useCurrentTime
                                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                                            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                                            }`}
                                                    >
                                                        <span className="text-xs">📅 Tùy chỉnh</span>
                                                    </button>
                                                </div>
                                                {!finalization.useCurrentTime && (
                                                    <input
                                                        type="datetime-local"
                                                        value={finalization.customSaleTime}
                                                        onChange={(e) => finalization.setCustomSaleTime(e.target.value)}
                                                        className="mt-2 w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700"
                                                    />
                                                )}
                                            </div>

                                            {/* Note & Auto-print Toggles */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => finalization.setShowOrderNote(!finalization.showOrderNote)}
                                                    className={`px-3 py-2 rounded-lg border transition-all font-semibold ${finalization.showOrderNote
                                                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                                        : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                                        }`}
                                                >
                                                    <span className="text-xs">📝 Ghi chú</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => finalization.setAutoPrintReceipt(!finalization.autoPrintReceipt)}
                                                    className={`px-3 py-2 rounded-lg border transition-all font-semibold ${finalization.autoPrintReceipt
                                                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                                        : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                                        }`}
                                                >
                                                    <span className="text-xs">🖨️ In hoá đơn</span>
                                                </button>
                                            </div>

                                            {/* Note Textarea */}
                                            {finalization.showOrderNote && (
                                                <textarea
                                                    value={finalization.orderNote}
                                                    onChange={(e) => finalization.setOrderNote(e.target.value)}
                                                    placeholder="Nhập ghi chú cho đơn hàng..."
                                                    rows={3}
                                                    className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 resize-none"
                                                />
                                            )}
                                        </div>
                                    )}

                                    {/* Action Buttons - Save Draft + Finalize */}
                                    <div className="mt-4 p-3 md:p-4 pt-0 flex gap-3">
                                        <button
                                            onClick={cart.clearCart}
                                            className="flex-1 px-4 py-3 bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-all"
                                        >
                                            LƯU NHÁP
                                        </button>
                                        <button
                                            onClick={handleFinalize}
                                            disabled={!finalization.paymentMethod || !finalization.paymentType}
                                            className={`flex-1 px-4 py-3 font-black rounded-xl transition-all shadow-lg ${finalization.paymentMethod && finalization.paymentType
                                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/30 hover:shadow-xl hover:scale-[1.02] ring-1 ring-blue-300/40"
                                                : "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed opacity-60"
                                                }`}
                                        >
                                            {editingSaleId ? "CẬP NHẬT" : "XUẤT BÁN"}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {
                customer.showAddCustomerModal && (
                    <AddCustomerModal
                        isOpen={true}
                        newCustomer={customer.newCustomer}
                        onCustomerChange={customer.setNewCustomer}
                        onSave={() => customer.handleSaveNewCustomer(customers, createCustomerMutation)}
                        onClose={() => customer.setShowAddCustomerModal(false)}
                    />
                )
            }

            {
                customer.showEditCustomerModal && customer.selectedCustomer && (
                    <EditCustomerModal
                        isOpen={true}
                        customer={customer.selectedCustomer}
                        onClose={() => customer.setShowEditCustomerModal(false)}
                        onSaveSuccess={(updatedCustomer) => {
                            customer.setSelectedCustomer(updatedCustomer);
                            customer.setShowEditCustomerModal(false);
                            // Optionally refresh customer queries depending on how the list is re-fetched
                            queryClient.invalidateQueries({ queryKey: ["customers"] });
                        }}
                    />
                )
            }

            {
                barcode.showCameraScanner && (
                    <BarcodeScannerModal
                        isOpen={barcode.showCameraScanner}
                        onClose={() => barcode.setShowCameraScanner(false)}
                        onScan={(code) =>
                            barcode.handleCameraScan(code, repoParts, cart.cartItems, (part) =>
                                handleAddToCartWithFeedback(part, "scan")
                            )
                        }
                    />
                )
            }

            {
                showQuickServiceModal && (
                    <QuickServiceModal
                        isOpen={showQuickServiceModal}
                        onClose={() => setShowQuickServiceModal(false)}
                        onComplete={handleQuickServiceComplete}
                    />
                )
            }


            {/* Sales History Modal - Complete implementation */}
            {
                history.showSalesHistory && (
                    <SalesHistoryModal
                        isOpen={history.showSalesHistory}
                        onClose={() => history.setShowSalesHistory(false)}
                        sales={repoSales}
                        currentBranchId={currentBranchId}
                        onPrintReceipt={(sale) => print.handlePrintReceipt(sale)}
                        onEditSale={handleEditSale}
                        onDeleteSale={handleDeleteSale}
                        page={history.salesPage}
                        totalPages={Math.ceil((salesMeta?.total || 0) / history.salesPageSize)}
                        total={salesMeta?.total || 0}
                        hasMore={history.salesPage < Math.ceil((salesMeta?.total || 0) / history.salesPageSize)}
                        pageSize={history.salesPageSize}
                        onPrevPage={history.goPrevPage}
                        onNextPage={history.goNextPage}
                        onPageSizeChange={history.changePageSize}
                        search={history.salesSearchInput}
                        onSearchChange={history.setSalesSearchInput}
                        fromDate={history.salesFromDate}
                        toDate={history.salesToDate}
                        onDateRangeChange={(from, to) => {
                            history.setSalesFromDate(from);
                            history.setSalesToDate(to);
                            history.setSalesPage(1);
                            history.setKeysetCursor(null);
                        }}
                        status={history.salesStatus}
                        onStatusChange={(s) => {
                            history.setSalesStatus(s);
                            history.setSalesPage(1);
                            history.setKeysetCursor(null);
                        }}
                        paymentMethodFilter={history.salesPaymentMethod}
                        onPaymentMethodFilterChange={(m) => {
                            history.setSalesPaymentMethod(m);
                            history.setSalesPage(1);
                            history.setKeysetCursor(null);
                        }}
                        keysetMode={history.useKeysetMode}
                        onToggleKeyset={(checked) => {
                            history.setUseKeysetMode(checked);
                            history.setSalesPage(1);
                            history.setKeysetCursor(null);
                        }}
                        customerDebts={customerDebts}
                        onViewDetail={(sale) => setSelectedSale(sale)}
                        canDelete={true}
                    />
                )
            }

            {/* Sale Detail Modal */}
            {selectedSale && (
                <SaleDetailModal
                    isOpen={!!selectedSale}
                    onClose={() => setSelectedSale(null)}
                    sale={selectedSale}
                    onPrint={(sale) => print.handlePrintReceipt(sale)}
                />
            )}

            {/* Print Preview Modal */}
            {print.showPrintPreview && print.printSale && (
                <ReceiptTemplateModal
                    isOpen={print.showPrintPreview}
                    onClose={() => print.setShowPrintPreview(false)}
                    sale={print.printSale}
                    storeSettings={print.storeSettings}
                    onPrint={print.handleDoPrint}
                />
            )}

            {/* Delivery Manager Modal */}
            {showDeliveryModal && (
                <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 overflow-y-auto animate-fade-in">
                    <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between shadow-sm">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Truck className="w-5 h-5 text-green-600" />
                            Quản lý giao hàng
                        </h2>
                        <button
                            onClick={() => setShowDeliveryModal(false)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                        >
                            <span className="sr-only">Đóng</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="p-4">
                        <DeliveryOrdersView
                            sales={repoSales}
                            employees={employees}
                            onUpdateStatus={handleUpdateDeliveryStatus}
                            onCompleteDelivery={handleCompleteDelivery}
                        />
                    </div>
                </div>
            )}
        </div >
    );
};

export default SalesManager;
