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
  let type = "html";
  let title = "";
  try {
    if (contentType.includes("application/json")) {
      const data = await request.json();
      // 兼容旧字段 html
      content = data?.content ?? data?.html ?? "";
      type = data?.type === "md" ? "md" : "html";
      title = data?.title ?? "";
    } else {
      const form = await request.formData();
      content = form.get("content") ?? form.get("html") ?? "";
      type = form.get("type") === "md" ? "md" : "html";
      title = form.get("title") ?? "";
    }
  } catch (e) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  content = String(content || "");
  if (!content.trim()) {
    return Response.json({ error: "empty_content" }, { status: 400 });
  }

  const id = await savePage(env, { type, raw: content, title });
  const base = new URL(request.url).origin;
  return Response.json({ id, url: `${base}/v/${id}` });
}
