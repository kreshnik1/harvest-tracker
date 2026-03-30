import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings, useTranslation, CURRENCIES, LANGUAGES } from '../context/SettingsContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../theme';

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { settings, updateCurrency, updateLanguage } = useSettings();
  const t = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = CURRENCIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.code}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            {/* ── Language Section ─────────────────────────────── */}
            <Text style={styles.sectionLabel}>{t('language')}</Text>
            <View style={styles.langRow}>
              {LANGUAGES.map((lang) => {
                const selected = settings.language?.code === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langBtn, selected && styles.langBtnActive]}
                    onPress={() => updateLanguage(lang)}
                  >
                    <Text style={[styles.langNative, selected && styles.langNativeActive]}>
                      {lang.nativeName}
                    </Text>
                    <Text style={[styles.langSubName, selected && { color: 'rgba(255,255,255,0.8)' }]}>
                      {lang.name}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.white} style={{ marginTop: 4 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Currency Section ─────────────────────────────── */}
            <Text style={styles.sectionLabel}>{t('currency')}</Text>

            {/* Current selection banner */}
            <View style={styles.currentBanner}>
              <View style={styles.currentLeft}>
                <Text style={styles.currentLabel}>{t('selected_currency')}</Text>
                <Text style={styles.currentValue}>
                  {settings.currency.symbol}  {settings.currency.name} ({settings.currency.code})
                </Text>
              </View>
              <View style={styles.symbolBadge}>
                <Text style={styles.symbolText}>{settings.currency.symbol}</Text>
              </View>
            </View>

            {/* Search */}
            <View style={styles.searchWrapper}>
              <Ionicons name="search-outline" size={18} color={COLORS.gray} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('search_currency')}
                placeholderTextColor={COLORS.gray}
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const selected = settings.currency.code === item.code;
          return (
            <TouchableOpacity
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => updateCurrency(item)}
            >
              <View style={[styles.symbolCircle, selected && { backgroundColor: COLORS.primary }]}>
                <Text style={[styles.rowSymbol, selected && { color: COLORS.white }]}>
                  {item.symbol}
                </Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowName, selected && { color: COLORS.primary }]}>
                  {item.name}
                </Text>
                <Text style={styles.rowCode}>{item.code}</Text>
              </View>
              {selected && (
                <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.grayLight },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  backBtn: { marginRight: SPACING.sm, padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, ...FONTS.bold, color: COLORS.white, textAlign: 'center' },

  sectionLabel: {
    fontSize: 11, ...FONTS.semiBold, color: COLORS.textLight,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },

  // Language
  langRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  langBtn: {
    flex: 1, alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 2, borderColor: COLORS.grayBorder,
    ...SHADOW.small,
  },
  langBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  langNative: { fontSize: 15, ...FONTS.bold, color: COLORS.text },
  langNativeActive: { color: COLORS.white },
  langSubName: { fontSize: 11, color: COLORS.gray, marginTop: 2 },

  // Currency
  currentBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primaryPale,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.grayBorder,
  },
  currentLeft: { flex: 1 },
  currentLabel: { fontSize: 11, color: COLORS.primary, ...FONTS.semiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  currentValue: { fontSize: 15, ...FONTS.bold, color: COLORS.text, marginTop: 2 },
  symbolBadge: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  symbolText: { fontSize: 18, ...FONTS.bold, color: COLORS.white },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: SPACING.md, marginBottom: SPACING.sm,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md,
    height: 44, ...SHADOW.small,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.grayLight,
  },
  rowSelected: { backgroundColor: COLORS.primaryPale },
  symbolCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.grayLight,
    justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.md,
  },
  rowSymbol: { fontSize: 16, ...FONTS.bold, color: COLORS.text },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, ...FONTS.semiBold, color: COLORS.text },
  rowCode: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
});
