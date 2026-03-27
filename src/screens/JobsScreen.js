import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../theme';
import { useCurrency } from '../context/SettingsContext';
import { formatSurface, formatDate, getPaymentStatus, getRemainingAmount } from '../utils/helpers';

export default function JobsScreen({ navigation }) {
  const { jobs, loaded, loadJobs } = useData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const insets = useSafeAreaInsets();
  const fmt = useCurrency();

  useEffect(() => { loadJobs(); }, []);

  const filtered = jobs.filter((j) => {
    const matchesSearch =
      j.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      j.locationName?.toLowerCase().includes(search.toLowerCase());
    const status = getPaymentStatus(j);
    const matchesFilter =
      filter === 'all' ||
      (filter === 'paid' && status === 'paid') ||
      (filter === 'partial' && status === 'partial') ||
      (filter === 'unpaid' && status === 'unpaid');
    return matchesSearch && matchesFilter;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Jobs</Text>
        <Text style={styles.headerCount}>{jobs.length} total</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color={COLORS.gray} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by client or location..."
          placeholderTextColor={COLORS.gray}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.gray} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Pills */}
      <View style={styles.filterRow}>
        {['all', 'paid', 'partial', 'unpaid'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.pill, filter === f && styles.pillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.count}>{filtered.length} job{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={!loaded} onRefresh={loadJobs} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="leaf-outline" size={52} color={COLORS.grayBorder} />
            <Text style={styles.emptyText}>No jobs found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const status = getPaymentStatus(item);
          const remaining = getRemainingAmount(item);
          const dotColor = status === 'paid' ? COLORS.primaryLight : status === 'partial' ? COLORS.secondary : COLORS.danger;
          const badgeBg  = status === 'paid' ? COLORS.successLight : status === 'partial' ? '#FFF8E1' : COLORS.dangerLight;
          const badgeColor = status === 'paid' ? COLORS.success : status === 'partial' ? '#E65100' : COLORS.danger;
          const badgeLabel = status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Unpaid';
          return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
          >
            <View style={styles.cardLeft}>
              <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.clientName}>{item.clientName}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={12} color={COLORS.gray} />
                <Text style={styles.meta}>{formatDate(item.date)}</Text>
                <Ionicons name="resize-outline" size={12} color={COLORS.gray} style={{ marginLeft: 8 }} />
                <Text style={styles.meta}>{formatSurface(item.surface)}</Text>
              </View>
              {item.locationName ? (
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={12} color={COLORS.gray} />
                  <Text style={styles.meta} numberOfLines={1}>{item.locationName}</Text>
                </View>
              ) : null}
              {status === 'partial' && (
                <Text style={styles.remainingText}>Remaining: {fmt(remaining)}</Text>
              )}
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.price}>{fmt(item.totalPrice)}</Text>
              <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
              </View>
            </View>
          </TouchableOpacity>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => navigation.navigate('AddJob')}
      >
        <Ionicons name="add" size={30} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.grayLight },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 22, ...FONTS.bold, color: COLORS.white },
  headerCount: { fontSize: 13, color: 'rgba(255,255,255,0.75)', ...FONTS.medium, marginBottom: 2 },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: SPACING.md, marginBottom: SPACING.sm,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md,
    height: 44, ...SHADOW.small,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  filterRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, marginBottom: SPACING.sm,
  },
  pill: {
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderRadius: RADIUS.full, backgroundColor: COLORS.white,
    marginRight: 8, borderWidth: 1, borderColor: COLORS.grayBorder,
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: 13, ...FONTS.medium, color: COLORS.gray },
  pillTextActive: { color: COLORS.white },
  count: { marginLeft: 'auto', fontSize: 12, color: COLORS.gray },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.small,
  },
  cardLeft: { marginRight: SPACING.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardBody: { flex: 1 },
  clientName: { fontSize: 15, ...FONTS.semiBold, color: COLORS.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  meta: { fontSize: 12, color: COLORS.gray, marginLeft: 4 },
  remainingText: { fontSize: 11, color: '#E65100', ...FONTS.medium, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', marginLeft: SPACING.sm },
  price: { fontSize: 16, ...FONTS.bold, color: COLORS.text },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full, marginTop: 4,
  },
  badgeText: { fontSize: 11, ...FONTS.semiBold },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, color: COLORS.gray, marginTop: SPACING.sm },
  fab: {
    position: 'absolute', right: SPACING.lg,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    ...SHADOW.medium,
  },
});
