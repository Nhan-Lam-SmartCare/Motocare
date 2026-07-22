-- ===================================================================
-- MOTOCARE V2 - SYSTEM FUNCTIONS (PART 2 - UPDATE & REFUND)
-- Supabase Project V2 (public schema)
-- ===================================================================

-- 1. ATOMIC WORK ORDER UPDATE (Cập nhật phiếu sửa chữa & Điều chỉnh kho)
CREATE OR REPLACE FUNCTION public.work_order_update_atomic(
  p_order_id text,
  p_customer_name text,
  p_customer_phone text,
  p_vehicle_model text,
  p_license_plate text,
  p_vehicle_id text DEFAULT NULL,
  p_current_km integer DEFAULT NULL,
  p_issue_description text DEFAULT '',
  p_technician_name text DEFAULT '',
  p_status text DEFAULT 'Tiếp nhận',
  p_labor_cost numeric DEFAULT 0,
  p_discount numeric DEFAULT 0,
  p_parts_used jsonb DEFAULT '[]'::jsonb,
  p_additional_services jsonb DEFAULT NULL,
  p_total numeric DEFAULT 0,
  p_payment_status text DEFAULT 'unpaid',
  p_payment_method text DEFAULT NULL,
  p_deposit_amount numeric DEFAULT 0,
  p_additional_payment numeric DEFAULT 0,
  p_user_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_order RECORD;
  v_item RECORD;
  v_new_part JSONB;
  v_part_id TEXT;
  v_part_name TEXT;
  v_price NUMERIC;
  v_quantity INT;
  v_old_quantity INT;
  v_quantity_diff INT;
  v_current_stock INT;
  v_current_reserved INT;
  v_available INT;
  v_branch_id TEXT;
  v_deposit_tx_id TEXT;
  v_payment_tx_id TEXT;
  v_old_deposit NUMERIC;
  v_old_additional NUMERIC;
  v_old_cash_tx_id TEXT;
  v_warnings JSONB := '[]'::jsonb;
  v_index INT := 0;
  v_parts_count INT := COALESCE(jsonb_array_length(p_parts_used), 0);
  v_user_branch TEXT;
  v_error_msg TEXT;
  v_valid_part_id TEXT;

  -- State control variables
  v_old_inventory_deducted BOOLEAN;
  v_new_inventory_deducted BOOLEAN;
  v_insufficient JSONB := '[]'::jsonb;
BEGIN
  -- Branch resolution
  SELECT branch_id INTO v_user_branch FROM public.profiles WHERE id = auth.uid();
  
  SELECT * INTO v_old_order
  FROM public.work_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: %', p_order_id;
  END IF;

  -- RECORD vars cannot share a multi-item INTO list — derive the flag separately.
  v_old_inventory_deducted :=
    COALESCE((v_old_order.additionalservices->>'inventory_deducted')::boolean, FALSE);

  v_branch_id := v_old_order.branchid;
  IF v_user_branch IS NULL THEN
    v_user_branch := v_branch_id;
  END IF;

  IF v_branch_id IS DISTINCT FROM v_user_branch THEN
    RAISE EXCEPTION 'BRANCH_MISMATCH';
  END IF;

  IF p_status NOT IN ('Tiếp nhận', 'Đang sửa', 'Đã sửa xong', 'Trả máy') THEN
    RAISE EXCEPTION 'INVALID_STATUS: %', p_status;
  END IF;
  IF p_payment_status NOT IN ('unpaid', 'paid', 'partial') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_STATUS: %', p_payment_status;
  END IF;

  v_new_inventory_deducted := (p_status = 'Trả máy' OR p_payment_status = 'paid');

  -- STEP 1: Handle inventory changes (revert old state from work_order_items)
  IF NOT v_old_inventory_deducted AND NOT v_new_inventory_deducted THEN
    -- Scenario: Reserved -> Reserved. Just revert old reservations.
    FOR v_item IN SELECT * FROM public.work_order_items WHERE work_order_id = p_order_id AND part_id IS NOT NULL
    LOOP
      SELECT COALESCE((reservedstock->>v_branch_id)::int, 0) INTO v_current_reserved
      FROM public.parts WHERE id = v_item.part_id FOR UPDATE;

      UPDATE public.parts
      SET reservedstock = jsonb_set(
        COALESCE(reservedstock, '{}'::jsonb),
        ARRAY[v_branch_id],
        to_jsonb(GREATEST(0, v_current_reserved - v_item.quantity))
      )
      WHERE id = v_item.part_id;
    END LOOP;

  ELSIF NOT v_old_inventory_deducted AND v_new_inventory_deducted THEN
    -- Scenario: Reserved -> Deducted. Release all old reservations first.
    FOR v_item IN SELECT * FROM public.work_order_items WHERE work_order_id = p_order_id AND part_id IS NOT NULL
    LOOP
      SELECT COALESCE((reservedstock->>v_branch_id)::int, 0) INTO v_current_reserved
      FROM public.parts WHERE id = v_item.part_id FOR UPDATE;

      UPDATE public.parts
      SET reservedstock = jsonb_set(
        COALESCE(reservedstock, '{}'::jsonb),
        ARRAY[v_branch_id],
        to_jsonb(GREATEST(0, v_current_reserved - v_item.quantity))
      )
      WHERE id = v_item.part_id;
    END LOOP;

  ELSIF v_old_inventory_deducted AND v_new_inventory_deducted THEN
    -- Scenario: Deducted -> Deducted. Revert stock deduction so we can recalculate it.
    FOR v_item IN SELECT * FROM public.work_order_items WHERE work_order_id = p_order_id AND part_id IS NOT NULL
    LOOP
      SELECT COALESCE((stock->>v_branch_id)::int, 0) INTO v_current_stock
      FROM public.parts WHERE id = v_item.part_id FOR UPDATE;

      UPDATE public.parts
      SET stock = jsonb_set(
        COALESCE(stock, '{}'::jsonb),
        ARRAY[v_branch_id],
        to_jsonb(v_current_stock + v_item.quantity),
        true
      )
      WHERE id = v_item.part_id;

      -- Write reversing stock transaction
      INSERT INTO public.inventory_transactions(id, type, partid, partname, quantity, branchid, notes, date, totalprice)
      VALUES (
        gen_random_uuid()::text,
        'Nhập kho',
        v_item.part_id,
        v_item.part_name,
        v_item.quantity,
        v_branch_id,
        'Hoàn kho - chỉnh sửa phiếu sửa chữa ' || p_order_id,
        NOW(),
        0
      );
    END LOOP;

  ELSIF v_old_inventory_deducted AND NOT v_new_inventory_deducted THEN
    -- Scenario: Deducted -> Reserved (Rare rollback). Revert stock deduction.
    FOR v_item IN SELECT * FROM public.work_order_items WHERE work_order_id = p_order_id AND part_id IS NOT NULL
    LOOP
      SELECT COALESCE((stock->>v_branch_id)::int, 0) INTO v_current_stock
      FROM public.parts WHERE id = v_item.part_id FOR UPDATE;

      UPDATE public.parts
      SET stock = jsonb_set(
        COALESCE(stock, '{}'::jsonb),
        ARRAY[v_branch_id],
        to_jsonb(v_current_stock + v_item.quantity),
        true
      )
      WHERE id = v_item.part_id;
    END LOOP;
  END IF;

  -- STEP 2: Clear old work_order_items to rebuild them
  DELETE FROM public.work_order_items WHERE work_order_id = p_order_id;

  -- STEP 3: Apply new stock changes and populate work_order_items
  IF v_parts_count > 0 THEN
    WHILE v_index < v_parts_count LOOP
      v_new_part := p_parts_used->v_index;
      v_part_id := v_new_part->>'partId';
      v_part_name := COALESCE(v_new_part->>'partName', v_new_part->>'name');
      v_quantity := COALESCE((v_new_part->>'quantity')::int, 0);
      v_price := COALESCE((v_new_part->>'sellingPrice')::numeric, (v_new_part->>'price')::numeric, 0);

      IF v_quantity > 0 THEN
        SELECT id INTO v_valid_part_id FROM public.parts WHERE id = v_part_id;

        IF v_valid_part_id IS NOT NULL THEN
          SELECT 
            COALESCE((stock->>v_branch_id)::int, 0),
            COALESCE((reservedstock->>v_branch_id)::int, 0)
          INTO v_current_stock, v_current_reserved
          FROM public.parts WHERE id = v_part_id FOR UPDATE;

          IF v_new_inventory_deducted THEN
            -- Deduct stock directly
            IF v_current_stock < v_quantity THEN
              v_insufficient := v_insufficient || jsonb_build_object(
                'partId', v_part_id,
                'partName', v_part_name,
                'requested', v_quantity,
                'available', v_current_stock
              );
            ELSE
              UPDATE public.parts
              SET stock = jsonb_set(stock, ARRAY[v_branch_id], to_jsonb(v_current_stock - v_quantity), true)
              WHERE id = v_part_id;

              INSERT INTO public.inventory_transactions(id, type, partid, partname, quantity, date, unitprice, totalprice, branchid, notes, workorderid)
              VALUES (
                gen_random_uuid()::text,
                'Xuất kho',
                v_part_id,
                v_part_name,
                v_quantity,
                NOW(),
                public.mc_avg_cost(v_part_id, v_branch_id),
                public.mc_avg_cost(v_part_id, v_branch_id) * v_quantity,
                v_branch_id,
                'Xuất kho (cập nhật phiếu)',
                p_order_id
              );
            END IF;
          ELSE
            -- Reserve stock
            v_available := v_current_stock - v_current_reserved;
            IF v_available < v_quantity THEN
              v_warnings := v_warnings || jsonb_build_object(
                'partId', v_part_id,
                'partName', v_part_name,
                'requested', v_quantity,
                'available', v_available
              );
            END IF;

            UPDATE public.parts
            SET reservedstock = jsonb_set(
              COALESCE(reservedstock, '{}'::jsonb),
              ARRAY[v_branch_id],
              to_jsonb(v_current_reserved + v_quantity)
            )
            WHERE id = v_part_id;
          END IF;

          -- Insert new item
          INSERT INTO public.work_order_items (id, work_order_id, part_id, part_name, sku, category, quantity, price, cost_price)
          VALUES (
            p_order_id || '_' || (v_index + 1),
            p_order_id,
            v_part_id,
            v_part_name,
            v_new_part->>'sku',
            v_new_part->>'category',
            v_quantity,
            v_price,
            public.mc_avg_cost(v_part_id, v_branch_id)
          );
        ELSE
          -- Legacy / Quick service
          INSERT INTO public.migration_errors (source_table, source_id, item_index, reason, severity, payload)
          VALUES ('work_order_items', p_order_id, v_index, 'orphan_part_id', 'warning', v_new_part);

          INSERT INTO public.work_order_items (id, work_order_id, part_id, part_name, sku, category, quantity, price, cost_price)
          VALUES (p_order_id || '_' || (v_index + 1), p_order_id, NULL, v_part_name, 'SERVICE', NULL, v_quantity, v_price, NULL);
        END IF;
      END IF;

      v_index := v_index + 1;
    END LOOP;
  END IF;

  IF jsonb_array_length(v_insufficient) > 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_insufficient::text;
  END IF;

  -- STEP 4: Financial differences (Deposit / Payment updates)
  -- Re-link cash transactions or adjust ledger
  IF p_deposit_amount > COALESCE(v_old_order.depositamount, 0) AND p_payment_method IS NOT NULL THEN
    v_deposit_tx_id := gen_random_uuid()::text;
    INSERT INTO public.cash_transactions(id, category, amount, date, description, branchid, paymentsource, reference, created_by)
    VALUES (v_deposit_tx_id, 'service_deposit', p_deposit_amount - COALESCE(v_old_order.depositamount, 0), NOW(), 'Đặt cọc bổ sung ' || p_order_id, v_branch_id, p_payment_method, p_order_id, p_user_id);
  END IF;

  -- Clean old cash transactions and insert new payment if adjusted
  IF p_additional_payment > 0 AND p_payment_method IS NOT NULL THEN
    IF p_additional_payment > COALESCE(v_old_order.additionalpayment, 0) OR (COALESCE(v_old_order.additionalpayment, 0) > 0 AND v_old_order.cashtransactionid IS NULL) THEN
      v_payment_tx_id := gen_random_uuid()::text;
      INSERT INTO public.cash_transactions(id, category, amount, date, description, branchid, paymentsource, reference, created_by)
      VALUES (
        v_payment_tx_id, 
        'service_income', 
        CASE WHEN p_additional_payment > COALESCE(v_old_order.additionalpayment, 0) THEN p_additional_payment - COALESCE(v_old_order.additionalpayment, 0) ELSE p_additional_payment END, 
        NOW(), 
        'Thu tiền bổ sung ' || p_order_id, 
        v_branch_id, 
        p_payment_method, 
        p_order_id, 
        p_user_id
      );
    END IF;
  END IF;

  -- STEP 5: Update Work Order
  UPDATE public.work_orders
  SET
    customername = COALESCE(p_customer_name, customername),
    customerphone = COALESCE(p_customer_phone, customerphone),
    vehiclemodel = COALESCE(p_vehicle_model, vehiclemodel),
    licenseplate = COALESCE(p_license_plate, licenseplate),
    vehicleid = COALESCE(p_vehicle_id, vehicleid),
    currentkm = COALESCE(p_current_km, currentkm),
    issuedescription = COALESCE(p_issue_description, issuedescription),
    technicianname = COALESCE(p_technician_name, technicianname),
    status = COALESCE(p_status, status),
    laborcost = COALESCE(p_labor_cost, laborcost),
    discount = COALESCE(p_discount, discount),
    partsused = COALESCE(p_parts_used, partsused),
    additionalservices = jsonb_set(COALESCE(p_additional_services, '[]'::jsonb), ARRAY['inventory_deducted'], to_jsonb(v_new_inventory_deducted), true),
    total = COALESCE(p_total, total),
    paymentstatus = COALESCE(p_payment_status, paymentstatus),
    paymentmethod = COALESCE(p_payment_method, paymentmethod),
    depositamount = CASE WHEN p_deposit_amount > 0 THEN p_deposit_amount ELSE depositamount END,
    additionalpayment = CASE WHEN p_additional_payment > 0 THEN p_additional_payment ELSE additionalpayment END,
    totalpaid = COALESCE(p_deposit_amount, depositamount, 0) + COALESCE(p_additional_payment, additionalpayment, 0),
    remainingamount = COALESCE(p_total, total) - (COALESCE(p_deposit_amount, depositamount, 0) + COALESCE(p_additional_payment, additionalpayment, 0)),
    deposittransactionid = COALESCE(v_deposit_tx_id, deposittransactionid),
    cashtransactionid = COALESCE(v_payment_tx_id, cashtransactionid),
    depositdate = CASE WHEN v_deposit_tx_id IS NOT NULL THEN NOW() ELSE depositdate END,
    paymentdate = CASE WHEN v_payment_tx_id IS NOT NULL THEN NOW() ELSE paymentdate END,
    inventory_deducted = v_new_inventory_deducted
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'workOrder', (SELECT row_to_json(w.*) FROM public.work_orders w WHERE w.id = p_order_id),
    'depositTransactionId', v_deposit_tx_id,
    'paymentTransactionId', v_payment_tx_id,
    'stockWarnings', v_warnings,
    'inventoryDeducted', v_new_inventory_deducted
  );
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
  RAISE EXCEPTION 'work_order_update_atomic error: %', v_error_msg;
