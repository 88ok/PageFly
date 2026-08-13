import { savePage } from "../../src/upload.js";

export async function onRequestPost({ request, env }) {
  // KV 未绑定时的明确报错（Pages 通过 git 部署时绑定需在控制台配置）
  if (!env.PAGEDROP_KV) {
    return Response.json(
      {
        error: "kv_not_bound",
        hint: "请在 Cloudflare Pages 控制台 → Settings → Functions → KV namespace bindings 添加绑定：变量名填 PAGEDROP_KV，指向你的 KV 命名空间。",
      },
      { status: 500 }
    );
  }

  const contentType = request.headers.get("content-type") || "";
  let html;
  try {
    if (contentType.includes("application/json")) {
      const data = await request.json();
      html = data?.html ?? "";
    } else {
      const form = await request.formData();
      html = form.get("html") ?? "";
    }
  } catch (e) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  html = String(html || "");
  if (!html.trim()) {
    return Response.json({ error: "empty_html" }, { status: 400 });
  }

  const id = await savePage(env, html);
  const base = new URL(request.url).origin;
  return Response.json({ id, url: `${base}/v/${id}` });
}
