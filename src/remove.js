// 自助删除（软失效）核心逻辑：与上传端共享 PAGEDROP_KV 绑定。
//
// 设计说明：
//   PageFly 是中性静态托管平台，页面 id 即 KV 的 key。所谓「删除」并非物理删除，
//   而是把 key 改名为 `原id + "deldel" + 随机1位数字`，并删除原 key——
//   普通用户不知道新 id，原链接即失效（404）。管理员可按 `deldel` 后缀或
//   `delreq:` 前缀在后台检索待处理申请，再决定是否彻底清理。

// 从用户输入中解析出页面 id：
//   - 完整 URL：https://x/v/abc123  → abc123
//   - 相对路径：/v/abc123            → abc123
//   - 纯 id：abc123                  → abc123
export function extractId(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  // 1) 当完整 URL 解析
  try {
    const u = new URL(s);
    const m = u.pathname.match(/\/v\/([^/?#]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch (_) {}
  // 2) 当作含 /v/ 的相对路径
  const m2 = s.match(/\/v\/([^/?#\s]+)/);
  if (m2) return decodeURIComponent(m2[1]);
  // 3) 纯 id（字母数字，长度 1-32）
  if (/^[a-z0-9]{1,32}$/i.test(s)) return s;
  return "";
}

// 生成 1 位随机数字（0-9），优先用 Web Crypto，Node 18+ 亦可用全局 crypto
function randomDigit() {
  const buf = new Uint8Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 10);
}

// 执行一次自助删除申请。返回 { ok, error?, newId? }
// env.PAGEDROP_KV 需提供 get / put / delete
export async function removePage(env, { contact = "", link = "" }) {
  const id = extractId(link);
  if (!id) return { ok: false, error: "invalid_link" };

  const raw = await env.PAGEDROP_KV.get(id);
  if (raw == null) return { ok: false, error: "not_found" };

  // 新 key：原 id + deldel + 1 位随机数字 → 用户无法再访问原链接
  const newId = id + "deldel" + randomDigit();

  // 复制到新 key，并删除原 key（KV 无 rename，用 复制+删除 实现）
  await env.PAGEDROP_KV.put(newId, raw);
  await env.PAGEDROP_KV.delete(id);

  // 记录删除申请，供管理后台检索/判断（不向用户暴露 newId）
  try {
    await env.PAGEDROP_KV.put(
      "delreq:" + newId,
      JSON.stringify({ contact, link, oldId: id, newId, at: Date.now() })
    );
  } catch (_) {
    // 记录失败不影响主流程（链接已失效）
  }

  return { ok: true, newId };
}
