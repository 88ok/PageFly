const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

// 生成短随机 ID（URL 安全）。crypto 在 Workers 与 Node 18+ 均为全局可用。
export function generateId(len = 8) {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[buf[i] % ALPHABET.length];
  return s;
}

// 从 HTML 源码中提取 <title> 文本
export function extractTitle(html) {
  const m = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return "";
  return m[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/[\s\r\n]+/g, " ")
    .trim();
}

// 把一页 HTML 存入 KV。key=短ID，value=JSON{html, title, createdAt}
export async function savePage(env, html, title = "") {
  const id = generateId();
  const payload = {
    html,
    title: title?.trim?.() || extractTitle(html) || "未命名页面",
    createdAt: Date.now(),
  };
  await env.PAGEDROP_KV.put(id, JSON.stringify(payload));
  return id;
}
