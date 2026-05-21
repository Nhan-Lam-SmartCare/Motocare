import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Modal,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../shared/supabaseClient';
import { formatWorkOrderCode } from '../../shared/workOrderCode';
import WorkOrderPreviewModal from '../../shared/WorkOrderPreviewModal';
import { BRAND_COLORS, formatCurrency, formatDate } from '../../constants';
import { useAppTheme } from '../../constants/theme';
import type { WorkOrder } from '../../shared/types';

type DateFilter = 'all' | 'today' | '7d' | '30d';
type PaymentFilter = 'all' | 'unpaid' | 'partial' | 'paid';
type SortBy = 'date_desc' | 'date_asc' | 'total_desc' | 'total_asc';
type WorkOrdersTab = 'orders' | 'history' | 'templates';

type WorkOrderHistoryItem = {
  id: string;
  action: string;
  recordId: string;
  createdAt: string;
  oldStatus?: string;
  newStatus?: string;
};

type WorkOrderTemplate = {
  id: string;
  issueDescription: string;
  technicianName: string;
  notes: string;
  laborCost: number;
  status: string;
  useCount: number;
  updatedAt: string;
};

type StoreSettingsReceipt = {
  storeName?: string;
  storePhone?: string;
  storeAddress?: string;
  logoUrl?: string;
  bankQrUrl?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  bankBranch?: string;
  workOrderPrefix?: string;
};

const STATUS_ORDER = ['Tiếp nhận', 'Đang sửa', 'Đã sửa xong', 'Trả máy', 'Đã hủy'];
const PAYMENT_ORDER: PaymentFilter[] = ['all', 'unpaid', 'partial', 'paid'];

const STATUS_COLORS: Record<string, string> = {
  'Tiếp nhận': '#3B82F6',
  'Đang sửa': '#F59E0B',
  'Đã sửa xong': '#10B981',
  'Trả máy': '#8B5CF6',
  'Đã hủy': '#EF4444',
};

const STATUS_BG: Record<string, string> = {
  'Tiếp nhận': 'rgba(59, 130, 246, 0.12)',
  'Đang sửa': 'rgba(245, 158, 11, 0.12)',
  'Đã sửa xong': 'rgba(16, 185, 129, 0.12)',
  'Trả máy': 'rgba(139, 92, 246, 0.12)',
  'Đã hủy': 'rgba(239, 68, 68, 0.12)',
};

const PAYMENT_LABEL: Record<PaymentFilter, string> = {
  all: 'Tất cả TT',
  unpaid: 'Chưa TT',
  partial: 'Một phần',
  paid: 'Đã TT',
};

const DATE_LABEL: Record<DateFilter, string> = {
  all: 'Mọi thời gian',
  today: 'Hôm nay',
  '7d': '7 ngày qua',
  '30d': '30 ngày qua',
};

const SORT_LABEL: Record<SortBy, string> = {
  date_desc: 'Mới nhất',
  date_asc: 'Cũ nhất',
  total_desc: 'Tổng tiền giảm dần',
  total_asc: 'Tổng tiền tăng dần',
};

const pickArray = (row: any, keys: string[]) => {
  let best: any[] = [];
  for (const key of keys) {
    const value = row?.[key];
    if (Array.isArray(value)) {
      if (value.length > best.length) best = value;
      continue;
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length > best.length) best = parsed;
      } catch {
        // Ignore invalid JSON payload and continue with next key.
      }
    }
  }
  return best;
};

const normalizeWorkOrder = (row: any): WorkOrder => ({
  id: row.id,
  creationDate: row.creationDate || row.creationdate || row.created_at || new Date().toISOString(),
  customerName: row.customerName || row.customername || 'Khách lẻ',
  customerPhone: row.customerPhone || row.customerphone || '',
  customerId: row.customerId || row.customerid,
  vehicleModel: row.vehicleModel || row.vehiclemodel || '',
  licensePlate: row.licensePlate || row.licenseplate || '',
  currentKm: row.currentKm ?? row.currentkm,
  issueDescription: row.issueDescription || row.issuedescription || '',
  technicianName: row.technicianName || row.technicianname || '',
  assignedTechnician: row.assignedTechnician || row.assignedtechnician,
  status: row.status || 'Tiếp nhận',
  laborCost: Number(row.laborCost ?? row.laborcost ?? 0),
  discount: Number(row.discount ?? 0),
  partsUsed: pickArray(row, ['partsUsed', 'partsused', 'parts_used']),
  additionalServices: pickArray(row, ['additionalServices', 'additionalservices', 'additional_services']),
  notes: row.notes || '',
  total: Number(row.total ?? 0),
  branchId: row.branchId || row.branchid || 'CN1',
  depositAmount: Number(row.depositAmount ?? row.depositamount ?? 0),
  paymentStatus: row.paymentStatus || row.paymentstatus || 'unpaid',
  paymentMethod: row.paymentMethod || row.paymentmethod,
  totalPaid: Number(row.totalPaid ?? row.totalpaid ?? 0),
  remainingAmount: Number(row.remainingAmount ?? row.remainingamount ?? 0),
  paymentDate: row.paymentDate || row.paymentdate,
});

const fetchWorkOrderForReceipt = async (id: string): Promise<WorkOrder | null> => {
  const { data, error } = await supabase.from('work_orders').select('*').eq('id', id).single();
  if (error || !data) return null;
  return normalizeWorkOrder(data);
};

const fetchWorkOrders = async ({ pageParam = 0 }) => {
  const pageSize = 20;
  const start = pageParam * pageSize;
  const end = start + pageSize - 1;

  const { data, error } = await supabase
    .from('work_orders')
    .select('*')
    .order('creationdate', { ascending: false })
    .range(start, end);

  if (error) throw error;
  return (data ?? []).map(normalizeWorkOrder);
};

