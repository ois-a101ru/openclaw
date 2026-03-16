/**
 * VK Teams long-polling monitor: GET /events/get loop, map events to inbound, dispatch reply.
 */

import type { OpenClawConfig } from "openclaw/plugin-sdk/vkteams";
import {
  createScopedPairingAccess,
  issuePairingChallenge,
  PAIRING_APPROVED_MESSAGE,
  resolveDirectDmAuthorizationOutcome,
  resolveInboundRouteEnvelopeBuilderWithRuntime,
  resolveSenderCommandAuthorizationWithRuntime,
} from "openclaw/plugin-sdk/vkteams";
import type { ResolvedVkTeamsAccount } from "./accounts.js";
import { vkTeamsEventsGet, vkTeamsSendText, type VkTeamsEventPayload } from "./api.js";
import { getVkTeamsRuntime } from "./runtime.js";

const POLL_TIME_S = 60;
const POLL_TIMEOUT_MS = (POLL_TIME_S + 20) * 1000;

function isAllowedSender(allowFrom: string[], senderId: string, chatId: string): boolean {
  if (allowFrom.length === 0) {
    return true;
  }
  const normalized = allowFrom.map((e) => String(e).trim().toLowerCase()).filter(Boolean);
  const sid = String(senderId).trim().toLowerCase();
  const cid = String(chatId).trim().toLowerCase();
  return normalized.some((e) => e === sid || e === cid);
}

async function processNewMessage(
  payload: VkTeamsEventPayload,
  account: ResolvedVkTeamsAccount,
  config: OpenClawConfig,
  runtime: { log?: (s: string) => void; error?: (s: string) => void },
): Promise<void> {
  const core = getVkTeamsRuntime();
  const chat = payload.chat;
  const from = payload.from;
  const text = (payload.text ?? "").trim();
  const msgId = payload.msgId ?? "";
  if (!chat?.chatId) {
    return;
  }
  const chatId = chat.chatId;
  const chatType = chat.type ?? "private";
  const isGroup = chatType === "group" || chatType === "channel";
  const senderId = from?.userId ?? from?.nick ?? "";
  const senderName = [from?.firstName, from?.lastName].filter(Boolean).join(" ").trim() || undefined;

  const allowFrom = (account.config.allowFrom ?? []).map((e) => String(e).trim()).filter(Boolean);
  if (!isAllowedSender(allowFrom, senderId, chatId)) {
    runtime.log?.(`[vkteams] drop message from non-allowlisted sender ${senderId} in ${chatId}`);
    return;
  }

  const dmPolicy = (account.config as { dmPolicy?: string }).dmPolicy ?? "open";
  const pairing = createScopedPairingAccess({
    core,
    channel: "vkteams",
    accountId: account.accountId,
  });
  const configAllowFrom = allowFrom;
  const { senderAllowedForCommands, commandAuthorized } =
    await resolveSenderCommandAuthorizationWithRuntime({
      cfg: config,
      rawBody: text,
      isGroup,
      dmPolicy,
      configuredAllowFrom: configAllowFrom,
      configuredGroupAllowFrom: configAllowFrom,
      senderId,
      isSenderAllowed: () => isAllowedSender(configAllowFrom, senderId, chatId),
      readAllowFromStore: pairing.readAllowFromStore,
      runtime: core.channel.commands,
    });

  const directDmOutcome = resolveDirectDmAuthorizationOutcome({
    isGroup,
    dmPolicy,
    senderAllowedForCommands,
  });
  if (directDmOutcome === "disabled") {
    runtime.log?.(`[vkteams] blocked DM from ${senderId} (dmPolicy=disabled)`);
    return;
  }
  if (directDmOutcome === "unauthorized") {
    if (dmPolicy === "pairing") {
      await issuePairingChallenge({
        channel: "vkteams",
        senderId,
        senderIdLine: `Your VK Teams user id: ${senderId}`,
        meta: { name: senderName },
        upsertPairingRequest: pairing.upsertPairingRequest,
        onCreated: () => runtime.log?.(`[vkteams] pairing request sender=${senderId}`),
        sendPairingReply: async (msgText) => {
          await vkTeamsSendText(account, { chatId, text: msgText });
        },
        onReplyError: (err) => runtime.log?.(`[vkteams] pairing reply failed: ${String(err)}`),
      });
    }
    return;
  }

  const { route, buildEnvelope } = resolveInboundRouteEnvelopeBuilderWithRuntime({
    cfg: config,
    channel: "vkteams",
    accountId: account.accountId,
    peer: { kind: isGroup ? "group" : "direct", id: chatId },
    runtime: core.channel,
    sessionStore: config.session?.store,
  });

  const fromLabel = isGroup ? `group:${chatId}` : senderName || `user:${senderId}`;
  const rawBody = text || "(no text)";
  const { storePath, body } = buildEnvelope({
    channel: "VK Teams",
    from: fromLabel,
    body: rawBody,
  });

  const ctxPayload = core.channel.reply.finalizeInboundContext({
    Body: body,
    BodyForAgent: rawBody,
    RawBody: rawBody,
    CommandBody: rawBody,
    From: isGroup ? `vkteams:group:${chatId}` : `vkteams:${senderId}`,
    To: `vkteams:${chatId}`,
    SessionKey: route.sessionKey,
    AccountId: route.accountId,
    ChatType: isGroup ? "group" : "direct",
    ConversationLabel: fromLabel,
    SenderName: senderName,
    SenderId: senderId,
    CommandAuthorized: commandAuthorized,
    Provider: "vkteams",
    Surface: "vkteams",
    MessageSid: msgId,
    OriginatingChannel: "vkteams",
    OriginatingTo: `vkteams:${chatId}`,
  });

  await core.channel.session.recordInboundSession({
    storePath,
    sessionKey: ctxPayload.SessionKey ?? route.sessionKey,
    ctx: ctxPayload,
    onRecordError: (err) => runtime.error?.(`[vkteams] session meta: ${String(err)}`),
  });

  await core.channel.reply.dispatchReplyWithBufferedBlockDispatcher({
    ctx: ctxPayload,
    cfg: config,
    dispatcherOptions: {
      deliver: async (deliverPayload: { text?: string }) => {
        const replyText = deliverPayload?.text?.trim();
        if (!replyText) {
          return;
        }
        await vkTeamsSendText(account, {
          chatId,
          text: replyText,
          replyMsgId: msgId || undefined,
        });
      },
    },
  });
}

