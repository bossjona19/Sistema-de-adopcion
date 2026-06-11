import { requestPasswordReset } from '/src/js/core/auth.js';
import '/src/js/sw-register.js';

// Branding defensivo y AISLADO: si branding.js falla, la página no se ve afectada.
import('/src/js/branding.js').then(m => m.applyBranding()).catch(() => {});

const form    = document.getElementById('recuperar-form');
const errorEl = document.getElementById('auth-error');
const okEl    = document.getElementById('auth-ok');
const btn     = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');
const spinner = document.getElementById('btn-spinner');

form.addEventListener('submit', async e => {
  e.preventDefault();
  errorEl.classList.remove('show');
  okEl.style.display = 'none';

  const email = form.email.value.trim();
  if (!email) {
    errorEl.textContent = 'Ingresa tu correo electrónico.';
    errorEl.classList.add('show');
    return;
  }

  btn.disabled = true;
  btnText.textContent = 'Enviando…';
  spinner.style.display = 'inline-block';

  try {
    await requestPasswordReset(email);
    // Mensaje neutro: no revela si el correo existe (buena práctica de seguridad).
    okEl.textContent = 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja.';
    okEl.style.display = 'block';
    form.reset();
  } catch (err) {
    errorEl.textContent = 'No se pudo enviar el enlace. Intenta de nuevo en unos minutos.';
    errorEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Enviar enlace de recuperación';
    spinner.style.display = 'none';
  }
});
