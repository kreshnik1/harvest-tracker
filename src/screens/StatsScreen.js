import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/SettingsContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../theme';
import { formatSurface } from '../utils/helpers';
import DatePicker from '../components/DatePicker';

const FILTERS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom' },
];

function fmtDate(date) {
  if (!date) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function StatsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { jobs, loadJobs } = useData();
  const fmt = useCurrency();

  const [filter, setFilter] = useState('month');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  useEffect(() => { loadJobs(); }, []);

  // Build effective date range
  const { rangeFrom, rangeTo } = useMemo(() => {
    const now = new Date();
    if (filter === 'week') {
      const from = new Date(now);
      const day = now.getDay();
      from.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      from.setHours(0, 0, 0, 0);
      return { rangeFrom: from, rangeTo: now };
    }
    if (filter === 'month') {
      return { rangeFrom: new Date(now.getFullYear(), now.getMonth(), 1), rangeTo: now };
    }
    if (filter === 'year') {
      return { rangeFrom: new Date(now.getFullYear(), 0, 1), rangeTo: now };
    }
    if (filter === 'custom') {
      const to = toDate ? new Date(toDate) : null;
      if (to) to.setHours(23, 59, 59, 999);
      return { rangeFrom: fromDate, rangeTo: to };
    }
    return { rangeFrom: null, rangeTo: null }; // all
  }, [filter, fromDate, toDate]);

  const filteredJobs = useMemo(() => {
    if (!rangeFrom && !rangeTo) return jobs;
    return jobs.filter((j) => {
      const d = new Date(j.date);
      if (rangeFrom && d < rangeFrom) return false;
      if (rangeTo && d > rangeTo) return false;
      return true;
    });
  }, [jobs, rangeFrom, rangeTo]);

  // Computed stats
  const totalEarned = filteredJobs.reduce((s, j) => s + parseFloat(j.totalPrice || 0), 0);
  const totalPaid   = filteredJobs.filter((j) => j.paid).reduce((s, j) => s + parseFloat(j.totalPrice || 0), 0);
  const totalUnpaid = totalEarned - totalPaid;
  const totalArea   = filteredJobs.reduce((s, j) => s + parseFloat(j.surface || 0), 0);
  const paidCount   = filteredJobs.filter((j) => j.paid).length;
  const unpaidCount = filteredJobs.filter((j) => !j.paid).length;

  // Monthly bars
  const monthlyData = useMemo(() => {
    const map = {};
    filteredJobs.forEach((j) => {
      const d = new Date(j.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { key, label, earned: 0, jobs: 0 };
      map[key].earned += parseFloat(j.totalPrice || 0);
      map[key].jobs += 1;
    });
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredJobs]);
  const maxMonthly = Math.max(...monthlyData.map((m) => m.earned), 1);

  // Top clients
  const clientData = useMemo(() => {
    const map = {};
    filteredJobs.forEach((j) => {
      const name = j.clientName || 'Unknown';
      if (!map[name]) map[name] = { name, earned: 0, jobs: 0, paid: 0 };
      map[name].earned += parseFloat(j.totalPrice || 0);
      map[name].jobs += 1;
      if (j.paid) map[name].paid += parseFloat(j.totalPrice || 0);
    });
    return Object.values(map).sort((a, b) => b.earned - a.earned).slice(0, 5);
  }, [filteredJobs]);

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Statistics</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={20} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="person-outline" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Period Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.pill, filter === f.key && styles.pillActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.pillText, filter === f.key && styles.pillTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Custom Date Range Pickers */}
        {filter === 'custom' && (
          <View style={styles.dateRangeRow}>
            <TouchableOpacity
              style={styles.dateField}
              onPress={() => setShowFromPicker(true)}
            >
              <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.dateFieldLabel}>From</Text>
                <Text style={[styles.dateFieldValue, !fromDate && { color: COLORS.gray }]}>
                  {fromDate ? fmtDate(fromDate) : 'Select date'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.dateArrow}>
              <Ionicons name="arrow-forward" size={18} color={COLORS.gray} />
            </View>

            <TouchableOpacity
              style={styles.dateField}
              onPress={() => setShowToPicker(true)}
            >
              <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.dateFieldLabel}>To</Text>
                <Text style={[styles.dateFieldValue, !toDate && { color: COLORS.gray }]}>
                  {toDate ? fmtDate(toDate) : 'Select date'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Active period label */}
        {(rangeFrom || filter !== 'all') && (
          <View style={styles.periodBadge}>
            <Ionicons name="time-outline" size={13} color={COLORS.primary} />
            <Text style={styles.periodText}>
              {filter === 'all'
                ? `All ${filteredJobs.length} jobs`
                : filter === 'custom'
                ? `${rangeFrom ? fmtDate(rangeFrom) : '…'} → ${rangeTo ? fmtDate(rangeTo) : '…'} · ${filteredJobs.length} jobs`
                : `${fmtDate(rangeFrom)} → Today · ${filteredJobs.length} jobs`}
            </Text>
          </View>
        )}

        {/* Summary Grid */}
        <View style={styles.grid}>
          <StatCard icon="cash-outline"           label="Total Earned"  value={fmt(totalEarned)}              color={COLORS.primary} />
          <StatCard icon="checkmark-circle-outline" label="Collected"   value={fmt(totalPaid)}                color={COLORS.success} />
          <StatCard icon="time-outline"            label="Pending"      value={fmt(totalUnpaid)}              color={totalUnpaid > 0 ? COLORS.danger : COLORS.success} />
          <StatCard icon="resize-outline"          label="Total Area"   value={formatSurface(totalArea)}      color="#1565C0" />
          <StatCard icon="briefcase-outline"       label="Jobs Done"    value={String(filteredJobs.length)}   color="#6A1B9A" />
          <StatCard icon="alert-circle-outline"    label="Unpaid Jobs"  value={String(unpaidCount)}           color={unpaidCount > 0 ? COLORS.danger : COLORS.success} />
        </View>

        {/* Payment Progress */}
        {totalEarned > 0 && (
          <Section title="Payment Progress">
            <View style={styles.progressCard}>
              <View style={styles.progressLabelRow}>
                <Text style={[styles.progressLabel, { color: COLORS.success }]}>
                  {fmt(totalPaid)} paid
                </Text>
                <Text style={[styles.progressLabel, { color: totalUnpaid > 0 ? COLORS.danger : COLORS.success }]}>
                  {totalUnpaid > 0 ? `${fmt(totalUnpaid)} remaining` : 'Fully collected ✓'}
                </Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${(totalPaid / totalEarned) * 100}%` }]} />
              </View>
              <Text style={styles.progressPercent}>
                {Math.round((totalPaid / totalEarned) * 100)}% collected
                {'  ·  '}{paidCount} paid / {unpaidCount} pending
              </Text>
            </View>
          </Section>
        )}

        {/* Monthly Chart */}
        {monthlyData.length > 1 && (
          <Section title="Earnings by Month">
            <View style={styles.chartCard}>
              {monthlyData.map((m) => (
                <View key={m.key} style={styles.barRow}>
                  <Text style={styles.barLabel}>{m.label}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${Math.max((m.earned / maxMonthly) * 100, 2)}%` },
                      ]}
                    />
                    <Text style={styles.barInlineValue}>{m.jobs} job{m.jobs !== 1 ? 's' : ''}</Text>
                  </View>
                  <Text style={styles.barValue}>{fmt(m.earned)}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* Top Clients */}
        {clientData.length > 0 && (
          <Section title={`Top Clients${clientData.length < filteredJobs.length ? ` (top ${clientData.length})` : ''}`}>
            <View style={styles.clientCard}>
              {clientData.map((c, i) => {
                const owes = c.earned - c.paid;
                return (
                  <View key={c.name} style={[styles.clientRow, i < clientData.length - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.grayLight }]}>
                    <View style={[styles.rankBadge, { backgroundColor: i === 0 ? '#FFF8E1' : COLORS.grayLight }]}>
                      <Text style={[styles.rankText, { color: i === 0 ? '#F9A825' : COLORS.gray }]}>
                        #{i + 1}
                      </Text>
                    </View>
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{c.name}</Text>
                      <Text style={styles.clientMeta}>{c.jobs} job{c.jobs !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.clientEarned}>{fmt(c.earned)}</Text>
                      {owes > 0.01
                        ? <Text style={styles.clientOwes}>owes {fmt(owes)}</Text>
                        : <Text style={styles.clientPaid}>all paid ✓</Text>
                      }
                    </View>
                  </View>
                );
              })}
            </View>
          </Section>
        )}

        {filteredJobs.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={56} color={COLORS.grayBorder} />
            <Text style={styles.emptyTitle}>No data</Text>
            <Text style={styles.emptyText}>No jobs found for this period</Text>
          </View>
        )}
      </ScrollView>

      {/* Date Pickers */}
      <DatePicker
        visible={showFromPicker}
        value={fromDate}
        label="Select start date"
        onChange={(d) => { setFromDate(d); }}
        onClose={() => setShowFromPicker(false)}
      />
      <DatePicker
        visible={showToPicker}
        value={toDate}
        label="Select end date"
        onChange={(d) => { setToDate(d); }}
        onClose={() => setShowToPicker(false)}
      />
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={sStyles.container}>
      <Text style={sStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <View style={cStyles.card}>
      <View style={[cStyles.iconBg, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[cStyles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={cStyles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.grayLight },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 20, ...FONTS.bold, color: COLORS.white },
  settingsBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  content: { padding: SPACING.md, paddingBottom: 100 },
  filterRow: { paddingBottom: SPACING.sm, gap: 8 },
  pill: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: RADIUS.full, backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: COLORS.grayBorder, ...SHADOW.small,
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: 13, ...FONTS.medium, color: COLORS.gray },
  pillTextActive: { color: COLORS.white },

  // Custom date range
  dateRangeRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: SPACING.sm, gap: SPACING.sm,
  },
  dateField: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    padding: SPACING.sm, borderWidth: 1.5, borderColor: COLORS.primary,
    ...SHADOW.small,
  },
  dateFieldLabel: { fontSize: 10, ...FONTS.semiBold, color: COLORS.primary, textTransform: 'uppercase' },
  dateFieldValue: { fontSize: 13, ...FONTS.semiBold, color: COLORS.text, marginTop: 1 },
  dateArrow: { alignItems: 'center', justifyContent: 'center' },

  periodBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primaryPale,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    alignSelf: 'flex-start', marginBottom: SPACING.md, gap: 4,
  },
  periodText: { fontSize: 12, color: COLORS.primary, ...FONTS.medium },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },

  progressCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.md, ...SHADOW.small,
  },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  progressLabel: { fontSize: 13, ...FONTS.semiBold },
  progressBg: { height: 10, backgroundColor: COLORS.grayLight, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: SPACING.sm },
  progressFill: { height: '100%', backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full },
  progressPercent: { fontSize: 12, color: COLORS.gray, textAlign: 'center' },

  chartCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOW.small },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  barLabel: { width: 48, fontSize: 11, color: COLORS.gray, ...FONTS.medium },
  barTrack: {
    flex: 1, height: 22, backgroundColor: COLORS.grayLight, borderRadius: RADIUS.full,
    overflow: 'hidden', marginHorizontal: SPACING.sm, justifyContent: 'center',
  },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full },
  barInlineValue: { fontSize: 10, color: COLORS.textLight, ...FONTS.medium, marginLeft: SPACING.sm, zIndex: 1 },
  barValue: { width: 76, fontSize: 12, ...FONTS.bold, color: COLORS.text, textAlign: 'right' },

  clientCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.small },
  clientRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
  rankBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  rankText: { fontSize: 12, ...FONTS.bold },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 14, ...FONTS.semiBold, color: COLORS.text },
  clientMeta: { fontSize: 11, color: COLORS.gray },
  clientEarned: { fontSize: 14, ...FONTS.bold, color: COLORS.text },
  clientOwes: { fontSize: 11, color: COLORS.danger, ...FONTS.medium },
  clientPaid: { fontSize: 11, color: COLORS.success, ...FONTS.medium },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, ...FONTS.bold, color: COLORS.textLight, marginTop: SPACING.md },
  emptyText: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
});

const sStyles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  title: { fontSize: 14, ...FONTS.bold, color: COLORS.textLight, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
});

const cStyles = StyleSheet.create({
  card: {
    flex: 1, minWidth: '45%',
    backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    padding: SPACING.md, ...SHADOW.small,
  },
  iconBg: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  value: { fontSize: 17, ...FONTS.bold },
  label: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
});
