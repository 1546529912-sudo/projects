import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatPayload = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};

function buildSystemPrompt(knowledge: string) {
  return `你是「菠萝」，林凤个人网站上的访客向导。你只根据下方《知识库》回答访客问题。

【人设与语气】
- 理性：条理清楚、有据有理，不浮夸、不编造。
- 好玩：可偶尔用轻快、简短的比喻或小幽默，但必须得体、有分寸，仍以帮访客解决问题为先。
- 好奇心：对访客的问题保持真诚兴趣，可自然延伸一两句「为什么这值得聊」，但绝不能超出知识库编造事实。
- 可简短自称「菠萝」，不必每条回复都重复自我介绍。

【必须遵守】
1. 只使用知识库中明确出现的信息；不要编造项目背景、上线状态、客户范围或业绩。
2. 必须区分「当前个人项目 / AI 实践」（英语小故事、CRM 相关实践）与「企业真实项目经验」。
3. 访客若问「网站上展示的是什么项目」，优先答个人与实践侧：英语小故事、CRM（按知识库措辞）。
4. 访客若问「在公司做过的真实项目」，优先答企业经历列表（智能客服、数据平台、电商平台、供应链等）。
5. CRM 不可描述为已大规模商用正式上线；表述须与知识库一致。
6. 知识库未覆盖的问题，明说「站内未公开该信息」，可适度建议邮件或微信联系。
7. 使用简体中文；在满足人设的前提下保持简洁、好读。
8. 排版：适当换行分段；并列要点时每条单独一行（可用「-」开头）；避免把所有内容挤在一段不换行。
9. 需要强调的词句可用 Markdown 加粗：**关键词**，便于阅读（不要滥用）。
10. 引导下载简历时请写出站内路径：\`/linfeng-resume.pdf\`（建议用反引号包裹或直接写路径，便于站内链接可点击）。

——《知识库》——
${knowledge}`;
}

/** 汇总 fetch 报错信息，并按常见 errno / 文案给出可读说明 */
function describeUpstreamConnectionError(error: unknown): { message: string; detail: string } {
  const parts: string[] = [];
  let errno: string | undefined;
  let node: unknown = error;
  for (let depth = 0; depth < 5 && node; depth += 1) {
    if (node instanceof Error) {
      parts.push(node.name ? `${node.name}: ${node.message}` : node.message);
      errno ??= (node as NodeJS.ErrnoException).code;
      node = node.cause;
    } else {
      parts.push(String(node));
      break;
    }
  }
  const detail = parts.filter(Boolean).join(" ← ");

  let message =
    "调用模型接口失败：请确认当前环境能访问所配置的接口地址（本机可先试用终端：`curl -I https://api.deepseek.com`）。常见原因：公司网/防火墙拦截、VPN 与国内 API 路由冲突、DNS 异常；若网站部署在云平台上，需在平台确认「出站访问外网/API」未被禁用。";

  if (errno === "ENOTFOUND" || /\bENOTFOUND\b/i.test(detail)) {
    message = "DNS 无法解析模型接口域名。请更换网络/DNS（如路由器或系统 DNS）后再试。";
  } else if (
    errno === "ECONNREFUSED" ||
    errno === "ECONNRESET" ||
    errno === "ETIMEDOUT" ||
    /UND_ERR_CONNECT_TIMEOUT|Connect Timeout/i.test(detail)
  ) {
    message =
      "连接模型接口被拒绝或超时。可尝试切换网络、暂时关闭 VPN/代理后再试；公司内网可申请放行对 api.deepseek.com 的出站 HTTPS。";
  } else if (/certificate|CERT_|SSL|TLS|UNABLE_TO_VERIFY/i.test(detail)) {
    message = "HTTPS 握手或证书校验失败。若开过抓包/中间人代理请先关闭后再试。";
  } else if (error instanceof Error && error.name === "AbortError") {
    message = "请求模型接口超时已中断。稍后重试，或检查网络不稳定因素。";
  }

  return { message, detail };
}

