import React, { useState } from "react";
import { Printer } from "lucide-react";
import { StoreSettings } from "../SettingsManager";

interface PrintSettingsProps {
  settings: StoreSettings;
  updateField: (field: keyof StoreSettings, value: any) => void;
  isOwner: boolean;
}

export const PrintSettings: React.FC<PrintSettingsProps> = ({
  settings,
  updateField,
  isOwner,
}) => {
  const [previewDocType, setPreviewDocType] = useState<"sales" | "service">("sales");

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Controls Column */}
        <div className="flex-1 space-y-6 max-w-xl">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" />
              <span>Cấu hình Mẫu in</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              Cấu hình trực quan kích thước giấy, logo và chân trang cho hóa đơn bán hàng và phiếu sửa chữa.
            </p>
          </div>

          {/* Paper Size selector */}
          <div className="space-y-3">
            <label className="block text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">
              Khổ giấy mặc định
            </label>
            <div className="grid grid-cols-2 gap-4">
              {/* K80 Selector Card */}
              <button
                type="button"
                disabled={!isOwner}
                onClick={() => updateField("print_paper_size", "K80")}
                className={`relative flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                  (settings.print_paper_size || "K80") === "K80"
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 ring-2 ring-blue-500/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800"
                } ${!isOwner ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="w-12 h-14 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded flex flex-col justify-between p-1.5 shadow-sm mb-3">
                  <div className="h-1 bg-slate-300 dark:bg-slate-500 rounded w-full" />
                  <div className="space-y-0.5 w-full">
                    <div className="h-0.5 bg-slate-300 dark:bg-slate-500 rounded w-3/4 mx-auto" />
                    <div className="h-0.5 bg-slate-300 dark:bg-slate-500 rounded w-1/2 mx-auto" />
                  </div>
                  <div className="h-1 bg-blue-500 rounded w-2/3 mx-auto" />
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Khổ giấy K80</span>
                <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-1">In nhiệt (80mm) siêu nhanh</span>
                {(settings.print_paper_size || "K80") === "K80" && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</div>
                )}
              </button>

              {/* A5 Selector Card */}
              <button
                type="button"
                disabled={!isOwner}
                onClick={() => updateField("print_paper_size", "A5")}
                className={`relative flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                  (settings.print_paper_size || "K80") === "A5"
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 ring-2 ring-blue-500/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800"
                } ${!isOwner ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="w-16 h-12 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded flex flex-col justify-between p-2 shadow-sm mb-3">
                  <div className="flex gap-2">
                    <div className="h-2 w-2 bg-slate-300 dark:bg-slate-500 rounded-full" />
                    <div className="h-1 bg-slate-300 dark:bg-slate-500 rounded flex-1 mt-0.5" />
                  </div>
                  <div className="space-y-0.5 w-full">
                    <div className="h-0.5 bg-slate-300 dark:bg-slate-500 rounded w-full" />
                    <div className="h-0.5 bg-slate-300 dark:bg-slate-500 rounded w-5/6" />
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Khổ giấy A5</span>
                <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-1">Nửa trang A4 (148mm) lịch sự</span>
                {(settings.print_paper_size || "K80") === "A5" && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</div>
                )}
              </button>
            </div>
          </div>

          {/* Show/Hide Logo */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700/50">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Hiển thị Logo cửa hàng</span>
                <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400">Ẩn hoặc hiện logo thương hiệu trên phiếu in</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.print_show_logo !== false}
                  onChange={(e) => updateField("print_show_logo", e.target.checked)}
                  disabled={!isOwner}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Greeting bottom message */}
          <div className="space-y-2">
            <label className="block text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">
              Lời chào / Lời cảm ơn (Chân trang)
            </label>
            <textarea
              rows={3}
              value={settings.print_greeting || "Cảm ơn quý khách! Hẹn gặp lại"}
              onChange={(e) => updateField("print_greeting", e.target.value)}
              disabled={!isOwner}
              placeholder="VD: Cảm ơn quý khách! Hẹn gặp lại..."
              className="w-full px-3 py-2 md:px-4 md:py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 self-center">Chọn nhanh:</span>
              {[
                "Cảm ơn quý khách! Hẹn gặp lại",
                "Chúc quý khách thượng lộ bình an!",
                "Cảm ơn quý khách! Bảo hành 6 tháng.",
              ].map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  disabled={!isOwner}
                  onClick={() => updateField("print_greeting", tpl)}
                  className="text-xs bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md transition-colors"
                >
                  {tpl.length > 25 ? tpl.slice(0, 25) + "..." : tpl}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Info edit */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Thông tin hiển thị tiêu đề in (Chỉnh sửa nhanh)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Tên cửa hàng</label>
                <input
                  type="text"
                  value={settings.store_name || ""}
                  onChange={(e) => updateField("store_name", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Số điện thoại</label>
                <input
                  type="text"
                  value={settings.phone || ""}
                  onChange={(e) => updateField("phone", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Địa chỉ</label>
                <input
                  type="text"
                  value={settings.address || ""}
                  onChange={(e) => updateField("address", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Visual Preview Column */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl p-4 md:p-6 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-start min-h-[500px]">
          <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-200 dark:border-slate-800 pb-3 flex-shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                Xem trước trực quan (Live Preview)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Document Selector Segmented Control */}
              <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPreviewDocType("sales")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    previewDocType === "sales"
                      ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  Hóa đơn lẻ
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDocType("service")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    previewDocType === "service"
                      ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  Phiếu sửa chữa
                </button>
              </div>
              <span className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2.5 py-1 rounded-full font-bold">
                Khổ {settings.print_paper_size || "K80"}
              </span>
            </div>
          </div>

          {/* Visual simulator container */}
          <div className="flex-grow w-full overflow-x-auto flex justify-center items-start pt-2">
            <div
              className="bg-white text-black shadow-lg rounded border border-slate-300 transition-all duration-300 font-sans"
              style={{
                width: (settings.print_paper_size || "K80") === "K80" ? "320px" : "500px",
                minHeight: "450px",
                padding: (settings.print_paper_size || "K80") === "K80" ? "12px" : "24px",
                fontSize: (settings.print_paper_size || "K80") === "K80" ? "8pt" : "10pt",
                lineHeight: "1.3",
              }}
            >
              {previewDocType === "sales" ? (
                /* RETAIL SALES RECEIPT PREVIEW */
                <>
                  {/* Invoice Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      borderBottom: "1.5px solid #2563eb",
                      paddingBottom: "8px",
                      marginBottom: "10px",
                    }}
                  >
                    {/* Logo (if active) */}
                    {settings.print_show_logo !== false && (
                      <div style={{ flexShrink: 0 }}>
                        <img
                          src={settings.logo_url || "/logo-smartcare.png"}
                          alt="Preview Logo"
                          style={{
                            width: (settings.print_paper_size || "K80") === "K80" ? "36px" : "48px",
                            height: (settings.print_paper_size || "K80") === "K80" ? "36px" : "48px",
                            objectFit: "contain",
                            border: "1px solid #eee",
                            borderRadius: "4px",
                          }}
                        />
                      </div>
                    )}

                    {/* Header details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: "bold", fontSize: (settings.print_paper_size || "K80") === "K80" ? "9.5pt" : "12pt", color: "#1e40af", textTransform: "uppercase" }}>
                        {settings.store_name || "Nhạn Lâm SmartCare"}
                      </div>
                      <div style={{ fontSize: "7.5pt", color: "#444", marginTop: "1px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        Địa chỉ: {settings.address || "Ấp Phú Lợi B, Xã Long Phú Thuận, Đông Tháp"}
                      </div>
                      <div style={{ fontSize: "7.5pt", color: "#444" }}>
                        SĐT: {settings.phone || "0907.239.337"}
                      </div>
                    </div>
                  </div>

                  {/* Invoice Title */}
                  <div style={{ textAlign: "center", marginBottom: "8px" }}>
                    <div style={{ fontWeight: "bold", fontSize: (settings.print_paper_size || "K80") === "K80" ? "11pt" : "14pt", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Hóa đơn bán lẻ
                    </div>
                    <div style={{ fontSize: "7.5pt", color: "#666", marginTop: "2px" }}>
                      Mã: <strong>#HD18549</strong> - 29/05/2026
                    </div>
                  </div>

                  {/* Customer Section */}
                  <div style={{ borderBottom: "1px dashed #bbb", paddingBottom: "6px", marginBottom: "8px", fontSize: "8pt" }}>
                    <div><strong>Khách hàng:</strong> Nguyễn Văn A</div>
                    <div><strong>SĐT:</strong> 0909xxxxxx</div>
                    <div><strong>NV bán hàng:</strong> Admin</div>
                  </div>

                  {/* Table of items */}
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1.2px solid #000", fontWeight: "bold" }}>
                        <th style={{ textAlign: "left", paddingBottom: "4px" }}>Tên SP</th>
                        <th style={{ textAlign: "center", width: "30px", paddingBottom: "4px" }}>SL</th>
                        <th style={{ textAlign: "right", width: "80px", paddingBottom: "4px" }}>T.Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: "1px dashed #eee" }}>
                        <td style={{ paddingTop: "5px", paddingBottom: "5px" }}>
                          <div style={{ fontWeight: "bold" }}>Dầu nhớt Castrol Power1</div>
                          {(settings.print_paper_size || "K80") === "A5" && <div style={{ fontSize: "7.5pt", color: "#666" }}>Lon 1L - Bảo dưỡng máy</div>}
                        </td>
                        <td style={{ textAlign: "center", verticalAlign: "top", paddingTop: "5px" }}>1</td>
                        <td style={{ textAlign: "right", fontWeight: "bold", verticalAlign: "top", paddingTop: "5px" }}>150,000</td>
                      </tr>
                      <tr style={{ borderBottom: "1px dashed #eee" }}>
                        <td style={{ paddingTop: "5px", paddingBottom: "5px" }}>
                          <div style={{ fontWeight: "bold" }}>Bugi NGK chính hãng</div>
                          {(settings.print_paper_size || "K80") === "A5" && <div style={{ fontSize: "7.5pt", color: "#666" }}>Chân đồng nhập khẩu</div>}
                        </td>
                        <td style={{ textAlign: "center", verticalAlign: "top", paddingTop: "5px" }}>1</td>
                        <td style={{ textAlign: "right", fontWeight: "bold", verticalAlign: "top", paddingTop: "5px" }}>80,000</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Totals section */}
                  <div style={{ borderTop: "1.5px solid #333", paddingTop: "6px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", marginBottom: "3px" }}>
                      <span>Tổng tiền hàng:</span>
                      <span>230,000 đ</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: (settings.print_paper_size || "K80") === "K80" ? "9.5pt" : "11pt" }}>
                      <span>TỔNG CỘNG:</span>
                      <span style={{ color: "#2563eb" }}>230,000 đ</span>
                    </div>
                    <div style={{ fontSize: "7.5pt", fontStyle: "italic", textAlign: "right", marginTop: "3px", color: "#555" }}>
                      (Hình thức: Tiền mặt)
                    </div>
                  </div>

                  {/* Bank Transfer QR section if configured */}
                  {settings.bank_name && (
                    <div style={{ border: "1px solid #ddd", padding: "6px", borderRadius: "6px", backgroundColor: "#f0f9ff", display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px" }}>
                      <div style={{ width: "42px", height: "42px", backgroundColor: "#fff", border: "1px solid #ddd", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: "14px" }}>📱</span>
                      </div>
                      <div style={{ flex: 1, fontSize: "7pt" }}>
                        <div style={{ fontWeight: "bold", color: "#1e40af" }}>Chuyển khoản QR ngân hàng:</div>
                        <div>{settings.bank_name} - <strong>{settings.bank_account_number}</strong></div>
                        <div style={{ textTransform: "uppercase", fontSize: "6.5pt", color: "#555" }}>{settings.bank_account_holder}</div>
                      </div>
                    </div>
                  )}

                  {/* Custom Greeting Bottom Message */}
                  <div style={{ borderTop: "1px dashed #bbb", paddingTop: "8px", marginTop: "12px", textAlign: "center", fontSize: "7.5pt", color: "#666", fontStyle: "italic" }}>
                    <div>{settings.print_greeting || "Cảm ơn quý khách! Hẹn gặp lại"}</div>
                    <div style={{ fontSize: "6.5pt", color: "#999", marginTop: "2px" }}>Motocare SmartCare Systems</div>
                  </div>
                </>
              ) : (
                /* SERVICE WORK ORDER PREVIEW */
                <>
                  {/* Service Header */}
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginBottom: "10px",
                      borderBottom: "2px solid #3b82f6",
                      paddingBottom: "8px",
                      alignItems: "center",
                    }}
                  >
                    {/* Left: Logo */}
                    {settings.print_show_logo !== false && (
                      <img
                        src={settings.logo_url || "/logo-smartcare.png"}
                        alt="Logo"
                        style={{
                          height: (settings.print_paper_size || "K80") === "K80" ? "36px" : "48px",
                          width: (settings.print_paper_size || "K80") === "K80" ? "36px" : "48px",
                          objectFit: "contain",
                          flexShrink: 0,
                        }}
                      />
                    )}

                    {/* Center: Store Info */}
                    <div style={{ fontSize: "7.5pt", lineHeight: "1.3", flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: "bold", fontSize: (settings.print_paper_size || "K80") === "K80" ? "9.5pt" : "11pt", color: "#1e40af", marginBottom: "2px", textTransform: "uppercase" }}>
                        {settings.store_name || "Nhạn Lâm SmartCare"}
                      </div>
                      <div style={{ color: "#444", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        📍 {settings.address || "Ấp Phú Lợi B, Xã Long Phú Thuận, Đông Tháp"}
                      </div>
                      <div style={{ color: "#444" }}>
                        📞 {settings.phone || "0907.239.337"}
                      </div>
                    </div>
                  </div>

                  {/* Title & Meta */}
                  <div style={{ marginBottom: "8px", textAlign: "center" }}>
                    <h1 style={{ fontSize: (settings.print_paper_size || "K80") === "K80" ? "11pt" : "13pt", fontWeight: "bold", margin: "0", textTransform: "uppercase", color: "#1e40af" }}>
                      PHIẾU DỊV VỤ SỬA CHỮA
                    </h1>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "7pt", color: "#666", marginTop: "2px" }}>
                      <div>13:50 28/05/2026</div>
                      <div>Mã: <strong>#SC-20260528-024032</strong></div>
                    </div>
                  </div>

                  {/* Customer Info Card */}
                  <div
                    style={{
                      border: "1px solid #ddd",
                      padding: "8px",
                      marginBottom: "8px",
                      borderRadius: "6px",
                      backgroundColor: "#f8fafc",
                      fontSize: "7.5pt",
                      lineHeight: "1.4",
                    }}
                  >
                    <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: "bold" }}>Khách hàng:</span> Nguyễn Thị Lùn
                      </div>
                      <div>
                        <span style={{ fontWeight: "bold" }}>SĐT:</span> 0388696965
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: "bold" }}>Loại xe:</span> Honda Wave Alpha
                      </div>
                      <div>
                        <span style={{ fontWeight: "bold" }}>Biển số:</span> 67K1-82082
                      </div>
                    </div>
                  </div>

                  {/* Issue Description */}
                  <div
                    style={{
                      border: "1px solid #ddd",
                      padding: "6px",
                      marginBottom: "8px",
                      borderRadius: "6px",
                      fontSize: "7.5pt",
                      color: "#000",
                    }}
                  >
                    <div style={{ display: "flex", gap: "6px" }}>
                      <div style={{ fontWeight: "bold", minWidth: "60px", flexShrink: 0 }}>Mô tả sự cố:</div>
                      <div style={{ flex: 1 }}>Xe mất lửa bugi, thay cục sạc và bảo dưỡng định kỳ.</div>
                    </div>
                  </div>

                  {/* Parts and Services Table */}
                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ fontWeight: "bold", marginBottom: "4px", fontSize: "8pt" }}>Phụ tùng và dịch vụ:</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f5f5f5", fontSize: "7.5pt", fontWeight: "bold" }}>
                          <th style={{ border: "1px solid #ddd", padding: "4px", textAlign: "center", width: "10%" }}>STT</th>
                          <th style={{ border: "1px solid #ddd", padding: "4px", textAlign: "left" }}>Tên</th>
                          <th style={{ border: "1px solid #ddd", padding: "4px", textAlign: "center", width: "15%" }}>SL</th>
                          <th style={{ border: "1px solid #ddd", padding: "4px", textAlign: "right", width: "25%" }}>Đơn giá</th>
                          <th style={{ border: "1px solid #ddd", padding: "4px", textAlign: "right", width: "25%" }}>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ fontSize: "7.5pt" }}>
                          <td style={{ border: "1px solid #ddd", padding: "4px", textAlign: "center" }}>1</td>
                          <td style={{ border: "1px solid #ddd", padding: "4px" }}>Cục sạc 110</td>
                          <td style={{ border: "1px solid #ddd", padding: "4px", textAlign: "center" }}>1</td>
                          <td style={{ border: "1px solid #ddd", padding: "4px", textAlign: "right" }}>200,000</td>
                          <td style={{ border: "1px solid #ddd", padding: "4px", textAlign: "right", fontWeight: "bold" }}>200,000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Summary box */}
                  <div
                    style={{
                      border: "1px solid #ddd",
                      padding: "8px",
                      marginBottom: "8px",
                      borderRadius: "6px",
                      backgroundColor: "#f9f9f9",
                      fontSize: "7.5pt",
                    }}
                  >
                    <table style={{ width: "100%", borderSpacing: "0" }}>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: "bold", paddingBottom: "2px" }}>Tổng dịch vụ thêm:</td>
                          <td style={{ textAlign: "right", paddingBottom: "2px" }}>200,000 đ</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: "bold", paddingBottom: "2px" }}>Phí dịch vụ:</td>
                          <td style={{ textAlign: "right", paddingBottom: "2px" }}>0 đ</td>
                        </tr>
                        <tr style={{ borderTop: "1px solid #ddd" }}>
                          <td style={{ fontWeight: "bold", paddingTop: "2px", fontSize: "8pt" }}>TỔNG CỘNG:</td>
                          <td style={{ textAlign: "right", paddingTop: "2px", fontWeight: "bold", color: "#2563eb", fontSize: "8.5pt" }}>200,000 đ</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: "bold", color: "#16a34a" }}>Đã thanh toán:</td>
                          <td style={{ textAlign: "right", fontWeight: "bold", color: "#16a34a" }}>200,000 đ</td>
                        </tr>
                        <tr>
                          <td style={{ color: "#666" }}>Hình thức:</td>
                          <td style={{ textAlign: "right", color: "#666" }}>Tiền mặt</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* QR Code Payment Box */}
                  {settings.bank_name && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "6px 8px",
                        border: "2px solid #2563eb",
                        borderRadius: "8px",
                        backgroundColor: "#eff6ff",
                        color: "#000",
                        marginBottom: "8px",
                      }}
                    >
                      <p style={{ margin: "0 0 4px 0", fontSize: "8.5pt", fontWeight: "bold", color: "#2563eb", textAlign: "center" }}>
                        📱 QUÉT MÃ ĐỂ THANH TOÁN
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "6px",
                        }}
                      >
                        {/* Left details */}
                        <div style={{ flex: 1, textAlign: "left", fontSize: "7.5pt", color: "#000", lineHeight: "1.3" }}>
                          <div style={{ fontSize: "8pt", color: "#333", marginBottom: "1px" }}>
                            Số tiền: <strong style={{ color: "#2563eb" }}>200,000 đ</strong>
                          </div>
                          <div>
                            Ngân hàng: <strong>{settings.bank_name}</strong>
                          </div>
                          <div>
                            STK: <strong style={{ color: "#2563eb" }}>{settings.bank_account_number}</strong>
                          </div>
                          {settings.bank_account_holder && (
                            <div style={{ fontSize: "7pt", color: "#555", textTransform: "uppercase" }}>
                              Chủ TK: {settings.bank_account_holder}
                            </div>
                          )}
                        </div>

                        {/* Right QR */}
                        <div style={{ padding: "2px", backgroundColor: "#fff", borderRadius: "4px", border: "1px solid #bfdbfe", flexShrink: 0 }}>
                          <div style={{ width: "60px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
                            <span style={{ fontSize: "28px" }}>🔳</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Signatures Section */}
                  <div style={{ paddingTop: "8px", marginTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "7.5pt", fontWeight: "bold" }}>
                    <div style={{ textAlign: "center", width: "45%" }}>
                      <div>Khách hàng</div>
                      <div style={{ fontStyle: "italic", fontWeight: "normal", fontSize: "6.5pt", color: "#666", marginTop: "2px" }}>(Ký, ghi rõ họ tên)</div>
                    </div>
                    <div style={{ textAlign: "center", width: "45%" }}>
                      <div>Nhân viên</div>
                      <div style={{ fontStyle: "italic", fontWeight: "normal", fontSize: "6.5pt", color: "#666", marginTop: "2px" }}>Trương Văn Cuồng</div>
                    </div>
                  </div>

                  {/* Tra cứu tiến độ Online Yellow card */}
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "6px",
                      border: "1px solid #fef08a",
                      borderRadius: "6px",
                      backgroundColor: "#fef9c3",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "6px",
                      fontSize: "7pt",
                    }}
                  >
                    <div style={{ flex: 1, color: "#854d0e" }}>
                      <div style={{ fontWeight: "bold" }}>📱 TRA CỨU TIẾN ĐỘ SỬA CHỮA ONLINE</div>
                      <div style={{ color: "#713f12", fontSize: "6.5pt" }}>Quét mã QR bên cạnh để theo dõi trạng thái xe thời gian thực.</div>
                    </div>
                    <div style={{ flexShrink: 0, padding: "2px", backgroundColor: "#fff", borderRadius: "4px", border: "1px solid #fef08a" }}>
                      <span style={{ fontSize: "16px" }}>🔳</span>
                    </div>
                  </div>

                  {/* Warranty Policies */}
                  <div
                    style={{
                      marginTop: "8px",
                      paddingTop: "6px",
                      borderTop: "1px solid #e5e7eb",
                      fontSize: "6.5pt",
                      color: "#666",
                      lineHeight: "1.3",
                    }}
                  >
                    <p style={{ margin: "0 0 2px 0", fontWeight: "bold" }}>Chính sách bảo hành:</p>
                    <ul style={{ margin: "0", paddingLeft: "8px", listStyleType: "disc" }}>
                      <li>Bảo hành áp dụng cho phụ tùng chính hãng và lỗi kỹ thuật do thợ</li>
                      <li>Không bảo hành đối với va chạm, ngã xe, ngập nước sau khi nhận xe</li>
                      <li>Mang theo phiếu này khi đến bảo hành.</li>
                    </ul>
                  </div>

                  {/* Greeting Footer message */}
                  <div
                    style={{
                      borderTop: "1px dashed #bbb",
                      paddingTop: "6px",
                      marginTop: "8px",
                      textAlign: "center",
                      fontSize: "7.5pt",
                      color: "#000",
                      fontWeight: "bold",
                    }}
                  >
                    {settings.print_greeting || "Cảm ơn quý khách! Hẹn gặp lại"}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
