import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../shared/supabaseClient';
import { formatWorkOrderCode } from '../../../shared/workOrderCode';
import WorkOrderPreviewModal from '../../../shared/WorkOrderPreviewModal';
import { completeWorkOrderPaymentMobile } from '../../../shared/workOrderPayment';
import { updateWorkOrderAtomicMobile } from '../../../shared/workOrderAtomic';
import { formatCurrency } from '../../../constants';

type EditTab = 'info' | 'parts' | 'payment';
type DiscountType = 'amount' | 'percent';

type PartItem = {
  partId?: string;
  partName?: string;
  sku?: string;
  quantity: number;
  price: number;
  costPrice?: number;
};

type ServiceItem = {
  id?: string;
  description?: string;
  quantity: number;
  price: number;
  costPrice?: number;
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

const normalizeOrder = (row: any) => ({
  id: row.id,
  code: formatWorkOrderCode(row.id),
  customerName: row.customerName || row.customername || 'Khách lẻ',
  customerPhone: row.customerPhone || row.customerphone || '',
  vehicleModel: row.vehicleModel || row.vehiclemodel || 'Xe máy',
  licensePlate: row.licensePlate || row.licenseplate || 'Chưa có biển số',
  status: row.status || 'Tiếp nhận',
  technicianName: row.technicianName || row.technicianname || '',
  issueDescription: row.issueDescription || row.issuedescription || '',
  currentKm: row.currentKm ?? row.currentkm ?? '',
  laborCost: Number(row.laborCost ?? row.laborcost ?? 0),
  discount: Number(row.discount ?? 0),
  total: Number(row.total ?? 0),
  depositAmount: Number(row.depositAmount ?? row.depositamount ?? 0),
  totalPaid: Number(row.totalPaid ?? row.totalpaid ?? 0),
  remainingAmount: Number(row.remainingAmount ?? row.remainingamount ?? 0),
  paymentStatus: row.paymentStatus || row.paymentstatus || 'unpaid',
  paymentMethod: row.paymentMethod || row.paymentmethod || 'cash',
  partsUsed: pickArray(row, ['partsUsed', 'partsused', 'parts_used']) as PartItem[],
  additionalServices: pickArray(row, ['additionalServices', 'additionalservices', 'additional_services']) as ServiceItem[],
});

const fetchWorkOrder = async (id: string) => {
  const { data, error } = await supabase.from('work_orders').select('*').eq('id', id).single();
  if (error) throw error;
  return normalizeOrder(data);
};

const statusShortcuts: Array<{ label: string; value: string }> = [
  { label: 'Nhận', value: 'Tiếp nhận' },
  { label: 'Sửa', value: 'Đang sửa' },
  { label: 'Xong', value: 'Đã sửa xong' },
  { label: 'Trả', value: 'Trả máy' },
];

export default function WorkOrderEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const goToWorkorders = () => router.replace('/(tabs)/workorders');

  const [activeTab, setActiveTab] = useState<EditTab>('info');
  const [status, setStatus] = useState('Tiếp nhận');
  const [technicianName, setTechnicianName] = useState('');
  const [currentKm, setCurrentKm] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [laborCost, setLaborCost] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [discountType, setDiscountType] = useState<DiscountType>('amount');
  const [useDeposit, setUseDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('0');
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [partialAmount, setPartialAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [partsUsed, setPartsUsed] = useState<PartItem[]>([]);
  const [additionalServices, setAdditionalServices] = useState<ServiceItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const orderQuery = useQuery({
    queryKey: ['workorder-edit', id],
    queryFn: () => fetchWorkOrder(String(id)),
    enabled: Boolean(id),
  });

  const { data: storeSettingsForReceipt } = useQuery({
    queryKey: ['store-settings-mobile-receipt'],
    queryFn: fetchStoreSettingsForReceipt,
    staleTime: 1000 * 60 * 10,
  });

  const order = orderQuery.data;
  const isPaidOrder = order?.paymentStatus === 'paid';

  useEffect(() => {
    if (!order) return;
    setStatus(order.status);
    setTechnicianName(order.technicianName || '');
    setCurrentKm(String(order.currentKm ?? ''));
    setIssueDescription(order.issueDescription || '');
    setLaborCost(String(order.laborCost || 0));
    setDiscount(String(order.discount || 0));
    setDiscountType('amount');
    const deposit = Math.max(0, Number(order.depositAmount || 0));
    const totalPaid = Math.max(0, Number(order.totalPaid || 0));
    const partial = Math.max(0, totalPaid - deposit);
    setUseDeposit(deposit > 0);
    setDepositAmount(String(deposit));
    setShowPaymentInput(partial > 0);
    setPartialAmount(String(partial));
    setPaymentMethod((order.paymentMethod || 'cash') as 'cash' | 'bank');
    setPartsUsed(order.partsUsed || []);
    setAdditionalServices(order.additionalServices || []);
  }, [order]);

  const totals = useMemo(() => {
    const partsTotal = (partsUsed || []).reduce(
      (sum, p) => sum + (Number(p.price || 0) * Number(p.quantity || 0)),
      0
    );
    const servicesTotal = (additionalServices || []).reduce(
      (sum, s) => sum + (Number(s.price || 0) * Number(s.quantity || 0)),
      0
    );
    const labor = Number(laborCost || 0);
    const rawDiscount = Math.max(0, Number(discount || 0));
    const subtotal = labor + partsTotal + servicesTotal;
    const discountValue = discountType === 'percent'
      ? Math.round(Math.max(0, Math.min(100, rawDiscount)) * subtotal / 100)
      : rawDiscount;
    const total = Math.max(0, labor + partsTotal + servicesTotal - discountValue);

    return {
      partsTotal,
      servicesTotal,
      labor,
      discountValue,
      total,
    };
  }, [partsUsed, additionalServices, laborCost, discount, discountType]);

  const depositNum = useDeposit ? Math.max(0, Number(depositAmount || 0)) : 0;
  const partialNum = status === 'Trả máy' && showPaymentInput ? Math.max(0, Number(partialAmount || 0)) : 0;
  const maxReturnCollect = Math.max(0, totals.total - depositNum);
  const totalPaidDisplay = Math.min(totals.total, Math.max(0, depositNum + partialNum));
  const remainingDisplay = Math.max(0, totals.total - totalPaidDisplay);

  useEffect(() => {
    if (status !== 'Trả máy') {
      setShowPaymentInput(false);
      setPartialAmount('0');
    }
  }, [status]);

  useEffect(() => {
    if (!showPaymentInput) return;
    const currentPartial = Math.max(0, Number(partialAmount || 0));
    if (currentPartial > maxReturnCollect) {
      setPartialAmount(String(maxReturnCollect));
    }
  }, [showPaymentInput, partialAmount, maxReturnCollect]);

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      submitAction?: 'save' | 'deposit' | 'pay';
    }) => {
      if (!id) throw new Error('Thiếu mã phiếu sửa');
      if (!order) throw new Error('Không tìm thấy dữ liệu phiếu sửa');

      const submitAction = payload.submitAction ?? 'save';
      const shouldFinalizeByRpc = submitAction === 'pay';
      const normalizedDeposit = useDeposit ? Math.max(0, Number(depositAmount || 0)) : 0;
      const normalizedPartial = status === 'Trả máy' && showPaymentInput ? Math.max(0, Number(partialAmount || 0)) : 0;

      if (normalizedDeposit > 0 && totals.total === 0) {
        throw new Error('Tong tien bang 0, khong can dat coc');
      }
      if (normalizedDeposit > totals.total) {
        throw new Error('So tien dat coc khong duoc lon hon tong tien');
      }
      if (submitAction === 'deposit' && normalizedDeposit <= 0) {
        throw new Error('Vui long nhap so tien dat coc hop le');
      }

      const maxPartial = Math.max(0, totals.total - normalizedDeposit);
      if (normalizedPartial > maxPartial) {
        throw new Error('So tien thanh toan tra xe khong duoc lon hon so tien con lai');
      }

      let normalizedTotalPaid = Math.min(totals.total, normalizedDeposit + normalizedPartial);
      let normalizedPaymentStatus: 'unpaid' | 'partial' | 'paid';
      if (submitAction === 'pay') {
        normalizedTotalPaid = totals.total;
        normalizedPaymentStatus = 'paid';
      } else if (submitAction === 'deposit') {
        normalizedTotalPaid = Math.min(totals.total, normalizedDeposit);
        normalizedPaymentStatus = normalizedTotalPaid > 0 ? 'partial' : 'unpaid';
      } else if (normalizedTotalPaid <= 0) {
        normalizedPaymentStatus = 'unpaid';
      } else if (normalizedTotalPaid >= totals.total && totals.total > 0) {
        normalizedPaymentStatus = 'paid';
      } else {
        normalizedPaymentStatus = 'partial';
      }

      const additionalPayment = Math.max(0, normalizedTotalPaid - normalizedDeposit);
      const atomicResult = await updateWorkOrderAtomicMobile({
        id: String(id),
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        vehicleModel: order.vehicleModel || '',
        licensePlate: order.licensePlate || '',
        currentKm: currentKm ? Number(currentKm) : null,
        issueDescription,
        technicianName,
        status,
        laborCost: totals.labor,
        discount: Math.round(totals.discountValue),
        partsUsed: partsUsed.map((p) => ({
          partId: p.partId || '',
          partName: p.partName || 'Phu tung',
          quantity: Number(p.quantity || 0),
          price: Number(p.price || 0),
          costPrice: Number(p.costPrice || 0),
          sku: p.sku,
          category: undefined,
        })),
        additionalServices: additionalServices.map((s) => ({
          id: s.id || `svc-${Date.now()}`,
          description: s.description || '',
          quantity: Number(s.quantity || 0),
          price: Number(s.price || 0),
          costPrice: Number(s.costPrice || 0),
        })),
        total: totals.total,
        paymentStatus: normalizedPaymentStatus,
        paymentMethod,
        depositAmount: normalizedDeposit,
        additionalPayment,
      });

      if (
        shouldFinalizeByRpc
        && normalizedPaymentStatus === 'paid'
        && partsUsed.length > 0
        && order.paymentStatus !== 'paid'
        && !atomicResult?.inventoryDeducted
      ) {
        await completeWorkOrderPaymentMobile({
          orderId: String(id),
          paymentMethod,
          paymentAmount: 0,
        });
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workorders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-live'] });
      queryClient.invalidateQueries({ queryKey: ['workorder-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['workorder-edit', id] });
      if (variables?.submitAction === 'pay') {
        Alert.alert('Thành công', 'Đã thanh toán và cập nhật tồn kho');
      } else if (variables?.submitAction === 'deposit') {
        Alert.alert('Thành công', 'Đã lưu đặt cọc');
      } else {
        Alert.alert('Thành công', 'Đã lưu phiếu sửa chữa');
      }
      goToWorkorders();
    },
    onError: (err: any) => {
      Alert.alert('Lỗi', err?.message || 'Không thể lưu phiếu sửa');
    },
  });

  const handleQuickPayment = (ratio: number) => {
    const v = Math.round(maxReturnCollect * ratio);
    setPartialAmount(String(v));
  };

  const handleSave = () => {
    saveMutation.mutate({
      submitAction: 'save',
    });
  };

  const handlePay = () => {
    saveMutation.mutate({
      submitAction: 'pay',
    });
  };

  const handleDeposit = () => {
    saveMutation.mutate({
      submitAction: 'deposit',
    });
  };

  const handlePrint = async () => {
    if (!order) return;
    setShowPreview(true);
  };

  const handleShare = async () => {
    if (!order) return;
    setShowPreview(true);
  };

  const updatePart = (index: number, updates: Partial<PartItem>) => {
    setPartsUsed((prev) => prev.map((p, i) => (i === index ? { ...p, ...updates } : p)));
  };

  const updateService = (index: number, updates: Partial<ServiceItem>) => {
    setAdditionalServices((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  if (orderQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#4EA7FF" size="large" />
      </View>
    );
  }

  if (orderQuery.isError || !order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Không tải được phiếu sửa chữa.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={goToWorkorders}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.closeBtn} onPress={goToWorkorders}>
          <Feather name="x" size={22} color="#A6B2C8" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Sửa phiếu #{order.code}</Text>
        </View>
      </View>

      {isPaidOrder ? (
        <View style={styles.warningBox}>
          <View style={styles.warningRow}>
            <Feather name="alert-triangle" size={15} color="#F3B35E" />
            <Text style={styles.warningText}>Phiếu đã thanh toán: Không thể sửa giá và phụ tùng.</Text>
          </View>
          <Text style={styles.warningSub}>Bạn vẫn có thể cập nhật thông tin và chi phí dịch vụ.</Text>
        </View>
      ) : null}

      <View style={styles.tabRow}>
        <TabButton label="THÔNG TIN" active={activeTab === 'info'} onPress={() => setActiveTab('info')} />
        <TabButton label="PHỤ TÙNG" active={activeTab === 'parts'} onPress={() => setActiveTab('parts')} />
        <TabButton label="T.TOÁN" active={activeTab === 'payment'} onPress={() => setActiveTab('payment')} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {activeTab === 'info' ? (
          <>
            <SectionTitle>TRẠNG THÁI SỬA CHỮA</SectionTitle>
            <View style={styles.statusRow}>
              {statusShortcuts.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.statusBtn, status === s.value && styles.statusBtnActive]}
                  onPress={() => setStatus(s.value)}
                >
                  <Text style={[styles.statusBtnText, status === s.value && styles.statusBtnTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <SectionTitle>KỸ THUẬT VIÊN PHỤ TRÁCH</SectionTitle>
            <TextInput
              value={technicianName}
              onChangeText={setTechnicianName}
              style={styles.input}
              placeholder="Nhập kỹ thuật viên"
              placeholderTextColor="#7988A2"
            />

            <SectionTitle>THÔNG TIN KHÁCH HÀNG</SectionTitle>
            <View style={styles.customerCard}>
              <Text style={styles.customerName}>{order.customerName}</Text>
              <View style={styles.inlineRow}>
                <Feather name="phone" size={13} color="#7EA4E8" />
                <Text style={styles.customerSub}>{order.customerPhone || '-'}</Text>
              </View>
              <View style={styles.inlineRow}>
                <MaterialCommunityIcons name="motorbike" size={14} color="#7EA4E8" />
                <Text style={styles.customerSub}>{order.vehicleModel} • {order.licensePlate}</Text>
              </View>
            </View>

            <SectionTitle>SỐ KM HIỆN TẠI</SectionTitle>
            <TextInput
              value={currentKm}
              onChangeText={setCurrentKm}
              style={styles.input}
              keyboardType="numeric"
              placeholder="Nhập số KM..."
              placeholderTextColor="#7988A2"
            />

            <SectionTitle>MÔ TẢ TÌNH TRẠNG XE</SectionTitle>
            <TextInput
              value={issueDescription}
              onChangeText={setIssueDescription}
              style={[styles.input, styles.multiline]}
              multiline
              placeholder="Mô tả các vấn đề cần sửa chữa..."
              placeholderTextColor="#7988A2"
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={() => setActiveTab('parts')}>
              <Text style={styles.primaryBtnText}>Tiếp tục: Phụ tùng & Dịch vụ</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {activeTab === 'parts' ? (
          <>
            <View style={styles.sectionHeadRow}>
              <SectionTitle>PHỤ TÙNG SỬ DỤNG</SectionTitle>
              <Text style={styles.sectionCount}>{partsUsed.length} món</Text>
            </View>

            {partsUsed.map((part, index) => {
              const lineTotal = Number(part.price || 0) * Number(part.quantity || 0);
              return (
                <View key={`${part.partId || 'part'}-${index}`} style={styles.partCard}>
                  <View style={styles.partTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.partName}>{part.partName || 'Phụ tùng'}</Text>
                      <Text style={styles.partSku}>#{part.sku || part.partId || 'N/A'}</Text>
                    </View>
                    {!isPaidOrder ? (
                      <TouchableOpacity
                        onPress={() => setPartsUsed((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#8F98AD" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <View style={styles.partInputRow}>
                    <View style={styles.partPriceBox}>
                      <Text style={styles.partPriceLabel}>Đơn giá</Text>
                      <TextInput
                        editable={!isPaidOrder}
                        value={String(part.price || 0)}
                        keyboardType="numeric"
                        onChangeText={(v) => updatePart(index, { price: Number(v || 0) })}
                        style={styles.partPriceInput}
                      />
                    </View>

                    <View style={styles.qtyBox}>
                      <TouchableOpacity
                        disabled={isPaidOrder}
                        onPress={() => updatePart(index, { quantity: Math.max(1, Number(part.quantity || 1) - 1) })}
                      >
                        <Text style={[styles.qtyBtn, isPaidOrder && styles.disabledText]}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{Number(part.quantity || 1)}</Text>
                      <TouchableOpacity
                        disabled={isPaidOrder}
                        onPress={() => updatePart(index, { quantity: Number(part.quantity || 1) + 1 })}
                      >
                        <Text style={[styles.qtyBtn, isPaidOrder && styles.disabledText]}>＋</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.lineTotal}>Thành tiền {formatCurrency(lineTotal)}</Text>
                </View>
              );
            })}

            {!isPaidOrder ? (
              <TouchableOpacity
                style={styles.ghostAddBtn}
                onPress={() =>
                  setPartsUsed((prev) => [
                    ...prev,
                    {
                      partId: `custom-${Date.now()}`,
                      partName: 'Phụ tùng mới',
                      sku: `PT-${Date.now()}`,
                      quantity: 1,
                      price: 0,
                    },
                  ])
                }
              >
                <Text style={styles.ghostAddBtnText}>＋ Thêm phụ tùng</Text>
              </TouchableOpacity>
            ) : null}

            <SectionTitle>DỊCH VỤ & GIA CÔNG</SectionTitle>
            {additionalServices.map((service, index) => (
              <View key={`${service.id || 'service'}-${index}`} style={styles.serviceRow}>
                <TextInput
                  value={service.description || ''}
                  onChangeText={(v) => updateService(index, { description: v })}
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Tên dịch vụ"
                  placeholderTextColor="#7988A2"
                />
                <TextInput
                  value={String(service.price || 0)}
                  onChangeText={(v) => updateService(index, { price: Number(v || 0) })}
                  style={[styles.input, { width: 100 }]}
                  keyboardType="numeric"
                  placeholder="Giá"
                  placeholderTextColor="#7988A2"
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.ghostAddBtn, { borderColor: '#564225' }]}
              onPress={() =>
                setAdditionalServices((prev) => [
                  ...prev,
                  {
                    id: `svc-${Date.now()}`,
                    description: 'Dịch vụ ngoài',
                    quantity: 1,
                    price: 0,
                  },
                ])
              }
            >
              <Text style={[styles.ghostAddBtnText, { color: '#D89A44' }]}>＋ Thêm dịch vụ ngoài</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => setActiveTab('payment')}>
              <Text style={styles.primaryBtnText}>Tiếp tục: Thanh toán</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {activeTab === 'payment' ? (
          <>
            <SectionTitle>CHI TIẾT CHI PHÍ</SectionTitle>
            <View style={styles.costCard}>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Tiền công thợ</Text>
                <TextInput
                  editable={!isPaidOrder}
                  value={laborCost}
                  onChangeText={setLaborCost}
                  keyboardType="numeric"
                  style={styles.costInput}
                />
              </View>

              <View style={styles.costGrid}>
                <View style={styles.costMini}><Text style={styles.costMiniLabel}>Phụ tùng</Text><Text style={styles.costMiniValue}>{formatCurrency(totals.partsTotal)}</Text></View>
                <View style={styles.costMini}><Text style={styles.costMiniLabel}>Gia công</Text><Text style={styles.costMiniValue}>{formatCurrency(totals.servicesTotal)}</Text></View>
              </View>

              <View style={styles.discountTypeRow}>
                <TouchableOpacity
                  disabled={isPaidOrder}
                  style={[styles.discountTypeBtn, discountType === 'amount' && styles.discountTypeBtnActive]}
                  onPress={() => setDiscountType('amount')}
                >
                  <Text style={[styles.discountTypeText, discountType === 'amount' && styles.discountTypeTextActive]}>VNĐ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={isPaidOrder}
                  style={[styles.discountTypeBtn, discountType === 'percent' && styles.discountTypeBtnActive]}
                  onPress={() => setDiscountType('percent')}
                >
                  <Text style={[styles.discountTypeText, discountType === 'percent' && styles.discountTypeTextActive]}>%</Text>
                </TouchableOpacity>
                <TextInput
                  editable={!isPaidOrder}
                  value={discount}
                  onChangeText={setDiscount}
                  keyboardType="numeric"
                  style={[styles.costInput, { flex: 1 }]}
                />
              </View>

              {discountType === 'percent' ? (
                <View style={styles.quickPayRow}>
                  <TouchableOpacity style={styles.quickPayBtn} onPress={() => setDiscount('10')}><Text style={styles.quickPayText}>-10%</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.quickPayBtn} onPress={() => setDiscount('20')}><Text style={styles.quickPayText}>-20%</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.quickPayBtn} onPress={() => setDiscount('50')}><Text style={styles.quickPayText}>-50%</Text></TouchableOpacity>
                </View>
              ) : null}
            </View>

            <SectionTitle>THANH TOÁN</SectionTitle>
            <View style={styles.depositRow}>
              <Text style={styles.costLabel}>Cọc trước</Text>
              <TouchableOpacity
                disabled={isPaidOrder}
                style={[styles.toggle, useDeposit && styles.toggleActive]}
                onPress={() => setUseDeposit(!useDeposit)}
              >
                <View style={[styles.toggleDot, useDeposit && styles.toggleDotActive]} />
              </TouchableOpacity>
            </View>

            {useDeposit ? (
              <TextInput
                editable={!isPaidOrder}
                style={[styles.input, { marginBottom: 10 }]}
                value={depositAmount}
                onChangeText={setDepositAmount}
                keyboardType="numeric"
                placeholder="Số tiền đặt cọc"
                placeholderTextColor="#7988A2"
              />
            ) : null}

            <View style={styles.payMethodRow}>
              <TouchableOpacity
                disabled={isPaidOrder}
                style={[styles.payMethodBtn, paymentMethod === 'cash' && styles.payMethodBtnActive]}
                onPress={() => setPaymentMethod('cash')}
              >
                <View style={styles.inlineRowCenter}>
                  <MaterialCommunityIcons name="cash" size={16} color="#A8B6CD" />
                  <Text style={styles.payMethodText}>Tiền mặt</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={isPaidOrder}
                style={[styles.payMethodBtn, paymentMethod === 'bank' && styles.payMethodBtnActive]}
                onPress={() => setPaymentMethod('bank')}
              >
                <View style={styles.inlineRowCenter}>
                  <MaterialCommunityIcons name="bank-outline" size={16} color="#A8B6CD" />
                  <Text style={styles.payMethodText}>Chuyển khoản</Text>
                </View>
              </TouchableOpacity>
            </View>

            {status === 'Trả máy' ? (
              <View style={styles.paymentBox}>
                <View style={styles.depositRow}>
                  <Text style={styles.paymentTitle}>THANH TOÁN TRẢ XE</Text>
                  <TouchableOpacity
                    disabled={isPaidOrder}
                    style={[styles.toggle, showPaymentInput && styles.toggleActiveGreen]}
                    onPress={() => {
                      const next = !showPaymentInput;
                      setShowPaymentInput(next);
                      setPartialAmount(next ? String(maxReturnCollect) : '0');
                    }}
                  >
                    <View style={[styles.toggleDot, showPaymentInput && styles.toggleDotActive]} />
                  </TouchableOpacity>
                </View>

                {showPaymentInput ? (
                  <>
                    <TextInput
                      editable={!isPaidOrder}
                      style={styles.paymentInput}
                      value={partialAmount}
                      onChangeText={setPartialAmount}
                      keyboardType="numeric"
                      placeholder="Nhập số tiền..."
                      placeholderTextColor="#7988A2"
                    />
                    <View style={styles.quickPayRow}>
                      <TouchableOpacity style={styles.quickPayBtn} onPress={() => handleQuickPayment(0)}><Text style={styles.quickPayText}>0%</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.quickPayBtn} onPress={() => handleQuickPayment(0.5)}><Text style={styles.quickPayText}>50%</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.quickPayBtn} onPress={() => handleQuickPayment(1)}><Text style={styles.quickPayText}>100%</Text></TouchableOpacity>
                    </View>
                  </>
                ) : null}
              </View>
            ) : null}

            <View style={styles.totalCard}>
              <Text style={styles.totalTitle}>TỔNG THANH TOÁN</Text>
              <Text style={styles.totalAmount}>{formatCurrency(totals.total)}</Text>
              <View style={styles.totalRow}><Text style={styles.totalSub}>Đã thanh toán</Text><Text style={styles.totalSub}>{formatCurrency(totalPaidDisplay)}</Text></View>
              <View style={styles.totalRow}><Text style={styles.totalSubStrong}>Còn lại cần thu</Text><Text style={styles.totalRemain}>{formatCurrency(remainingDisplay)}</Text></View>
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.bottomActionPanel}>
        <View style={styles.bottomTopActions}>
          <TouchableOpacity style={styles.bottomGhost} onPress={handlePrint}>
            <View style={styles.inlineRowCenter}>
              <MaterialCommunityIcons name="printer-outline" size={15} color="#B4B8BE" />
              <Text style={styles.bottomGhostText}>In phiếu</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomGhost} onPress={handleShare}>
            <View style={styles.inlineRowCenter}>
              <Feather name="share-2" size={14} color="#B4B8BE" />
              <Text style={styles.bottomGhostText}>Chia sẻ</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomMainActions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={goToWorkorders}><Text style={styles.cancelBtnText}>Hủy</Text></TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            {saveMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.inlineRowCenter}>
                <Feather name="save" size={14} color="#ECF2FF" />
                <Text style={styles.saveBtnText}>LƯU</Text>
              </View>
            )}
          </TouchableOpacity>
          {status === 'Trả máy' ? (
            <TouchableOpacity style={styles.payBtn} onPress={handlePay}>
              {saveMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.inlineRowCenter}>
                  <Feather name="check-square" size={14} color="#ECFCEF" />
                  <Text style={styles.payBtnText}>THANH TOÁN</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : useDeposit && depositNum > 0 ? (
            <TouchableOpacity
              style={styles.depositBtn}
              onPress={handleDeposit}
            >
              <View style={styles.inlineRowCenter}>
                <MaterialCommunityIcons name="cash-plus" size={15} color="#FFFFFF" />
                <Text style={styles.depositBtnText}>ĐẶT CỌC</Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <WorkOrderPreviewModal
        visible={showPreview}
        order={{
          ...order,
          status,
          laborCost: totals.labor,
          discount: Math.round(totals.discountValue),
          total: totals.total,
          totalPaid: totalPaidDisplay,
          remainingAmount: remainingDisplay,
          depositAmount: useDeposit ? depositNum : 0,
          paymentMethod,
          partsUsed,
          additionalServices,
        } as any}
        storeSettings={(storeSettingsForReceipt || null) as any}
        onClose={() => setShowPreview(false)}
      />
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12131A' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#12131A', gap: 12 },
  errorText: { color: '#F5B5BE', fontSize: 14, fontWeight: '700' },
  backBtn: { backgroundColor: '#1C57CC', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  backBtnText: { color: '#EEF5FF', fontWeight: '700' },

  topBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#24385A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1A1D25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#E9F2FF', fontSize: 16, fontWeight: '800' },

  warningBox: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#9A7A2D',
    backgroundColor: '#4C3A08',
    padding: 14,
    gap: 4,
  },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warningText: { color: '#F3B35E', fontSize: 13, fontWeight: '700', flex: 1 },
  warningSub: { color: '#E7A85C', fontSize: 12, fontWeight: '500' },

  tabRow: {
    marginTop: 10,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#22385D',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
  },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#2C87FF' },
  tabBtnText: { color: '#ADB7C9', fontSize: 12, fontWeight: '700' },
  tabBtnTextActive: { color: '#4EA7FF' },

  content: { padding: 16, gap: 12, paddingBottom: 120 },
  sectionTitle: { color: '#8C8C80', fontSize: 13, fontWeight: '800', letterSpacing: 0.35, marginTop: 4 },

  statusRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#151922',
    borderWidth: 1,
    borderColor: '#2A3E62',
    borderRadius: 14,
    padding: 6,
  },
  statusBtn: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statusBtnActive: { backgroundColor: '#2A4DB4' },
  statusBtnText: { color: '#B0BACD', fontSize: 13, fontWeight: '700' },
  statusBtnTextActive: { color: '#DDEBFF' },

  input: {
    backgroundColor: '#151922',
    borderWidth: 1,
    borderColor: '#2A3E62',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#EEF3FF',
    fontSize: 14,
  },
  multiline: { minHeight: 98, textAlignVertical: 'top' },

  customerCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A4B87',
    backgroundColor: '#131922',
    padding: 16,
    gap: 6,
  },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineRowCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customerName: { color: '#EDF3FF', fontSize: 15, fontWeight: '800' },
  customerSub: { color: '#7EA4E8', fontSize: 13, fontWeight: '600' },

  primaryBtn: {
    marginTop: 8,
    backgroundColor: '#2A4DB4',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryBtnText: { color: '#ECF4FF', fontSize: 14, fontWeight: '800' },

  sectionHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionCount: { color: '#72AFFF', fontSize: 13, fontWeight: '700' },

  partCard: {
    backgroundColor: '#151827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#706A57',
    padding: 14,
    gap: 12,
  },
  partTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  partName: { color: '#EDF4FF', fontSize: 15, fontWeight: '800' },
  partSku: { color: '#4D93E6', fontSize: 13, fontWeight: '500', marginTop: 2 },

  partInputRow: { flexDirection: 'row', gap: 10 },
  partPriceBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7E7A68',
    padding: 10,
    gap: 6,
  },
  partPriceLabel: { color: '#999FAD', fontSize: 13, fontWeight: '600' },
  partPriceInput: { color: '#3B6EA8', fontSize: 15, fontWeight: '800', paddingVertical: 2 },
  qtyBox: {
    width: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7E7A68',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  qtyBtn: { color: '#AEB8CD', fontSize: 20, fontWeight: '700' },
  qtyValue: { color: '#E9F2FF', fontSize: 13, fontWeight: '800' },
  disabledText: { opacity: 0.38 },
  lineTotal: { color: '#7EE2B7', fontSize: 14, fontWeight: '800', textAlign: 'right' },

  ghostAddBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#174069',
    alignItems: 'center',
    paddingVertical: 13,
    backgroundColor: '#141B29',
  },
  ghostAddBtnText: { color: '#2F77C8', fontSize: 14, fontWeight: '800' },

  serviceRow: { flexDirection: 'row', gap: 8 },

  costCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#23426B',
    backgroundColor: '#131923',
    padding: 12,
    gap: 10,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  costLabel: { color: '#8F958E', fontSize: 13, fontWeight: '700' },
  costInput: {
    width: 170,
    backgroundColor: '#151922',
    borderColor: '#2A3E62',
    borderWidth: 1,
    borderRadius: 12,
    color: '#DFE9F7',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 9,
    textAlign: 'right',
  },
  costGrid: { flexDirection: 'row', gap: 8 },
  costMini: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D456B',
    backgroundColor: '#171A25',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  costMiniLabel: { color: '#999E98', fontSize: 13, fontWeight: '700' },
  costMiniValue: { color: '#D3D8DF', fontSize: 13, fontWeight: '800', marginTop: 3 },
  discountTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  discountTypeBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A3E62',
    backgroundColor: '#141A26',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  discountTypeBtnActive: { borderColor: '#B91C1C', backgroundColor: '#7F1D1D' },
  discountTypeText: { color: '#A8B6CD', fontSize: 12, fontWeight: '700' },
  discountTypeTextActive: { color: '#FFE4E6' },
  depositRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  toggle: {
    width: 42,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#334155',
    padding: 2,
  },
  toggleActive: { backgroundColor: '#7C3AED' },
  toggleActiveGreen: { backgroundColor: '#16A34A' },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleDotActive: { transform: [{ translateX: 18 }] },

  payMethodRow: { flexDirection: 'row', gap: 10 },
  payMethodBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3E62',
    backgroundColor: '#151922',
    alignItems: 'center',
    paddingVertical: 14,
  },
  payMethodBtnActive: {
    borderColor: '#237A46',
    backgroundColor: '#123B2C',
  },
  payMethodText: { color: '#A8B6CD', fontSize: 13, fontWeight: '700' },

  paymentBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#276B45',
    backgroundColor: '#16402E',
    padding: 12,
    gap: 10,
  },
  paymentTitle: { color: '#D2EFDF', fontSize: 15, fontWeight: '800' },
  paymentInput: {
    backgroundColor: '#12161F',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4EA379',
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: '#84F0C4',
    fontSize: 15,
    fontWeight: '800',
  },
  quickPayRow: { flexDirection: 'row', gap: 8 },
  quickPayBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#1A6A46',
    alignItems: 'center',
    paddingVertical: 10,
  },
  quickPayText: { color: '#C7EEDF', fontSize: 12, fontWeight: '800' },

  totalCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A3E62',
    backgroundColor: '#121626',
    padding: 14,
    gap: 8,
  },
  totalTitle: { color: '#A9ACB3', fontSize: 14, fontWeight: '800' },
  totalAmount: { color: '#F4F7FB', fontSize: 20, fontWeight: '800' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalSub: { color: '#8F9CB5', fontSize: 13, fontWeight: '600' },
  totalSubStrong: { color: '#D3DCEB', fontSize: 14, fontWeight: '800' },
  totalRemain: { color: '#7FE2B5', fontSize: 14, fontWeight: '800' },

  bottomActionPanel: {
    borderTopWidth: 1,
    borderTopColor: '#2A3E62',
    backgroundColor: '#121720',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
  },
  bottomTopActions: { flexDirection: 'row', gap: 8 },
  bottomGhost: {
    flex: 1,
    backgroundColor: '#1A1D25',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 11,
  },
  bottomGhostDisabled: {
    opacity: 0.72,
  },
  bottomGhostText: { color: '#B4B8BE', fontSize: 13, fontWeight: '600' },

  bottomMainActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: {
    width: 70,
    borderRadius: 12,
    backgroundColor: '#1A1D25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { color: '#B8BDC7', fontSize: 14, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#505A75',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveBtnText: { color: '#ECF2FF', fontSize: 14, fontWeight: '800' },
  payBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#3C984D',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  payBtnText: { color: '#ECFCEF', fontSize: 14, fontWeight: '800' },
  depositBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  depositBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
