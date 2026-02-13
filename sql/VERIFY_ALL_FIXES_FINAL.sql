-- ============================================================================
-- KIỂM TRA TỔNG HỢP - Verify tất cả fixes đã hoàn thành
-- Ngày: 2026-02-11
-- ============================================================================

-- TEST 1: Kiểm tra function versions
SELECT 
    '✅ TEST 1: Function Versions' AS test,
    proname AS function_name,
    COALESCE(obj_description(oid), '❌ NO VERSION COMMENT') AS version_comment
FROM pg_proc
WHERE proname IN ('receipt_create_atomic', 'stock_ensure_update')
ORDER BY proname;

-- TEST 2: Kiểm tra stock consistency (DB vs Transactions)
SELECT 
    '✅ TEST 2: Stock Consistency Check' AS test,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ TẤT CẢ STOCK ĐỒNG BỘ HOÀN HẢO!'
        ELSE '❌ CÒN ' || COUNT(*) || ' SẢN PHẨM BỊ LỆCH!'
    END AS result,
    COALESCE(SUM(ABS(stock_hien_tai - stock_dung)), 0) AS tong_chenh_lech
FROM (
    SELECT 
        p.id,
        p.name,
        COALESCE((p.stock->'CN1')::int, 0) AS stock_hien_tai,
        COALESCE(
            (SELECT SUM(
                CASE 
                    WHEN type IN ('Nhập kho', 'Chuyển đến', 'Hoàn trả', 'Nhập hàng', 'Điều chỉnh tăng', 'Chuyển kho đến', 'Khởi tạo') THEN quantity
                    WHEN type IN ('Xuất kho', 'Bán hàng', 'Chuyển đi', 'Sửa chữa', 'Điều chỉnh giảm', 'Chuyển kho đi') THEN -quantity
                    ELSE 0
                END
            )
            FROM inventory_transactions it
            WHERE it."partId" = p.id AND it."branchId" = 'CN1'), 0
        ) AS stock_dung
    FROM parts p
    WHERE COALESCE((p.stock->'CN1')::int, 0) != COALESCE(
        (SELECT SUM(
            CASE 
                WHEN type IN ('Nhập kho', 'Chuyển đến', 'Hoàn trả', 'Nhập hàng', 'Điều chỉnh tăng', 'Chuyển kho đến', 'Khởi tạo') THEN quantity
                WHEN type IN ('Xuất kho', 'Bán hàng', 'Chuyển đi', 'Sửa chữa', 'Điều chỉnh giảm', 'Chuyển kho đi') THEN -quantity
                ELSE 0
            END
        )
        FROM inventory_transactions it
        WHERE it."partId" = p.id AND it."branchId" = 'CN1'), 0
    )
) AS inconsistent_stock;

-- TEST 3: Kiểm tra reserved stock (phải = 0)
SELECT 
    '✅ TEST 3: Reserved Stock Check' AS test,
    COUNT(*) AS so_luong_co_reserved,
    SUM(COALESCE((reservedstock->'CN1')::int, 0)) AS tong_reserved,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ TẤT CẢ RESERVED = 0!'
        ELSE '❌ CÒN ' || COUNT(*) || ' SẢN PHẨM CÓ RESERVED!'
    END AS result
FROM parts
WHERE reservedstock->'CN1' IS NOT NULL 
    AND (reservedstock->'CN1')::text::int > 0;

-- TEST 4: Kiểm tra 2 sản phẩm pin đã fix
SELECT 
    '✅ TEST 4: Khối pin & Sạc pin Check' AS test,
    name,
    stock->'CN1' AS stock,
    reservedstock->'CN1' AS reserved,
    (stock->'CN1')::int - COALESCE((reservedstock->'CN1')::int, 0) AS available,
    CASE 
        WHEN (stock->'CN1')::int = 2 AND COALESCE((reservedstock->'CN1')::int, 0) = 0 
        THEN '✅ ĐÚNG'
        ELSE '❌ SAI'
    END AS status
FROM parts
WHERE name ILIKE '%Khối pin 48V15Ah%' OR name ILIKE '%Sạc pin 48V3A%'
ORDER BY name;

-- TEST 5: Tổng quan toàn bộ hệ thống
SELECT 
    '✅ TEST 5: Overall Statistics' AS test,
    COUNT(*) AS total_products,
    COUNT(*) FILTER (WHERE (stock->'CN1')::text::int > 0) AS products_in_stock,
    COUNT(*) FILTER (WHERE COALESCE((reservedstock->'CN1')::text::int, 0) > 0) AS products_with_reserved,
    SUM((stock->'CN1')::text::int) AS total_stock_units,
    SUM(COALESCE((reservedstock->'CN1')::text::int, 0)) AS total_reserved_units,
    SUM((stock->'CN1')::text::int - COALESCE((reservedstock->'CN1')::text::int, 0)) AS total_available_units
