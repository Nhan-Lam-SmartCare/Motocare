import { Share } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { formatWorkOrderCode } from './workOrderCode';

type ReceiptPart = {
  partName?: string;
  name?: string;
  description?: string;
  serviceName?: string;
  quantity?: number;
  qty?: number;
  price?: number;
  unitPrice?: number;
  unit_price?: number;
  amount?: number;
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
  bankBranch?: string;
  workOrderPrefix?: string;
  logoUrl?: string;
};

const BANK_BINS: Record<string, string> = {
  Vietcombank: '970436',
  VCB: '970436',
  Vietinbank: '970415',
  VietinBank: '970415',
  VTB: '970415',
  BIDV: '970418',
  Agribank: '970405',
  Techcombank: '970407',
  TCB: '970407',
  MBBank: '970422',
  MB: '970422',
  VPBank: '970432',
  VPB: '970432',
  ACB: '970416',
  Sacombank: '970403',
  STB: '970403',
  HDBank: '970437',
  SHB: '970443',
  TPBank: '970423',
  VIB: '970441',
  MSB: '970426',
  OCB: '970448',
  SeABank: '970440',
  NCB: '970419',
  KienLongBank: '970452',
  LienVietPostBank: '970449',
  LPB: '970449',
  LPBank: '970449',
  LienViet: '970449',
  BacABank: '970409',
  PVcomBank: '970412',
  Woori: '970457',
  VietCapitalBank: '970454',
  BanViet: '970454',
  SCB: '970429',
};

