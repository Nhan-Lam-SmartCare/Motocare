-- ============================================================================
-- FIX TOÀN DIỆN: Stock không cập nhật sau nhập kho
-- Ngày: 2026-02-11
-- ============================================================================
-- NGUYÊN NHÂN GỐC:
--   Trigger trg_inventory_tx_after_insert đã bị xóa (2026-02-06) để fix 
--   double-deduction, nhưng function receipt_create_atomic trên production
--   vẫn là version CŨ → chỉ insert transaction, KHÔNG cộng stock.
--
-- PHIẾU BỊ ẢNH HƯỞNG (ví dụ):
--   NH-20260210-873, NH-20260211-006 và các phiếu khác từ sau ngày xóa trigger
--
-- FIX GỒM:
--   Bước 1: Deploy receipt_create_atomic v3 (có stock update trực tiếp)
--   Bước 2: Tạo RPC stock_ensure_update cho frontend fallback (bypass RLS)
--   Bước 3: RÀ SOÁT tất cả phiếu nhập → liệt kê phiếu chưa cộng stock
--   Bước 4: ĐỒNG BỘ stock cho TẤT CẢ sản phẩm bị lệch
--   Bước 5: Verification
-- ============================================================================


-- ============================================================================
-- BƯỚC 1: Deploy receipt_create_atomic v3 (CẬP NHẬT STOCK TRỰC TIẾP)
-- ============================================================================

DROP FUNCTION IF EXISTS public.receipt_create_atomic CASCADE;

