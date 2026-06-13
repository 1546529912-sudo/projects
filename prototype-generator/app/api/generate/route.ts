import { NextRequest } from "next/server";
import { buildSystemPrompt } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 300;

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

type Body = {
  prompt: string;
  model?: string;
};

const DEFAULT_MODEL = "deepseek-chat";

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "DEEPSEEK_API_KEY 未配置，请在 .env.local 中填入" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "请求体不是合法 JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const userPrompt = body.prompt?.trim();
  if (!userPrompt) {
    return new Response(JSON.stringify({ error: "prompt 不能为空" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : DEFAULT_MODEL;

  const upstream = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      max_tokens: 8192,
      temperature: 0.7,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: `请生成原型，主题与要求如下：\n\n${userPrompt}` },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: `DeepSeek 请求失败 (${upstream.status})`, detail: text.slice(0, 500) }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }

  // Re-stream as plain text: parse SSE deltas and emit only the content chunks.
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length > 0) {
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // ignore parse errors on partial chunks
            }
          }
        }
      } catch (err) {
        controller.error(err);
        return;
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
