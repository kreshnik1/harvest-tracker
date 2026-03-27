import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, Platform,
} from 'react-native';
import MapView, { Marker, Polygon, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../theme';
import { formatSurface, formatDate, getPolygonCenter, getPaymentStatus, getRemainingAmount } from '../utils/helpers';
import { useCurrency } from '../context/SettingsContext';

const INITIAL_REGION = {
  latitude: 42.6629,
  longitude: 21.1655,
  latitudeDelta: 0.3,
  longitudeDelta: 0.3,
};

// Returns true if point {latitude, longitude} is inside polygon array
function pointInPolygon(point, polygon) {
  let inside = false;
  const x = point.longitude;
  const y = point.latitude;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude, yi = polygon[i].latitude;
    const xj = polygon[j].longitude, yj = polygon[j].latitude;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export default function MapScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { jobs, loadJobs } = useData();
  const fmt = useCurrency();
  const [selectedJob, setSelectedJob] = useState(null);
  const [overlappingJobs, setOverlappingJobs] = useState([]);
  const [filter, setFilter] = useState('all');
  const mapRef = useRef(null);

  useEffect(() => { loadJobs(); }, []);

  const goToCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    mapRef.current?.animateToRegion({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 600);
  };

  const filteredJobs = jobs.filter((j) => {
    if (filter === 'paid') return j.paid;
    if (filter === 'unpaid') return !j.paid;
    return true;
  }).filter((j) => j.location || (j.polygon && j.polygon.length > 0));

  const fitToJobs = () => {
    if (filteredJobs.length === 0) return;
    const coords = filteredJobs.map((j) => {
      const center = j.polygon ? getPolygonCenter(j.polygon) : j.location;
      return center;
    }).filter(Boolean);
    if (coords.length > 0) {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 40, bottom: 80, left: 40 },
        animated: true,
      });
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        mapType="satellite"
        onPress={(e) => {
          const coord = e.nativeEvent.coordinate;
          const tapped = filteredJobs.filter(
            (j) => j.polygon?.length >= 3 && pointInPolygon(coord, j.polygon)
          );
          if (tapped.length === 1) {
            setSelectedJob(tapped[0]);
            setOverlappingJobs([]);
          } else if (tapped.length > 1) {
            setOverlappingJobs(tapped);
            setSelectedJob(null);
          } else {
            setSelectedJob(null);
            setOverlappingJobs([]);
          }
        }}
      >
        {filteredJobs.map((job) => {
          const center = job.polygon && job.polygon.length > 0
            ? getPolygonCenter(job.polygon)
            : job.location;
          const color = job.paid ? '#4CAF50' : '#F44336';

          return (
            <React.Fragment key={job.id}>
              {job.polygon && job.polygon.length >= 3 && (
                <Polygon
                  coordinates={job.polygon}
                  fillColor={selectedJob?.id === job.id
                    ? (job.paid ? 'rgba(76,175,80,0.65)' : 'rgba(244,67,54,0.65)')
                    : (job.paid ? 'rgba(76,175,80,0.35)' : 'rgba(244,67,54,0.35)')}
                  strokeColor={color}
                  strokeWidth={selectedJob?.id === job.id ? 4 : 2}
                />
              )}
              {center && (
                <Marker
                  coordinate={center}
                  pinColor={color}
                  onPress={() => setSelectedJob(job)}
                >
                  <View style={[styles.markerBubble, { backgroundColor: color }]}>
                    <Text style={styles.markerText}>{formatSurface(job.surface)}</Text>
                  </View>
                </Marker>
              )}
            </React.Fragment>
          );
        })}
      </MapView>

      {/* Filter Pills */}
      <View style={[styles.filterContainer, { top: insets.top + SPACING.sm }]}>
        {['all', 'paid', 'unpaid'].map((f) => (
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
      </View>

      {/* Right Controls + Legend */}
      <View style={[styles.controls, { top: insets.top + SPACING.sm + 48 }]}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={goToCurrentLocation}>
          <Ionicons name="locate" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={fitToJobs}>
          <Ionicons name="scan-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ctrlBtn, styles.addBtn]} onPress={() => navigation.navigate('AddJob')}>
          <Ionicons name="add" size={26} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Legend — top right */}
      <View style={[styles.legend, { top: insets.top + SPACING.sm, right: SPACING.md }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Paid</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
          <Text style={styles.legendText}>Unpaid</Text>
        </View>
      </View>

      {/* Job Count */}
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{filteredJobs.length} field{filteredJobs.length !== 1 ? 's' : ''} on map</Text>
      </View>

      {/* Selected Job Card */}
      {selectedJob && (() => {
        const status = getPaymentStatus(selectedJob);
        const remaining = getRemainingAmount(selectedJob);
        const statusColor = status === 'paid' ? COLORS.success : status === 'partial' ? COLORS.secondary : COLORS.danger;
        const statusLabel = status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Unpaid';
        return (
          <View style={styles.jobCard}>
            {/* Header row */}
            <View style={styles.jobCardHeader}>
              <View style={styles.jobCardTitleRow}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={styles.jobCardClient}>{selectedJob.clientName}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedJob(null)}>
                <Ionicons name="close" size={20} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            {/* Info grid */}
            <View style={styles.jobCardGrid}>
              <InfoChip icon="calendar-outline" text={formatDate(selectedJob.date)} />
              <InfoChip icon="resize-outline" text={formatSurface(selectedJob.surface)} />
              <InfoChip icon="cash-outline" text={fmt(selectedJob.totalPrice)} />
              <InfoChip icon="checkmark-circle-outline" text={statusLabel} color={statusColor} />
            </View>

            {selectedJob.locationName ? (
              <View style={styles.jobCardLocation}>
                <Ionicons name="location-outline" size={13} color={COLORS.gray} />
                <Text style={styles.jobCardLocationText}>{selectedJob.locationName}</Text>
              </View>
            ) : null}

            {status === 'partial' && (
              <Text style={styles.jobCardRemaining}>Remaining: {fmt(remaining)}</Text>
            )}

            {/* Open button */}
            <TouchableOpacity
              style={styles.openBtn}
              onPress={() => { setSelectedJob(null); navigation.navigate('JobDetail', { jobId: selectedJob.id }); }}
            >
              <Text style={styles.openBtnText}>Open Job</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* Multiple jobs at same location — pick list */}
      {overlappingJobs.length > 0 && (
        <View style={styles.overlapCard}>
          <View style={styles.overlapHeader}>
            <Text style={styles.overlapTitle}>{overlappingJobs.length} jobs at this field</Text>
            <TouchableOpacity onPress={() => setOverlappingJobs([])}>
              <Ionicons name="close" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          {overlappingJobs.map((j) => {
            const st = getPaymentStatus(j);
            const stColor = st === 'paid' ? COLORS.success : st === 'partial' ? COLORS.secondary : COLORS.danger;
            return (
              <TouchableOpacity
                key={j.id}
                style={styles.overlapRow}
                onPress={() => { setOverlappingJobs([]); setSelectedJob(j); }}
              >
                <View style={[styles.statusDot, { backgroundColor: stColor }]} />
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <Text style={styles.overlapClient}>{j.clientName}</Text>
                  <Text style={styles.overlapMeta}>{formatDate(j.date)} · {formatSurface(j.surface)}</Text>
                </View>
                <Text style={[styles.overlapPrice, { color: stColor }]}>{fmt(j.totalPrice)}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.gray} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

    </View>
  );
}

function InfoChip({ icon, text, color }) {
  return (
    <View style={chip.row}>
      <Ionicons name={icon} size={13} color={color || COLORS.gray} />
      <Text style={[chip.text, color && { color }]}>{text}</Text>
    </View>
  );
}

const chip = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: SPACING.md, marginBottom: 4 },
  text: { fontSize: 12, color: COLORS.text, ...FONTS.medium },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  filterContainer: {
    position: 'absolute',
    left: SPACING.md,
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.95)',
    ...SHADOW.small,
  },
  pillActive: { backgroundColor: COLORS.primary },
  pillText: { fontSize: 13, ...FONTS.medium, color: COLORS.text },
  pillTextActive: { color: COLORS.white },
  controls: {
    position: 'absolute',
    right: SPACING.md,
    gap: 10,
  },
  ctrlBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center', alignItems: 'center',
    ...SHADOW.medium,
  },
  addBtn: { backgroundColor: COLORS.primary },
  countBadge: {
    position: 'absolute',
    bottom: 160,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  countText: { color: COLORS.white, fontSize: 12, ...FONTS.medium },
  markerBubble: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: RADIUS.full,
    ...SHADOW.small,
  },
  markerText: { color: COLORS.white, fontSize: 11, ...FONTS.bold },
  jobCard: {
    position: 'absolute',
    bottom: 16,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOW.medium,
  },
  jobCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  jobCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  jobCardClient: { fontSize: 16, ...FONTS.bold, color: COLORS.text },
  jobCardGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  jobCardLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.sm },
  jobCardLocationText: { fontSize: 12, color: COLORS.gray, flex: 1 },
  jobCardRemaining: { fontSize: 12, color: COLORS.secondary, ...FONTS.semiBold, marginBottom: SPACING.sm },
  openBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 10, marginTop: 4,
  },
  openBtnText: { color: COLORS.white, ...FONTS.bold, fontSize: 14 },
  legend: {
    position: 'absolute',
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: RADIUS.md,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
    ...SHADOW.small,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 11, color: COLORS.text, ...FONTS.medium },

  overlapCard: {
    position: 'absolute',
    bottom: 16,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOW.medium,
  },
  overlapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  overlapTitle: { fontSize: 14, ...FONTS.bold, color: COLORS.text },
  overlapRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.grayBorder,
  },
  overlapClient: { fontSize: 14, ...FONTS.semiBold, color: COLORS.text },
  overlapMeta: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  overlapPrice: { fontSize: 13, ...FONTS.bold },
});
