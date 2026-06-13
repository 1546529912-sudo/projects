import { NextResponse } from "next/server";
import { extractHtmlFromModelText } from "@/lib/extract-html";
import { getSampleDemoHtml } from "@/lib/sample-html";

export const runtime = "nodejs";

const SYSTEM = `You are an expert front-end engineer. Output exactly ONE complete HTML file that runs standalone in a browser sandbox.

Hard requirements:
- Single file only: inline <style> and <script>, no external CSS/JS URLs, no npm/build tools.
- No real backend calls, no API keys, no loading remote data. Use placeholder/local data only.
- Do not navigate to real external URLs (use in-page panels or hash-only patterns).
- The demo MUST be interactive (e.g. tabs, dialogs, toggles) using vanilla JS.
- Every logical "page" or screen must have a unique pageKey string (examples: home, detail, checkout).
- When the demo finishes initial render, call:
  window.parent.postMessage({ type: "DEMO_READY", pageKey: "<current>", demoId: demoId }, "*");
- Whenever the visible page/screen changes, call:
  window.parent.postMessage({ type: "DEMO_PAGE_CHANGE", pageKey: "<new>", demoId: demoId }, "*");
- Define const demoId = "<short id>" near the top of your script (simple alphanumeric id is fine).
- Optional: for modal/tab substates you may send DEMO_STATE_CHANGE with { type, pageKey, stateKey } — not required for MVP.
- Use Chinese UI copy if the user writes in Chinese; otherwise English is fine.

Return ONLY the HTML document text. No markdown fences, no commentary before or after.`;

type Body = { prompt?: string; model?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const model =
    typeof body.model === "string" ? body.model : "deepseek-v4-flash";

  if (model === "sample") {
    const demoId = `demo_${crypto.randomUUID().slice(0, 8)}`;
    return NextResponse.json({
      ok: true,
      demoId,
      html: getSampleDemoHtml(demoId),
      fallback: false,
    });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  const base =
    process.env.DEEPSEEK_BASE_URL?.replace(/\/$/, "") ?? "https://api.deepseek.com";

  if (!apiKey) {
    const demoId = `demo_${crypto.randomUUID().slice(0, 8)}`;
    return NextResponse.json({
      ok: true,
      demoId,
      html: getSampleDemoHtml(demoId),
      fallback: true,
      error: "DEEPSEEK_API_KEY missing; served sample HTML.",
    });
  }

  if (!prompt) {
    return NextResponse.json({ ok: false, error: "prompt is required" }, { status: 400 });
  }

  const targetModel =
    model === "deepseek-v4-flash" ? "deepseek-v4-flash" : "deepseek-v4-flash";

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: targetModel,
        temperature: 0.35,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `User request:\n${prompt}\n\nBuild the interactive single HTML demo now.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      const demoId = `demo_${crypto.randomUUID().slice(0, 8)}`;
      return NextResponse.json({
        ok: true,
        demoId,
        html: getSampleDemoHtml(demoId),
        fallback: true,
        error: `DeepSeek error ${res.status}: ${errText.slice(0, 200)}`,
      });
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content ?? "";
    let html = extractHtmlFromModelText(raw);

    if (!html && raw.trim()) {
      html = raw.trim();
    }

    if (!html) {
      const demoId = `demo_${crypto.randomUUID().slice(0, 8)}`;
      return NextResponse.json({
        ok: true,
        demoId,
        html: getSampleDemoHtml(demoId),
        fallback: true,
        error: "Model returned no parseable HTML; sample substituted.",
      });
    }

    const demoId = `demo_${crypto.randomUUID().slice(0, 8)}`;

    return NextResponse.json({
      ok: true,
      demoId,
      html,
      fallback: false,
    });
  } catch (e) {
    const demoId = `demo_${crypto.randomUUID().slice(0, 8)}`;
    return NextResponse.json({
      ok: true,
      demoId,
      html: getSampleDemoHtml(demoId),
      fallback: true,
      error: e instanceof Error ? e.message : "Request failed",
    });
  }
}
