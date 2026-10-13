const test = require("node:test");
const assert = require("node:assert/strict");
const { createCoursesService, HEADERS, validateCourse } = require("./courses");
const { login, verifyToken } = require("./auth");
const app = require("./server");

function fakeSheets() {
  const rows = [HEADERS];
  const operations = [];
  const sheets = { spreadsheets: {
    values: {
      get: async () => ({ data: { values: rows.map((row) => [...row]) } }),
      append: async ({ requestBody }) => { rows.push(requestBody.values[0]); operations.push("append"); },
      update: async ({ range, requestBody }) => { const number = Number(range.match(/A(\d+):/)[1]); rows[number - 1] = requestBody.values[0]; operations.push("update"); },
    },
    get: async () => ({ data: { sheets: [{ properties: { title: "Cursos", sheetId: 17 } }] } }),
    batchUpdate: async ({ requestBody }) => { const index = requestBody.requests[0].deleteDimension.range.startIndex; rows.splice(index, 1); operations.push("delete"); },
  } };
  return { rows, operations, sheets };
}

test("crear, consultar, actualizar y eliminar modifica la hoja", async () => {
  const fake = fakeSheets();
  const service = createCoursesService(fake.sheets, "test-sheet");
  const input = { nombre: "React inicial", categoria: "Programación", instructor: "Ana Ruiz", duracion: 24, estado: "Publicado", descripcion: "Curso práctico" };
  const created = await service.create(input);
  assert.equal(fake.rows[1][0], created.id);
  assert.equal((await service.list())[0].nombre, "React inicial");
  const updated = await service.update(created.id, { ...input, nombre: "React avanzado" });
  assert.equal(updated.nombre, "React avanzado");
  assert.equal(fake.rows[1][1], "React avanzado");
  assert.equal(await service.remove(created.id), true);
  assert.deepEqual(await service.list(), []);
  assert.deepEqual(fake.operations, ["append", "update", "delete"]);
});

test("valida datos y rechaza IDs inexistentes", async () => {
  assert.throws(() => validateCourse({ nombre: "X", categoria: "Programación", instructor: "Ana Ruiz", duracion: 0, estado: "Publicado" }), /nombre/);
  const service = createCoursesService(fakeSheets().sheets, "test-sheet");
  assert.equal(await service.update("missing", { nombre: "Curso válido", categoria: "Programación", instructor: "Ana Ruiz", duracion: 10, estado: "Publicado" }), null);
  assert.equal(await service.remove("missing"), false);
});

test("el login verifica credenciales y firma de sesión", () => {
  const env = { LOGIN_USER: "admin", LOGIN_PASSWORD: "clave-privada", SESSION_SECRET: "secreto-de-prueba" };
  assert.equal(login("admin", "incorrecta", env), null);
  const token = login("admin", "clave-privada", env);
  assert.equal(verifyToken(token, env), true);
  assert.equal(verifyToken(token + "x", env), false);
});

test("la API rechaza acceso anónimo y credenciales incorrectas", async () => {
  const previous = {
    LOGIN_USER: process.env.LOGIN_USER,
    LOGIN_PASSWORD: process.env.LOGIN_PASSWORD,
    SESSION_SECRET: process.env.SESSION_SECRET,
  };
  process.env.LOGIN_USER = "admin";
  process.env.LOGIN_PASSWORD = "clave-privada";
  process.env.SESSION_SECRET = "secreto-de-prueba";
  const server = app.listen(0);
  try {
    const base = "http://127.0.0.1:" + server.address().port;
    const denied = await fetch(base + "/api/cursos");
    assert.equal(denied.status, 401);
    const incorrect = await fetch(base + "/api/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: "admin", contrasena: "equivocada" }),
    });
    assert.equal(incorrect.status, 401);
    const correct = await fetch(base + "/api/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: "admin", contrasena: "clave-privada" }),
    });
    assert.equal(correct.status, 200);
    assert.ok((await correct.json()).token);
  } finally {
    server.close();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
