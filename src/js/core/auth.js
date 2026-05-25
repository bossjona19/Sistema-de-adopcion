import { supabase } from './supabase.js';

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
