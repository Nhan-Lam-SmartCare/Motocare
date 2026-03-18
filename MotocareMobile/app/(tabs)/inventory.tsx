import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  FlatList,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Animated,
  useColorScheme,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../shared/supabaseClient';
import { BRAND_COLORS, formatCurrency } from '../../constants';
import type { Part } from '../../shared/types';

type StockFilter = 'all' | 'low' | 'out';
type ReceiptStep = 1 | 2;
type PaymentMethod = 'cash' | 'bank';
type PaymentType = 'full' | 'partial' | 'note';

type Supplier = {
  id: string;
  name: string;
  phone?: string;
};

type ReceiptLine = {
  partId: string;
  partName: string;
  sku: string;
  category?: string;
  quantity: number;
  importPrice: number;
};

type ReceiptMeta = {
  receiptCode: string;
  supplierName: string;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  paidAmount: number;
  totalAmount: number;
  note: string;
};

type ReceiptRecord = {
  receiptCode: string;
  supplierName: string;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  paidAmount: number;
  totalAmount: number;
  date: string;
  note: string;
  lines: ReceiptLine[];
};

const BRANCH_ID = 'CN1';
const LOW_STOCK_THRESHOLD = 5;
const RECEIPT_META_PREFIX = '__RECEIPT_META__';

const safeNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const fromBranchValue = (value: unknown, branchId: string): number => {
  if (typeof value === 'number') return safeNumber(value);
  if (value && typeof value === 'object') {
    const v = (value as Record<string, unknown>)[branchId];
    return safeNumber(v);
  }
  return 0;
};

const setBranchValue = (value: unknown, branchId: string, next: number): Record<string, number> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const base = value as Record<string, unknown>;
    return { ...Object.fromEntries(Object.entries(base).map(([k, v]) => [k, safeNumber(v)])), [branchId]: next };
  }
  return { [branchId]: next };
};

const normalizePart = (row: any): Part => ({
  id: String(row.id),
  name: row.name || 'Phụ tùng',
  sku: row.sku || '',
  barcode: row.barcode || undefined,
  category: row.category || undefined,
  stock: (row.stock ?? {}) as Record<string, number>,
  reservedstock: (row.reservedstock ?? {}) as Record<string, number>,
  retailPrice: (row.retailPrice ?? row.retailprice ?? {}) as Record<string, number>,
  costPrice: (row.costPrice ?? row.costprice ?? {}) as Record<string, number>,
  imageUrl: row.imageUrl || row.imageurl || undefined,
  description: row.description || undefined,
  created_at: row.created_at || undefined,
});

const normalizeSupplier = (row: any): Supplier => ({
  id: String(row.id),
  name: String(row.name || 'Nhà cung cấp'),
  phone: row.phone ? String(row.phone) : undefined,
});

const buildReceiptMetaNote = (meta: ReceiptMeta): string => `${RECEIPT_META_PREFIX}${JSON.stringify(meta)}`;

const parseReceiptMeta = (notes?: string | null): ReceiptMeta | null => {
  const raw = String(notes || '');
  const start = raw.indexOf(RECEIPT_META_PREFIX);
  if (start < 0) return null;
  try {
    return JSON.parse(raw.slice(start + RECEIPT_META_PREFIX.length)) as ReceiptMeta;
  } catch {
    return null;
  }
};

const extractReceiptCodeFromNotes = (notes?: string | null): string => {
  const raw = String(notes || '');
  const match = raw.match(/NH-\d{8}-\d{3,}/i);
  return match ? String(match[0]).toUpperCase() : '';
};

const extractSupplierFromNotes = (notes?: string | null): string => {
  const raw = String(notes || '');
  if (!raw) return '';

  const marker = raw.match(/NCC\s*:\s*([^|\n]+)/i);
  if (marker?.[1]) return marker[1].trim();

  const text = raw.match(/Nhà\s*cung\s*cấp\s*:\s*([^|\n]+)/i);
  if (text?.[1]) return text[1].trim();

  return '';
};

const normalizeLookupText = (value: unknown): string => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

async function fetchParts(): Promise<Part[]> {
  const { data, error } = await supabase.from('parts').select('*').order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizePart);
}

async function fetchSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase.from('suppliers').select('id,name,phone').order('name', { ascending: true });
  if (error) return [];
  return (data ?? []).map(normalizeSupplier);
}

