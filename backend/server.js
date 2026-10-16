require("dotenv").config();

const path = require("node:path");
const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const { createCoursesService } = require("./courses");
const { login, verifyToken } = require("./auth");
const { answerQuestion, createGroqClient, describeGroqError, validateQuestion } = require("./assistant");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50kb" }));

function service() {
  const config = { scopes: ["https://www.googleapis.com/auth/spreadsheets"] };
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    config.credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    config.keyFile = path.resolve(__dirname, process.env.GOOGLE_APPLICATION_CREDENTIALS);
  } else {
    throw new Error("Falta la cuenta de servicio de Google.");
  }
  const auth = new google.auth.GoogleAuth(config);
  return createCoursesService(google.sheets({ version: "v4", auth }), process.env.GOOGLE_SHEET_ID, process.env.GOOGLE_SHEET_TAB || "Cursos");
}

function fail(error, response) {
  if (error instanceof SyntaxError) return response.status(400).json({ mensaje: "El contenido enviado no es JSON válido." });
  if (error.message.startsWith("El ") || error.message.startsWith("Selecciona ") || error.message.startsWith("La duración")) {
    return response.status(400).json({ mensaje: error.message });
  }
  console.error("Error de API:", error);
  return response.status(500).json({ mensaje: "No se pudo completar la operación. Revisa la configuración del servidor." });
}

function requireSession(request, response, next) {
  const token = (request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!verifyToken(token)) return response.status(401).json({ mensaje: "Inicia sesión para continuar." });
  next();
}

app.get("/", (_request, response) => response.json({ mensaje: "API de Aula Cloud", estado: "Online" }));
app.get("/api/estado", (_request, response) => response.json({ estado: "Online", servicio: "Cursos y Asistente IA", almacenamiento: "Google Sheets" }));

app.post("/api/login", (request, response) => {
  try {
    const token = login(request.body?.usuario, request.body?.contrasena);
    return token ? response.json({ token }) : response.status(401).json({ mensaje: "Usuario o contraseña incorrectos." });
  } catch (error) { return fail(error, response); }
});

app.get("/api/cursos", requireSession, async (_request, response) => {
  try { return response.json(await service().list()); }
  catch (error) { return fail(error, response); }
});

app.post("/api/cursos", requireSession, async (request, response) => {
  try { return response.status(201).json(await service().create(request.body)); }
  catch (error) { return fail(error, response); }
});

app.put("/api/cursos/:id", requireSession, async (request, response) => {
  try {
    const course = await service().update(request.params.id, request.body);
    return course ? response.json(course) : response.status(404).json({ mensaje: "No se encontró el curso." });
  } catch (error) { return fail(error, response); }
});

app.delete("/api/cursos/:id", requireSession, async (request, response) => {
  try {
    const removed = await service().remove(request.params.id);
    return removed ? response.json({ mensaje: "Curso eliminado." }) : response.status(404).json({ mensaje: "No se encontró el curso." });
  } catch (error) { return fail(error, response); }
});

const assistantRequests = new Map();
app.post("/api/asistente", requireSession, async (request, response) => {
  try {
    const question = validateQuestion(request.body?.pregunta);
    const client = createGroqClient();
    if (!client) return response.status(503).json({ mensaje: "El asistente necesita GROQ_API_KEY en las variables de entorno de Render." });

    const now = Date.now();
    const key = request.ip;
    const recent = (assistantRequests.get(key) || []).filter((time) => now - time < 60000);
    if (recent.length >= 8) return response.status(429).json({ mensaje: "Espera un minuto antes de hacer más consultas." });
    recent.push(now);
    assistantRequests.set(key, recent);
    if (assistantRequests.size > 1000) {
      for (const [address, times] of assistantRequests) {
        if (times.every((time) => now - time >= 60000)) assistantRequests.delete(address);
      }
    }

    return response.json(await answerQuestion(question, { listCourses: () => service().list(), client }));
  } catch (error) {
    if (/^(Escribe una pregunta|La pregunta|El catálogo supera)/.test(error.message)) {
      return response.status(400).json({ mensaje: error.message });
    }
    const groqMessage = describeGroqError(error);
    if (groqMessage) {
      console.error("Error de Groq:", { status: error.status, code: error.code || error.error?.code || error.type || error.error?.type || "desconocido" });
      return response.status(503).json({ mensaje: groqMessage });
    }
    console.error("Error del asistente:", error.name, error.status || "", error.message);
    return response.status(503).json({ mensaje: "No se pudo generar la respuesta. Intenta nuevamente en unos momentos." });
  }
});

if (require.main === module) {
  app.listen(process.env.PORT || 3000, "0.0.0.0", () => console.log("API de Aula Cloud iniciada."));
}

module.exports = app;
