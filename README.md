# Sistema de Gestión de Adopciones — MVP

## Descripción

Sistema web diseñado para gestionar procesos básicos de adopción mediante una plataforma moderna, responsive y escalable.

Este MVP permite administrar menores, familias y casos de adopción desde un panel administrativo centralizado, facilitando el seguimiento de información y validando la arquitectura inicial del proyecto.

---

# Objetivo del MVP

El propósito de esta primera versión es implementar las funcionalidades esenciales del sistema para demostrar la viabilidad técnica y funcional del proyecto antes de desarrollar módulos avanzados.

---

# Tecnologías utilizadas

## Frontend

* HTML
* CSS
* JavaScript 

## Backend / Base de Datos

* Supabase
* PostgreSQL

## Despliegue

* Vercel

## Progressive Web App (PWA)

* Manifest.json
* Service Worker
* Instalación como aplicación

---

# Funcionalidades del MVP

## Autenticación

* Inicio de sesión de administradores mediante Supabase Auth.

## Gestión de menores

* Registro de menores
* Edición de información
* Estado del menor
* Fotografía y descripción

## Gestión de familias

* Registro de familias solicitantes
* Información de contacto
* Estado de solicitud

## Gestión de casos

* Creación de casos de adopción
* Relación entre familia y menor
* Actualización de estados

## Dashboard administrativo

* Métricas generales
* Casos activos
* Familias registradas
* Menores registrados

## PWA

* Instalación como aplicación
* Cache básico mediante Service Worker
* Optimización para dispositivos móviles

---

# Arquitectura del proyecto

```txt
sistema-de-adopcion/
│
├── index.html
├── dashboard.html
├── login.html
├── manifest.json
├── sw.js
├── vercel.json
├── README.md
│
├── src/
│   │
│   ├── js/
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── menores.js
│   │   ├── familias.js
│   │   ├── casos.js
│   │   ├── dashboard.js
│   │   ├── ui.js
│   │   ├── supabase.js
│   │   └── sw-register.js
│   │
│   ├── css/
│   │   ├── styles.css
│   │   ├── dashboard.css
│   │   └── auth.css
│   │
│   └── assets/
│       ├── img/
│       └── icons/
│
└── docs/
    └── planeamiento-tecnico.pdf
```

---

# Funcionalidades futuras

* Roles avanzados
* Sistema de permisos
* Notificaciones automáticas
* Correos electrónicos
* Reportes avanzados
* Auditoría de acciones
* Gestión documental
* Evaluaciones técnicas
* Integración con APIs externas

---

# Estado del proyecto

Actualmente el sistema se encuentra en fase MVP (Producto Mínimo Viable), enfocado en validar el flujo principal del proceso de adopciones y establecer una base sólida para futuras versiones.

---

# Autor

Jonathan Quintero
