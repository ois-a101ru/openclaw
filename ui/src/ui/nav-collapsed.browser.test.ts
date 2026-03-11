import "../styles.css";
import { describe, expect, it } from "vitest";
import { mountApp, registerAppMountHooks } from "./test-helpers/app-mount.ts";

registerAppMountHooks();

describe("collapsed nav rail", () => {
  it("collapses into a horizontal mobile rail instead of a vertical side strip", async () => {
    localStorage.setItem(
      "openclaw.control.settings.v1",
      JSON.stringify({
        gatewayUrl: "ws://127.0.0.1:18789",
        sessionKey: "main",
        lastActiveSessionKey: "main",
        theme: "claw",
        themeMode: "system",
        chatFocusMode: false,
        chatShowThinking: true,
        splitRatio: 0.6,
        navCollapsed: true,
        navWidth: 220,
        navGroupsCollapsed: {},
      }),
    );

    const app = mountApp("/chat");
    await app.updateComplete;

    const shell = app.querySelector<HTMLElement>(".shell");
    const shellNav = app.querySelector<HTMLElement>(".shell-nav");
    const rail = app.querySelector<HTMLElement>(".sidebar");
    const nav = app.querySelector<HTMLElement>(".sidebar-nav");
    const toggle = app.querySelector<HTMLElement>(".nav-collapse-toggle");
    const navItem = app.querySelector<HTMLAnchorElement>('a.nav-item[href="/chat"]');
    const footer = app.querySelector<HTMLElement>(".sidebar-footer");

    expect(shell).not.toBeNull();
    expect(shellNav).not.toBeNull();
    expect(rail).not.toBeNull();
    expect(nav).not.toBeNull();
    expect(toggle).not.toBeNull();
    expect(navItem).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(window.matchMedia("(max-width: 768px)").matches).toBe(true);
    expect(shell!.classList.contains("shell--nav-collapsed")).toBe(true);
    expect(getComputedStyle(nav!).display).toBe("flex");
    expect(getComputedStyle(nav!).flexDirection).toBe("row");
    expect(getComputedStyle(shellNav!).width).toBe(`${window.innerWidth}px`);
    expect(getComputedStyle(navItem!).justifyContent).toBe("center");
    expect(toggle!.getBoundingClientRect().width).toBeGreaterThan(40);
    expect(toggle!.getBoundingClientRect().width).toBeLessThan(48);
    expect(navItem!.getBoundingClientRect().width).toBeGreaterThan(40);
    expect(navItem!.getBoundingClientRect().width).toBeLessThan(48);
    expect(navItem!.getBoundingClientRect().left).toBeGreaterThan(
      toggle!.getBoundingClientRect().left,
    );
    expect(getComputedStyle(footer!).display).toBe("none");
    expect(app.querySelector(".nav-item__text")).toBeNull();
  });
});
