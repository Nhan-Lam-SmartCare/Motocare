import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../shared/supabaseClient';
import { formatCurrency } from '../../constants';

type DashboardData = {
  todayRevenue: number;
  lowStockCount: number;
  receivedCount: number;
  repairingCount: number;
  doneCount: number;
  deliveredCount: number;
  canceledCount: number;
};

const fetchDashboardData = async (): Promise<DashboardData> => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const [salesRes, ordersRes, lowStockRes] = await Promise.all([
    supabase.from('sales').select('total').gte('date', start).lt('date', end),
    supabase.from('work_orders').select('status'),
    supabase.rpc('get_low_stock_count').maybeSingle(),
  ]);

  const todayRevenue = (salesRes.data ?? []).reduce((sum, row) => sum + (Number(row.total) || 0), 0);
  let receivedCount = 0;
  let repairingCount = 0;
  let doneCount = 0;
  let deliveredCount = 0;
  let canceledCount = 0;

  (ordersRes.data ?? []).forEach((row: any) => {
    const status = row?.status;
    if (status === 'Tiếp nhận') receivedCount += 1;
    else if (status === 'Đang sửa') repairingCount += 1;
    else if (status === 'Đã sửa xong') doneCount += 1;
    else if (status === 'Trả máy') deliveredCount += 1;
    else if (status === 'Đã hủy') canceledCount += 1;
  });

  return {
    todayRevenue,
    lowStockCount: Number(lowStockRes.data || 0),
    receivedCount,
    repairingCount,
    doneCount,
    deliveredCount,
    canceledCount,
  };
};

