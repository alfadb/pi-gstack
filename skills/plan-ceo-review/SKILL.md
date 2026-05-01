---
name: plan-ceo-review
description: |
  Strategic plan review with 4 scope modes (Expansion, Selective, Hold, Reduction). Challenges premises, generates alternatives, reviews architecture, error handling, deployment, and observability. Produces scoped implementation plan. Use when asked to "review this plan", "CEO review", "scope review", or after /skill:office-hours produces a design doc.
allowed-tools: bash, read, write, grep, find
compatibility: requires git
---

# CEO Plan Review

You are not here to rubber-stamp. Make the plan extraordinary. Catch every landmine before it explodes. Do NOT write implementation code.

## Prime Directives

1. Zero silent failures. Every failure mode must be visible.
2. Every error has a name — not "handle errors" but specific exceptions and recovery.
3. Data flows have 4 paths: happy, nil input, empty input, upstream error.
4. Interactions have edge cases: double-click, navigate-away, slow connection, stale state.
5. Observability is scope: logs, metrics, alerts are deliverables, not afterthoughts.
6. Everything deferred must be written to TODOS.md. Vague intentions are lies.

## Phase 0: System Audit

```bash
git log --oneline -30
git diff origin/main --stat
git log --since=30.days --name-only --format="" | sort | uniq -c | sort -rn | head -15
grep -rn "TODO\|FIXME\|HACK" --include="*.ts" --include="*.js" --include="*.py" --include="*.rb" . 2>/dev/null | head -20
```

Read AGENTS.md, README, TODOS.md.

Check for existing design docs (gstack-compatible paths for cross-agent continuity):
```bash
REMOTE=$(git remote get-url origin 2>/dev/null | sed 's|.*[:/]\([^/]*/[^/]*\)\.git$|\1|;s|.*[:/]\([^/]*/[^/]*\)$|\1|' | tr '/' '-' | tr -cd 'a-zA-Z0-9._-')
SLUG="${REMOTE:-$(basename "$PWD" | tr -cd 'a-zA-Z0-9._-')}"
BRANCH=$(git branch --show-current | tr '/' '-' | tr -cd 'a-zA-Z0-9._-')
# CEO plans in ceo-plans/ subdirectory
ls ~/.gstack/projects/$SLUG/ceo-plans/*.md 2>/dev/null || echo "no existing CEO plans"
# Design docs at project root (office-hours format: *-design-*.md)
ls ~/.gstack/projects/$SLUG/*-$BRANCH-design-*.md 2>/dev/null || ls ~/.gstack/projects/$SLUG/*-design-*.md 2>/dev/null || echo "no existing designs"
```

## Phase 1: Nuclear Scope Challenge

### 1A. Premise Challenge

Before reviewing scope, challenge the premises:
- **Is this the right problem?** Could a different framing yield simpler/more impactful?
- **What happens if we do nothing?** Real pain or hypothetical?
- **What existing code already partially solves this?**

Output premises. User confirms or corrects each.

### 1B. Existing Code Leverage

What patterns, utilities, or flows already exist that can be reused? Map them. Reuse > rebuild.

### 1C. Implementation Alternatives

Generate 3 approaches:

```
APPROACH A: [name] — [1-line]
  Effort: [estimate] | Files touched: ~N
  Pros: [2-3] | Cons: [2-3]
APPROACH B: ...
APPROACH C: ...
```

### 1D. Mode Selection

Four modes, user chooses:

1. **SCOPE EXPANSION** — Dream big. Propose the 10x version. Default for greenfield features.
2. **SELECTIVE EXPANSION** — Baseline is the current scope. Surface every expansion opportunity individually for cherry-picking. Default for feature enhancements.
3. **HOLD SCOPE** — Make it bulletproof. Catch every failure mode, error path. No expansions. Default for bug fixes, refactors.
4. **SCOPE REDUCTION** — Find the minimum viable version. Cut ruthlessly.

## Phase 2: Review Sections

### Section 1: Architecture

- System design and component boundaries
- Data flow — trace all 4 paths (happy, nil, empty, error)
- Coupling: which components become coupled? Justified?
- Single points of failure
- Scaling: what breaks at 10x load?

### Section 2: Error & Edge Cases

- Explicit error handling: every catch/rescue maps to a user-visible outcome
- Edge cases: empty state, long input, slow connection, zero results, network fail
- Form interactions: double-submit, validation on blur vs submit, keyboard navigation

### Section 3: Data & State

- New state: where stored, how persisted, what happens on crash?
- Migrations: reversible? Performance impact on large tables?
- Cache invalidation: what triggers it? Stale data window?
- Transactions: multiple writes wrapped?

### Section 4: Security

- New endpoints: auth required? Rate limited? Input validation?
- New data: PII? Encrypted at rest? Logged accidentally?
- Integration points: signature verification? TLS? Timeout?

### Section 5: Observability

- What should be logged? At what level?
- What metrics matter? Error rates, latency, throughput?
- What alerts? Who gets paged?

### Section 6: Deployment & Rollback

- Feature flags needed?
- Database migrations: reversible?
- Rollback plan: what breaks if we revert?
- Partial deployment state: new code + old data, old code + new data

### Section 7: Testing

- What new test categories are needed? Unit, integration, e2e?
- Edge case tests: empty, nil, timeout, large payload
- Performance tests: what's the threshold?
- Migration tests: up and down

### Section 8: Documentation

- README updates needed?
- API docs for new endpoints?
- Runbook for on-call?

### Section 9: Timeline & Dependencies

- What blocks what? Sequencing of tasks
- External dependencies: API changes, library upgrades?
- Riskiest piece: what should be built first to derisk?

### Section 10: Scope Decisions

Categorize every feature/requirement:

```
NOT IN SCOPE:
  - [item] — removed because [reason]

IN SCOPE:
  - [item] — [effort estimate]

DEFERRED TO TODOS.md:
  - [item] — deferred because [reason], planned for [when]
```

### Section 11: Plan Completeness

Final check: can an engineer pick this up and implement without asking questions? Gaps?

## Output

Save plan to gstack-compatible path for cross-agent continuity:
```bash
REMOTE=$(git remote get-url origin 2>/dev/null | sed 's|.*[:/]\([^/]*/[^/]*\)\.git$|\1|;s|.*[:/]\([^/]*/[^/]*\)$|\1|' | tr '/' '-' | tr -cd 'a-zA-Z0-9._-')
SLUG="${REMOTE:-$(basename "$PWD" | tr -cd 'a-zA-Z0-9._-')}"
mkdir -p ~/.gstack/projects/$SLUG/ceo-plans
PLAN_PATH="$HOME/.gstack/projects/$SLUG/ceo-plans/$(date +%Y-%m-%d)-<slug>.md"
```

Write to `$PLAN_PATH`:

```markdown
# Plan: {Title}
**Date:** {date} | **Mode:** {mode} | **Design doc:** {if from /office-hours}

## Scope Decisions
{NOT IN SCOPE / IN SCOPE / DEFERRED}

## Architecture
{ASCII diagrams, data flows, coupling analysis}

## Error & Edge Cases
{specific failures and recovery paths}

## Implementation Plan
{sequenced tasks with effort estimates}

## Rollout Plan
{feature flags, migrations, rollback, monitoring}
```
