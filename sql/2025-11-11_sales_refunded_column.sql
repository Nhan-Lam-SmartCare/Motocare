-- Add refunded column to sales for explicit refund tracking
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS refunded BOOLEAN DEFAULT false;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS refundReason TEXT;
COMMENT ON COLUMN public.sales.refunded IS 'Đánh dấu hóa đơn đã hoàn tiền toàn bộ.';
COMMENT ON COLUMN public.sales.refundReason IS 'Lý do hoàn tiền.';
