// 渲染“分享查看页”：顶部本站菜单 + 下方 iframe 预览。
// - html 模式：用户 HTML 原样注入 iframe（srcdoc），沙箱允许脚本/表单。
// - md 模式：用内置轻量渲染器把 Markdown 转成 HTML 并套排版样式注入，沙箱更严格（不跑脚本）。
import { renderMarkdown } from "./markdown.js";

export function renderViewPage({ id, selfUrl, type = "html", raw = "", title = "" }) {
  const displayTitle = title?.trim?.() || id;
  let contentHtml;
  let sandbox;

  if (type === "md") {
    // Markdown → HTML（内置轻量渲染器，零依赖）
    try {
      const body = renderMarkdown(raw);
      contentHtml = renderMarkdownDocument(body);
    } catch (e) {
      // 极端内容渲染异常时兜底：原样以 <pre> 展示，绝不抛 500
      contentHtml = renderMarkdownDocument(`<pre>${escapeHtml(String(raw || ""))}</pre>`);
    }
    // md 不需要跑脚本，关掉 allow-scripts，比 html 视图更隔离
    sandbox = 'allow-popups allow-popups-to-escape-sandbox allow-same-origin';
  } else {
    contentHtml = raw;
    sandbox =
      "allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox";
  }

  // 把内容序列化为 JS 字符串，并把 "<" 转义为 \u003c，
  // 防止内容里的 </script> 提前闭合本页 script。
  const safe = JSON.stringify(contentHtml).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<title>${escapeHtml(displayTitle)} · PageFly</title>
<style>
:root{--bar-h:52px;--brand:#6366f1;--brand-2:#8b5cf6;--brand-ink:#4f46e5;--bg:#fff;--border:#e5e7eb;--text:#111827;--muted:#6b7280;}
*{box-sizing:border-box;}
html,body{margin:0;height:100%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--text);}
.bar{position:fixed;top:0;left:0;right:0;height:var(--bar-h);display:flex;align-items:center;gap:10px;padding:0 16px;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--border);z-index:10;}
.brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:16px;text-decoration:none;letter-spacing:.3px;min-width:0;}
.brand .mark{width:24px;height:24px;border-radius:7px;background:linear-gradient(135deg,var(--brand),var(--brand-2));display:grid;place-items:center;flex:none;}
.brand .mark svg{width:14px;height:14px;color:#fff;}
.brand b{color:var(--text);white-space:nowrap;}
.brand small{color:var(--muted);font-weight:500;font-size:12px;margin-left:2px;white-space:nowrap;}
.vtitle{flex:1;min-width:0;padding:0 12px;text-align:center;color:var(--text);font-weight:600;font-size:14px;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-decoration:none;}
.vtitle:hover{color:var(--brand);}
@media(max-width:640px){.vtitle{display:none;}}
.type-badge{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;padding:3px 8px;border-radius:999px;background:#eef0ff;color:var(--brand-ink);margin-left:6px;white-space:nowrap;}
.type-badge.md{background:#f0fdf4;color:#15803d;}
.spacer{flex:1;}
.btn{border:1px solid var(--border);background:#fff;color:var(--text);font-size:13px;padding:7px 12px;border-radius:8px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:.15s;white-space:nowrap;}
.btn:hover{border-color:var(--brand);color:var(--brand);}
.btn.primary{background:var(--brand);border-color:var(--brand);color:#fff;}
.btn.primary:hover{opacity:.92;color:#fff;}
#f{position:fixed;top:var(--bar-h);left:0;width:100%;height:calc(100vh - var(--bar-h));border:0;background:#fff;display:block;}
</style>
</head>
<body>
<header class="bar">
  <a class="brand" href="/">
    <span class="mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg></span>
    <b>PageFly</b><small>· 静态托管</small>
  </a>
  <a class="vtitle" href="${selfUrl}?raw=1" target="_blank" rel="noopener" title="在新标签页打开">${escapeHtml(displayTitle)}</a>
  <span class="type-badge ${type === "md" ? "md" : ""}">${type === "md" ? "Markdown" : "HTML"}</span>
  <a class="btn primary" href="/">＋ 创建页面</a>
  <button class="btn" id="copyBtn">复制链接</button>
</header>
<iframe id="f" sandbox="${sandbox}"></iframe>
<script>
  var f = document.getElementById('f');
  var html = ${safe};
  f.srcdoc = html;

  // —— 锚点修复 ——
  // 分享链接里的 #xxx 属于「内容文档(iframe)」而非顶层查看页。
  // 顶层页面没有这些锚点元素，浏览器会把 hash 解析到顶层 → “找不到”。
  // 这里把 hash 转发进 iframe，定位到 iframe 内的元素并滚动。
  function scrollFrameToHash(hash){
    if(!hash) return false;
    var id = decodeURIComponent(String(hash).replace(/^#/, ''));
    if(!id) return false;
    try{
      var doc = f.contentDocument;
      if(!doc) return false;
      var el = doc.getElementById(id)
            || (doc.getElementsByName ? doc.getElementsByName(id)[0] : null);
      if(!el) return false;
      el.scrollIntoView({behavior:'smooth', block:'start'});
      if(el.focus){ try{ el.focus(); }catch(e){} }
      return true;
    }catch(e){ return false; }
  }

  // 顶层 hash → iframe（深链直达 / 手动改 URL / 点后退前进）
  function applyTopHash(){
    scrollFrameToHash(location.hash);
  }

  f.addEventListener('load', function(){
    // 1) 初次加载即把顶层 hash 转发进 iframe
    applyTopHash();
    // 2) 监听 iframe 内部锚点导航，同步回顶层 URL，便于再次分享
    try{
      f.contentWindow.addEventListener('hashchange', function(){
        var h = f.contentWindow.location.hash || '';
        if(h && h !== location.hash){
          history.replaceState(null, '', location.pathname + location.search + h);
        }
      });
    }catch(e){}
  });
  window.addEventListener('hashchange', applyTopHash);

  document.getElementById('copyBtn').addEventListener('click', function(){
    var b=document.getElementById('copyBtn');
    navigator.clipboard.writeText(location.href).then(function(){
      var t=b.textContent; b.textContent='已复制✓'; setTimeout(function(){b.textContent=t;},1500);
    }).catch(function(){ alert('复制失败，请手动复制：'+location.href); });
  });
</script>
</body>
</html>`;
}

// 把 Markdown 渲染出的 HTML 包成一份带排版的完整文档（注入 iframe srcdoc）
function renderMarkdownDocument(bodyHtml) {
  const css = `
:root{
  --md-text:#1f2328;--md-muted:#656d76;--md-line:#d0d7de;--md-bg:#fff;
  --md-code-bg:#f6f8fa;--md-brand:#6366f1;
}
*{box-sizing:border-box;}
body{margin:0;padding:48px 24px;background:var(--md-bg);color:var(--md-text);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
  font-size:16px;line-height:1.75;-webkit-font-smoothing:antialiased;}
.md{max-width:780px;margin:0 auto;}
h1,h2,h3,h4,h5,h6{line-height:1.3;margin:1.6em 0 .6em;font-weight:700;}
h1{font-size:2em;border-bottom:1px solid var(--md-line);padding-bottom:.3em;}
h2{font-size:1.5em;border-bottom:1px solid var(--md-line);padding-bottom:.3em;}
h3{font-size:1.25em;}
p{margin:.9em 0;}
a{color:var(--md-brand);text-decoration:none;}
a:hover{text-decoration:underline;}
ul,ol{padding-left:1.6em;margin:.8em 0;}
li{margin:.3em 0;}
blockquote{margin:.9em 0;padding:.4em 1em;border-left:4px solid var(--md-line);color:var(--md-muted);background:#fafbfc;}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.9em;
  background:var(--md-code-bg);padding:.2em .4em;border-radius:6px;}
pre{background:var(--md-code-bg);padding:16px;border-radius:10px;overflow:auto;margin:.9em 0;}
pre code{background:transparent;padding:0;font-size:.88em;line-height:1.6;}
img{max-width:100%;border-radius:8px;margin:.4em 0;}
hr{border:0;border-top:1px solid var(--md-line);margin:1.8em 0;}
table{border-collapse:collapse;margin:1em 0;width:100%;}
th,td{border:1px solid var(--md-line);padding:8px 12px;text-align:left;}
th{background:var(--md-code-bg);font-weight:600;}
`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div class="md">${bodyHtml}</div></body></html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
