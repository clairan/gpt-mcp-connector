import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthContext } from "../auth.js";
import { registerShowWeek } from "./showWeek.js";
import { registerShowTrainingLog } from "./showTrainingLog.js";
import { registerProposeAddWorkout } from "./proposeAddWorkout.js";
import { registerApplyProposal } from "./applyProposal.js";

export function registerTools(server: McpServer, auth: AuthContext): void {
  registerShowWeek(server, auth);
  registerShowTrainingLog(server, auth);
  registerProposeAddWorkout(server, auth);
  registerApplyProposal(server, auth);
}
