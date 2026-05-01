/**
 * Snapshot command — accessibility tree with ref-based element selection.
 * Ported from gstack browse/src/snapshot.ts.
 *
 * Architecture:
 *   1. page.locator.ariaSnapshot() → YAML-like accessibility tree
 *   2. Parse tree, assign refs @e1, @e2, ...
 *   3. Build Playwright Locator for each ref
 *   4. Store Map<string, Locator> on TabSession
 *   5. Return formatted text with refs
 */

import type { Page, Frame, Locator } from "playwright";
import type { TabSession, RefEntry } from "./tab-session";
import * as Diff from "diff";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const TEMP_DIR = os.tmpdir();

// Roles considered "interactive" for the interactive filter
const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "textbox",
  "checkbox",
  "radio",
  "combobox",
  "listbox",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "searchbox",
  "slider",
  "spinbutton",
  "switch",
  "tab",
  "treeitem",
]);

export interface SnapshotOptions {
  interactive?: boolean;
  compact?: boolean;
  depth?: number;
  selector?: string;
  diff?: boolean;
  annotate?: boolean;
  outputPath?: string;
  cursorInteractive?: boolean;
}

interface ParsedNode {
  indent: number;
  role: string;
  name: string | null;
  props: string;
  children: string;
  rawLine: string;
}

/**
 * Parse one line of ariaSnapshot output.
 */
function parseLine(line: string): ParsedNode | null {
  const match = line.match(
    /^(\s*)-\s+(\w+)(?:\s+"([^"]*)")?(?:\s+(\[.*?\]))?\s*(?::\s*(.*))?$/
  );
  if (!match) return null;
  return {
    indent: match[1].length,
    role: match[2],
    name: match[3] ?? null,
    props: match[4] || "",
    children: match[5]?.trim() || "",
    rawLine: line,
  };
}

export interface SnapshotResult {
  text: string;
  refs: Array<{ id: string; role: string; name: string }>;
  screenshotPath?: string;
  isDiff?: boolean;
}

/**
 * Take an accessibility snapshot and build the ref map.
 */
