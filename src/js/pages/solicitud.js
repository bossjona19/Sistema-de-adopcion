import { supabase } from '../core/supabase.js';
import { toast } from '../../components/toast.js';

const form    = document.getElementById('solicitud-form');
const errBox  = document.getElementById('form-error');

// El selector de fecha no deja elegir a menores de la edad mínima:
// tope máximo = hoy - 25 años. Refuerza la regla desde el propio control.
(() => {
  const fn = document.getElementById('fecha_nacimiento');
  if (!fn) return;
  const tope = new Date();
  tope.setFullYear(tope.getFullYear() - 25);
  fn.max = tope.toISOString().slice(0, 10);
})();

// ── Validation ───────────────────────────────────────────────
function showError(msg) {
  errBox.textContent = msg;
  errBox.style.display = 'block';
  errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearError() {
  errBox.style.display = 'none';
  errBox.textContent   = '';
}

function val(id) { return document.getElementById(id)?.value.trim() ?? ''; }
function checked(id) { return document.getElementById(id)?.checked ?? false; }

// Edad mínima legal del solicitante (Ley 46 de 2013, Panamá).
const EDAD_MINIMA = 25;

// Formato de cédula panameña: dos guiones, segmentos alfanuméricos.
// Acepta cédulas estándar (8-123-4567) y especiales (PE-123-456, E-8-1234, 8-AV-1234).
const CEDULA_RE = /^[A-Za-z0-9]{1,4}-[A-Za-z0-9]{1,5}-\d{1,6}$/;

// Calcula la edad en años cumplidos a partir de 'YYYY-MM-DD'.
function calcAge(dateStr) {
  const nac = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(nac.getTime())) return NaN;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function validate() {
  // Section 1
  if (!val('nombre_completo'))  return 'El nombre completo es obligatorio.';
  if (!val('cedula'))           return 'La cédula o documento de identidad es obligatoria.';
  if (!CEDULA_RE.test(val('cedula')))
    return 'La cédula no tiene un formato válido. Use el formato panameño, por ejemplo: 8-123-4567.';
  if (!val('fecha_nacimiento')) return 'La fecha de nacimiento es obligatoria.';

  const edad = calcAge(val('fecha_nacimiento'));
  const nac  = new Date(val('fecha_nacimiento') + 'T00:00:00');
  if (Number.isNaN(edad))       return 'La fecha de nacimiento no es válida.';
  if (nac > new Date())         return 'La fecha de nacimiento no puede estar en el futuro.';
  if (edad > 120)               return 'Verifique la fecha de nacimiento: la edad no es válida.';
  if (edad < EDAD_MINIMA)
    return `El solicitante debe tener al menos ${EDAD_MINIMA} años para postularse a la adopción (Ley 46 de 2013).`;

  if (!val('email'))            return 'El correo electrónico es obligatorio.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) return 'Ingrese un correo electrónico válido.';
  if (!val('telefono'))         return 'El teléfono de contacto es obligatorio.';
  if ((val('telefono').match(/\d/g) || []).length < 7)
    return 'Ingrese un teléfono de contacto válido (al menos 7 dígitos).';
  if (!val('direccion'))        return 'La dirección de residencia es obligatoria.';

  // Section 2
  if (!val('estado_civil'))         return 'Seleccione su estado civil.';
  if (!val('ocupacion'))            return 'La ocupación o profesión es obligatoria.';
  const nHijos  = document.getElementById('num_hijos')?.value;
  const nPers   = document.getElementById('num_personas_hogar')?.value;
  if (nHijos  === '' || nHijos  === null) return 'Indique el número de hijos actuales.';
  if (nPers   === '' || nPers   === null) return 'Indique el número de personas en el hogar.';

  // Section 3
  if (!val('motivacion')) return 'Por favor, describa su motivación para adoptar.';

  // Section 4
  if (!checked('acepta_seguimiento')) return 'Debe aceptar el proceso de seguimiento post-adopción.';
  if (!checked('acepta_evaluacion'))  return 'Debe aceptar la evaluación de idoneidad.';
  if (!checked('acepta_terminos'))    return 'Debe declarar que la información es veraz y aceptar los términos.';

  return null;
}

// ── Submit ───────────────────────────────────────────────────
form.addEventListener('submit', async e => {
  e.preventDefault();
  clearError();

  // Honeypot: if filled, it's a bot — fake success without inserting
  if (document.getElementById('s-website')?.value) {
    form.style.display = 'none';
    const successEl = document.getElementById('form-success');
    successEl.style.display = 'block';
    document.getElementById('ref-number').textContent =
      'REF-' + Date.now().toString(36).toUpperCase().slice(-6);
    successEl.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  const errorMsg = validate();
  if (errorMsg) { showError(errorMsg); return; }

  const btn = document.getElementById('btn-submit');
  btn.disabled    = true;
  btn.textContent = 'Enviando…';

  // Derive apellido from nombre_completo for admin display
  const nombreCompleto = val('nombre_completo');
  const words = nombreCompleto.split(/\s+/).filter(Boolean);
  const apellido = words.length >= 3
    ? words.slice(-2).join(' ')
    : (words[words.length - 1] || nombreCompleto);

  const payload = {
    apellido,
    contacto:            val('email') || val('telefono'),
    estado_eval:         'pendiente',
    fecha_solicitud:     new Date().toISOString().slice(0, 10),
    // Sección 1
    nombre_completo:     nombreCompleto,
    cedula:              val('cedula'),
    fecha_nacimiento:    val('fecha_nacimiento') || null,
    email:               val('email'),
    telefono:            val('telefono'),
    direccion:           val('direccion'),
    // Sección 2
    estado_civil:        val('estado_civil') || null,
    num_hijos:           parseInt(document.getElementById('num_hijos').value, 10),
    num_personas_hogar:  parseInt(document.getElementById('num_personas_hogar').value, 10),
    ocupacion:           val('ocupacion'),
    ingresos_aprox:      val('ingresos_aprox') || null,
    // Sección 3
    motivacion:          val('motivacion'),
    experiencia_ninos:   val('experiencia_ninos') || null,
    preferencia_edad:    val('preferencia_edad') || 'sin_preferencia',
    // Sección 4
    acepta_seguimiento:  checked('acepta_seguimiento'),
    acepta_evaluacion:   checked('acepta_evaluacion'),
    acepta_terminos:     checked('acepta_terminos'),
  };

  // Client-side reference code (no SELECT policy needed)
  const refCode = Date.now().toString(36).toUpperCase().slice(-6);

  const { error } = await supabase.from('familias').insert(payload);

  btn.disabled    = false;
  btn.textContent = 'Enviar solicitud de adopción';

  if (error) {
    // Duplicados: la DB rechaza con código 23505 (unique_violation).
    // Traducimos a un mensaje claro según cuál constraint se violó.
    if (error.code === '23505' || /duplicate key|unique constraint/i.test(error.message)) {
      const msg = /email/i.test(error.message)
        ? 'Ya existe una solicitud registrada con este correo electrónico.'
        : /cedula/i.test(error.message)
          ? 'Ya existe una solicitud registrada con esta cédula.'
          : 'Ya existe una solicitud con estos datos (correo o cédula duplicados).';
      toast(msg, 'error');
      showError(msg);
      return;
    }
    toast('Error al enviar la solicitud. Por favor, intente nuevamente.', 'error');
    showError('No fue posible enviar la solicitud: ' + error.message);
    return;
  }

  // Show success
  form.style.display = 'none';
  const successEl = document.getElementById('form-success');
  successEl.style.display = 'block';
  document.getElementById('ref-number').textContent = 'REF-' + refCode;
  successEl.scrollIntoView({ behavior: 'smooth' });
});

// "Enviar otra solicitud" → recarga (antes era un onclick inline; movido aquí para CSP).
document.getElementById('btn-otra-solicitud')?.addEventListener('click', () => location.reload());
