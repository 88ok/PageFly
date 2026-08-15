import { removePage } from "../../src/remove.js";

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
  let contact = "";
  let link = "";
  try {
    if (contentType.includes("application/json")) {
      const data = await request.json();
      contact = data?.contact ?? "";
      link = data?.link ?? "";
    } else {
      const form = await request.formData();
      contact = form.get("contact") ?? "";
      link = form.get("link") ?? "";
    }
  } catch (e) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  contact = String(contact || "").trim();
  link = String(link || "").trim();
  if (!contact || !link) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }

  const r = await removePage(env, { contact, link });
  if (!r.ok) {
    const status = r.error === "not_found" ? 404 : 400;
    return Response.json({ error: r.error }, { status });
  }
  return Response.json({ ok: true });
}
