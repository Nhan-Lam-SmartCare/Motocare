-- ===================================================================
-- MOTOCARE V2 - SYSTEM VIEWS AND FUNCTIONS
-- Supabase Project V2 (public schema)
-- ===================================================================

-- 1. SECURITY & ROLE HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.mc_current_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r text;
BEGIN
  -- 1. Try profiles first (has canonical English roles: owner/manager/staff)
  BEGIN
    SELECT role INTO r FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 2. If profiles didn't yield a role, try employees table
  IF r IS NULL AND to_regclass('public.employees') IS NOT NULL THEN
    BEGIN
      SELECT role INTO r FROM public.employees WHERE user_id = auth.uid()::text LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN COALESCE(r, 'staff');
END;
$$;

CREATE OR REPLACE FUNCTION public.mc_current_branch()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE b text;
BEGIN
  -- 1. Try profiles first
  BEGIN
    SELECT branch_id INTO b FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 2. Fall back to employees table
  IF b IS NULL AND to_regclass('public.employees') IS NOT NULL THEN
    BEGIN
      SELECT branch_id INTO b FROM public.employees WHERE user_id = auth.uid()::text LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN b;
END;
$$;

CREATE OR REPLACE FUNCTION public.mc_is_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.mc_current_role() = 'owner';
$$;

CREATE OR REPLACE FUNCTION public.mc_is_manager_or_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.mc_current_role() IN ('owner','manager');
$$;

CREATE OR REPLACE FUNCTION public.mc_is_manager_owner_accountant()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.mc_current_role() IN ('owner','manager','accountant');
$$;