export async function POST(req: NextRequest) {
  const key =
    process.env.DEEPSEEK_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.AI_API_KEY?.trim();

  if (!key) {
    return NextResponse.json(
      {
        error:
          "未配置模型密钥。DeepSeek：在 .env.local 中设置 DEEPSEEK_API_KEY（或通用的 OPENAI_API_KEY）以及 OPENAI_API_BASE=https://api.deepseek.com/v1",
      },
      { status: 503 },
    );
  }

  let body: ChatPayload;
  try {
    body = (await req.json()) as ChatPayload;
  } catch {
    return NextResponse.json({ error: "请求体格式错误。" }, { status: 400 });
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "缺少 messages。" }, { status: 400 });
  }

  const sanitized = body.messages
    .filter((m) => m?.role === "user" || m?.role === "assistant")
    .map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content.trim().slice(0, 4000) : "",
    }))
    .filter((m) => m.content.length > 0);

  if (sanitized.length === 0) {
    return NextResponse.json({ error: "没有有效对话内容。" }, { status: 400 });
  }

  const clipped = sanitized.slice(-16);

  const knowledgePath = path.join(process.cwd(), "custome-service-knowledge.md");
  let knowledge: string;
  try {
    knowledge = await readFile(knowledgePath, "utf-8");
  } catch {
    return NextResponse.json({ error: "知识库文件读取失败（custome-service-knowledge.md）。" }, { status: 500 });
  }

  if (knowledge.length > 120_000) {
    knowledge = knowledge.slice(0, 120_000) + "\n\n[以下为截断]";
  }

  const trimBase = (v: string | undefined) => (v ?? "").trim().replace(/\/$/, "");

  /** DeepSeek OpenAI 兼容入口，文档：https://api-docs.deepseek.com/zh-cn/ */
  const baseExplicit =
    trimBase(process.env.DEEPSEEK_API_BASE) ||
    trimBase(process.env.OPENAI_API_BASE) ||
    trimBase(process.env.AI_API_BASE);

  const base =
    baseExplicit ||
    (process.env.DEEPSEEK_API_KEY?.trim() ? "https://api.deepseek.com/v1" : "https://api.openai.com/v1");

  const useDeepSeekHost = base.includes("deepseek.com");
  const model =
    process.env.AI_CHAT_MODEL?.trim() || (useDeepSeekHost ? "deepseek-v4-flash" : "gpt-4o-mini");
  const url = `${base}/chat/completions`;

  let upstream: Response;
  try {
    const ctl = new AbortController();
    const timeoutMs = 55_000;
    const tid = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      upstream = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          max_tokens: 1200,
          messages: [{ role: "system", content: buildSystemPrompt(knowledge) }, ...clipped],
        }),
        signal: ctl.signal,
      });
    } finally {
      clearTimeout(tid);
    }
  } catch (e) {
    const { message, detail } = describeUpstreamConnectionError(e);
    return NextResponse.json(
      {
        error: message,
        hint: process.env.NODE_ENV === "development" ? detail.slice(0, 800) : undefined,
      },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    return NextResponse.json(
      {
        error: `模型服务返回错误（${upstream.status}）。`,
        hint: process.env.NODE_ENV === "development" ? errText.slice(0, 500) : undefined,
      },
      { status: 502 },
    );
  }

  let json: {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  try {
    json = (await upstream.json()) as typeof json;
  } catch {
    return NextResponse.json(
      {
        error: "模型接口返回内容不是合法的 JSON，请稍后重试。",
      },
      { status: 502 },
    );
  }

  const text =
    json.choices?.[0]?.message?.content?.trim() ?? json.error?.message?.trim() ?? "";
  if (!text) {
    return NextResponse.json(
      {
        error: "模型未返回正文（可能余额不足、限流或服务异常）。",
        hint:
          process.env.NODE_ENV === "development"
            ? JSON.stringify(json ?? {}).slice(0, 500)
            : undefined,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ reply: text });
}
