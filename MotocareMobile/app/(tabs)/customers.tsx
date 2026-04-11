import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../shared/supabaseClient';
import { BRAND_COLORS, formatCurrency, formatDate } from '../../constants';
import type { Customer } from '../../shared/types';

const fetchCustomers = async () => {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone, vehicles, status, segment, totalSpent, visitCount, lastVisit')
    .order('name', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as Customer[];
};

const SEGMENT_COLORS: Record<string, string> = {
  VIP: '#1565C0', Loyal: '#2E7D32', Potential: '#E65100',
  'At Risk': '#C62828', Lost: '#5A7090', New: '#7B1FA2',
};
const SEGMENT_EMOJI: Record<string, string> = {
  VIP: '⭐', Loyal: '💚', Potential: '🔥', 'At Risk': '⚠️', Lost: '💔', New: '🆕',
};

export default function CustomersScreen() {
  const [search, setSearch] = useState('');

  const normalizePlate = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  const { data: customers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
  });

  const normalizedSearch = search.toLowerCase().trim();
  const normalizedPlateSearch = normalizePlate(search);

  const filtered = customers.filter(c => {
    if (!normalizedSearch) return true;

    const nameMatch = c.name.toLowerCase().includes(normalizedSearch);
    const phoneMatch = (c.phone ?? '').includes(search);
    const vehiclePlateMatch = (c.vehicles ?? []).some(v => {
      const plate = v.licensePlate ?? '';
      return (
        plate.toLowerCase().includes(normalizedSearch) ||
        (normalizedPlateSearch.length > 0 && normalizePlate(plate).includes(normalizedPlateSearch))
      );
    });

    return nameMatch || phoneMatch || vehiclePlateMatch;
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Tìm theo tên, số điện thoại, biển số..."
          placeholderTextColor={BRAND_COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <Text style={styles.countText}>{filtered.length} khách hàng</Text>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND_COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>👤</Text>
              <Text style={styles.emptyText}>Không tìm thấy khách hàng</Text>
            </View>
          }
          renderItem={({ item }) => <CustomerCard customer={item} />}
        />
      )}
    </View>
  );
}

function CustomerCard({ customer }: { customer: Customer }) {
  const vehicles = customer.vehicles ?? [];
  const primaryVehicle = vehicles.find(v => v.isPrimary) ?? vehicles[0];
  const segColor = customer.segment ? SEGMENT_COLORS[customer.segment] ?? '#5A7090' : '#5A7090';
  const segEmoji = customer.segment ? SEGMENT_EMOJI[customer.segment] ?? '' : '';

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: BRAND_COLORS.primaryLight + '33' }]}>
          <Text style={styles.avatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.nameRow}>
            <Text style={styles.customerName}>{customer.name}</Text>
            {customer.segment && (
              <View style={[styles.segBadge, { backgroundColor: segColor + '22' }]}>
                <Text style={[styles.segText, { color: segColor }]}>
                  {segEmoji} {customer.segment}
                </Text>
              </View>
            )}
          </View>

          {customer.phone && (
            <Text style={styles.phone}>📞 {customer.phone}</Text>
          )}

          {primaryVehicle && (
            <Text style={styles.vehicle}>
              🚗 {primaryVehicle.licensePlate}
              {primaryVehicle.model ? `  •  ${primaryVehicle.model}` : ''}
            </Text>
          )}

          {vehicles.length > 1 && (
            <Text style={styles.vehicleCount}>+{vehicles.length - 1} xe khác</Text>
          )}
        </View>
      </View>

      {/* Stats row */}
      {(customer.totalSpent || customer.visitCount) && (
        <View style={styles.statsRow}>
          {customer.visitCount && (
            <Text style={styles.statItem}>🔧 {customer.visitCount} lần ghé</Text>
          )}
          {customer.totalSpent && (
            <Text style={styles.statItem}>💳 {formatCurrency(customer.totalSpent)}</Text>
          )}
          {customer.lastVisit && (
            <Text style={styles.statItem}>🕒 {formatDate(customer.lastVisit)}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND_COLORS.background },
  searchRow: { padding: 12, paddingBottom: 0 },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 14,
    color: BRAND_COLORS.textPrimary,
    borderWidth: 1.5,
    borderColor: BRAND_COLORS.border,
  },
  countText: {
    fontSize: 12,
    color: BRAND_COLORS.textMuted,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  listContent: { padding: 12, gap: 10, paddingBottom: 32 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 15, color: BRAND_COLORS.textSecondary },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  cardRow: { flexDirection: 'row', gap: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND_COLORS.primary,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  customerName: { fontSize: 15, fontWeight: '700', color: BRAND_COLORS.textPrimary },
  segBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  segText: { fontSize: 11, fontWeight: '700' },
  phone: { fontSize: 13, color: BRAND_COLORS.textSecondary },
  vehicle: { fontSize: 13, color: BRAND_COLORS.textSecondary },
  vehicleCount: { fontSize: 11, color: BRAND_COLORS.primary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, borderTopWidth: 1, borderTopColor: BRAND_COLORS.border, paddingTop: 8 },
  statItem: { fontSize: 12, color: BRAND_COLORS.textSecondary },
});
