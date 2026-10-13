const { createHmac, timingSafeEqual } = require("node:crypto");

function signature(data, secret) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

function safeEqual(a, b) {
  const first = Buffer.from(String(a));
  const second = Buffer.from(String(b));
  return first.length === second.length && timingSafeEqual(first, second);
}

function login(user, password, env = process.env) {
  if (!env.LOGIN_USER || !env.LOGIN_PASSWORD || !env.SESSION_SECRET) throw new Error("Configura LOGIN_USER, LOGIN_PASSWORD y SESSION_SECRET.");
  if (!safeEqual(user, env.LOGIN_USER) || !safeEqual(password, env.LOGIN_PASSWORD)) return null;
  const payload = Buffer.from(JSON.stringify({ sub: user, exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60 })).toString("base64url");
  return `${payload}.${signature(payload, env.SESSION_SECRET)}`;
}

function verifyToken(token, env = process.env) {
  if (!env.SESSION_SECRET || typeof token !== "string") return false;
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra || !safeEqual(suppliedSignature, signature(payload, env.SESSION_SECRET))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.sub === env.LOGIN_USER && Number.isInteger(data.exp) && data.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

module.exports = { login, verifyToken };
