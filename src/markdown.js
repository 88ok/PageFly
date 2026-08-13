// 轻量 Markdown → HTML 渲染器（零依赖，部署无需 npm install）。
// 覆盖常见语法：ATX 标题、粗体/斜体/删除线、行内/块级代码、引用（可嵌套）、
// 有序/无序列表（可嵌套）、GFM 表格、分割线、链接、图片、自动链接。
// 已做 HTML 转义与 URL 安全过滤（防 XSS）；解析为迭代式，并对引用嵌套做深度上限，
// 避免极端内容触发栈溢出。

const MAX_BLOCKQUOTE_DEPTH = 64;

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

// 行内语法：先转义，再依次处理代码、图片、链接、自动链接、粗体、斜体、删除线。
function inline(text) {
  let s = escapeHtml(text);

  // 行内代码 `code`（先处理，避免内部再被解析）
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);

  // 图片 ![alt](url "title") 必须在链接前
  s = s.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_, alt, url, title) =>
      `<img alt="${alt}"${title ? ` title="${title}"` : ""} src="${safeUrl(url)}">`
  );

  // 链接 [text](url "title")
  s = s.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_, t, url, title) =>
      `<a href="${safeUrl(url)}" target="_blank" rel="noopener"${title ? ` title="${title}"` : ""}>${t}</a>`
  );

  // 自动链接 <https://...>
  s = s.replace(
    /&lt;(https?:\/\/[^\s&]+)&gt;/g,
    (_, u) => `<a href="${safeUrl(u)}" target="_blank" rel="noopener">${u}</a>`
  );

  // 粗体 **x** / __x__ 先于斜体
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // 斜体 *x* / _x_（下划线版避免吞掉单词内的 _）
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/(?<![\w])_([^_]+)_(?![\w])/g, "<em>$1</em>");

  // 删除线 ~~x~~
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  return s;
}

