import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Switch,
  useColorScheme,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND_COLORS, formatCurrency, formatDate } from '../../constants';
import { supabase } from '../../shared/supabaseClient';
import { printSaleReceipt, shareSaleReceipt } from '../../shared/salesReceipt';
import type { CartItem, Customer, Part, Sale } from '../../shared/types';

type SalesTab = 'products' | 'cart' | 'history';
type StockFilter = 'all' | 'low' | 'out';
type PaymentMethod = 'cash' | 'bank' | 'card';
type PaymentType = 'full' | 'partial' | 'note' | 'installment';
type DeliveryMethod = 'store_pickup' | 'cod';
type DeliveryStatus = 'pending' | 'preparing' | 'shipping' | 'delivered' | 'cancelled';

type InstallmentDetails = {
  financeCompany: string;
  prepaidAmount: number;
  term: number;
  monthlyPayment: number;
  interestRate: number;
  totalDetail: number;
};

type CustomerFormMode = 'create' | 'edit';

type CustomerDraft = {
  name: string;
  phone: string;
  email: string;
  vehicleModel: string;
  licensePlate: string;
};

type QuickService = {
  id: string;
  name: string;
  price: number;
  category: string;
  sort_order: number;
};

const BRANCH_ID = 'CN1';
const LOW_STOCK_THRESHOLD = 5;
const PAGE_SIZE = 20;
const QUICK_SERVICE_CATEGORY_ORDER = ['wash', 'repair', 'maintenance', 'other'];
const QUICK_SERVICE_CATEGORY_LABELS: Record<string, string> = {
  wash: 'Rửa xe',
  repair: 'Sửa nhanh',
  maintenance: 'Bảo dưỡng',
  other: 'Khác',
};
const QUICK_SERVICE_CATEGORY_COLORS: Record<string, string> = {
  wash: '#2A80D9',
  repair: '#D86C25',
  maintenance: '#2F8F5B',
  other: '#4D6A88',
};

const SALES_COLUMN_CANDIDATES: Record<string, string[]> = {
  sale_code: ['sale_code'],
  date: ['date', 'created_at'],
  items: ['items'],
  subtotal: ['subtotal'],
  discount: ['discount'],
  total: ['total'],
  status: ['status'],
  customer: ['customer'],
  paymentMethod: ['paymentMethod', 'payment_method'],
  paymentType: ['paymentType', 'payment_type'],
  partialAmount: ['partialAmount', 'partial_amount'],
  orderNote: ['orderNote', 'order_note'],
  paidAmount: ['paidAmount', 'paid_amount'],
  remainingAmount: ['remainingAmount', 'remaining_amount'],
  installmentDetails: ['installmentDetails', 'installment_details'],
  deliveryMethod: ['deliveryMethod', 'delivery_method'],
  deliveryStatus: ['deliveryStatus', 'delivery_status'],
  deliveryAddress: ['deliveryAddress', 'delivery_address'],
  deliveryPhone: ['deliveryPhone', 'delivery_phone'],
  deliveryNotes: ['deliveryNotes', 'delivery_notes'],
  codAmount: ['codAmount', 'cod_amount'],
  shippingFee: ['shippingFee', 'shipping_fee'],
  trackingNumber: ['trackingNumber', 'tracking_number'],
  shippingCarrier: ['shippingCarrier', 'shipping_carrier'],
  userId: ['userId', 'user_id'],
  userName: ['userName', 'user_name'],
  branchId: ['branchId', 'branch_id'],
};

const CUSTOMER_DEBT_COLUMN_CANDIDATES: Record<string, string[]> = {
  customerId: ['customerId', 'customer_id', 'customerid'],
  customerName: ['customerName', 'customer_name', 'customername'],
  phone: ['phone'],
  description: ['description'],
  totalAmount: ['totalAmount', 'total_amount', 'totalamount'],
  paidAmount: ['paidAmount', 'paid_amount', 'paidamount'],
  remainingAmount: ['remainingAmount', 'remaining_amount', 'remainingamount'],
  createdDate: ['createdDate', 'created_date', 'createddate'],
  branchId: ['branchId', 'branch_id', 'branchid'],
  saleId: ['saleId', 'sale_id', 'saleid'],
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const normalizePlate = (value: string) => value.trim().replace(/[-\s.]/g, '').toUpperCase();

const isLikelyLicensePlate = (value: string) => {
  const normalized = normalizePlate(value);
  return /[A-Z]/.test(normalized) && /\d/.test(normalized) && normalized.length >= 5;
};

const safeNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const parseMoneyInput = (value: string) => {
  const digits = value.replace(/[^\d]/g, '');
  return safeNumber(digits);
};

const formatMoneyInput = (value: number) => {
  const n = Math.max(0, Math.round(safeNumber(value)));
  return new Intl.NumberFormat('vi-VN').format(n);
};

const asString = (value: unknown, fallback = '') => {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  return String(value);
};

const toCustomer = (value: unknown): Sale['customer'] => {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed != null) {
        return {
          id: asString((parsed as Record<string, unknown>).id, undefined as unknown as string),
          name: asString((parsed as Record<string, unknown>).name, 'Khách lẻ'),
          phone: asString((parsed as Record<string, unknown>).phone, ''),
        };
      }
    } catch {
      return { name: value };
    }
  }

  if (typeof value === 'object' && value != null) {
    const obj = value as Record<string, unknown>;
    return {
      id: asString(obj.id, undefined as unknown as string),
      name: asString(obj.name, 'Khách lẻ'),
      phone: asString(obj.phone, ''),
    };
  }

  return { name: 'Khách lẻ' };
};

const toItems = (value: unknown): CartItem[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => ({
    partId: asString(item?.partId || item?.part_id || item?.id),
    partName: asString(item?.partName || item?.part_name || item?.name, 'Sản phẩm'),
    sku: asString(item?.sku),
    category: asString(item?.category),
    quantity: Math.max(0, safeNumber(item?.quantity || 0)),
    sellingPrice: safeNumber(item?.sellingPrice || item?.selling_price || 0),
    stockSnapshot: safeNumber(item?.stockSnapshot || item?.stock_snapshot || item?.quantity || 0),
    discount: safeNumber(item?.discount || 0),
    isService: Boolean(item?.isService || item?.is_service),
  }));
};

const toInstallment = (value: unknown): Sale['installmentDetails'] => {
  if (typeof value !== 'object' || value == null) return undefined;
  const obj = value as Record<string, unknown>;
  return {
    financeCompany: asString(obj.financeCompany ?? obj.finance_company),
    prepaidAmount: safeNumber(obj.prepaidAmount ?? obj.prepaid_amount),
    term: safeNumber(obj.term),
    monthlyPayment: safeNumber(obj.monthlyPayment ?? obj.monthly_payment),
    interestRate: safeNumber(obj.interestRate ?? obj.interest_rate),
    totalDetail: safeNumber(obj.totalDetail ?? obj.total_detail),
  };
};

const normalizeSaleRow = (row: any): Sale => ({
  id: asString(row?.id),
  sale_code: asString(row?.sale_code),
  date: asString(row?.date || row?.created_at || new Date().toISOString()),
  items: toItems(row?.items),
  subtotal: safeNumber(row?.subtotal),
  discount: safeNumber(row?.discount),
  total: safeNumber(row?.total),
  status: asString(row?.status, 'completed') as Sale['status'],
  customer: toCustomer(row?.customer),
  paymentMethod: asString(row?.paymentMethod ?? row?.payment_method, 'cash') as Sale['paymentMethod'],
  paymentType: asString(row?.paymentType ?? row?.payment_type) as Sale['paymentType'],
  partialAmount: safeNumber(row?.partialAmount ?? row?.partial_amount),
  orderNote: asString(row?.orderNote ?? row?.order_note),
  paidAmount: safeNumber(row?.paidAmount ?? row?.paid_amount),
  remainingAmount: safeNumber(row?.remainingAmount ?? row?.remaining_amount),
  installmentDetails: toInstallment(row?.installmentDetails ?? row?.installment_details),
  deliveryMethod: asString(row?.deliveryMethod ?? row?.delivery_method) as Sale['deliveryMethod'],
  deliveryStatus: asString(row?.deliveryStatus ?? row?.delivery_status) as Sale['deliveryStatus'],
  deliveryAddress: asString(row?.deliveryAddress ?? row?.delivery_address),
  deliveryPhone: asString(row?.deliveryPhone ?? row?.delivery_phone),
  deliveryNotes: asString(row?.deliveryNotes ?? row?.delivery_notes),
  codAmount: safeNumber(row?.codAmount ?? row?.cod_amount),
  shippingFee: safeNumber(row?.shippingFee ?? row?.shipping_fee),
  trackingNumber: asString(row?.trackingNumber ?? row?.tracking_number),
  shippingCarrier: asString(row?.shippingCarrier ?? row?.shipping_carrier),
  userId: asString(row?.userId ?? row?.user_id, 'unknown'),
  userName: asString(row?.userName ?? row?.user_name, 'Nhân viên'),
  branchId: asString(row?.branchId ?? row?.branch_id, BRANCH_ID),
});

const buildSalesDbPayload = (
  canonical: Record<string, unknown>,
  columns?: Set<string>
) => {
  const payload: Record<string, unknown> = {};

  Object.entries(canonical).forEach(([key, value]) => {
    if (value === undefined) return;
    const candidates = SALES_COLUMN_CANDIDATES[key] || [key];
    const target =
      columns && columns.size > 0
        ? candidates.find((candidate) => columns.has(candidate))
        : candidates[0];

    if (target) {
      payload[target] = value;
    }
  });

  return payload;
};

const buildDbPayload = (
  canonical: Record<string, unknown>,
  candidates: Record<string, string[]>,
  columns?: Set<string>
) => {
  const payload: Record<string, unknown> = {};

  Object.entries(canonical).forEach(([key, value]) => {
    if (value === undefined) return;
    const list = candidates[key] || [key];
    const target = columns && columns.size > 0 ? list.find((c) => columns.has(c)) : list[0];
    if (target) payload[target] = value;
  });

  return payload;
};

const fromBranchValue = (value: unknown, branchId: string) => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'object' || value == null) return 0;
  const obj = value as Record<string, unknown>;
  const branchValue = safeNumber(obj[branchId]);
  if (branchValue > 0) return branchValue;
  const first = Object.values(obj).find((v) => Number.isFinite(Number(v)));
  return first == null ? 0 : safeNumber(first);
};

const stockForPart = (part: Part) => {
  const total = fromBranchValue(part.stock, BRANCH_ID);
  const reserved = fromBranchValue(part.reservedstock, BRANCH_ID);
  return Math.max(0, total - reserved);
};

const paymentMethodLabel = (method?: Sale['paymentMethod']) => {
  if (method === 'cash') return 'Tiền mặt';
  if (method === 'bank') return 'Chuyển khoản';
  if (method === 'card') return 'Thẻ';
  return '-';
};

const paymentTypeLabel = (type?: Sale['paymentType']) => {
  if (type === 'full') return 'Thanh toán đủ';
  if (type === 'partial') return 'Thanh toán một phần';
  if (type === 'note') return 'Ghi nợ';
  if (type === 'installment') return 'Trả góp';
  return '-';
};

const statusColor = (status?: Sale['status']) => {
  if (status === 'cancelled') return '#D84315';
  if (status === 'refunded') return '#8E24AA';
  return '#2E7D32';
};

const statusLabel = (status?: Sale['status']) => {
  if (status === 'cancelled') return 'Đã hủy';
  if (status === 'refunded') return 'Hoàn tiền';
  return 'Hoàn tất';
};