export async function handleSnapshot(
  opts: SnapshotOptions,
  session: TabSession
): Promise<SnapshotResult> {
  const page = session.getPage();
  const target = session.getActiveFrameOrPage();

  let rootLocator: Locator;
  if (opts.selector) {
    rootLocator = target.locator(opts.selector);
    const count = await rootLocator.count();
    if (count === 0) throw new Error(`Selector not found: ${opts.selector}`);
  } else {
    rootLocator = target.locator("body");
  }

  const ariaText = await rootLocator.ariaSnapshot();
  if (!ariaText || ariaText.trim().length === 0) {
    session.setRefMap(new Map());
    return { text: "(no accessible elements found)", refs: [] };
  }

  // Parse the ariaSnapshot output
  const lines = ariaText.split("\n");
  const refMap = new Map<string, RefEntry>();
  const output: string[] = [];
  let refCounter = 1;

  // Track role+name occurrences for nth() disambiguation
  const roleNameCounts = new Map<string, number>();
  const roleNameSeen = new Map<string, number>();

  // First pass: count role+name pairs
  for (const line of lines) {
    const node = parseLine(line);
    if (!node) continue;
    const key = `${node.role}:${node.name || ""}`;
    roleNameCounts.set(key, (roleNameCounts.get(key) || 0) + 1);
  }

  // Second pass: assign refs and build locators
  for (const line of lines) {
    const node = parseLine(line);
    if (!node) continue;

    const depth = Math.floor(node.indent / 2);
    const isInteractive = INTERACTIVE_ROLES.has(node.role);

    // Depth filter
    if (opts.depth !== undefined && depth > opts.depth) continue;

    // Interactive filter
    if (opts.interactive && !isInteractive) {
      const key = `${node.role}:${node.name || ""}`;
      roleNameSeen.set(key, (roleNameSeen.get(key) || 0) + 1);
      continue;
    }

    // Compact filter
    if (opts.compact && !isInteractive && !node.name && !node.children) continue;

    // Assign ref
    const ref = `e${refCounter++}`;
    const indent = "  ".repeat(depth);
    const key = `${node.role}:${node.name || ""}`;
    const seenIndex = roleNameSeen.get(key) || 0;
    roleNameSeen.set(key, seenIndex + 1);
    const totalCount = roleNameCounts.get(key) || 1;

    // Build Playwright locator
    let locator: Locator;
    if (opts.selector) {
      locator = target.locator(opts.selector).getByRole(node.role as any, {
        name: node.name || undefined,
      });
    } else {
      locator = target.getByRole(node.role as any, {
        name: node.name || undefined,
      });
    }

    if (totalCount > 1) {
      locator = locator.nth(seenIndex);
    }

    refMap.set(ref, { locator, role: node.role, name: node.name || "" });

    // Format output line
    let outputLine = `${indent}@${ref} [${node.role}]`;
    if (node.name) outputLine += ` "${node.name}"`;
    if (node.props) outputLine += ` ${node.props}`;
    if (node.children) outputLine += `: ${node.children}`;

    output.push(outputLine);
  }

  // ─── Cursor-interactive scan (-C, or auto with -i) ────
  if (opts.interactive) opts.cursorInteractive = true;

  if (opts.cursorInteractive) {
    try {
      const cursorElements = await target.evaluate(() => {
        const STANDARD_INTERACTIVE = new Set([
          "A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "SUMMARY", "DETAILS",
        ]);

        const results: Array<{
          selector: string;
          text: string;
          reason: string;
        }> = [];
        const allElements = document.querySelectorAll("*");

        for (const el of allElements) {
          if (STANDARD_INTERACTIVE.has(el.tagName)) continue;
          const htmlEl = el as HTMLElement;
          if (!htmlEl.offsetParent && el.tagName !== "BODY") continue;

          const style = getComputedStyle(el);
          const hasCursorPointer = style.cursor === "pointer";
          const hasOnclick = el.hasAttribute("onclick");
          const hasTabindex =
            el.hasAttribute("tabindex") &&
            parseInt(el.getAttribute("tabindex")!, 10) >= 0;
          const hasRole = el.hasAttribute("role");

          // Detect floating containers (portals, popovers, dropdowns)
          const isInFloating = (() => {
            let parent: Element | null = el;
            while (parent && parent !== document.documentElement) {
              const pStyle = getComputedStyle(parent);
              const isFloating =
                (pStyle.position === "fixed" ||
                  pStyle.position === "absolute") &&
                parseInt(pStyle.zIndex || "0", 10) >= 10;
              const hasPortalAttr =
                parent.hasAttribute("data-floating-ui-portal") ||
                parent.hasAttribute("data-radix-popper-content-wrapper") ||
                parent.hasAttribute("data-radix-portal") ||
                parent.hasAttribute("data-popper-placement") ||
                parent.getAttribute("role") === "listbox" ||
                parent.getAttribute("role") === "menu";
              if (isFloating || hasPortalAttr) return true;
              parent = parent.parentElement;
            }
            return false;
          })();

          if (!hasCursorPointer && !hasOnclick && !hasTabindex) {
            if (isInFloating && hasRole) {
              const role = el.getAttribute("role");
              if (
                role !== "option" &&
                role !== "menuitem" &&
                role !== "menuitemcheckbox" &&
                role !== "menuitemradio"
              )
                continue;
            } else {
              continue;
            }
          }
          if (hasRole && !isInFloating) continue;

          // Build deterministic CSS path
          const parts: string[] = [];
          let current: Element | null = el;
          while (current && current !== document.documentElement) {
            const parent = current.parentElement;
            if (!parent) break;
            const siblings = [...parent.children];
            const index = siblings.indexOf(current) + 1;
            parts.unshift(
              `${current.tagName.toLowerCase()}:nth-child(${index})`
            );
            current = parent;
          }
          const selector = parts.join(" > ");

          const text =
            (el as HTMLElement).innerText?.trim().slice(0, 80) ||
            el.tagName.toLowerCase();
          const reasons: string[] = [];
          if (isInFloating) reasons.push("popover-child");
          if (hasCursorPointer) reasons.push("cursor:pointer");
          if (hasOnclick) reasons.push("onclick");
          if (hasTabindex) reasons.push(`tabindex=${el.getAttribute("tabindex")}`);
          if (hasRole) reasons.push(`role=${el.getAttribute("role")}`);

          results.push({ selector, text, reason: reasons.join(", ") });
        }
        return results;
      });

      if (cursorElements.length > 0) {
        output.push("");
        output.push("── cursor-interactive (not in ARIA tree) ──");
        let cRefCounter = 1;
        for (const elem of cursorElements) {
          const ref = `c${cRefCounter++}`;
          const locator = target.locator(elem.selector);
          refMap.set(ref, {
            locator,
            role: "cursor-interactive",
            name: elem.text,
          });
          output.push(`@${ref} [${elem.reason}] "${elem.text}"`);
        }
      }
    } catch (err: any) {
      if (
        !err?.message?.includes("Execution context") &&
        !err?.message?.includes("closed") &&
        !err?.message?.includes("Target") &&
        !err?.message?.includes("Content Security")
      )
        throw err;
      output.push("");
      output.push("(cursor scan failed — CSP restriction)");
    }
  }

  // Store ref map on session
  session.setRefMap(refMap);

  if (output.length === 0) {
    return { text: "(no interactive elements found)", refs: [] };
  }

  const snapshotText = output.join("\n");

  // Build refs list for structured output
  const refs: Array<{ id: string; role: string; name: string }> = [];
  for (const [id, entry] of refMap) {
    refs.push({ id: `@${id}`, role: entry.role, name: entry.name });
  }

  // ─── Annotated screenshot (-a) ────────────────────────
  let screenshotPath: string | undefined;

  if (opts.annotate) {
    screenshotPath =
      opts.outputPath || path.join(TEMP_DIR, "browse-annotated.png");

    try {
      const boxes: Array<{
        ref: string;
        box: { x: number; y: number; width: number; height: number };
      }> = [];
      for (const [ref, entry] of refMap) {
        try {
          const box = await entry.locator.boundingBox({ timeout: 1000 });
          if (box) boxes.push({ ref: `@${ref}`, box });
        } catch {
          // skip offscreen/hidden elements
        }
      }

      await page.evaluate((boxes) => {
        for (const { ref, box } of boxes) {
          const overlay = document.createElement("div");
          overlay.className = "__browse_annotation__";
          overlay.style.cssText = `
            position: absolute; top: ${box.y}px; left: ${box.x}px;
            width: ${box.width}px; height: ${box.height}px;
            border: 2px solid red; background: rgba(255,0,0,0.1);
            pointer-events: none; z-index: 99999;
            font-size: 10px; color: red; font-weight: bold;
          `;
          const label = document.createElement("span");
          label.textContent = ref;
          label.style.cssText =
            "position: absolute; top: -14px; left: 0; background: red; color: white; padding: 0 3px; font-size: 10px;";
          overlay.appendChild(label);
          document.body.appendChild(overlay);
        }
      }, boxes);

      await page.screenshot({ path: screenshotPath, fullPage: true });
      await page.evaluate(() => {
        document
          .querySelectorAll(".__browse_annotation__")
          .forEach((el) => el.remove());
      });

      output.push("");
      output.push(`[annotated screenshot: ${screenshotPath}]`);
    } catch (err: any) {
      try {
        await page.evaluate(() => {
          document
            .querySelectorAll(".__browse_annotation__")
            .forEach((el) => el.remove());
        });
      } catch {}
      if (
        !err?.message?.includes("closed") &&
        !err?.message?.includes("Target") &&
        !err?.message?.includes("Execution context")
      )
        throw err;
    }
  }

  // ─── Diff mode (-D) ──────────────────────────────────
  if (opts.diff) {
    const lastSnapshot = session.getLastSnapshot();
    if (!lastSnapshot) {
      session.setLastSnapshot(snapshotText);
      return {
        text:
          snapshotText +
          "\n\n(no previous snapshot to diff against — this snapshot stored as baseline)",
        refs,
        screenshotPath,
        isDiff: true,
      };
    }

    const changes = Diff.diffLines(lastSnapshot, snapshotText);
    const diffOutput: string[] = [
      "--- previous snapshot",
      "+++ current snapshot",
      "",
    ];
    for (const part of changes) {
      const prefix = part.added ? "+" : part.removed ? "-" : " ";
      const diffLines = part.value.split("\n").filter((l) => l.length > 0);
      for (const line of diffLines) {
        diffOutput.push(`${prefix} ${line}`);
      }
    }

    session.setLastSnapshot(snapshotText);
    return {
      text: diffOutput.join("\n"),
      refs,
      screenshotPath,
      isDiff: true,
    };
  }

  return { text: snapshotText, refs, screenshotPath };
}
