/**
 * Write commands — navigate and interact with pages.
 * Ported from gstack browse/src/write-commands.ts.
 */

import type { TabSession } from "./tab-session";
import type { BrowserManager } from "./browser-manager";

async function validateUrl(raw: string): Promise<string> {
  let normalized = raw.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(normalized)) {
      normalized = `https://${normalized}`;
    } else {
      throw new Error(
        `Invalid URL: "${raw}". Must start with http:// or https://`
      );
    }
  }
  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`Unsupported protocol: ${url.protocol}`);
    }
    return url.href;
  } catch (err: any) {
    if (err.message.includes("Unsupported protocol")) throw err;
    throw new Error(`Invalid URL: "${raw}" (${err.message})`);
  }
}

export async function handleWriteCommand(
  command: string,
  args: string[],
  session: TabSession,
  bm: BrowserManager
): Promise<string> {
  const page = session.getPage();
  const target = session.getActiveFrameOrPage();
  const inFrame = session.getFrame() !== null;

  switch (command) {
    case "goto": {
      if (inFrame)
        throw new Error("Cannot use goto inside a frame.");
      const url = args[0];
      if (!url) throw new Error("Usage: browse_goto <url>");
      const normalizedUrl = await validateUrl(url);
      const response = await page.goto(normalizedUrl, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      const status = response?.status() || "unknown";
      bm.resetIdleTimer();
      return `Navigated to ${normalizedUrl} (${status})`;
    }

    case "back": {
      if (inFrame) throw new Error("Cannot use back inside a frame.");
      await page.goBack({ waitUntil: "domcontentloaded", timeout: 15000 });
      bm.resetIdleTimer();
      return `Back → ${page.url()}`;
    }

    case "forward": {
      if (inFrame) throw new Error("Cannot use forward inside a frame.");
      await page.goForward({
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      bm.resetIdleTimer();
      return `Forward → ${page.url()}`;
    }

    case "reload": {
      if (inFrame) throw new Error("Cannot use reload inside a frame.");
      await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
      bm.resetIdleTimer();
      return `Reloaded ${page.url()}`;
    }

    case "click": {
      const selector = args[0];
      if (!selector) throw new Error("Usage: browse_click <selector|@ref>");

      // Auto-route: if ref points to <option>, use selectOption
      const role = session.getRefRole(selector);
      if (role === "option") {
        const resolved = await session.resolveRef(selector);
        if ("locator" in resolved) {
          const optionInfo = await resolved.locator.evaluate((el) => {
            if (el.tagName !== "OPTION") return null;
            const option = el as HTMLOptionElement;
            const select = option.closest("select");
            if (!select) return null;
            return { value: option.value, text: option.text };
          });
          if (optionInfo) {
            await resolved.locator
              .locator("xpath=ancestor::select")
              .selectOption(optionInfo.value, { timeout: 5000 });
            bm.resetIdleTimer();
            return `Selected "${optionInfo.text}" (auto-routed from click on <option>) → now at ${page.url()}`;
          }
        }
      }

      const resolved = await session.resolveRef(selector);
      try {
        if ("locator" in resolved) {
          await resolved.locator.click({ timeout: 5000 });
        } else {
          await target.locator(resolved.selector).click({ timeout: 5000 });
        }
      } catch (err: any) {
        const isOption =
          "locator" in resolved
            ? await resolved.locator
                .evaluate((el) => el.tagName === "OPTION")
                .catch(() => false)
            : await target
                .locator(resolved.selector)
                .evaluate((el) => el.tagName === "OPTION")
                .catch(() => false);
        if (isOption) {
          throw new Error(
            "Cannot click <option> elements. Use 'browse_select <parent-select> <value>' instead."
          );
        }
        throw err;
      }
      await page
        .waitForLoadState("networkidle", { timeout: 2000 })
        .catch(() => {});
      bm.resetIdleTimer();
      return `Clicked ${selector} → now at ${page.url()}`;
    }

    case "fill": {
      const [selector, ...valueParts] = args;
      const value = valueParts.join(" ");
      if (!selector || !value)
        throw new Error("Usage: browse_fill <selector|@ref> <value>");
      const resolved = await session.resolveRef(selector);
      if ("locator" in resolved) {
        await resolved.locator.fill(value, { timeout: 5000 });
      } else {
        await target.locator(resolved.selector).fill(value, { timeout: 5000 });
      }
      await page
        .waitForLoadState("networkidle", { timeout: 2000 })
        .catch(() => {});
      bm.resetIdleTimer();
      return `Filled ${selector}`;
    }

    case "select": {
      const [selector, ...valueParts] = args;
      const value = valueParts.join(" ");
      if (!selector || !value)
        throw new Error("Usage: browse_select <selector|@ref> <value>");
      const resolved = await session.resolveRef(selector);
      if ("locator" in resolved) {
        await resolved.locator.selectOption(value, { timeout: 5000 });
      } else {
        await target
          .locator(resolved.selector)
          .selectOption(value, { timeout: 5000 });
      }
      await page
        .waitForLoadState("networkidle", { timeout: 2000 })
        .catch(() => {});
      bm.resetIdleTimer();
      return `Selected "${value}" in ${selector}`;
    }

    case "hover": {
      const selector = args[0];
      if (!selector) throw new Error("Usage: browse_hover <selector|@ref>");
      const resolved = await session.resolveRef(selector);
      if ("locator" in resolved) {
        await resolved.locator.hover({ timeout: 5000 });
      } else {
        await target.locator(resolved.selector).hover({ timeout: 5000 });
      }
      bm.resetIdleTimer();
      return `Hovered ${selector}`;
    }

    case "type": {
      const text = args.join(" ");
      if (!text) throw new Error("Usage: browse_type <text>");
      await page.keyboard.type(text);
      bm.resetIdleTimer();
      return `Typed ${text.length} characters`;
    }

    case "press": {
      const key = args[0];
      if (!key)
        throw new Error(
          "Usage: browse_press <key> (e.g., Enter, Tab, Escape)"
        );
      await page.keyboard.press(key);
      bm.resetIdleTimer();
      return `Pressed ${key}`;
    }

    case "scroll": {
      const selector = args[0];
      if (selector) {
        const resolved = await session.resolveRef(selector);
        if ("locator" in resolved) {
          await resolved.locator.scrollIntoViewIfNeeded({ timeout: 5000 });
        } else {
          await target
            .locator(resolved.selector)
            .scrollIntoViewIfNeeded({ timeout: 5000 });
        }
        bm.resetIdleTimer();
        return `Scrolled ${selector} into view`;
      }
      await target.evaluate(() =>
        window.scrollTo(0, document.body.scrollHeight)
      );
      bm.resetIdleTimer();
      return "Scrolled to bottom";
    }

    case "wait": {
      const selector = args[0];
      if (!selector)
        throw new Error(
          "Usage: browse_wait <selector|@ref|--networkidle|--load>"
        );
      if (selector === "--networkidle") {
        await page.waitForLoadState("networkidle", { timeout: 15000 });
        return "Network idle";
      }
      if (selector === "--load") {
        await page.waitForLoadState("load", { timeout: 15000 });
        return "Page loaded";
      }
      const resolved = await session.resolveRef(selector);
      if ("locator" in resolved) {
        await resolved.locator.waitFor({
          state: "visible",
          timeout: 15000,
        });
      } else {
        await target
          .locator(resolved.selector)
          .waitFor({ state: "visible", timeout: 15000 });
      }
      return `Element ${selector} appeared`;
    }

    case "viewport": {
      if (!args[0]) throw new Error("Usage: browse_viewport <WxH>");
      const [rawW, rawH] = args[0].split("x").map(Number);
      const w = Math.min(Math.max(Math.round(rawW) || 1280, 1), 16384);
      const h = Math.min(Math.max(Math.round(rawH) || 720, 1), 16384);
      await bm.setViewport(w, h);
      bm.resetIdleTimer();
      return `Viewport set to ${w}x${h}`;
    }

    case "dialog-accept": {
      bm.setDialogAutoAccept(true, args[0] || undefined);
      return args[0]
        ? `Dialogs will be auto-accepted with "${args[0]}"`
        : "Dialogs will be auto-accepted";
    }

    case "dialog-dismiss": {
      bm.setDialogAutoAccept(false);
      return "Dialogs will be auto-dismissed";
    }

    default:
      throw new Error(`Unknown write command: ${command}`);
  }
}
