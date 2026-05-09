"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type Role = "user" | "assistant";

type Msg = { role: Role; content: string };

const WELCOME: Msg = {
  role: "assistant",
  content:
    "嗨，我是**菠萝**～林凤站内的向导一枚：底色偏理性，也喜欢有意思的表达，对人和事都挺好奇，但回答问题会严格踩在知识库的地上，不实测不乱编。\n你可以问她的履历背景、「当前个人项目」和「企业项目经验」，还有联系方式——挑你好奇的问就行。",
};

/** 将反引号路径、`/xx.pdf`、http(s) 链接转为可点击 <a>（其余为纯文本）。 */
function linkifyPlain(text: string, variant: Role, baseKey: string): ReactNode {
  const linkClass =
    variant === "user"
      ? "font-medium underline decoration-white/80 underline-offset-2 hover:decoration-white"
      : "font-semibold text-[#a47463] underline underline-offset-2 hover:text-[#8f6052]";

  const re =
    /(`[^`\n]+`)|(https?:\/\/[^\s`]+)|(\/(?:[a-zA-Z0-9._-]+\/)*[a-zA-Z0-9._-]+\.[a-zA-Z0-9]+)/g;

  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(text.slice(last, m.index));
    }
    const raw = m[0];

    if (raw.startsWith("`")) {
      const inner = raw.slice(1, -1).trim();
      if (inner.startsWith("/") || /^https?:\/\//i.test(inner)) {
        const href = inner.replace(/[，。；、）」』]+$/u, "");
        const isPdf = /\.pdf$/i.test(href);
        const isHttp = /^https?:\/\//i.test(href);
        nodes.push(
          <a
            key={`${baseKey}-l${k++}`}
            href={href}
            className={linkClass}
            {...(isPdf && !isHttp ? { download: true } : {})}
            {...(isHttp ? { target: "_blank", rel: "noreferrer noopener" } : {})}
          >
            {href}
          </a>,
        );
      } else {
        nodes.push(raw);
      }
    } else {
      let href = raw.replace(/[，。；、）」』]+$/u, "");
      if (/^https?:\/\//i.test(href)) {
        href = href.replace(/[.,;:!?）」』，。]+$/u, "");
      }
      const isPdf = /\.pdf$/i.test(href);
      const isHttp = /^https?:\/\//i.test(href);
      nodes.push(
        <a
          key={`${baseKey}-l${k++}`}
          href={href}
          className={linkClass}
          {...(isPdf && !isHttp ? { download: true } : {})}
          {...(isHttp ? { target: "_blank", rel: "noreferrer noopener" } : {})}
        >
          {href}
        </a>,
      );
    }
    last = m.index + raw.length;
  }

  if (last < text.length) {
    nodes.push(text.slice(last));
  }

  return nodes.length === 0 ? text : nodes.length === 1 ? nodes[0] : <>{nodes}</>;
}

/** 解析 `**文字**` 为加粗；段内支持链接与反引号路径。 */
function MessageContent({
  text,
  variant,
}: {
  text: string;
  variant: Role;
}) {
  const parts = text.split("**");
  const strongClass =
    variant === "user" ? "font-semibold text-white" : "font-semibold text-[#1c1917]";

  return (
    <>
      {parts.map((part, i) => {
        const body = linkifyPlain(part, variant, `b${i}`);
        return i % 2 === 1 ? (
          <strong key={i} className={strongClass}>
            {body}
          </strong>
        ) : (
          <span key={i}>{body}</span>
        );
      })}
    </>
  );
}

export function PortfolioChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      const raw = await res.text();
      let data: { reply?: string; error?: string; hint?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        setError(`服务响应无法解析 (${res.status})。本地请确认只有一个 next dev，且 /api/chat 正常工作。`);
        setMessages(next);
        return;
      }

      if (!res.ok) {
        setError(data.error ?? `请求失败（${res.status}）`);
        setMessages(next);
        if (process.env.NODE_ENV === "development" && data.hint) {
          console.warn(data.hint);
        }
        return;
      }

      const reply = data.reply?.trim();
      if (!reply) {
        setError(data.error ?? "没有收到回复正文。");
        setMessages(next);
        return;
      }

      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      const msg =
        e instanceof Error && /Failed to fetch|Load failed|NetworkError/i.test(e.message)
          ? "浏览器无法连接到本站（请先确认 npm run dev 已启动且地址与端口一致）。"
          : "网络异常，请稍后重试。";
      setError(msg);
      setMessages(next);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={open ? "关闭菠萝" : "打开菠萝"}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#a47463] text-sm font-semibold text-white shadow-lg shadow-[#a47463]/30 transition hover:scale-[1.03] hover:bg-[#8f6052] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8cfc3] focus-visible:ring-offset-2 md:bottom-10 md:right-10"
      >
        {open ? "×" : "问"}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-labelledby="portfolio-chat-title"
          className="fixed bottom-[5.75rem] right-6 z-[60] flex max-h-[min(520px,70vh)] w-[min(calc(100vw-3rem),380px)] flex-col overflow-hidden rounded-2xl border border-[#e5d9cf] bg-[#f8f6f1]/95 shadow-2xl shadow-[#a47463]/15 backdrop-blur-md md:bottom-[7rem] md:right-10"
        >
          <div className="border-b border-[#e8dcd4] bg-[#a47463] px-4 py-3">
            <h2 id="portfolio-chat-title" className="text-sm font-semibold text-white">
              菠萝
            </h2>
            <p className="text-xs text-white/85">
              理性、清晰，也爱轻松有趣的表达；对世界充满好奇。只吃知识库里有的信息，不向库外现编。
            </p>
          </div>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3 text-[13px] leading-6">
            {messages.map((m, i) => (
              <div key={`${m.role}-${i}`} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <span
                  className={
                    m.role === "user"
                      ? "max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-[#a47463] px-3 py-2 text-white"
                      : "max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md border border-[#e5d9cf] bg-white/90 px-3 py-2 leading-relaxed text-[#475569]"
                  }
                >
                  <MessageContent text={m.content} variant={m.role} />
                </span>
              </div>
            ))}
            {loading ? (
              <p className="text-center text-xs text-[#94a3b8]">正在思考…</p>
            ) : null}
            {error ? <p className="text-center text-xs text-red-600">{error}</p> : null}
          </div>
          <form
            className="flex gap-2 border-t border-[#e8dcd4] bg-white/60 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <label htmlFor="portfolio-chat-input" className="sr-only">
              输入问题
            </label>
            <input
              id="portfolio-chat-input"
              type="text"
              value={input}
              placeholder="请输入问题…"
              disabled={loading}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-xl border border-[#e5d9cf] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#94a3b8] focus:border-[#cbb5a8] focus:ring-1 focus:ring-[#cbb5a8]"
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="shrink-0 rounded-xl bg-[#a47463] px-4 py-2 text-sm font-semibold text-white transition enabled:hover:bg-[#8f6052] disabled:opacity-40"
            >
              发送
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
