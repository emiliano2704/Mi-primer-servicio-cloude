const test = require("node:test");
const assert = require("node:assert/strict");
const { answerQuestion, describeOpenAIError, validateQuestion } = require("./assistant");
const { login } = require("./auth");
const app = require("./server");

test("valida preguntas antes de consultar servicios externos", () => {
  assert.throws(() => validateQuestion("  "), /al menos 5/);
  assert.throws(() => validateQuestion("a".repeat(501)), /500 caracteres/);
  assert.equal(validateQuestion("  ¿Qué cursos hay?  "), "¿Qué cursos hay?");
});

test("envía a OpenAI los cursos leídos de Google Sheets y devuelve su texto", async () => {
  let request;
  const client = { responses: { create: async (value) => {
    request = value;
    return { output_text: "Ana Ruiz imparte Fundamentos de React." };
  } } };
  const result = await answerQuestion("¿Quién imparte React?", {
    listCourses: async () => [{ id: "1", nombre: "Fundamentos de React", categoria: "Programación", instructor: "Ana Ruiz", duracion: 24, estado: "Publicado", descripcion: "Curso inicial" }],
    client,
  });
  assert.equal(result.respuesta, "Ana Ruiz imparte Fundamentos de React.");
  assert.equal(result.cursosConsultados, 1);
  assert.match(request.input, /Fundamentos de React/);
  assert.match(request.input, /¿Quién imparte React\?/);
  assert.doesNotMatch(request.input, /"id"/);
  assert.equal(request.store, false);
  assert.ok(request.max_output_tokens <= 350);
});

test("no inventa una respuesta si el proveedor no devuelve texto", async () => {
  await assert.rejects(() => answerQuestion("¿Qué cursos hay?", {
    listCourses: async () => [],
    client: { responses: { create: async () => ({ output_text: "" }) } },
  }), /no devolvió una respuesta/);
});

test("distingue errores de clave, créditos, límites y frecuencia sin revelar secretos", () => {
  assert.match(describeOpenAIError({ status: 401, message: "Incorrect API key sk-private" }), /clave.*no es válida/i);
  assert.match(describeOpenAIError({ status: 429, code: "credit_balance_exhausted" }), /créditos disponibles/);
  assert.match(describeOpenAIError({ status: 429, error: { code: "project_spend_limit_exceeded" } }), /límite de uso o gasto/);
  assert.match(describeOpenAIError({ status: 429, code: "rate_limit_exceeded" }), /Espera un minuto/);
  assert.equal(describeOpenAIError({ status: 500 }), null);
  assert.doesNotMatch(describeOpenAIError({ status: 401, message: "Incorrect API key sk-private" }), /sk-private/);
});

test("la ruta del asistente exige login y muestra configuración pendiente sin clave", async () => {
  const previous = {
    LOGIN_USER: process.env.LOGIN_USER,
    LOGIN_PASSWORD: process.env.LOGIN_PASSWORD,
    SESSION_SECRET: process.env.SESSION_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };
  process.env.LOGIN_USER = "admin-test";
  process.env.LOGIN_PASSWORD = "password-test";
  process.env.SESSION_SECRET = "secret-for-test-only-123456789012345";
  delete process.env.OPENAI_API_KEY;
  const server = app.listen(0);
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/asistente`;
    const unauthorized = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pregunta: "¿Qué cursos hay?" }) });
    assert.equal(unauthorized.status, 401);
    const token = login("admin-test", "password-test");
    const pending = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ pregunta: "¿Qué cursos hay?" }) });
    assert.equal(pending.status, 503);
    assert.match((await pending.json()).mensaje, /clave de OpenAI/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
