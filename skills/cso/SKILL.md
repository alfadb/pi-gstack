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
- `/skill:cso` — daily mode: 8/10 confidence gate, zero-noise (all phases)
- `/skill:cso --comprehensive` — deep scan: 2/10 bar, reports TENTATIVE findings
- `/skill:cso --scope <domain>` — focused: auth|api|data|deps|ci
- `/skill:cso --diff` — scan only files changed on current branch vs base. Combinable with any flag.

## Mode Resolution

1. No flags → all phases, daily mode (8/10 gate).
2. `--comprehensive` → all phases, 2/10 gate. Combinable with scope flags.
3. `--diff` limits scanning to files changed on current branch vs base. Git history scans limit to current branch commits only.
4. Phases 0, 1 always run regardless of scope flag.

---

## Brain Context Load

Before the security audit, search your brain for relevant history:

1. Extract keywords from the project and any known vulnerability patterns.
2. Use `gbrain_search` to find past security audits, known vulnerable patterns, or dependency advisories.
3. Use `gbrain_get` to read the top 3 matches.
4. Use this context to prioritize phases — don't re-scan areas already audited and cleared.

If gbrain tools are not available, proceed without brain context.

---

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

## Phase 5: Infrastructure Shadow Surface

Find shadow infrastructure with excessive access.

**Dockerfiles:** For each Dockerfile, check for missing `USER` directive (runs as root), secrets passed as `ARG`, `.env` files copied into images, exposed ports.

```bash
find . -maxdepth 4 -name "Dockerfile*" -not -name "*.dev" -not -name "*.local" 2>/dev/null | while read f; do
  echo "=== $f ==="
  grep -n "USER\|ARG.*secret\|ARG.*key\|ARG.*token\|COPY.*\.env\|EXPOSE" "$f" 2>/dev/null || true
done
```

**Config files with prod credentials:** Search for database connection strings in config files:

```bash
grep -rn "postgres://\|mysql://\|mongodb://\|redis://" --include="*.yml" --include="*.yaml" --include="*.json" --include="*.toml" . 2>/dev/null | grep -v "localhost\|127.0.0.1\|example.com"
```

**IaC security:** For Terraform/K8s files:

```bash
find . -name "*.tf" -o -name "*.tfvars" 2>/dev/null | head -5
grep -rn '"\*"' --include="*.tf" . 2>/dev/null | head -10
grep -rn "hostNetwork:\|hostPID:\|privileged:" --include="*.yml" --include="*.yaml" . 2>/dev/null
```

Check: IAM `*` actions on sensitive resources, hardcoded secrets in IaC, privileged K8s pods.

Severity: CRITICAL for prod DB URLs in committed config / `*` IAM / secrets in Docker images. HIGH for root containers in prod. MEDIUM for missing USER directive.

FP rules: docker-compose for local dev with localhost excluded. Terraform `*` in data sources (read-only) excluded. K8s in `test/`/`dev/`/`local/` excluded.

## Phase 6: Webhook & Integration Audit

```bash
grep -r "webhook\|Webhook\|notification" --include="*.ts" --include="*.js" --include="*.py" --include="*.rb" . 2>/dev/null
grep -r "signature\|hmac\|verify\|digest\|x-hub-signature\|stripe-signature" --include="*.ts" --include="*.js" . 2>/dev/null
```

Webhooks without signature verification = CRITICAL.

## Phase 7: LLM & AI Security

```bash
grep -r "dangerouslySetInnerHTML\|v-html\|innerHTML" --include="*.tsx" --include="*.jsx" . 2>/dev/null
grep -r "sk-\|OPENAI_API_KEY\|ANTHROPIC_API_KEY" --include="*.ts" --include="*.js" --include="*.env" . 2>/dev/null | grep -v node_modules | grep -v '.example'
```

User input in system prompts / unsanitized LLM output = CRITICAL.

## Phase 8: Pi Skill Supply Chain

```bash
grep -rn "curl\|wget\|fetch" ~/.pi/agent/skills/*/SKILL.md 2>/dev/null
grep -rn "API_KEY\|process.env" ~/.pi/agent/skills/*/SKILL.md 2>/dev/null
grep -rn "IGNORE PREVIOUS\|system override\|disregard" ~/.pi/agent/skills/*/SKILL.md 2>/dev/null
```

## Phase 9: OWASP Top 10 Assessment

For detailed methodology, see `references/owasp-top10.md`. Key checks:

- **A01 Broken Access Control**: missing auth checks, direct object references
- **A02 Cryptographic Failures**: weak crypto, hardcoded secrets
- **A03 Injection**: SQL, command, template injection
- **A05 Security Misconfiguration**: CORS wildcards, debug mode
- **A07 Authentication Failures**: session mgmt, password policy, JWT
- **A10 SSRF**: URL construction from user input

## Phase 10: STRIDE Threat Model

For each major component:
```
COMPONENT: [Name]
  Spoofing / Tampering / Repudiation / Information Disclosure / DoS / Elevation
```

## Phase 11: Data Classification

Classify all data handled by the application:

