import { signIn, signInWithGoogle, redirectIfAuthenticated } from '/src/js/core/auth.js';
import { accesoService } from '/src/js/services/accesoService.js';
import '/src/js/sw-register.js';

// Branding defensivo y AISLADO: si branding.js falla o no está desplegado,
// el inicio de sesión NO se ve afectado.
import('/src/js/branding.js').then(m => m.applyBranding()).catch(() => {});

// Show error if redirected from requireAuth / OAuth callback
const params = new URLSearchParams(location.search);
const authErrors = {
  'no-access':    'Tu cuenta no tiene acceso al sistema. Contacta al administrador.',
  'oauth-failed': 'No se pudo completar el inicio de sesión con Google. Intenta de nuevo.',
};
if (authErrors[params.get('error')]) {
  const errorEl = document.getElementById('auth-error');
  errorEl.textContent = authErrors[params.get('error')];
  errorEl.classList.add('show');
}
if (params.get('reset') === 'ok') {
  const ok = document.getElementById('auth-ok');
  ok.textContent = 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.';
  ok.style.display = 'block';
}

// Redirect if already logged in as admin
await redirectIfAuthenticated();

const form      = document.getElementById('login-form');
const errorEl   = document.getElementById('auth-error');
const btnText   = document.getElementById('btn-text');
const spinner   = document.getElementById('btn-spinner');
const submitBtn = document.getElementById('submit-btn');
const googleBtn = document.getElementById('google-btn');

// ── Email/password login ─────────────────────────────────
form.addEventListener('submit', async e => {
  e.preventDefault();
  errorEl.classList.remove('show');

  const email    = form.email.value.trim();
  const password = form.password.value;

  if (!email || !password) {
    errorEl.textContent = 'Por favor ingresa correo y contraseña.';
    errorEl.classList.add('show');
    return;
  }

  submitBtn.disabled = true;
  btnText.textContent = 'Verificando...';
  spinner.style.display = 'inline-block';

  try {
    const data = await signIn(email, password);
    await accesoService.log(data?.user?.id, data?.user?.email);
    window.location.href = '/dashboard.html';
  } catch (err) {
    const msgs = {
      'Invalid login credentials': 'Correo o contraseña incorrectos.',
      'Email not confirmed':       'Debes confirmar tu correo antes de ingresar.',
    };
    errorEl.textContent = msgs[err.message] ?? 'Error al iniciar sesión. Intenta de nuevo.';
    errorEl.classList.add('show');
  } finally {
    submitBtn.disabled = false;
    btnText.textContent = 'Iniciar sesión';
    spinner.style.display = 'none';
  }
});

// ── Google OAuth ─────────────────────────────────────────
googleBtn.addEventListener('click', async () => {
  googleBtn.disabled = true;
  googleBtn.textContent = 'Redirigiendo...';
  try {
    await signInWithGoogle();
    // Page will redirect to Google — no further action needed here
  } catch (err) {
    errorEl.textContent = 'No se pudo conectar con Google. Intenta de nuevo.';
    errorEl.classList.add('show');
    googleBtn.disabled = false;
    googleBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg> Continuar con Google`;
  }
});
