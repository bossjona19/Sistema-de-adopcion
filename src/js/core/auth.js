import { supabase } from './supabase.js';

// Canjea el código OAuth (PKCE) por una sesión. Se llama UNA sola vez al cargar
// una página protegida, antes de requireAuth(). Como el cliente tiene
// detectSessionInUrl:false, este es el único canje y no hay race condition.
export async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);

  // Google/Supabase pueden volver con un error en vez de un código.
  const oauthError = params.get('error_description') || params.get('error');
  if (oauthError) {
    cleanAuthParamsFromUrl();
    throw new Error(oauthError);
  }

  const code = params.get('code');
  if (!code) return; // carga normal, no es un retorno de OAuth

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  cleanAuthParamsFromUrl(); // quita ?code= de la URL aunque falle
  if (error) throw error;
}

function cleanAuthParamsFromUrl() {
  window.history.replaceState({}, '', window.location.pathname);
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/dashboard.html',
    },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = '/login.html';
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Call at top of every protected page.
// Verifies session AND that the user exists in the usuarios table (admin whitelist).
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = '/login.html';
    return null;
  }

  const { data: adminRow } = await supabase
    .from('usuarios')
    .select('id')
    .eq('id', session.user.id)
    .maybeSingle();

  if (!adminRow) {
    await supabase.auth.signOut();
    window.location.href = '/login.html?error=no-access';
    return null;
  }

  return session;
}

// Redirect authenticated admins away from login page
export async function redirectIfAuthenticated() {
  const session = await getSession();
  if (!session) return;

  const { data: adminRow } = await supabase
    .from('usuarios')
    .select('id')
    .eq('id', session.user.id)
    .maybeSingle();

  if (adminRow) window.location.href = '/dashboard.html';
}
