import { Share } from 'react-native';
import * as Print from 'expo-print';
import type { Sale } from './types';

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

const saleCode = (sale: Sale) => sale.sale_code || `SALE-${sale.id.slice(0, 8).toUpperCase()}`;

const paymentMethodLabel = (method?: Sale['paymentMethod']) => {
  if (method === 'cash') return 'Tiền mặt';
  if (method === 'bank') return 'Chuyển khoản';
  if (method === 'card') return 'Thẻ';
  return '-';
};

const paymentTypeLabel = (type?: Sale['paymentType']) => {
  if (type === 'full') return 'Thanh toán đủ';
  if (type === 'partial') return 'Thanh toán một phần';
  if (type === 'note') return 'Ghi nợ';
  if (type === 'installment') return 'Trả góp';
  return '-';
};

const deliveryMethodLabel = (method?: Sale['deliveryMethod']) => {
  if (method === 'cod') return 'Giao hàng COD';
  if (method === 'store_pickup') return 'Khách tự lấy';
  return '-';
};

const lineRows = (sale: Sale) => {
  if (!sale.items?.length) {
    return '<tr><td colspan="5" style="padding:8px;color:#64748b">Không có dữ liệu</td></tr>';
  }

  return sale.items
    .map((item, index) => {
      const name = escapeHtml(String(item.partName || 'Sản phẩm'));
      const qty = Number(item.quantity || 0);
      const price = Number(item.sellingPrice || 0);
      const lineTotal = qty * price;
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">${index + 1}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">${name}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">${escapeHtml(String(item.sku || '-'))}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${qty}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">${currency(lineTotal)}</td>
      </tr>`;
    })
    .join('');
};

export const buildSaleShareText = (sale: Sale) => {
  return [
    `HOA DON BAN HANG ${saleCode(sale)}`,
    `Ngay tao: ${dateTime(sale.date)}`,
    `Khach hang: ${sale.customer?.name || 'Khach le'}`,
    `SDT: ${sale.customer?.phone || '-'}`,
    `So mat hang: ${sale.items?.length || 0}`,
    `Tam tinh: ${currency(sale.subtotal)}`,
    `Giam gia: ${currency(sale.discount)}`,
    `Tong cong: ${currency(sale.total)}`,
    `Da thu: ${currency(sale.paidAmount ?? sale.total)}`,
    `Con lai: ${currency(sale.remainingAmount ?? 0)}`,
    `Phuong thuc: ${paymentMethodLabel(sale.paymentMethod)}`,
    `Hinh thuc: ${paymentTypeLabel(sale.paymentType)}`,
    `Giao nhan: ${deliveryMethodLabel(sale.deliveryMethod)}`,
    sale.deliveryAddress ? `Dia chi giao: ${sale.deliveryAddress}` : '',
    sale.orderNote ? `Ghi chu: ${sale.orderNote}` : '',
  ]
    .filter(Boolean)
    .join('\n');
};

export const buildSalePrintHtml = (sale: Sale) => {
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Hoa don ${saleCode(sale)}</title>
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
      <h1>Hoa don ban hang ${saleCode(sale)}</h1>
      <div class="muted">Ngay tao: ${dateTime(sale.date)}</div>

      <div class="card">
        <div class="grid">
          <div><strong>Khach hang:</strong> ${escapeHtml(String(sale.customer?.name || 'Khach le'))}</div>
          <div><strong>So dien thoai:</strong> ${escapeHtml(String(sale.customer?.phone || '-'))}</div>
          <div><strong>Phuong thuc:</strong> ${paymentMethodLabel(sale.paymentMethod)}</div>
          <div><strong>Hinh thuc:</strong> ${paymentTypeLabel(sale.paymentType)}</div>
          <div><strong>Giao nhan:</strong> ${deliveryMethodLabel(sale.deliveryMethod)}</div>
          <div><strong>Trang thai:</strong> ${escapeHtml(String(sale.status || 'completed'))}</div>
        </div>
        ${sale.deliveryAddress ? `<div style="margin-top:8px"><strong>Dia chi giao:</strong> ${escapeHtml(sale.deliveryAddress)}</div>` : ''}
      </div>

      <h2>Chi tiet hang hoa</h2>
      <table>
        <thead>
          <tr>
            <th style="width:44px">STT</th>
            <th>Ten</th>
            <th>SKU</th>
            <th class="money">SL</th>
            <th class="money">Thanh tien</th>
          </tr>
        </thead>
        <tbody>${lineRows(sale)}</tbody>
      </table>

      <div class="card">
        <div><strong>Tam tinh:</strong> ${currency(sale.subtotal)}</div>
        <div><strong>Giam gia:</strong> ${currency(sale.discount)}</div>
        <div><strong>Tong thanh toan:</strong> ${currency(sale.total)}</div>
        <div><strong>Da thu:</strong> ${currency(sale.paidAmount ?? sale.total)}</div>
        <div><strong>Con lai:</strong> ${currency(sale.remainingAmount ?? 0)}</div>
        ${sale.orderNote ? `<div><strong>Ghi chu:</strong> ${escapeHtml(sale.orderNote)}</div>` : ''}
      </div>
    </body>
  </html>`;
};

export const printSaleReceipt = async (sale: Sale) => {
  const html = buildSalePrintHtml(sale);
  await Print.printAsync({ html });
};

export const shareSaleReceipt = async (sale: Sale) => {
  const text = buildSaleShareText(sale);
  await Share.share({
    title: `Hoa don ${saleCode(sale)}`,
    message: text,
  });
};
