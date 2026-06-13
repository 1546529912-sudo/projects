import { readFileSync } from "node:fs";
import { join } from "node:path";

let cached: string | null = null;

export function buildSystemPrompt(): string {
  if (cached) return cached;

  const promptsDir = join(process.cwd(), "lib", "prompts");
  const skill = readFileSync(join(promptsDir, "SKILL.md"), "utf-8")
    .replace(/^---[\s\S]*?---\n/, "")
    .trim();
  const example = readFileSync(join(promptsDir, "example.html"), "utf-8").trim();

  cached = [
    "你是交互式 HTML 产品原型生成专家。严格按下面的技能说明工作。",
    "",
    "==== 技能说明 (SKILL) ====",
    skill,
    "",
    "==== 参考样式 (example.html) ====",
    "下面是一份风格参考。生成时请保持同样的视觉语言、连线脚本结构、响应式策略。",
    "可以根据用户主题改变内容、配色（如用户指定）、布局细节，但不要丢失核心规范。",
    "",
    "```html",
    example,
    "```",
    "",
    "==== 输出要求 ====",
    "- 直接输出一个完整、独立、可在浏览器中双击打开运行的单文件 HTML。",
    "- 不要输出任何 markdown 围栏（不要 ```html 包裹），不要解释，不要前后多余文字。",
    "- 第一行必须是 <!DOCTYPE html>。",
    "- 必须包含 SVG 连线脚本（DOMContentLoaded + resize 重绘）。",
    "- 选 2-4 个左侧重要元素打 data-proto-id，右侧说明区有同 id 的 .proto-desc。",
  ].join("\n");

  return cached;
}
