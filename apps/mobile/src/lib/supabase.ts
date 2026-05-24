import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(url, anon, {
  auth: {
    storage: AsyncStorage,
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const WEB_API_URL = process.env.EXPO_PUBLIC_WEB_API_URL ?? 'http://localhost:3000';
