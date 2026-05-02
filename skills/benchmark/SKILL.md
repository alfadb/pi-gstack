---
name: benchmark
description: Performance regression detection. Measures page load times, resource sizes, and Core Web Vitals. Compares against baselines and flags regressions. Use when asked to "benchmark", "performance test", "check page speed", or before/after performance-sensitive changes.
allowed-tools: bash, read, write, grep, find
compatibility: requires pi-browse extension installed, git
---

# Benchmark — Performance Testing

Measure page performance and detect regressions. Compare against baselines. Flag what got slower.

## Brain Context Load

Before benchmarking, search your brain for performance context:

1. Extract keywords from the target URL, page type, and performance concerns.
2. Use `gbrain_search` to find past benchmarks, performance regressions, or known slow pages.
3. Use `gbrain_get` to read the top 3 matches.
4. Use this context to establish baseline expectations and focus on regressing metrics.

If gbrain tools are not available or return no results, proceed without brain context.

---

## Arguments

- `/skill:benchmark <url>` — benchmark a URL
- `/skill:benchmark <url> --pages /,/dashboard` — specific pages
- `/skill:benchmark <url> --baseline` — capture baseline for future comparison
- `/skill:benchmark <url> --mobile` — test at mobile viewport (375x812)
- `/skill:benchmark <url> --runs 5` — number of runs (default: 3)

## Phase 1: Setup

```bash
mkdir -p .gstack/benchmarks/baselines
```

## Phase 2: Page Discovery

If no `--pages` specified, discover key pages:
```
browse_goto → <url>
browse_links
```

Always include the homepage. Select up to 5 key pages.

## Phase 3: Performance Data Collection

For each page, for each run:

```
browse_viewport → {desktop|mobile size}
browse_goto → <page-url>
browse_wait --networkidle
```

Then collect metrics via browse_js:

```javascript
// Navigation Timing API
browse_js "JSON.stringify({
  dns: performance.timing.domainLookupEnd - performance.timing.domainLookupStart,
  tcp: performance.timing.connectEnd - performance.timing.connectStart,
  ttfb: performance.timing.responseStart - performance.timing.requestStart,
  domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
  load: performance.timing.loadEventEnd - performance.timing.navigationStart,
  fcp: performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint')?.startTime,
  domNodes: document.querySelectorAll('*').length,
  resources: performance.getEntriesByType('resource').length
})"

// Resource breakdown
browse_js "JSON.stringify(
  performance.getEntriesByType('resource')
    .filter(r => r.transferSize > 0)
    .map(r => ({
      name: r.name.substring(r.name.lastIndexOf('/') + 1).substring(0, 40),
      type: r.initiatorType,
      size: r.transferSize,
      duration: Math.round(r.duration)
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 10)
)"
```

## Phase 4: Core Web Vitals Estimate

```
browse_js "JSON.stringify({
  lcp: performance.getEntriesByType('largest-contentful-paint').pop()?.startTime,
  cls: (() => { let score = 0; new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) score += e.value; })).observe({type: 'layout-shift', buffered: true}); return score; })(),
  fid: performance.getEntriesByType('first-input')?.[0]?.processingStart - performance.getEntriesByType('first-input')?.[0]?.startTime
})"
```

## Phase 5: Comparison

If baseline exists (`.gstack/benchmarks/baseline.json`), compare:

```bash
cat .gstack/benchmarks/baseline.json 2>/dev/null || echo "NO_BASELINE"
```

For each metric, calculate:
- Delta from baseline
- Regression flag: >20% slower = 🔴, >10% = 🟡, else 🟢

## Phase 6: Slowest Resources

List the top 10 slowest/heaviest resources across all pages:

```
Resource              Type     Size      Duration
──────────────────────────────────────────────────
main.js               script   245KB     320ms
styles.css            styles   89KB      45ms
hero.png              image    1.2MB     890ms
...
```

## Phase 7: Performance Budget

Check against standard budgets:

| Metric | Budget | Status |
|--------|--------|--------|
| TTFB | < 800ms | ✅/⚠️/🔴 |
| FCP | < 1.8s | ✅/⚠️/🔴 |
| LCP | < 2.5s | ✅/⚠️/🔴 |
| CLS | < 0.1 | ✅/⚠️/🔴 |
| Total JS | < 500KB | ✅/⚠️/🔴 |
| Total CSS | < 100KB | ✅/⚠️/🔴 |
| Total images | < 2MB | ✅/⚠️/🔴 |
| Total requests | < 50 | ✅/⚠️/🔴 |

## Phase 8: Trend Analysis (--trend mode)

If multiple reports exist:

```bash
ls -t .gstack/benchmarks/reports/*.json 2>/dev/null | head -10
```

Plot key metrics over time. Flag any monotonic degradation (3+ consecutive reports getting worse).

## Output

```markdown
# Performance Benchmark — {url}
**Date:** {date} | **Pages:** {count} | **Runs per page:** {N}
**Viewport:** {desktop|mobile} | **Baseline:** {date or "none"}

## Scores
| Page | LCP | FCP | TTFB | CLS | Load Time | vs Baseline |
|------|-----|-----|------|-----|-----------|-------------|
| / | 1.2s | 0.8s | 320ms | 0.02 | 2.1s | 🟢 -5% |
| /dashboard | 2.8s | 1.5s | 450ms | 0.08 | 4.2s | 🔴 +35% |

## Slowest Resources
{top 10 table}

## Budget Report
{7 budgets with status}

## Regressions (if any)
{flagged regressions with evidence}

## Trend (if available)
{Metric trends over time}
```

Save to:
```bash
mkdir -p .gstack/benchmarks/reports
REPORT_PATH=".gstack/benchmarks/reports/$(date +%Y-%m-%d-%H%M)-benchmark.json"
```

Save with full raw metrics for trend analysis. If `--baseline`, also save to `.gstack/benchmarks/baseline.json`.

