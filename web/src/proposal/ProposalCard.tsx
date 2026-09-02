import React, { useState } from "react";
import { useToolOutput, useOpenAiGlobal } from "../shared/openai.js";
import { Card, Pill, Root, useTokens } from "../shared/ui.js";

interface ProposalResult {
  proposalId: string;
  summary: string;
  addedWorkouts: { date: string; title: string; type: string }[];
  status: "pending_confirmation" | "applied";
}

export function ProposalCard() {
  const proposal = useToolOutput<ProposalResult>();
  const widgetState = useOpenAiGlobal("widgetState") as { applied?: boolean } | null;
  const t = useTokens();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!proposal) return <Root>Laddar förslag…</Root>;

  const applied = proposal.status === "applied" || widgetState?.applied;

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await window.openai.callTool("apply_proposal", { proposalId: proposal!.proposalId });
      await window.openai.setWidgetState({ applied: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte bekräfta förslaget.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Root>
      <strong>Förslag: lägg till pass</strong>
      <p style={{ color: t.muted, marginTop: 4 }}>{proposal.summary}</p>

      <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
        {proposal.addedWorkouts.map((w, i) => (
          <Card key={i}>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600 }}>{w.title}</span>
              <Pill>{w.type}</Pill>
              <Pill>{w.date}</Pill>
            </div>
          </Card>
        ))}
      </div>

      {error ? <p style={{ color: "#d64545", marginTop: 8 }}>{error}</p> : null}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {applied ? (
          <Pill>✓ Tillagt i programmet</Pill>
        ) : (
          <>
            <button
              onClick={confirm}
              disabled={busy}
              style={{
                background: t.accent,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 14px",
                fontWeight: 600,
                cursor: busy ? "default" : "pointer",
              }}
            >
              {busy ? "Bekräftar…" : "Bekräfta"}
            </button>
            <button
              onClick={() => window.openai.sendFollowupMessage({ prompt: "Avbryt förslaget, lägg inte till passet." })}
              disabled={busy}
              style={{
                background: "transparent",
                color: t.text,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                padding: "8px 14px",
                cursor: "pointer",
              }}
            >
              Avbryt
            </button>
          </>
        )}
      </div>
    </Root>
  );
}
