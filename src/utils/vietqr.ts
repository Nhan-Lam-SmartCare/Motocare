/**
 * Generate VietQR URL for Vietnamese banks
 * Docs: https://www.vietqr.io/danh-sach-api
 */

interface VietQRParams {
  bankId: string; // Bank BIN code (e.g., "970415" for Vietinbank)
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
  template?: 'compact' | 'compact2' | 'qr_only' | 'print'; // Default: compact
}

/**
 * Generate VietQR image URL using vietqr.io API
 * @param params VietQR parameters
 * @returns QR code image URL
 */
export function generateVietQRUrl(params: VietQRParams): string {
  const {
    bankId,
    accountNumber,
    accountName,
    amount,
    description,
    template = 'compact2', // Use compact2 for QR with info
  } = params;

  // Encode description to URL-safe format (remove spaces for compatibility)
  const cleanDescription = description.replace(/\s+/g, ' ').trim();
  const encodedDescription = encodeURIComponent(cleanDescription);
  const encodedAccountName = encodeURIComponent(accountName);

  // VietQR API v2 format - FIXED: Correct parameter order
  // Format: https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-{TEMPLATE}.jpg?amount={AMOUNT}&addInfo={INFO}&accountName={NAME}
  return `https://img.vietqr.io/image/${bankId}-${accountNumber}-${template}.jpg?amount=${amount}&addInfo=${encodedDescription}&accountName=${encodedAccountName}`;
}

/**
 * Common Vietnamese bank BIN codes
 */
export const BANK_BINS: Record<string, string> = {
  // Big banks
  'Vietcombank': '970436',
  'VCB': '970436',
  'Vietinbank': '970415',
  'VTB': '970415',
  'BIDV': '970418',
  'Agribank': '970405',
  'Techcombank': '970407',
  'TCB': '970407',
  'MBBank': '970422',
  'MB': '970422',
  'VPBank': '970432',
  'VPB': '970432',
  'ACB': '970416',
  'Sacombank': '970403',
  'STB': '970403',
  'HDBank': '970437',
  'VietinBank': '970415',
  'SHB': '970443',
  'TPBank': '970423',
  'VIB': '970441',
  'MSB': '970426',
  'OCB': '970448',
  'SeABank': '970440',
  'NCB': '970419',
  'KienLongBank': '970452',
  'LienVietPostBank': '970449',
  'LPB': '970449',
  'LPBank': '970449', // ✅ Thêm variant cho LienVietPostBank
  'LienViet': '970449',
  'BacABank': '970409',
  'PVcomBank': '970412',
  'Woori': '970457',
  'VietCapitalBank': '970454',
  'BanViet': '970454',
  'SCB': '970429',
  'CAKE': '546034',
  'Ubank': '546035',
  'Timo': '963388',
  'ViettelMoney': '971005',
  'VNPTMoney': '971011',
};

/**
 * Find bank BIN by name (case-insensitive, partial match)
 */
export function findBankBin(bankName: string): string | undefined {
  if (!bankName) return undefined;
  
  const normalized = bankName.trim().toLowerCase();
  
  // Try exact match first
  for (const [name, bin] of Object.entries(BANK_BINS)) {
    if (name.toLowerCase() === normalized) {
      console.log(`[VietQR] Exact match found: "${bankName}" -> ${bin}`);
      return bin;
    }
  }
  
  // Try partial match
  for (const [name, bin] of Object.entries(BANK_BINS)) {
    if (name.toLowerCase().includes(normalized) || normalized.includes(name.toLowerCase())) {
      console.log(`[VietQR] Partial match found: "${bankName}" -> "${name}" -> ${bin}`);
      return bin;
    }
  }
  
  console.warn(`[VietQR] Bank BIN not found for: "${bankName}"`);
  return undefined;
}
