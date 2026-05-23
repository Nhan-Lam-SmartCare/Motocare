-- ============================================================================
-- MIGRATION: TRỪ KHO TRỰC TIẾP CHO PHIẾU SỬA CHỮA CÔNG NỢ KHI TRẢ XE
-- Ngày: 2026-05-23
-- Mục đích:
--   1) Trừ kho ngay lập tức khi phiếu có status = 'Trả máy' HOẶC paymentstatus = 'paid'.
--   2) Tránh trừ kho trùng lặp khi thanh toán nốt nợ sau đó.
--   3) Hỗ trợ đầy đủ các kịch bản cập nhật chênh lệch số lượng phụ tùng.
-- ============================================================================

-- BƯỚC 1: Cập nhật hàm work_order_create_atomic
DROP FUNCTION IF EXISTS public.work_order_create_atomic CASCADE;

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
  v_current_stock INT;
  v_current_reserved INT;
  v_available INT;
  v_deposit_tx_id TEXT;
  v_payment_tx_id TEXT;
  v_warnings JSONB := '[]'::jsonb;
  v_creation_date TIMESTAMP := NOW();
  v_user_branch TEXT;
  v_actual_additional_payment NUMERIC;
  
  -- New variables
  v_should_deduct_inventory BOOLEAN;
  v_insufficient JSONB := '[]'::jsonb;
