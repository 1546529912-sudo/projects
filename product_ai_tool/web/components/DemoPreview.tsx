"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  parseDemoMessage,
  type DemoPostMessagePayload,
} from "@/lib/protocol";

type DemoPreviewProps = {
  html: string | null;
  onProtocolMessage?: (msg: DemoPostMessagePayload) => void;
  /** When true, pointer events pass through to iframe (preview). When false, reserved for annotation overlay. */
  previewMode: boolean;
};

const IFRAME_SANDBOX =
  "allow-scripts allow-forms allow-popups allow-modals allow-downloads";

export function DemoPreview({
  html,
  onProtocolMessage,
  previewMode,
}: DemoPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const srcDoc = useMemo(() => html ?? "", [html]);

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (iframeRef.current && ev.source !== iframeRef.current.contentWindow) {
        return;
      }
      const parsed = parseDemoMessage(ev.data);
      if (parsed) onProtocolMessage?.(parsed);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onProtocolMessage]);

  if (!html) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-xl border border-black bg-white px-6 text-center text-sm text-[#4b4b4b]">
        暂无 Demo。在左侧输入需求并点击「生成 Demo」，或选择「离线示例」。
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-xl border border-black bg-white shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
      <iframe
        ref={iframeRef}
        title="Demo preview"
        className="block h-full w-full min-h-[360px] border-0 bg-white"
        srcDoc={srcDoc}
        sandbox={IFRAME_SANDBOX}
      />
      {/* 标注模式预留：后续在 overlay 上捕获点击，不写入 iframe HTML */}
      {!previewMode && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-black/20 ring-inset"
          aria-hidden
        />
      )}
    </div>
  );
}
