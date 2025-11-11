-- Inventory summary by branch view
-- Aggregates total quantity and total value (stock * retailPrice) per branch across all parts

create or replace view inventory_summary_by_branch as
select
  s.key as branch_id,
  sum((s.value)::numeric) as total_quantity,
  sum(((s.value)::numeric) * coalesce((rp.value)::numeric, 0)) as total_value
from parts p
cross join lateral jsonb_each_text(p.stock) as s(key, value)
left join lateral jsonb_each_text(p.retailPrice) as rp(key, value) on rp.key = s.key
group by s.key;

comment on view inventory_summary_by_branch is 'Tổng hợp SL và giá trị tồn theo chi nhánh từ bảng parts';
