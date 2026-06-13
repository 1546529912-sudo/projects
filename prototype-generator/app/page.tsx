"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MODELS = [
  { value: "deepseek-v4-flash", label: "deepseek-v4-flash" },
  { value: "deepseek-chat", label: "deepseek-chat（快）" },
  { value: "deepseek-reasoner", label: "deepseek-reasoner（慢，更细）" },
];

const EXAMPLES = [
  "电商后台：商品管理列表 + 新建商品弹窗",
  "记账 App 首页：本月支出概览 + 最近账单流",
  "SaaS 设置页：账号信息 + 团队成员 + API Key 管理",
  "在线课程详情页：课程介绍 + 章节目录 + 报名 CTA",
];

const SVG_NS = "http://www.w3.org/2000/svg";
const OVERLAY_ID = "__annotate_svg_overlay__";
const STYLE_ID = "__annotate_mode_style__";
const ACTIONS_CLASS = "__annotate_actions__";

function escapeHtml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]!));
}

type DialogState =
  | { mode: "create"; title: string; desc: string }
  | { mode: "edit"; targetId: string; title: string; desc: string }
  | null;

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<string>(MODELS[0].value);
  const [html, setHtml] = useState("");
  const [status, setStatus] = useState<"idle" | "streaming" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // 标注模式
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [annotateMode, setAnnotateMode] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [dialog, setDialog] = useState<DialogState>(null);
  const pickedElRef = useRef<HTMLElement | null>(null);
  const drawLinesRef = useRef<() => void>(() => {});

  const cleanedHtml = useMemo(() => {
    const raw = html.trim();
    if (!raw) return "";
    let s = raw;
    const fence = s.match(/^```(?:html)?\s*\n([\s\S]*?)(?:\n```|$)/i);
    if (fence) s = fence[1];
    const lower = s.toLowerCase();
    const start = lower.indexOf("<!doctype");
    if (start < 0) return "";
    const endIdx = lower.lastIndexOf("</html>");
    if (endIdx > start) return s.slice(start, endIdx + "</html>".length);
    return s.slice(start);
  }, [html]);

  const previewSrcDoc = cleanedHtml;
  const streaming = status === "streaming";

  async function handleGenerate() {
    const userPrompt = prompt.trim();
    if (!userPrompt) return;
    if (streaming) {
      abortRef.current?.abort();
      return;
    }
    setAnnotateMode(false);
    setDialog(null);
    setHtml("");
    setError("");
    setStatus("streaming");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt, model }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(data.error ?? "请求失败");
      }
      if (!res.body) throw new Error("响应没有 body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setHtml(acc);
      }
      setStatus("done");
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setStatus("idle");
        return;
      }
      setError((err as Error).message);
      setStatus("error");
    } finally {
      abortRef.current = null;
    }
  }

  function getCurrentHtml(): string {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return cleanedHtml || html;
    // 导出前清理标注模式注入的临时元素
    const clone = doc.documentElement.cloneNode(true) as HTMLElement;
    clone.querySelector(`#${OVERLAY_ID}`)?.remove();
    clone.querySelector(`#${STYLE_ID}`)?.remove();
    clone.querySelectorAll(`.${ACTIONS_CLASS}`).forEach((el) => el.remove());
    // 恢复 #connections 的可见性
    const c = clone.querySelector("#connections") as HTMLElement | null;
    if (c) c.style.removeProperty("display");
    return "<!DOCTYPE html>\n" + clone.outerHTML;
  }

  function handleDownload() {
    const out = getCurrentHtml();
    if (!out) return;
    const blob = new Blob([out], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prototype-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    const out = getCurrentHtml();
    if (!out) return;
    await navigator.clipboard.writeText(out);
  }

  function handleOpenInNewTab() {
    const out = getCurrentHtml();
    if (!out) return;
    const blob = new Blob([out], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  // === 删除标注 ===
  const handleDeleteAnnotation = useCallback((id: string) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    if (!confirm(`确定删除标注 #${id}？`)) return;
    doc.querySelectorAll(`.proto-desc[data-proto-id="${id}"]`).forEach((el) => el.remove());
    doc.querySelectorAll(`.proto-element[data-proto-id="${id}"], [data-proto-id="${id}"]`).forEach((el) => {
      el.removeAttribute("data-proto-id");
      el.classList.remove("proto-element");
    });
    drawLinesRef.current();
  }, []);

  // === 编辑标注 ===
  const handleEditAnnotation = useCallback((id: string) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const desc = doc.querySelector(`.proto-desc[data-proto-id="${id}"]`) as HTMLElement | null;
    if (!desc) return;
    const titleEl = desc.querySelector("[data-annotate-title]") as HTMLElement | null;
    const bodyEl = desc.querySelector("[data-annotate-body]") as HTMLElement | null;
    const title = (titleEl?.textContent || "").trim();
    const body = (bodyEl?.innerText || bodyEl?.textContent || "").trim();
    setDialog({ mode: "edit", targetId: id, title, desc: body });
  }, []);

  // === 注入：SVG overlay + 按钮 + click 拾取 + 监听重绘 ===
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !cleanedHtml) return;

    let detached = false;
    let win: Window | null = null;
    let doc: Document | null = null;
    let mo: MutationObserver | null = null;
    let onResize: (() => void) | null = null;
    let onScroll: (() => void) | null = null;
    let onClick: ((e: Event) => void) | null = null;
    let onActionClick: ((e: Event) => void) | null = null;

    function teardown() {
      if (!doc) return;
      doc.getElementById(STYLE_ID)?.remove();
      doc.getElementById(OVERLAY_ID)?.remove();
      doc.querySelectorAll(`.${ACTIONS_CLASS}`).forEach((el) => el.remove());
      // 恢复 #connections
      const c = doc.querySelector("#connections") as HTMLElement | null;
      if (c) c.style.removeProperty("display");
      if (onClick) doc.removeEventListener("click", onClick, true);
      if (onActionClick) doc.removeEventListener("click", onActionClick, true);
      if (win && onResize) win.removeEventListener("resize", onResize);
      if (onScroll) doc.removeEventListener("scroll", onScroll, true);
      mo?.disconnect();
      drawLinesRef.current = () => {};
    }

    function attach() {
      if (detached) return;
      win = iframe!.contentWindow;
      doc = iframe!.contentDocument;
      if (!doc || !win) return;

      // 标注模式开启时才设置 hover 样式 / 按钮 / click 拾取
      if (!annotateMode) {
        teardown();
        return;
      }

      // 隐藏原型自带的 #connections（避免双重画线）
      const cSvg = doc.querySelector("#connections") as HTMLElement | null;
      if (cSvg) cSvg.style.display = "none";

      // 注入 hover 样式
      let style = doc.getElementById(STYLE_ID);
      if (!style) {
        style = doc.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
          *:not(html):not(body):not(head):not(script):not(style):not(svg):not(path):not(circle):not(text):not(.${ACTIONS_CLASS}):not(.${ACTIONS_CLASS} *):hover {
            outline: 2px dashed #165DFF !important;
            outline-offset: 2px;
            cursor: crosshair !important;
          }
          .proto-element[data-proto-id], [data-proto-id]:not(.proto-desc) {
            outline: 2px solid #00B42A !important;
            outline-offset: 2px;
          }
          .proto-desc { position: relative !important; }
          .${ACTIONS_CLASS} {
            position: absolute !important;
            top: 4px !important;
            right: 4px !important;
            display: none;
            gap: 4px;
            z-index: 10;
          }
          .proto-desc:hover .${ACTIONS_CLASS} { display: flex !important; }
          .${ACTIONS_CLASS} button {
            width: 22px; height: 22px; padding: 0;
            border: 1px solid #e5e7eb; background: #fff;
            border-radius: 4px; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            color: #6b7280;
            transition: all 0.15s;
            font-family: -apple-system, sans-serif;
          }
          .${ACTIONS_CLASS} button:hover { background: #f3f4f6; color: #111827; border-color: #d1d5db; }
          .${ACTIONS_CLASS} button[data-action="delete"]:hover { background: #fee2e2; color: #dc2626; border-color: #fecaca; }
        `;
        doc.head.appendChild(style);
      }

      // 注入 SVG overlay
      let overlay = doc.getElementById(OVERLAY_ID) as unknown as SVGSVGElement | null;
      if (!overlay) {
        overlay = doc.createElementNS(SVG_NS, "svg") as SVGSVGElement;
        overlay.setAttribute("id", OVERLAY_ID);
        overlay.setAttribute(
          "style",
          "position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:55;"
        );
        doc.body.appendChild(overlay);
      }

      // 画线函数
      function drawLines() {
        if (!overlay || !doc) return;
        while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
        const lefts = doc.querySelectorAll(".proto-element[data-proto-id], [data-proto-id]:not(.proto-desc)");
        lefts.forEach((leftEl) => {
          const id = leftEl.getAttribute("data-proto-id");
          if (!id) return;
          const rightEl = doc!.querySelector(`.proto-desc[data-proto-id="${id}"]`) as HTMLElement | null;
          if (!rightEl) return;
          const l = (leftEl as HTMLElement).getBoundingClientRect();
          const r = rightEl.getBoundingClientRect();
          // 视区外不画
          if (r.left < l.right - 20) return; // 右元素跑到左元素左边了，跳过
          const x1 = l.right;
          const y1 = l.top + l.height / 2;
          const x2 = r.left;
          const y2 = r.top + r.height / 2;
          const cp = x1 + (x2 - x1) * 0.5;

          const path = doc!.createElementNS(SVG_NS, "path");
          path.setAttribute("d", `M ${x1} ${y1} C ${cp} ${y1}, ${cp} ${y2}, ${x2} ${y2}`);
          path.setAttribute("fill", "none");
          path.setAttribute("stroke", "#165DFF");
          path.setAttribute("stroke-width", "2");
          path.setAttribute("opacity", "0.6");
          overlay!.appendChild(path);

          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const circle = doc!.createElementNS(SVG_NS, "circle");
          circle.setAttribute("cx", String(midX));
          circle.setAttribute("cy", String(midY));
          circle.setAttribute("r", "11");
          circle.setAttribute("fill", "#165DFF");
          overlay!.appendChild(circle);

          const text = doc!.createElementNS(SVG_NS, "text");
          text.setAttribute("x", String(midX));
          text.setAttribute("y", String(midY));
          text.setAttribute("dy", "4");
          text.setAttribute("text-anchor", "middle");
          text.setAttribute("fill", "#fff");
          text.setAttribute("font-size", "12");
          text.setAttribute("font-weight", "bold");
          text.textContent = id;
          overlay!.appendChild(text);
        });
      }
      drawLinesRef.current = drawLines;

      // 给每个 .proto-desc 注入编辑/删除按钮
      function attachDescButtons() {
        if (!doc) return;
        doc.querySelectorAll(".proto-desc[data-proto-id]").forEach((el) => {
          const desc = el as HTMLElement;
          if (desc.querySelector(`.${ACTIONS_CLASS}`)) return;
          const isManual = desc.classList.contains("__manual_proto_desc__");
          const actions = doc!.createElement("div");
          actions.className = ACTIONS_CLASS;
          actions.innerHTML = `
            ${isManual ? `<button data-action="edit" title="编辑" aria-label="编辑">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>` : ""}
            <button data-action="delete" title="删除" aria-label="删除">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          `;
          desc.appendChild(actions);
        });
      }
      attachDescButtons();

      // 监听 click：拾取左侧元素（不命中 .proto-desc）
      onClick = (e: Event) => {
        const target = e.target as HTMLElement;
        if (!target) return;
        // 忽略 actions 按钮的点击（由 onActionClick 处理）
        if (target.closest(`.${ACTIONS_CLASS}`)) return;
        // 忽略 .proto-desc 内部点击
        if (target.closest(".proto-desc")) return;
        if (target === doc!.body || target === doc!.documentElement) return;
        e.preventDefault();
        e.stopPropagation();
        pickedElRef.current = target;
        setDialog({ mode: "create", title: "", desc: "" });
      };
      doc.addEventListener("click", onClick, true);

      // 监听 actions 按钮点击
      onActionClick = (e: Event) => {
        const target = e.target as HTMLElement;
        const btn = target.closest(`.${ACTIONS_CLASS} button`) as HTMLButtonElement | null;
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const action = btn.getAttribute("data-action");
        const desc = btn.closest(".proto-desc") as HTMLElement | null;
        const id = desc?.getAttribute("data-proto-id");
        if (!id) return;
        if (action === "delete") handleDeleteAnnotation(id);
        else if (action === "edit") handleEditAnnotation(id);
      };
      doc.addEventListener("click", onActionClick, true);

      // 监听 resize / scroll → 重画
      onResize = () => drawLines();
      win.addEventListener("resize", onResize);
      onScroll = () => requestAnimationFrame(drawLines);
      doc.addEventListener("scroll", onScroll, true);

      // 监听 DOM 变化 → 重画 + 重新挂按钮
      mo = new MutationObserver(() => {
        attachDescButtons();
        drawLines();
      });
      mo.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-proto-id"] });

      // 立即画一次
      drawLines();
    }

    if (iframe.contentDocument?.readyState === "complete") {
      attach();
    } else {
      iframe.addEventListener("load", attach, { once: true });
    }

    return () => {
      detached = true;
      teardown();
    };
  }, [annotateMode, cleanedHtml, iframeKey, handleDeleteAnnotation, handleEditAnnotation]);

  // === Dialog 提交（新建或编辑） ===
  function commitDialog() {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !dialog) return;
    const title = dialog.title.trim() || "未命名";
    const body = dialog.desc.trim();

    if (dialog.mode === "edit") {
      const desc = doc.querySelector(`.proto-desc[data-proto-id="${dialog.targetId}"]`) as HTMLElement | null;
      if (desc) {
        const titleEl = desc.querySelector("[data-annotate-title]") as HTMLElement | null;
        const bodyEl = desc.querySelector("[data-annotate-body]") as HTMLElement | null;
        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.innerHTML = escapeHtml(body).replace(/\n/g, "<br>");
      }
      drawLinesRef.current();
      setDialog(null);
      return;
    }

    // create
    const el = pickedElRef.current;
    if (!el) return;
    const nums = Array.from(doc.querySelectorAll("[data-proto-id]"))
      .map((e) => parseInt(e.getAttribute("data-proto-id") || "0", 10))
      .filter((n) => !isNaN(n) && n > 0);
    const nextId = (nums.length ? Math.max(...nums) : 0) + 1;

    el.classList.add("proto-element");
    el.setAttribute("data-proto-id", String(nextId));

    // 找/建右侧容器
    let container: HTMLElement | null = null;
    const firstDesc = doc.querySelector(".proto-desc");
    if (firstDesc?.parentElement) container = firstDesc.parentElement as HTMLElement;
    if (!container) container = doc.querySelector("#right-panel") as HTMLElement | null;
    if (!container) {
      let panel = doc.getElementById("__manual_desc_panel__") as HTMLElement | null;
      if (!panel) {
        panel = doc.createElement("div");
        panel.id = "__manual_desc_panel__";
        panel.style.cssText =
          "position:fixed;top:0;right:0;width:260px;height:100vh;overflow-y:auto;background:#fffbeb;padding:16px;border-left:1px solid #fde68a;z-index:50;font-family:-apple-system,sans-serif;";
        panel.innerHTML = '<div style="font-size:14px;font-weight:600;color:#92400e;margin-bottom:12px;">功能说明</div>';
        doc.body.appendChild(panel);
      }
      container = panel;
    }

    const descEl = doc.createElement("div");
    descEl.className = "proto-desc __manual_proto_desc__";
    descEl.setAttribute("data-proto-id", String(nextId));
    descEl.style.cssText =
      "margin-bottom:12px;padding:12px;border-radius:8px;border:1px solid #fde68a;background:#fffbeb;position:relative;";
    descEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="display:inline-flex;width:20px;height:20px;border-radius:50%;background:#165DFF;color:#fff;font-size:12px;font-weight:bold;align-items:center;justify-content:center;flex-shrink:0;">${nextId}</span>
        <span data-annotate-title style="font-size:14px;font-weight:600;color:#92400e;">${escapeHtml(title)}</span>
      </div>
      <p data-annotate-body style="font-size:12px;line-height:1.6;color:#78350f;margin:0;">${escapeHtml(body).replace(/\n/g, "<br>")}</p>
    `;
    container.appendChild(descEl);

    pickedElRef.current = null;
    setDialog(null);
    // MutationObserver 会自动 redraw + 挂按钮
  }

  function cancelDialog() {
    pickedElRef.current = null;
    setDialog(null);
  }

  function applyEditsAndExit() {
    const out = getCurrentHtml();
    if (out) setHtml(out);
    setAnnotateMode(false);
    setDialog(null);
    pickedElRef.current = null;
    requestAnimationFrame(() => setIframeKey((k) => k + 1));
  }

  function exitWithoutApply() {
    setAnnotateMode(false);
    setDialog(null);
    pickedElRef.current = null;
    setIframeKey((k) => k + 1);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !dialog) {
        e.preventDefault();
        handleGenerate();
      }
      if (e.key === "Escape" && dialog) {
        cancelDialog();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, model, status, dialog]);

  return (
    <main className="h-screen flex flex-col">
      <header className="px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold">P</div>
          <div>
            <h1 className="text-base font-semibold">原型生成器</h1>
            <p className="text-xs text-gray-500">DeepSeek · prototype-html skill</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-500">模型</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={streaming}
            className="border border-gray-200 rounded-md px-2 py-1 text-sm bg-white disabled:opacity-50"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className={`flex-1 grid gap-px bg-gray-200 overflow-hidden ${annotateMode ? "grid-cols-1" : "grid-cols-2"}`}>
        <section className={`bg-white flex flex-col ${annotateMode ? "hidden" : ""}`}>
          <div className="p-5 flex-1 flex flex-col gap-4 overflow-y-auto">
            <div>
              <label className="text-sm font-medium text-gray-700">描述你想要的原型</label>
              <p className="text-xs text-gray-500 mt-1">越具体越好：主题、关键模块、想要标注的功能点、配色偏好等。</p>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例：电商后台的订单管理页面。需要 KPI 概览、状态 tabs、订单表格 + 详情侧滑面板。配色用蓝色主调。"
              className="flex-1 min-h-[200px] border border-gray-200 rounded-lg p-3 text-sm focus:border-brand focus:outline-none resize-none"
              disabled={streaming}
            />

            <div>
              <div className="text-xs text-gray-500 mb-2">快速示例（点击填入）</div>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setPrompt(ex)}
                    disabled={streaming}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-full hover:border-brand hover:text-brand disabled:opacity-40"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() && !streaming}
                className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {streaming ? "停止生成" : "生成原型"}
              </button>
              <span className="text-xs text-gray-400">⌘/Ctrl + Enter</span>
              {status === "streaming" && (
                <span className="text-xs text-brand animate-pulse">流式生成中…已 {html.length} 字符</span>
              )}
              {status === "done" && <span className="text-xs text-green-600">完成 · {html.length} 字符</span>}
              {status === "error" && <span className="text-xs text-red-500">错误：{error}</span>}
            </div>
          </div>
        </section>

        <section className="bg-white flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
              预览
              {annotateMode && (
                <span className="px-2 py-0.5 text-[11px] rounded bg-brand/10 text-brand">标注模式 · 点击元素新增，悬停说明卡片可编辑/删除</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!annotateMode ? (
                <button
                  onClick={() => setAnnotateMode(true)}
                  disabled={!cleanedHtml || streaming}
                  className="px-2.5 py-1 text-xs border border-brand text-brand rounded hover:bg-brand hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  开始标注
                </button>
              ) : (
                <>
                  <button
                    onClick={applyEditsAndExit}
                    className="px-2.5 py-1 text-xs bg-brand text-white rounded hover:bg-blue-700"
                  >
                    应用并退出
                  </button>
                  <button
                    onClick={exitWithoutApply}
                    className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                  >
                    放弃改动
                  </button>
                </>
              )}
              <span className="w-px h-4 bg-gray-200 mx-1" />
              <button
                onClick={handleCopy}
                disabled={!html}
                className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                复制代码
              </button>
              <button
                onClick={handleDownload}
                disabled={!html}
                className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                下载 HTML
              </button>
              <button
                onClick={handleOpenInNewTab}
                disabled={!previewSrcDoc}
                className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                新标签页打开
              </button>
            </div>
          </div>

          <div className="flex-1 relative bg-gray-50">
            {previewSrcDoc ? (
              <iframe
                ref={iframeRef}
                key={`${iframeKey}-${cleanedHtml.length}`}
                srcDoc={previewSrcDoc}
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-full border-0 bg-white"
                title="prototype preview"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                {status === "streaming" && !previewSrcDoc
                  ? "正在接收 HTML 开头… 等到 <!DOCTYPE 出现就会开始预览"
                  : "在左侧填入需求并点击「生成原型」"}
              </div>
            )}

            {dialog && (
              <div className="absolute inset-0 z-20 bg-black/30 flex items-center justify-center p-6" onClick={cancelDialog}>
                <div
                  className="bg-white rounded-xl shadow-xl w-full max-w-md p-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-sm font-semibold text-gray-800 mb-1">
                    {dialog.mode === "edit" ? `编辑标注 #${dialog.targetId}` : "为这个元素添加说明"}
                  </div>
                  <div className="text-xs text-gray-500 mb-4">
                    {dialog.mode === "edit" ? "修改后会更新右侧说明卡片，连线编号不变。" : "将自动给元素打 data-proto-id 并在说明区插入一条对应说明，连线会自动出现。"}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-600">标题</label>
                      <input
                        autoFocus
                        value={dialog.title}
                        onChange={(e) => setDialog({ ...dialog, title: e.target.value } as DialogState)}
                        placeholder="例：状态筛选 Tabs"
                        className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">说明</label>
                      <textarea
                        value={dialog.desc}
                        onChange={(e) => setDialog({ ...dialog, desc: e.target.value } as DialogState)}
                        placeholder="详细描述这个元素的功能、行为、对应的业务场景..."
                        rows={4}
                        className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-brand focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-5">
                    <button onClick={cancelDialog} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">
                      取消（Esc）
                    </button>
                    <button onClick={commitDialog} className="px-4 py-1.5 text-sm bg-brand text-white rounded hover:bg-blue-700">
                      {dialog.mode === "edit" ? "保存修改" : "添加标注"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {html && !annotateMode && (
            <details className="border-t border-gray-100 bg-gray-50">
              <summary className="px-4 py-2 text-xs text-gray-500 cursor-pointer hover:bg-gray-100">
                查看原始 HTML（{html.length} 字符）
              </summary>
              <pre className="px-4 py-2 text-[11px] leading-relaxed text-gray-700 max-h-60 overflow-auto whitespace-pre-wrap break-all">
                {html}
              </pre>
            </details>
          )}
        </section>
      </div>
    </main>
  );
}
