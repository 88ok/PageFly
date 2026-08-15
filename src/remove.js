// 自助删除（软失效）核心逻辑。
//
// 设计说明：
//   页面表(PAGEDROP_KV)：id 即 key。所谓「删除」是软失效——把 key 改名为
//   `原id + "deldel" + 随机1位数字` 并删除原 key。值(raw)原样不动，仅改 id。
//   普通用户不知道新 id，原链接即 404。管理员按 `deldel` 后缀在页面表检索待处理项。
//
//   举报/删除历史表(PAGEDROP_DELREQ_KV，独立 KV)：仅记录 联系方式 ↔ id 的映射，
//   不写入页面表，避免污染页面数据。绑定缺失时跳过记录，不影响主流程（链接照常失效）。

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
// env.PAGEDROP_KV   需提供 get / put / delete（页面表）
// env.PAGEDROP_DELREQ_KV  可选，提供 put（举报/删除历史表，独立 KV）
export async function removePage(env, { contact = "", link = "" }) {
  const id = extractId(link);
  if (!id) return { ok: false, error: "invalid_link" };

  const raw = await env.PAGEDROP_KV.get(id);
  if (raw == null) return { ok: false, error: "not_found" };

  // 仅修改 id：原 id → 原id + "deldel" + 随机1位数字；值(raw)保持原样不动
  const newId = id + "deldel" + randomDigit();
  await env.PAGEDROP_KV.put(newId, raw); // 复制（值不变）
  await env.PAGEDROP_KV.delete(id);       // 删除原 id

  // 历史记录写入「独立表」：仅 联系方式 ↔ id 映射，不污染页面表
  try {
    const delreqKv = env.PAGEDROP_DELREQ_KV;
    if (delreqKv && typeof delreqKv.put === "function") {
      await delreqKv.put(
        "delreq:" + newId,
        JSON.stringify({ contact, id: newId, at: Date.now() })
      );
    }
  } catch (_) {
    // 记录失败不影响主流程（链接已失效）
  }

  return { ok: true, newId };
}
