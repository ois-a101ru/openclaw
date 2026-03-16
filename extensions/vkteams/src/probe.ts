import type { ResolvedVkTeamsAccount } from "./accounts.js";
import { vkTeamsSelfGet } from "./api.js";

export type VkTeamsProbeResult = {
  ok: boolean;
  error?: string;
  elapsedMs: number;
  botNick?: string;
};

export async function probeVkTeams(
  account: ResolvedVkTeamsAccount,
  timeoutMs = 5000,
): Promise<VkTeamsProbeResult> {
  const start = Date.now();
  try {
    const res = await vkTeamsSelfGet(account);
    const elapsedMs = Date.now() - start;
    if (res.ok) {
      return { ok: true, elapsedMs, botNick: res.nick };
    }
    return {
      ok: false,
      error: res.description ?? "self/get returned ok: false",
      elapsedMs,
    };
  } catch (err) {
    const elapsedMs = Date.now() - start;
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      elapsedMs,
    };
  }
}
