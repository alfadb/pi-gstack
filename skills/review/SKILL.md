---
name: review
description: Pre-landing PR review. Analyze diff against base branch for SQL safety, race conditions, scope drift, shell injection, and structural issues. Use when asked to "review", "code review", or before merging. Proactively suggest when code changes are ready for review.
allowed-tools: bash, read, edit, write, grep, find
compatibility: requires git
---

# Code Review

Review the current branch's diff against the base branch (default: `main`). Find issues that compile and pass CI but fail in production.

## Step 1: Detect branch and base

```bash
BRANCH=$(git branch --show-current)
echo "BRANCH: $BRANCH"
BASE=${1:-main}
```

If on the base branch, stop: **"Nothing to review — you're on the base branch."**

Fetch and verify diff exists:
```bash
git fetch origin $BASE --quiet
git diff origin/$BASE --stat
```
If no diff, stop.

## Step 2: Scope Drift Detection

Before reviewing quality, check: **did they build what was requested?**

Collect intent sources and compare against diff:
```bash
git log origin/$BASE..HEAD --oneline
cat TODOS.md 2>/dev/null || echo "NO_TODOS"
git diff origin/$BASE --stat
```

Flag **SCOPE CREEP**: files unrelated to stated intent, "while I was in there" changes.
Flag **MISSING REQUIREMENTS**: TODOS.md items not in diff, partial implementations.

Output:
```
Scope Check: [CLEAN / DRIFT DETECTED / MISSING]
Intent: <1-line summary>
Delivered: <1-line summary>
```

## Step 3: Critical Pass

### SQL & Data Safety
- String interpolation in queries
- Missing `limit` on unbounded queries
- N+1 queries
- Missing indexes for new WHERE/ORDER columns
- `update_all` / `delete_all` without WHERE
- Transaction boundary gaps

### Race Conditions & Concurrency
- Shared state mutation without locks
- Read-check-then-write patterns
- Background job ordering assumptions
- Cache invalidation timing
- Webhook handlers without idempotency keys

### Shell Injection
- User input reaching shell commands
- Unquoted variables in shell strings
- `eval` / `system()` with dynamic content

### Enum & Value Completeness
When new enum values are introduced:
- Use `grep` to find ALL files referencing sibling values
- Use `read` to check every location for new value handling

### LLM Output Trust Boundary
- LLM output rendered as HTML without sanitization
- LLM output passed to shell, SQL, or eval

## Step 4: Informational Pass (advisory)

- Error handling gaps in IO operations, API calls, DB queries
- Edge cases: empty input, nil, timeouts, large payloads
- Type safety: unchecked casts, nullable without nil-checks
- PII or secrets in log statements

## Confidence Calibration

| Score | Meaning | Display |
|-------|---------|---------|
| 9-10 | Verified by reading specific code | Show normally |
| 7-8 | High-confidence pattern match | Show normally |
| 5-6 | Moderate, could be false positive | Show with caveat |
| 3-4 | Suspicious but likely fine | Appendix only |
| 1-2 | Speculation | Only if P0 |

## Output Format

```
═══════════════════════════════
CODE REVIEW — <branch> vs origin/<base>
═══════════════════════════════

Scope Check: <CLEAN/DRIFT/MISSING>

CRITICAL FINDINGS
[P0] (confidence: N/10) file:line — description
  Fix: <concrete suggestion>

ADVISORY FINDINGS
[P2] (confidence: N/10) file:line — description

SUMMARY
P0: N | P1: N | P2: N
Recommendation: [APPROVE / APPROVE WITH FIXES / DO NOT MERGE]
─────────────────────────────────
```

## Auto-fix Rules

- P0 confidence 9-10 and fix ≤ 5 lines: apply with `edit`, report AUTO-FIXED
- P1 trivial fix (typo, missing nil check): apply, report AUTO-FIXED
- All others: report for user decision

## Priorities

- P0: data loss, security vulnerability, runtime crash
- P1: edge case bug, race condition, data integrity risk
- P2: style, performance, maintainability
