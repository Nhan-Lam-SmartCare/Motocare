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
    Plus,
} from "lucide-react";
import { useAppContext } from "../../contexts/AppContext";
import { usePartsRepo } from "../../hooks/usePartsRepository";
import {
    useSalesPagedRepo,
    useCreateSaleAtomicRepo,
    useUpdateSaleAtomicRepo,
    useDeleteSaleRepo,
} from "../../hooks/useSalesRepository";
import { showToast } from "../../utils/toast";
import { canDo } from "../../utils/permissions";
import { getAvailableStock } from "../../lib/repository/partsRepository";

import { formatCurrency } from "../../utils/format";
import { useCustomers, useCreateCustomer } from "../../hooks/useSupabase";
import { useEmployeesRepo } from "../../hooks/useEmployeesRepository";
import { updateDeliveryStatus, completeDelivery } from "../../lib/repository/salesRepository";
import { createCashTransaction } from "../../lib/repository/cashTransactionsRepository";
import { updatePaymentSourceBalance } from "../../lib/repository/paymentSourcesRepository";
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
import { NumberInput } from "../common/NumberInput";
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
import { BarcodeInputBar } from "./components/BarcodeInputBar";
import AddCustomerModal from "./components/AddCustomerModal";
import EditCustomerModal from "./components/EditCustomerModal";
import { ProductCatalogSection, CartSection, CheckoutSection } from "./components/manager";
import { useConfirm } from "../../hooks/useConfirm";
import ConfirmModal from "../common/ConfirmModal";

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
    const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

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
    const { mutateAsync: updateSaleAtomicAsync } = useUpdateSaleAtomicRepo();
    const { mutateAsync: deleteSaleAsync } = useDeleteSaleRepo();
    const createCustomerDebt = useCreateCustomerDebtRepo();

    // Mobile tab state
    const [mobileTab, setMobileTab] = useState<"products" | "cart">(
        "products"
    );
    const [showQuickServiceModal, setShowQuickServiceModal] = useState(false);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [showInstallmentModal, setShowInstallmentModal] = useState(false);
    const [actionFeedback, setActionFeedback] = useState<string | null>(null);
    const [cartPulse, setCartPulse] = useState(false);
    const [showManualItemForm, setShowManualItemForm] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [manualItemName, setManualItemName] = useState("");
    const [manualItemCost, setManualItemCost] = useState<number>(0);
    const [manualItemPrice, setManualItemPrice] = useState<number>(0);
    const [manualItemQty, setManualItemQty] = useState<number>(1);

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

    const [hasDraft, setHasDraft] = useState(false);
    const [hasPromptedDraft, setHasPromptedDraft] = useState(false);

    // Monitor if a draft is available in localStorage
    useEffect(() => {
        const draftKey = `sales_draft_${currentBranchId}`;
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                setHasDraft(!!(draft && draft.items && draft.items.length > 0));
            } catch {
                setHasDraft(false);
            }
        } else {
            setHasDraft(false);
        }
    }, [currentBranchId, cartItems]);

    // Reset prompt state when changing branches
    useEffect(() => {
        setHasPromptedDraft(false);
    }, [currentBranchId]);

    // Save draft handler
    const handleSaveDraft = () => {
        if (cart.cartItems.length === 0) {
            showToast.error("Giỏ hàng trống, không thể lưu nháp!");
            return;
        }
        const draftData = {
            items: cart.cartItems,
            customerId: customer.selectedCustomer?.id || null,
            discount: cart.orderDiscount,
            discountType: cart.discountType,
            discountPercent: cart.discountPercent,
            timestamp: Date.now(),
        };
        localStorage.setItem(`sales_draft_${currentBranchId}`, JSON.stringify(draftData));
        showToast.success("Đã lưu nháp giỏ hàng thành công!");
        cart.clearCart();
        customer.setSelectedCustomer(null);
        customer.setCustomerSearch("");
        setHasDraft(true);
    };

    // Manual draft restore handler
    const handleRestoreDraftManual = async () => {
        const draftKey = `sales_draft_${currentBranchId}`;
        const savedDraft = localStorage.getItem(draftKey);
        if (!savedDraft) {
            showToast.error("Không tìm thấy giỏ hàng nháp!");
            return;
        }

        if (cartItems.length > 0) {
            const confirmed = await confirm({
                title: "Xác nhận ghi đè",
                message: "Giỏ hàng hiện tại đang có sản phẩm. Bạn có chắc muốn ghi đè bằng giỏ hàng nháp không?",
                confirmColor: "blue",
                confirmText: "Ghi đè",
                cancelText: "Hủy",
            });
            if (!confirmed) return;
        }

        try {
            const draft = JSON.parse(savedDraft);
            if (draft.items && draft.items.length > 0) {
                setCartItems(draft.items);
                if (draft.customerId) {
                    const cust = customers.find((c: any) => c.id === draft.customerId);
                    if (cust) {
                        customer.setSelectedCustomer(cust);
                        customer.setCustomerSearch(cust.name);
                    }
                }
                cart.setOrderDiscount(draft.discount || 0);
                if (draft.discountType) cart.setDiscountType(draft.discountType);
                if (draft.discountPercent) cart.setDiscountPercent(draft.discountPercent);
                showToast.success("Đã khôi phục giỏ hàng nháp thành công!");
                localStorage.removeItem(draftKey);
                setHasDraft(false);
            }
        } catch (err) {
            console.error("Failed to manually restore sales draft:", err);
            showToast.error("Lỗi khi khôi phục giỏ hàng nháp!");
        }
    };

    // Restore draft useEffect (auto prompt on mount once)
    useEffect(() => {
        if (hasPromptedDraft) return;

        const draftKey = `sales_draft_${currentBranchId}`;
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft && cartItems.length === 0) {
            try {
                const draft = JSON.parse(savedDraft);
                if (draft.items && draft.items.length > 0) {
                    setHasPromptedDraft(true);
                    const askRestore = async () => {
                        const confirmed = await confirm({
                            title: "Khôi phục giỏ hàng nháp",
                            message: `Phát hiện giỏ hàng nháp chưa thanh toán từ ngày ${new Date(draft.timestamp).toLocaleDateString()}. Bạn có muốn khôi phục không?`,
                            confirmColor: "blue",
                            confirmText: "Khôi phục",
                            cancelText: "Hủy",
                        });
                        if (confirmed) {
                            setCartItems(draft.items);
                            if (draft.customerId) {
                                const cust = customers.find((c: any) => c.id === draft.customerId);
                                if (cust) {
                                    customer.setSelectedCustomer(cust);
                                    customer.setCustomerSearch(cust.name);
                                }
                            }
                            cart.setOrderDiscount(draft.discount || 0);
                            if (draft.discountType) cart.setDiscountType(draft.discountType);
                            if (draft.discountPercent) cart.setDiscountPercent(draft.discountPercent);
                            showToast.success("Đã khôi phục giỏ hàng nháp!");
                            localStorage.removeItem(draftKey);
                            setHasDraft(false);
                        }
                    };
                    setTimeout(() => {
                        askRestore();
                    }, 500);
                }
            } catch (err) {
                console.error("Failed to auto restore sales draft:", err);
            }
        }
    }, [currentBranchId, customers, cartItems.length, hasPromptedDraft, customer, cart, setCartItems]);
    const canCreateSale = canDo(profile?.role, "sale.create");
    const canUpdateSale = canDo(profile?.role, "sale.update");
    const canDeleteSale = canDo(profile?.role, "sale.delete");

    const openQuickServiceModal = () => {
        if (!canCreateSale) {
            showToast.error("Bạn không có quyền tạo đơn bán hàng");
            return;
        }
        setShowQuickServiceModal(true);
    };

    const triggerCartFeedback = (message: string) => {
        setActionFeedback(message);
        setCartPulse(true);

        window.setTimeout(() => setCartPulse(false), 700);
        window.setTimeout(() => {
            setActionFeedback((current) => (current === message ? null : current));
        }, 1800);
    };

    const resetManualItemForm = () => {
        setManualItemName("");
        setManualItemCost(0);
        setManualItemPrice(0);
        setManualItemQty(1);
    };

    const handleAddManualItem = () => {
        const name = manualItemName.trim();
        const cost = Number(manualItemCost || 0);
        const price = Number(manualItemPrice || 0);
        const qty = Number(manualItemQty || 1);

        if (!name) {
            showToast.error("Vui lòng nhập tên hàng ngoài kho");
            return;
        }
        if (price === 0) {
            showToast.error("Giá bán không được bằng 0");
            return;
        }
        if (qty <= 0) {
            showToast.error("Số lượng phải lớn hơn 0");
            return;
        }

        const baseId = `quick_service_manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const safeSku = name.replace(/\s+/g, "_").toUpperCase().slice(0, 24);

        setCartItems((prev) => [
            ...prev,
            {
                partId: baseId,
                partName: name,
                sku: `MANUAL_${safeSku || "ITEM"}`,
                category: "Ngoài kho",
                quantity: qty,
                sellingPrice: price,
                costPrice: cost,
                stockSnapshot: 999999,
                discount: 0,
                isService: true,
            },
        ]);

        triggerCartFeedback(`Đã thêm ngoài kho: ${name} x${qty}`);
        resetManualItemForm();
        setShowManualItemForm(false);
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
    const handleEditSale = async (sale: Sale) => {
        if (!canUpdateSale) {
            showToast.error("Bạn không có quyền sửa đơn bán hàng");
            return;
        }

        const confirmed = await confirm({
            title: "Mở lại hóa đơn",
            message: "Mở lại hóa đơn này để chỉnh sửa? Giỏ hàng hiện tại sẽ bị xóa.",
            confirmColor: "blue",
            confirmText: "Mở lại",
            cancelText: "Hủy",
        });
        if (!confirmed) {
            return;
        }

        // Clear current cart and restore item snapshot (including non-stock/manual items)
        cart.clearCart();
        setCartItems(
            (sale.items || []).map((item) => {
                const part = repoParts.find((p) => p.id === item.partId);
                const stock = part ? getAvailableStock(part, currentBranchId) : 999999;
                return {
                    ...item,
                    stockSnapshot: Number(item.stockSnapshot || stock || 999999),
                };
            })
        );

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
        if (!canDeleteSale) {
            showToast.error("Bạn không có quyền xóa đơn bán hàng");
            return;
        }

        const confirmed = await confirm({
            title: "Xác nhận xóa hóa đơn",
            message: "Xác nhận xóa hóa đơn này? Hành động này không thể hoàn tác.",
            confirmColor: "red",
            confirmText: "Xóa",
            cancelText: "Hủy",
        });
        if (!confirmed) {
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
            queryClient.invalidateQueries({ queryKey: ["customer_debts"] });

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
        customerInfo: {
            id?: string;
            name: string;
            phone: string;
            vehicleModel: string;
            licensePlate: string;
        },
        quickServiceNote?: string
    ) => {
        if (isProcessing) return;
        if (!canCreateSale) {
            showToast.error("Bạn không có quyền tạo đơn bán hàng");
            return;
        }

        setIsProcessing(true);

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
                    id: customerInfo.id,
                    name: customerInfo.name,
                    phone: customerInfo.phone,
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

            await createSaleAtomicAsync(saleData as unknown as Partial<Sale>);

            showToast.success("Tạo đơn dịch vụ nhanh thành công!");

            // Refresh data
            queryClient.invalidateQueries({ queryKey: ["salesRepoPaged"] });
            queryClient.invalidateQueries({ queryKey: ["salesRepoKeyset"] });
            queryClient.invalidateQueries({ queryKey: ["salesRepo"] });
        } catch (error) {
            console.error("Error creating quick service sale:", error);
            const message = error instanceof Error ? error.message : "Không thể tạo đơn dịch vụ. Vui lòng thử lại.";
            showToast.error(message);
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle finalize sale
    const handleFinalize = async () => {
        if (isProcessing) return;
        const isUpdatingSale = !!editingSaleId;
        if (isUpdatingSale && !canUpdateSale) {
            showToast.error("Bạn không có quyền cập nhật đơn bán hàng");
            return;
        }
        if (!isUpdatingSale && !canCreateSale) {
            showToast.error("Bạn không có quyền tạo đơn bán hàng");
            return;
        }

        if (cart.cartItems.length === 0) {
            showToast.error("Giỏ hàng trống!");
            return;
        }

        // ✅ FIX: Validate stock availability before finalizing
        const outOfStockItems = cart.cartItems.filter(item => {
            if (item.isService || item.partId.startsWith("quick_service_")) {
                return false;
            }
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

        // Validate: must select a customer for debt-based payment types
        if (
            (finalization.paymentType === "note" ||
                finalization.paymentType === "partial" ||
                finalization.paymentType === "installment") &&
            !customer.selectedCustomer
        ) {
            showToast.error(
                "Vui lòng chọn khách hàng trước khi thanh toán nợ/trả góp!"
            );
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

        setIsProcessing(true);

        try {
            const dbPaymentMethod = finalization.paymentMethod === "card" ? "bank" : finalization.paymentMethod;

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

            // Construct installment and payment method notes
            let finalNote = finalization.orderNote || "";
            if (finalization.paymentMethod === "card") {
                const cardText = "[QUẸT THẺ]";
                finalNote = finalNote ? `${cardText} ${finalNote}` : cardText;
            }
            if (finalization.paymentType === "installment") {
                const { financeCompany, term, interestRate } = finalization.installmentDetails;
                const installmentText = `[TRẢ GÓP] ${financeCompany === 'Store' ? 'Cửa hàng' : financeCompany} - Trả trước: ${finalization.installmentDetails.prepaidAmount.toLocaleString()}đ - Kỳ hạn: ${term} tháng - Lãi: ${interestRate}%/tháng - Gốc+Lãi: ${finalization.installmentDetails.totalDetail.toLocaleString()}đ`;
                finalNote = finalNote ? `${finalNote}\n${installmentText}` : installmentText;
            }

            const saleData = {
                id: editingSaleId || crypto.randomUUID(),
                items: cart.cartItems,
                customer: customer.selectedCustomer
                    ? {
                        id: customer.selectedCustomer.id,
                        name: customer.selectedCustomer.name,
                        phone: customer.selectedCustomer.phone || "",
                    }
                    : { name: "Người tiêu dùng", phone: "" },
                paymentMethod: dbPaymentMethod,
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
                        codAmount: cart.total + (finalization.shippingFee || 0),
                        shippingFee: finalization.shippingFee || 0,
                        trackingNumber: finalization.trackingNumber || undefined,
                        shippingCarrier: finalization.shippingCarrier === "other" ? undefined : (finalization.shippingCarrier || undefined),
                        estimatedDeliveryDate: finalization.estimatedDeliveryDate || undefined,
                    }
                    : undefined,
            };

            const purchaseExpenseTotal = cart.cartItems.reduce((sum, item) => {
                if (!item.isService) return sum;
                const cost = Number(item.costPrice || 0);
                return cost > 0 ? sum + cost * item.quantity : sum;
            }, 0);

            const newSale = editingSaleId
                ? await updateSaleAtomicAsync(saleData as unknown as Partial<Sale>)
                : await createSaleAtomicAsync(saleData as unknown as Partial<Sale>);
            const saleId = newSale?.id;

            // Auto record cash expense for purchase cost lines (manual/out-of-stock intake)
            if (purchaseExpenseTotal > 0 && saleId) {
                const costExpenseRes = await createCashTransaction({
                    type: "expense",
                    category: "inventory_purchase",
                    amount: purchaseExpenseTotal,
                    date: saleTime,
                    notes: `Chi giá nhập - Đơn ${saleId}`,
                    branchId: currentBranchId,
                    paymentSourceId: dbPaymentMethod || "cash",
                    saleId,
                    recipient: customer.selectedCustomer?.name || "Khách hàng",
                });

                if (!costExpenseRes.ok) {
                    console.error("Failed to record purchase cost expense:", costExpenseRes.error);
                    showToast.error("Đã tạo đơn nhưng chưa ghi được bút toán chi giá nhập");
                } else {
                    const balanceRes = await updatePaymentSourceBalance(
                        dbPaymentMethod || "cash",
                        currentBranchId,
                        -purchaseExpenseTotal
                    );
                    if (!balanceRes.ok) {
                        console.error("Failed to update payment source balance:", balanceRes.error);
                        showToast.error("Đã ghi chi giá nhập nhưng chưa cập nhật số dư nguồn tiền");
                    }
                }
            }

            // Create customer debt if needed
            if (finalization.paymentType === "partial" || finalization.paymentType === "note") {
                const remainingAmount = cart.total - paidAmount;
                if (remainingAmount > 0 && customer.selectedCustomer) {
                    try {
                        await createCustomerDebt.mutateAsync({
                            customerId: customer.selectedCustomer.id!,
                            customerName: customer.selectedCustomer.name,
                            totalAmount: remainingAmount,
                            paidAmount: 0,
                            remainingAmount: remainingAmount,
                            description: `Nợ từ đơn hàng ${saleId}`,
                            branchId: currentBranchId,
                            createdDate: new Date().toISOString(),
                            saleId: saleId,
                        });
                    } catch (debtError) {
                        console.error("Failed to create customer debt:", debtError);
                        showToast.error("Đã tạo đơn nhưng chưa ghi nhận được công nợ. Vui lòng kiểm tra trang Công nợ!");
                    }
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

                try {
                    await createCustomerDebt.mutateAsync({
                        customerId: customer.selectedCustomer.id!,
                        customerName: customer.selectedCustomer.name,
                        totalAmount: remaining,
                        paidAmount: 0, // Haven't paid the debt yet
                        remainingAmount: remaining,
                        description: description,
                        branchId: currentBranchId,
                        createdDate: new Date().toISOString(),
                        saleId: saleId,
                    });
                } catch (debtError) {
                    console.error("Failed to create installment debt:", debtError);
                    showToast.error("Đã tạo đơn nhưng chưa ghi nhận được công nợ trả góp. Vui lòng kiểm tra trang Công nợ!");
                }
            }

            showToast.success(editingSaleId ? "Cập nhật đơn hàng thành công!" : "Tạo đơn hàng thành công!");
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
            setEditingSaleId(null);
            localStorage.removeItem(`sales_draft_${currentBranchId}`);

            // Refresh data (dùng đúng query key của repo; các mutation hook cũng đã tự invalidate)
            queryClient.invalidateQueries({ queryKey: ["salesRepoPaged"] });
            queryClient.invalidateQueries({ queryKey: ["salesRepoKeyset"] });
            queryClient.invalidateQueries({ queryKey: ["salesRepo"] });
            queryClient.invalidateQueries({ queryKey: ["partsRepo"] });
            queryClient.invalidateQueries({ queryKey: ["partsRepoPaged"] });
            queryClient.invalidateQueries({ queryKey: ["customer_debts"] });
        } catch (error) {
            console.error(editingSaleId ? "Error updating sale:" : "Error creating sale:", error);
            const message = error instanceof Error ? error.message : "Không thể lưu đơn hàng. Vui lòng thử lại.";
            // Với update atomic, nếu lỗi thì toàn bộ transaction rollback -> hóa đơn cũ còn nguyên.
            showToast.error(message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen max-w-full overflow-x-hidden bg-slate-50 dark:bg-slate-900 pb-16 md:pb-0">
            {/* Mobile Continue to Cart (on Products tab) */}
            {mobileTab === "products" && cart.cartItems.length > 0 && (
                <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 px-4">
                    <button
                        onClick={() => setMobileTab("cart")}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 active:scale-[0.99] transition-transform duration-200"
                    >
                        <span>Tiếp tục</span>
                        <span className="text-sm opacity-95">
                            {cart.cartItems.length} món · {formatCurrency(cart.total)}
                        </span>
                    </button>
                </div>
            )}

            {/* Mobile Sticky Checkout Bar (on Cart tab) */}
            {mobileTab === "cart" && cart.cartItems.length > 0 && (
                <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 px-4">
                    <div className="bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl shadow-xl backdrop-blur-md flex items-center justify-between gap-3">
                        <div className="flex flex-col pl-1">
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider leading-none">Tổng thanh toán</span>
                            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 leading-none">
                                {formatCurrency(cart.total)}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                const canFinalize = finalization.paymentMethod && finalization.paymentType && !isProcessing;
                                if (canFinalize) {
                                    handleFinalize();
                                } else {
                                    document.getElementById("checkout-payment-section")?.scrollIntoView({ behavior: "smooth" });
                                    showToast.info("Vui lòng chọn phương thức thanh toán!");
                                }
                            }}
                            disabled={isProcessing}
                            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5 ${
                                finalization.paymentMethod && finalization.paymentType
                                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-600/20"
                                    : "bg-blue-600 shadow-blue-500/20"
                            }`}
                        >
                            {isProcessing ? (
                                "Đang xử lý..."
                            ) : finalization.paymentMethod && finalization.paymentType ? (
                                <>
                                    Xuất bán
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" /></svg>
                                </>
                            ) : (
                                <>
                                    Chọn thanh toán
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7" /></svg>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
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
                                onClick={openQuickServiceModal}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50 rounded-lg hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-slate-700 hover:border-amber-200 dark:hover:border-amber-500/30 transition-all shadow-sm"
                            >
                                <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                                <span className="font-medium">Dịch vụ nhanh</span>
                            </button>

                            <button
                                onClick={() => history.setShowSalesHistory(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50 rounded-lg hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-700 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all shadow-sm"
                            >
                                <History className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                                <span className="font-medium">Lịch sử</span>
                            </button>

                            <button
                                onClick={() => setShowDeliveryModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50 rounded-lg hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-slate-700 hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all shadow-sm"
                            >
                                <Truck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
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
                        barcode.handleBarcodeSubmit(e, inventory.repoParts, (part) =>
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

                {/* Mobile Unified Tabs & Quick Actions */}
                <div className="md:hidden space-y-3">
                    {/* Unified Tabs */}
                    <div className="flex items-center bg-slate-100 dark:bg-[#2b2b40]/60 p-1.5 rounded-2xl border border-slate-200/50 dark:border-gray-800/40 shadow-sm">
                        <button
                            onClick={() => setMobileTab("products")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                                mobileTab === "products"
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                    : "text-slate-500 dark:text-gray-400 hover:text-slate-750 dark:hover:text-gray-200"
                            }`}
                        >
                            <Boxes className="w-4.5 h-4.5" />
                            Sản phẩm
                        </button>
                        <button
                            onClick={() => setMobileTab("cart")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 relative ${
                                mobileTab === "cart"
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                    : "text-slate-500 dark:text-gray-400 hover:text-slate-750 dark:hover:text-gray-200"
                            }`}
                        >
                            <ShoppingCart className="w-4.5 h-4.5" />
                            Giỏ hàng
                            {cart.cartItems.length > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                    mobileTab === "cart" ? "bg-white text-blue-600" : "bg-emerald-600 text-white"
                                }`}>
                                    {cart.cartItems.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Quick actions (3 items) */}
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={openQuickServiceModal}
                            className="flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold shadow-sm active:scale-95 hover:border-amber-300 dark:hover:border-amber-500/30 transition-all"
                        >
                            <Zap className="w-4.5 h-4.5 text-amber-500" />
                            Bán nhanh
                        </button>
                        <button
                            onClick={() => setShowDeliveryModal(true)}
                            className="flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold shadow-sm active:scale-95 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all"
                        >
                            <Truck className="w-4.5 h-4.5 text-emerald-500" />
                            Giao hàng
                        </button>
                        <button
                            onClick={() => history.setShowSalesHistory(true)}
                            className="flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold shadow-sm active:scale-95 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all"
                        >
                            <History className="w-4.5 h-4.5 text-blue-500" />
                            Lịch sử
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Products (Desktop) / Mobile Tab Content */}
                    <div className={`lg:col-span-2 ${mobileTab !== "products" ? "hidden md:block" : ""}`}>
                        <ProductCatalogSection
                            partSearch={inventory.partSearch}
                            setPartSearch={inventory.setPartSearch}
                            isWholesaleMode={cart.isWholesaleMode}
                            setIsWholesaleMode={cart.setIsWholesaleMode}
                            showBarcodeInput={barcode.showBarcodeInput}
                            setShowBarcodeInput={barcode.setShowBarcodeInput}
                            displayedParts={inventory.displayedParts}
                            filteredParts={inventory.filteredParts}
                            repoParts={inventory.repoParts}
                            stockFilter={inventory.stockFilter}
                            setStockFilter={inventory.setStockFilter}
                            currentBranchId={currentBranchId}
                            cartItemById={cart.cartItemById}
                            onAddToCart={(p) => handleAddToCartWithFeedback(p, "tap")}
                            actionFeedback={actionFeedback}
                        />
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
                                        onClick={async () => {
                                            const confirmed = await confirm({
                                                title: "Hủy chỉnh sửa",
                                                message: "Hủy sửa? Các thay đổi sẽ mất.",
                                                confirmColor: "red",
                                                confirmText: "Hủy sửa",
                                                cancelText: "Không",
                                            });
                                            if (confirmed) {
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

                            <CartSection
                                cartItems={cart.cartItems}
                                isWholesaleMode={cart.isWholesaleMode}
                                hasDraft={hasDraft}
                                onRestoreDraftManual={handleRestoreDraftManual}
                                showManualItemForm={showManualItemForm}
                                setShowManualItemForm={setShowManualItemForm}
                                manualItemName={manualItemName}
                                setManualItemName={setManualItemName}
                                manualItemCost={manualItemCost}
                                setManualItemCost={setManualItemCost}
                                manualItemPrice={manualItemPrice}
                                setManualItemPrice={setManualItemPrice}
                                manualItemQty={manualItemQty}
                                setManualItemQty={setManualItemQty}
                                onResetManualItemForm={resetManualItemForm}
                                onAddManualItem={handleAddManualItem}
                                selectedCustomer={customer.selectedCustomer}
                                filteredCustomers={customer.filteredCustomers}
                                customerSearch={customer.customerSearch}
                                showCustomerDropdown={customer.showCustomerDropdown}
                                setCustomerSearch={customer.setCustomerSearch}
                                setSelectedCustomer={customer.setSelectedCustomer}
                                setShowAddCustomerModal={customer.setShowAddCustomerModal}
                                setShowEditCustomerModal={customer.setShowEditCustomerModal}
                                setShowCustomerDropdown={customer.setShowCustomerDropdown}
                                isSearchingCustomer={customer.isSearchingCustomer}
                                hasMoreCustomers={customer.hasMoreCustomers}
                                onLoadMoreCustomers={customer.handleLoadMoreCustomers}
                                onUpdateCartQuantity={cart.updateCartQuantity}
                                onUpdateCartPrice={cart.updateCartPrice}
                                onUpdateCartDiscount={cart.updateCartDiscount}
                                onRemoveFromCart={cart.removeFromCart}
                            />

                            {cart.cartItems.length > 0 && (
                                <CheckoutSection
                                    subtotal={cart.subtotal}
                                    discount={cart.orderDiscount}
                                    total={cart.total}
                                    discountType={cart.discountType}
                                    discountPercent={cart.discountPercent}
                                    onDiscountChange={cart.setOrderDiscount}
                                    onDiscountTypeChange={cart.setDiscountType}
                                    onDiscountPercentChange={cart.setDiscountPercent}
                                    paymentMethod={finalization.paymentMethod}
                                    paymentType={finalization.paymentType}
                                    partialAmount={finalization.partialAmount}
                                    onPaymentMethodChange={finalization.setPaymentMethod}
                                    onPaymentTypeChange={(type) => {
                                        finalization.setPaymentType(type);
                                        if (type === "installment") {
                                            setShowInstallmentModal(true);
                                        }
                                    }}
                                    onPartialAmountChange={finalization.setPartialAmount}
                                    showInstallmentModal={showInstallmentModal}
                                    setShowInstallmentModal={setShowInstallmentModal}
                                    installmentDetails={finalization.installmentDetails}
                                    onSaveInstallmentDetails={finalization.setInstallmentDetails}
                                    deliveryMethod={finalization.deliveryMethod}
                                    setDeliveryMethod={finalization.setDeliveryMethod}
                                    deliveryAddress={finalization.deliveryAddress}
                                    setDeliveryAddress={finalization.setDeliveryAddress}
                                    deliveryPhone={finalization.deliveryPhone}
                                    setDeliveryPhone={finalization.setDeliveryPhone}
                                    trackingNumber={finalization.trackingNumber}
                                    setTrackingNumber={finalization.setTrackingNumber}
                                    shippingCarrier={finalization.shippingCarrier}
                                    setShippingCarrier={finalization.setShippingCarrier}
                                    shippingFee={finalization.shippingFee}
                                    setShippingFee={finalization.setShippingFee}
                                    useCurrentTime={finalization.useCurrentTime}
                                    setUseCurrentTime={finalization.setUseCurrentTime}
                                    customSaleTime={finalization.customSaleTime}
                                    setCustomSaleTime={finalization.setCustomSaleTime}
                                    showOrderNote={finalization.showOrderNote}
                                    setShowOrderNote={finalization.setShowOrderNote}
                                    autoPrintReceipt={finalization.autoPrintReceipt}
                                    setAutoPrintReceipt={finalization.setAutoPrintReceipt}
                                    orderNote={finalization.orderNote}
                                    setOrderNote={finalization.setOrderNote}
                                    onSaveDraft={handleSaveDraft}
                                    onFinalize={handleFinalize}
                                    isProcessing={isProcessing}
                                    editingSaleId={editingSaleId}
                                    canUpdateSale={canUpdateSale}
                                    canCreateSale={canCreateSale}
                                />
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
                        customers={customers}
                        onViewDetail={(sale) => setSelectedSale(sale)}
                        canDelete={canDeleteSale}
                        canEdit={canUpdateSale}
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
        </div >
    );
};

export default SalesManager;
