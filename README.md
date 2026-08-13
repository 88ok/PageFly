# PageFly · 为静态内容而生的极简托管页

> 部署自定义 HTML 页面的最简方式。一次上传，随处访问。
> 上传一个 HTML 网页 → 生成一条 `/v/xxxx` 链接 → 别人打开即可预览。
> 顶部是本站的菜单栏，下方是你要分享的页面。

## 命名

**PageFly** = Page（网页）+ Fly（飞出去）。
含义：把你的 HTML 页面一键“放飞”，立刻得到一个可随处访问的链接。

## 定位

- **为静态内容而生** —— 面向完整 HTML / CSS / JS 页面的极简托管。
- **极简** —— 无框架、无构建步骤，上传即托管。
- **托管页** —— 运行在 Cloudflare 边缘网络，全球低延迟。

## 架构（最少组件，无框架）

```
pagefly/
├── public/index.html        # 主页：上传 UI（拖拽 / 选文件 / 粘贴 → 生成链接）
├── functions/
│   ├── api/upload.js        # POST：存 HTML 到 KV，返回 {id, url}
│   └── v/[id].js            # GET：渲染“菜单 + iframe 预览”页
├── src/
│   ├── upload.js            # 生成短 ID + 写入 KV（共享逻辑）
│   └── render.js            # 渲染查看页（菜单 + iframe srcdoc）
├── dev-server.mjs           # 本地开发服务器（内存 KV，无需 wrangler）
├── wrangler.toml
└── package.json
```

- **存储**：Cloudflare KV。每条页面 = 一个 key（`{html, createdAt}`）。
- **隔离**：上传的 HTML 通过 `<iframe srcdoc="...">` 注入，与顶部菜单天然隔离；
  iframe 带 `sandbox`，可运行 JS / 表单 / 弹窗，但不影响外层站点。
- **源码查看**：`/v/:id?raw=1` 直接返回原始 HTML（可下载、新标签打开）。

## 本地开发（立刻能跑）

```bash
npm run dev          # 启动 http://localhost:8788
```

打开 http://localhost:8788 → 拖入/粘贴 HTML → 生成链接 → 打开 `/v/xxxx` 查看。

## 部署到 Cloudflare Pages

1. 在 Cloudflare 控制台 **Workers & Pages → KV** 创建一个命名空间（如 `pagefly-pages`）。
2. **Workers & Pages → 你的 Pages 项目 → Settings → Functions → KV namespace bindings**，
   添加绑定：变量名（binding）填 **`PAGEDROP_KV`**，绑定到上一步的命名空间。
3. 连接 Git 仓库（或 `wrangler pages deploy public`），构建输出目录填 **`public`**。
4. 部署完成后即获得 `https://你的项目.pages.dev`。

> 后续接 Cloudflare CDN：Pages 默认就在 Cloudflare 边缘网络上，
> 可在 **Speed / Caching** 中开启缓存；`/v/:id` 为静态化内容，适合边缘缓存加速。

## 安全说明

- 查看页的 iframe 同时带 `allow-scripts` 与 `allow-same-origin`，
  因此被分享页面内的脚本可运行（预览需要）。这意味着分享页与本站同源，
  请勿分享不可信的恶意 HTML。如需更强隔离可改为 `sandbox="allow-scripts"`（去掉
  `allow-same-origin`，但部分依赖同源的页面功能会受限）。
- 链接 ID 为 8 位随机串，无法被枚举，但内容**完全公开**，请勿放敏感数据。
