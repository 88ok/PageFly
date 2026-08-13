const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

// 生成短随机 ID（URL 安全）。crypto 在 Workers 与 Node 18+ 均为全局可用。
export function generateId(len = 8) {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[buf[i] % ALPHABET.length];
  return s;
}

// 明显的 Markdown 语法特征（优先于 HTML 判断）
const MD_MARKERS = [
  /^\s*#{1,6}\s+\S/m,               // # 标题
  /\*\*[^\s*].*?\*\*/,              // **bold**
  /(^|\n)\s*>\s+\S/m,               // > quote
  /(^|\n)\s*-\s+\S/m,               // - list
  /(^|\n)\s*\*\s+\S/m,              // * list
  /(^|\n)\s*\d+\.\s+\S/m,           // 1. list
  /`[^`]+`/,                         // inline code
  /!\[.*?\]\(.*?\)/,                // image
  /\[.*?\]\(.*?\)/,                 // link
  /(^|\n)\s*```[\s\S]*?```/m,        // fenced code block
];

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

// 自动判断内容类型：
// - Markdown 特征优先（# 标题、**粗体**、列表、引用、代码、链接等）→ Markdown
// - 明确以 <!doctype html> / <html 开头 → HTML
// - 以 < 开头但不是注释/自动链接、且像是 HTML 标签（<div> <p> <body> 等）→ HTML
// - 默认按 Markdown 渲染（宁可当 Markdown，也不把 Markdown 误判成 HTML 原文）
export function detectType(content) {
  const s = String(content || "").trim();
  if (!s) return "md";
  for (const re of MD_MARKERS) {
    if (re.test(s)) return "md";
  }
  if (/^<!doctype\s+html/i.test(s)) return "html";
  if (/^<html\b/i.test(s)) return "html";
  // 以 < 开头，排除注释(<!--)与自动链接(<https:// <mailto:) 后仍是标签 → HTML
  if (/^<(?!!--|https?:|mailto:)[a-zA-Z/]/i.test(s)) return "html";
  return "md";
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
