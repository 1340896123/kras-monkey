// seed/id.ts —— 32 位无连字符大写 ID 生成器（确定性，便于种子可读）
// 对应需求 §1.3：禁止复用第三方带连字符 UUID

/** 用固定命名空间生成确定性的 32 位 ID（大写、无连字符） */
const cache = new Map<string, string>()

function hash32(input: string): string {
  // FNV-1a 128-bit-ish 模拟：组合两次 FNV-1a 64 位 → 16 字节
  let h1 = 0xcbf29ce484222325n
  let h2 = 0x84222325cbf29ce4n
  for (let i = 0; i < input.length; i++) {
    const c = BigInt(input.charCodeAt(i))
    h1 = (h1 ^ c) * 0x100000001b3n
    h2 = (h2 ^ (c + 7n)) * 0x100000001b3n
    h1 &= (1n << 64n) - 1n
    h2 &= (1n << 64n) - 1n
  }
  return h1.toString(16).toUpperCase().padStart(16, '0') + h2.toString(16).toUpperCase().padStart(16, '0')
}

/** 给定一个稳定 key（如 "itemtype:part"），返回同一 32 位 ID */
export function id(key: string): string {
  let v = cache.get(key)
  if (!v) {
    v = hash32('kras::' + key)
    cache.set(key, v)
  }
  return v
}

/** 全新随机 ID（用于运行时新建对象） */
export function newId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
    .slice(0, 32)
}
