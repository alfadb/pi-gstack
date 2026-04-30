---
name: qa
description: Browser-based QA testing. Navigate pages, test forms and interactions, find bugs, fix with atomic git commits, re-verify, generate regression tests. Use when asked to "qa", "test this site", "find bugs", "test and fix". Proactively suggest when a feature is deployed and ready for verification.
allowed-tools: bash, read, edit, write, grep, find
compatibility: requires Chrome running on localhost:9222 and browser-tools skill installed
---

# QA Test

Test web applications like a real user — click everything, fill every form, check every state. Find bugs, fix them with atomic commits, re-verify.

## Prerequisites

Chrome must be running with remote debugging:
```bash
~/.pi/agent/skills/pi-skills/browser-tools/browser-start.js 2>/dev/null &
sleep 2
curl -s http://localhost:9222/json/version > /dev/null && echo "READY" || echo "CHROME_NOT_READY"
```

Browser tool paths (relative to browser-tools skill directory):
- `browser-nav.js <url>` — navigate
- `browser-screenshot.js <file>` — take screenshot
- `browser-eval.js <js>` — evaluate JavaScript
- `browser-content.js` — extract page content as markdown
- `browser-start.js` — launch Chrome

The base path is `~/.pi/agent/skills/pi-skills/browser-tools/`.

## Modes

### Diff-aware (default when on feature branch, no URL)
```bash
git diff origin/main...HEAD --name-only
git log origin/main..HEAD --oneline
```
Identify affected pages from changed files. Detect running app:
```bash
curl -s http://localhost:3000 > /dev/null && echo "APP:3000" || \
curl -s http://localhost:4000 > /dev/null && echo "APP:4000" || \
echo "NO_APP"
```

### Full (URL provided)
Systematic exploration of the target URL.

### Quick (`--quick`)
Smoke test: homepage + top 5 links. Check loads, console errors, broken links.

## Phase 1: Navigate + Baseline

```bash
browser-nav.js <target-url>
browser-screenshot.js qa-baseline.png
```

## Phase 2: Page Discovery

```bash
browser-eval.js "Array.from(document.querySelectorAll('a[href]')).map(a => a.href).filter(h => h.startsWith(location.origin)).slice(0, 20)"
```

Visit each discovered page, take screenshot, check console.

## Phase 3: Interactive Testing

**Forms:**
- Fill valid data, submit, verify response
- Fill invalid data, check validation messages
- Check accessibility: labels, tab order, focus

```bash
browser-eval.js "document.querySelector('input[name=\"email\"]').value='test@test.com'"
browser-eval.js "document.querySelector('button[type=\"submit\"]').click()"
sleep 2
browser-screenshot.js qa-after-submit.png
```

**Buttons/Links:** click each, verify expected behavior.
**Dynamic content:** wait for loading, check error states.

## Phase 4: Console Check

```bash
browser-eval.js "JSON.stringify((window.__qaErrors || []).slice(-20))"
```

## Phase 5: Bug Fixing

For each bug:
1. Document with screenshot + repro steps
2. Identify root cause in source
3. Fix with atomic commit: `git add <file> && git commit -m "fix: <desc>"`
4. Re-verify: navigate, reproduce, confirm fixed, take after screenshot

## Phase 6: Regression Tests

If test framework exists, add a regression test for each fixed bug.

## Severity

| Severity | Criteria | Fix? |
|----------|----------|------|
| CRITICAL | Crash, data loss, security, 500 | Always |
| HIGH | Broken core feature, blocked flow | Always |
| MEDIUM | Visual glitch, edge case | Standard tier |
| LOW | Cosmetic, typo | Exhaustive only |

## Output Format

```
═══════════════════════════════
QA REPORT — <url>
═══════════════════════════════
MODE: <mode> | PAGES: N | DURATION: <time>

FINDINGS
[B1] CRITICAL — <description>
  Page: <url> | Repro: <steps>
  Fix: <commit> — <description>

HEALTH SCORE: X/10
─────────────────────────────────
```
