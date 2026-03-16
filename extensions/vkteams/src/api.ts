/**
 * VK Teams Bot API client: events/get, sendText, sendFile, self/get.
 * Base URL default: https://myteam.mail.ru/bot/v1 (official cloud)
 */

import type { ResolvedVkTeamsAccount } from "./accounts.js";

export type VkTeamsEventsResponse = {
  ok: boolean;
  description?: string;
  events?: Array<{ eventId: number; payload: VkTeamsEventPayload }>;
};

export type VkTeamsEventPayload = {
  type: string;
  msgId?: string;
  text?: string;
  format?: unknown;
  chat?: { chatId: string; type: string };
  from?: { userId?: string; firstName?: string; lastName?: string; nick?: string };
  message?: { msgId?: string; chat?: { chatId: string; type: string } };
  queryId?: string;
  callbackData?: string;
};

export type VkTeamsSendTextResponse = { ok: boolean; msgId?: string; description?: string };
export type VkTeamsSendFileResponse = { ok: boolean; msgId?: string; fileId?: string; description?: string };
export type VkTeamsSelfResponse = { ok: boolean; nick?: string; description?: string };

function buildUrl(base: string, path: string, params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") {
      search.set(k, String(v));
    }
  }
  const q = search.toString();
  return q ? `${base}${path}?${q}` : `${base}${path}`;
}

export async function vkTeamsEventsGet(
  account: ResolvedVkTeamsAccount,
  params: { pollTime?: number; lastEventId?: number },
  signal?: AbortSignal,
): Promise<VkTeamsEventsResponse> {
  const url = buildUrl(account.apiUrlBase + "/", "events/get", {
    token: account.token,
    pollTime: params.pollTime ?? 60,
    lastEventId: params.lastEventId ?? 0,
  });
  const res = await fetch(url, { signal });
  return (await res.json()) as VkTeamsEventsResponse;
}

export async function vkTeamsSendText(
  account: ResolvedVkTeamsAccount,
  params: { chatId: string; text: string; replyMsgId?: string },
): Promise<VkTeamsSendTextResponse> {
  const url = buildUrl(account.apiUrlBase + "/", "messages/sendText", {
    token: account.token,
    chatId: params.chatId,
    text: params.text,
    replyMsgId: params.replyMsgId,
  });
  const res = await fetch(url);
  return (await res.json()) as VkTeamsSendTextResponse;
}

export async function vkTeamsSendFile(
  account: ResolvedVkTeamsAccount,
  params: {
    chatId: string;
    file: Buffer | Blob;
    fileName?: string;
    caption?: string;
    replyMsgId?: string;
  },
): Promise<VkTeamsSendFileResponse> {
  const form = new FormData();
  form.set("token", account.token);
  form.set("chatId", params.chatId);
  if (params.caption) {
    form.set("caption", params.caption);
  }
  if (params.replyMsgId) {
    form.set("replyMsgId", params.replyMsgId);
  }
  const blob = params.file instanceof Buffer ? new Blob([params.file]) : params.file;
  form.set("file", blob, params.fileName ?? "file");

  const url = `${account.apiUrlBase}/messages/sendFile`;
  const res = await fetch(url, { method: "POST", body: form });
  return (await res.json()) as VkTeamsSendFileResponse;
}

export async function vkTeamsSelfGet(account: ResolvedVkTeamsAccount): Promise<VkTeamsSelfResponse> {
  const url = buildUrl(account.apiUrlBase + "/", "self/get", { token: account.token });
  const res = await fetch(url);
  return (await res.json()) as VkTeamsSelfResponse;
}
