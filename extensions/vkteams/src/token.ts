import { tryReadSecretFileSync } from "openclaw/plugin-sdk/core";
import type { OpenClawConfig } from "openclaw/plugin-sdk/vkteams";

const ENV_TOKEN = "VKTEAMS_BOT_TOKEN";

export function resolveVkTeamsToken(cfg: OpenClawConfig): { token: string; source?: string } {
  const section = cfg.channels?.vkteams as { token?: string; tokenFile?: string } | undefined;
  const tokenRef = section?.token?.trim();
  const tokenFile = section?.tokenFile?.trim();

  if (tokenFile) {
    const value = tryReadSecretFileSync(tokenFile, "VK Teams token file", { rejectSymlink: true });
    if (value) {
      return { token: value.trim(), source: "tokenFile" };
    }
  }

  if (tokenRef) {
    return { token: tokenRef, source: "token" };
  }

  const fromEnv = process.env[ENV_TOKEN];
  if (fromEnv && typeof fromEnv === "string") {
    return { token: fromEnv.trim(), source: "env" };
  }

  return { token: "" };
}
