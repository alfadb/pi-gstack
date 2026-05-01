---
name: review
description: Pre-landing PR review. Analyze diff against base branch for SQL safety, race conditions, scope drift, shell injection, and structural issues. Use when asked to "review", "code review", or before merging. Proactively suggest when code changes are ready for review.
allowed-tools: bash, read, edit, write, grep, find
compatibility: requires git
---

# Code Review

Review the current branch's diff against the base branch (default: `main`). Find issues that compile and pass CI but fail in production.

## Step 0: Detect platform and base branch

Detect the git hosting platform:

```bash
git remote get-url origin 2>/dev/null
```

- Contains "github.com" → **GitHub** (use `gh`)
- Contains "gitlab" → **GitLab** (use `glab`)
- Neither → use git-native commands only

Determine the base branch:

**GitHub:**
```bash
gh pr view --json baseRefName -q .baseRefName 2>/dev/null || \
gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null || \
echo "main"
```

**GitLab:**
```bash
glab mr view -F json 2>/dev/null | grep -o '"target_branch":"[^"]*"' | cut -d'"' -f4 || \
echo "main"
```

**Git-native fallback:**
```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||' || \
{ git rev-parse --verify origin/main >/dev/null 2>&1 && echo "main"; } || \
{ git rev-parse --verify origin/master >/dev/null 2>&1 && echo "master"; } || \
echo "main"
```

Use the detected branch name wherever the instructions say `<base>`.

## Step 1: Check branch and diff

```bash
BRANCH=$(git branch --show-current)
echo "BRANCH: $BRANCH"
```

If on `<base>` branch, stop: **"Nothing to review — you're on the base branch."**

```bash
git fetch origin <base> --quiet
git diff origin/<base> --stat
```

If no diff, stop.

## Step 2: Scope Drift Detection

Check: **did they build what was requested — nothing more, nothing less?**

Collect intent sources:
```bash
git log origin/<base>..HEAD --oneline
cat TODOS.md 2>/dev/null || echo "NO_TODOS"
gh pr view --json body -q .body 2>/dev/null || true
git diff origin/<base> --stat
```

Flag:
- **SCOPE CREEP**: files unrelated to stated intent, "while I was in there" changes
- **MISSING REQUIREMENTS**: TODOS.md items not in diff, partial implementations

### Step 2.5: Prior Knowledge (Pensieve)

Check pensieve for known patterns, pitfalls, and architecture decisions relevant to the changed files:

```bash
# Check pensieve for project-specific knowledge about the changed files
CHANGED=$(git diff origin/<base> --name-only | head -20 | tr '\n' ' ')
echo "Changed files: $CHANGED"

# Check maxims (hard engineering rules)
ls .pensieve/maxims/*.md 2>/dev/null && echo "Maxims available — review for applicable rules"

# Check decisions (architectural choices)
ls .pensieve/decisions/*.md 2>/dev/null && echo "Decisions available — check for relevant architecture constraints"

# Check knowledge for cached file maps and call chains
ls .pensieve/knowledge/*/content.md 2>/dev/null && echo "Knowledge entries available — check for known module boundaries"
```

If pensieve has relevant entries, apply them: don't re-litigate settled decisions, respect hard maxims, reuse cached exploration.

### Step 2.6: Plan File Discovery

Search gstack-compatible plan file locations (same paths used by Claude Code gstack):
```bash
# Compute project slug
REMOTE=$(git remote get-url origin 2>/dev/null | sed 's|.*[:/]\([^/]*/[^/]*\)\.git$|\1|;s|.*[:/]\([^/]*/[^/]*\)$|\1|' | tr '/' '-' | tr -cd 'a-zA-Z0-9._-')
SLUG="${REMOTE:-$(basename "$PWD" | tr -cd 'a-zA-Z0-9._-')}"
BRANCH=$(git branch --show-current | tr '/' '-' | tr -cd 'a-zA-Z0-9._-')

# Search gstack plan locations
# 1. Design docs at project root (office-hours output)
ls -t ~/.gstack/projects/$SLUG/*-$BRANCH-design-*.md 2>/dev/null | head -2
ls -t ~/.gstack/projects/$SLUG/*-design-*.md 2>/dev/null | head -2
# 2. CEO plans in ceo-plans/ subdirectory
for DIR in ~/.gstack/projects/$SLUG/ceo-plans ~/.gstack/projects/$SLUG/checkpoints; do
  if [ -d "$DIR" ]; then
    ls -t "$DIR"/*.md 2>/dev/null | head -3
  fi
done
```

If found, read the plan file. Extract actionable items (checkbox items, numbered steps, imperative statements, file-level specs). Cross-reference each item against the diff:

- **DONE** — clear evidence in diff
- **PARTIAL** — some work exists but incomplete
- **NOT DONE** — no evidence
- **CHANGED** — different approach, same goal

For each PARTIAL or NOT DONE, investigate why (scope cut / context exhaustion / misunderstood requirement / blocked / forgotten) and assess impact (HIGH/MEDIUM/LOW).

If no plan file exists, rely on commit messages and TODOS.md as fallback.

