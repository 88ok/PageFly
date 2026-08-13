const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

// 生成短随机 ID（URL 安全）。crypto 在 Workers 与 Node 18+ 均为全局可用。
export function generateId(len = 8) {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[buf[i] % ALPHABET.length];
  return s;
}

// 把一页 HTML 存入 KV。key=短ID，value=JSON{html, createdAt}
export async function savePage(env, html) {
  const id = generateId();
  await env.PAGEDROP_KV.put(id, JSON.stringify({ html, createdAt: Date.now() }));
  return id;
}
