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
    print_paper_size?: "K80" | "A5";
    print_show_logo?: boolean;
    print_greeting?: string;
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
    // All hooks must be declared before any early returns (Rules of Hooks)
    const [isSharing, setIsSharing] = React.useState(false);

    // Generate dynamic VietQR URL with amount and description
    const dynamicQRUrl = useMemo(() => {
        if (!isOpen || !printOrder) return null;

        if (!storeSettings?.bank_name || !storeSettings?.bank_account_number || !storeSettings?.bank_account_holder) {
            return null; // Return null to use static QR
        }

        const bankBin = findBankBin(storeSettings.bank_name);
        if (!bankBin) {
            return null; // Return null to use static QR
        }

        const amount = printOrder.remainingAmount && printOrder.remainingAmount > 0 
            ? printOrder.remainingAmount 
            : printOrder.total || 0;
        
        const orderCode = formatWorkOrderId(printOrder.id, storeSettings.work_order_prefix);
        const description = `Thanh toan ${orderCode}`;

        return generateVietQRUrl({
            bankId: bankBin,
            accountNumber: storeSettings.bank_account_number,
            accountName: storeSettings.bank_account_holder,
            amount: amount,
            description: description,
            template: 'qr_only',
        });
    }, [isOpen, printOrder, storeSettings]);

    if (!isOpen || !printOrder) return null;

    const handleShare = async () => {
        if (isSharing) return;
        setIsSharing(true);

        const element = document.getElementById("mobile-print-preview-content");
        if (!element) {
            showToast.error("Không tìm thấy nội dung phiếu!");
            setIsSharing(false);
            return;
        }

        showToast.info("Đang tạo hình ảnh...");

        // Move element off-screen so html2canvas captures it at full 1:1 scale
        // without being constrained by the modal's scroll container.
        const originalParent = element.parentElement!;
        const originalNextSibling = element.nextSibling;
        const originalStyle = {
            transform: element.style.transform,
            marginBottom: element.style.marginBottom,
            width: element.style.width,
        };

        const offscreen = document.createElement("div");
        offscreen.style.cssText = "position:fixed;top:0;left:-9999px;z-index:-999;background:#fff;overflow:visible;";
        document.body.appendChild(offscreen);

        // Move element into off-screen container and reset any CSS transforms
        offscreen.appendChild(element);
        element.style.transform = "none";
        element.style.marginBottom = "0";
        element.style.width = storeSettings?.print_paper_size === "K80" ? "320px" : "560px"; // ~80mm or ~148mm at 96dpi — fixed for consistent capture
        // Wait for layout + any lazy-loaded images
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            const html2canvas = (await import("html2canvas")).default;

            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: "#ffffff",
                useCORS: true,
                allowTaint: false,
                logging: false,
                width: element.scrollWidth,
                height: element.scrollHeight,
                windowWidth: element.scrollWidth + 40,
                windowHeight: element.scrollHeight + 40,
            });

            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error("Canvas toBlob returned null"));
                }, "image/png", 1.0);
            });

            const fileName = `Phieu_${formatWorkOrderId(
                printOrder.id,
                storeSettings?.work_order_prefix
            )}.png`;

            if (navigator.share && navigator.canShare) {
                const file = new File([blob], fileName, { type: "image/png" });
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
                    downloadImage(blob, fileName);
                }
            } else {
                downloadImage(blob, fileName);
            }
        } catch (err) {
            if ((err as Error)?.name !== "AbortError") {
                console.error("Share failed:", err);
                showToast.error("Không thể tạo hình ảnh. Vui lòng thử lại!");
            }
        } finally {
            // Always restore element to its original position in the DOM
            element.style.transform = originalStyle.transform;
            element.style.marginBottom = originalStyle.marginBottom;
            element.style.width = originalStyle.width;

            if (originalNextSibling) {
                originalParent.insertBefore(element, originalNextSibling);
            } else {
                originalParent.appendChild(element);
            }
            document.body.removeChild(offscreen);
            setIsSharing(false);
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
                            disabled={isSharing}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-wait text-white rounded-lg flex items-center gap-1.5 transition text-sm"
                        >
                            <Share2 className="w-4 h-4" />
                            {isSharing ? "Đang xử lý..." : "Chia sẻ"}
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

                {/* On mobile: horizontal scroll so the A5 invoice is fully visible, consistent with desktop */}
                <div className="flex-1 overflow-auto p-3 md:p-4 bg-slate-100 dark:bg-slate-900">
                    <div
                        id="mobile-print-preview-content"
                        className="bg-white shadow-lg relative !bg-white !text-black mx-auto"
                        style={{
                            width: storeSettings?.print_paper_size === "K80" ? "320px" : "560px", // ~80mm or ~148mm at 96dpi
                            minHeight: storeSettings?.print_paper_size === "K80" ? "120mm" : "210mm",
                            color: "#000000",
                            backgroundColor: "#ffffff",
                        }}
                    >
                        {/* Watermark Logo for Print */}
                        {(storeSettings?.print_show_logo !== false) && (
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
                        )}
                        <div style={{ padding: storeSettings?.print_paper_size === "K80" ? "2mm" : "3mm", fontSize: storeSettings?.print_paper_size === "K80" ? "8.5pt" : "10.5pt" }}>
                            {/* Store Info Header - Compact Layout */}
                            {/* Store Info Header - Mobile Optimized (Stacked) */}
                            {/* Store Info Header - Compact Layout (Side-by-Side) */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "4mm",
                                    marginBottom: "3mm",
                                    borderBottom: "2px solid #3b82f6",
                                    paddingBottom: "2.5mm",
                                }}
                            >
                                {/* Left: Logo */}
                                {(storeSettings?.print_show_logo !== false) && storeSettings?.logo_url && (
                                    <img
                                        src={storeSettings.logo_url}
                                        alt="Logo"
                                        style={{
                                            height: storeSettings?.print_paper_size === "K80" ? "10mm" : "14mm",
                                            width: storeSettings?.print_paper_size === "K80" ? "10mm" : "14mm",
                                            objectFit: "contain",
                                            flexShrink: 0,
                                        }}
                                    />
                                )}

                                {/* Center: Store Info */}
                                <div
                                    style={{ fontSize: "8pt", lineHeight: "1.3" }}
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
                                        <span>{storeSettings?.phone || "0907.239.337"}</span>
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
                            {printOrder.issueDescription && printOrder.issueDescription.trim() !== "" && (
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
                                            {printOrder.issueDescription}
                                        </div>
                                    </div>
                                </div>
                            )}

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
                                                (part: WorkOrderPart, idx: number) => {
                                                    const partIsFree = part.isFree || (part as any).isfree;
                                                    const partPrice = part.price || 0;
                                                    const partDiscount = part.discount || 0;
                                                    const partOriginalTotal = partPrice * (part.quantity || 1);
                                                    const partTotal = partIsFree ? 0 : partOriginalTotal - partDiscount;
                                                    return (
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
                                                                {partIsFree && (
                                                                    <span style={{ marginLeft: "4px", color: "#16a34a", fontWeight: "bold", fontSize: "8.5pt" }}>
                                                                        (Tặng)
                                                                    </span>
                                                                )}
                                                                {!partIsFree && partDiscount > 0 && (
                                                                    <div style={{ color: "#ef4444", fontSize: "8pt", marginTop: "1px" }}>
                                                                        (Giảm -{formatCurrency(partDiscount)})
                                                                    </div>
                                                                )}
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
                                                                {partIsFree ? (
                                                                    <span style={{ textDecoration: "line-through", color: "#999" }}>{formatCurrency(partPrice)}</span>
                                                                ) : partPrice === 0 ? (
                                                                    <span style={{ color: "#16a34a", fontWeight: "bold" }}>Tặng</span>
                                                                ) : formatCurrency(partPrice)}
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
                                                                {partIsFree ? (
                                                                    <div>
                                                                        <span style={{ textDecoration: "line-through", color: "#999", fontWeight: "normal", fontSize: "8pt" }}>{formatCurrency(partOriginalTotal)}</span>
                                                                        <br />
                                                                        <span style={{ color: "#16a34a", fontWeight: "bold" }}>Tặng</span>
                                                                    </div>
                                                                ) : partPrice === 0 ? (
                                                                    <span style={{ color: "#16a34a", fontWeight: "bold" }}>Tặng</span>
                                                                ) : partDiscount > 0 ? (
                                                                    <div>
                                                                        <span style={{ textDecoration: "line-through", color: "#999", fontWeight: "normal", fontSize: "8pt" }}>{formatCurrency(partOriginalTotal)}</span>
                                                                        <br />
                                                                        <span>{formatCurrency(partTotal)}</span>
                                                                    </div>
                                                                ) : formatCurrency(partTotal)}
                                                            </td>
                                                        </tr>
                                                    );
                                                }
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
                                                {formatCurrency(printOrder.total)}
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

                            {/* Dynamic QR Payment Code (Horizontal Layout) */}
                            {(dynamicQRUrl || storeSettings?.bank_qr_url) && (
                                <div
                                    style={{
                                        marginTop: "4mm",
                                        padding: "3.5mm",
                                        border: "2px solid #2563eb",
                                        borderRadius: "4mm",
                                        backgroundColor: "#eff6ff",
                                        color: "#000",
                                    }}
                                >
                                    <p
                                        style={{
                                            margin: "0 0 2.5mm 0",
                                            fontSize: "10.5pt",
                                            fontWeight: "bold",
                                            color: "#2563eb",
                                            textAlign: "center",
                                        }}
                                    >
                                        📱 QUÉT MÃ ĐỂ THANH TOÁN
                                    </p>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: "4mm",
                                        }}
                                    >
                                        {/* Left Column: Bank Details */}
                                        <div
                                            style={{
                                                flex: 1,
                                                textAlign: "left",
                                                fontSize: "9pt",
                                                color: "#000",
                                                lineHeight: "1.4",
                                            }}
                                        >
                                            <div style={{ fontSize: "10pt", color: "#333", marginBottom: "1.5mm" }}>
                                                Số tiền: <strong style={{ color: "#2563eb", fontSize: "11pt" }}>{formatCurrency(printOrder.total || 0)}</strong>
                                            </div>
                                            <div>
                                                Ngân hàng: <strong>{storeSettings?.bank_name}</strong>
                                            </div>
                                            <div>
                                                STK: <strong style={{ color: "#2563eb", fontSize: "10pt" }}>{storeSettings?.bank_account_number}</strong>
                                            </div>
                                            {storeSettings?.bank_account_holder && (
                                                <div style={{ fontSize: "8.5pt", color: "#555", textTransform: "uppercase" }}>
                                                    Chủ TK: {storeSettings.bank_account_holder}
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Column: QR Code */}
                                        <div
                                            style={{
                                                flexShrink: 0,
                                                padding: "1mm",
                                                backgroundColor: "#fff",
                                                borderRadius: "1.5mm",
                                                border: "1px solid #bfdbfe",
                                            }}
                                        >
                                            <img
                                                src={dynamicQRUrl || storeSettings?.bank_qr_url}
                                                alt="QR Payment"
                                                style={{
                                                    width: "30mm",
                                                    height: "30mm",
                                                    display: "block",
                                                    objectFit: "contain",
                                                }}
                                            />
                                        </div>
                                    </div>
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

                            {/* Note & QR Code Tra Cuu */}
                            <div
                                style={{
                                    marginTop: "4mm",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4mm",
                                    padding: "3mm",
                                    backgroundColor: "#fff9e6",
                                    border: "1px solid #ffd700",
                                    borderRadius: "2mm",
                                }}
                            >
                                <div style={{ flex: 1, fontSize: "9pt", textAlign: "left" }}>
                                    <p style={{ margin: "0", fontStyle: "italic", fontWeight: "bold", color: "#b7791f" }}>
                                        📱 TRA CỨU TIẾN ĐỘ SỬA CHỮA ONLINE
                                    </p>
                                    <p style={{ margin: "1mm 0 0 0", fontSize: "8.5pt", color: "#444", lineHeight: "1.3" }}>
                                        Quét mã QR bên cạnh để theo dõi trạng thái xe của bạn thời gian thực và xem đầy đủ lịch sử bảo dưỡng trước đó của xe.
                                    </p>
                                </div>
                                <div style={{ flexShrink: 0 }}>
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                                            window.location.origin + "/tra-cuu/" + printOrder.id
                                        )}`}
                                        alt="QR Tra cuu"
                                        style={{
                                            height: "18mm",
                                            width: "18mm",
                                            display: "block",
                                        }}
                                    />
                                </div>
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

                            {/* Custom Greeting from Settings */}
                            <div
                                style={{
                                    marginTop: "4mm",
                                    paddingTop: "2mm",
                                    borderTop: "1.5px dashed #bbb",
                                    textAlign: "center",
                                    fontSize: "8.5pt",
                                    color: "#000",
                                    fontWeight: "bold",
                                }}
                            >
                                {storeSettings?.print_greeting || "Cảm ơn quý khách! Hẹn gặp lại"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default PrintOrderPreviewModal;
