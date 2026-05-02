---
name: retro
description: Weekly engineering retrospective. Analyze commit history, work patterns, file hotspots, and code quality metrics across a time window. Use when asked to "retro", "retrospective", "weekly review", "what did I ship". Proactively suggest end of week.
allowed-tools: bash, read, grep, find
compatibility: requires git
---

# Engineering Retrospective

Analyze the last 7 days (or specified window) of work.

## Arguments

- `/skill:retro` — last 7 days
- `/skill:retro 14d` — last 14 days
- `/skill:retro 30d` — last 30 days
- `/skill:retro compare` — compare current vs prior same-length window

---

## Brain Context Load

Before running the retrospective, search your brain for context:

1. Extract keywords from the project name and time window.
2. Use `gbrain_search` to find past retros, patterns, or related learnings.
3. Use `gbrain_get` to read the top 3 matches.
4. Use this context to identify recurring patterns or previously flagged issues.

If gbrain tools are not available, proceed without brain context.

---

## Step 1: Gather Data

Do NOT use TZ override — use system default timezone.

```bash
WINDOW="${1:-7d}"
BASE=main

git fetch origin $BASE --quiet
echo "USER: $(git config user.name) <$(git config user.email)>"

# Commits with author, timestamp, subject
git log origin/$BASE --since="$WINDOW ago" --format="%H|%aN|%ai|%s" --shortstat

# Files most changed (hotspots)
git log origin/$BASE --since="$WINDOW ago" --format="" --name-only | grep -v '^$' | sort | uniq -c | sort -rn | head -20

# PR/MR numbers
git log origin/$BASE --since="$WINDOW ago" --format="%s" | grep -oE '[#!][0-9]+' | sort -u

# Per-author commit counts
git shortlog origin/$BASE --since="$WINDOW ago" -sn --no-merges

# Test files changed
git log origin/$BASE --since="$WINDOW ago" --format="" --name-only | grep -E '\.(test|spec)\.' | sort -u | wc -l

# Test file count
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' 2>/dev/null | grep -v node_modules | wc -l

# TODOS.md
cat TODOS.md 2>/dev/null || echo "NO_TODOS"
```

## Step 2: Compute Metrics

```
═══════════════════════════════
RETROSPECTIVE — <window> (<dates>)
═══════════════════════════════

OVERVIEW
  Commits:       N
  PRs:           N (#xx, #yy)
  Contributors:  N
  Files changed: N unique
  Test files:    N changed / N total
  TODOS:         N open
```

## Step 3: Work Patterns

- **Session detection:** commits clustered in time → distinct coding sessions
- **Peak hours:** when do commits happen?
- **Commit velocity:** commits per session, lines per commit

## Step 4: File Hotspots

Top 10 most-changed files. Flag those with >50% of total changes as potential architectural issues — frequent changes to the same file may indicate instability or poor abstraction.

## Step 5: Theme Analysis

Group commits into themes (features, bug fixes, refactors, docs, etc.). What was the main focus this period?

## Step 6: Quality Signals

- Test coverage trend: test files added vs production files changed
- Bug fix rate: commits labeled "fix:" vs total
- Revert rate: any reverts?

## Step 7: TODOS Health

- Items completed this window?
- Items added vs removed?
- Age of oldest open item?

## Step 8: Narrative

One paragraph summary: what was accomplished, what patterns emerged, what needs attention next week.

---

## Output Format

```
═══════════════════════════════
RETRO — <window>
═══════════════════════════════

| Metric          | Value   |
|-----------------|---------|
| Commits         | N       |
| PRs             | #xx     |
| Files changed   | N       |
| Hotspot         | path/to/file.ts (N changes) |

THEMES
  🚀 Feature: [description]
  🐛 Bug fix: [description]
  🔧 Refactor: [description]

QUALITY
  Test files added: N | Bug fix rate: N% | Reverts: N

NARRATIVE
  [1 paragraph]

NEXT WEEK
  - [Focus area]
  - [Technical debt to address]
  - [TODOS to close]
─────────────────────────────────
```
