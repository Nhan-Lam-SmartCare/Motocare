-- =====================================================================
-- DATA-INTEGRITY FIX B2 — Close the oversell race in sale_create_atomic
-- Date: 2026-07-09
--
-- FINDING (from the LIVE definition, 2026-07-09):
--   The current sale_create_atomic already REJECTS oversell (it raises
--   INSUFFICIENT_STOCK and never clamps stock with GREATEST(0,...)). Good.
--   BUT it reads parts.stock WITHOUT "FOR UPDATE":
--       SELECT ... INTO v_current_stock, v_current_reserved
--       FROM parts WHERE id = v_part_id;         -- <-- no row lock
--   Two concurrent POS sales of the same part can both pass the availability
--   check and both deduct → oversell (stock goes below true available).
--   work_order_complete_payment already locks the row correctly.
--
-- FIX: add "FOR UPDATE" to the stock read so concurrent sales serialize on the
--   part row. This is the ONLY change; the rest of the function is unchanged
--   from the live version. Matches the chosen policy "block sales on shortage".
--
-- Idempotent (CREATE OR REPLACE). TEST ON DEMO FIRST, then production.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.sale_create_atomic(
  p_sale_id text, p_items jsonb, p_discount numeric, p_customer jsonb,
  p_payment_method text, p_user_id uuid DEFAULT NULL::uuid,
  p_user_name text DEFAULT NULL::text, p_branch_id text DEFAULT NULL::text,
  p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
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
  IF NOT public.mc_is_manager_or_owner() THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  IF p_branch_id IS DISTINCT FROM public.mc_current_branch() THEN
    RAISE EXCEPTION 'BRANCH_MISMATCH';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR v_items_count = 0 THEN
    RAISE EXCEPTION 'EMPTY_ITEMS';
  END IF;
  IF p_payment_method NOT IN ('cash','bank') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD';
  END IF;

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

  FOR v_index IN 0..(v_items_count - 1) LOOP
    v_item := p_items->v_index;
    v_part_id := (v_item->>'partId');
    v_part_name := COALESCE((v_item->>'partName'), (v_item->>'name'));
    v_quantity := COALESCE((v_item->>'quantity')::int, 0);

    v_is_quick_service := (v_part_id LIKE 'quick_service_%') OR COALESCE((v_item->>'isService')::boolean, false);
    IF v_is_quick_service THEN
      CONTINUE;
    END IF;

    -- >>> B2 FIX: lock the part row so concurrent sales can't both oversell.
    SELECT
      COALESCE((stock->>p_branch_id)::int, 0),
      COALESCE((reservedstock->>p_branch_id)::int, 0)
    INTO v_current_stock, v_current_reserved
    FROM parts
    WHERE id = v_part_id
    FOR UPDATE;

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
      'Bán hàng',
      p_sale_id
    );
    v_inventory_tx_count := v_inventory_tx_count + 1;
  END LOOP;

  IF jsonb_array_length(v_insufficient) > 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_insufficient::text;
  END IF;

  INSERT INTO sales(
    id, date, items, subtotal, discount, total, customer, paymentmethod,
    userid, username, branchid, note, cashtransactionid
  )
  VALUES (
    p_sale_id, NOW(), p_items, v_subtotal, p_discount, v_total, p_customer,
    p_payment_method, p_user_id, p_user_name, p_branch_id,
    NULLIF(TRIM(COALESCE(p_note, '')), ''), v_cash_tx_id
  )
  RETURNING sale_code INTO v_sale_code;

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
$function$;

-- ---------------------------------------------------------------------
-- VERIFY: the definition now contains "FOR UPDATE" in the deduction loop.
--   SELECT (pg_get_functiondef('public.sale_create_atomic'::regprocedure) ~ 'FOR UPDATE');  -- expect true
-- SMOKE TEST: a normal sale still succeeds; a sale exceeding available stock
--   still raises INSUFFICIENT_STOCK (unchanged behaviour, just race-safe now).
-- ---------------------------------------------------------------------
