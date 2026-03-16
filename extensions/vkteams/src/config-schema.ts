import { AllowFromListSchema } from "openclaw/plugin-sdk/compat";
import { z } from "zod";

const vkteamsChannelSchema = z.object({
  enabled: z.boolean().optional(),
  token: z.string().optional(),
  tokenFile: z.string().optional(),
  apiUrlBase: z.string().optional(),
  allowFrom: AllowFromListSchema.optional(),
  defaultTo: z.string().optional(),
});

export const VkTeamsConfigSchema = vkteamsChannelSchema;
export type VkTeamsConfig = z.infer<typeof vkteamsChannelSchema>;
