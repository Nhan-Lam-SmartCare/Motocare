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
  useWindowDimensions,
  Animated,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../shared/supabaseClient';
import { formatWorkOrderCode } from '../../shared/workOrderCode';
import { printWorkOrderReceipt, shareWorkOrderReceipt } from '../../shared/workOrderReceipt';
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

const STATUS_ORDER = ['Tiếp nhận', 'Đang sửa', 'Đã sửa xong', 'Trả máy', 'Đã hủy'];
const PAYMENT_ORDER: PaymentFilter[] = ['all', 'unpaid', 'partial', 'paid'];

const STATUS_COLORS: Record<string, string> = {
  'Tiếp nhận': '#5AB0FF',
  'Đang sửa': '#E37D3F',
  'Đã sửa xong': '#67F0A1',
  'Trả máy': '#B08AFF',
  'Đã hủy': '#FF5C6C',
};

const STATUS_BG: Record<string, string> = {
  'Tiếp nhận': 'rgba(90,176,255,0.16)',
  'Đang sửa': 'rgba(227,125,63,0.16)',
  'Đã sửa xong': 'rgba(103,240,161,0.16)',
  'Trả máy': 'rgba(176,138,255,0.16)',
  'Đã hủy': 'rgba(255,92,108,0.16)',
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
  '7d': '7 ngày',
  '30d': '30 ngày',
};

const SORT_LABEL: Record<SortBy, string> = {
  date_desc: 'Mới nhất',
  date_asc: 'Cũ nhất',
  total_desc: 'Tổng tiền giảm dần',
  total_asc: 'Tổng tiền tăng dần',
};