const quickActions = [
  { key: 'sales', label: 'Ban hang', route: '/(tabs)/sales', bg: '#0E4D3E' },
  { key: 'repair', label: 'Sua chua', route: '/(tabs)/workorders', bg: '#1C2332' },
  { key: 'inventory', label: 'Kho hang', route: '/(tabs)/inventory', bg: '#5C3300' },
  { key: 'customers', label: 'Khach hang', route: '/(tabs)/customers', bg: '#0D4755' },
  { key: 'finance', label: 'Tai chinh', route: '/(tabs)/more', bg: '#1C2332' },
  { key: 'debt', label: 'Cong no', route: '/(tabs)/more', bg: '#580000' },
  { key: 'cashbook', label: 'So quy', route: '/(tabs)/more', bg: '#524100' },
  { key: 'reports', label: 'Bao cao', route: '/(tabs)/more', bg: '#1C2332' },
];

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-live'],
    queryFn: fetchDashboardData,
    refetchInterval: 60000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('mobile-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-live'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-live'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const userName = user?.email?.split('@')[0] || 'Nhan vien';
  const dateLabel = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#081126" />

      <View style={styles.topBar}>
        <Text style={styles.menu}>☰</Text>
        <View style={styles.brandWrap}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoText}>⚡</Text>
          </View>
          <Text style={styles.brandText}>Nhan Lam SmartCare</Text>
        </View>
        <View style={styles.topRight}>
          <Text style={styles.icon}>🔔</Text>
          <Text style={styles.icon}>⌂</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.greetingCard}>
          <Text style={styles.greetingTitle}>Xin chao, {userName}</Text>
          <Text style={styles.greetingDate}>{dateLabel}</Text>

          <View style={styles.walletRow}>
            <View style={styles.walletCard}>
              <Text style={styles.walletLabel}>Tien mat</Text>
              <Text style={styles.walletValue}>******</Text>
            </View>
            <View style={styles.walletCard}>
              <Text style={styles.walletLabel}>Ngan hang</Text>
              <Text style={styles.walletValue}>******</Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#63A8FF" />
            <Text style={styles.loadingText}>Dang dong bo du lieu...</Text>
          </View>
        ) : null}

        {isError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Khong tai duoc du lieu dashboard</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryBtnText}>{isRefetching ? 'Dang thu lai...' : 'Thu lai'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Bao cao</Text>
            <Text style={styles.periodText}>Thang nay</Text>
          </View>
          <View style={styles.reportRow}>
            <View style={styles.reportCard}>
              <Text style={styles.reportLabel}>Doanh thu</Text>
              <Text style={styles.reportValue}>{formatCurrency(data?.todayRevenue || 0)}</Text>
            </View>
            <View style={styles.reportCard}>
              <Text style={styles.reportLabel}>Loi nhuan</Text>
              <Text style={[styles.reportValue, styles.reportValueGreen]}>{formatCurrency(Math.max(0, (data?.todayRevenue || 0) * 0.28))}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Trang thai phieu sua chua</Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Bien nhan moi</Text>
            <Text style={styles.statusValue}>{data?.receivedCount || 0}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Da sua xong</Text>
            <Text style={styles.statusValue}>{data?.doneCount || 0}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Dang sua</Text>
            <Text style={styles.statusValue}>{data?.repairingCount || 0}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Da tra xe</Text>
            <Text style={styles.statusValue}>{data?.deliveredCount || 0}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Da huy</Text>
            <Text style={styles.statusValue}>{data?.canceledCount || 0}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Truy cap nhanh</Text>
          <View style={styles.gridWrap}>
            {quickActions.map((item) => (
              <TouchableOpacity key={item.key} style={[styles.gridItem, { backgroundColor: item.bg }]} onPress={() => router.push(item.route as any)}>
                <Text style={styles.gridText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>Ton kho thap</Text>
          <Text style={styles.alertText}>{data?.lowStockCount || 0} san pham sap het hang</Text>
        </View>

        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>So du thap</Text>
          <Text style={styles.alertText}>So du tai khoan duoi 10 trieu</Text>
        </View>

        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutBtnText}>Dang xuat</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111318',
  },
  topBar: {
    height: 74,
    backgroundColor: '#081126',
    borderBottomWidth: 1,
    borderBottomColor: '#263754',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menu: { color: '#D0D8E7', fontSize: 24 },
  brandWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginLeft: 8 },
  logoWrap: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: '#10203A',
    borderWidth: 1,
    borderColor: '#27446E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 18 },
  brandText: { color: '#E4EBFA', fontWeight: '700', fontSize: 18 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { color: '#D0D8E7', fontSize: 20 },
  content: { padding: 14, gap: 12, paddingBottom: 30 },
  greetingCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#C9781A',
  },
  greetingTitle: { color: '#FFEFE3', fontSize: 30, fontWeight: '800' },
  greetingDate: { color: '#F7DBC5', fontSize: 13, marginTop: 2 },
  walletRow: { marginTop: 12, flexDirection: 'row', gap: 10 },
  walletCard: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 10 },
  walletLabel: { color: '#F2E0D2', fontSize: 12 },
  walletValue: { color: '#FFFFFF', fontSize: 16, marginTop: 4, fontWeight: '800' },
  sectionCard: {
    backgroundColor: '#161A22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#273853',
    padding: 12,
    gap: 10,
  },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#E5ECFA', fontSize: 17, fontWeight: '800' },
  periodText: { color: '#A9B9D6', fontSize: 14 },
  reportRow: { flexDirection: 'row', gap: 10 },
  reportCard: { flex: 1, backgroundColor: '#1B1F2A', borderRadius: 12, padding: 12 },
  reportLabel: { color: '#A9B7D0', fontSize: 13 },
  reportValue: { marginTop: 8, color: '#63A8FF', fontSize: 22, fontWeight: '800' },
  reportValueGreen: { color: '#67F0A1' },
  loadingCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#445576',
    padding: 16,
    backgroundColor: '#171B24',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: { color: '#C2CDDF', fontSize: 13 },
  errorCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#6E2E38',
    padding: 14,
    backgroundColor: '#2A151A',
    gap: 10,
  },
  errorTitle: { color: '#FFBBC4', fontSize: 14, fontWeight: '700' },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#7D2230',
  },
  retryBtnText: { color: '#FFE5E9', fontSize: 12, fontWeight: '800' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1E28',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusLabel: { color: '#C9D3E8', fontSize: 16, flex: 1 },
  statusValue: { color: '#E8EEF9', fontSize: 22, fontWeight: '800' },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: {
    width: '23%',
    minWidth: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
    paddingHorizontal: 6,
  },
  gridText: { color: '#D6E1F4', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  alertCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#445576',
    padding: 12,
    backgroundColor: '#171B24',
  },
  alertTitle: { color: '#F2C46A', fontSize: 16, fontWeight: '700' },
  alertText: { marginTop: 4, color: '#C2CDDF', fontSize: 14 },
  signOutBtn: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#9D1B24',
  },
  signOutBtnText: { color: '#fff', fontWeight: '800' },
});
