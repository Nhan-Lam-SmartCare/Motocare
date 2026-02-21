import { useState, useCallback, useMemo } from "react";
import type { CartItem, Part } from "../../../types";
import { showToast } from "../../../utils/toast";

export interface UseSalesCartReturn {
    // State
    cartItems: CartItem[];
    orderDiscount: number;
    discountType: "amount" | "percent";
    discountPercent: number;
    isWholesaleMode: boolean;
    effectiveDiscount: number; // Computed discount: recalculates percent discount when subtotal changes

    // Actions
    addToCart: (part: Part, branchId: string) => void;
    removeFromCart: (partId: string) => void;
    updateCartQuantity: (partId: string, quantity: number) => void;
    updateCartPrice: (partId: string, newPrice: number) => void;
    setOrderDiscount: (discount: number) => void;
    setDiscountType: (type: "amount" | "percent") => void;
    setDiscountPercent: (percent: number) => void;
    setIsWholesaleMode: (isWholesale: boolean) => void;
    clearCart: () => void;
    setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;

    // Computed
    subtotal: number;
    total: number;
    cartItemById: Map<string, CartItem>;
}

/**
 * Custom hook for managing sales cart operations
 */
export function useSalesCart(
    initialCartItems: CartItem[],
    setGlobalCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>,
    clearGlobalCart: () => void
): UseSalesCartReturn {
    const [orderDiscount, setOrderDiscount] = useState(0);
    const [discountType, setDiscountType] = useState<"amount" | "percent">(
        "amount"
    );
    const [discountPercent, setDiscountPercent] = useState(0);
    const [isWholesaleMode, setIsWholesaleMode] = useState(false);

    // Cart operations
    const addToCart = useCallback(
        (part: Part, branchId: string) => {
            // Chọn giá dựa theo mode sỉ/lẻ
            const retailPrice = part.retailPrice?.[branchId] ?? 0;
            const wholesalePrice = part.wholesalePrice?.[branchId] ?? 0;
            // Nếu bật mode sỉ và có giá sỉ thì dùng giá sỉ, không thì dùng giá lẻ
            const price = isWholesaleMode && wholesalePrice > 0 ? wholesalePrice : retailPrice;
            const stock = part.stock?.[branchId] ?? 0;
            const existing = initialCartItems.find((item) => item.partId === part.id);

            if (existing) {
                // Validate stock before adding more
                const newQuantity = existing.quantity + 1;
                if (newQuantity > stock) {
                    showToast.error(`Không đủ hàng! Tồn kho: ${stock}`);
                    return;
                }
                setGlobalCartItems((prev) =>
                    prev.map((item) =>
                        item.partId === part.id ? { ...item, quantity: newQuantity } : item
                    )
                );
            } else {
                // Check if stock available
                if (stock < 1) {
                    showToast.error("Sản phẩm đã hết hàng!");
                    return;
                }
                const newItem: CartItem = {
                    partId: part.id,
                    partName: part.name,
                    sku: part.sku,
                    quantity: 1,
                    sellingPrice: price,
                    stockSnapshot: stock,
                    discount: 0,
                };
                setGlobalCartItems((prev) => [...prev, newItem]);
            }
        },
        [initialCartItems, setGlobalCartItems, isWholesaleMode]
    );

    const removeFromCart = useCallback(
        (partId: string) => {
            setGlobalCartItems((prev) => prev.filter((item) => item.partId !== partId));
        },
        [setGlobalCartItems]
    );

    const updateCartQuantity = useCallback(
        (partId: string, quantity: number) => {
            if (quantity <= 0) {
                removeFromCart(partId);
                return;
            }

            // Validate against stock
            const item = initialCartItems.find((i) => i.partId === partId);
            if (item && quantity > item.stockSnapshot) {
                showToast.error(`Không đủ hàng! Tồn kho: ${item.stockSnapshot}`);
                return;
            }

            setGlobalCartItems((prev) =>
                prev.map((item) =>
                    item.partId === partId ? { ...item, quantity } : item
                )
            );
        },
        [initialCartItems, setGlobalCartItems, removeFromCart]
    );

    const updateCartPrice = useCallback(
        (partId: string, newPrice: number) => {
            if (newPrice < 0) {
                showToast.error("Giá không được âm!");
                return;
            }
            setGlobalCartItems((prev) =>
                prev.map((item) =>
                    item.partId === partId ? { ...item, sellingPrice: newPrice } : item
                )
            );
        },
        [setGlobalCartItems]
    );

    // Calculate totals
    const subtotal = useMemo(
        () =>
            initialCartItems.reduce(
                (sum, item) => sum + item.sellingPrice * item.quantity,
                0
            ),
        [initialCartItems]
    );

    // BUG fix: always recompute effectiveDiscount from discountPercent when type is "percent"
    // Prevents stale discount when user adds/removes items after setting a % discount
    const effectiveDiscount = useMemo(
        () =>
            discountType === "percent"
                ? Math.round((subtotal * discountPercent) / 100)
                : orderDiscount,
        [subtotal, discountPercent, discountType, orderDiscount]
    );

    const total = useMemo(
        () => Math.max(0, subtotal - effectiveDiscount),
        [subtotal, effectiveDiscount]
    );

    const cartItemById = useMemo(() => {
        const map = new Map<string, CartItem>();
        initialCartItems.forEach((item) => map.set(item.partId, item));
        return map;
    }, [initialCartItems]);

    return {
        // State
        cartItems: initialCartItems,
        orderDiscount,
        discountType,
        discountPercent,
        isWholesaleMode,

        // Actions
        addToCart,
        removeFromCart,
        updateCartQuantity,
        updateCartPrice,
        setOrderDiscount,
        setDiscountType,
        setDiscountPercent,
        setIsWholesaleMode,
        clearCart: clearGlobalCart,
        setCartItems: setGlobalCartItems,

        // Computed
        subtotal,
        total,
        effectiveDiscount,
        cartItemById,
    };
}
