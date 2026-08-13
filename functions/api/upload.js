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
  let html;
  let title = "";
  try {
    if (contentType.includes("application/json")) {
      const data = await request.json();
      html = data?.html ?? "";
      title = data?.title ?? "";
    } else {
      const form = await request.formData();
      html = form.get("html") ?? "";
      title = form.get("title") ?? "";
    }
  } catch (e) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  html = String(html || "");
  if (!html.trim()) {
    return Response.json({ error: "empty_html" }, { status: 400 });
  }

  const id = await savePage(env, html, title);
  const base = new URL(request.url).origin;
  return Response.json({ id, url: `${base}/v/${id}` });
}
