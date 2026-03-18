# Mobile vs Web Parity Test Checklist (Work Order)

Date: 2026-03-18
Scope: Work order create/edit payment + inventory behavior parity with web app.

## Preconditions

1. Database functions are deployed:
   - work_order_create_atomic
   - work_order_update_atomic
   - work_order_complete_payment
2. work_orders has column inventory_deducted.
3. parts table has stock and reserved/reservedstock data for current branch.
4. Mobile app is running from MotocareMobile folder.

## Quick SQL Verification (run in Supabase SQL editor)

```sql
select proname
from pg_proc
where proname in (
  'work_order_create_atomic',
  'work_order_update_atomic',
  'work_order_complete_payment'
);
```

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'work_orders'
  and column_name in ('inventory_deducted', 'additionalpayment', 'paymentstatus', 'totalpaid', 'remainingamount');
```

## Test Data Setup

1. Pick one customer and one bike.
2. Pick 2 parts with known stock in current branch.
3. Record initial stock/reserved for both parts.

```sql
select id, name,
  coalesce((stock->>'CN1')::int, 0) as stock_cn1,
  coalesce((reserved->>'CN1')::int, coalesce((reservedstock->>'CN1')::int, 0)) as reserved_cn1
from parts
where id in ('PART_ID_1', 'PART_ID_2');
```

## Case A: Edit tab - Save only (no pay)

Steps:
1. Open existing unpaid work order in mobile edit screen.
2. Change quantity of one part.
3. Press LUU.

Expected:
1. App navigates back to work order list.
2. work_order_update_atomic runs successfully.
3. paymentstatus/totalpaid/remainingamount are recalculated and persisted.
4. Reserved quantity is adjusted (not final stock deduction yet).

Verify:
```sql
select id, paymentstatus, totalpaid, remainingamount, inventory_deducted
from work_orders
where id = 'WORK_ORDER_ID';
```

## Case B: Edit tab - Deposit

Steps:
1. Reopen same order in edit screen.
2. Enable deposit and input amount > 0, < total.
3. Press DAT COC.

Expected:
1. App navigates back to list.
2. paymentstatus becomes partial.
3. totalpaid increases by deposit amount.
4. cash_transactions has service_deposit row for this order.

Verify:
```sql
select id, paymentstatus, totalpaid, remainingamount, additionalpayment
from work_orders
where id = 'WORK_ORDER_ID';
```

```sql
select id, category, amount, reference, "paymentSource", date
from cash_transactions
where reference = 'WORK_ORDER_ID'
order by date desc;
```

## Case C: Edit tab - Full payment

Steps:
1. Reopen same order in edit screen.
2. Press THANH TOAN.

Expected:
1. App navigates back to list.
2. paymentstatus becomes paid.
3. remainingamount = 0.
4. inventory_deducted = true.
5. inventory_transactions has Xuat kho rows for each part in order.
6. stock decreases correctly and reservation is released.

Verify:
```sql
select id, paymentstatus, totalpaid, remainingamount, inventory_deducted
from work_orders
where id = 'WORK_ORDER_ID';
```

```sql
select id, type, "partId", quantity, "workOrderId", date
from inventory_transactions
where "workOrderId" = 'WORK_ORDER_ID'
order by date desc;
```

```sql
select id, name,
  coalesce((stock->>'CN1')::int, 0) as stock_cn1,
  coalesce((reserved->>'CN1')::int, coalesce((reservedstock->>'CN1')::int, 0)) as reserved_cn1
from parts
where id in ('PART_ID_1', 'PART_ID_2');
```

## Case D: Idempotency check (no double deduction)

Steps:
1. Open already paid order.
2. Press THANH TOAN again (if button appears) or trigger re-save.

Expected:
1. No second stock deduction.
2. No duplicate inventory Xuat kho for same payment finalization event.

Verify:
```sql
select "partId", type, count(*)
from inventory_transactions
where "workOrderId" = 'WORK_ORDER_ID'
group by "partId", type;
```

## Pass Criteria

1. All expected DB outcomes match web behavior.
2. No missing/extra cash or inventory transactions.
3. No double stock deduction.
4. Save/deposit/pay always return to list screen.

## Current Mobile Implementation Notes

1. Create flow uses create atomic RPC, then payment completion RPC only when needed.
2. Edit flow uses update atomic RPC, then payment completion RPC only when needed.
3. Percent discount uses rounded value to match web behavior.
