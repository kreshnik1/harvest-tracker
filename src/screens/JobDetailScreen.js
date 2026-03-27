import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Platform, Modal, TextInput, KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/SettingsContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../theme';
import { formatSurface, formatDate, getPolygonCenter, getAmountPaid, getRemainingAmount, getPaymentStatus } from '../utils/helpers';

export default function JobDetailScreen({ route, navigation }) {
  const { jobId } = route.params;
  const { jobs, addPayment, removePayment, markUnpaid, removeJob } = useData();
  const fmt = useCurrency();
  const insets = useSafeAreaInsets();
  const job = jobs.find((j) => j.id === jobId);

  const [showPayModal, setShowPayModal] = useState(false);

  if (!job) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Job not found</Text>
      </View>
    );
  }

  const amountPaid   = getAmountPaid(job);
  const remaining    = getRemainingAmount(job);
  const status       = getPaymentStatus(job);
  const totalPrice   = parseFloat(job.totalPrice || 0);
  const paidPercent  = totalPrice > 0 ? (amountPaid / totalPrice) * 100 : 0;
  const payments     = job.payments || (job.paid ? [{ id: 'legacy', amount: totalPrice, date: job.paidDate || job.date, note: 'Paid' }] : []);

  const mapCenter = job.polygon?.length > 0 ? getPolygonCenter(job.polygon) : job.location;
  const mapRegion = mapCenter ? { ...mapCenter, latitudeDelta: 0.01, longitudeDelta: 0.01 } : null;

  const handleDelete = () => {
    Alert.alert('Delete Job', 'This will permanently delete this job and all its payment records.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await removeJob(jobId); navigation.goBack(); } },
    ]);
  };

  const handleRemovePayment = (paymentId) => {
    Alert.alert('Remove Payment', 'Remove this payment record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removePayment(jobId, paymentId) },
    ]);
  };

  const handleResetPayments = () => {
    Alert.alert('Reset Payments', 'Remove all payment records for this job?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => markUnpaid(jobId) },
    ]);
  };

  // Status colors & labels
  const statusConfig = {
    paid:    { color: COLORS.success,   bg: COLORS.successLight,  label: 'Fully Paid',      icon: 'checkmark-circle' },
    partial: { color: COLORS.secondary, bg: '#FFF8E1',             label: 'Partially Paid',  icon: 'ellipse-outline' },
    unpaid:  { color: COLORS.danger,    bg: COLORS.dangerLight,    label: 'Not Paid',        icon: 'time-outline' },
  };
  const sc = statusConfig[status];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{job.clientName}</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: sc.bg }]}>
          <Ionicons name={sc.icon} size={26} color={sc.color} />
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: sc.color }]}>{sc.label}</Text>
            {status === 'partial' && (
              <Text style={styles.statusSub}>{fmt(remaining)} still to collect</Text>
            )}
            {status === 'paid' && job.paidDate && (
              <Text style={styles.statusSub}>Completed {formatDate(job.paidDate)}</Text>
            )}
          </View>
          {status !== 'paid' && (
            <TouchableOpacity style={[styles.payBtn, { backgroundColor: sc.color }]} onPress={() => setShowPayModal(true)}>
              <Text style={styles.payBtnText}>+ Pay</Text>
            </TouchableOpacity>
          )}
          {status === 'paid' && (
            <TouchableOpacity style={styles.resetBtn} onPress={handleResetPayments}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Payment Progress Bar */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Payment Progress</Text>
            <Text style={styles.progressPercent}>{Math.round(paidPercent)}%</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, {
              width: `${paidPercent}%`,
              backgroundColor: status === 'paid' ? COLORS.primaryLight : status === 'partial' ? COLORS.secondary : COLORS.grayBorder,
            }]} />
          </View>
          <View style={styles.progressAmounts}>
            <Text style={styles.progressPaid}>Collected: {fmt(amountPaid)}</Text>
            <Text style={[styles.progressRemaining, { color: remaining > 0 ? COLORS.danger : COLORS.success }]}>
              {remaining > 0 ? `Remaining: ${fmt(remaining)}` : 'Fully collected ✓'}
            </Text>
          </View>
        </View>

        {/* Job Info Cards */}
        <View style={styles.infoGrid}>
          <InfoCard icon="cash-outline"    label="Total Price" value={fmt(job.totalPrice)}       color={COLORS.primary} />
          <InfoCard icon="resize-outline"  label="Surface"     value={formatSurface(job.surface)} color="#1565C0" />
          <InfoCard icon="calendar-outline" label="Date"       value={formatDate(job.date)}       color="#E65100" />
          {job.pricePerM2 && (
            <InfoCard icon="calculator-outline" label="Per m²" value={fmt(job.pricePerM2)}       color="#6A1B9A" />
          )}
        </View>

        {/* Location */}
        {job.locationName ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.gray} />
            <Text style={styles.locationText}>{job.locationName}</Text>
          </View>
        ) : null}

        {/* Map */}
        {mapRegion && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Field on Map</Text>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={mapRegion}
                mapType="satellite"
                scrollEnabled={false}
              >
                {job.location && !job.polygon && <Marker coordinate={job.location} pinColor={COLORS.primary} />}
                {job.polygon?.length >= 3 && (
                  <>
                    <Polygon coordinates={job.polygon} fillColor="rgba(46,125,50,0.4)" strokeColor={COLORS.primaryLight} strokeWidth={2} />
                    {mapCenter && <Marker coordinate={mapCenter} pinColor={COLORS.primary} />}
                  </>
                )}
              </MapView>
            </View>
          </View>
        )}

        {/* Payment History */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            {status !== 'paid' && (
              <TouchableOpacity style={styles.addPaySmallBtn} onPress={() => setShowPayModal(true)}>
                <Ionicons name="add" size={16} color={COLORS.primary} />
                <Text style={styles.addPaySmallText}>Add payment</Text>
              </TouchableOpacity>
            )}
          </View>

          {payments.length === 0 ? (
            <View style={styles.noPayments}>
              <Ionicons name="wallet-outline" size={32} color={COLORS.grayBorder} />
              <Text style={styles.noPaymentsText}>No payments recorded yet</Text>
              <TouchableOpacity style={styles.firstPayBtn} onPress={() => setShowPayModal(true)}>
                <Text style={styles.firstPayText}>Record first payment</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.paymentList}>
              {payments.map((p, i) => (
                <View key={p.id} style={[styles.paymentRow, i < payments.length - 1 && styles.paymentRowBorder]}>
                  <View style={[styles.paymentDot, { backgroundColor: COLORS.primaryLight }]} />
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentAmount}>{fmt(p.amount)}</Text>
                    <Text style={styles.paymentDate}>{formatDate(p.date)}</Text>
                    {p.note ? <Text style={styles.paymentNote}>{p.note}</Text> : null}
                  </View>
                  {p.id !== 'legacy' && (
                    <TouchableOpacity onPress={() => handleRemovePayment(p.id)} style={styles.removePayBtn}>
                      <Ionicons name="close-circle-outline" size={20} color={COLORS.gray} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {/* Summary row */}
              <View style={styles.paymentSummary}>
                <Text style={styles.paymentSummaryLabel}>Total collected</Text>
                <Text style={styles.paymentSummaryValue}>{fmt(amountPaid)} / {fmt(totalPrice)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Notes */}
        {job.notes ? (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{job.notes}</Text>
          </View>
        ) : null}

        {/* Action Button */}
        {status !== 'paid' && (
          <TouchableOpacity style={styles.mainActionBtn} onPress={() => setShowPayModal(true)}>
            <Ionicons name="cash-outline" size={22} color={COLORS.white} style={{ marginRight: 8 }} />
            <Text style={styles.mainActionText}>Record Payment</Text>
          </TouchableOpacity>
        )}
        {status === 'paid' && (
          <TouchableOpacity style={[styles.mainActionBtn, { backgroundColor: COLORS.danger }]} onPress={handleResetPayments}>
            <Ionicons name="refresh-outline" size={22} color={COLORS.white} style={{ marginRight: 8 }} />
            <Text style={styles.mainActionText}>Reset All Payments</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Payment Modal */}
      <PaymentModal
        visible={showPayModal}
        remaining={remaining}
        totalPrice={totalPrice}
        fmt={fmt}
        onClose={() => setShowPayModal(false)}
        onConfirm={async (amount, note) => {
          setShowPayModal(false);
          await addPayment(jobId, amount, note);
        }}
      />
    </View>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

function PaymentModal({ visible, remaining, totalPrice, fmt, onClose, onConfirm }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    const val = parseFloat(amount);
    if (!amount || isNaN(val) || val <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid payment amount.');
      return;
    }
    if (val > remaining + 0.001) {
      Alert.alert('Amount too high', `Maximum remaining is ${fmt(remaining)}`);
      return;
    }
    setLoading(true);
    await onConfirm(val, note);
    setAmount('');
    setNote('');
    setLoading(false);
  };

  const setFull = () => setAmount(remaining.toFixed(2));
  const setHalf = () => setAmount((remaining / 2).toFixed(2));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={pm.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={pm.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={pm.sheet}>
          {/* Handle */}
          <View style={pm.handle} />

          <Text style={pm.title}>Record Payment</Text>
          <Text style={pm.sub}>Remaining: {fmt(remaining)}  ·  Total: {fmt(totalPrice)}</Text>

          {/* Quick amount buttons */}
          <View style={pm.quickRow}>
            <TouchableOpacity style={pm.quickBtn} onPress={setFull}>
              <Text style={pm.quickBtnText}>Full {fmt(remaining)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={pm.quickBtn} onPress={setHalf}>
              <Text style={pm.quickBtnText}>Half {fmt(remaining / 2)}</Text>
            </TouchableOpacity>
          </View>

          {/* Amount input */}
          <Text style={pm.label}>Amount *</Text>
          <View style={pm.amountRow}>
            <View style={pm.amountBox}>
              <TextInput
                style={pm.amountInput}
                placeholder="0.00"
                placeholderTextColor={COLORS.gray}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
          </View>

          {/* Note input */}
          <Text style={pm.label}>Note (optional)</Text>
          <View style={pm.noteBox}>
            <TextInput
              style={pm.noteInput}
              placeholder="e.g. Cash payment, Bank transfer…"
              placeholderTextColor={COLORS.gray}
              value={note}
              onChangeText={setNote}
            />
          </View>

          {/* Buttons */}
          <View style={pm.btnRow}>
            <TouchableOpacity style={pm.cancelBtn} onPress={onClose}>
              <Text style={pm.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={pm.confirmBtn} onPress={handleConfirm} disabled={loading}>
              {loading
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={pm.confirmText}>Save Payment</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Info Card ────────────────────────────────────────────────────────────────

function InfoCard({ icon, label, value, color }) {
  return (
    <View style={ic.card}>
      <View style={[ic.iconBg, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={ic.value} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={ic.label}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.grayLight },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg,
  },
  iconBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, ...FONTS.bold, color: COLORS.white, textAlign: 'center' },
  content: { padding: SPACING.md, paddingBottom: 60 },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.md, ...SHADOW.small,
  },
  statusInfo: { flex: 1, marginLeft: SPACING.sm },
  statusLabel: { fontSize: 15, ...FONTS.bold },
  statusSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  payBtn: { paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.full },
  payBtnText: { color: COLORS.white, ...FONTS.bold, fontSize: 14 },
  resetBtn: { paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.dangerLight },
  resetBtnText: { color: COLORS.danger, ...FONTS.semiBold, fontSize: 13 },

  progressCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md, ...SHADOW.small,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  progressTitle: { fontSize: 13, ...FONTS.semiBold, color: COLORS.textLight },
  progressPercent: { fontSize: 13, ...FONTS.bold, color: COLORS.text },
  progressBg: { height: 8, backgroundColor: COLORS.grayLight, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: SPACING.sm },
  progressFill: { height: '100%', borderRadius: RADIUS.full },
  progressAmounts: { flexDirection: 'row', justifyContent: 'space-between' },
  progressPaid: { fontSize: 12, color: COLORS.success, ...FONTS.medium },
  progressRemaining: { fontSize: 12, ...FONTS.medium },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },

  locationRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.md, ...SHADOW.small,
  },
  locationText: { fontSize: 14, color: COLORS.text, marginLeft: 6, ...FONTS.medium },

  section: { marginBottom: SPACING.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 13, ...FONTS.bold, color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.5 },
  addPaySmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addPaySmallText: { fontSize: 13, color: COLORS.primary, ...FONTS.semiBold },

  mapContainer: { height: 200, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.small },
  map: { flex: 1 },

  noPayments: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: 'center', ...SHADOW.small },
  noPaymentsText: { fontSize: 14, color: COLORS.gray, marginTop: SPACING.sm },
  firstPayBtn: { marginTop: SPACING.md, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.full },
  firstPayText: { color: COLORS.white, ...FONTS.semiBold },

  paymentList: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.small },
  paymentRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
  paymentRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  paymentDot: { width: 10, height: 10, borderRadius: 5, marginRight: SPACING.sm },
  paymentInfo: { flex: 1 },
  paymentAmount: { fontSize: 16, ...FONTS.bold, color: COLORS.text },
  paymentDate: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  paymentNote: { fontSize: 12, color: COLORS.textLight, marginTop: 1, fontStyle: 'italic' },
  removePayBtn: { padding: 4 },
  paymentSummary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.primaryPale,
    padding: SPACING.md,
  },
  paymentSummaryLabel: { fontSize: 13, ...FONTS.semiBold, color: COLORS.primary },
  paymentSummaryValue: { fontSize: 14, ...FONTS.bold, color: COLORS.primary },

  notesCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.md, ...SHADOW.small,
  },
  notesLabel: { fontSize: 11, ...FONTS.semiBold, color: COLORS.gray, marginBottom: 4, textTransform: 'uppercase' },
  notesText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },

  mainActionBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    height: 52, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: SPACING.sm, ...SHADOW.small,
  },
  mainActionText: { color: COLORS.white, fontSize: 16, ...FONTS.bold },
});

const pm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: SPACING.lg, paddingBottom: 40,
    ...SHADOW.medium,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.grayBorder, alignSelf: 'center', marginBottom: SPACING.md },
  title: { fontSize: 20, ...FONTS.bold, color: COLORS.text, marginBottom: 4 },
  sub: { fontSize: 13, color: COLORS.gray, marginBottom: SPACING.md },
  quickRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  quickBtn: {
    flex: 1, paddingVertical: 10,
    backgroundColor: COLORS.primaryPale, borderRadius: RADIUS.md,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary,
  },
  quickBtnText: { fontSize: 13, color: COLORS.primary, ...FONTS.semiBold },
  label: { fontSize: 12, ...FONTS.semiBold, color: COLORS.textLight, marginBottom: 6 },
  amountRow: { marginBottom: SPACING.md },
  amountBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.primary,
    borderRadius: RADIUS.md, backgroundColor: COLORS.primaryPale,
    paddingHorizontal: SPACING.md,
  },
  amountInput: { flex: 1, fontSize: 28, ...FONTS.bold, color: COLORS.primary, height: 58 },
  noteBox: {
    borderWidth: 1, borderColor: COLORS.grayBorder,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white, marginBottom: SPACING.lg,
  },
  noteInput: { height: 44, fontSize: 14, color: COLORS.text },
  btnRow: { flexDirection: 'row', gap: SPACING.sm },
  cancelBtn: {
    flex: 1, height: 50, justifyContent: 'center', alignItems: 'center',
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.grayBorder,
  },
  cancelText: { fontSize: 15, color: COLORS.gray, ...FONTS.semiBold },
  confirmBtn: {
    flex: 2, height: 50, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
  },
  confirmText: { fontSize: 15, color: COLORS.white, ...FONTS.bold },
});

const ic = StyleSheet.create({
  card: { flex: 1, minWidth: '45%', backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOW.small },
  iconBg: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  value: { fontSize: 16, ...FONTS.bold, color: COLORS.text },
  label: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
});
