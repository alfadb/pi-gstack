---
description: Security audit following OWASP Top 10 and STRIDE threat modeling. Scans for secrets, supply chain risks, CI/CD vulnerabilities, and AI/LLM attack surface. Use when asked to "security audit", "threat model", "vulnerability scan", or "security review".
argument-hint: "[--scope <domain>] [--comprehensive]"
---

# Security Audit (CSO Review)

Infrastructure-first security audit. Start from the outside in — dependencies, secrets, CI/CD — then go deeper into code-level OWASP and STRIDE analysis.

## Arguments
- `/cso` — daily mode: 8/10 confidence gate, zero-noise
- `/cso --comprehensive` — deep scan: 2/10 bar, reports tentative findings
- `/cso --scope <domain>` — focused audit on auth|api|data|deps|ci

## Phase 0: Architecture Mental Model + Stack Detection

Build an explicit mental model before hunting for bugs.

### Stack detection
```bash
ls package.json tsconfig.json 2>/dev/null && echo "STACK: Node/TypeScript"
ls Gemfile 2>/dev/null && echo "STACK: Ruby"
ls requirements.txt pyproject.toml setup.py 2>/dev/null && echo "STACK: Python"
ls go.mod 2>/dev/null && echo "STACK: Go"
ls Cargo.toml 2>/dev/null && echo "STACK: Rust"
ls pom.xml build.gradle 2>/dev/null && echo "STACK: JVM"
ls composer.json 2>/dev/null && echo "STACK: PHP"
find . -maxdepth 1 \( -name '*.csproj' -o -name '*.sln' \) 2>/dev/null | grep -q . && echo "STACK: .NET"
```

### Framework detection
```bash
grep -q "next" package.json 2>/dev/null && echo "FRAMEWORK: Next.js"
grep -q "express" package.json 2>/dev/null && echo "FRAMEWORK: Express"
grep -q "django" requirements.txt pyproject.toml 2>/dev/null && echo "FRAMEWORK: Django"
grep -q "rails" Gemfile 2>/dev/null && echo "FRAMEWORK: Rails"
```

### Mental model
- Read README, key config files
- Map components, connections, trust boundaries
- Identify data flow: where input enters, exits, transforms
- Output a brief architecture summary

## Phase 1: Attack Surface Census

Map both code and infrastructure surface.

### Code surface
Use `grep` to find: endpoints, auth boundaries, file upload paths, admin routes, webhook handlers, background jobs, WebSocket channels.

### Infrastructure surface
```bash
{ find .github/workflows -maxdepth 1 \( -name '*.yml' -o -name '*.yaml' \) 2>/dev/null; [ -f .gitlab-ci.yml ] && echo .gitlab-ci.yml; } | wc -l
find . -maxdepth 4 -name "Dockerfile*" -o -name "docker-compose*.yml" 2>/dev/null
find . -maxdepth 4 -name "*.tf" -o -name "*.tfvars" 2>/dev/null
ls .env .env.* 2>/dev/null
```

Output:
```
ATTACK SURFACE MAP
  Public endpoints:      N   API endpoints:    N
  File upload points:    N   Webhook handlers: N
  CI/CD workflows:       N   Container configs: N
  IaC configs:           N   Secret mgmt:      [env vars|vault|unknown]
```

## Phase 2: Secrets Archaeology

Scan git history and tracked files for leaked credentials.

```bash
# AWS keys
git log -p --all -S "AKIA" --diff-filter=A -- "*.env" "*.yml" "*.yaml" "*.json" "*.toml" 2>/dev/null
# OpenAI/Anthropic keys
git log -p --all -S "sk-" --diff-filter=A -- "*.env" "*.yml" "*.json" "*.ts" "*.js" "*.py" 2>/dev/null
# GitHub tokens
git log -p --all -G "ghp_|gho_|github_pat_" 2>/dev/null
# Generic secrets
git log -p --all -G "password|secret|token|api_key" -- "*.env" "*.yml" "*.json" "*.conf" 2>/dev/null
```

Check `.env` tracking:
```bash
git ls-files '*.env' '.env.*' 2>/dev/null | grep -v '.example\|.sample\|.template'
grep -q "^\.env$\|^\.env\.\*" .gitignore 2>/dev/null && echo ".env IS gitignored" || echo "WARNING: .env NOT in .gitignore"
```

CI inline secrets:
```bash
for f in $(find .github/workflows -maxdepth 1 \( -name '*.yml' -o -name '*.yaml' \) 2>/dev/null) .gitlab-ci.yml; do
  [ -f "$f" ] && grep -n "password:\|token:\|secret:\|api_key:" "$f" | grep -v '\${{' | grep -v 'secrets\.'
done 2>/dev/null
```

