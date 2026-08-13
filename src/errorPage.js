// 404 页面 HTML —— 单一来源。
// 供 functions/v/[id].js 在「id 不存在」时复用，确保 /v/<无效id> 也显示同款 404。
// 注意：public/404.html 是本文件的静态孪生，用于覆盖其它未匹配路由（如 /abc），
// 两者内容应保持一致；改样式时请同步两处。
export const NOT_FOUND_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>页面未找到 · PageFly</title>
<meta name="description" content="PageFly —— 你访问的页面不存在，即将返回首页。" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="apple-touch-icon" href="/favicon.svg" />
<meta http-equiv="refresh" content="3; url=/" />
<style>
  :root{
    --bg:#f6f7fb;--panel:#ffffff;--ink:#0f172a;--muted:#64748b;--line:#e7e9f0;
    --brand:#6366f1;--brand-2:#8b5cf6;--brand-ink:#4f46e5;--brand-bg:rgba(99,102,241,.10);
    --radius:16px;
    --shadow:0 1px 2px rgba(15,23,42,.04),0 12px 32px -12px rgba(79,70,229,.18);
    --shadow-sm:0 1px 2px rgba(15,23,42,.05),0 4px 14px -8px rgba(15,23,42,.12);
    --shadow-brand:0 10px 24px -10px rgba(99,102,241,.45);
  }
  *{box-sizing:border-box;}html,body{margin:0;}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue","PingFang SC","Microsoft YaHei",sans-serif;color:var(--ink);
    background:radial-gradient(1200px 600px at 85% -10%,rgba(139,92,246,.10),transparent 60%),radial-gradient(1000px 500px at 0% 0%,rgba(99,102,241,.10),transparent 55%),var(--bg);
    min-height:100vh;-webkit-font-smoothing:antialiased;}
  .wrap{max-width:1080px;margin:0 auto;padding:0 24px;min-height:100vh;display:flex;flex-direction:column;}
  nav{display:flex;align-items:center;justify-content:space-between;padding:22px 0;}
  .brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:18px;letter-spacing:.2px;text-decoration:none;color:var(--ink);}
  .brand .mark{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,var(--brand),var(--brand-2));display:grid;place-items:center;box-shadow:var(--shadow-sm);}
  .brand .mark svg{width:17px;height:17px;color:#fff;}
  .hero{flex:1;display:flex;align-items:center;justify-content:center;padding:20px 0 40px;}
  .box{width:100%;max-width:560px;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:40px 36px;text-align:center;}
  .code{font-size:clamp(64px,14vw,104px);line-height:1;font-weight:800;letter-spacing:-2px;background:linear-gradient(120deg,var(--brand),var(--brand-2));-webkit-background-clip:text;background-clip:text;color:transparent;margin:0 0 6px;}
  .eyebrow{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.7);backdrop-filter:blur(6px);font-size:13px;color:var(--brand-ink);font-weight:600;letter-spacing:.3px;margin-bottom:14px;}
  .eyebrow .dot{width:6px;height:6px;border-radius:50%;background:linear-gradient(135deg,var(--brand),var(--brand-2));}
  .box h1{font-size:22px;font-weight:800;margin:4px 0 10px;}
  .box p.sub{font-size:15px;color:var(--muted);margin:0 auto 22px;max-width:420px;line-height:1.6;}
  .countdown{display:inline-flex;align-items:center;gap:8px;font-size:14px;color:var(--muted);background:var(--brand-bg);border-radius:999px;padding:9px 16px;margin-bottom:24px;}
  .countdown b{font-weight:800;color:var(--brand-ink);font-variant-numeric:tabular-nums;min-width:14px;display:inline-block;text-align:center;}
  .actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;}
  .btn-primary{border:0;cursor:pointer;font-size:15px;font-weight:700;padding:13px 24px;border-radius:12px;background:linear-gradient(135deg,var(--brand),var(--brand-2));color:#fff;box-shadow:var(--shadow-brand);transition:transform .12s,box-shadow .15s;text-decoration:none;display:inline-flex;align-items:center;gap:8px;}
  .btn-primary:hover{transform:translateY(-1px);box-shadow:0 14px 28px -10px rgba(99,102,241,.55);}
  .btn-ghost{border:1px solid var(--line);background:#fff;color:var(--ink);font-weight:600;font-size:14px;padding:12px 18px;border-radius:10px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:.15s;}
  .btn-ghost:hover{border-color:var(--brand);color:var(--brand-ink);}
  footer{text-align:center;color:var(--muted);font-size:13px;padding:20px 0 32px;}
  footer a{color:var(--muted);text-decoration:none;}
  @media (max-width:720px){.box{padding:34px 24px;}.actions{flex-direction:column;}.actions a,.actions button{justify-content:center;}}
</style>
</head>
<body>
  <div class="wrap">
    <nav>
      <a class="brand" href="/">
        <span class="mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg></span>
        PageFly
      </a>
    </nav>
    <section class="hero">
      <div class="box">
        <p class="code">404</p>
        <span class="eyebrow"><span class="dot"></span>页面未找到</span>
        <h1>你访问的页面走丢了</h1>
        <p class="sub">链接可能已失效，或页面从未存在。别担心，我们带你回到首页。</p>
        <div class="countdown"><span>将在</span><b id="cd">3</b><span>秒后自动返回首页</span></div>
        <div class="actions">
          <a class="btn-primary" href="/"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>立即返回首页</a>
          <a class="btn-ghost" href="/"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m5 12 7 7 7-7"/></svg>去创建一个页面</a>
        </div>
      </div>
    </section>
    <footer>© 2026 PageFly 页面托管 &nbsp;·&nbsp; 为 HTML 与 Markdown 而生</footer>
  </div>
<script>
  let n = 3;const cd = document.getElementById('cd');
  const iv = setInterval(function(){ n--; if (n <= 0){ clearInterval(iv); location.href = '/'; return; } if (cd) cd.textContent = n; }, 1000);
</script>
</body>
</html>`;
