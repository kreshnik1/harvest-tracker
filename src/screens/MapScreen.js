import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { useCurrency, useTranslation } from '../context/SettingsContext';

const INITIAL_REGION = {
  latitude: 42.6629,
  longitude: 21.1655,
  latitudeDelta: 0.3,
  longitudeDelta: 0.3,
};

const STATUS_COLOR = {
  paid:   '#4CAF50',
  unpaid: '#F44336',
  mixed:  '#FF9800',
};

export default function MapScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { jobs, loadJobs } = useData();
  const fmt = useCurrency();
  const t = useTranslation();
  const [selectedJob, setSelectedJob] = useState(null);
  const [overlappingJobs, setOverlappingJobs] = useState([]);
  const [filter, setFilter] = useState('all');
  const mapRef = useRef(null);
  const userLocationRef = useRef(null);
  const mapReadyRef = useRef(false);
  // Prevents MapView's onPress from clearing selection when a polygon was just tapped
  const polygonPressedRef = useRef(false);

  const animateToUserLocation = (coords) => {
    mapRef.current?.animateToRegion({
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 600);
  };

  // Fetch location once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const loc = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        userLocationRef.current = coords;
        if (mapReadyRef.current) {
          animateToUserLocation(coords);
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Re-animate to current location every time the screen is focused (tab revisits)
  useFocusEffect(
    useCallback(() => {
      loadJobs();
      if (userLocationRef.current) {
        const timer = setTimeout(() => animateToUserLocation(userLocationRef.current), 100);
        return () => clearTimeout(timer);
      }
    }, [])
  );

  const handleMapReady = () => {
    mapReadyRef.current = true;
    if (userLocationRef.current) {
      animateToUserLocation(userLocationRef.current);
    }
  };

  const goToCurrentLocation = () => {
    if (userLocationRef.current) {
      animateToUserLocation(userLocationRef.current);
    }
  };

  const filteredJobs = useMemo(() => jobs.filter((j) => {
    if (filter === 'paid') return getPaymentStatus(j) === 'paid';
    if (filter === 'unpaid') return getPaymentStatus(j) !== 'paid';
    return true;
  }).filter((j) => j.location || (j.polygon && j.polygon.length > 0)), [jobs, filter]);

  // Group jobs that share the same physical field into one polygon.
  // This prevents z-order flickering when multiple jobs overlap the same coordinates.
  const fieldGroups = useMemo(() => {
    const map = new Map();
    filteredJobs.forEach((job) => {
      let key;
      if (job.polygon && job.polygon.length >= 3) {
        key = job.polygon.map((p) => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`).join('|');
      } else if (job.location) {
        key = `pt:${job.location.latitude.toFixed(5)},${job.location.longitude.toFixed(5)}`;
      } else {
        return;
      }
      if (!map.has(key)) {
        map.set(key, {
          key,
          polygon: job.polygon?.length >= 3 ? job.polygon : null,
          center: job.polygon?.length >= 3 ? getPolygonCenter(job.polygon) : job.location,
          jobs: [],
        });
      }
      map.get(key).jobs.push(job);
    });
    return Array.from(map.values()).map((group) => {
      const statuses = group.jobs.map((j) => getPaymentStatus(j));
      const allPaid   = statuses.every((s) => s === 'paid');
      const allUnpaid = statuses.every((s) => s === 'unpaid');
      return { ...group, status: allPaid ? 'paid' : allUnpaid ? 'unpaid' : 'mixed' };
    });
  }, [filteredJobs]);

  const handleGroupPress = (group) => {
    polygonPressedRef.current = true;
    if (group.jobs.length === 1) {
      setSelectedJob(group.jobs[0]);
      setOverlappingJobs([]);
    } else {
      setOverlappingJobs(group.jobs);
      setSelectedJob(null);
    }
  };

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
        showsUserLocation={true}
        showsMyLocationButton={false}
        onMapReady={handleMapReady}
        onPress={() => {
          if (polygonPressedRef.current) {
            polygonPressedRef.current = false;
            return;
          }
          setSelectedJob(null);
          setOverlappingJobs([]);
        }}
      >
        {fieldGroups.map((group) => {
          const color = STATUS_COLOR[group.status];
          const isSelected = selectedJob
            ? group.jobs.some((j) => j.id === selectedJob.id)
            : overlappingJobs.length > 0 && group.jobs.some((j) => overlappingJobs.some((o) => o.id === j.id));

          return (
            <React.Fragment key={group.key}>
              {group.polygon && (
                <Polygon
                  coordinates={group.polygon}
                  fillColor={isSelected ? `${color}A8` : `${color}59`}
                  strokeColor={color}
                  strokeWidth={isSelected ? 4 : 2}
                  tappable
                  onPress={() => handleGroupPress(group)}
                />
              )}
              {group.center && (
                <Marker
                  coordinate={group.center}
                  anchor={{ x: 0.5, y: 0.5 }}
                  onPress={() => handleGroupPress(group)}
                >
                  <View style={[styles.markerBubble, { backgroundColor: color }]}>
                    <Text style={styles.markerText}>
                      {formatSurface(group.jobs[0].surface)}
                    </Text>
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
              {t(f === 'all' ? 'all' : f === 'paid' ? 'paid' : 'unpaid')}
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
      <View style={[styles.legend, { bottom: insets.bottom + 16, left: SPACING.md }]}>
        {[
          { key: 'paid',   label: t('paid') },
          { key: 'unpaid', label: t('unpaid') },
          { key: 'mixed',  label: t('mixed') },
        ].map(({ key, label }) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: STATUS_COLOR[key] }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Job Count */}
      <View style={styles.countBadge}>
        <Text style={styles.countText}>
          {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} · {fieldGroups.length} field{fieldGroups.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Selected Job Card */}
      {selectedJob && (() => {
        const status = getPaymentStatus(selectedJob);
        const remaining = getRemainingAmount(selectedJob);
        const statusColor = status === 'paid' ? COLORS.success : status === 'partial' ? COLORS.secondary : COLORS.danger;
        const statusLabel = status === 'paid' ? t('paid') : status === 'partial' ? t('partial') : t('unpaid');
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
              <Text style={styles.jobCardRemaining}>{t('remaining')}: {fmt(remaining)}</Text>
            )}

            {/* Actions row */}
            <View style={styles.jobCardActions}>
              <TouchableOpacity
                style={styles.newJobBtn}
                onPress={() => {
                  setSelectedJob(null);
                  navigation.navigate('AddJob', {
                    prefill: {
                      clientName: selectedJob.clientName,
                      polygon: selectedJob.polygon,
                      location: selectedJob.location,
                      locationName: selectedJob.locationName,
                      surface: selectedJob.surface,
                    },
                  });
                }}
              >
                <Ionicons name="add-circle-outline" size={15} color={COLORS.primary} />
                <Text style={styles.newJobBtnText}>{t('new_job_here')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.openBtn}
                onPress={() => { setSelectedJob(null); navigation.navigate('JobDetail', { jobId: selectedJob.id }); }}
              >
                <Text style={styles.openBtnText}>{t('open_job')}</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })()}

      {/* Multiple jobs at same location — pick list */}
      {overlappingJobs.length > 0 && (
        <View style={styles.overlapCard}>
          <View style={styles.overlapHeader}>
            <Text style={styles.overlapTitle}>{overlappingJobs.length} {t('jobs_at_field')}</Text>
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
          <TouchableOpacity
            style={styles.overlapNewJobBtn}
            onPress={() => {
              const ref = overlappingJobs[0];
              const allSameClient = overlappingJobs.every((j) => j.clientName === ref.clientName);
              setOverlappingJobs([]);
              navigation.navigate('AddJob', {
                prefill: {
                  clientName: allSameClient ? ref.clientName : '',
                  polygon: ref.polygon,
                  location: ref.location,
                  locationName: ref.locationName,
                  surface: ref.surface,
                },
              });
            }}
          >
            <Ionicons name="add-circle-outline" size={15} color={COLORS.primary} />
            <Text style={styles.newJobBtnText}>{t('new_job_at_field')}</Text>
          </TouchableOpacity>
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
  jobCardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  newJobBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  newJobBtnText: { color: COLORS.primary, ...FONTS.bold, fontSize: 13 },
  openBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 10,
  },
  openBtnText: { color: COLORS.white, ...FONTS.bold, fontSize: 14 },
  legend: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: RADIUS.sm,
    paddingVertical: 5,
    paddingHorizontal: 8,
    gap: 8,
    ...SHADOW.small,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 10, color: COLORS.text, ...FONTS.medium },

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
  overlapNewJobBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderTopWidth: 1, borderTopColor: COLORS.grayBorder,
    paddingTop: SPACING.sm, marginTop: 4,
  },
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
