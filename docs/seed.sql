-- ============================================================
-- PROYECTO OMEGA — Datos de ejemplo (seed v1)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ⚠ SOLO para entornos de desarrollo / demo universitaria.
-- Todos los datos son completamente ficticios.
-- ============================================================

-- ─── Limpiar datos previos (descomenta si necesitas reset) ───
/*
delete from public.seguimiento;
delete from public.casos;
delete from public.familias;
delete from public.menores;
*/

-- ════════════════════════════════════════════════════════════
-- MENORES  (10 registros ficticios)
-- ════════════════════════════════════════════════════════════
insert into public.menores (id, nombre, edad, estado, foto_url, descripcion, created_at)
values

('aa100000-0000-0000-0000-000000000001', 'Sofía Martínez', 5, 'disponible',
 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sofia&backgroundColor=b6e3f4',
 'Sofía disfruta dibujar y leer cuentos infantiles. Le encantan los colores brillantes y tiene una imaginación desbordante. Siempre está dispuesta a compartir una sonrisa con todos.',
 '2024-08-15 08:00:00+00'),

('aa100000-0000-0000-0000-000000000002', 'Mateo González', 8, 'disponible',
 'https://api.dicebear.com/7.x/adventurer/svg?seed=Mateo&backgroundColor=c0aede',
 'Mateo es curioso y lleno de energía. Le apasionan los dinosaurios, construir con bloques y hacer preguntas sobre cómo funciona el mundo. Sería el pequeño científico de cualquier hogar.',
 '2024-09-03 09:30:00+00'),

('aa100000-0000-0000-0000-000000000003', 'Valentina Ríos', 3, 'disponible',
 'https://api.dicebear.com/7.x/adventurer/svg?seed=Valentina&backgroundColor=ffd5dc',
 'Valentina es alegre y muy cariñosa. Le encanta la música, bailar con cualquier melodía y dar abrazos espontáneos. Su risa ilumina cualquier habitación.',
 '2024-10-20 11:00:00+00'),

('aa100000-0000-0000-0000-000000000004', 'Andrés Caballero', 11, 'en_proceso',
 'https://api.dicebear.com/7.x/adventurer/svg?seed=Andres&backgroundColor=d1d4f9',
 'Andrés es responsable y tiene grandes sueños. Le apasiona el fútbol y la matemática. Sueña con estudiar ingeniería para construir cosas que ayuden a las personas.',
 '2024-07-10 14:00:00+00'),

('aa100000-0000-0000-0000-000000000005', 'Camila Fuentes', 7, 'disponible',
 'https://api.dicebear.com/7.x/adventurer/svg?seed=Camila&backgroundColor=b6e3f4',
 'Camila es creativa y empática. Le gusta cuidar plantas, aprender sobre animales y pasar tiempo al aire libre. Tiene un talento especial para el dibujo y la pintura.',
 '2024-11-05 10:00:00+00'),

('aa100000-0000-0000-0000-000000000006', 'Diego Vargas', 9, 'en_proceso',
 'https://api.dicebear.com/7.x/adventurer/svg?seed=Diego&backgroundColor=c0aede',
 'Diego es tranquilo y muy reflexivo. Disfruta los rompecabezas, leer novelas de aventuras y descubrir nuevas palabras. Es muy ordenado y responsable con sus cosas.',
 '2024-06-22 12:00:00+00'),

('aa100000-0000-0000-0000-000000000007', 'Isabella Torres', 2, 'disponible',
 'https://api.dicebear.com/7.x/adventurer/svg?seed=Isabella&backgroundColor=ffd5dc',
 'Isabella es una bebé activa y sonriente que llena de alegría cualquier espacio. Le encanta la música suave, los juguetes de colores y jugar con agua.',
 '2024-12-01 09:00:00+00'),

('aa100000-0000-0000-0000-000000000008', 'Lucas Moreno', 14, 'disponible',
 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lucas&backgroundColor=d1d4f9',
 'Lucas es un adolescente responsable y artístico. Toca la guitarra, le apasiona el diseño gráfico y aspira a estudiar arquitectura. Es maduro para su edad y muy buen compañero.',
 '2024-09-18 15:00:00+00'),

('aa100000-0000-0000-0000-000000000009', 'Gabriela Soto', 6, 'adoptado',
 'https://api.dicebear.com/7.x/adventurer/svg?seed=Gabriela&backgroundColor=b6e3f4',
 'Gabriela encontró la familia que esperaba. Le encantaba pintar con acuarelas, cuidar su jardín de juguete y escuchar historias antes de dormir.',
 '2024-05-08 08:00:00+00'),

