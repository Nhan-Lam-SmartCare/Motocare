-- Kiểm tra phiếu sửa chữa đã hủy và trạng thái inventory
SELECT 
  id,
  customername,
  status,
  paymentstatus,
  inventory_deducted,
  refunded,
  refund_reason,
  partsused
FROM work_orders
WHERE status = 'Đã hủy' OR refunded = true
ORDER BY created_at DESC
LIMIT 10;

-- Kiểm tra sản phẩm có stock âm
SELECT 
  id,
  name,
  sku,
  stock,
  reservedstock
FROM parts
WHERE EXISTS (
  SELECT 1 FROM jsonb_each_text(stock) 
  WHERE value::int < 0
);

-- Kiểm tra inventory_transactions gần đây cho sản phẩm bị âm
SELECT 
  it.id,
  it.type,
  it."partId",
  it."partName",
  it.quantity,
  it.date,
  it.notes,
  it."workOrderId"
FROM inventory_transactions it
WHERE it."partId" IN (
  SELECT id FROM parts 
  WHERE sku LIKE '%30510-KYZ-V71%' OR name LIKE '%Môbin%'
)
ORDER BY it.date DESC
LIMIT 20;