FROM parts;

-- TEST 6: Kiểm tra giao dịch điều chỉnh cho 2 sản phẩm pin
SELECT 
    '✅ TEST 6: Adjustment Transactions' AS test,
    "partName",
    type,
    quantity,
    date::date,
    notes
FROM inventory_transactions
WHERE "branchId" = 'CN1'
    AND ("partName" ILIKE '%Khối pin 48V15Ah%' OR "partName" ILIKE '%Sạc pin 48V3A%')
    AND notes ILIKE '%ĐIỀU CHỈNH%'
ORDER BY date DESC;

-- TEST 7: Kiểm tra work orders active (nên = 0)
SELECT 
    '✅ TEST 7: Active Work Orders' AS test,
    COUNT(*) AS so_luong_wo_active,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ KHÔNG CÓ WO ACTIVE NÀO'
        ELSE '⚠️  CÓ ' || COUNT(*) || ' WO ĐANG ACTIVE'
    END AS result
FROM work_orders
WHERE status IN ('IN_PROGRESS', 'PENDING', 'WAITING_FOR_PARTS')
    AND branchid = 'CN1';

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================
DO $$
DECLARE
    v_stock_ok BOOLEAN;
    v_reserved_ok BOOLEAN;
    v_pin_ok BOOLEAN;
    v_functions_ok BOOLEAN;
BEGIN
    -- Check stock consistency
    SELECT COUNT(*) = 0 INTO v_stock_ok
    FROM parts p
    WHERE COALESCE((p.stock->'CN1')::int, 0) != COALESCE(
        (SELECT SUM(
            CASE 
                WHEN type IN ('Nhập kho', 'Chuyển đến', 'Hoàn trả', 'Nhập hàng', 'Điều chỉnh tăng', 'Chuyển kho đến', 'Khởi tạo') THEN quantity
                WHEN type IN ('Xuất kho', 'Bán hàng', 'Chuyển đi', 'Sửa chữa', 'Điều chỉnh giảm', 'Chuyển kho đi') THEN -quantity
                ELSE 0
            END
        )
        FROM inventory_transactions it
        WHERE it."partId" = p.id AND it."branchId" = 'CN1'), 0
    );

    -- Check reserved
    SELECT COUNT(*) = 0 INTO v_reserved_ok
    FROM parts
    WHERE reservedstock->'CN1' IS NOT NULL 
        AND (reservedstock->'CN1')::text::int > 0;

    -- Check 2 sản phẩm pin
    SELECT COUNT(*) = 2 INTO v_pin_ok
    FROM parts
    WHERE (name ILIKE '%Khối pin 48V15Ah%' OR name ILIKE '%Sạc pin 48V3A%')
        AND (stock->'CN1')::int = 2 
        AND COALESCE((reservedstock->'CN1')::int, 0) = 0;

    -- Check functions
    SELECT COUNT(*) = 2 INTO v_functions_ok
    FROM pg_proc
    WHERE proname IN ('receipt_create_atomic', 'stock_ensure_update')
        AND obj_description(oid) ILIKE '%2026-02-11%';

    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '          📊 FINAL VERIFICATION SUMMARY';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    IF v_stock_ok THEN
        RAISE NOTICE '✅ Stock Consistency: PASSED';
    ELSE
        RAISE NOTICE '❌ Stock Consistency: FAILED';
    END IF;

    IF v_reserved_ok THEN
        RAISE NOTICE '✅ Reserved Stock Reset: PASSED';
    ELSE
        RAISE NOTICE '❌ Reserved Stock Reset: FAILED';
    END IF;

    IF v_pin_ok THEN
        RAISE NOTICE '✅ Khối pin & Sạc pin: PASSED';
    ELSE
        RAISE NOTICE '❌ Khối pin & Sạc pin: FAILED';
    END IF;

    IF v_functions_ok THEN
        RAISE NOTICE '✅ Functions Updated: PASSED';
    ELSE
        RAISE NOTICE '❌ Functions Updated: FAILED';
    END IF;

    RAISE NOTICE '';
    
    IF v_stock_ok AND v_reserved_ok AND v_pin_ok AND v_functions_ok THEN
        RAISE NOTICE '🎉🎉🎉 TẤT CẢ TESTS PASSED! HỆ THỐNG HOẠT ĐỘNG HOÀN HẢO! 🎉🎉🎉';
    ELSE
        RAISE NOTICE '⚠️  MỘT SỐ TESTS FAILED - CẦN KIỂM TRA LẠI!';
    END IF;
    
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;
