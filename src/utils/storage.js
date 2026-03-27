import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, toRow, fromRow } from './supabase';

const KEYS = {
  CURRENT_USER: 'harvest_current_user',
  JOBS: 'harvest_jobs',
  SETTINGS: 'harvest_settings',
  FIELDS: 'harvest_fields',
};

// ─── USERS ────────────────────────────────────────────────────────────────────

export const saveUser = async (user) => {
  // Check Supabase if email already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', user.email)
    .single();

  if (existing) throw new Error('Email already registered');

  const { error } = await supabase.from('users').insert({
    id: user.id,
    name: user.name,
    email: user.email,
    password: user.password,
    created_at: user.createdAt,
  });

  if (error) throw new Error('Failed to create account. Please try again.');
  console.log('✓ User registered in Supabase');
};

export const loginUser = async (email, password) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('password', password)
    .single();

  if (error || !data) throw new Error('Invalid email or password');

  const user = {
    id: data.id,
    name: data.name,
    email: data.email,
    password: data.password,
    createdAt: data.created_at,
  };

  // Store session locally so app remembers login between restarts
  await AsyncStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  console.log('✓ Login successful');
  return user;
};

export const getCurrentUser = async () => {
  const data = await AsyncStorage.getItem(KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
};

export const logoutUser = async () => {
  await AsyncStorage.removeItem(KEYS.CURRENT_USER);
};

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

export const getSettings = async (userId) => {
  // Try Supabase first
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      const s = {
        currency: {
          code: data.currency_code,
          symbol: data.currency_symbol,
          name: data.currency_name,
        },
      };
      await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(s));
      return s;
    }
  } catch {}

  // Fallback to local
  const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
  return raw ? JSON.parse(raw) : null;
};

export const saveSettings = async (userId, settings) => {
  // Save locally
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));

  // Sync to Supabase
  try {
    const { error } = await supabase.from('settings').upsert({
      user_id: userId,
      currency_code: settings.currency.code,
      currency_symbol: settings.currency.symbol,
      currency_name: settings.currency.name,
    });
    if (error) console.warn('Supabase saveSettings error:', error.message);
  } catch (e) {
    console.warn('Supabase offline, settings saved locally only');
  }
};

// ─── JOBS ─────────────────────────────────────────────────────────────────────

const saveAllLocal = async (userId, jobs) => {
  const data = await AsyncStorage.getItem(KEYS.JOBS);
  const all = data ? JSON.parse(data) : [];
  const others = all.filter((j) => j.userId !== userId);
  await AsyncStorage.setItem(KEYS.JOBS, JSON.stringify([...others, ...jobs]));
};

const getLocalJobs = async (userId) => {
  const data = await AsyncStorage.getItem(KEYS.JOBS);
  const all = data ? JSON.parse(data) : [];
  return all.filter((j) => j.userId === userId);
};

export const getJobs = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const jobs = data.map(fromRow);
    await saveAllLocal(userId, jobs);
    return jobs;
  } catch {
    return getLocalJobs(userId);
  }
};

export const saveJob = async (job) => {
  // Save locally
  const data = await AsyncStorage.getItem(KEYS.JOBS);
  const all = data ? JSON.parse(data) : [];
  all.push(job);
  await AsyncStorage.setItem(KEYS.JOBS, JSON.stringify(all));

  // Sync to Supabase
  const row = toRow(job);
  console.log('Saving job to Supabase:', JSON.stringify(row));
  const { error } = await supabase.from('jobs').insert(row);
  if (error) console.error('Supabase saveJob error:', JSON.stringify(error));
  else console.log('✓ Job synced to Supabase');
};

export const updateJob = async (updatedJob) => {
  // Update locally
  const data = await AsyncStorage.getItem(KEYS.JOBS);
  const all = data ? JSON.parse(data) : [];
  const index = all.findIndex((j) => j.id === updatedJob.id);
  if (index !== -1) {
    all[index] = updatedJob;
    await AsyncStorage.setItem(KEYS.JOBS, JSON.stringify(all));
  }

  // Sync to Supabase
  try {
    const { error } = await supabase.from('jobs').upsert(toRow(updatedJob));
    if (error) console.warn('Supabase updateJob error:', error.message);
  } catch {
    console.warn('Supabase offline, update saved locally only');
  }
};

export const deleteJob = async (jobId) => {
  // Delete locally
  const data = await AsyncStorage.getItem(KEYS.JOBS);
  const all = data ? JSON.parse(data) : [];
  const filtered = all.filter((j) => j.id !== jobId);
  await AsyncStorage.setItem(KEYS.JOBS, JSON.stringify(filtered));

  // Sync to Supabase
  try {
    const { error } = await supabase.from('jobs').delete().eq('id', jobId);
    if (error) console.warn('Supabase deleteJob error:', error.message);
  } catch {
    console.warn('Supabase offline, delete saved locally only');
  }
};

// ─── FIELDS ───────────────────────────────────────────────────────────────────

const toFieldRow = (f) => ({
  id: f.id,
  user_id: f.userId,
  client_name: f.clientName,
  location_name: f.locationName,
  polygon: f.polygon ?? null,
  location: f.location ?? null,
  surface: f.surface ?? null,
  created_at: f.createdAt ?? new Date().toISOString(),
});

const fromFieldRow = (r) => ({
  id: r.id,
  userId: r.user_id,
  clientName: r.client_name,
  locationName: r.location_name,
  polygon: r.polygon,
  location: r.location,
  surface: r.surface,
  createdAt: r.created_at,
});

const fieldsKey = (userId) => `${KEYS.FIELDS}_${userId}`;

export const getFields = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('fields')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    const fields = data.map(fromFieldRow);
    await AsyncStorage.setItem(fieldsKey(userId), JSON.stringify(fields));
    return fields;
  } catch {
    const raw = await AsyncStorage.getItem(fieldsKey(userId));
    return raw ? JSON.parse(raw) : [];
  }
};

export const saveField = async (field) => {
  const raw = await AsyncStorage.getItem(fieldsKey(field.userId));
  const all = raw ? JSON.parse(raw) : [];
  all.push(field);
  await AsyncStorage.setItem(fieldsKey(field.userId), JSON.stringify(all));

  try {
    const { error } = await supabase.from('fields').insert(toFieldRow(field));
    if (error) console.warn('Supabase saveField error:', error.message);
    else console.log('✓ Field synced to Supabase');
  } catch {
    console.warn('Supabase offline, field saved locally only');
  }
};

export const deleteField = async (fieldId, userId) => {
  const raw = await AsyncStorage.getItem(fieldsKey(userId));
  const all = raw ? JSON.parse(raw) : [];
  await AsyncStorage.setItem(fieldsKey(userId), JSON.stringify(all.filter((f) => f.id !== fieldId)));

  try {
    await supabase.from('fields').delete().eq('id', fieldId);
  } catch {}
};
