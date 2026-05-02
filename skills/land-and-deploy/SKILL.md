---
name: land-and-deploy
description: Merge PR, wait for CI, verify deploy, and check production health. Picks up where /ship left off. Use when PR is approved and ready to land. Proactively suggest after /ship creates a PR.
allowed-tools: bash, read, grep
compatibility: requires git and gh CLI
---

# Land and Deploy

Picks up where `/ship` left off. Merge the PR, wait for CI, verify production.

## Brain Context Load

Before deploying, search your brain for deployment context:

1. Extract keywords from the PR title, branch name, and changed services.
2. Use `gbrain_search` to find past deploys, known deploy issues, or post-deploy incidents.
3. Use `gbrain_get` to read the top 3 matches.
4. Use this context to anticipate risks — has this service or dependency caused deploy failures before?

If gbrain tools are not available or return no results, proceed without brain context.

---

## Arguments

- `/skill:land-and-deploy` — auto-detect PR from current branch
- `/skill:land-and-deploy <url>` — verify deploy at this URL
- `/skill:land-and-deploy #123` — specific PR number

## Step 1: Pre-merge Readiness

```bash
BRANCH=$(git branch --show-current)
BASE=${2:-main}

# Find PR
if [ -n "$1" ] && [[ "$1" =~ ^#[0-9]+$ ]]; then
  PR="$1"
else
  PR=$(gh pr list --head "$BRANCH" --json number -q '.[0].number' 2>/dev/null)
fi

if [ -z "$PR" ]; then
  echo "NO_PR_FOUND"
  exit 1
fi

# Check CI status
gh pr view "$PR" --json state,mergeable,statusCheckRollup --jq '.state + " | mergeable: " + (.mergeable // "UNKNOWN")'
```

If no PR found: **"No PR found for this branch. Run /ship first."** Stop.

If CI failing: **"CI is failing. Do not merge."** Stop.

If PR not approved: **"PR not yet approved. Get review first."** Stop.

## Step 2: Merge

```bash
gh pr merge "$PR" --merge --delete-branch
```

If merge conflicts: stop and show them.
If permission denied: stop and show error.

## Step 3: Wait for CI on Main

```bash
# Switch to main
git checkout "$BASE"
git pull origin "$BASE"

# Wait for CI to complete (poll)
for i in $(seq 1 30); do
  sleep 10
  STATUS=$(gh run list --branch "$BASE" --limit 1 --json conclusion -q '.[0].conclusion' 2>/dev/null)
  echo "CI status: ${STATUS:-pending}"
  [ "$STATUS" = "success" ] && break
  [ "$STATUS" = "failure" ] && echo "CI FAILED on main!" && exit 1
done
```

## Step 4: Verify Deploy (if URL provided)

```bash
if [ -n "${DEPLOY_URL:-}" ]; then
  for i in $(seq 1 20); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL" 2>/dev/null)
    echo "Health check: $HTTP_CODE"
    [ "$HTTP_CODE" = "200" ] && break
    [ "$HTTP_CODE" = "301" ] && break
    sleep 5
  done
fi
```

## Step 5: Quick Production Smoke Test

If deploy URL available:
```bash
# Check homepage loads
curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL" 2>/dev/null
# Check for obvious errors
curl -s "$DEPLOY_URL" 2>/dev/null | grep -i "error\|exception\|500\|traceback" | head -5
```

## Output

```
═══════════════════════════════
LAND & DEPLOY — #<PR>
═══════════════════════════════
PR:       #N — <title>
Merge:    ✅ merged to main
CI:       ✅ passed
Deploy:   ✅ verified (<url> — HTTP 200)

VERDICT: CLEAN — production healthy
═══════════════════════════════
```

