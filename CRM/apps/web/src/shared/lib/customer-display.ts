/** 与演示种子、`wipeDemoDataset` 注释中的标记一致 */
export const DEMO_CUSTOMER_NAME_PREFIX = '[DEMO]';

/** 列表/详情展示：去掉前缀 `[DEMO]`（含其后空格），库内原始字符串不变 */
export function stripDemoMarkForDisplay(raw: string | null | undefined): string {
  if (raw == null) return '';
  const s = String(raw);
  const t = s.trimStart();
  if (t.startsWith(DEMO_CUSTOMER_NAME_PREFIX)) {
    const rest = t.slice(DEMO_CUSTOMER_NAME_PREFIX.length).replace(/^\s+/, '');
    return rest || s;
  }
  return s;
}

export function displayCustomerName(raw: string | null | undefined): string {
  return stripDemoMarkForDisplay(raw);
}

/** 商机标题等演示数据展示 */
export function displayOpportunityTitle(raw: string | null | undefined): string {
  return stripDemoMarkForDisplay(raw);
}
