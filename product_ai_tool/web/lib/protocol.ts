/** Messages emitted by Demo HTML inside the iframe (see 产品功能开发.md §2.2). */

export type DemoMessageType =
  | "DEMO_READY"
  | "DEMO_PAGE_CHANGE"
  | "DEMO_STATE_CHANGE"
  | "DEMO_ACTION";

export type DemoReadyPayload = {
  type: "DEMO_READY";
  pageKey: string;
  stateKey?: string;
  demoId?: string;
};

export type DemoPageChangePayload = {
  type: "DEMO_PAGE_CHANGE";
  pageKey: string;
  stateKey?: string;
};

export type DemoStateChangePayload = {
  type: "DEMO_STATE_CHANGE";
  pageKey: string;
  stateKey: string;
};

export type DemoActionPayload = {
  type: "DEMO_ACTION";
  name: string;
  detail?: Record<string, unknown>;
};

export type DemoPostMessagePayload =
  | DemoReadyPayload
  | DemoPageChangePayload
  | DemoStateChangePayload
  | DemoActionPayload;

export function parseDemoMessage(data: unknown): DemoPostMessagePayload | null {
  if (!data || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  const type = rec.type;
  if (typeof type !== "string") return null;
  if (
    type !== "DEMO_READY" &&
    type !== "DEMO_PAGE_CHANGE" &&
    type !== "DEMO_STATE_CHANGE" &&
    type !== "DEMO_ACTION"
  ) {
    return null;
  }
  return data as DemoPostMessagePayload;
}
