# Aula Cloud — Cursos y Asistente Cloud con IA

Aplicación de Cloud Computing con React, API REST en Node.js, Google Sheets y OpenAI. Incluye login, CRUD real de cursos, búsqueda, filtro, contadores, validación y un asistente que responde preguntas usando los cursos de la hoja.

## Arquitectura

Usuario → React en Netlify → HTTP/Fetch → API Express en Render → Google Sheets API (pestaña `Cursos`) + OpenAI Responses API → respuesta en React.

El repositorio conserva la estructura `frontend/` y `backend/` que ya usaban los dos servicios. La hoja existente tiene una pestaña nueva `Cursos` con encabezados `ID | Nombre | Categoría | Instructor | Duración | Estado | Descripción | Fecha` y tres cursos de ejemplo. La pestaña de productos original sigue intacta.

## Configuración de Render (API)

En el servicio `mi-primer-servicio-cloud-api`:

- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **GOOGLE_SHEET_ID:** conserva el valor actual que ya usa la API de cursos.
- **GOOGLE_SERVICE_ACCOUNT_JSON:** conserva el JSON privado actual que ya funciona en Render. Si usas `GOOGLE_APPLICATION_CREDENTIALS` con un archivo privado, consérvalo fuera de GitHub.
- **GOOGLE_SHEET_TAB:** `Cursos` (opcional; este es el valor por defecto).
- **LOGIN_USER:** el usuario que elijas, por ejemplo `admin`.
- **LOGIN_PASSWORD:** una contraseña privada elegida por ti.
- **SESSION_SECRET:** una cadena aleatoria privada de al menos 32 caracteres.
- **OPENAI_API_KEY:** clave de API creada en OpenAI Platform; es necesaria para el asistente. La suscripción de ChatGPT Plus no incluye el consumo de esta API.
- **OPENAI_MODEL:** opcional; por defecto `gpt-4.1-mini`.

Las variables del login y OpenAI deben configurarse en Render, no en React. No subas el JSON, la contraseña, el secreto de sesión ni la clave de OpenAI a GitHub. Después de agregar `OPENAI_API_KEY`, usa **Save and deploy** en Render. No hace falta configurar la clave en Netlify.

## Configuración de Netlify (interfaz)

El sitio existente es `mi-primer-servicio-cloud-emiliano.netlify.app`. El archivo `netlify.toml` fija:

- **Base directory:** `frontend`
- **Build command:** `npm run build`
- **Publish directory:** `dist`

Netlify ya tiene `VITE_API_URL`; su valor debe ser `https://mi-primer-servicio-cloud-api.onrender.com`. La URL de la API es pública y no es una credencial. El frontend también utiliza esa URL como valor por defecto.

Cada cambio de GitHub en `main` inicia los despliegues de Render y Netlify. Comprueba el estado de ambos en sus paneles antes de probar la aplicación.

## Desarrollo local

Requiere Node.js 20 o superior.

```bash
npm --prefix backend install
npm --prefix frontend install
# Crea backend/.env a partir de backend/.env.example con tus valores privados.
npm --prefix backend start
npm --prefix frontend run dev
```

Para desarrollo local, puedes poner `VITE_API_URL=http://localhost:3000` en `frontend/.env.local`. Ambos archivos `.env` están excluidos de Git.

## API REST

`POST /api/login` recibe `{"usuario":"...","contrasena":"..."}` y devuelve un token con firma HMAC y vencimiento de ocho horas. Las rutas de cursos y del asistente requieren `Authorization: Bearer <token>`.

| Método | Ruta | Acción |
| --- | --- | --- |
| GET | `/api/estado` | Consultar estado de API |
| GET | `/api/cursos` | Consultar cursos |
| POST | `/api/cursos` | Crear curso |
| PUT | `/api/cursos/:id` | Actualizar curso |
| DELETE | `/api/cursos/:id` | Eliminar curso |
| POST | `/api/asistente` | Responder una pregunta usando Google Sheets y OpenAI |

Ejemplo de curso: `{"nombre":"Fundamentos de React","categoria":"Programación","instructor":"Ana Ruiz","duracion":24,"estado":"Publicado","descripcion":"Curso inicial"}`.

El asistente recibe `{"pregunta":"¿Qué cursos de programación hay?"}` y devuelve `{"respuesta":"...","fuente":"Google Sheets · Cursos","cursosConsultados":3}`. Lee la hoja en cada consulta, envía al modelo únicamente los campos públicos de hasta 100 cursos, y limita las respuestas a 350 tokens. Rechaza preguntas vacías o mayores de 500 caracteres y aplica un límite de ocho consultas por minuto. Si falta la clave, devuelve HTTP 503 con una instrucción de configuración; nunca inventa una respuesta local.

## Verificación y evidencias

Ejecuta `npm test`, `npm --prefix frontend run lint` y `npm --prefix frontend run build`. Para la actividad del asistente, captura la interfaz, una pregunta, la respuesta generada, la pestaña `Cursos` de Google Sheets, la API funcionando, el repositorio y el sitio público de Netlify. No muestres claves o contraseñas en las capturas.

## Archivos principales

```text
frontend/src/App.jsx  Interfaz React
frontend/src/Assistant.jsx  Vista de preguntas y respuestas
backend/server.js      API REST Express para Render
backend/assistant.js   Integración de Google Sheets con OpenAI
backend/courses.js     Lectura y escritura en Google Sheets
backend/auth.js        Login y token de sesión
netlify.toml           Compilación del frontend en Netlify
```

