import { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { showToast } from "../../../utils/toast";

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
    print_paper_size?: "K80" | "A5";
    print_show_logo?: boolean;
    print_greeting?: string;
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
                        "store_name, address, phone, email, logo_url, bank_qr_url, bank_name, bank_account_number, bank_account_holder, bank_branch, print_paper_size, print_show_logo, print_greeting"
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

        // Determine paper size from store settings for @page CSS
        const paperSize = storeSettings?.print_paper_size || "K80";
        const pageSize = paperSize === "A5" ? "A5" : "80mm 297mm"; // K80 = 80mm continuous roll

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            console.error("Could not open print window");
            return;
        }

        // Use outerHTML to preserve the root element's inline styles (width, padding, fontSize)
        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>In hóa đơn</title>
          <style>
            @page {
              size: ${pageSize};
              margin: 0;
            }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          ${printElement.outerHTML}
        </body>
      </html>
    `);
        printWindow.document.close();

        // Wait for all images to load before triggering print
        const images = printWindow.document.getElementsByTagName("img");
        const imagePromises = Array.from(images).map((img) => {
            return new Promise<void>((resolve) => {
                if (img.complete) {
                    resolve();
                } else {
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    setTimeout(() => resolve(), 5000);
                }
            });
        });

        Promise.all(imagePromises).then(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        });

        setShowPrintPreview(false);
    };

    // Handle share invoice as image (placeholder - can be extended with html2canvas)
    const handleShareInvoice = async (_sale: any) => {
        // TODO: Implement html2canvas to convert receipt to image
        showToast.info("Chức năng chia sẻ hóa đơn sẽ được thêm sau");
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
