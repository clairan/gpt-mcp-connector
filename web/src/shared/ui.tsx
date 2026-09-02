/** Shared, theme-aware styling primitives for the widgets. */
import React from "react";
import { useOpenAiGlobal } from "./openai.js";

const palette = {
  light: {
    bg: "#ffffff",
    card: "#f6f7f9",
    border: "#e4e7eb",
    text: "#1f2328",
    muted: "#6b7280",
    accent: "#0b7d3b",
  },
  dark: {
    bg: "#1e1f22",
    card: "#26282c",
    border: "#3a3d42",
    text: "#f2f3f5",
    muted: "#9aa0a6",
    accent: "#4ade80",
  },
};

export function useTokens() {
  const theme = useOpenAiGlobal("theme") ?? "light";
  return palette[theme];
}

export function Root({ children }: { children: React.ReactNode }) {
  const t = useTokens();
  return (
    <div
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: t.text,
        background: t.bg,
        borderRadius: 12,
        padding: 16,
        lineHeight: 1.45,
      }}
    >
      {children}
    </div>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  const t = useTokens();
  return (
    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: 12 }}>
      {children}
    </div>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  const t = useTokens();
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 12,
        padding: "2px 8px",
        borderRadius: 999,
        border: `1px solid ${t.border}`,
        color: t.muted,
      }}
    >
      {children}
    </span>
  );
}
