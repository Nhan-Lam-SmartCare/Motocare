import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../shared/supabaseClient';
import { formatWorkOrderCode } from '../../../shared/workOrderCode';
import WorkOrderPreviewModal from '../../../shared/WorkOrderPreviewModal';
import { formatCurrency, formatDate } from '../../../constants';
import type { WorkOrder } from '../../../shared/types';

type TimelineItem = {
  id: string;
  time: string;
  title: string;
  detail?: string;
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

const normalizeOrderDetail = (row: any): (WorkOrder & { created_at?: string; updated_at?: string; additionalServices?: any[] }) => ({
  ...row,
  creationDate: row.creationDate || row.creationdate || row.created_at || new Date().toISOString(),
  customerName: row.customerName || row.customername || 'Khách lẻ',
  customerPhone: row.customerPhone || row.customerphone || '',
  vehicleModel: row.vehicleModel || row.vehiclemodel || '',
  licensePlate: row.licensePlate || row.licenseplate || '',
  issueDescription: row.issueDescription || row.issuedescription || '',
  technicianName: row.technicianName || row.technicianname || '',
  laborCost: Number(row.laborCost ?? row.laborcost ?? 0),
  discount: Number(row.discount ?? 0),
  total: Number(row.total ?? 0),
  totalPaid: Number(row.totalPaid ?? row.totalpaid ?? 0),
  remainingAmount: Number(row.remainingAmount ?? row.remainingamount ?? 0),
  paymentStatus: row.paymentStatus || row.paymentstatus || 'unpaid',
  paymentMethod: row.paymentMethod || row.paymentmethod || 'cash',
  partsUsed: pickArray(row, ['partsUsed', 'partsused', 'parts_used']),
  additionalServices: pickArray(row, ['additionalServices', 'additionalservices', 'additional_services']),
});

const updateWorkOrderItems = async ({ id, partsUsed, additionalServices, total }: { id: string, partsUsed: any[], additionalServices: any[], total: number }) => {
  const { data, error } = await supabase
    .from('work_orders')
    .update({ partsused: partsUsed, additionalservices: additionalServices, total })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

const fetchWorkOrderDetail = async (id: string) => {
  const { data, error } = await supabase
    .from('work_orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return normalizeOrderDetail(data);
};

const fetchTimeline = async (id: string): Promise<TimelineItem[]> => {
  const items: TimelineItem[] = [];

  const { data: order } = await supabase
    .from('work_orders')
    .select('id, creationDate, status, updated_at')
    .eq('id', id)
    .single();

  if (order?.creationDate) {
    items.push({
      id: `created-${id}`,
      time: order.creationDate,
      title: 'Tạo phiếu',
      detail: `Trạng thái ban đầu: ${order.status || 'Tiếp nhận'}`,
    });
  }

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('id, action, old_data, new_data, created_at')
    .eq('table_name', 'work_orders')
    .eq('record_id', id)
    .order('created_at', { ascending: false })
    .limit(100);

  (logs ?? []).forEach((log: any) => {
    const oldStatus = log?.old_data?.status;
    const newStatus = log?.new_data?.status;

    if (oldStatus && newStatus && oldStatus !== newStatus) {
      items.push({
        id: `status-${log.id}`,
        time: log.created_at,
        title: 'Đổi trạng thái',
        detail: `${oldStatus} -> ${newStatus}`,
      });
    } else {
      items.push({
        id: `log-${log.id}`,
        time: log.created_at,
        title: (log?.action || 'Cập nhật').replaceAll('_', ' '),
        detail: newStatus ? `Trạng thái: ${newStatus}` : undefined,
      });
    }
  });

  if (items.length === 0 && order?.updated_at) {
    items.push({
      id: `updated-${id}`,
      time: order.updated_at,
      title: 'Cập nhật gần nhất',
    });
  }

  return items.sort((a, b) => +new Date(b.time) - +new Date(a.time));
};

export default function WorkOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const goToWorkorders = () => router.replace('/(tabs)/workorders');

  const [showPartModal, setShowPartModal] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [newPartPrice, setNewPartPrice] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const orderQuery = useQuery({
    queryKey: ['workorder-detail', id],
    queryFn: () => fetchWorkOrderDetail(String(id)),
    enabled: Boolean(id),
  });

  const timelineQuery = useQuery({
    queryKey: ['workorder-timeline', id],
    queryFn: () => fetchTimeline(String(id)),
    enabled: Boolean(id),
    refetchInterval: 30000,
  });

  const { data: storeSettingsForReceipt } = useQuery({
    queryKey: ['store-settings-mobile-receipt'],
    queryFn: fetchStoreSettingsForReceipt,
    staleTime: 1000 * 60 * 10,
  });

  const updateMutation = useMutation({
    mutationFn: updateWorkOrderItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workorders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-live'] });
      queryClient.invalidateQueries({ queryKey: ['workorder-detail', id] });
    },
    onError: (err: any) => {
      Alert.alert('Lỗi', err.message);
    }
  });

  const order = orderQuery.data;
  
  const isEditable = order && order.paymentStatus !== 'paid' && order.status !== 'Trả máy' && order.status !== 'Đã hủy';

  const handleRemovePart = (index: number) => {
    if (!order) return;
    const parts = [...(order.partsUsed || [])];
    parts.splice(index, 1);
    
    const labor = order.laborCost || 0;
    const discount = order.discount || 0;
    const partsTotal = parts.reduce((sum: number, p: any) => sum + (p.price * p.quantity), 0);
    const servicesTotal = (order.additionalServices || []).reduce((sum: number, s: any) => sum + (s.price * s.quantity), 0);
    const total = labor + partsTotal + servicesTotal - discount;

    updateMutation.mutate({ id: order.id, partsUsed: parts, additionalServices: order.additionalServices || [], total });
  };
  
  const handleRemoveService = (index: number) => {
    if (!order) return;
    const services = [...(order.additionalServices || [])];
    services.splice(index, 1);
    
    const labor = order.laborCost || 0;
    const discount = order.discount || 0;
    const partsTotal = (order.partsUsed || []).reduce((sum: number, p: any) => sum + (p.price * p.quantity), 0);
    const servicesTotal = services.reduce((sum: number, s: any) => sum + (s.price * s.quantity), 0);
    const total = labor + partsTotal + servicesTotal - discount;

    updateMutation.mutate({ id: order.id, partsUsed: order.partsUsed || [], additionalServices: services, total });
  };

  const handleAddPartService = () => {
    if (!order) return;
    if (!newPartName || !newPartPrice) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên và giá');
      return;
    }
    
    const isService = newPartName.toLowerCase().includes('dịch vụ') || newPartName.toLowerCase().includes('công');
    
    const parts = [...(order.partsUsed || [])];
    const services = [...(order.additionalServices || [])];
    
    if (isService) {
      services.push({
        id: 'sv-' + Date.now(),
        description: newPartName,
        quantity: 1,
        price: Number(newPartPrice.replace(/,/g, '')),
        costPrice: 0
      });
    } else {
      parts.push({
        partId: 'custom-' + Date.now(),
        partName: newPartName,
        sku: '',
        quantity: 1,
        price: Number(newPartPrice.replace(/,/g, '')),
        costPrice: 0
      });
    }

    const labor = order.laborCost || 0;
    const discount = order.discount || 0;
    const partsTotal = parts.reduce((sum: number, p: any) => sum + (p.price * p.quantity), 0);
    const servicesTotal = services.reduce((sum: number, s: any) => sum + (s.price * s.quantity), 0);
    const total = labor + partsTotal + servicesTotal - discount;

    updateMutation.mutate({ id: order.id, partsUsed: parts, additionalServices: services, total }, {
      onSuccess: () => {
        setShowPartModal(false);
        setNewPartName('');
        setNewPartPrice('');
      }
    });
  };

  const paymentLabel = useMemo(() => {
    const status = order?.paymentStatus || 'unpaid';
    if (status === 'paid') return 'Đã thanh toán';
    if (status === 'partial') return 'Thanh toán một phần';
    return 'Chưa thanh toán';
  }, [order?.paymentStatus]);

  const statusTheme = useMemo(() => {
    switch (order?.status) {
      case 'Tiếp nhận':
        return { bg: '#E7F1FF', border: '#BFDBFE', text: '#1D4ED8' };
      case 'Đang sửa':
        return { bg: '#FFF4E6', border: '#FED7AA', text: '#C2410C' };
      case 'Đã sửa xong':
        return { bg: '#EAFBF1', border: '#BBF7D0', text: '#15803D' };
      case 'Trả máy':
        return { bg: '#F3E8FF', border: '#DDD6FE', text: '#7E22CE' };
      case 'Đã hủy':
        return { bg: '#FEE2E2', border: '#FECACA', text: '#B91C1C' };
      default:
        return { bg: '#EEF2F7', border: '#D5DFEC', text: '#475569' };
    }
  }, [order?.status]);

  const partsTotal = useMemo(
    () => (order?.partsUsed || []).reduce((sum: number, p: any) => sum + (Number(p.price || 0) * Number(p.quantity || 0)), 0),
    [order?.partsUsed]
  );
  const servicesTotal = useMemo(
    () => (order?.additionalServices || []).reduce((sum: number, s: any) => sum + (Number(s.price || 0) * Number(s.quantity || 1)), 0),
    [order?.additionalServices]
  );

  const handlePrint = async () => {
    if (!order) return;
    setShowPreview(true);
  };

  const handleShare = async () => {
    if (!order) return;
    setShowPreview(true);
  };

  if (orderQuery.isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#5AB0FF" />
      </View>
    );
  }

  if (orderQuery.isError || !order) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.errorText}>Không tải được chi tiết phiếu sửa</Text>
        <TouchableOpacity style={styles.backBtn} onPress={goToWorkorders}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.closeBtn} onPress={goToWorkorders}>
          <Feather name="x" size={20} color="#A6B2C8" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Chi tiết phiếu</Text>
          <Text style={styles.subCode}>#{formatWorkOrderCode(order.id)}</Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/workorder-edit/[id]',
              params: { id: order.id },
            })
          }
        >
          <MaterialCommunityIcons name="square-edit-outline" size={16} color="#EAF3FF" />
          <Text style={styles.editBtnText}>Sửa phiếu</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusTopRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusTheme.bg, borderColor: statusTheme.border }]}>
            <Text style={[styles.statusBadgeText, { color: statusTheme.text }]}>{order.status}</Text>
          </View>
          <Text style={styles.dateText}>{new Date(order.creationDate).toLocaleString('vi-VN')}</Text>
        </View>
        <View style={styles.inlineRow}>
          <Feather name="user" size={13} color="#9CB0CE" />
          <Text style={styles.metaText}>KTV: {order.technicianName || 'Chưa gán'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <SectionTitle icon="account-outline" title="KHÁCH HÀNG" />
        <View style={styles.customerTopRow}>
          <Text style={styles.customerName}>{order.customerName || '-'}</Text>
          <Text style={styles.customerPhone}>{order.customerPhone || '-'}</Text>
        </View>
        <Text style={styles.vehicleText}>{order.vehicleModel || '-'} • {order.licensePlate || '-'}</Text>
        <Text style={styles.kmText}>Số km hiện tại: {order.currentKm || 0} km</Text>
      </View>

      <View style={styles.card}>
        <SectionTitle icon="file-document-outline" title="MÔ TẢ VẤN ĐỀ" />
        <Text style={styles.issueText}>{order.issueDescription || 'Không có mô tả'}</Text>
      </View>

      <View style={styles.card}>
        <SectionTitle icon="cube-outline" title={`PHỤ TÙNG (${(order.partsUsed || []).length})`} />
        {(order.partsUsed || []).map((p: any, i: number) => (
          <View key={i} style={styles.lineItemCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lineTitle}>{p.partName || p.description}</Text>
              <Text style={styles.lineSub}>SL: {p.quantity || 1} {p.sku ? `• ${p.sku}` : ''}</Text>
            </View>
            <View style={styles.lineAmountBox}>
              <Text style={styles.lineAmount}>{formatCurrency((Number(p.price || 0) * Number(p.quantity || 1)))}</Text>
              <Text style={styles.lineSub}>{formatCurrency(Number(p.price || 0))}/cái</Text>
            </View>
            {isEditable && (
              <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemovePart(i)}>
                <MaterialCommunityIcons name="trash-can-outline" size={14} color="#FF6B6B" />
                <Text style={styles.removeText}>Xóa</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {(order.partsUsed || []).length === 0 ? <Text style={styles.emptyText}>Chưa có phụ tùng</Text> : null}
      </View>

      <View style={styles.card}>
        <SectionTitle icon="wrench-outline" title={`DỊCH VỤ (${(order.additionalServices || []).length})`} />
        {(order.additionalServices || []).map((s: any, i: number) => (
          <View key={i + 1000} style={styles.lineItemCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lineTitle}>{s.description || s.id}</Text>
              <Text style={styles.lineSub}>SL: {s.quantity || 1}</Text>
            </View>
            <View style={styles.lineAmountBox}>
              <Text style={styles.lineAmount}>{formatCurrency((Number(s.price || 0) * Number(s.quantity || 1)))}</Text>
            </View>
            {isEditable && (
              <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveService(i)}>
                <MaterialCommunityIcons name="trash-can-outline" size={14} color="#FF6B6B" />
                <Text style={styles.removeText}>Xóa</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {(order.additionalServices || []).length === 0 ? <Text style={styles.emptyText}>Chưa có dịch vụ</Text> : null}
        {isEditable && (
           <TouchableOpacity style={styles.addLineBtn} onPress={() => setShowPartModal(true)}>
              {updateMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.inlineRowCenter}>
                  <Feather name="plus" size={14} color="#8DE3AF" />
                  <Text style={styles.addLineText}>Thêm phụ tùng/dịch vụ</Text>
                </View>
              )}
           </TouchableOpacity>
        )}

        <Modal visible={showPartModal} transparent animationType="slide">
           <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: 20 }}>
              <View style={{ backgroundColor: '#161A22', padding: 20, borderRadius: 10, borderWidth: 1, borderColor: '#2A3E62' }}>
                 <Text style={{ color: '#fff', fontSize: 15, marginBottom: 10, fontWeight: '700' }}>Thêm phụ tùng/dịch vụ</Text>
                 <TextInput style={{ backgroundColor: '#0E213F', color: '#fff', padding: 10, borderRadius: 5, marginBottom: 10, fontSize: 13 }} placeholderTextColor="#666" placeholder="Tên (có chữ 'dịch vụ'/'công' sẽ vào dịch vụ)" value={newPartName} onChangeText={setNewPartName} />
                 <TextInput style={{ backgroundColor: '#0E213F', color: '#fff', padding: 10, borderRadius: 5, marginBottom: 20 }} placeholderTextColor="#666" placeholder="Giá" keyboardType="numeric" value={newPartPrice} onChangeText={setNewPartPrice} />
                 <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <TouchableOpacity onPress={() => setShowPartModal(false)} style={{ padding: 10 }}><Text style={{ color: '#ccc' }}>Hủy</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handleAddPartService} style={{ padding: 10, backgroundColor: '#1A5ED1', borderRadius: 5 }}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Lưu</Text></TouchableOpacity>
                 </View>
              </View>
           </View>
        </Modal>
      </View>

      <View style={styles.card}>
        <SectionTitle icon="cash-multiple" title="TỔNG TIỀN & THANH TOÁN" />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tổng phụ tùng</Text>
          <Text style={styles.summaryValue}>{formatCurrency(partsTotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tổng dịch vụ</Text>
          <Text style={styles.summaryValue}>{formatCurrency(servicesTotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tiền công</Text>
          <Text style={styles.summaryValue}>{formatCurrency(order.laborCost || 0)}</Text>
        </View>
        {!!Number(order.discount || 0) && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: '#DC2626' }]}>Giảm giá</Text>
            <Text style={[styles.summaryValue, { color: '#DC2626' }]}>-{formatCurrency(order.discount || 0)}</Text>
          </View>
        )}
        <View style={styles.summaryTotalRow}>
          <Text style={styles.summaryTotalLabel}>TỔNG CỘNG</Text>
          <Text style={styles.summaryTotalValue}>{formatCurrency(order.total || 0)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Trạng thái thanh toán</Text>
          <Text style={styles.summaryValue}>{paymentLabel}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Đã thu</Text>
          <Text style={[styles.summaryValue, { color: '#15803D' }]}>{formatCurrency(order.totalPaid || 0)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Còn lại</Text>
          <Text style={[styles.summaryValue, { color: '#B91C1C' }]}>{formatCurrency(order.remainingAmount || 0)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Hình thức</Text>
          <Text style={styles.summaryValue}>{order.paymentMethod === 'bank' ? 'Chuyển khoản' : 'Tiền mặt'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <SectionTitle icon="share-variant" title="IN & CHIA SẺ" />
        <View style={styles.receiptActionRow}>
          <TouchableOpacity style={styles.receiptActionBtn} onPress={handlePrint}>
            <MaterialCommunityIcons name="printer-outline" size={16} color="#AFC2E1" />
            <Text style={styles.receiptActionText}>In phiếu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.receiptActionBtn} onPress={handleShare}>
            <Feather name="share-2" size={15} color="#AFC2E1" />
            <Text style={styles.receiptActionText}>Chia sẻ</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={goToWorkorders}>
        <Text style={styles.backBtnText}>Quay lại danh sách</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.editMainBtn}
        onPress={() =>
          router.push({
            pathname: '/(tabs)/workorder-edit/[id]',
            params: { id: order.id },
          })
        }
      >
        <View style={styles.inlineRowCenter}>
          <MaterialCommunityIcons name="square-edit-outline" size={16} color="#F4F8FF" />
          <Text style={styles.backBtnText}>Chỉnh sửa phiếu</Text>
        </View>
      </TouchableOpacity>

      <WorkOrderPreviewModal
        visible={showPreview}
        order={order as any}
        storeSettings={(storeSettingsForReceipt || null) as any}
        onClose={() => setShowPreview(false)}
      />
    </ScrollView>
  );
}

function SectionTitle({ icon, title }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons name={icon} size={16} color="#4EA7FF" />
      <Text style={styles.section}>{title}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6FB' },
  content: { padding: 12, gap: 10, paddingBottom: 26 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F6FB', gap: 10 },
  errorText: { color: '#FFC8D0', fontWeight: '700' },
  topBar: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE5F1',
    backgroundColor: '#FFFFFF',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#0F172A', fontSize: 17, fontWeight: '800' },
  subCode: { color: '#2563EB', fontSize: 12, marginTop: 2, fontWeight: '700' },
  editBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBtnText: { color: '#EAF3FF', fontWeight: '700', fontSize: 13 },
  statusCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE5F1',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 8,
  },
  statusTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  dateText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineRowCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#334155', fontSize: 13, fontWeight: '600' },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE5F1',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 10,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: { color: '#1D4ED8', fontSize: 13, fontWeight: '800' },
  detailRow: { gap: 3 },
  detailLabel: { color: '#64748B', fontSize: 11 },
  detailValue: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
  customerTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  customerName: { color: '#0F172A', fontSize: 15, fontWeight: '700', flex: 1 },
  customerPhone: { color: '#2563EB', fontSize: 13, fontWeight: '600' },
  vehicleText: { color: '#334155', fontSize: 13, fontWeight: '600' },
  kmText: { color: '#64748B', fontSize: 12 },
  issueText: { color: '#334155', fontSize: 13, lineHeight: 20 },
  lineItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 10,
    marginBottom: 6,
    gap: 8,
  },
  lineTitle: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
  lineSub: { color: '#64748B', fontSize: 11 },
  lineAmountBox: { alignItems: 'flex-end' },
  lineAmount: { color: '#0F172A', fontSize: 13, fontWeight: '800' },
  emptyText: { color: '#64748B', fontSize: 12, fontStyle: 'italic' },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeText: { color: '#FF6B6B', fontWeight: '700', fontSize: 12 },
  receiptActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  receiptActionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  receiptActionText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  addLineBtn: {
    marginTop: 10,
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addLineText: { color: '#15803D', fontWeight: '700', fontSize: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  summaryLabel: { color: '#64748B', fontSize: 12 },
  summaryValue: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
  summaryTotalRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotalLabel: { color: '#1E3A8A', fontSize: 16, fontWeight: '800' },
  summaryTotalValue: { color: '#1D4ED8', fontSize: 20, fontWeight: '900' },
  backBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  editMainBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  backBtnText: { color: '#F4F8FF', fontWeight: '800', fontSize: 13 },
});
