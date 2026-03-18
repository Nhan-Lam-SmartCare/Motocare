import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../shared/supabaseClient';
import { BRAND_COLORS, formatCurrency } from '../../constants';

const BRANCH_ID = 'CN1';

type FeatureKey = 'reports' | 'staff' | 'debt' | 'orders';

type FeatureConfig = {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

const FEATURE_CONFIG: Record<FeatureKey, FeatureConfig> = {
  reports: {
    title: 'Bao cao',
    subtitle: 'Tong hop doanh thu, thu chi, ton kho va cong no',
    icon: 'chart-box-outline',
  },
  staff: {
    title: 'Nhan vien',
    subtitle: 'Danh sach, luong va hieu suat ky thuat vien',
    icon: 'account-hard-hat',
  },
  debt: {
    title: 'Cong no',
    subtitle: 'Theo doi cong no khach hang va nha cung cap',
    icon: 'bank-outline',
  },
  orders: {
    title: 'Dat hang',
    subtitle: 'Quan ly don dat va lich su nhap hang',
    icon: 'clipboard-text-outline',
  },
};

const safeNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const buildRangeStart = (range: 'today' | 'week' | 'month' | 'year'): string => {
  const now = new Date();
  if (range === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  if (range === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (range === 'year') return new Date(now.getFullYear(), 0, 1).toISOString();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
};

const toDayKey = (value: unknown): string => {
  const d = new Date(String(value || new Date().toISOString()));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseReceiptCode = (raw: unknown): string => {
  const text = String(raw || '');
  const match = text.match(/NH-\d{8}-\d{3,}/i);
  return match ? String(match[0]).toUpperCase() : '';
};

const normalizeText = (value: unknown): string =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const REPORTS_EXCLUDED_INCOME_CATEGORIES = [
  'service',
  'dich vu',
  'sale_income',
  'ban hang',
  'service_income',
  'service_deposit',
  'employee_advance_repayment',
  'debt_collection',
];

const REPORTS_EXCLUDED_EXPENSE_CATEGORIES = [
  'supplier_payment',
  'nhap kho',
  'nhap hang',
  'mua hang',
  'inventory_purchase',
  'goods_receipt',
  'import',
  'refund',
  'sale_refund',
  'loan_principal',
  'loan_payment',
  'debt_payment',
];

const INCOME_CATEGORIES = new Set([
  'sale_income',
  'service_income',
  'other_income',
  'debt_collection',
  'service_deposit',
  'employee_advance_repayment',
  'general_income',
  'deposit',
]);

const EXPENSE_CATEGORIES = new Set([
  'inventory_purchase',
  'supplier_payment',
  'debt_payment',
  'salary',
  'employee_advance',
  'loan_payment',
  'rent',
  'utilities',
  'outsourcing',
  'service_cost',
  'sale_refund',
  'other_expense',
  'general_expense',
]);

const canonicalizeCategory = (category: unknown): string => {
  const normalized = normalizeText(category).replace(/\u200b/g, '').trim();
  if (!normalized) return '';

  const aliases: Record<string, string> = {
    'chi tra ncc': 'supplier_payment',
    'chi tra nha cung cap': 'supplier_payment',
    'tra nha cung cap': 'supplier_payment',
    'tra ncc': 'supplier_payment',
    'nhap kho': 'inventory_purchase',
    'nhap hang': 'inventory_purchase',
    'mua hang': 'inventory_purchase',
    'phieu nhap': 'goods_receipt',
    nhap: 'import',
    'hoan tien': 'refund',
    'hoan tra': 'refund',
    sale_refund: 'refund',
    deposit: 'service_deposit',
    'dat coc': 'service_deposit',
    'dat coc dich vu': 'service_deposit',
    'hoan ung': 'employee_advance_repayment',
    'thu hoi tam ung': 'employee_advance_repayment',
    'thu no': 'debt_collection',
    'thu no khach hang': 'debt_collection',
    'tra goc vay': 'loan_principal',
    'tra no vay': 'loan_payment',
  };

  return aliases[normalized] || normalized;
};

const normalizeTxType = (value: unknown): 'income' | 'expense' | '' => {
  const text = normalizeText(value);
  if (text === 'income' || text === 'thu') return 'income';
  if (text === 'expense' || text === 'chi') return 'expense';
  return '';
};

const normalizeCashTxTypeByCategory = (row: any): 'income' | 'expense' => {
  const normalizedType = normalizeText(row?.type || row?.transaction_type || row?.transactionType);
  const category = canonicalizeCategory(row?.category || row?.cash_category || row?.transaction_category);
  if (INCOME_CATEGORIES.has(category)) return 'income';
  if (EXPENSE_CATEGORIES.has(category)) return 'expense';
  if (normalizedType === 'income' || normalizedType === 'deposit' || normalizedType === 'thu') return 'income';
  return 'expense';
};

const getRowBranch = (row: any): string => String(row?.branchid || row?.branchId || row?.branch_id || '').trim();

const isCurrentBranchRow = (row: any): boolean => {
  const rowBranch = getRowBranch(row);
  if (!rowBranch) return true;
  return rowBranch.toUpperCase() === BRANCH_ID.toUpperCase();
};

const getCashTxDate = (row: any): string => String(row?.date || row?.created_at || row?.createdAt || row?.transaction_date || '');
const getCashTxAmount = (row: any): number => Math.abs(safeNumber(row?.amount ?? row?.total_amount ?? row?.value ?? 0));
const getCashTxCategory = (row: any): string => String(row?.category || row?.cash_category || row?.transaction_category || '');
const getCashTxDescription = (row: any): string => String(row?.description || row?.notes || row?.reference || '');

const isRefundCategory = (category: unknown): boolean => { return canonicalizeCategory(category) === "refund"; };

const isExcludedIncomeCategory = (category: unknown): boolean => {
  const canonical = canonicalizeCategory(category);
  if (REPORTS_EXCLUDED_INCOME_CATEGORIES.some((c) => c === canonical)) return true;
  const text = normalizeText(category);
  return ['service', 'dich vu', 'sale_income', 'ban hang', 'service_income', 'service_deposit', 'employee_advance_repayment', 'ung luong', 'debt_collection', 'thu hoi', 'thu no', 'cong no'].some((key) => text.includes(key));
};

const isExcludedExpenseCategory = (category: unknown): boolean => {
  const canonical = canonicalizeCategory(category);
  if (REPORTS_EXCLUDED_EXPENSE_CATEGORIES.some((c) => c === canonical)) return true;
  const text = normalizeText(category);
  return ['supplier_payment', 'tra ncc', 'nha cung cap', 'debt_payment', 'tra no', 'nhap kho', 'nhap hang', 'mua hang', 'goods_receipt', 'import', 'employee_advance', 'ung luong', 'payroll', 'luong'].some((key) => text.includes(key));
};

const isPaidWorkOrder = (wo: any): boolean => {
  const status = String(wo?.paymentStatus || wo?.paymentstatus || '').toLowerCase();
  if (['paid', 'partial', 'da thanh toan', 'đã thanh toán', 'thanh toan mot phan', 'thanh toán một phần'].includes(status)) return true;
  return safeNumber(wo?.totalPaid ?? wo?.totalpaid) > 0;
};

const getWorkOrderAccountingDate = (wo: any): Date | null => {
  const paymentDateRaw = wo?.paymentDate ?? wo?.paymentdate;
  const creationDateRaw = wo?.creationDate ?? wo?.creationdate;

  if (paymentDateRaw) {
    const paymentDate = new Date(paymentDateRaw);
    if (!Number.isNaN(paymentDate.getTime())) return paymentDate;
  }

  if (isPaidWorkOrder(wo) && creationDateRaw) {
    const creationDate = new Date(creationDateRaw);
    if (!Number.isNaN(creationDate.getTime())) return creationDate;
  }

  return null;
};

const getNestedBranchNumber = (value: any): number => {
  if (typeof value === 'number') return safeNumber(value);
  if (!value || typeof value !== 'object') return 0;
  return safeNumber(value.CN1 ?? value.cn1 ?? value.default ?? 0);
};

const mapSaleItem = (item: any) => ({
  partName: String(item?.partName || item?.name || 'Phu tung'),
  quantity: safeNumber(item?.quantity || item?.qty || 1),
  partId: String(item?.partId || item?.partid || ''),
  sku: String(item?.sku || ''),
  costPrice: safeNumber(item?.costPrice ?? item?.costprice ?? item?.cost_price),
});

const parseSaleItems = (itemsValue: unknown): Array<{ partName: string; quantity: number; partId: string; sku: string; costPrice: number }> => {
  if (Array.isArray(itemsValue)) {
    return itemsValue.map((item: any) => mapSaleItem(item));
  }

  if (typeof itemsValue === 'string') {
    try {
      const parsed = JSON.parse(itemsValue);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => mapSaleItem(item));
      }
    } catch {
      return [];
    }
  }

  return [];
};

function MetricCard({ label, value, compact, subLabel }: { label: string; value: string; compact?: boolean; subLabel?: string }) {
  return (
    <View style={[styles.metricCard, compact && { paddingVertical: 9 }]}>
      <Text style={styles.metricLabel}>{label}</Text>
      {!!subLabel && <Text style={styles.metricSub}>{subLabel}</Text>}
      <Text style={[styles.metricValue, compact && { fontSize: 16 }]}>{value}</Text>
    </View>
  );
}

export default function MoreFeatureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ feature?: string }>();
  const feature = (params.feature as FeatureKey) || 'reports';

  const [range, setRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [reportTab, setReportTab] = useState<'revenue' | 'cashflow' | 'inventory' | 'debt'>('revenue');
  const [selectedReportDate, setSelectedReportDate] = useState<string | null>(null);
  const [staffTab, setStaffTab] = useState<'list' | 'performance'>('list');
  const [debtTab, setDebtTab] = useState<'customer' | 'supplier'>('customer');
  const [orderStatus, setOrderStatus] = useState<'all' | 'draft' | 'ordered' | 'received' | 'cancelled'>('all');

  const config = FEATURE_CONFIG[feature] || FEATURE_CONFIG.reports;

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['mobile-more-feature', feature, range],
    queryFn: async () => {
      const rangeStart = buildRangeStart(range);

      if (feature === 'reports') {
        const startDate = new Date(rangeStart);
        const endDate = new Date();

        const [salesRes, workRes, cashRes, partsRes, supplierDebtRes] = await Promise.all([
          supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(2000),
          supabase.from('work_orders').select('*').order('created_at', { ascending: false }).limit(2000),
          supabase.from('cash_transactions_ledger').select('*').order('date', { ascending: false }).limit(3000),
          supabase
            .from('parts')
            .select('*')
            .limit(3000),
          supabase.from('supplier_debts').select('*').order('created_at', { ascending: false }).limit(2000),
        ]);

        let cashData = cashRes.data ?? [];
        let cashSource = 'cash_transactions_ledger';
        const shouldFallbackCash =
          !!cashRes.error ||
          cashData.length === 0;

        if (shouldFallbackCash) {
          const fallbackCashRes = await supabase.from('cash_transactions').select('*').order('date', { ascending: false }).limit(3000);
          if (fallbackCashRes.error && cashRes.error) {
            throw new Error(`${cashRes.error.message || 'Ledger query failed'} | ${fallbackCashRes.error.message || 'Cash query failed'}`);
          }

          const fallbackRows = fallbackCashRes.data ?? [];
          if (fallbackRows.length > 0 || cashData.length === 0) {
            cashData = fallbackRows;
            cashSource = 'cash_transactions';
          }
        }

        if (salesRes.error || workRes.error || partsRes.error || supplierDebtRes.error) {
          throw new Error(
            [salesRes.error?.message, workRes.error?.message, partsRes.error?.message, supplierDebtRes.error?.message]
              .filter(Boolean)
              .join(' | ') || 'Query failed'
          );
        }

        const salesRows = (salesRes.data ?? []).filter((row: any) => {
          if (!isCurrentBranchRow(row)) return false;
          const status = String(row.status || '').toLowerCase();
          if (status === 'cancelled' || status === 'refunded') return false;
          const d = new Date(row.date || row.created_at);
          return !Number.isNaN(d.getTime()) && d >= startDate && d <= endDate;
        });

        const workRows = (workRes.data ?? []).filter((row: any) => {
          if (!isCurrentBranchRow(row)) return false;
          const status = String(row.status || '').toLowerCase();
          if (status === 'cancelled' || status === 'da huy' || status === 'đã hủy') return false;
          if (row.refunded === true) return false;
          if (!isPaidWorkOrder(row)) return false;
          const accountingDate = getWorkOrderAccountingDate(row);
          return !!accountingDate && accountingDate >= startDate && accountingDate <= endDate;
        });

        const cashByBranch = cashData.filter((row: any) => isCurrentBranchRow(row));
        const cashRows = cashByBranch.length > 0 ? cashByBranch : cashData;
        const partRows = partsRes.data ?? [];
        const supplierDebtRows = supplierDebtRes.data ?? [];

        const partsCostMap = new Map<string, number>();
        partRows.forEach((part: any) => {
          const cost = getNestedBranchNumber(part.costPrice) || safeNumber(part.costPrice ?? part.costprice);
          if (part.id) partsCostMap.set(String(part.id), cost);
          if (part.sku) partsCostMap.set(String(part.sku), cost);
        });

        const saleRevenue = salesRows.reduce((sum: number, row: any) => sum + safeNumber(row.total), 0);
        const workRevenue = workRows.reduce((sum: number, row: any) => sum + safeNumber(row.totalPaid ?? row.totalpaid ?? row.total), 0);
        const totalRevenue = saleRevenue + workRevenue;

        const periodCashRows = cashRows.filter((row: any) => {
          const d = new Date(getCashTxDate(row));
          return !Number.isNaN(d.getTime()) && d >= startDate && d <= endDate;
        });

        const refundAmount = periodCashRows
          .filter((row: any) => normalizeCashTxTypeByCategory(row) === 'expense' && getCashTxAmount(row) > 0 && isRefundCategory(getCashTxCategory(row)))
          .reduce((sum: number, row: any) => sum + getCashTxAmount(row), 0);

        const cashIncome = periodCashRows
          .filter((row: any) => normalizeCashTxTypeByCategory(row) === 'income' && !isExcludedIncomeCategory(getCashTxCategory(row)))
          .reduce((sum: number, row: any) => sum + getCashTxAmount(row), 0);
        const cashExpense = periodCashRows
          .filter((row: any) => normalizeCashTxTypeByCategory(row) === 'expense' && getCashTxAmount(row) > 0 && !isExcludedExpenseCategory(getCashTxCategory(row)))
          .reduce((sum: number, row: any) => sum + getCashTxAmount(row), 0);

        const dailyMap = new Map<
          string,
          {
            date: string;
            sales: any[];
            workOrders: any[];
            transactions: any[];
            totalRevenue: number;
            totalProfit: number;
            orderCount: number;
            otherIncome: number;
            otherExpense: number;
            refund: number;
            netProfit: number;
          }
        >();

        const ensureDay = (dateValue: unknown) => {
          const key = toDayKey(dateValue);
          if (!dailyMap.has(key)) {
            dailyMap.set(key, {
              date: key,
              sales: [],
              workOrders: [],
              transactions: [],
              totalRevenue: 0,
              totalProfit: 0,
              orderCount: 0,
              otherIncome: 0,
              otherExpense: 0,
              refund: 0,
              netProfit: 0,
            });
          }
          return dailyMap.get(key)!;
        };

        salesRows.forEach((row: any) => {
          const day = ensureDay(row.date || row.created_at);
          const amount = safeNumber(row.total);
          const saleItems = parseSaleItems(row.items);
          const saleCost = saleItems.reduce((sum: number, item: any) => {
            const unitCost = safeNumber(item.costPrice || item.costprice)
              || safeNumber(partsCostMap.get(String(item.partId || '')))
              || safeNumber(partsCostMap.get(String(item.sku || '')));
            return sum + unitCost * safeNumber(item.quantity);
          }, 0);
          const saleRow = {
            id: String(row.id),
            total: amount,
            saleCode: String(row.saleCode || row.salecode || row.sale_code || `SALE-${row.id}`),
            customerName: String(row.customerName || row.customername || row.customer?.name || 'Khach vang lai'),
            items: saleItems,
          };
          day.sales.push(saleRow);
          day.totalRevenue += amount;
          day.totalProfit += amount - saleCost;
          day.orderCount += 1;
        });

        workRows.forEach((row: any) => {
          const accountingDate = getWorkOrderAccountingDate(row);
          if (!accountingDate) return;
          const day = ensureDay(accountingDate.toISOString());
          const amount = safeNumber(row.totalPaid ?? row.totalpaid ?? row.total);
          const partsUsed = Array.isArray(row.partsUsed || row.partsused || row.parts_used) ? (row.partsUsed || row.partsused || row.parts_used) : [];
          const woCost = partsUsed.reduce((sum: number, p: any) => {
            const unitCost = safeNumber(p.costPrice || p.costprice)
              || safeNumber(partsCostMap.get(String(p.partId || p.partid || '')))
              || safeNumber(partsCostMap.get(String(p.sku || '')));
            return sum + unitCost * safeNumber(p.quantity);
          }, 0);
          day.workOrders.push({
            id: String(row.id),
            total: amount,
            customerName: String(row.customerName || row.customername || 'Khach vang lai'),
            vehicleModel: String(row.vehicleModel || row.vehiclemodel || ''),
            licensePlate: String(row.licensePlate || row.licenseplate || ''),
          });
          day.totalRevenue += amount;
          day.totalProfit += amount - woCost;
          day.orderCount += 1;
        });

        periodCashRows.forEach((row: any) => {
          const txDate = getCashTxDate(row);
          const day = ensureDay(txDate);
          const txType = normalizeCashTxTypeByCategory(row);
          const tx = {
            id: String(row.id || `${txDate}-${getCashTxAmount(row)}`),
            amount: getCashTxAmount(row),
            type: txType,
            category: getCashTxCategory(row),
            description: getCashTxDescription(row),
          };
          day.transactions.push(tx);
          if (tx.type === 'income' && !isExcludedIncomeCategory(tx.category)) {
            day.otherIncome += tx.amount;
          }
          if (tx.type === 'expense' && tx.amount > 0 && !isExcludedExpenseCategory(tx.category)) {
            day.otherExpense += tx.amount;
          }
          if (tx.type === 'expense' && tx.amount > 0 && isRefundCategory(tx.category)) {
            day.refund += tx.amount;
          }
        });

        const allDailyRows = Array.from(dailyMap.values())
          .map((row) => ({
            ...row,
            netProfit: row.totalProfit + row.otherIncome - row.otherExpense - row.refund,
          }))
          .sort((a, b) => (a.date < b.date ? 1 : -1));

        const dailyReport = allDailyRows.slice(0, 20);

        const totalProfit = allDailyRows.reduce((sum, row) => sum + row.totalProfit, 0);
        const netProfit = allDailyRows.reduce((sum, row) => sum + row.netProfit, 0);
        const combinedRevenue = totalRevenue + cashIncome - refundAmount;

        const stockOf = (obj: any) => getNestedBranchNumber(obj);
        const inventoryRows = partRows.map((p: any) => {
          const stock = stockOf(p.stock);
          const reserved = stockOf(p.reservedstock);
          const available = Math.max(0, stock - reserved);
          const cost = stockOf(p.costPrice || p.costprice);
          return {
            name: String(p.name || 'Phu tung'),
            available,
            value: available * cost,
          };
        });

        const inventoryValue = inventoryRows.reduce((sum: number, row: any) => sum + safeNumber(row.value), 0);
        const lowStockItems = inventoryRows
          .filter((row: any) => row.available > 0 && row.available <= 5)
          .sort((a: any, b: any) => a.available - b.available)
          .slice(0, 5);

        const customerDebt = salesRows
          .filter((row: any) => String(row.paymentStatus || row.paymentstatus || '').toLowerCase() !== 'paid')
          .reduce((sum: number, row: any) => sum + safeNumber(row.remainingAmount ?? row.remainingamount), 0);
        const supplierDebt = supplierDebtRows.reduce((sum: number, row: any) => sum + safeNumber(row.remainingAmount ?? row.remainingamount), 0);

        return {
          revenue: {
            salesRevenue: saleRevenue,
            workOrderRevenue: workRevenue,
            totalRevenue,
            combinedRevenue,
            totalProfit,
            netProfit,
            cashIncome,
            cashExpense,
            refundAmount,
            cashTxCount: periodCashRows.length,
            cashSource,
            cashRowsTotal: cashData.length,
            orderCount: allDailyRows.reduce((sum, row) => sum + row.orderCount, 0),
            dailyReport,
          },
          cashflow: {
            totalIncome: cashIncome,
            totalExpense: cashExpense,
            net: cashIncome - cashExpense,
          },
          inventory: {
            totalValue: inventoryValue,
            lowStockItems,
            partCount: inventoryRows.length,
          },
          debt: {
            customerDebt,
            supplierDebt,
            netDebt: customerDebt - supplierDebt,
          },
        };
      }

      if (feature === 'staff') {
        const [employeesRes, workRes] = await Promise.all([
          supabase
            .from('employees')
            .select('id,name,phone,email,position,status,baseSalary,basesalary,allowances,startDate,startdate')
            .order('name', { ascending: true })
            .limit(1000),
          supabase
            .from('work_orders')
            .select('id,technicianName,technicianname,creationdate')
            .gte('creationdate', buildRangeStart('month'))
            .limit(1500),
        ]);

        const employees = employeesRes.error ? [] : (employeesRes.data ?? []);
        const works = workRes.error ? [] : (workRes.data ?? []);

        const performance = new Map<string, number>();
        works.forEach((w: any) => {
          const name = String(w.technicianName || w.technicianname || 'Chua gan').trim() || 'Chua gan';
          performance.set(name, (performance.get(name) || 0) + 1);
        });

        const topStaff = Array.from(performance.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, count]) => ({ name, count }));

        return {
          employees,
          stats: {
            total: employees.length,
            active: employees.filter((e: any) => String(e.status || 'active').toLowerCase() === 'active').length,
            totalSalary: employees.reduce((sum: number, e: any) => sum + safeNumber(e.baseSalary ?? e.basesalary) + safeNumber(e.allowances), 0),
          },
          topStaff,
        };
      }

      if (feature === 'debt') {
        const [salesRes, supplierDebtRes] = await Promise.all([
          supabase
            .from('sales')
            .select('id,customerName,customername,remainingAmount,remainingamount,paymentStatus,paymentstatus,created_at')
            .order('created_at', { ascending: false })
            .limit(1500),
          supabase
            .from('supplier_debts')
            .select('id,supplierName,suppliername,remainingAmount,remainingamount,created_at')
            .order('created_at', { ascending: false })
            .limit(1500),
        ]);

        const customerRows = (salesRes.data ?? [])
          .filter((row: any) => String(row.paymentStatus || row.paymentstatus || '').toLowerCase() !== 'paid')
          .filter((row: any) => safeNumber(row.remainingAmount ?? row.remainingamount) > 0)
          .map((row: any) => ({
            id: String(row.id),
            name: String(row.customerName || row.customername || 'Khach hang'),
            amount: safeNumber(row.remainingAmount ?? row.remainingamount),
            date: String(row.created_at || new Date().toISOString()),
          }));

        const supplierRows = (supplierDebtRes.error ? [] : supplierDebtRes.data ?? [])
          .filter((row: any) => safeNumber(row.remainingAmount ?? row.remainingamount) > 0)
          .map((row: any) => ({
            id: String(row.id),
            name: String(row.supplierName || row.suppliername || 'Nha cung cap'),
            amount: safeNumber(row.remainingAmount ?? row.remainingamount),
            date: String(row.created_at || new Date().toISOString()),
          }));

        return {
          customerRows,
          supplierRows,
          totals: {
            customer: customerRows.reduce((sum: number, row: any) => sum + row.amount, 0),
            supplier: supplierRows.reduce((sum: number, row: any) => sum + row.amount, 0),
          },
        };
      }

      const poRes = await supabase
        .from('purchase_orders')
        .select('id,po_number,status,total_amount,final_amount,order_date,created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!poRes.error) {
        return {
          orders: (poRes.data ?? []).map((row: any) => ({
            id: String(row.id),
            code: String(row.po_number || `PO-${row.id}`),
            status: String(row.status || 'draft'),
            date: String(row.order_date || row.created_at || new Date().toISOString()),
            total: safeNumber(row.final_amount ?? row.total_amount),
          })),
        };
      }

      const txRes = await supabase
        .from('inventory_transactions')
        .select('id,date,totalPrice,totalprice,notes,type')
        .in('type', ['Nhập kho', 'Nhap kho', 'import', 'IMPORT'])
        .order('date', { ascending: false })
        .limit(1200);

      const txRows = txRes.data ?? [];
      const grouped = new Map<string, { code: string; date: string; total: number }>();
      txRows.forEach((row: any, idx: number) => {
        const code = parseReceiptCode(row.notes) || `NH-FALLBACK-${String(idx + 1).padStart(4, '0')}`;
        const current = grouped.get(code);
        if (!current) {
          grouped.set(code, {
            code,
            date: String(row.date || new Date().toISOString()),
            total: safeNumber(row.totalPrice ?? row.totalprice),
          });
        } else {
          current.total += safeNumber(row.totalPrice ?? row.totalprice);
        }
      });

      return {
        orders: Array.from(grouped.values()).map((row, index) => ({
          id: String(index + 1),
          code: row.code,
          status: 'received',
          date: row.date,
          total: row.total,
        })),
      };
    },
    staleTime: 60000,
  });

  const renderRangeChips = feature === 'reports' ? (
    <View style={styles.chipsRow}>
      {([
        { key: 'today', label: 'Hom nay' },
        { key: 'week', label: '7 ngay' },
        { key: 'month', label: 'Thang' },
        { key: 'year', label: 'Nam' },
      ] as const).map((chip) => (
        <TouchableOpacity key={chip.key} style={[styles.chip, range === chip.key && styles.chipActive]} onPress={() => setRange(chip.key)}>
          <Text style={[styles.chipText, range === chip.key && styles.chipTextActive]}>{chip.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  ) : null;

  const renderBody = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={BRAND_COLORS.primary} />
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Loi: {error?.message || String(error)}</Text>
        </View>
      );
    }

    const value = data as any;

    if (feature === 'reports') {
      return (
        <>
          <View style={styles.chipsRow}>
            {([
              { key: 'revenue', label: 'Doanh thu' },
              { key: 'cashflow', label: 'Thu chi' },
              { key: 'inventory', label: 'Ton kho' },
              { key: 'debt', label: 'Cong no' },
            ] as const).map((tab) => (
              <TouchableOpacity key={tab.key} style={[styles.chip, reportTab === tab.key && styles.chipActive]} onPress={() => setReportTab(tab.key)}>
                <Text style={[styles.chipText, reportTab === tab.key && styles.chipTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {reportTab === 'revenue' && (
            <>
              <View style={styles.summaryGrid}>
                <View style={[styles.summaryCard, styles.summaryCardRevenue]}>
                  <Text style={styles.summaryLabel}>Doanh thu</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(value?.revenue?.combinedRevenue || 0)}</Text>
                  <Text style={styles.summaryHintSmall}>
                    Ban hang: {formatCurrency(value?.revenue?.totalRevenue || 0)}
                  </Text>
                </View>
                <View style={[styles.summaryCard, styles.summaryCardProfit]}>
                  <Text style={styles.summaryLabel}>Loi nhuan</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(value?.revenue?.totalProfit || 0)}</Text>
                </View>
              </View>

              <View style={[styles.summaryCard, styles.summaryCardNet]}>
                <Text style={styles.summaryLabel}>Loi nhuan rong</Text>
                <Text style={styles.summaryValue}>{formatCurrency(value?.revenue?.netProfit || 0)}</Text>
                <Text style={styles.summaryHint}>
                  (Loi nhuan + Thu khac {formatCurrency(value?.revenue?.cashIncome || 0)}) - Chi khac {formatCurrency(value?.revenue?.cashExpense || 0)} - Hoan tien {formatCurrency(value?.revenue?.refundAmount || 0)}
                </Text>
              </View>

              

              <Text style={styles.listTitle}>Chi tiet theo ngay</Text>
              {(value?.revenue?.dailyReport || []).map((day: any) => {
                const isExpanded = selectedReportDate === day.date;
                return (
                  <TouchableOpacity
                    key={day.date}
                    style={styles.dayCard}
                    onPress={() => setSelectedReportDate(isExpanded ? null : day.date)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.dayHeader}>
                      <View>
                        <Text style={styles.dayDate}>{new Date(day.date).toLocaleDateString('vi-VN')}</Text>
                        <Text style={styles.daySub}>{day.orderCount} don hang</Text>
                      </View>
                      <View style={styles.dayHeaderRight}>
                        <Text style={styles.dayNetLabel}>Loi nhuan rong</Text>
                        <Text style={styles.dayNetValue}>{formatCurrency(day.netProfit || 0)}</Text>
                      </View>
                    </View>

                    <View style={styles.dayMetricsRow}>
                      <Text style={styles.dayMetric}>Doanh thu: {formatCurrency(day.totalRevenue || 0)}</Text>
                      <Text style={styles.dayMetric}>Loi nhuan: {formatCurrency(day.totalProfit || 0)}</Text>
                        <Text style={[styles.dayMetric, { color: (day.otherIncome - day.otherExpense - day.refund) < 0 ? '#B0454A' : '#7386A6' }]}>
                          Thu/Chi khac: {formatCurrency(day.otherIncome - day.otherExpense - day.refund)}
                        </Text>
                    </View>

                    {isExpanded && (
                      <View style={styles.expandedWrap}>
                        <Text style={styles.expandedTitle}>Don ban hang ({day.sales.length})</Text>
                        {day.sales.length === 0 ? (
                          <Text style={styles.emptyText}>Khong co don ban hang</Text>
                        ) : (
                          day.sales.map((sale: any) => (
                            <View key={sale.id} style={styles.detailItemCard}>
                              <View style={styles.detailItemRow}>
                                <Text style={styles.detailMain}>{sale.customerName}</Text>
                                <Text style={styles.detailAmount}>{formatCurrency(sale.total || 0)}</Text>
                              </View>
                              <Text style={styles.detailSub}>{sale.saleCode}</Text>
                            </View>
                          ))
                        )}

                        <Text style={styles.expandedTitle}>Sua chua ({day.workOrders.length})</Text>
                        {day.workOrders.length === 0 ? (
                          <Text style={styles.emptyText}>Khong co don sua chua</Text>
                        ) : (
                          day.workOrders.map((wo: any) => (
                            <View key={wo.id} style={styles.detailItemCard}>
                              <View style={styles.detailItemRow}>
                                <Text style={styles.detailMain}>{wo.customerName}</Text>
                                <Text style={[styles.detailAmount, { color: '#5B4DB5' }]}>{formatCurrency(wo.total || 0)}</Text>
                              </View>
                              <Text style={styles.detailSub}>{`${wo.vehicleModel} ${wo.licensePlate}`.trim()}</Text>
                            </View>
                          ))
                        )}

                        <Text style={styles.expandedTitle}>Thu chi khac ({day.transactions.length})</Text>
                        {day.transactions.length === 0 ? (
                          <Text style={styles.emptyText}>Khong co giao dich</Text>
                        ) : (
                          day.transactions.map((tx: any) => (
                            <View key={tx.id} style={styles.detailItemCard}>
                              <View style={styles.detailItemRow}>
                                <Text style={styles.detailMain}>{tx.description || tx.category || 'Giao dich'}</Text>
                                <Text style={[styles.detailAmount, tx.type === 'income' ? styles.incomeText : styles.expenseText]}>
                                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount || 0))}
                                </Text>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {reportTab === 'cashflow' && (
            <>
              <MetricCard label="Tong thu" value={formatCurrency(value?.cashflow?.totalIncome || 0)} />
              <MetricCard label="Tong chi" value={formatCurrency(value?.cashflow?.totalExpense || 0)} />
              <MetricCard label="Dong tien rong" value={formatCurrency(value?.cashflow?.net || 0)} />
            </>
          )}

          {reportTab === 'inventory' && (
            <>
              <MetricCard label="Gia tri ton" value={formatCurrency(value?.inventory?.totalValue || 0)} />
              <MetricCard label="So mat hang" value={String(value?.inventory?.partCount || 0)} />
              {(value?.inventory?.lowStockItems || []).map((item: any, idx: number) => (
                <MetricCard key={`${item.name}-${idx}`} label={`${item.name} (SL ${item.available})`} value={formatCurrency(item.value || 0)} compact />
              ))}
            </>
          )}

          {reportTab === 'debt' && (
            <>
              <MetricCard label="Cong no khach hang" value={formatCurrency(value?.debt?.customerDebt || 0)} />
              <MetricCard label="Cong no nha cung cap" value={formatCurrency(value?.debt?.supplierDebt || 0)} />
              <MetricCard label="No rong" value={formatCurrency(value?.debt?.netDebt || 0)} />
            </>
          )}
        </>
      );
    }

    if (feature === 'staff') {
      const employees = value?.employees || [];
      const topStaff = value?.topStaff || [];
      return (
        <>
          <View style={styles.chipsRow}>
            <TouchableOpacity style={[styles.chip, staffTab === 'list' && styles.chipActive]} onPress={() => setStaffTab('list')}>
              <Text style={[styles.chipText, staffTab === 'list' && styles.chipTextActive]}>Danh sach</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, staffTab === 'performance' && styles.chipActive]} onPress={() => setStaffTab('performance')}>
              <Text style={[styles.chipText, staffTab === 'performance' && styles.chipTextActive]}>Hieu suat</Text>
            </TouchableOpacity>
          </View>
          <MetricCard label="Tong nhan vien" value={String(value?.stats?.total || 0)} />
          <MetricCard label="Dang hoat dong" value={String(value?.stats?.active || 0)} />
          <MetricCard label="Tong luong uoc tinh" value={formatCurrency(value?.stats?.totalSalary || 0)} />
          {staffTab === 'list'
            ? employees.slice(0, 20).map((emp: any) => (
                <MetricCard
                  key={String(emp.id)}
                  label={`${String(emp.name || 'Nhan vien')} • ${String(emp.position || 'Nhan su')}`}
                  value={String(emp.phone || '-')}
                  compact
                  subLabel={String(emp.status || '')}
                />
              ))
            : topStaff.map((row: any) => <MetricCard key={row.name} label={row.name} value={`${row.count} phieu`} compact />)}
        </>
      );
    }

    if (feature === 'debt') {
      const customerRows = value?.customerRows || [];
      const supplierRows = value?.supplierRows || [];
      const rows = debtTab === 'customer' ? customerRows : supplierRows;

      return (
        <>
          <View style={styles.chipsRow}>
            <TouchableOpacity style={[styles.chip, debtTab === 'customer' && styles.chipActive]} onPress={() => setDebtTab('customer')}>
              <Text style={[styles.chipText, debtTab === 'customer' && styles.chipTextActive]}>Cong no KH</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, debtTab === 'supplier' && styles.chipActive]} onPress={() => setDebtTab('supplier')}>
              <Text style={[styles.chipText, debtTab === 'supplier' && styles.chipTextActive]}>Cong no NCC</Text>
            </TouchableOpacity>
          </View>
          <MetricCard label="Tong no KH" value={formatCurrency(value?.totals?.customer || 0)} />
          <MetricCard label="Tong no NCC" value={formatCurrency(value?.totals?.supplier || 0)} />
          {rows.slice(0, 25).map((row: any) => (
            <MetricCard
              key={`${row.id}-${row.name}`}
              label={row.name}
              value={formatCurrency(row.amount || 0)}
              compact
              subLabel={new Date(row.date).toLocaleDateString('vi-VN')}
            />
          ))}
        </>
      );
    }

    const orders = (value?.orders || []) as Array<{ id: string; code: string; status: string; date: string; total: number }>;
    const filtered = orderStatus === 'all' ? orders : orders.filter((row) => row.status === orderStatus);

    return (
      <>
        <View style={styles.chipsRow}>
          {([
            { key: 'all', label: 'Tat ca' },
            { key: 'draft', label: 'Nhap' },
            { key: 'ordered', label: 'Da dat' },
            { key: 'received', label: 'Da nhan' },
            { key: 'cancelled', label: 'Huy' },
          ] as const).map((chip) => (
            <TouchableOpacity key={chip.key} style={[styles.chip, orderStatus === chip.key && styles.chipActive]} onPress={() => setOrderStatus(chip.key)}>
              <Text style={[styles.chipText, orderStatus === chip.key && styles.chipTextActive]}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {filtered.slice(0, 40).map((row) => (
          <MetricCard
            key={`${row.id}-${row.code}`}
            label={`${row.code} • ${row.status}`}
            value={formatCurrency(row.total || 0)}
            compact
            subLabel={new Date(row.date).toLocaleDateString('vi-VN')}
          />
        ))}
      </>
    );
  };

  const isReportFeature = feature === 'reports';

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, isReportFeature && styles.contentFull]}>
      <View style={styles.headerCard}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={22} color="#D9E6FF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.subtitle}>{config.subtitle}</Text>
        </View>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name={config.icon} size={24} color="#A8CCFF" />
        </View>
      </View>

      <View style={[styles.section, isReportFeature && styles.sectionFull]}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Tinh nang</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.refreshText}>{isRefetching ? 'Dang cap nhat...' : 'Lam moi'}</Text>
          </TouchableOpacity>
        </View>

        {renderRangeChips}
        {renderBody()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF3FA' },
  content: { padding: 16, paddingBottom: 28 },
  contentFull: { paddingHorizontal: 10 },
  headerCard: {
    backgroundColor: '#0F2E66',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#BFD3F2', fontSize: 12, marginTop: 2 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8E2F0',
    padding: 12,
    gap: 8,
  },
  sectionFull: {
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingTop: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { color: '#213B64', fontSize: 14, fontWeight: '800' },
  refreshText: { color: '#3C74C4', fontSize: 12, fontWeight: '700' },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D6E1F0',
    backgroundColor: '#F6F9FF',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: '#EAF3FF',
    borderColor: '#A8D3FF',
  },
  chipText: {
    color: '#5C7498',
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#2A6FD7',
  },
  loadingBox: { paddingVertical: 18, alignItems: 'center' },
  errorBox: {
    borderRadius: 10,
    backgroundColor: '#FFF1F3',
    borderWidth: 1,
    borderColor: '#FFD6DC',
    padding: 10,
  },
  errorText: { color: '#A84055', fontSize: 12, fontWeight: '600' },
  metricCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DEE6F2',
    backgroundColor: '#F9FBFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metricLabel: { color: '#5E769A', fontSize: 12, fontWeight: '700' },
  metricSub: { color: '#7E91AF', fontSize: 11, marginTop: 2 },
  metricValue: { color: '#1F3A63', fontSize: 20, fontWeight: '800', marginTop: 2 },
  summaryGrid: { flexDirection: 'row', gap: 8 },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryCardRevenue: { backgroundColor: '#EAF3FF', borderColor: '#C7DFFF' },
  summaryCardProfit: { backgroundColor: '#EAFBF1', borderColor: '#C7ECD5' },
  summaryCardNet: { backgroundColor: '#F2EEFF', borderColor: '#D9CBFF' },
  summaryLabel: { color: '#516B8E', fontSize: 11, fontWeight: '700' },
  summaryValue: { color: '#1E3358', fontSize: 17, fontWeight: '800', marginTop: 3 },
  summaryHint: { color: '#7386A6', fontSize: 10, marginTop: 2 },
  summaryHintSmall: { color: '#7D90AE', fontSize: 9, marginTop: 2 },
  
  
  
  
  listTitle: { color: '#5C7498', fontSize: 12, fontWeight: '800', marginTop: 4 },
  dayCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE6F4',
    backgroundColor: '#FDFEFF',
    padding: 10,
    gap: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#EAF0F8',
    paddingBottom: 8,
  },
  dayDate: { color: '#243F68', fontSize: 13, fontWeight: '800' },
  daySub: { color: '#7A8FAE', fontSize: 11, marginTop: 2 },
  dayHeaderRight: { alignItems: 'flex-end' },
  dayNetLabel: { color: '#768AA8', fontSize: 10, fontWeight: '700' },
  dayNetValue: { color: '#243F68', fontSize: 13, fontWeight: '800', marginTop: 1 },
  dayMetricsRow: { gap: 3 },
  dayMetric: { color: '#5E769A', fontSize: 11, fontWeight: '600' },
  expandedWrap: {
    borderTopWidth: 1,
    borderTopColor: '#EAF0F8',
    paddingTop: 8,
    gap: 6,
  },
  expandedTitle: { color: '#3D5A84', fontSize: 11, fontWeight: '800', marginTop: 2 },
  detailItemCard: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E3EBF7',
    backgroundColor: '#F8FBFF',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  detailItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  detailMain: { flex: 1, color: '#284671', fontSize: 11, fontWeight: '700' },
  detailAmount: { color: '#2E66B6', fontSize: 11, fontWeight: '800' },
  detailSub: { color: '#7E91AF', fontSize: 10, marginTop: 2 },
  emptyText: { color: '#8A9BB5', fontSize: 11, fontStyle: 'italic' },
  incomeText: { color: '#1F8A53' },
  expenseText: { color: '#B0454A' },
});
