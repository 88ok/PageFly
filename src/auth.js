// 管理后台鉴权：仅用 PASSWORD 环境变量（无用户名）。
// 会话以 httpOnly Cookie 持有「密码的 SHA-256 摘要」，服务端每次请求重算比对，
// 不把明文密码放进 Cookie，也不依赖额外密钥/数据库。

const COOKIE = "dash_auth";
const SALT = "pagefly-dash-session-v1";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 天

// 把字符串用 Web Crypto 算成十六进制 SHA-256（Workers 与 Node 18+ 均有 crypto.subtle）
async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 由密码派生会话令牌
export function sessionToken(password) {
  return sha256Hex(password + SALT);
}

// 组装 Set-Cookie 头的值（httpOnly，防 JS 读取；SameSite=Lax）
export function buildAuthCookie(token) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

// 让浏览器丢弃会话 Cookie（注销用）
export function expireAuthCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function parseCookies(req) {
  const h = req.headers.get("cookie") || "";
  const out = {};
  h.split(";").forEach((c) => {
    const i = c.indexOf("=");
    if (i < 0) return;
    const k = c.slice(0, i).trim();
    const v = c.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

// 请求是否已通过密码校验。env.PASSWORD 未配置时一律视为未授权。
export async function isAuthed(request, env) {
  if (!env.PASSWORD) return false;
  const token = parseCookies(request)[COOKIE];
  if (!token) return false;
  return token === (await sessionToken(env.PASSWORD));
}

export function authError(message = "未授权，请先输入管理密码") {
  return Response.json({ error: "unauthorized", message }, { status: 401 });
}

export function passwordNotConfiguredError() {
  return Response.json(
    {
      error: "password_not_configured",
      message:
        "服务端未配置 PASSWORD：请在 Cloudflare Pages 控制台 Settings → Environment variables 添加变量 PASSWORD（Production 环境）后重新部署。",
    },
    { status: 500 }
  );
}