Severity: CRITICAL for active secrets (AKIA, sk_live_, ghp_). FP: placeholders ("your_", "changeme") excluded. Test fixtures excluded unless same value in non-test code.

## Phase 3: Dependency Supply Chain

```bash
# Detect package manager
[ -f package.json ] && echo "DETECTED: npm/yarn/bun"
[ -f Gemfile ] && echo "DETECTED: bundler"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "DETECTED: pip"
[ -f Cargo.toml ] && echo "DETECTED: cargo"
[ -f go.mod ] && echo "DETECTED: go"
```

Run vulnerability audit for detected manager (optional — skip if tool not installed):
```bash
[ -f package-lock.json ] && npm audit --production 2>/dev/null
[ -f Gemfile.lock ] && bundle audit check 2>/dev/null
[ -f requirements.txt ] && pip-audit 2>/dev/null
```

Check lockfile integrity:
- Lockfile exists AND tracked by git? (library repos excluded)
- Install scripts in production deps (preinstall/postinstall in package.json)?

Severity: CRITICAL for high/critical CVEs in direct deps. HIGH for install scripts in prod deps / missing lockfile (app repos only).

## Phase 4: CI/CD Pipeline Security

For each workflow file:
- Unpinned third-party actions (missing `@[sha]` in `uses:`)
- `pull_request_target` event (dangerous: fork PRs get write access)
- Script injection via `${{ github.event.* }}` in `run:` steps
- Secrets exposed as env vars without masking
- CODEOWNERS protection on workflow files

Severity: CRITICAL for `pull_request_target` + PR code checkout / script injection. HIGH for unpinned third-party actions. FP: `pull_request_target` without PR ref checkout is safe.

## Phase 5: Webhook & Integration Audit

Find webhook/notification endpoints:
```bash
grep -r "webhook\|Webhook\|notification\|Notification" --include="*.ts" --include="*.js" --include="*.py" --include="*.rb" . 2>/dev/null
```

For each webhook handler, check for signature verification:
```bash
grep -r "signature\|hmac\|verify\|digest\|x-hub-signature\|stripe-signature\|svix" --include="*.ts" --include="*.js" --include="*.py" --include="*.rb" . 2>/dev/null
```

Also check:
- TLS verification disabled: `grep -r "verify.*false\|NODE_TLS_REJECT_UNAUTHORIZED.*0\|InsecureSkipVerify" . 2>/dev/null`
- OAuth scopes: overly broad permissions

Severity: CRITICAL for webhooks without signature verification. HIGH for TLS verification disabled. FP: internal service-to-service webhooks on private networks = MEDIUM max.

## Phase 6: LLM & AI Security

Search for AI/LLM-specific attack vectors:
```bash
# Prompt injection: user input flowing into system prompts
grep -r "system.*prompt\|systemPrompt\|system_prompt" --include="*.ts" --include="*.js" --include="*.py" . 2>/dev/null
# Unsanitized LLM output rendered as HTML
grep -r "dangerouslySetInnerHTML\|v-html\|innerHTML\|\.html()" --include="*.ts" --include="*.js" --include="*.jsx" --include="*.tsx" . 2>/dev/null
# AI API keys in code
grep -r "sk-\|OPENAI_API_KEY\|ANTHROPIC_API_KEY" --include="*.ts" --include="*.js" --include="*.py" --include="*.env" . 2>/dev/null | grep -v node_modules | grep -v '.example'
# Eval/exec of LLM output
grep -r "eval\|exec\|Function(" --include="*.ts" --include="*.js" --include="*.py" . 2>/dev/null
```

Key checks beyond grep:
- Does user content enter system prompts or tool schemas?
- RAG poisoning: can external documents influence AI behavior?
- Is LLM output treated as trusted (rendered as HTML, executed as code)?

Severity: CRITICAL for user input in system prompts / unsanitized LLM output as HTML / eval of LLM output. FP: user content in the user-message position is NOT prompt injection.

## Phase 7: Pi Skill Supply Chain

Scan installed pi skills for malicious patterns:
```bash
grep -r "curl\|wget\|fetch\|http" ~/.pi/agent/skills/*/SKILL.md 2>/dev/null
grep -r "ANTHROPIC_API_KEY\|OPENAI_API_KEY\|process.env" ~/.pi/agent/skills/*/SKILL.md 2>/dev/null
grep -r "IGNORE PREVIOUS\|system override\|disregard\|forget your instructions" ~/.pi/agent/skills/*/SKILL.md 2>/dev/null
```

