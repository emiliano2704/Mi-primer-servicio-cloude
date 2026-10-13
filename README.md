# Aula Cloud — Sistema de cursos

Aplicación de la actividad de Cloud Computing: React + API REST en Node.js (Netlify Functions) + Google Sheets. Permite iniciar sesión, crear, consultar, editar y eliminar cursos. Incluye búsqueda por nombre, filtro por categoría, contador de cursos y validación de formularios.

## Arquitectura

Usuario → React (Netlify) → `/api/*` (función Node.js en Netlify) → Google Sheets API → hoja `Cursos`.

La cuenta de servicio y la contraseña están solo en variables de entorno del servidor. El navegador recibe un token de sesión con firma HMAC y vencimiento de ocho horas. Este login es adecuado para la práctica, pero no pretende ser un sistema de identidad para varios usuarios.

## Datos de Google Sheets

1. En Google Cloud, crea un proyecto, habilita **Google Sheets API** y crea una **cuenta de servicio** con clave JSON.
2. Crea una hoja de cálculo. Renombra la pestaña a `Cursos`.
3. Escribe en la primera fila, exactamente y en este orden: `ID | Nombre | Categoría | Instructor | Duración | Estado | Descripción | Fecha`.
4. Comparte la hoja con el correo `client_email` de la cuenta de servicio, con permiso **Editor**.
5. Copia el ID de la hoja desde la URL: `https://docs.google.com/spreadsheets/d/ESTE_ID/edit`.

No subas la clave JSON ni contraseñas a GitHub. Una cuenta de servicio con acceso Editor a esta hoja es suficiente.

## Variables de entorno de Netlify

En **Site configuration → Environment variables**, configura:

| Variable | Valor |
| --- | --- |
| `GOOGLE_SHEET_ID` | ID de la hoja |
| `GOOGLE_SHEET_TAB` | `Cursos` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Contenido completo de la clave JSON de la cuenta de servicio, en una sola línea |
| `LOGIN_USER` | Usuario del login |
| `LOGIN_PASSWORD` | Contraseña privada |
| `SESSION_SECRET` | Cadena aleatoria larga, de al menos 32 caracteres |

Consulta `.env.example` solo como referencia; sus valores son de muestra.

## Despliegue en Netlify

1. Conecta este repositorio de GitHub con un sitio de Netlify, o cambia el repositorio del sitio que ya tienes.
2. Selecciona la **raíz del repositorio** como directorio base, sin establecer una subcarpeta. Netlify leerá `netlify.toml`: comando `npm run build`, publicación `frontend/dist` y funciones en `netlify/functions`.
3. Agrega las seis variables de entorno indicadas arriba y vuelve a desplegar.
4. Abre la URL pública. Prueba login correcto e incorrecto; crea, consulta, edita y elimina un curso; confirma el cambio en Google Sheets.

Si la interfaz carga pero el login responde con error 500, revisa `LOGIN_USER`, `LOGIN_PASSWORD` y `SESSION_SECRET`. Si entra pero la lista falla, revisa el ID de la hoja, el nombre de la pestaña, la cuenta de servicio y los encabezados.

## Desarrollo local

Requiere Node.js 20 o superior y Netlify CLI.

```bash
npm install
npm --prefix frontend install
cp .env.example .env
# Reemplaza los valores de .env con credenciales reales; jamás lo subas.
npx netlify dev
```

Abre la URL que indique Netlify CLI. El servidor de Vite solo no ejecuta las funciones de Netlify.

## API REST

Todas las rutas de cursos requieren `Authorization: Bearer <token>`.

| Método | Ruta | Acción |
| --- | --- | --- |
| POST | `/api/login` | Validar usuario y contraseña; obtener token |
| GET | `/api/cursos` | Consultar cursos |
| POST | `/api/cursos` | Crear curso |
| PUT | `/api/cursos/:id` | Actualizar curso |
| DELETE | `/api/cursos/:id` | Eliminar curso |

Ejemplo de curso: `{"nombre":"Fundamentos de React","categoria":"Programación","instructor":"Ana Ruiz","duracion":24,"estado":"Publicado","descripcion":"Curso inicial"}`.

## Verificación y evidencias

Ejecuta `npm test` y `npm run build`. Para el PDF de Moodle captura: repositorio, estructura, Netlify, login correcto e incorrecto, tabla, creación, consulta, edición, eliminación, búsqueda o filtro, respuesta de la API y la hoja de Google Sheets antes y después de un cambio. Incluye las URL públicas del sitio y del repositorio.

## Estructura

```text
frontend/             Interfaz React
backend/courses.js    Lectura y escritura en Google Sheets
backend/auth.js       Login y sesión
netlify/functions/    Rutas de la API
netlify.toml          Compilación y redirecciones
```

