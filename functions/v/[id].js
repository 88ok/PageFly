import { renderViewPage } from "../../src/render.js";

export async function onRequestGet({ params, env, request }) {
  if (!env.PAGEDROP_KV) {
    return new Response(
      "PAGEDROP_KV 未绑定：请在 Pages 控制台 Settings → Functions → KV namespace bindings 添加 PAGEDROP_KV 指向你的 KV 命名空间",
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

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return new Response("数据损坏", { status: 500 });
  }

  const { type = "html", raw: content = "", title = "" } = parsed;

  const url = new URL(request.url);
  // ?raw=1 → 直接返回源码（md 返回 text/markdown，html 返回 text/html，可下载/查看）
  if (url.searchParams.get("raw") !== null) {
    const ct =
      type === "md"
        ? "text/markdown; charset=utf-8"
        : "text/html; charset=utf-8";
    return new Response(content, { headers: { "content-type": ct } });
  }

  const selfUrl = `${url.origin}/v/${id}`;
  try {
    return new Response(renderViewPage({ id, selfUrl, type, raw: content, title }), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    return new Response(
      "<h1>页面渲染失败</h1><p>该内容可能包含无法解析的结构，请重新发布。</p>",
      { status: 500, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }
}
