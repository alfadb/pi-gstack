---
name: plan-eng-review
description: |
  Engineering manager plan review. Lock in architecture, data flow, diagrams, edge cases, and test coverage before implementation. Use when asked to "review architecture", "engineering review", "lock in the plan", or before starting to code. Proactively suggest after /skill:plan-ceo-review completes.
allowed-tools: bash, read, write, grep, find
compatibility: requires git
---

# Plan Engineering Review

Lock in the execution plan — architecture, data flow, edge cases, tests — before writing code. Catch architecture issues that become 10x more expensive to fix after implementation.

**HARD GATE:** Do NOT write implementation code. Review the plan.

## Engineering Preferences

- DRY is important — flag repetition aggressively
- Well-tested code is non-negotiable
- "Engineered enough" — not under- (fragile) and not over- (premature abstraction)
- Bias toward explicit over clever
- Right-sized diff: smallest clean change. But don't shrink a necessary rewrite

## Step 0: Scope Challenge

Before reviewing, answer:

1. **Existing code leverage:** What already partially solves each sub-problem? Reuse over rebuild.
2. **Minimum viable scope:** What can be deferred without blocking the core goal?
3. **Complexity check:** >8 files or >2 new classes/services? Challenge whether same goal can be achieved simpler.
4. **Completeness check:** Is the plan doing the complete version? With AI coding, full coverage costs minutes more than shortcuts.
5. **Distribution check:** New artifact (binary, package, container)? Does it include build/publish pipeline?

Read design doc if exists. Cross-reference TODOS.md.

Check gstack-compatible paths:
```bash
REMOTE=$(git remote get-url origin 2>/dev/null | sed 's|.*[:/]\([^/]*/[^/]*\)\.git$|\1|;s|.*[:/]\([^/]*/[^/]*\)$|\1|' | tr '/' '-' | tr -cd 'a-zA-Z0-9._-')
SLUG="${REMOTE:-$(basename "$PWD" | tr -cd 'a-zA-Z0-9._-')}"
BRANCH=$(git branch --show-current | tr '/' '-' | tr -cd 'a-zA-Z0-9._-')
# Design docs at project root (office-hours format)
ls ~/.gstack/projects/$SLUG/*-$BRANCH-design-*.md 2>/dev/null || ls ~/.gstack/projects/$SLUG/*-design-*.md 2>/dev/null
# CEO plans in ceo-plans/ subdirectory
ls ~/.gstack/projects/$SLUG/ceo-plans/*.md 2>/dev/null
echo "---"
```

## Review Sections

### Section 1: Architecture

Evaluate:

- System design and component boundaries. Draw dependency graph.
- Data flow — trace 4 paths for every new flow: happy, nil input, empty input, upstream error
- State machines for new stateful objects
- Coupling: which components become coupled? Justified?
- Single points of failure
- Scaling: what breaks at 10x load?
- Security boundaries: auth, data access, API surface
- Distribution: how does new artifact get built, published, updated?

Use ASCII diagrams for data flows, state machines, dependency graphs.

### Section 2: Code Quality

- Module structure and organization
- DRY violations — be aggressive
- Error handling: every error path traced to user-visible outcome
- Over-engineered or under-engineered areas
- Technical debt introduced

### Section 3: Test Plan

For every codepath in the plan, define:

```
TEST PLAN
═════════
Unit tests:
  - [component]: [what's tested], [edge cases]

Integration tests:
  - [flow]: [happy path], [error path]

E2E tests:
  - [scenario]: [user journey]

Test gaps:
  - [codepath not covered]
```

Detect existing test framework:
```bash
ls jest.config.* vitest.config.* playwright.config.* .rspec pytest.ini 2>/dev/null
grep "test" package.json 2>/dev/null | head -1
```

### Section 4: Performance & Operations

- Expected latency/throughput for new flows
- Database query plan: new indexes needed?
- Memory footprint: any large allocations?
- Logging: what needs to be observable?
- Deployment: feature flags? Rollback plan?

## Output

Save to gstack-compatible path:
```bash
mkdir -p ~/.gstack/projects/$SLUG/ceo-plans
ENG_PATH="$HOME/.gstack/projects/$SLUG/ceo-plans/$(date +%Y-%m-%d)-eng-review-<slug>.md"
```

Write to `$ENG_PATH`:

```markdown
# Engineering Plan: {Title}
**Date:** {date} | **Design doc:** {if exists}

## Architecture
{ASCII diagrams, data flows, component boundaries}

## Code Structure
{module organization, DRY assessment, error handling}

## Test Plan
{unit, integration, e2e test definitions}

## Performance & Operations
{latency, DB, memory, logging, deployment}
```

## Priority Hierarchy

Architecture > Test Plan > Code Quality > Performance. If context is tight, keep architecture and tests.
