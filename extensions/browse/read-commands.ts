/**
 * Read commands — extract data from pages without side effects.
 * Ported from gstack browse/src/read-commands.ts.
 */

import type { TabSession } from "./tab-session";
import { consoleBuffer, networkBuffer } from "./buffers";
import type { Page, Frame } from "playwright";
import { wrapUntrustedContent } from "./browser-manager";

// ─── Clean Text Extraction ─────────────────────────────────

export async function getCleanText(page: Page | Frame): Promise<string> {
  return page.evaluate(() => {
    const body = document.body;
    if (!body) return "";
    const clone = body.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll("script, style, noscript, svg")
      .forEach((el) => el.remove());
    return clone.innerText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");
  });
}

// ─── Main Handler ──────────────────────────────────────────

export async function handleReadCommand(
  command: string,
  args: string[],
  session: TabSession
): Promise<string> {
  const page = session.getPage();
  const target = session.getActiveFrameOrPage();

  switch (command) {
    case "text": {
      const text = await getCleanText(target);
      return wrapUntrustedContent(text, page.url());
    }

    case "html": {
      const selector = args[0];
      const html = selector
        ? await target.locator(selector).innerHTML({ timeout: 5000 })
        : await target.evaluate(() => document.documentElement.outerHTML);
      return wrapUntrustedContent(html, page.url());
    }

    case "links": {
      const links = await target.evaluate(() => {
        return Array.from(document.querySelectorAll("a[href]")).map((a) => ({
          text: (a as HTMLElement).innerText?.trim().slice(0, 120) || "",
          href: (a as HTMLAnchorElement).href,
        }));
      });
      const text = links
        .map((l) => `${l.text} → ${l.href}`)
        .join("\n");
      return wrapUntrustedContent(text, page.url());
    }

    case "forms": {
      const forms = await target.evaluate(() => {
        return Array.from(document.querySelectorAll("form")).map((form) => {
          const inputs = Array.from(
            form.querySelectorAll("input, select, textarea, button")
          ).map((el) => {
            const input = el as
              | HTMLInputElement
              | HTMLSelectElement
              | HTMLTextAreaElement;
            return {
              tag: el.tagName,
              name: input.name || null,
              type:
                el instanceof HTMLInputElement ? input.type || "text" : null,
              required: input.required || false,
              placeholder:
                el instanceof HTMLInputElement
                  ? input.placeholder || null
                  : null,
            };
          });
          return {
            action: (form as HTMLFormElement).action || null,
            method: (form as HTMLFormElement).method || "get",
            inputs,
          };
        });
      });
      const text = JSON.stringify(forms, null, 2);
      return wrapUntrustedContent(text, page.url());
    }

    case "js": {
      const code = args.join(" ");
      if (!code) throw new Error("Usage: browse_js <expression>");
      const result = await target.evaluate((c: string) => {
        try {
          const val = eval(c);
          return JSON.stringify(val, null, 2) ?? "undefined";
        } catch (e: any) {
          return `Error: ${e.message}`;
        }
      }, code);
      return result;
    }

    case "css": {
      const [selector, prop] = args;
      if (!selector || !prop)
        throw new Error("Usage: browse_css <selector> <property>");
      const resolved = await session.resolveRef(selector);
      let value: string;
      if ("locator" in resolved) {
        value = await resolved.locator.evaluate(
          (el, p) => getComputedStyle(el).getPropertyValue(p as string),
          prop
        );
      } else {
        value = await target
          .locator(resolved.selector)
          .evaluate(
            (el, p) => getComputedStyle(el).getPropertyValue(p as string),
            prop
          );
      }
      return value;
    }

    case "attrs": {
      const selector = args[0];
      if (!selector) throw new Error("Usage: browse_attrs <selector>");
      const resolved = await session.resolveRef(selector);
      const attrs: Record<string, string> = {};
      if ("locator" in resolved) {
        const result = await resolved.locator.evaluate((el) => {
          const a: Record<string, string> = {};
          for (const attr of el.attributes) {
            a[attr.name] = attr.value;
          }
          return a;
        });
        Object.assign(attrs, result);
      } else {
        const result = await target.locator(resolved.selector).evaluate((el) => {
          const a: Record<string, string> = {};
          for (const attr of el.attributes) {
            a[attr.name] = attr.value;
          }
          return a;
        });
        Object.assign(attrs, result);
      }
      return JSON.stringify(attrs, null, 2);
    }

    case "console": {
      const errorsOnly = args.includes("--errors");
      const entries = consoleBuffer.toArray();
      const filtered = errorsOnly
        ? entries.filter(
            (e) =>
              e.level === "error" ||
              e.level === "warning"
          )
        : entries;
      if (filtered.length === 0) return "(no console messages)";
      const text = filtered
        .map(
          (e) =>
            `[${new Date(e.timestamp).toISOString()}] [${e.level}] ${e.text}`
        )
        .join("\n");
      return wrapUntrustedContent(text);
    }

    case "network": {
      const entries = networkBuffer.toArray();
      if (entries.length === 0) return "(no network requests)";
      const text = entries
        .map(
          (e) =>
            `[${new Date(e.timestamp).toISOString()}] ${e.method} ${e.url} → ${e.status || "pending"} (${e.duration || "?"}ms, ${e.size || "?"}B)`
        )
        .join("\n");
      return wrapUntrustedContent(text);
    }

    case "url": {
      return page.url();
    }

    case "is": {
      const [prop, selector] = args;
      if (!prop || !selector)
        throw new Error("Usage: browse_is <visible|hidden|enabled|disabled|checked|editable|focused> <selector>");

      const validProps = [
        "visible",
        "hidden",
        "enabled",
        "disabled",
        "checked",
        "editable",
        "focused",
      ];
      if (!validProps.includes(prop))
        throw new Error(
          `Unknown property "${prop}". Valid: ${validProps.join(", ")}`
        );

      const resolved = await session.resolveRef(selector);
      let locator: import("playwright").Locator;
      if ("locator" in resolved) {
        locator = resolved.locator;
      } else {
        locator = target.locator(resolved.selector);
      }

      let result: boolean;
      switch (prop) {
        case "visible":
          result = await locator.isVisible().catch(() => false);
          break;
        case "hidden":
          result = await locator.isHidden().catch(() => true);
          break;
        case "enabled":
          result = await locator.isEnabled().catch(() => false);
          break;
        case "disabled":
          result = await locator.isDisabled().catch(() => true);
          break;
        case "checked":
          result = await locator.isChecked().catch(() => false);
          break;
        case "editable":
          result = await locator.isEditable().catch(() => false);
          break;
        case "focused":
          result = await locator
            .evaluate((el) => el === document.activeElement)
            .catch(() => false);
          break;
        default:
          result = false;
      }
      return String(result);
    }

    case "title": {
      const title = await target.evaluate(() => document.title);
      return title;
    }

    default:
      throw new Error(`Unknown read command: ${command}`);
  }
}
