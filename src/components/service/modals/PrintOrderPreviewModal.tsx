import React, { useMemo } from 'react';
import { Share2, Printer, X } from 'lucide-react';
import { formatCurrency, formatWorkOrderId } from '../../../utils/format';
import { showToast } from '../../../utils/toast';
import { generateVietQRUrl, findBankBin } from '../../../utils/vietqr';
import type { WorkOrder, WorkOrderPart } from '../../../types';

interface StoreSettings {
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
    work_order_prefix?: string;
}

interface PrintOrderPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    printOrder: WorkOrder | null;
    storeSettings?: StoreSettings;
    onPrint: () => void;
}

const PrintOrderPreviewModal: React.FC<PrintOrderPreviewModalProps> = ({
    isOpen,
    onClose,
    printOrder,
    storeSettings,
    onPrint,
}) => {
    if (!isOpen || !printOrder) return null;

    // Generate dynamic VietQR URL with amount and description
    const dynamicQRUrl = useMemo(() => {
        console.log('[PrintOrderPreview] Generating dynamic QR...', {
            bank_name: storeSettings?.bank_name,
            bank_account_number: storeSettings?.bank_account_number,
            bank_account_holder: storeSettings?.bank_account_holder,
            printOrder: printOrder?.id,
        });

        if (!storeSettings?.bank_name || !storeSettings?.bank_account_number || !storeSettings?.bank_account_holder) {
            console.warn('[PrintOrderPreview] Missing bank info, using static QR');
            return null; // Return null to use static QR
        }

        const bankBin = findBankBin(storeSettings.bank_name);
        if (!bankBin) {
            console.warn('[PrintOrderPreview] Bank BIN not found for:', storeSettings.bank_name);
            return null; // Return null to use static QR
        }

        const amount = printOrder.remainingAmount && printOrder.remainingAmount > 0 
            ? printOrder.remainingAmount 
            : printOrder.total || 0;
        
        const orderCode = formatWorkOrderId(printOrder.id, storeSettings.work_order_prefix);
        const description = `Thanh toan ${orderCode}`;

        const qrUrl = generateVietQRUrl({
            bankId: bankBin,
            accountNumber: storeSettings.bank_account_number,
            accountName: storeSettings.bank_account_holder,
            amount: amount,
            description: description,
            template: 'compact2',
        });

        console.log('[PrintOrderPreview] Generated dynamic QR URL:', qrUrl);
        console.log('[PrintOrderPreview] QR params:', { bankBin, amount, description });
        return qrUrl;
    }, [printOrder, storeSettings]);

    const handleShare = async () => {
        try {
            showToast.info("Đang tạo hình ảnh...");

            // Import html2canvas dynamically
            const html2canvas = (await import("html2canvas")).default;

            const element = document.getElementById("mobile-print-preview-content");
            if (!element) {
                showToast.error("Không tìm thấy nội dung phiếu!");
                return;
            }

            // Remove any transform/scale from element temporarily for full capture
            const originalTransform = (element as HTMLElement).style.transform;
            const originalMarginBottom = (element as HTMLElement).style.marginBottom;
            (element as HTMLElement).style.transform = "none";
            (element as HTMLElement).style.marginBottom = "0";

            // Wait for layout to settle
            await new Promise(resolve => setTimeout(resolve, 100));

            // Capture the element as canvas with full height
            const canvas = await html2canvas(element, {
                scale: 2, // Higher quality
                backgroundColor: "#ffffff",
                useCORS: true,
                logging: false,
                width: element.scrollWidth,
                height: element.scrollHeight,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
            });

            // Restore original styles
            (element as HTMLElement).style.transform = originalTransform;
            (element as HTMLElement).style.marginBottom = originalMarginBottom;

            // Convert canvas to blob
            const blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((b) => resolve(b!), "image/png", 1.0);
            });

            const fileName = `Phieu_${formatWorkOrderId(
                printOrder.id,
                storeSettings?.work_order_prefix
            )}.png`;

            // Try to share as image file
            if (navigator.share && navigator.canShare) {
                const file = new File([blob], fileName, {
                    type: "image/png",
                });
                const shareData = {
                    files: [file],
                    title: `Phiếu sửa chữa - ${formatWorkOrderId(
                        printOrder.id,
                        storeSettings?.work_order_prefix
                    )}`,
                };

                if (navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                    showToast.success("Chia sẻ thành công!");
                } else {
                    // Fallback: download
                    downloadImage(blob, fileName);
                }
            } else {
                // Fallback: download
                downloadImage(blob, fileName);
            }
        } catch (err) {
            console.error("Share failed:", err);
            showToast.error("Không thể chia sẻ. Vui lòng thử lại!");
        }
    };

    const downloadImage = (blob: Blob, fileName: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        showToast.success("Đã tải hình ảnh!");
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-2">
            <div className="bg-white dark:bg-slate-800 rounded-xl w-full md:w-auto md:max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between rounded-t-xl flex-shrink-0">
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Xem trước phiếu
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleShare}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-1.5 transition text-sm"
                        >
                            <Share2 className="w-4 h-4" />
                            Chia sẻ
                        </button>
                        <button
                            onClick={onPrint}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 transition text-sm"
                        >
                            <Printer className="w-4 h-4" />
                            In
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg"
                            aria-label="Đóng"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-900 flex justify-center">
                    <div
                        id="mobile-print-preview-content"
                        className="bg-white shadow-lg relative !bg-white !text-black flex-shrink-0 transform origin-top scale-[0.63] mb-[-75mm] md:transform-none md:scale-100 md:mb-0"
                        style={{
                            width: "148mm", // Keep original A5 width
                            minHeight: "210mm",
                            color: "#000000",
                            backgroundColor: "#ffffff",
                        }}
                    >
                        {/* Watermark Logo for Print */}
                        <div
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                width: "60%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                pointerEvents: "none",
                                zIndex: 0,
                            }}
                        >
                            <img
                                src={storeSettings?.logo_url || "/logo-smartcare.png"}
                                alt="watermark"
                                style={{
                                    width: "100%",
                                    height: "auto",
                                    objectFit: "contain",
                                    opacity: 0.1,
                                    filter: "grayscale(100%)",
                                }}
                            />
                        </div>
                        <div style={{ padding: "3mm" }}>
                            {/* Store Info Header - Compact Layout */}
                            {/* Store Info Header - Mobile Optimized (Stacked) */}
                            {/* Store Info Header - Compact Layout (Side-by-Side) */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: "1.5mm",
                                    marginBottom: "3mm",
                                    borderBottom: "2px solid #3b82f6",
                                    paddingBottom: "2mm",
                                }}
                            >
                                {/* Left: Logo */}
                                {storeSettings?.logo_url && (
                                    <img
                                        src={storeSettings.logo_url}
                                        alt="Logo"
                                        style={{
                                            height: "14mm",
                                            width: "14mm",
                                            objectFit: "contain",
                                            flexShrink: 0,
                                        }}
                                    />
                                )}

                                {/* Center: Store Info */}
                                <div
                                    style={{ fontSize: "8pt", lineHeight: "1.3", flex: 1 }}
                                >
                                    <div
                                        style={{
                                            fontWeight: "bold",
                                            fontSize: "10pt",
                                            marginBottom: "0.5mm",
                                            color: "#1e40af",
                                        }}
                                    >
                                        {storeSettings?.store_name || "Nhạn Lâm SmartCare"}
                                    </div>
                                    <div
                                        style={{
                                            color: "#000",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.5mm",
                                        }}
                                    >
                                        <svg
                                            style={{
                                                width: "8px",
                                                height: "8px",
                                                flexShrink: 0,
                                            }}
                                            viewBox="0 0 24 24"
                                            fill="#ef4444"
                                        >
                                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                        </svg>
                                        <span>
                                            {storeSettings?.address ||
                                                "Ấp Phú Lợi B, Xã Long Phú Thuận, Đông Tháp"}
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            color: "#000",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.5mm",
                                        }}
                                    >
                                        <svg
                                            style={{
                                                width: "8px",
                                                height: "8px",
                                                flexShrink: 0,
                                            }}
                                            viewBox="0 0 24 24"
                                            fill="#16a34a"
                                        >
                                            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                        </svg>
                                        <span>{storeSettings?.phone || "0947.747.907"}</span>
                                    </div>
                                    {storeSettings?.email && (
                                        <div
                                            style={{
                                                color: "#000",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.5mm",
                                            }}
                                        >
                                            <svg
                                                style={{
                                                    width: "8px",
                                                    height: "8px",
                                                    flexShrink: 0,
                                                    fill: "#1877F2"
                                                }}
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                            </svg>
                                            <span>{storeSettings.email}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Bank Info & QR */}
                                <div
                                    style={{
                                        fontSize: "7.5pt",
                                        lineHeight: "1.3",
                                        textAlign: "right",
                                        maxWidth: "38mm",
                                        flexShrink: 0,
                                    }}
                                >
                                    {storeSettings?.bank_name && (
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "flex-end",
                                                gap: "1mm",
                                                border: "1px solid #3b82f6",
                                                borderRadius: "1.5mm",
                                                padding: "1mm",
                                                backgroundColor: "#eff6ff",
                                            }}
                                        >
                                            {/* Bank Info */}
                                            <div style={{ textAlign: "right", flex: 1, minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        fontWeight: "bold",
                                                        marginBottom: "0.5mm",
                                                        color: "#000",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "flex-end",
                                                        gap: "0.5mm",
                                                        fontSize: "7pt",
                                                    }}
                                                >
                                                    <svg
                                                        style={{
                                                            width: "8px",
                                                            height: "8px",
                                                            flexShrink: 0,
                                                        }}
                                                        viewBox="0 0 24 24"
                                                        fill="#0891b2"
                                                    >
                                                        <path d="M4 10h3v7H4zm6.5 0h3v7h-3zM2 19h20v3H2zm15-9h3v7h-3zm-5-9L2 6v2h20V6z" />
                                                    </svg>
                                                    <span>{storeSettings.bank_name}</span>
                                                </div>
                                                {storeSettings.bank_account_number && (
                                                    <div style={{ color: "#000", fontSize: "7pt" }}>
                                                        STK: {storeSettings.bank_account_number}
                                                    </div>
                                                )}
                                                {storeSettings.bank_account_holder && (
                                                    <div style={{ color: "#000", fontSize: "6.5pt" }}>
                                                        {storeSettings.bank_account_holder}
                                                    </div>
                                                )}
                                            </div>
                                            {/* QR Code - Dynamic with amount & description */}
                                            {dynamicQRUrl ? (
                                                <div style={{ flexShrink: 0, textAlign: 'center' }}>
                                                    <img
                                                        src={dynamicQRUrl}
                                                        alt="QR Banking"
                                                        style={{
                                                            height: "18mm",
                                                            width: "18mm",
                                                            objectFit: "contain",
                                                        }}
                                                    />
                                                    <div style={{ fontSize: '6pt', color: '#666', marginTop: '1mm' }}>
                                                        Quét mã thanh toán
                                                    </div>
                                                </div>
                                            ) : storeSettings.bank_qr_url ? (
                                                <div style={{ flexShrink: 0, textAlign: 'center' }}>
                                                    <img
                                                        src={storeSettings.bank_qr_url}
                                                        alt="QR Banking"
                                                        style={{
                                                            height: "18mm",
                                                            width: "18mm",
                                                            objectFit: "contain",
                                                        }}
                                                    />
                                                    <div style={{ fontSize: '6pt', color: '#ff6b6b', marginTop: '1mm' }}>
                                                        QR tĩnh (không có số tiền)
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Title & Meta */}
                            <div style={{ marginBottom: "4mm" }}>
                                <div style={{ textAlign: "center", marginBottom: "2mm" }}>
                                    <h1
                                        style={{
                                            fontSize: "16pt",
                                            fontWeight: "bold",
                                            margin: "0",
                                            textTransform: "uppercase",
                                            color: "#1e40af",
                                        }}
                                    >
                                        PHIẾU DỊCH VỤ SỬA CHỮA
                                    </h1>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        fontSize: "9pt",
                                        color: "#666",
                                    }}
                                >
                                    <div>
                                        {new Date(printOrder.creationDate).toLocaleString("vi-VN", {
                                            year: "numeric",
                                            month: "2-digit",
                                            day: "2-digit",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </div>
                                    <div style={{ fontWeight: "bold" }}>
                                        Mã:{" "}
                                        {formatWorkOrderId(
                                            printOrder.id,
                                            storeSettings?.work_order_prefix
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Customer Info - Compact */}
                            <div
                                style={{
                                    border: "1px solid #ddd",
                                    padding: "3mm",
                                    marginBottom: "3mm",
                                    borderRadius: "2mm",
                                    backgroundColor: "#f8fafc",
                                    color: "#000",
                                    fontSize: "9pt",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "4mm",
                                        marginBottom: "1.5mm",
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontWeight: "bold" }}>Khách hàng:</span>{" "}
                                        {printOrder.customerName}
                                    </div>
                                    <div style={{ flex: "0 0 auto" }}>
                                        <span style={{ fontWeight: "bold" }}>SĐT:</span>{" "}
                                        {printOrder.customerPhone}
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "4mm" }}>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontWeight: "bold" }}>Loại xe:</span>{" "}
                                        {printOrder.vehicleModel}
                                    </div>
                                    <div style={{ flex: "0 0 auto" }}>
                                        <span style={{ fontWeight: "bold" }}>Biển số:</span>{" "}
                                        {printOrder.licensePlate}
                                    </div>
                                </div>
                            </div>

                            {/* Issue Description */}
                            <div
                                style={{
                                    border: "1px solid #ddd",
                                    padding: "4mm",
                                    marginBottom: "4mm",
                                    borderRadius: "2mm",
                                    color: "#000",
                                }}
                            >
                                <div style={{ display: "flex", gap: "3mm" }}>
                                    <div
                                        style={{
                                            fontWeight: "bold",
                                            minWidth: "20%",
                                            flexShrink: 0,
                                        }}
                                    >
                                        Mô tả sự cố:
                                    </div>
                                    <div style={{ flex: 1, whiteSpace: "pre-wrap" }}>
                                        {printOrder.issueDescription || "Không có mô tả"}
                                    </div>
                                </div>
                            </div>

                            {/* Parts and Services Table */}
                            {((printOrder.partsUsed && printOrder.partsUsed.length > 0) ||
                                (printOrder.additionalServices && printOrder.additionalServices.length > 0)) && (
                                <div style={{ marginBottom: "4mm", color: "#000" }}>
                                    <p
                                        style={{
                                            fontWeight: "bold",
                                            margin: "0 0 2mm 0",
                                            fontSize: "11pt",
                                            color: "#000",
                                        }}
                                    >
                                        Phụ tùng và dịch vụ:
                                    </p>
                                    <table
                                        style={{
                                            width: "100%",
                                            borderCollapse: "collapse",
                                            border: "1px solid #ddd",
                                        }}
                                    >
                                        <thead>
                                            <tr style={{ backgroundColor: "#f5f5f5" }}>
                                                <th
                                                    style={{
                                                        border: "1px solid #ddd",
                                                        padding: "2mm",
                                                        textAlign: "center",
                                                        fontSize: "10pt",
                                                        width: "8%",
                                                    }}
                                                >
                                                    STT
                                                </th>
                                                <th
                                                    style={{
                                                        border: "1px solid #ddd",
                                                        padding: "2mm",
                                                        textAlign: "left",
                                                        fontSize: "10pt",
                                                    }}
                                                >
                                                    Tên
                                                </th>
                                                <th
                                                    style={{
                                                        border: "1px solid #ddd",
                                                        padding: "2mm",
                                                        textAlign: "center",
                                                        fontSize: "10pt",
                                                        width: "15%",
                                                    }}
                                                >
                                                    SL
                                                </th>
                                                <th
                                                    style={{
                                                        border: "1px solid #ddd",
                                                        padding: "2mm",
                                                        textAlign: "right",
                                                        fontSize: "10pt",
                                                        width: "25%",
                                                    }}
                                                >
                                                    Đơn giá
                                                </th>
                                                <th
                                                    style={{
                                                        border: "1px solid #ddd",
                                                        padding: "2mm",
                                                        textAlign: "right",
                                                        fontSize: "10pt",
                                                        width: "25%",
                                                    }}
                                                >
                                                    Thành tiền
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Parts */}
                                            {printOrder.partsUsed && printOrder.partsUsed.map(
                                                (part: WorkOrderPart, idx: number) => (
                                                    <tr key={`part-${idx}`}>
                                                        <td
                                                            style={{
                                                                border: "1px solid #ddd",
                                                                padding: "2mm",
                                                                textAlign: "center",
                                                                fontSize: "10pt",
                                                            }}
                                                        >
                                                            {idx + 1}
                                                        </td>
                                                        <td
                                                            style={{
                                                                border: "1px solid #ddd",
                                                                padding: "2mm",
                                                                fontSize: "10pt",
                                                            }}
                                                        >
                                                            {part.partName}
                                                        </td>
                                                        <td
                                                            style={{
                                                                border: "1px solid #ddd",
                                                                padding: "2mm",
                                                                textAlign: "center",
                                                                fontSize: "10pt",
                                                            }}
                                                        >
                                                            {part.quantity}
                                                        </td>
                                                        <td
                                                            style={{
                                                                border: "1px solid #ddd",
                                                                padding: "2mm",
                                                                textAlign: "right",
                                                                fontSize: "10pt",
                                                            }}
                                                        >
                                                            {formatCurrency(part.price)}
                                                        </td>
                                                        <td
                                                            style={{
                                                                border: "1px solid #ddd",
                                                                padding: "2mm",
                                                                textAlign: "right",
                                                                fontSize: "10pt",
                                                                fontWeight: "bold",
                                                            }}
                                                        >
                                                            {formatCurrency(part.price * part.quantity)}
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                            {/* Additional Services */}
                                            {printOrder.additionalServices && printOrder.additionalServices.map(
                                                (service: any, idx: number) => (
                                                    <tr key={`service-${idx}`}>
                                                        <td
                                                            style={{
                                                                border: "1px solid #ddd",
                                                                padding: "2mm",
                                                                textAlign: "center",
                                                                fontSize: "10pt",
                                                            }}
                                                        >
                                                            {(printOrder.partsUsed?.length || 0) + idx + 1}
                                                        </td>
                                                        <td
                                                            style={{
                                                                border: "1px solid #ddd",
                                                                padding: "2mm",
                                                                fontSize: "10pt",
                                                            }}
                                                        >
                                                            {service.description}
                                                        </td>
                                                        <td
                                                            style={{
                                                                border: "1px solid #ddd",
                                                                padding: "2mm",
                                                                textAlign: "center",
                                                                fontSize: "10pt",
                                                            }}
                                                        >
                                                            {service.quantity || 1}
                                                        </td>
                                                        <td
                                                            style={{
                                                                border: "1px solid #ddd",
                                                                padding: "2mm",
                                                                textAlign: "right",
                                                                fontSize: "10pt",
                                                            }}
                                                        >
                                                            {formatCurrency(service.price || 0)}
                                                        </td>
                                                        <td
                                                            style={{
                                                                border: "1px solid #ddd",
                                                                padding: "2mm",
                                                                textAlign: "right",
                                                                fontSize: "10pt",
                                                                fontWeight: "bold",
                                                            }}
                                                        >
                                                            {formatCurrency(
                                                                (service.price || 0) * (service.quantity || 1)
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Cost Summary - Only show items > 0 */}
                            <div
                                style={{
                                    border: "1px solid #ddd",
                                    padding: "4mm",
                                    marginBottom: "4mm",
                                    borderRadius: "2mm",
                                    backgroundColor: "#f9f9f9",
                                    color: "#000",
                                }}
                            >
                                <table style={{ width: "100%", borderSpacing: "0" }}>
                                    <tbody>
                                        {/* Phí dịch vụ (laborCost) - chỉ hiển thị khi > 0 */}
                                        {(printOrder.laborCost ?? 0) > 0 && (
                                            <tr>
                                                <td
                                                    style={{
                                                        fontWeight: "bold",
                                                        paddingBottom: "2mm",
                                                        fontSize: "10pt",
                                                    }}
                                                >
                                                    Phí dịch vụ:
                                                </td>
                                                <td
                                                    style={{
                                                        textAlign: "right",
                                                        paddingBottom: "2mm",
                                                        fontSize: "10pt",
                                                    }}
                                                >
                                                    {formatCurrency(printOrder.laborCost || 0)}
                                                </td>
                                            </tr>
                                        )}

                                        {printOrder.discount != null && printOrder.discount > 0 && (
                                            <tr>
                                                <td
                                                    style={{
                                                        fontWeight: "bold",
                                                        paddingBottom: "2mm",
                                                        fontSize: "10pt",
                                                        color: "#e74c3c",
                                                    }}
                                                >
                                                    Giảm giá:
                                                </td>
                                                <td
                                                    style={{
                                                        textAlign: "right",
                                                        paddingBottom: "2mm",
                                                        fontSize: "10pt",
                                                        color: "#e74c3c",
                                                    }}
                                                >
                                                    -{formatCurrency(printOrder.discount)}
                                                </td>
                                            </tr>
                                        )}
                                        <tr style={{ borderTop: "2px solid #333" }}>
                                            <td
                                                style={{
                                                    fontWeight: "bold",
                                                    paddingTop: "2mm",
                                                    fontSize: "12pt",
                                                }}
                                            >
                                                TỔNG CỘNG:
                                            </td>
                                            <td
                                                style={{
                                                    textAlign: "right",
                                                    paddingTop: "2mm",
                                                    fontSize: "12pt",
                                                    fontWeight: "bold",
                                                    color: "#2563eb",
                                                }}
                                            >
                                                {formatCurrency(printOrder.total)} ₫
                                            </td>
                                        </tr>
                                        {printOrder.totalPaid != null &&
                                            printOrder.totalPaid > 0 && (
                                                <tr>
                                                    <td
                                                        style={{
                                                            fontWeight: "bold",
                                                            paddingTop: "2mm",
                                                            fontSize: "10pt",
                                                            color: "#16a34a",
                                                        }}
                                                    >
                                                        Đã thanh toán:
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: "right",
                                                            paddingTop: "2mm",
                                                            fontSize: "10pt",
                                                            color: "#16a34a",
                                                        }}
                                                    >
                                                        {formatCurrency(printOrder.totalPaid)}
                                                    </td>
                                                </tr>
                                            )}
                                        {printOrder.remainingAmount != null &&
                                            printOrder.remainingAmount > 0 && (
                                                <tr>
                                                    <td
                                                        style={{
                                                            fontWeight: "bold",
                                                            fontSize: "11pt",
                                                            color: "#dc2626",
                                                        }}
                                                    >
                                                        Còn lại:
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: "right",
                                                            fontSize: "11pt",
                                                            fontWeight: "bold",
                                                            color: "#dc2626",
                                                        }}
                                                    >
                                                        {formatCurrency(printOrder.remainingAmount)}
                                                    </td>
                                                </tr>
                                            )}
                                        {printOrder.paymentMethod && (
                                            <tr>
                                                <td
                                                    style={{
                                                        paddingTop: "2mm",
                                                        fontSize: "9pt",
                                                        color: "#666",
                                                    }}
                                                >
                                                    Hình thức thanh toán:
                                                </td>
                                                <td
                                                    style={{
                                                        textAlign: "right",
                                                        paddingTop: "2mm",
                                                        fontSize: "9pt",
                                                        color: "#666",
                                                    }}
                                                >
                                                    {printOrder.paymentMethod === "cash"
                                                        ? "Tiền mặt"
                                                        : printOrder.paymentMethod === "bank"
                                                            ? "Chuyển khoản"
                                                            : printOrder.paymentMethod}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Dynamic QR Payment Code */}
                            {dynamicQRUrl && (
                                <div
                                    style={{
                                        marginTop: "6mm",
                                        padding: "4mm",
                                        border: "2px solid #2563eb",
                                        borderRadius: "4mm",
                                        backgroundColor: "#eff6ff",
                                        textAlign: "center",
                                    }}
                                >
                                    <p
                                        style={{
                                            margin: "0 0 3mm 0",
                                            fontSize: "11pt",
                                            fontWeight: "bold",
                                            color: "#2563eb",
                                        }}
                                    >
                                        📱 QUÉT MÃ ĐỂ THANH TOÁN
                                    </p>
                                    <img
                                        src={dynamicQRUrl}
                                        alt="QR Payment"
                                        style={{
                                            width: "40mm",
                                            height: "40mm",
                                            margin: "0 auto",
                                            display: "block",
                                        }}
                                    />
                                    <p
                                        style={{
                                            margin: "3mm 0 0 0",
                                            fontSize: "9pt",
                                            color: "#666",
                                        }}
                                    >
                                        Số tiền: <strong>{formatCurrency(printOrder.total)} ₫</strong>
                                    </p>
                                    <p
                                        style={{
                                            margin: "1mm 0 0 0",
                                            fontSize: "8pt",
                                            color: "#666",
                                        }}
                                    >
                                        {storeSettings?.bank_name} - {storeSettings?.bank_account_number}
                                    </p>
                                </div>
                            )}

                            {/* Footer */}
                            <div
                                style={{
                                    marginTop: "8mm",
                                    paddingTop: "4mm",
                                    borderTop: "1px dashed #999",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        fontSize: "10pt",
                                    }}
                                >
                                    <div style={{ textAlign: "center", width: "45%" }}>
                                        <p style={{ fontWeight: "bold", margin: "0 0 10mm 0" }}>
                                            Khách hàng
                                        </p>
                                        <p style={{ margin: "0", fontSize: "9pt", color: "#666" }}>
                                            (Ký và ghi rõ họ tên)
                                        </p>
                                    </div>
                                    <div style={{ textAlign: "center", width: "45%" }}>
                                        <p style={{ fontWeight: "bold", margin: "0 0 10mm 0" }}>
                                            Nhân viên
                                        </p>
                                        <p style={{ margin: "0", fontSize: "9pt", color: "#666" }}>
                                            {printOrder.technicianName || "(Ký và ghi rõ họ tên)"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Note */}
                            <div
                                style={{
                                    marginTop: "4mm",
                                    padding: "3mm",
                                    backgroundColor: "#fff9e6",
                                    border: "1px solid #ffd700",
                                    borderRadius: "2mm",
                                    fontSize: "9pt",
                                    textAlign: "center",
                                }}
                            >
                                <p style={{ margin: "0", fontStyle: "italic" }}>
                                    Cảm ơn quý khách đã sử dụng dịch vụ!
                                </p>
                                <p style={{ margin: "1mm 0 0 0", fontStyle: "italic" }}>
                                    Vui lòng giữ phiếu này để đối chiếu khi nhận xe
                                </p>
                            </div>

                            {/* Warranty Policy Disclaimer */}
                            <div
                                style={{
                                    marginTop: "3mm",
                                    padding: "2mm",
                                    fontSize: "8pt",
                                    color: "#666",
                                    borderTop: "1px solid #e5e7eb",
                                    lineHeight: "1.4",
                                }}
                            >
                                <p style={{ margin: "0 0 1mm 0", fontWeight: "bold" }}>
                                    Chính sách bảo hành:
                                </p>
                                <ul
                                    style={{
                                        margin: "0",
                                        paddingLeft: "5mm",
                                        listStyleType: "disc",
                                    }}
                                >
                                    <li>
                                        Bảo hành áp dụng cho phụ tùng chính hãng và lỗi kỹ thuật do thợ
                                    </li>
                                    <li>
                                        Không bảo hành đối với va chạm, ngã xe, ngập nước sau khi nhận
                                        xe
                                    </li>
                                    <li>
                                        Mang theo phiếu này khi đến bảo hành. Liên hệ hotline nếu có
                                        thắc mắc
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default PrintOrderPreviewModal;
