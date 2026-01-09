-- =====================================================
-- View: cash_transactions_ledger
-- Purpose: Read-only normalized cash ledger for reporting consistency
-- Notes:
--  - Does NOT modify existing data.
--  - Intended to be the single read source for Reports/Dashboard/Exports.
--  - This script is robust to production schema drift (optional columns may not exist).
--  - Relies on base table RLS; ensure cash_transactions has FORCE ROW LEVEL SECURITY.
-- =====================================================

DO $$
DECLARE
  has_type boolean;
  has_notes boolean;
  has_recipient boolean;
  has_reference boolean;
  has_branchid boolean;
  has_paymentsource boolean;
  has_paymentsourceid boolean;
  has_saleid boolean;
  has_workorderid boolean;
  has_payrollrecordid boolean;
  has_loanpaymentid boolean;
  has_supplierid boolean;
  has_customerid boolean;
  has_target_name boolean;
  has_created_by boolean;
  has_created_at boolean;
  type_expr text;
  notes_expr text;
  recipient_expr text;
  reference_expr text;
  branchid_expr text;
  paymentsource_expr text;
  saleid_expr text;
  workorderid_expr text;
  payrollrecordid_expr text;
  loanpaymentid_expr text;
  supplierid_expr text;
  customerid_expr text;
  target_name_expr text;
  created_by_expr text;
  created_at_expr text;
  view_sql text;
