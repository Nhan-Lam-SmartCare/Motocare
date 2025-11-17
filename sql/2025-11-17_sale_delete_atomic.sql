-- Create function to delete sale and restore inventory atomically
-- Date: 2025-11-17

CREATE OR REPLACE FUNCTION public.sale_delete_atomic(p_sale_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale_row RECORD;
  v_item JSONB;
  v_index INT := 0;
  v_items_count INT;
  v_part_id TEXT;
  v_quantity INT;
  v_branch_id TEXT;
  v_current_stock INT;
  v_restored_count INT := 0;
BEGIN
  -- Fetch sale row
  SELECT * INTO v_sale_row FROM sales WHERE id = p_sale_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SALE_NOT_FOUND';
  END IF;

  -- Get branch and items
  v_branch_id := v_sale_row.branchid;
  v_items_count := jsonb_array_length(v_sale_row.items);

  -- Restore stock for each item
  FOR v_index IN 0..(v_items_count - 1) LOOP
    v_item := v_sale_row.items->v_index;
    v_part_id := (v_item->>'partId');
    v_quantity := COALESCE((v_item->>'quantity')::int, 0);
    
    IF v_part_id IS NOT NULL AND v_quantity > 0 THEN
      -- Get current stock
      SELECT COALESCE((stock->>v_branch_id)::int, 0) INTO v_current_stock 
      FROM parts 
      WHERE id = v_part_id 
      FOR UPDATE;
      
      IF FOUND THEN
        -- Increment stock (restore)
        UPDATE parts 
        SET stock = jsonb_set(
          stock, 
          ARRAY[v_branch_id], 
          to_jsonb(v_current_stock + v_quantity), 
          true
        )
        WHERE id = v_part_id;
        
        -- Create inventory transaction (Nhập kho - returned)
        INSERT INTO inventory_transactions(
          id, type, "partId", "partName", quantity, date, 
          "unitPrice", "totalPrice", "branchId", notes, "saleId"
        )
        VALUES (
          gen_random_uuid()::text,
          'Nhập kho',
          v_part_id,
          v_item->>'partName',
          v_quantity,
          NOW(),
          COALESCE((v_item->>'sellingPrice')::numeric, 0),
          COALESCE((v_item->>'sellingPrice')::numeric, 0) * v_quantity,
          v_branch_id,
          'Hoàn trả từ hóa đơn bị xóa',
          p_sale_id
        );
        
        v_restored_count := v_restored_count + 1;
      END IF;
    END IF;
  END LOOP;

  -- Delete related cash transaction if exists
  DELETE FROM cash_transactions WHERE reference = p_sale_id;

  -- Delete related inventory transactions (the old ones)
  DELETE FROM inventory_transactions 
  WHERE "saleId" = p_sale_id 
  AND type = 'Xuất kho';

  -- Delete the sale
  DELETE FROM sales WHERE id = p_sale_id;

  RETURN jsonb_build_object(
    'saleId', p_sale_id,
    'deleted', true,
    'itemsRestored', v_restored_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sale_delete_atomic TO authenticated;

COMMENT ON FUNCTION public.sale_delete_atomic IS 'Xóa hóa đơn và hoàn lại kho tự động (atomic transaction)';
