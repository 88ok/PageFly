import { savePage } from "../../src/upload.js";

export async function onRequestPost({ request, env }) {
  if (!env.PAGEDROP_KV) {
    return Response.json(
      {
        error: "kv_not_bound",
        hint: "请在 Cloudflare Pages 控制台的 Settings → Functions → KV namespace bindings 中添加变量名 PAGEDROP_KV",
      },
      { status: 500 }
    );
  }

  const contentType = request.headers.get("content-type") || "";
  let content = "";
  let type; // 缺省时由后端按内容自动判断（HTML / Markdown）
  let title = "";
  try {
    if (contentType.includes("application/json")) {
      const data = await request.json();
      // 兼容旧字段 html
      content = data?.content ?? data?.html ?? "";
      type = data?.type === "md" ? "md" : (data?.type === "html" ? "html" : undefined);
      title = data?.title ?? "";
    } else {
      const form = await request.formData();
      content = form.get("content") ?? form.get("html") ?? "";
      const t = form.get("type");
      type = t === "md" ? "md" : (t === "html" ? "html" : undefined);
      title = form.get("title") ?? "";
    }
  } catch (e) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  content = String(content || "");
  if (!content.trim()) {
    return Response.json({ error: "empty_content" }, { status: 400 });
  }

  let id;
  try {
    id = await savePage(env, { type, raw: content, title });
  } catch (e) {
    return Response.json(
      { error: "save_failed", hint: String(e?.message || e) },
      { status: 500 }
    );
  }
  const base = new URL(request.url).origin;
  return Response.json({ id, url: `${base}/v/${id}` });
}
