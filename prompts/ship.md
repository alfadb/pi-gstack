---
description: Ship workflow: merge base branch, run tests, run review, bump version, commit, push, create PR. Use when asked to "ship", "deploy", "create PR", or "merge and push". Proactively use when code changes are ready.
argument-hint: "[base-branch]"
---

# Ship

Fully automated ship workflow. Run straight through — only stop for merge conflicts, test failures, or ASK items from the review step.

**Never stop for:** uncommitted changes (always include them), commit message approval (auto-commit), version bump choice (auto-pick PATCH).

## Step 1: Pre-flight

```bash
BRANCH=$(git branch --show-current)
echo "BRANCH: $BRANCH"
BASE=${1:-main}
```

If on the base branch, abort: **"You're on the base branch. Ship from a feature branch."**

Check what's being shipped:
```bash
git fetch origin $BASE --quiet
git diff origin/$BASE...HEAD --stat
git log origin/$BASE..HEAD --oneline
```

If no diff, abort: **"No changes to ship."**

## Step 2: Merge base branch

```bash
git merge origin/$BASE --no-edit
```

If merge conflicts: auto-resolve simple ones (VERSION, CHANGELOG ordering). Complex conflicts → stop and show.

## Step 3: Run tests

Detect and run test suite:
```bash
# Detect test runner
if [ -f package.json ]; then
  TEST_CMD=$(grep -o '"test": *"[^"]*"' package.json | head -1 | sed 's/"test": *"//;s/"//')
  if [ -n "$TEST_CMD" ]; then
    echo "NODE: $TEST_CMD"
    npm test 2>&1
  fi
elif [ -f Gemfile ]; then
  bundle exec rspec 2>&1 || bundle exec rake test 2>&1
elif [ -f Makefile ]; then
  make test 2>&1
else
  echo "NO_TEST_RUNNER — skip"
fi
```

If tests fail:
- Pre-existing failures (also fail on base branch) → note in PR, don't block
- New failures (pass on base, fail on feature) → **block**: show failures, stop
- No test runner → skip, note in PR

## Step 4: Check review log

Before running review, check if `/review` was already run on this branch (gstack-compatible path):

```bash
# Compute project slug (same algorithm as gstack)
REMOTE=$(git remote get-url origin 2>/dev/null | sed 's|.*[:/]\([^/]*/[^/]*\)\.git$|\1|;s|.*[:/]\([^/]*/[^/]*\)$|\1|' | tr '/' '-' | tr -cd 'a-zA-Z0-9._-')
SLUG="${REMOTE:-$(basename "$PWD" | tr -cd 'a-zA-Z0-9._-')}"
BRANCH=$(git branch --show-current | tr -cd 'a-zA-Z0-9._-')
REVIEW_LOG="$HOME/.gstack/projects/$SLUG/$BRANCH-reviews.jsonl"

if [ -f "$REVIEW_LOG" ]; then
  echo "Review log found: $REVIEW_LOG"
  tail -1 "$REVIEW_LOG"
fi
```

If a review log entry exists with status `clean` or `issues_found`:
- Show the review summary: "Review already run: <N> issues, <M> critical. Status: <status>."
- If issues_found with unresolved critical: block ship until resolved.
- If clean or only informational: skip Step 5, proceed to version bump.

If no review log entry exists, proceed to Step 5.

## Step 5: Run code review

Execute `/skill:review` against `origin/$BASE`. The review skill will handle diff analysis, scope detection, critical pass, and specialist reviews.

1. Scope drift detection + Plan Completion Audit
2. Critical pass (SQL, race conditions, shell injection, etc.)
3. Specialist reviews if diff > 50 lines
4. Confidence-calibrated findings

The review skill will read `references/checklist.md` for the full 11-category checklist automatically.

**Auto-fix** P0/P1 findings that are trivial (≤5 lines). Report others.

**If ASK items found:** present to user for decision. Don't auto-fix without confirmation.

After review, write result to the gstack-compatible review log (`$REVIEW_LOG`) for future detection.

## Step 6: Version bump (if VERSION file exists)

```bash
if [ -f VERSION ]; then
  CURRENT=$(cat VERSION | tr -d '\n\r ')
  # Bump PATCH by default
  NEW=$(echo $CURRENT | awk -F. '{print $1"."$2"."$3+1}')
  echo $NEW > VERSION
  echo "VERSION: $CURRENT → $NEW"
fi
```

## Step 7: CHANGELOG update (if file exists)

```bash
if [ -f CHANGELOG.md ]; then
  echo "## $(cat VERSION 2>/dev/null || echo 'Unreleased') — $(date +%Y-%m-%d)" >> CHANGELOG.md.tmp
  echo "" >> CHANGELOG.md.tmp
  git log origin/$BASE..HEAD --oneline | sed 's/^/- /' >> CHANGELOG.md.tmp
  echo "" >> CHANGELOG.md.tmp
  cat CHANGELOG.md >> CHANGELOG.md.tmp
  mv CHANGELOG.md.tmp CHANGELOG.md
fi
```

## Step 8: Mark TODOS.md completed items

```bash
if [ -f TODOS.md ]; then
  # Mark items matching commit messages as done
  for commit_msg in $(git log origin/$BASE..HEAD --oneline --format="%s"); do
    sed -i "s/- \[ \] \(.*$commit_msg.*\)/- [x] \1/i" TODOS.md 2>/dev/null || true
  done
fi
```

## Step 9: Commit and push

```bash
# Stage all changes (including uncommitted)
git add -A

# Auto-generate commit message from diff summary
FILES=$(git diff --cached --stat | tail -1)
COMMITS=$(git log origin/$BASE..HEAD --oneline | head -10)
git commit -m "ship: $FILES changed

$COMMITS"
```

Push:
```bash
git push origin HEAD
```

## Step 10: Create PR

```bash
# Auto-generate PR body
PR_TITLE=$(git log origin/$BASE..HEAD --format="%s" | head -1)
PR_BODY=$(cat <<EOF
## Changes
$(git diff origin/$BASE...HEAD --stat)

## Commits
$(git log origin/$BASE..HEAD --oneline)

## Review
$(if [ -f "$REVIEW_LOG" ]; then tail -1 "$REVIEW_LOG" | grep -o '"status":"[^"]*"' | cut -d'"' -f4; else echo "Not run"; fi)
$(if [ -f "$REVIEW_LOG" ]; then tail -1 "$REVIEW_LOG" | grep -o '"issues_found":[0-9]*' | sed 's/"issues_found"://'; else echo "0"; fi) issues found

## Test Results
$(echo "${TEST_RESULT:-No test runner detected}")
EOF
)

gh pr create --base $BASE --title "$PR_TITLE" --body "$PR_BODY"
```

If PR already exists, update it:
```bash
gh pr edit --title "$PR_TITLE" --body "$PR_BODY"
```

## Step 11: Output summary

```
═══════════════════════════════
SHIP COMPLETE — <branch> → <base>
═══════════════════════════════

Version: <version or N/A>
Tests: <result>
Review: <findings summary>
PR: <url>
═══════════════════════════════
```
