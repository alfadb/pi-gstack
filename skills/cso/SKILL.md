---
name: cso
description: |
  Security audit: secrets archaeology, dependency supply chain, CI/CD pipeline, webhook audit, LLM/AI security, skill supply chain, OWASP Top 10, STRIDE threat model. Two modes: daily (8/10 confidence gate) and comprehensive (2/10). Use when asked to "security audit", "threat model", "vulnerability scan".
allowed-tools: bash, read, grep, find, write
compatibility: requires git
---

# Security Audit (CSO Review)

Infrastructure-first security audit. Start from the perimeter — dependencies, secrets, CI/CD — then go deeper.

## Arguments
- `/skill:cso` — daily mode: 8/10 confidence gate, zero-noise
- `/skill:cso --comprehensive` — deep scan: 2/10 bar, reports TENTATIVE findings
- `/skill:cso --scope <domain>` — focused: auth|api|data|deps|ci

## Phase 0: Architecture + Stack Detection

Build an explicit mental model before hunting.

```bash
ls package.json tsconfig.json 2>/dev/null && echo "STACK: Node/TypeScript"
ls Gemfile 2>/dev/null && echo "STACK: Ruby"
ls requirements.txt pyproject.toml setup.py 2>/dev/null && echo "STACK: Python"
ls go.mod 2>/dev/null && echo "STACK: Go"
ls Cargo.toml 2>/dev/null && echo "STACK: Rust"
grep -q "next\|express\|django\|rails" package.json Gemfile requirements.txt 2>/dev/null
```

Read README, map components, trust boundaries, data flow. Output architecture summary.

## Phase 1: Attack Surface Census

```bash
# Code surface: use grep for endpoints, auth, webhooks, file uploads
# Infrastructure surface:
{ find .github/workflows -maxdepth 1 \( -name '*.yml' -o -name '*.yaml' \) 2>/dev/null; [ -f .gitlab-ci.yml ] && echo .gitlab-ci.yml; } | wc -l
find . -maxdepth 4 -name "Dockerfile*" -o -name "docker-compose*.yml" 2>/dev/null
ls .env .env.* 2>/dev/null
```

Output attack surface map with counts.

## Phase 2: Secrets Archaeology

```bash
git log -p --all -S "AKIA" --diff-filter=A -- "*.env" "*.yml" "*.yaml" "*.json" 2>/dev/null
git log -p --all -S "sk-" --diff-filter=A -- "*.env" "*.yml" "*.json" "*.ts" "*.js" 2>/dev/null
git log -p --all -G "ghp_|gho_|github_pat_" 2>/dev/null
git log -p --all -G "password|secret|token|api_key" -- "*.env" "*.yml" "*.json" 2>/dev/null
git ls-files '*.env' '.env.*' 2>/dev/null | grep -v '.example\|.sample\|.template'
grep -q "^\.env" .gitignore 2>/dev/null && echo ".env IS gitignored" || echo "WARNING: .env NOT in .gitignore"
```

Severity: CRITICAL for active secret patterns (AKIA, sk_live_, ghp_).

## Phase 3: Dependency Supply Chain

```bash
[ -f package.json ] && echo "DETECTED: npm/yarn/bun" && npm audit --production 2>/dev/null
[ -f Gemfile ] && echo "DETECTED: bundler" && bundle audit check 2>/dev/null
[ -f requirements.txt ] && echo "DETECTED: pip" && pip-audit 2>/dev/null
[ -f go.mod ] && echo "DETECTED: go"
```

Check: lockfile exists + tracked by git? Install scripts in production deps?

## Phase 4: CI/CD Pipeline Security

For each workflow: unpinned third-party actions, `pull_request_target` event, script injection via `${{ github.event.* }}`, secrets as env vars.

## Phase 5: Webhook & Integration Audit

```bash
grep -r "webhook\|Webhook\|notification" --include="*.ts" --include="*.js" --include="*.py" --include="*.rb" . 2>/dev/null
grep -r "signature\|hmac\|verify\|digest\|x-hub-signature\|stripe-signature" --include="*.ts" --include="*.js" . 2>/dev/null
```

Webhooks without signature verification = CRITICAL.

## Phase 6: LLM & AI Security

```bash
grep -r "dangerouslySetInnerHTML\|v-html\|innerHTML" --include="*.tsx" --include="*.jsx" . 2>/dev/null
grep -r "sk-\|OPENAI_API_KEY\|ANTHROPIC_API_KEY" --include="*.ts" --include="*.js" --include="*.env" . 2>/dev/null | grep -v node_modules | grep -v '.example'
```

User input in system prompts / unsanitized LLM output = CRITICAL.

## Phase 7: Pi Skill Supply Chain

```bash
grep -rn "curl\|wget\|fetch" ~/.pi/agent/skills/*/SKILL.md 2>/dev/null
grep -rn "API_KEY\|process.env" ~/.pi/agent/skills/*/SKILL.md 2>/dev/null
grep -rn "IGNORE PREVIOUS\|system override\|disregard" ~/.pi/agent/skills/*/SKILL.md 2>/dev/null
```

## Phase 8: OWASP Top 10 Assessment

For detailed methodology, see `references/owasp-top10.md`. Key checks:

- **A01 Broken Access Control**: missing auth checks, direct object references
- **A02 Cryptographic Failures**: weak crypto, hardcoded secrets
- **A03 Injection**: SQL, command, template injection
- **A05 Security Misconfiguration**: CORS wildcards, debug mode
- **A07 Authentication Failures**: session mgmt, password policy, JWT
- **A10 SSRF**: URL construction from user input

## Phase 9: STRIDE Threat Model

For each major component:
```
COMPONENT: [Name]
  Spoofing / Tampering / Repudiation / Information Disclosure / DoS / Elevation
```

## Phase 10: False Positive Filtering

Hard exclusions (discard):
1. DoS / resource exhaustion (EXCEPT: LLM cost amplification)
2. Secrets on disk if secured
3. Memory/CPU/file descriptor issues
4. Input validation on non-security fields without proven impact
5. Missing hardening without concrete vulnerability
6. Race conditions unless concretely exploitable
7. Test files not imported by non-test code
8. SSRF where attacker only controls path
9. User content in user-message position of AI conversation
10. Missing audit logs
11. Docker issues in dev/local files

Confidence gate: daily 8/10, comprehensive 2/10 (mark TENTATIVE).

## Output Format

```
═══════════════════════════════
SECURITY AUDIT — /skill:cso [mode]
═══════════════════════════════

ARCHITECTURE SUMMARY
<stack, components, trust boundaries>

ATTACK SURFACE MAP
<Phase 1 output>

FINDINGS
#   Sev    Conf    Status      Category     Phase   File:Line

FINDING DETAILS
## Finding N: Title — File:Line
  Severity: CRITICAL|HIGH|MEDIUM  Confidence: N/10  Status: VERIFIED|UNVERIFIED
  Description / Exploit / Impact / Fix

SUMMARY
CRITICAL: N | HIGH: N | MEDIUM: N | TENTATIVE: N
Candidates: N | FP filtered: N | Reported: N
─────────────────────────────────
```

Save report to `.pi/security-reports/<date>-<time>.md`.
