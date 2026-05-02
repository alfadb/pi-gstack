---
name: investigate
description: |
  Systematic debugging: trace symptoms to root cause, test hypotheses, fix with minimal diff and regression test. Iron Law — no fixes without confirmed root cause. Use when asked to "debug", "fix this bug", "why is this broken", "root cause analysis". Proactively suggest when user reports errors or unexpected behavior.
allowed-tools: bash, read, edit, write, grep, find
compatibility: requires git
---

# Investigate — Systematic Debugging

## Iron Law

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

Fixing symptoms creates whack-a-mole debugging. Every fix that doesn't address root cause makes the next bug harder to find.

---

## Brain Context Load

Before investigating, search your brain for relevant history:

1. Extract 2-4 keywords from the symptom (error messages, module names, file paths).
2. Use `gbrain_search` to find past investigations, RCAs, or related patterns.
3. Use `gbrain_get` to read the top 3 matching pages.
4. Use this context to identify known pitfalls, previous fixes, or related modules.

If gbrain tools are not available or return no results, proceed without brain context.

---

## Phase 1: Root Cause Investigation

Gather context before forming any hypothesis.

1. **Collect symptoms:** Read the error messages, stack traces, and reproduction steps.

2. **Trace the code path:** From symptom back to potential causes. Use `grep` to find references, `read` to understand logic.

3. **Check recent changes:**
   ```bash
   git log --oneline -20 -- <affected-files>
   ```
   Was this working before? A regression means root cause is in the recent diff.

4. **Reproduce:** Can the bug be triggered deterministically? If not, gather more evidence.

5. **Read prior investigations:** Check `.pensieve/short-term/` for previous investigations on the same files. Recurring bugs in the same area are an architectural smell.

Output: **"Root cause hypothesis: ..."** — a specific, testable claim.

---

## Phase 2: Pattern Analysis

Check if the bug matches a known pattern:

| Pattern | Signature | Where to look |
|---------|-----------|---------------|
| Race condition | Intermittent, timing-dependent | Shared state access, locks |
| Nil/null propagation | TypeError, NoMethodError, panic | Missing guards on optional values |
| State corruption | Inconsistent data, partial updates | Transactions, callbacks, hooks |
| Integration failure | Timeout, unexpected response | External API calls, service boundaries |
| Configuration drift | Works locally, fails in prod | Env vars, feature flags, DB state |
| Stale cache | Shows old data, clears on refresh | Redis, CDN, browser cache |

Also check:
- `TODOS.md` for related known issues
- `git log` for prior fixes in the same area — recurring bugs = architectural smell

---

## Phase 3: Hypothesis Testing

Before writing ANY fix, verify your hypothesis.

1. **Confirm:** Add temporary log/assertion at the suspected root cause. Run reproduction. Match?

2. **If wrong:** Return to Phase 1. Gather more evidence. Do not guess.

3. **3-strike rule:** If 3 hypotheses fail, **STOP** and do NOT fix blindly. Present the situation:
   ```
   3 hypotheses tested, none confirmed.
   A) Continue — new hypothesis
   B) Escalate — needs human review
   C) Instrument — add logging, catch next time
   ```

**Red flags** — if you see these, slow down:
- "Quick fix for now" — there is no "for now"
- Proposing a fix before tracing data flow — you're guessing
- Each fix reveals a new problem elsewhere — wrong layer, not wrong code

---

## Phase 4: Implementation

Once root cause is confirmed:

1. **Fix the root cause, not the symptom.** Smallest change that eliminates the actual problem.

2. **Minimal diff:** Fewest files touched, fewest lines changed. Do not refactor adjacent code.

3. **Write a regression test** that fails without the fix, passes with it.

4. **Run full test suite.** No regressions.

5. **If fix touches >5 files:** flag the blast radius and give user options (proceed/split/rethink).

---

## Phase 5: Verification & Report

Reproduce the original bug, confirm fixed.

```
════════════════════════════════════════
DEBUG REPORT
════════════════════════════════════════
Symptom:      [what was observed]
Root cause:   [what was actually wrong]
Fix:          [what changed, with file:line]
Evidence:     [test output, reproduction confirmation]
Regression:   [file:line of new test]
Related:      [TODOS.md items, prior bugs in same area]
Status:       DONE | DONE_WITH_CONCERNS | BLOCKED
════════════════════════════════════════
```
