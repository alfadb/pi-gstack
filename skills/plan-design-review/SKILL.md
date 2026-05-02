---
name: plan-design-review
description: |
  Designer's eye plan review. Rates design dimensions 0-10, identifies what would make each a 10, then fixes the plan. Use when asked to "review design plan", "design critique", or after /skill:plan-eng-review for UI-heavy features.
allowed-tools: bash, read, write, edit, grep, find
compatibility: requires git
---

# Plan Design Review

Review a plan through a designer's lens. Rate each dimension, push for 10/10, and fix the plan.

**HARD GATE:** Do NOT write implementation code. Review the plan only.

## Design Philosophy

1. **Good taste cannot be fully specified** — but it can be systematically improved through structured critique.
2. **Every design decision is a tradeoff**: aesthetics vs clarity, power vs simplicity, consistency vs context.
3. **The user's mental model is the only model that matters** — interfaces must match what users expect, not what the system does internally.
4. **Design is a practiced skill** — the more you critique, the better your taste becomes.
5. **Good design is invisible** — users achieve goals without noticing the interface. Bad design is a conversation.

## Design Principles

| Principle | Litmus Test |
|-----------|-------------|
| **Hierarchy** | Can a user identify the most important thing in 3 seconds? |
| **Proximity** | Are related items physically grouped? |
| **Alignment** | Does every element visually connect to something else? |
| **Contrast** | Do distinct elements look distinctly different? |
| **Repetition** | Are similar things styled similarly throughout? |
| **White Space** | Does breathing room guide attention, not waste it? |
| **Affordance** | Does every interactive element look clickable? |
| **Feedback** | Does every action produce an immediate, visible response? |
| **Forgiveness** | Can users undo mistakes easily? |
| **Consistency** | Do patterns repeat predictably across the entire interface? |

## UX Principles

### The Three Laws of Usability

1. **Don't make me think.** Every screen should be self-evident. A user should understand it without instructions.
2. **It doesn't matter how many times I click, as long as each click is a mindless choice.** People don't mind many clicks if each is unambiguous.
3. **Get rid of half the words on each page, then get rid of half of what's left.** Words dilute meaning.

### How Users Actually Behave

- Users don't read — they scan. F-pattern for text-heavy, Z-pattern for visual.
- Users don't make optimal choices — they satisfice (pick the first reasonable option).
- Users don't figure things out — they muddle through.
- The Back button is the most-used navigation feature. If users rely on it, the navigation failed.

### Navigation as Wayfinding

1. Where am I? (current location indicator)
2. Where can I go? (visible navigation options)
3. What's there? (preview without commitment)
4. How do I get back? (persistent return path)

### The Goodwill Reservoir

Users enter with a full reservoir of goodwill. Each friction point drains it:
- Hiding information they want
- Punishing them for not doing things your way
- Filling the interface with self-promotion
- Making them wait without explanation

Once empty, they leave — often permanently.

## Priority Hierarchy Under Context Pressure

When time/money is tight, prioritize in this order:

| Priority | Focus | Why |
|----------|-------|-----|
| **1. Safety** | No data loss, no destructive actions without confirm | Users never forgive data loss |
| **2. Clarity** | Self-evident labels, obvious next actions | Confusion is the #1 conversion killer |
| **3. Performance** | Perceived speed > actual speed. Optimistic UI. | Slow feels broken |
| **4. Polish** | Consistent spacing, proper loading states, smooth transitions | Polish signals care and builds trust |
| **5. Delight** | Micro-interactions, easter eggs, personality | Only if 1-4 are solid |

---

## Brain Context Load

Before reviewing, search your brain for design context:

1. Extract keywords from the feature and any design system or pattern library references.
2. Use `gbrain_search` to find past design reviews, design systems, or UX patterns.
3. Use `gbrain_get` to read the top 3 matches.
4. Use this context to avoid re-litigating settled design decisions.

If gbrain tools are not available, proceed without brain context.

**Multi-model:** If `multi_dispatch` is available, optionally use `/multi-plan` to get diverse model perspectives on key decisions (debate for discussion, ensemble for voting).

---

## Phase 0: Setup

Detect the plan and UI scope:

