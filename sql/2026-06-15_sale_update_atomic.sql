-- ============================================================================
-- MIGRATION: SỬA HÓA ĐƠN AN TOÀN TRONG 1 TRANSACTION (sale_update_atomic)
-- Ngày: 2026-06-15
-- Mục đích:
--   Trước đây luồng sửa hóa đơn ở client phải XÓA đơn cũ rồi TẠO đơn mới qua 2
--   lời gọi RPC riêng (sale_delete_atomic + sale_create_atomic). Nếu tạo mới
--   thất bại sau khi đã xóa, hóa đơn cũ bị mất (chỉ còn draft localStorage).
--
--   Hàm này gộp toàn bộ vào MỘT transaction:
--     1) Hoàn kho + xóa phiếu thu của hóa đơn cũ (giống sale_delete_atomic)
--     2) Trừ kho + tạo phiếu thu + ghi đè hóa đơn cũ bằng dữ liệu mới
--   Nếu bất kỳ bước nào lỗi -> rollback toàn bộ, hóa đơn cũ được giữ nguyên.
--
--   Đơn mới dùng LẠI cùng id (p_sale_id) để không phát sinh id mới, nhờ đó các
--   tham chiếu (sale_code giữ nguyên) không thay đổi.
-- ============================================================================

DROP FUNCTION IF EXISTS public.sale_update_atomic(TEXT, JSONB, NUMERIC, JSONB, TEXT, UUID, TEXT, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.sale_update_atomic(
  p_sale_id TEXT,
  p_items JSONB,
  p_discount NUMERIC,
  p_customer JSONB,
  p_payment_method TEXT,
  p_user_id UUID DEFAULT NULL,
  p_user_name TEXT DEFAULT NULL,
  p_branch_id TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_sale RECORD;
  v_old_item JSONB;
  v_old_part_id TEXT;
  v_old_quantity INT;

  v_subtotal NUMERIC := 0;
  v_total NUMERIC := 0;
  v_item JSONB;
  v_index INT := 0;
  v_items_count INT := jsonb_array_length(p_items);
  v_part_id TEXT;
  v_part_name TEXT;
  v_quantity INT;
  v_price NUMERIC;
  v_current_stock INT;
  v_current_reserved INT;
  v_available_stock INT;
  v_cash_tx_id TEXT := gen_random_uuid()::text;
  v_inventory_tx_count INT := 0;
  v_insufficient JSONB := '[]'::jsonb;
  v_sale_code TEXT;
  v_is_quick_service BOOLEAN;
BEGIN
  -- Quyền & chi nhánh (giống sale_create_atomic)
  IF NOT public.mc_is_manager_or_owner() THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  IF p_branch_id IS DISTINCT FROM public.mc_current_branch() THEN
    RAISE EXCEPTION 'BRANCH_MISMATCH';
  END IF;

  -- Validate payload mới
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR v_items_count = 0 THEN
    RAISE EXCEPTION 'EMPTY_ITEMS';
  END IF;
  IF p_payment_method NOT IN ('cash','bank') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD';
  END IF;

  -- Lấy hóa đơn cũ
  SELECT * INTO v_old_sale FROM public.sales WHERE id = p_sale_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SALE_NOT_FOUND:%', p_sale_id;
  END IF;

  -- ============================================================
  -- BƯỚC 1: HOÀN KHO HÓA ĐƠN CŨ
  -- ============================================================
  FOR v_old_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_old_sale.items, '[]'::jsonb))
  LOOP
    v_old_part_id := v_old_item->>'partId';
    v_old_quantity := COALESCE((v_old_item->>'quantity')::int, 0);

    IF v_old_part_id IS NOT NULL
      AND v_old_part_id <> ''
      AND v_old_part_id NOT LIKE 'quick_service_%'
      AND NOT COALESCE((v_old_item->>'isService')::boolean, false)
      AND v_old_quantity > 0
    THEN
      UPDATE public.parts
      SET stock = jsonb_set(
        COALESCE(stock, '{}'::jsonb),
        ARRAY[COALESCE(v_old_sale.branchid, p_branch_id)],
        to_jsonb(COALESCE((stock->>COALESCE(v_old_sale.branchid, p_branch_id))::int, 0) + v_old_quantity),
        true
      )
      WHERE id = v_old_part_id;

      INSERT INTO public.inventory_transactions(
        id, type, "partId", "partName", quantity, "branchId", notes, date
      )
      VALUES (
        gen_random_uuid()::text,
        'Nhập kho',
        v_old_part_id,
        COALESCE(v_old_item->>'partName', v_old_item->>'name'),
        v_old_quantity,
        COALESCE(v_old_sale.branchid, p_branch_id),
        'Hoàn kho - sửa hóa đơn ' || COALESCE(v_old_sale.sale_code, p_sale_id),
        NOW()
      );
    END IF;
  END LOOP;

  -- Xóa phiếu thu của hóa đơn cũ (giống sale_delete_atomic)
  DELETE FROM public.cash_transactions
  WHERE id = v_old_sale.cashtransactionid
     OR saleid = p_sale_id
     OR reference IN (p_sale_id, COALESCE(v_old_sale.sale_code, p_sale_id))
     OR (
       category = 'sale_income'
       AND (
         description ILIKE '%' || p_sale_id || '%'
         OR (v_old_sale.sale_code IS NOT NULL AND description ILIKE '%' || v_old_sale.sale_code || '%')
       )
     );

  -- ============================================================
  -- BƯỚC 2: TÍNH TIỀN ĐƠN MỚI + VALIDATE ITEM
  -- ============================================================
  FOR v_index IN 0..(v_items_count - 1) LOOP
    v_item := p_items->v_index;
    v_part_id := (v_item->>'partId');
    v_part_name := COALESCE((v_item->>'partName'), (v_item->>'name'));
    v_quantity := COALESCE((v_item->>'quantity')::int, 0);
    v_price := COALESCE((v_item->>'sellingPrice')::numeric, (v_item->>'price')::numeric, 0);

    IF v_part_id IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_ITEM';
    END IF;
    v_subtotal := v_subtotal + (v_price * v_quantity);
  END LOOP;

  v_total := GREATEST(0, v_subtotal - COALESCE(p_discount, 0));

  -- ============================================================
  -- BƯỚC 3: TRỪ KHO CHO ĐƠN MỚI (sau khi đã hoàn kho cũ ở trên,
  -- tồn kho khả dụng đã phản ánh đúng để check)
  -- ============================================================
  FOR v_index IN 0..(v_items_count - 1) LOOP
    v_item := p_items->v_index;
    v_part_id := (v_item->>'partId');
    v_part_name := COALESCE((v_item->>'partName'), (v_item->>'name'));
    v_quantity := COALESCE((v_item->>'quantity')::int, 0);

    v_is_quick_service := (v_part_id LIKE 'quick_service_%') OR COALESCE((v_item->>'isService')::boolean, false);
    IF v_is_quick_service THEN
      CONTINUE;
    END IF;

    SELECT
      COALESCE((stock->>p_branch_id)::int, 0),
      COALESCE((reservedstock->>p_branch_id)::int, 0)
    INTO v_current_stock, v_current_reserved
    FROM parts
    WHERE id = v_part_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PART_NOT_FOUND';
    END IF;

    v_available_stock := v_current_stock - v_current_reserved;

    IF v_available_stock < v_quantity THEN
      v_insufficient := v_insufficient || jsonb_build_array(jsonb_build_object(
        'partId', v_part_id,
        'partName', v_part_name,
        'available', v_available_stock,
        'requested', v_quantity
      ));
      CONTINUE;
    END IF;

    UPDATE parts
    SET stock = jsonb_set(stock, ARRAY[p_branch_id], to_jsonb(v_current_stock - v_quantity), true)
    WHERE id = v_part_id;

    INSERT INTO inventory_transactions(id, type, "partId", "partName", quantity, date, "unitPrice", "totalPrice", "branchId", notes, "saleId")
    VALUES (
      gen_random_uuid()::text,
      'Xuất kho',
      v_part_id,
      v_part_name,
      v_quantity,
      NOW(),
      public.mc_avg_cost(v_part_id, p_branch_id),
      public.mc_avg_cost(v_part_id, p_branch_id) * v_quantity,
      p_branch_id,
      'Bán hàng (sửa đơn)',
      p_sale_id
    );
    v_inventory_tx_count := v_inventory_tx_count + 1;
  END LOOP;

  IF jsonb_array_length(v_insufficient) > 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_insufficient::text;
  END IF;

  -- ============================================================
  -- BƯỚC 4: GHI ĐÈ HÓA ĐƠN CŨ BẰNG DỮ LIỆU MỚI (giữ nguyên id & sale_code)
  -- ============================================================
  UPDATE public.sales
  SET
    items = p_items,
    subtotal = v_subtotal,
    discount = p_discount,
    total = v_total,
    customer = p_customer,
    paymentmethod = p_payment_method,
    userid = p_user_id,
    username = p_user_name,
    branchid = p_branch_id,
    note = NULLIF(TRIM(COALESCE(p_note, '')), ''),
    cashtransactionid = v_cash_tx_id
  WHERE id = p_sale_id
  RETURNING sale_code INTO v_sale_code;

  -- Tạo phiếu thu mới cho đơn đã sửa
  INSERT INTO cash_transactions(id, type, category, amount, date, description, branchid, paymentsource, reference, saleid)
  VALUES (
    v_cash_tx_id,
    'income',
    'sale_income',
    v_total,
    NOW(),
    'Thu từ hóa đơn ' || COALESCE(v_sale_code, p_sale_id),
    p_branch_id,
    p_payment_method,
    COALESCE(v_sale_code, p_sale_id),
    p_sale_id
  );

  RETURN jsonb_build_object(
    'sale', (SELECT row_to_json(s) FROM sales s WHERE s.id = p_sale_id),
    'cashTransactionId', v_cash_tx_id,
    'inventoryTxCount', v_inventory_tx_count
  );
END;
$$;

COMMENT ON FUNCTION public.sale_update_atomic IS 'Sửa hóa đơn an toàn trong 1 transaction: hoàn kho đơn cũ + trừ kho đơn mới + ghi đè (giữ nguyên id/sale_code). Rollback toàn bộ nếu lỗi.';

GRANT EXECUTE ON FUNCTION public.sale_update_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.sale_update_atomic TO service_role;
