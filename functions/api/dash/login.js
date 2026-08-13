import { sessionToken, buildAuthCookie, passwordNotConfiguredError } from "../../../src/auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.PASSWORD) return passwordNotConfiguredError();

  let password = "";
  try {
    const data = await request.json();
    password = String(data?.password || "");
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  if (password !== env.PASSWORD) {
    return Response.json({ error: "wrong_password", message: "密码错误" }, { status: 401 });
  }

  const token = await sessionToken(password);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json", "Set-Cookie": buildAuthCookie(token) },
  });
}
