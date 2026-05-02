---
name: canary
description: Post-deploy production monitoring. Watches the live site after deploy — checks pages load, captures screenshots, detects console errors, compares against baselines. Use after /skill:land-and-deploy to verify production health.
allowed-tools: bash, read, write, grep, find
compatibility: requires pi-browse extension installed, git
---

# Canary — Post-Deploy Monitor

Watch production after a deploy. Catch issues that pass CI but break in production — missing env vars, CDN cache serving stale assets, slow DB migrations on real data. Catch in the first 10 minutes, not 10 hours.

## Brain Context Load

Before monitoring, search your brain for production context:

1. Extract keywords from the deploy URL, changed services, and recent changes.
2. Use `gbrain_search` to find past canary reports, production incidents, or known fragile endpoints.
3. Use `gbrain_get` to read the top 3 matches.
4. Use this context to focus monitoring on historically unstable areas.

If gbrain tools are not available or return no results, proceed without brain context.

---

## Arguments

- `/skill:canary <url>` — monitor URL for 10 minutes
- `/skill:canary <url> --duration 5m` — custom duration (1m to 30m)
- `/skill:canary <url> --baseline` — capture baseline BEFORE deploying
- `/skill:canary <url> --pages /,/dashboard,/settings` — specific pages
- `/skill:canary <url> --quick` — single-pass health check

## Phase 1: Setup

```bash
mkdir -p .gstack/canary-reports/baselines .gstack/canary-reports/screenshots
```

Parse arguments. Default: 10 min, auto-discover pages.

## Phase 2: Baseline (--baseline mode)

Capture current state BEFORE deploying. Uses pi-browse tools:

For each page:
```
browse_goto → <page-url>
browse_snapshot(interactive: true)
browse_console(errorsOnly: true)
browse_screenshot → .gstack/canary-reports/baselines/<page-name>.png
browse_js "JSON.stringify({title: document.title, loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart})"
```

Save baseline manifest:

```bash
cat > .gstack/canary-reports/baseline.json << EOF
{
  "url": "<url>",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "branch": "$(git branch --show-current)",
  "commit": "$(git rev-parse --short HEAD)",
  "pages": {
    "/": { "screenshot": "baselines/home.png", "console_errors": 0, "title": "..." }
  }
}
EOF
```

Then STOP: "Baseline captured. Deploy, then run `/skill:canary <url>` to monitor."

## Phase 3: Page Discovery

If no `--pages` specified:
```
browse_goto → <url>
browse_links
```

Extract top 5 internal navigation links. Always include homepage.

## Phase 4: Pre-Deploy Snapshot (if no baseline)

If no baseline exists (`--baseline` not previously run), capture one now as the post-deploy reference:
```
browse_goto → <url>
browse_snapshot(interactive: true)
browse_console(errorsOnly: true)
```

## Phase 5: Continuous Monitoring

For each page, at each interval:

```
browse_goto → <page-url>
browse_snapshot(interactive: true)           → check page structure
browse_console(errorsOnly: true)             → any JS errors?
browse_is visible "body"                     → did page load?
browse_title                                 → correct title?
```

**Alert triggers (immediately report as findings):**
- Console error that wasn't in baseline
- Page fails to load (browse_goto timeout or error status)
- `browse_is visible body` returns false
- Page title changed unexpectedly
- Response status is 4xx or 5xx

**Check interval:**
- First 5 minutes: every 60 seconds
- Remaining duration: every 2 minutes

For `--quick` mode: single pass, no interval.

## Phase 6: Health Report

After monitoring completes, generate report:

```markdown
# Canary Report — {url}
**Deploy:** {branch} @ {commit} | **Duration:** {time} | **Pages:** {count}

## Health Score: {X}/10
- Page loads: {all clear / N failures}
- Console errors: {count} (baseline: {baseline-count})
- Performance: {avg load time}

## Findings
{list of alerts triggered during monitoring}

## Screenshots
| Page | Status | Screenshot |
|------|--------|------------|
| / | ✅ | screenshots/home.png |
| /dashboard | ✅ | screenshots/dashboard.png |

## Console
```
{console errors from last pass}
```
```

Save to:
```bash
REPORT_PATH=".gstack/canary-reports/$(date +%Y-%m-%d-%H%M)-canary.md"
```

**Health Score calculation:**
- Start at 10
- -2 per console error (new since baseline)
- -3 per page load failure
- -1 per unexpected title change
- Floor at 0

## Phase 7: Baseline Update

If monitoring was clean (score ≥ 8), offer to update baseline:
- "All clear! Update baseline to this deploy? (recommended for next canary)"
- If yes: overwrite `baseline.json` with current state

