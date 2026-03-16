// Narrow plugin-sdk surface for the bundled vkteams plugin.

export type { ReplyPayload } from "../auto-reply/types.js";
export { buildChannelConfigSchema } from "../channels/plugins/config-schema.js";
export type { ChannelOnboardingAdapter } from "../channels/plugins/onboarding-types.js";
export {
  promptAccountId,
  resolveAccountIdForConfigure,
} from "../channels/plugins/onboarding/helpers.js";
export {
  applyAccountNameToChannelSection,
  applySetupAccountConfigPatch,
} from "../channels/plugins/setup-helpers.js";
export type {
  ChannelAccountSnapshot,
  ChannelStatusIssue,
} from "../channels/plugins/types.js";
export type { ChannelPlugin } from "../channels/plugins/types.plugin.js";
export type { OpenClawConfig } from "../config/config.js";
export { emptyPluginConfigSchema } from "../plugins/config-schema.js";
export type { PluginRuntime } from "../plugins/runtime/types.js";
export type { OpenClawPluginApi } from "../plugins/types.js";
export { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../routing/session-key.js";
export type { RuntimeEnv } from "../runtime.js";
export type { WizardPrompter } from "../wizard/prompts.js";
export { createScopedPairingAccess } from "./pairing-access.js";
export { resolveInboundRouteEnvelopeBuilderWithRuntime } from "./inbound-envelope.js";
export { PAIRING_APPROVED_MESSAGE } from "../channels/plugins/pairing-message.js";
export { formatPairingApproveHint } from "../channels/plugins/helpers.js";
export { buildComputedAccountStatusSnapshot, collectStatusIssuesFromLastError } from "./status-helpers.js";
export { createAccountListHelpers } from "../channels/plugins/account-helpers.js";
export { issuePairingChallenge } from "../pairing/pairing-challenge.js";
export {
  resolveSenderCommandAuthorizationWithRuntime,
  resolveDirectDmAuthorizationOutcome,
} from "./group-access.js";
export {
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
} from "../config/runtime-group-policy.js";
export { evaluateGroupRouteAccessForPolicy } from "./group-access.js";
