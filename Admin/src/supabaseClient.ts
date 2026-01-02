import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gqjfopcfzmjfoliccspt.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxamZvcGNmem1qZm9saWNjc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTc4NzEsImV4cCI6MjA4MDY3Mzg3MX0.l-I485Bi_ieAxuEEoaRPW-QGil3sU-EYq0XPyYd96IY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
