
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
  v_tx_ids TEXT[] := ARRAY[]::TEXT[];
  v_date TIMESTAMPTZ := NOW();
BEGIN
  -- Loop through items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_part_id := v_item->>'partId';
    v_part_name := v_item->>'partName';
    v_quantity := (v_item->>'quantity')::INT;
    v_import_price := (v_item->>'importPrice')::NUMERIC;
    v_selling_price := (v_item->>'sellingPrice')::NUMERIC;
    v_wholesale_price := (v_item->>'wholesalePrice')::NUMERIC;
    v_total_price := v_quantity * v_import_price;

    -- 1. Insert Inventory Transaction
    -- ⚠️ IMPORTANT: Trigger trg_inventory_tx_after_insert will auto-update stock
    -- We only manually update prices (costPrice, retailPrice, wholesalePrice)
    INSERT INTO public.inventory_transactions (
      id,
      type,
      "partId",
      "partName",
      quantity,
      date,
      "unitPrice",
      "totalPrice",
      "branchId",
      "supplierId",
      notes
    ) VALUES (
      gen_random_uuid(),
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

    -- 2. Update Part Prices (NOT STOCK - stock is handled by trigger)
    UPDATE public.parts
    SET
      "costPrice" = jsonb_set(COALESCE("costPrice", '{}'::jsonb), ARRAY[p_branch_id], to_jsonb(v_import_price)),
      "retailPrice" = jsonb_set(COALESCE("retailPrice", '{}'::jsonb), ARRAY[p_branch_id], to_jsonb(v_selling_price)),
      "wholesalePrice" = jsonb_set(COALESCE("wholesalePrice", '{}'::jsonb), ARRAY[p_branch_id], to_jsonb(COALESCE(v_wholesale_price, 0)))
    WHERE id = v_part_id;

  END LOOP;

  RETURN jsonb_build_object('success', true, 'message', 'Nhập kho thành công');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;
