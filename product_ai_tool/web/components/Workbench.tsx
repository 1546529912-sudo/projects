"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { DemoPreview } from "@/components/DemoPreview";
import type { DemoPostMessagePayload } from "@/lib/protocol";
import { getSampleDemoHtml } from "@/lib/sample-html";

const MODELS = [
  { id: "sample", label: "离线示例 HTML（无需密钥）" },
  { id: "deepseek-v4-flash", label: "deepseek-v4-flash（需 DEEPSEEK_API_KEY）" },
] as const;

type ModelId = (typeof MODELS)[number]["id"];

function formatProtocolLine(msg: DemoPostMessagePayload): string {
  const base = msg.type;
  if ("pageKey" in msg && "stateKey" in msg && msg.type === "DEMO_STATE_CHANGE") {
    return `${base} · pageKey=${msg.pageKey} · stateKey=${msg.stateKey}`;
  }
  if ("pageKey" in msg) {
    return `${base} · pageKey=${msg.pageKey}`;
  }
  if (msg.type === "DEMO_ACTION") {
    return `${base} · ${msg.name}`;
  }
  return base;
}

export function Workbench() {
  const formId = useId();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ModelId>("deepseek-v4-flash");
  const [previewMode, setPreviewMode] = useState(true);
  const [demoId, setDemoId] = useState<string | null>(null);
  const [pageKey, setPageKey] = useState<string>("—");
  const [html, setHtml] = useState<string | null>(null);
  const [lastMessages, setLastMessages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProtocol = useCallback((msg: DemoPostMessagePayload) => {
    setLastMessages((prev) => {
      const line = `${new Date().toLocaleTimeString()} ${formatProtocolLine(msg)}`;
      const next = [line, ...prev];
      return next.slice(0, 8);
    });
    if ("pageKey" in msg && typeof msg.pageKey === "string") {
      setPageKey(msg.pageKey);
    }
  }, []);

  const loadSample = useCallback(() => {
    const id = `demo_${crypto.randomUUID().slice(0, 8)}`;
    setDemoId(id);
    setHtml(getSampleDemoHtml(id));
    setError(null);
    setLastMessages([]);
  }, []);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (model === "sample") {
        loadSample();
        return;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        html?: string;
        demoId?: string;
        error?: string;
        fallback?: boolean;
      };

      if (!res.ok || !data.ok || !data.html) {
        throw new Error(data.error || "生成失败");
      }

      setDemoId(data.demoId ?? null);
      setHtml(data.html);
      setLastMessages([]);
      if (data.fallback) {
        setError("模型不可用，已改用离线示例 HTML。");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求异常");
    } finally {
      setLoading(false);
    }
  }, [model, prompt, loadSample]);

  const toolbarNotice = useMemo(() => {
    if (model === "deepseek-v4-flash") {
      return "服务端需配置 DEEPSEEK_API_KEY；失败时将自动回退离线示例。";
    }
    return null;
  }, [model]);

  return (
    <div className="flex h-screen min-h-[640px] flex-col bg-white text-black">
      <header className="flex flex-wrap items-center gap-3 border-b border-black px-4 py-3">
        <span className="text-sm font-bold tracking-tight">AI Demo 工作台</span>
        <span className="hidden text-xs text-[#afafaf] sm:inline">
          布局：顶栏 · 左侧需求 · 中间预览 · 右侧协议调试
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-[#4b4b4b]">
            <span className="hidden sm:inline">模型</span>
            <select
              className="rounded-full border border-black bg-white px-3 py-2 text-xs font-medium text-black outline-none"
              value={model}
              onChange={(e) => setModel(e.target.value as ModelId)}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <div
            className="flex rounded-full border border-black p-0.5"
            role="group"
            aria-label="模式"
          >
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                previewMode ? "bg-black text-white" : "bg-[#efefef] text-black"
              }`}
              onClick={() => setPreviewMode(true)}
            >
              预览
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                !previewMode ? "bg-black text-white" : "bg-[#efefef] text-black"
              }`}
              onClick={() => setPreviewMode(false)}
            >
              标注
            </button>
          </div>
          <button
            type="button"
            className="rounded-full bg-black px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
            disabled={loading}
            onClick={() => void generate()}
          >
            {loading ? "生成中…" : "生成 Demo"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-black p-4 lg:w-80 lg:border-b-0 lg:border-r">
          <h2 className="text-xs font-bold uppercase tracking-wide text-[#afafaf]">
            需求
          </h2>
          <form
            id={formId}
            className="mt-3 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void generate();
            }}
          >
            <textarea
              className="min-h-[140px] w-full resize-y rounded-lg border border-black bg-white p-3 text-sm text-black placeholder:text-[#afafaf] outline-none"
              placeholder="描述希望生成的交互 Demo，例如：一个三 Tab 的电商商品页，带购物车弹窗…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            {toolbarNotice && (
              <p className="text-xs text-[#4b4b4b]">{toolbarNotice}</p>
            )}
            {error && (
              <p className="text-xs text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-full bg-black px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
                disabled={loading}
              >
                生成
              </button>
              <button
                type="button"
                className="rounded-full border border-black bg-white px-4 py-2 text-xs font-medium text-black hover:bg-[#e2e2e2]"
                onClick={loadSample}
              >
                仅载入示例
              </button>
            </div>
          </form>
          <div className="mt-6 space-y-1 rounded-xl bg-[#efefef] p-3 text-xs">
            <div className="font-bold text-black">当前 Demo</div>
            <div className="text-[#4b4b4b]">
              demoId:{" "}
              <code className="rounded bg-white px-1">{demoId ?? "—"}</code>
            </div>
            <div className="text-[#4b4b4b]">
              pageKey:{" "}
              <code className="rounded bg-white px-1">{pageKey}</code>
            </div>
          </div>
        </aside>

        <main className="min-h-0 min-w-0 flex-1 p-4">
          <DemoPreview
            html={html}
            previewMode={previewMode}
            onProtocolMessage={handleProtocol}
          />
        </main>

        <aside className="w-full shrink-0 border-t border-black p-4 lg:w-96 lg:border-l lg:border-t-0">
          <h2 className="text-xs font-bold uppercase tracking-wide text-[#afafaf]">
            协议与占位
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#4b4b4b]">
            宿主监听子页面 <code>postMessage</code>。当前展示最近消息（最多 8
            条）。右侧列表、标注编辑与「让 AI 修改」将在后续迭代接入。
          </p>
          <ul className="mt-4 space-y-2">
            {lastMessages.length === 0 ? (
              <li className="text-xs text-[#afafaf]">尚无消息；生成 Demo 后切换页面可见。</li>
            ) : (
              lastMessages.map((line) => (
                <li
                  key={line}
                  className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[11px] leading-snug text-[#4b4b4b] shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
                >
                  {line}
                </li>
              ))
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}
