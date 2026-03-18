import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../shared/supabaseClient';
import { formatWorkOrderCode } from '../../../shared/workOrderCode';
import { formatCurrency, formatDate } from '../../../constants';
import type { WorkOrder } from '../../../shared/types';

type TimelineItem = {
  id: string;
  time: string;
  title: string;
  detail?: string;
};

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
  return data as WorkOrder & { created_at?: string; updated_at?: string; additionalServices?: any[] };
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
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{order.status}</Text>
          </View>
          <Text style={styles.dateText}>{formatDate(order.creationDate)}</Text>
        </View>
        <View style={styles.inlineRow}>
          <Feather name="user" size={13} color="#9CB0CE" />
          <Text style={styles.metaText}>KTV: {order.technicianName || 'Chưa gán'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <SectionTitle icon="account-outline" title="KHÁCH HÀNG" />
        <DetailRow label="Tên" value={order.customerName} />
        <DetailRow label="SĐT" value={order.customerPhone || '-'} />
        <DetailRow label="Xe" value={order.vehicleModel || '-'} />
        <DetailRow label="Biển số" value={order.licensePlate || '-'} />
      </View>

      <View style={styles.card}>
        <SectionTitle icon="wrench-outline" title="THÔNG TIN SỬA CHỮA" />
        <DetailRow label="Mô tả lỗi" value={order.issueDescription || '-'} />
        <DetailRow label="Kỹ thuật viên" value={order.technicianName || '-'} />
        <DetailRow label="Tiền công" value={formatCurrency(order.laborCost || 0)} />
        <DetailRow label="Giảm giá" value={formatCurrency(order.discount || 0)} />
        <DetailRow label="Tổng tiền" value={formatCurrency(order.total || 0)} />
      </View>

      <View style={styles.card}>
        <SectionTitle icon="cube-outline" title="PHỤ TÙNG & DỊCH VỤ" />
        {(order.partsUsed || []).map((p: any, i: number) => (
          <View key={i} style={styles.lineItemRow}>
            <View>
              <Text style={styles.lineTitle}>{p.partName || p.description}</Text>
              <Text style={styles.lineSub}>{p.quantity} x {formatCurrency(p.price)}</Text>
            </View>
            {isEditable && (
              <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemovePart(i)}>
                <MaterialCommunityIcons name="trash-can-outline" size={14} color="#FF6B6B" />
                <Text style={styles.removeText}>Xóa</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {(order.additionalServices || []).map((s: any, i: number) => (
          <View key={i + 1000} style={styles.lineItemRow}>
            <View>
              <Text style={styles.lineTitle}>{s.description || s.id}</Text>
              <Text style={styles.lineSub}>{s.quantity} x {formatCurrency(s.price)}</Text>
            </View>
            {isEditable && (
              <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveService(i)}>
                <MaterialCommunityIcons name="trash-can-outline" size={14} color="#FF6B6B" />
                <Text style={styles.removeText}>Xóa</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
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
        <SectionTitle icon="cash-multiple" title="THANH TOÁN" />
        <DetailRow label="Trạng thái" value={paymentLabel} />
        <DetailRow label="Tổng đã thu" value={formatCurrency(order.totalPaid || 0)} />
        <DetailRow label="Còn lại" value={formatCurrency(order.remainingAmount || 0)} />
      </View>

      <View style={styles.card}>
        <SectionTitle icon="timeline-clock-outline" title="LỊCH SỬ THAO TÁC" />
        {timelineQuery.isLoading ? (
          <View style={styles.timelineLoading}><ActivityIndicator size="small" color="#5AB0FF" /></View>
        ) : (
          (timelineQuery.data || []).map((item, index, arr) => (
            <View key={item.id} style={styles.timelineItem}>
              <View style={styles.timelineGraphic}>
                <View style={styles.dot} />
                {index !== arr.length - 1 && <View style={styles.line} />}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{item.title}</Text>
                <Text style={styles.timelineTime}>{new Date(item.time).toLocaleString('vi-VN')}</Text>
                {item.detail ? <Text style={styles.timelineDetail}>{item.detail}</Text> : null}
              </View>
            </View>
          ))
        )}
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
  container: { flex: 1, backgroundColor: '#111318' },
  content: { padding: 14, gap: 12, paddingBottom: 26 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111318', gap: 10 },
  errorText: { color: '#FFC8D0', fontWeight: '700' },
  topBar: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3E62',
    backgroundColor: '#131923',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1A1D25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#E9F2FF', fontSize: 17, fontWeight: '800' },
  subCode: { color: '#4EA7FF', fontSize: 12, marginTop: 2, fontWeight: '600' },
  editBtn: {
    backgroundColor: '#2A4DB4',
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
    borderColor: '#2A3E62',
    backgroundColor: '#0E213F',
    padding: 14,
    gap: 8,
  },
  statusTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: 'rgba(176,138,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: { color: '#B08AFF', fontSize: 12, fontWeight: '700' },
  dateText: { color: '#AFC2E1', fontSize: 12, fontWeight: '600' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineRowCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#C6D5ED', fontSize: 13, fontWeight: '600' },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3E62',
    backgroundColor: '#161A22',
    padding: 12,
    gap: 10,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: { color: '#EAF2FF', fontSize: 13, fontWeight: '800' },
  detailRow: { gap: 3 },
  detailLabel: { color: '#9CB0CE', fontSize: 11 },
  detailValue: { color: '#E9F1FF', fontSize: 13, fontWeight: '600' },
  lineItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lineTitle: { color: '#E9F1FF', fontSize: 13, fontWeight: '600' },
  lineSub: { color: '#9CB0CE', fontSize: 11 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeText: { color: '#FF6B6B', fontWeight: '700', fontSize: 12 },
  addLineBtn: {
    marginTop: 10,
    backgroundColor: '#2A3E62',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addLineText: { color: '#8DE3AF', fontWeight: '700', fontSize: 12 },
  timelineLoading: { paddingVertical: 8 },
  timelineItem: { flexDirection: 'row', alignItems: 'stretch' },
  timelineGraphic: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#5AB0FF',
    marginTop: 6,
    borderWidth: 2,
    borderColor: '#161A22',
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: '#384A6E',
    marginTop: 4,
    marginBottom: -6, // Overlap to next item's dot area safely
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 18,
  },
  timelineTitle: { color: '#EAF2FF', fontSize: 12, fontWeight: '700' },
  timelineTime: { color: '#98AACC', fontSize: 11, marginTop: 1 },
  timelineDetail: { color: '#C7D6EE', fontSize: 12, marginTop: 4, backgroundColor: '#1C2638', padding: 8, borderRadius: 6 },
  backBtn: {
    backgroundColor: '#1A5ED1',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  editMainBtn: {
    backgroundColor: '#2A4DB4',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  backBtnText: { color: '#F4F8FF', fontWeight: '800', fontSize: 13 },
});
