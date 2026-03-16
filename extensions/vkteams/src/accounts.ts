import {
  createAccountListHelpers,
  DEFAULT_ACCOUNT_ID,
  normalizeAccountId,
  type OpenClawConfig,
} from "openclaw/plugin-sdk/vkteams";
import type { VkTeamsConfig } from "./config-schema.js";
import { resolveVkTeamsToken } from "./token.js";

export type ResolvedVkTeamsAccount = {
  accountId: string;
  enabled: boolean;
  token: string;
  apiUrlBase: string;
  config: VkTeamsConfig & { allowFrom?: string[] };
};

const { listAccountIds: listVkTeamsAccountIds, resolveDefaultAccountId: resolveDefaultVkTeamsAccountId } =
  createAccountListHelpers("vkteams");
export { listVkTeamsAccountIds, resolveDefaultVkTeamsAccountId };

const DEFAULT_API_BASE = "https://myteam.mail.ru/bot/v1";

function normalizeApiBase(raw: string | undefined): string {
  const s = raw?.trim();
  if (!s) {
    return DEFAULT_API_BASE;
  }
  const url = s.startsWith("http") ? s : `https://${s}`;
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function resolveVkTeamsAccount(params: {
  cfg: OpenClawConfig;
  accountId?: string | null;
}): ResolvedVkTeamsAccount {
  const accountId = normalizeAccountId(params.accountId) ?? DEFAULT_ACCOUNT_ID;
  const raw = (params.cfg.channels?.vkteams ?? {}) as VkTeamsConfig & { allowFrom?: string[] };
  const enabled = raw.enabled !== false;
  const tokenResolution = resolveVkTeamsToken(params.cfg);
  const allowFrom = Array.isArray(raw.allowFrom) ? raw.allowFrom : [];

  return {
    accountId,
    enabled,
    token: tokenResolution.token,
    apiUrlBase: normalizeApiBase(raw.apiUrlBase),
    config: { ...raw, allowFrom },
  };
}