-- 2. WEIGHTED AVERAGE COST (WAC) HELPER
CREATE OR REPLACE FUNCTION public.mc_avg_cost(p_part_id TEXT, p_branch_id TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cost NUMERIC;
BEGIN
  SELECT COALESCE(("costPrice"->>p_branch_id)::NUMERIC, 0)
  INTO v_cost
  FROM public.parts
  WHERE id = p_part_id;
  RETURN COALESCE(v_cost, 0);
END;
$$;

-- 3. ATOMIC GOODS RECEIPT (Nhập kho & tính WAC)
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
  v_receipt_id     TEXT := gen_random_uuid()::text;
BEGIN
  -- Insert into purchase_orders for auditing receipts
  INSERT INTO public.purchase_orders (id, supplier_id, total_amount, status, branch_id, notes, created_at)
  VALUES (v_receipt_id, p_supplier_id, 0, 'completed', p_branch_id, p_notes, v_date);

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

    -- Row lock, get current stock and old cost
    SELECT
      COALESCE((stock->>p_branch_id)::INT, 0),
      COALESCE(("costPrice"->>p_branch_id)::NUMERIC, v_import_price)
    INTO v_current_stock, v_old_cost
    FROM public.parts
    WHERE id = v_part_id
    FOR UPDATE;

    v_new_stock := v_current_stock + v_quantity;

    -- Calculate WAC
    IF v_current_stock <= 0 THEN
      v_wac := v_import_price;
    ELSE
      v_wac := ROUND(
        (v_current_stock::NUMERIC * v_old_cost + v_quantity::NUMERIC * v_import_price)
        / v_new_stock::NUMERIC
      , 0);
    END IF;

    -- Update stock and catalog prices
    UPDATE public.parts
    SET 
      stock = jsonb_set(COALESCE(stock, '{}'::jsonb), ARRAY[p_branch_id], to_jsonb(v_new_stock), true),
      "costPrice" = jsonb_set(COALESCE("costPrice", '{}'::jsonb), ARRAY[p_branch_id], to_jsonb(v_wac), true),
      "retailPrice" = jsonb_set(COALESCE("retailPrice", '{}'::jsonb), ARRAY[p_branch_id], to_jsonb(v_selling_price), true),
      "wholesalePrice" = jsonb_set(COALESCE("wholesalePrice", '{}'::jsonb), ARRAY[p_branch_id], to_jsonb(COALESCE(v_wholesale_price, 0)), true)
    WHERE id = v_part_id;

    -- Insert into purchase_order_items
    INSERT INTO public.purchase_order_items (id, purchase_order_id, part_id, part_name, quantity, unit_price, total_price)
    VALUES (gen_random_uuid()::text, v_receipt_id, v_part_id, v_part_name, v_quantity, v_import_price, v_total_price);

    -- Insert stock history
    INSERT INTO public.inventory_transactions (
      id, type, partid, partname, quantity, date,
      unitprice, totalprice, branchid, notes
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
      p_notes
    );

    v_tx_count := v_tx_count + 1;
  END LOOP;

  -- Update total purchase order amount
  UPDATE public.purchase_orders 
  SET total_amount = COALESCE((SELECT SUM(total_price) FROM public.purchase_order_items WHERE purchase_order_id = v_receipt_id), 0)
  WHERE id = v_receipt_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Nhập kho thành công',
    'txCount', v_tx_count
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 4. ATOMIC RETAIL SALE (POS Bán hàng & Trừ kho)
CREATE OR REPLACE FUNCTION public.sale_create_atomic(
  p_sale_id text, p_items jsonb, p_discount numeric, p_customer jsonb,
  p_payment_method text, p_user_id uuid DEFAULT NULL::uuid,
  p_user_name text DEFAULT NULL::text, p_branch_id text DEFAULT NULL::text,
  p_note text DEFAULT NULL::text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  v_valid_part_id TEXT;
BEGIN
  -- Permission check
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

  -- 1. Validate pricing and calculate subtotal
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

  -- 2. Insert Parent Sale (keep JSONB items column for backward compatibility)
  INSERT INTO public.sales(
    id, date, items, subtotal, discount, total, customer, paymentmethod,
    userid, branchid, note, cashtransactionid
  )
  VALUES (
    p_sale_id, NOW(), p_items, v_subtotal, p_discount, v_total, p_customer,
    p_payment_method, p_user_id::text, p_branch_id,
    NULLIF(TRIM(COALESCE(p_note, '')), ''), v_cash_tx_id
  )
  RETURNING sale_code INTO v_sale_code;

  -- 3. Stock management and normalized items insertion
  FOR v_index IN 0..(v_items_count - 1) LOOP
    v_item := p_items->v_index;
    v_part_id := (v_item->>'partId');
    v_part_name := COALESCE((v_item->>'partName'), (v_item->>'name'));
    v_quantity := COALESCE((v_item->>'quantity')::int, 0);
    v_price := COALESCE((v_item->>'sellingPrice')::numeric, (v_item->>'price')::numeric, 0);

    v_is_quick_service := (v_part_id LIKE 'quick_service_%') OR COALESCE((v_item->>'isService')::boolean, false);
    
    IF v_is_quick_service THEN
      -- Quick service does not deduct inventory, insert to sale_items with NULL part_id
      INSERT INTO public.sale_items (id, sale_id, part_id, part_name, sku, quantity, price, cost_price)
      VALUES (
        p_sale_id || '_' || (v_index + 1),
        p_sale_id,
        NULL,
        v_part_name,
        COALESCE(v_item->>'sku', 'SERVICE'),
        v_quantity,
        v_price,
        NULL
      );
      CONTINUE;
    END IF;

    -- Validate part exist before RLS / update
    SELECT id INTO v_valid_part_id FROM public.parts WHERE id = v_part_id;
    IF v_valid_part_id IS NULL THEN
      -- Log orphaned items error instead of failing transaction
      INSERT INTO public.migration_errors (source_table, source_id, item_index, reason, severity, payload)
      VALUES ('sale_items', p_sale_id, v_index, 'orphan_part_id', 'warning', v_item);

      INSERT INTO public.sale_items (id, sale_id, part_id, part_name, sku, quantity, price, cost_price)
      VALUES (p_sale_id || '_' || (v_index + 1), p_sale_id, NULL, v_part_name, 'ORPHAN', v_quantity, v_price, NULL);
      CONTINUE;
    END IF;

    -- Lock row to prevent race conditions
    SELECT
      COALESCE((stock->>p_branch_id)::int, 0),
      COALESCE((reservedstock->>p_branch_id)::int, 0)
    INTO v_current_stock, v_current_reserved
    FROM public.parts
    WHERE id = v_part_id
    FOR UPDATE;

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

    -- Deduct stock
    UPDATE public.parts
    SET stock = jsonb_set(stock, ARRAY[p_branch_id], to_jsonb(v_current_stock - v_quantity), true)
    WHERE id = v_part_id;

    -- Insert into sale_items
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

    -- Insert inventory transaction
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
      'Bán hàng POS V2',
      p_sale_id
    );
    v_inventory_tx_count := v_inventory_tx_count + 1;
  END LOOP;

  IF jsonb_array_length(v_insufficient) > 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_insufficient::text;
  END IF;

  -- 4. Record payment transaction
  INSERT INTO public.cash_transactions(id, category, amount, date, description, branchid, paymentsource, reference, created_by, target_creator)
  VALUES (
    v_cash_tx_id,
    'sale_income',
    v_total,
    NOW(),
    'Thu từ hóa đơn ' || COALESCE(v_sale_code, p_sale_id),
    p_branch_id,
    p_payment_method,
    COALESCE(v_sale_code, p_sale_id),
    p_user_id::text,
    p_user_name
  );

  RETURN jsonb_build_object(
    'sale', (SELECT row_to_json(s) FROM public.sales s WHERE s.id = p_sale_id),
    'cashTransactionId', v_cash_tx_id,
    'inventoryTxCount', v_inventory_tx_count
  );
END;
$$;

-- 5. ATOMIC WORK ORDER CREATION (Tạo phiếu sửa chữa - Giữ chỗ phụ tùng)
CREATE OR REPLACE FUNCTION public.work_order_create_atomic(
  p_order_id TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_vehicle_model TEXT,
  p_license_plate TEXT,
  p_issue_description TEXT,
  p_technician_name TEXT,
  p_status TEXT,
  p_labor_cost NUMERIC,
  p_discount NUMERIC,
  p_parts_used JSONB,
  p_additional_services JSONB,
  p_total NUMERIC,
  p_branch_id TEXT,
  p_payment_status TEXT,
  p_payment_method TEXT,
  p_deposit_amount NUMERIC,
  p_additional_payment NUMERIC,
  p_user_id TEXT,
  p_vehicle_id TEXT DEFAULT NULL,
  p_current_km INTEGER DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_part JSONB;
  v_index INT := 0;
  v_parts_count INT := COALESCE(jsonb_array_length(p_parts_used), 0);
  v_part_id TEXT;
  v_part_name TEXT;
  v_quantity INT;
  v_price NUMERIC;
  v_current_stock INT;
  v_current_reserved INT;
  v_available INT;
  v_deposit_tx_id TEXT;
  v_payment_tx_id TEXT;
  v_warnings JSONB := '[]'::jsonb;
  v_creation_date TIMESTAMPTZ := NOW();
  v_user_branch TEXT;
  v_valid_part_id TEXT;
BEGIN
  -- Get user's branch
  SELECT branch_id INTO v_user_branch FROM public.profiles WHERE id = auth.uid();
  IF v_user_branch IS NULL THEN
    v_user_branch := p_branch_id;
  END IF;
  
  IF v_user_branch IS NOT NULL AND p_branch_id IS NOT NULL AND p_branch_id != v_user_branch THEN
    RAISE EXCEPTION 'BRANCH_MISMATCH';
  END IF;

  IF p_payment_status NOT IN ('unpaid', 'paid', 'partial') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_STATUS';
  END IF;

  -- 1. Insert Parent Work Order (keep partsUsed JSONB for compatibility)
  INSERT INTO public.work_orders(
    id, customername, customerphone, vehicleid, vehiclemodel, licenseplate,
    currentkm, issuedescription, technicianname, status, laborcost, discount,
    partsUsed, additionalservices, total, branchid, paymentstatus,
    paymentmethod, depositamount, additionalpayment, totalpaid,
    remainingamount, creationdate
  )
  VALUES (
    p_order_id, p_customer_name, p_customer_phone, p_vehicle_id, p_vehicle_model, p_license_plate,
    p_current_km, p_issue_description, p_technician_name, p_status, p_labor_cost, p_discount,
    p_parts_used, p_additional_services, p_total, p_branch_id, p_payment_status,
    p_payment_method, 
    CASE WHEN p_deposit_amount > 0 THEN p_deposit_amount ELSE 0 END,
    CASE WHEN p_additional_payment > 0 THEN p_additional_payment ELSE 0 END,
    COALESCE(p_deposit_amount, 0) + COALESCE(p_additional_payment, 0),
    p_total - (COALESCE(p_deposit_amount, 0) + COALESCE(p_additional_payment, 0)),
    v_creation_date
  );

  -- 2. Reserve stock and write to work_order_items (with Ordinality simulation)
  IF v_parts_count > 0 THEN
    WHILE v_index < v_parts_count LOOP
      v_part := p_parts_used->v_index;
      v_part_id := v_part->>'partId';
      v_part_name := v_part->>'partName';
      v_quantity := COALESCE((v_part->>'quantity')::INT, 0);
      v_price := COALESCE((v_part->>'sellingPrice')::NUMERIC, (v_part->>'price')::NUMERIC, 0);

      IF v_quantity > 0 THEN
        -- Check if part exists in parts catalog
        SELECT id INTO v_valid_part_id FROM public.parts WHERE id = v_part_id;

        IF v_valid_part_id IS NOT NULL THEN
          -- Lock row and check stock
          SELECT 
            COALESCE((stock->>p_branch_id)::INT, 0),
            COALESCE((reservedstock->>p_branch_id)::INT, 0)
          INTO v_current_stock, v_current_reserved
          FROM public.parts
          WHERE id = v_part_id
          FOR UPDATE;

          v_available := v_current_stock - v_current_reserved;

          IF v_available < v_quantity THEN
            v_warnings := v_warnings || jsonb_build_object(
              'partId', v_part_id,
              'partName', v_part_name,
              'requested', v_quantity,
              'available', v_available
            );
          END IF;

          -- Increase reservedstock
          UPDATE public.parts
          SET reservedstock = jsonb_set(
            COALESCE(reservedstock, '{}'::jsonb),
            ARRAY[p_branch_id],
            to_jsonb(v_current_reserved + v_quantity)
          )
          WHERE id = v_part_id;

          -- Insert item
          INSERT INTO public.work_order_items (id, work_order_id, part_id, part_name, sku, category, quantity, price, cost_price)
          VALUES (
            p_order_id || '_' || (v_index + 1),
            p_order_id,
            v_part_id,
            v_part_name,
            v_part->>'sku',
            v_part->>'category',
            v_quantity,
            v_price,
            public.mc_avg_cost(v_part_id, p_branch_id)
          );
        ELSE
          -- Orphaned part in work order
          INSERT INTO public.migration_errors (source_table, source_id, item_index, reason, severity, payload)
          VALUES ('work_order_items', p_order_id, v_index, 'orphan_part_id', 'warning', v_part);

          INSERT INTO public.work_order_items (id, work_order_id, part_id, part_name, sku, category, quantity, price, cost_price)
          VALUES (p_order_id || '_' || (v_index + 1), p_order_id, NULL, v_part_name, 'ORPHAN', NULL, v_quantity, v_price, NULL);
        END IF;
      END IF;

      v_index := v_index + 1;
    END LOOP;
  END IF;

  -- 3. Create deposit transaction if applicable
  IF p_deposit_amount > 0 AND p_payment_method IS NOT NULL THEN
    v_deposit_tx_id := gen_random_uuid()::text;
    INSERT INTO public.cash_transactions(id, category, amount, date, description, branchid, paymentsource, reference, created_by)
    VALUES (v_deposit_tx_id, 'service_deposit', p_deposit_amount, v_creation_date, 'Đặt cọc sửa chữa ' || p_order_id, p_branch_id, p_payment_method, p_order_id, p_user_id);

    UPDATE public.work_orders 
    SET deposittransactionid = v_deposit_tx_id, depositdate = v_creation_date
    WHERE id = p_order_id;
  END IF;

  -- 4. Create payment transaction if applicable
  IF p_additional_payment > 0 AND p_payment_method IS NOT NULL THEN
    v_payment_tx_id := gen_random_uuid()::text;
    INSERT INTO public.cash_transactions(id, category, amount, date, description, branchid, paymentsource, reference, created_by)
    VALUES (v_payment_tx_id, 'service_income', p_additional_payment, v_creation_date, 'Thu tiền sửa chữa ' || p_order_id, p_branch_id, p_payment_method, p_order_id, p_user_id);

    UPDATE public.work_orders 
    SET cashtransactionid = v_payment_tx_id, paymentdate = v_creation_date
    WHERE id = p_order_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'depositTransactionId', v_deposit_tx_id,
    'paymentTransactionId', v_payment_tx_id,
    'inventoryTxCount', v_parts_count,
    'warnings', v_warnings
  );
END;
$$;

-- 6. ATOMIC WORK ORDER COMPLETION & PAYMENT (Thanh toán & Trừ kho)
CREATE OR REPLACE FUNCTION public.work_order_complete_payment(
  p_order_id TEXT,
  p_payment_method TEXT,
  p_payment_amount NUMERIC,
  p_user_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_current_stock INT;
  v_current_reserved INT;
  v_payment_tx_id TEXT;
  v_new_total_paid NUMERIC;
  v_new_remaining NUMERIC;
  v_new_payment_status TEXT;
  v_result JSONB;
  v_insufficient JSONB := '[]'::jsonb;
  v_duplicate_payment_tx_id TEXT;
  v_remaining_before NUMERIC;
  v_inventory_tx_count INT := 0;
BEGIN
  -- Authorization check
  IF NOT public.mc_is_manager_or_owner() THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- Get existing order with row lock to serialize concurrent payments
  SELECT * INTO v_order FROM public.work_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  -- Branch scope guard
  IF v_order.branchid IS DISTINCT FROM public.mc_current_branch() THEN
    RAISE EXCEPTION 'BRANCH_MISMATCH';
  END IF;

  -- Check if already refunded
  IF v_order.refunded = TRUE THEN
    RAISE EXCEPTION 'ORDER_REFUNDED';
  END IF;

  -- Ignore duplicate retries/taps (same order + method + amount in recent window)
  IF p_payment_amount > 0 AND p_payment_method IS NOT NULL THEN
    SELECT ct.id INTO v_duplicate_payment_tx_id
    FROM public.cash_transactions ct
    WHERE ct.reference = p_order_id
      AND ct.category = 'service_income'
      AND ct.amount = p_payment_amount
      AND ct.paymentsource = p_payment_method
      AND ct.date >= NOW() - INTERVAL '20 seconds'
    ORDER BY ct.date DESC LIMIT 1;

    IF v_duplicate_payment_tx_id IS NOT NULL THEN
      SELECT jsonb_build_object(
        'workOrder', to_jsonb(w.*),
        'paymentTransactionId', v_duplicate_payment_tx_id,
        'newPaymentStatus', w.paymentstatus,
        'inventoryDeducted', true,
        'duplicatePaymentIgnored', TRUE
      ) INTO v_result
      FROM public.work_orders w WHERE w.id = p_order_id;
      RETURN v_result;
    END IF;
  END IF;

  -- Validate non-negative payment
  IF p_payment_amount < 0 THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_AMOUNT';
  END IF;

  -- Prevent over-collection
  v_remaining_before := GREATEST(0, COALESCE(v_order.remainingamount, v_order.total - COALESCE(v_order.totalpaid, 0)));
  IF p_payment_amount > v_remaining_before THEN
    RAISE EXCEPTION 'PAYMENT_EXCEEDS_REMAINING';
  END IF;

  -- Calculate new payment totals
  v_new_total_paid := COALESCE(v_order.totalpaid, 0) + p_payment_amount;
  v_new_remaining := v_order.total - v_new_total_paid;

  IF v_new_remaining <= 0 THEN
    v_new_payment_status := 'paid';
  ELSIF v_new_total_paid > 0 THEN
    v_new_payment_status := 'partial';
  ELSE
    v_new_payment_status := 'unpaid';
  END IF;

  -- 1. Deduct stock from normalized work_order_items (only if status is fully paid and not yet deducted)
  -- In this normalized V2, we track it on work_orders.
  -- In case partsUsed array was changed, items are already updated in work_order_update_atomic.
  IF v_new_payment_status = 'paid' AND COALESCE((v_order.additionalservices->>'inventory_deducted')::boolean, FALSE) = FALSE THEN
    
    FOR v_item IN SELECT * FROM public.work_order_items WHERE work_order_id = p_order_id AND part_id IS NOT NULL
    LOOP
      IF v_item.quantity > 0 THEN
        -- Row lock on parts
        SELECT
          COALESCE((stock->>v_order.branchid)::int, 0),
          COALESCE((reservedstock->>v_order.branchid)::int, 0)
        INTO v_current_stock, v_current_reserved
        FROM public.parts WHERE id = v_item.part_id FOR UPDATE;

        IF v_current_stock < v_item.quantity THEN
          v_insufficient := v_insufficient || jsonb_build_object(
            'partId', v_item.part_id,
            'partName', v_item.part_name,
            'requested', v_item.quantity,
            'available', v_current_stock
          );
          CONTINUE;
        END IF;

        -- Deduct stock and release reservedstock
        UPDATE public.parts
        SET 
          reservedstock = jsonb_set(COALESCE(reservedstock, '{}'::jsonb), ARRAY[v_order.branchid], to_jsonb(GREATEST(0, v_current_reserved - v_item.quantity)), true),
          stock = jsonb_set(COALESCE(stock, '{}'::jsonb), ARRAY[v_order.branchid], to_jsonb(v_current_stock - v_item.quantity), true)
        WHERE id = v_item.part_id;

        -- Insert inventory transaction
        INSERT INTO public.inventory_transactions(id, type, partid, partname, quantity, date, unitprice, totalprice, branchid, notes, workorderid)
        VALUES (
          gen_random_uuid()::text,
          'Xuất kho',
          v_item.part_id,
          v_item.part_name,
          v_item.quantity,
          NOW(),
          public.mc_avg_cost(v_item.part_id, v_order.branchid),
          public.mc_avg_cost(v_item.part_id, v_order.branchid) * v_item.quantity,
          v_order.branchid,
          'Xuất kho khi thanh toán phiếu sửa V2',
          p_order_id
        );
        v_inventory_tx_count := v_inventory_tx_count + 1;
      END IF;
    END LOOP;

    IF jsonb_array_length(v_insufficient) > 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_insufficient::text;
    END IF;
  END IF;

  -- 2. Create cash transaction if amount > 0
  IF p_payment_amount > 0 AND p_payment_method IS NOT NULL THEN
    v_payment_tx_id := gen_random_uuid()::text;
    INSERT INTO public.cash_transactions(id, category, amount, date, description, branchid, paymentsource, reference, created_by)
    VALUES (v_payment_tx_id, 'service_income', p_payment_amount, NOW(), 'Thanh toán phiếu sửa chữa ' || p_order_id, v_order.branchid, p_payment_method, p_order_id, p_user_id);
  END IF;

  -- 3. Update work order status
  UPDATE public.work_orders
  SET
    paymentstatus = v_new_payment_status,
    paymentmethod = COALESCE(p_payment_method, paymentmethod),
    totalpaid = v_new_total_paid,
    remainingamount = GREATEST(0, v_new_remaining),
    additionalpayment = COALESCE(additionalpayment, 0) + p_payment_amount,
    cashtransactionid = COALESCE(v_payment_tx_id, cashtransactionid),
    paymentdate = CASE WHEN v_payment_tx_id IS NOT NULL THEN NOW() ELSE paymentdate END,
    additionalservices = jsonb_set(COALESCE(additionalservices, '[]'::jsonb), ARRAY['inventory_deducted'], to_jsonb(v_new_payment_status = 'paid'), true)
  WHERE id = p_order_id;

  SELECT jsonb_build_object(
    'workOrder', to_jsonb(w.*),
    'paymentTransactionId', v_payment_tx_id,
    'newPaymentStatus', v_new_payment_status,
    'inventoryDeducted', (v_new_payment_status = 'paid')
  ) INTO v_result
  FROM public.work_orders w WHERE w.id = p_order_id;

  -- 4. Audit Log
  BEGIN
    INSERT INTO public.audit_logs(id, created_by, action, table_name, record_id, old_data, new_data)
    VALUES (
      gen_random_uuid()::text,
      p_user_id,
      'work_order.payment',
      'work_orders',
      p_order_id,
      jsonb_build_object('totalPaid', v_order.totalpaid, 'paymentStatus', v_order.paymentstatus),
      v_result->'workOrder'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_result;
END;
$$;