Output before main review:
```
Scope Check: [CLEAN / DRIFT DETECTED / MISSING]
Intent: <1-line summary>
Plan: <plan file path or "no plan found">
Delivered: <1-line summary>
Plan items: N DONE, M PARTIAL, K NOT DONE
[If NOT DONE: list each missing item with investigation]
Pensieve: <applicable maxims/decisions/knowledge found or "none relevant">
```

## Step 3: Read the Checklist

Read `references/checklist.md`. This is the authoritative source for all review categories and patterns. **If the file cannot be read, STOP and report the error.** Do not proceed without it.

## Step 4: Critical Pass

Apply the CRITICAL categories from the checklist against the full diff:

### CRITICAL (Pass 1 — must flag every instance)

- **SQL & Data Safety**: string interpolation in queries, missing `limit`, N+1 queries, missing indexes for new WHERE/ORDER, `update_all`/`delete_all` without WHERE, transaction boundary gaps
- **Race Conditions & Concurrency**: read-check-write without atomic WHERE, find-or-create without unique index, status transitions without `WHERE old_status = ?`, shared state mutation without locks, webhook handlers without idempotency keys, background job ordering assumptions, cache invalidation timing
- **LLM Output Trust Boundary**: LLM-generated values written to DB/mailer without format validation, structured tool output accepted without type checks, LLM-generated URLs fetched without allowlist (SSRF), LLM output rendered as HTML without sanitization
- **Shell Injection**: user input reaching shell commands, unquoted variables in shell strings, `eval()`/`system()` with dynamic content, `subprocess.run()` with `shell=True` and variable interpolation
- **Enum & Value Completeness**: when new enum values are introduced — use `grep` to find ALL files referencing sibling values, use `read` to check every location for new value handling. Check `case`/`if-elsif` chains for fall-through. Check allowlists/filter arrays for exclusion.

### INFORMATIONAL (Pass 2 — advisory, still actioned)

Read `references/checklist.md` for the full list: Async/Sync Mixing, Column/Field Name Safety, LLM Prompt Issues, Type Coercion at Boundaries, View/Frontend patterns, Time Window Safety, Completeness Gaps, Distribution & CI/CD.

## Step 5: Specialist Reviews

For diffs > 50 lines, apply specialist checklists sequentially against the diff. Each specialist review is an independent pass — read the specialist file, apply its checklist to the diff, record findings.

| Specialist | Reference | Trigger |
|-----------|-----------|---------|
| Testing | `references/testing.md` | Always (≥50 lines) |
| Maintainability | `references/maintainability.md` | Always (≥50 lines) |
| Security | `references/security.md` | Auth/security files changed OR backend + >100 lines |
| Performance | `references/performance.md` | Backend or frontend files changed |
| Data Migration | `references/data-migration.md` | Migration files changed |
| API Contract | `references/api-contract.md` | API/route/controller files changed |
| Red Team | `references/red-team.md` | >200 lines OR any CRITICAL finding |

For each triggered specialist:
1. Read the specialist reference file
2. Apply its checklist against the diff
3. Record findings with specialist tag (e.g., `specialist: testing`)
4. Dedup findings that overlap with the critical pass — keep the highest confidence version, boost by +1 if confirmed by multiple passes

If diff < 50 lines: skip specialists. Print: "Small diff — specialists skipped."

## Step 6: Confidence Calibration

Every finding MUST include a confidence score (1-10):

| Score | Meaning | Display rule |
|-------|---------|-------------|
| 9-10 | Verified by reading specific code. Concrete bug or exploit demonstrated. | Show normally |
| 7-8 | High confidence pattern match. Very likely correct. | Show normally |
| 5-6 | Moderate. Could be a false positive. | Show with caveat: "Medium confidence, verify this is actually an issue" |
| 3-4 | Suspicious but may be fine. | Suppress from main report. Include in appendix only. |
| 1-2 | Speculation. | Only report if severity would be P0. |

Finding format: `[SEVERITY] (confidence: N/10) file:line — description`

## Step 7: Fix-First Classification

Every finding gets action — not just critical ones. Classify each as AUTO-FIX or ASK:

### AUTO-FIX (apply immediately without asking)

| Category | Examples |
|----------|----------|
| Dead code / unused variables | Unused imports, variables assigned but never read |
| N+1 queries | Missing eager loading (`.includes()`, `joinedload()`, `include`) |
| Stale comments | Comments contradicting the code they describe |
| Magic numbers | Replace with named constants |
| Missing LLM output validation | Add format guards before persisting |
| Version/path mismatches | Version string, file path inconsistencies |
| Inline styles | `<style>` blocks in partials, O(n*m) view lookups |
| Missing `limit` | Unbounded queries that should have limits |

**Rule of thumb for AUTO-FIX:** The fix is mechanical — a senior engineer would apply it without discussion.

### ASK (present for user decision)

| Category | Examples |
|----------|----------|
| Security | Auth bypass, XSS, injection, data exposure |
| Race conditions | Concurrency bugs, atomicity gaps |
| Design decisions | Architecture, data model, API surface |
| Large fixes | >20 lines or touching >3 files |
| Enum completeness | New values not handled everywhere |
| Removing functionality | Deleting features or changing behavior |
| User-visible changes | Anything changing what the user sees |

