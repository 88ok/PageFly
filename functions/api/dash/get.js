import { isAuthed, authError } from "../../../src/auth.js";

export async function onRequestGet({ request, env }) {
  if (!env.PAGEDROP_KV) {
    return Response.json({ error: "kv_not_bound", message: "PAGEDROP_KV 未绑定" }, { status: 500 });
  }
  if (!(await isAuthed(request, env))) return authError();

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[a-z0-9]{1,64}$/.test(id)) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }
  const val = await env.PAGEDROP_KV.get(id, { type: "json" });
  if (!val) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ page: { id, ...val } });
}
