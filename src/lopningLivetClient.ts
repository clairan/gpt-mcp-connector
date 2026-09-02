/**
 * Thin client for the real Löpning & Livet REST API.
 *
 * Every method takes the caller's OAuth access token so the backend can scope
 * the response to that member. Replace the `fetch` paths below with the real
 * endpoints — the shapes here mirror what the existing Löpning & Livet MCP
 * server already returns (get_schedule, get_training_log, propose_add_workouts).
 *
 * When `USE_MOCK_BACKEND=true` the client serves canned data so the app runs
 * end to end (ChatGPT -> MCP -> widget) without a backend or real login.
 */

import { config } from "./config.js";

export interface WeekDay {
  date: string; // ISO yyyy-mm-dd
  weekday: string; // "Mån" ... "Sön"
  workouts: WorkoutSummary[];
}

export interface WorkoutSummary {
  id: string;
  title: string;
  type: string; // "Lugnt", "Intervaller", "Långpass", "Vila", "Eget pass" ...
  plannedDistanceKm?: number;
  plannedDurationMin?: number;
  status: "Schemalagt" | "Genomfört" | "Överhoppat";
  description?: string;
}

export interface WeekSchedule {
  programName: string;
  weekNumber: number;
  weekOfTotal: string; // "3 av 12"
  mondayDate: string;
  focus: string;
  days: WeekDay[];
  // Allows the object to be passed straight through as MCP `structuredContent`.
  [key: string]: unknown;
}

export interface TrainingLogEntry {
  date: string;
  title: string;
  type: string;
  distanceKm: number;
  durationMin: number;
  feeling?: 1 | 2 | 3 | 4 | 5;
  effort?: "Lätt" | "Medel" | "Svårt";
  source?: "Manuell" | "Strava" | "Garmin";
}

export interface TrainingLog {
  from: string;
  to: string;
  totalDistanceKm: number;
  totalDurationMin: number;
  entries: TrainingLogEntry[];
  [key: string]: unknown;
}

export interface ProposalResult {
  proposalId: string;
  summary: string;
  addedWorkouts: { date: string; title: string; type: string }[];
  status: "pending_confirmation" | "applied";
  [key: string]: unknown;
}

class LopningLivetClient {
  async getWeek(token: string, which: "this" | "next"): Promise<WeekSchedule> {
    if (config.backend.useMock) return mockWeek(which);
    return this.get<WeekSchedule>(token, `/v1/schedule/week?which=${which}`);
  }

  async getTrainingLog(token: string, days: number): Promise<TrainingLog> {
    if (config.backend.useMock) return mockLog(days);
    return this.get<TrainingLog>(token, `/v1/training-log?days=${days}`);
  }

  async proposeAddWorkout(
    token: string,
    input: { date: string; type: string; distanceKm?: number; durationMin?: number; note?: string },
  ): Promise<ProposalResult> {
    if (config.backend.useMock) return mockProposal(input);
    return this.post<ProposalResult>(token, `/v1/proposals/add-workout`, input);
  }

  async applyProposal(token: string, proposalId: string): Promise<ProposalResult> {
    if (config.backend.useMock) {
      return {
        proposalId,
        summary: "Passet lades till i programmet.",
        addedWorkouts: [],
        status: "applied",
      };
    }
    return this.post<ProposalResult>(token, `/v1/proposals/${encodeURIComponent(proposalId)}/apply`, {});
  }

  private async get<T>(token: string, path: string): Promise<T> {
    const res = await fetch(`${config.backend.apiBaseUrl}${path}`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Löpning & Livet API ${res.status} for GET ${path}`);
    return (await res.json()) as T;
  }

  private async post<T>(token: string, path: string, body: unknown): Promise<T> {
    const res = await fetch(`${config.backend.apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Löpning & Livet API ${res.status} for POST ${path}`);
    return (await res.json()) as T;
  }
}

export const lopningLivet = new LopningLivetClient();

// --------------------------------------------------------------------------
// Mock data
// --------------------------------------------------------------------------

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function mondayOffset(which: "this" | "next"): number {
  const today = new Date();
  const day = (today.getUTCDay() + 6) % 7; // 0 = Monday
  return which === "this" ? -day : 7 - day;
}

const WEEKDAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

function mockWeek(which: "this" | "next"): WeekSchedule {
  const start = mondayOffset(which);
  const plan: Array<Omit<WorkoutSummary, "id" | "status">> = [
    { title: "Lugn löpning", type: "Lugnt", plannedDistanceKm: 6, plannedDurationMin: 38 },
    { title: "Vila", type: "Vila" },
    { title: "Intervaller 5x800 m", type: "Intervaller", plannedDistanceKm: 8, plannedDurationMin: 45, description: "800 m i 5k-fart, 2 min jogg vila." },
    { title: "Lugn löpning", type: "Lugnt", plannedDistanceKm: 6, plannedDurationMin: 38 },
    { title: "Vila", type: "Vila" },
    { title: "Långpass", type: "Långpass", plannedDistanceKm: 16, plannedDurationMin: 100 },
    { title: "Lugn löpning + rörlighet", type: "Lugnt", plannedDistanceKm: 5, plannedDurationMin: 32 },
  ];
  return {
    programName: "Maraton 42,2k – 12 veckor",
    weekNumber: 3,
    weekOfTotal: "3 av 12",
    mondayDate: isoDate(start),
    focus: "Bygg grundvolym, första riktiga intervallpasset.",
    days: plan.map((w, i) => ({
      date: isoDate(start + i),
      weekday: WEEKDAYS[i]!,
      workouts: [
        {
          ...w,
          id: `w-${which}-${i}`,
          status: which === "this" && start + i < 0 ? "Genomfört" : "Schemalagt",
        },
      ],
    })),
  };
}

function mockLog(days: number): TrainingLog {
  const entries: TrainingLogEntry[] = ([
    { date: isoDate(-1), title: "Lugn löpning", type: "Lugnt", distanceKm: 6.1, durationMin: 39, feeling: 4, effort: "Lätt", source: "Garmin" },
    { date: isoDate(-3), title: "Tröskelpass 3x2 km", type: "Tröskel", distanceKm: 9.4, durationMin: 52, feeling: 3, effort: "Svårt", source: "Strava" },
    { date: isoDate(-5), title: "Långpass", type: "Långpass", distanceKm: 15.2, durationMin: 96, feeling: 4, effort: "Medel", source: "Garmin" },
    { date: isoDate(-6), title: "Lugn löpning", type: "Lugnt", distanceKm: 5.0, durationMin: 33, feeling: 5, effort: "Lätt", source: "Manuell" },
  ] as TrainingLogEntry[]).filter((e) => {
    const age = (Date.now() - new Date(e.date).getTime()) / 86_400_000;
    return age <= days;
  });
  return {
    from: isoDate(-days),
    to: isoDate(0),
    totalDistanceKm: Number(entries.reduce((s, e) => s + e.distanceKm, 0).toFixed(1)),
    totalDurationMin: entries.reduce((s, e) => s + e.durationMin, 0),
    entries,
  };
}

function mockProposal(input: {
  date: string;
  type: string;
  distanceKm?: number;
  durationMin?: number;
}): ProposalResult {
  return {
    proposalId: `prop-${Date.now()}`,
    summary: `Lägg till ${input.type}${input.distanceKm ? ` ${input.distanceKm} km` : ""} den ${input.date}.`,
    addedWorkouts: [{ date: input.date, title: `${input.type} (eget pass)`, type: input.type }],
    status: "pending_confirmation",
  };
}
