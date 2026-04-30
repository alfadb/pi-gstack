---
description: QA testing for web applications. Navigate pages, test interactions, find bugs, fix with atomic commits, re-verify. Use when asked to "qa", "test this site", "find bugs", or "test and fix". Proactively suggest when feature is ready for testing.
argument-hint: "<URL or --diff>"
---

# QA Test

Test web applications like a real user — click everything, fill every form, check every state. Find bugs, fix them with atomic commits, re-verify.

## Setup

Requires Chrome running with remote debugging on port 9222.

```bash
# Start Chrome if not running
~/.pi/agent/skills/pi-skills/browser-tools/browser-start.js 2>/dev/null &
# Verify Chrome is reachable
curl -s http://localhost:9222/json/version > /dev/null 2>&1 && echo "CHROME_READY" || echo "CHROME_NOT_READY"
```

If Chrome not ready, run `browser-start.js` and wait 3 seconds.

## Modes

### Diff-aware (default when on feature branch, no URL given)
Analyze branch changes to determine what to test:
```bash
git diff origin/main...HEAD --name-only
git log origin/main..HEAD --oneline
```

Identify affected pages/routes from changed files, test each. If no app is running, check common ports:
```bash
curl -s http://localhost:3000 > /dev/null 2>&1 && echo "APP:3000" || \
curl -s http://localhost:4000 > /dev/null 2>&1 && echo "APP:4000" || \
curl -s http://localhost:8080 > /dev/null 2>&1 && echo "APP:8080" || \
echo "NO_APP_FOUND"
```

### Full (when URL provided)
Systematic exploration of the target URL. Visit every reachable page, test all interactive elements.

### Quick (`--quick`)
30-second smoke test: homepage + top 5 links. Check: loads? console errors? broken links?

## QA Workflow

### Phase 1: Navigate to target

```bash
# Navigate
~/.pi/agent/skills/pi-skills/browser-tools/browser-nav.js <target-url>
# Screenshot for baseline
~/.pi/agent/skills/pi-skills/browser-tools/browser-screenshot.js qa-baseline.png
```

### Phase 2: Explore pages

Systematically visit every reachable page:

1. Start from homepage or target URL
2. Find all navigation links:
   ```bash
   ~/.pi/agent/skills/pi-skills/browser-tools/browser-eval.js "Array.from(document.querySelectorAll('a[href]')).map(a => a.href).filter(h => h.startsWith(location.origin)).slice(0, 20)"
   ```
3. Visit each page, take screenshot, check console:
   ```bash
   ~/.pi/agent/skills/pi-skills/browser-tools/browser-nav.js <page-url>
   ~/.pi/agent/skills/pi-skills/browser-tools/browser-screenshot.js qa-page-N.png
   ~/.pi/agent/skills/pi-skills/browser-tools/browser-eval.js "window.__consoleErrors || []"
   ```

### Phase 3: Test interactive elements

For each page with forms/buttons:

1. **Forms:**
   - Fill with valid data, submit, check response
   - Fill with invalid data (empty, too long, wrong format), check validation
   - Check accessibility: labels, tab order, focus states

2. **Buttons/Links:**
   - Click each, verify expected behavior
   - Check disabled states

3. **Dynamic content:**
   - Wait for loading states to resolve
   - Check error states (disconnect, timeout)
   - Verify data is displayed correctly

```bash
# Fill a form field
~/.pi/agent/skills/pi-skills/browser-tools/browser-eval.js "document.querySelector('input[name=\"email\"]').value = 'test@example.com'"
# Click a button
~/.pi/agent/skills/pi-skills/browser-tools/browser-eval.js "document.querySelector('button[type=\"submit\"]').click()"
# Wait and screenshot
sleep 2
~/.pi/agent/skills/pi-skills/browser-tools/browser-screenshot.js qa-after-submit.png
```

### Phase 4: Console and network check

```bash
# Check for console errors
~/.pi/agent/skills/pi-skills/browser-tools/browser-eval.js "
  (function() {
    const errors = [];
    const origError = console.error;
    console.error = function(...args) { errors.push(args); origError.apply(console, args); };
    return 'Monitoring enabled';
  })()
"
```

Re-navigate pages and collect errors:
```bash
~/.pi/agent/skills/pi-skills/browser-tools/browser-eval.js "JSON.stringify(window.__qaErrors || [])"
```

### Phase 5: Bug fixing

For each bug found:

1. **Document** with screenshot evidence and reproduction steps
2. **Identify root cause** in source code
3. **Fix** with atomic commit:
   ```bash
   git add <fixed-files>
   git commit -m "fix: <description>"
   ```
4. **Re-verify** the fix:
   - Navigate to affected page
   - Reproduce original bug → should be fixed
   - Take after screenshot
   - No new regressions

### Phase 6: Regression test generation

For each bug fixed, generate a regression test (if test framework exists):
```bash
# Detect test framework
ls jest.config.* vitest.config.* playwright.config.* .rspec pytest.ini 2>/dev/null
```

Add a test that reproduces the original bug and verifies the fix.

## Severity Classification

| Severity | Criteria | Fix? |
|----------|----------|------|
| CRITICAL | App crashes, data loss, security, 500 errors | Always |
| HIGH | Broken core feature, blocked user flow | Always |
| MEDIUM | Visual glitch, edge case, mobile-only | Standard+ tier |
| LOW | Cosmetic, typo, minor misalignment | Exhaustive only |

## Output Format

```
═══════════════════════════════
QA REPORT — <target-url>
═══════════════════════════════

MODE: <full|diff-aware|quick>
PAGES TESTED: N
DURATION: <time>

FINDINGS
────────
[B1] CRITICAL — <description>
  Page: <url>
  Repro: <steps>
  Evidence: qa-screenshots/b1-before.png → qa-screenshots/b1-after.png
  Fix: <commit-hash> — <description>

[B2] HIGH — <description>
  ...

CONSOLE ERRORS: N
REGRESSION TESTS ADDED: N

HEALTH SCORE: X/10
─────────────────────────────────
```

## Tips

- Take before/after screenshots for every fix
- One commit per bug fix — keep them atomic
- If the app requires auth, use `--profile` with browser-start.js to reuse cookies
- For staging URLs, be careful not to trigger production side effects
- If you can't fix a bug, document it clearly and move on — don't get stuck
