/**
 * Minimal typing + React hooks for the `window.openai` host bridge that the
 * Apps SDK injects into every widget iframe.
 */
import { useEffect, useState } from "react";

export type DisplayMode = "inline" | "pip" | "fullscreen";

export interface OpenAiGlobals<ToolOutput = unknown, ToolInput = unknown, WidgetState = unknown> {
  toolInput: ToolInput;
  toolOutput: ToolOutput | null;
  widgetState: WidgetState | null;
  theme: "light" | "dark";
  locale: string;
  displayMode: DisplayMode;
  maxHeight: number;

  setWidgetState: (state: WidgetState) => Promise<void>;
  callTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ content: unknown[]; structuredContent?: unknown }>;
  sendFollowupMessage: (args: { prompt: string }) => Promise<void>;
  requestDisplayMode: (args: { mode: DisplayMode }) => Promise<{ mode: DisplayMode }>;
}

declare global {
  interface Window {
    openai: OpenAiGlobals;
  }
  interface WindowEventMap {
    "openai:set_globals": CustomEvent<{ globals: Partial<OpenAiGlobals> }>;
  }
}

/** Subscribe to one host global, re-rendering when the host updates it. */
export function useOpenAiGlobal<K extends keyof OpenAiGlobals>(key: K): OpenAiGlobals[K] {
  const [value, setValue] = useState<OpenAiGlobals[K]>(() => window.openai?.[key]);
  useEffect(() => {
    const onChange = (e: WindowEventMap["openai:set_globals"]) => {
      if (key in e.detail.globals) setValue(window.openai[key]);
    };
    window.addEventListener("openai:set_globals", onChange);
    return () => window.removeEventListener("openai:set_globals", onChange);
  }, [key]);
  return value;
}

export function useToolOutput<T>(): T | null {
  return useOpenAiGlobal("toolOutput") as T | null;
}
