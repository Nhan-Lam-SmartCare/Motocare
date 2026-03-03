import { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";

export interface StoreSettings {
    store_name?: string;
    address?: string;
    phone?: string;
    email?: string;
    logo_url?: string;
    bank_qr_url?: string;
    bank_name?: string;
    bank_account_number?: string;
    bank_account_holder?: string;
    bank_branch?: string;
}

export interface UsePrintReceiptReturn {
    // State
    showPrintPreview: boolean;
    printSale: any | null;
    storeSettings: StoreSettings | null;

    // Actions
    setShowPrintPreview: (show: boolean) => void;
    setPrintSale: (sale: any | null) => void;
    handlePrintReceipt: (sale: any) => void;
    handleDoPrint: (elementId: string) => void;
    handleShareInvoice: (sale: any) => Promise<void>;
}

/**
 * Custom hook for managing receipt printing
 */
export function usePrintReceipt(): UsePrintReceiptReturn {
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [printSale, setPrintSale] = useState<any | null>(null);
    const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(
        null
    );

    // Fetch store settings on mount
    useEffect(() => {
        const fetchStoreSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from("store_settings")
                    .select(
                        "store_name, address, phone, email, logo_url, bank_qr_url, bank_name, bank_account_number, bank_account_holder, bank_branch"
                    )
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single();

                if (error) {
                    console.error("Error fetching store settings:", error);
                    return;
                }

                setStoreSettings(data);
            } catch (err) {
                console.error("Failed to fetch store settings:", err);
            }
        };

        fetchStoreSettings();
    }, []);

    // Handle print receipt - Show preview modal
    const handlePrintReceipt = (sale: any) => {
        setPrintSale(sale);
        setShowPrintPreview(true);
    };

    // Handle actual print after preview
    const handleDoPrint = (elementId: string) => {
        const printElement = document.getElementById(elementId);
        if (!printElement) {
            console.error("Print element not found");
            return;
        }

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            console.error("Could not open print window");
            return;
        }

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>In hóa đơn</title>
          <style>
            @page { margin: 0; }
            body { margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          ${printElement.innerHTML}
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);

        setShowPrintPreview(false);
    };

    // Handle share invoice as image (placeholder - can be extended with html2canvas)
    const handleShareInvoice = async (_sale: any) => {
        // TODO: Implement html2canvas to convert receipt to image
        alert("Chức năng chia sẻ hóa đơn sẽ được thêm sau");
    };

    return {
        // State
        showPrintPreview,
        printSale,
        storeSettings,

        // Actions
        setShowPrintPreview,
        setPrintSale,
        handlePrintReceipt,
        handleDoPrint,
        handleShareInvoice,
    };
}
