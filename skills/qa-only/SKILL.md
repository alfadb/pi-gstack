---
name: qa-only
description: QA testing without fixing. Find bugs, document with screenshots and repro steps, generate report. Does NOT modify source code. Use when asked to "find bugs", "test and report", or when you want a read-only QA pass.
allowed-tools: bash, read, write, grep, find
compatibility: requires pi-browse extension installed
---

# QA-Only — Find & Report (No Fix)

Test web applications and report bugs. **Do NOT modify source code.** This is a read-only QA pass — find issues, document them, produce a report.

## Browser Setup

Uses pi-browse extension tools: `browse_goto`, `browse_snapshot`, `browse_click`, `browse_fill`, `browse_is`, `browse_console`, `browse_screenshot`, `browse_responsive`.

If pi-browse tools are not available, fall back to browser-tools scripts.

## Modes

| Mode | Trigger | Scope |
|------|---------|-------|
| **Smoke** | `--quick` or default on CI | Homepage loads, critical path works, no console errors |
| **Standard** | (default with URL) | All primary flows, forms, links, responsive |
| **Exhaustive** | `--exhaustive` | Every page, every state, every edge case |

## Flow

### 1. Navigate + Baseline

```
browse_goto → <url>
browse_snapshot(interactive: true)    → find all interactive elements
browse_console(errorsOnly: true)      → catch JS errors on load
browse_screenshot → /tmp/qa-baseline.png
```

### 2. Page Discovery

```
browse_links           → get all same-origin links
```

For each link (smoke: top 5, standard: top 15, exhaustive: all):
```
browse_goto → <link>
browse_snapshot(interactive: true)
browse_console(errorsOnly: true)
```

### 3. Interactive Testing

**Forms:**
```
browse_snapshot(interactive: true)          → find fields as @refs
browse_fill @e3 "test@example.com"          → fill with valid data
browse_click @e_submit                       → submit
browse_snapshot(diff: true)                  → verify state change
browse_is visible ".success-message"         → assert success

browse_click @e_submit                       → submit empty (without filling)
browse_snapshot(diff: true)                  → check validation
browse_is visible ".error-message"           → assert error shown
```

**Navigation:**
```
browse_click @e_nav_link
browse_title                                 → verify expected page
browse_is visible "h1"                       → verify content loaded
```

### 4. Console & Network

```
browse_console(errorsOnly: true)             → all errors are bugs
```

### 5. Responsive

```
browse_responsive(prefix: "/tmp/qa-layout")  → mobile/tablet/desktop
```

Check: no horizontal scroll, no overlapping elements, touch targets adequate.

### 6. Accessibility Quick Check

```
browse_js "document.querySelectorAll('img:not([alt])').length"           → images without alt
browse_js "document.querySelectorAll('input:not([aria-label]):not([aria-labelledby]):not([id])').length" → inputs without labels
browse_js "document.querySelectorAll('[role]').length"                   → ARIA roles present
```

## Severity

| Severity | Criteria |
|----------|----------|
| CRITICAL | Crash, 500 error, data loss, XSS, auth bypass, blank page |
| HIGH | Broken core feature, blocked user flow, JS error on critical path |
| MEDIUM | Visual glitch, edge case, accessibility issue, console warning |
| LOW | Cosmetic, typo, minor alignment, missing hover state |

## Output

Do NOT fix anything. Produce a report:

```markdown
# QA Report — {url}
**Date:** {date} | **Mode:** {smoke|standard|exhaustive} | **Duration:** {time}

## Summary
Pages tested: N | Issues found: M (C: X, H: Y, M: Z, L: W)

## Findings

### [B1] {SEVERITY} — {one-line description}
- **Page:** {url}
- **Repro steps:**
  1. browse_goto → {url}
  2. browse_snapshot → {what you see}
  3. browse_click @e{N} / browse_fill @e{N} "{value}"
  4. {what breaks}
- **Expected:** {what should happen}
- **Actual:** {what actually happens}
- **Evidence:** /tmp/qa-bug-{N}.png

### [B2] ...

## Screenshots
| Bug | Before |
|-----|--------|
| B1 | /tmp/qa-bug-1.png |
| B2 | /tmp/qa-bug-2.png |

## Responsive
| Viewport | Screenshot | Issues |
|----------|-----------|--------|
| Mobile (375x812) | /tmp/qa-layout-mobile.png | {issues} |
| Tablet (768x1024) | /tmp/qa-layout-tablet.png | {issues} |
| Desktop (1280x720) | /tmp/qa-layout-desktop.png | {issues} |

## Console
```
{console errors}
```

## Accessibility
- Images without alt: {count}
- Inputs without labels: {count}
- ARIA roles: {count}
```

Save report to:
```bash
mkdir -p .gstack/qa-reports
QA_PATH=".gstack/qa-reports/$(date +%Y-%m-%d-%H%M)-qa-report.md"
```
