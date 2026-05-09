/**
 * 仅允许纯数字 resourceId 写入 audit_logs.resource_id（BigInt）；否则返回 null，细节放进 afterData。
 */
export function auditResourceIdToBigInt(resourceId: string | bigint | undefined | null): bigint | null {
  if (resourceId === undefined || resourceId === null) return null;
  if (typeof resourceId === 'bigint') return resourceId;
  const s = String(resourceId).trim();
  if (!/^\d+$/.test(s)) return null;
  return BigInt(s);
}

/** 将树中 BigInt / Prisma.Decimal 等转为可 JSON 序列化形态，避免响应 500 */
export function toJsonSerializable<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, v) => {
      if (typeof v === 'bigint') return v.toString();
      if (v != null && typeof v === 'object') {
        const name = (v as object).constructor?.name;
        if (name === 'Decimal') return (v as { toString: () => string }).toString();
      }
      return v;
    }),
  ) as T;
}
