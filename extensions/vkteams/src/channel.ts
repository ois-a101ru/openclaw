import { formatAllowFromLowercase, mapAllowFromEntries } from "openclaw/plugin-sdk/compat";
import {
  buildChannelConfigSchema,
  collectStatusIssuesFromLastError,
  createAccountListHelpers,
  DEFAULT_ACCOUNT_ID,
  PAIRING_APPROVED_MESSAGE,
  type ChannelPlugin,
  type OpenClawConfig,
} from "openclaw/plugin-sdk/vkteams";
import { VkTeamsConfigSchema } from "./config-schema.js";
import {
  listVkTeamsAccountIds,
  resolveDefaultVkTeamsAccountId,
  resolveVkTeamsAccount,
  type ResolvedVkTeamsAccount,
} from "./accounts.js";
import { runVkTeamsPolling } from "./monitor.js";
import { probeVkTeams } from "./probe.js";
import { sendVkTeamsFile, sendVkTeamsText } from "./send.js";

const meta = {
  id: "vkteams",
  label: "VK Teams",
  selectionLabel: "VK Teams (Bot API)",
  docsPath: "/channels/vkteams",
  docsLabel: "vkteams",
  blurb: "VK Teams Bot API; long polling. Default server from official docs (myteam.mail.ru).",
  aliases: ["vk-teams"],
  order: 85,
};

const { listAccountIds: listVkTeamsAccountIdsFromHelpers } = createAccountListHelpers("vkteams");

function normalizeAllowEntry(entry: string): string {
  return entry.replace(/^(vkteams|vk-teams):/i, "").trim();
}

export const vkteamsPlugin: ChannelPlugin<ResolvedVkTeamsAccount> = {
  id: "vkteams",
  meta: { ...meta, aliases: [...meta.aliases] },
  capabilities: {
    chatTypes: ["direct", "group", "channel"],
    media: true,
    blockStreaming: true,
  },
  reload: { configPrefixes: ["channels.vkteams"] },
  configSchema: buildChannelConfigSchema(VkTeamsConfigSchema),
  config: {
    listAccountIds: (cfg) => listVkTeamsAccountIds(cfg),
    resolveAccount: (cfg, accountId) => resolveVkTeamsAccount({ cfg, accountId }),
    defaultAccountId: (cfg) => resolveDefaultVkTeamsAccountId(cfg) ?? DEFAULT_ACCOUNT_ID,
    setAccountEnabled: ({ cfg, enabled }) => ({
      ...cfg,
      channels: {
        ...cfg.channels,
        vkteams: { ...(cfg.channels?.vkteams as Record<string, unknown> | undefined), enabled },
      },
    }),
    deleteAccount: ({ cfg }) => {
      const next = { ...cfg } as OpenClawConfig;
      const ch = { ...cfg.channels };
      delete (ch as Record<string, unknown>).vkteams;
      next.channels = Object.keys(ch).length > 0 ? ch : undefined;
      return next;
    },
    isConfigured: (_account, cfg) => {
      const a = resolveVkTeamsAccount({ cfg });
      return Boolean(a.token?.trim());
    },
    describeAccount: (account) => ({
      accountId: account.accountId,
      enabled: account.enabled,
      configured: Boolean(account.token?.trim()),
    }),
    resolveAllowFrom: ({ cfg }) =>
      mapAllowFromEntries((resolveVkTeamsAccount({ cfg }).config.allowFrom ?? [])),
    formatAllowFrom: ({ allowFrom }) =>
      formatAllowFromLowercase({ allowFrom, stripPrefixRe: /^(vkteams|vk-teams):/i }),
    resolveDefaultTo: ({ cfg }) =>
      (resolveVkTeamsAccount({ cfg }).config.defaultTo as string | undefined)?.trim() ?? undefined,
  },
  status: {
    collectStatusIssues: (accounts) => collectStatusIssuesFromLastError("vkteams", accounts),
  },
  gateway: {
    startAccount: async (ctx) => {
      const account = ctx.account as ResolvedVkTeamsAccount;
      if (!account.token?.trim()) {
        ctx.log?.warn?.(
          `[${account.accountId}] VK Teams token missing; start skipped`,
        );
        return;
      }
      try {
        const probe = await probeVkTeams(account);
        if (!probe.ok) {
          ctx.log?.warn?.(
            `[${account.accountId}] VK Teams probe failed: ${probe.error}`,
          );
        }
        ctx.setStatus({
          accountId: account.accountId,
          enabled: account.enabled,
          configured: true,
          lastError: probe.ok ? null : probe.error,
        });
      } catch (err) {
        ctx.log?.warn?.(
          `[${account.accountId}] VK Teams probe error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      await runVkTeamsPolling({
        account,
        config: ctx.cfg,
        abortSignal: ctx.abortSignal,
        runtime: ctx.runtime ?? {},
        setStatus: (patch) => ctx.setStatus({ ...ctx.getStatus(), ...patch }),
      });
    },
  },
  pairing: {
    idLabel: "vkteamsUserId",
    normalizeAllowEntry,
    notifyApproval: async ({ cfg, id }) => {
      const account = resolveVkTeamsAccount({ cfg });
      if (!account.token) {
        throw new Error("VK Teams token not configured");
      }
      const chatId = normalizeAllowEntry(id);
      await sendVkTeamsText(account, { to: chatId, text: PAIRING_APPROVED_MESSAGE });
    },
  },
  outbound: {
    deliveryMode: "direct",
    textChunkLimit: 4000,
    sendText: async ({ to, text, accountId, cfg, replyToId }) => {
      const account = resolveVkTeamsAccount({ cfg, accountId });
      const target = (to ?? "").replace(/^(vkteams|vk-teams):/i, "").trim();
      if (!target) {
        throw new Error("VK Teams sendText: missing target");
      }
      const result = await sendVkTeamsText(account, {
        to: target,
        text,
        replyMsgId: replyToId as string | undefined,
      });
      return { channel: "vkteams", messageId: result.messageId ?? "" };
    },
    sendMedia: async ({ to, mediaUrl, mediaPath, text, accountId, cfg, replyToId }) => {
      const account = resolveVkTeamsAccount({ cfg, accountId });
      const target = (to ?? "").replace(/^(vkteams|vk-teams):/i, "").trim();
      if (!target) {
        throw new Error("VK Teams sendMedia: missing target");
      }
      let file: Buffer | Blob;
      let fileName: string | undefined;
      if (mediaPath) {
        const fs = await import("node:fs/promises");
        file = await fs.readFile(mediaPath);
        fileName = mediaPath.split("/").pop() ?? mediaPath.split("\\").pop();
      } else if (mediaUrl) {
        const res = await fetch(mediaUrl);
        if (!res.ok) {
          throw new Error(`VK Teams sendMedia: fetch failed ${res.status}`);
        }
        file = await res.blob();
        const disp = res.headers.get("content-disposition");
        const m = disp?.match(/filename="?([^";]+)"?/);
        fileName = m?.[1];
      } else {
        throw new Error("VK Teams sendMedia: need mediaUrl or mediaPath");
      }
      const result = await sendVkTeamsFile(account, {
        to: target,
        file,
        fileName,
        caption: text?.trim(),
        replyMsgId: replyToId as string | undefined,
      });
      return { channel: "vkteams", messageId: result.messageId ?? "" };
    },
  },
};
