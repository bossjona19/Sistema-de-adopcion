// Pruebas unitarias de la lógica pura de presentación (core/ui.js).
// Runner nativo de Node (node --test) — sin dependencias externas.
// No tocan DOM ni Supabase, por eso corren en CI sin navegador.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcAge, escapeHtml, pagerHtml, getInitials,
  estadoMenorLabel, prefEdadLabel, diffSummary,
} from '../src/js/core/ui.js';

test('escapeHtml neutraliza HTML peligroso (anti-XSS)', () => {
  assert.equal(escapeHtml('<script>"&'), '&lt;script&gt;&quot;&amp;');
  assert.equal(escapeHtml(null), '');
});

test('estadoMenorLabel usa terminología institucional', () => {
  assert.equal(estadoMenorLabel('disponible'), 'En espera de adopción');
  assert.equal(estadoMenorLabel('en_proceso'), 'En proceso de adopción');
  assert.equal(estadoMenorLabel('adoptado'),   'Adoptado');
  assert.equal(estadoMenorLabel('otro'),        'otro'); // fallback
});

test('prefEdadLabel: etapas nuevas + compatibilidad con rangos antiguos', () => {
  assert.equal(prefEdadLabel('bebe'),            'Bebé');
  assert.equal(prefEdadLabel('adolescencia'),    'Adolescencia');
  assert.equal(prefEdadLabel('sin_preferencia'), 'Sin preferencia');
  assert.equal(prefEdadLabel('0_3'),             'Bebé');         // registro viejo
  assert.equal(prefEdadLabel('13_17'),           'Adolescencia'); // registro viejo
});

test('calcAge devuelve edad o null', () => {
  const d = new Date(); d.setFullYear(d.getFullYear() - 10);
  assert.equal(calcAge(d.toISOString().slice(0, 10)), 10);
  assert.equal(calcAge(null), null);
});

test('getInitials toma hasta 2 iniciales en mayúscula', () => {
  assert.equal(getInitials('María García'), 'MG');
  assert.equal(getInitials('Juan'), 'J');
  assert.equal(getInitials(''), '?');
});

test('pagerHtml: rango correcto y botones deshabilitados en extremos', () => {
  const first = pagerHtml(0, 20, 50);
  assert.match(first, /1–20 de 50/);
  assert.match(first, /data-page-action="prev" disabled/);
  const last = pagerHtml(2, 20, 50);
  assert.match(last, /41–50 de 50/);
  assert.match(last, /data-page-action="next" disabled/);
  assert.match(pagerHtml(0, 20, 0), /0–0 de 0/);
});

test('diffSummary detecta cambios y devuelve null si no hay', () => {
  const d = diffSummary({ a: 1, b: 'x' }, { a: 2, b: 'x' }, { a: 'A', b: 'B' });
  assert.equal(d.antes,   'A: 1');
  assert.equal(d.despues, 'A: 2');
  assert.equal(diffSummary({ a: 1 }, { a: 1 }, { a: 'A' }), null);
});
