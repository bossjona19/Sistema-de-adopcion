import { completeRecovery, updatePassword, signOut } from '../core/auth.js';
import '../sw-register.js';

// Branding defensivo y AISLADO: si branding.js falla, la página no se ve afectada.
import('../branding.js').then(m => m.applyBranding()).catch(() => {});

const loading = document.getElementById('loading');
const invalid = document.getElementById('invalid');
const form    = document.getElementById('reset-form');
const errorEl = document.getElementById('auth-error');
const btn     = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');
const spinner = document.getElementById('btn-spinner');

// Validar el enlace al cargar (canjea el código por una sesión de recuperación).
try {
  const ok = await completeRecovery();
  loading.style.display = 'none';
  if (ok) form.style.display = '';
  else    invalid.style.display = 'block';
} catch {
  loading.style.display = 'none';
  invalid.style.display = 'block';
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  errorEl.classList.remove('show');

  const pw  = form.password.value;
  const pw2 = form.password2.value;

  if (pw.length < 8) {
    errorEl.textContent = 'La contraseña debe tener al menos 8 caracteres.';
    errorEl.classList.add('show');
    return;
  }
  if (pw !== pw2) {
    errorEl.textContent = 'Las contraseñas no coinciden.';
    errorEl.classList.add('show');
    return;
  }

  btn.disabled = true;
  btnText.textContent = 'Guardando…';
  spinner.style.display = 'inline-block';

  try {
    await updatePassword(pw);
    await signOut(); // cierra la sesión de recuperación → redirige a /login.html
    window.location.href = '/login.html?reset=ok';
  } catch (err) {
    errorEl.textContent = 'No se pudo actualizar la contraseña. El enlace pudo expirar; solicita uno nuevo.';
    errorEl.classList.add('show');
    btn.disabled = false;
    btnText.textContent = 'Guardar contraseña';
    spinner.style.display = 'none';
  }
});
