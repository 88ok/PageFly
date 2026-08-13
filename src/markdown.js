// 轻量 Markdown → HTML 渲染器（零依赖，部署无需 npm install）。
// 覆盖常见语法：标题、粗体/斜体、行内/块级代码、引用、有序/无序列表、
// 链接、图片、分割线、段落。已做 HTML 转义与 URL 安全过滤（防 XSS）。

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 过滤危险协议（javascript:/vbscript:/data:text/html）
function safeUrl(url) {
  const u = String(url).trim();
  if (/^(javascript:|vbscript:|data:text\/html)/i.test(u)) return "#";
  return u;
}

// 行内语法：先转义，再依次处理代码、粗体、斜体、图片、链接
function inline(text) {
  let s = escapeHtml(text);

  // 行内代码 `code`（先处理，避免内部再被解析）
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);

  // 图片 ![alt](url) 必须在链接前
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
    (_, alt, url) => `<img alt="${alt}" src="${safeUrl(url)}">`);

  // 链接 [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    (_, t, url) => `<a href="${safeUrl(url)}" target="_blank" rel="noopener">${t}</a>`);

  // 粗体 **x** 先于斜体
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // 斜体 *x* / _x_
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/_([^_]+)_/g, "<em>$1</em>");

  return s;
}

const BLOCK_START = /^(```|#{1,6}\s|>\s?|[-*]\s|\d+\.\s|-{3,}|\*{3,}|_{3,})\s*$/;

export function renderMarkdown(md) {
  const lines = String(md || "").replace(/\r\n?/g, "\n").split("\n");
  let out = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 空行
    if (/^\s*$/.test(line)) { i++; continue; }

    // 块级代码 ```lang
    const fence = line.match(/^```(.*)$/);
    if (fence) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]); i++;
      }
      i++; // 跳过结束 ```
      out += `<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`;
      continue;
    }

    // 标题 # ~ ######
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      out += `<h${level}>${inline(h[2].trim())}</h${level}>`;
      i++; continue;
    }

    // 分割线
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out += "<hr>"; i++; continue; }

    // 引用块
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, "")); i++;
      }
      out += `<blockquote>${renderMarkdown(buf.join("\n"))}</blockquote>`;
      continue;
    }

    // 无序列表
    if (/^[-*]\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^[-*]\s+/, "")); i++;
      }
      out += "<ul>" + buf.map((x) => `<li>${inline(x)}</li>`).join("") + "</ul>";
      continue;
    }

    // 有序列表
    if (/^\d+\.\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\d+\.\s+/, "")); i++;
      }
      out += "<ol>" + buf.map((x) => `<li>${inline(x)}</li>`).join("") + "</ol>";
      continue;
    }

    // 段落：收集到下一个块级起点或空行
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !BLOCK_START.test(lines[i])
    ) {
      buf.push(lines[i]); i++;
    }
    out += `<p>${inline(buf.join(" "))}</p>`;
  }

  return out;
}
