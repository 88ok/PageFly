import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { savePage } from "./src/upload.js";
import { renderViewPage } from "./src/render.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "public");
const PORT = process.env.PORT || 8788;

// 本地内存版 KV（仅用于开发测试，生产由 Cloudflare KV 提供）
const kv = {
  _m: new Map(),
  async put(k, v) { this._m.set(k, String(v)); },
  async get(k) { return this._m.has(k) ? this._m.get(k) : null; },
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  try {
    // 上传
    if (req.method === "POST" && u.pathname === "/api/upload") {
      let content = "";
      let type; // 缺省时由 savePage 自动判断
      let title = "";
      const ct = req.headers["content-type"] || "";
      if (ct.includes("application/json")) {
        const body = await readJson(req);
        content = body.content ?? body.html ?? "";
        type = body.type === "md" ? "md" : (body.type === "html" ? "html" : undefined);
        title = body.title ?? "";
      } else {
        const form = await readForm(req);
        content = form.get("content") ?? form.get("html") ?? "";
        const t = form.get("type");
        type = t === "md" ? "md" : (t === "html" ? "html" : undefined);
        title = form.get("title") ?? "";
      }
      if (!String(content).trim()) return json(res, 400, { error: "empty_content" });
      const id = await savePage({ PAGEDROP_KV: kv }, { type, raw: String(content), title: String(title) });
      return json(res, 200, { id, url: `${u.origin}/v/${id}` });
    }

    // 查看 /v/:id
    if (req.method === "GET" && u.pathname.startsWith("/v/")) {
      const id = u.pathname.slice(3);
      const raw = await kv.get(id);
      if (!raw) { res.writeHead(404, { "content-type": "text/html; charset=utf-8" }); return res.end("404 Not Found"); }
      const parsed = JSON.parse(raw);
      const { type = "html", raw: content = "", title = "" } = parsed;
      if (u.searchParams.get("raw") !== null) {
        const ct = type === "md" ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8";
        res.writeHead(200, { "content-type": ct });
        return res.end(content);
      }
      const page = renderViewPage({ id, selfUrl: `${u.origin}/v/${id}`, type, raw: content, title });
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(page);
    }

    // 静态资源
    let p = u.pathname === "/" ? "/index.html" : u.pathname;
    const fp = join(PUBLIC, p);
    if (!fp.startsWith(PUBLIC) || !existsSync(fp)) {
      res.writeHead(404); return res.end("404 Not Found");
    }
    const data = await readFile(fp);
    res.writeHead(200, { "content-type": MIME[extname(fp)] || "application/octet-stream" });
    res.end(data);
  } catch (e) {
    res.writeHead(500); res.end("error: " + e.message);
  }
});

server.listen(PORT, () => console.log(`PageFly dev server → http://localhost:${PORT}`));

function readJson(req) {
  return new Promise((ok, err) => {
    let d = ""; req.on("data", (c) => (d += c));
    req.on("end", () => { try { ok(JSON.parse(d || "{}")); } catch (e) { err(e); } });
  });
}
function readForm(req) {
  return new Promise((ok) => {
    let d = ""; req.on("data", (c) => (d += c));
    req.on("end", () => { const m = new Map(); for (const [k, v] of new URLSearchParams(d)) m.set(k, v); ok(m); });
  });
}
function json(res, code, obj) {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}
