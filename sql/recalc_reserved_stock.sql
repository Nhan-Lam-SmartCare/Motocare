-- 1. Create a temporary table to track correct reservations per part and branch
CREATE TEMP TABLE temp_reserved_stock AS
SELECT 
    part->>'partId' AS part_id,
    w.branchid,
    SUM((part->>'quantity')::int) AS total_reserved
FROM 
    work_orders w,
    jsonb_array_elements(w.partsused) AS part
WHERE 
    w.paymentstatus != 'paid' 
    AND w.refunded = false
    AND part->>'partId' IS NOT NULL
GROUP BY 
    part->>'partId', w.branchid;

-- 2. Aggregate back into JSONB format per part
CREATE TEMP TABLE temp_reserved_json AS
SELECT 
    part_id,
    jsonb_object_agg(branchid, total_reserved) AS new_reservedstock
FROM 
    temp_reserved_stock
GROUP BY 
    part_id;

-- 3. Reset all reservedstock to empty first
UPDATE parts SET reservedstock = '{}'::jsonb;

-- 4. Update parts with the correct recalculated reservedstock
UPDATE parts p
SET reservedstock = t.new_reservedstock
FROM temp_reserved_json t
WHERE p.id = t.part_id;

-- 5. Drop temp tables
DROP TABLE temp_reserved_stock;
DROP TABLE temp_reserved_json;

SELECT 'Dọn dẹp và tính toán lại reservedstock thành công!' AS result;
