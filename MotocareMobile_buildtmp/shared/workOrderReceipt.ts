import { Share } from 'react-native';
import * as Print from 'expo-print';
import { formatWorkOrderCode } from './workOrderCode';

type ReceiptPart = {
  partName?: string;
  description?: string;
  quantity?: number;
  price?: number;
};

type ReceiptOrder = {
  id: string;
  creationDate?: string;
  customerName?: string;
  customerPhone?: string;
  vehicleModel?: string;
  licensePlate?: string;
  issueDescription?: string;
  technicianName?: string;
  laborCost?: number;
  discount?: number;
  total?: number;
  totalPaid?: number;
  depositAmount?: number;
  remainingAmount?: number;
  paymentMethod?: string;
  status?: string;
  partsUsed?: ReceiptPart[];
  additionalServices?: ReceiptPart[];
  storeName?: string;
  storePhone?: string;
  storeAddress?: string;
  bankQrUrl?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
};

const currency = (value?: number) => {
  const amount = Number(value || 0);
  return `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`;
};

const dateTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('vi-VN');
};

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const lineRows = (items: ReceiptPart[] = []) => {
  if (!items.length) {
    return '<tr><td colspan="5" style="border:1px solid #ddd;padding:2mm;text-align:center;color:#666;font-size:10pt">Không có dữ liệu</td></tr>';
  }

  return items
    .map((item, index) => {
      const name = escapeHtml(String(item.partName || item.description || 'Mục dịch vụ'));
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const amount = qty * price;
      return `<tr>
        <td style="border:1px solid #ddd;padding:2mm;text-align:center;font-size:10pt">${index + 1}</td>
        <td style="border:1px solid #ddd;padding:2mm;font-size:10pt">${name}</td>
        <td style="border:1px solid #ddd;padding:2mm;text-align:center;font-size:10pt">${qty}</td>
        <td style="border:1px solid #ddd;padding:2mm;text-align:right;font-size:10pt">${currency(price)}</td>
        <td style="border:1px solid #ddd;padding:2mm;text-align:right;font-size:10pt;font-weight:bold">${currency(amount)}</td>
      </tr>`;
    })
    .join('');
};

export const buildWorkOrderShareText = (order: ReceiptOrder) => {
  const code = formatWorkOrderCode(order.id);
  const partsTotal = (order.partsUsed || []).reduce(
    (sum, p) => sum + Number(p.price || 0) * Number(p.quantity || 0),
    0
  );
  const servicesTotal = (order.additionalServices || []).reduce(
    (sum, s) => sum + Number(s.price || 0) * Number(s.quantity || 0),
    0
  );

  return [
    `PHIEU SUA CHUA ${code}`,
    `Ngay tao: ${dateTime(order.creationDate)}`,
    `Khach hang: ${order.customerName || '-'}`,
    `SDT: ${order.customerPhone || '-'}`,
    `Xe: ${order.vehicleModel || '-'} - Bien so: ${order.licensePlate || '-'}`,
    `Tinh trang: ${order.issueDescription || '-'}`,
    `Ky thuat vien: ${order.technicianName || '-'}`,
    '',
    `Phu tung: ${currency(partsTotal)}`,
    `Dich vu: ${currency(servicesTotal)}`,
    `Tien cong: ${currency(order.laborCost)}`,
    `Giam gia: ${currency(order.discount)}`,
    `Tong cong: ${currency(order.total)}`,
    `Da thu: ${currency(order.totalPaid)}`,
    `Con lai: ${currency(order.remainingAmount)}`,
    `Phuong thuc: ${order.paymentMethod === 'bank' ? 'Chuyen khoan' : 'Tien mat'}`,
    `Trang thai: ${order.status || '-'}`,
  ].join('\n');
};

