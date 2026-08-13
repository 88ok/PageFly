import { renderViewPage } from "../../src/render.js";

export async function onRequestGet({ params, env, request }) {
  // KV 未绑定时的明确报错
  if (!env.PAGEDROP_KV) {
    return new Response(
      "PAGEDROP_KV 未绑定：请在 Cloudflare Pages 控制台 → Settings → Functions → KV namespace bindings 添加变量名 PAGEDROP_KV，并指向你的 KV 命名空间。",
      { status: 500, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

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
