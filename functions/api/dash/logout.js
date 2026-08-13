import { expireAuthCookie } from "../../../src/auth.js";

export async function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json", "Set-Cookie": expireAuthCookie() },
  });
}
