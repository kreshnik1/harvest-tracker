import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../theme';
import { useCurrency, useTranslation } from '../context/SettingsContext';
import { formatSurface, formatDate, groupByClient, getPaymentStatus, getAmountPaid, getRemainingAmount } from '../utils/helpers';

export default function ClientsScreen({ navigation }) {
  const { jobs, loaded, loadJobs, markPaid } = useData();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const insets = useSafeAreaInsets();
  const fmt = useCurrency();
  const t = useTranslation();

  useEffect(() => { loadJobs(); }, []);

  const clients = groupByClient(jobs).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleExpand = (name) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const unpaidClients = clients.filter((c) => c.totalAmount > c.paidAmount);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>{t('clients')}</Text>
        <Text style={styles.headerCount}>{clients.length} {t('total')}</Text>
      </View>

      {/* Summary Banner */}
      {unpaidClients.length > 0 && (
        <View style={styles.summaryBanner}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{unpaidClients.length}</Text>
            <Text style={styles.summaryLabel}>{t('clients_with_debt')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {fmt(unpaidClients.reduce((s, c) => s + (c.totalAmount - c.paidAmount), 0))}
            </Text>
            <Text style={styles.summaryLabel}>{t('total_owed')}</Text>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color={COLORS.gray} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('search_clients')}
          placeholderTextColor={COLORS.gray}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={clients}
        keyExtractor={(item) => item.name}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={!loaded} onRefresh={loadJobs} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={52} color={COLORS.grayBorder} />
            <Text style={styles.emptyText}>{t('no_clients')}</Text>
          </View>
        }
        renderItem={({ item: client }) => {
          const owes = client.totalAmount - client.paidAmount;
          const isExpanded = expanded[client.name];
          const hasDebt = owes > 0;

          return (
            <View style={styles.clientCard}>
              <TouchableOpacity onPress={() => toggleExpand(client.name)} activeOpacity={0.8}>
                <View style={styles.clientHeader}>
                  <View style={[styles.avatarCircle, { backgroundColor: hasDebt ? COLORS.dangerLight : COLORS.successLight }]}>
                    <Text style={[styles.avatarText, { color: hasDebt ? COLORS.danger : COLORS.success }]}>
                      {client.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    <Text style={styles.clientMeta}>
                      {client.jobs.length} job{client.jobs.length !== 1 ? 's' : ''} ·{' '}
                      {formatSurface(client.jobs.reduce((s, j) => s + parseFloat(j.surface || 0), 0))}
                    </Text>
                  </View>
                  <View style={styles.clientRight}>
                    <Text style={styles.clientTotal}>{fmt(client.totalAmount)}</Text>
                    {hasDebt ? (
                      <Text style={styles.owes}>{t('owes')} {fmt(owes)}</Text>
                    ) : (
                      <Text style={styles.allPaid}>{t('all_paid')}</Text>
                    )}
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18} color={COLORS.gray}
                    style={{ marginLeft: 4 }}
                  />
                </View>
              </TouchableOpacity>

              {/* Progress Bar */}
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${client.totalAmount > 0 ? (client.paidAmount / client.totalAmount) * 100 : 0}%`,
                      backgroundColor: hasDebt ? COLORS.secondary : COLORS.primaryLight,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>{t('paid_label')}: {fmt(client.paidAmount)}</Text>
                <Text style={styles.progressLabel}>
                  {hasDebt ? `${t('remaining')}: ${fmt(owes)}` : t('fully_paid_check')}
                </Text>
              </View>

              {/* Expanded Jobs */}
              {isExpanded && (
                <View style={styles.jobsList}>
                  {client.jobs.map((job) => {
                    const st = getPaymentStatus(job);
                    const rem = getRemainingAmount(job);
                    const dotColor = st === 'paid' ? COLORS.primaryLight : st === 'partial' ? COLORS.secondary : COLORS.danger;
                    return (
                    <TouchableOpacity
                      key={job.id}
                      style={styles.jobRow}
                      onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
                    >
                      <View style={[styles.smallDot, { backgroundColor: dotColor }]} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.jobRowDate}>{formatDate(job.date)}</Text>
                        {job.locationName ? <Text style={styles.jobRowLocation}>{job.locationName}</Text> : null}
                        <Text style={styles.jobRowSurface}>{formatSurface(job.surface)}</Text>
                        {st === 'partial' && <Text style={styles.partialText}>{t('remaining')}: {fmt(rem)}</Text>}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.jobRowPrice}>{fmt(job.totalPrice)}</Text>
                        {st !== 'paid' && (
                          <TouchableOpacity
                            style={styles.payNowBtn}
                            onPress={() => markPaid(job.id)}
                          >
                            <Text style={styles.payNowText}>{st === 'partial' ? `${t('pay_amount')} ${fmt(rem)}` : t('pay_now')}</Text>
                          </TouchableOpacity>
                        )}
                        {st === 'paid' && <Text style={styles.paidCheck}>✓ {t('paid')}</Text>}
                      </View>
                    </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        }}
      />
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
  summaryBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.danger,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 20, ...FONTS.bold, color: COLORS.white },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  summaryDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)' },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: SPACING.md, marginBottom: SPACING.sm,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md,
    height: 44, ...SHADOW.small,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  clientCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.small,
  },
  clientHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.sm,
  },
  avatarText: { fontSize: 20, ...FONTS.bold },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 15, ...FONTS.bold, color: COLORS.text },
  clientMeta: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  clientRight: { alignItems: 'flex-end', marginRight: 4 },
  clientTotal: { fontSize: 16, ...FONTS.bold, color: COLORS.text },
  owes: { fontSize: 12, color: COLORS.danger, ...FONTS.medium, marginTop: 2 },
  allPaid: { fontSize: 12, color: COLORS.success, ...FONTS.medium, marginTop: 2 },
  progressBg: {
    height: 6, backgroundColor: COLORS.grayLight,
    borderRadius: RADIUS.full, overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: { height: '100%', borderRadius: RADIUS.full },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 11, color: COLORS.gray },
  jobsList: { borderTopWidth: 1, borderTopColor: COLORS.grayBorder, marginTop: SPACING.sm, paddingTop: SPACING.sm },
  jobRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.grayLight,
  },
  smallDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  jobRowDate: { fontSize: 13, ...FONTS.medium, color: COLORS.text },
  jobRowLocation: { fontSize: 11, color: COLORS.gray, marginTop: 1 },
  jobRowSurface: { fontSize: 11, color: COLORS.gray },
  jobRowPrice: { fontSize: 14, ...FONTS.bold, color: COLORS.text },
  payNowBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full, marginTop: 4,
  },
  payNowText: { fontSize: 11, color: COLORS.white, ...FONTS.semiBold },
  paidCheck: { fontSize: 11, color: COLORS.success, ...FONTS.medium, marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, color: COLORS.gray, marginTop: SPACING.sm },
});
