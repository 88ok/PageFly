import { renderViewPage } from "../../src/render.js";

export async function onRequestGet({ params, env, request }) {
  const id = params.id;
  const raw = await env.PAGEDROP_KV.get(id);
  if (!raw) {
    return new Response("页面不存在或已过期 (404)", {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  let html;
  try {
    html = JSON.parse(raw).html;
  } catch (e) {
    return new Response("数据损坏", { status: 500 });
  }

  const url = new URL(request.url);
  // ?raw=1 → 直接返回源码（可下载/查看）
  if (url.searchParams.get("raw") !== null) {
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const selfUrl = `${url.origin}/v/${id}`;
  return new Response(renderViewPage({ id, selfUrl, html }), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
