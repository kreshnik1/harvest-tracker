import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../theme';
import { useCurrency } from '../context/SettingsContext';
import { formatSurface, formatDate } from '../utils/helpers';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { jobs, stats, loaded, loadJobs } = useData();
  const insets = useSafeAreaInsets();
  const fmt = useCurrency();

  useEffect(() => {
    loadJobs();
  }, []);

  const recentJobs = jobs.slice(0, 5);
  const unpaidJobs = jobs.filter((j) => !j.paid);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={!loaded} onRefresh={loadJobs} />}
    >
      {/* Header */}
      <View style={[styles.headerBg, { paddingTop: insets.top + SPACING.sm }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
            <Text style={styles.headerSub}>Harvest Tracker</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Profile')}>
              <Ionicons name="person-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddJob')}>
              <Ionicons name="add" size={28} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard icon="cash-outline" label="Total Earned" value={fmt(stats.totalEarned)} color={COLORS.white} />
          <StatCard icon="hourglass-outline" label="Unpaid" value={fmt(stats.totalUnpaid)} color="#FFD54F" />
          <StatCard icon="expand-outline" label="Total Area" value={formatSurface(stats.totalSurface)} color={COLORS.white} />
        </View>
      </View>

      {/* Unpaid Alert */}
      {unpaidJobs.length > 0 && (
        <TouchableOpacity
          style={styles.alertBox}
          onPress={() => navigation.navigate('Clients')}
        >
          <Ionicons name="alert-circle" size={22} color={COLORS.secondary} />
          <Text style={styles.alertText}>
            {unpaidJobs.length} unpaid job{unpaidJobs.length > 1 ? 's' : ''} — {fmt(stats.totalUnpaid)} pending
          </Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.secondary} />
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <QuickAction
          icon="add-circle"
          label="New Job"
          color={COLORS.primary}
          onPress={() => navigation.navigate('AddJob')}
        />
        <QuickAction
          icon="map"
          label="Map View"
          color="#1565C0"
          onPress={() => navigation.navigate('Map')}
        />
        <QuickAction
          icon="people"
          label="Clients"
          color="#E65100"
          onPress={() => navigation.navigate('Clients')}
        />
        <QuickAction
          icon="list"
          label="All Jobs"
          color="#4A148C"
          onPress={() => navigation.navigate('Jobs')}
        />
      </View>

      {/* Recent Jobs */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Jobs</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {recentJobs.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="leaf-outline" size={48} color={COLORS.grayBorder} />
            <Text style={styles.emptyText}>No jobs yet</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddJob')}>
              <Text style={styles.emptyBtnText}>Add your first job</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.jobCard}
              onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
            >
              <View style={[styles.jobStatus, { backgroundColor: job.paid ? COLORS.successLight : COLORS.dangerLight }]}>
                <Ionicons
                  name={job.paid ? 'checkmark-circle' : 'time-outline'}
                  size={20}
                  color={job.paid ? COLORS.success : COLORS.danger}
                />
              </View>
              <View style={styles.jobInfo}>
                <Text style={styles.jobClient} numberOfLines={1}>{job.clientName}</Text>
                <Text style={styles.jobMeta}>{formatDate(job.date)} · {formatSurface(job.surface)}</Text>
                {job.locationName ? <Text style={styles.jobLocation} numberOfLines={1}><Ionicons name="location-outline" size={12} /> {job.locationName}</Text> : null}
              </View>
              <View style={styles.jobRight}>
                <Text style={styles.jobPrice}>{fmt(job.totalPrice)}</Text>
                <Text style={[styles.jobPaidLabel, { color: job.paid ? COLORS.success : COLORS.danger }]}>
                  {job.paid ? 'Paid' : 'Unpaid'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <View style={statStyles.card}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity style={qaStyles.item} onPress={onPress}>
      <View style={[qaStyles.circle, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <Text style={qaStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.grayLight },
  content: { paddingBottom: 100 },
  headerBg: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.lg },
  greeting: { fontSize: 22, ...FONTS.bold, color: COLORS.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  alertBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF8E1',
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4, borderLeftColor: COLORS.secondary,
    ...SHADOW.small,
  },
  alertText: { flex: 1, marginLeft: 8, fontSize: 13, ...FONTS.medium, color: '#E65100' },
  quickActions: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOW.small,
  },
  section: { margin: SPACING.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 16, ...FONTS.bold, color: COLORS.text },
  seeAll: { fontSize: 13, color: COLORS.primary, ...FONTS.medium },
  empty: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyText: { fontSize: 15, color: COLORS.gray, marginTop: SPACING.sm },
  emptyBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  emptyBtnText: { color: COLORS.white, ...FONTS.semiBold },
  jobCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.small,
  },
  jobStatus: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  jobInfo: { flex: 1, marginRight: SPACING.sm },
  jobClient: { fontSize: 15, ...FONTS.semiBold, color: COLORS.text },
  jobMeta: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  jobLocation: { fontSize: 11, color: COLORS.gray, marginTop: 1 },
  jobRight: { alignItems: 'flex-end' },
  jobPrice: { fontSize: 15, ...FONTS.bold, color: COLORS.text },
  jobPaidLabel: { fontSize: 11, ...FONTS.medium, marginTop: 2 },
});

const statStyles = StyleSheet.create({
  card: { flex: 1, alignItems: 'center', padding: 8 },
  value: { fontSize: 16, ...FONTS.bold, marginTop: 4 },
  label: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2, textAlign: 'center' },
});

const qaStyles = StyleSheet.create({
  item: { alignItems: 'center', flex: 1 },
  circle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 11, ...FONTS.medium, color: COLORS.textLight },
});
