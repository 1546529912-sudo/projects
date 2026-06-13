/** Pull a single HTML document string from an LLM reply (may be wrapped in fences). */

export function extractHtmlFromModelText(raw: string): string | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:html)?\s*\n?([\s\S]*?)```$/m);
  if (fenced) {
    const inner = fenced[1].trim();
    if (inner) return inner;
  }
  const loose = trimmed.match(/```(?:html)?\s*([\s\S]*?)```/);
  if (loose) {
    const inner = loose[1].trim();
    if (inner) return inner;
  }
  if (/^<!DOCTYPE\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}