const fetchWorkOrderHistory = async (): Promise<WorkOrderHistoryItem[]> => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id,action,record_id,created_at,old_data,new_data,table_name')
    .in('table_name', ['work_orders', 'workorders'])
    .order('created_at', { ascending: false })
    .limit(80);

  // Primary source: audit trail.
  if (!error && (data?.length ?? 0) > 0) {
    return (data ?? []).map((row: any) => ({
      id: String(row.id),
      action: String(row.action || ''),
      recordId: String(row.record_id || ''),
      createdAt: String(row.created_at || new Date().toISOString()),
      oldStatus: row.old_data?.status,
      newStatus: row.new_data?.status,
    }));
  }

  // Fallback source: build timeline from recent work orders.
  const { data: orderRows, error: orderError } = await supabase
    .from('work_orders')
    .select('id,status,creationDate,creationdate,created_at')
    .order('creationdate', { ascending: false })
    .limit(80);

  if (orderError) throw orderError;

  return (orderRows ?? []).map((row: any) => ({
    id: `fallback-${String(row.id)}`,
    action: 'work_order.create',
    recordId: String(row.id || ''),
    createdAt: String(row.creationDate || row.creationdate || row.created_at || new Date().toISOString()),
    oldStatus: undefined,
    newStatus: String(row.status || 'Tiếp nhận'),
  }));
};

const fetchWorkOrderTemplates = async (): Promise<WorkOrderTemplate[]> => {
  const { data, error } = await supabase
    .from('work_orders')
    .select('id,issueDescription,issuedescription,technicianName,technicianname,notes,laborCost,laborcost,status,created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;

  const grouped = new Map<string, WorkOrderTemplate>();

  (data ?? []).forEach((row: any) => {
    const issueDescription = String(row.issueDescription || row.issuedescription || '').trim();
    const technicianName = String(row.technicianName || row.technicianname || '').trim();
    if (!issueDescription) return;

    const key = `${issueDescription}__${technicianName || 'none'}`;
    const current = grouped.get(key);

    if (!current) {
      grouped.set(key, {
        id: String(row.id || key),
        issueDescription,
        technicianName,
        notes: String(row.notes || ''),
        laborCost: Number(row.laborCost ?? row.laborcost ?? 0),
        status: String(row.status || 'Tiếp nhận'),
        useCount: 1,
        updatedAt: String(row.created_at || new Date().toISOString()),
      });
      return;
    }

    current.useCount += 1;
  });

  return Array.from(grouped.values())
    .sort((a, b) => b.useCount - a.useCount || +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 20);
};

const pickStoreString = (row: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const value = row[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const fetchStoreSettingsForReceipt = async (): Promise<StoreSettingsReceipt | null> => {
  const { data, error } = await supabase.from('store_settings').select('*').limit(1);
  if (error || !data?.length) return null;

  const row = (data[0] || {}) as Record<string, unknown>;
  return {
    storeName: pickStoreString(row, ['storeName', 'store_name']),
    storePhone: pickStoreString(row, ['storePhone', 'store_phone', 'phone']),
    storeAddress: pickStoreString(row, ['storeAddress', 'store_address', 'address']),
    logoUrl: pickStoreString(row, ['logoUrl', 'logo_url', 'logo']),
    bankQrUrl: pickStoreString(row, ['bankQrUrl', 'bank_qr_url']),
    bankName: pickStoreString(row, ['bankName', 'bank_name']),
    bankAccountNumber: pickStoreString(row, ['bankAccountNumber', 'bank_account_number', 'bankAccount']),
    bankAccountHolder: pickStoreString(row, ['bankAccountHolder', 'bank_account_holder', 'bankAccountName']),
    bankBranch: pickStoreString(row, ['bankBranch', 'bank_branch']),
    workOrderPrefix: pickStoreString(row, ['workOrderPrefix', 'work_order_prefix']),
  };
};

const parseWorkOrderDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) return direct;

  const sqlMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (sqlMatch) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = sqlMatch;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const pickDateFilterRange = (filter: DateFilter): { start: Date; end: Date } | null => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  if (filter === 'today') {
    return { start: todayStart, end: todayEnd };
  }

  if (filter === '7d') {
    const start = new Date(todayStart);
    start.setDate(start.getDate() - 6);
    return { start, end: todayEnd };
  }

  if (filter === '30d') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: todayEnd };
  }

  return null;
};

