-- Backfill: Create expense transactions for existing work orders with outsourcing costs
-- Created: 2026-01-01
-- Run this ONCE after updating the work_order_create_atomic function

DO $$
DECLARE
  v_order RECORD;
  v_service JSONB;
  v_index INT;
  v_services_count INT;
  v_service_cost NUMERIC;
  v_service_qty INT;
  v_total_cost NUMERIC;
  v_tx_id TEXT;
  v_created_count INT := 0;
BEGIN
  -- Loop through all work orders that have additionalServices with costPrice > 0
  FOR v_order IN 
    SELECT 
      id, 
      additionalServices, 
      branchId, 
      paymentMethod,
      creationDate
    FROM work_orders 
    WHERE additionalServices IS NOT NULL 
      AND jsonb_array_length(additionalServices) > 0
  LOOP
    v_services_count := jsonb_array_length(v_order.additionalServices);
    v_total_cost := 0;
    
    -- Calculate total outsourcing cost for this order
    FOR v_index IN 0..(v_services_count - 1) LOOP
      v_service := v_order.additionalServices->v_index;
      v_service_cost := COALESCE((v_service->>'costPrice')::numeric, 0);
      v_service_qty := COALESCE((v_service->>'quantity')::int, 1);
      
      IF v_service_cost > 0 THEN
        v_total_cost := v_total_cost + (v_service_cost * v_service_qty);
      END IF;
    END LOOP;
    
    -- If there's outsourcing cost, check if transaction already exists
    IF v_total_cost > 0 THEN
      -- Check if expense transaction already exists for this order
      IF NOT EXISTS (
        SELECT 1 FROM cash_transactions 
        WHERE reference = v_order.id 
          AND category = 'outsourcing_expense'
      ) THEN
        -- Create the expense transaction
        v_tx_id := gen_random_uuid()::text;
        INSERT INTO cash_transactions(
          id, type, category, amount, date, description, branchId, paymentSource, reference
        )
        VALUES (
          v_tx_id,
          'expense', -- type column
          'outsourcing_expense',
          -v_total_cost, -- Negative = expense
          COALESCE(v_order.creationDate, NOW()),
          'Chi gia công/đặt hàng - Phiếu ' || v_order.id || ' (backfill)',
          v_order.branchId,
          COALESCE(v_order.paymentMethod, 'cash'),
          v_order.id
        );
        
        v_created_count := v_created_count + 1;
        RAISE NOTICE 'Created expense tx for order %: % đ', v_order.id, v_total_cost;
      ELSE
        RAISE NOTICE 'Order % already has expense tx, skipping', v_order.id;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '=== Backfill complete: Created % expense transactions ===', v_created_count;
END $$;

-- Verify: Show all outsourcing expense transactions
SELECT 
  id,
  category,
  amount,
  date,
  description,
  reference as work_order_id
FROM cash_transactions 
WHERE category = 'outsourcing_expense'
ORDER BY date DESC
LIMIT 20;
