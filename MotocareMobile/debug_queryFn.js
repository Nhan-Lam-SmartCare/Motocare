const { createClient } = require(\'@supabase/supabase-js\'); const supabase = createClient(\'https://uluxycppxlzdskyklgqt.supabase.co\', \'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsdXh5Y3BweGx6ZHNreWtsZ3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDU5MzIsImV4cCI6MjA3ODA4MTkzMn0.pCmr1LEfsiPnvWKeTjGX4zGgUOYbwaLoKe1Qzy5jbdk\'); const STAFF_BRANCH_ID = \'default\'; const buildRangeStart = (range: 'today' | 'week' | 'month' | 'year'): string => {
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

default function MoreFeatureScreen() {
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

  