import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform, Switch,
  KeyboardAvoidingView, Modal,
} from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { groupByClient } from '../utils/helpers';
import { useSettings } from '../context/SettingsContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../theme';
import { generateId, calculatePolygonArea, formatSurface } from '../utils/helpers';
import DatePicker from '../components/DatePicker';

const INITIAL_REGION = {
  latitude: 42.6629, longitude: 21.1655,
  latitudeDelta: 0.05, longitudeDelta: 0.05,
};

export default function AddJobScreen({ navigation, route }) {
  const { addJob, jobs, fields, loadFields, addField, removeField } = useData();
  const { settings } = useSettings();
  const insets = useSafeAreaInsets();
  const currencySymbol = settings?.currency?.symbol ?? '€';

  const [clientName, setClientName] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [surface, setSurface] = useState('');
  const [pricePerM2, setPricePerM2] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState('');
  const [locationName, setLocationName] = useState('');

  const [mapRegion, setMapRegion] = useState(INITIAL_REGION);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [markerLocation, setMarkerLocation] = useState(null);
  const [calculatedArea, setCalculatedArea] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [previewRegion, setPreviewRegion] = useState(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [fieldSaved, setFieldSaved] = useState(false);
  const [showSaveFieldModal, setShowSaveFieldModal] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');

  // Existing client names for autocomplete
  const existingClients = useMemo(
    () => [...new Set(jobs.map((j) => j.clientName).filter(Boolean))].sort(),
    [jobs],
  );
  const suggestions = useMemo(
    () => clientName.length > 0
      ? existingClients.filter((n) => n.toLowerCase().includes(clientName.toLowerCase()) && n.toLowerCase() !== clientName.toLowerCase())
      : [],
    [clientName, existingClients],
  );

  useEffect(() => { loadFields(); }, []);

  // Fields saved for the currently entered client
  const clientFields = clientName.trim().length > 1
    ? fields.filter((f) => f.clientName?.toLowerCase() === clientName.trim().toLowerCase())
    : [];

  const applyField = (field) => {
    setPolygonPoints(field.polygon || []);
    setMarkerLocation(field.location);
    if (field.surface) setSurface(field.surface.toString());
    if (field.surface) setCalculatedArea(field.surface);
    if (field.locationName) setLocationName(field.locationName);
    setFieldSaved(true);
    // compute preview region
    if (field.polygon && field.polygon.length >= 3) {
      const lats = field.polygon.map((p) => p.latitude);
      const lngs = field.polygon.map((p) => p.longitude);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      setPreviewRegion({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max((maxLat - minLat) * 1.8, 0.002),
        longitudeDelta: Math.max((maxLng - minLng) * 1.8, 0.002),
      });
    } else if (field.location) {
      setPreviewRegion({ ...field.location, latitudeDelta: 0.005, longitudeDelta: 0.005 });
    }
    setShowFieldPicker(false);
  };

  const handleSaveField = () => {
    if (polygonPoints.length < 3 && !markerLocation) return;
    setNewFieldName(locationName || '');
    setShowSaveFieldModal(true);
  };

  const confirmSaveField = async () => {
    const name = newFieldName.trim();
    if (!name) return;
    await addField({
      id: generateId(),
      clientName: clientName.trim(),
      locationName: name,
      polygon: polygonPoints.length >= 3 ? polygonPoints : null,
      location: markerLocation,
      surface: calculatedArea || parseFloat(surface) || null,
      createdAt: new Date().toISOString(),
    });
    setFieldSaved(true);
    setShowSaveFieldModal(false);
  };

  const handleDeleteField = (field) => {
    Alert.alert(
      'Delete Field',
      `Remove "${field.locationName || 'this field'}" from ${field.clientName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeField(field.id) },
      ],
    );
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const region = {
          latitude: loc.coords.latitude, longitude: loc.coords.longitude,
          latitudeDelta: 0.01, longitudeDelta: 0.01,
        };
        setMapRegion(region);
        setMarkerLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    })();
  }, []);

  // Pre-fill from map screen when launching "New job here"
  useEffect(() => {
    const p = route.params?.prefill;
    if (!p) return;
    if (p.clientName) setClientName(p.clientName);
    if (p.locationName) setLocationName(p.locationName);
    if (p.polygon?.length >= 3) {
      setPolygonPoints(p.polygon);
      setCalculatedArea(p.surface || 0);
      if (p.surface) setSurface(p.surface.toString());
      setFieldSaved(true);
      const lats = p.polygon.map((pt) => pt.latitude);
      const lngs = p.polygon.map((pt) => pt.longitude);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      setPreviewRegion({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max((maxLat - minLat) * 1.8, 0.002),
        longitudeDelta: Math.max((maxLng - minLng) * 1.8, 0.002),
      });
    } else if (p.location) {
      setMarkerLocation(p.location);
      if (p.surface) { setSurface(p.surface.toString()); setCalculatedArea(p.surface); }
      setPreviewRegion({ ...p.location, latitudeDelta: 0.005, longitudeDelta: 0.005 });
    }
  }, []);

  useEffect(() => {
    const s = parseFloat(surface);
    const p = parseFloat(pricePerM2);
    if (!isNaN(s) && !isNaN(p) && s > 0 && p > 0) {
      setTotalPrice((s * p).toFixed(2));
    }
  }, [surface, pricePerM2]);

  const fmtDate = (d) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleSave = async () => {
    if (!clientName.trim()) { Alert.alert('Missing', 'Please enter client name'); return; }
    if (!surface || isNaN(parseFloat(surface))) { Alert.alert('Missing', 'Please enter surface area'); return; }
    if (!totalPrice || isNaN(parseFloat(totalPrice))) { Alert.alert('Missing', 'Please enter total price'); return; }
    setSaving(true);
    try {
      await addJob({
        id: generateId(),
        clientName: clientName.trim(),
        date: date.toISOString(),
        surface: parseFloat(surface),
        pricePerM2: pricePerM2 ? parseFloat(pricePerM2) : null,
        totalPrice: parseFloat(totalPrice),
        paid,
        paidDate: paid ? new Date().toISOString() : null,
        notes: notes.trim(),
        locationName: locationName.trim(),
        location: markerLocation,
        polygon: polygonPoints.length >= 3 ? polygonPoints : null,
        createdAt: new Date().toISOString(),
      });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Modal drag handle */}
      <View style={styles.dragHandle} />

      {/* Compact Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Job</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {/* MAP */}
          <FormCard title="Field Location" noPad>
            <TouchableOpacity
              style={styles.mapPreview}
              onPress={() => setShowMapPicker(true)}
              activeOpacity={0.85}
            >
              {polygonPoints.length >= 3 || markerLocation ? (
                <MapView
                  style={StyleSheet.absoluteFill}
                  provider={PROVIDER_GOOGLE}
                  region={previewRegion || mapRegion}
                  mapType="satellite"
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  pointerEvents="none"
                >
                  {markerLocation && polygonPoints.length < 3 && (
                    <Marker coordinate={markerLocation} pinColor={COLORS.primary} />
                  )}
                  {polygonPoints.length >= 3 && (
                    <Polygon
                      coordinates={polygonPoints}
                      fillColor="rgba(46,125,50,0.4)"
                      strokeColor={COLORS.primaryLight}
                      strokeWidth={2}
                    />
                  )}
                </MapView>
              ) : (
                <View style={styles.mapPlaceholder}>
                  <Ionicons name="map-outline" size={36} color={COLORS.gray} />
                  <Text style={styles.mapPlaceholderText}>Tap to set field location</Text>
                </View>
              )}
              {/* Overlay button */}
              <View style={styles.mapOverlayBtn}>
                <Ionicons name={polygonPoints.length >= 3 ? 'create-outline' : 'add-circle-outline'} size={16} color={COLORS.white} />
                <Text style={styles.mapOverlayText}>
                  {polygonPoints.length >= 3
                    ? `Edit · ${formatSurface(calculatedArea)}`
                    : markerLocation ? 'Edit location' : 'Open map'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Saved fields for this client */}
            {clientFields.length > 0 && (
              <View style={styles.savedFieldsSection}>
                <View style={styles.savedFieldsHeader}>
                  <Ionicons name="bookmark-outline" size={13} color={COLORS.primary} />
                  <Text style={styles.savedFieldsTitle}>Saved fields for {clientName.trim()}</Text>
                </View>
                {clientFields.map((f) => (
                  <View key={f.id} style={styles.savedFieldRow}>
                    <TouchableOpacity style={styles.savedFieldMain} onPress={() => applyField(f)}>
                      <View style={styles.savedFieldIcon}>
                        <Ionicons name="map-outline" size={16} color={COLORS.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.savedFieldName}>{f.locationName || 'Unnamed field'}</Text>
                        {f.surface ? <Text style={styles.savedFieldMeta}>{formatSurface(f.surface)}</Text> : null}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.gray} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.savedFieldDelete} onPress={() => handleDeleteField(f)}>
                      <Ionicons name="trash-outline" size={17} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Save field button — shown after drawing, if not yet saved */}
            {polygonPoints.length >= 3 && !fieldSaved && clientName.trim().length > 0 && (
              <TouchableOpacity style={styles.saveFieldBtn} onPress={handleSaveField}>
                <Ionicons name="bookmark" size={15} color={COLORS.primary} />
                <Text style={styles.saveFieldBtnText}>Save this field for future jobs</Text>
              </TouchableOpacity>
            )}
          </FormCard>

          {/* JOB DETAILS */}
          <FormCard title="Job Details" noPad>
            {/* Client name with autocomplete */}
            <FieldRow icon="person-outline">
              <TextInput
                style={styles.input}
                placeholder="Client name *"
                placeholderTextColor={COLORS.gray}
                value={clientName}
                onChangeText={(t) => { setClientName(t); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </FieldRow>
            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                {suggestions.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={styles.suggestionRow}
                    onPress={() => { setClientName(s); setShowSuggestions(false); }}
                  >
                    <Ionicons name="person-circle-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <FieldRow icon="calendar-outline">
                <Text style={[styles.input, { lineHeight: 50, color: COLORS.text }]}>{fmtDate(date)}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.grayBorder} style={{ marginRight: 4 }} />
              </FieldRow>
            </TouchableOpacity>

            <FieldRow icon="location-outline" alignTop last>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
                placeholder="Location name (e.g. North Field, Village Road...)"
                placeholderTextColor={COLORS.gray}
                value={locationName}
                onChangeText={setLocationName}
                multiline
              />
            </FieldRow>
          </FormCard>

          {/* PRICING */}
          <FormCard title="Surface & Pricing" noPad>
            <FieldRow icon="resize-outline">
              <TextInput
                style={styles.input}
                placeholder="Surface area *"
                placeholderTextColor={COLORS.gray}
                value={surface}
                onChangeText={setSurface}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
              <Text style={styles.unit}>m²</Text>
            </FieldRow>

            <FieldRow icon="calculator-outline">
              <TextInput
                style={styles.input}
                placeholder={`Price per m² (optional)`}
                placeholderTextColor={COLORS.gray}
                value={pricePerM2}
                onChangeText={setPricePerM2}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
              <Text style={styles.unit}>{currencySymbol}/m²</Text>
            </FieldRow>

            {/* Total Price */}
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total Price *</Text>
              <View style={styles.totalRow}>
                <Text style={styles.totalSymbol}>{currencySymbol}</Text>
                <TextInput
                  style={styles.totalInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.primaryLight}
                  value={totalPrice}
                  onChangeText={setTotalPrice}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>
              {surface && pricePerM2 ? (
                <Text style={styles.totalNote}>{surface} m² × {currencySymbol}{pricePerM2} = auto-calculated</Text>
              ) : null}
            </View>
          </FormCard>

          {/* PAYMENT STATUS */}
          <FormCard title="Payment Status" noPad>
            <View style={[styles.paidRow, { borderBottomWidth: 0 }]}>
              <View style={[styles.paidIcon, { backgroundColor: paid ? COLORS.successLight : COLORS.dangerLight }]}>
                <Ionicons name={paid ? 'checkmark-circle' : 'time-outline'} size={22} color={paid ? COLORS.success : COLORS.danger} />
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                <Text style={styles.paidLabel}>{paid ? 'Payment Received' : 'Awaiting Payment'}</Text>
                <Text style={styles.paidSub}>{paid ? 'Client has paid in full' : 'Mark paid when received'}</Text>
              </View>
              <Switch
                value={paid}
                onValueChange={setPaid}
                trackColor={{ false: COLORS.grayBorder, true: COLORS.primaryLight }}
                thumbColor={paid ? COLORS.primary : '#f4f3f4'}
              />
            </View>
          </FormCard>

          {/* NOTES */}
          <FormCard title="Notes" noPad>
            <FieldRow icon="document-text-outline" alignTop last>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 6 }]}
                placeholder="Additional notes (optional)…"
                placeholderTextColor={COLORS.gray}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </FieldRow>
          </FormCard>

          {/* Save */}
          <TouchableOpacity style={styles.saveFullBtn} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color={COLORS.white} />
              : <>
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.white} style={{ marginRight: 8 }} />
                  <Text style={styles.saveFullBtnText}>Save Job</Text>
                </>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save Field Name Modal */}
      <Modal visible={showSaveFieldModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Save Field</Text>
            <Text style={styles.modalSub}>Name this field so you can reuse it for {clientName.trim()}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. North plot, Village road..."
              placeholderTextColor={COLORS.gray}
              value={newFieldName}
              onChangeText={setNewFieldName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={confirmSaveField}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowSaveFieldModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, !newFieldName.trim() && { opacity: 0.4 }]}
                onPress={confirmSaveField}
                disabled={!newFieldName.trim()}
              >
                <Text style={styles.modalConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DatePicker
        visible={showDatePicker}
        value={date}
        label="Select job date"
        onChange={(d) => setDate(d)}
        onClose={() => setShowDatePicker(false)}
      />

      {/* Full-screen Map Picker */}
      <MapPickerModal
        visible={showMapPicker}
        initialRegion={mapRegion}
        initialPolygon={polygonPoints}
        initialMarker={markerLocation}
        onDone={(pts, marker, area) => {
          setPolygonPoints(pts);
          setMarkerLocation(marker);
          setCalculatedArea(area);
          setFieldSaved(false);
          if (pts.length >= 3 && area > 0) {
            setSurface(Math.round(area).toString());
            const lats = pts.map((p) => p.latitude);
            const lngs = pts.map((p) => p.longitude);
            const minLat = Math.min(...lats), maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
            setPreviewRegion({
              latitude: (minLat + maxLat) / 2,
              longitude: (minLng + maxLng) / 2,
              latitudeDelta: Math.max((maxLat - minLat) * 1.8, 0.002),
              longitudeDelta: Math.max((maxLng - minLng) * 1.8, 0.002),
            });
          } else if (marker) {
            setPreviewRegion({
              latitude: marker.latitude,
              longitude: marker.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            });
          }
          setShowMapPicker(false);
        }}
        onClose={() => setShowMapPicker(false)}
      />
    </View>
  );
}

function FormCard({ title, subtitle, children, noPad }) {
  return (
    <View style={fc.card}>
      <Text style={fc.title}>{title}</Text>
      {subtitle ? <Text style={fc.sub}>{subtitle}</Text> : null}
      {noPad ? children : <View style={fc.inner}>{children}</View>}
    </View>
  );
}

function Label({ text }) {
  return <Text style={lb.text}>{text}</Text>;
}

function FieldRow({ icon, children, alignTop, last }) {
  return (
    <View style={[fr.row, last && { borderBottomWidth: 0 }, alignTop && { alignItems: 'flex-start', paddingVertical: SPACING.sm }]}>
      <Ionicons name={icon} size={18} color={COLORS.gray} style={[fr.icon, alignTop && { marginTop: 2 }]} />
      {children}
    </View>
  );
}

function MapPickerModal({ visible, initialRegion, initialPolygon, initialMarker, onDone, onClose }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const lastTapRef = useRef(0);
  const [pts, setPts] = useState([]);
  const [marker, setMarker] = useState(null);
  const [region, setRegion] = useState(initialRegion || INITIAL_REGION);
  const area = pts.length >= 3 ? calculatePolygonArea(pts) : 0;

  // Reset state when modal opens + auto-navigate to user location
  useEffect(() => {
    if (visible) {
      setPts(initialPolygon || []);
      setMarker(initialMarker || null);
      setRegion(initialRegion || INITIAL_REGION);
      // If no pre-existing location, go to user's GPS position
      if (!initialPolygon?.length && !initialMarker) {
        let timer;
        let cancelled = false;
        (async () => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted' || cancelled) return;
            const loc = await Location.getCurrentPositionAsync({});
            if (cancelled) return;
            const r = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            };
            setRegion(r);
            timer = setTimeout(() => mapRef.current?.animateToRegion(r, 500), 300);
          } catch (_) {}
        })();
        return () => { cancelled = true; clearTimeout(timer); };
      }
    }
  }, [visible]);

  const goToCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    const r = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
    setRegion(r);
    mapRef.current?.animateToRegion(r, 500);
  };

  const handleMapPress = (e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) return;
    lastTapRef.current = now;
    const coord = e.nativeEvent.coordinate;
    setPts((prev) => {
      const next = [...prev, coord];
      return next;
    });
    setMarker(coord);
  };

  const handleUndo = () => {
    setPts((prev) => {
      const next = prev.slice(0, -1);
      if (next.length === 0) setMarker(null);
      else setMarker(next[next.length - 1]);
      return next;
    });
  };

  const handleClear = () => {
    setPts([]);
    setMarker(null);
  };

  const handleDone = () => {
    onDone(pts, pts.length > 0 ? pts[pts.length - 1] : marker, area);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          mapType="satellite"
          showsUserLocation={true}
          showsMyLocationButton={false}
          onPress={handleMapPress}
        >
          {pts.map((pt, i) => (
            <Marker
              key={i}
              coordinate={pt}
              anchor={{ x: 0.5, y: 0.5 }}
              tappable={false}
            >
              <View style={mp.dot} />
            </Marker>
          ))}
          {pts.length >= 3 && (
            <Polygon
              coordinates={pts}
              fillColor="rgba(46,125,50,0.35)"
              strokeColor="#4CAF50"
              strokeWidth={2}
              tappable={false}
            />
          )}
        </MapView>

        {/* Top bar */}
        <View style={[mp.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={mp.topBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <View style={mp.topCenter}>
            <Text style={mp.topTitle}>Draw Field</Text>
            <Text style={mp.topSub}>
              {pts.length === 0
                ? 'Tap map to add points'
                : pts.length < 3
                  ? `${pts.length} point${pts.length > 1 ? 's' : ''} — need ${3 - pts.length} more`
                  : `${pts.length} pts · ${formatSurface(area)}`}
            </Text>
          </View>
          <TouchableOpacity
            style={[mp.topBtn, mp.doneBtn, pts.length < 3 && { opacity: 0.5 }]}
            onPress={handleDone}
            disabled={pts.length < 3}
          >
            <Text style={mp.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Right controls */}
        <View style={[mp.controls, { bottom: insets.bottom + 24 }]}>
          <TouchableOpacity style={mp.ctrlBtn} onPress={goToCurrentLocation}>
            <Ionicons name="locate" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={mp.ctrlBtn} onPress={handleUndo} disabled={pts.length === 0}>
            <Ionicons name="arrow-undo" size={22} color={pts.length === 0 ? COLORS.grayBorder : COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[mp.ctrlBtn, { backgroundColor: '#FFF0F0' }]} onPress={handleClear} disabled={pts.length === 0}>
            <Ionicons name="trash-outline" size={22} color={pts.length === 0 ? COLORS.grayBorder : COLORS.danger} />
          </TouchableOpacity>
        </View>

        {/* Area badge */}
        {pts.length >= 3 && (
          <View style={[mp.areaBadge, { bottom: insets.bottom + 24 }]}>
            <Ionicons name="resize-outline" size={14} color={COLORS.white} />
            <Text style={mp.areaBadgeText}>{formatSurface(area)}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const mp = StyleSheet.create({
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    ...SHADOW.medium,
  },
  topBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.grayLight,
    justifyContent: 'center', alignItems: 'center',
  },
  topCenter: { flex: 1, alignItems: 'center' },
  topTitle: { fontSize: 15, ...FONTS.bold, color: COLORS.text },
  topSub: { fontSize: 11, color: COLORS.gray, marginTop: 1 },
  doneBtn: { backgroundColor: COLORS.primary },
  doneBtnText: { fontSize: 14, ...FONTS.bold, color: COLORS.white },
  controls: {
    position: 'absolute', right: SPACING.md,
    gap: 10,
  },
  ctrlBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.97)',
    justifyContent: 'center', alignItems: 'center',
    ...SHADOW.medium,
  },
  dot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: COLORS.primary,
    borderWidth: 2, borderColor: COLORS.white,
  },
  areaBadge: {
    position: 'absolute',
    left: SPACING.md,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  areaBadgeText: { color: COLORS.white, fontSize: 13, ...FONTS.bold },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  dragHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.grayBorder,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.grayBorder,
  },
  cancelBtn: { minWidth: 64, paddingVertical: 6, paddingHorizontal: 4 },
  cancelText: { color: COLORS.gray, fontSize: 15, ...FONTS.medium },
  headerTitle: { fontSize: 17, ...FONTS.bold, color: COLORS.text },
  saveBtn: { minWidth: 64, alignItems: 'flex-end', paddingVertical: 6, paddingHorizontal: 4 },
  saveBtnText: { color: COLORS.primary, ...FONTS.bold, fontSize: 15 },
  scroll: { flex: 1, backgroundColor: COLORS.grayLight },
  scrollContent: { padding: SPACING.md, paddingBottom: 80 },

  mapPreview: {
    height: 160,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: COLORS.grayLight,
    justifyContent: 'center', alignItems: 'center',
  },
  mapPlaceholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  mapPlaceholderText: { fontSize: 13, color: COLORS.gray, ...FONTS.medium },
  mapOverlayBtn: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  mapOverlayText: { fontSize: 12, color: COLORS.white, ...FONTS.medium },

  suggestionsBox: {
    backgroundColor: COLORS.white,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    ...SHADOW.small,
  },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.grayBorder,
  },
  suggestionText: { fontSize: 14, color: COLORS.text, ...FONTS.medium },

  input: { flex: 1, height: 50, fontSize: 15, color: COLORS.text },
  unit: { fontSize: 13, color: COLORS.gray, marginLeft: 4, ...FONTS.medium },

  totalBox: {
    margin: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primaryPale,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  totalLabel: { fontSize: 12, ...FONTS.semiBold, color: COLORS.primary, marginBottom: 4 },
  totalRow: { flexDirection: 'row', alignItems: 'center' },
  totalSymbol: { fontSize: 28, ...FONTS.bold, color: COLORS.primary, marginRight: 4 },
  totalInput: { flex: 1, fontSize: 30, ...FONTS.bold, color: COLORS.primary, height: 48 },
  totalNote: { fontSize: 11, color: COLORS.primary, opacity: 0.7, marginTop: 2 },

  paidRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
  },
  paidIcon: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  paidLabel: { fontSize: 14, ...FONTS.semiBold, color: COLORS.text },
  paidSub: { fontSize: 11, color: COLORS.gray, marginTop: 2 },

  saveFullBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: SPACING.sm, ...SHADOW.medium,
  },
  saveFullBtnText: { color: COLORS.white, fontSize: 17, ...FONTS.bold },

  savedFieldsSection: {
    borderTopWidth: 1, borderTopColor: COLORS.grayBorder,
    paddingTop: SPACING.sm,
  },
  savedFieldsHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: SPACING.md, paddingBottom: 6,
  },
  savedFieldsTitle: { fontSize: 11, ...FONTS.semiBold, color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  savedFieldRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: COLORS.grayBorder,
  },
  savedFieldMain: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 10,
  },
  savedFieldDelete: {
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    borderLeftWidth: 1, borderLeftColor: COLORS.grayBorder,
  },
  savedFieldIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primaryPale,
    justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.sm,
  },
  savedFieldName: { fontSize: 14, ...FONTS.semiBold, color: COLORS.text },
  savedFieldMeta: { fontSize: 11, color: COLORS.gray, marginTop: 1 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: SPACING.lg,
  },
  modalBox: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.lg, width: '100%', ...SHADOW.medium,
  },
  modalTitle: { fontSize: 17, ...FONTS.bold, color: COLORS.text, marginBottom: 4 },
  modalSub: { fontSize: 13, color: COLORS.gray, marginBottom: SPACING.md },
  modalInput: {
    borderWidth: 1, borderColor: COLORS.grayBorder,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md,
    paddingVertical: 10, fontSize: 15, color: COLORS.text,
    marginBottom: SPACING.md,
  },
  modalActions: { flexDirection: 'row', gap: SPACING.sm },
  modalCancel: {
    flex: 1, paddingVertical: 12, borderRadius: RADIUS.md,
    backgroundColor: COLORS.grayLight, alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, ...FONTS.medium, color: COLORS.gray },
  modalConfirm: {
    flex: 1, paddingVertical: 12, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  modalConfirmText: { fontSize: 15, ...FONTS.bold, color: COLORS.white },

  saveFieldBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: COLORS.grayBorder,
    backgroundColor: COLORS.primaryPale,
  },
  saveFieldBtnText: { fontSize: 13, color: COLORS.primary, ...FONTS.medium },

});

const fc = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, marginBottom: SPACING.md, ...SHADOW.small, overflow: 'hidden' },
  title: { fontSize: 11, ...FONTS.bold, color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: 6 },
  sub: { fontSize: 11, color: COLORS.gray, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  inner: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
});

const lb = StyleSheet.create({
  text: { fontSize: 12, ...FONTS.semiBold, color: COLORS.textLight, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: 2 },
});

const fr = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.grayBorder,
    minHeight: 50,
  },
  icon: { marginRight: 10, width: 20, textAlign: 'center' },
});
