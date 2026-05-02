---
name: qa
description: Browser-based QA testing. Navigate pages, test forms and interactions, find bugs, fix with atomic git commits, re-verify, generate regression tests. Use when asked to "qa", "test this site", "find bugs", "test and fix". Proactively suggest when a feature is deployed and ready for verification.
allowed-tools: bash, read, edit, write, grep, find
compatibility: requires pi-browse extension installed (or Chrome + browser-tools as fallback)
---

# QA Test

Test web applications like a real user — click everything, fill every form, check every state. Find bugs, fix them with atomic commits, re-verify.

---

## Brain Context Load

Before testing, search your brain for relevant QA history:

1. Extract keywords from the page URL, feature name, and error patterns.
2. Use `gbrain_search` to find past QA reports, known fragile areas, or related bugs.
3. Use `gbrain_get` to read the top 3 matches.
4. Use this context to prioritize test areas — focus on previously fragile features first.

If gbrain tools are not available, proceed without brain context.

---

## Browser Setup

**Primary (pi-browse extension):** If `browse_goto` tool is available, use it directly — no setup needed. The extension manages its own headless Chromium.

**Fallback (browser-tools):** If pi-browse tools aren't available, fall back to:
```bash
~/.pi/agent/skills/pi-skills/browser-tools/browser-start.js 2>/dev/null &
sleep 2
curl -s http://localhost:9222/json/version > /dev/null && echo "READY" || echo "CHROME_NOT_READY"
```

## Modes

### Diff-aware (default when on feature branch, no URL given)
```bash
git diff origin/main...HEAD --name-only
git log origin/main..HEAD --oneline
```
Identify affected pages from changed files. Detect running app:
```bash
curl -sf http://localhost:3000 > /dev/null && echo "APP:3000" || \
curl -sf http://localhost:4000 > /dev/null && echo "APP:4000" || \
echo "NO_APP"
```
If app is running locally, test against it. If `NO_APP`, ask user for the target URL.

### Full (URL provided)
Systematic exploration of the target URL.

### Quick (`--quick`)
Smoke test: homepage load, snapshot interactive elements, click top 5 links, check console. For staging/production validation.

## QA Flow (pi-browse)

Follow this pattern for every page tested:

### Phase 1: Navigate + Snapshot

```
browse_goto → <target_url>
browse_snapshot(interactive: true)
```

The snapshot returns all interactive elements labeled @e1, @e2, @e3... with their roles. Use these @refs for all subsequent interactions — never hand-write CSS selectors.

### Phase 2: Page Discovery

```
browse_links          → get all links on the page
browse_snapshot(interactive: true)
```

Review the links. For internal links (same origin), decide which to visit based on the testing mode.

### Phase 3: Interactive Testing

**Forms:**
```
browse_snapshot(interactive: true)          → find all form fields as @refs
browse_fill @e3 "test@example.com"          → fill email field
browse_fill @e4 "Test User"                 → fill name field
browse_click @e12                           → click submit button
browse_snapshot(diff: true)                 → see what changed after submit
browse_is visible ".success-message"        → verify success state
```

**Form validation:**
```
browse_click @e12                           → submit empty form
browse_snapshot(diff: true)                 → see validation errors appear
browse_is visible ".error-message"          → verify error state
```

**Buttons/Links:**
```
browse_click @e2                            → click link/button
browse_snapshot(diff: true)                 → verify navigation/state change
browse_title                                → verify page title
browse_is visible ".dashboard"             → verify expected element
```

**Dialogs:**
```
browse_dialog_accept                        → auto-accept next dialog
browse_click @delete_btn                    → trigger delete confirmation
browse_snapshot(diff: true)                 → verify deletion
```

### Phase 4: Console Check

```
browse_console(errorsOnly: true)            → check for JS errors
```

Flag all errors and warnings. Console errors after interactions = bugs.

### Phase 5: Screenshot Evidence

For each bug found:
```
browse_screenshot → /tmp/qa-bug-N-before.png
# Fix the bug
browse_goto → <same_url>
browse_screenshot → /tmp/qa-bug-N-after.png
```

For responsive testing:
```
browse_responsive(prefix: "/tmp/qa-layout")
→ /tmp/qa-layout-mobile.png
→ /tmp/qa-layout-tablet.png
→ /tmp/qa-layout-desktop.png
```

### Phase 6: Bug Fixing

For each bug:
1. Document with screenshot + repro steps + @ref chain
2. Identify root cause in source code
3. Fix with atomic commit: `git add <file> && git commit -m "fix: <description>"`
4. Re-verify using the same browse flow, confirm fixed

### Phase 7: Regression Tests

If test framework exists, add a regression test for each fixed bug.

## QA Flow (browser-tools fallback)

If pi-browse tools are unavailable, use browser-tools scripts:

```bash
# Navigate
browser-nav.js <target-url>
# Screenshot
browser-screenshot.js /tmp/qa-baseline.png
# Fill forms (need to find selectors manually)
browser-eval.js "document.querySelector('input[name=\"email\"]').value='test@test.com'"
browser-eval.js "document.querySelector('button[type=\"submit\"]').click()"
sleep 2
browser-screenshot.js /tmp/qa-after-submit.png
# Check for errors
browser-eval.js "JSON.stringify((window.__qaErrors || []).slice(-20))"
```

Prefer pi-browse for its @ref system — no manual selector guessing needed.

## Severity Classification

Reference `references/issue-taxonomy.md` for the full taxonomy. Quick reference:

| Severity | Criteria | Fix? |
|----------|----------|------|
| CRITICAL | Crash, data loss, security, 500 error | Always |
| HIGH | Broken core feature, blocked user flow | Always |
| MEDIUM | Visual glitch, edge case, a11y issue | Standard tier |
| LOW | Cosmetic, typo, minor style | Exhaustive only |

---

## Output Format

```
═══════════════════════════════
QA REPORT — <url>
═══════════════════════════════
MODE: <mode> | PAGES: N tested | DURATION: <time>
BROWSER: pi-browse / browser-tools

FINDINGS
[B1] CRITICAL — <one-line description>
  Page: <url>
  Repro: browse_goto → <url>, browse_snapshot → @e3, browse_click @e3
  Evidence: /tmp/qa-bug-1-before.png
  Fix: <commit-hash> — <description>
  After: /tmp/qa-bug-1-after.png

HEALTH SCORE: X/10
SUMMARY: CRITICAL N | HIGH M | MEDIUM K | LOW L
─────────────────────────────────
```