const normalizeWorkOrder = (row: any): WorkOrder => ({
  id: row.id,
  creationDate: row.creationDate || row.creationdate || row.created_at || new Date().toISOString(),
  customerName: row.customerName || row.customername || 'Khach le',
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
  partsUsed: row.partsUsed || row.partsused || [],
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

const pickDateFilterStart = (filter: DateFilter): Date | null => {
  const now = new Date();
  if (filter === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (filter === '7d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (filter === '30d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }
  return null;
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
  const [activeTab, setActiveTab] = useState<WorkOrdersTab>('orders');

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
      // If the last page has less than the page size, it means no more pages.
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

  const openStatusPicker = () => {
    Alert.alert('Lọc trạng thái', 'Chọn trạng thái phiếu sửa', [
      {
        text: 'Tất cả',
        onPress: () => setFilterStatus(null),
      },
      ...STATUS_ORDER.map((status) => ({
        text: status,
        onPress: () => setFilterStatus(status),
      })),
      { text: 'Đóng', style: 'cancel' },
    ]);
  };

  const openPaymentPicker = () => {
    Alert.alert('Lọc thanh toán', 'Chọn trạng thái thanh toán', [
      ...PAYMENT_ORDER.map((key) => ({
        text: PAYMENT_LABEL[key],
        onPress: () => setPaymentFilter(key),
      })),
      { text: 'Đóng', style: 'cancel' },
    ]);
  };

  const openTechnicianPicker = () => {
    Alert.alert('Lọc kỹ thuật viên', 'Chọn kỹ thuật viên phụ trách', [
      ...technicians.map((tech) => ({
        text: tech === 'all' ? 'Tất cả KTV' : tech,
        onPress: () => setTechnicianFilter(tech),
      })),
      { text: 'Đóng', style: 'cancel' },
    ]);
  };

  const openSortPicker = () => {
    const sortOptions: SortBy[] = ['date_desc', 'date_asc', 'total_desc', 'total_asc'];
    Alert.alert('Sắp xếp', 'Chọn cách sắp xếp danh sách', [
      ...sortOptions.map((key) => ({
        text: SORT_LABEL[key],
        onPress: () => setSortBy(key),
      })),
      { text: 'Đóng', style: 'cancel' },
    ]);
  };

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
    try {
      await printWorkOrderReceipt(order as any);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể in phiếu sửa từ mobile.');
    }
  };

  const handleShareOrder = async (order: WorkOrder) => {
    try {
      await shareWorkOrderReceipt(order as any);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể chia sẻ phiếu sửa.');
    }
  };

  const historyActionLabel = (action: string) => {
    if (action.includes('create')) return 'Tạo phiếu';
    if (action.includes('status_update')) return 'Cập nhật trạng thái';
    if (action.includes('delete')) return 'Xóa phiếu';
    if (action.includes('update')) return 'Cập nhật phiếu';
    return action || 'Hoạt động';
  };

  const filtered = useMemo(() => {
    const start = pickDateFilterStart(dateFilter);

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
      const matchDate = !start || new Date(o.creationDate) >= start;

      return matchSearch && matchStatus && matchPayment && matchTechnician && matchDate;
    });

    result.sort((a, b) => {
      if (sortBy === 'date_desc') return +new Date(b.creationDate) - +new Date(a.creationDate);
      if (sortBy === 'date_asc') return +new Date(a.creationDate) - +new Date(b.creationDate);
      if (sortBy === 'total_desc') return (Number(b.total) || 0) - (Number(a.total) || 0);
      return (Number(a.total) || 0) - (Number(b.total) || 0);
    });

    return result;
  }, [orders, search, filterStatus, paymentFilter, technicianFilter, dateFilter, sortBy]);

  const stats = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = orders.filter((o) => o.status === status).length;
    return acc;
  }, {} as Record<string, number>);

  const finance7d = useMemo(() => {
    const start = pickDateFilterStart('7d') ?? new Date(0);
    const recent = orders.filter((o) => new Date(o.creationDate) >= start);

    const revenue = recent.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const cost = recent.reduce((sum, o) => {
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
  }, [orders]);

  const dateQuickChips: Array<{ key: DateFilter; label: string }> = [
    { key: 'today', label: 'Hôm nay' },
    { key: '7d', label: '7 ngày' },
    { key: '30d', label: 'Tháng' },
    { key: 'all', label: 'Tất cả' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.tabRow, compact && { gap: 6 }]}>
        <Pressable
          style={({ pressed }) => [styles.tabBtn, activeTab === 'orders' && styles.tabBtnActive, pressed && styles.pressableDown]}
          onPress={() => setActiveTab('orders')}
        >
          <View style={[styles.tabIconWrap, activeTab === 'orders' && styles.tabIconWrapActive]}>
            <MaterialCommunityIcons name="file-document-multiple-outline" size={14} color={activeTab === 'orders' ? '#2B83FF' : '#8EA1C1'} />
          </View>
          <Text style={[styles.tabBtnText, activeTab === 'orders' && styles.tabBtnTextActive]}>Phiếu sửa</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.tabBtn, activeTab === 'history' && styles.tabBtnActive, pressed && styles.pressableDown]}
          onPress={() => setActiveTab('history')}
        >
          <View style={[styles.tabIconWrap, activeTab === 'history' && styles.tabIconWrapActive]}>
            <MaterialCommunityIcons name="history" size={14} color={activeTab === 'history' ? '#2B83FF' : '#8EA1C1'} />
          </View>
          <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>Lịch sử</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.tabBtn, activeTab === 'templates' && styles.tabBtnActive, pressed && styles.pressableDown]}
          onPress={() => setActiveTab('templates')}
        >
          <View style={[styles.tabIconWrap, activeTab === 'templates' && styles.tabIconWrapActive]}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={14} color={activeTab === 'templates' ? '#2B83FF' : '#8EA1C1'} />
          </View>
          <Text style={[styles.tabBtnText, activeTab === 'templates' && styles.tabBtnTextActive]}>Mẫu</Text>
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
                <MaterialCommunityIcons name="alert-circle-outline" size={34} color="#6F86AA" />
                <Text style={styles.emptyText}>Không tải được lịch sử phiếu sửa</Text>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="history" size={34} color="#6F86AA" />
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
                <MaterialCommunityIcons name="clipboard-text-outline" size={34} color="#6F86AA" />
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
      <View style={styles.statsRow}>
        <StatCard icon="file-document-outline" label="Tiếp nhận" value={stats['Tiếp nhận'] ?? 0} color={STATUS_COLORS['Tiếp nhận']} />
        <StatCard icon="wrench-outline" label="Đang sửa" value={stats['Đang sửa'] ?? 0} color={STATUS_COLORS['Đang sửa']} />
        <StatCard icon="check-circle-outline" label="Đã sửa" value={stats['Đã sửa xong'] ?? 0} color={STATUS_COLORS['Đã sửa xong']} />
        <StatCard icon="motorbike" label="Trả máy" value={stats['Trả máy'] ?? 0} color={STATUS_COLORS['Trả máy']} />
      </View>

      <View style={styles.financeRow}>
        <FinanceCard
          label="Doanh thu 7 ngày qua"
          value={finance7d.revenue}
          hidden={hideFinance}
          onToggle={() => setHideFinance((v) => !v)}
        />
        <FinanceCard
          label="Lợi nhuận 7 ngày qua"
          value={finance7d.profit}
          hidden={hideFinance}
          onToggle={() => setHideFinance((v) => !v)}
        />
      </View>

      <View style={styles.searchRow}>
        <Feather name="search" size={16} color="#8290A8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm tên, SDT, biển số, dòng xe..."
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controlRow}>
        <Pressable style={({ pressed }) => [styles.controlChip, pressed && styles.pressableDown]} onPress={openStatusPicker}>
          <MaterialCommunityIcons name="progress-wrench" size={14} color="#A9B7D0" />
          <Text style={styles.controlChipText}>{filterStatus ?? 'Tất cả trạng thái'}</Text>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.controlChip, pressed && styles.pressableDown]} onPress={openPaymentPicker}>
          <MaterialCommunityIcons name="cash-multiple" size={14} color="#A9B7D0" />
          <Text style={styles.controlChipText}>{PAYMENT_LABEL[paymentFilter]}</Text>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.controlChip, pressed && styles.pressableDown]} onPress={openTechnicianPicker}>
          <MaterialCommunityIcons name="account-hard-hat" size={14} color="#A9B7D0" />
          <Text style={styles.controlChipText}>
            {technicianFilter === 'all' ? 'Tất cả KTV' : technicianFilter}
          </Text>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.controlChip, pressed && styles.pressableDown]} onPress={openSortPicker}>
          <MaterialCommunityIcons name="sort" size={14} color="#A9B7D0" />
          <Text style={styles.controlChipText}>{SORT_LABEL[sortBy]}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.controlChip, pressed && styles.pressableDown]}
          onPress={() => {
            setFilterStatus(null);
            setPaymentFilter('all');
            setTechnicianFilter('all');
            setSortBy('date_desc');
            setDateFilter('all');
          }}
        >
          <MaterialCommunityIcons name="filter-remove-outline" size={14} color="#FF9BA8" />
          <Text style={[styles.controlChipText, { color: '#FFB1BB' }]}>Xóa lọc</Text>
        </Pressable>
      </ScrollView>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
        </View>
      ) : isError ? (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={34} color="#6F86AA" />
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
              <MaterialCommunityIcons name="text-box-search-outline" size={34} color="#6F86AA" />
              <Text style={styles.emptyText}>Không có phiếu sửa theo bộ lọc</Text>
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

      <Pressable style={({ pressed }) => [styles.fab, pressed && styles.pressableDown]} onPress={() => router.push('/(tabs)/workorder-create')}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
      </>
      )}
    </View>
  );
}

