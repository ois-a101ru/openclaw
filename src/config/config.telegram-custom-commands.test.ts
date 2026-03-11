import { describe, expect, it } from "vitest";
import { OpenClawSchema } from "./zod-schema.js";
import { TelegramConfigSchema } from "./zod-schema.providers-core.js";

describe("telegram custom commands schema", () => {
  it("normalizes custom commands", () => {
    const res = OpenClawSchema.safeParse({
      channels: {
        telegram: {
          customCommands: [{ command: "/Backup", description: "  Git backup  " }],
        },
      },
    });

    expect(res.success).toBe(true);
    if (!res.success) {
      return;
    }

    expect(res.data.channels?.telegram?.customCommands).toEqual([
      { command: "backup", description: "Git backup" },
    ]);
  });

  it("normalizes hyphens in custom command names", () => {
    const res = OpenClawSchema.safeParse({
      channels: {
        telegram: {
          customCommands: [{ command: "Bad-Name", description: "Override status" }],
        },
      },
    });

    expect(res.success).toBe(true);
    if (!res.success) {
      return;
    }

    expect(res.data.channels?.telegram?.customCommands).toEqual([
      { command: "bad_name", description: "Override status" },
    ]);
  });

  it("emits string-typed custom command fields in JSON schema", () => {
    const jsonSchema = TelegramConfigSchema.toJSONSchema({
      target: "draft-07",
      unrepresentable: "any",
    }) as {
      properties?: {
        customCommands?: {
          items?: { properties?: Record<string, { type?: string }> };
        };
      };
    };

    expect(jsonSchema.properties?.customCommands?.items?.properties?.command?.type).toBe("string");
    expect(jsonSchema.properties?.customCommands?.items?.properties?.description?.type).toBe(
      "string",
    );
  });
});
