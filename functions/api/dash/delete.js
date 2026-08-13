import { isAuthed, authError } from "../../../src/auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.PAGEDROP_KV) {
    return Response.json({ error: "kv_not_bound", message: "PAGEDROP_KV 未绑定" }, { status: 500 });
  }
  if (!(await isAuthed(request, env))) return authError();

  let id = "";
  try {
    const data = await request.json();
    id = String(data?.id || "");
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!/^[a-z0-9]{1,64}$/.test(id)) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }

  await env.PAGEDROP_KV.delete(id);
  return Response.json({ ok: true });
}
