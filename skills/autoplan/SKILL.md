---
name: autoplan
description: Auto full review pipeline. Runs office-hours → CEO review → Eng review → Design review → DX review in sequence, auto-deciding where safe and asking where needed. Use when you want to "review everything", "run the full pipeline", or before major implementation work.
allowed-tools: bash, read, write, edit, grep, find
compatibility: requires git
---

# AutoPlan — Full Review Pipeline

Run the complete planning and review pipeline in sequence. Auto-decide safe choices, escalate taste decisions and safety concerns.

## Decision Principles

1. **Auto-decide when both models agree** — if the recommended choice is clear, proceed without asking.
2. **Ask for taste decisions** — design aesthetics, naming, UX preferences need human judgment.
3. **Escalate safety issues** — data loss, security vulnerabilities, destructive scope changes always require confirmation.
4. **Stop at gates** — if CEO review says HOLD, don't proceed. If Eng review flags architecture issues, fix before continuing.
5. **Track decisions** — every auto-decision and user choice recorded for audit.
6. **Taste ≠ Risk** — don't escalate preferences as safety issues, and don't auto-decide security concerns.

## Pipeline Sequence

Run each skill in order. Each phase consumes the output of the previous phase.

### Phase 0: Intake

```bash
BRANCH=$(git branch --show-current)
echo "BRANCH: $BRANCH"
```

Read existing plan if any:
```bash
REMOTE=$(git remote get-url origin 2>/dev/null | sed 's|.*[:/]\([^/]*/[^/]*\)\.git$|\1|;s|.*[:/]\([^/]*/[^/]*\)$|\1|' | tr '/' '-' | tr -cd 'a-zA-Z0-9._-')
SLUG="${REMOTE:-$(basename "$PWD" | tr -cd 'a-zA-Z0-9._-')}"
ls -t ~/.gstack/projects/$SLUG/*-design-*.md ~/.gstack/projects/$SLUG/ceo-plans/*.md 2>/dev/null | head -3
```

If no plan exists, start from office-hours. If a plan exists, ask whether to start from the beginning or from a specific phase.

### Phase 1: Office Hours (if no design doc exists)

Execute `/skill:office-hours` methodology:
- 6 forcing questions in Startup mode
- Produce design document at `~/.gstack/projects/$SLUG/`
- STOP if office-hours reveals the idea is not viable

### Phase 2: CEO Review

Execute `/skill:plan-ceo-review` methodology against the design doc:
- Nuclear scope challenge (Expansion, Selective, Hold, Reduction)
- Architecture review, error handling, deployment, observability
- Produce CEO plan at `~/.gstack/projects/$SLUG/ceo-plans/`
- Auto-decide: scope mode based on context
- Ask: major architecture tradeoffs, technology choices
- Gate: if HOLD mode, STOP the pipeline

### Phase 3: Engineering Review

Execute `/skill:plan-eng-review` methodology against the CEO plan:
- Architecture lock-in, data flow, edge cases, test coverage
- Flag: >8 files or >2 new services (complexity check)
- Produce eng review at `~/.gstack/projects/$SLUG/ceo-plans/`
- Gate: if architecture issues found, fix before continuing

### Phase 4: Design Review (conditional)

If the plan has UI/UX components:
- Execute `/skill:plan-design-review` methodology
- Score 10 design dimensions 0-10
- Fix the plan for scores < 7

### Phase 5: DX Review (conditional)

If the plan has developer-facing surface (API, CLI, SDK, library):
- Execute `/skill:plan-devex-review` methodology
- Define developer persona, benchmark competitors
- Score 8 DX dimensions, fix scores < 7

### Phase 6: Final Gate

Present the complete review summary:

```
AUTOPLAN COMPLETE
═════════════════
Branch: {branch}
Plan: {plan path}

Pipeline:
  ✅ Office Hours  → {design doc}
  ✅ CEO Review    → {plan} ({mode} mode)
  ✅ Eng Review    → {architecture locked}
  ✅ Design Review → {score}/10
  ✅ DX Review     → {score}/10 ({mode})

Decisions: {N} total ({M} auto-decided, {K} user choices)

Safety Gates: {all clear / issues found}
Recommendation: {PROCEED / PROCEED WITH CAUTION / HOLD}
─────────────────
```

## Decision Audit Trail

Record every decision in the plan file:

```markdown
## Decision Audit Trail
| # | Phase | Decision | Type | Resolution | Rationale |
|---|-------|----------|------|------------|-----------|
| 1 | CEO | Scope mode | auto | Selective | <20 files, focused feature |
| 2 | CEO | Database choice | user | PostgreSQL | Existing team expertise |
| 3 | Eng | Caching layer | auto | Deferred | Not needed for MVP |
```

## What Gets Auto-Decided

- **Scope mode** — based on diff size and number of affected components
- **Test framework** — use what's already in the project
- **Trivial architecture choices** — when exactly one option fits the constraints
- **Deferrals to TODOS.md** — non-blocking improvements

## What Always Gets Asked

- **Technology choices** — new language, framework, database, or service
- **Architecture tradeoffs** — significant coupling/performance/operational decisions
- **Design aesthetics** — color, typography, layout preferences
- **Security-sensitive decisions** — auth method, data retention, encryption
- **Scope that removes functionality** — any HOLD or REDUCTION decision
