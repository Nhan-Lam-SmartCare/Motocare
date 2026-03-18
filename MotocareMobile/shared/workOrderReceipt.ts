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
    return '<tr><td colspan="4" style="padding:8px;color:#64748b">Không có dữ liệu</td></tr>';
  }

  return items
    .map((item, index) => {
      const name = escapeHtml(String(item.partName || item.description || 'Mục dịch vụ'));
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">${index + 1}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">${name}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${qty}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${currency(price)}</td>
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

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Phiếu sửa chữa ${code}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #0f172a; }
        h1 { margin: 0 0 4px; font-size: 22px; }
        h2 { margin: 20px 0 10px; font-size: 16px; }
        .muted { color: #475569; font-size: 12px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin-top: 12px; }
        .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-top: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 8px; border-bottom: 1px solid #94a3b8; font-size: 12px; color: #334155; }
        .money { text-align: right; white-space: nowrap; }
      </style>
    </head>
    <body>
      <h1>Phiếu sửa chữa ${code}</h1>
      <div class="muted">Ngày tạo: ${dateTime(order.creationDate)}</div>

      <div class="card">
        <div class="grid">
          <div><strong>Khách hàng:</strong> ${escapeHtml(String(order.customerName || '-'))}</div>
          <div><strong>Số điện thoại:</strong> ${escapeHtml(String(order.customerPhone || '-'))}</div>
          <div><strong>Dòng xe:</strong> ${escapeHtml(String(order.vehicleModel || '-'))}</div>
          <div><strong>Biển số:</strong> ${escapeHtml(String(order.licensePlate || '-'))}</div>
          <div><strong>Kỹ thuật viên:</strong> ${escapeHtml(String(order.technicianName || '-'))}</div>
          <div><strong>Trạng thái:</strong> ${escapeHtml(String(order.status || '-'))}</div>
        </div>
        <div style="margin-top:8px"><strong>Mô tả:</strong> ${escapeHtml(String(order.issueDescription || '-'))}</div>
      </div>

      <h2>Phụ tùng</h2>
      <table>
        <thead>
          <tr>
            <th style="width:44px">STT</th>
            <th>Tên</th>
            <th class="money">SL</th>
            <th class="money">Đơn giá</th>
          </tr>
        </thead>
        <tbody>${lineRows(parts)}</tbody>
      </table>

      <h2>Dịch vụ</h2>
      <table>
        <thead>
          <tr>
            <th style="width:44px">STT</th>
            <th>Tên</th>
            <th class="money">SL</th>
            <th class="money">Đơn giá</th>
          </tr>
        </thead>
        <tbody>${lineRows(services)}</tbody>
      </table>

      <div class="card">
        <div><strong>Tiền công:</strong> ${currency(order.laborCost)}</div>
        <div><strong>Giảm giá:</strong> ${currency(order.discount)}</div>
        <div><strong>Tổng thanh toán:</strong> ${currency(order.total)}</div>
        <div><strong>Đã thu:</strong> ${currency(order.totalPaid)}</div>
        <div><strong>Còn lại:</strong> ${currency(order.remainingAmount)}</div>
        <div><strong>Phương thức:</strong> ${order.paymentMethod === 'bank' ? 'Chuyển khoản' : 'Tiền mặt'}</div>
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
