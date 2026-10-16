const test = require("node:test");
const assert = require("node:assert/strict");
const { answerQuestion, createGroqClient, describeGroqError, validateQuestion } = require("./assistant");
const { login } = require("./auth");
const app = require("./server");

test("valida preguntas antes de consultar servicios externos", () => {
  assert.throws(() => validateQuestion("  "), /al menos 5/);
  assert.throws(() => validateQuestion("a".repeat(501)), /500 caracteres/);
  assert.equal(validateQuestion("  ¿Qué cursos hay?  "), "¿Qué cursos hay?");
});

test("envía a Qwen los cursos leídos de Google Sheets y devuelve su texto", async () => {
  let request;
  const client = { chat: { completions: { create: async (value) => {
    request = value;
    return { choices: [{ message: { content: "Ana Ruiz imparte Fundamentos de React." } }] };
  } } } };
  const result = await answerQuestion("¿Quién imparte React?", {
    listCourses: async () => [{ id: "1", nombre: "Fundamentos de React", categoria: "Programación", instructor: "Ana Ruiz", duracion: 24, estado: "Publicado", descripcion: "Curso inicial" }],
    client,
  });
  assert.equal(result.respuesta, "Ana Ruiz imparte Fundamentos de React.");
  assert.equal(result.cursosConsultados, 1);
  assert.equal(request.model, "qwen/qwen3.8-27b");
  assert.match(request.messages[1].content, /Fundamentos de React/);
  assert.match(request.messages[1].content, /¿Quién imparte React\?/);
  assert.doesNotMatch(request.messages[1].content, /"id"/);
  assert.equal(request.reasoning_effort, "none");
  assert.ok(request.max_completion_tokens <= 350);
});

test("no inventa una respuesta si el proveedor no devuelve texto", async () => {
  await assert.rejects(() => answerQuestion("¿Qué cursos hay?", {
    listCourses: async () => [],
    client: { chat: { completions: { create: async () => ({ choices: [{ message: { content: "" } }] }) } } },
  }), /no devolvió una respuesta/);
});

test("configura Groq y distingue errores sin revelar secretos", () => {
  const client = createGroqClient("  key-test  ");
  assert.equal(client.baseURL, "https://api.groq.com/openai/v1");
  assert.equal(client.apiKey, "key-test");
  assert.equal(createGroqClient("  "), null);
  assert.match(describeGroqError({ status: 401, message: "Invalid key private-value" }), /clave de Groq no es válida/);
  assert.match(describeGroqError({ status: 429 }), /límite gratuito/);
  assert.equal(describeGroqError({ status: 500 }), null);
  assert.doesNotMatch(describeGroqError({ status: 401, message: "Invalid key private-value" }), /private-value/);
});

test("la ruta del asistente exige login y muestra configuración pendiente sin clave", async () => {
  const previous = {
    LOGIN_USER: process.env.LOGIN_USER,
    LOGIN_PASSWORD: process.env.LOGIN_PASSWORD,
    SESSION_SECRET: process.env.SESSION_SECRET,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
  };
  process.env.LOGIN_USER = "admin-test";
  process.env.LOGIN_PASSWORD = "password-test";
  process.env.SESSION_SECRET = "secret-for-test-only-123456789012345";
  delete process.env.GROQ_API_KEY;
  const server = app.listen(0);
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/asistente`;
    const unauthorized = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pregunta: "¿Qué cursos hay?" }) });
    assert.equal(unauthorized.status, 401);
    const token = login("admin-test", "password-test");
    const pending = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ pregunta: "¿Qué cursos hay?" }) });
    assert.equal(pending.status, 503);
    assert.match((await pending.json()).mensaje, /GROQ_API_KEY/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