const customerVehiclesLabel = (customer?: Customer | null) => {
  if (!customer?.vehicles?.length) return 'Chưa có xe';
  return customer.vehicles
    .slice(0, 2)
    .map((v) => `${v.model || 'Xe'}${v.licensePlate ? ` (${v.licensePlate})` : ''}`)
    .join(', ');
};

const buildCustomerDraft = (customer?: Customer | null): CustomerDraft => {
  const firstVehicle = customer?.vehicles?.[0];
  return {
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    vehicleModel: firstVehicle?.model || '',
    licensePlate: firstVehicle?.licensePlate || '',
  };
};

const buildInstallmentNote = (baseNote: string, details: InstallmentDetails) => {
  const financeName = details.financeCompany || 'N/A';
  const installmentText = `[TRA GOP] ${financeName} - Tra truoc: ${details.prepaidAmount.toLocaleString('vi-VN')}d - Ky han: ${details.term} thang - Lai: ${details.interestRate}%/thang - Goc+Lai: ${details.totalDetail.toLocaleString('vi-VN')}d`;
  return baseNote ? `${baseNote}\n${installmentText}` : installmentText;
};

const fetchParts = async () => {
  const { data, error } = await supabase.from('parts').select('*').limit(500);
  if (error) throw error;
  return (data ?? []) as Part[];
};

const fetchCustomers = async () => {
  const { data, error } = await supabase
    .from('customers')
    .select('id,name,phone,email,vehicles,created_at')
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) throw error;
  return (data ?? []) as Customer[];
};

const fetchQuickServices = async () => {
  const { data, error } = await supabase
    .from('quick_services')
    .select('id,name,price,category,sort_order,is_active,branch_id')
    .eq('is_active', true)
    .or(`branch_id.eq.${BRANCH_ID},branch_id.is.null`)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    return [] as QuickService[];
  }

  return (data ?? []).map((row: any) => ({
    id: asString(row?.id),
    name: asString(row?.name),
    price: safeNumber(row?.price),
    category: asString(row?.category, 'other'),
    sort_order: safeNumber(row?.sort_order),
  }));
};

const fetchSalesColumns = async () => {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'sales');

  if (error) {
    return [] as string[];
  }

  return (data ?? [])
    .map((row: any) => asString(row?.column_name))
    .filter(Boolean);
};

const fetchTableColumns = async (tableName: string) => {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName);

  if (error) return [] as string[];
  return (data ?? []).map((row: any) => asString(row?.column_name)).filter(Boolean);
};

const fetchSales = async (page: number, search: string, status: string) => {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('sales')
    .select('*', { count: 'exact' })
    .order('date', { ascending: false })
    .range(from, to);

  if (search.trim()) {
    query = query.or(
      `sale_code.ilike.%${search.trim()}%,customer->>name.ilike.%${search.trim()}%,customer->>phone.ilike.%${search.trim()}%`
    );
  }

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    rows: (data ?? []).map((row) => normalizeSaleRow(row)),
    total: count ?? 0,
  };
};

const saleCode = (sale: Sale) => sale.sale_code || `SALE-${sale.id.slice(0, 8).toUpperCase()}`;

