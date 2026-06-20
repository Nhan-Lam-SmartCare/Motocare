import React, { useEffect, useMemo, useState, useRef } from "react";
import { Share2, Printer, X } from "lucide-react";
import { WorkOrder, WorkOrderPart } from "../../../../types";
import { formatCurrency, formatWorkOrderId } from "../../../../utils/format";
import { printElementById } from "../../../../utils/print";
import { findBankBin, generateVietQRUrl } from "../../../../utils/vietqr";
import { downloadImage, shareInvoiceAsImage } from "../../utils/service.utils";
import { showToast } from "../../../../utils/toast";

interface StoreSettings {
  store_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  bank_qr_url?: string;
  work_order_prefix?: string;
  print_paper_size?: "K80" | "A5";
  print_show_logo?: boolean;
  print_greeting?: string;
}

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  printOrder: WorkOrder;
  storeSettings: StoreSettings | null;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  printOrder,
  storeSettings,
}) => {
  const [isSharing, setIsSharing] = useState(false);
  const invoicePreviewRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        previewScrollRef.current?.scrollTo({ top: 0, left: 0 });
      });
    }
  }, [isOpen, printOrder.id]);

  // Generate dynamic VietQR for print
  const printQRUrl = useMemo(() => {
    if (
      !printOrder ||
      !storeSettings?.bank_name ||
      !storeSettings?.bank_account_number ||
      !storeSettings?.bank_account_holder
    ) {
      return null;
    }

    const bankBin = findBankBin(storeSettings.bank_name);
    if (!bankBin) {
      return null;
    }

    const amount =
      printOrder.remainingAmount && printOrder.remainingAmount > 0
        ? printOrder.remainingAmount
        : printOrder.total || 0;

    const orderCode = formatWorkOrderId(
      printOrder.id,
      storeSettings.work_order_prefix
    );
    const description = `Thanh toan ${orderCode}`;

    const qrUrl = generateVietQRUrl({
      bankId: bankBin,
      accountNumber: storeSettings.bank_account_number,
      accountName: storeSettings.bank_account_holder,
      amount: amount,
      description: description,
      template: "qr_only",
    });

    return qrUrl;
  }, [printOrder, storeSettings]);

  // Handle sharing invoice as image
  const handleShareInvoice = async () => {
    const element = invoicePreviewRef.current;
    if (!element) {
      showToast.error("Không tìm thấy nội dung phiếu!");
      return;
    }

    setIsSharing(true);
    showToast.info("Đang tạo hình ảnh...");

    // Unified off-screen rendering for premium, full-scale capture on all devices
    const originalParent = element.parentElement!;
    const originalNextSibling = element.nextSibling;
    const originalMaxWidth = element.style.maxWidth;

    const offscreen = document.createElement("div");
    offscreen.style.cssText =
      "position:fixed;top:0;left:-9999px;z-index:-999;background:#fff;overflow:visible;";
    document.body.appendChild(offscreen);
    offscreen.appendChild(element);
    element.style.maxWidth = "none";

    await new Promise((r) => setTimeout(r, 300));

    try {
      const orderCode = formatWorkOrderId(
        printOrder.id,
        storeSettings?.work_order_prefix
      );
      await shareInvoiceAsImage(element, orderCode);
    } catch (err) {
      console.error("Share failed:", err);
      showToast.error("Không thể chia sẻ hình ảnh");
    } finally {
      // Restore the DOM layout
      element.style.maxWidth = originalMaxWidth;
      if (originalNextSibling) {
        originalParent.insertBefore(element, originalNextSibling);
      } else {
        originalParent.appendChild(element);
      }
      document.body.removeChild(offscreen);
      setIsSharing(false);
    }
  };

  // Handle actual printing
  const handleDoPrint = () => {
    setTimeout(() => {
      printElementById("work-order-receipt");
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* On-screen Preview Dialog */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-2 md:p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between flex-shrink-0">
            <h2 className="text-base md:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Xem trước phiếu in
            </h2>
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={handleShareInvoice}
                disabled={isSharing}
                className="px-2.5 py-1.5 md:px-4 md:py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg flex items-center gap-1.5 transition text-xs md:text-sm font-bold shadow-md shadow-emerald-500/10"
              >
                <Share2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {isSharing ? "Đang xử lý..." : "Chia sẻ"}
              </button>
              <button
                onClick={handleDoPrint}
                className="px-2.5 py-1.5 md:px-4 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 transition text-xs md:text-sm font-bold shadow-md shadow-blue-500/10"
              >
                <Printer className="w-3.5 h-3.5 md:w-4 md:h-4" />
                In phiếu
              </button>
              <button
                onClick={onClose}
                className="p-1.5 md:p-2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 bg-slate-100 dark:bg-slate-700 rounded-lg transition"
                aria-label="Đóng"
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>

          {/* Preview Container */}
          <div
            ref={previewScrollRef}
            className="flex-1 overflow-auto p-3 md:p-6 bg-slate-100 dark:bg-slate-900 flex items-start justify-center"
          >
            <div
              ref={invoicePreviewRef}
              className="bg-white shadow-xl mx-auto w-full md:w-[148mm] min-h-[210mm] flex-shrink-0 text-slate-950 p-[5mm] md:p-[10mm]"
              style={{ color: "#000", fontFamily: "Arial, sans-serif" }}
            >
              {/* Store Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6mm",
                  marginBottom: "4mm",
                  borderBottom: "2px solid #3b82f6",
                  paddingBottom: "3mm",
                }}
              >
                {storeSettings?.logo_url && (
                  <img
                    src={storeSettings.logo_url}
                    alt="Logo"
                    style={{
                      height: "18mm",
                      width: "18mm",
                      objectFit: "contain",
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ fontSize: "8.5pt", lineHeight: "1.4", flex: 1 }}>
                  <div
                    style={{
                      fontWeight: "bold",
                      fontSize: "11pt",
                      marginBottom: "1mm",
                      color: "#1e40af",
                    }}
                  >
                    {storeSettings?.store_name || "Nhạn Lâm SmartCare"}
                  </div>
                  <div>Địa chỉ: {storeSettings?.address || ""}</div>
                  <div>SĐT: {storeSettings?.phone || ""}</div>
                  {storeSettings?.email && <div>Email: {storeSettings.email}</div>}
                </div>
              </div>

              {/* Title & Metadata */}
              <div style={{ textAlign: "center", marginBottom: "4mm" }}>
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "9pt",
                    color: "#666",
                    marginTop: "2mm",
                  }}
                >
                  <div>
                    {new Date(printOrder.creationDate).toLocaleString("vi-VN")}
                  </div>
                  <div style={{ fontStyle: "normal", fontWeight: "bold" }}>
                    Mã:{" "}
                    {formatWorkOrderId(
                      printOrder.id,
                      storeSettings?.work_order_prefix
                    )}
                  </div>
                </div>
              </div>

              {/* Customer and Vehicle Info */}
              <div
                style={{
                  border: "1px solid #ddd",
                  padding: "3mm",
                  marginBottom: "3mm",
                  borderRadius: "2mm",
                  backgroundColor: "#f8fafc",
                  fontSize: "9pt",
                }}
              >
                <div style={{ display: "flex", gap: "4mm", marginBottom: "1.5mm" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: "bold" }}>Khách hàng:</span>{" "}
                    {printOrder.customerName}
                  </div>
                  <div>
                    <span style={{ fontWeight: "bold" }}>SĐT:</span>{" "}
                    {printOrder.customerPhone}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "4mm" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: "bold" }}>Loại xe:</span>{" "}
                    {printOrder.vehicleModel}
                  </div>
                  <div>
                    <span style={{ fontWeight: "bold" }}>Biển số:</span>{" "}
                    {printOrder.licensePlate}
                  </div>
                </div>
              </div>

              {/* Issue Description */}
              {printOrder.issueDescription &&
                printOrder.issueDescription.trim() !== "" && (
                  <div
                    style={{
                      border: "1px solid #ddd",
                      padding: "3mm",
                      marginBottom: "3mm",
                      borderRadius: "2mm",
                      fontSize: "9pt",
                    }}
                  >
                    <strong>Mô tả sự cố:</strong> {printOrder.issueDescription}
                  </div>
                )}

              {/* Parts and Services Table */}
              {((printOrder.partsUsed && printOrder.partsUsed.length > 0) ||
                (printOrder.additionalServices &&
                  printOrder.additionalServices.length > 0)) && (
                <div style={{ marginBottom: "4mm" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      border: "1px solid #ddd",
                      fontSize: "9pt",
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#f5f5f5" }}>
                        <th style={{ border: "1px solid #ddd", padding: "1.5mm", width: "8%" }}>STT</th>
                        <th style={{ border: "1px solid #ddd", padding: "1.5mm", textAlign: "left" }}>Tên phụ tùng / Dịch vụ</th>
                        <th style={{ border: "1px solid #ddd", padding: "1.5mm", width: "12%" }}>SL</th>
                        <th style={{ border: "1px solid #ddd", padding: "1.5mm", textAlign: "right", width: "22%" }}>Đơn giá</th>
                        <th style={{ border: "1px solid #ddd", padding: "1.5mm", textAlign: "right", width: "22%" }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printOrder.partsUsed?.map((part: WorkOrderPart, idx: number) => {
                        const partIsFree = part.isFree || (part as any).isfree;
                        const partPrice = part.price || 0;
                        const partDiscount = part.discount || 0;
                        const partOriginalTotal = partPrice * (part.quantity || 1);
                        const partTotal = partIsFree ? 0 : partOriginalTotal - partDiscount;
                        return (
                          <tr key={`part-${idx}`}>
                            <td style={{ border: "1px solid #ddd", padding: "1.5mm", textAlign: "center" }}>{idx + 1}</td>
                            <td style={{ border: "1px solid #ddd", padding: "1.5mm" }}>
                              {part.partName}
                              {partIsFree && (
                                <span style={{ marginLeft: "4px", color: "#16a34a", fontWeight: "bold", fontSize: "8pt" }}>
                                  (Tặng)
                                </span>
                              )}
                              {!partIsFree && partDiscount > 0 && (
                                <div style={{ color: "#ef4444", fontSize: "8pt", marginTop: "1px" }}>
                                  (Giảm -{formatCurrency(partDiscount)})
                                </div>
                              )}
                            </td>
                            <td style={{ border: "1px solid #ddd", padding: "1.5mm", textAlign: "center" }}>{part.quantity}</td>
                            <td style={{ border: "1px solid #ddd", padding: "1.5mm", textAlign: "right" }}>
                              {partIsFree ? (
                                <span style={{ textDecoration: "line-through", color: "#999" }}>{formatCurrency(partPrice)}</span>
                              ) : partPrice === 0 ? (
                                <span style={{ color: "#16a34a", fontWeight: "bold" }}>Tặng</span>
                              ) : formatCurrency(partPrice)}
                            </td>
                            <td style={{ border: "1px solid #ddd", padding: "1.5mm", textAlign: "right", fontWeight: "bold" }}>
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
                      })}
                      {printOrder.additionalServices?.map((service: any, idx: number) => {
                        const serviceIsFree = service.isFree || service.isfree;
                        const servicePrice = service.price || 0;
                        const serviceTotal = servicePrice * (service.quantity || 1);
                        return (
                          <tr key={`service-${idx}`}>
                            <td style={{ border: "1px solid #ddd", padding: "1.5mm", textAlign: "center" }}>{(printOrder.partsUsed?.length || 0) + idx + 1}</td>
                            <td style={{ border: "1px solid #ddd", padding: "1.5mm" }}>
                              {service.description}
                              {serviceIsFree && (
                                <span style={{ marginLeft: "4px", color: "#16a34a", fontWeight: "bold", fontSize: "8pt" }}>
                                  (Tặng)
                                </span>
                              )}
                            </td>
                            <td style={{ border: "1px solid #ddd", padding: "1.5mm", textAlign: "center" }}>{service.quantity || 1}</td>
                            <td style={{ border: "1px solid #ddd", padding: "1.5mm", textAlign: "right" }}>
                              {serviceIsFree ? (
                                <span style={{ textDecoration: "line-through", color: "#999" }}>{formatCurrency(servicePrice)}</span>
                              ) : servicePrice === 0 ? (
                                <span style={{ color: "#16a34a", fontWeight: "bold" }}>Tặng</span>
                              ) : formatCurrency(servicePrice)}
                            </td>
                            <td style={{ border: "1px solid #ddd", padding: "1.5mm", textAlign: "right", fontWeight: "bold" }}>
                              {serviceIsFree ? (
                                <div>
                                  <span style={{ textDecoration: "line-through", color: "#999", fontWeight: "normal", fontSize: "8pt" }}>{formatCurrency(serviceTotal)}</span>
                                  <br />
                                  <span style={{ color: "#16a34a", fontWeight: "bold" }}>Tặng</span>
                                </div>
                              ) : servicePrice === 0 ? (
                                <span style={{ color: "#16a34a", fontWeight: "bold" }}>Tặng</span>
                              ) : formatCurrency(serviceTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Financial summary */}
              <div
                style={{
                  border: "1px solid #ddd",
                  padding: "3mm",
                  borderRadius: "2mm",
                  backgroundColor: "#f9f9f9",
                  fontSize: "9pt",
                  marginBottom: "4mm",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1mm" }}>
                  <span>Phí dịch vụ kỹ thuật:</span>
                  <span>{formatCurrency(printOrder.laborCost || 0)}</span>
                </div>
                {printOrder.discount != null && printOrder.discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1mm", color: "#e74c3c" }}>
                    <span>Giảm giá:</span>
                    <span>-{formatCurrency(printOrder.discount)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "2.5mm", borderTop: "2px solid #3b82f6", fontSize: "11pt", fontWeight: "bold", color: "#1e40af" }}>
                  <span>TỔNG CỘNG:</span>
                  <span>{formatCurrency(printOrder.total || 0)}</span>
                </div>
                {printOrder.totalPaid != null && printOrder.totalPaid > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5mm", color: "#16a34a", fontWeight: "bold" }}>
                    <span>Đã thanh toán:</span>
                    <span>{formatCurrency(printOrder.totalPaid)}</span>
                  </div>
                )}
                {printOrder.remainingAmount != null && printOrder.remainingAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5mm", color: "#dc2626", fontWeight: "bold" }}>
                    <span>Còn lại (Nợ):</span>
                    <span>{formatCurrency(printOrder.remainingAmount)}</span>
                  </div>
                )}
              </div>

              {/* QR Code and Bank Details */}
              {printQRUrl && (
                <div
                  style={{
                    padding: "3.5mm",
                    border: "2px solid #2563eb",
                    borderRadius: "4mm",
                    backgroundColor: "#eff6ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "3mm",
                    marginBottom: "4mm",
                  }}
                >
                  <div style={{ fontSize: "8.5pt", flex: 1 }}>
                    <div style={{ fontWeight: "bold", color: "#2563eb", fontSize: "9.5pt", marginBottom: "1.5mm" }}>📱 QUÉT MÃ QR ĐỂ THANH TOÁN</div>
                    <div>Ngân hàng: <strong>{storeSettings?.bank_name}</strong></div>
                    <div>Số tài khoản: <strong>{storeSettings?.bank_account_number}</strong></div>
                    <div>Chủ tài khoản: <strong>{storeSettings?.bank_account_holder}</strong></div>
                  </div>
                  <div style={{ flexShrink: 0, padding: "1mm", backgroundColor: "#fff", borderRadius: "1.5mm", border: "1px solid #bfdbfe" }}>
                    <img src={printQRUrl} alt="VietQR" style={{ width: "25mm", height: "25mm", display: "block" }} />
                  </div>
                </div>
              )}

              {/* Online Tracking QR */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4mm",
                  padding: "3mm",
                  backgroundColor: "#fff9e6",
                  border: "1px solid #ffd700",
                  borderRadius: "2mm",
                  fontSize: "8.5pt",
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0", fontWeight: "bold", color: "#b7791f" }}>
                    📱 TRA CỨU TIẾN ĐỘ SỬA CHỮA ONLINE
                  </p>
                  <p style={{ margin: "0.5mm 0 0 0", color: "#444" }}>
                    Quét mã QR để theo dõi tiến độ sửa chữa thời gian thực & lịch sử bảo dưỡng.
                  </p>
                </div>
                <div style={{ flexShrink: 0, padding: "0.5mm", backgroundColor: "#fff", borderRadius: "1mm", border: "1px solid #ffd700" }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                      window.location.origin + "/tra-cuu/" + printOrder.id
                    )}`}
                    alt="QR Online Tra Cuu"
                    style={{ height: "15mm", width: "15mm", display: "block" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Print Receipt Template */}
      <div
        id="work-order-receipt"
        className="hidden print:block"
        style={{
          width: storeSettings?.print_paper_size === "K80" ? "80mm" : "148mm",
          margin: "0 auto",
          padding: storeSettings?.print_paper_size === "K80" ? "4mm" : "10mm",
          fontFamily: "Arial, sans-serif",
          fontSize: storeSettings?.print_paper_size === "K80" ? "8.5pt" : "11pt",
          color: "#000",
          backgroundColor: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6mm",
            borderBottom: "2px solid #3b82f6",
            paddingBottom: "3mm",
            marginBottom: "4mm",
          }}
        >
          {storeSettings?.print_show_logo !== false && storeSettings?.logo_url && (
            <img
              src={storeSettings.logo_url}
              alt="Logo"
              style={{
                height: storeSettings?.print_paper_size === "K80" ? "12mm" : "18mm",
                width: storeSettings?.print_paper_size === "K80" ? "12mm" : "18mm",
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ fontSize: "8.5pt", lineHeight: "1.4" }}>
            <div style={{ fontWeight: "bold", fontSize: "11pt", marginBottom: "1mm", color: "#1e40af" }}>
              {storeSettings?.store_name || "Nhạn Lâm SmartCare"}
            </div>
            <div>Địa chỉ: {storeSettings?.address || ""}</div>
            <div>SĐT: {storeSettings?.phone || ""}</div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: "4mm" }}>
          <h1 style={{ fontSize: "14pt", fontStyle: "normal", fontWeight: "bold", textTransform: "uppercase", color: "#1e40af", margin: "0" }}>
            PHIẾU DỊCH VỤ SỬA CHỮA
          </h1>
          <div style={{ fontSize: "9pt", color: "#666", marginTop: "1mm" }}>
            Mã: {formatWorkOrderId(printOrder.id, storeSettings?.work_order_prefix)}
          </div>
          <div style={{ fontSize: "8pt", color: "#666" }}>
            {new Date(printOrder.creationDate).toLocaleString("vi-VN")}
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", padding: "3mm", marginBottom: "3mm", borderRadius: "2mm", fontSize: "9pt" }}>
          <div><strong>Khách hàng:</strong> {printOrder.customerName} - {printOrder.customerPhone}</div>
          <div><strong>Xe:</strong> {printOrder.vehicleModel} - {printOrder.licensePlate}</div>
        </div>

        {printOrder.issueDescription && (
          <div style={{ border: "1px solid #ddd", padding: "3mm", marginBottom: "3mm", borderRadius: "2mm", fontSize: "9pt" }}>
            <strong>Sự cố:</strong> {printOrder.issueDescription}
          </div>
        )}

        {/* List of items */}
        {((printOrder.partsUsed && printOrder.partsUsed.length > 0) ||
          (printOrder.additionalServices && printOrder.additionalServices.length > 0)) && (
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd", fontSize: "9pt", marginBottom: "4mm" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ border: "1px solid #ddd", padding: "1.5mm" }}>Tên</th>
                <th style={{ border: "1px solid #ddd", padding: "1.5mm", width: "12%", textAlign: "center" }}>SL</th>
                <th style={{ border: "1px solid #ddd", padding: "1.5mm", width: "22%", textAlign: "right" }}>Đơn giá</th>
                <th style={{ border: "1px solid #ddd", padding: "1.5mm", width: "22%", textAlign: "right" }}>T.Tiền</th>
              </tr>
            </thead>
            <tbody>
              {printOrder.partsUsed?.map((part: WorkOrderPart, idx: number) => {
                const partIsFree = part.isFree || (part as any).isfree;
                const partPrice = part.price || 0;
                const partDiscount = part.discount || 0;
                const partOriginalTotal = partPrice * (part.quantity || 1);
                const partTotal = partIsFree ? 0 : partOriginalTotal - partDiscount;
                return (
                  <tr key={`part-${idx}`}>
                    <td style={{ border: "1px solid #ddd", padding: "1.5mm" }}>
                      {part.partName}
                      {partIsFree && (
                        <span style={{ marginLeft: "3px", color: "#16a34a", fontWeight: "bold", fontSize: "7pt" }}>
                          (Tặng)
                        </span>
                      )}
                      {!partIsFree && partDiscount > 0 && (
                        <div style={{ color: "#ef4444", fontSize: "7.5pt", marginTop: "1px" }}>
                          (Giảm -{formatCurrency(partDiscount)})
                        </div>
                      )}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "1.5mm", textAlign: "center" }}>{part.quantity}</td>
                    <td style={{ border: "1px solid #ddd", padding: "1.5mm", textAlign: "right" }}>
                      {partIsFree ? (
                        <span style={{ textDecoration: "line-through", color: "#999" }}>{formatCurrency(partPrice)}</span>
                      ) : partPrice === 0 ? (
                        <span style={{ color: "#16a34a", fontWeight: "bold" }}>Tặng</span>
                      ) : formatCurrency(partPrice)}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "1.5mm", textAlign: "right", fontWeight: "bold" }}>
                      {partIsFree ? (
                        <div>
                          <span style={{ textDecoration: "line-through", color: "#999", fontWeight: "normal", fontSize: "7.5pt" }}>{formatCurrency(partOriginalTotal)}</span>
                          <br />
                          <span style={{ color: "#16a34a", fontWeight: "bold" }}>Tặng</span>
                        </div>
                      ) : partPrice === 0 ? (
                        <span style={{ color: "#16a34a", fontWeight: "bold" }}>Tặng</span>
                      ) : partDiscount > 0 ? (
                        <div>
                          <span style={{ textDecoration: "line-through", color: "#999", fontWeight: "normal", fontSize: "7.5pt" }}>{formatCurrency(partOriginalTotal)}</span>
                          <br />
                          <span>{formatCurrency(partTotal)}</span>
                        </div>
                      ) : formatCurrency(partTotal)}
                    </td>
                  </tr>
                );
              })}
              {printOrder.additionalServices?.map((service: any, idx: number) => {
                const serviceIsFree = service.isFree || service.isfree;
                const servicePrice = service.price || 0;
                const serviceTotal = servicePrice * (service.quantity || 1);
                return (
                  <tr key={`service-${idx}`}>
                    <td style={{ border: "1px solid #ddd", padding: "1.5mm" }}>
                      {service.description}
                      {serviceIsFree && (
                        <span style={{ marginLeft: "3px", color: "#16a34a", fontWeight: "bold", fontSize: "7pt" }}>
                          (Tặng)
                        </span>
                      )}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "1.5mm", textAlign: "center" }}>{service.quantity || 1}</td>
                    <td style={{ border: "1px solid #ddd", padding: "1.5mm", textAlign: "right" }}>
                      {serviceIsFree ? (
                        <span style={{ textDecoration: "line-through", color: "#999" }}>{formatCurrency(servicePrice)}</span>
                      ) : servicePrice === 0 ? (
                        <span style={{ color: "#16a34a", fontWeight: "bold" }}>Tặng</span>
                      ) : formatCurrency(servicePrice)}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "1.5mm", textAlign: "right", fontWeight: "bold" }}>
                      {serviceIsFree ? (
                        <div>
                          <span style={{ textDecoration: "line-through", color: "#999", fontWeight: "normal", fontSize: "7.5pt" }}>{formatCurrency(serviceTotal)}</span>
                          <br />
                          <span style={{ color: "#16a34a", fontWeight: "bold" }}>Tặng</span>
                        </div>
                      ) : servicePrice === 0 ? (
                        <span style={{ color: "#16a34a", fontWeight: "bold" }}>Tặng</span>
                      ) : formatCurrency(serviceTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pricing Summary */}
        <table style={{ width: "100%", fontSize: "9pt", marginBottom: "4mm" }}>
          <tbody>
            <tr>
              <td>Phí dịch vụ sửa chữa:</td>
              <td style={{ textAlign: "right" }}>{formatCurrency(printOrder.laborCost || 0)}</td>
            </tr>
            {printOrder.discount != null && printOrder.discount > 0 && (
              <tr style={{ color: "#e74c3c" }}>
                <td>Giảm giá:</td>
                <td style={{ textAlign: "right" }}>-{formatCurrency(printOrder.discount)}</td>
              </tr>
            )}
            <tr style={{ fontWeight: "bold", fontSize: "11pt", borderTop: "1.5px solid #000" }}>
              <td style={{ paddingTop: "2mm" }}>TỔNG CỘNG:</td>
              <td style={{ textAlign: "right", paddingTop: "2mm", color: "#2563eb" }}>{formatCurrency(printOrder.total)}</td>
            </tr>
            {printOrder.totalPaid != null && printOrder.totalPaid > 0 && (
              <tr style={{ color: "#16a34a", fontWeight: "bold" }}>
                <td>Đã thanh toán:</td>
                <td style={{ textAlign: "right" }}>{formatCurrency(printOrder.totalPaid)}</td>
              </tr>
            )}
            {printOrder.remainingAmount != null && printOrder.remainingAmount > 0 && (
              <tr style={{ color: "#dc2626", fontWeight: "bold" }}>
                <td>Còn lại:</td>
                <td style={{ textAlign: "right" }}>{formatCurrency(printOrder.remainingAmount)}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* QR details */}
        {printQRUrl && (
          <div
            style={{
              marginTop: "4mm",
              padding: "3.5mm",
              border: "2px solid #2563eb",
              borderRadius: "4mm",
              backgroundColor: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "3mm",
            }}
          >
            <div style={{ fontSize: "8.5pt", flex: 1 }}>
              <div style={{ fontWeight: "bold", color: "#2563eb", fontSize: "9.5pt", marginBottom: "1mm" }}>📱 QUÉT MÃ THANH TOÁN</div>
              <div>Ngân hàng: <strong>{storeSettings?.bank_name}</strong></div>
              <div>STK: <strong>{storeSettings?.bank_account_number}</strong></div>
            </div>
            <div style={{ flexShrink: 0, padding: "0.5mm", backgroundColor: "#fff", borderRadius: "1mm", border: "1px solid #bfdbfe" }}>
              <img src={printQRUrl} alt="QR" style={{ width: "22mm", height: "22mm", display: "block" }} />
            </div>
          </div>
        )}

        <div style={{ marginTop: "4mm", display: "flex", justifyContent: "space-between", fontSize: "9pt", borderTop: "1px dashed #999", paddingTop: "4mm" }}>
          <div style={{ textAlign: "center", width: "45%" }}>
            <div style={{ fontWeight: "bold" }}>Khách hàng</div>
            <div style={{ fontSize: "8pt", color: "#666", marginTop: "10mm" }}>(Ký và ghi rõ họ tên)</div>
          </div>
          <div style={{ textAlign: "center", width: "45%" }}>
            <div style={{ fontWeight: "bold" }}>Nhân viên</div>
            <div style={{ fontSize: "8pt", color: "#666", marginTop: "10mm" }}>{printOrder.technicianName || "(Ký tên)"}</div>
          </div>
        </div>

        <div style={{ marginTop: "4mm", borderTop: "1.5px dashed #bbb", paddingTop: "2mm", textAlign: "center", fontSize: "9pt", fontWeight: "bold" }}>
          {storeSettings?.print_greeting || "Cảm ơn quý khách! Hẹn gặp lại"}
        </div>
      </div>
    </>
  );
};
