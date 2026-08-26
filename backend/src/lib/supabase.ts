import ws from 'ws';
import { createClient } from '@supabase/supabase-js';

// Garantir WebSocket global para Node.js
(globalThis as any).WebSocket = ws;
(global as any).WebSocket = ws;

const supabaseUrl = process.env.SUPABASE_URL || 'https://rfmneqarwmlestzszwwv.supabase.co';
const rawKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseServiceKey = (rawKey && !rawKey.includes('REPLACE'))
  ? rawKey
  : (process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbW5lcWFyd21sZXN0enN6d3d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMzk2MTEsImV4cCI6MjEwMjcxNTYxMX0.kIDl8Rk9Pbs9uXaCcdf3NhidMLTA_80qkys0qfpx6lI');

// Cliente com service role para operações do backend (bypassa RLS quando necessário)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Cliente com anon key para verificar tokens de usuário
export const supabaseAnon = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabase;