const getAvatarColor = (name: string) => {
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#EF4444', // Red
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const getInitials = (name: string) => {
  if (!name) return 'K';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export default function WorkOrdersScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const compact = width < 380;

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date_desc');
  const [hideFinance, setHideFinance] = useState(true);
  const [collapseFinance, setCollapseFinance] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkOrdersTab>('orders');
  const [previewOrder, setPreviewOrder] = useState<WorkOrder | null>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['workorders'],
    queryFn: fetchWorkOrders,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined;
    },
    refetchInterval: 30000,
  });

  const {
    data: historyItems = [],
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory,
    isRefetching: isRefetchingHistory,
  } = useQuery({
    queryKey: ['workorders-history-mobile'],
    queryFn: fetchWorkOrderHistory,
    enabled: activeTab === 'history',
  });

  const {
    data: templates = [],
    isLoading: templatesLoading,
    refetch: refetchTemplates,
    isRefetching: isRefetchingTemplates,
  } = useQuery({
    queryKey: ['workorders-templates-mobile'],
    queryFn: fetchWorkOrderTemplates,
    enabled: activeTab === 'templates',
  });

  const { data: storeSettingsForReceipt } = useQuery({
    queryKey: ['store-settings-mobile-receipt'],
    queryFn: fetchStoreSettingsForReceipt,
    staleTime: 1000 * 60 * 10,
  });

  const orders = useMemo(() => {
    return data?.pages.flat() || [];
  }, [data]);

  const technicians = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.technicianName && o.technicianName.trim()) {
        set.add(o.technicianName.trim());
      }
    });
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'))];
  }, [orders]);

  const updateStatusMutation = useMutation({
    mutationFn: async (payload: { id: string; status: string; oldStatus: string }) => {
      const { error } = await supabase
        .from('work_orders')
        .update({ status: payload.status })
        .eq('id', payload.id);

      if (error) throw error;

      // Best-effort audit logging for timeline history.
      try {
        const { data: authData } = await supabase.auth.getUser();
        await supabase.from('audit_logs').insert({
          user_id: authData.user?.id ?? null,
          action: 'work_order.status_update',
          table_name: 'work_orders',
          record_id: payload.id,
          old_data: { status: payload.oldStatus },
          new_data: { status: payload.status },
        });
      } catch {
        // Ignore audit failures so status update remains successful.
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workorders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-live'] });
      Alert.alert('Thành công', 'Đã cập nhật trạng thái phiếu sửa');
    },
    onError: () => {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái. Vui lòng thử lại.');
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (order: WorkOrder) => {
      const { error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', order.id);
      if (error) throw error;

      try {
        const { data: authData } = await supabase.auth.getUser();
        await supabase.from('audit_logs').insert({
          user_id: authData.user?.id ?? null,
          action: 'work_order.delete',
          table_name: 'work_orders',
          record_id: order.id,
          old_data: order,
          new_data: null,
        });
      } catch {
        // Keep delete success even if audit insert fails.
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workorders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-live'] });
      Alert.alert('Thành công', 'Đã xóa phiếu sửa chữa');
    },
    onError: () => {
      Alert.alert('Lỗi', 'Không thể xóa phiếu sửa. Vui lòng thử lại.');
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('mobile-workorders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['workorders'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const askUpdateStatus = (order: WorkOrder) => {
    Alert.alert(
      'Cập nhật trạng thái',
      `Phiếu ${formatWorkOrderCode(order.id)} - chọn trạng thái mới`,
      [
        { text: 'Hủy', style: 'cancel' },
        ...STATUS_ORDER.map((status) => ({
          text: status,
          onPress: () => {
            if (updateStatusMutation.isPending || status === order.status) return;
            updateStatusMutation.mutate({ id: order.id, status, oldStatus: order.status });
          },
        })),
      ]
    );
  };

  const askDeleteOrder = (order: WorkOrder) => {
    if (deleteOrderMutation.isPending) return;
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc muốn xóa phiếu ${formatWorkOrderCode(order.id)}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => deleteOrderMutation.mutate(order),
        },
      ]
    );
  };

  const callCustomer = async (phone?: string) => {
    if (!phone) {
      Alert.alert('Thông báo', 'Không có số điện thoại để gọi');
      return;
    }
    const url = `tel:${phone}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Thông báo', 'Thiết bị không hỗ trợ gọi điện');
      return;
    }
    await Linking.openURL(url);
  };

  const handlePrintOrder = async (order: WorkOrder) => {
    const fullOrder = await fetchWorkOrderForReceipt(order.id);
    setPreviewOrder((fullOrder || order) as WorkOrder);
  };

  const handleShareOrder = async (order: WorkOrder) => {
    const fullOrder = await fetchWorkOrderForReceipt(order.id);
    setPreviewOrder((fullOrder || order) as WorkOrder);
  };

  const historyActionLabel = (action: string) => {
    if (action.includes('create')) return 'Tạo phiếu';
    if (action.includes('status_update')) return 'Cập nhật trạng thái';
    if (action.includes('delete')) return 'Xóa phiếu';
    if (action.includes('update')) return 'Cập nhật phiếu';
    return action || 'Hoạt động';
  };

  const filtered = useMemo(() => {
    const range = pickDateFilterRange(dateFilter);

    const result = orders.filter((o) => {
      const keyword = search.trim().toLowerCase();
      const matchSearch =
        !keyword ||
        (o.customerName ?? '').toLowerCase().includes(keyword) ||
        (o.licensePlate ?? '').toLowerCase().includes(keyword) ||
        (o.vehicleModel ?? '').toLowerCase().includes(keyword) ||
        (o.customerPhone ?? '').includes(keyword);

      const matchStatus = !filterStatus || o.status === filterStatus;
      const orderPayment = (o.paymentStatus ?? 'unpaid') as PaymentFilter;
      const matchPayment = paymentFilter === 'all' || orderPayment === paymentFilter;
      const matchTechnician = technicianFilter === 'all' || (o.technicianName ?? '') === technicianFilter;
      const createdAt = parseWorkOrderDate(o.creationDate);
      const matchDate = !range || (createdAt ? (createdAt >= range.start && createdAt <= range.end) : false);

      return matchSearch && matchStatus && matchPayment && matchTechnician && matchDate;
    });

    result.sort((a, b) => {
      const timeA = parseWorkOrderDate(a.creationDate)?.getTime() ?? 0;
      const timeB = parseWorkOrderDate(b.creationDate)?.getTime() ?? 0;
      if (sortBy === 'date_desc') return timeB - timeA;
      if (sortBy === 'date_asc') return timeA - timeB;
      if (sortBy === 'total_desc') return (Number(b.total) || 0) - (Number(a.total) || 0);
      return (Number(a.total) || 0) - (Number(b.total) || 0);
    });

    return result;
  }, [orders, search, filterStatus, paymentFilter, technicianFilter, dateFilter, sortBy]);

  const summaryOrders = useMemo(() => {
    const range = pickDateFilterRange(dateFilter);

    return orders.filter((o) => {
      if (!range) return true;
      const createdAt = parseWorkOrderDate(o.creationDate);
      return createdAt ? (createdAt >= range.start && createdAt <= range.end) : false;
    });
  }, [orders, dateFilter]);

  const stats = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = summaryOrders.filter((o) => o.status === status).length;
    return acc;
  }, {} as Record<string, number>);

  const financeSummary = useMemo(() => {
    const revenue = summaryOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const cost = summaryOrders.reduce((sum, o) => {
      const partCost = (o.partsUsed || []).reduce(
        (s, p: any) => s + (Number(p.costPrice ?? 0) * Number(p.quantity ?? 1)),
        0
      );
      return sum + partCost;
    }, 0);

    return {
      revenue,
      profit: Math.max(0, revenue - cost),
    };
  }, [summaryOrders]);

  const dateQuickChips: Array<{ key: DateFilter; label: string }> = [
    { key: 'today', label: 'Hôm nay' },
    { key: '7d', label: '7 ngày' },
    { key: '30d', label: 'Tháng' },
    { key: 'all', label: 'Tất cả' },
  ];

  const clearFilters = () => {
    setFilterStatus(null);
    setPaymentFilter('all');
    setTechnicianFilter('all');
    setSortBy('date_desc');
  };

  const handleToggleStatusFilter = (status: string) => {
    setFilterStatus((prev) => (prev === status ? null : status));
  };

  const activeFilterCount = [
    filterStatus ? 1 : 0,
    paymentFilter !== 'all' ? 1 : 0,
    technicianFilter !== 'all' ? 1 : 0,
    sortBy !== 'date_desc' ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);

  const activeFilterSummary = [
    filterStatus,
    paymentFilter !== 'all' ? PAYMENT_LABEL[paymentFilter] : null,
    technicianFilter !== 'all' ? technicianFilter : null,
    sortBy !== 'date_desc' ? SORT_LABEL[sortBy] : null,
  ].filter(Boolean) as string[];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Premium iOS-style Segmented Control */}
      <View style={styles.segmentedContainer}>
        <Pressable
          style={[styles.segmentBtn, activeTab === 'orders' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('orders')}
        >
          <MaterialCommunityIcons
            name="file-document-multiple-outline"
            size={14}
            color={activeTab === 'orders' ? theme.primary : theme.textSecondary}
          />
          <Text style={[styles.segmentText, activeTab === 'orders' && styles.segmentTextActive]}>Phiếu sửa</Text>
        </Pressable>
        <Pressable
          style={[styles.segmentBtn, activeTab === 'history' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('history')}
        >
          <MaterialCommunityIcons
            name="history"
            size={14}
            color={activeTab === 'history' ? theme.primary : theme.textSecondary}
          />
          <Text style={[styles.segmentText, activeTab === 'history' && styles.segmentTextActive]}>Lịch sử</Text>
        </Pressable>
        <Pressable
          style={[styles.segmentBtn, activeTab === 'templates' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('templates')}
        >
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={14}
            color={activeTab === 'templates' ? theme.primary : theme.textSecondary}
          />
          <Text style={[styles.segmentText, activeTab === 'templates' && styles.segmentTextActive]}>Mẫu</Text>
        </Pressable>
      </View>

      {activeTab === 'history' ? (
        <FlatList
          data={historyItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetchingHistory} onRefresh={refetchHistory} tintColor={BRAND_COLORS.primary} />}
          ListHeaderComponent={
            <View style={styles.altTabHeaderBox}>
              <Text style={styles.altTabHeaderTitle}>Lịch sử thao tác phiếu sửa</Text>
              <Text style={styles.altTabHeaderSub}>Theo dõi các thay đổi gần nhất từ hệ thống audit log</Text>
            </View>
          }
          ListEmptyComponent={
            historyLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={BRAND_COLORS.primary} />
              </View>
            ) : historyError ? (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={34} color={theme.textSecondary} />
                <Text style={styles.emptyText}>Không tải được lịch sử phiếu sửa</Text>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="history" size={34} color={theme.textSecondary} />
                <Text style={styles.emptyText}>Chưa có lịch sử thao tác</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={styles.altItemCard}>
              <View style={styles.rowBetweenTight}>
                <Text style={styles.altItemTitle}>{historyActionLabel(item.action)}</Text>
                <Text style={styles.altItemDate}>{formatDate(item.createdAt)}</Text>
              </View>
              <Text style={styles.altItemMeta}>Phiếu: {formatWorkOrderCode(item.recordId)}</Text>
              {item.oldStatus || item.newStatus ? (
                <Text style={styles.altItemMeta}>Trạng thái: {item.oldStatus || '-'} → {item.newStatus || '-'}</Text>
              ) : null}
            </View>
          )}
        />
      ) : activeTab === 'templates' ? (
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetchingTemplates} onRefresh={refetchTemplates} tintColor={BRAND_COLORS.primary} />}
          ListHeaderComponent={
            <View style={styles.altTabHeaderBox}>
              <Text style={styles.altTabHeaderTitle}>Mẫu phiếu sửa nhanh</Text>
              <Text style={styles.altTabHeaderSub}>Chạm vào mẫu để mở form tạo phiếu đã điền sẵn</Text>
            </View>
          }
          ListEmptyComponent={
            templatesLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={BRAND_COLORS.primary} />
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={34} color={theme.textSecondary} />
                <Text style={styles.emptyText}>Chưa có mẫu gợi ý từ dữ liệu</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={styles.altItemCard}>
              <View style={styles.rowBetweenTight}>
                <Text style={styles.altItemTitle} numberOfLines={1}>{item.issueDescription}</Text>
                <Text style={styles.altItemDate}>x{item.useCount}</Text>
              </View>
              <Text style={styles.altItemMeta}>KTV: {item.technicianName || 'Chưa gán'} • Công: {formatCurrency(item.laborCost)}</Text>
              {!!item.notes && <Text style={styles.altItemMeta} numberOfLines={2}>Ghi chú: {item.notes}</Text>}

              <Pressable
                style={({ pressed }) => [styles.altTabAction, pressed && styles.pressableDown]}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/workorder-create',
                    params: {
                      issueTemplate: item.issueDescription,
                      technicianTemplate: item.technicianName,
                      noteTemplate: item.notes,
                      laborTemplate: String(item.laborCost || 0),
                      statusTemplate: item.status || 'Tiếp nhận',
                    },
                  })
                }
              >
                <Text style={styles.altTabActionText}>Dùng mẫu này</Text>
              </Pressable>
            </View>
          )}
        />
      ) : (
        <>
          {/* Interactive Status Cards Row */}
          <View style={styles.statsRow}>
            <View style={styles.summaryCell}>
              <StatCard
                icon="file-document-outline"
                label="Tiếp nhận"
                value={stats['Tiếp nhận'] ?? 0}
                color={STATUS_COLORS['Tiếp nhận']}
                active={filterStatus === 'Tiếp nhận'}
                onPress={() => handleToggleStatusFilter('Tiếp nhận')}
                compact
              />
            </View>
            <View style={styles.summaryCell}>
              <StatCard
                icon="wrench-outline"
                label="Đang sửa"
                value={stats['Đang sửa'] ?? 0}
                color={STATUS_COLORS['Đang sửa']}
                active={filterStatus === 'Đang sửa'}
                onPress={() => handleToggleStatusFilter('Đang sửa')}
                compact
              />
            </View>
            <View style={styles.summaryCell}>
              <StatCard
                icon="check-circle-outline"
                label="Đã xong"
                value={stats['Đã sửa xong'] ?? 0}
                color={STATUS_COLORS['Đã sửa xong']}
                active={filterStatus === 'Đã sửa xong'}
                onPress={() => handleToggleStatusFilter('Đã sửa xong')}
                compact
              />
            </View>
            <View style={styles.summaryCell}>
              <StatCard
                icon="motorbike"
                label="Trả máy"
                value={stats['Trả máy'] ?? 0}
                color={STATUS_COLORS['Trả máy']}
                active={filterStatus === 'Trả máy'}
                onPress={() => handleToggleStatusFilter('Trả máy')}
                compact
              />
            </View>
          </View>

          {/* Premium Collapsible Financial Panel */}
          <View style={styles.financeContainer}>
            <View style={styles.financeHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={16} color={theme.primary} />
                <Text style={styles.financeHeaderTitle}>Báo cáo tài chính ({DATE_LABEL[dateFilter].toLowerCase()})</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => setHideFinance((v) => !v)} style={styles.financeHeaderIcon}>
                  <Feather name={hideFinance ? 'eye-off' : 'eye'} size={14} color={theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCollapseFinance((v) => !v)} style={styles.financeHeaderIcon}>
                  <Feather name={collapseFinance ? 'chevron-down' : 'chevron-up'} size={15} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            
            {!collapseFinance && (
              <View style={styles.financeCardRow}>
                <View style={[styles.financeItemCard, { backgroundColor: theme.primary === '#3B82F6' ? 'rgba(59, 130, 246, 0.06)' : 'rgba(43, 131, 255, 0.04)', borderColor: theme.primary + '30' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.financeItemLabel}>Doanh thu</Text>
                    <MaterialCommunityIcons name="cash-multiple" size={15} color={theme.primary} />
                  </View>
                  <Text style={[styles.financeItemValue, { color: theme.primary }]}>
                    {hideFinance ? '••••••••' : formatCurrency(financeSummary.revenue)}
                  </Text>
                </View>
                
                <View style={[styles.financeItemCard, { backgroundColor: 'rgba(16, 185, 129, 0.06)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.financeItemLabel}>Lợi nhuận</Text>
                    <MaterialCommunityIcons name="trending-up" size={15} color="#10B981" />
                  </View>
                  <Text style={[styles.financeItemValue, { color: '#10B981' }]}>
                    {hideFinance ? '••••••••' : formatCurrency(financeSummary.profit)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Sleek Integrated Search & Filter Row */}
          <View style={styles.searchFilterRow}>
            <View style={styles.searchInputContainer}>
              <Feather name="search" size={15} color={theme.textSecondary} style={styles.searchFieldIcon} />
              <TextInput
                style={styles.searchFieldInput}
                placeholder="Tìm tên, SĐT, biển số, xe..."
                placeholderTextColor={theme.textSecondary + '80'}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClearBtn}>
                  <Feather name="x" size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity
              style={[
                styles.filterIconButton,
                activeFilterCount > 0 && { borderColor: theme.primary, backgroundColor: theme.primary + '10' }
              ]}
              onPress={() => setShowFilterSheet(true)}
            >
              <MaterialCommunityIcons
                name={activeFilterCount > 0 ? "filter" : "filter-outline"}
                size={18}
                color={activeFilterCount > 0 ? theme.primary : theme.textSecondary}
              />
              {activeFilterCount > 0 && (
                <View style={styles.filterIconBadge}>
                  <Text style={styles.filterIconBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Date Range Filters */}
          <View style={styles.quickFiltersRow}>
            {dateQuickChips.map((chip) => (
              <Pressable
                key={chip.key}
                style={({ pressed }) => [styles.quickChip, dateFilter === chip.key && styles.quickChipActive, pressed && styles.pressableDown]}
                onPress={() => setDateFilter(chip.key)}
              >
                <Text style={[styles.quickChipText, dateFilter === chip.key && styles.quickChipTextActive]}>
                  {chip.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Active Filters Clear Options */}
          {activeFilterCount > 0 ? (
            <View style={styles.filterBar}>
              <Pressable
                style={({ pressed }) => [styles.clearFilterButton, pressed && styles.pressableDown]}
                onPress={clearFilters}
              >
                <MaterialCommunityIcons name="filter-remove-outline" size={14} color={theme.danger} />
                <Text style={styles.clearFilterText}>Xóa bộ lọc ({activeFilterCount})</Text>
              </Pressable>
            </View>
          ) : null}

          {activeFilterSummary.length > 0 ? (
            <View style={styles.filterSummaryRow}>
              <Text style={styles.filterSummaryText}>Đang lọc: {activeFilterSummary.join(' • ')}</Text>
            </View>
          ) : null}

          {/* Infinite Scroll FlatList */}
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
            </View>
          ) : isError ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={34} color={theme.textSecondary} />
              <Text style={styles.emptyText}>Không tải được danh sách phiếu sửa</Text>
              <Text style={styles.errorHint}>{(error as Error)?.message || 'Lỗi không xác định'}</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND_COLORS.primary} />}
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage) {
                  fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={BRAND_COLORS.primary} />
                    <Text style={{ marginTop: 8, color: theme.textSecondary, fontSize: 13 }}>Đang tải thêm...</Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <MaterialCommunityIcons name="text-box-search-outline" size={34} color={theme.textSecondary} />
                  <Text style={styles.emptyText}>Không có phiếu sửa phù hợp</Text>
                </View>
              }
              renderItem={({ item }) => (
                <WorkOrderCard
                  order={item}
                  onOpenDetail={() =>
                    router.push({
                      pathname: '/(tabs)/workorder-detail/[id]',
                      params: { id: item.id },
                    })
                  }
                  onChangeStatus={() => askUpdateStatus(item)}
                  onCall={() => callCustomer(item.customerPhone)}
                  onPrint={() => handlePrintOrder(item)}
                  onShare={() => handleShareOrder(item)}
                  isSharing={false}
                  onEdit={() =>
                    router.push({
                      pathname: '/(tabs)/workorder-edit/[id]',
                      params: { id: item.id },
                    })
                  }
                  onDelete={() => askDeleteOrder(item)}
                />
              )}
            />
          )}

          {/* Glowing Primary Gradient-style FAB */}
          <Pressable
            style={({ pressed }) => [styles.fab, { bottom: 96 + insets.bottom }, pressed && styles.pressableDown]}
            onPress={() => router.push('/(tabs)/workorder-create')}
          >
            <Text style={styles.fabText}>＋</Text>
          </Pressable>

          <WorkOrderPreviewModal
            visible={!!previewOrder}
            order={previewOrder as any}
            storeSettings={(storeSettingsForReceipt || null) as any}
            onClose={() => setPreviewOrder(null)}
          />

          {/* Theme-compliant Dynamic Filter Modal */}
          <Modal
            visible={showFilterSheet}
            transparent
            animationType="fade"
            onRequestClose={() => setShowFilterSheet(false)}
          >
            <Pressable style={styles.sheetBackdrop} onPress={() => setShowFilterSheet(false)}>
              <Pressable style={styles.sheetCard} onPress={() => {}}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Bộ lọc nâng cao</Text>
                <Text style={styles.sheetSubtitle}>Chọn các điều kiện muốn áp dụng cho danh sách</Text>

                <Text style={styles.filterSectionTitle}>Trạng thái phiếu sửa</Text>
                <View style={styles.filterOptionsWrap}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.filterOptionChip,
                      !filterStatus && styles.filterOptionChipActive,
                      pressed && styles.pressableDown,
                    ]}
                    onPress={() => setFilterStatus(null)}
                  >
                    <Text style={[styles.filterOptionText, !filterStatus && styles.filterOptionTextActive]}>Tất cả</Text>
                  </Pressable>
                  {STATUS_ORDER.map((status) => (
                    <Pressable
                      key={status}
                      style={({ pressed }) => [
                        styles.filterOptionChip,
                        filterStatus === status && styles.filterOptionChipActive,
                        pressed && styles.pressableDown,
                      ]}
                      onPress={() => setFilterStatus(status)}
                    >
                      <Text style={[styles.filterOptionText, filterStatus === status && styles.filterOptionTextActive]}>{status}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.filterSectionTitle}>Trạng thái thanh toán</Text>
                <View style={styles.filterOptionsWrap}>
                  {PAYMENT_ORDER.map((key) => (
                    <Pressable
                      key={key}
                      style={({ pressed }) => [
                        styles.filterOptionChip,
                        paymentFilter === key && styles.filterOptionChipActive,
                        pressed && styles.pressableDown,
                      ]}
                      onPress={() => setPaymentFilter(key)}
                    >
                      <Text style={[styles.filterOptionText, paymentFilter === key && styles.filterOptionTextActive]}>
                        {PAYMENT_LABEL[key]}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.filterSectionTitle}>Kỹ thuật viên phụ trách</Text>
                <View style={styles.filterOptionsWrap}>
                  {technicians.map((tech) => (
                    <Pressable
                      key={tech}
                      style={({ pressed }) => [
                        styles.filterOptionChip,
                        technicianFilter === tech && styles.filterOptionChipActive,
                        pressed && styles.pressableDown,
                      ]}
                      onPress={() => setTechnicianFilter(tech)}
                    >
                      <Text style={[styles.filterOptionText, technicianFilter === tech && styles.filterOptionTextActive]}>
                        {tech === 'all' ? 'Tất cả KTV' : tech}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.filterSectionTitle}>Sắp xếp danh sách</Text>
                <View style={styles.filterOptionsWrap}>
                  {(['date_desc', 'date_asc', 'total_desc', 'total_asc'] as SortBy[]).map((key) => (
                    <Pressable
                      key={key}
                      style={({ pressed }) => [
                        styles.filterOptionChip,
                        sortBy === key && styles.filterOptionChipActive,
                        pressed && styles.pressableDown,
                      ]}
                      onPress={() => setSortBy(key)}
                    >
                      <Text style={[styles.filterOptionText, sortBy === key && styles.filterOptionTextActive]}>
                        {SORT_LABEL[key]}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.filterSheetActions}>
                  {activeFilterCount > 0 ? (
                    <TouchableOpacity style={styles.sheetSecondaryBtn} onPress={clearFilters}>
                      <Text style={styles.sheetSecondaryText}>Xóa lọc</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity style={styles.sheetPrimaryBtn} onPress={() => setShowFilterSheet(false)}>
                    <Text style={styles.sheetPrimaryText}>Áp dụng</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        </>
      )}
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  compact = false,
  active = false,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: number;
  color: string;
  compact?: boolean;
  active?: boolean;
  onPress?: () => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCard,
        compact && styles.statCardCompact,
        active && { borderColor: color, borderWidth: 1.5, backgroundColor: color + '0D' },
        pressed && styles.pressableDown
      ]}
    >
      <MaterialCommunityIcons name={icon} size={18} color={color} />
      <Text style={[styles.statValue, active && { fontWeight: '900' }]}>{value}</Text>
      <Text style={[styles.statLabel, active && { color: color, fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

function WorkOrderCard({
  order,
  onOpenDetail,
  onChangeStatus,
  onCall,
  onPrint,
  onShare,
  isSharing,
  onEdit,
  onDelete,
}: {
  order: WorkOrder;
  onOpenDetail: () => void;
  onChangeStatus: () => void;
  onCall: () => void;
  onPrint: () => void;
  onShare: () => void;
  isSharing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const scale = useRef(new Animated.Value(1)).current;
  const [showMoreActions, setShowMoreActions] = useState(false);

  const runSpring = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      friction: 7,
      tension: 180,
    }).start();
  };

  const payLabel: Record<string, string> = { unpaid: 'Chưa TT', partial: 'Một phần', paid: 'Đã TT' };
  const payColor: Record<string, string> = {
    unpaid: BRAND_COLORS.error,
    partial: BRAND_COLORS.warning,
    paid: BRAND_COLORS.success,
  };
  const payBg: Record<string, string> = {
    unpaid: 'rgba(239, 68, 68, 0.1)',
    partial: 'rgba(245, 158, 11, 0.1)',
    paid: 'rgba(16, 185, 129, 0.1)',
  };

  const openMoreActions = () => setShowMoreActions(true);
  const closeMoreActions = () => setShowMoreActions(false);
  const runMoreAction = (action: () => void) => {
    closeMoreActions();
    action();
  };

  const avatarColor = getAvatarColor(order.customerName);
  const initials = getInitials(order.customerName);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.96}
        onPress={onOpenDetail}
        onPressIn={() => runSpring(0.985)}
        onPressOut={() => runSpring(1)}
      >
        {/* Top Header Row with Avatar & Code Badge */}
        <View style={styles.cardHeader}>
          <View style={[styles.avatarContainer, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.customerName} numberOfLines={1}>{order.customerName}</Text>
            <View style={styles.inlineInfoRow}>
              <MaterialCommunityIcons name="motorbike" size={13} color={theme.textSecondary} />
              <Text style={styles.vehicleModel} numberOfLines={1}>
                {order.vehicleModel || 'Xe máy'} {order.licensePlate ? `• ${order.licensePlate}` : ''}
              </Text>
            </View>
          </View>
          
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={styles.codeBadge}>
              <Text style={styles.codeBadgeText}>{formatWorkOrderCode(order.id)}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(order.creationDate)}</Text>
          </View>
        </View>

        {/* Issue Description enclosed in a beautiful accent box */}
        {order.issueDescription ? (
          <View style={[styles.issueBox, { borderLeftColor: STATUS_COLORS[order.status] || theme.primary }]}>
            <Text style={styles.issueText} numberOfLines={2}>{order.issueDescription}</Text>
          </View>
        ) : null}

        {/* Footer info: KTV, Payment Status & Total */}
        <View style={styles.cardFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="tool" size={11} color={theme.textSecondary} />
            <Text style={styles.techText} numberOfLines={1}>KTV: {order.technicianName || 'Chưa gán'}</Text>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {order.paymentStatus ? (
              <View style={[styles.payPill, { backgroundColor: payBg[order.paymentStatus] || 'rgba(0,0,0,0.05)' }]}>
                <Text style={[styles.payLabel, { color: payColor[order.paymentStatus] || theme.textSecondary }]}>
                  {payLabel[order.paymentStatus]}
                </Text>
              </View>
            ) : null}
            <Text style={styles.total}>{formatCurrency(order.total)}</Text>
          </View>
        </View>

        {/* Actions Row with Sleek Circle Icons and Status Badge */}
        <View style={styles.actionsRow}>
          {/* Left Action: Quick Status Picker */}
          <TouchableOpacity
            onPress={onChangeStatus}
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_BG[order.status] || 'rgba(0,0,0,0.05)' }
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[order.status] || '#FFF' }]} />
            <Text style={[styles.statusText, { color: STATUS_COLORS[order.status] || theme.text }]}>
              {order.status}
            </Text>
          </TouchableOpacity>
          
          {/* Right Actions: Phone Call, Edit, More (Printer, Share, Delete) */}
          <View style={styles.rightActionsContainer}>
            <TouchableOpacity style={styles.circleActionButton} onPress={onCall}>
              <Feather name="phone" size={13} color={theme.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.circleActionButton} onPress={onEdit}>
              <Feather name="edit-2" size={13} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.circleActionButton} onPress={openMoreActions} disabled={isSharing}>
              <Feather name="more-horizontal" size={13} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* Dynamic Action Bottom Sheet Modal */}
      <Modal
        visible={showMoreActions}
        transparent
        animationType="fade"
        onRequestClose={closeMoreActions}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeMoreActions}>
          <Pressable style={styles.sheetCard} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Thao tác khác</Text>
            <Text style={styles.sheetSubtitle}>Phiếu {formatWorkOrderCode(order.id)}</Text>

            <TouchableOpacity style={styles.sheetAction} onPress={() => runMoreAction(onPrint)}>
              <MaterialCommunityIcons name="printer-outline" size={18} color={theme.textSecondary} />
              <Text style={styles.sheetActionText}>In hóa đơn</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetAction} onPress={() => runMoreAction(onShare)} disabled={isSharing}>
              <MaterialCommunityIcons name="share-variant-outline" size={18} color={theme.textSecondary} />
              <Text style={styles.sheetActionText}>{isSharing ? 'Đang tạo chia sẻ...' : 'Chia sẻ'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetAction} onPress={() => runMoreAction(onDelete)}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.danger} />
              <Text style={styles.sheetActionDanger}>Xóa phiếu sửa</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetCloseBtn} onPress={closeMoreActions}>
              <Text style={styles.sheetCloseText}>Đóng</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </Animated.View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  
  // Premium Segmented control
  segmentedContainer: {
    marginHorizontal: 12,
    marginTop: 12,
    backgroundColor: theme.surfaceVariant || theme.border + '30',
    borderRadius: 14,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 11,
  },
  segmentBtnActive: {
    backgroundColor: theme.surface,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  segmentTextActive: {
    color: theme.text,
    fontWeight: '700',
  },

  // Alt headers (history & template tabs)
  altTabHeaderBox: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    backgroundColor: theme.surface,
    padding: 12,
    marginBottom: 10,
  },
  altTabHeaderTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '800',
  },
  altTabHeaderSub: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 12,
  },
  altItemCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    gap: 4,
  },
  rowBetweenTight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  altItemTitle: {
    flex: 1,
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
  },
  altItemDate: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  altItemMeta: {
    color: theme.textSecondary,
    fontSize: 12,
  },
  altTabAction: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.primary,
    backgroundColor: theme.primaryBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  altTabActionText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  // Stats Row
  statsRow: {
    paddingHorizontal: 12,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  summaryCell: {
    flex: 1,
  },
  statCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 84,
    paddingHorizontal: 10,
  },
  statCardCompact: {
    width: '100%',
    minWidth: 0,
    borderRadius: 14,
    paddingVertical: 8,
  },
  statValue: { marginTop: 4, color: theme.text, fontSize: 16, fontWeight: '800' },
  statLabel: { marginTop: 2, color: theme.textSecondary, fontSize: 10 },

  // Finance Panel
  financeContainer: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    gap: 10,
    shadowColor: '#94A3B8',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  financeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financeHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
  },
  financeHeaderIcon: {
    padding: 4,
  },
  financeCardRow: {
    flexDirection: 'row',
    gap: 10,
  },
  financeItemCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  financeItemLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  financeItemValue: {
    fontSize: 15,
    fontWeight: '800',
  },

  // Sleek Integrated Search & Filters
  searchFilterRow: {
    paddingHorizontal: 12,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 10,
    height: 42,
  },
  searchFieldIcon: {
    marginRight: 8,
  },
  searchFieldInput: {
    flex: 1,
    fontSize: 13,
    color: theme.text,
    paddingVertical: 6,
  },
  searchClearBtn: {
    padding: 4,
  },
  filterIconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterIconBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterIconBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },

  quickFiltersRow: {
    paddingHorizontal: 12,
    paddingTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  quickChip: {
    flex: 1,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 999,
    paddingVertical: 7,
    alignItems: 'center',
  },
  quickChipActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryBg,
  },
  quickChipText: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  quickChipTextActive: {
    color: theme.primary,
  },

  filterBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.danger + '40',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  clearFilterText: {
    color: theme.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  filterSummaryRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  filterSummaryText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  listContent: { padding: 12, gap: 10, paddingBottom: 160 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 80 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 14, color: theme.textSecondary },
  errorHint: { fontSize: 12, color: theme.danger, paddingHorizontal: 16, textAlign: 'center' },

  // Wow-Factor Card
  card: {
    backgroundColor: theme.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 10,
    shadowColor: '#64748B',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text
  },
  inlineInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  vehicleModel: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '500'
  },
  codeBadge: {
    backgroundColor: theme.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeBadgeText: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  dateText: {
    color: theme.textSecondary,
    fontSize: 11
  },

  // Issue Box
  issueBox: {
    backgroundColor: theme.surfaceVariant || theme.border + '20',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
  },
  issueText: {
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 16
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: theme.border + '40',
    paddingBottom: 8,
  },
  techText: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: '600',
    maxWidth: 140,
  },
  payPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  payLabel: { fontSize: 10, fontWeight: '700' },
  total: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10B981'
  },

  // Card bottom action row with Circle Buttons
  actionsRow: {
    paddingTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  rightActionsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  circleActionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.surfaceVariant || theme.border + '25',
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Theme-compliant Dynamic Bottom Sheets
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 11, 19, 0.6)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  sheetCard: {
    backgroundColor: theme.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: theme.textSecondary + '40',
    marginBottom: 2,
  },
  sheetTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sheetSubtitle: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: -8,
  },
  filterSectionTitle: {
    marginTop: 6,
    color: theme.text,
    fontSize: 12,
    fontWeight: '800',
  },
  filterOptionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  filterOptionChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: theme.surfaceVariant || theme.border + '20',
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterOptionChipActive: {
    backgroundColor: theme.primary + '1C',
    borderColor: theme.primary + '80',
  },
  filterOptionText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  filterOptionTextActive: {
    color: theme.primary,
  },
  filterSheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  sheetSecondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.border + '40',
  },
  sheetSecondaryText: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  sheetPrimaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.primary,
  },
  sheetPrimaryText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: theme.surfaceVariant || theme.border + '20',
  },
  sheetActionText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
  },
  sheetActionDanger: {
    color: theme.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  sheetCloseBtn: {
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 11,
    backgroundColor: theme.border + '60',
  },
  sheetCloseText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
  },
  pressableDown: {
    transform: [{ scale: 0.98 }],
    opacity: 0.94,
  },
  fab: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    borderWidth: 1,
    borderColor: theme.primary,
    shadowColor: theme.primary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fabText: {
    color: '#F5FAFF',
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '500',
  },
});
