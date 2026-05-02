---
name: plan-devex-review
description: |
  Developer experience plan review. Explores developer personas, benchmarks against competitors, designs magical moments, traces friction points. Three modes: DX EXPANSION (competitive), DX POLISH (bulletproof), DX TRIAGE (gaps only). Use when asked to "DX review", "developer experience audit", or for API/CLI/SDK/library plans.
allowed-tools: bash, read, write, edit, grep, find
compatibility: requires git
---

# Developer Experience Plan Review

Review a plan for developer-facing products (APIs, CLIs, SDKs, libraries, platforms). Make onboarding magical, error messages helpful, and APIs self-documenting.

**HARD GATE:** Do NOT write implementation code. Review the plan only.

## DX First Principles

1. **Time to Hello World is the single most important metric.** If it takes >5 minutes, you've already lost half your potential users.
2. **Great DX is invisible.** The best API call, CLI command, or SDK method feels like it doesn't exist — the developer just thinks their intent and the result appears.
3. **Error messages are the product.** When things break — and they will — the error message is the only interface the developer sees. Make it worth reading.
4. **Documentation is code.** Docs that rot, examples that don't compile, guides that skip steps — these are bugs, not content issues.
5. **Convention over configuration.** Every decision you don't force the developer to make is a gift.

## Brain Context Load

Before the DX review, search your brain for developer experience context:

1. Extract keywords from the API/CLI/SDK being reviewed and the developer persona.
2. Use `gbrain_search` to find past DX reviews, competitor benchmarks, or API design decisions.
3. Use `gbrain_get` to read the top 3 matches.
4. Use this context to ground your scores — don't re-benchmark against competitors already evaluated.

If gbrain tools are not available or return no results, proceed without brain context.

**Multi-model:** If `multi_dispatch` is available, optionally use `/multi-plan` to get diverse model perspectives on key decisions (debate for discussion, ensemble for voting).

---

## The Seven DX Characteristics

| Characteristic | Litmus Test |
|---------------|-------------|
| **Findable** | Can a developer discover this exists in 30 seconds? |
| **Accessible** | Can they get started without signup, payment, or approval? |
| **Desirable** | Does the first experience make them want to tell someone? |
| **Usable** | Can they accomplish the primary task in under 5 minutes? |
| **Useful** | Does it solve a real problem they have right now? |
| **Credible** | Do docs, error messages, and behavior build trust? |
| **Valuable** | Would they pay for it or advocate for it internally? |

## DX Scoring Rubric (0-10)

| Score | TTHW | First Impression | Retention Signal |
|-------|------|-----------------|------------------|
| 10 | <2 min | "I'm telling my team about this" | Ships to production day 1 |
| 8-9 | <5 min | "This is surprisingly good" | Uses for real project |
| 6-7 | <15 min | "This works, I guess" | Completes tutorial, may return |
| 4-5 | <1 hour | "I need to read docs carefully" | Bookmarks, rarely returns |
| 2-3 | >1 hour | "This is frustrating" | Abandons during onboarding |
| 0-1 | Can't start | "Broken" | Never tries again |

## TTHW Benchmarks (Time to Hello World)

Reference `references/dx-hall-of-fame.md` for gold standards. Quick benchmarks:

| Category | World-class | Acceptable | Unacceptable |
|----------|------------|------------|--------------|
| API call | <2 min (curl) | <5 min | >10 min |
| CLI install | <30 sec (one command) | <2 min | >5 min |
| SDK integration | <3 min (one import) | <8 min | >15 min |
| Auth setup | <1 min (one key) | <5 min | >10 min or manual approval |
| Local dev | <2 min (clone + run) | <8 min | >15 min or broken on first try |

## Phase 0: Setup

```bash
REMOTE=$(git remote get-url origin 2>/dev/null | sed 's|.*[:/]\([^/]*/[^/]*\)\.git$|\1|;s|.*[:/]\([^/]*/[^/]*\)$|\1|' | tr '/' '-' | tr -cd 'a-zA-Z0-9._-')
SLUG="${REMOTE:-$(basename "$PWD" | tr -cd 'a-zA-Z0-9._-')}"
BRANCH=$(git branch --show-current | tr '/' '-' | tr -cd 'a-zA-Z0-9._-')

# Find the plan
PLAN=$(ls -t ~/.gstack/projects/$SLUG/ceo-plans/*.md 2>/dev/null | head -1)
[ -z "$PLAN" ] && PLAN=$(ls -t ~/.gstack/projects/$SLUG/*-$BRANCH-design-*.md 2>/dev/null | head -1)
echo "PLAN: ${PLAN:-no plan found}"
```

Read the plan. Answer:

1. **What is the developer product?** API? CLI? SDK? Library? Platform? Tool?
2. **Who is the target developer?** Junior? Senior? Internal team? External OSS? Enterprise?
3. **What is the primary task?** The one thing a developer must accomplish to see value.

## Phase 1: Developer Persona

Define 3 persona axes and pick one per axis:

```
DEVELOPER PERSONA CARD
══════════════════════
Experience:  Junior | Mid | Senior | Expert
Domain:      Novice (new to this domain) | Aware (knows competitors) | Expert (deep domain knowledge)
Motivation:  Evaluate (shopping) | Integrate (adding to existing) | Build (greenfield)

Primary persona: {the most important combination to optimize for}
```

