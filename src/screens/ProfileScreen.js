import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../theme';
import { useCurrency } from '../context/SettingsContext';
import { formatSurface, formatDate } from '../utils/helpers';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { stats, jobs } = useData();
  const insets = useSafeAreaInsets();
  const fmt = useCurrency();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const currentYear = new Date().getFullYear();
  const thisYearJobs = jobs.filter((j) => new Date(j.date).getFullYear() === currentYear);
  const thisYearEarned = thisYearJobs.reduce((s, j) => s + parseFloat(j.totalPrice || 0), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.memberSince}>Member since {formatDate(user?.createdAt)}</Text>
      </View>

      {/* Year Summary */}
      <View style={styles.yearCard}>
        <Text style={styles.yearTitle}>{currentYear} Summary</Text>
        <View style={styles.yearStats}>
          <View style={styles.yearStat}>
            <Text style={styles.yearStatValue}>{thisYearJobs.length}</Text>
            <Text style={styles.yearStatLabel}>Jobs</Text>
          </View>
          <View style={styles.yearDivider} />
          <View style={styles.yearStat}>
            <Text style={styles.yearStatValue}>{fmt(thisYearEarned)}</Text>
            <Text style={styles.yearStatLabel}>Earned</Text>
          </View>
          <View style={styles.yearDivider} />
          <View style={styles.yearStat}>
            <Text style={styles.yearStatValue}>
              {formatSurface(thisYearJobs.reduce((s, j) => s + parseFloat(j.surface || 0), 0))}
            </Text>
            <Text style={styles.yearStatLabel}>Area</Text>
          </View>
        </View>
      </View>

      {/* All-time Stats */}
      <Text style={styles.sectionTitle}>All-time Statistics</Text>
      <View style={styles.statsGrid}>
        <StatRow icon="briefcase-outline" label="Total Jobs" value={stats.totalJobs.toString()} />
        <StatRow icon="cash-outline" label="Total Earned" value={fmt(stats.totalEarned)} />
        <StatRow icon="checkmark-circle-outline" label="Total Paid" value={fmt(stats.totalPaid)} color={COLORS.success} />
        <StatRow icon="time-outline" label="Still Owed" value={fmt(stats.totalUnpaid)} color={stats.totalUnpaid > 0 ? COLORS.danger : COLORS.success} />
        <StatRow icon="resize-outline" label="Total Surface" value={formatSurface(stats.totalSurface)} />
        <StatRow icon="alert-circle-outline" label="Unpaid Jobs" value={stats.unpaidCount.toString()} color={stats.unpaidCount > 0 ? COLORS.danger : COLORS.success} />
      </View>

      {/* Settings */}
      <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
        <Ionicons name="settings-outline" size={20} color={COLORS.primary} />
        <Text style={styles.settingsBtnText}>Currency & Settings</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.gray} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {/* Sign Out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Harvest Tracker v1.0</Text>
    </ScrollView>
  );
}

function StatRow({ icon, label, value, color }) {
  return (
    <View style={rowStyles.row}>
      <Ionicons name={icon} size={20} color={color || COLORS.primary} style={rowStyles.icon} />
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, color && { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.grayLight },
  content: { paddingBottom: 100 },
  header: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginLeft: SPACING.md,
    marginBottom: SPACING.sm,
    padding: 4,
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: { fontSize: 34, ...FONTS.bold, color: COLORS.white },
  name: { fontSize: 22, ...FONTS.bold, color: COLORS.white },
  email: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  memberSince: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  yearCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    margin: SPACING.md,
    padding: SPACING.lg,
    ...SHADOW.medium,
  },
  yearTitle: { fontSize: 14, ...FONTS.semiBold, color: COLORS.gray, marginBottom: SPACING.md, textAlign: 'center' },
  yearStats: { flexDirection: 'row', justifyContent: 'space-around' },
  yearStat: { alignItems: 'center' },
  yearStatValue: { fontSize: 20, ...FONTS.bold, color: COLORS.text },
  yearStatLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  yearDivider: { width: 1, backgroundColor: COLORS.grayBorder },
  sectionTitle: { fontSize: 14, ...FONTS.semiBold, color: COLORS.textLight, marginHorizontal: SPACING.md, marginTop: SPACING.sm, marginBottom: SPACING.sm },
  statsGrid: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.md,
    overflow: 'hidden',
    ...SHADOW.small,
  },
  settingsBtn: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: COLORS.grayBorder,
    ...SHADOW.small,
  },
  settingsBtnText: { color: COLORS.primary, fontSize: 15, ...FONTS.medium, marginLeft: 8 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: COLORS.dangerLight,
    ...SHADOW.small,
  },
  logoutText: { color: COLORS.danger, fontSize: 15, ...FONTS.semiBold, marginLeft: 8 },
  version: { textAlign: 'center', fontSize: 12, color: COLORS.gray, marginTop: SPACING.lg },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.grayLight,
  },
  icon: { marginRight: SPACING.md },
  label: { flex: 1, fontSize: 14, color: COLORS.text },
  value: { fontSize: 15, ...FONTS.bold, color: COLORS.text },
});