END;
$$;

-- 2. ATOMIC WORK ORDER REFUND (Hủy phiếu dịch vụ)
CREATE OR REPLACE FUNCTION public.work_order_refund_atomic(
  p_order_id TEXT,
  p_refund_reason TEXT,
  p_user_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_row RECORD;
  v_item RECORD;
  v_current_stock INT;
  v_current_reserved INT;
  v_refund_tx_id TEXT;
  v_total_refund NUMERIC := 0;
  v_result JSONB;
  v_branch_id TEXT;
BEGIN
  IF NOT public.mc_is_manager_or_owner() THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT * INTO v_order_row FROM public.work_orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF v_order_row.refunded = TRUE THEN
    RAISE EXCEPTION 'ALREADY_REFUNDED';
  END IF;

  v_branch_id := v_order_row.branchid;
  IF v_branch_id IS DISTINCT FROM public.mc_current_branch() THEN
    RAISE EXCEPTION 'BRANCH_MISMATCH';
  END IF;

  -- 1. Restore stock / Release reservations using work_order_items
  FOR v_item IN SELECT * FROM public.work_order_items WHERE work_order_id = p_order_id AND part_id IS NOT NULL
  LOOP
    SELECT 
      COALESCE((stock->>v_branch_id)::int, 0),
      COALESCE((reservedstock->>v_branch_id)::int, 0)
    INTO v_current_stock, v_current_reserved
    FROM public.parts WHERE id = v_item.part_id FOR UPDATE;

    IF COALESCE(v_order_row.inventory_deducted, FALSE) THEN
      -- Revert stock deduction
      UPDATE public.parts
      SET stock = jsonb_set(stock, ARRAY[v_branch_id], to_jsonb(v_current_stock + v_item.quantity), true)
      WHERE id = v_item.part_id;

      -- Insert inventory transaction
      INSERT INTO public.inventory_transactions(id, type, partid, partname, quantity, date, unitprice, totalprice, branchid, notes, workorderid)
      VALUES (
        gen_random_uuid()::text,
        'Nhập kho',
        v_item.part_id,
        v_item.part_name,
        v_item.quantity,
        NOW(),
        public.mc_avg_cost(v_item.part_id, v_branch_id),
        public.mc_avg_cost(v_item.part_id, v_branch_id) * v_item.quantity,
        v_branch_id,
        'Hoàn trả do hủy phiếu: ' || COALESCE(p_refund_reason, ''),
        p_order_id
      );
    ELSE
      -- Release reservation
      UPDATE public.parts
      SET reservedstock = jsonb_set(COALESCE(reservedstock, '{}'::jsonb), ARRAY[v_branch_id], to_jsonb(GREATEST(0, v_current_reserved - v_item.quantity)), true)
      WHERE id = v_item.part_id;
    END IF;
  END LOOP;

  -- 2. Financial Refund
  v_total_refund := COALESCE(v_order_row.totalpaid, 0);

  IF v_total_refund > 0 AND v_order_row.paymentmethod IS NOT NULL THEN
    v_refund_tx_id := gen_random_uuid()::text;
    INSERT INTO public.cash_transactions(id, type, category, amount, date, description, branchid, paymentsource, reference)
    VALUES (v_refund_tx_id, 'expense', 'refund', -v_total_refund, NOW(), 'Hoàn tiền hủy phiếu ' || p_order_id || ' - ' || COALESCE(p_refund_reason, ''), v_branch_id, v_order_row.paymentmethod, p_order_id);
  END IF;

  -- 3. Update Order Status
  UPDATE public.work_orders
  SET
    refunded = TRUE,
    refunded_at = NOW(),
    refund_transaction_id = v_refund_tx_id,
    refund_reason = p_refund_reason,
    status = 'Đã hủy',
    paymentstatus = 'refunded'
  WHERE id = p_order_id;

  SELECT jsonb_build_object(
    'workOrder', to_jsonb(w.*),
    'refund_transaction_id', v_refund_tx_id,
    'refundAmount', v_total_refund,
    'inventoryRestored', COALESCE(v_order_row.inventory_deducted, FALSE)
  ) INTO v_result
  FROM public.work_orders w WHERE w.id = p_order_id;

  -- 4. Audit Log
  BEGIN
    INSERT INTO public.audit_logs(id, created_by, action, table_name, record_id, old_data, new_data)
    VALUES (gen_random_uuid()::text, p_user_id, 'work_order.refund', 'work_orders', p_order_id, to_jsonb(v_order_row), v_result->'workOrder');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_result;
END;
$$;

-- 3. ATOMIC RETAIL SALE UPDATE (Sửa hóa đơn POS)
CREATE OR REPLACE FUNCTION public.sale_update_atomic(
  p_sale_id TEXT,
  p_items JSONB,
  p_discount NUMERIC,
  p_customer JSONB,
  p_payment_method TEXT,
  p_user_id uuid DEFAULT NULL,
  p_user_name TEXT DEFAULT NULL,
  p_branch_id TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_sale RECORD;
  v_item_row RECORD;
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
  v_valid_part_id TEXT;
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

  SELECT * INTO v_old_sale FROM public.sales WHERE id = p_sale_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SALE_NOT_FOUND:%', p_sale_id;
  END IF;

  -- STEP 1: Revert old stock deduction using sale_items
  FOR v_item_row IN SELECT * FROM public.sale_items WHERE sale_id = p_sale_id AND part_id IS NOT NULL
  LOOP
    SELECT COALESCE((stock->>p_branch_id)::int, 0) INTO v_current_stock
    FROM public.parts WHERE id = v_item_row.part_id FOR UPDATE;

    UPDATE public.parts
    SET stock = jsonb_set(COALESCE(stock, '{}'::jsonb), ARRAY[p_branch_id], to_jsonb(v_current_stock + v_item_row.quantity), true)
    WHERE id = v_item_row.part_id;

    -- Inventory history reversal
    INSERT INTO public.inventory_transactions(id, type, partid, partname, quantity, branchid, notes, date, totalprice)
    VALUES (
      gen_random_uuid()::text,
      'Nhập kho',
      v_item_row.part_id,
      v_item_row.part_name,
      v_item_row.quantity,
      p_branch_id,
      'Hoàn kho - sửa hóa đơn ' || COALESCE(v_old_sale.sale_code, p_sale_id),
      NOW(),
      0
    );
  END LOOP;

  -- Clear old sale_items
  DELETE FROM public.sale_items WHERE sale_id = p_sale_id;

  -- Delete linked cash transactions
  DELETE FROM public.cash_transactions
  WHERE id = v_old_sale.cashtransactionid
     OR saleid = p_sale_id
     OR reference IN (p_sale_id, COALESCE(v_old_sale.sale_code, p_sale_id));

  -- STEP 2: Calculate new pricing & validation
  FOR v_index IN 0..(v_items_count - 1) LOOP
    v_item := p_items->v_index;
    v_part_id := (v_item->>'partId');
    v_price := COALESCE((v_item->>'sellingPrice')::numeric, (v_item->>'price')::numeric, 0);
    v_quantity := COALESCE((v_item->>'quantity')::int, 0);

    IF v_part_id IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_ITEM';
    END IF;
    v_subtotal := v_subtotal + (v_price * v_quantity);
  END LOOP;

  v_total := GREATEST(0, v_subtotal - COALESCE(p_discount, 0));

  -- STEP 3: Deduct stock and populate new sale_items
  FOR v_index IN 0..(v_items_count - 1) LOOP
    v_item := p_items->v_index;
    v_part_id := (v_item->>'partId');
    v_part_name := COALESCE((v_item->>'partName'), (v_item->>'name'));
    v_quantity := COALESCE((v_item->>'quantity')::int, 0);
    v_price := COALESCE((v_item->>'sellingPrice')::numeric, (v_item->>'price')::numeric, 0);

    v_is_quick_service := (v_part_id LIKE 'quick_service_%') OR COALESCE((v_item->>'isService')::boolean, false);
    
    IF v_is_quick_service THEN
      INSERT INTO public.sale_items (id, sale_id, part_id, part_name, sku, quantity, price, cost_price)
      VALUES (p_sale_id || '_' || (v_index + 1), p_sale_id, NULL, v_part_name, COALESCE(v_item->>'sku', 'SERVICE'), v_quantity, v_price, NULL);
      CONTINUE;
    END IF;

    SELECT id INTO v_valid_part_id FROM public.parts WHERE id = v_part_id;
    IF v_valid_part_id IS NULL THEN
      INSERT INTO public.migration_errors (source_table, source_id, item_index, reason, severity, payload)
      VALUES ('sale_items_update', p_sale_id, v_index, 'orphan_part_id', 'warning', v_item);

      INSERT INTO public.sale_items (id, sale_id, part_id, part_name, sku, quantity, price, cost_price)
      VALUES (p_sale_id || '_' || (v_index + 1), p_sale_id, NULL, v_part_name, 'ORPHAN', v_quantity, v_price, NULL);
      CONTINUE;
    END IF;

    SELECT
      COALESCE((stock->>p_branch_id)::int, 0),
      COALESCE((reservedstock->>p_branch_id)::int, 0)
    INTO v_current_stock, v_current_reserved
    FROM public.parts WHERE id = v_part_id FOR UPDATE;

    v_available_stock := v_current_stock - v_current_reserved;

    IF v_available_stock < v_quantity THEN
      v_insufficient := v_insufficient || jsonb_build_object(
        'partId', v_part_id,
        'partName', v_part_name,
        'available', v_available_stock,
        'requested', v_quantity
      );
      CONTINUE;
    END IF;

    -- Update stock
    UPDATE public.parts
    SET stock = jsonb_set(stock, ARRAY[p_branch_id], to_jsonb(v_current_stock - v_quantity), true)
    WHERE id = v_part_id;

    -- Insert sale item
    INSERT INTO public.sale_items (id, sale_id, part_id, part_name, sku, quantity, price, cost_price)
    VALUES (
      p_sale_id || '_' || (v_index + 1),
      p_sale_id,
      v_part_id,
      v_part_name,
      v_item->>'sku',
      v_quantity,
      v_price,
      public.mc_avg_cost(v_part_id, p_branch_id)
    );

    -- Insert stock transaction
    INSERT INTO public.inventory_transactions(id, type, partid, partname, quantity, date, unitprice, totalprice, branchid, notes, saleid)
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
      'Bán hàng (sửa đơn V2)',
      p_sale_id
    );
    v_inventory_tx_count := v_inventory_tx_count + 1;
  END LOOP;

  IF jsonb_array_length(v_insufficient) > 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_insufficient::text;
  END IF;

  -- STEP 4: Rewrite sales record
  UPDATE public.sales
  SET
    items = p_items,
    subtotal = v_subtotal,
    discount = p_discount,
    total = v_total,
    customer = p_customer,
    paymentmethod = p_payment_method,
    userid = p_user_id::text,
    username = p_user_name,
    branchid = p_branch_id,
    note = NULLIF(TRIM(COALESCE(p_note, '')), ''),
    cashtransactionid = v_cash_tx_id
  WHERE id = p_sale_id
  RETURNING sale_code INTO v_sale_code;

  -- Create new cash transaction
  INSERT INTO public.cash_transactions(id, category, amount, date, description, branchid, paymentsource, reference, saleid)
  VALUES (
    v_cash_tx_id,
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
    'sale', (SELECT row_to_json(s) FROM public.sales s WHERE s.id = p_sale_id),
    'cashTransactionId', v_cash_tx_id,
    'inventoryTxCount', v_inventory_tx_count
  );
END;
$$;

-- 4. ATOMIC RETAIL SALE CANCELLATION (Xóa/Hủy hóa đơn)
CREATE OR REPLACE FUNCTION public.sale_delete_atomic(p_sale_id TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale RECORD;
  v_item RECORD;
  v_current_stock INT;
  v_branch_id TEXT;
  v_restored_count INT := 0;
  v_deleted_cash_count INT := 0;
BEGIN
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SALE_NOT_FOUND:%', p_sale_id;
  END IF;

  v_branch_id := COALESCE(v_sale.branchid, 'CN1');

  -- Restore stock using sale_items
  FOR v_item IN SELECT * FROM public.sale_items WHERE sale_id = p_sale_id AND part_id IS NOT NULL
  LOOP
    SELECT COALESCE((stock->>v_branch_id)::int, 0) INTO v_current_stock
    FROM public.parts WHERE id = v_item.part_id FOR UPDATE;

    UPDATE public.parts
    SET stock = jsonb_set(COALESCE(stock, '{}'::jsonb), ARRAY[v_branch_id], to_jsonb(v_current_stock + v_item.quantity), true)
    WHERE id = v_item.part_id;

    -- Stock recovery log
    INSERT INTO public.inventory_transactions(id, type, partid, partname, quantity, branchid, notes, date, totalprice)
    VALUES (
      gen_random_uuid()::text,
      'Nhập kho',
      v_item.part_id,
      v_item.part_name,
      v_item.quantity,
      v_branch_id,
      'Hoàn kho - xóa hóa đơn ' || COALESCE(v_sale.sale_code, p_sale_id),
      NOW(),
      0
    );

    v_restored_count := v_restored_count + 1;
  END LOOP;

  -- Delete linked cash transactions
  DELETE FROM public.cash_transactions
  WHERE id = v_sale.cashtransactionid
     OR saleid = p_sale_id
     OR reference IN (p_sale_id, COALESCE(v_sale.sale_code, p_sale_id));
  GET DIAGNOSTICS v_deleted_cash_count = ROW_COUNT;

  -- Delete sales record (will cascade delete sale_items)
  DELETE FROM public.sales WHERE id = p_sale_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Đã xóa hóa đơn, hoàn kho và xóa phiếu thu liên quan V2',
    'restoredItems', v_restored_count,
    'deletedCashTransactions', v_deleted_cash_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.work_order_update_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.work_order_refund_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.sale_update_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.sale_delete_atomic TO authenticated;