export default function SalesScreen() {
  const isDark = useColorScheme() === 'dark';
  const queryClient = useQueryClient();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<SalesTab>('products');
  const [partSearch, setPartSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [showScanner, setShowScanner] = useState(false);
  const [isWholesaleMode, setIsWholesaleMode] = useState(false);

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCustomerFormModal, setShowCustomerFormModal] = useState(false);
  const [customerFormMode, setCustomerFormMode] = useState<CustomerFormMode>('create');
  const [customerDraft, setCustomerDraft] = useState<CustomerDraft>(buildCustomerDraft());

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null);
  const [partialAmount, setPartialAmount] = useState('0');
  const [orderNote, setOrderNote] = useState('');

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('store_pickup');
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>('pending');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingCarrier, setShippingCarrier] = useState('');
  const [shippingFee, setShippingFee] = useState('0');

  const [installmentDetails, setInstallmentDetails] = useState<InstallmentDetails>({
    financeCompany: '',
    prepaidAmount: 0,
    term: 6,
    monthlyPayment: 0,
    interestRate: 0,
    totalDetail: 0,
  });

  const [salesSearch, setSalesSearch] = useState('');
  const [salesStatusFilter, setSalesStatusFilter] = useState<'all' | 'completed' | 'cancelled' | 'refunded'>('all');
  const [salesPage, setSalesPage] = useState(1);

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showDeliveryManager, setShowDeliveryManager] = useState(false);
  const [showQuickSaleModal, setShowQuickSaleModal] = useState(false);
  const [quickServiceSearch, setQuickServiceSearch] = useState('');
  const [quickServiceQuantities, setQuickServiceQuantities] = useState<Record<string, number>>({});
  const [selectedQuickService, setSelectedQuickService] = useState<QuickService | null>(null);
  const [quickServiceName, setQuickServiceName] = useState('');
  const [quickServicePrice, setQuickServicePrice] = useState('0');
  const [quickServiceQty, setQuickServiceQty] = useState('1');
  const [quickServiceNote, setQuickServiceNote] = useState('');
  const [quickPaymentMethod, setQuickPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [quickCustomerSearch, setQuickCustomerSearch] = useState('');
  const [quickFoundCustomer, setQuickFoundCustomer] = useState<Customer | null>(null);

  const { data: parts = [], isLoading: loadingParts } = useQuery({
    queryKey: ['sales-parts'],
    queryFn: fetchParts,
    staleTime: 60 * 1000,
  });

  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ['sales-customers'],
    queryFn: fetchCustomers,
    staleTime: 60 * 1000,
  });

  const {
    data: salesData,
    isLoading: loadingSales,
    isRefetching: refetchingSales,
    refetch: refetchSales,
  } = useQuery({
    queryKey: ['sales-history', salesPage, salesSearch, salesStatusFilter],
    queryFn: () => fetchSales(salesPage, salesSearch, salesStatusFilter),
    refetchInterval: 30000,
  });

  const { data: salesColumns = [] } = useQuery({
    queryKey: ['sales-columns'],
    queryFn: fetchSalesColumns,
    staleTime: 10 * 60 * 1000,
  });

  const salesColumnSet = useMemo(() => new Set(salesColumns), [salesColumns]);

  const { data: customerDebtColumns = [] } = useQuery({
    queryKey: ['customer-debts-columns'],
    queryFn: () => fetchTableColumns('customer_debts'),
    staleTime: 10 * 60 * 1000,
  });

  const customerDebtColumnSet = useMemo(() => new Set(customerDebtColumns), [customerDebtColumns]);

  const { data: customerColumns = [] } = useQuery({
    queryKey: ['customers-columns'],
    queryFn: () => fetchTableColumns('customers'),
    staleTime: 10 * 60 * 1000,
  });

  const { data: quickServices = [] } = useQuery({
    queryKey: ['quick-services', BRANCH_ID],
    queryFn: fetchQuickServices,
    staleTime: 5 * 60 * 1000,
  });

  const customerColumnSet = useMemo(() => new Set(customerColumns), [customerColumns]);

  const filteredQuickServices = useMemo(() => {
    const q = normalizeText(quickServiceSearch.trim());
    if (!q) return quickServices;

    return quickServices.filter((service) =>
      normalizeText(`${service.name} ${service.category || ''}`).includes(q)
    );
  }, [quickServiceSearch, quickServices]);

  const groupedQuickServices = useMemo(() => {
    const groups: Record<string, QuickService[]> = {};
    filteredQuickServices.forEach((service) => {
      const key = service.category || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(service);
    });

    return QUICK_SERVICE_CATEGORY_ORDER.filter((key) => groups[key]?.length).map((key) => ({
      key,
      label: QUICK_SERVICE_CATEGORY_LABELS[key] || key,
      items: groups[key],
    }));
  }, [filteredQuickServices]);

  const filteredParts = useMemo(() => {
    const q = normalizeText(partSearch.trim());

    return parts.filter((part) => {
      const stock = stockForPart(part);
      if (stockFilter === 'low' && !(stock > 0 && stock <= LOW_STOCK_THRESHOLD)) return false;
      if (stockFilter === 'out' && stock > 0) return false;

      if (!q) return true;
      const haystack = [part.name, part.sku || '', part.barcode || '', part.category || '']
        .map((s) => normalizeText(String(s)))
        .join(' ');
      return haystack.includes(q);
    });
  }, [parts, partSearch, stockFilter]);

  const visibleParts = useMemo(() => filteredParts.slice(0, 80), [filteredParts]);

  const filteredCustomers = useMemo(() => {
    const q = normalizeText(customerSearch.trim());
    if (!q) return customers.slice(0, 40);

    return customers.filter((c) => {
      const vehiclesText = Array.isArray(c.vehicles)
        ? c.vehicles
            .map((v: any) => `${v?.model || ''} ${v?.licensePlate || v?.licenseplate || ''}`)
            .join(' ')
        : '';

      const legacyPlate = (c as any).licensePlate || (c as any).licenseplate || '';

      const haystack = [c.name, c.phone || '', vehiclesText, legacyPlate]
        .map((v) => normalizeText(String(v)))
        .join(' ');
      return haystack.includes(q);
    });
  }, [customerSearch, customers]);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0),
    [cartItems]
  );

  const effectiveDiscount = useMemo(() => {
    if (discountType === 'percent') {
      return Math.round((subtotal * discountPercent) / 100);
    }
    return orderDiscount;
  }, [discountPercent, discountType, orderDiscount, subtotal]);

  const total = Math.max(0, subtotal - effectiveDiscount + safeNumber(shippingFee));

  const paidAmount = useMemo(() => {
    if (!paymentType) return 0;
    if (paymentType === 'partial') return Math.min(total, safeNumber(partialAmount));
    if (paymentType === 'note') return 0;
    if (paymentType === 'installment') return Math.min(total, installmentDetails.prepaidAmount);
    return total;
  }, [installmentDetails.prepaidAmount, partialAmount, paymentType, total]);

  const remainingAmount = Math.max(0, total - paidAmount);

  const todaySummary = useMemo(() => {
    const rows = salesData?.rows || [];
    const now = new Date();
    const dayRows = rows.filter((s) => {
      const d = new Date(s.date);
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    return {
      count: dayRows.length,
      total: dayRows.reduce((sum, s) => sum + safeNumber(s.total), 0),
    };
  }, [salesData?.rows]);

  const resetCheckoutState = () => {
    setPaymentMethod(null);
    setPaymentType(null);
    setPartialAmount('0');
    setOrderNote('');
    setDeliveryMethod('store_pickup');
    setDeliveryStatus('pending');
    setDeliveryAddress('');
    setDeliveryPhone('');
    setDeliveryNotes('');
    setTrackingNumber('');
    setShippingCarrier('');
    setShippingFee('0');
    setInstallmentDetails({
      financeCompany: '',
      prepaidAmount: 0,
      term: 6,
      monthlyPayment: 0,
      interestRate: 0,
      totalDetail: 0,
    });
  };

  const resetOrderState = () => {
    setCartItems([]);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setDiscountType('amount');
    setOrderDiscount(0);
    setDiscountPercent(0);
    setEditingSale(null);
    resetCheckoutState();
  };

  const addToCart = (part: Part, source: 'tap' | 'scan' = 'tap') => {
    const stock = stockForPart(part);
    const retail = fromBranchValue(part.retailPrice, BRANCH_ID);
    const wholesale = fromBranchValue(part.wholesalePrice, BRANCH_ID);
    const price = isWholesaleMode && wholesale > 0 ? wholesale : retail;

    if (stock <= 0) {
      Alert.alert('Hết hàng', `Sản phẩm ${part.name} đã hết tồn kho.`);
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((it) => it.partId === part.id);
      if (existing) {
        if (existing.quantity + 1 > existing.stockSnapshot) {
          Alert.alert('Không đủ hàng', `Tồn khả dụng: ${existing.stockSnapshot}`);
          return prev;
        }
        return prev.map((it) => (it.partId === part.id ? { ...it, quantity: it.quantity + 1 } : it));
      }

      return [
        ...prev,
        {
          partId: part.id,
          partName: part.name,
          sku: part.sku,
          quantity: 1,
          sellingPrice: price,
          stockSnapshot: stock,
          discount: 0,
          category: part.category,
        },
      ];
    });

    if (source === 'scan') {
      Alert.alert('Đã quét', `Đã thêm ${part.name} vào giỏ hàng.`);
    }
  };

  const handleBarcode = (code: string) => {
    const raw = code.trim().toLowerCase();
    if (!raw) return;

    const found = parts.find((part) => {
      const barcode = String(part.barcode || '').toLowerCase();
      const sku = String(part.sku || '').toLowerCase();
      const name = String(part.name || '').toLowerCase();
      return barcode === raw || sku === raw || name.includes(raw);
    });

    if (!found) {
      Alert.alert('Không tìm thấy', `Không tìm thấy sản phẩm với mã ${code}.`);
      return;
    }

    addToCart(found, 'scan');
  };

  const handleSelectQuickService = (service: QuickService) => {
    setSelectedQuickService(service);
    const qty = quickServiceQuantities[service.id] || 1;
    setQuickServiceName(service.name);
    setQuickServicePrice(String(Math.max(0, Math.round(service.price))));
    setQuickServiceQty(String(qty));
  };

  const updateQuickServiceQuantity = (serviceId: string, delta: number) => {
    setQuickServiceQuantities((prev) => {
      const nextQty = Math.max(1, (prev[serviceId] || 1) + delta);
      if (selectedQuickService?.id === serviceId) {
        setQuickServiceQty(String(nextQty));
      }
      return { ...prev, [serviceId]: nextQty };
    });
  };

  const handleSearchQuickCustomer = () => {
    const raw = quickCustomerSearch.trim();
    if (!raw) {
      setQuickFoundCustomer(null);
      return;
    }

    const q = normalizeText(raw);
    const phoneDigits = raw.replace(/\D/g, '');
    const plateNeedle = normalizePlate(raw);

    const found = customers.find((c) => {
      const customerName = normalizeText(c.name || '');
      const customerPhone = String(c.phone || '').replace(/\D/g, '');
      const legacyPlate = normalizePlate(String((c as any).licensePlate || (c as any).licenseplate || ''));
      const vehicles = Array.isArray(c.vehicles) ? c.vehicles : [];

      const byName = q.length >= 2 && customerName.includes(q);
      const byPhone = phoneDigits.length >= 6 && customerPhone.includes(phoneDigits);
      const byLegacyPlate =
        !!legacyPlate && !!plateNeedle && (legacyPlate.includes(plateNeedle) || plateNeedle.includes(legacyPlate));
      const byVehiclePlate = vehicles.some((v: any) => {
        const p = normalizePlate(String(v?.licensePlate || v?.licenseplate || ''));
        return !!p && !!plateNeedle && (p.includes(plateNeedle) || plateNeedle.includes(p));
      });

      return byName || byPhone || byLegacyPlate || byVehiclePlate;
    });

    if (!found) {
      setQuickFoundCustomer(null);
      Alert.alert('Không tìm thấy', 'Không tìm thấy khách phù hợp, sẽ tạo đơn cho khách vãng lai.');
      return;
    }

    setQuickFoundCustomer(found);
  };

  const createOrUpdateSale = useMutation({
    mutationFn: async () => {
      if (cartItems.length === 0) {
        throw new Error('Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi thanh toán.');
      }
      if (!paymentMethod) {
        throw new Error('Vui lòng chọn phương thức thanh toán.');
      }
      if (!paymentType) {
        throw new Error('Vui lòng chọn hình thức thanh toán.');
      }
      if (paymentType === 'partial') {
        const partial = safeNumber(partialAmount);
        if (partial <= 0 || partial > total) {
          throw new Error('Số tiền trả trước không hợp lệ.');
        }
      }
      if (paymentType === 'installment') {
        if (installmentDetails.prepaidAmount < 0 || installmentDetails.prepaidAmount > total) {
          throw new Error('Số tiền trả trước trả góp không hợp lệ.');
        }
      }
      if (deliveryMethod === 'cod' && !deliveryAddress.trim()) {
        throw new Error('Vui lòng nhập địa chỉ giao hàng cho đơn COD.');
      }
      if (deliveryMethod === 'cod' && !deliveryPhone.trim()) {
        throw new Error('Vui lòng nhập số điện thoại nhận hàng cho đơn COD.');
      }

      // Re-check stock before finalizing in case stock changed after adding to cart.
      const outOfStock = cartItems.find((item) => {
        const part = parts.find((p) => p.id === item.partId);
        if (!part) return true;
        return item.quantity > stockForPart(part);
      });
      if (outOfStock) {
        throw new Error(`Không đủ tồn kho cho sản phẩm ${outOfStock.partName}.`);
      }

      const auth = await supabase.auth.getUser();
      const user = auth.data.user;
      const nowIso = new Date().toISOString();
      const finalNote =
        paymentType === 'installment'
          ? buildInstallmentNote(orderNote.trim(), installmentDetails)
          : orderNote.trim();

      const canonicalPayload: Record<string, unknown> = {
        date: nowIso,
        items: cartItems,
        subtotal,
        discount: effectiveDiscount,
        total,
        status: 'completed',
        customer: selectedCustomer
          ? { id: selectedCustomer.id, name: selectedCustomer.name, phone: selectedCustomer.phone }
          : { name: 'Khách lẻ' },
        paymentMethod,
        paymentType,
        partialAmount: paymentType === 'partial' ? safeNumber(partialAmount) : undefined,
        orderNote: finalNote || undefined,
        paidAmount,
        remainingAmount,
        installmentDetails: paymentType === 'installment' ? installmentDetails : undefined,
        deliveryMethod,
        deliveryStatus,
        deliveryAddress: deliveryMethod === 'cod' ? deliveryAddress.trim() : undefined,
        deliveryPhone: deliveryMethod === 'cod' ? deliveryPhone.trim() : undefined,
        deliveryNotes: deliveryMethod === 'cod' ? deliveryNotes.trim() : undefined,
        codAmount: deliveryMethod === 'cod' ? total : undefined,
        shippingFee: safeNumber(shippingFee),
        trackingNumber: trackingNumber.trim() || undefined,
        shippingCarrier: shippingCarrier.trim() || undefined,
        userId: user?.id || 'unknown',
        userName: user?.email || 'Nhân viên',
        branchId: BRANCH_ID,
      };

      const payload = buildSalesDbPayload(canonicalPayload, salesColumnSet);

      const maybeCreateCustomerDebt = async (saleId: string, customer: Customer | null) => {
        if (!customer) return;
        if (remainingAmount <= 0) return;
        if (!(paymentType === 'partial' || paymentType === 'note' || paymentType === 'installment')) return;

        const descriptionPrefix =
          paymentType === 'installment'
            ? 'Công nợ trả góp từ hóa đơn'
            : 'Công nợ từ hóa đơn';

        const canonicalDebt = {
          customerId: customer.id,
          customerName: customer.name,
          phone: customer.phone || '',
          description: `${descriptionPrefix} ${saleId}`,
          totalAmount: remainingAmount,
          paidAmount: 0,
          remainingAmount,
          createdDate: new Date().toISOString(),
          branchId: BRANCH_ID,
          saleId,
        };

        const debtPayload = buildDbPayload(
          canonicalDebt,
          CUSTOMER_DEBT_COLUMN_CANDIDATES,
          customerDebtColumnSet
        );

        const { error } = await supabase.from('customer_debts').insert(debtPayload);
        if (error) {
          console.warn('Unable to create customer debt record:', error.message || error);
        }
      };

      const tryCreateAtomicSale = async () => {
        const fallbackId = `SALE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const rpcPayload: Record<string, unknown> = {
          p_sale_id: fallbackId,
          p_items: cartItems,
          p_discount: effectiveDiscount,
          p_customer: selectedCustomer
            ? { id: selectedCustomer.id, name: selectedCustomer.name, phone: selectedCustomer.phone || '' }
            : { name: 'Khách lẻ', phone: '' },
          p_payment_method: paymentMethod,
          p_user_id: user?.id || null,
          p_user_name: user?.email || 'Nhân viên',
          p_branch_id: BRANCH_ID,
        };

        const noteValue = finalNote;
        if (noteValue) {
          rpcPayload.p_note = noteValue;
        }

        const rpcRes = await supabase.rpc('sale_create_atomic', rpcPayload);
        if (rpcRes.error || !rpcRes.data) {
          return null;
        }

        const rawResult = rpcRes.data as any;
        const saleId =
          asString(rawResult?.id) ||
          asString(rawResult?.sale_id) ||
          asString(rawResult?.saleId) ||
          fallbackId;

        const { data: row, error: rowError } = await supabase
          .from('sales')
          .select('*')
          .eq('id', saleId)
          .single();

        if (rowError || !row) {
          return normalizeSaleRow({
            id: saleId,
            ...canonicalPayload,
            sale_code: asString(rawResult?.sale_code),
          });
        }

        return normalizeSaleRow(row);
      };

      if (editingSale) {
        const { data, error } = await supabase
          .from('sales')
          .update(payload)
          .eq('id', editingSale.id)
          .select('*')
          .single();
        if (error) throw error;
        await maybeCreateCustomerDebt(editingSale.id, selectedCustomer);
        return normalizeSaleRow(data);
      }

      const atomicSale = await tryCreateAtomicSale();
      if (atomicSale) {
        await maybeCreateCustomerDebt(atomicSale.id, selectedCustomer);
        return atomicSale;
      }

      const code = `SALE-${Date.now().toString().slice(-8)}`;
      const insertPayload = {
        ...payload,
        ...buildSalesDbPayload({ sale_code: code }, salesColumnSet),
      };

      const { data, error } = await supabase
        .from('sales')
        .insert(insertPayload)
        .select('*')
        .single();
      if (error) throw error;
      const created = normalizeSaleRow(data);
      await maybeCreateCustomerDebt(created.id, selectedCustomer);
      return created;
    },
    onSuccess: async (sale) => {
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      setShowCheckout(false);
      setTab('history');
      Alert.alert('Thành công', editingSale ? 'Đã cập nhật hóa đơn.' : 'Đã tạo hóa đơn.', [
        {
          text: 'In hóa đơn',
          onPress: () => {
            void printSaleReceipt(sale);
          },
        },
        {
          text: 'Chia sẻ',
          onPress: () => {
            void shareSaleReceipt(sale);
          },
        },
        {
          text: 'Đóng',
          style: 'cancel',
        },
      ]);
      resetOrderState();
    },
    onError: (error: any) => {
      Alert.alert('Không thể lưu đơn hàng', String(error?.message || 'Vui lòng thử lại.'));
    },
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (sale: Sale) => {
      const { error } = await supabase.from('sales').delete().eq('id', sale.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
    },
  });

  const updateDeliveryStatusMutation = useMutation({
    mutationFn: async ({ saleId, status }: { saleId: string; status: DeliveryStatus }) => {
      const payload = buildSalesDbPayload({ deliveryStatus: status }, salesColumnSet);
      const { error } = await supabase
        .from('sales')
        .update(payload)
        .eq('id', saleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
    },
  });

  const createQuickSaleMutation = useMutation({
    mutationFn: async () => {
      const serviceName = quickServiceName.trim();
      const unitPrice = parseMoneyInput(quickServicePrice);
      const quantity = selectedQuickService
        ? Math.max(1, quickServiceQuantities[selectedQuickService.id] || parseMoneyInput(quickServiceQty))
        : Math.max(1, parseMoneyInput(quickServiceQty));

      if (!serviceName) {
        throw new Error('Vui lòng nhập tên dịch vụ.');
      }
      if (unitPrice <= 0) {
        throw new Error('Giá dịch vụ phải lớn hơn 0.');
      }

      const sub = unitPrice * quantity;
      const paid = sub;

      const customerFromSearch = quickFoundCustomer
        ? {
            id: quickFoundCustomer.id,
            name: quickFoundCustomer.name,
            phone: quickFoundCustomer.phone,
          }
        : null;

      const fallbackPlate = isLikelyLicensePlate(quickCustomerSearch)
        ? quickCustomerSearch.trim().toUpperCase()
        : '';

      const customerSnapshot = customerFromSearch || {
        name: 'Khách vãng lai',
        phone: '',
        licensePlate: fallbackPlate,
      };

      const finalQuickServiceNote = quickServiceNote.trim()
        ? `Dịch vụ nhanh: ${serviceName}\nGhi chú: ${quickServiceNote.trim()}`
        : `Dịch vụ nhanh: ${serviceName}`;

      const quickServiceId = selectedQuickService?.id || `custom_${Date.now()}`;

      const auth = await supabase.auth.getUser();
      const user = auth.data.user;

      const quickItem: CartItem = {
        partId: `quick_service_${quickServiceId}`,
        partName: serviceName,
        sku: `quick_service_${quickServiceId}`,
        category: 'Dịch vụ',
        quantity,
        sellingPrice: unitPrice,
        stockSnapshot: 999,
        discount: 0,
        isService: true,
      };

      const canonicalPayload: Record<string, unknown> = {
        date: new Date().toISOString(),
        items: [quickItem],
        subtotal: sub,
        discount: 0,
        total: sub,
        status: 'completed',
        customer: customerSnapshot,
        paymentMethod: quickPaymentMethod,
        paymentType: 'full',
        partialAmount: undefined,
        orderNote: finalQuickServiceNote,
        paidAmount: paid,
        remainingAmount: 0,
        userId: user?.id || 'unknown',
        userName: user?.email || 'Nhân viên',
        branchId: BRANCH_ID,
      };

      const payload = buildSalesDbPayload(canonicalPayload, salesColumnSet);
      const insertPayload = {
        ...payload,
        ...buildSalesDbPayload({ sale_code: `QK-${Date.now().toString().slice(-8)}` }, salesColumnSet),
      };

      const { data, error } = await supabase
        .from('sales')
        .insert(insertPayload)
        .select('*')
        .single();

      if (error) throw error;
      return normalizeSaleRow(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      setShowQuickSaleModal(false);
      setTab('history');
      setQuickServiceSearch('');
      setQuickServiceQuantities({});
      setSelectedQuickService(null);
      setQuickServiceName('');
      setQuickServicePrice('0');
      setQuickServiceQty('1');
      setQuickServiceNote('');
      setQuickPaymentMethod('cash');
      setQuickCustomerSearch('');
      setQuickFoundCustomer(null);
      Alert.alert('Thành công', 'Đã tạo hóa đơn bán nhanh.');
    },
    onError: (error: any) => {
      Alert.alert('Không thể tạo đơn bán nhanh', String(error?.message || 'Vui lòng thử lại.'));
    },
  });

  const saveCustomerMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = customerDraft.name.trim();
      const trimmedPhone = customerDraft.phone.trim();
      if (!trimmedName) {
        throw new Error('Vui lòng nhập tên khách hàng.');
      }

      const vehicles = customerDraft.vehicleModel.trim() || customerDraft.licensePlate.trim()
        ? [{ model: customerDraft.vehicleModel.trim(), licensePlate: customerDraft.licensePlate.trim() }]
        : [];

      const canonical: Record<string, unknown> = {
        name: trimmedName,
        phone: trimmedPhone || null,
        email: customerDraft.email.trim() || null,
        vehicles: vehicles.length ? vehicles : null,
        vehicleModel: customerDraft.vehicleModel.trim() || null,
        licensePlate: customerDraft.licensePlate.trim() || null,
      };

      const payload = buildDbPayload(
        canonical,
        {
          name: ['name'],
          phone: ['phone'],
          email: ['email'],
          vehicles: ['vehicles'],
          vehicleModel: ['vehicleModel', 'vehicle_model', 'vehiclemodel'],
          licensePlate: ['licensePlate', 'license_plate', 'licenseplate'],
        },
        customerColumnSet
      );

      if (customerFormMode === 'edit' && selectedCustomer?.id) {
        const { data, error } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', selectedCustomer.id)
          .select('*')
          .single();
        if (error) throw error;
        return data as Customer;
      }

      const { data, error } = await supabase
        .from('customers')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ['sales-customers'] });
      setSelectedCustomer(customer);
      setShowCustomerFormModal(false);
      setShowCustomerModal(false);
      Alert.alert('Thành công', customerFormMode === 'edit' ? 'Đã cập nhật khách hàng.' : 'Đã thêm khách hàng mới.');
    },
    onError: (error: any) => {
      Alert.alert('Không thể lưu khách hàng', String(error?.message || 'Vui lòng thử lại.'));
    },
  });

  const openCreateCustomer = () => {
    setCustomerFormMode('create');
    setCustomerDraft(buildCustomerDraft());
    setShowCustomerFormModal(true);
  };

  const openEditCustomer = () => {
    if (!selectedCustomer) {
      Alert.alert('Chưa có khách hàng', 'Vui lòng chọn khách hàng để chỉnh sửa.');
      return;
    }
    setCustomerFormMode('edit');
    setCustomerDraft(buildCustomerDraft(selectedCustomer));
    setShowCustomerFormModal(true);
  };

  const startEditSale = (sale: Sale) => {
    const items = Array.isArray(sale.items) ? sale.items : [];
    setEditingSale(sale);
    setCartItems(
      items.map((item) => ({
        ...item,
        stockSnapshot: Number(item.stockSnapshot || item.quantity || 99),
      }))
    );

    setSelectedCustomer(
      sale.customer?.id
        ? customers.find((c) => c.id === sale.customer?.id) || {
            id: sale.customer.id,
            name: sale.customer.name,
            phone: sale.customer.phone,
          }
        : null
    );

    setDiscountType('amount');
    setOrderDiscount(safeNumber(sale.discount));
    setDiscountPercent(0);
    setPaymentMethod((sale.paymentMethod || 'cash') as PaymentMethod);
    setPaymentType((sale.paymentType || 'full') as PaymentType);
    setPartialAmount(String(sale.partialAmount || 0));
    setOrderNote(sale.orderNote || '');
    setDeliveryMethod((sale.deliveryMethod || 'store_pickup') as DeliveryMethod);
    setDeliveryStatus((sale.deliveryStatus || 'pending') as DeliveryStatus);
    setDeliveryAddress(sale.deliveryAddress || '');
    setDeliveryPhone(sale.deliveryPhone || '');
    setDeliveryNotes(sale.deliveryNotes || '');
    setTrackingNumber(sale.trackingNumber || '');
    setShippingCarrier(sale.shippingCarrier || '');
    setShippingFee(String(sale.shippingFee || 0));
    setInstallmentDetails({
      financeCompany: sale.installmentDetails?.financeCompany || '',
      prepaidAmount: safeNumber(sale.installmentDetails?.prepaidAmount),
      term: safeNumber(sale.installmentDetails?.term) || 6,
      monthlyPayment: safeNumber(sale.installmentDetails?.monthlyPayment),
      interestRate: safeNumber(sale.installmentDetails?.interestRate),
      totalDetail: safeNumber(sale.installmentDetails?.totalDetail),
    });
    setTab('cart');
  };

  const sales = salesData?.rows || [];
  const totalPages = Math.max(1, Math.ceil((salesData?.total || 0) / PAGE_SIZE));

  return (
    <View style={[styles.container, isDark && darkSales.container]}>
      <View style={[styles.summaryBanner, { paddingTop: Math.max(10, insets.top + 4) }]}>
        <Text style={styles.summaryLabel}>Doanh thu hôm nay</Text>
        <View style={styles.summaryCompactRow}>
          <Text style={styles.summaryValueCompact}>{formatCurrency(todaySummary.total)}</Text>
          <View style={styles.summaryDot} />
          <Text style={styles.summarySubCompact}>{todaySummary.count} đơn</Text>
        </View>
      </View>

      <View style={[styles.tabRow, isDark && darkSales.tabRow]}>
        <TabButton label="Sản phẩm" active={tab === 'products'} onPress={() => setTab('products')} icon="box" />
        <TabButton label={`Giỏ hàng (${cartItems.length})`} active={tab === 'cart'} onPress={() => setTab('cart')} icon="shopping-cart" />
        <TabButton label="Lịch sử" active={tab === 'history'} onPress={() => setTab('history')} icon="clock" />
      </View>

      <View style={[styles.quickActionRow, isDark && darkSales.quickActionRow]}>
        <TouchableOpacity style={styles.quickTabButton} onPress={() => setShowQuickSaleModal(true)}>
          <Feather name="zap" size={14} color="#fff" />
          <Text style={styles.quickTabText}>Bán nhanh</Text>
        </TouchableOpacity>
      </View>

      {tab === 'products' && (
        <View style={[styles.section, isDark && darkSales.section]}>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.searchInput, isDark && darkSales.searchInput]}
              placeholder="Tìm sản phẩm theo tên, SKU, barcode"
              placeholderTextColor={BRAND_COLORS.textMuted}
              value={partSearch}
              onChangeText={setPartSearch}
            />
            <TouchableOpacity
              style={styles.scanButton}
              onPress={async () => {
                if (!cameraPermission?.granted) {
                  const result = await requestCameraPermission();
                  if (!result.granted) {
                    Alert.alert('Thiếu quyền camera', 'Hãy cấp quyền để quét mã vạch.');
                    return;
                  }
                }
                setShowScanner(true);
              }}
            >
              <MaterialCommunityIcons name="barcode-scan" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            <Chip label="Tất cả" active={stockFilter === 'all'} onPress={() => setStockFilter('all')} />
            <Chip label="Tồn thấp" active={stockFilter === 'low'} onPress={() => setStockFilter('low')} />
            <Chip label="Hết hàng" active={stockFilter === 'out'} onPress={() => setStockFilter('out')} />
            <View style={styles.wholesaleBox}>
              <Text style={styles.wholesaleLabel}>Giá sỉ</Text>
              <Switch value={isWholesaleMode} onValueChange={setIsWholesaleMode} trackColor={{ true: BRAND_COLORS.primary }} />
            </View>
          </View>

          {loadingParts ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={visibleParts}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.gridContent}
              renderItem={({ item }) => (
                <PartCard part={item} onAdd={() => addToCart(item)} inCart={cartItems.some((it) => it.partId === item.id)} />
              )}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>📦</Text>
                  <Text style={styles.emptyText}>Không có sản phẩm phù hợp</Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {tab === 'cart' && (
        <ScrollView contentContainerStyle={[styles.cartContent, isDark && darkSales.section]}>
          <View style={styles.cartHeaderRow}>
            <Text style={[styles.sectionTitle, isDark && darkSales.primaryText]}>Giỏ hàng</Text>
            <TouchableOpacity onPress={() => setShowCustomerModal(true)} style={styles.customerQuickButton}>
              <Feather name="users" size={14} color={BRAND_COLORS.primary} />
              <Text style={styles.customerButtonText}>Khách hàng</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.customerInfoCard, isDark && darkSales.card]}>
            <View style={styles.customerInfoTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerInfoName}>{selectedCustomer?.name || 'Khách lẻ'}</Text>
                <Text style={styles.customerInfoMeta}>SĐT: {selectedCustomer?.phone || '-'}</Text>
                <Text style={styles.customerInfoMeta}>Xe: {customerVehiclesLabel(selectedCustomer)}</Text>
              </View>
            </View>
            <View style={styles.customerInfoActions}>
              <TouchableOpacity style={styles.customerActionBtn} onPress={() => setShowCustomerModal(true)}>
                <Feather name="search" size={14} color={BRAND_COLORS.primary} />
                <Text style={styles.customerActionText}>Chọn</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.customerActionBtn} onPress={openEditCustomer}>
                <Feather name="edit-2" size={14} color={BRAND_COLORS.primary} />
                <Text style={styles.customerActionText}>Sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.customerActionBtn} onPress={openCreateCustomer}>
                <Feather name="user-plus" size={14} color={BRAND_COLORS.primary} />
                <Text style={styles.customerActionText}>Thêm mới</Text>
              </TouchableOpacity>
            </View>
          </View>

          {editingSale && (
            <View style={styles.editingBanner}>
              <Text style={styles.editingText}>Đang sửa: {saleCode(editingSale)}</Text>
              <TouchableOpacity onPress={resetOrderState}>
                <Text style={styles.cancelEditText}>Hủy sửa</Text>
              </TouchableOpacity>
            </View>
          )}

          {cartItems.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🛒</Text>
              <Text style={styles.emptyText}>Giỏ hàng trống</Text>
            </View>
          ) : (
            cartItems.map((item) => (
              <CartRow
                key={item.partId}
                item={item}
                onQuantityChange={(qty) => {
                  if (qty <= 0) {
                    setCartItems((prev) => prev.filter((it) => it.partId !== item.partId));
                    return;
                  }
                  if (qty > item.stockSnapshot) {
                    Alert.alert('Không đủ tồn kho', `Tồn khả dụng ${item.stockSnapshot}`);
                    return;
                  }
                  setCartItems((prev) => prev.map((it) => (it.partId === item.partId ? { ...it, quantity: qty } : it)));
                }}
                onPriceChange={(price) => {
                  setCartItems((prev) => prev.map((it) => (it.partId === item.partId ? { ...it, sellingPrice: Math.max(0, price) } : it)));
                }}
                onRemove={() => setCartItems((prev) => prev.filter((it) => it.partId !== item.partId))}
              />
            ))
          )}

          <View style={styles.summaryCard}>
            <Text style={styles.summaryItem}>Tạm tính: {formatCurrency(subtotal)}</Text>

            <View style={styles.discountCompactBox}>
              <Text style={styles.discountCompactLabel}>Giảm giá</Text>
              <View style={styles.discountCompactControls}>
                <View style={styles.discountSegmentRow}>
                  <TouchableOpacity
                    style={[styles.discountSegmentBtn, discountType === 'amount' && styles.discountSegmentBtnActive]}
                    onPress={() => setDiscountType('amount')}
                  >
                    <Text style={[styles.discountSegmentText, discountType === 'amount' && styles.discountSegmentTextActive]}>Theo tiền</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.discountSegmentBtn, discountType === 'percent' && styles.discountSegmentBtnActive]}
                    onPress={() => setDiscountType('percent')}
                  >
                    <Text style={[styles.discountSegmentText, discountType === 'percent' && styles.discountSegmentTextActive]}>Theo %</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.discountValueBox}>
                  <TextInput
                    style={styles.discountValueInput}
                    value={
                      discountType === 'amount'
                        ? formatMoneyInput(orderDiscount)
                        : String(discountPercent)
                    }
                    onChangeText={(text) => {
                      const value = parseMoneyInput(text);
                      if (discountType === 'amount') {
                        setOrderDiscount(Math.max(0, value));
                      } else {
                        setDiscountPercent(Math.min(100, Math.max(0, value)));
                      }
                    }}
                    keyboardType="numeric"
                  />
                  <Text style={styles.discountValueSuffix}>{discountType === 'amount' ? '₫' : '%'}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.summaryItem}>Tổng cộng: {formatCurrency(total)}</Text>

            <Text style={styles.inputLabel}>Phương thức thanh toán</Text>
            <SelectorRow
              options={[
                { key: 'cash', label: 'Tiền mặt' },
                { key: 'bank', label: 'Chuyển khoản' },
                { key: 'card', label: 'Thẻ' },
              ]}
              value={paymentMethod || ''}
              onChange={(v) => {
                setPaymentMethod(v as PaymentMethod);
                if (!paymentType) {
                  setPaymentType('full');
                }
              }}
            />

            {paymentMethod && (
              <>
                <Text style={styles.inputLabel}>Hình thức thanh toán</Text>
                <SelectorRow
                  options={[
                    { key: 'full', label: 'Đủ' },
                    { key: 'partial', label: 'Một phần' },
                    { key: 'note', label: 'Ghi nợ' },
                    { key: 'installment', label: 'Trả góp' },
                  ]}
                  value={paymentType || ''}
                  onChange={(v) => setPaymentType(v as PaymentType)}
                />
              </>
            )}

            {paymentType === 'partial' && (
              <NumberInputRow
                label="Trả trước"
                value={safeNumber(partialAmount)}
                onChange={(v) => setPartialAmount(String(Math.min(total, Math.max(0, v))))}
                suffix="₫"
              />
            )}

            {paymentType === 'installment' && (
              <View style={styles.installmentHintBox}>
                <Text style={styles.installmentHintTitle}>Đã bật trả góp</Text>
                <Text style={styles.installmentHintText}>
                  Trả trước: {formatCurrency(installmentDetails.prepaidAmount)} | Còn lại: {formatCurrency(Math.max(0, total - installmentDetails.prepaidAmount))}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.checkoutButton, (cartItems.length === 0 || createOrUpdateSale.isPending) && styles.checkoutButtonDisabled]}
              disabled={cartItems.length === 0 || createOrUpdateSale.isPending}
              onPress={() => setShowCheckout(true)}
            >
              {createOrUpdateSale.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.checkoutText}>{editingSale ? 'Cập nhật hóa đơn' : 'Thanh toán'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {tab === 'history' && (
        <View style={[styles.section, isDark && darkSales.section]}>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.searchInput, isDark && darkSales.searchInput]}
              placeholder="Tìm theo mã đơn, tên khách, SĐT"
              placeholderTextColor={BRAND_COLORS.textMuted}
              value={salesSearch}
              onChangeText={(v) => {
                setSalesSearch(v);
                setSalesPage(1);
              }}
            />
            <TouchableOpacity style={styles.deliveryButton} onPress={() => setShowDeliveryManager(true)}>
              <Feather name="truck" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            <Chip
              label="Tất cả"
              active={salesStatusFilter === 'all'}
              onPress={() => {
                setSalesStatusFilter('all');
                setSalesPage(1);
              }}
            />
            <Chip
              label="Hoàn tất"
              active={salesStatusFilter === 'completed'}
              onPress={() => {
                setSalesStatusFilter('completed');
                setSalesPage(1);
              }}
            />
            <Chip
              label="Hủy"
              active={salesStatusFilter === 'cancelled'}
              onPress={() => {
                setSalesStatusFilter('cancelled');
                setSalesPage(1);
              }}
            />
            <Chip
              label="Hoàn tiền"
              active={salesStatusFilter === 'refunded'}
              onPress={() => {
                setSalesStatusFilter('refunded');
                setSalesPage(1);
              }}
            />
          </View>

          {loadingSales ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={sales}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refetchingSales}
                  onRefresh={refetchSales}
                  tintColor={BRAND_COLORS.primary}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>🧾</Text>
                  <Text style={styles.emptyText}>Không có hóa đơn</Text>
                </View>
              }
              renderItem={({ item }) => (
                <SaleCard
                  sale={item}
                  onView={() => setSelectedSale(item)}
                  onEdit={() => startEditSale(item)}
                  onDelete={() => {
                    Alert.alert('Xóa hóa đơn', `Xóa ${saleCode(item)}?`, [
                      { text: 'Hủy', style: 'cancel' },
                      {
                        text: 'Xóa',
                        style: 'destructive',
                        onPress: () => deleteSaleMutation.mutate(item),
                      },
                    ]);
                  }}
                  onPrint={() => {
                    void printSaleReceipt(item);
                  }}
                  onShare={() => {
                    void shareSaleReceipt(item);
                  }}
                />
              )}
            />
          )}

          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={[styles.pageButton, salesPage <= 1 && styles.pageButtonDisabled]}
              disabled={salesPage <= 1}
              onPress={() => setSalesPage((prev) => Math.max(1, prev - 1))}
            >
              <Text style={styles.pageButtonText}>Trước</Text>
            </TouchableOpacity>
            <Text style={styles.pageText}>Trang {salesPage}/{totalPages}</Text>
            <TouchableOpacity
              style={[styles.pageButton, salesPage >= totalPages && styles.pageButtonDisabled]}
              disabled={salesPage >= totalPages}
              onPress={() => setSalesPage((prev) => Math.min(totalPages, prev + 1))}
            >
              <Text style={styles.pageButtonText}>Sau</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={(event) => {
              if (!event.data) return;
              setShowScanner(false);
              handleBarcode(event.data);
            }}
            barcodeScannerSettings={{
              barcodeTypes: [
                'ean13',
                'ean8',
                'code128',
                'code39',
                'qr',
                'upc_a',
                'upc_e',
              ],
            }}
          />
          <View style={styles.scannerOverlay}>
            <Text style={styles.scannerTitle}>Quét mã vạch sản phẩm</Text>
            <TouchableOpacity style={styles.closeScanner} onPress={() => setShowScanner(false)}>
              <Text style={styles.closeScannerText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCustomerModal} animationType="slide" onRequestClose={() => setShowCustomerModal(false)}>
        <View style={[styles.modalContainer, isDark && darkSales.modalContainer, { paddingTop: Math.max(12, insets.top + 8) }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn khách hàng</Text>
            <View style={styles.modalHeaderActions}>
              <TouchableOpacity style={styles.modalHeaderAdd} onPress={openCreateCustomer}>
                <Feather name="user-plus" size={14} color="#fff" />
                <Text style={styles.modalHeaderAddText}>Thêm</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Feather name="x" size={20} color={BRAND_COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            style={[styles.customerSearchInput, isDark && darkSales.searchInput]}
            placeholder="Tìm tên, số điện thoại"
            placeholderTextColor={BRAND_COLORS.textMuted}
            value={customerSearch}
            onChangeText={setCustomerSearch}
          />
          {loadingCustomers ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredCustomers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                <TouchableOpacity
                  style={styles.customerItem}
                  onPress={() => {
                    setSelectedCustomer(null);
                    setShowCustomerModal(false);
                  }}
                >
                  <Text style={styles.customerName}>Khách lẻ</Text>
                  <Text style={styles.customerPhone}>Không lưu thông tin</Text>
                </TouchableOpacity>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.customerItem}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setShowCustomerModal(false);
                  }}
                >
                  <Text style={styles.customerName}>{item.name}</Text>
                  <Text style={styles.customerPhone}>{item.phone || '-'}</Text>
                  <Text style={styles.customerPhone}>Xe: {customerVehiclesLabel(item)}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

      <Modal visible={showCustomerFormModal} animationType="slide" onRequestClose={() => setShowCustomerFormModal(false)}>
        <ScrollView contentContainerStyle={[styles.modalContainer, isDark && darkSales.modalContainer]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{customerFormMode === 'edit' ? 'Sửa khách hàng' : 'Thêm khách hàng'}</Text>
            <TouchableOpacity onPress={() => setShowCustomerFormModal(false)}>
              <Feather name="x" size={20} color={BRAND_COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <InputField
            label="Tên khách hàng"
            value={customerDraft.name}
            onChange={(v) => setCustomerDraft((prev) => ({ ...prev, name: v }))}
          />
          <InputField
            label="Số điện thoại"
            value={customerDraft.phone}
            onChange={(v) => setCustomerDraft((prev) => ({ ...prev, phone: v }))}
            keyboardType="phone-pad"
          />
          <InputField
            label="Email"
            value={customerDraft.email}
            onChange={(v) => setCustomerDraft((prev) => ({ ...prev, email: v }))}
          />
          <InputField
            label="Dòng xe"
            value={customerDraft.vehicleModel}
            onChange={(v) => setCustomerDraft((prev) => ({ ...prev, vehicleModel: v }))}
          />
          <InputField
            label="Biển số"
            value={customerDraft.licensePlate}
            onChange={(v) => setCustomerDraft((prev) => ({ ...prev, licensePlate: v }))}
          />

          <TouchableOpacity
            style={[styles.checkoutButton, saveCustomerMutation.isPending && styles.checkoutButtonDisabled]}
            disabled={saveCustomerMutation.isPending}
            onPress={() => saveCustomerMutation.mutate()}
          >
            {saveCustomerMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.checkoutText}>{customerFormMode === 'edit' ? 'Lưu thay đổi' : 'Tạo khách hàng'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      <Modal visible={showCheckout} animationType="slide" onRequestClose={() => setShowCheckout(false)}>
        <ScrollView contentContainerStyle={[styles.modalContainer, isDark && darkSales.modalContainer]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingSale ? 'Cập nhật hóa đơn' : 'Thanh toán hóa đơn'}</Text>
            <TouchableOpacity onPress={() => setShowCheckout(false)}>
              <Feather name="x" size={20} color={BRAND_COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Phương thức thanh toán</Text>
          <SelectorRow
            options={[
              { key: 'cash', label: 'Tiền mặt' },
              { key: 'bank', label: 'Chuyển khoản' },
              { key: 'card', label: 'Thẻ' },
            ]}
            value={paymentMethod || ''}
            onChange={(v) => {
              setPaymentMethod(v as PaymentMethod);
              if (!paymentType) {
                setPaymentType('full');
              }
            }}
          />

          {paymentMethod && (
            <>
              <Text style={styles.inputLabel}>Hình thức thanh toán</Text>
              <SelectorRow
                options={[
                  { key: 'full', label: 'Đủ' },
                  { key: 'partial', label: 'Một phần' },
                  { key: 'note', label: 'Ghi nợ' },
                  { key: 'installment', label: 'Trả góp' },
                ]}
                value={paymentType || ''}
                onChange={(v) => setPaymentType(v as PaymentType)}
              />
            </>
          )}

          {paymentType === 'partial' && (
            <InputField
              label="Số tiền đã thu"
              value={formatMoneyInput(safeNumber(partialAmount))}
              onChange={(v) => {
                const next = Math.min(total, Math.max(0, parseMoneyInput(v)));
                setPartialAmount(String(next));
              }}
              keyboardType="numeric"
            />
          )}

          {paymentType === 'installment' && (
            <View style={styles.subCard}>
              <Text style={styles.subTitle}>Thông tin trả góp</Text>
              <InputField
                label="Công ty tài chính"
                value={installmentDetails.financeCompany}
                onChange={(v) => setInstallmentDetails((prev) => ({ ...prev, financeCompany: v }))}
              />
              <InputField
                label="Trả trước"
                value={String(installmentDetails.prepaidAmount)}
                keyboardType="numeric"
                onChange={(v) => setInstallmentDetails((prev) => ({ ...prev, prepaidAmount: safeNumber(v) }))}
              />
              <InputField
                label="Kỳ hạn (tháng)"
                value={String(installmentDetails.term)}
                keyboardType="numeric"
                onChange={(v) => setInstallmentDetails((prev) => ({ ...prev, term: Math.max(1, safeNumber(v)) }))}
              />
              <InputField
                label="Lãi suất %/tháng"
                value={String(installmentDetails.interestRate)}
                keyboardType="numeric"
                onChange={(v) => setInstallmentDetails((prev) => ({ ...prev, interestRate: safeNumber(v) }))}
              />
              <InputField
                label="Trả hàng tháng"
                value={String(installmentDetails.monthlyPayment)}
                keyboardType="numeric"
                onChange={(v) => setInstallmentDetails((prev) => ({ ...prev, monthlyPayment: safeNumber(v) }))}
              />
            </View>
          )}

          <Text style={styles.inputLabel}>Giao nhận</Text>
          <SelectorRow
            options={[
              { key: 'store_pickup', label: 'Khách tự lấy' },
              { key: 'cod', label: 'COD' },
            ]}
            value={deliveryMethod}
            onChange={(v) => setDeliveryMethod(v as DeliveryMethod)}
          />

          {deliveryMethod === 'cod' && (
            <View style={styles.subCard}>
              <Text style={styles.subTitle}>Thông tin giao hàng</Text>
              <InputField label="Địa chỉ" value={deliveryAddress} onChange={setDeliveryAddress} />
              <InputField label="Số điện thoại nhận" value={deliveryPhone} onChange={setDeliveryPhone} keyboardType="phone-pad" />
              <InputField label="Đơn vị vận chuyển" value={shippingCarrier} onChange={setShippingCarrier} />
              <InputField label="Mã vận đơn" value={trackingNumber} onChange={setTrackingNumber} />
              <InputField label="Phí ship" value={shippingFee} onChange={setShippingFee} keyboardType="numeric" />
              <InputField label="Ghi chú giao hàng" value={deliveryNotes} onChange={setDeliveryNotes} multiline />
              <Text style={styles.inputLabel}>Trạng thái giao hàng</Text>
              <SelectorRow
                options={[
                  { key: 'pending', label: 'Chờ xử lý' },
                  { key: 'preparing', label: 'Đang chuẩn bị' },
                  { key: 'shipping', label: 'Đang giao' },
                  { key: 'delivered', label: 'Đã giao' },
                  { key: 'cancelled', label: 'Hủy giao' },
                ]}
                value={deliveryStatus}
                onChange={(v) => setDeliveryStatus(v as DeliveryStatus)}
              />
            </View>
          )}

          <InputField label="Ghi chú đơn hàng" value={orderNote} onChange={setOrderNote} multiline />

          <View style={styles.checkoutSummary}>
            <Text style={styles.summaryItem}>Tổng thanh toán: {formatCurrency(total)}</Text>
            <Text style={styles.summaryItem}>Đã thu: {formatCurrency(paidAmount)}</Text>
            <Text style={styles.summaryItem}>Còn lại: {formatCurrency(remainingAmount)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.checkoutButton, createOrUpdateSale.isPending && styles.checkoutButtonDisabled]}
            disabled={createOrUpdateSale.isPending}
            onPress={() => createOrUpdateSale.mutate()}
          >
            {createOrUpdateSale.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.checkoutText}>{editingSale ? 'Lưu thay đổi' : 'Xác nhận thanh toán'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      <Modal visible={showQuickSaleModal} animationType="slide" onRequestClose={() => setShowQuickSaleModal(false)}>
        <ScrollView contentContainerStyle={[styles.modalContainer, isDark && darkSales.modalContainer, { paddingTop: Math.max(12, insets.top + 8) }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bán hàng nhanh</Text>
            <TouchableOpacity onPress={() => setShowQuickSaleModal(false)}>
              <Feather name="x" size={20} color={BRAND_COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <InputField
            label="Tìm dịch vụ nhanh"
            value={quickServiceSearch}
            onChange={setQuickServiceSearch}
          />

          <View style={styles.quickServiceGroupWrap}>
            {groupedQuickServices.map((group) => (
              <View key={group.key} style={styles.quickServiceSection}>
                <Text style={styles.quickServiceSectionTitle}>{group.label}</Text>
                <View style={styles.quickServiceGrid}>
                  {group.items.map((service) => {
                    const active = selectedQuickService?.id === service.id;
                    const qty = quickServiceQuantities[service.id] || 1;
                    const tone = QUICK_SERVICE_CATEGORY_COLORS[group.key] || QUICK_SERVICE_CATEGORY_COLORS.other;
                    return (
                      <View key={service.id} style={styles.quickServiceCard}>
                        <TouchableOpacity
                          style={[
                            styles.quickServiceSelectButton,
                            { backgroundColor: tone },
                            active && styles.quickServiceSelectButtonActive,
                          ]}
                          onPress={() => handleSelectQuickService(service)}
                        >
                          <View style={styles.quickServiceCardTopRow}>
                            <Feather name="zap" size={12} color="#fff" />
                            {active && <Feather name="check-circle" size={13} color="#fff" />}
                          </View>
                          <Text style={styles.quickServiceCardName} numberOfLines={1}>
                            {service.name}
                          </Text>
                          <Text style={styles.quickServiceCardPrice}>{formatCurrency(service.price)}</Text>
                        </TouchableOpacity>

                        <View style={styles.quickServiceQtyRow}>
                          <TouchableOpacity
                            style={styles.quickServiceQtyButton}
                            onPress={() => updateQuickServiceQuantity(service.id, -1)}
                          >
                            <Feather name="minus" size={13} color={BRAND_COLORS.textPrimary} />
                          </TouchableOpacity>
                          <Text style={styles.quickServiceQtyValue}>{qty}</Text>
                          <TouchableOpacity
                            style={styles.quickServiceQtyButton}
                            onPress={() => updateQuickServiceQuantity(service.id, 1)}
                          >
                            <Feather name="plus" size={13} color={BRAND_COLORS.textPrimary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          {filteredQuickServices.length === 0 && (
            <Text style={styles.quickHintText}>Không có dịch vụ phù hợp. Bạn có thể nhập tay tên dịch vụ bên dưới.</Text>
          )}

          <InputField label="Tên dịch vụ" value={quickServiceName} onChange={setQuickServiceName} />
          <InputField
            label="Số lượng"
            value={quickServiceQty}
            onChange={(v) => {
              const nextQty = Math.max(1, parseMoneyInput(v));
              setQuickServiceQty(String(nextQty));
              if (selectedQuickService?.id) {
                setQuickServiceQuantities((prev) => ({ ...prev, [selectedQuickService.id]: nextQty }));
              }
            }}
            keyboardType="numeric"
          />
          <InputField
            label="Đơn giá"
            value={formatMoneyInput(parseMoneyInput(quickServicePrice))}
            onChange={(v) => setQuickServicePrice(String(parseMoneyInput(v)))}
            keyboardType="numeric"
          />

          <View style={styles.quickCustomerRow}>
            <View style={{ flex: 1 }}>
              <InputField
                label="Tìm khách (biển số / SĐT / tên)"
                value={quickCustomerSearch}
                onChange={setQuickCustomerSearch}
              />
            </View>
            <TouchableOpacity style={styles.quickCustomerSearchButton} onPress={handleSearchQuickCustomer}>
              <Feather name="search" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {quickFoundCustomer ? (
            <View style={styles.quickCustomerFoundBox}>
              <Text style={styles.quickCustomerFoundTitle}>Khách quen</Text>
              <Text style={styles.quickCustomerFoundName}>{quickFoundCustomer.name}</Text>
              <Text style={styles.quickCustomerFoundMeta}>{quickFoundCustomer.phone || '-'}</Text>
            </View>
          ) : (
            <Text style={styles.quickHintText}>
              {isLikelyLicensePlate(quickCustomerSearch)
                ? `Không thấy khách, sẽ lưu biển số: ${quickCustomerSearch.toUpperCase()}`
                : 'Mặc định tạo đơn cho khách vãng lai nếu không tìm thấy.'}
            </Text>
          )}

          <Text style={styles.inputLabel}>Phương thức thanh toán</Text>
          <SelectorRow
            options={[
              { key: 'cash', label: 'Tiền mặt' },
              { key: 'bank', label: 'Chuyển khoản' },
            ]}
            value={quickPaymentMethod}
            onChange={(v) => setQuickPaymentMethod(v as 'cash' | 'bank')}
          />

          <InputField label="Ghi chú" value={quickServiceNote} onChange={setQuickServiceNote} multiline />

          <View style={styles.checkoutSummary}>
            <Text style={styles.summaryItem}>
              Tổng: {formatCurrency(parseMoneyInput(quickServicePrice) * Math.max(1, parseMoneyInput(quickServiceQty)))}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.checkoutButton, createQuickSaleMutation.isPending && styles.checkoutButtonDisabled]}
            disabled={createQuickSaleMutation.isPending}
            onPress={() => createQuickSaleMutation.mutate()}
          >
            {createQuickSaleMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.checkoutText}>Tạo đơn bán nhanh</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      <Modal visible={!!selectedSale} animationType="slide" onRequestClose={() => setSelectedSale(null)}>
        <ScrollView contentContainerStyle={[styles.modalContainer, isDark && darkSales.modalContainer]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedSale ? saleCode(selectedSale) : 'Chi tiết'}</Text>
            <TouchableOpacity onPress={() => setSelectedSale(null)}>
              <Feather name="x" size={20} color={BRAND_COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          {selectedSale && (
            <>
              <Text style={styles.detailLine}>Khách hàng: {selectedSale.customer?.name || 'Khách lẻ'}</Text>
              <Text style={styles.detailLine}>SĐT: {selectedSale.customer?.phone || '-'}</Text>
              <Text style={styles.detailLine}>Ngày: {formatDate(selectedSale.date)}</Text>
              <Text style={styles.detailLine}>Thanh toán: {paymentMethodLabel(selectedSale.paymentMethod)}</Text>
              <Text style={styles.detailLine}>Hình thức: {paymentTypeLabel(selectedSale.paymentType)}</Text>
              <Text style={styles.detailLine}>Tổng tiền: {formatCurrency(selectedSale.total)}</Text>

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Sản phẩm</Text>
              {(selectedSale.items || []).map((item, index) => (
                <View key={`${item.partId}-${index}`} style={styles.saleLineRow}>
                  <Text style={styles.saleLineName}>{item.partName}</Text>
                  <Text style={styles.saleLineValue}>
                    {item.quantity} x {formatCurrency(item.sellingPrice)}
                  </Text>
                </View>
              ))}

              <View style={styles.detailActions}>
                <TouchableOpacity style={styles.detailActionButton} onPress={() => void printSaleReceipt(selectedSale)}>
                  <Feather name="printer" size={16} color={BRAND_COLORS.primary} />
                  <Text style={styles.detailActionText}>In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.detailActionButton} onPress={() => void shareSaleReceipt(selectedSale)}>
                  <Feather name="share-2" size={16} color={BRAND_COLORS.primary} />
                  <Text style={styles.detailActionText}>Chia sẻ</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </Modal>

      <Modal visible={showDeliveryManager} animationType="slide" onRequestClose={() => setShowDeliveryManager(false)}>
        <View style={[styles.modalContainer, isDark && darkSales.modalContainer]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Quản lý giao hàng</Text>
            <TouchableOpacity onPress={() => setShowDeliveryManager(false)}>
              <Feather name="x" size={20} color={BRAND_COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={sales.filter((sale) => sale.deliveryMethod === 'cod')}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🚚</Text>
                <Text style={styles.emptyText}>Không có đơn COD</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.deliveryCard}>
                <Text style={styles.deliveryTitle}>{saleCode(item)}</Text>
                <Text style={styles.deliveryMeta}>{item.customer?.name || 'Khách lẻ'}</Text>
                <Text style={styles.deliveryMeta}>{item.deliveryAddress || '-'}</Text>
                <Text style={styles.deliveryMeta}>COD: {formatCurrency(item.codAmount || item.total)}</Text>
                <SelectorRow
                  options={[
                    { key: 'pending', label: 'Chờ xử lý' },
                    { key: 'preparing', label: 'Chuẩn bị' },
                    { key: 'shipping', label: 'Đang giao' },
                    { key: 'delivered', label: 'Đã giao' },
                    { key: 'cancelled', label: 'Đã hủy' },
                  ]}
                  value={(item.deliveryStatus || 'pending') as DeliveryStatus}
                  onChange={(value) =>
                    updateDeliveryStatusMutation.mutate({
                      saleId: item.id,
                      status: value as DeliveryStatus,
                    })
                  }
                />
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon: keyof typeof Feather.glyphMap;
}) {
  const isDark = useColorScheme() === 'dark';
  return (
    <TouchableOpacity style={[styles.tabButton, isDark && darkSales.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <Feather name={icon} size={14} color={active ? '#fff' : isDark ? '#9FB0C9' : BRAND_COLORS.textSecondary} />
      <Text style={[styles.tabButtonText, isDark && darkSales.secondaryText, active && styles.tabButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const isDark = useColorScheme() === 'dark';
  return (
    <TouchableOpacity style={[styles.chip, isDark && darkSales.chip, active && styles.chipActive, active && isDark && darkSales.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, isDark && darkSales.secondaryText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PartCard({ part, onAdd, inCart }: { part: Part; onAdd: () => void; inCart: boolean }) {
  const isDark = useColorScheme() === 'dark';
  const stock = stockForPart(part);
  const retail = fromBranchValue(part.retailPrice, BRANCH_ID);

  return (
    <View style={[styles.partCard, isDark && darkSales.card]}>
      <Text style={[styles.partName, isDark && darkSales.primaryText]} numberOfLines={2}>
        {part.name}
      </Text>
      <Text style={[styles.partMeta, isDark && darkSales.secondaryText]}>SKU: {part.sku || '-'}</Text>
      <Text style={[styles.partMeta, isDark && darkSales.secondaryText]}>Tồn: {stock}</Text>
      <Text style={styles.partPrice}>{formatCurrency(retail)}</Text>
      <TouchableOpacity style={[styles.addButton, inCart && styles.addedButton]} onPress={onAdd}>
        <Text style={styles.addButtonText}>{inCart ? 'Thêm nữa' : 'Thêm vào giỏ'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function CartRow({
  item,
  onQuantityChange,
  onPriceChange,
  onRemove,
}: {
  item: CartItem;
  onQuantityChange: (qty: number) => void;
  onPriceChange: (price: number) => void;
  onRemove: () => void;
}) {
  const isDark = useColorScheme() === 'dark';
  return (
    <View style={[styles.cartRow, isDark && darkSales.card]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cartName, isDark && darkSales.primaryText]}>{item.partName}</Text>
        <Text style={[styles.cartMeta, isDark && darkSales.secondaryText]}>SKU: {item.sku || '-'} | Tồn: {item.stockSnapshot}</Text>
      </View>

      <View style={styles.cartControls}>
        <QtyButton icon="minus" onPress={() => onQuantityChange(item.quantity - 1)} />
        <Text style={[styles.qtyText, isDark && darkSales.primaryText]}>{item.quantity}</Text>
        <QtyButton icon="plus" onPress={() => onQuantityChange(item.quantity + 1)} />
      </View>

      <View style={{ width: 100, marginLeft: 8 }}>
        <TextInput
          value={formatMoneyInput(item.sellingPrice)}
          onChangeText={(v) => onPriceChange(parseMoneyInput(v))}
          keyboardType="numeric"
          style={[styles.priceInput, isDark && darkSales.searchInput]}
        />
      </View>
      <TouchableOpacity onPress={onRemove} style={{ marginLeft: 8 }}>
        <Feather name="trash-2" size={18} color={BRAND_COLORS.error} />
      </TouchableOpacity>
    </View>
  );
}

function QtyButton({ icon, onPress }: { icon: 'minus' | 'plus'; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.qtyButton} onPress={onPress}>
      <Feather name={icon} size={12} color={BRAND_COLORS.primary} />
    </TouchableOpacity>
  );
}

function SaleCard({
  sale,
  onView,
  onEdit,
  onDelete,
  onPrint,
  onShare,
}: {
  sale: Sale;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onShare: () => void;
}) {
  const isDark = useColorScheme() === 'dark';
  const count = Array.isArray(sale.items) ? sale.items.length : 0;

  return (
    <View style={[styles.saleCard, isDark && darkSales.card]}>
      <View style={styles.saleTop}>
        <View>
          <Text style={styles.saleCode}>{saleCode(sale)}</Text>
          <Text style={[styles.saleCustomer, isDark && darkSales.primaryText]}>{sale.customer?.name || 'Khách lẻ'}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: `${statusColor(sale.status)}22` }]}> 
          <Text style={[styles.statusText, { color: statusColor(sale.status) }]}>{statusLabel(sale.status)}</Text>
        </View>
      </View>

      <Text style={[styles.saleMeta, isDark && darkSales.secondaryText]}>📅 {formatDate(sale.date)}</Text>
      <Text style={[styles.saleMeta, isDark && darkSales.secondaryText]}>💳 {paymentMethodLabel(sale.paymentMethod)} • {paymentTypeLabel(sale.paymentType)}</Text>
      <Text style={[styles.saleMeta, isDark && darkSales.secondaryText]}>📦 {count} sản phẩm</Text>
      <Text style={styles.saleTotal}>{formatCurrency(sale.total)}</Text>

      <View style={styles.saleActions}>
        <ActionMini label="Xem" icon="eye" onPress={onView} />
        <ActionMini label="Sửa" icon="edit-2" onPress={onEdit} />
        <ActionMini label="In" icon="printer" onPress={onPrint} />
        <ActionMini label="Share" icon="share-2" onPress={onShare} />
        <ActionMini label="Xóa" icon="trash-2" onPress={onDelete} danger />
      </View>
    </View>
  );
}

function ActionMini({
  label,
  icon,
  onPress,
  danger,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.actionMini} onPress={onPress}>
      <Feather name={icon} size={14} color={danger ? BRAND_COLORS.error : BRAND_COLORS.primary} />
      <Text style={[styles.actionMiniText, danger && { color: BRAND_COLORS.error }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function NumberInputRow({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix: string;
}) {
  return (
    <View style={styles.numberRow}>
      <Text style={styles.numberLabel}>{label}</Text>
      <View style={styles.numberInputBox}>
        <TextInput
          style={styles.numberInput}
          value={suffix === '₫' ? formatMoneyInput(value) : String(value)}
          keyboardType="numeric"
          onChangeText={(text) =>
            onChange(suffix === '₫' ? parseMoneyInput(text) : safeNumber(text))
          }
        />
        <Text style={styles.numberSuffix}>{suffix}</Text>
      </View>
    </View>
  );
}

function SelectorRow({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const isDark = useColorScheme() === 'dark';
  return (
    <View style={styles.selectorRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={[styles.selectorButton, isDark && darkSales.selectorButton, value === opt.key && styles.selectorButtonActive, value === opt.key && isDark && darkSales.selectorButtonActive]}
          onPress={() => onChange(opt.key)}
        >
          <Text style={[styles.selectorButtonText, isDark && darkSales.secondaryText, value === opt.key && styles.selectorButtonTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function InputField({
  label,
  value,
  onChange,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  multiline?: boolean;
}) {
  const isDark = useColorScheme() === 'dark';
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[styles.inputLabel, isDark && darkSales.secondaryText]}>{label}</Text>
      <TextInput
        style={[styles.textInput, isDark && darkSales.searchInput, isDark && darkSales.primaryText, multiline && styles.textInputMultiline]}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND_COLORS.background },
  summaryBanner: {
    backgroundColor: BRAND_COLORS.primary,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center',
  },
  summaryLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700' },
  summaryCompactRow: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryValueCompact: { color: '#fff', fontSize: 20, fontWeight: '800' },
  summarySubCompact: { color: 'rgba(255,255,255,0.92)', fontSize: 12, fontWeight: '700' },
  summaryDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.8)' },

  tabRow: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 8 },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: BRAND_COLORS.surface,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
  },
  tabButtonActive: { backgroundColor: BRAND_COLORS.primary, borderColor: BRAND_COLORS.primary },
  tabButtonText: { fontSize: 12, fontWeight: '700', color: BRAND_COLORS.textSecondary },
  tabButtonTextActive: { color: '#fff' },
  quickActionRow: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    alignItems: 'flex-end',
  },
  quickTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 10,
    backgroundColor: '#E37D3F',
    borderWidth: 1,
    borderColor: '#CD6B2F',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  quickTabText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  section: { flex: 1 },
  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 10 },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    color: BRAND_COLORS.textPrimary,
    fontSize: 14,
  },
  customerSearchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: BRAND_COLORS.primaryLight,
    color: BRAND_COLORS.textPrimary,
    fontSize: 14,
    marginBottom: 8,
  },
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: BRAND_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E88E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    backgroundColor: '#fff',
  },
  chipActive: { borderColor: BRAND_COLORS.primary, backgroundColor: '#E3F2FD' },
  chipText: { fontSize: 12, color: BRAND_COLORS.textSecondary, fontWeight: '600' },
  chipTextActive: { color: BRAND_COLORS.primary },
  wholesaleBox: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 4 },
  wholesaleLabel: { fontSize: 12, color: BRAND_COLORS.textSecondary, fontWeight: '700' },

  gridContent: { paddingHorizontal: 12, paddingBottom: 28, gap: 10 },
  gridRow: { gap: 10 },
  partCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    gap: 4,
  },
  partName: { fontSize: 13, fontWeight: '700', color: BRAND_COLORS.textPrimary, minHeight: 34 },
  partMeta: { fontSize: 11, color: BRAND_COLORS.textMuted },
  partPrice: { fontSize: 14, color: BRAND_COLORS.primary, fontWeight: '800' },
  addButton: {
    marginTop: 4,
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  addedButton: { backgroundColor: '#2E7D32' },
  addButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  cartContent: { paddingHorizontal: 12, paddingBottom: 34, gap: 10 },
  cartHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, color: BRAND_COLORS.textPrimary, fontWeight: '800' },
  customerQuickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: BRAND_COLORS.primary,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: '55%',
  },
  customerButtonText: { color: BRAND_COLORS.primary, fontWeight: '700', fontSize: 12 },
  customerInfoCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  customerInfoTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  customerInfoName: { color: BRAND_COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  customerInfoMeta: { color: BRAND_COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  customerInfoActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  customerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND_COLORS.primary,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  customerActionText: { color: BRAND_COLORS.primary, fontWeight: '700', fontSize: 12 },

  editingBanner: {
    borderWidth: 1,
    borderColor: '#FFB300',
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editingText: { color: '#AD6800', fontWeight: '700', fontSize: 12 },
  cancelEditText: { color: '#D84315', fontWeight: '700', fontSize: 12 },

  cartRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartName: { fontSize: 13, fontWeight: '700', color: BRAND_COLORS.textPrimary },
  cartMeta: { fontSize: 11, color: BRAND_COLORS.textMuted, marginTop: 2 },
  cartControls: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  qtyButton: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BRAND_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { minWidth: 24, textAlign: 'center', fontWeight: '700', color: BRAND_COLORS.textPrimary },
  priceInput: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    paddingHorizontal: 8,
    fontSize: 12,
    color: BRAND_COLORS.textPrimary,
    backgroundColor: '#fff',
  },

  summaryCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 2,
  },
  summaryItem: { fontSize: 14, color: BRAND_COLORS.textPrimary, fontWeight: '700' },
  discountCompactBox: {
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    borderRadius: 10,
    padding: 8,
    gap: 6,
    backgroundColor: '#FAFCFF',
  },
  discountCompactLabel: { color: BRAND_COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  discountCompactControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  discountSegmentRow: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#EEF2F8',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  discountSegmentBtn: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 7,
    alignItems: 'center',
  },
  discountSegmentBtnActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C6D6EE',
  },
  discountSegmentText: { color: BRAND_COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  discountSegmentTextActive: { color: BRAND_COLORS.primary },
  discountValueBox: {
    width: 112,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  discountValueInput: {
    flex: 1,
    color: BRAND_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 0,
  },
  discountValueSuffix: { color: BRAND_COLORS.textMuted, fontSize: 12, fontWeight: '700' },

  numberRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numberLabel: { minWidth: 70, color: BRAND_COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  numberInputBox: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  numberInput: { flex: 1, color: BRAND_COLORS.textPrimary, fontSize: 13 },
  numberSuffix: { color: BRAND_COLORS.textMuted, fontSize: 12, fontWeight: '700' },

  checkoutButton: {
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: BRAND_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  checkoutButtonDisabled: { opacity: 0.6 },
  checkoutText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  listContent: { paddingHorizontal: 12, gap: 10, paddingBottom: 26 },
  saleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    padding: 12,
    gap: 5,
  },
  saleTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saleCode: { color: BRAND_COLORS.primary, fontWeight: '800', fontSize: 12 },
  saleCustomer: { color: BRAND_COLORS.textPrimary, fontWeight: '700', fontSize: 15, marginTop: 1 },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  saleMeta: { fontSize: 12, color: BRAND_COLORS.textSecondary },
  saleTotal: { marginTop: 2, fontSize: 18, color: BRAND_COLORS.primary, fontWeight: '800' },

  saleActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  actionMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  actionMiniText: { color: BRAND_COLORS.primary, fontWeight: '700', fontSize: 11 },

  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 2,
  },
  pageButton: {
    borderRadius: 8,
    backgroundColor: BRAND_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pageButtonDisabled: { opacity: 0.5 },
  pageButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  pageText: { color: BRAND_COLORS.textSecondary, fontWeight: '700', fontSize: 12 },

  modalContainer: {
    flexGrow: 1,
    backgroundColor: BRAND_COLORS.background,
    padding: 12,
    gap: 8,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalHeaderAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: BRAND_COLORS.primary,
  },
  modalHeaderAddText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: BRAND_COLORS.textPrimary },
  customerItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    padding: 12,
    gap: 3,
  },
  customerName: { fontSize: 14, color: BRAND_COLORS.textPrimary, fontWeight: '700' },
  customerPhone: { fontSize: 12, color: BRAND_COLORS.textMuted },

  inputLabel: { color: BRAND_COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: BRAND_COLORS.textPrimary,
    fontSize: 14,
  },
  textInputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  quickServiceGroupWrap: {
    gap: 10,
    marginBottom: 8,
  },
  quickServiceSection: {
    gap: 6,
  },
  quickServiceSectionTitle: {
    color: BRAND_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  quickServiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  quickServiceCard: {
    width: '48.5%',
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    backgroundColor: '#FBFCFE',
    borderRadius: 12,
    padding: 7,
    gap: 7,
  },
  quickServiceSelectButton: {
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 74,
  },
  quickServiceSelectButtonActive: {
    transform: [{ scale: 1.01 }],
    borderWidth: 2,
    borderColor: '#fff',
  },
  quickServiceCardTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  quickServiceCardName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'left',
    width: '100%',
  },
  quickServiceCardPrice: {
    color: '#fff',
    marginTop: 2,
    fontSize: 12,
    fontWeight: '800',
  },
  quickServiceQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    paddingVertical: 4,
  },
  quickServiceQtyButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickServiceQtyValue: {
    minWidth: 22,
    textAlign: 'center',
    color: BRAND_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  quickCustomerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  quickCustomerSearchButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: BRAND_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickCustomerFoundBox: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  quickCustomerFoundTitle: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '700',
  },
  quickCustomerFoundName: {
    color: '#1B5E20',
    fontSize: 14,
    fontWeight: '700',
  },
  quickCustomerFoundMeta: {
    color: '#2E7D32',
    fontSize: 12,
  },
  quickHintText: {
    marginTop: -2,
    marginBottom: 10,
    color: BRAND_COLORS.textMuted,
    fontSize: 12,
  },

  selectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  selectorButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  selectorButtonActive: { borderColor: BRAND_COLORS.primary, backgroundColor: '#E3F2FD' },
  selectorButtonText: { fontSize: 12, fontWeight: '700', color: BRAND_COLORS.textSecondary },
  selectorButtonTextActive: { color: BRAND_COLORS.primary },

  subCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 8,
  },
  subTitle: { fontSize: 13, fontWeight: '800', color: BRAND_COLORS.textPrimary, marginBottom: 8 },

  checkoutSummary: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    backgroundColor: '#fff',
    padding: 12,
    gap: 4,
  },

  installmentHintBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C5D9F7',
    backgroundColor: '#EEF5FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  installmentHintTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: BRAND_COLORS.primary,
  },
  installmentHintText: {
    fontSize: 11,
    color: BRAND_COLORS.textSecondary,
    fontWeight: '600',
  },

  detailLine: { fontSize: 14, color: BRAND_COLORS.textPrimary, marginBottom: 4 },
  saleLineRow: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  saleLineName: { flex: 1, color: BRAND_COLORS.textPrimary, fontWeight: '700', fontSize: 13 },
  saleLineValue: { color: BRAND_COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  detailActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  detailActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND_COLORS.primary,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  detailActionText: { color: BRAND_COLORS.primary, fontWeight: '700', fontSize: 12 },

  deliveryCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  deliveryTitle: { fontSize: 13, fontWeight: '800', color: BRAND_COLORS.primary },
  deliveryMeta: { fontSize: 12, color: BRAND_COLORS.textSecondary },

  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannerTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  closeScanner: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  closeScannerText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingTop: 50, gap: 6 },
  emptyEmoji: { fontSize: 44 },
  emptyText: { fontSize: 14, color: BRAND_COLORS.textSecondary },
});

const darkSales = StyleSheet.create({
  container: { backgroundColor: '#0B1220' },
  tabRow: { backgroundColor: '#0B1220' },
  quickActionRow: { backgroundColor: '#0B1220' },
  section: { backgroundColor: '#0B1220' },
  modalContainer: { backgroundColor: '#0B1220' },
  tabButton: { backgroundColor: '#16233A', borderColor: '#2B3C5A' },
  chip: { backgroundColor: '#16233A', borderColor: '#2B3C5A' },
  chipActive: { backgroundColor: '#1E3A8A', borderColor: '#3B82F6' },
  selectorButton: { backgroundColor: '#16233A', borderColor: '#2B3C5A' },
  selectorButtonActive: { backgroundColor: '#1E3A8A', borderColor: '#3B82F6' },
  card: {
    backgroundColor: '#152239',
    borderColor: '#2B3C5A',
  },
  searchInput: {
    backgroundColor: '#152239',
    borderColor: '#2B3C5A',
    color: '#E2E8F0',
  },
  primaryText: { color: '#E2E8F0' },
  secondaryText: { color: '#9FB0C9' },
});