const pickString = (source: Record<string, unknown>, keys: string[], fallback = ''): string => {
  for (const key of keys) {
    const value = source[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return fallback;
};

const findBankBin = (bankName: string): string | undefined => {
  if (!bankName) return undefined;
  const normalized = bankName.trim().toLowerCase();

  for (const [name, bin] of Object.entries(BANK_BINS)) {
    if (name.toLowerCase() === normalized) return bin;
  }

  for (const [name, bin] of Object.entries(BANK_BINS)) {
    if (name.toLowerCase().includes(normalized) || normalized.includes(name.toLowerCase())) {
      return bin;
    }
  }

  return undefined;
};

const generateVietQRUrl = (params: {
  bankId: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
}) => {
  const cleanDescription = params.description.replace(/\s+/g, ' ').trim();
  const encodedDescription = encodeURIComponent(cleanDescription);
  const encodedAccountName = encodeURIComponent(params.accountName);
  return `https://img.vietqr.io/image/${params.bankId}-${params.accountNumber}-compact2.jpg?amount=${params.amount}&addInfo=${encodedDescription}&accountName=${encodedAccountName}`;
};

const formatReceiptWorkOrderCode = (id: string, prefix: string) => {
  const raw = String(id || '').trim();
  if (!raw) return '';

  const matched = raw.match(new RegExp(`^${prefix}-(\\d{10,})`, 'i')) || raw.match(/WO-(\d+)/i) || raw.match(/(\d{10,})/);
  if (matched?.[1]) {
    const ts = matched[1];
    const num = Number(ts);
    if (!Number.isNaN(num)) {
      const d = new Date(num);
      if (!Number.isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const suffix = String(ts).slice(-6).padStart(6, '0');
        return `${prefix}-${y}${m}${day}-${suffix}`;
      }
    }
  }

  return raw;
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
      const name = escapeHtml(String(item.partName || item.name || item.description || item.serviceName || 'Mục dịch vụ'));
      const qty = Number(item.quantity ?? item.qty ?? 1);
      const price = Number(item.price ?? item.unitPrice ?? item.unit_price ?? item.amount ?? 0);
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

const parseArrayValue = (value: unknown): ReceiptPart[] => {
  if (Array.isArray(value)) return value as ReceiptPart[];
  if (typeof value !== 'string') return [];

  const text = value.trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as ReceiptPart[]) : [];
  } catch {
    return [];
  }
};

const normalizeLineItem = (item: ReceiptPart): ReceiptPart => {
  const quantity = Number(item.quantity ?? item.qty ?? 1);
  const price = Number(item.price ?? item.unitPrice ?? item.unit_price ?? item.amount ?? 0);
  return {
    ...item,
    partName: item.partName || item.name || item.description || item.serviceName || 'Mục dịch vụ',
    quantity: Number.isFinite(quantity) ? quantity : 1,
    price: Number.isFinite(price) ? price : 0,
  };
};

const pickRichestArray = (source: Record<string, unknown>, keys: string[], fallback: ReceiptPart[] = []): ReceiptPart[] => {
  let best: ReceiptPart[] = Array.isArray(fallback) ? fallback : [];

  for (const key of keys) {
    const parsed = parseArrayValue(source[key]);
    if (!parsed.length) continue;

    const normalized = parsed.map((entry) => normalizeLineItem((entry || {}) as ReceiptPart));
    if (normalized.length > best.length) {
      best = normalized;
    }
  }

  return best.map((entry) => normalizeLineItem((entry || {}) as ReceiptPart));
};

export const buildWorkOrderShareText = (order: ReceiptOrder) => {
  const src = order as unknown as Record<string, unknown>;
  const workOrderPrefix = pickString(src, ['workOrderPrefix', 'work_order_prefix'], 'SC');
  const code = formatReceiptWorkOrderCode(order.id, workOrderPrefix) || formatWorkOrderCode(order.id);
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
  const src = order as unknown as Record<string, unknown>;
  const workOrderPrefix = pickString(src, ['workOrderPrefix', 'work_order_prefix'], 'SC');
  const code = formatReceiptWorkOrderCode(order.id, workOrderPrefix) || formatWorkOrderCode(order.id);
  const parts = pickRichestArray(
    src,
    ['partsUsed', 'partsused', 'parts_used', 'parts', 'items', 'partsList', 'parts_list'],
    order.partsUsed || []
  );
  const services = pickRichestArray(
    src,
    ['additionalServices', 'additionalservices', 'additional_services', 'services', 'serviceItems', 'service_items'],
    order.additionalServices || []
  );
  const mergedItems: ReceiptPart[] = [...parts, ...services];
  const partsTotal = parts.reduce((sum, p) => sum + Number(p.price || 0) * Number(p.quantity || 0), 0);
  const servicesTotal = services.reduce((sum, s) => sum + Number(s.price || 0) * Number(s.quantity || 0), 0);
  const paymentMethodLabel = order.paymentMethod === 'bank' ? 'Chuyển khoản' : 'Tiền mặt';
  const storeName = pickString(src, ['storeName', 'store_name', 'storeNameVi'], 'Nhạn Lâm SmartCare');
  const storePhone = pickString(src, ['storePhone', 'store_phone', 'phone'], '0907.239.337');
  const storeAddress = pickString(src, ['storeAddress', 'store_address', 'address'], 'Ấp Phú Lợi B, Xã Long Phú Thuận, Đông Tháp');
  const storeEmail = pickString(src, ['storeEmail', 'store_email', 'email']);
  const logoUrl = pickString(src, ['logoUrl', 'logo_url', 'logo']);
  const bankQrUrl = pickString(src, ['bankQrUrl', 'bank_qr_url', 'bankQr', 'bank_qr']);
  const bankName = pickString(src, ['bankName', 'bank_name']);
  const bankAccountNumber = pickString(src, ['bankAccountNumber', 'bank_account_number', 'bankAccount']);
  const bankAccountHolder = pickString(src, ['bankAccountHolder', 'bank_account_holder', 'bankAccountName']);
  const bankBranch = pickString(src, ['bankBranch', 'bank_branch']);
  const remainingAmount = Number(order.remainingAmount || 0);
  const amountForQr = remainingAmount > 0 ? remainingAmount : Number(order.total || 0);
  const bankBin = findBankBin(bankName);
  const dynamicQrUrl = bankBin && bankAccountNumber && bankAccountHolder
    ? generateVietQRUrl({
        bankId: bankBin,
        accountNumber: bankAccountNumber,
        accountName: bankAccountHolder,
        amount: amountForQr,
        description: `Thanh toan ${code}`,
      })
    : '';
  const finalBankQrUrl = dynamicQrUrl || bankQrUrl;
  const showQr = !!finalBankQrUrl;
  const topQrNote = dynamicQrUrl ? 'Quét mã thanh toán' : bankQrUrl ? 'QR tĩnh' : '';
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
          padding: 8px;
          color: #000;
          background: #f3f4f6;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .page {
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
          min-height: 210mm;
          border: 1px solid #e5e7eb;
          background: #fff;
          padding: 3mm;
          position: relative;
          overflow: hidden;
        }
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60%;
          opacity: 0.08;
          filter: grayscale(100%);
          pointer-events: none;
          z-index: 0;
        }
        .store {
          padding: 0 0 2mm;
          margin-bottom: 4mm;
          border-bottom: 2px solid #3b82f6;
          font-size: 9pt;
          position: relative;
          z-index: 1;
        }
        .store-top {
          display: flex;
          align-items: flex-start;
          gap: 1.5mm;
        }
        .logo {
          width: 14mm;
          height: 14mm;
          object-fit: contain;
          flex-shrink: 0;
        }
        .store-body { flex: 1; }
        .store-name { margin: 0 0 0.5mm 0; font-size: 10pt; font-weight: bold; color: #1e40af; }
        .store-meta { color: #000; line-height: 1.3; font-size: 8pt; }
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
        .content-main {
          position: relative;
          z-index: 1;
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
        .payment-info {
          border: 1px solid #d9dee5;
          border-radius: 2mm;
          background-color: #eef3fb;
          padding: 3mm;
          margin-top: 3mm;
        }
        .payment-title {
          margin: 0 0 2mm 0;
          font-size: 10pt;
          font-weight: bold;
          color: #1e40af;
        }
        .payment-wrap {
          display: flex;
          gap: 3mm;
          align-items: flex-start;
        }
        .payment-left {
          flex: 1;
          min-width: 0;
          font-size: 9pt;
          color: #222;
          line-height: 1.35;
        }
        .payment-left strong {
          font-size: 9pt;
        }
        .payment-qr-wrap {
          width: 22mm;
          text-align: center;
          flex-shrink: 0;
        }
        .payment-qr {
          width: 18mm;
          height: 18mm;
          margin: 0 auto;
          display: block;
          object-fit: contain;
          background: #fff;
          border-radius: 1mm;
          border: 1px solid #dbe4f0;
        }
        .payment-qr-note {
          margin-top: 1mm;
          font-size: 6.5pt;
          color: #666;
        }
        .thank-box {
          margin-top: 3mm;
          border: 1px solid #ffd700;
          border-radius: 2mm;
          background-color: #fff9e6;
          padding: 3mm;
          text-align: center;
          font-size: 9pt;
          font-style: italic;
        }
        @media print {
          body { padding: 0; background: #fff; }
          .page {
            border: none;
            width: 100%;
            max-width: 560px;
            min-height: auto;
            padding: 3mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="page">
        ${logoUrl ? `<img class="watermark" src="${escapeHtml(logoUrl)}" alt="watermark" />` : ''}
        <div class="store">
          <div class="store-top">
            ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="Logo" />` : ''}
            <div class="store-body">
              <p class="store-name">${escapeHtml(storeName)}</p>
              <div class="store-meta">
                <div>${escapeHtml(storeAddress)}</div>
                <div>Hotline: ${escapeHtml(storePhone)}</div>
                ${storeEmail ? `<div>${escapeHtml(storeEmail)}</div>` : ''}
              </div>
            </div>
          </div>
        </div>

        <div class="content-main">
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

          ${(bankName || bankAccountNumber || bankAccountHolder || finalBankQrUrl) ? `
          <div class="payment-info">
            <p class="payment-title">🏦 Thông tin thanh toán</p>
            <div class="payment-wrap">
              <div class="payment-left">
                ${bankName ? `<div>Ngân hàng: <strong>${escapeHtml(bankName)}</strong></div>` : ''}
                ${bankAccountNumber ? `<div>STK: <strong>${escapeHtml(bankAccountNumber)}</strong></div>` : ''}
                ${bankAccountHolder ? `<div>Chủ TK: ${escapeHtml(bankAccountHolder)}</div>` : ''}
                ${bankBranch ? `<div>Chi nhánh: ${escapeHtml(bankBranch)}</div>` : ''}
              </div>
              ${finalBankQrUrl ? `
              <div class="payment-qr-wrap">
                <img class="payment-qr" src="${escapeHtml(finalBankQrUrl)}" alt="QR Payment" />
                <div class="payment-qr-note">${escapeHtml(topQrNote || 'Quét mã thanh toán')}</div>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}
        </div>

        <div class="thank-box">
          <p style="margin:0;">Cảm ơn quý khách đã sử dụng dịch vụ!</p>
          <p style="margin:1mm 0 0 0;">Vui lòng giữ phiếu này để đối chiếu khi nhận xe</p>
        </div>

        <div style="margin-top:2mm;font-size:8pt;color:#777;text-align:right;">KTV: ${technician}</div>
        </div>
      </div>
    </body>
  </html>`;
};

export const printWorkOrderReceipt = async (order: ReceiptOrder) => {
  const html = buildWorkOrderPrintHtml(order);
  await Print.printAsync({ html });
};

type ShareWorkOrderOptions = {
  onProcessingChange?: (processing: boolean) => void;
};

export const shareWorkOrderReceipt = async (order: ReceiptOrder, options?: ShareWorkOrderOptions) => {
  const src = order as unknown as Record<string, unknown>;
  const workOrderPrefix = pickString(src, ['workOrderPrefix', 'work_order_prefix'], 'SC');
  const code = formatReceiptWorkOrderCode(order.id, workOrderPrefix) || formatWorkOrderCode(order.id);
  const html = buildWorkOrderPrintHtml(order);
  const safeCode = code.replace(/[^A-Za-z0-9-_]/g, '_');
  const fileName = `Phieu_${safeCode}.pdf`;
  options?.onProcessingChange?.(true);

  try {
    const { uri } = await Print.printToFileAsync({ html });
    const canShareFile = await Sharing.isAvailableAsync();

    if (canShareFile) {
      let shareUri = uri;
      if (FileSystem.cacheDirectory) {
        const targetUri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.copyAsync({ from: uri, to: targetUri });
        shareUri = targetUri;
      }

      await Sharing.shareAsync(shareUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Phiếu sửa chữa ${code}`,
        UTI: 'com.adobe.pdf',
      });
      return;
    }
    const text = buildWorkOrderShareText(order);
    await Share.share({
      title: `Phiếu sửa chữa ${code}`,
      message: text,
    });
  } catch {
    const text = buildWorkOrderShareText(order);
    await Share.share({
      title: `Phiếu sửa chữa ${code}`,
      message: text,
    });
  } finally {
    options?.onProcessingChange?.(false);
  }
};
