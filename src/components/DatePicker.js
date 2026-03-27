import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../theme';

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayISO(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

export default function DatePicker({ visible, value, onChange, onClose, label }) {
  const base = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(base.getFullYear());
  const [viewMonth, setViewMonth] = useState(base.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayISO(viewYear, viewMonth);
  const today = new Date();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const selected = value ? new Date(value) : null;

  const isSelected = (day) =>
    selected &&
    day &&
    selected.getFullYear() === viewYear &&
    selected.getMonth() === viewMonth &&
    selected.getDate() === day;

  const isToday = (day) =>
    day &&
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  const handleSelect = (day) => {
    if (!day) return;
    onChange(new Date(viewYear, viewMonth, day));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>

          {/* Label */}
          {label ? <Text style={styles.label}>{label}</Text> : null}

          {/* Month / Year navigation */}
          <View style={styles.nav}>
            <TouchableOpacity style={styles.navBtn} onPress={prevMonth}>
              <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.monthYear}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity style={styles.navBtn} onPress={nextMonth}>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={styles.dayRow}>
            {DAYS.map((d) => (
              <Text key={d} style={styles.dayName}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.grid}>
            {cells.map((day, idx) => {
              const sel = isSelected(day);
              const tod = isToday(day);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.cell,
                    sel && styles.cellSelected,
                    tod && !sel && styles.cellToday,
                  ]}
                  onPress={() => handleSelect(day)}
                  disabled={!day}
                  activeOpacity={day ? 0.7 : 1}
                >
                  <Text
                    style={[
                      styles.cellText,
                      sel && styles.cellTextSelected,
                      tod && !sel && styles.cellTextToday,
                      !day && { opacity: 0 },
                    ]}
                  >
                    {day || '·'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cancel */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const CELL = 40;

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.xl,
    padding: SPACING.lg, width: '100%', maxWidth: 340,
    ...SHADOW.medium,
  },
  label: {
    fontSize: 13, ...FONTS.semiBold, color: COLORS.gray,
    textAlign: 'center', marginBottom: SPACING.sm,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  nav: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: SPACING.md,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primaryPale,
    justifyContent: 'center', alignItems: 'center',
  },
  monthYear: { fontSize: 16, ...FONTS.bold, color: COLORS.text },
  dayRow: {
    flexDirection: 'row', marginBottom: SPACING.sm,
  },
  dayName: {
    flex: 1, textAlign: 'center',
    fontSize: 12, ...FONTS.semiBold, color: COLORS.gray,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`, aspectRatio: 1,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: RADIUS.full,
  },
  cellSelected: { backgroundColor: COLORS.primary },
  cellToday: { backgroundColor: COLORS.primaryPale },
  cellText: { fontSize: 14, ...FONTS.medium, color: COLORS.text },
  cellTextSelected: { color: COLORS.white, ...FONTS.bold },
  cellTextToday: { color: COLORS.primary, ...FONTS.bold },
  cancelBtn: {
    marginTop: SPACING.md, paddingVertical: SPACING.sm,
    alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.grayBorder,
  },
  cancelText: { fontSize: 15, color: COLORS.gray, ...FONTS.medium },
});
