import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND_COLORS, formatCurrency } from '../../constants';
import { supabase } from '../../shared/supabaseClient';

type PaymentStatus = 'unpaid' | 'partial' | 'paid';
type PaymentMethod = 'cash' | 'bank';
type DiscountType = 'amount' | 'percent';
type WorkOrderStatus = 'Tiếp nhận' | 'Đang sửa' | 'Đã sửa xong' | 'Trả máy';

type CustomerVehicle = {
  id?: string;
  model?: string;
  licensePlate?: string;
  isPrimary?: boolean;
};

type CustomerOption = {
  id: string;
  name: string;
  phone?: string;
  vehicles?: CustomerVehicle[];
};

type PartOption = {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  retailPrice?: unknown;
  costPrice?: unknown;
  stock?: unknown;
};

type SelectedPart = {
  partId: string;
  partName: string;
  sku?: string;
  quantity: number;
  sellingPrice: number;
  costPrice: number;
  stockQty: number;
};

type ServiceItem = {
  id: string;
  name: string;
  quantity: number;
  sellingPrice: number;
  costPrice: number;
};

type TopTab = 'info' | 'parts' | 'payment';
type SubmitAction = 'save' | 'deposit' | 'pay';

const BRANCH_ID = 'CN1';
const WORK_ORDER_STATUS: WorkOrderStatus[] = ['Tiếp nhận', 'Đang sửa', 'Đã sửa xong', 'Trả máy'];
const STATUS_COLOR: Record<WorkOrderStatus, string> = {
  'Tiếp nhận': '#5AB0FF',
  'Đang sửa': '#FFAD66',
  'Đã sửa xong': '#76E7A9',
  'Trả máy': '#B08AFF',
};

