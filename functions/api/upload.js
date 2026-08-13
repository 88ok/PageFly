import { savePage } from "../../src/upload.js";

export async function onRequestPost({ request, env }) {
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