export const buildWorkOrderPrintHtml = (order: ReceiptOrder) => {
  const code = formatWorkOrderCode(order.id);
  const parts = order.partsUsed || [];
  const services = order.additionalServices || [];
  const mergedItems: ReceiptPart[] = [...parts, ...services];
  const paymentMethodLabel = order.paymentMethod === 'bank' ? 'Chuyển khoản' : 'Tiền mặt';
  const storeName = order.storeName || 'Nhạn Lâm SmartCare';
  const storePhone = order.storePhone || '0907.239.337';
  const storeAddress = order.storeAddress || 'Ấp Phú Lợi B, Xã Long Phú Thuận, Đông Tháp';
  const remainingAmount = Number(order.remainingAmount || 0);
  const showQr = !!order.bankQrUrl;
  const technician = escapeHtml(String(order.technicianName || '---'));
  const createdAt = order.creationDate
    ? new Date(order.creationDate).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Phiếu sửa chữa ${code}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 4mm;
          color: #000;
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .page {
          width: 210mm;
          margin: 0 auto;
          min-height: 297mm;
          border: 1px solid #ddd;
          padding: 5mm;
        }
        .store {
          border: 1px solid #ddd;
          border-radius: 2mm;
          padding: 3mm;
          margin-bottom: 4mm;
          background-color: #f8fafc;
          font-size: 9pt;
        }
        .store-name { margin: 0; font-size: 11pt; font-weight: bold; }
        .store-meta { margin-top: 1.5mm; color: #000; line-height: 1.45; }
        .title-box { margin-bottom: 4mm; }
        .title {
          margin: 0;
          text-align: center;
          font-size: 16pt;
          font-weight: bold;
          text-transform: uppercase;
          color: #1e40af;
        }
        .meta {
          display: flex;
          justify-content: space-between;
          font-size: 9pt;
          color: #666;
          margin-top: 2mm;
        }
        .customer {
          border: 1px solid #ddd;
          border-radius: 2mm;
          padding: 3mm;
          margin-bottom: 3mm;
          background-color: #f8fafc;
          font-size: 9pt;
        }
        .row { display: flex; gap: 4mm; margin-bottom: 1.5mm; }
        .row:last-child { margin-bottom: 0; }
        .flex-1 { flex: 1; }
        .issue {
          border: 1px solid #ddd;
          border-radius: 2mm;
          padding: 4mm;
          margin-bottom: 4mm;
          font-size: 10pt;
        }
        .issue-line { display: flex; gap: 3mm; }
        .issue-label { font-weight: bold; min-width: 20%; flex-shrink: 0; }
        .section-title {
          font-weight: bold;
          margin: 0 0 2mm 0;
          font-size: 11pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #ddd;
        }
        th {
          border: 1px solid #ddd;
          padding: 2mm;
          text-align: left;
          font-size: 10pt;
          background-color: #f5f5f5;
        }
        .align-center { text-align: center; }
        .align-right { text-align: right; }
        .summary {
          border: 1px solid #ddd;
          border-radius: 2mm;
          background-color: #f9f9f9;
          padding: 4mm;
          margin: 4mm 0;
        }
        .summary-table {
          width: 100%;
          border-spacing: 0;
          border: none;
        }
        .summary-table td {
          border: none;
          font-size: 10pt;
          padding-bottom: 2mm;
        }
        .summary-total td {
          border-top: 2px solid #333;
          padding-top: 2mm;
          font-size: 12pt;
          font-weight: bold;
        }
        .summary-grand { color: #2563eb; }
        .summary-paid { color: #16a34a; }
        .summary-remaining { color: #dc2626; }
        .bank {
          margin-top: 4mm;
          border: 2px solid #2563eb;
          border-radius: 4mm;
          background-color: #eff6ff;
          padding: 4mm;
          text-align: center;
        }
        .bank-title {
          margin: 0 0 3mm 0;
          color: #2563eb;
          font-size: 11pt;
          font-weight: bold;
        }
        .bank-qr {
          width: 40mm;
          height: 40mm;
          object-fit: contain;
          display: block;
          margin: 0 auto;
          background: #fff;
        }
        .bank-note {
          margin: 3mm 0 0 0;
          font-size: 9pt;
          color: #666;
        }
        .thank-box {
          margin-top: 4mm;
          border: 1px solid #ffd700;
          border-radius: 2mm;
          background-color: #fff9e6;
          padding: 3mm;
          text-align: center;
          font-size: 9pt;
          font-style: italic;
        }
        .signatures {
          margin-top: 8mm;
          padding-top: 4mm;
          border-top: 1px dashed #999;
          display: flex;
          justify-content: space-between;
          font-size: 10pt;
        }
        .sig-box {
          width: 45%;
          text-align: center;
        }
        .sig-line {
          margin: 0 0 10mm 0;
          font-weight: bold;
        }
        .sig-note {
          margin: 0;
          font-size: 9pt;
          color: #666;
        }
        @media print {
          body { padding: 0; }
          .page {
            border: none;
            width: auto;
            min-height: auto;
            padding: 3mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="store">
          <p class="store-name">${storeName}</p>
          <div class="store-meta">
            <div>${storeAddress}</div>
            <div>Hotline: ${storePhone}</div>
          </div>
        </div>

        <div class="title-box">
          <h1 class="title">PHIẾU DỊCH VỤ SỬA CHỮA</h1>
          <div class="meta">
            <div>${createdAt}</div>
            <div style="font-weight:bold">Mã: ${code}</div>
          </div>
        </div>

        <div class="customer">
          <div class="row">
            <div class="flex-1"><strong>Khách hàng:</strong> ${escapeHtml(String(order.customerName || '-'))}</div>
            <div><strong>SĐT:</strong> ${escapeHtml(String(order.customerPhone || '-'))}</div>
          </div>
          <div class="row">
            <div class="flex-1"><strong>Loại xe:</strong> ${escapeHtml(String(order.vehicleModel || '-'))}</div>
            <div><strong>Biển số:</strong> ${escapeHtml(String(order.licensePlate || '-'))}</div>
          </div>
        </div>

        <div class="issue">
          <div class="issue-line">
            <div class="issue-label">Mô tả sự cố:</div>
            <div style="white-space:pre-wrap">${escapeHtml(String(order.issueDescription || 'Không có mô tả'))}</div>
          </div>
        </div>

        <div style="margin-bottom:4mm;">
          <p class="section-title">Phụ tùng và dịch vụ:</p>
          <table>
            <thead>
              <tr>
                <th style="width:8%;text-align:center">STT</th>
                <th>Tên</th>
                <th style="width:15%;text-align:center">SL</th>
                <th style="width:25%;text-align:right">Đơn giá</th>
                <th style="width:25%;text-align:right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>${lineRows(mergedItems)}</tbody>
          </table>
        </div>

        <div class="summary">
          <table class="summary-table">
            <tbody>
              ${Number(order.laborCost || 0) > 0 ? `
              <tr>
                <td style="font-weight:bold;">Phí dịch vụ:</td>
                <td class="align-right">${currency(order.laborCost)}</td>
              </tr>
              ` : ''}
              ${Number(order.discount || 0) > 0 ? `
              <tr>
                <td style="font-weight:bold;color:#e74c3c;">Giảm giá:</td>
                <td class="align-right" style="color:#e74c3c;">-${currency(order.discount)}</td>
              </tr>
              ` : ''}
              <tr class="summary-total">
                <td>TỔNG CỘNG:</td>
                <td class="align-right summary-grand">${currency(order.total)}</td>
              </tr>
              ${Number(order.totalPaid || 0) > 0 ? `
              <tr>
                <td style="font-weight:bold;color:#16a34a;">Đã thanh toán:</td>
                <td class="align-right summary-paid">${currency(order.totalPaid)}</td>
              </tr>
              ` : ''}
              ${Number(order.remainingAmount || 0) > 0 ? `
              <tr>
                <td style="font-weight:bold;font-size:11pt;color:#dc2626;">Còn lại:</td>
                <td class="align-right summary-remaining" style="font-size:11pt;font-weight:bold;">${currency(order.remainingAmount)}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="font-size:9pt;color:#666;">Hình thức thanh toán:</td>
                <td class="align-right" style="font-size:9pt;color:#666;">${paymentMethodLabel}</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${showQr ? `
        <div class="bank">
          <p class="bank-title">QUÉT MÃ ĐỂ THANH TOÁN</p>
          <img class="bank-qr" src="${escapeHtml(String(order.bankQrUrl || ''))}" alt="QR Payment" />
          <p class="bank-note">Số tiền: <strong>${currency(remainingAmount > 0 ? remainingAmount : Number(order.total || 0))}</strong></p>
          <p class="bank-note" style="font-size:8pt; margin-top:1mm;">${escapeHtml(String(order.bankName || '-'))} - ${escapeHtml(String(order.bankAccountNumber || '-'))}</p>
            ${order.bankAccountHolder ? `<p class="bank-note" style="font-size:8pt; margin-top:1mm;">Chủ TK: ${escapeHtml(String(order.bankAccountHolder))}</p>` : ''}
        </div>
        ` : ''}

        <div class="thank-box">
          <p style="margin:0;">Cảm ơn quý khách đã sử dụng dịch vụ!</p>
          <p style="margin:1mm 0 0 0;">Vui lòng giữ phiếu này để đối chiếu khi nhận xe</p>
        </div>

        <div class="signatures">
          <div class="sig-box">
            <p class="sig-line">Khách hàng</p>
            <p class="sig-note">(Ký và ghi rõ họ tên)</p>
          </div>
          <div class="sig-box">
            <p class="sig-line">Nhân viên</p>
            <p class="sig-note">${technician}</p>
          </div>
        </div>

        <div style="margin-top:3mm;padding:2mm;font-size:8pt;color:#666;border-top:1px solid #e5e7eb;line-height:1.4;">
          <p style="margin:0 0 1mm 0;font-weight:bold;">Chính sách bảo hành:</p>
          <ul style="margin:0;padding-left:5mm;list-style-type:disc;">
            <li>Bảo hành áp dụng cho phụ tùng chính hãng và lỗi kỹ thuật do thợ</li>
            <li>Không bảo hành đối với va chạm, ngã xe, ngập nước sau khi nhận xe</li>
            <li>Mang theo phiếu này khi đến bảo hành. Liên hệ hotline nếu có thắc mắc</li>
          </ul>
        </div>
      </div>
    </body>
  </html>`;
};

export const printWorkOrderReceipt = async (order: ReceiptOrder) => {
  const html = buildWorkOrderPrintHtml(order);
  await Print.printAsync({ html });
};

export const shareWorkOrderReceipt = async (order: ReceiptOrder) => {
  const code = formatWorkOrderCode(order.id);
  const text = buildWorkOrderShareText(order);
  await Share.share({
    title: `Phiếu sửa chữa ${code}`,
    message: text,
  });
};