function FinanceCard({
  label,
  value,
  hidden,
  onToggle,
}: {
  label: string;
  value: number;
  hidden: boolean;
  onToggle: () => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <View style={styles.financeCard}>
      <View style={styles.financeTopRow}>
        <Text style={styles.financeLabel}>{label}</Text>
        <TouchableOpacity onPress={onToggle}>
          <Feather name={hidden ? 'eye-off' : 'eye'} size={14} color="#8FA2C3" />
        </TouchableOpacity>
      </View>
      <Text style={styles.financeValue}>{hidden ? '••••••••' : formatCurrency(value)}</Text>
    </View>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; value: number; color: string }) {
  const theme = useAppTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <View style={styles.statCard}>
      <MaterialCommunityIcons name={icon} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function WorkOrderCard({
  order,
  onOpenDetail,
  onChangeStatus,
  onCall,
  onPrint,
  onShare,
  onEdit,
  onDelete,
}: {
  order: WorkOrder;
  onOpenDetail: () => void;
  onChangeStatus: () => void;
  onCall: () => void;
  onPrint: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const scale = useRef(new Animated.Value(1)).current;

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

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.96}
      onPress={onOpenDetail}
      onPressIn={() => runSpring(0.985)}
      onPressOut={() => runSpring(1)}
    >
      <View style={styles.cardTopRow}>
        <Text style={styles.codeText}>{formatWorkOrderCode(order.id)}</Text>
        <Text style={styles.dateText}>{formatDate(order.creationDate)}</Text>
      </View>

      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.customerName}>{order.customerName}</Text>
          <View style={styles.inlineInfoRow}>
            <MaterialCommunityIcons name="motorbike" size={14} color="#9FAECC" />
            <Text style={styles.vehicleInfo}>{order.vehicleModel || 'Xe máy'}</Text>
          </View>
          <Text style={styles.vehicleInfo}>{order.licensePlate || 'Chưa có biển số'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <TouchableOpacity
            onPress={onChangeStatus}
            style={[styles.statusBadge, { backgroundColor: theme.primary === '#3B82F6' ? (STATUS_BG[order.status] + '33') : (STATUS_BG[order.status] || '#EEF2F8') }]}
          >
            <Text style={[styles.statusText, { color: STATUS_COLORS[order.status] || '#D2DBEC' }]}>
              {order.status}
            </Text>
          </TouchableOpacity>
          <Text style={styles.phoneText}>{order.customerPhone || '-'}</Text>
        </View>
      </View>

      {order.issueDescription ? (
        <View style={styles.inlineInfoRow}>
          <MaterialCommunityIcons name="text-box-outline" size={14} color="#A9B7D0" />
          <Text style={styles.issue} numberOfLines={2}>{order.issueDescription}</Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.date}>KTV: {order.technicianName || 'Chưa gán'}</Text>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {order.paymentStatus ? (
            <View style={styles.payPill}>
              <Text style={[styles.payLabel, { color: payColor[order.paymentStatus] || '#555' }]}>
                {payLabel[order.paymentStatus]}
              </Text>
            </View>
          ) : null}
          <Text style={styles.total}>{formatCurrency(order.total)}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <ActionItem icon="phone-outline" label="Gọi" onPress={onCall} />
        <ActionItem icon="printer-outline" label="In" onPress={onPrint} />
        <ActionItem icon="share-variant-outline" label="Chia sẻ" onPress={onShare} />
        <ActionItem icon="square-edit-outline" label="Sửa" onPress={onEdit} />
        <ActionItem icon="trash-can-outline" label="Xóa" onPress={onDelete} danger />
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
}

function ActionItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <TouchableOpacity style={styles.actionItem} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={15} color={danger ? '#FF6A7B' : '#B8C3DA'} />
      <Text style={[styles.actionBtn, danger && { color: theme.danger }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  tabRow: {
    paddingHorizontal: 12,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 999,
    backgroundColor: theme.surface,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  tabBtnActive: {
    borderColor: theme.border,
    backgroundColor: theme.primaryBg,
  },
  tabIconWrap: {
    minWidth: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
  },
  tabIconWrapActive: {
    backgroundColor: theme.primaryBg,
  },
  tabBtnText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: theme.primary,
  },
  altTabBox: {
    marginHorizontal: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    backgroundColor: theme.surface,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  altTabAction: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2B83FF',
    backgroundColor: theme.primaryBg,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  altTabActionText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '700',
  },
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
  statsRow: {
    paddingHorizontal: 12,
    paddingTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: '#94A3B8',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statValue: { marginTop: 4, color: theme.text, fontSize: 16, fontWeight: '800' },
  statLabel: { marginTop: 2, color: theme.textSecondary, fontSize: 10 },
  financeRow: {
    paddingHorizontal: 12,
    paddingTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  financeCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  financeTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  financeLabel: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  financeValue: {
    marginTop: 10,
    color: theme.text,
    fontSize: 14,
    fontWeight: '800',
  },
  searchRow: { padding: 12, paddingBottom: 2, position: 'relative' },
  searchIcon: { position: 'absolute', left: 26, top: 23, zIndex: 1 },
  searchInput: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    paddingHorizontal: 38,
    paddingVertical: 11,
    fontSize: 13,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
  },
  quickFiltersRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  quickChip: {
    flex: 1,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
  },
  quickChipActive: {
    borderColor: theme.border,
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
  controlRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  controlChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  controlChipText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipList: { paddingVertical: 10, maxHeight: 52 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: theme.textSecondary },
  listContent: { padding: 12, gap: 12, paddingBottom: 90 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 80 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 14, color: theme.textSecondary },
  errorHint: { fontSize: 12, color: '#F9A8B5', paddingHorizontal: 16, textAlign: 'center' },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 8,
    shadowColor: '#94A3B8',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeText: { color: theme.primary, fontSize: 12, fontWeight: '700' },
  dateText: { color: theme.textSecondary, fontSize: 11 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  customerName: { fontSize: 15, fontWeight: '800', color: theme.text },
  inlineInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  vehicleInfo: { fontSize: 12, color: theme.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  phoneText: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
  issue: { fontSize: 12, color: theme.textSecondary, lineHeight: 16, flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 11, color: theme.textSecondary },
  payPill: {
    borderRadius: 6,
    backgroundColor: theme.primary === '#3B82F6' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  payLabel: { fontSize: 11, fontWeight: '700' },
  total: { fontSize: 14, fontWeight: '800', color: theme.primary === '#3B82F6' ? '#34D399' : '#10B981' },
  actionsRow: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
  },
  actionBtn: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  pressableDown: {
    transform: [{ scale: 0.98 }],
    opacity: 0.94,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    borderWidth: 1,
    borderColor: theme.primary,
    shadowColor: theme.primary === '#3B82F6' ? '#000' : theme.textSecondary,
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: {
    color: '#F5FAFF',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '500',
  },
});
