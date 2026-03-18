import { supabase } from './supabaseClient';

type CompletePaymentParams = {
  orderId: string;
  paymentMethod: string;
  paymentAmount: number;
};

const parseInsufficientStockMessage = (raw: string): string | null => {
  const upper = raw.toUpperCase();
  if (!upper.includes('INSUFFICIENT_STOCK')) return null;

  const colon = raw.indexOf(':');
  if (colon < 0) return 'Ton kho khong du de thanh toan don sua chua';

  const jsonStr = raw.slice(colon + 1).trim();
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      return 'Ton kho khong du de thanh toan don sua chua';
    }

    const detail = parsed
      .map((item: any) => {
        const name = String(item?.partName || item?.partId || '?');
        const available = Number(item?.available || 0);
        const requested = Number(item?.requested || 0);
        return `${name} (con ${available}, can ${requested})`;
      })
      .join(', ');

    return detail ? `Thieu ton kho: ${detail}` : 'Ton kho khong du de thanh toan don sua chua';
  } catch {
    return 'Ton kho khong du de thanh toan don sua chua';
  }
};

export async function completeWorkOrderPaymentMobile({ orderId, paymentMethod, paymentAmount }: CompletePaymentParams) {
  let userId = 'unknown';
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) userId = data.user.id;
  } catch {
    // Keep unknown fallback user id.
  }

  const { data, error } = await supabase.rpc('work_order_complete_payment', {
    p_order_id: orderId,
    p_payment_method: paymentMethod,
    p_payment_amount: paymentAmount,
    p_user_id: userId,
  });

  if (error || !data) {
    const raw = String(error?.details || error?.message || '');
    const insufficient = parseInsufficientStockMessage(raw);
    if (insufficient) throw new Error(insufficient);

    const upper = raw.toUpperCase();
    if (upper.includes('ORDER_NOT_FOUND')) throw new Error('Khong tim thay phieu sua chua');
    if (upper.includes('ORDER_REFUNDED')) throw new Error('Phieu nay da duoc hoan tien');
    if (upper.includes('BRANCH_MISMATCH')) throw new Error('Chi nhanh khong khop de thanh toan');
    if (upper.includes('UNAUTHORIZED')) throw new Error('Ban khong co quyen thanh toan');

    throw new Error(error?.message || 'Khong the hoan tat thanh toan');
  }

  return data;
}