async function fetchReceiptHistory(): Promise<ReceiptRecord[]> {
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('*')
    .in('type', ['Nhập kho', 'Nhap kho', 'import', 'IMPORT'])
    .order('date', { ascending: false })
    .limit(500);

  if (error) return [];

  const importRows = (data ?? []).filter((row: any) => {
    const rowBranch = String(row.branchId || row.branchid || '').trim();
    return !rowBranch || rowBranch === BRANCH_ID;
  });

  const supplierIds = Array.from(
    new Set(
      importRows
        .map((row: any) => String(row.supplierId || row.supplierid || '').trim())
        .filter((v: string) => !!v)
    )
  );

  let supplierMap = new Map<string, string>();
  if (supplierIds.length > 0) {
    const { data: supplierRows } = await supabase.from('suppliers').select('id,name').in('id', supplierIds);
    supplierMap = new Map((supplierRows ?? []).map((s: any) => [String(s.id), String(s.name || '')]));
  }

  const partIds = Array.from(
    new Set(
      importRows
        .map((row: any) => String(row.partId || '').trim())
        .filter((v: string) => !!v)
    )
  );

  let partMap = new Map<string, { sku: string; category: string; name: string }>();
  let partNameMap = new Map<string, { sku: string; category: string; name: string }>();
  if (partIds.length > 0) {
    const { data: partRows } = await supabase.from('parts').select('id,sku,category,name').in('id', partIds);
    partMap = new Map(
      (partRows ?? []).map((p: any) => [String(p.id), { sku: String(p.sku || ''), category: String(p.category || ''), name: String(p.name || '') }])
    );

    partNameMap = new Map(
      (partRows ?? [])
        .filter((p: any) => !!String(p.name || '').trim())
        .map((p: any) => [
          normalizeLookupText(p.name),
          { sku: String(p.sku || ''), category: String(p.category || ''), name: String(p.name || '') },
        ])
    );
  }

  type ReceiptGroup = {
    key: string;
    date: string;
    explicitCode: string;
    supplierName: string;
    paymentMethod: PaymentMethod;
    paymentType: PaymentType;
    paidAmount: number;
    totalAmount: number;
    note: string;
    lines: ReceiptLine[];
  };

  const grouped = new Map<string, ReceiptGroup>();
  importRows.forEach((row: any) => {
    const meta = parseReceiptMeta(row.notes);
    const txDateIso = String(row.date || row.created_at || new Date().toISOString());
    const txDate = new Date(txDateIso);
    const supplierId = String(row.supplierId || row.supplierid || '').trim();
    const supplierNameFromId = supplierId ? supplierMap.get(supplierId) || '' : '';
    const supplierName = String(
      meta?.supplierName ||
      row.supplierName ||
      row.supplier_name ||
      row.supplier ||
      supplierNameFromId ||
      extractSupplierFromNotes(row.notes) ||
      'NCC không xác định'
    );
    const explicitCode = String(
      meta?.receiptCode || row.receiptCode || row.receipt_code || extractReceiptCodeFromNotes(row.notes) || ''
    );

    const dateKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${String(txDate.getDate()).padStart(2, '0')}`;
    const fallbackGroupKey = `${dateKey}_${supplierName}_${txDate.getHours()}_${txDate.getMinutes()}`;
    const groupKey = explicitCode ? `RC_${explicitCode}` : `DT_${fallbackGroupKey}`;

    const paymentMethod: PaymentMethod =
      meta?.paymentMethod === 'bank' || String(row.paymentMethod || row.payment_method).toLowerCase() === 'bank'
        ? 'bank'
        : 'cash';

    const paymentType: PaymentType =
      meta?.paymentType === 'partial' || meta?.paymentType === 'note' || meta?.paymentType === 'full'
        ? meta.paymentType
        : 'full';

    const existing = grouped.get(groupKey);
    const linePartId = String(row.partId || '');
    const partName = String(row.partName || '-');
    const partRefById = linePartId ? partMap.get(linePartId) : undefined;
    const partRefByName = partNameMap.get(normalizeLookupText(partName));
    const partRef = partRefById || partRefByName;
    const line: ReceiptLine = {
      partId: linePartId,
      partName,
      sku: String(row.sku || partRef?.sku || ''),
      category: String(row.category || partRef?.category || ''),
      quantity: Math.max(1, Math.round(safeNumber(row.quantity))),
      importPrice: Math.max(0, Math.round(safeNumber(row.unitPrice))),
    };
    const lineTotal = line.quantity * line.importPrice;

    if (!existing) {
      grouped.set(groupKey, {
        key: groupKey,
        date: txDateIso,
        explicitCode,
        supplierName,
        paymentMethod,
        paymentType,
        paidAmount: safeNumber(meta?.paidAmount ?? row.paidAmount ?? row.paid_amount ?? lineTotal),
        totalAmount: lineTotal,
        note: String(meta?.note || row.notes || ''),
        lines: [line],
      });
      return;
    }

    existing.lines.push(line);
    existing.totalAmount += lineTotal;
    if (existing.supplierName === 'NCC không xác định' && supplierName && supplierName !== 'NCC không xác định') {
      existing.supplierName = supplierName;
    }
    if (safeNumber(meta?.paidAmount) > 0) {
      existing.paidAmount = Math.max(existing.paidAmount, safeNumber(meta?.paidAmount));
    }
    if (safeNumber(meta?.totalAmount) > 0) {
      existing.totalAmount = Math.max(existing.totalAmount, safeNumber(meta?.totalAmount));
    }
  });

  const groups = Array.from(grouped.values()).sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return groups.map((group, index) => {
    const date = new Date(group.date);
    const fallbackCode = `NH-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(groups.length - index).padStart(3, '0')}`;

    return {
      receiptCode: group.explicitCode || fallbackCode,
      supplierName: group.supplierName,
      paymentMethod: group.paymentMethod,
      paymentType: group.paymentType,
      paidAmount: group.paidAmount,
      totalAmount: group.totalAmount,
      date: group.date,
      note: group.note,
      lines: group.lines,
    };
  });
}

export default function InventoryScreen() {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const compact = width < 380;

  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');

  const [showImportForm, setShowImportForm] = useState(false);
  const [showReceiptHistory, setShowReceiptHistory] = useState(false);
  const [selectedReceiptDetail, setSelectedReceiptDetail] = useState<ReceiptRecord | null>(null);
  const [receiptStep, setReceiptStep] = useState<ReceiptStep>(1);
  const [importSearch, setImportSearch] = useState('');
  const [receiptLines, setReceiptLines] = useState<ReceiptLine[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierKeyword, setSupplierKeyword] = useState('');
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [importPaymentMethod, setImportPaymentMethod] = useState<PaymentMethod>('cash');
  const [importPaymentType, setImportPaymentType] = useState<PaymentType>('full');
  const [importPaidAmount, setImportPaidAmount] = useState('0');
  const [importNote, setImportNote] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'main' | 'receipt'>('main');

  const {
    data: parts = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['inventory-parts'],
    queryFn: fetchParts,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['inventory-suppliers'],
    queryFn: fetchSuppliers,
  });

  const { data: receiptHistory = [] } = useQuery({
    queryKey: ['inventory-receipt-history', BRANCH_ID],
    queryFn: fetchReceiptHistory,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return parts.filter((part) => {
      const stock = fromBranchValue(part.stock, BRANCH_ID);
      const reserved = fromBranchValue(part.reservedstock, BRANCH_ID);
      const available = Math.max(0, stock - reserved);

      const matchSearch =
        !q ||
        part.name.toLowerCase().includes(q) ||
        part.sku.toLowerCase().includes(q) ||
        String(part.barcode || '').toLowerCase().includes(q);

      const matchStock =
        stockFilter === 'all' ||
        (stockFilter === 'low' && available > 0 && available <= LOW_STOCK_THRESHOLD) ||
        (stockFilter === 'out' && available <= 0);

      return matchSearch && matchStock;
    });
  }, [parts, search, stockFilter]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, part) => {
        const stock = fromBranchValue(part.stock, BRANCH_ID);
        const reserved = fromBranchValue(part.reservedstock, BRANCH_ID);
        const available = Math.max(0, stock - reserved);
        const cost = fromBranchValue(part.costPrice, BRANCH_ID);
        acc.totalQty += available;
        acc.totalValue += available * cost;
        return acc;
      },
      { totalQty: 0, totalValue: 0 }
    );
  }, [rows]);

  const importCandidates = useMemo(() => {
    const q = importSearch.trim().toLowerCase();
    return parts.filter((part) => {
      if (!q) return true;
      return (
        part.name.toLowerCase().includes(q) ||
        part.sku.toLowerCase().includes(q) ||
        String(part.barcode || '').toLowerCase().includes(q)
      );
    });
  }, [parts, importSearch]);

  const receiptTotal = useMemo(() => {
    return receiptLines.reduce((sum, line) => sum + line.quantity * line.importPrice, 0);
  }, [receiptLines]);

  const selectedSupplier = useMemo(() => suppliers.find((s) => s.id === selectedSupplierId), [suppliers, selectedSupplierId]);

  const filteredSuppliers = useMemo(() => {
    const keyword = supplierKeyword.trim().toLowerCase();
    if (!keyword) return suppliers;
    return suppliers.filter((s) => {
      return s.name.toLowerCase().includes(keyword) || String(s.phone || '').toLowerCase().includes(keyword);
    });
  }, [supplierKeyword, suppliers]);

  const createReceiptMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSupplier?.name?.trim()) throw new Error('Vui lòng chọn nhà cung cấp.');
      if (receiptLines.length === 0) throw new Error('Vui lòng thêm ít nhất 1 sản phẩm.');

      const paidAmount =
        importPaymentType === 'full'
          ? receiptTotal
          : importPaymentType === 'partial'
            ? Math.min(receiptTotal, Math.max(0, Math.round(safeNumber(importPaidAmount))))
            : 0;

      if (importPaymentType === 'partial' && paidAmount <= 0) {
        throw new Error('Số tiền đã trả phải lớn hơn 0.');
      }

      for (const line of receiptLines) {
        const part = parts.find((p) => p.id === line.partId);
        if (!part) continue;

        const current = fromBranchValue(part.stock, BRANCH_ID);
        const next = current + Math.max(1, Math.round(line.quantity));

        const payload: Record<string, unknown> = {
          stock: setBranchValue(part.stock, BRANCH_ID, next),
          costPrice: setBranchValue(part.costPrice, BRANCH_ID, Math.max(0, Math.round(line.importPrice))),
        };

        const { error } = await supabase.from('parts').update(payload).eq('id', part.id);
        if (error) throw error;
      }

      const today = new Date();
      const dateKey = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      const receiptCode = `NH-${dateKey}-${String(receiptHistory.length + 1).padStart(3, '0')}`;

      const meta: ReceiptMeta = {
        receiptCode,
        supplierName: selectedSupplier.name,
        paymentMethod: importPaymentMethod,
        paymentType: importPaymentType,
        paidAmount,
        totalAmount: receiptTotal,
        note: importNote.trim(),
      };

      const notePayload = buildReceiptMetaNote(meta);
      const nowIso = new Date().toISOString();

      const txPayload = receiptLines.map((line) => ({
        type: 'Nhập kho',
        partId: line.partId,
        partName: line.partName,
        quantity: Math.max(1, Math.round(line.quantity)),
        date: nowIso,
        unitPrice: Math.max(0, Math.round(line.importPrice)),
        totalPrice: Math.max(1, Math.round(line.quantity)) * Math.max(0, Math.round(line.importPrice)),
        branchId: BRANCH_ID,
        supplierId: selectedSupplier.id,
        notes: notePayload,
      }));

      const { error: insertError } = await supabase.from('inventory_transactions').insert(txPayload);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-parts'] });
      queryClient.invalidateQueries({ queryKey: ['sales-parts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-live'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-receipt-history', BRANCH_ID] });
      setShowImportForm(false);
      setReceiptStep(1);
      setImportSearch('');
      setReceiptLines([]);
      setSelectedSupplierId('');
      setImportPaymentMethod('cash');
      setImportPaymentType('full');
      setImportPaidAmount('0');
      setImportNote('');
      Alert.alert('Thành công', 'Đã lưu phiếu nhập kho.');
    },
    onError: (error: any) => {
      Alert.alert('Không thể nhập kho', String(error?.message || 'Vui lòng thử lại.'));
    },
  });

  const openImportForm = () => {
    setReceiptStep(1);
    setImportSearch('');
    setReceiptLines([]);
    setSelectedSupplierId('');
    setImportPaymentMethod('cash');
    setImportPaymentType('full');
    setImportPaidAmount('0');
    setImportNote('');
    setShowImportForm(true);
  };

  const addToReceipt = (part: Part) => {
    setReceiptLines((prev) => {
      const existing = prev.find((line) => line.partId === part.id);
      if (existing) {
        return prev.map((line) => (line.partId === part.id ? { ...line, quantity: line.quantity + 1 } : line));
      }
      return [
        ...prev,
        {
          partId: part.id,
          partName: part.name,
          sku: part.sku,
          quantity: 1,
          importPrice: fromBranchValue(part.costPrice, BRANCH_ID),
        },
      ];
    });
  };

  const updateLine = (partId: string, patch: Partial<ReceiptLine>) => {
    setReceiptLines((prev) => prev.map((line) => (line.partId === partId ? { ...line, ...patch } : line)));
  };

  const removeLine = (partId: string) => {
    setReceiptLines((prev) => prev.filter((line) => line.partId !== partId));
  };

  const handleOpenScanner = async (target: 'main' | 'receipt') => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Thiếu quyền camera', 'Hãy cấp quyền camera để quét mã.');
        return;
      }
    }

    setScannerTarget(target);
    setShowScanner(true);
  };

  const handleScannedCode = (code: string) => {
    const raw = code.toLowerCase().replace(/[-\s./\\]/g, '');

    const found = parts.find((part) => {
      const sku = String(part.sku || '').toLowerCase().replace(/[-\s./\\]/g, '');
      const barcode = String(part.barcode || '').toLowerCase().replace(/[-\s./\\]/g, '');
      const suffix = raw.length > 5 ? raw.slice(5) : raw;
      return barcode === raw || sku === raw || (suffix.length >= 4 && (sku.includes(suffix) || barcode.includes(suffix)));
    });

    setShowScanner(false);

    if (scannerTarget === 'main') {
      setSearch(code);
      if (!found) Alert.alert('Đã quét', `Mã ${code} không khớp trực tiếp, đã đưa vào ô tìm kiếm.`);
      return;
    }

    setImportSearch(code);
    if (found) {
      addToReceipt(found);
    } else {
      Alert.alert('Đã quét', `Mã ${code} chưa có trong kho.`);
    }
  };

  const renderPart = ({ item }: { item: Part }) => {
    return <InventoryPartCard item={item} isDark={isDark} />;
  };

  return (
    <View style={[styles.container, isDark && darkInventory.container]}>
      <View style={[styles.header, isDark && darkInventory.header, { paddingTop: Math.max(12, insets.top + 6) }]}>
        <View>
          <Text style={[styles.headerTitle, compact && { fontSize: 20 }]}>Quản lý kho</Text>
          <Text style={[styles.headerSub, isDark && darkInventory.secondaryText]}>Chi nhánh: {BRANCH_ID}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.82} style={styles.refreshButton} onPress={() => refetch()}>
          <Feather name="refresh-cw" size={14} color="#fff" />
          <Text style={styles.refreshButtonText}>Làm mới</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.summaryRow, compact && { gap: 6, paddingTop: 10 }] }>
        <View style={[styles.summaryCard, isDark && darkInventory.card]}>
          <Text style={styles.summaryValue}>{summary.totalQty}</Text>
          <Text style={[styles.summaryLabel, isDark && darkInventory.secondaryText]}>Tồn khả dụng</Text>
        </View>
        <View style={[styles.summaryCard, isDark && darkInventory.card]}>
          <Text style={styles.summaryValue}>{formatCurrency(summary.totalValue)}</Text>
          <Text style={[styles.summaryLabel, isDark && darkInventory.secondaryText]}>Giá trị vốn</Text>
        </View>
      </View>

      <View style={styles.topActionsRow}>
        <Pressable
          onPress={openImportForm}
          style={({ pressed }) => [
            styles.topActionBtn,
            { backgroundColor: '#0B8043' },
            pressed && styles.pressableDown,
          ]}
        >
          <Feather name="download" size={14} color="#fff" />
          <Text style={[styles.topActionText, compact && { fontSize: 11 }]}>Tạo phiếu nhập</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setSelectedReceiptDetail(null);
            setShowReceiptHistory(true);
          }}
          style={({ pressed }) => [
            styles.topActionBtn,
            { backgroundColor: '#455A64' },
            pressed && styles.pressableDown,
          ]}
        >
          <Feather name="file-text" size={14} color="#fff" />
          <Text style={[styles.topActionText, compact && { fontSize: 11 }]}>Lịch sử phiếu</Text>
        </Pressable>
      </View>

      <View style={[styles.searchBox, isDark && darkInventory.searchBox]}>
        <Feather name="search" size={16} color={BRAND_COLORS.textMuted} />
        <TextInput
          style={[styles.searchInput, isDark && darkInventory.searchInput]}
          placeholder="Tìm theo tên, SKU, barcode"
          placeholderTextColor={isDark ? '#7F93B5' : BRAND_COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <Pressable style={({ pressed }) => [styles.scanBtn, pressed && styles.pressableDown]} onPress={() => void handleOpenScanner('main')}>
          <Feather name="camera" size={15} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        <FilterChip label="Tất cả" active={stockFilter === 'all'} onPress={() => setStockFilter('all')} />
        <FilterChip label="Tồn thấp" active={stockFilter === 'low'} onPress={() => setStockFilter('low')} />
        <FilterChip label="Hết hàng" active={stockFilter === 'out'} onPress={() => setStockFilter('out')} />
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={renderPart}
          contentContainerStyle={[styles.listContent, isDark && darkInventory.listContent]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={BRAND_COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Không có phụ tùng phù hợp.</Text>
            </View>
          }
        />
      )}

      <Modal visible={showImportForm} animationType="slide" onRequestClose={() => setShowImportForm(false)}>
        <View style={[styles.importScreen, isDark && darkInventory.importScreen, { paddingTop: Math.max(4, insets.top) }]}>
          {receiptStep === 1 ? (
            <>
              <View style={styles.importBody}>
                <TouchableOpacity style={styles.supplierPicker} onPress={() => setShowSupplierPicker(true)}>
                  <Text style={styles.supplierPickerLabel}>NHÀ CUNG CẤP</Text>
                  <Text style={styles.supplierPickerValue}>{selectedSupplier?.name || 'Chọn nhà cung cấp'}</Text>
                  {!!selectedSupplier?.phone && <Text style={styles.supplierPickerPhone}>{selectedSupplier.phone}</Text>}
                </TouchableOpacity>

                <View style={styles.searchBoxDark}>
                  <Feather name="search" size={16} color="#9AB2D5" />
                  <TextInput
                    style={styles.searchInputDark}
                    placeholder="Tìm theo tên, SKU, barcode"
                    placeholderTextColor="#7A93B7"
                    value={importSearch}
                    onChangeText={setImportSearch}
                  />
                  <Pressable style={({ pressed }) => [styles.scanBtn, pressed && styles.pressableDown]} onPress={() => void handleOpenScanner('receipt')}>
                    <Feather name="camera" size={15} color="#fff" />
                  </Pressable>
                </View>

                <FlatList
                  data={importCandidates}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.importPartList}
                  renderItem={({ item }) => (
                    <View style={styles.importPartCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.importPartName}>{item.name}</Text>
                        <Text style={styles.importPartMeta}>SKU: {item.sku || '-'}</Text>
                        <Text style={styles.importPartMeta}>Giá nhập: {formatCurrency(fromBranchValue(item.costPrice, BRANCH_ID))}</Text>
                      </View>
                      <Pressable style={({ pressed }) => [styles.addImportBtn, pressed && styles.pressableDown]} onPress={() => addToReceipt(item)}>
                        <Feather name="plus" size={18} color="#fff" />
                      </Pressable>
                    </View>
                  )}
                />
              </View>

              <View style={[styles.importFooter, { paddingBottom: Math.max(10, insets.bottom + 6) }]}>
                <View style={styles.receiptCountBubble}>
                  <Text style={styles.receiptCountText}>{receiptLines.length}</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.importContinueBtn, pressed && styles.pressableDown]}
                  onPress={() => {
                    if (!selectedSupplier?.name) {
                      Alert.alert('Thiếu thông tin', 'Vui lòng chọn nhà cung cấp.');
                      return;
                    }
                    if (receiptLines.length === 0) {
                      Alert.alert('Thiếu thông tin', 'Vui lòng thêm ít nhất 1 sản phẩm.');
                      return;
                    }
                    setReceiptStep(2);
                  }}
                >
                  <Text style={styles.importContinueText}>Tiếp tục</Text>
                  <Text style={styles.importContinueAmount}>{formatCurrency(receiptTotal)}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.confirmHeader}>
                <TouchableOpacity onPress={() => setReceiptStep(1)}>
                  <Feather name="arrow-left" size={18} color="#EAF2FF" />
                </TouchableOpacity>
                <Text style={styles.confirmHeaderTitle}>Xác nhận nhập</Text>
                <View style={{ width: 18 }} />
              </View>

              <FlatList
                data={receiptLines}
                keyExtractor={(item) => item.partId}
                contentContainerStyle={styles.confirmList}
                ListFooterComponent={
                  <View style={styles.confirmFooterCard}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.confirmLabel}>Tổng tiền hàng</Text>
                      <Text style={styles.confirmValue}>{formatCurrency(receiptTotal)}</Text>
                    </View>

                    <Text style={[styles.confirmLabel, { marginTop: 12 }]}>Phương thức thanh toán</Text>
                    <View style={styles.paymentRow}>
                      <TouchableOpacity
                        style={[styles.paymentBtn, importPaymentMethod === 'cash' && styles.paymentBtnActive]}
                        onPress={() => setImportPaymentMethod('cash')}
                      >
                        <Text style={[styles.paymentText, importPaymentMethod === 'cash' && styles.paymentTextActive]}>Tiền mặt</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.paymentBtn, importPaymentMethod === 'bank' && styles.paymentBtnActive]}
                        onPress={() => setImportPaymentMethod('bank')}
                      >
                        <Text style={[styles.paymentText, importPaymentMethod === 'bank' && styles.paymentTextActive]}>Chuyển khoản</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.paymentTypeRow}>
                      <TouchableOpacity
                        style={[styles.paymentTypeBtn, importPaymentType === 'full' && styles.paymentTypeBtnActive]}
                        onPress={() => setImportPaymentType('full')}
                      >
                        <Text style={[styles.paymentTypeText, importPaymentType === 'full' && styles.paymentTypeTextActive]}>Đủ</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.paymentTypeBtn, importPaymentType === 'partial' && styles.paymentTypeBtnActive]}
                        onPress={() => setImportPaymentType('partial')}
                      >
                        <Text style={[styles.paymentTypeText, importPaymentType === 'partial' && styles.paymentTypeTextActive]}>Một phần</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.paymentTypeBtn, importPaymentType === 'note' && styles.paymentTypeBtnActive]}
                        onPress={() => setImportPaymentType('note')}
                      >
                        <Text style={[styles.paymentTypeText, importPaymentType === 'note' && styles.paymentTypeTextActive]}>Nợ</Text>
                      </TouchableOpacity>
                    </View>

                    {importPaymentType === 'partial' && (
                      <TextInput
                        style={styles.partialInput}
                        keyboardType="numeric"
                        placeholder="Nhập số tiền đã trả"
                        placeholderTextColor="#89A4CC"
                        value={importPaidAmount}
                        onChangeText={(v) => setImportPaidAmount(String(Math.max(0, Math.round(safeNumber(v)))))}
                      />
                    )}

                    <TextInput
                      style={styles.noteInput}
                      placeholder="Ghi chú phiếu nhập"
                      placeholderTextColor="#89A4CC"
                      value={importNote}
                      onChangeText={setImportNote}
                    />
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.confirmLine}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.confirmLineName}>{item.partName}</Text>
                      <Text style={styles.confirmLineMeta}>SKU: {item.sku || '-'}</Text>
                    </View>
                    <View style={styles.qtyEditor}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => {
                          const next = Math.max(1, item.quantity - 1);
                          updateLine(item.partId, { quantity: next });
                        }}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateLine(item.partId, { quantity: item.quantity + 1 })}>
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeLine(item.partId)}>
                      <Feather name="x" size={14} color="#FF748B" />
                    </TouchableOpacity>
                  </View>
                )}
              />

              <View style={[styles.confirmActions, { paddingBottom: Math.max(10, insets.bottom + 6) }]}>
                <Pressable
                  style={({ pressed }) => [styles.draftBtn, pressed && styles.pressableDown]}
                  onPress={() => Alert.alert('Thông báo', 'Đã lưu nháp tạm thời trong màn hiện tại.')}
                >
                  <Text style={styles.draftText}>Lưu nháp</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.submitBtn, createReceiptMutation.isPending && { opacity: 0.6 }, pressed && styles.pressableDown]}
                  onPress={() => createReceiptMutation.mutate()}
                  disabled={createReceiptMutation.isPending}
                >
                  {createReceiptMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitText}>NHẬP KHO</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}

          <Modal visible={showSupplierPicker} transparent animationType="slide" onRequestClose={() => setShowSupplierPicker(false)}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View style={[styles.rowBetween, { alignItems: 'center' }]}>
                  <Text style={styles.modalTitle}>Chọn nhà cung cấp</Text>
                  <TouchableOpacity onPress={() => setShowSupplierPicker(false)}>
                    <Feather name="x" size={18} color={BRAND_COLORS.textPrimary} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.qtyInput}
                  placeholder="Tìm theo tên, SDT"
                  placeholderTextColor={BRAND_COLORS.textMuted}
                  value={supplierKeyword}
                  onChangeText={setSupplierKeyword}
                />
                <FlatList
                  data={filteredSuppliers}
                  keyExtractor={(item) => item.id}
                  style={{ maxHeight: 360 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.supplierRow}
                      onPress={() => {
                        setSelectedSupplierId(item.id);
                        setShowSupplierPicker(false);
                      }}
                    >
                      <Text style={styles.supplierName}>{item.name}</Text>
                      {!!item.phone && <Text style={styles.supplierPhone}>{item.phone}</Text>}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>
        </View>
      </Modal>

      <Modal
        visible={showReceiptHistory}
        animationType="slide"
        onRequestClose={() => {
          setShowReceiptHistory(false);
          setSelectedReceiptDetail(null);
        }}
      >
        <View style={styles.historyScreen}>
          <View style={[styles.historyScreenHeader, { paddingTop: Math.max(12, insets.top + 6) }]}>
            <View style={styles.historyHeaderRow}>
              {selectedReceiptDetail ? (
                <TouchableOpacity style={styles.historyBackBtn} onPress={() => setSelectedReceiptDetail(null)}>
                  <Feather name="chevron-left" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
              <View>
                <Text style={styles.historyScreenTitle}>{selectedReceiptDetail ? 'Chi tiết phiếu nhập' : 'Lịch sử phiếu nhập'}</Text>
                {selectedReceiptDetail ? <Text style={styles.historyCodeSub}>{selectedReceiptDetail.receiptCode}</Text> : null}
              </View>
            </View>
            <TouchableOpacity
              style={styles.historyCloseBtn}
              onPress={() => {
                setShowReceiptHistory(false);
                setSelectedReceiptDetail(null);
              }}
            >
              <Feather name="x" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {!selectedReceiptDetail ? (
            <FlatList
              style={styles.historyScreenBody}
              contentContainerStyle={{ padding: 12, paddingBottom: Math.max(20, insets.bottom + 12), gap: 8 }}
              data={receiptHistory}
              keyExtractor={(item) => item.receiptCode}
              ListEmptyComponent={<Text style={styles.emptyText}>Chưa có phiếu nhập nào.</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.historyCard, pressed && styles.pressableDown]}
                  onPress={() => setSelectedReceiptDetail(item)}
                >
                  <View style={styles.rowBetween}>
                    <Text style={styles.historyCode}>{item.receiptCode}</Text>
                    <Feather name="chevron-right" size={16} color="#5F7DAA" />
                  </View>
                  <Text style={styles.historyMeta}>NCC: {item.supplierName || '-'}</Text>
                  <Text style={styles.historyMeta}>Ngày: {new Date(item.date).toLocaleString('vi-VN')}</Text>
                  <Text style={styles.historyMeta}>PTTT: {item.paymentMethod === 'bank' ? 'Chuyển khoản' : 'Tiền mặt'}</Text>
                  <Text style={styles.historyMeta}>Thanh toán: {item.paymentType === 'full' ? 'Đủ' : item.paymentType === 'partial' ? 'Một phần' : 'Ghi nợ'}</Text>
                  <Text style={styles.historyTapHint}>Chạm xem chi tiết ({item.lines.length} sản phẩm)</Text>
                  <Text style={styles.historyTotal}>{formatCurrency(item.totalAmount)}</Text>
                </Pressable>
              )}
            />
          ) : (
            <View style={styles.historyScreenBody}>
              <View style={[styles.historyDetailSummary, { marginHorizontal: 12, marginTop: 12 }]}>
                <Text style={styles.historyMeta}>NCC: {selectedReceiptDetail.supplierName || '-'}</Text>
                <Text style={styles.historyMeta}>Ngày: {new Date(selectedReceiptDetail.date).toLocaleString('vi-VN')}</Text>
                <Text style={styles.historyMeta}>PTTT: {selectedReceiptDetail.paymentMethod === 'bank' ? 'Chuyển khoản' : 'Tiền mặt'}</Text>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ gap: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: Math.max(88, insets.bottom + 72) }}
              >
                {selectedReceiptDetail.lines.map((line, idx) => (
                  <View key={`${line.partId}-${idx}`} style={styles.historyLineItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyLineName}>{line.partName}</Text>
                      <Text style={styles.historyLineMeta}>SKU: {line.sku || '-'}</Text>
                      <Text style={styles.historyLineMeta}>Danh mục: {line.category || '-'}</Text>
                      <Text style={styles.historyLineMeta}>SL: {line.quantity} x {formatCurrency(line.importPrice)}</Text>
                    </View>
                    <Text style={styles.historyLineTotal}>{formatCurrency(line.quantity * line.importPrice)}</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={[styles.historyStickyTotal, { paddingBottom: Math.max(10, insets.bottom + 6) }]}>
                <Text style={styles.historyStickyLabel}>Tổng cộng</Text>
                <Text style={styles.historyStickyValue}>{formatCurrency(selectedReceiptDetail.totalAmount || 0)}</Text>
              </View>
            </View>
          )}
        </View>
      </Modal>

      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={(event) => {
              const code = String(event?.data || '').trim();
              if (!code) return;
              handleScannedCode(code);
            }}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e', 'qr'],
            }}
          />
          <View style={styles.scannerOverlay}>
            <Text style={styles.scannerTitle}>Quét mã phụ tùng</Text>
            <View style={styles.scannerFrame} />
            <Pressable style={({ pressed }) => [styles.scannerClose, pressed && styles.pressableDown]} onPress={() => setShowScanner(false)}>
              <Text style={styles.scannerCloseText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const isDark = useColorScheme() === 'dark';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        isDark && darkInventory.filterChip,
        active && styles.filterChipActive,
        active && isDark && darkInventory.filterChipActive,
        pressed && styles.filterChipPressed,
      ]}
    >
      <Text style={[styles.filterChipText, isDark && darkInventory.secondaryText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function InventoryPartCard({ item, isDark }: { item: Part; isDark?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;

  const runSpring = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      friction: 7,
      tension: 180,
    }).start();
  };

  const stock = fromBranchValue(item.stock, BRANCH_ID);
  const reserved = fromBranchValue(item.reservedstock, BRANCH_ID);
  const available = Math.max(0, stock - reserved);
  const importPrice = fromBranchValue(item.costPrice, BRANCH_ID);
  const retail = fromBranchValue(item.retailPrice, BRANCH_ID);
  const wholesale = fromBranchValue(item.wholesalePrice, BRANCH_ID);

  const stockStyle = available <= 0 ? styles.stockOut : available <= LOW_STOCK_THRESHOLD ? styles.stockLow : styles.stockOk;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={() => runSpring(0.985)}
        onPressOut={() => runSpring(1)}
        style={[styles.partCard, isDark && darkInventory.card]}
      >
        <View style={styles.partTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.partName, isDark && darkInventory.primaryText]}>{item.name}</Text>
            <Text style={[styles.partMeta, isDark && darkInventory.secondaryText]}>SKU: {item.sku || '-'}</Text>
            <Text style={[styles.partMeta, isDark && darkInventory.secondaryText]}>Danh mục: {item.category || 'Khác'}</Text>
          </View>

          <View style={[styles.stockPill, stockStyle]}>
            <Text style={styles.stockPillText}>{available}</Text>
            <Text style={styles.stockPillSub}>khả dụng</Text>
          </View>
        </View>

        <View style={styles.rowBetween}>
          <Text style={[styles.partMeta, isDark && darkInventory.secondaryText]}>Giữ chỗ: {reserved}</Text>
          <Text style={[styles.partMeta, isDark && darkInventory.secondaryText]}>Tổng tồn: {stock}</Text>
        </View>

        <View style={styles.priceGrid}>
          <View style={[styles.priceCell, styles.priceCellImport]}>
            <View style={styles.priceLabelRow}>
              <Feather name="download" size={11} color="#2F5EA8" />
              <Text style={styles.priceLabel}>Giá nhập</Text>
            </View>
            <Text style={[styles.priceValue, styles.priceValueImport]}>{formatCurrency(importPrice)}</Text>
          </View>
          <View style={[styles.priceCell, styles.priceCellRetail]}>
            <View style={styles.priceLabelRow}>
              <Feather name="tag" size={11} color="#1F7A3D" />
              <Text style={styles.priceLabel}>Giá bán</Text>
            </View>
            <Text style={[styles.priceValue, styles.priceValueRetail]}>{formatCurrency(retail)}</Text>
          </View>
          <View style={[styles.priceCell, styles.priceCellWholesale]}>
            <View style={styles.priceLabelRow}>
              <Feather name="layers" size={11} color="#6A3DA3" />
              <Text style={styles.priceLabel}>Giá sỉ</Text>
            </View>
            <Text style={[styles.priceValue, styles.priceValueWholesale]}>{formatCurrency(wholesale)}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF3FA' },
  header: {
    backgroundColor: BRAND_COLORS.primaryDark,
    paddingHorizontal: 14,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2, fontWeight: '600' },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  refreshButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#1C2E4A',
    shadowOpacity: 0.09,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  summaryValue: { color: BRAND_COLORS.primary, fontSize: 18, fontWeight: '800' },
  summaryLabel: { color: BRAND_COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 3 },

  topActionsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  topActionBtn: {
    flex: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  topActionText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  searchBox: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D5DFED',
    borderRadius: 14,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: BRAND_COLORS.textPrimary,
    fontSize: 14,
  },
  scanBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLORS.primary,
  },

  filterRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingBottom: 10 },
  filterChip: {
    borderWidth: 1,
    borderColor: '#CEDAEB',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 82,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#EAF3FF',
    borderColor: '#A8D3FF',
  },
  filterChipPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  filterChipText: { color: BRAND_COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: '#256ED9' },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 12, paddingBottom: 20, gap: 12 },
  emptyBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: { color: BRAND_COLORS.textSecondary, fontSize: 13, fontWeight: '600' },

  partCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E1EF',
    borderRadius: 18,
    padding: 14,
    gap: 8,
    shadowColor: '#132741',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  partTop: { flexDirection: 'row', gap: 8 },
  partName: { color: BRAND_COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  partMeta: { color: BRAND_COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  stockPill: {
    minWidth: 76,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockOk: { backgroundColor: '#E8F5E9' },
  stockLow: { backgroundColor: '#FFF3E0' },
  stockOut: { backgroundColor: '#FFEBEE' },
  stockPillText: { color: '#233A5E', fontSize: 15, fontWeight: '800' },
  stockPillSub: { color: BRAND_COLORS.textMuted, fontSize: 10, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },

  priceGrid: {
    marginTop: 2,
    flexDirection: 'row',
    gap: 8,
  },
  priceCell: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E2EF',
    backgroundColor: '#F8FAFD',
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  priceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceCellImport: {
    backgroundColor: '#F1F7FF',
    borderColor: '#CDE0FA',
  },
  priceCellRetail: {
    backgroundColor: '#F0FBF4',
    borderColor: '#CDEED8',
  },
  priceCellWholesale: {
    backgroundColor: '#F9F4FF',
    borderColor: '#E6D8FA',
  },
  priceLabel: {
    color: BRAND_COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  priceValue: {
    marginTop: 2,
    color: '#223453',
    fontSize: 12,
    fontWeight: '800',
  },
  priceValueImport: {
    color: '#2F5EA8',
  },
  priceValueRetail: {
    color: '#1F7A3D',
  },
  priceValueWholesale: {
    color: '#6A3DA3',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    padding: 14,
    gap: 6,
    maxHeight: '92%',
  },
  modalTitle: { color: BRAND_COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  modalPartName: { color: BRAND_COLORS.primary, fontSize: 14, fontWeight: '800' },
  modalPartMeta: { color: BRAND_COLORS.textMuted, fontSize: 12, marginBottom: 6 },
  inputLabel: { color: BRAND_COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  qtyInput: {
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: BRAND_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  modalButton: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  modalCancel: { backgroundColor: '#EEF2F8' },
  modalConfirm: { backgroundColor: BRAND_COLORS.primary },
  modalCancelText: { color: BRAND_COLORS.textSecondary, fontWeight: '800', fontSize: 13 },
  modalConfirmText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  importScreen: { flex: 1, backgroundColor: '#0A1430' },
  importBody: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },
  supplierPicker: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#456086',
    backgroundColor: '#0C1938',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  supplierPickerLabel: { color: '#9AB2D5', fontSize: 11, fontWeight: '700', marginBottom: 3 },
  supplierPickerValue: { color: '#EAF2FF', fontSize: 16, fontWeight: '800' },
  supplierPickerPhone: { color: '#7A93B7', fontSize: 12, marginTop: 2 },

  searchBoxDark: {
    borderWidth: 1,
    borderColor: '#355174',
    borderRadius: 12,
    backgroundColor: '#0B1A39',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchInputDark: { flex: 1, color: '#DCEBFF', paddingVertical: 10, fontSize: 14, fontWeight: '600' },
  importPartList: { paddingBottom: 12, gap: 8 },
  importPartCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334D73',
    backgroundColor: '#1B2A45',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  importPartName: { color: '#fff', fontSize: 14, fontWeight: '800' },
  importPartMeta: { color: '#9FB6D9', fontSize: 11, marginTop: 1 },
  addImportBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2E68E8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  importFooter: {
    borderTopWidth: 1,
    borderTopColor: '#1E2E4E',
    backgroundColor: '#192744',
    paddingHorizontal: 12,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiptCountBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptCountText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  importContinueBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#2E68E8',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  importContinueText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  importContinueAmount: { color: '#DCEBFF', fontSize: 14, fontWeight: '800' },

  confirmHeader: {
    height: 56,
    backgroundColor: '#2E68E8',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmHeaderTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  confirmList: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 8 },
  confirmLine: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334D73',
    backgroundColor: '#1B2A45',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmLineName: { color: '#fff', fontSize: 14, fontWeight: '800' },
  confirmLineMeta: { color: '#8CA6CC', fontSize: 11, marginTop: 1 },
  qtyEditor: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4B6288',
    backgroundColor: '#273954',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { color: '#DCEBFF', fontWeight: '800' },
  qtyText: { color: '#fff', minWidth: 18, textAlign: 'center', fontWeight: '800' },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A3449',
  },
  confirmFooterCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A5378',
    backgroundColor: '#1B2A45',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  confirmLabel: { color: '#D4E6FF', fontSize: 13, fontWeight: '700' },
  confirmValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
  paymentRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  paymentBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#415A7F',
    backgroundColor: '#1F304C',
    alignItems: 'center',
    paddingVertical: 10,
  },
  paymentBtnActive: { borderColor: '#17A44B', backgroundColor: '#16A34A' },
  paymentText: { color: '#D3E6FF', fontSize: 13, fontWeight: '700' },
  paymentTextActive: { color: '#fff' },
  paymentTypeRow: {
    borderRadius: 10,
    backgroundColor: '#364A67',
    padding: 4,
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  paymentTypeBtn: { flex: 1, borderRadius: 8, alignItems: 'center', paddingVertical: 8 },
  paymentTypeBtnActive: { backgroundColor: '#1B2D4A' },
  paymentTypeText: { color: '#AFC4E2', fontSize: 12, fontWeight: '700' },
  paymentTypeTextActive: { color: '#fff' },
  partialInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#425A7D',
    backgroundColor: '#12203D',
    color: '#DCEBFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
  },
  noteInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#425A7D',
    backgroundColor: '#12203D',
    color: '#DCEBFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
  },
  confirmActions: {
    borderTopWidth: 1,
    borderTopColor: '#1E2E4E',
    backgroundColor: '#192744',
    paddingHorizontal: 12,
    paddingTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  draftBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#5C7498',
    backgroundColor: '#243653',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  draftText: { color: '#D4E7FF', fontSize: 14, fontWeight: '700' },
  submitBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#2E68E8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  supplierRow: {
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  supplierName: { color: BRAND_COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  supplierPhone: { color: BRAND_COLORS.textMuted, fontSize: 12, marginTop: 2 },

  historyScreen: {
    flex: 1,
    backgroundColor: '#EEF3FA',
  },
  historyScreenHeader: {
    backgroundColor: '#153A7A',
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyScreenBody: {
    flex: 1,
  },
  historyScreenTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  historyCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyBackBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D5E0EE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAFF',
  },
  historyCodeSub: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },

  historyCard: {
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    backgroundColor: '#F8FAFD',
  },
  historyCode: { color: BRAND_COLORS.primary, fontWeight: '800', fontSize: 13 },
  historyMeta: { color: BRAND_COLORS.textSecondary, fontSize: 12, marginTop: 1 },
  historyTapHint: { color: '#2A6ED7', fontSize: 11, marginTop: 4, fontWeight: '700' },
  historyTotal: { color: BRAND_COLORS.textPrimary, fontWeight: '800', marginTop: 4 },
  historyDetailSummary: {
    borderWidth: 1,
    borderColor: '#D5E0EE',
    borderRadius: 10,
    backgroundColor: '#F7FAFF',
    padding: 10,
    marginTop: 4,
  },
  historyLineItem: {
    borderWidth: 1,
    borderColor: '#D5E0EE',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  historyLineName: { color: BRAND_COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  historyLineMeta: { color: BRAND_COLORS.textSecondary, fontSize: 11, marginTop: 1 },
  historyLineTotal: { color: '#204F96', fontSize: 12, fontWeight: '800' },
  historyStickyTotal: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#D5E0EE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyStickyLabel: {
    color: '#6E84A8',
    fontSize: 14,
    fontWeight: '700',
  },
  historyStickyValue: {
    color: '#1F3F77',
    fontSize: 16,
    fontWeight: '800',
  },

  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  scannerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  scannerFrame: {
    width: 240,
    height: 180,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
  },
  scannerClose: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  scannerCloseText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  pressableDown: {
    transform: [{ scale: 0.98 }],
    opacity: 0.94,
  },
});

const darkInventory = StyleSheet.create({
  container: { backgroundColor: '#0B1220' },
  header: { backgroundColor: '#0F1A31' },
  card: { backgroundColor: '#152239', borderColor: '#2B3C5A' },
  searchBox: { backgroundColor: '#152239', borderColor: '#2B3C5A' },
  searchInput: { color: '#E2E8F0' },
  listContent: { backgroundColor: '#0B1220' },
  importScreen: { backgroundColor: '#0B1220' },
  filterChip: { backgroundColor: '#152239', borderColor: '#2B3C5A' },
  filterChipActive: { backgroundColor: '#1E3A8A', borderColor: '#3B82F6' },
  primaryText: { color: '#E2E8F0' },
  secondaryText: { color: '#94A3B8' },
});
