-- ============================================================================
-- CẬP NHẬT: Tính giá vốn theo phương pháp bình quân gia quyền (WAC)
-- Ngày: 2026-02-21
-- ============================================================================
-- THAY ĐỔI:
--   receipt_create_atomic v3 → v4
--   Trước: costPrice bị GHI ĐÈ bằng giá nhập mới nhất
--   Sau:   costPrice tính theo WAC = (tồn_cũ × giá_cũ + nhập_mới × giá_mới)
--                                    / (tồn_cũ + nhập_mới)
--
-- VÍ DỤ:
--   Tồn: 10 cái × 10.000đ → nhập thêm 5 cái × 12.000đ
--   WAC = (10 × 10.000 + 5 × 12.000) / 15 = 160.000 / 15 ≈ 10.667đ
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
  v_item           JSONB;
  v_part_id        TEXT;
  v_part_name      TEXT;
  v_quantity       INT;
  v_import_price   NUMERIC;
  v_selling_price  NUMERIC;
  v_wholesale_price NUMERIC;
  v_current_stock  INT;
  v_old_cost       NUMERIC;
  v_wac            NUMERIC;
  v_new_stock      INT;
  v_total_price    NUMERIC;
  v_tx_count       INT := 0;
  v_date           TIMESTAMPTZ := NOW();
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_part_id         := v_item->>'partId';
    v_part_name       := v_item->>'partName';
    v_quantity        := (v_item->>'quantity')::INT;
    v_import_price    := COALESCE((v_item->>'importPrice')::NUMERIC, 0);
    v_selling_price   := (v_item->>'sellingPrice')::NUMERIC;
    v_wholesale_price := (v_item->>'wholesalePrice')::NUMERIC;
    v_total_price     := v_quantity * v_import_price;

    IF v_part_id IS NULL OR v_quantity <= 0 THEN
      CONTINUE;
    END IF;

    -- 1. Lock row, lấy stock hiện tại và giá vốn cũ
    SELECT
      COALESCE((stock->>p_branch_id)::INT, 0),
      COALESCE(("costPrice"->>p_branch_id)::NUMERIC, v_import_price)
    INTO v_current_stock, v_old_cost
    FROM public.parts
    WHERE id = v_part_id
    FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    v_new_stock := v_current_stock + v_quantity;

    -- 2. Tính WAC (bình quân gia quyền)
    --    Nếu tồn kho ≤ 0 → dùng giá nhập mới (không có hàng cũ để tính TB)
    IF v_current_stock <= 0 THEN
      v_wac := v_import_price;
    ELSE
      v_wac := ROUND(
        (v_current_stock::NUMERIC * v_old_cost + v_quantity::NUMERIC * v_import_price)
        / v_new_stock::NUMERIC
      , 0); -- Làm tròn đến đồng (không lẻ)
    END IF;

    -- 3. Cập nhật stock trực tiếp
    UPDATE public.parts
    SET stock = jsonb_set(
      COALESCE(stock, '{}'::jsonb),
      ARRAY[p_branch_id],
      to_jsonb(v_new_stock),
      true
    )
    WHERE id = v_part_id;

    -- 4. Insert lịch sử nhập kho
    INSERT INTO public.inventory_transactions (
      id, type, "partId", "partName", quantity, date,
      "unitPrice", "totalPrice", "branchId", notes
    ) VALUES (
      gen_random_uuid()::text,
      'Nhập kho',
      v_part_id,
      v_part_name,
      v_quantity,
      v_date,
      v_import_price,   -- Ghi giá nhập thực tế (không phải WAC)
      v_total_price,
      p_branch_id,
      p_notes
    );

    -- 5. Cập nhật giá vốn (WAC), giá bán lẻ, giá sỉ
    --    costPrice  → WAC (bình quân)
    --    retailPrice / wholesalePrice → giá mới nhất (ghi đè là đúng)
    UPDATE public.parts
    SET
      "costPrice" = jsonb_set(
        COALESCE("costPrice", '{}'::jsonb),
        ARRAY[p_branch_id],
        to_jsonb(v_wac),
        true
      ),
      "retailPrice" = jsonb_set(
        COALESCE("retailPrice", '{}'::jsonb),
        ARRAY[p_branch_id],
        to_jsonb(v_selling_price),
        true
      ),
      "wholesalePrice" = jsonb_set(
        COALESCE("wholesalePrice", '{}'::jsonb),
        ARRAY[p_branch_id],
        to_jsonb(COALESCE(v_wholesale_price, 0)),
        true
      )
    WHERE id = v_part_id;

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
  '2026-02-21v4: costPrice theo WAC (bình quân gia quyền), retailPrice/wholesalePrice ghi đè giá mới nhất';

DO $$ BEGIN RAISE NOTICE '✅ receipt_create_atomic v4 (WAC) deployed thành công'; END $$;
