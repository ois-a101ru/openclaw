import type { ResolvedVkTeamsAccount } from "./accounts.js";
import { vkTeamsSendFile, vkTeamsSendText } from "./api.js";

export async function sendVkTeamsText(
  account: ResolvedVkTeamsAccount,
  params: { to: string; text: string; replyMsgId?: string },
): Promise<{ messageId?: string; ok: boolean }> {
  const res = await vkTeamsSendText(account, {
    chatId: params.to,
    text: params.text,
    replyMsgId: params.replyMsgId,
  });
  return { ok: res.ok, messageId: res.msgId };
}

export async function sendVkTeamsFile(
  account: ResolvedVkTeamsAccount,
  params: {
    to: string;
    file: Buffer | Blob;
    fileName?: string;
    caption?: string;
    replyMsgId?: string;
  },
): Promise<{ messageId?: string; ok: boolean }> {
  const res = await vkTeamsSendFile(account, {
    chatId: params.to,
    file: params.file,
    fileName: params.fileName,
    caption: params.caption,
    replyMsgId: params.replyMsgId,
  });
  return { ok: res.ok, messageId: res.msgId };
}
