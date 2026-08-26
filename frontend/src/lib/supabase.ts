import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rfmneqarwmlestzszwwv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbW5lcWFyd21sZXN0enN6d3d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMzk2MTEsImV4cCI6MjEwMjcxNTYxMX0.kIDl8Rk9Pbs9uXaCcdf3NhidMLTA_80qkys0qfpx6lI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


