const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

// 生成短随机 ID（URL 安全）。crypto 在 Workers 与 Node 18+ 均为全局可用。
export function generateId(len = 8) {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[buf[i] % ALPHABET.length];
  return s;
}

// 从原文中提取标题：md 取首行 # 标题，html 取 <title>
export function extractTitle(raw, type) {
  const text = String(raw || "");
  if (type === "md") {
    const m = text.match(/^\s*#\s+(.+?)\s*$/m);
    return m ? m[1].trim() : "";
  }
  const m = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return "";
  return m[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/[\s\r\n]+/g, " ")
    .trim();
}

// 自动判断内容类型：以 < 标签 / <!doctype html> 开头视为 HTML，其余按 Markdown 渲染。
export function detectType(content) {
  const s = String(content || "").trim();
  if (!s) return "md";
  if (/^<!doctype\s+html/i.test(s)) return "html";
  if (/^<[a-z!]/i.test(s)) return "html"; // 以标签开头 → 视为 HTML 片段/文档
  return "md"; // 普通文本 / Markdown（沙箱更隔离，无脚本执行）
}

// 把一页内容存入 KV。key=短ID，value=JSON{type, raw, title, createdAt}
// type 可显式传入（html|md），缺省时按内容自动判断。
export async function savePage(env, { type, raw = "", title = "" }) {
  const id = generateId();
  const detected = type === "html" || type === "md" ? type : detectType(raw);
  const payload = {
    type: detected,
    raw,
    title: title?.trim?.() || extractTitle(raw, detected) || "未命名页面",
    createdAt: Date.now(),
  };
  await env.PAGEDROP_KV.put(id, JSON.stringify(payload));
  return id;
}
