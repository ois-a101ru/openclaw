import { createPluginRuntimeStore } from "openclaw/plugin-sdk/compat";
import type { PluginRuntime } from "openclaw/plugin-sdk/vkteams";

const { setRuntime: setVkTeamsRuntime, getRuntime: getVkTeamsRuntime } =
  createPluginRuntimeStore<PluginRuntime>("VK Teams runtime not initialized");
export { getVkTeamsRuntime, setVkTeamsRuntime };