const toNumber = (v: string) => {
  const n = Number((v || '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};

const fromBranchValue = (value: unknown, branchId: string): number => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'object' || value == null) return 0;

  const obj = value as Record<string, unknown>;
  const byBranch = Number(obj[branchId]);
  if (Number.isFinite(byBranch)) return byBranch;

  const firstNumeric = Object.values(obj).find((v) => Number.isFinite(Number(v)));
  return firstNumeric == null ? 0 : Number(firstNumeric);
};

const fetchCustomers = async (query?: string): Promise<CustomerOption[]> => {
  let req = supabase
    .from('customers')
    .select('id,name,phone,vehicles')
    .order('created_at', { ascending: false });

  if (query && query.trim()) {
    const q = query.trim();
    req = req.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    req = req.limit(30);
  } else {
    req = req.limit(200);
  }

  const { data, error } = await req;
  if (error) throw error;
  return (data ?? []) as CustomerOption[];
};

const fetchTechnicians = async (): Promise<string[]> => {
  const [empRes, orderRes] = await Promise.all([
    supabase.from('employees').select('name,status').limit(120),
    supabase.from('work_orders').select('technicianName').not('technicianName', 'is', null).limit(200),
  ]);

  const names = new Set<string>();

  (empRes.data ?? []).forEach((row: any) => {
    const name = String(row?.name || '').trim();
    const status = String(row?.status || '').toLowerCase();
    if (!name) return;
    if (status && status !== 'active') return;
    names.add(name);
  });

  (orderRes.data ?? []).forEach((row: any) => {
    const name = String(row?.technicianName || '').trim();
    if (name) names.add(name);
  });

  return Array.from(names).sort((a, b) => a.localeCompare(b, 'vi'));
};

const fetchParts = async (): Promise<PartOption[]> => {
  const { data, error } = await supabase
    .from('parts')
    .select('*')
    .limit(300);

  if (error) throw error;
  return (data ?? []) as PartOption[];
};

export default function WorkOrderCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    issueTemplate?: string | string[];
    technicianTemplate?: string | string[];
    noteTemplate?: string | string[];
    laborTemplate?: string | string[];
    statusTemplate?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const goToWorkorders = () => router.replace('/(tabs)/workorders');

  const pickParam = (value?: string | string[]) => {
    if (Array.isArray(value)) return String(value[0] || '').trim();
    return String(value || '').trim();
  };

  const templateIssue = pickParam(params.issueTemplate);
  const templateTechnician = pickParam(params.technicianTemplate);
  const templateNote = pickParam(params.noteTemplate);
  const templateLabor = pickParam(params.laborTemplate);
  const templateStatus = pickParam(params.statusTemplate) as WorkOrderStatus;

  const [activeTab, setActiveTab] = useState<TopTab>('info');
  const [didAutoAdvanceInfo, setDidAutoAdvanceInfo] = useState(false);

  const [showCustomerSearch, setShowCustomerSearch] = useState(true);
  const [editCustomerInfo, setEditCustomerInfo] = useState(false);
  const [editVehicleInfo, setEditVehicleInfo] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerQueryKey, setCustomerQueryKey] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const customerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [currentKm, setCurrentKm] = useState('');
  const [issueDescription, setIssueDescription] = useState(templateIssue || '');
  const [status, setStatus] = useState<WorkOrderStatus>(WORK_ORDER_STATUS.includes(templateStatus) ? templateStatus : 'Tiếp nhận');
  const [technicianName, setTechnicianName] = useState(templateTechnician || '');
  const [notes, setNotes] = useState(templateNote || '');

  const [laborCost, setLaborCost] = useState(templateLabor || '0');
  const [discount, setDiscount] = useState('0');
  const [discountType, setDiscountType] = useState<DiscountType>('amount');

  const [useDeposit, setUseDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('0');
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [partialAmount, setPartialAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const [partSearch, setPartSearch] = useState('');
  const [showPartModal, setShowPartModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [partCategoryFilter, setPartCategoryFilter] = useState('');
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [scanLocked, setScanLocked] = useState(false);

  const [serviceName, setServiceName] = useState('');
  const [serviceQty, setServiceQty] = useState('1');
  const [servicePrice, setServicePrice] = useState('0');
  const [serviceCostPrice, setServiceCostPrice] = useState('0');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showTechnicianModal, setShowTechnicianModal] = useState(false);
  const [technicianSearch, setTechnicianSearch] = useState('');
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const { data: customers = [], isLoading: customerLoading } = useQuery({
    queryKey: ['workorder-form-customers', customerQueryKey],
    queryFn: () => fetchCustomers(customerQueryKey),
    staleTime: 30 * 1000,
  });

  const handleCustomerSearchChange = (text: string) => {
    setCustomerSearch(text);
    if (customerDebounceRef.current) clearTimeout(customerDebounceRef.current);
    customerDebounceRef.current = setTimeout(() => {
      setCustomerQueryKey(text.trim());
    }, 350);
  };

  const { data: technicians = [] } = useQuery({
    queryKey: ['workorder-form-technicians'],
    queryFn: fetchTechnicians,
    staleTime: 5 * 60 * 1000,
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['workorder-form-parts'],
    queryFn: fetchParts,
    staleTime: 3 * 60 * 1000,
  });

  const filteredCustomers = useMemo(() => {
    // Server-side search already filtered; just do local plate filtering on top
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 15);
    return customers
      .filter((c) => {
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = (c.phone ?? '').toLowerCase().includes(q);
        const matchPlate = c.vehicles?.some(v => (v.licensePlate ?? '').toLowerCase().includes(q));
        return matchName || matchPhone || matchPlate;
      })
      .slice(0, 25);
  }, [customers, customerSearch]);

  const customerVehicles = useMemo(() => {
    if (!selectedCustomer?.vehicles) return [];
    return selectedCustomer.vehicles;
  }, [selectedCustomer]);

  const filteredTechnicians = useMemo(() => {
    const q = technicianSearch.trim().toLowerCase();
    if (!q) return technicians;
    return technicians.filter((t) => t.toLowerCase().includes(q));
  }, [technicians, technicianSearch]);

  const filteredParts = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    const currentIds = new Set(selectedParts.map((p) => p.partId));

    return parts
      .filter((p) => !currentIds.has(p.id))
      .filter((p) => {
        if (!partCategoryFilter) return true;
        return String(p.category || '').trim() === partCategoryFilter;
      })
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? '').toLowerCase().includes(q) ||
          (p.barcode ?? '').toLowerCase().includes(q) ||
          (p.category ?? '').toLowerCase().includes(q)
        );
      })
      .slice(0, 25);
  }, [parts, partSearch, selectedParts, partCategoryFilter]);

  const partCategories = useMemo(() => {
    const set = new Set<string>();
    parts.forEach((p) => {
      const c = String(p.category || '').trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [parts]);

  const laborNum = toNumber(laborCost);
  const partsTotal = selectedParts.reduce((sum, p) => sum + p.quantity * p.sellingPrice, 0);
  const servicesTotal = services.reduce((sum, s) => sum + s.quantity * s.sellingPrice, 0);
  const subtotal = laborNum + partsTotal + servicesTotal;

  const rawDiscount = toNumber(discount);
  const discountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return Math.max(0, Math.min(100, rawDiscount)) * subtotal / 100;
    }
    return Math.max(0, rawDiscount);
  }, [discountType, rawDiscount, subtotal]);

  const total = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);

  const depositNum = useDeposit ? Math.max(0, toNumber(depositAmount)) : 0;
  const partialNum = status === 'Trả máy' && showPaymentInput ? Math.max(0, toNumber(partialAmount)) : 0;
  const returnCollectMax = Math.max(0, total - depositNum);
  const totalPaid = Math.min(total, Math.max(0, depositNum + partialNum));
  const remainingAmount = Math.max(0, total - totalPaid);
  const hasCustomerInfo = customerName.trim().length > 0;
  const hasVehicleInfo = vehicleModel.trim().length > 0 || licensePlate.trim().length > 0;
  const infoReady = hasCustomerInfo && hasVehicleInfo && issueDescription.trim().length > 0 && technicianName.trim().length > 0;

  useEffect(() => {
    if (status !== 'Trả máy') {
      setShowPaymentInput(false);
      setPartialAmount('0');
    }
  }, [status]);

  useEffect(() => {
    if (!showPaymentInput) return;

    const maxCollect = Math.max(0, total - depositNum);
    const currentPartial = Math.max(0, toNumber(partialAmount));
    if (currentPartial > maxCollect) {
      setPartialAmount(String(maxCollect));
    }
  }, [showPaymentInput, partialAmount, total, depositNum]);

  useEffect(() => {
    if (activeTab !== 'info') return;

    if (!infoReady) {
      if (didAutoAdvanceInfo) setDidAutoAdvanceInfo(false);
      return;
    }

    if (!didAutoAdvanceInfo) {
      setDidAutoAdvanceInfo(true);
      setActiveTab('parts');
    }
  }, [activeTab, infoReady, didAutoAdvanceInfo]);

  const handleTabPress = (tab: TopTab) => {
    if (tab === 'info') {
      setActiveTab('info');
      return;
    }

    if (!infoReady) {
      Alert.alert('Cần bổ sung thông tin', 'Vui lòng chọn khách/xe, mô tả tình trạng và kỹ thuật viên trước.');
      setActiveTab('info');
      return;
    }

    setActiveTab(tab);
  };

  const createMutation = useMutation({
    mutationFn: async (submitAction: SubmitAction = 'save') => {
      const name = customerName.trim();
      const phone = customerPhone.trim();
      const model = vehicleModel.trim();
      const plate = licensePlate.trim();
      const issue = issueDescription.trim();

      if (!name) throw new Error('Vui long nhap ten khach hang');
      if (!phone) throw new Error('Vui long nhap so dien thoai');
      if (!model) throw new Error('Vui long nhap dong xe');
      if (!plate) throw new Error('Vui long nhap bien so xe');
      if (!issue) throw new Error('Vui long nhap mo ta tinh trang xe');
      if (!technicianName.trim()) throw new Error('Vui long chon ky thuat vien');

      const normalizedDeposit = useDeposit ? Math.max(0, toNumber(depositAmount)) : 0;
      const normalizedPartial = status === 'Trả máy' && showPaymentInput ? Math.max(0, toNumber(partialAmount)) : 0;
      if (normalizedDeposit > 0 && total === 0) {
        throw new Error('Tong tien bang 0, khong can dat coc');
      }
      if (normalizedDeposit > total) {
        throw new Error('So tien dat coc khong duoc lon hon tong tien');
      }
      if (submitAction === 'deposit' && normalizedDeposit <= 0) {
        throw new Error('Vui long nhap so tien dat coc hop le');
      }

      const maxPartial = Math.max(0, total - normalizedDeposit);
      if (normalizedPartial > maxPartial) {
        throw new Error('So tien thanh toan tra xe khong duoc lon hon so tien con lai');
      }

      let normalizedTotalPaid = Math.min(total, normalizedDeposit + normalizedPartial);
      let normalizedPaymentStatus: PaymentStatus;
      if (submitAction === 'pay') {
        normalizedTotalPaid = total;
        normalizedPaymentStatus = 'paid';
      } else if (submitAction === 'deposit') {
        normalizedTotalPaid = Math.min(total, normalizedDeposit);
        normalizedPaymentStatus = normalizedTotalPaid > 0 ? 'partial' : 'unpaid';
      } else if (normalizedTotalPaid <= 0) {
        normalizedPaymentStatus = 'unpaid';
      } else if (normalizedTotalPaid >= total && total > 0) {
        normalizedPaymentStatus = 'paid';
      } else {
        normalizedPaymentStatus = 'partial';
      }

      const normalizedRemaining = Math.max(0, total - normalizedTotalPaid);

      const id = `wo-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const nowIso = new Date().toISOString();

      const payload: Record<string, unknown> = {
        id,
        creationDate: nowIso,
        customerId: selectedCustomer?.id ?? null,
        customerName: name,
        customerPhone: customerPhone.trim() || null,
        vehicleModel: vehicleModel.trim() || null,
        licensePlate: licensePlate.trim() || null,
        currentKm: currentKm.trim() ? toNumber(currentKm) : null,
        issueDescription: issue,
        technicianName: technicianName.trim(),
        status,
        laborCost: laborNum,
        discount: Math.round(discountAmount),
        partsUsed: selectedParts.map((p) => ({
          partId: p.partId,
          partName: p.partName,
          sku: p.sku,
          quantity: p.quantity,
          price: p.sellingPrice,
          costPrice: p.costPrice,
        })),
        additionalServices: services.map((s) => ({
          id: s.id,
          description: s.name,
          quantity: s.quantity,
          price: s.sellingPrice,
          costPrice: s.costPrice,
        })),
        notes: notes.trim() || null,
        total,
        branchId: BRANCH_ID,
        depositAmount: normalizedDeposit > 0 ? normalizedDeposit : null,
        paymentStatus: normalizedPaymentStatus,
        paymentMethod,
        totalPaid: normalizedTotalPaid > 0 ? normalizedTotalPaid : 0,
        remainingAmount: normalizedRemaining,
        paymentDate: normalizedPaymentStatus === 'paid' ? nowIso : null,
      };

      const { error } = await supabase.from('work_orders').insert(payload);
      if (error) throw error;

      try {
        const { data: authData } = await supabase.auth.getUser();
        await supabase.from('audit_logs').insert({
          user_id: authData.user?.id ?? null,
          action: 'work_order.create_mobile',
          table_name: 'work_orders',
          record_id: id,
          old_data: null,
          new_data: payload,
        });
      } catch {
        // Keep creation successful even if audit logging fails.
      }

      return id;
    },
    onSuccess: (newId) => {
      queryClient.invalidateQueries({ queryKey: ['workorders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-live'] });
      queryClient.invalidateQueries({ queryKey: ['mobile-connection-stats'] });

      Alert.alert('Thanh cong', 'Da tao phieu sua moi', [
        {
          text: 'Xem chi tiet',
          onPress: () =>
            router.replace({
              pathname: '/(tabs)/workorder-detail/[id]',
              params: { id: newId },
            }),
        },
        { text: 'Ve danh sach', onPress: () => router.replace('/(tabs)/workorders') },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Lỗi tạo phiếu', err?.message || 'Không thể tạo phiếu sửa');
    },
  });

  const pickCustomer = (c: CustomerOption) => {
    const mainVehicle = c.vehicles?.find((v) => v.isPrimary) || c.vehicles?.[0];
    setSelectedCustomer(c);
    setCustomerName(c.name || '');
    setCustomerPhone(c.phone || '');
    setVehicleModel(mainVehicle?.model || '');
    setLicensePlate(mainVehicle?.licensePlate || '');
    setEditCustomerInfo(false);
    setEditVehicleInfo(false);
    setShowCustomerSearch(false);
  };

  const addPart = (part: PartOption) => {
    const stockQty = fromBranchValue(part.stock, BRANCH_ID);
    setSelectedParts((prev) => [
      ...prev,
      {
        partId: part.id,
        partName: part.name,
        sku: part.sku,
        quantity: 1,
        sellingPrice: fromBranchValue(part.retailPrice, BRANCH_ID),
        costPrice: fromBranchValue(part.costPrice, BRANCH_ID),
        stockQty,
      },
    ]);
  };

  const updatePart = (partId: string, updates: Partial<SelectedPart>) => {
    setSelectedParts((prev) => prev.map((p) => (p.partId === partId ? { ...p, ...updates } : p)));
  };

  const removePart = (partId: string) => {
    setSelectedParts((prev) => prev.filter((p) => p.partId !== partId));
  };

  const addService = () => {
    const name = serviceName.trim();
    if (!name) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên dịch vụ/gia công');
      return;
    }

    const qty = Math.max(1, toNumber(serviceQty));
    const sell = Math.max(0, toNumber(servicePrice));
    const cost = Math.max(0, toNumber(serviceCostPrice));

    setServices((prev) => [
      ...prev,
      {
        id: `srv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name,
        quantity: qty,
        sellingPrice: sell,
        costPrice: cost,
      },
    ]);

    setServiceName('');
    setServiceQty('1');
    setServicePrice('0');
    setServiceCostPrice('0');
    setShowServiceModal(false);
  };

  const addQuickService = () => {
    if (!serviceName.trim()) setServiceName('Dịch vụ ngoài');
    setShowServiceModal(true);
  };

  const updateService = (id: string, updates: Partial<ServiceItem>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const openScanner = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Thiếu quyền camera', 'Vui lòng cấp quyền camera để quét mã phụ tùng.');
        return;
      }
    }
    setScanLocked(false);
    setShowScannerModal(true);
  };

  const handleScannedCode = (rawCode: string) => {
    const code = String(rawCode || '').trim();
    if (!code || scanLocked) return;

    setScanLocked(true);
    setPartSearch(code);

    const found = filteredParts.find(
      (p) =>
        String(p.sku || '').toLowerCase() === code.toLowerCase() ||
        String(p.barcode || '').toLowerCase() === code.toLowerCase()
    );

    if (found) {
      addPart(found);
      Alert.alert('Đã quét mã', `Đã thêm: ${found.name}`);
      setPartSearch('');
    }

    setShowScannerModal(false);
    setTimeout(() => setScanLocked(false), 800);
  };

  const saveVehicleToCustomer = async () => {
    if (!selectedCustomer) {
      Alert.alert('Thông báo', 'Vui lòng chọn khách hàng trước khi lưu xe mới.');
      return;
    }

    const nextModel = vehicleModel.trim();
    const nextPlate = licensePlate.trim();

    if (!nextModel && !nextPlate) {
      Alert.alert('Thông báo', 'Vui lòng nhập dòng xe hoặc biển số để lưu xe mới.');
      return;
    }

    const currentVehicles = selectedCustomer.vehicles ?? [];
    const plateLower = nextPlate.toLowerCase();
    const modelLower = nextModel.toLowerCase();

    const existingIndex = currentVehicles.findIndex((v) => {
      const vPlate = String(v.licensePlate ?? '').trim().toLowerCase();
      const vModel = String(v.model ?? '').trim().toLowerCase();
      if (plateLower) return vPlate === plateLower;
      return modelLower && vModel === modelLower;
    });

    const payloadVehicle: CustomerVehicle = {
      id: currentVehicles[existingIndex]?.id || `veh-${Date.now()}`,
      model: nextModel || 'Xe máy',
      licensePlate: nextPlate,
      isPrimary: currentVehicles.length === 0,
    };

    const nextVehicles =
      existingIndex >= 0
        ? currentVehicles.map((v, idx) => (idx === existingIndex ? { ...v, ...payloadVehicle } : v))
        : [...currentVehicles, payloadVehicle];

    setIsSavingVehicle(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({ vehicles: nextVehicles })
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      setSelectedCustomer((prev) => (prev ? { ...prev, vehicles: nextVehicles } : prev));
      setEditVehicleInfo(false);
      queryClient.invalidateQueries({ queryKey: ['workorder-form-customers'] });
      Alert.alert('Thành công', 'Đã lưu xe mới vào hồ sơ khách hàng.');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể lưu xe mới. Vui lòng thử lại.');
    } finally {
      setIsSavingVehicle(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.mobileHeader, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity style={styles.headerSideBtn} onPress={goToWorkorders}>
          <Feather name="x" size={20} color="#D6E0F4" />
        </TouchableOpacity>
        <View style={[styles.headerTitleWrap, { alignItems: 'flex-start' }]}>
          <Text style={styles.headerTitle}>Tạo phiếu mới</Text>
        </View>
        <View style={styles.headerSideGhost} />
      </View>

      <View style={styles.topTabBar}>
        <TouchableOpacity style={[styles.topTabBtn, activeTab === 'info' && styles.topTabBtnActive]} onPress={() => handleTabPress('info')}>
          <Feather name="user" size={16} color={activeTab === 'info' ? '#4F97FF' : '#8693A8'} />
          <Text style={[styles.topTabText, activeTab === 'info' && styles.topTabTextActive]}>THÔNG TIN</Text>
          {activeTab === 'info' ? <View style={styles.topTabUnderline} /> : null}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.topTabBtn, activeTab === 'parts' && styles.topTabBtnActive]} onPress={() => handleTabPress('parts')}>
          <MaterialCommunityIcons name="cube-outline" size={17} color={activeTab === 'parts' ? '#4F97FF' : '#8693A8'} />
          <Text style={[styles.topTabText, activeTab === 'parts' && styles.topTabTextActive]}>PHỤ TÙNG</Text>
          {activeTab === 'parts' ? <View style={styles.topTabUnderline} /> : null}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.topTabBtn, activeTab === 'payment' && styles.topTabBtnActive]} onPress={() => handleTabPress('payment')}>
          <MaterialCommunityIcons name="cash-multiple" size={16} color={activeTab === 'payment' ? '#4F97FF' : '#8693A8'} />
          <Text style={[styles.topTabText, activeTab === 'payment' && styles.topTabTextActive]}>T.TOÁN</Text>
          {activeTab === 'payment' ? <View style={styles.topTabUnderline} /> : null}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.content}>
        {activeTab === 'info' ? (
          <>
            <View style={styles.tabSection}>
              <Text style={styles.segmentLabel}>TRẠNG THÁI SỬA CHỮA</Text>
              <View style={styles.statusSegmentWrap}>
                {[
                  { statusKey: 'Tiếp nhận' as WorkOrderStatus, shortLabel: 'Nhận', icon: 'file-document-outline' as const },
                  { statusKey: 'Đang sửa' as WorkOrderStatus, shortLabel: 'Sửa', icon: 'wrench-outline' as const },
                  { statusKey: 'Đã sửa xong' as WorkOrderStatus, shortLabel: 'Xong' },
                  { statusKey: 'Trả máy' as WorkOrderStatus, shortLabel: 'Trả', icon: 'motorbike' as const },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.statusKey}
                    style={[
                      styles.statusSegmentBtn,
                      status === s.statusKey && styles.statusSegmentBtnActive,
                    ]}
                    onPress={() => setStatus(s.statusKey)}
                  >
                    <MaterialCommunityIcons
                      name={s.icon || 'check-circle-outline'}
                      size={16}
                      color={status === s.statusKey ? '#FFFFFF' : '#64748B'}
                    />
                    <Text style={[styles.statusSegmentText, status === s.statusKey && styles.statusSegmentTextActive]}>{s.shortLabel}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.microLabel}>KỸ THUẬT VIÊN PHỤ TRÁCH *</Text>
              <TouchableOpacity style={styles.techPickerBtn} onPress={() => setShowTechnicianModal(true)}>
                <View style={styles.inlineIconTitleRow}>
                  <Feather name="users" size={15} color="#9CB4D9" />
                  <Text style={styles.techPickerText}>{technicianName || 'Chọn kỹ thuật viên'}</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#8EA0BF" />
              </TouchableOpacity>
              {technicians.length === 0 ? <Text style={styles.helperText}>Chưa có danh sách KTV, vui lòng tạo trong bảng employees.</Text> : null}
            </View>

            <View style={styles.tabSection}>
              <Text style={styles.microLabel}>THÔNG TIN KHÁCH HÀNG</Text>
              {showCustomerSearch ? (
                <View style={styles.sectionInnerGroup}>
                  <View style={styles.searchInputWrap}>
                    <Feather name="search" size={16} color="#8A96AB" style={styles.searchPrefixIcon} />
                    <TextInput
                      style={styles.searchInput}
                      value={customerSearch}
                      onChangeText={handleCustomerSearchChange}
                      placeholder="Tìm tên, SDT hoặc biển số xe..."
                      placeholderTextColor="#8A96AB"
                      autoCapitalize="none"
                    />
                  </View>
                  {customerLoading ? (
                    <View style={styles.loadingInline}><ActivityIndicator size="small" color="#63A8FF" /></View>
                  ) : (
                    <View style={styles.customerListWrap}>
                      {filteredCustomers.map((c) => (
                        <TouchableOpacity key={c.id} style={styles.customerTile} activeOpacity={0.86} onPress={() => pickCustomer(c)}>
                          <View style={styles.customerAvatarLg}><Text style={styles.customerAvatarText}>{c.name.charAt(0).toUpperCase()}</Text></View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.customerName}>{c.name}</Text>
                            <Text style={styles.customerPhone}>{c.phone || 'Không có SDT'}</Text>
                          </View>
                          <Text style={styles.customerArrow}>›</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={styles.addNewCustomerHint}
                        onPress={() => {
                          setCustomerName(customerSearch);
                          setSelectedCustomer(null);
                          setEditCustomerInfo(true);
                          setShowCustomerSearch(false);
                        }}
                      >
                        <Text style={styles.addNewCustomerText}>+ Dùng tên vừa tìm để tạo khách mới</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.sectionInnerGroup}>
                  <View style={styles.selectedCustomerCard}>
                    <View style={styles.customerAvatarLg}><Text style={styles.customerAvatarText}>{(customerName || 'K').charAt(0).toUpperCase()}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerName}>{customerName || 'Khach moi'}</Text>
                      <Text style={styles.customerPhone}>{customerPhone || 'Chưa có số điện thoại'}</Text>
                    </View>
                    <TouchableOpacity style={styles.iconMiniBtn} onPress={() => setEditCustomerInfo((prev) => !prev)}>
                      <Feather name={editCustomerInfo ? 'check' : 'edit-2'} size={14} color="#9CC2FF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconMiniBtn}
                      onPress={() => {
                        setEditCustomerInfo(false);
                        setShowCustomerSearch(true);
                      }}
                    >
                      <Feather name="refresh-cw" size={14} color="#9CC2FF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconMiniBtn}
                      onPress={() => {
                        setSelectedCustomer(null);
                        setCustomerName('');
                        setCustomerPhone('');
                        setVehicleModel('');
                        setLicensePlate('');
                        setEditCustomerInfo(false);
                        setEditVehicleInfo(false);
                        setShowCustomerSearch(true);
                      }}
                    >
                      <Feather name="x" size={15} color="#A5B1C6" />
                    </TouchableOpacity>
                  </View>

                  {editCustomerInfo || !selectedCustomer ? (
                    <>
                      <Field label="Tên khách hàng *" value={customerName} onChangeText={setCustomerName} placeholder="Nguyễn Văn A" />
                      <Field label="Số điện thoại" value={customerPhone} onChangeText={setCustomerPhone} placeholder="09xxxxxxx" keyboardType="phone-pad" />
                    </>
                  ) : (
                    <Text style={styles.helperText}>Nhấn icon bút để chỉnh sửa tên và số điện thoại.</Text>
                  )}
                </View>
              )}
            </View>

            <View style={styles.tabSection}>
              <Text style={styles.microLabel}>THÔNG TIN XE & TIẾP NHẬN</Text>
              <View style={styles.sectionInnerGroup}>
                {customerVehicles.length > 0 ? (
                  <View style={styles.vehicleList}>
                    {customerVehicles.map((v, idx) => {
                      const active = v.licensePlate === licensePlate && v.model === vehicleModel;
                      return (
                        <TouchableOpacity
                          key={`${v.id || idx}`}
                          style={[styles.vehicleTile, active && styles.vehicleTileActive]}
                          activeOpacity={0.86}
                          onPress={() => {
                            setVehicleModel(v.model || '');
                            setLicensePlate(v.licensePlate || '');
                            setEditVehicleInfo(false);
                          }}
                        >
                          <View style={styles.vehicleAvatar}><Text style={styles.vehicleAvatarText}>🏍</Text></View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.vehicleTileTitle, active && styles.vehicleTileTitleActive]}>{v.model || 'Xe máy'}</Text>
                            <Text style={[styles.vehicleTileSub, active && styles.vehicleTileSubActive]}>{v.licensePlate || 'Chưa có biển số'}</Text>
                          </View>
                          <Text style={[styles.customerArrow, active && { color: '#D9E8FF' }]}>{active ? '✓' : '›'}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}

                {hasVehicleInfo && !editVehicleInfo ? (
                  <View style={styles.selectedVehicleCard}>
                    <View style={styles.vehicleAvatar}><Text style={styles.vehicleAvatarText}>🏍</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectedVehicleTitle}>{vehicleModel || 'Xe máy'}</Text>
                      <Text style={styles.selectedVehicleSub}>{licensePlate || 'Chưa có biển số'}</Text>
                    </View>
                    <TouchableOpacity style={styles.iconMiniBtn} onPress={() => setEditVehicleInfo(true)}>
                      <Feather name="edit-2" size={14} color="#9CC2FF" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.addVehicleBtn}
                  onPress={() => {
                    setVehicleModel('');
                    setLicensePlate('');
                    setEditVehicleInfo(true);
                  }}
                >
                  <Feather name="plus" size={16} color="#61A8FF" />
                  <Text style={styles.addVehicleBtnText}>Thêm xe mới</Text>
                </TouchableOpacity>

                {editVehicleInfo || !hasVehicleInfo ? (
                  <>
                    <Field label="Biển số" value={licensePlate} onChangeText={setLicensePlate} placeholder="59X1-123.45" />
                    <Field label="Dòng xe" value={vehicleModel} onChangeText={setVehicleModel} placeholder="Honda Vision" />
                    {selectedCustomer ? (
                      <TouchableOpacity
                        style={[styles.saveVehicleBtn, isSavingVehicle ? { opacity: 0.7 } : null]}
                        disabled={isSavingVehicle}
                        onPress={saveVehicleToCustomer}
                      >
                        <Feather name="save" size={14} color="#D7E8FF" />
                        <Text style={styles.saveVehicleBtnText}>{isSavingVehicle ? 'Đang lưu xe...' : 'Lưu xe mới cho khách'}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.helperText}>Nhấn icon bút để chỉnh sửa thông tin xe đã chọn.</Text>
                )}

                <Field label="Số KM hiện tại" value={currentKm} onChangeText={setCurrentKm} keyboardType="numeric" placeholder="12500" />
                <Field
                  label="Mô tả tình trạng xe *"
                  value={issueDescription}
                  onChangeText={setIssueDescription}
                  placeholder="Xe đề khó nổ, hao xăng, dừng đèn đỏ máy bị tắt..."
                  multiline
                />
                <Field label="Ghi chú" value={notes} onChangeText={setNotes} placeholder="Lưu ý linh kiện theo xe" multiline />
              </View>
            </View>

            <View style={styles.tabSectionAction}>
              <TouchableOpacity style={styles.nextTabBtn} onPress={() => handleTabPress('parts')}>
                <Text style={styles.nextTabText}>Tiếp tục: Phụ tùng & Dịch vụ ›</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {activeTab === 'parts' ? (
          <>
          {!hasCustomerInfo || !hasVehicleInfo ? (
            <View style={styles.tabSection}>
              <View style={styles.warningBox}>
                <Text style={styles.warningIconText}>!</Text>
                <Text style={styles.warningText}>Vui lòng chọn khách hàng và xe trước khi thêm phụ tùng.</Text>
                <TouchableOpacity style={styles.warningActionBtn} onPress={() => setActiveTab('info')}>
                  <Text style={styles.warningActionText}>Quay lại THÔNG TIN</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.tabSection}>
                <View style={styles.actionCardsRow}>
                  <TouchableOpacity style={styles.actionCard} onPress={() => setShowPartModal(true)}>
                    <Text style={styles.actionCardTitle}>THÊM PHỤ TÙNG</Text>
                    <Text style={styles.actionCardSub}>Tìm kiếm theo tên/SKU hoặc quét mã</Text>
                    <Text style={styles.actionCardCount}>{selectedParts.length} mon</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionCardSecondary} onPress={addQuickService}>
                    <Text style={styles.actionCardTitle}>THÊM DỊCH VỤ NGOÀI</Text>
                    <Text style={styles.actionCardSub}>Nhập công việc gia công nhanh</Text>
                    <Text style={styles.actionCardCount}>{services.length} muc</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.blockHeader}>
                  <Text style={styles.microLabel}>PHỤ TÙNG SỬ DỤNG</Text>
                  <Text style={styles.blockBadge}>{selectedParts.length} mon</Text>
                </View>
                <TouchableOpacity style={styles.openPartModalBtn} onPress={() => setShowPartModal(true)}>
                  <Text style={styles.openPartModalText}>+ Thêm phụ tùng</Text>
                </TouchableOpacity>

                <View style={styles.sectionInnerGroup}>
                  {selectedParts.map((p) => (
                    <View key={p.partId} style={[styles.selectedLine, p.quantity > p.stockQty ? styles.selectedLineWarn : null]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.selectedTitle}>{p.partName}</Text>
                        <Text style={styles.selectedMeta}>{p.sku || 'Không SKU'} • Tồn: {p.stockQty}</Text>
                        {p.quantity > p.stockQty ? (
                          <Text style={styles.stockWarnText}>Vượt tồn kho: đang chọn {p.quantity}, tồn còn {p.stockQty}</Text>
                        ) : null}
                      </View>
                      <View style={styles.qtyWrap}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updatePart(p.partId, { quantity: Math.max(1, p.quantity - 1) })}>
                          <Text style={styles.qtyBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{p.quantity}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updatePart(p.partId, { quantity: p.quantity + 1 })}>
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.priceInput}
                        value={String(p.sellingPrice)}
                        onChangeText={(v) => updatePart(p.partId, { sellingPrice: Math.max(0, toNumber(v)) })}
                        keyboardType="numeric"
                      />
                      <TouchableOpacity style={styles.removeBtn} onPress={() => removePart(p.partId)}>
                        <Text style={styles.removeBtnText}>x</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.tabSection}>
                <View style={styles.blockHeader}>
                  <Text style={styles.microLabel}>DỊCH VỤ & GIA CÔNG</Text>
                  <Text style={[styles.blockBadge, styles.blockBadgeOrange]}>{services.length} muc</Text>
                </View>
                <View style={styles.sectionInnerGroup}>
                  <TouchableOpacity style={styles.addServiceBtn} onPress={() => setShowServiceModal(true)}>
                    <Text style={styles.addServiceBtnText}>+ Thêm dịch vụ gia công</Text>
                  </TouchableOpacity>

                  {services.map((s) => (
                    <View key={s.id} style={styles.selectedLine}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.selectedTitle}>{s.name}</Text>
                        <Text style={styles.selectedMeta}>SL: {s.quantity} • Von: {formatCurrency(s.costPrice)}</Text>
                      </View>
                      <TextInput
                        style={styles.priceInput}
                        value={String(s.sellingPrice)}
                        onChangeText={(v) => updateService(s.id, { sellingPrice: Math.max(0, toNumber(v)) })}
                        keyboardType="numeric"
                      />
                      <TouchableOpacity style={styles.removeBtn} onPress={() => removeService(s.id)}>
                        <Text style={styles.removeBtnText}>x</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.tabSectionAction}>
                <TouchableOpacity style={styles.nextTabBtn} onPress={() => handleTabPress('payment')}>
                  <Text style={styles.nextTabText}>Tiếp tục: Thanh toán ›</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          </>
        ) : null}

        {activeTab === 'payment' ? (
          <>
          <View style={styles.tabSection}>
            <View style={styles.paymentCostCard}>
              <View style={styles.paymentSectionHeadRow}>
                <View style={styles.paymentSectionHeadIconBlue}>
                  <Feather name="trending-up" size={14} color="#60A5FA" />
                </View>
                <Text style={styles.paymentSectionTitle}>CHI TIẾT CHI PHÍ</Text>
              </View>

              <View style={styles.laborInputRow}>
                <Text style={styles.paymentTinyLabel}>TIỀN CÔNG THỢ</Text>
                <View style={styles.laborInputValueWrap}>
                  <Text style={styles.currencyPrefix}>₫</Text>
                  <TextInput
                    style={styles.laborInput}
                    value={laborCost}
                    onChangeText={setLaborCost}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#8A96AB"
                  />
                </View>
              </View>

              <View style={styles.inlineSummaryRow}>
                <View style={styles.inlineSummaryBox}>
                  <Text style={styles.inlineSummaryLabel}>PHỤ TÙNG</Text>
                  <Text style={styles.inlineSummaryValue}>{formatCurrency(partsTotal)}</Text>
                </View>
                <View style={styles.inlineSummaryBox}>
                  <Text style={styles.inlineSummaryLabel}>GIA CÔNG</Text>
                  <Text style={styles.inlineSummaryValue}>{formatCurrency(servicesTotal)}</Text>
                </View>
              </View>

              <View style={styles.discountWrapCard}>
                <View style={styles.discountHeaderRow}>
                  <Text style={styles.discountLabel}>% GIẢM GIÁ</Text>
                  <View style={styles.discountTypeSwitch}>
                    <TouchableOpacity style={[styles.discountTypeBtn, discountType === 'amount' && styles.discountTypeBtnActive]} onPress={() => setDiscountType('amount')}>
                      <Text style={[styles.discountTypeText, discountType === 'amount' && styles.discountTypeTextActive]}>VNĐ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.discountTypeBtn, discountType === 'percent' && styles.discountTypeBtnActive]} onPress={() => setDiscountType('percent')}>
                      <Text style={[styles.discountTypeText, discountType === 'percent' && styles.discountTypeTextActive]}>%</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TextInput
                  style={styles.discountInput}
                  value={discount}
                  onChangeText={setDiscount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#8A96AB"
                />

                {discountType === 'percent' ? (
                  <View style={styles.discountPresetRow}>
                    <TouchableOpacity style={styles.discountPresetBtn} onPress={() => setDiscount('10')}><Text style={styles.discountPresetText}>-10%</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.discountPresetBtn} onPress={() => setDiscount('20')}><Text style={styles.discountPresetText}>-20%</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.discountPresetBtn} onPress={() => setDiscount('50')}><Text style={styles.discountPresetText}>-50%</Text></TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.tabSection}>
            <View style={styles.paymentMainCard}>
              <View style={styles.paymentSectionHeadRowBetween}>
                <View style={styles.paymentSectionHeadRow}>
                  <View style={styles.paymentSectionHeadIconPurple}>
                    <Feather name="credit-card" size={14} color="#A78BFA" />
                  </View>
                  <Text style={styles.paymentSectionTitle}>THANH TOÁN</Text>
                </View>

                <View style={styles.depositToggleWrap}>
                  <Text style={[styles.depositToggleText, useDeposit && styles.depositToggleTextActive]}>CỌC TRƯỚC</Text>
                  <TouchableOpacity
                    style={[styles.toggle, useDeposit && styles.toggleActive]}
                    onPress={() => setUseDeposit(!useDeposit)}
                  >
                    <View style={[styles.toggleDot, useDeposit && styles.toggleDotActive]} />
                  </TouchableOpacity>
                </View>
              </View>

              {useDeposit ? (
                <View style={styles.depositInputCard}>
                  <Text style={styles.depositInputLabel}>SỐ TIỀN ĐẶT CỌC</Text>
                  <TextInput
                    style={styles.depositInput}
                    value={depositAmount}
                    onChangeText={setDepositAmount}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#8A96AB"
                  />
                </View>
              ) : null}

              <View style={styles.paymentMethodRow}>
                <TouchableOpacity style={[styles.methodBtn, paymentMethod === 'cash' && styles.methodBtnActiveCash]} onPress={() => setPaymentMethod('cash')}>
                  <MaterialCommunityIcons name="cash-multiple" size={24} color={paymentMethod === 'cash' ? '#7EE7B2' : '#AAB6CA'} />
                  <Text style={[styles.methodBtnText, paymentMethod === 'cash' && styles.methodBtnTextActive]}>TIỀN MẶT</Text>
                  {paymentMethod === 'cash' ? <View style={styles.methodActiveDot} /> : null}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.methodBtn, paymentMethod === 'bank' && styles.methodBtnActiveBank]} onPress={() => setPaymentMethod('bank')}>
                  <MaterialCommunityIcons name="bank" size={24} color={paymentMethod === 'bank' ? '#8CC8FF' : '#AAB6CA'} />
                  <Text style={[styles.methodBtnText, paymentMethod === 'bank' && styles.methodBtnTextActive]}>CHUYỂN KHOẢN</Text>
                  {paymentMethod === 'bank' ? <View style={[styles.methodActiveDot, { backgroundColor: '#60A5FA' }]} /> : null}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {status === 'Trả máy' ? (
            <View style={styles.tabSection}>
              <View style={styles.returnPaymentCard}>
                <View style={styles.paymentSectionHeadRowBetween}>
                  <View style={styles.paymentSectionHeadRow}>
                    <View style={styles.paymentSectionHeadIconGreen}>
                      <Feather name="check-circle" size={15} color="#86EFAC" />
                    </View>
                    <Text style={styles.paymentSectionTitle}>THANH TOÁN TRẢ XE</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.toggle, showPaymentInput && styles.toggleActiveGreen]}
                    onPress={() => {
                      const next = !showPaymentInput;
                      setShowPaymentInput(next);
                      setPartialAmount(next ? String(returnCollectMax) : '0');
                    }}
                  >
                    <View style={[styles.toggleDot, showPaymentInput && styles.toggleDotActive]} />
                  </TouchableOpacity>
                </View>

                {showPaymentInput ? (
                  <>
                    <TextInput
                      style={styles.returnPaymentInput}
                      value={partialAmount}
                      onChangeText={setPartialAmount}
                      keyboardType="numeric"
                      placeholder="Nhập số tiền..."
                      placeholderTextColor="#97A8BE"
                    />
                    <View style={styles.returnPaymentPresetRow}>
                      <TouchableOpacity style={styles.returnPaymentPresetBtn} onPress={() => setPartialAmount('0')}>
                        <Text style={styles.returnPaymentPresetText}>0%</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.returnPaymentPresetBtn} onPress={() => setPartialAmount(String(Math.round(returnCollectMax * 0.5)))}>
                        <Text style={styles.returnPaymentPresetText}>50%</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.returnPaymentPresetBtn, styles.returnPaymentPresetBtnActive]} onPress={() => setPartialAmount(String(returnCollectMax))}>
                        <Text style={[styles.returnPaymentPresetText, styles.returnPaymentPresetTextActive]}>100%</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={styles.tabSection}>
            <View style={styles.summaryCardModern}>
              <Text style={styles.summaryHeading}>TỔNG THANH TOÁN</Text>
              <View style={styles.summaryAmountRow}>
                <Text style={styles.summaryAmountMain}>{formatCurrency(total).replace('₫', '').trim()}</Text>
                <Text style={styles.summaryAmountUnit}>₫</Text>
              </View>

              <View style={styles.separator} />

              {discountAmount > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Đã giảm giá</Text>
                  <Text style={[styles.summaryValue, { color: '#FB7185' }]}>-{formatCurrency(Math.round(discountAmount))}</Text>
                </View>
              ) : null}

              {totalPaid > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Đã thanh toán (cọc/trả xe)</Text>
                  <Text style={[styles.summaryValue, { color: '#60A5FA' }]}>-{formatCurrency(totalPaid)}</Text>
                </View>
              ) : null}

              <View style={[styles.summaryRow, { marginTop: 2 }]}> 
                <Text style={styles.summaryRemainLabel}>Còn lại cần thu</Text>
                <Text style={[styles.summaryRemainValue, remainingAmount === 0 ? styles.summaryRemainValueDone : null]}>{formatCurrency(remainingAmount)}</Text>
              </View>
            </View>
          </View>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.stickyFooter}>
        <TouchableOpacity style={styles.cancelBtn} onPress={goToWorkorders}>
          <Text style={styles.cancelBtnText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, createMutation.isPending && { opacity: 0.6 }]}
          disabled={createMutation.isPending}
          onPress={() => createMutation.mutate('save')}
        >
          {createMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>💾 LƯU</Text>}
        </TouchableOpacity>
        {status === 'Trả máy' ? (
          <TouchableOpacity
            style={[styles.payBtn, createMutation.isPending && { opacity: 0.6 }]}
            disabled={createMutation.isPending}
            onPress={() => createMutation.mutate('pay')}
          >
            <Text style={styles.payBtnText}>✅ THANH TOÁN</Text>
          </TouchableOpacity>
        ) : useDeposit && depositNum > 0 ? (
          <TouchableOpacity
            style={[styles.depositBtn, createMutation.isPending && { opacity: 0.6 }]}
            disabled={createMutation.isPending}
            onPress={() => createMutation.mutate('deposit')}
          >
            <Text style={styles.depositBtnText}>ĐẶT CỌC</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal visible={showTechnicianModal} transparent animationType="slide" onRequestClose={() => setShowTechnicianModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <View style={styles.inlineIconTitleRow}>
                <Feather name="users" size={16} color="#EAF2FF" />
                <Text style={styles.modalTitle}>Chọn kỹ thuật viên</Text>
              </View>
              <TouchableOpacity style={styles.modalIconCloseBtn} onPress={() => setShowTechnicianModal(false)}>
                <Feather name="x" size={20} color="#D2DFF6" />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchInputWrap, { marginTop: 10 }]}> 
              <Feather name="search" size={16} color="#8A96AB" style={styles.searchPrefixIcon} />
              <TextInput
                style={styles.searchInput}
                value={technicianSearch}
                onChangeText={setTechnicianSearch}
                placeholder="Tìm kỹ thuật viên..."
                placeholderTextColor="#8A96AB"
              />
            </View>

            <ScrollView style={{ marginTop: 10, maxHeight: 380 }}>
              <View style={styles.techCardList}>
                {filteredTechnicians.map((tech) => {
                  const active = technicianName === tech;
                  return (
                    <TouchableOpacity
                      key={tech}
                      style={[styles.techCardItem, active && styles.techCardItemActive]}
                      onPress={() => {
                        setTechnicianName(tech);
                        setShowTechnicianModal(false);
                      }}
                    >
                      <View style={styles.techAvatar}>
                        <Text style={styles.techAvatarText}>{tech.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={[styles.techCardText, active && styles.techCardTextActive]}>{tech}</Text>
                      {active ? <Feather name="check" size={16} color="#EAF2FF" /> : null}
                    </TouchableOpacity>
                  );
                })}
                {filteredTechnicians.length === 0 ? (
                  <Text style={styles.helperText}>Không tìm thấy kỹ thuật viên.</Text>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showPartModal} transparent animationType="slide" onRequestClose={() => setShowPartModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <View style={styles.inlineIconTitleRow}>
                <Feather name="search" size={16} color="#EAF2FF" />
                <Text style={styles.modalTitle}>Tìm phụ tùng</Text>
              </View>
              <TouchableOpacity style={styles.modalIconCloseBtn} onPress={() => setShowPartModal(false)}>
                <Feather name="x" size={20} color="#D2DFF6" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchRow}>
              <View style={[styles.searchInputWrap, { flex: 1 }]}> 
                <Feather name="search" size={16} color="#8A96AB" style={styles.searchPrefixIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={partSearch}
                  onChangeText={setPartSearch}
                  placeholder="Quét hoặc nhập mã phụ tùng..."
                  placeholderTextColor="#8A96AB"
                />
              </View>
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={openScanner}
              >
                <MaterialCommunityIcons name="barcode-scan" size={22} color="#EAF2FF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHintText}>Nhấn Enter để thêm nhanh phụ tùng đầu tiên • Dùng camera để quét mã vạch</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryChipScroll} contentContainerStyle={styles.categoryChipRow}>
              <TouchableOpacity
                style={[styles.categoryChip, !partCategoryFilter && styles.categoryChipActive]}
                onPress={() => setPartCategoryFilter('')}
              >
                <Text style={[styles.categoryChipText, !partCategoryFilter && styles.categoryChipTextActive]}>Tất cả danh mục</Text>
              </TouchableOpacity>
              {partCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[styles.categoryChip, partCategoryFilter === category && styles.categoryChipActive]}
                  onPress={() => setPartCategoryFilter(category)}
                >
                  <Text style={[styles.categoryChipText, partCategoryFilter === category && styles.categoryChipTextActive]}>{category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView style={{ marginTop: 10, maxHeight: 420 }}>
              <View style={styles.partsList}>
                {filteredParts.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.partItem}
                    activeOpacity={0.86}
                    onPress={() => {
                      addPart(p);
                      setPartSearch('');
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.partName}>{p.name}</Text>
                      <Text style={styles.partMeta}>
                        {p.sku || 'Không SKU'} • Tồn: {fromBranchValue(p.stock, BRANCH_ID)}
                        {p.category ? ` • ${p.category}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.partPrice}>{formatCurrency(fromBranchValue(p.retailPrice, BRANCH_ID))}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showScannerModal} transparent animationType="slide" onRequestClose={() => setShowScannerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.scannerModalCard}>
            <View style={styles.modalHead}>
              <View style={styles.inlineIconTitleRow}>
                <MaterialCommunityIcons name="barcode-scan" size={18} color="#EAF2FF" />
                <Text style={styles.modalTitle}>Quét mã phụ tùng</Text>
              </View>
              <TouchableOpacity style={styles.modalIconCloseBtn} onPress={() => setShowScannerModal(false)}>
                <Feather name="x" size={20} color="#D2DFF6" />
              </TouchableOpacity>
            </View>

            <View style={styles.scannerFrameWrap}>
              {cameraPermission?.granted ? (
                <CameraView
                  style={styles.scannerCamera}
                  barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'] }}
                  onBarcodeScanned={(event) => handleScannedCode(event.data)}
                />
              ) : (
                <View style={styles.scannerEmptyWrap}>
                  <Text style={styles.helperText}>Chưa có quyền camera. Vui lòng cấp quyền để quét mã.</Text>
                </View>
              )}
            </View>

            <Text style={styles.modalHintText}>Đưa mã vạch vào khung để tự động thêm phụ tùng.</Text>
          </View>
        </View>
      </Modal>

      <Modal visible={showServiceModal} transparent animationType="slide" onRequestClose={() => setShowServiceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: 18 }]}> 
            <View style={styles.modalHead}>
              <View style={styles.inlineIconTitleRow}>
                <Feather name="tool" size={16} color="#FFB074" />
                <Text style={styles.modalTitle}>Thêm dịch vụ gia công</Text>
              </View>
              <TouchableOpacity style={styles.modalIconCloseBtn} onPress={() => setShowServiceModal(false)}>
                <Feather name="x" size={20} color="#D2DFF6" />
              </TouchableOpacity>
            </View>

            <View style={[styles.inlineRow, { marginTop: 12 }]}> 
              <View style={{ flex: 1 }}>
                <Field label="Tên công việc" value={serviceName} onChangeText={setServiceName} placeholder="VD: Hàn yếm, Sơn xe..." />
              </View>
              <View style={{ width: 140 }}>
                <Text style={styles.label}>Số lượng</Text>
                <View style={[styles.qtyWrap, { height: 44, justifyContent: 'space-between' }]}> 
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => setServiceQty(String(Math.max(1, toNumber(serviceQty) - 1)))}>
                    <Text style={styles.qtyBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{Math.max(1, toNumber(serviceQty))}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => setServiceQty(String(Math.max(1, toNumber(serviceQty) + 1)))}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.inlineRow}>
              <View style={{ flex: 1 }}>
                <Field label="Giá vốn" value={serviceCostPrice} onChangeText={setServiceCostPrice} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Đơn giá bán" value={servicePrice} onChangeText={setServicePrice} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.servicePreviewBox}>
              <Text style={styles.servicePreviewLabel}>Thành tiền:</Text>
              <Text style={styles.servicePreviewValue}>{formatCurrency(Math.max(1, toNumber(serviceQty)) * Math.max(0, toNumber(servicePrice)))}</Text>
            </View>

            <TouchableOpacity style={styles.addServiceBtn} onPress={addService}>
              <Text style={styles.addServiceBtnText}>✓ Thêm vào phiếu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  multiline?: boolean;
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={[styles.input, props.multiline ? styles.inputMultiline : null]}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="#8A96AB"
        keyboardType={props.keyboardType || 'default'}
        multiline={props.multiline}
      />
    </View>
  );
}

function SummaryRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111318' },
  contentScroll: { flex: 1 },
  content: { padding: 0, paddingBottom: 118 },
  tabSection: { padding: 16, gap: 12 },
  sectionInnerGroup: { gap: 8 },
  tabSectionAction: { paddingHorizontal: 16, paddingBottom: 24 },
  mobileHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#2F3A50',
    backgroundColor: '#1E2432',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSideBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A3245',
  },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#EAF2FF', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  headerSideGhost: { width: 46 },
  topTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2F3A50',
    backgroundColor: '#1E2432',
  },
  topTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    minHeight: 46,
    position: 'relative',
  },
  topTabIconText: {
    marginBottom: 1,
    color: '#8693A8',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 13,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  topTabIconTextActive: { color: '#4F97FF' },
  topTabBtnActive: {},
  topTabText: {
    color: '#8693A8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
    marginTop: 2,
  },
  topTabTextActive: { color: '#4F97FF' },
  topTabUnderline: {
    position: 'absolute',
    bottom: 0,
    width: 32,
    height: 2,
    borderRadius: 999,
    backgroundColor: '#4F97FF',
  },
  sectionHead: {
    borderWidth: 1,
    borderColor: '#2D4368',
    backgroundColor: '#121A2A',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeadTitle: { color: '#EAF2FF', fontSize: 13, fontWeight: '800' },
  sectionHeadSub: { marginTop: 1, color: '#8EA0BF', fontSize: 11 },
  sectionHeadIcon: { color: '#A5B8D8', fontSize: 18, fontWeight: '700' },
  searchInputWrap: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    backgroundColor: '#1E1E2D',
    position: 'relative',
  },
  searchPrefixIcon: {
    position: 'absolute',
    left: 14,
    top: 14,
    zIndex: 2,
  },
  searchInput: {
    color: '#F8FAFC',
    fontSize: 13,
    paddingHorizontal: 40,
    paddingVertical: 0,
    height: 44,
    lineHeight: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  loadingInline: { paddingVertical: 14, alignItems: 'center' },
  customerListWrap: { marginTop: 4, gap: 8 },
  customerTile: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1E1E2D',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1D3E71',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarLg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarText: { color: '#60A5FA', fontWeight: '800' },
  customerName: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
  customerPhone: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  customerArrow: { color: '#64748B', fontSize: 19 },
  addNewCustomerHint: {
    marginTop: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#1E1E2D',
  },
  addNewCustomerText: { color: '#60A5FA', fontWeight: '700', fontSize: 12 },
  selectedCustomerCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    backgroundColor: '#1E1E2D',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedVehicleCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2E4D7A',
    backgroundColor: '#1E2E46',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedVehicleTitle: { color: '#F0F6FF', fontSize: 14, fontWeight: '700' },
  selectedVehicleSub: { color: '#C5D4EE', fontSize: 12, marginTop: 1 },
  techPickerBtn: {
    marginTop: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1E1E2D',
    height: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  techPickerText: { color: '#D6E2F8', fontSize: 14, fontWeight: '700' },
  miniBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#1E1E2D',
  },
  miniBtnText: { color: '#94A3B8', fontWeight: '700', fontSize: 11 },
  iconMiniBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C3447',
    backgroundColor: '#1A1F2B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleList: { marginBottom: 2, gap: 8 },
  addVehicleBtn: {
    marginTop: 4,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#1D4375',
    borderRadius: 14,
    backgroundColor: '#141B29',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    flexDirection: 'row',
    gap: 8,
  },
  addVehicleBtnText: { color: '#61A8FF', fontSize: 14, fontWeight: '700' },
  saveVehicleBtn: {
    marginTop: 2,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#345A8C',
    backgroundColor: '#1B2E48',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveVehicleBtnText: { color: '#D7E8FF', fontSize: 13, fontWeight: '700' },
  vehicleTile: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#1E1E2D',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehicleTileActive: {
    backgroundColor: '#2563EB',
    borderColor: '#3B82F6',
  },
  vehicleAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleAvatarText: { fontSize: 16 },
  vehicleTileTitle: { color: '#D3DEF2', fontSize: 13, fontWeight: '800' },
  vehicleTileTitleActive: { color: '#F0F6FF' },
  vehicleTileSub: { color: '#8EA0BF', fontSize: 11, marginTop: 1 },
  vehicleTileSubActive: { color: '#C8D9F7' },
  helperText: { color: '#8EA0BF', fontSize: 11, marginTop: 4 },
  microLabel: {
    color: '#7F8EA8',
    fontSize: 11,
    marginBottom: 2,
    marginLeft: 1,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  segmentLabel: {
    color: '#7F8EA8',
    fontSize: 11,
    marginBottom: 4,
    marginLeft: 1,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statusSegmentWrap: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1E1E2D',
    marginBottom: 6,
  },
  statusSegmentBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 56,
    paddingVertical: 7,
  },
  statusSegmentBtnActive: {
    backgroundColor: '#2563EB',
  },
  statusSegmentIconText: { color: '#64748B', fontSize: 11, fontWeight: '800' },
  statusSegmentIconTextActive: { color: '#FFFFFF' },
  statusSegmentText: { color: '#64748B', fontSize: 11, fontWeight: '800' },
  statusSegmentTextActive: { color: '#FFFFFF' },
  techRow: { gap: 8, paddingVertical: 1 },
  techChip: {
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1E1E2D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  techChipActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#2563EB',
  },
  techChipText: { color: '#94A3B8', fontWeight: '700', fontSize: 13 },
  techChipTextActive: { color: '#F8FAFC' },
  techCardList: { gap: 8, paddingBottom: 8 },
  techCardItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1E1E2D',
    paddingHorizontal: 12,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  techCardItemActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#2563EB',
  },
  techAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  techAvatarText: { color: '#DCE8FF', fontWeight: '800', fontSize: 12 },
  techCardText: { flex: 1, color: '#D6E2F8', fontSize: 14, fontWeight: '700' },
  techCardTextActive: { color: '#FFFFFF' },
  label: { color: '#64748B', fontSize: 11, marginBottom: 4, marginLeft: 4, letterSpacing: 0.5, fontWeight: '800', textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    color: '#F8FAFC',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 0,
    height: 44,
    backgroundColor: '#1E1E2D',
    lineHeight: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  inputMultiline: {
    minHeight: 78,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  rowWrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  blockTitle: { color: '#DCE7FA', fontSize: 14, fontWeight: '800' },
  blockBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7DC3FF',
    backgroundColor: '#16334F',
    borderWidth: 1,
    borderColor: '#305B87',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  blockBadgeOrange: {
    color: '#FFC184',
    backgroundColor: '#4B2E0A',
    borderColor: '#7A4E16',
  },
  warningBox: {
    borderWidth: 1,
    borderColor: '#8B6721',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#2A2414',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  warningText: {
    color: '#FAD98A',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  warningIconText: { color: '#F4C152', fontSize: 16, fontWeight: '900' },
  warningActionBtn: {
    marginTop: 2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#E0A526',
  },
  warningActionText: { color: '#2E2209', fontSize: 11, fontWeight: '800' },
  actionCardsRow: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 10,
  },
  actionCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4E75B8',
    backgroundColor: '#193157',
    padding: 10,
  },
  actionCardSecondary: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#74602D',
    backgroundColor: '#382D15',
    padding: 10,
  },
  actionCardTitle: { color: '#EAF2FF', fontSize: 14, fontWeight: '800' },
  actionCardSub: { color: '#A9B7D1', fontSize: 12, marginTop: 4 },
  actionCardCount: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', marginTop: 6 },
  partsList: { marginTop: 8, gap: 8, maxHeight: 220 },
  partItem: {
    borderWidth: 1,
    borderColor: '#2A3E62',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#111722',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  partName: { color: '#EAF2FF', fontSize: 14, fontWeight: '700' },
  partMeta: { color: '#8EA0BF', fontSize: 12, marginTop: 2 },
  partPrice: { color: '#79E7B3', fontSize: 13, fontWeight: '800' },
  selectedLine: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#425171',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#111722',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedLineWarn: {
    borderColor: '#B24852',
    backgroundColor: '#2A1418',
  },
  selectedTitle: { color: '#EAF2FF', fontSize: 14, fontWeight: '700' },
  selectedMeta: { color: '#8EA0BF', fontSize: 12, marginTop: 1 },
  stockWarnText: { color: '#FF8896', fontSize: 12, marginTop: 2, fontWeight: '700' },
  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4A6086',
    borderRadius: 8,
  },
  qtyBtn: { paddingHorizontal: 8, paddingVertical: 5 },
  qtyBtnText: { color: '#C8D6ED', fontWeight: '800', fontSize: 13 },
  qtyText: { minWidth: 20, textAlign: 'center', color: '#EAF2FF', fontWeight: '800' },
  priceInput: {
    width: 76,
    borderWidth: 1,
    borderColor: '#425171',
    borderRadius: 8,
    color: '#ECF3FF',
    backgroundColor: '#151D2B',
    textAlign: 'right',
    paddingHorizontal: 8,
    paddingVertical: 0,
    height: 34,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 12,
    includeFontPadding: false,
  },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4D1E2C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#FFB5C3', fontWeight: '900', fontSize: 12 },
  inlineRow: { flexDirection: 'row', gap: 8 },
  addServiceBtn: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#9D6A08',
    backgroundColor: '#4A3405',
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
  },
  addServiceBtnText: { color: '#FCD27C', fontWeight: '800', fontSize: 13 },
  servicePreviewBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7A4E16',
    backgroundColor: '#3A2815',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servicePreviewLabel: { color: '#E3C7A1', fontSize: 13, fontWeight: '600' },
  servicePreviewValue: { color: '#FFB074', fontSize: 14, fontWeight: '800' },
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A3E62',
    backgroundColor: '#111722',
  },
  smallChipActive: { backgroundColor: '#8F2632', borderColor: '#BD3D50' },
  smallChipText: { color: '#B4C2DA', fontSize: 12, fontWeight: '800' },
  smallChipTextActive: { color: '#FFE7EC' },
  quickChip: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#2F2530',
    borderWidth: 1,
    borderColor: '#633B4A',
  },
  quickChipText: { color: '#FFB9C7', fontSize: 11, fontWeight: '700' },
  paymentCostCard: {
    backgroundColor: '#1A1F2B',
    borderWidth: 1,
    borderColor: '#264B7A',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  paymentMainCard: {
    backgroundColor: '#1A1F2B',
    borderWidth: 1,
    borderColor: '#2E435F',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  paymentSectionHeadRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentSectionHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  paymentSectionHeadIconBlue: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentSectionHeadIconPurple: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(124,58,237,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentSectionHeadIconGreen: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(34,197,94,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentSectionTitle: { color: '#EAF2FF', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  laborInputRow: {
    borderWidth: 1,
    borderColor: '#2A4C79',
    borderRadius: 12,
    backgroundColor: '#1B2030',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentTinyLabel: { color: '#A0AEC4', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  laborInputValueWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currencyPrefix: { color: '#A5B4C8', fontSize: 14, fontWeight: '700' },
  laborInput: {
    width: 120,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38557D',
    backgroundColor: '#161D2A',
    color: '#EAF2FF',
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'right',
    paddingHorizontal: 10,
    paddingVertical: 0,
  },
  discountWrapCard: {
    borderWidth: 1,
    borderColor: '#2A4C79',
    borderRadius: 12,
    backgroundColor: '#1B2030',
    padding: 10,
    gap: 8,
  },
  discountHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  discountLabel: { color: '#F87171', fontWeight: '800', fontSize: 12, letterSpacing: 0.4 },
  discountTypeSwitch: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3B4254',
    backgroundColor: '#111722',
    padding: 2,
    gap: 2,
  },
  discountTypeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  discountTypeBtnActive: { backgroundColor: '#B42318' },
  discountTypeText: { color: '#94A3B8', fontSize: 12, fontWeight: '800' },
  discountTypeTextActive: { color: '#FFFFFF' },
  discountInput: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7F1D1D',
    backgroundColor: '#131923',
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'right',
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  discountPresetRow: { flexDirection: 'row', gap: 8 },
  discountPresetBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7F1D1D',
    backgroundColor: '#3A1D24',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  discountPresetText: { color: '#FCA5A5', fontSize: 11, fontWeight: '800' },
  paymentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paymentTitle: { color: '#DDE7FA', fontWeight: '800', fontSize: 12, letterSpacing: 0.4 },
  paymentCard: {
    backgroundColor: '#202433',
    borderWidth: 1,
    borderColor: '#4A5470',
    borderRadius: 14,
    padding: 11,
    marginBottom: 10,
  },
  paymentCardTitle: {
    color: '#9AA7C0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  inlineSummaryRow: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 2 },
  inlineSummaryBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#44506A',
    backgroundColor: '#171C28',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inlineSummaryLabel: { color: '#8B97AE', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  inlineSummaryValue: { color: '#E7F0FF', fontSize: 12, fontWeight: '800', marginTop: 2 },
  toggle: {
    width: 40,
    height: 22,
    borderRadius: 20,
    backgroundColor: '#3A3D48',
    padding: 2,
  },
  toggleActive: { backgroundColor: '#7E45E9' },
  toggleActiveGreen: { backgroundColor: '#16A34A' },
  toggleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
  },
  toggleDotActive: { transform: [{ translateX: 18 }] },
  chip: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#425171',
    backgroundColor: '#171C28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: BRAND_COLORS.primary,
    borderColor: BRAND_COLORS.primary,
  },
  chipText: { color: '#B4C2DA', fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: '#F4F8FF' },
  depositToggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#274061',
    borderRadius: 12,
    backgroundColor: '#182130',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  depositToggleText: { color: '#8EA0BF', fontSize: 11, fontWeight: '800' },
  depositToggleTextActive: { color: '#A78BFA' },
  depositInputCard: {
    borderWidth: 1,
    borderColor: '#4C1D95',
    borderRadius: 12,
    backgroundColor: '#1A162A',
    padding: 10,
    gap: 6,
  },
  depositInputLabel: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  depositInput: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#5B21B6',
    backgroundColor: '#121827',
    color: '#EDE9FE',
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  paymentMethodRow: { flexDirection: 'row', gap: 10 },
  methodBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#425171',
    backgroundColor: '#171C28',
    alignItems: 'center',
    height: 88,
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
  },
  methodBtnActiveCash: { borderColor: '#2CA66A', backgroundColor: '#123526' },
  methodBtnActiveBank: { borderColor: '#2C83D6', backgroundColor: '#12304C' },
  methodBtnText: { color: '#B4C2DA', fontWeight: '800', fontSize: 12 },
  methodBtnTextActive: { color: '#EEF6FF' },
  methodActiveDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34D399',
  },
  returnPaymentCard: {
    borderWidth: 1,
    borderColor: '#166534',
    borderRadius: 16,
    backgroundColor: '#153624',
    padding: 12,
    gap: 10,
  },
  returnPaymentInput: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A7B52',
    backgroundColor: '#102118',
    color: '#DCFCE7',
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  returnPaymentPresetRow: { flexDirection: 'row', gap: 8 },
  returnPaymentPresetBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#355067',
    backgroundColor: '#1A2230',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
  },
  returnPaymentPresetBtnActive: {
    borderColor: '#55C58A',
    backgroundColor: '#4AA673',
  },
  returnPaymentPresetText: { color: '#D5E2F3', fontSize: 13, fontWeight: '800' },
  returnPaymentPresetTextActive: { color: '#EFFFF4' },
  summaryCardModern: {
    backgroundColor: '#121827',
    borderColor: '#2A3E62',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  summaryCard: {
    backgroundColor: '#1D2231',
    borderColor: '#4A5470',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  summaryHeading: { color: '#EAF2FF', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  summaryAmountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 2 },
  summaryAmountMain: { color: '#F8FAFC', fontSize: 36, fontWeight: '900', lineHeight: 40 },
  summaryAmountUnit: { color: '#9AA7C0', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  separator: {
    height: 1,
    backgroundColor: 'rgba(130,160,210,0.25)',
    marginVertical: 2,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: '#D7E5FF', fontSize: 12 },
  summaryValue: { color: '#8DE3AF', fontSize: 14, fontWeight: '800' },
  summaryRemainLabel: { color: '#E2E8F0', fontSize: 16, fontWeight: '700' },
  summaryRemainValue: { color: '#F59E0B', fontSize: 30, fontWeight: '900' },
  summaryRemainValueDone: { color: '#6EE7B7' },
  submitBtn: {
    borderRadius: 12,
    backgroundColor: '#1A5ED1',
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitText: { color: '#F5F9FF', fontSize: 15, fontWeight: '800' },
  nextTabBtn: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#2D66D7',
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
  },
  nextTabText: { color: '#F3F8FF', fontSize: 12, fontWeight: '800' },
  stickyFooter: {
    borderTopWidth: 1,
    borderTopColor: '#2F3A50',
    backgroundColor: '#1E2432',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    minWidth: 56,
    borderRadius: 8,
    backgroundColor: '#2E3442',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    paddingHorizontal: 12,
  },
  cancelBtnText: { color: '#E5EDF8', fontWeight: '600', fontSize: 13 },
  saveBtn: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#5F697E',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  depositBtn: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
  },
  depositBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  payBtn: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
  },
  payBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  openPartModalBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A5A99',
    backgroundColor: '#15305A',
    alignItems: 'center',
    paddingVertical: 10,
  },
  openPartModalText: { color: '#CFE2FF', fontWeight: '800', fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5,8,16,0.72)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '84%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 14,
    backgroundColor: '#141A26',
    borderTopWidth: 1,
    borderColor: '#2A3E62',
  },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inlineIconTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: { color: '#EAF2FF', fontSize: 15, fontWeight: '800' },
  modalIconCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3F567E',
    backgroundColor: '#1A2434',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  scanBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A4DB4',
    borderWidth: 1,
    borderColor: '#3B6EDD',
  },
  modalHintText: { color: '#B6C3DA', fontSize: 11, marginTop: 8, lineHeight: 16 },
  categoryChipScroll: { marginTop: 10 },
  categoryChipRow: { gap: 8, paddingRight: 8 },
  categoryChip: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 999,
    backgroundColor: '#1A1F2B',
    paddingHorizontal: 12,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#1D3D69',
  },
  categoryChipText: { color: '#C8D5EA', fontSize: 12, fontWeight: '700' },
  categoryChipTextActive: { color: '#EAF2FF' },
  scannerModalCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#2D4368',
    backgroundColor: '#141A25',
    padding: 14,
    paddingBottom: 22,
    minHeight: 520,
  },
  scannerFrameWrap: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2E4D7A',
    backgroundColor: '#0B0F18',
  },
  scannerCamera: {
    width: '100%',
    height: 380,
  },
  scannerEmptyWrap: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCloseBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3F567E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#1A2434',
  },
  modalCloseText: { color: '#D2DFF6', fontSize: 12, fontWeight: '700' },
});
