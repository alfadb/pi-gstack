---
description: Pre-landing PR review. Analyze diff for SQL safety, race conditions, scope drift, shell injection, and structural issues. Use when asked to "review", "code review", or before merging.
argument-hint: "[base-branch]"
---

# Code Review

Review the current branch's diff against the base branch (default: `main`). Find issues that compile and pass CI but fail in production.

## Step 1: Detect branch and base

```bash
BRANCH=$(git branch --show-current)
echo "BRANCH: $BRANCH"
```

If on the base branch (e.g., `main`), stop: **"Nothing to review — you're on the base branch."**

Set `BASE=<user-arg>` or default to `main`. Fetch and verify diff exists:

```bash
git fetch origin $BASE --quiet
git diff origin/$BASE --stat
```

If no diff, stop: **"No changes against origin/$BASE."**

## Step 2: Scope Drift Detection

Before reviewing quality, check: **did they build what was requested?**

### 2.1 Collect intent sources

```bash
# Commit messages
git log origin/$BASE..HEAD --oneline
# TODOS.md if exists
cat TODOS.md 2>/dev/null || echo "NO_TODOS"
```

Identify the **stated intent** — what was this branch supposed to accomplish?

### 2.2 Compare intent vs diff

Run `git diff origin/$BASE --stat` and compare files changed against stated intent.

Flag as **SCOPE CREEP**:
- Files changed unrelated to stated intent
- "While I was in there..." changes expanding blast radius
- New features or refactors not mentioned in commit messages/TODOS

Flag as **MISSING REQUIREMENTS**:
- Requirements from TODOS.md not addressed in diff
- Partial implementations (started but not finished)
- Test coverage gaps for stated requirements

Output before the main review:
```
Scope Check: [CLEAN / DRIFT DETECTED / MISSING]
Intent: <1-line summary>
Delivered: <1-line summary of what the diff actually does>
[If drift: list each out-of-scope change with file path]
[If missing: list each unaddressed requirement]
```

## Step 3: Critical Pass

Apply these categories to every file in the diff. Read files with `read` as needed — don't rely on diff context alone.

### 3.1 SQL & Data Safety

Check every database query in the diff:
- String interpolation in WHERE/VALUES (`"SELECT * FROM users WHERE id = #{params[:id]}"`)
- Missing `limit` on unbounded queries
- N+1 queries: associations loaded in loops
- Missing indexes for new WHERE/ORDER columns
- Raw SQL when ORM method exists
- `update_all` / `delete_all` without WHERE
- Transaction boundaries: multiple writes not wrapped in transaction

### 3.2 Race Conditions & Concurrency

- Shared state mutation without locks
- Read-check-then-write patterns (`if exists? → create`)
- `find_or_create_by` without unique index
- Background job ordering assumptions
- Cache invalidation timing issues
- Webhook handlers without idempotency keys

### 3.3 Shell Injection

Every `bash` call in the code:
- User input reaching shell commands
- Unquoted variables in shell strings
- `eval` / `system()` / backticks with dynamic content
- File paths from user input passed to shell

### 3.4 Enum & Value Completeness

When the diff introduces new enum values, statuses, tiers, or type constants:
- Use `grep` to find ALL files referencing sibling values
- Use `read` to check if the new value is handled in every location
- Missing cases in switch/case, if/elsif chains, or pattern matches

### 3.5 LLM Output Trust Boundary

- LLM-generated text rendered as HTML without sanitization
- LLM output stored in database and rendered later
- LLM output passed to shell, SQL, or eval
- LLM output used in authorization decisions

## Step 4: Informational Pass

These are advisory — report but don't block:

- **Error handling gaps**: missing rescue/except for IO operations, API calls, DB queries
- **Completeness**: edge cases not handled (empty input, nil, timeouts, large payloads)
- **Type safety**: unchecked casts, nullable values used without nil-checks
- **Logging**: PII or secrets in log statements
- **Performance**: O(n²) patterns, unnecessary allocations, missing pagination

## Confidence Calibration

Every finding MUST include a confidence score (1-10):

| Score | Meaning | Display |
|-------|---------|---------|
| 9-10 | Verified by reading specific code | Show normally |
| 7-8 | High-confidence pattern match | Show normally |
| 5-6 | Moderate, could be false positive | Show with caveat |
| 3-4 | Suspicious but likely fine | Appendix only |
| 1-2 | Speculation | Only report if P0 severity |

## Output Format

```
═══════════════════════════════
CODE REVIEW — <branch> vs origin/<base>
═══════════════════════════════

Scope Check: <CLEAN/DRIFT/MISSING>
[scope details if applicable]

CRITICAL FINDINGS
─────────────────
[P0] (confidence: N/10) file:line — description
  Fix: <concrete fix suggestion>
[P1] (confidence: N/10) file:line — description
  Fix: <concrete fix suggestion>

ADVISORY FINDINGS
─────────────────
[P2] (confidence: N/10) file:line — description
  Suggestion: <improvement>

SUMMARY
─────────────────
P0: N | P1: N | P2: N
Recommendation: [APPROVE / APPROVE WITH FIXES / DO NOT MERGE]
─────────────────
```

## Auto-fix Rules

- P0 confidence 9-10 and fix is ≤ 5 lines: apply the fix with `edit`, report as AUTO-FIXED
- P1 with clear trivial fix (typo, missing nil check): apply, report as AUTO-FIXED
- Everything else: report for user to decide
- After auto-fixing, re-run `git diff --stat` to confirm changes are minimal

## Priorities

- P0 (blocking merge): data loss, security vulnerability, runtime crash
- P1 (should fix): bug in edge case, race condition, data integrity risk
- P2 (advisory): style, performance, maintainability
