/**
 * Per-tab session state — ref map, snapshot baseline, frame context.
 * Ported from gstack browse/src/tab-session.ts.
 */

import type { Page, Locator, Frame } from "playwright";

export interface RefEntry {
  locator: Locator;
  role: string;
  name: string;
}

export class TabSession {
  readonly page: Page;

  // ─── Ref Map (snapshot → @e1, @e2, @c1, @c2, ...) ────────
  private refMap: Map<string, RefEntry> = new Map();

  // ─── Snapshot Diffing ─────────────────────────────────────
  private lastSnapshot: string | null = null;

  // ─── Frame context ─────────────────────────────────────────
  private activeFrame: Frame | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  getPage(): Page {
    return this.page;
  }

  // ─── Ref Resolution ─────────────────────────────────────

  /** Resolve a selector or @ref to a Locator or CSS selector string. */
  async resolveRef(
    ref: string
  ): Promise<{ locator: Locator } | { selector: string }> {
    if (ref.startsWith("@")) {
      // Remove the @ prefix to get the key (e.g., "@e3" -> "e3")
      const key = ref.slice(1);
      const entry = this.refMap.get(key);
      if (!entry) {
        throw new Error(
          `Ref ${ref} not found. Run 'browse_snapshot' to refresh refs.`
        );
      }
      return { locator: entry.locator };
    }
    return { selector: ref };
  }

  /** Get the role of a ref (for auto-routing click → selectOption for <option>) */
  getRefRole(ref: string): string | null {
    if (!ref.startsWith("@")) return null;
    const key = ref.slice(1);
    const entry = this.refMap.get(key);
    return entry?.role ?? null;
  }

  getRefMap(): Map<string, RefEntry> {
    return this.refMap;
  }

  setRefMap(map: Map<string, RefEntry>): void {
    this.refMap = map;
  }

  // ─── Snapshot Diffing ─────────────────────────────────

  getLastSnapshot(): string | null {
    return this.lastSnapshot;
  }

  setLastSnapshot(snapshot: string): void {
    this.lastSnapshot = snapshot;
  }

  // ─── Frame Context ────────────────────────────────────

  getFrame(): Frame | null {
    return this.activeFrame;
  }

  setFrame(frame: Frame | null): void {
    this.activeFrame = frame;
  }

  getActiveFrameOrPage(): Frame | Page {
    return this.activeFrame ?? this.page;
  }
}
