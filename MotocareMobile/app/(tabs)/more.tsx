import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../shared/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { BRAND_COLORS } from '../../constants';

interface MenuItemProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  desc: string;
  onPress: () => void;
  disabled?: boolean;
}

function MenuItem({ icon, label, desc, onPress, disabled }: MenuItemProps) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, disabled && styles.menuItemDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <View style={styles.menuIcon}>
        <MaterialCommunityIcons name={icon} size={24} color="#8AA0BE" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuDesc}>{desc}</Text>
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: connectionStats, isLoading: statsLoading, isError: statsError, refetch: refetchStats, isRefetching } = useQuery({
    queryKey: ['mobile-connection-stats'],
    queryFn: async () => {
      const [customers, sales, workOrders] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('sales').select('id', { count: 'exact', head: true }),
        supabase.from('work_orders').select('id', { count: 'exact', head: true }),
      ]);

      if (customers.error || sales.error || workOrders.error) {
        throw customers.error || sales.error || workOrders.error;
      }

      return {
        customers: customers.count ?? 0,
        sales: sales.count ?? 0,
        workOrders: workOrders.count ?? 0,
        checkedAt: new Date().toLocaleTimeString('vi-VN'),
      };
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('mobile-more-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        queryClient.invalidateQueries({ queryKey: ['mobile-connection-stats'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        queryClient.invalidateQueries({ queryKey: ['mobile-connection-stats'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['mobile-connection-stats'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const openFeature = (feature: 'reports' | 'staff' | 'debt' | 'orders') => {
    router.push({ pathname: '/(tabs)/more-feature', params: { feature } });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User profile card */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>
            {(user?.email ?? 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <Text style={styles.profileRole}>Nhân viên nội bộ</Text>
        </View>
      </View>

      <View style={styles.connectionCard}>
        <View style={styles.connectionHeaderRow}>
          <Text style={styles.connectionTitle}>Ket noi du lieu</Text>
          <TouchableOpacity onPress={() => refetchStats()}>
            <Text style={styles.refreshText}>{isRefetching ? 'Dang lam moi...' : 'Lam moi'}</Text>
          </TouchableOpacity>
        </View>

        {statsLoading ? (
          <View style={styles.connectionLoading}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.connectionSub}>Dang kiem tra Supabase...</Text>
          </View>
        ) : statsError ? (
          <>
            <Text style={styles.connectionSubError}>Trang thai: Mat ket noi</Text>
            <Text style={styles.connectionSub}>Khong the lay du lieu tu Supabase. Vui long kiem tra mang hoac quyen truy cap.</Text>
          </>
        ) : (
          <>
            <Text style={styles.connectionSub}>Trang thai: Da ket noi</Text>
            <View style={styles.connectionGrid}>
              <View style={styles.connectionBox}>
                <Text style={styles.connectionNum}>{connectionStats?.customers ?? 0}</Text>
                <Text style={styles.connectionLabel}>Khach hang</Text>
              </View>
              <View style={styles.connectionBox}>
                <Text style={styles.connectionNum}>{connectionStats?.sales ?? 0}</Text>
                <Text style={styles.connectionLabel}>Don ban</Text>
              </View>
              <View style={styles.connectionBox}>
                <Text style={styles.connectionNum}>{connectionStats?.workOrders ?? 0}</Text>
                <Text style={styles.connectionLabel}>Phieu sua</Text>
              </View>
            </View>
            <Text style={styles.checkedAt}>Cap nhat luc: {connectionStats?.checkedAt}</Text>
          </>
        )}
      </View>

      {/* Quản lý */}
      <Text style={styles.sectionHeader}>Quản lý</Text>
      <View style={styles.menuGroup}>
        <MenuItem
          icon="package-variant-closed"
          label="Kho hàng"
          desc="Xem tồn kho, tìm phụ tùng"
          onPress={() => router.push('/(tabs)/inventory')}
        />
        <MenuItem
          icon="chart-box-outline"
          label="Báo cáo"
          desc="Doanh thu, lợi nhuận theo tháng"
          onPress={() => openFeature('reports')}
        />
        <MenuItem
          icon="account-hard-hat"
          label="Nhân viên"
          desc="Chấm công, xem lương"
          onPress={() => openFeature('staff')}
        />
        <MenuItem
          icon="bank"
          label="Công nợ"
          desc="Công nợ khách hàng & nhà cung cấp"
          onPress={() => openFeature('debt')}
        />
        <MenuItem
          icon="clipboard-text-outline"
          label="Đặt hàng"
          desc="Đơn nhập hàng từ nhà cung cấp"
          onPress={() => openFeature('orders')}
        />
      </View>

      {/* Cài đặt */}
      <Text style={styles.sectionHeader}>Tiện ích</Text>
      <View style={styles.menuGroup}>
        <MenuItem
          icon="barcode-scan"
          label="Quét mã vạch"
          desc="Tìm phụ tùng theo barcode"
          onPress={() => router.push('/(tabs)/inventory')}
        />
        <MenuItem
          icon="bell-outline"
          label="Thông báo"
          desc="Phiếu mới, tồn kho thấp"
          onPress={() => Alert.alert('Thông báo', 'Mục này đang được hoàn thiện, sẽ có trong bản cập nhật tiếp theo.')}
        />
      </View>

      {/* Đăng xuất */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() =>
          Alert.alert('Xác nhận', 'Bạn có chắc muốn đăng xuất?', [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Đăng xuất', style: 'destructive', onPress: signOut },
          ])
        }
      >
        <Text style={styles.logoutText}>🚪  Đăng xuất</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Motocare Mobile v1.0 · Phase 1</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND_COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  profileCard: {
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  profileEmail: { fontSize: 15, fontWeight: '700', color: '#fff' },
  profileRole: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  connectionCard: {
    backgroundColor: '#0E2B57',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E4A86',
  },
  connectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectionTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  refreshText: { color: '#BFDBFE', fontSize: 12, fontWeight: '700' },
  connectionSub: { color: '#DBEAFE', fontSize: 12, marginTop: 8 },
  connectionSubError: { color: '#FFC8D0', fontSize: 12, marginTop: 8, fontWeight: '700' },
  connectionLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  connectionGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  connectionBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  connectionNum: { color: '#fff', fontSize: 18, fontWeight: '800' },
  connectionLabel: { color: '#DBEAFE', fontSize: 11, marginTop: 2 },
  checkedAt: { color: '#BFDBFE', fontSize: 11, marginTop: 10 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND_COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.border,
  },
  menuItemDisabled: { opacity: 0.6 },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: BRAND_COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: { fontSize: 15, fontWeight: '700', color: BRAND_COLORS.textPrimary },
  menuDesc: { fontSize: 12, color: BRAND_COLORS.textSecondary, marginTop: 1 },
  menuArrow: { fontSize: 22, color: BRAND_COLORS.textMuted },
  logoutBtn: {
    backgroundColor: BRAND_COLORS.errorLight,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: BRAND_COLORS.error },
  versionText: { textAlign: 'center', fontSize: 12, color: BRAND_COLORS.textMuted },
});