BEGIN
  -- Get user's branch
  SELECT branch_id INTO v_user_branch
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF v_user_branch IS NULL THEN
    v_user_branch := p_branch_id;
  END IF;
  
  IF p_branch_id IS DISTINCT FROM v_user_branch THEN
    RAISE EXCEPTION 'BRANCH_MISMATCH';
  END IF;

  IF p_payment_status NOT IN ('unpaid', 'paid', 'partial') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_STATUS';
  END IF;

  v_actual_additional_payment := GREATEST(p_total - COALESCE(p_deposit_amount, 0), 0);
  v_should_deduct_inventory := (p_status = 'Trả máy' OR p_payment_status = 'paid');

  -- Reserve or Deduct stock
  IF v_parts_count > 0 THEN
    WHILE v_index < v_parts_count LOOP
      v_part := p_parts_used->v_index;
      v_part_id := v_part->>'partId';
      v_part_name := v_part->>'partName';
      v_quantity := COALESCE((v_part->>'quantity')::INT, 0);

      IF v_quantity > 0 THEN
        -- Lock row
        SELECT 
          COALESCE((stock->>p_branch_id)::INT, 0),
          COALESCE((reservedstock->>p_branch_id)::INT, 0)
        INTO v_current_stock, v_current_reserved
        FROM parts
        WHERE id = v_part_id FOR UPDATE;

        IF FOUND THEN
          IF v_should_deduct_inventory THEN
            -- Check stock
            IF v_current_stock < v_quantity THEN
              v_insufficient := v_insufficient || jsonb_build_object(
                'partId', v_part_id,
                'partName', v_part_name,
                'requested', v_quantity,
                'available', v_current_stock
              );
            ELSE
              -- Deduct stock directly
              UPDATE parts
              SET stock = jsonb_set(
                stock,
                ARRAY[p_branch_id],
                to_jsonb(v_current_stock - v_quantity),
                true
              )
              WHERE id = v_part_id;

              -- Create inventory transaction (Xuất kho)
              INSERT INTO inventory_transactions(
                id, type, "partId", "partName", quantity, date, "unitPrice", "totalPrice",
                "branchId", notes, "workOrderId"
              )
              VALUES (
                gen_random_uuid()::text,
                'Xuất kho',
                v_part_id,
                v_part_name,
                v_quantity,
                v_creation_date,
                COALESCE(public.mc_avg_cost(v_part_id, p_branch_id), 0),
                COALESCE(public.mc_avg_cost(v_part_id, p_branch_id), 0) * v_quantity,
                p_branch_id,
                CASE WHEN p_payment_status = 'paid' THEN 'Xuất kho khi thanh toán phiếu' ELSE 'Xuất kho công nợ khi trả máy' END,
                p_order_id
              );
            END IF;
          ELSE
            -- Just reserve stock
            v_available := v_current_stock - v_current_reserved;

            IF v_available < v_quantity THEN
              v_warnings := v_warnings || jsonb_build_object(
                'partId', v_part_id,
                'partName', v_part_name,
                'requested', v_quantity,
                'available', v_available
              );
            END IF;

            UPDATE parts
            SET reservedstock = jsonb_set(
              COALESCE(reservedstock, '{}'::jsonb),
              ARRAY[p_branch_id],
              to_jsonb(v_current_reserved + v_quantity)
            )
            WHERE id = v_part_id;
          END IF;
        END IF;
      END IF;

      v_index := v_index + 1;
    END LOOP;

    IF jsonb_array_length(v_insufficient) > 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_insufficient::text;
    END IF;
  END IF;

  -- Insert work order
  INSERT INTO work_orders(
    id, customername, customerphone, vehicleid, vehiclemodel, licenseplate,
    currentkm, issuedescription, technicianname, status, laborcost, discount,
    partsused, additionalservices, total, branchid, paymentstatus,
    paymentmethod, depositamount, additionalpayment, totalpaid,
    remainingamount, creationdate, inventory_deducted
  )
  VALUES (
    p_order_id, p_customer_name, p_customer_phone, p_vehicle_id, p_vehicle_model, p_license_plate,
    p_current_km, p_issue_description, p_technician_name, p_status, p_labor_cost, p_discount,
    p_parts_used, p_additional_services, p_total, p_branch_id, p_payment_status,
    p_payment_method, 
    CASE WHEN p_deposit_amount > 0 THEN p_deposit_amount ELSE NULL END,
    CASE WHEN p_additional_payment > 0 THEN p_additional_payment ELSE NULL END,
    COALESCE(p_deposit_amount, 0) + COALESCE(p_additional_payment, 0),
    p_total - (COALESCE(p_deposit_amount, 0) + COALESCE(p_additional_payment, 0)),
    v_creation_date,
    v_should_deduct_inventory
  );

  -- Đặt cọc
  IF p_deposit_amount > 0 AND p_payment_method IS NOT NULL THEN
    v_deposit_tx_id := gen_random_uuid()::text;
    INSERT INTO cash_transactions(
      id, type, category, amount, date, description, branchid, paymentsource, reference
    )
    VALUES (
      v_deposit_tx_id, 'income', 'service_deposit', p_deposit_amount, v_creation_date,
      'Đặt cọc sửa chữa ' || p_order_id, p_branch_id, p_payment_method, p_order_id
    );
    UPDATE work_orders 
    SET deposittransactionid = v_deposit_tx_id, depositdate = v_creation_date
    WHERE id = p_order_id;
  END IF;

  -- Thanh toán
  IF p_additional_payment > 0 AND p_payment_method IS NOT NULL THEN
    v_payment_tx_id := gen_random_uuid()::text;
    INSERT INTO cash_transactions(
      id, type, category, amount, date, description, branchid, paymentsource, reference
    )
    VALUES (
      v_payment_tx_id, 'income', 'service_income', 
      v_actual_additional_payment, v_creation_date,
      'Thu tiền sửa chữa ' || p_order_id, p_branch_id, p_payment_method, p_order_id
    );
    UPDATE work_orders 
    SET cashtransactionid = v_payment_tx_id, paymentdate = v_creation_date
    WHERE id = p_order_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'depositTransactionId', v_deposit_tx_id,
    'paymentTransactionId', v_payment_tx_id,
    'warnings', v_warnings,
    'inventoryDeducted', v_should_deduct_inventory
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.work_order_create_atomic TO authenticated;
COMMENT ON FUNCTION public.work_order_create_atomic IS '2026-05-23: Tạo phiếu sửa chữa - hỗ trợ trừ kho ngay cho công nợ khi trả xe';


-- BƯỚC 2: Cập nhật hàm work_order_update_atomic
DROP FUNCTION IF EXISTS public.work_order_update_atomic CASCADE;

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
  v_old_parts JSONB;
  v_new_part JSONB;
  v_old_part JSONB;
  v_part_id TEXT;
  v_part_name TEXT;
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

  -- New variables
  v_old_status TEXT;
  v_old_payment_status TEXT;
  v_old_inventory_deducted BOOLEAN;
  v_new_inventory_deducted BOOLEAN;
  v_insufficient JSONB := '[]'::jsonb;
