import React from "react";
import { useToolOutput } from "../shared/openai.js";
import { Card, Pill, Root, useTokens } from "../shared/ui.js";

interface Entry {
  date: string;
  title: string;
  type: string;
  distanceKm: number;
  durationMin: number;
  feeling?: number;
  effort?: string;
  source?: string;
}
interface TrainingLog {
  from: string;
  to: string;
  totalDistanceKm: number;
  totalDurationMin: number;
  entries: Entry[];
}

export function TrainingLogView() {
  const log = useToolOutput<TrainingLog>();
  const t = useTokens();
  if (!log) return <Root>Laddar träningsloggen…</Root>;

  const maxKm = Math.max(1, ...log.entries.map((e) => e.distanceKm));

  return (
    <Root>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
        <strong>Träningslogg</strong>
        <Pill>{`${log.from.slice(5)}–${log.to.slice(5)}`}</Pill>
        <Pill>{`${log.totalDistanceKm} km`}</Pill>
        <Pill>{`${Math.round(log.totalDurationMin / 60 * 10) / 10} h`}</Pill>
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {log.entries.length === 0 ? (
          <Card>Inga genomförda pass i perioden.</Card>
        ) : (
          log.entries.map((e, i) => (
            <Card key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontWeight: 600 }}>{e.title}</span>
                <span style={{ color: t.muted, fontSize: 12 }}>{e.date.slice(5)}</span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: t.accent,
                  width: `${Math.max(6, (e.distanceKm / maxKm) * 100)}%`,
                  marginTop: 8,
                }}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                <Pill>{e.type}</Pill>
                <Pill>{e.distanceKm} km</Pill>
                <Pill>{e.durationMin} min</Pill>
                {e.effort ? <Pill>{e.effort}</Pill> : null}
                {e.feeling ? <Pill>{"★".repeat(e.feeling)}</Pill> : null}
                {e.source ? <Pill>{e.source}</Pill> : null}
              </div>
            </Card>
          ))
        )}
      </div>
    </Root>
  );
}
