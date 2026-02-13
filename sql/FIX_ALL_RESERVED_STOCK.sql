-- Rà soát và fix toàn bộ reserved stock
-- Ngày: 2026-02-11
-- Vấn đề: Reserved stock không đồng bộ với thực tế, làm available stock sai

-- Bước 1: Xem tất cả sản phẩm có reserved stock > 0 (cho CN1)
SELECT 
    name,
    sku,
    stock->'CN1' as stock,
    reservedstock->'CN1' as reservedstock,
    (stock->'CN1')::int - COALESCE((reservedstock->'CN1')::int, 0) as available
FROM parts
WHERE reservedstock->'CN1' IS NOT NULL 
    AND (reservedstock->'CN1')::text::int > 0
ORDER BY name;

-- Bước 2: Tính toán reserved stock THỰC TẾ từ work orders chưa hoàn thành
-- (Chỉ đếm work orders với status IN_PROGRESS, PENDING, WAITING_FOR_PARTS)
WITH actual_reserved AS (
    SELECT 
        pu->>'partId' as part_id,
        SUM((pu->>'quantity')::int) as total_reserved
    FROM work_orders wo,
         jsonb_array_elements(wo.partsused) pu
    WHERE wo.status IN ('IN_PROGRESS', 'PENDING', 'WAITING_FOR_PARTS')
        AND wo.branchid = 'CN1'
        AND pu->>'partId' IS NOT NULL
    GROUP BY pu->>'partId'
)
SELECT 
    p.name,
    p.sku,
    p.stock->'CN1' as stock_db,
    p.reservedstock->'CN1' as reserved_db,
    COALESCE(ar.total_reserved, 0) as reserved_thuc_te,
    COALESCE((p.reservedstock->'CN1')::text::int, 0) - COALESCE(ar.total_reserved, 0) as chenh_lech
FROM parts p
LEFT JOIN actual_reserved ar ON ar.part_id = p.id::text
WHERE (p.reservedstock->'CN1' IS NOT NULL AND (p.reservedstock->'CN1')::text::int > 0)
   OR ar.total_reserved > 0
ORDER BY chenh_lech DESC NULLS LAST, p.name;

-- Bước 3: RESET TẤT CẢ reserved stock về 0 (nếu không có work order nào đang active)
UPDATE parts
SET reservedstock = jsonb_set(
    COALESCE(reservedstock, '{}'::jsonb),
    ARRAY['CN1'],
    to_jsonb(0)
)
WHERE reservedstock->'CN1' IS NOT NULL 
    AND (reservedstock->'CN1')::text::int > 0
    AND id::text NOT IN (
        -- Giữ lại reserved cho các parts thực sự có work order đang active
        SELECT DISTINCT pu->>'partId'
        FROM work_orders wo,
             jsonb_array_elements(wo.partsused) pu
        WHERE wo.status IN ('IN_PROGRESS', 'PENDING', 'WAITING_FOR_PARTS')
            AND wo.branchid = 'CN1'
            AND pu->>'partId' IS NOT NULL
    );

-- Bước 4: Cập nhật lại reserved stock ĐÚNG cho các parts có work order active
WITH actual_reserved AS (
    SELECT 
        pu->>'partId' as part_id,
        SUM((pu->>'quantity')::int) as total_reserved
    FROM work_orders wo,
         jsonb_array_elements(wo.partsused) pu
    WHERE wo.status IN ('IN_PROGRESS', 'PENDING', 'WAITING_FOR_PARTS')
        AND wo.branchid = 'CN1'
        AND pu->>'partId' IS NOT NULL
    GROUP BY pu->>'partId'
)
UPDATE parts p
SET reservedstock = jsonb_set(
    COALESCE(p.reservedstock, '{}'::jsonb),
    ARRAY['CN1'],
    to_jsonb(ar.total_reserved)
)
FROM actual_reserved ar
WHERE p.id::text = ar.part_id;

-- Bước 5: Kiểm tra kết quả - xem tất cả sản phẩm có reserved > 0
SELECT 
    name,
    sku,
    stock->'CN1' as stock,
    reservedstock->'CN1' as reserved,
    (stock->'CN1')::int - COALESCE((reservedstock->'CN1')::int, 0) as available
FROM parts
WHERE reservedstock->'CN1' IS NOT NULL 
    AND (reservedstock->'CN1')::text::int > 0
ORDER BY name;

-- Bước 6: Kiểm tra tổng quan ALL sản phẩm
SELECT 
    COUNT(*) as total_products,
    COUNT(*) FILTER (WHERE (stock->'CN1')::text::int > 0) as products_with_stock,
    COUNT(*) FILTER (WHERE (reservedstock->'CN1')::text::int > 0) as products_with_reserved,
    SUM((stock->'CN1')::text::int) as total_stock,
    SUM(COALESCE((reservedstock->'CN1')::text::int, 0)) as total_reserved,
    SUM((stock->'CN1')::text::int - COALESCE((reservedstock->'CN1')::text::int, 0)) as total_available
FROM parts;

-- Bước 7: Tìm các work orders đang active và parts được giữ
SELECT 
    wo.id,
    wo.status,
    wo.created_at,
    pu->>'partId' as part_id,
    (SELECT name FROM parts WHERE id::text = pu->>'partId') as part_name,
    (pu->>'quantity')::int as quantity
FROM work_orders wo,
     jsonb_array_elements(wo.partsused) pu
WHERE wo.status IN ('IN_PROGRESS', 'PENDING', 'WAITING_FOR_PARTS')
    AND wo.branchid = 'CN1'
    AND pu->>'partId' IS NOT NULL
ORDER BY wo.created_at DESC;