```bash
REMOTE=$(git remote get-url origin 2>/dev/null | sed 's|.*[:/]\([^/]*/[^/]*\)\.git$|\1|;s|.*[:/]\([^/]*/[^/]*\)$|\1|' | tr '/' '-' | tr -cd 'a-zA-Z0-9._-')
SLUG="${REMOTE:-$(basename "$PWD" | tr -cd 'a-zA-Z0-9._-')}"
BRANCH=$(git branch --show-current | tr '/' '-' | tr -cd 'a-zA-Z0-9._-')

# Find the plan: check CEO plans first, then design docs
PLAN=$(ls -t ~/.gstack/projects/$SLUG/ceo-plans/*.md 2>/dev/null | head -1)
[ -z "$PLAN" ] && PLAN=$(ls -t ~/.gstack/projects/$SLUG/*-$BRANCH-design-*.md 2>/dev/null | head -1)
echo "PLAN: ${PLAN:-no plan found}"
```

Read the plan. Rate the design dimensions 0-10:

```
INITIAL RATING
═══════════════
Visual Hierarchy:  N/10 — <one sentence why, what would make it 10>
Layout/Spacing:    N/10
Typography/Text:   N/10
Color/Contrast:    N/10
Navigation/IA:     N/10
Forms/Input:       N/10
States & Feedback: N/10
Error Handling UX: N/10
Mobile/Responsive: N/10
Accessibility:     N/10
───────────────────
Overall:           N/10
```

## The 0-10 Rating Method

For each score, explain:
1. **Why N/10** — what's holding it back from a higher score?
2. **What makes it a 10** — describe the specific changes that would achieve the top tier.
3. **The cost to get there** — is it a 5-minute text change, a 2-hour layout rework, or a sprint-level redesign?

## Review Passes

### Pass 1: Information Architecture
- Is the content organized as users expect, not as the system works internally?
- Can users find the main action in one glance?
- Are related items grouped, unrelated items separated?
- Does the navigation tell users where they are and where they can go?

### Pass 2: Layout & Spacing
- Consistent spacing scale? (4px or 8px base)
- Clear visual hierarchy through size, position, color?
- No orphaned elements, no floating items?
- Responsive at 3 breakpoints (mobile/tablet/desktop)?

### Pass 3: Interaction Design
- Every interactive element has clear affordance?
- Hover, focus, active, disabled states defined for all interactive elements?
- Transitions are fast (<300ms) and purposeful?
- Loading, empty, error, and edge case states designed?

### Pass 4: Forms & Input
- Labels are always visible (not placeholder-only)?
- Input types match expected data (email, number, date)?
- Validation is inline and immediate — not after submit?
- Error messages say what to do, not what went wrong ("Enter a valid email" not "Invalid input")?

### Pass 5: Typography & Readability
- Max 2-3 typefaces, clear hierarchy?
- Line length 50-75 characters for body text?
- Line height ≥ 1.5 for body text?
- Color contrast meets WCAG AA (4.5:1 for normal text)?

### Pass 6: Mobile & Touch
- Touch targets ≥ 44x44px (WCAG AAA)?
- No horizontal scroll at any viewport width?
- Forms usable with one thumb on phone?
- Pinch-to-zoom not disabled?

### Pass 7: Accessibility & Inclusivity
- All images have alt text?
- Form inputs have associated labels?
- Color is never the only indicator (add icons/text)?
- Tab order is logical?
- Screen reader announcement for dynamic content?

## Output

Save to gstack-compatible path:
```bash
mkdir -p ~/.gstack/projects/$SLUG/ceo-plans
DESIGN_REVIEW_PATH="$HOME/.gstack/projects/$SLUG/ceo-plans/$(date +%Y-%m-%d)-design-review-<slug>.md"
```

Write to `$DESIGN_REVIEW_PATH`:

```markdown
# Design Review: {plan title}
**Date:** {date} | **Plan:** {plan path} | **Branch:** {branch}

## Ratings
| Dimension | Before | After | Changes |
|-----------|--------|-------|---------|
| Visual Hierarchy | N/10 | N/10 | {changes} |
| Layout/Spacing | N/10 | N/10 | {changes} |
| Typography | N/10 | N/10 | {changes} |
| ... | | | |

## Critical Fixes
{top 3 fixes applied to the plan}

---

## Design Debt
{issues noted but not blocking — for future iteration}
```

Fix the plan directly: edit the plan file to incorporate the critical design fixes. Don't just critique — improve the plan.
