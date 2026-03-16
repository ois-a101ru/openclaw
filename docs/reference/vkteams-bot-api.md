---
summary: "VK Teams Bot API reference"
title: VK Teams Bot API
---

# VK Teams Bot API

This document describes the VK Teams Bot API used by the OpenClaw VK Teams channel plugin. The API is maintained by VK (Mail.ru); OpenClaw uses long polling for incoming events and the documented HTTP methods for sending messages.

**Official specification**: [teams.vk.com/botapi](https://teams.vk.com/botapi/) (EN/RU).

**Reference implementation**: [github.com/mail-ru-im/bot-python](https://github.com/mail-ru-im/bot-python) (Python).

## Base URL and authentication

- **Cloud (default)**: `https://myteam.mail.ru/bot/v1/`
- **On-Premise / custom**: Each deployment has its own base URL (e.g. `https://api.a101.ru/bot/v1`). You can discover it by sending `/start` to [Metabot](https://teams.vk.com/profile/70001) in VK Teams.
- **Authentication**: The bot token is sent with every request as the query parameter `token` (or in the body for POST). The token is obtained when creating the bot via Metabot with the `/newbot` command.

## Transport and limits

- **Protocol**: HTTPS only.
- **Methods**: GET and POST. Parameters can be sent as:
  - URL query string
  - `multipart/form-data` (for file uploads)
- **Limits**: 60 KB for query string; 50 MB for request body.
- **Response**: JSON object with:
  - `ok` (boolean): request success
  - `description` (string, optional): error or result details
  - Method-specific result fields when `ok === true`.

## Receiving events (long polling)

VK Teams does not expose webhooks in the public Bot API. Events are received via **long polling**.

### Method: `GET /events/get`

| Parameter     | Type   | Required | Description |
|---------------|--------|----------|-------------|
| `token`       | string | Yes      | Bot token   |
| `pollTime`    | number | No       | Seconds to hold the connection (long poll). Default is up to the client (e.g. 30–60). |
| `lastEventId` | number | No       | ID of the last processed event. Server does not return events with `eventId <= lastEventId`. |

**Response** (success):

```json
{
  "ok": true,
  "events": [
    {
      "eventId": 12345,
      "payload": {
        "type": "newMessage",
        "msgId": "...",
        "text": "Hello",
        "chat": { "chatId": "chat-id", "type": "private" },
        "from": { "userId": "...", "firstName": "...", "lastName": "..." }
      }
    }
  ]
}
```

If there are no events, the request may hang until `pollTime` elapses or events arrive. After processing, use the maximum `eventId` from the batch as `lastEventId` for the next request.

### Event types

| type               | Description                    |
|--------------------|--------------------------------|
| `newMessage`       | New incoming message           |
| `editedMessage`    | Message was edited             |
| `deletedMessage`   | Message was deleted            |
| `pinnedMessage`   | Message was pinned             |
| `unpinnedMessage` | Message was unpinned           |
| `newChatMembers`  | New members joined the chat    |
| `leftChatMembers` | Members left the chat         |
| `changedChatInfo`  | Chat info (title, etc.) changed |
| `callbackQuery`    | User pressed an inline button  |

For `newMessage` and `editedMessage`, the payload contains at least:

- `msgId`, `text`, `format` (optional)
- `chat`: `chatId`, `type` (`private` | `group` | `channel`)
- `from`: sender (e.g. `userId`, `firstName`, `lastName`)

For `callbackQuery`: `queryId`, `callbackData`, `message` (with `msgId`, `chat`).

## Sending messages

### `GET /messages/sendText`

| Parameter  | Type   | Required | Description        |
|------------|--------|----------|--------------------|
| `token`    | string | Yes      | Bot token          |
| `chatId`   | string | Yes      | Target chat ID     |
| `text`     | string | Yes      | Message text       |
| `replyMsgId` | string | No     | Message ID to reply to |
| `forwardChatId` / `forwardMsgId` | string | No | Forward context |
| `inlineKeyboardMarkup` | string (JSON) | No | Inline buttons |
| `parseMode` | string | No       | `MarkdownV2` or `HTML` |
| `format`   | string (JSON) | No    | Format object (styles) |

### `GET` or `POST /messages/sendFile`

- **GET**: use `fileId` (previously uploaded file).
- **POST**: use `multipart/form-data` with a `file` field.
- Parameters: `token`, `chatId`, `file` or `fileId`, `caption`, `replyMsgId`, `parseMode`, `format`, `inlineKeyboardMarkup`.

### `GET` or `POST /messages/sendVoice`

Same as sendFile for voice messages. Parameters: `token`, `chatId`, `file`/`fileId`, `replyMsgId`, `inlineKeyboardMarkup`.

### `GET /messages/editText`

Parameters: `token`, `chatId`, `msgId`, `text`, `inlineKeyboardMarkup`, `parseMode`, `format`.

### `GET /messages/deleteMessages`

Parameters: `token`, `chatId`, `msgId` (single or comma-separated).

### `GET /messages/answerCallbackQuery`

Parameters: `token`, `queryId`, `text`, `showAlert`, `url`.

## Chats

- `GET /chats/getInfo` — `token`, `chatId`
- `GET /chats/getAdmins` — `token`, `chatId`
- `GET /chats/getMembers` — `token`, `chatId`, optional `cursor`
- `GET /chats/sendActions` — `token`, `chatId`, `actions` (e.g. typing)
- `GET /chats/blockUser`, `unblockUser`, `resolvePending`, `setTitle`, `setAbout`, `setRules`, `pinMessage`, `unpinMessage`
- `GET /chats/members/delete` — `token`, `chatId`, `members` (JSON array of `{ "sn": "userId" }`)

## Self and files

- `GET /self/get` — `token`; returns bot info (e.g. nick).
- `GET /files/getInfo` — `token`, `fileId`.

## Chat types

- `private` — direct chat
- `group` — group chat
- `channel` — channel

## Formatting

- **parseMode**: `MarkdownV2` or `HTML` (same as in the Python library).
- **format**: JSON object describing styles (bold, italic, etc.) with offsets and lengths.

## Creating a bot

1. In VK Teams, open a chat with **Metabot** (search or [profile/70001](https://teams.vk.com/profile/70001)).
2. Send `/newbot` and follow the instructions.
3. Save the token; use it in OpenClaw as `channels.vkteams.token` (or via env / token file).

Bots can reply only after the user has added the bot to contacts or started the conversation first.
