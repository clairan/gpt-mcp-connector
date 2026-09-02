import React from "react";
import { useToolOutput } from "../shared/openai.js";
import { Card, Pill, Root, useTokens } from "../shared/ui.js";

interface WorkoutSummary {
  id: string;
  title: string;
  type: string;
  plannedDistanceKm?: number;
  plannedDurationMin?: number;
  status: "Schemalagt" | "Genomfört" | "Överhoppat";
  description?: string;
}
interface WeekDay {
  date: string;
  weekday: string;
  workouts: WorkoutSummary[];
}
interface WeekSchedule {
  programName: string;
  weekNumber: number;
  weekOfTotal: string;
  mondayDate: string;
  focus: string;
  days: WeekDay[];
}

export function WeekView() {
  const week = useToolOutput<WeekSchedule>();
  const t = useTokens();

  if (!week) return <Root>Laddar veckan…</Root>;

  return (
    <Root>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <strong>{week.programName}</strong>
        <Pill>{`Vecka ${week.weekNumber} · ${week.weekOfTotal}`}</Pill>
      </div>
      <p style={{ color: t.muted, marginTop: 4 }}>{week.focus}</p>

      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {week.days.map((day) => (
          <Card key={day.date}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 92, flexShrink: 0 }}>
                <div style={{ fontWeight: 600 }}>{day.weekday}</div>
                <div style={{ fontSize: 12, color: t.muted }}>{day.date.slice(5)}</div>
              </div>
              <div style={{ flex: 1, display: "grid", gap: 6 }}>
                {day.workouts.map((w) => (
                  <div key={w.id}>
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600 }}>{w.title}</span>
                      <Pill>{w.type}</Pill>
                      {w.plannedDistanceKm ? <Pill>{w.plannedDistanceKm} km</Pill> : null}
                      {w.plannedDurationMin ? <Pill>{w.plannedDurationMin} min</Pill> : null}
                      {w.status !== "Schemalagt" ? <Pill>{w.status}</Pill> : null}
                    </div>
                    {w.description ? (
                      <div style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>{w.description}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Root>
  );
}