BEGIN
  -- Detect optional columns (schema drift safe)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_transactions' AND column_name = 'type'
  ) INTO has_type;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_transactions' AND column_name = 'notes'
  ) INTO has_notes;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_transactions' AND column_name = 'recipient'
  ) INTO has_recipient;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_transactions' AND column_name = 'reference'
  ) INTO has_reference;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_transactions' AND column_name = 'branchid'
  ) INTO has_branchid;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_transactions' AND column_name = 'paymentsource'
  ) INTO has_paymentsource;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_transactions' AND column_name = 'paymentsourceid'
  ) INTO has_paymentsourceid;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_transactions' AND column_name = 'saleid'
  ) INTO has_saleid;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_transactions' AND column_name = 'workorderid'
  ) INTO has_workorderid;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_transactions' AND column_name = 'payrollrecordid'
  ) INTO has_payrollrecordid;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_transactions' AND column_name = 'loanpaymentid'
  ) INTO has_loanpaymentid;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_transactions' AND column_name = 'supplierid'
  ) INTO has_supplierid;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_transactions' AND column_name = 'customerid'
  ) INTO has_customerid;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_transactions' AND column_name = 'target_name'
  ) INTO has_target_name;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_transactions' AND column_name = 'created_by'
  ) INTO has_created_by;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_transactions' AND column_name = 'created_at'
  ) INTO has_created_at;

  type_expr := CASE WHEN has_type THEN 'ct.type' ELSE 'NULL::text' END;
  notes_expr := CASE WHEN has_notes THEN 'n.notes' ELSE 'NULL::text AS notes' END;
  recipient_expr := CASE WHEN has_recipient THEN 'n.recipient' ELSE 'NULL::text AS recipient' END;
  reference_expr := CASE WHEN has_reference THEN 'n.reference' ELSE 'NULL::text AS reference' END;
  branchid_expr := CASE WHEN has_branchid THEN 'n.branchid' ELSE 'NULL::text AS branchid' END;

  paymentsource_expr :=
    CASE
      WHEN has_paymentsource AND has_paymentsourceid THEN
        'coalesce(nullif(n.paymentsource, ''''), nullif(n.paymentsourceid, ''''), ''cash'') AS paymentsource'
      WHEN has_paymentsource THEN
        'coalesce(nullif(n.paymentsource, ''''), ''cash'') AS paymentsource'
      WHEN has_paymentsourceid THEN
        'coalesce(nullif(n.paymentsourceid, ''''), ''cash'') AS paymentsource'
      ELSE
        '''cash''::text AS paymentsource'
    END;

  saleid_expr := CASE WHEN has_saleid THEN 'n.saleid' ELSE 'NULL::text AS saleid' END;
  workorderid_expr := CASE WHEN has_workorderid THEN 'n.workorderid' ELSE 'NULL::text AS workorderid' END;
  payrollrecordid_expr := CASE WHEN has_payrollrecordid THEN 'n.payrollrecordid' ELSE 'NULL::text AS payrollrecordid' END;
  loanpaymentid_expr := CASE WHEN has_loanpaymentid THEN 'n.loanpaymentid' ELSE 'NULL::text AS loanpaymentid' END;
  supplierid_expr := CASE WHEN has_supplierid THEN 'n.supplierid' ELSE 'NULL::text AS supplierid' END;
  customerid_expr := CASE WHEN has_customerid THEN 'n.customerid' ELSE 'NULL::text AS customerid' END;
  target_name_expr := CASE WHEN has_target_name THEN 'n.target_name' ELSE 'NULL::text AS target_name' END;
  created_by_expr := CASE WHEN has_created_by THEN 'n.created_by' ELSE 'NULL::uuid AS created_by' END;
  created_at_expr := CASE WHEN has_created_at THEN 'n.created_at' ELSE 'NULL::timestamptz AS created_at' END;

  -- Drop existing view (safe replace)
  IF to_regclass('public.cash_transactions_ledger') IS NOT NULL THEN
    EXECUTE 'DROP VIEW public.cash_transactions_ledger';
  END IF;

  view_sql := format($v$
    CREATE VIEW public.cash_transactions_ledger AS
    WITH normalized AS (
      SELECT
        ct.*,
        lower(trim(replace(coalesce(ct.category, ''), chr(8203), ''))) AS category_norm,
        lower(trim(replace(coalesce(%s, ''), chr(8203), ''))) AS type_norm
      FROM public.cash_transactions ct
    )
    SELECT
      n.id,

      -- Normalized core fields (override semantics for consistent reads)
      CASE
        WHEN n.category_norm IN (
          'refund',
          'sale_refund',
          'hoàn tiền',
          'hoan tien',
          'hoàn trả',
          'hoan tra'
        ) THEN 'refund'

        WHEN n.category_norm IN (
          'deposit',
          'đặt cọc',
          'dat coc',
          'đặt cọc dịch vụ',
          'dat coc dich vu'
        ) THEN 'service_deposit'

        WHEN n.category_norm IN (
          'employee_advance_repayment',
          'hoàn ứng',
          'hoan ung',
          'thu hồi tạm ứng',
          'thu hoi tam ung'
        ) THEN 'employee_advance_repayment'

        WHEN n.category_norm IN (
          'chi trả ncc',
          'chi tra ncc',
          'chi trả nhà cung cấp',
          'chi tra nha cung cap',
          'trả nhà cung cấp',
          'tra nha cung cap',
          'trả ncc',
          'tra ncc'
        ) THEN 'supplier_payment'

        WHEN n.category_norm IN (
          'nhập kho',
          'nhap kho',
          'nhập hàng',
          'nhap hang',
          'mua hàng',
          'mua hang',
          'inventory_purchase'
        ) THEN 'inventory_purchase'

        WHEN n.category_norm IN (
          'phiếu nhập',
          'phieu nhap',
          'goods_receipt'
        ) THEN 'goods_receipt'

        WHEN n.category_norm IN ('nhập', 'nhap', 'import') THEN 'import'

        WHEN n.category_norm IN (
          'chi gia công',
          'chi gia cong',
          'gia công',
          'gia cong',
          'outsourcing_expense',
          'outsourcing'
        ) THEN 'outsourcing'

        WHEN n.category_norm IN (
          'chi phí dịch vụ',
          'chi phi dich vu',
          'dịch vụ gia công',
          'dich vu gia cong',
          'service_cost'
        ) THEN 'service_cost'

        ELSE n.category_norm
      END AS category,

      CASE
        -- Refunds should always be treated as cash outflow entries
        WHEN n.category_norm IN (
          'refund',
          'sale_refund',
          'hoàn tiền',
          'hoan tien',
          'hoàn trả',
          'hoan tra'
        ) THEN 'expense'

        WHEN n.type_norm IN ('income', 'expense') THEN n.type_norm

        -- Back-compat: infer direction from sign/category when type missing
        WHEN (n.amount IS NOT NULL AND n.amount < 0) THEN 'expense'

        WHEN n.category_norm IN (
          'sale_income',
          'service_income',
          'other_income',
          'debt_collection',
          'general_income',
          'bán hàng',
          'ban hang',
          'dịch vụ',
          'dich vu'
        ) THEN 'income'

        ELSE 'expense'
      END AS type,

      abs(coalesce(n.amount, 0)) AS amount,

      -- Pass-through fields (kept for UI and linking)
      n.date,
      n.description,
      %s,
      %s,
      %s,

      %s,
      %s,

      %s,
      %s,
      %s,
      %s,
      %s,
      %s,

      %s,
      %s,

      %s,

      -- Helpful diagnostics (extra columns; safe for consumers to ignore)
      (n.category_norm IN (
        'refund',
        'sale_refund',
        'hoàn tiền',
        'hoan tien',
        'hoàn trả',
        'hoan tra'
      )) AS is_refund,

      n.category AS category_raw,
      %s AS type_raw,
      n.amount AS amount_raw
    FROM normalized n;
  $v$,
  type_expr,
  notes_expr,
  recipient_expr,
  reference_expr,
  branchid_expr,
  paymentsource_expr,
  saleid_expr,
  workorderid_expr,
  payrollrecordid_expr,
  loanpaymentid_expr,
  supplierid_expr,
  customerid_expr,
  target_name_expr,
  created_by_expr,
  created_at_expr,
  CASE WHEN has_type THEN 'n.type' ELSE 'NULL::text' END
  );

  EXECUTE view_sql;
END $$;

GRANT SELECT ON public.cash_transactions_ledger TO authenticated;

-- Verification (run manually):
-- select type, category, sum(amount) from public.cash_transactions_ledger group by 1,2 order by 1,2;