// 一行是否开启新的块级元素（用于段落收集时判断是否停止）
function isBlockStart(line) {
  return (
    /^(#{1,6})\s+/.test(line) ||          // 标题
    /^(\s*)(```|~~~)/.test(line) ||        // 代码围栏
    /^\s*>\s?/.test(line) ||               // 引用
    /^\s*([-*+]|\d+\.)\s+/.test(line) ||   // 列表
    /^ {0,3}([-*_])(\s*\1){2,}\s*$/.test(line) // 分割线
  );
}

// 解析一层列表（按缩进判断嵌套），返回 { html, next }
function parseList(lines, i, MAX, baseIndent) {
  const items = [];
  let ordered = null;

  while (i < MAX) {
    const line = lines[i];

    // 空行：若下一行仍是同层/更深列表项，则跳过（兼容松散列表）；否则结束
    if (/^\s*$/.test(line)) {
      const nxt = lines[i + 1] || "";
      if (/^\s*([-*+]|\d+\.)\s+/.test(nxt) || /^\s*>\s?/.test(nxt)) {
        i++;
        continue;
      }
      break;
    }

    const m = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (!m) break;
    const indent = m[1].length;
    if (indent < baseIndent) break;

    if (indent > baseIndent) {
      // 嵌套列表，归到上一项
      if (items.length) {
        const sub = parseList(lines, i, MAX, indent);
        items[items.length - 1].children += sub.html;
        i = sub.next;
        continue;
      }
      break;
    }

    // 同层
    const isOrdered = /\d+\./.test(m[2]);
    if (ordered === null) ordered = isOrdered;
    else if (ordered !== isOrdered) break; // 类型不一致则停（避免混排吞掉后续）

    items.push({ content: m[3], children: "" });
    i++;
  }

  const tag = ordered ? "ol" : "ul";
  const html =
    `<${tag}>` +
    items.map((it) => `<li>${inline(it.content)}${it.children}</li>`).join("") +
    `</${tag}>`;
  return { html, next: i };
}

// 解析 GFM 表格，返回 { html, next }
function parseTable(lines, i, MAX) {
  const splitRow = (s) =>
    s.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");

  const header = splitRow(lines[i]);
  const align = splitRow(lines[i + 1]).map((c) => {
    const t = c.trim();
    const l = t.startsWith(":");
    const r = t.endsWith(":");
    return l && r ? "center" : r ? "right" : l ? "left" : "";
  });

  let r = i + 2;
  const rows = [];
  while (r < MAX && lines[r].includes("|") && !/^\s*$/.test(lines[r])) {
    rows.push(splitRow(lines[r]));
    r++;
  }

  const cell = (tag, c, a) =>
    `<${tag}${a ? ` style="text-align:${a}"` : ""}>${inline(c.trim())}</${tag}>`;

  let html = "<table><thead><tr>" +
    header.map((c, idx) => cell("th", c, align[idx])).join("") +
    "</tr></thead><tbody>";
  html += rows
    .map((row) => "<tr>" + row.map((c, idx) => cell("td", c, align[idx])).join("") + "</tr>")
    .join("");
  html += "</tbody></table>";

  return { html, next: r };
}

export function renderMarkdown(md, depth = 0) {
  if (depth > MAX_BLOCKQUOTE_DEPTH) return escapeHtml(String(md || ""));

  const lines = String(md || "").replace(/\r\n?/g, "\n").split("\n");
  const MAX = lines.length;
  let out = "";
  let i = 0;

  while (i < MAX) {
    const line = lines[i];

    // 空行
    if (/^\s*$/.test(line)) { i++; continue; }

    // 块级代码围栏 ``` 或 ~~~
    const fence = line.match(/^(\s*)(```|~~~)(.*)$/);
    if (fence) {
      const indent = fence[1].length;
      const marker = fence[2];
      const lang = fence[3].trim();
      const closeRe = new RegExp("^\\s*" + marker + "\\s*$");
      const buf = [];
      i++;
      while (i < MAX && !closeRe.test(lines[i])) {
        buf.push(lines[i].replace(new RegExp("^ {0," + indent + "}"), ""));
        i++;
      }
      i++; // 跳过结束围栏
      out += `<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ""}>${escapeHtml(buf.join("\n"))}</code></pre>`;
      continue;
    }

    // 标题 # ~ ######（支持闭合 #）
    const h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h) {
      const level = h[1].length;
      out += `<h${level}>${inline(h[2])}</h${level}>`;
      i++; continue;
    }

    // 分割线
    if (/^ {0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) { out += "<hr>"; i++; continue; }

    // 引用块（可嵌套，递归带深度上限）
    if (/^\s*>\s?/.test(line)) {
      const buf = [];
      while (i < MAX && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      out += `<blockquote>${renderMarkdown(buf.join("\n"), depth + 1)}</blockquote>`;
      continue;
    }

    // GFM 表格：当前行含 | 且下一行是分隔行
    if (
      line.includes("|") &&
      i + 1 < MAX &&
      /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) &&
      lines[i + 1].includes("-")
    ) {
      const t = parseTable(lines, i, MAX);
      out += t.html;
      i = t.next;
      continue;
    }

    // 列表（可嵌套）
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const lst = parseList(lines, i, MAX, line.match(/^(\s*)/)[1].length);
      out += lst.html;
      i = lst.next;
      continue;
    }

    // 缩进代码块（4 空格或 tab）
    if (/^( {4,}|\t)/.test(line) && !isBlockStart(line)) {
      const buf = [];
      while (i < MAX && /^( {4,}|\t)/.test(lines[i])) {
        buf.push(lines[i].replace(/^( {4}|\t)/, ""));
        i++;
      }
      out += `<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`;
      continue;
    }

    // 段落：收集到下一个块级起点或空行
    const buf = [line];
    i++;
    while (i < MAX && !/^\s*$/.test(lines[i]) && !isBlockStart(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    out += `<p>${inline(buf.join("\n").replace(/\n/g, " "))}</p>`;
  }

  return out;
}
