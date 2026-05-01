/**
 * pi-browse extension — headless browser QA testing via Playwright.
 *
 * Provides LLM-callable tools for web page navigation, snapshot + @ref element
 * selection, interaction, assertion, and screenshot capture. A persistent
 * headless Chromium instance is lazily started on first use and auto-shuts
 * down after 30 minutes of inactivity.
 *
 * Ported from gstack browse (github.com/garrytan/gstack). MIT licensed.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

import { BrowserManager } from "./browser-manager";
import { handleSnapshot, type SnapshotOptions } from "./snapshot";
import { handleReadCommand } from "./read-commands";
import { handleWriteCommand } from "./write-commands";

// ─── Module-level browser manager (lazy init, persists across turns) ───

let browserManager: BrowserManager | null = null;

async function getBrowser(): Promise<BrowserManager> {
  if (!browserManager || !browserManager.isAlive()) {
    if (browserManager) {
      // Clean up stale instance
      await browserManager.shutdown().catch(() => {});
    }
    browserManager = new BrowserManager();
    await browserManager.launch();
  }
  return browserManager;
}

// ─── Schema Factories ─────────────────────────────────────────────

const SelectorParam = Type.String({
  description: "CSS selector or @ref from a previous browse_snapshot call (e.g., '@e3')",
});

const RefParam = Type.String({
  description: "Element reference from a previous browse_snapshot call (e.g., '@e3')",
});

// ─── Extension Entry ─────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  // ── Navigation ──────────────────────────────────────────────

  pi.registerTool({
    name: "browse_goto",
    label: "Browse Goto",
    description:
      "Navigate the headless browser to a URL. Always use this before any other browse tool.",
    parameters: Type.Object({
      url: Type.String({ description: "Full URL to navigate to (https://...)" }),
    }),
    async execute(_id, params, _signal, _onUpdate) {
      const bm = await getBrowser();
      const session = bm.getActiveSession();
      const result = await handleWriteCommand("goto", [params.url], session, bm);
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_back",
    label: "Browse Back",
    description: "Go back to the previous page in browser history.",
    parameters: Type.Object({}),
    async execute() {
      const bm = await getBrowser();
      const session = bm.getActiveSession();
      const result = await handleWriteCommand("back", [], session, bm);
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_reload",
    label: "Browse Reload",
    description: "Reload the current page.",
    parameters: Type.Object({}),
    async execute() {
      const bm = await getBrowser();
      const session = bm.getActiveSession();
      const result = await handleWriteCommand("reload", [], session, bm);
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_url",
    label: "Browse URL",
    description: "Get the current page URL.",
    parameters: Type.Object({}),
    async execute() {
      const bm = await getBrowser();
      const result = await handleReadCommand("url", [], bm.getActiveSession());
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  // ── Snapshot + @ref system (CORE) ─────────────────────────

  pi.registerTool({
    name: "browse_snapshot",
    label: "Browse Snapshot",
    description:
      "Take an accessibility tree snapshot of the current page. Each interactive element gets an @eN ref ID. " +
      "Use @refs with browse_click, browse_fill, browse_is, etc. — no CSS selector guessing needed. " +
      "Set interactive=true for only interactive elements. Set diff=true to see what changed since the last snapshot. " +
      "Set annotate=true to save a screenshot with red overlay boxes at each @ref.",
    parameters: Type.Object({
      interactive: Type.Optional(
        Type.Boolean({
          description:
            "Only show interactive elements (buttons, links, inputs) with @e refs. Default: false (show all).",
        })
      ),
      diff: Type.Optional(
        Type.Boolean({
          description:
            "Show unified diff against the previous snapshot. First call stores baseline. Default: false.",
        })
      ),
      depth: Type.Optional(
        Type.Number({
          description: "Limit tree depth (0 = root only). Default: unlimited.",
        })
      ),
      selector: Type.Optional(
        Type.String({
          description:
            "CSS selector to scope the snapshot to a specific subtree.",
        })
      ),
      annotate: Type.Optional(
        Type.Boolean({
          description:
            "Save an annotated screenshot with red overlay boxes at each @ref. Default: false.",
        })
      ),
    }),
    async execute(_id, params, _signal, _onUpdate) {
      const bm = await getBrowser();
      const opts: SnapshotOptions = {
        interactive: params.interactive,
        diff: params.diff,
        depth: params.depth,
        selector: params.selector,
        annotate: params.annotate,
      };
      const result = await handleSnapshot(opts, bm.getActiveSession());

      const parts: Array<{ type: "text"; text: string }> = [
        { type: "text", text: result.text },
      ];

      if (result.screenshotPath) {
        parts.push({
          type: "text",
          text: `\n[annotated screenshot saved to: ${result.screenshotPath}]`,
        });
      }

      return {
        content: parts,
        details: {
          refCount: result.refs.length,
          refs: result.refs.slice(0, 50), // cap for details
          screenshotPath: result.screenshotPath,
          isDiff: result.isDiff,
        },
      };
    },
  });

  // ── Reading ───────────────────────────────────────────────

  pi.registerTool({
    name: "browse_text",
    label: "Browse Text",
    description: "Get cleaned visible text content from the current page.",
    parameters: Type.Object({}),
    async execute() {
      const bm = await getBrowser();
      const result = await handleReadCommand("text", [], bm.getActiveSession());
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_html",
    label: "Browse HTML",
    description: "Get innerHTML of a specific element (or full page HTML if no selector given).",
    parameters: Type.Object({
      selector: Type.Optional(
        Type.String({
          description: "CSS selector or @ref. If omitted, returns full page HTML.",
        })
      ),
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      const args = params.selector ? [params.selector] : [];
      const result = await handleReadCommand("html", args, bm.getActiveSession());
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_links",
    label: "Browse Links",
    description: "Get all links on the page as 'text → href'.",
    parameters: Type.Object({}),
    async execute() {
      const bm = await getBrowser();
      const result = await handleReadCommand("links", [], bm.getActiveSession());
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_console",
    label: "Browse Console",
    description: "Get browser console messages (errors and warnings).",
    parameters: Type.Object({
      errorsOnly: Type.Optional(
        Type.Boolean({
          description: "Only show errors and warnings. Default: false.",
        })
      ),
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      const args = params.errorsOnly ? ["--errors"] : [];
      const result = await handleReadCommand("console", args, bm.getActiveSession());
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_js",
    label: "Browse JS",
    description: "Execute a JavaScript expression in the page context and return the result.",
    parameters: Type.Object({
      expression: Type.String({
        description: "JavaScript expression to evaluate, e.g., 'document.title'",
      }),
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      const result = await handleReadCommand(
        "js",
        [params.expression],
        bm.getActiveSession()
      );
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_title",
    label: "Browse Title",
    description: "Get the document title of the current page.",
    parameters: Type.Object({}),
    async execute() {
      const bm = await getBrowser();
      const result = await handleReadCommand("title", [], bm.getActiveSession());
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  // ── Interaction ───────────────────────────────────────────

  pi.registerTool({
    name: "browse_click",
    label: "Browse Click",
    description:
      "Click an element by @ref (from browse_snapshot) or CSS selector. Always run browse_snapshot first to get @refs.",
    parameters: Type.Object({
      ref: RefParam,
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      const result = await handleWriteCommand(
        "click",
        [params.ref],
        bm.getActiveSession(),
        bm
      );
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_fill",
    label: "Browse Fill",
    description:
      "Fill a text input. Use @ref from browse_snapshot (e.g., '@e4') or a CSS selector.",
    parameters: Type.Object({
      ref: RefParam,
      value: Type.String({ description: "Text value to fill into the input" }),
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      const result = await handleWriteCommand(
        "fill",
        [params.ref, params.value],
        bm.getActiveSession(),
        bm
      );
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_select",
    label: "Browse Select",
    description: "Select a dropdown option by value, label, or visible text.",
    parameters: Type.Object({
      ref: SelectorParam,
      value: Type.String({ description: "Option value or visible text to select" }),
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      const result = await handleWriteCommand(
        "select",
        [params.ref, params.value],
        bm.getActiveSession(),
        bm
      );
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_hover",
    label: "Browse Hover",
    description: "Hover over an element (useful for tooltips, dropdowns).",
    parameters: Type.Object({
      ref: RefParam,
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      const result = await handleWriteCommand(
        "hover",
        [params.ref],
        bm.getActiveSession(),
        bm
      );
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_type",
    label: "Browse Type",
    description: "Type text into the currently focused element.",
    parameters: Type.Object({
      text: Type.String({ description: "Text to type" }),
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      const result = await handleWriteCommand(
        "type",
        [params.text],
        bm.getActiveSession(),
        bm
      );
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_press",
    label: "Browse Press",
    description:
      "Press a keyboard key. Use for Enter, Tab, Escape, arrow keys, etc.",
    parameters: Type.Object({
      key: Type.String({
        description:
          "Key to press: Enter, Tab, Escape, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Backspace, Delete",
      }),
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      const result = await handleWriteCommand(
        "press",
        [params.key],
        bm.getActiveSession(),
        bm
      );
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_scroll",
    label: "Browse Scroll",
    description:
      "Scroll a specific element into view, or scroll to page bottom if no selector given.",
    parameters: Type.Object({
      ref: Type.Optional(SelectorParam),
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      const args = params.ref ? [params.ref] : [];
      const result = await handleWriteCommand(
        "scroll",
        args,
        bm.getActiveSession(),
        bm
      );
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_wait",
    label: "Browse Wait",
    description: "Wait for an element to appear, or for network idle/page load.",
    parameters: Type.Object({
      target: Type.String({
        description:
          "CSS selector, @ref, or '--networkidle' / '--load' to wait for network/page ready",
      }),
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      const result = await handleWriteCommand(
        "wait",
        [params.target],
        bm.getActiveSession(),
        bm
      );
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_viewport",
    label: "Browse Viewport",
    description:
      "Set the browser viewport size. Use for testing responsive layouts.",
    parameters: Type.Object({
      size: Type.String({
        description: "Viewport size as WxH, e.g., '375x812' for iPhone, '1280x720' for desktop",
      }),
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      const result = await handleWriteCommand(
        "viewport",
        [params.size],
        bm.getActiveSession(),
        bm
      );
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  // ── Assertions ────────────────────────────────────────────

  pi.registerTool({
    name: "browse_is",
    label: "Browse Is",
    description:
      "Check an element's state. Returns 'true' or 'false'. Use to verify page state after interactions.",
    parameters: Type.Object({
      property: Type.String({
        description:
          "Property to check: visible, hidden, enabled, disabled, checked, editable, focused",
      }),
      selector: SelectorParam,
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      const validProps = [
        "visible",
        "hidden",
        "enabled",
        "disabled",
        "checked",
        "editable",
        "focused",
      ];
      if (!validProps.includes(params.property)) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Unknown property "${params.property}". Valid: ${validProps.join(", ")}`,
            },
          ],
          details: {},
        };
      }
      const result = await handleReadCommand(
        "is",
        [params.property, params.selector],
        bm.getActiveSession()
      );
      return {
        content: [{ type: "text", text: result }],
        details: { value: result === "true" },
      };
    },
  });

  // ── Screenshot ────────────────────────────────────────────

  pi.registerTool({
    name: "browse_screenshot",
    label: "Browse Screenshot",
    description: "Take a screenshot of the current page and save it to a file.",
    parameters: Type.Object({
      path: Type.Optional(
        Type.String({
          description:
            "File path to save the screenshot. Default: /tmp/browse-screenshot-<timestamp>.png",
        })
      ),
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      const session = bm.getActiveSession();
      const page = session.getPage();
      const screenshotPath =
        params.path || `/tmp/browse-screenshot-${Date.now()}.png`;

      await page.screenshot({ path: screenshotPath, fullPage: true });
      bm.resetIdleTimer();

      return {
        content: [
          { type: "text", text: `Screenshot saved to: ${screenshotPath}` },
        ],
        details: { screenshotPath },
      };
    },
  });

  pi.registerTool({
    name: "browse_responsive",
    label: "Browse Responsive",
    description:
      "Take screenshots at mobile (375x812), tablet (768x1024), and desktop (1280x720) viewports. Saves as <prefix>-mobile.png, <prefix>-tablet.png, <prefix>-desktop.png.",
    parameters: Type.Object({
      prefix: Type.String({
        description:
          "File path prefix. Screenshots saved as <prefix>-mobile.png, <prefix>-tablet.png, <prefix>-desktop.png",
      }),
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      const session = bm.getActiveSession();
      const page = session.getPage();
      const breakpoints = [
        { name: "mobile", width: 375, height: 812 },
        { name: "tablet", width: 768, height: 1024 },
        { name: "desktop", width: 1280, height: 720 },
      ];

      const paths: string[] = [];
      for (const bp of breakpoints) {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await page.waitForTimeout(500); // let layout settle
        const p = `${params.prefix}-${bp.name}.png`;
        await page.screenshot({ path: p, fullPage: true });
        paths.push(p);
      }

      bm.resetIdleTimer();
      return {
        content: [
          {
            type: "text",
            text: `Responsive screenshots:\n${paths.map((p) => `  ${p}`).join("\n")}`,
          },
        ],
        details: { paths },
      };
    },
  });

  // ── Dialog Control ────────────────────────────────────────

  pi.registerTool({
    name: "browse_dialog_accept",
    label: "Browse Dialog Accept",
    description:
      "Auto-accept the next browser dialog (alert/confirm/prompt). Optionally provide text for prompt dialogs.",
    parameters: Type.Object({
      text: Type.Optional(
        Type.String({ description: "Text to fill in prompt dialogs" })
      ),
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      const args = params.text ? [params.text] : [];
      const result = await handleWriteCommand(
        "dialog-accept",
        args,
        bm.getActiveSession(),
        bm
      );
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_dialog_dismiss",
    label: "Browse Dialog Dismiss",
    description: "Auto-dismiss the next browser dialog.",
    parameters: Type.Object({}),
    async execute() {
      const bm = await getBrowser();
      const result = await handleWriteCommand(
        "dialog-dismiss",
        [],
        bm.getActiveSession(),
        bm
      );
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  // ── Tabs ────────────────────────────────────────────────

  pi.registerTool({
    name: "browse_tabs",
    label: "Browse Tabs",
    description: "List all open browser tabs with their IDs, URLs, and active status.",
    parameters: Type.Object({}),
    async execute() {
      const bm = await getBrowser();
      const tabs = bm.listTabs();
      if (tabs.length === 0) {
        return {
          content: [{ type: "text", text: "(no open tabs)" }],
          details: { tabs: [] },
        };
      }
      const text = tabs
        .map(
          (t) =>
            `[${t.active ? "*" : " "}] Tab ${t.id}: ${t.url.substring(0, 100)}`
        )
        .join("\n");
      return {
        content: [{ type: "text", text }],
        details: { tabs },
      };
    },
  });

  pi.registerTool({
    name: "browse_newtab",
    label: "Browse New Tab",
    description:
      "Open a new browser tab and optionally navigate to a URL. Returns the new tab ID.",
    parameters: Type.Object({
      url: Type.Optional(
        Type.String({ description: "URL to navigate to in the new tab" })
      ),
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      const tabId = await bm.newTab(params.url);
      return {
        content: [
          {
            type: "text",
            text: `New tab opened: ${tabId}${params.url ? ` → ${params.url}` : ""}`,
          },
        ],
        details: { tabId },
      };
    },
  });

  pi.registerTool({
    name: "browse_switch_tab",
    label: "Browse Switch Tab",
    description:
      "Switch to a different tab by ID. Use browse_tabs to see available tabs.",
    parameters: Type.Object({
      tabId: Type.Number({ description: "Tab ID to switch to" }),
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      bm.switchTab(params.tabId);
      return {
        content: [
          {
            type: "text",
            text: `Switched to tab ${params.tabId} → ${bm.getCurrentUrl()}`,
          },
        ],
        details: { tabId: params.tabId },
      };
    },
  });

  pi.registerTool({
    name: "browse_closetab",
    label: "Browse Close Tab",
    description:
      "Close a tab by ID. The last remaining tab cannot be closed.",
    parameters: Type.Object({
      tabId: Type.Number({ description: "Tab ID to close" }),
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      if (bm.getTabCount() <= 1) {
        return {
          content: [
            { type: "text", text: "Cannot close the last remaining tab." },
          ],
          details: {},
        };
      }
      await bm.closeTab(params.tabId);
      bm.resetIdleTimer();
      return {
        content: [
          {
            type: "text",
            text: `Tab ${params.tabId} closed. Active tab: ${bm.getActiveTabId()} (${bm.getCurrentUrl()})`,
          },
        ],
        details: { tabId: params.tabId },
      };
    },
  });

  // ── Cookies ─────────────────────────────────────────────

  pi.registerTool({
    name: "browse_cookies",
    label: "Browse Cookies",
    description:
      "List all cookies for the current page domain. Sensitive values (session, token, secret) are redacted.",
    parameters: Type.Object({}),
    async execute() {
      const bm = await getBrowser();
      const result = await bm.getCookies();
      return {
        content: [{ type: "text", text: result }],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_cookie_set",
    label: "Browse Cookie Set",
    description:
      "Set a cookie on the current page domain. Use before navigating to set auth/session cookies.",
    parameters: Type.Object({
      name: Type.String({ description: "Cookie name" }),
      value: Type.String({ description: "Cookie value" }),
      domain: Type.Optional(
        Type.String({
          description:
            "Domain for the cookie. Defaults to current page domain.",
        })
      ),
      path: Type.Optional(
        Type.String({ description: "Cookie path. Default: /" })
      ),
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      await bm.setCookie(params.name, params.value, params.domain, params.path);
      return {
        content: [
          {
            type: "text",
            text: `Cookie set: ${params.name}=${params.value.substring(0, 30)}${params.value.length > 30 ? "..." : ""}`,
          },
        ],
        details: {},
      };
    },
  });

  pi.registerTool({
    name: "browse_cookie_import",
    label: "Browse Cookie Import",
    description:
      "Import cookies from a JSON string. Accepts Playwright cookie array format: [{\"name\":\"...\",\"value\":\"...\",\"domain\":\"...\"}]. Use to restore auth sessions.",
    parameters: Type.Object({
      json: Type.String({
        description:
          'JSON string of cookie array, e.g., \'[{"name":"session","value":"abc123","domain":".example.com"}]\'',
      }),
    }),
    async execute(_id, params) {
      const bm = await getBrowser();
      try {
        const count = await bm.importCookies(params.json);
        return {
          content: [
            {
              type: "text",
              text: `Imported ${count} cookie(s) successfully.`,
            },
          ],
          details: { count },
        };
      } catch (err: any) {
        return {
          content: [
            { type: "text", text: `Cookie import failed: ${err.message}` },
          ],
          details: { error: err.message },
        };
      }
    },
  });

  // ── Lifecycle Cleanup ────────────────────────────────────

  pi.on("session_shutdown", async () => {
    if (browserManager) {
      await browserManager.shutdown().catch(() => {});
      browserManager = null;
    }
  });
}
