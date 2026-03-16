---
summary: "VK Teams Bot API plugin setup and configuration"
read_when:
  - You want to connect OpenClaw to VK Teams
  - You need VK Teams bot token and API base URL
title: VK Teams
---

# VK Teams (plugin)

VK Teams connects to OpenClaw via the [VK Teams Bot API](https://teams.vk.com/botapi/). The plugin uses **long polling** to receive events (no webhook). You configure a bot token and, optionally, a custom API base URL (e.g. for On-Premise or custom deployments).

Status: supported via plugin. Direct messages, group chats, and channels are supported. Text and file sending are supported.

## Plugin required

Install the VK Teams plugin:

```bash
openclaw plugins install @openclaw/vkteams
```

Local checkout (when running from a git repo):

```bash
openclaw plugins install ./extensions/vkteams
```

## Setup

1. In VK Teams, open a chat with **Metabot** (search for Metabot or open [Metabot profile](https://teams.vk.com/profile/70001)).
2. Send the command `/newbot` and follow the instructions to create your bot.
3. Save the **token** you receive.
4. For **cloud** VK Teams the default API base is `https://myteam.mail.ru/bot/v1` (see [official docs](https://teams.vk.com/botapi/)). For **custom/On-Premise**, set `channels.vkteams.apiUrlBase` to your server URL.

Note: A bot can reply only after the user has added it to contacts or started the conversation first.

## Configure

Minimal config (default account, token in config):

```json5
{
  channels: {
    vkteams: {
      enabled: true,
      token: "YOUR_BOT_TOKEN",
      // Optional: for custom/On-Premise server (default: https://myteam.mail.ru/bot/v1)
      // apiUrlBase: "https://your-server/bot/v1",
      allowFrom: [],
    },
  },
}
```

With allowlist (only these users/chats can trigger the agent):

```json5
{
  channels: {
    vkteams: {
      enabled: true,
      token: "YOUR_BOT_TOKEN",
      allowFrom: ["user-id-1", "user-id-2"],
    },
  },
}
```

Env var (default account only):

- `VKTEAMS_BOT_TOKEN` — bot token (used when `channels.vkteams.token` is not set).

Token file:

- Set `channels.vkteams.tokenFile` to a path that contains the raw token (one line, no prefix).

## API reference

For method and event details (events/get, sendText, sendFile, chats, etc.), see [VK Teams Bot API reference](/reference/vkteams-bot-api).

## Configuration reference

| Config path | Description |
|------------|-------------|
| `channels.vkteams.enabled` | Enable the channel (default: true when section present). |
| `channels.vkteams.token` | Bot token. |
| `channels.vkteams.tokenFile` | Path to file containing the token. |
| `channels.vkteams.apiUrlBase` | API base URL (default: `https://myteam.mail.ru/bot/v1`). |
| `channels.vkteams.allowFrom` | Allowlist of user/chat IDs; empty = no restriction (use with care). |