BEGIN
  SELECT branch_id INTO v_user_branch
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF v_user_branch IS NULL THEN
    SELECT branchid INTO v_branch_id FROM work_orders WHERE id = p_order_id;
    IF v_branch_id IS NULL THEN
      RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;
    v_user_branch := v_branch_id;
  END IF;

  SELECT partsused, branchid, depositamount, additionalpayment, cashtransactionid, status, paymentstatus, COALESCE(inventory_deducted, FALSE)
  INTO v_old_parts, v_branch_id, v_old_deposit, v_old_additional, v_old_cash_tx_id, v_old_status, v_old_payment_status, v_old_inventory_deducted
  FROM work_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: %', p_order_id;
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

  -- STEP 1 & STEP 2: Handle stock state transitions
  IF NOT v_old_inventory_deducted AND NOT v_new_inventory_deducted THEN
    -- Transition FALSE -> FALSE: Remain Reserved
    -- Release reserved for removed/reduced parts
    FOR v_old_part IN SELECT * FROM jsonb_array_elements(COALESCE(v_old_parts, '[]'::jsonb))
    LOOP
      v_part_id := (v_old_part->>'partId');
      v_old_quantity := COALESCE((v_old_part->>'quantity')::int, 0);
      
      v_new_part := NULL;
      FOR v_index IN 0..(v_parts_count - 1) LOOP
        IF (p_parts_used->v_index->>'partId') = v_part_id THEN
          v_new_part := p_parts_used->v_index;
          EXIT;
        END IF;
      END LOOP;

      IF v_new_part IS NULL THEN
        v_quantity_diff := v_old_quantity;
      ELSE
        v_quantity := COALESCE((v_new_part->>'quantity')::int, 0);
        v_quantity_diff := v_old_quantity - v_quantity;
      END IF;

      IF v_quantity_diff > 0 THEN
        SELECT COALESCE((reservedstock->>v_branch_id)::int, 0) INTO v_current_reserved
        FROM parts WHERE id = v_part_id FOR UPDATE;

        UPDATE parts
        SET reservedstock = jsonb_set(
          COALESCE(reservedstock, '{}'::jsonb),
          ARRAY[v_branch_id],
          to_jsonb(GREATEST(0, v_current_reserved - v_quantity_diff))
        )
        WHERE id = v_part_id;
      END IF;
    END LOOP;

    -- Reserve more for new/increased parts
    FOR v_index IN 0..(v_parts_count - 1) LOOP
      v_new_part := p_parts_used->v_index;
      v_part_id := (v_new_part->>'partId');
      v_part_name := (v_new_part->>'partName');
      v_quantity := COALESCE((v_new_part->>'quantity')::int, 0);

      IF v_part_id IS NULL OR v_quantity <= 0 THEN
        CONTINUE;
      END IF;

      v_old_quantity := 0;
      FOR v_old_part IN SELECT * FROM jsonb_array_elements(COALESCE(v_old_parts, '[]'::jsonb))
      LOOP
        IF (v_old_part->>'partId') = v_part_id THEN
          v_old_quantity := COALESCE((v_old_part->>'quantity')::int, 0);
          EXIT;
        END IF;
      END LOOP;

      v_quantity_diff := v_quantity - v_old_quantity;

      IF v_quantity_diff > 0 THEN
        SELECT 
          COALESCE((stock->>v_branch_id)::int, 0),
          COALESCE((reservedstock->>v_branch_id)::int, 0)
        INTO v_current_stock, v_current_reserved
        FROM parts WHERE id = v_part_id FOR UPDATE;

        v_available := v_current_stock - v_current_reserved;

        IF v_available < v_quantity_diff THEN
          v_warnings := v_warnings || jsonb_build_object(
            'partId', v_part_id,
            'partName', v_part_name,
            'requested', v_quantity_diff,
            'available', v_available,
            'message', 'Tồn kho không đủ: ' || v_part_name
          );
        END IF;

        UPDATE parts
        SET reservedstock = jsonb_set(
          COALESCE(reservedstock, '{}'::jsonb),
          ARRAY[v_branch_id],
          to_jsonb(v_current_reserved + v_quantity_diff)
        )
        WHERE id = v_part_id;
      END IF;
    END LOOP;

  ELSIF NOT v_old_inventory_deducted AND v_new_inventory_deducted THEN
    -- Transition FALSE -> TRUE: Deduct now
    -- Step 1: Release all old reservations
    FOR v_old_part IN SELECT * FROM jsonb_array_elements(COALESCE(v_old_parts, '[]'::jsonb))
    LOOP
      v_part_id := (v_old_part->>'partId');
      v_old_quantity := COALESCE((v_old_part->>'quantity')::int, 0);

      IF v_old_quantity > 0 THEN
        SELECT COALESCE((reservedstock->>v_branch_id)::int, 0) INTO v_current_reserved
        FROM parts WHERE id = v_part_id FOR UPDATE;

        UPDATE parts
        SET reservedstock = jsonb_set(
          COALESCE(reservedstock, '{}'::jsonb),
          ARRAY[v_branch_id],
          to_jsonb(GREATEST(0, v_current_reserved - v_old_quantity))
        )
        WHERE id = v_part_id;
      END IF;
    END LOOP;

    -- Step 2: Deduct all new parts from stock
    FOR v_index IN 0..(v_parts_count - 1) LOOP
      v_new_part := p_parts_used->v_index;
      v_part_id := (v_new_part->>'partId');
      v_part_name := (v_new_part->>'partName');
      v_quantity := COALESCE((v_new_part->>'quantity')::int, 0);

      IF v_part_id IS NOT NULL AND v_quantity > 0 THEN
        SELECT COALESCE((stock->>v_branch_id)::int, 0) INTO v_current_stock
        FROM parts WHERE id = v_part_id FOR UPDATE;

        IF v_current_stock < v_quantity THEN
          v_insufficient := v_insufficient || jsonb_build_object(
            'partId', v_part_id,
            'partName', v_part_name,
            'requested', v_quantity,
            'available', v_current_stock
          );
        ELSE
          UPDATE parts
          SET stock = jsonb_set(
            stock,
            ARRAY[v_branch_id],
            to_jsonb(v_current_stock - v_quantity),
            true
          )
          WHERE id = v_part_id;

          INSERT INTO inventory_transactions(
            id, type, "partId", "partName", quantity, date, "unitPrice", "totalPrice",
            "branchId", notes, "workOrderId"
          )
          VALUES (
            gen_random_uuid()::text,
            'Xuất kho',
            v_part_id,
            v_part_name,
            v_quantity,
            NOW(),
            COALESCE(public.mc_avg_cost(v_part_id, v_branch_id), 0),
            COALESCE(public.mc_avg_cost(v_part_id, v_branch_id), 0) * v_quantity,
            v_branch_id,
            CASE WHEN p_payment_status = 'paid' THEN 'Xuất kho khi thanh toán phiếu' ELSE 'Xuất kho công nợ khi trả máy' END,
            p_order_id
          );
        END IF;
      END IF;
    END LOOP;

    IF jsonb_array_length(v_insufficient) > 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_insufficient::text;
    END IF;

  ELSIF v_old_inventory_deducted AND v_new_inventory_deducted THEN
    -- Transition TRUE -> TRUE: Already deducted, adjust stock directly
    -- Compare new and old quantities
    FOR v_index IN 0..(v_parts_count - 1) LOOP
      v_new_part := p_parts_used->v_index;
      v_part_id := (v_new_part->>'partId');
      v_part_name := (v_new_part->>'partName');
      v_quantity := COALESCE((v_new_part->>'quantity')::int, 0);

      IF v_part_id IS NOT NULL AND v_quantity > 0 THEN
        v_old_quantity := 0;
        FOR v_old_part IN SELECT * FROM jsonb_array_elements(COALESCE(v_old_parts, '[]'::jsonb))
        LOOP
          IF (v_old_part->>'partId') = v_part_id THEN
            v_old_quantity := COALESCE((v_old_part->>'quantity')::int, 0);
            EXIT;
          END IF;
        END LOOP;

        v_quantity_diff := v_quantity - v_old_quantity;

        IF v_quantity_diff > 0 THEN
          SELECT COALESCE((stock->>v_branch_id)::int, 0) INTO v_current_stock
          FROM parts WHERE id = v_part_id FOR UPDATE;

          IF v_current_stock < v_quantity_diff THEN
            v_insufficient := v_insufficient || jsonb_build_object(
              'partId', v_part_id,
              'partName', v_part_name,
              'requested', v_quantity_diff,
              'available', v_current_stock
            );
          ELSE
            UPDATE parts
            SET stock = jsonb_set(
              stock,
              ARRAY[v_branch_id],
              to_jsonb(v_current_stock - v_quantity_diff),
              true
            )
            WHERE id = v_part_id;

            INSERT INTO inventory_transactions(
              id, type, "partId", "partName", quantity, date, "unitPrice", "totalPrice",
              "branchId", notes, "workOrderId"
            )
            VALUES (
              gen_random_uuid()::text,
              'Xuất kho',
              v_part_id,
              v_part_name,
              v_quantity_diff,
              NOW(),
              COALESCE(public.mc_avg_cost(v_part_id, v_branch_id), 0),
              COALESCE(public.mc_avg_cost(v_part_id, v_branch_id), 0) * v_quantity_diff,
              v_branch_id,
              'Điều chỉnh tăng số lượng: Xuất kho bổ sung',
              p_order_id
            );
          END IF;
        ELSIF v_quantity_diff < 0 THEN
          SELECT COALESCE((stock->>v_branch_id)::int, 0) INTO v_current_stock
          FROM parts WHERE id = v_part_id FOR UPDATE;

          UPDATE parts
          SET stock = jsonb_set(
            stock,
            ARRAY[v_branch_id],
            to_jsonb(v_current_stock + (-v_quantity_diff)),
            true
          )
          WHERE id = v_part_id;

          INSERT INTO inventory_transactions(
            id, type, "partId", "partName", quantity, date, "unitPrice", "totalPrice",
            "branchId", notes, "workOrderId"
          )
          VALUES (
            gen_random_uuid()::text,
            'Nhập kho',
            v_part_id,
            v_part_name,
            -v_quantity_diff,
            NOW(),
            COALESCE(public.mc_avg_cost(v_part_id, v_branch_id), 0),
            COALESCE(public.mc_avg_cost(v_part_id, v_branch_id), 0) * (-v_quantity_diff),
            v_branch_id,
            'Điều chỉnh giảm số lượng: Nhập kho hoàn lại',
            p_order_id
          );
        END IF;
      END IF;
    END LOOP;

    -- Handle completely removed parts
    FOR v_old_part IN SELECT * FROM jsonb_array_elements(COALESCE(v_old_parts, '[]'::jsonb))
    LOOP
      v_part_id := (v_old_part->>'partId');
      v_part_name := (v_old_part->>'partName');
      v_old_quantity := COALESCE((v_old_part->>'quantity')::int, 0);

      v_new_part := NULL;
      FOR v_index IN 0..(v_parts_count - 1) LOOP
        IF (p_parts_used->v_index->>'partId') = v_part_id THEN
          v_new_part := p_parts_used->v_index;
          EXIT;
        END IF;
      END LOOP;

      IF v_new_part IS NULL AND v_old_quantity > 0 THEN
        SELECT COALESCE((stock->>v_branch_id)::int, 0) INTO v_current_stock
        FROM parts WHERE id = v_part_id FOR UPDATE;

        UPDATE parts
        SET stock = jsonb_set(
          stock,
          ARRAY[v_branch_id],
          to_jsonb(v_current_stock + v_old_quantity),
          true
        )
        WHERE id = v_part_id;

        INSERT INTO inventory_transactions(
          id, type, "partId", "partName", quantity, date, "unitPrice", "totalPrice",
          "branchId", notes, "workOrderId"
        )
        VALUES (
          gen_random_uuid()::text,
          'Nhập kho',
          v_part_id,
          v_part_name,
          v_old_quantity,
          NOW(),
          COALESCE(public.mc_avg_cost(v_part_id, v_branch_id), 0),
          COALESCE(public.mc_avg_cost(v_part_id, v_branch_id), 0) * v_old_quantity,
          v_branch_id,
          'Hủy phụ tùng: Nhập kho hoàn lại',
          p_order_id
        );
      END IF;
    END LOOP;

    IF jsonb_array_length(v_insufficient) > 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_insufficient::text;
    END IF;

  ELSIF v_old_inventory_deducted AND NOT v_new_inventory_deducted THEN
    -- Transition TRUE -> FALSE: Revert to reserved (rare)
    -- Step 1: Restore all old parts to stock
    FOR v_old_part IN SELECT * FROM jsonb_array_elements(COALESCE(v_old_parts, '[]'::jsonb))
    LOOP
      v_part_id := (v_old_part->>'partId');
      v_part_name := (v_old_part->>'partName');
      v_old_quantity := COALESCE((v_old_part->>'quantity')::int, 0);

      IF v_old_quantity > 0 THEN
        SELECT COALESCE((stock->>v_branch_id)::int, 0) INTO v_current_stock
        FROM parts WHERE id = v_part_id FOR UPDATE;

        UPDATE parts
        SET stock = jsonb_set(
          stock,
          ARRAY[v_branch_id],
          to_jsonb(v_current_stock + v_old_quantity),
          true
        )
        WHERE id = v_part_id;

        INSERT INTO inventory_transactions(
          id, type, "partId", "partName", quantity, date, "unitPrice", "totalPrice",
          "branchId", notes, "workOrderId"
        )
        VALUES (
          gen_random_uuid()::text,
          'Nhập kho',
          v_part_id,
          v_part_name,
          v_old_quantity,
          NOW(),
          COALESCE(public.mc_avg_cost(v_part_id, v_branch_id), 0),
          COALESCE(public.mc_avg_cost(v_part_id, v_branch_id), 0) * v_old_quantity,
          v_branch_id,
          'Hủy trạng thái xuất kho: Nhập kho hoàn lại',
          p_order_id
        );
      END IF;
    END LOOP;

    -- Step 2: Reserve all new parts
    FOR v_index IN 0..(v_parts_count - 1) LOOP
      v_new_part := p_parts_used->v_index;
      v_part_id := (v_new_part->>'partId');
      v_part_name := (v_new_part->>'partName');
      v_quantity := COALESCE((v_new_part->>'quantity')::int, 0);

      IF v_part_id IS NOT NULL AND v_quantity > 0 THEN
        SELECT 
          COALESCE((stock->>v_branch_id)::int, 0),
          COALESCE((reservedstock->>v_branch_id)::int, 0)
        INTO v_current_stock, v_current_reserved
        FROM parts WHERE id = v_part_id FOR UPDATE;

        v_available := v_current_stock - v_current_reserved;

        IF v_available < v_quantity THEN
          v_warnings := v_warnings || jsonb_build_object(
            'partId', v_part_id,
            'partName', v_part_name,
            'requested', v_quantity,
            'available', v_available,
            'message', 'Tồn kho không đủ: ' || v_part_name
          );
        END IF;

        UPDATE parts
        SET reservedstock = jsonb_set(
          COALESCE(reservedstock, '{}'::jsonb),
          ARRAY[v_branch_id],
          to_jsonb(v_current_reserved + v_quantity)
        )
        WHERE id = v_part_id;
      END IF;
    END LOOP;
  END IF;

  -- STEP 3: Handle payment changes
  IF p_deposit_amount > COALESCE(v_old_deposit, 0) AND p_payment_method IS NOT NULL THEN
    v_deposit_tx_id := gen_random_uuid()::text;
    INSERT INTO cash_transactions(
      id, type, category, amount, date, description, branchid, paymentsource, reference
    )
    VALUES (
      v_deposit_tx_id, 'income', 'service_deposit',
      p_deposit_amount - COALESCE(v_old_deposit, 0), NOW(),
      'Đặt cọc bổ sung ' || p_order_id, v_branch_id, p_payment_method, p_order_id
    );
  END IF;

  IF p_additional_payment > 0 AND p_payment_method IS NOT NULL THEN
    IF p_additional_payment > COALESCE(v_old_additional, 0)
       OR (COALESCE(v_old_additional, 0) > 0 AND v_old_cash_tx_id IS NULL) THEN
      v_payment_tx_id := gen_random_uuid()::text;
      INSERT INTO cash_transactions(
        id, type, category, amount, date, description, branchid, paymentsource, reference
      )
      VALUES (
        v_payment_tx_id, 'income', 'service_income',
        CASE
          WHEN p_additional_payment > COALESCE(v_old_additional, 0)
            THEN p_additional_payment - COALESCE(v_old_additional, 0)
          ELSE p_additional_payment
        END,
        NOW(),
        CASE
          WHEN p_additional_payment > COALESCE(v_old_additional, 0)
            THEN 'Thu tiền bổ sung ' || p_order_id
          ELSE 'Thu tiền sửa chữa ' || p_order_id
        END,
        v_branch_id, p_payment_method, p_order_id
      );
    END IF;
  END IF;

  -- STEP 4: Update work order
  UPDATE work_orders
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
    additionalservices = p_additional_services,
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
    'workOrder', (SELECT row_to_json(work_orders.*) FROM work_orders WHERE id = p_order_id),
    'depositTransactionId', v_deposit_tx_id,
    'paymentTransactionId', v_payment_tx_id,
    'stockWarnings', v_warnings,
    'inventoryDeducted', v_new_inventory_deducted
  );

EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
    RAISE EXCEPTION 'work_order_update_atomic error: %', v_error_msg;
END;
$$;

GRANT EXECUTE ON FUNCTION public.work_order_update_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.work_order_update_atomic TO anon;
GRANT EXECUTE ON FUNCTION public.work_order_update_atomic TO service_role;
COMMENT ON FUNCTION public.work_order_update_atomic IS '2026-05-23: Cập nhật phiếu sửa chữa - hỗ trợ trừ kho ngay cho công nợ khi trả xe';
