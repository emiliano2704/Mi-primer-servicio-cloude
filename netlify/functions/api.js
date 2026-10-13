const { google } = require("googleapis");
const { createCoursesService } = require("../../backend/courses");
const { login, verifyToken } = require("../../backend/auth");

function json(statusCode, data) {
  return { statusCode, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, body: JSON.stringify(data) };
}

function bodyOf(event) {
  try { return JSON.parse(event.body || "{}"); }
  catch { throw Object.assign(new Error("El contenido enviado no es JSON válido."), { status: 400 }); }
}

function getService() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error("Falta GOOGLE_SERVICE_ACCOUNT_JSON.");
  let credentials;
  try { credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON); }
  catch { throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON no contiene JSON válido."); }
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  return createCoursesService(google.sheets({ version: "v4", auth }), process.env.GOOGLE_SHEET_ID, process.env.GOOGLE_SHEET_TAB || "Cursos");
}

exports.handler = async (event) => {
  const method = event.httpMethod || "GET";
  const path = (event.path || "").replace(/^.*?(?:\/api\/|\/functions\/api\/)/, "").split("/").filter(Boolean);
  if (method === "OPTIONS") return { statusCode: 204, headers: { Allow: "GET, POST, PUT, DELETE, OPTIONS" }, body: "" };
  try {
    if (path[0] === "login" && method === "POST") {
      const body = bodyOf(event);
      const token = login(body.usuario, body.contrasena);
      return token ? json(200, { token }) : json(401, { mensaje: "Usuario o contraseña incorrectos." });
    }
    if (path[0] !== "cursos" || path.length > 2) return json(404, { mensaje: "Ruta no encontrada." });
    const token = (event.headers?.authorization || event.headers?.Authorization || "").replace(/^Bearer\s+/i, "");
    if (!verifyToken(token)) return json(401, { mensaje: "Inicia sesión para continuar." });
    const service = getService();
    if (method === "GET" && path.length === 1) return json(200, await service.list());
    if (method === "POST" && path.length === 1) return json(201, await service.create(bodyOf(event)));
    if (method === "PUT" && path.length === 2) {
      const course = await service.update(decodeURIComponent(path[1]), bodyOf(event));
      return course ? json(200, course) : json(404, { mensaje: "No se encontró el curso." });
    }
    if (method === "DELETE" && path.length === 2) {
      const removed = await service.remove(decodeURIComponent(path[1]));
      return removed ? json(200, { mensaje: "Curso eliminado." }) : json(404, { mensaje: "No se encontró el curso." });
    }
    return json(405, { mensaje: "Método no permitido." });
  } catch (error) {
    if (error.status === 400) return json(400, { mensaje: error.message });
    if (error.message.startsWith("El ") || error.message.startsWith("Selecciona ") || error.message.startsWith("La duración")) return json(400, { mensaje: error.message });
    console.error("Error de API:", error);
    return json(500, { mensaje: "No se pudo completar la operación. Revisa la configuración de Google Sheets." });
  }
};