('aa100000-0000-0000-0000-000000000010', 'Sebastián Perea', 10, 'adoptado',
 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sebastian&backgroundColor=c0aede',
 'Sebastián fue adoptado exitosamente. Era apasionado por el deporte, los experimentos de ciencias y los juegos de mesa. Siempre fue el animador del grupo.',
 '2024-04-14 10:00:00+00')

on conflict (id) do nothing;


-- ════════════════════════════════════════════════════════════
-- FAMILIAS  (7 registros ficticios)
-- ════════════════════════════════════════════════════════════
insert into public.familias (
  id, apellido, contacto, estado_eval, fecha_solicitud,
  nombre_completo, cedula, fecha_nacimiento, email, telefono, direccion,
  estado_civil, num_hijos, num_personas_hogar, ocupacion, ingresos_aprox,
  motivacion, experiencia_ninos, preferencia_edad,
  acepta_seguimiento, acepta_evaluacion, acepta_terminos,
  notas, created_at
)
values

-- Familia 1 — Aprobada — caso activo (Andrés)
('bb100000-0000-0000-0000-000000000001',
 'Rodríguez Morales', 'maria.rodriguez@correo.pa', 'aprobada', '2024-10-01',
 'María Elena Rodríguez Morales', '8-712-3456', '1985-04-12',
 'maria.rodriguez@correo.pa', '+507 6712-3456',
 'Corregimiento de Bella Vista, Ciudad de Panamá',
 'casado', 1, 3, 'Docente de primaria', '1000_2000',
 'Como maestra de primaria, he dedicado mi vida a los niños. Mi esposo y yo tenemos un hogar estable, lleno de amor y con mucho espacio para darle a un niño la oportunidad que merece.',
 'Trabajo con niños de 6 a 12 años hace más de 10 años. También fui tutora voluntaria en el Centro de Desarrollo Familiar.',
 '8_12', true, true, true,
 'Familia sólida. Estudio social completado. Vivienda propia en Bella Vista.',
 '2024-10-01 10:00:00+00'),

-- Familia 2 — Aprobada — caso activo (Diego)
('bb100000-0000-0000-0000-000000000002',
 'Castillo Herrera', 'rcastillo@empresa.com.pa', 'aprobada', '2024-09-15',
 'Roberto Antonio Castillo Herrera', '4-215-6789', '1979-11-30',
 'rcastillo@empresa.com.pa', '+507 6624-7890',
 'Calle 50, San Francisco, Ciudad de Panamá',
 'casado', 1, 4, 'Ingeniero civil', 'mas_2000',
 'Mi esposa Laura y yo llevamos 15 años construyendo un hogar lleno de valores. Queremos ofrecerle a un niño estabilidad, educación y el amor de una familia completa.',
 'Tenemos un hijo biológico de 8 años. Participamos en el programa de crianza temporal del MIDES durante 2 años.',
 '8_12', true, true, true,
 'Familia con expediente completo. Aprobados en evaluación psicológica y estudio social.',
 '2024-09-15 09:00:00+00'),

-- Familia 3 — Pendiente
('bb100000-0000-0000-0000-000000000003',
 'Flores Quintero', '+507 6891-2345', 'pendiente', '2024-12-10',
 'Carmen Isabel Flores Quintero', '6-389-1234', '1990-07-22',
 'cflores.educa@gmail.com', '+507 6891-2345',
 'Vía España, El Cangrejo, Ciudad de Panamá',
 'soltero', 0, 1, 'Psicóloga infantil', '1000_2000',
 'Soy psicóloga infantil y he trabajado durante años acompañando a niños en situación de vulnerabilidad. Puedo ofrecerle a un niño un entorno seguro, afectuoso y estimulante.',
 'Trabajo clínico con niños de 3 a 16 años. Voluntaria en la Fundación Pro-Niñez de Panamá.',
 '4_7', true, true, true,
 null,
 '2024-12-10 14:00:00+00'),

-- Familia 4 — Pendiente
('bb100000-0000-0000-0000-000000000004',
 'Vega Santamaría', 'jvega.pa@outlook.com', 'pendiente', '2024-12-05',
 'Jorge Luis Vega Santamaría', '2-714-5678', '1983-03-17',
 'jvega.pa@outlook.com', '+507 6543-9876',
 'Barriada Los Andes, David, Chiriquí',
 'union_libre', 2, 4, 'Contador público', '1000_2000',
 'Patricia y yo llevamos 10 años juntos y tenemos dos hijos maravillosos. Queremos ampliar nuestra familia con un niño que necesite un hogar. Vivimos en una casa amplia con jardín en David.',
 'Tenemos hijos de 7 y 9 años. Hemos participado en voluntariado infantil en nuestra comunidad.',
 'sin_preferencia', true, true, true,
 null,
 '2024-12-05 11:00:00+00'),

