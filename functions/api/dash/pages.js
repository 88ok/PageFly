import { isAuthed, authError } from "../../../src/auth.js";

export async function onRequestGet({ request, env }) {
  if (!env.PAGEDROP_KV) {
    return Response.json({ error: "kv_not_bound", message: "PAGEDROP_KV 未绑定" }, { status: 500 });
  }
  if (!(await isAuthed(request, env))) return authError();

  const items = [];
  let cursor;
  // 遍历 KV 所有 key（每页最多 1000），逐条读取元数据用于列表展示
  do {
    const opts = { limit: 1000 };
    if (cursor) opts.cursor = cursor;
    const res = await env.PAGEDROP_KV.list(opts);
    for (const k of res.keys) {
      try {
        const val = await env.PAGEDROP_KV.get(k.name, { type: "json" });
        if (val) {
          items.push({
            id: k.name,
            type: val.type || "md",
            title: val.title || "未命名页面",
            createdAt: val.createdAt || 0,
            updatedAt: val.updatedAt || 0,
          });
        }
      } catch {
        // 单条损坏不影响其它
      }
    }
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);

  // 按创建时间倒序（最新在前）
  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return Response.json({ pages: items });
}
