import { isAuthed, authError } from "../../../src/auth.js";
import { detectType, extractTitle } from "../../../src/upload.js";

const ID_RE = /^[a-z0-9]{1,64}$/;

export async function onRequestPost({ request, env }) {
  if (!env.PAGEDROP_KV) {
    return Response.json({ error: "kv_not_bound", message: "PAGEDROP_KV 未绑定" }, { status: 500 });
  }
  if (!(await isAuthed(request, env))) return authError();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const id = String(body?.id || "");
  const content = String(body?.content ?? "");
  const newId = body?.newId != null ? String(body.newId).trim() : "";
  const type = body?.type === "html" ? "html" : body?.type === "md" ? "md" : undefined;

  if (!ID_RE.test(id)) return Response.json({ error: "invalid_id" }, { status: 400 });
  if (!content.trim()) return Response.json({ error: "empty_content" }, { status: 400 });

  const existing = await env.PAGEDROP_KV.get(id, { type: "json" });
  if (!existing) return Response.json({ error: "not_found" }, { status: 404 });

  const detected = type === "html" || type === "md" ? type : detectType(content);
  const payload = {
    type: detected,
    raw: content,
    title: extractTitle(content, detected) || existing.title || "未命名页面",
    createdAt: existing.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  // 修改 id：写新 key + 删旧 key（需保证新 id 未被占用，避免覆盖）
  if (newId && newId !== id) {
    if (!ID_RE.test(newId)) return Response.json({ error: "invalid_new_id" }, { status: 400 });
    const clash = await env.PAGEDROP_KV.get(newId);
    if (clash) return Response.json({ error: "id_exists", message: "该新 ID 已存在" }, { status: 409 });
    await env.PAGEDROP_KV.put(newId, JSON.stringify(payload));
    await env.PAGEDROP_KV.delete(id);
    return Response.json({ ok: true, id: newId, url: `${new URL(request.url).origin}/v/${newId}` });
  }

  await env.PAGEDROP_KV.put(id, JSON.stringify(payload));
  return Response.json({ ok: true, id, url: `${new URL(request.url).origin}/v/${id}` });
}