```
DATA CLASSIFICATION
═══════════════════
RESTRICTED (breach = legal liability):
  - Passwords/credentials: [where stored, how protected]
  - Payment data: [where stored, PCI compliance status]
  - PII: [what types, where stored, retention policy]

CONFIDENTIAL (breach = business damage):
  - API keys: [where stored, rotation policy]
  - Business logic: [trade secrets in code?]
  - User behavior data: [analytics, tracking]

INTERNAL (breach = embarrassment):
  - System logs: [what they contain, who can access]
  - Configuration: [what's exposed in error messages]

PUBLIC:
  - Marketing content, documentation, public APIs
```

Check against data classification:
- Is PII encrypted at rest? In transit?
- Are credentials stored in env vars or KMS (not code)?
- Do logs accidentally capture restricted data?
- Is there a data retention/deletion policy?

## Phase 12: False Positive Filtering

Before producing findings, run every candidate through this filter.

**Hard exclusions (discard):**
1. DoS / resource exhaustion (EXCEPT: LLM cost amplification from Phase 7)
2. Secrets on disk if otherwise secured (encrypted, permissioned)
3. Memory/CPU/file descriptor issues
4. Input validation on non-security fields without proven impact
5. Missing hardening without concrete vulnerability (EXCEPT: unpinned third-party actions in CI/CD — these ARE concrete risks)
6. Race conditions unless concretely exploitable
7. Test files not imported by non-test code
8. SSRF where attacker only controls path (not host/protocol)
9. User content in user-message position of AI conversation
10. Missing audit logs
11. Docker issues in files named `Dockerfile.dev` or `Dockerfile.local` unless referenced in prod deploy configs
12. CI/CD findings on archived or disabled workflows
13. Security concerns in documentation files (*.md) — EXCEPTION: SKILL.md files are executable prompt code, do NOT exclude
14. Dependency CVEs with CVSS < 4.0 and no known exploit
15. Git history secrets committed AND removed in same initial-setup PR

**Precedents:**
- Logging secrets in plaintext IS a vulnerability. Logging URLs is safe.
- UUIDs are unguessable — don't flag missing UUID validation.
- Environment variables and CLI flags are trusted input.
- React and Angular are XSS-safe by default. Only flag escape hatches (dangerouslySetInnerHTML, v-html).
- Client-side JS/TS does not need auth — that's the server's job.
- Lockfile not tracked by git IS a finding for app repos, NOT for library repos.
- `pull_request_target` without PR ref checkout is safe.
- Containers as root in docker-compose for local dev are NOT findings; in production Dockerfiles/K8s ARE findings.

**Confidence gate:** daily 8/10, comprehensive 2/10 (mark TENTATIVE).

**Active Verification:** For each finding that survives, attempt to prove it:
- Secrets: Check if pattern is a real key format. Do NOT test live.
- Webhooks: Trace handler code to verify signature verification. Do NOT make HTTP requests.
- SSRF: Trace code path to check if URL can reach internal services.
- CI/CD: Parse YAML to confirm `pull_request_target` actually checks out PR code.
- Dependencies: Check if vulnerable function is directly called. Mark VERIFIED if called, UNVERIFIED if not.

Mark: VERIFIED (confirmed via code tracing) / UNVERIFIED (pattern match only) / TENTATIVE (<8/10 confidence)

---

## Output Format

**Exploit scenario requirement:** Every finding MUST include a concrete exploit scenario — step-by-step attack path. "This pattern is insecure" is not a finding.

```
═══════════════════════════════
SECURITY AUDIT — /skill:cso [mode]
═══════════════════════════════

ARCHITECTURE SUMMARY
<stack, components, trust boundaries>

ATTACK SURFACE MAP
<Phase 1 output>

DATA CLASSIFICATION
<Phase 11 output>

FINDINGS
#   Sev    Conf    Status      Category     Phase   File:Line

FINDING DETAILS
## Finding N: Title — File:Line
  Severity: CRITICAL|HIGH|MEDIUM  Confidence: N/10  Status: VERIFIED|UNVERIFIED|TENTATIVE
  Phase: N — [Name]   Category: [Secrets|Supply Chain|CI/CD|Infra|Integrations|LLM|Skills|OWASP A01-A10]
  Description: [What's wrong]
  Exploit scenario: [Step-by-step attack path]
  Impact: [What an attacker gains]
  Recommendation: [Specific fix with example]

SUMMARY
CRITICAL: N | HIGH: N | MEDIUM: N | TENTATIVE: N
Candidates: N | FP filtered: N | Reported: N

TREND (if prior reports exist)
Resolved: N | Persistent: N | New: N | Trend: ↑/↓/→
─────────────────────────────────
```

Save report to in-project `.gstack/` (same tier as gstack CSO):
```bash
mkdir -p .gstack/security-reports
REPORT_PATH=".gstack/security-reports/$(date +%Y-%m-%d)-$(date +%H%M%S).json"
```

Write findings to `$REPORT_PATH` as JSON with `fingerprint` field (sha256 of category + file + normalized title) for cross-report matching.

If `.gstack/` is not in `.gitignore`, note it — security reports should stay local.
