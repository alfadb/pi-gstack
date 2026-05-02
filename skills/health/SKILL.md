---
name: health
description: Code quality dashboard. Runs type checker, linter, tests, dead code detection, and shell linting. Scores each category 0-10 and tracks trends. Use when asked to "health check", "code quality", "dashboard", or "how healthy is this codebase".
allowed-tools: bash, read, write, grep, find
compatibility: requires git
---

# Code Quality Dashboard

Run every available quality tool, score the results, present a dashboard. Track trends so the team knows if quality is improving or slipping.

**HARD GATE:** Do NOT fix any issues. Produce the dashboard and recommendations only.

## Brain Context Load

Before the health check, search your brain for quality context:

1. Extract keywords from the codebase language, framework, and toolchain.
2. Use `gbrain_search` to find past health reports, known quality trends, or recurring issues.
3. Use `gbrain_get` to read the top 3 matches.
4. Use this context to compare trends — is quality improving or slipping since last check?

If gbrain tools are not available or return no results, proceed without brain context.

---

## Step 1: Detect Health Stack

Auto-detect available tools:

```bash
# Type checker
[ -f tsconfig.json ] && echo "TYPECHECK: tsc --noEmit"
[ -f pyproject.toml ] && grep -q "mypy\|pyright" pyproject.toml 2>/dev/null && echo "TYPECHECK: mypy ."

# Linter
[ -f biome.json ] || [ -f biome.jsonc ] && echo "LINT: biome check ."
ls eslint.config.* .eslintrc.* .eslintrc 2>/dev/null | head -1 > /dev/null && echo "LINT: eslint ."
[ -f pyproject.toml ] && grep -q "ruff" pyproject.toml 2>/dev/null && echo "LINT: ruff check ."

# Test runner
[ -f package.json ] && grep -q '"test"' package.json 2>/dev/null && echo "TEST: npm test"
[ -f pyproject.toml ] && grep -q "pytest" pyproject.toml 2>/dev/null && echo "TEST: pytest"
[ -f Cargo.toml ] && echo "TEST: cargo test"
[ -f go.mod ] && echo "TEST: go test ./..."

# Dead code
command -v knip >/dev/null 2>&1 && echo "DEADCODE: knip"

# Shell linting
command -v shellcheck >/dev/null 2>&1 && echo "SHELL: shellcheck"
```

If a `## Health Stack` section exists in AGENTS.md, use those tools instead.

## Step 2: Run Tools

Run each detected tool. For each:
1. Record start time
2. Run the command, capture stdout + stderr (last 50 lines)
3. Record exit code + duration

```bash
START=$(date +%s)
TOOL_OUTPUT=$(tsc --noEmit 2>&1 | tail -50)
EXIT=$?
END=$(date +%s)
echo "TOOL:typecheck EXIT:$EXIT DURATION:$((END-START))s OUTPUT_LINES:$(echo "$TOOL_OUTPUT" | wc -l)"
```

Run tools sequentially. Skip tools that aren't installed (mark as `SKIPPED`, not failure).

## Step 3: Score Each Category (0-10)

| Category | Weight | 10 | 7 | 4 | 0 |
|----------|--------|----|---|---|---|
| Type check | 22% | Clean (exit 0) | <10 errors | <50 errors | ≥50 errors |
| Lint | 18% | Clean (exit 0) | <5 warnings | <20 warnings | ≥20 warnings |
| Tests | 28% | All pass (exit 0) | >95% pass | >80% pass | ≤80% pass |
| Dead code | 13% | Clean (exit 0) | <5 unused | <20 unused | ≥20 unused |
| Shell lint | 9% | Clean (exit 0) | <5 issues | ≥5 issues | N/A skip |

**Composite Score:** `SUM(category_score * weight)` rounded to 1 decimal.

## Step 4: Trend Analysis

If previous health reports exist:

```bash
ls -t .gstack/health-reports/*.json 2>/dev/null | head -5
```

Compare current scores against the most recent report. Track:
- Score delta per category
- Composite score trend (↑ improving, ↓ degrading, → stable)
- New issues introduced vs old issues resolved

## Step 5: Git Hygiene (bonus)

```bash
# Stale branches (>30 days since last commit, not main)
git for-each-ref --format='%(refname:short) %(committerdate:unix)' refs/heads/ | \
  while read branch ts; do
    [ "$branch" != "main" ] && [ "$branch" != "master" ] && \
    [ $(($(date +%s) - ts)) -gt 2592000 ] && echo "STALE: $branch"
  done

# Large files in repo
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '$1 == "blob" && $3 > 1048576 {print $4, $3/1048576 "MB"}' | sort -rnk2 | head -5
```

## Output

```markdown
# Code Quality Dashboard
**Date:** {date} | **Branch:** {branch} | **Commit:** {short-hash}

## Scores
| Category | Score | Weight | Weighted | Status | Details |
|----------|-------|--------|----------|--------|---------|
| Type check | N/10 | 22% | X.X | {pass/warn/fail} | {N errors} |
| Lint | N/10 | 18% | X.X | {pass/warn/fail} | {N warnings} |
| Tests | N/10 | 28% | X.X | {pass/warn/fail} | {N/M passed} |
| Dead code | N/10 | 13% | X.X | {pass/warn/fail} | {N unused} |
| Shell lint | N/10 | 9% | X.X | {pass/warn/fail} | {N issues} |

## Composite: X.X/10 {↑/↓/→ vs last report}

## Git Hygiene
- Stale branches: {count}
- Large files (>1MB): {count}

## Top Issues
{top 5 issues requiring attention, ranked by severity}
```

Save to:
```bash
mkdir -p .gstack/health-reports
HEALTH_PATH=".gstack/health-reports/$(date +%Y-%m-%d-%H%M)-health.json"
```

Save as JSON with raw tool outputs and scores for trend tracking.

