import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/SettingsContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const t = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirm) {
      Alert.alert(t('error'), t('fill_all_fields'));
      return;
    }
    if (password !== confirm) {
      Alert.alert(t('error'), 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('error'), 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
    } catch (e) {
      Alert.alert(t('register_failed'), e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="person-add" size={40} color={COLORS.white} />
          </View>
          <Text style={styles.appName}>{t('create_account')}</Text>
          <Text style={styles.subtitle}>{t('app_subtitle')}</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.label}>{t('full_name')}</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('name_placeholder')}
              placeholderTextColor={COLORS.gray}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.label}>{t('email')}</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('email_placeholder')}
              placeholderTextColor={COLORS.gray}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.label}>{t('password')}</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Min. 6 characters"
              placeholderTextColor={COLORS.gray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>{t('confirm_password')}</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Repeat password"
              placeholderTextColor={COLORS.gray}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showPass}
            />
          </View>

          <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.registerBtnText}>{t('create_account')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.goBack()}>
            <Text style={styles.loginLinkText}>
              {t('have_account')} <Text style={styles.loginLinkBold}>{t('sign_in')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  scroll: { flexGrow: 1, padding: SPACING.lg, paddingTop: 60 },
  backBtn: { position: 'absolute', top: 50, left: SPACING.lg, zIndex: 10, padding: 4 },
  header: { alignItems: 'center', marginBottom: SPACING.xl, marginTop: 20 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  appName: { fontSize: 26, color: COLORS.white, ...FONTS.bold },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOW.medium,
  },
  label: { fontSize: 13, ...FONTS.semiBold, color: COLORS.textLight, marginBottom: 6, marginTop: SPACING.sm },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.grayBorder,
    borderRadius: RADIUS.md, backgroundColor: COLORS.grayLight,
    paddingHorizontal: SPACING.sm, marginBottom: 4,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: 15, color: COLORS.text },
  eyeBtn: { padding: 4 },
  registerBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 50, justifyContent: 'center', alignItems: 'center',
    marginTop: SPACING.lg,
    ...SHADOW.small,
  },
  registerBtnText: { color: COLORS.white, fontSize: 16, ...FONTS.bold },
  loginLink: { marginTop: SPACING.md, alignItems: 'center' },
  loginLinkText: { fontSize: 14, color: COLORS.gray },
  loginLinkBold: { color: COLORS.primary, ...FONTS.semiBold },
});