CREATE OR REPLACE FUNCTION public.receipt_create_atomic(
  p_items JSONB,
  p_supplier_id TEXT,
  p_branch_id TEXT,
  p_user_id TEXT,
  p_notes TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
  v_part_id TEXT;
  v_part_name TEXT;
  v_quantity INT;
  v_import_price NUMERIC;
  v_selling_price NUMERIC;
  v_wholesale_price NUMERIC;
  v_current_stock INT;
  v_new_stock INT;
  v_total_price NUMERIC;
  v_tx_count INT := 0;
  v_date TIMESTAMPTZ := NOW();
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_part_id := v_item->>'partId';
    v_part_name := v_item->>'partName';
    v_quantity := (v_item->>'quantity')::INT;
    v_import_price := COALESCE((v_item->>'importPrice')::NUMERIC, 0);
    v_selling_price := (v_item->>'sellingPrice')::NUMERIC;
    v_wholesale_price := (v_item->>'wholesalePrice')::NUMERIC;
    v_total_price := v_quantity * v_import_price;

    IF v_part_id IS NULL OR v_quantity <= 0 THEN
      CONTINUE;
    END IF;

    -- 1. Lock row và lấy stock hiện tại
    SELECT COALESCE((stock->>p_branch_id)::int, 0)
    INTO v_current_stock
    FROM public.parts
    WHERE id = v_part_id
    FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    v_new_stock := v_current_stock + v_quantity;

    -- 2. ✅ Cập nhật stock TRỰC TIẾP (trigger đã bị xóa)
    UPDATE public.parts
    SET stock = jsonb_set(
      COALESCE(stock, '{}'::jsonb),
      ARRAY[p_branch_id],
      to_jsonb(v_new_stock),
      true
    )
    WHERE id = v_part_id;

    -- 3. Insert lịch sử nhập kho
    INSERT INTO public.inventory_transactions (
      id, type, "partId", "partName", quantity, date,
      "unitPrice", "totalPrice", "branchId", "supplierId", notes
    ) VALUES (
      gen_random_uuid()::text,
      'Nhập kho',
      v_part_id,
      v_part_name,
      v_quantity,
      v_date,
      v_import_price,
      v_total_price,
      p_branch_id,
      p_supplier_id,
      p_notes
    );

    v_tx_count := v_tx_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Nhập kho thành công',
    'txCount', v_tx_count
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.receipt_create_atomic TO authenticated;
COMMENT ON FUNCTION public.receipt_create_atomic IS 
  '2026-02-11v3: Nhập kho atomic - stock update trực tiếp (trigger đã xóa)';

DO $$ BEGIN RAISE NOTICE '✅ Bước 1 OK: receipt_create_atomic v3 deployed'; END $$;


-- ============================================================================
-- BƯỚC 2: Tạo RPC stock_ensure_update (SECURITY DEFINER - bypass RLS)
-- Frontend gọi qua supabase.rpc() thay vì .update() trực tiếp
-- ============================================================================

DROP FUNCTION IF EXISTS public.stock_ensure_update CASCADE;

CREATE OR REPLACE FUNCTION public.stock_ensure_update(
  p_part_id TEXT,
  p_branch_id TEXT,
  p_expected_stock INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock INT;
BEGIN
  SELECT COALESCE((stock->>p_branch_id)::int, 0)
  INTO v_current_stock
  FROM public.parts
  WHERE id = p_part_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('updated', false, 'reason', 'part_not_found');
  END IF;

  -- Chỉ cập nhật nếu stock hiện tại < expected (tránh ghi đè khi đã đúng)
  IF v_current_stock < p_expected_stock THEN
    UPDATE public.parts
    SET stock = jsonb_set(
      COALESCE(stock, '{}'::jsonb),
      ARRAY[p_branch_id],
      to_jsonb(p_expected_stock),
      true
    )
    WHERE id = p_part_id;

    RETURN jsonb_build_object(
      'updated', true, 
      'old_stock', v_current_stock, 
      'new_stock', p_expected_stock
    );
  END IF;

  RETURN jsonb_build_object(
    'updated', false, 
    'reason', 'stock_already_correct',
    'current_stock', v_current_stock
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.stock_ensure_update TO authenticated;
COMMENT ON FUNCTION public.stock_ensure_update IS 
  '2026-02-11: Fallback stock update - SECURITY DEFINER để bypass RLS';

DO $$ BEGIN RAISE NOTICE '✅ Bước 2 OK: stock_ensure_update RPC created'; END $$;


-- ============================================================================
-- BƯỚC 3: RÀ SOÁT - Liệt kê TẤT CẢ phiếu nhập và so sánh stock
-- ============================================================================

-- 3a. Liệt kê tất cả phiếu nhập gần đây
SELECT 
  COALESCE(
    (regexp_match(notes, 'NH-\d{8}-\d{3}'))[1],
    'NO-CODE-' || LEFT(id, 8)
  ) AS receipt_code,
  date::date AS receipt_date,
  COUNT(*) AS item_count,
  SUM(quantity) AS total_qty,
  SUM("totalPrice") AS total_value,
  STRING_AGG(DISTINCT "branchId", ', ') AS branch,
  STRING_AGG(
    "partName" || ' (nhập:' || quantity || 
    ', stock:' || COALESCE((
      SELECT (p.stock->>"branchId")::text 
      FROM parts p WHERE p.id = it."partId"
    ), '0') || ')',
    '; '
  ) AS items_detail
FROM inventory_transactions it
WHERE type = 'Nhập kho'
GROUP BY 
  COALESCE((regexp_match(notes, 'NH-\d{8}-\d{3}'))[1], 'NO-CODE-' || LEFT(id, 8)),
  date::date
ORDER BY date::date DESC
LIMIT 30;


-- 3b. CHI TIẾT: Sản phẩm có stock LỆCH so với inventory_transactions
SELECT 
  p.id,
  p.name,
  p.sku,
  b.branch_id,
  COALESCE((p.stock->>b.branch_id)::int, 0) AS stock_hien_tai,
  COALESCE(calc.total_in, 0) AS tong_nhap,
  COALESCE(calc.total_out, 0) AS tong_xuat,
  COALESCE(calc.calculated_stock, 0) AS stock_dung,
  COALESCE(calc.calculated_stock, 0) - COALESCE((p.stock->>b.branch_id)::int, 0) AS sai_lech,
  CASE 
    WHEN COALESCE(calc.calculated_stock, 0) - COALESCE((p.stock->>b.branch_id)::int, 0) > 0 
    THEN '🔴 THIẾU ' || (COALESCE(calc.calculated_stock, 0) - COALESCE((p.stock->>b.branch_id)::int, 0))
    WHEN COALESCE(calc.calculated_stock, 0) - COALESCE((p.stock->>b.branch_id)::int, 0) < 0 
    THEN '🟡 THỪA ' || ABS(COALESCE(calc.calculated_stock, 0) - COALESCE((p.stock->>b.branch_id)::int, 0))
    ELSE '✅ Đúng'
  END AS trang_thai
FROM public.parts p
CROSS JOIN (
  SELECT DISTINCT "branchId" AS branch_id FROM public.inventory_transactions
) b
LEFT JOIN (
  SELECT 
    "partId",
    "branchId",
    SUM(CASE WHEN type IN ('Nhập kho', 'Chuyển đến', 'Hoàn trả', 'Nhập hàng', 'Điều chỉnh tăng', 'Chuyển kho đến', 'Khởi tạo') THEN quantity ELSE 0 END) AS total_in,
    SUM(CASE WHEN type IN ('Xuất kho', 'Bán hàng', 'Chuyển đi', 'Sửa chữa', 'Điều chỉnh giảm', 'Chuyển kho đi') THEN quantity ELSE 0 END) AS total_out,
    SUM(
      CASE 
        WHEN type IN ('Nhập kho', 'Chuyển đến', 'Hoàn trả', 'Nhập hàng', 'Điều chỉnh tăng', 'Chuyển kho đến', 'Khởi tạo') THEN quantity
        WHEN type IN ('Xuất kho', 'Bán hàng', 'Chuyển đi', 'Sửa chữa', 'Điều chỉnh giảm', 'Chuyển kho đi') THEN -quantity
        ELSE 0
      END
    ) AS calculated_stock
  FROM public.inventory_transactions
  GROUP BY "partId", "branchId"
) calc ON calc."partId" = p.id AND calc."branchId" = b.branch_id
WHERE COALESCE((p.stock->>b.branch_id)::int, 0) != COALESCE(calc.calculated_stock, 0)
ORDER BY ABS(COALESCE(calc.calculated_stock, 0) - COALESCE((p.stock->>b.branch_id)::int, 0)) DESC;


-- ============================================================================
-- BƯỚC 4: ĐỒNG BỘ STOCK - Fix tất cả sản phẩm bị lệch MỘT LẦN  
-- ============================================================================
-- Công thức: stock = SUM(nhập) - SUM(xuất) từ inventory_transactions
-- Bao gồm TẤT CẢ loại transaction type có trong hệ thống

DO $$
DECLARE
  v_rec RECORD;
  v_fix_count INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '📋 BƯỚC 4: Đồng bộ stock từ inventory_transactions...';
  RAISE NOTICE '════════════════════════════════════════════════════════════';

  FOR v_rec IN 
    SELECT 
      p.id AS part_id,
      p.name AS part_name,
      p.sku,
      p.stock AS stock_json,
      b.branch_id,
      COALESCE((p.stock->>b.branch_id)::int, 0) AS current_stock,
      COALESCE(calc.calculated_stock, 0) AS correct_stock
    FROM public.parts p
    CROSS JOIN (
      SELECT DISTINCT "branchId" AS branch_id FROM public.inventory_transactions
    ) b
    LEFT JOIN (
      SELECT 
        "partId",
        "branchId",
        SUM(
          CASE 
            WHEN type IN ('Nhập kho', 'Chuyển đến', 'Hoàn trả', 'Nhập hàng', 'Điều chỉnh tăng', 'Chuyển kho đến', 'Khởi tạo') THEN quantity
            WHEN type IN ('Xuất kho', 'Bán hàng', 'Chuyển đi', 'Sửa chữa', 'Điều chỉnh giảm', 'Chuyển kho đi') THEN -quantity
            ELSE 0
          END
        ) AS calculated_stock
      FROM public.inventory_transactions
      GROUP BY "partId", "branchId"
    ) calc ON calc."partId" = p.id AND calc."branchId" = b.branch_id
    WHERE COALESCE((p.stock->>b.branch_id)::int, 0) != COALESCE(calc.calculated_stock, 0)
  LOOP
    UPDATE public.parts
    SET stock = jsonb_set(
      COALESCE(stock, '{}'::jsonb),
      ARRAY[v_rec.branch_id],
      to_jsonb(GREATEST(v_rec.correct_stock, 0)),
      true
    )
    WHERE id = v_rec.part_id;

    RAISE NOTICE '  ✏️  % (%) | branch=% | stock: % → %',
      v_rec.part_name, v_rec.sku, v_rec.branch_id,
      v_rec.current_stock, GREATEST(v_rec.correct_stock, 0);

    v_fix_count := v_fix_count + 1;
  END LOOP;

  RAISE NOTICE '';
  IF v_fix_count = 0 THEN
    RAISE NOTICE '  ✅ Tất cả stock đã khớp - không cần sửa!';
  ELSE
    RAISE NOTICE '  ✅ Đã sửa % sản phẩm bị lệch stock', v_fix_count;
  END IF;
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;


-- ============================================================================
-- BƯỚC 5: VERIFICATION - Kiểm tra kết quả sau fix
-- ============================================================================

-- 5a. Xác nhận không còn sản phẩm bị lệch
SELECT 
  'KIỂM TRA SAU FIX' AS test,
  CASE WHEN COUNT(*) = 0 
    THEN '✅ Tất cả stock đã khớp với inventory_transactions!'
    ELSE '❌ Còn ' || COUNT(*) || ' sản phẩm bị lệch!'
  END AS result
FROM public.parts p
CROSS JOIN (
  SELECT DISTINCT "branchId" AS branch_id FROM public.inventory_transactions
) b
LEFT JOIN (
  SELECT 
    "partId", "branchId",
    SUM(
      CASE 
        WHEN type IN ('Nhập kho', 'Chuyển đến', 'Hoàn trả', 'Nhập hàng', 'Điều chỉnh tăng', 'Chuyển kho đến', 'Khởi tạo') THEN quantity
        WHEN type IN ('Xuất kho', 'Bán hàng', 'Chuyển đi', 'Sửa chữa', 'Điều chỉnh giảm', 'Chuyển kho đi') THEN -quantity
        ELSE 0
      END
    ) AS calculated_stock
  FROM public.inventory_transactions
  GROUP BY "partId", "branchId"
) calc ON calc."partId" = p.id AND calc."branchId" = b.branch_id
WHERE COALESCE((p.stock->>b.branch_id)::int, 0) != COALESCE(calc.calculated_stock, 0);

-- 5b. Kiểm tra function versions
SELECT 
  proname AS function_name,
  COALESCE(obj_description(oid), 'NO COMMENT') AS version
FROM pg_proc
WHERE proname IN ('receipt_create_atomic', 'stock_ensure_update');

-- 5c. Spot-check: Phiếu NH-20260210-873
SELECT 
  it."partId",
  it."partName",
  it.quantity AS qty_nhap,
  it."unitPrice",
  COALESCE((p.stock->>it."branchId")::int, 0) AS stock_sau_fix
FROM inventory_transactions it
LEFT JOIN parts p ON p.id = it."partId"
WHERE it.notes LIKE '%NH-20260210-873%'
ORDER BY it."partName";

-- 5d. Spot-check: Phiếu NH-20260211-006
SELECT 
  it."partId",
  it."partName",
  it.quantity AS qty_nhap,
  it."unitPrice",
  COALESCE((p.stock->>it."branchId")::int, 0) AS stock_sau_fix
FROM inventory_transactions it
LEFT JOIN parts p ON p.id = it."partId"
WHERE it.notes LIKE '%NH-20260211-006%'
ORDER BY it."partName";

DO $$ BEGIN RAISE NOTICE '🎉 HOÀN TẤT: Đã rà soát và đồng bộ stock cho tất cả phiếu nhập!'; END $$;