-- Familia 5 — Rechazada
('bb100000-0000-0000-0000-000000000005',
 'Delgado Pinzón', 'adelgado@hotmail.com', 'rechazada', '2024-08-20',
 'Ana Lucía Delgado Pinzón', '9-156-7890', '1975-09-05',
 'adelgado@hotmail.com', '+507 6321-4567',
 'Parque Lefevre, Ciudad de Panamá',
 'divorciado', 0, 2, 'Comerciante', '500_1000',
 'Deseo acompañar a un niño en su crecimiento y ofrecerle una vida mejor.',
 null,
 'sin_preferencia', true, true, true,
 'Evaluación psicológica no favorable. Inestabilidad laboral documentada. Expediente cerrado.',
 '2024-08-20 10:00:00+00'),

-- Familia 6 — Aprobada — caso cerrado (Gabriela adoptada)
('bb100000-0000-0000-0000-000000000006',
 'Paredes Núñez', 'lparedes@correo.pa', 'aprobada', '2024-03-10',
 'Luis Carlos Paredes Núñez', '3-509-2341', '1981-01-25',
 'lparedes@correo.pa', '+507 6712-0011',
 'El Dorado, Ciudad de Panamá',
 'casado', 0, 2, 'Médico general', 'mas_2000',
 'Gloria y yo llevamos 12 años casados. No hemos podido tener hijos biológicos. Tenemos un hogar estable, lleno de amor y con todas las condiciones para brindar una vida plena a un niño.',
 'Mi esposa Gloria es maestra de preescolar. Hemos sido padrinos activos de dos sobrinos por más de 5 años.',
 '4_7', true, true, true,
 'Adopción completada. Gabriela Soto integrada formalmente a la familia el 15/11/2024.',
 '2024-03-10 09:00:00+00'),

-- Familia 7 — Aprobada — caso cerrado (Sebastián adoptado)
('bb100000-0000-0000-0000-000000000007',
 'Méndez Alvarado', 'cmendezy@gmail.com', 'aprobada', '2024-02-14',
 'Carlos Manuel Méndez Alvarado', '5-311-8901', '1977-06-14',
 'cmendezy@gmail.com', '+507 6834-5601',
 'Marbella, Ciudad de Panamá',
 'casado', 0, 2, 'Abogado', 'mas_2000',
 'Hemos soñado con ser padres durante muchos años. Tenemos los recursos, el tiempo y sobre todo el amor para acoger a un niño y darle todas las oportunidades que se merece.',
 'Voluntarios en el Hogar del Niño durante 3 años. Excelentes referencias del equipo de trabajo social.',
 '8_12', true, true, true,
 'Adopción completada. Sebastián Perea integrado formalmente a la familia el 02/10/2024.',
 '2024-02-14 10:00:00+00')

on conflict (id) do nothing;


-- ════════════════════════════════════════════════════════════
-- CASOS  (4 casos con diferentes etapas)
-- ════════════════════════════════════════════════════════════
insert into public.casos (id, familia_id, menor_id, etapa, usuario_id, created_at)
values

-- Caso activo: Rodríguez + Andrés → seguimiento
('cc100000-0000-0000-0000-000000000001',
 'bb100000-0000-0000-0000-000000000001',
 'aa100000-0000-0000-0000-000000000004',
 'seguimiento', null,
 '2024-10-15 09:00:00+00'),

-- Caso activo: Castillo + Diego → evaluacion
('cc100000-0000-0000-0000-000000000002',
 'bb100000-0000-0000-0000-000000000002',
 'aa100000-0000-0000-0000-000000000006',
 'evaluacion', null,
 '2024-10-01 10:00:00+00'),

-- Caso cerrado: Paredes + Gabriela → cierre
('cc100000-0000-0000-0000-000000000003',
 'bb100000-0000-0000-0000-000000000006',
 'aa100000-0000-0000-0000-000000000009',
 'cierre', null,
 '2024-04-05 08:00:00+00'),

-- Caso cerrado: Méndez + Sebastián → cierre
('cc100000-0000-0000-0000-000000000004',
 'bb100000-0000-0000-0000-000000000007',
 'aa100000-0000-0000-0000-000000000010',
 'cierre', null,
 '2024-03-01 11:00:00+00')

on conflict (id) do nothing;


-- ════════════════════════════════════════════════════════════
-- SEGUIMIENTO  (13 notas de seguimiento)
-- ════════════════════════════════════════════════════════════
insert into public.seguimiento (id, caso_id, descripcion, fecha, usuario_id)
values

-- Caso 1: Rodríguez + Andrés (seguimiento activo — 4 notas)
('dd100000-0000-0000-0000-000000000001',
 'cc100000-0000-0000-0000-000000000001',
 'Entrevista inicial completada con la familia Rodríguez. Se verificó documentación personal y laboral. Impresión general favorable.',
 '2024-10-15 10:00:00+00', null),

