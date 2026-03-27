import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://yjxbdreglhovzluatjpi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqeGJkcmVnbGhvdnpsdWF0anBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1ODU4ODYsImV4cCI6MjA5MDE2MTg4Nn0.mA9kI5byEs63tTFl6xNn_rZDdt77QpHb6O5Ta9OWLUo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// Convert local camelCase job → Supabase snake_case row
export const toRow = (job) => ({
  id: job.id,
  user_id: job.userId,
  client_name: job.clientName,
  date: job.date,
  surface: job.surface ?? null,
  price_per_m2: job.pricePerM2 ?? null,
  total_price: job.totalPrice ?? null,
  paid: job.paid ?? false,
  paid_date: job.paidDate ?? null,
  notes: job.notes ?? null,
  location_name: job.locationName ?? null,
  location: job.location ?? null,
  polygon: job.polygon ?? null,
  payments: job.payments ?? [],
  created_at: job.createdAt ?? new Date().toISOString(),
});

// Convert Supabase row → local camelCase job
export const fromRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  clientName: row.client_name,
  date: row.date,
  surface: row.surface,
  pricePerM2: row.price_per_m2,
  totalPrice: row.total_price,
  paid: row.paid,
  paidDate: row.paid_date,
  notes: row.notes,
  locationName: row.location_name,
  location: row.location,
  polygon: row.polygon,
  payments: row.payments || [],
  createdAt: row.created_at,
});
