// App constants — brand colors, branch config, etc.

export const BRAND_COLORS = {
  primary: '#1565C0',      // Deep blue
  primaryLight: '#42A5F5', // Light blue
  primaryDark: '#0D47A1',  // Dark blue
  secondary: '#FF6F00',    // Amber (accent)
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceVariant: '#EEF2F8',
  border: '#E0E7F0',
  textPrimary: '#1A2B4A',
  textSecondary: '#5A7090',
  textMuted: '#8CA0BA',
  success: '#2E7D32',
  successLight: '#E8F5E9',
  warning: '#E65100',
  warningLight: '#FFF3E0',
  error: '#C62828',
  errorLight: '#FFEBEE',
  info: '#1565C0',
  infoLight: '#E3F2FD',
};

export const STATUS_COLORS: Record<string, string> = {
  'Tiếp nhận': '#1565C0',
  'Đang sửa': '#E65100',
  'Đã sửa xong': '#2E7D32',
  'Trả máy': '#5A7090',
  'Đã hủy': '#C62828',
};

export const STATUS_BG: Record<string, string> = {
  'Tiếp nhận': '#E3F2FD',
  'Đang sửa': '#FFF3E0',
  'Đã sửa xong': '#E8F5E9',
  'Trả máy': '#EEF2F8',
  'Đã hủy': '#FFEBEE',
};

export const PAYMENT_STATUS_COLOR: Record<string, string> = {
  unpaid: '#C62828',
  partial: '#E65100',
  paid: '#2E7D32',
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: 'Chưa thanh toán',
  partial: 'Thanh toán một phần',
  paid: 'Đã thanh toán',
};

// Format Vietnamese currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Format short date
export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Format relative time  
export const formatRelative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return formatDate(iso);
};