('dd100000-0000-0000-0000-000000000002',
 'cc100000-0000-0000-0000-000000000001',
 'Visita domiciliaria realizada en Bella Vista. Vivienda adecuada, ambiente familiar estable y seguro. Informe del trabajador social: positivo.',
 '2024-10-28 14:00:00+00', null),

('dd100000-0000-0000-0000-000000000003',
 'cc100000-0000-0000-0000-000000000001',
 'Primer encuentro entre Andrés y la familia Rodríguez en instalaciones neutras del MIDES. Interacción muy positiva. Andrés mostró interés y comodidad con la dinámica familiar.',
 '2024-11-12 11:00:00+00', null),

('dd100000-0000-0000-0000-000000000004',
 'cc100000-0000-0000-0000-000000000001',
 'Seguimiento mensual. Andrés se está adaptando bien al ambiente familiar. La señora Rodríguez reporta avances positivos en comunicación y confianza. Se programa siguiente visita.',
 '2024-12-05 09:00:00+00', null),

-- Caso 2: Castillo + Diego (evaluacion — 3 notas)
('dd100000-0000-0000-0000-000000000005',
 'cc100000-0000-0000-0000-000000000002',
 'Expediente de la familia Castillo recibido y revisado. Documentación completa y en orden. Se programa evaluación psicológica para la semana próxima.',
 '2024-10-01 09:00:00+00', null),

('dd100000-0000-0000-0000-000000000006',
 'cc100000-0000-0000-0000-000000000002',
 'Evaluación psicológica de la familia Castillo completada por la Lic. Torres. Resultados satisfactorios en todas las áreas evaluadas. Se procede con estudio social.',
 '2024-10-18 15:00:00+00', null),

('dd100000-0000-0000-0000-000000000007',
 'cc100000-0000-0000-0000-000000000002',
 'Estudio social en proceso. Entrevista individual con el hijo biológico de la familia. Dinámica familiar positiva y abierta a la integración de un nuevo miembro.',
 '2024-11-08 11:00:00+00', null),

-- Caso 3: Paredes + Gabriela (cierre — 3 notas)
('dd100000-0000-0000-0000-000000000008',
 'cc100000-0000-0000-0000-000000000003',
 'Proceso iniciado. Familia Paredes evaluada favorablemente en todos los parámetros. Se asignó a Gabriela Soto como candidata prioritaria.',
 '2024-04-05 09:00:00+00', null),

('dd100000-0000-0000-0000-000000000009',
 'cc100000-0000-0000-0000-000000000003',
 'Período de convivencia y vinculación completado satisfactoriamente. Gabriela se adaptó plenamente al hogar Paredes. Todos los informes mensuales presentaron resultados positivos.',
 '2024-08-20 10:00:00+00', null),

('dd100000-0000-0000-0000-000000000010',
 'cc100000-0000-0000-0000-000000000003',
 'Adopción finalizada. Resolución judicial N.º 2024-1847 emitida el 15/11/2024. Gabriela Soto integrada formalmente a la familia Paredes Núñez. Expediente archivado con resultado: EXITOSO.',
 '2024-11-15 12:00:00+00', null),

-- Caso 4: Méndez + Sebastián (cierre — 3 notas)
('dd100000-0000-0000-0000-000000000011',
 'cc100000-0000-0000-0000-000000000004',
 'Proceso iniciado con la familia Méndez Alvarado. Expediente completo y sin observaciones. Sebastián Perea asignado como candidato compatible.',
 '2024-03-01 09:00:00+00', null),

('dd100000-0000-0000-0000-000000000012',
 'cc100000-0000-0000-0000-000000000004',
 'Seguimiento del período de convivencia. Sebastián se integró al hogar Méndez sin dificultades. Excelente vínculo afectivo establecido con ambos tutores.',
 '2024-07-10 11:00:00+00', null),

('dd100000-0000-0000-0000-000000000013',
 'cc100000-0000-0000-0000-000000000004',
 'Adopción finalizada. Resolución judicial N.º 2024-1201 emitida el 02/10/2024. Sebastián Perea integrado formalmente a la familia Méndez Alvarado. Expediente archivado con resultado: EXITOSO.',
 '2024-10-02 14:00:00+00', null)

on conflict (id) do nothing;


-- ════════════════════════════════════════════════════════════
-- VERIFICACIÓN  (resultados esperados tras ejecutar el seed)
-- ════════════════════════════════════════════════════════════
/*
select 'menores'     as tabla, count(*) from public.menores     union all
select 'familias'    as tabla, count(*) from public.familias    union all
select 'casos'       as tabla, count(*) from public.casos       union all
select 'seguimiento' as tabla, count(*) from public.seguimiento;

-- Esperado:
-- menores     → 10
-- familias    → 7
-- casos       → 4
-- seguimiento → 13
*/
