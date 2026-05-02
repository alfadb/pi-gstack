---
name: document-release
description: Post-ship documentation update. Cross-reference the diff against all project docs, update outdated paths/commands/counts, flag risky changes. Use after /ship, before merge. Proactively suggest when a PR changes project structure or features.
allowed-tools: bash, read, edit, grep, find
compatibility: requires git
---

# Document Release

Run after `/ship` — ensure every documentation file is accurate against the current diff.

## Brain Context Load

Before updating docs, search your brain for documentation context:

1. Extract keywords from changed modules and doc files.
2. Use `gbrain_search` to find past doc releases, known stale docs, or documentation conventions.
3. Use `gbrain_get` to read the top 3 matches.
4. Use this context to identify docs that frequently go stale.

If gbrain tools are not available or return no results, proceed without brain context.

---

## Step 1: Diff Analysis

```bash
BASE=${1:-main}
git fetch origin $BASE --quiet
git diff origin/$BASE...HEAD --stat
git log origin/$BASE..HEAD --oneline
git diff origin/$BASE...HEAD --name-only
```

Find all documentation:
```bash
find . -maxdepth 3 -name "*.md" -not -path "./.git/*" -not -path "./node_modules/*" -not -path "./.gstack/*" | sort
```

Classify changes: new features, changed behavior, removed functionality, infrastructure.

## Step 2: Per-File Audit

### README.md
- Features/capabilities match the diff?
- Install/setup instructions still accurate?
- Examples and usage descriptions valid?

### CHANGELOG.md (if exists)
- Polish wording only — never overwrite or regenerate
- Check version number consistency across files

### Project config files
- `package.json`: version, scripts, dependencies match docs?
- Skill/prompt counts and lists in project docs?

### Any other .md files
- Cross-reference against diff
- Flag contradictions between docs

## Step 3: Classify Updates

| Type | Action |
|------|--------|
| AUTO-FIX | Factual corrections from diff (paths, counts, version numbers) |
| ASK | Subjective changes (narrative, philosophy, large rewrites, removals) |
| SKIP | Unrelated docs, third-party, vendored |

## Step 4: Apply and Commit

Auto-fix all AUTO-FIX items. Present ASK items for decision.

```bash
git add <updated-files>
git commit -m "docs: update for release (<branch>)"
```

## Output

```
═══════════════════════════════
DOCUMENT RELEASE — <branch>
═══════════════════════════════
Docs found: N | Auto-fixed: N | ASK: N
  README.md: [CURRENT / UPDATED path/to/foo → path/to/bar]
  CHANGELOG.md: [CURRENT / POLISHED wording]
─────────────────────────────────
```