**Rule of thumb for ASK:** Reasonable engineers could disagree about the fix or approach.

### Special rules

- **Critical findings default toward ASK** — they're inherently riskier, even if the fix looks mechanical
- **Informational findings default toward AUTO-FIX** — they're more mechanical
- **Findings with pensieve maxims** — if a maxim applies, cite it in the finding and weight toward ASK (maxims encode hard-won rules that shouldn't be auto-overridden)
- **Test stub override** — if the fix needs a test, reclassify to ASK regardless

## Step 8: Search Before Recommending

Before recommending a specific fix pattern (especially for concurrency, caching, auth, or framework-specific behavior):

1. Verify the pattern is current best practice for the framework version in use
2. Check if a built-in solution exists in newer versions before recommending a workaround
3. Verify API signatures against current docs (APIs change between versions)

If uncertain about currency: note it in the finding: "Confidence adjusted — pattern verification limited to in-distribution knowledge."

## Step 9: Verification of Claims

Before producing final output, verify every claim:

- If you claim "this pattern is safe" → cite the specific line proving safety
- If you claim "this is handled elsewhere" → read and cite the handling code
- If you claim "tests cover this" → name the test file and method
- **Never say "likely handled" or "probably tested"** — verify or flag as unverified

**Rationalization prevention:** "This looks fine" is not a finding. Either cite evidence it IS fine, or flag it as unverified.

## Step 10: Execute Fixes

### 10a. Apply all AUTO-FIX items

Use `edit` to apply each fix. Report one line per fix:
```
[AUTO-FIXED] file:line — problem → what you did
```

### 10b. Present ASK items

Batch all ASK items into a single summary for the user. For each item:
- Number, severity label, the problem, recommended fix
- The user decides: Fix / Skip

If 0 ASK items, skip this step entirely.

## Output Format

```
═══════════════════════════════
CODE REVIEW — <branch> vs origin/<base>
═══════════════════════════════

Scope Check: <CLEAN/DRIFT/MISSING>
Intent: <summary> | Plan: <path or "none"> | Delivered: <summary>
Plan items: N DONE, M PARTIAL, K NOT DONE

AUTO-FIXED (N items)
[file:line] Problem → fix applied

CRITICAL FINDINGS
[P0] (confidence: N/10) file:line — description
  Fix: <concrete suggestion>

ADVISORY FINDINGS
[P2] (confidence: N/10) file:line — description

SPECIALIST FINDINGS (if diff > 50 lines)
[SEVERITY] (confidence: N/10, specialist: name) file:line — description
  Fix: <suggestion>
  [MULTI-CONFIRMED: +name] if confirmed by multiple passes

TODOS CROSS-REFERENCE
<TODOS.md items addressed or created by this PR>

DOCUMENTATION CHECK
<staleness warnings if code changed but docs not updated>

PR QUALITY SCORE: X/10
(max(0, 10 - critical_count * 2 - informational_count * 0.5), cap at 10)

SUMMARY
P0: N | P1: N | P2: N | AUTO-FIXED: N
Recommendation: [APPROVE / APPROVE WITH FIXES / DO NOT MERGE]
─────────────────────────────────
```

## Priorities

- P0: data loss, security vulnerability, runtime crash
- P1: edge case bug, race condition, data integrity risk
- P2: style, performance, maintainability

## TODOS Cross-Reference

Read `TODOS.md` if it exists:
- Does this PR close any open TODOs? Note them.
- Does this PR create work that should become a TODO? Flag as informational.
- Are there related TODOs providing context? Reference them.

## Documentation Staleness

For each `.md` doc file in the repo root (README.md, ARCHITECTURE.md, CONTRIBUTING.md, etc.): if code changed but doc wasn't updated, flag: "Documentation may be stale: [file] describes [feature] but code changed. Consider running `/skill:document-release`."

This is informational — never critical.

## Review Log (for /ship handoff)

After completing the review, record the outcome so `/ship` can detect that review was run.
Uses the same path as gstack for cross-agent compatibility:

```bash
# Compute project slug (same algorithm as gstack)
REMOTE=$(git remote get-url origin 2>/dev/null | sed 's|.*[:/]\([^/]*/[^/]*\)\.git$|\1|;s|.*[:/]\([^/]*/[^/]*\)$|\1|' | tr '/' '-' | tr -cd 'a-zA-Z0-9._-')
SLUG="${REMOTE:-$(basename "$PWD" | tr -cd 'a-zA-Z0-9._-')}"
BRANCH=$(git branch --show-current | tr -cd 'a-zA-Z0-9._-')

mkdir -p ~/.gstack/projects/$SLUG
cat >> ~/.gstack/projects/$SLUG/$BRANCH-reviews.jsonl << 'EOF'
{"skill":"review","timestamp":"<ISO8601>","status":"<clean|issues_found>","issues_found":<N>,"critical":<N>,"informational":<N>,"quality_score":<N>,"commit":"<short-hash>"}
EOF
```
