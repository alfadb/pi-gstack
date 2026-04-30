# OWASP Top 10 — Detailed Assessment Guide

Load this reference when performing Phase 8 of the CSO audit.

## A01: Broken Access Control

Check for:
- Missing auth on controllers/routes (`skip_before_action`, `public`, `no_auth`, `@Public()`)
- Direct object references (`params[:id]`, `req.params.id`, `request.args.get('id')`)
- Horizontal privilege escalation: can user A access user B's resources by changing IDs?
- Vertical privilege escalation: can non-admin access admin routes?
- CORS misconfiguration: wildcard origins in production?

Grep patterns:
```
skip_before_action|skip_authorization|public\s+class|@Public|no_auth|permit!
```

## A02: Cryptographic Failures

Check for:
- Weak algorithms: MD5, SHA1, DES, RC4, ECB mode
- Hardcoded encryption keys, salts, secrets
- Missing encryption on sensitive data at rest
- Keys not in env vars or KMS

Grep patterns:
```
MD5|SHA1|DES|RC4|ECB|hardcoded.*key|secret.*=.*["'][a-zA-Z0-9]
```

## A03: Injection

### SQL Injection
- String interpolation in SQL queries: `"SELECT * FROM users WHERE id = #{params[:id]}"`
- Dynamic table/column names from user input
- Raw SQL when ORM method exists
Grep: `SELECT.*#{|SELECT.*\${|execute\(.*\+|query\(.*\+`

### Command Injection
- `system()`, `exec()`, `spawn()`, `popen()`, `subprocess.call()` with user input
- Backtick execution with dynamic content
Grep: `system\(|exec\(|spawn\(|popen\(|subprocess|`[^`]*\${`

### Template Injection
- User input in `render()`, `eval()`, `html_safe`, `raw()`, `dangerouslySetInnerHTML`
Grep: `render\(.*params|eval\(|html_safe|raw\(|dangerouslySetInnerHTML`

## A05: Security Misconfiguration

Check for:
- Debug mode enabled in production (`DEBUG=True`, `NODE_ENV=development`)
- Verbose error messages exposing stack traces
- Default admin credentials
- Directory listing enabled
- Unnecessary HTTP methods (PUT, DELETE, TRACE)

Grep patterns:
```
DEBUG\s*=\s*True|NODE_ENV.*development|RAILS_ENV.*development
```

## A07: Identification and Authentication Failures

Check for:
- Weak password policy (no complexity, no minimum length)
- Missing rate limiting on login endpoints
- No account lockout after failed attempts
- JWT without expiration or with `none` algorithm
- Session tokens in URLs
- Password reset tokens without expiration

Grep patterns:
```
jwt\.sign|jwt\.decode|expiresIn|expires_in|algorithm.*none|session.*url
```

## A10: Server-Side Request Forgery (SSRF)

Check for:
- URL construction from user input: `fetch(userInput)`, `requests.get(params[:url])`
- Internal service reachability from user-controlled URLs
- No allowlist/blocklist on outbound requests
- URL parsing bypasses (`http://127.0.0.1@evil.com`, `http://localhost:80@evil.com`)

Grep patterns:
```
fetch\(.*param|fetch\(.*req\.|requests\.get\(.*param|http\.get\(.*param|curl.*param
```

## Severity Assignment

- CRITICAL: proven exploit path with data loss/breach potential
- HIGH: clear vulnerability pattern with known exploitation methods
- MEDIUM: potential vulnerability requiring specific conditions
- LOW: defense-in-depth recommendation
