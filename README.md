# Aula Cloud — Sistema de cursos

Aplicación de Cloud Computing con React, API REST en Node.js y Google Sheets. Incluye login, CRUD real de cursos, búsqueda, filtro, contadores y validación.

## Arquitectura

Usuario → React en Netlify → HTTP/Fetch → API Express en Render → Google Sheets API → pestaña `Cursos`.

El repositorio conserva la estructura `frontend/` y `backend/` que ya usaban los dos servicios. La hoja existente tiene una pestaña nueva `Cursos` con encabezados `ID | Nombre | Categoría | Instructor | Duración | Estado | Descripción | Fecha` y tres cursos de ejemplo. La pestaña de productos original sigue intacta.

## Configuración de Render (API)

En el servicio `mi-primer-servicio-cloud-api`:

- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **GOOGLE_SHEET_ID:** conserva el valor actual que ya usa la API de productos.
- **GOOGLE_SERVICE_ACCOUNT_JSON:** conserva el JSON privado actual que ya funciona en Render. Si usas `GOOGLE_APPLICATION_CREDENTIALS` con un archivo privado, consérvalo fuera de GitHub.
- **GOOGLE_SHEET_TAB:** `Cursos` (opcional; este es el valor por defecto).
- **LOGIN_USER:** el usuario que elijas, por ejemplo `admin`.
- **LOGIN_PASSWORD:** una contraseña privada elegida por ti.
- **SESSION_SECRET:** una cadena aleatoria privada de al menos 32 caracteres.

Las variables del login deben configurarse en Render, no en React. No subas el JSON, la contraseña ni el secreto de sesión a GitHub. Después de agregar las variables, vuelve a desplegar Render.

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

`POST /api/login` recibe `{"usuario":"...","contrasena":"..."}` y devuelve un token con firma HMAC y vencimiento de ocho horas. Las rutas de cursos requieren `Authorization: Bearer <token>`.

| Método | Ruta | Acción |
| --- | --- | --- |
| GET | `/api/estado` | Consultar estado de API |
| GET | `/api/cursos` | Consultar cursos |
| POST | `/api/cursos` | Crear curso |
| PUT | `/api/cursos/:id` | Actualizar curso |
| DELETE | `/api/cursos/:id` | Eliminar curso |

Ejemplo de curso: `{"nombre":"Fundamentos de React","categoria":"Programación","instructor":"Ana Ruiz","duracion":24,"estado":"Publicado","descripcion":"Curso inicial"}`.

## Verificación y evidencias

Ejecuta `npm test`, `npm --prefix frontend run lint` y `npm --prefix frontend run build`. Para el PDF de Moodle captura el repositorio, estructura, despliegues, login correcto e incorrecto, tabla, creación, consulta, edición, eliminación, búsqueda o filtro, API y la pestaña `Cursos` de Google Sheets antes y después de un cambio. Incluye la URL de Netlify y la del repositorio.

## Archivos principales

```text
frontend/src/App.jsx  Interfaz React
backend/server.js      API REST Express para Render
backend/courses.js     Lectura y escritura en Google Sheets
backend/auth.js        Login y token de sesión
netlify.toml           Compilación del frontend en Netlify
```