## Phase 2: First-Time Developer Roleplay

Imagine you are the primary persona, encountering this product for the first time:

1. **Discovery**: How do they find this? Search? Word of mouth? Docs link? Package registry?
2. **Decision**: What makes them choose to try it? Star count? Landing page? Comparison table? Trust signals?
3. **First Touch**: What is the very first thing they do? Install command? Sign up? Clone? Import?
4. **First Win**: What is the first moment they think "this works"? API response? CLI output? Rendered UI?
5. **First Block**: What is the most likely friction point where they get stuck or give up?

## Phase 3: Competitive DX Benchmark

Pick 2-3 competitors or analogs. For each, answer:
- TTHW: How long to first success?
- Best DX moment: What delighted you?
- Worst DX moment: What frustrated you?
- What do they do better than the plan?

### Magical Moment Design

Every great DX has one magical moment — the thing developers tell their friends about:

- **Stripe**: Test API keys pre-filled in docs code samples
- **Vercel**: `git push` → live site with HTTPS. One command.
- **Supabase**: Create a DB table → auto-generated REST API, realtime, docs
- **Plan's magical moment**: {what's the one thing that will make developers say "whoa"}

If the plan doesn't have one, design it.

## Phase 4: Mode Selection

Based on the audit findings, choose the review mode:

| Mode | When to Use | Focus |
|------|------------|-------|
| **DX EXPANSION** | Competitive advantage opportunity | Make every touchpoint best-in-class. Sweat the details. |
| **DX POLISH** | Solid foundation, needs refinement | Bulletproof every interaction. Fix paper cuts. |
| **DX TRIAGE** | Limited time, critical gaps only | Fix only what blocks developers from succeeding. |

## Phase 5: Review Passes

Read `references/dx-hall-of-fame.md` for gold standards during each pass.

### Pass 1: Getting Started (Zero Friction)
- TTHW estimate from the plan?
- One command install? One import? One config file?
- Sandbox/demo without signup or credit card?
- "Golden path" clearly identified (not multiple equal options)?
- Off-ramps handled (what happens after the tutorial ends)?

### Pass 2: API/CLI/SDK Design
- Naming consistent with domain conventions?
- Self-documenting patterns (e.g., Stripe's `ch_`, `cus_` prefixed IDs)?
- Sensible defaults — works without config for the 80% case?
- Idempotency for mutating operations?
- Versioning strategy (how will you not break existing users)?

### Pass 3: Error Messages & Debugging
- Error messages tell what happened, why, AND what to do?
- Stack traces point to developer's code, not internals?
- Common errors have dedicated help pages (linked from error message)?
- Debug mode / verbose flag exists for troubleshooting?
- Rate limit errors include Retry-After header and reset time in human language?

### Pass 4: Documentation & Learning
- Quickstart that works in <5 minutes?
- Cookbook/recipes for common patterns, not just reference docs?
- Examples are copy-pasteable, runnable, and version-tagged?
- Docs are versioned alongside code?
- Search actually finds things?

### Pass 5: Upgrade & Migration
- Migration guide for each breaking change?
- Deprecation warnings with timeline before removal?
- Backward compatibility for at least one major version?
- Changelog written for developers (what changed, what to do), not for managers?

### Pass 6: Developer Environment & Tooling
- Local development works with one command?
- Hot reload / watch mode for fast iteration?
- Type definitions / autocomplete for supported editors?
- Linting/formatting config provided (not just documented)?

### Pass 7: Community & Ecosystem
- How do developers get help? (GitHub issues, Discord, Stack Overflow)
- Contributing guide exists and actually works?
- Plugin/extension API documented with examples?
- Issue template that asks for version, reproduction, expected vs actual?

### Pass 8: DX Measurement
- How will you know if DX is improving or degrading?
- Instrument TTHW, error rates, doc page ratings?
- Feedback loop from developer frustration to fix?

## Output

Save to gstack-compatible path:
```bash
mkdir -p ~/.gstack/projects/$SLUG/ceo-plans
DX_PATH="$HOME/.gstack/projects/$SLUG/ceo-plans/$(date +%Y-%m-%d)-dx-review-<slug>.md"
```

Write to `$DX_PATH`:

```markdown
# DX Review: {plan title}
**Date:** {date} | **Mode:** {EXPANSION|POLISH|TRIAGE} | **Branch:** {branch}

## Developer Persona
{persona card}

## First-Time Roleplay
{discovery → decision → first touch → first win → first block}

## Competitive Benchmark
{competitor comparison}

## Magical Moment
{the one thing developers will tell their friends}

## Scores
| Pass | Score | Critical Fixes |
|------|-------|----------------|
| Getting Started | N/10 | {fixes} |
| API/CLI/SDK Design | N/10 | {fixes} |
| Error Messages | N/10 | {fixes} |
| Documentation | N/10 | {fixes} |
| Upgrade/Migration | N/10 | {fixes} |
| Dev Environment | N/10 | {fixes} |
| Community | N/10 | {fixes} |
| Measurement | N/10 | {fixes} |

## TTHW Estimate
Current: {estimate from plan} → Target: {world-class target}
```


