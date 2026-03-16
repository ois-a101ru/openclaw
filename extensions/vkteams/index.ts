import type { OpenClawPluginApi } from "openclaw/plugin-sdk/vkteams";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk/vkteams";
import { vkteamsPlugin } from "./src/channel.js";
import { setVkTeamsRuntime } from "./src/runtime.js";

const plugin = {
  id: "vkteams",
  name: "VK Teams",
  description: "OpenClaw VK Teams channel plugin (Bot API)",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    setVkTeamsRuntime(api.runtime);
    api.registerChannel({ plugin: vkteamsPlugin });
  },
};

export default plugin;
