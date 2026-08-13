// 渲染“分享查看页”：顶部本站菜单 + 下方 iframe 预览。
// 上传的 HTML 通过 iframe 的 srcdoc 注入，天然与菜单隔离（沙箱）。
export function renderViewPage({ id, selfUrl, html }) {
  // 把 HTML 序列化为 JS 字符串，并把 "<" 转义为 \u003c，
  // 防止内容里的 </script> 提前闭合本页 script。
  const safe = JSON.stringify(html).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PageFly · ${id}</title>
<style>
:root{--bar-h:52px;--brand:#6366f1;--brand-2:#8b5cf6;--bg:#fff;--border:#e5e7eb;--text:#111827;--muted:#6b7280;}
*{box-sizing:border-box;}
html,body{margin:0;height:100%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--text);}
.bar{position:fixed;top:0;left:0;right:0;height:var(--bar-h);display:flex;align-items:center;gap:10px;padding:0 16px;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--border);z-index:10;}
.brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:16px;text-decoration:none;letter-spacing:.3px;}
.brand .mark{width:24px;height:24px;border-radius:7px;background:linear-gradient(135deg,var(--brand),var(--brand-2));display:grid;place-items:center;}
.brand .mark svg{width:14px;height:14px;color:#fff;}
.brand b{color:var(--text);}
.brand small{color:var(--muted);font-weight:500;font-size:12px;margin-left:2px;}
.spacer{flex:1;}
.btn{border:1px solid var(--border);background:#fff;color:var(--text);font-size:13px;padding:7px 12px;border-radius:8px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:.15s;white-space:nowrap;}
.btn:hover{border-color:var(--brand);color:var(--brand);}
.btn.primary{background:var(--brand);border-color:var(--brand);color:#fff;}
.btn.primary:hover{opacity:.92;color:#fff;}
#f{position:fixed;top:var(--bar-h);left:0;right:0;bottom:0;width:100%;border:0;background:#fff;}
</style>
</head>
<body>
<header class="bar">
  <a class="brand" href="/">
    <span class="mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg></span>
    <b>PageFly</b><small>· 静态托管</small>
  </a>
  <div class="spacer"></div>
  <a class="btn primary" href="/">＋ 新建</a>
  <button class="btn" id="copyBtn">复制链接</button>
  <a class="btn" href="${selfUrl}?raw=1" target="_blank" rel="noopener">源码</a>
  <a class="btn" href="${selfUrl}?raw=1" target="_blank" rel="noopener">新标签打开</a>
</header>
<iframe id="f" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"></iframe>
<script>
  var html = ${safe};
  document.getElementById('f').srcdoc = html;
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
