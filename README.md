# PageFly · 为静态内容而生的极简托管页

> 部署自定义 HTML / Markdown 的最简方式。一次上传，随处访问。
> 上传一个 HTML 网页或 Markdown 文档 → 生成一条 `/v/xxxx` 链接 → 别人打开即可预览。
> 顶部是本站的菜单栏，下方是你要分享的页面（Markdown 会自动渲染排版）。

## 命名

**PageFly** = Page（网页）+ Fly（飞出去）。
含义：把你的 HTML 页面一键“放飞”，立刻得到一个可随处访问的链接。

## 定位

- **为静态内容而生** —— 面向完整 HTML / CSS / JS 页面，以及 Markdown 文档的极简托管。
- **极简** —— 无框架、无构建步骤，上传即托管。
- **托管页** —— 运行在 Cloudflare 边缘网络，全球低延迟。

## 架构（最少组件，无框架）

```
pagefly/
├── public/index.html        # 主页：上传 UI（拖拽 / 选文件 / 粘贴 → 生成链接；格式自动识别）
├── functions/
│   ├── api/upload.js        # POST：存内容到 KV，返回 {id, url}（type 缺省时按内容自动识别 html|md）
│   └── v/[id].js            # GET：渲染“菜单 + iframe 预览”页
├── src/
│   ├── upload.js            # 生成短 ID + 写入 KV（共享逻辑，含类型自动识别与标题抓取）
│   ├── render.js            # 渲染查看页（菜单 + iframe srcdoc）
│   └── markdown.js          # 内置轻量 Markdown → HTML 渲染器（零依赖）
├── dev-server.mjs           # 本地开发服务器（内存 KV，无需 wrangler）
├── wrangler.toml
└── package.json
```

- **格式自动识别**：上传时不让用户选择格式。服务端 `detectType()` **Markdown 特征优先**（`# 标题`、`- 列表`、`**粗体**`、反引号代码、`[链接]`、引用、`~~删除线~~` 等）；只有明确以 `<!doctype html>` / `<html` 开头，或明显是 HTML 标签（且不是注释 `<!--`、自动链接 `<https://>`）才判为 HTML。首页也会在发布按钮旁实时显示「自动识别：Markdown / HTML」，误判一目了然。Markdown 自动渲染成排版网页，且沙箱更隔离（不执行脚本）。
- **存储**：Cloudflare KV。每条页面 = 一个 key（`{type, raw, title, createdAt}`）。
- **HTML 模式**：用户 HTML 原样通过 `<iframe srcdoc="...">` 注入，与顶部菜单天然隔离；
  iframe 带 `sandbox="allow-scripts allow-same-origin ..."`，可运行 JS / 表单 / 弹窗，但不影响外层站点。
- **Markdown 模式**：服务端用内置轻量渲染器（`src/markdown.js`，零依赖、迭代解析、含递归深度上限防栈溢出）把 Markdown 渲染成 HTML 并套排版样式后注入 iframe；
  支持的语法：标题、粗体/斜体/删除线、行内与块级代码（含语言类名）、引用（可嵌套）、有序/无序列表（可嵌套）、GFM 表格（含对齐）、分割线、链接/图片/自动链接 `<https://>`；
  iframe 沙箱**关闭 allow-scripts**（`allow-popups allow-same-origin`），更安全——md 本不需要跑脚本；即便渲染异常也会兜底为 `<pre>` 原样展示，绝不抛 500。
- **源码查看**：`/v/:id?raw=1` 直接返回原始内容（md 返回 `text/markdown`，html 返回 `text/html`，可下载、新标签打开）。
- **依赖**：**无任何外部依赖**。Markdown 渲染为内置实现，`npm install` 已不需要，部署更快更稳。

## 本地开发（立刻能跑）

```bash
npm run dev          # 启动 http://localhost:8788（无需 npm install，零依赖）
```

打开 http://localhost:8788 → 拖入/粘贴 HTML 或 Markdown → 生成链接 → 打开 `/v/xxxx` 查看（格式自动识别）。

## 部署到 Cloudflare Pages

### 方式一：控制台连接 Git 仓库（推荐，最简单）

1. 在 Cloudflare 控制台 **Workers & Pages → KV** 创建一个命名空间（如 `pagefly-pages`）。
2. **Workers & Pages → 你的 Pages 项目 → Settings → Functions → KV namespace bindings**，
   添加绑定：变量名（binding）填 **`PAGEDROP_KV`**，绑定到上一步的命名空间。
3. 连接 Git 仓库，构建输出目录填 **`public`**，部署后即获得 `https://你的项目.pages.dev`。

> 此方式下 `wrangler.toml` 中的 KV 块不会被读取，绑定以控制台为准。

### 方式二：本地 / CI 用 `wrangler pages deploy`（KV id 由环境变量注入）

`wrangler.toml` 只声明 binding 名，**命名空间 ID 用环境变量 `${PAGEDROP_KV_ID}` 注入**，不硬编码进仓库：

```bash
# 1) 安装 wrangler 并登录
npm i -g wrangler && wrangler login

# 2) 部署时注入 KV 命名空间 ID（仅当前终端会话，勿写入仓库）
PAGEDROP_KV_ID=你的命名空间ID wrangler pages deploy public
```

开发期可用 `.dev.vars` 写一行 `PAGEDROP_KV_ID=xxx`（已在 `.gitignore` 中，不会提交）。
注意：一旦用本文件部署，KV 绑定以 `wrangler.toml` 为准，控制台同名绑定编辑会被忽略。

> Pages 默认运行在 Cloudflare 边缘网络；可在 **Speed / Caching** 中开启缓存，
> `/v/:id` 为静态化内容，适合边缘缓存加速。

## 安全说明

- **HTML 模式**的 iframe 同时带 `allow-scripts` 与 `allow-same-origin`，
  因此被分享页面内的脚本可运行（预览需要）。这意味着分享页与本站同源，
  请勿分享不可信的恶意 HTML。如需更强隔离可改为 `sandbox="allow-scripts"`（去掉
  `allow-same-origin`，但部分依赖同源的页面功能会受限）。
- **Markdown 模式**的 iframe 关闭了 `allow-scripts`，md 转出的 HTML 里即便写了
  `<script>` 也不会执行，比 HTML 模式更隔离；但仍请勿分享不可信的恶意内容。
- 链接 ID 为 8 位随机串，无法被枚举，但内容**完全公开**，请勿放敏感数据。
