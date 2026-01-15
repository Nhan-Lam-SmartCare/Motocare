import { useState, useCallback, useRef, useEffect } from "react";
import type { Part, CartItem } from "../../../types";
import { normalizeCode } from "../utils/barcodeNormalizer";
import { showToast } from "../../../utils/toast";

export interface UseBarcodeScannerReturn {
    // State
    barcodeInput: string;
    showBarcodeInput: boolean;
    showCameraScanner: boolean;
    barcodeInputRef: React.RefObject<HTMLInputElement | null>;

    // Actions
    setBarcodeInput: (input: string) => void;
    setShowBarcodeInput: (show: boolean) => void;
    setShowCameraScanner: (show: boolean) => void;
    handleBarcodeSubmit: (e: React.FormEvent, parts: Part[], addToCart: (part: Part) => void) => void;
    handleCameraScan: (barcode: string, parts: Part[], cartItems: CartItem[], addToCart: (part: Part) => void) => void;
}

/**
 * Custom hook for managing barcode scanning (keyboard input and camera)
 */
export function useBarcodeScanner(): UseBarcodeScannerReturn {
    const [barcodeInput, setBarcodeInput] = useState("");
    const [showBarcodeInput, setShowBarcodeInput] = useState(false);
    const [showCameraScanner, setShowCameraScanner] = useState(false);
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus barcode input when shown
    useEffect(() => {
        if (showBarcodeInput) {
            barcodeInputRef.current?.focus();
        }
    }, [showBarcodeInput]);

    // Handle keyboard barcode input submit
    const handleBarcodeSubmit = useCallback(
        (e: React.FormEvent, parts: Part[], addToCart: (part: Part) => void) => {
            e.preventDefault();
            if (!barcodeInput.trim()) return;

            const barcode = barcodeInput.trim();
            const normalizedBarcode = normalizeCode(barcode);

            // Find part with priority: barcode > SKU > name
            const foundPart = parts.find(
                (p) =>
                    // 1. Match exact barcode (new field)
                    normalizeCode(p.barcode || "") === normalizedBarcode ||
                    p.barcode?.toLowerCase() === barcode.toLowerCase() ||
                    // 2. Match SKU (normalized or exact)
                    normalizeCode(p.sku || "") === normalizedBarcode ||
                    p.sku?.toLowerCase() === barcode.toLowerCase() ||
                    // 3. Search in product name
                    p.name?.toLowerCase().includes(barcode.toLowerCase())
            );

            if (foundPart) {
                addToCart(foundPart);
                showToast.success(`Đã thêm ${foundPart.name} vào giỏ hàng`);
                setBarcodeInput("");
                // Focus back to barcode input for continuous scanning
                setTimeout(() => barcodeInputRef.current?.focus(), 100);
            } else {
                showToast.error(`Không tìm thấy sản phẩm có mã: ${barcode}`);
                setBarcodeInput("");
            }
        },
        [barcodeInput]
    );

    // Handle camera barcode scan
    const handleCameraScan = useCallback(
        (barcode: string, parts: Part[], cartItems: CartItem[], addToCart: (part: Part) => void) => {
            console.log("📷 Camera scanned:", barcode);

            const normalizedBarcode = normalizeCode(barcode);

            // Search in ALL parts (repoParts), not filtered
            const foundPart = parts.find(
                (p) =>
                    normalizeCode(p.barcode || "") === normalizedBarcode ||
                    p.barcode?.toLowerCase() === barcode.toLowerCase() ||
                    normalizeCode(p.sku || "") === normalizedBarcode ||
                    p.sku?.toLowerCase() === barcode.toLowerCase()
            );

            // Modal auto-closes itself

            if (foundPart) {
                // Check if already in cart
                const existingItem = cartItems.find(
                    (item) => item.partId === foundPart.id
                );
                if (existingItem) {
                    showToast.success(
                        `${foundPart.name} đã có trong giỏ (x${existingItem.quantity})`
                    );
                } else {
                    addToCart(foundPart);
                    showToast.success(`Đã thêm ${foundPart.name} vào giỏ hàng`);
                }
            } else {
                showToast.error(`Không tìm thấy sản phẩm có mã: ${barcode}`);
            }
        },
        []
    );

    return {
        // State
        barcodeInput,
        showBarcodeInput,
        showCameraScanner,
        barcodeInputRef,

        // Actions
        setBarcodeInput,
        setShowBarcodeInput,
        setShowCameraScanner,
        handleBarcodeSubmit,
        handleCameraScan,
    };
}
