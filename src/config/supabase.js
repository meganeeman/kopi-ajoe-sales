import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qtcrlxxzaranmvyohsdb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0Y3JseHh6YXJhbm12eW9oc2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMjc4NDksImV4cCI6MjEwMTkwMzg0OX0.dxahqrteBVVfNfK6Snz_ocbgfpgYY_l6_mv0RjKuLB0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});