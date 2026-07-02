import { supabase } from '../core/supabase.js';
import { toast } from '../../components/toast.js';

const form    = document.getElementById('solicitud-form');
const errBox  = document.getElementById('form-error');

// Edad mínima legal del adoptante (Ley 46 de 2013, Panamá): mayoría de edad.
const EDAD_MINIMA = 18;
const EDAD_MAXIMA = 120;
const TEL_MIN_DIGITOS = 7;

// El selector de fecha no deja elegir a menores de la edad mínima:
// tope máximo = hoy - EDAD_MINIMA años. Refuerza la regla desde el propio control.
(() => {
  const fn = document.getElementById('fecha_nacimiento');
  if (!fn) return;
  const tope = new Date();
  tope.setFullYear(tope.getFullYear() - EDAD_MINIMA);
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

// Traduce un error de duplicado (23505) a un mensaje según el campo repetido.
function mensajeDuplicado(error) {
  if (/email/i.test(error.message))  return 'Ya existe una solicitud registrada con este correo electrónico.';
  if (/cedula/i.test(error.message)) return 'Ya existe una solicitud registrada con esta cédula.';
  return 'Ya existe una solicitud con estos datos (correo o cédula duplicados).';
}

// Formato de cédula panameña: dos guiones, segmentos alfanuméricos.
// Acepta cédulas estándar (8-123-4567) y especiales (PE-123-456, E-8-1234, 8-AV-1234).
const CEDULA_RE = /^[A-Za-z0-9]{1,4}-[A-Za-z0-9]{1,5}-\d{1,6}$/;
// Lineal (sin backtracking): las etiquetas del dominio excluyen el punto,
// así no hay solapamiento ambiguo entre los segmentos.
const EMAIL_RE  = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

// Calcula la edad en años cumplidos a partir de 'YYYY-MM-DD'.
function calcAge(dateStr) {
  const nac = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(nac.getTime())) return Number.NaN;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function countDigits(str) {
  return (str.match(/\d/g) || []).length;
}

// Valida fecha de nacimiento y edad mínima legal. Devuelve mensaje de error o null.
function validateFechaNacimiento() {
  if (!val('fecha_nacimiento')) return 'La fecha de nacimiento es obligatoria.';
  const edad = calcAge(val('fecha_nacimiento'));
  const nac  = new Date(val('fecha_nacimiento') + 'T00:00:00');
  if (Number.isNaN(edad)) return 'La fecha de nacimiento no es válida.';
  if (nac > new Date())   return 'La fecha de nacimiento no puede estar en el futuro.';
  if (edad > EDAD_MAXIMA) return 'Verifique la fecha de nacimiento: la edad no es válida.';
  if (edad < EDAD_MINIMA)
    return `El solicitante debe tener al menos ${EDAD_MINIMA} años para postularse a la adopción (Ley 46 de 2013).`;
  return null;
}

// Sección 1: información personal.
function validatePersonal() {
  if (!val('nombre_completo')) return 'El nombre completo es obligatorio.';
  if (!val('cedula'))          return 'La cédula o documento de identidad es obligatoria.';
  if (!CEDULA_RE.test(val('cedula')))
    return 'La cédula no tiene un formato válido. Use el formato panameño, por ejemplo: 8-123-4567.';
  const errFecha = validateFechaNacimiento();
  if (errFecha) return errFecha;
  if (!val('email'))           return 'El correo electrónico es obligatorio.';
  if (!EMAIL_RE.test(val('email'))) return 'Ingrese un correo electrónico válido.';
  if (!val('telefono'))        return 'El teléfono de contacto es obligatorio.';
  if (countDigits(val('telefono')) < TEL_MIN_DIGITOS)
    return 'Ingrese un teléfono de contacto válido (al menos 7 dígitos).';
  if (!val('direccion'))       return 'La dirección de residencia es obligatoria.';
  return null;
}

// Sección 2: información familiar / hogar.
function validateHogar() {
  if (!val('estado_civil')) return 'Seleccione su estado civil.';
  if (!val('ocupacion'))    return 'La ocupación o profesión es obligatoria.';
  const nHijos = document.getElementById('num_hijos')?.value;
  const nPers  = document.getElementById('num_personas_hogar')?.value;
  if (nHijos === '' || nHijos === null) return 'Indique el número de hijos actuales.';
  if (nPers  === '' || nPers  === null) return 'Indique el número de personas en el hogar.';
  return null;
}

// Secciones 3 y 4: motivación y declaraciones obligatorias.
function validateDeclaraciones() {
  if (!val('motivacion')) return 'Por favor, describa su motivación para adoptar.';
  if (!checked('acepta_seguimiento')) return 'Debe aceptar el proceso de seguimiento post-adopción.';
  if (!checked('acepta_evaluacion'))  return 'Debe aceptar la evaluación de idoneidad.';
  if (!checked('acepta_terminos'))    return 'Debe declarar que la información es veraz y aceptar los términos.';
  return null;
}

function validate() {
  return validatePersonal() || validateHogar() || validateDeclaraciones();
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
    num_hijos:           Number.parseInt(document.getElementById('num_hijos').value, 10),
    num_personas_hogar:  Number.parseInt(document.getElementById('num_personas_hogar').value, 10),
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
      const msg = mensajeDuplicado(error);
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