export async function runVkTeamsPolling(params: {
  account: ResolvedVkTeamsAccount;
  config: OpenClawConfig;
  abortSignal: AbortSignal;
  runtime: { log?: (s: string) => void; error?: (s: string) => void };
  setStatus?: (patch: { lastInboundAt?: number }) => void;
}): Promise<void> {
  const { account, config, abortSignal, runtime, setStatus } = params;
  let lastEventId = 0;

  runtime.log?.(`[${account.accountId}] VK Teams polling started (base: ${account.apiUrlBase})`);

  while (!abortSignal.aborted) {
    try {
      const res = await vkTeamsEventsGet(
        account,
        { pollTime: POLL_TIME_S, lastEventId },
        abortSignal,
      );
      if (res.events && res.events.length > 0) {
        setStatus?.({ lastInboundAt: Date.now() });
        for (const ev of res.events) {
          lastEventId = Math.max(lastEventId, ev.eventId);
          const type = ev.payload?.type;
          if (type === "newMessage" || type === "editedMessage") {
            await processNewMessage(ev.payload, account, config, runtime);
          }
        }
      }
    } catch (err) {
      if (abortSignal.aborted) {
        break;
      }
      runtime.error?.(
        `[${account.accountId}] VK Teams poll error: ${err instanceof Error ? err.message : String(err)}`,
      );
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  runtime.log?.(`[${account.accountId}] VK Teams polling stopped`);
}
