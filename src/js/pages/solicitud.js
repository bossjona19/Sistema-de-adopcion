import { supabase } from '../core/supabase.js';
import { toast } from '../../components/toast.js';

const form    = document.getElementById('solicitud-form');
const errBox  = document.getElementById('form-error');

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

function validate() {
  // Section 1
  if (!val('nombre_completo'))  return 'El nombre completo es obligatorio.';
  if (!val('cedula'))           return 'La cédula o documento de identidad es obligatoria.';
  if (!val('fecha_nacimiento')) return 'La fecha de nacimiento es obligatoria.';
  if (!val('email'))            return 'El correo electrónico es obligatorio.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) return 'Ingrese un correo electrónico válido.';
  if (!val('telefono'))         return 'El teléfono de contacto es obligatorio.';
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
