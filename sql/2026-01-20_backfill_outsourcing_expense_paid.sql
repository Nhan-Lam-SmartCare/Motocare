-- Backfill: Create/update expense transactions for existing PAID work orders with outsourcing costs
-- Created: 2026-01-20
-- Purpose: Ensure gia công/đặt hàng cost is recorded in cash_transactions for legacy paid orders

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
  v_updated_count INT := 0;
BEGIN
  -- Loop through PAID work orders that have additionalServices
  FOR v_order IN 
    SELECT 
      id, 
      additionalServices, 
      branchId, 
      paymentMethod,
      creationDate,
      paymentDate,
      paymentStatus,
      paymentstatus
    FROM work_orders 
    WHERE additionalServices IS NOT NULL 
      AND jsonb_array_length(additionalServices) > 0
      AND (paymentStatus = 'paid' OR paymentstatus = 'paid')
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
    
    IF v_total_cost > 0 THEN
      -- If a transaction already exists (outsourcing/outsourcing_expense/service_cost), update it
      IF EXISTS (
        SELECT 1 FROM cash_transactions 
        WHERE reference = v_order.id 
          AND category IN ('outsourcing', 'outsourcing_expense', 'service_cost')
      ) THEN
        UPDATE cash_transactions
        SET
          amount = -v_total_cost,
          description = 'Chi phí gia công bên ngoài - Phiếu ' || v_order.id || ' (backfill)',
          date = COALESCE(v_order.paymentDate, v_order.creationDate, NOW())
        WHERE reference = v_order.id
          AND category IN ('outsourcing', 'outsourcing_expense', 'service_cost');

        v_updated_count := v_updated_count + 1;
      ELSE
        v_tx_id := gen_random_uuid()::text;
        INSERT INTO cash_transactions(
          id, type, category, amount, date, description, branchId, paymentSource, reference
        )
        VALUES (
          v_tx_id,
          'expense',
          'outsourcing',
          -v_total_cost,
          COALESCE(v_order.paymentDate, v_order.creationDate, NOW()),
          'Chi phí gia công bên ngoài - Phiếu ' || v_order.id || ' (backfill)',
          v_order.branchId,
          COALESCE(v_order.paymentMethod, 'cash'),
          v_order.id
        );

        v_created_count := v_created_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '=== Backfill complete: Created % expense transactions, Updated % transactions ===', v_created_count, v_updated_count;
END $$;

-- Verify: Show latest outsourcing expense transactions
SELECT 
  id,
  category,
  amount,
  date,
  description,
  reference as work_order_id
FROM cash_transactions 
WHERE category IN ('outsourcing', 'outsourcing_expense', 'service_cost')
ORDER BY date DESC
LIMIT 50;
