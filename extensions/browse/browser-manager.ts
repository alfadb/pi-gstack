/**
 * Browser lifecycle manager — simplified port from gstack browse/src/browser-manager.ts.
 *
 * Manages Playwright Chromium: launch, tab creation/switching, console/network/dialog
 * capture, ref resolution, idle timeout. No headed mode, no cookie import, no tunnels.
 */

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
  type Locator,
} from "playwright";
import { addConsoleEntry, addNetworkEntry, addDialogEntry } from "./buffers";
import { TabSession, type RefEntry } from "./tab-session";

export type { RefEntry };
export { TabSession };

// ─── URL Validation ────────────────────────────────────────

/** Validate a URL for navigation. Rejects file:// and non-http URLs. */
function validateNavigationUrl(raw: string): string {
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

// ─── Content Security Wrapping ─────────────────────────────

const UNTRUSTED_MARKER_BEGIN = "═══ BEGIN UNTRUSTED WEB CONTENT ═══";
const UNTRUSTED_MARKER_END = "═══ END UNTRUSTED WEB CONTENT ═══";

export function wrapUntrustedContent(
  content: string,
  sourceUrl?: string
): string {
  const source = sourceUrl ? ` [source: ${sourceUrl}]` : "";
  return `${UNTRUSTED_MARKER_BEGIN}${source}\n${content}\n${UNTRUSTED_MARKER_END}`;
}

// ─── BrowserManager ───────────────────────────────────────

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private pages: Map<number, Page> = new Map();
  private tabSessions: Map<number, TabSession> = new Map();
  private activeTabId: number = 0;
  private nextTabId: number = 1;
  private currentViewport = { width: 1280, height: 720 };
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimeoutMs = 30 * 60 * 1000; // 30 min

  // Dialog auto-accept
  private dialogAutoAccept = true;
  private dialogPromptText: string | null = null;

  // Console/network capture
  private consoleCaptureEnabled = true;
  private networkCaptureEnabled = true;

  constructor(idleTimeoutMs?: number) {
    if (idleTimeoutMs !== undefined) this.idleTimeoutMs = idleTimeoutMs;
  }

  // ─── Lifecycle ──────────────────────────────────────────

  async launch(): Promise<void> {
    if (this.browser) return; // already launched

    this.browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    this.context = await this.browser.newContext({
      viewport: this.currentViewport,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });

    // Set up dialog handling on context
    this.context.on("page", (page) => {
      page.on("dialog", async (dialog) => {
        const type = dialog.type();
        const message = dialog.message();
        const defaultValue = dialog.defaultValue();

        if (this.dialogAutoAccept) {
          if (type === "prompt" && this.dialogPromptText !== null) {
            await dialog.accept(this.dialogPromptText);
            addDialogEntry({
              timestamp: Date.now(),
              type,
              message,
              defaultValue,
              action: "accepted",
              response: this.dialogPromptText,
            });
          } else {
            await dialog.accept();
            addDialogEntry({
              timestamp: Date.now(),
              type,
              message,
              defaultValue,
              action: "accepted",
            });
          }
        } else {
          await dialog.dismiss();
          addDialogEntry({
            timestamp: Date.now(),
            type,
            message,
            defaultValue,
            action: "dismissed",
          });
        }
      });
    });

    // Create initial tab
    const page = await this.context.newPage();
    const tabId = this.nextTabId++;
    this.pages.set(tabId, page);
    this.tabSessions.set(tabId, new TabSession(page));
    this.activeTabId = tabId;

    // Set up console/network capture on all pages
    this.setupPageCapture(page);

    // Watch for new pages (popups)
    this.context.on("page", (page) => {
      this.setupPageCapture(page);
    });

    this.resetIdleTimer();
  }

  private setupPageCapture(page: Page): void {
    if (this.consoleCaptureEnabled) {
      page.on("console", (msg) => {
        addConsoleEntry({
          timestamp: Date.now(),
          level: msg.type(),
          text: msg.text(),
        });
      });
    }
    if (this.networkCaptureEnabled) {
      page.on("request", (req) => {
        const startTime = Date.now();
        const entry = {
          timestamp: startTime,
          method: req.method(),
          url: req.url(),
          status: undefined as number | undefined,
          duration: undefined as number | undefined,
          size: undefined as number | undefined,
        };
        addNetworkEntry(entry);
        req.response().then((resp) => {
          entry.status = resp?.status();
          entry.duration = Date.now() - startTime;
          resp?.body().then((body) => {
            entry.size = body.length;
          }).catch(() => {});
        }).catch(() => {});
      });
    }
  }

  async shutdown(): Promise<void> {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    // Close all pages
    for (const page of this.pages.values()) {
      try {
        await page.close();
      } catch {}
    }
    this.pages.clear();
    this.tabSessions.clear();
    // Close context then browser
    if (this.context) {
      try {
        await this.context.close();
      } catch {}
      this.context = null;
    }
    if (this.browser) {
      try {
        await this.browser.close();
      } catch {}
      this.browser = null;
    }
  }

  isAlive(): boolean {
    return this.browser !== null;
  }

  // ─── Idle Timer ─────────────────────────────────────────

  resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      console.log(
        `[browse] Idle for ${this.idleTimeoutMs / 1000}s, shutting down`
      );
      this.shutdown();
    }, this.idleTimeoutMs);
  }

  // ─── Tabs ───────────────────────────────────────────────

  getActiveTabId(): number {
    return this.activeTabId;
  }

  getActiveSession(): TabSession {
    const session = this.tabSessions.get(this.activeTabId);
    if (!session) throw new Error("No active tab session");
    return session;
  }

  async newTab(url?: string): Promise<number> {
    if (!this.context) throw new Error("Browser not launched");

    const page = await this.context.newPage();
    const tabId = this.nextTabId++;
    this.pages.set(tabId, page);
    this.tabSessions.set(tabId, new TabSession(page));
    this.activeTabId = tabId;

    if (url) {
      const normalizedUrl = await validateNavigationUrl(url);
      await page.goto(normalizedUrl, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
    }

    this.resetIdleTimer();
    return tabId;
  }

  switchTab(tabId: number): void {
    if (!this.pages.has(tabId)) throw new Error(`Tab ${tabId} not found`);
    this.activeTabId = tabId;
  }

  async closeTab(tabId: number): Promise<void> {
    const page = this.pages.get(tabId);
    if (!page) throw new Error(`Tab ${tabId} not found`);

    await page.close();
    this.pages.delete(tabId);
    this.tabSessions.delete(tabId);

    if (this.activeTabId === tabId) {
      // Switch to another tab
      const remaining = [...this.pages.keys()];
      if (remaining.length > 0) {
        this.activeTabId = remaining[remaining.length - 1];
      } else {
        this.activeTabId = 0;
      }
    }
  }

  getTabCount(): number {
    return this.pages.size;
  }

  getCurrentUrl(): string {
    try {
      return this.getActiveSession().getPage().url();
    } catch {
      return "about:blank";
    }
  }

  // ─── Viewport ──────────────────────────────────────────

  getCurrentViewport(): { width: number; height: number } {
    return { ...this.currentViewport };
  }

  async setViewport(width: number, height: number): Promise<void> {
    this.currentViewport = { width, height };
    const session = this.getActiveSession();
    await session.getPage().setViewportSize({ width, height });
  }

  // ─── Ref Resolution (delegates to active session) ──────

  resolveRef(ref: string) {
    return this.getActiveSession().resolveRef(ref);
  }

  // ─── Tab Listing ────────────────────────────────────

  listTabs(): Array<{ id: number; url: string; active: boolean }> {
    const tabs: Array<{ id: number; url: string; active: boolean }> = [];
    for (const [id, page] of this.pages) {
      tabs.push({
        id,
        url: page.url(),
        active: id === this.activeTabId,
      });
    }
    return tabs;
  }

  getSession(tabId: number): TabSession {
    const session = this.tabSessions.get(tabId);
    if (!session) throw new Error(`Tab ${tabId} not found`);
    return session;
  }

  // ─── Cookies ─────────────────────────────────────────

  async getCookies(): Promise<string> {
    if (!this.context) throw new Error("Browser not launched");
    const cookies = await this.context.cookies();
    // Redact sensitive values
    const sensitivePatterns = [
      /session/i, /token/i, /secret/i, /key/i, /password/i,
      /credential/i, /auth/i, /jwt/i, /csrf/i,
    ];
    const redacted = cookies.map((c) => {
      const isSensitive = sensitivePatterns.some((p) => p.test(c.name));
      return {
        name: c.name,
        domain: c.domain,
        path: c.path,
        value: isSensitive ? "[REDACTED]" : c.value.substring(0, 20) + (c.value.length > 20 ? "..." : ""),
        httpOnly: c.httpOnly,
        secure: c.secure,
        expires: c.expires,
      };
    });
    return JSON.stringify(redacted, null, 2);
  }

  async setCookie(
    name: string,
    value: string,
    domain?: string,
    path?: string
  ): Promise<void> {
    if (!this.context) throw new Error("Browser not launched");

    // If no domain given, derive from current page URL
    const cookieDomain =
      domain ||
      (() => {
        try {
          return new URL(this.getCurrentUrl()).hostname;
        } catch {
          throw new Error(
            "No domain specified and current page has no valid URL"
          );
        }
      })();

    await this.context.addCookies([
      {
        name,
        value,
        domain: cookieDomain.startsWith(".")
          ? cookieDomain
          : `.${cookieDomain}`,
        path: path || "/",
      },
    ]);
  }

  async importCookies(jsonStr: string): Promise<number> {
    if (!this.context) throw new Error("Browser not launched");

    let data: any;
    try {
      data = JSON.parse(jsonStr);
    } catch {
      throw new Error(
        "Invalid JSON. Expected Playwright cookie array or {cookies: [...]}"
      );
    }

    // Accept both Playwright cookie array and {cookies: [...]} wrappers
    const cookies =
      Array.isArray(data) ? data : data.cookies || data.Cookies || [];

    if (!Array.isArray(cookies) || cookies.length === 0) {
      throw new Error("No cookies found in input");
    }

    // Validate and normalize cookie format
    const validCookies = cookies
      .filter((c: any) => c.name && c.value && (c.domain || this.getCurrentUrl()))
      .map((c: any) => ({
        name: c.name,
        value: c.value,
        domain: c.domain || (() => { try { return new URL(this.getCurrentUrl()).hostname; } catch { return ""; } })(),
        path: c.path || "/",
        httpOnly: c.httpOnly ?? false,
        secure: c.secure ?? true,
        sameSite: (c.sameSite as "Strict" | "Lax" | "None") ?? "Lax",
        expires: c.expires ?? -1,
      }));

    await this.context.addCookies(validCookies);
    return validCookies.length;
  }

  // ─── Dialog Control ────────────────────────────────────

  setDialogAutoAccept(accept: boolean, promptText?: string): void {
    this.dialogAutoAccept = accept;
    this.dialogPromptText = promptText ?? null;
  }
}
