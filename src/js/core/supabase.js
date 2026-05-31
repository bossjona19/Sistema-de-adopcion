import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://gobgyfyfahfdsqfgobpd.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_th6y5ZH-c0_IJg_YZY9fVw_rhEC6r0h';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    flowType: 'pkce',          // intercambio seguro de código (no expone tokens en la URL)
    detectSessionInUrl: false, // canjeamos el código manualmente UNA sola vez (ver handleOAuthCallback) — evita la doble-canje que causaba el loop
    persistSession: true,
    autoRefreshToken: true,
  },
});
