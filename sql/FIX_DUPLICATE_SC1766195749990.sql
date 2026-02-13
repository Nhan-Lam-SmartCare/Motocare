-- Fix: Xóa giao dịch xuất kho trùng lặp cho phiếu SC-1766195749990
-- Ngày: 2026-02-11
-- Vấn đề: Có 2 giao dịch AUTO-FIX giống hệt nhau làm stock sai (hệ thống: 3, thực tế: 2)

-- Bước 1: Xem tất cả giao dịch trùng lặp (cả 2 sản phẩm)
SELECT 
    id, 
    date, 
    type, 
    quantity, 
    "partName",
    notes,
    "workOrderId"
FROM inventory_transactions
WHERE "workOrderId" = 'SC-1766195749990'
    AND date::date = '2025-12-20'
    AND notes ILIKE '%AUTO-FIX%'
ORDER BY "partName", date;

-- Bước 2: Xóa 1 trong 2 giao dịch trùng cho Khối pin 48V15Ah (giữ lại bản ghi đầu tiên)
DELETE FROM inventory_transactions
WHERE id IN (
    SELECT id
    FROM inventory_transactions
    WHERE "workOrderId" = 'SC-1766195749990'
        AND date::date = '2025-12-20'
        AND notes ILIKE '%AUTO-FIX%'
        AND "partName" ILIKE '%Khối pin 48V15Ah%'
    ORDER BY date DESC  -- Xóa bản ghi tạo sau
    LIMIT 1
);

-- Bước 3: Xóa 1 trong 2 giao dịch trùng cho Sạc pin 48V3A (giữ lại bản ghi đầu tiên)
DELETE FROM inventory_transactions
WHERE id IN (
    SELECT id
    FROM inventory_transactions
    WHERE "workOrderId" = 'SC-1766195749990'
        AND date::date = '2025-12-20'
        AND notes ILIKE '%AUTO-FIX%'
        AND "partName" ILIKE '%Sạc pin 48V3A%'
    ORDER BY date DESC  -- Xóa bản ghi tạo sau
    LIMIT 1
);

-- Bước 4: Cập nhật lại stock về 2 cho cả 2 sản phẩm
UPDATE parts
SET stock = jsonb_set(
    stock,
    ARRAY['CN1'],
    to_jsonb(2)
)
WHERE name ILIKE '%Khối pin 48V15Ah%';

UPDATE parts
SET stock = jsonb_set(
    stock,
    ARRAY['CN1'],
    to_jsonb(2)
)
WHERE name ILIKE '%Sạc pin 48V3A%';

-- Bước 5: Kiểm tra kết quả
SELECT 
    name,
    stock->'CN1' as stock_CN1,
    (
        SELECT COUNT(*) 
        FROM inventory_transactions it 
        WHERE it."partId" = parts.id 
            AND it."workOrderId" = 'SC-1766195749990'
            AND it.notes ILIKE '%AUTO-FIX%'
    ) as so_luong_auto_fix_con_lai
FROM parts
WHERE name ILIKE '%Khối pin 48V15Ah%' 
   OR name ILIKE '%Sạc pin 48V3A%';

-- Bước 6: Tính toán lại stock từ tất cả giao dịch để verify (cho CN1)
SELECT 
    p.name,
    p.stock->'CN1' as stock_hien_tai,
    COALESCE(
        SUM(CASE 
            WHEN it.type IN ('Nhập kho', 'Chuyển đến', 'Hoàn trả', 'Nhập hàng', 'Điều chỉnh tăng', 'Chuyển kho đến', 'Khởi tạo') 
            THEN it.quantity 
            ELSE 0 
        END) -
        SUM(CASE 
            WHEN it.type IN ('Xuất kho', 'Bán hàng', 'Chuyển đi', 'Sửa chữa', 'Điều chỉnh giảm', 'Chuyển kho đi') 
            THEN it.quantity 
            ELSE 0 
        END),
        0
    ) as stock_tinh_toan
FROM parts p
LEFT JOIN inventory_transactions it ON it."partId" = p.id AND it."branchId" = 'CN1'
WHERE p.name ILIKE '%Khối pin 48V15Ah%' 
   OR p.name ILIKE '%Sạc pin 48V3A%'
GROUP BY p.id, p.name, p.stock;