Severity: CRITICAL for credential exfiltration / prompt injection in skill files.

## Phase 8: OWASP Top 10 Assessment

For each category, check the codebase:

### A01: Broken Access Control
- Missing auth checks (`skip_before_action`, `public`, `no_auth`)
- Direct object references (`params[:id]`, `req.params.id`)
- Can user A access user B's resources?

### A02: Cryptographic Failures
- Weak crypto (MD5, SHA1, DES, ECB)
- Hardcoded secrets in source
- Keys not in env vars

### A03: Injection
- SQL injection: string interpolation in queries
- Command injection: `system()`, `exec()`, `spawn()`, `popen()`
- Template injection: `render(params)`, `eval()`

### A05: Security Misconfiguration
- CORS wildcard origins in production
- Debug mode / verbose errors enabled

### A07: Authentication Failures
- Session management: creation, storage, invalidation
- Password policy: complexity, rotation
- JWT expiration, refresh rotation

### A10: SSRF
- URL construction from user input
- Internal service reachability from user-controlled URLs

## Phase 9: STRIDE Threat Model

For each major component identified in Phase 0:
```
COMPONENT: [Name]
  Spoofing:             Can attacker impersonate user/service?
  Tampering:            Can data be modified in transit/at rest?
  Repudiation:          Can actions be denied? Audit trail?
  Information Disclosure: Can sensitive data leak?
  Denial of Service:    Can component be overwhelmed?
  Elevation of Privilege: Can user gain unauthorized access?
```

## Phase 10: False Positive Filtering

Before reporting, filter every candidate:

**Hard exclusions (daily mode) — discard:**
1. DoS / resource exhaustion (EXCEPT: LLM cost amplification)
2. Secrets on disk if otherwise secured
3. Memory/CPU/file descriptor issues
4. Input validation on non-security fields without proven impact
5. Missing hardening measures without concrete vulnerability
6. Race conditions / timing attacks unless concretely exploitable
7. Vulnerabilities in outdated libs (covered by Phase 3)
8. Memory safety issues in memory-safe languages
9. Test files unless imported by non-test code
10. Log spoofing / logging unsanitized input
11. SSRF where attacker only controls path, not host
12. User content in user-message position of AI conversation
13. Missing audit logs
14. Git history secrets committed AND removed in same initial PR
15. Docker issues in `Dockerfile.dev`/`Dockerfile.local`

**Confidence gate:**
- Daily mode (`/cso`): report only 8/10+. Zero noise.
- Comprehensive mode (`/cso --comprehensive`): report 2/10+, mark as TENTATIVE.

**Active verification** for each surviving finding:
1. Secrets: check key format. Do NOT test against live APIs.
2. Webhooks: trace code to verify signature verification exists. No HTTP requests.
3. CI/CD: parse YAML to confirm actual risk.
4. Dependencies: check if vulnerable function is directly imported/called.

## Output Format

```
═══════════════════════════════
SECURITY AUDIT — /cso [mode]
═══════════════════════════════

ARCHITECTURE SUMMARY
────────────────────
<Stack detected, components, trust boundaries, data flow>

ATTACK SURFACE MAP
──────────────────
<Phase 1 output>

SECURITY FINDINGS
─────────────────
#   Sev    Conf    Status      Category     Phase   File:Line
──  ────   ────    ──────      ────────     ─────   ────────
1   CRIT   9/10    VERIFIED    Secrets       P2     .env:3
2   HIGH   8/10    VERIFIED    CI/CD         P4     .github/ci.yml:12
...

FINDING DETAILS
───────────────
## Finding 1: AWS Key in Git History — .env:3
  Severity: CRITICAL | Confidence: 9/10 | Status: VERIFIED
  Phase: 2 — Secrets Archaeology | Category: Secrets
  Description: Active AWS access key found in git history
  Exploit: Attacker clones repo → extracts AKIA key → accesses AWS account
  Impact: Full AWS account compromise
  Fix: 1) Revoke key immediately 2) Rotate 3) Scrub history with git-filter-repo

SUMMARY
───────
CRITICAL: N | HIGH: N | MEDIUM: N | TENTATIVE: N
Candidates scanned: N | FP filtered: N | Reported: N
─────────────────────────────────
```

Save report (optional):
```bash
mkdir -p .pi/security-reports
```
Write findings to `.pi/security-reports/<date>-<time>.md`.
