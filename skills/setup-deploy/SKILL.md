---
name: setup-deploy
description: Configure deployment for a project. Auto-detects platform (Fly.io, Render, Vercel, Netlify, Heroku, Railway, GitHub Actions), guides through setup, and writes deploy configuration. Use when starting a new project that needs deployment, or when switching deploy targets.
allowed-tools: bash, read, write, edit, grep, find
compatibility: requires git
---

# Setup Deploy

Auto-detect the deployment platform and configure the project for `/skill:land-and-deploy` to work correctly.

## Brain Context Load

Before configuring deployment, search your brain for deploy context:

1. Extract keywords from the project type, framework, and hosting clues.
2. Use `gbrain_search` to find past deploy setups, platform-specific configurations, or known gotchas.
3. Use `gbrain_get` to read the top 3 matches.
4. Use this context to anticipate platform-specific requirements.

If gbrain tools are not available or return no results, proceed without brain context.

---

## Step 1: Check Existing Config

```bash
grep -A 20 "## Deploy Configuration" AGENTS.md 2>/dev/null || echo "NO_CONFIG"
```

If config exists, show it. Ask user: update, edit specific field, or done.

## Step 2: Detect Platform

```bash
# Platform config files
[ -f fly.toml ] && echo "PLATFORM:fly"
[ -f render.yaml ] && echo "PLATFORM:render"
[ -f vercel.json ] || [ -d .vercel ] && echo "PLATFORM:vercel"
[ -f netlify.toml ] && echo "PLATFORM:netlify"
[ -f Procfile ] && echo "PLATFORM:heroku"
[ -f railway.json ] || [ -f railway.toml ] && echo "PLATFORM:railway"
[ -f Dockerfile ] && echo "HAS_DOCKERFILE"

# GitHub Actions deploy workflows
for f in $(find .github/workflows -maxdepth 1 \( -name '*.yml' -o -name '*.yaml' \) 2>/dev/null); do
  if grep -qiE "deploy|release|production|staging|cd" "$f" 2>/dev/null; then
    echo "DEPLOY_WORKFLOW: $f"
  fi
done

# Project type
[ -f package.json ] && grep -q '"bin"' package.json 2>/dev/null && echo "PROJECT_TYPE:cli"
find . -maxdepth 1 -name '*.gemspec' 2>/dev/null | grep -q . && echo "PROJECT_TYPE:library"
[ -f package.json ] && echo "PROJECT_TYPE:node"
[ -f go.mod ] && echo "PROJECT_TYPE:go"
[ -f Cargo.toml ] && echo "PROJECT_TYPE:rust"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "PROJECT_TYPE:python"
```

## Step 3: Platform-Specific Setup

### Fly.io
1. Extract app name: `grep -m1 "^app" fly.toml | sed 's/app = "\(.*\)"/\1/'`
2. Check CLI: `which fly 2>/dev/null`
3. Production URL: `https://{app}.fly.dev`
4. Health check path: usually `/` or `/health`

### Render
1. Extract service name from `render.yaml`
2. Production URL: `https://{service-name}.onrender.com`
3. Render auto-deploys on push — no manual deploy step needed

### Vercel
1. Check CLI: `which vercel 2>/dev/null`  
2. Production URL from vercel project settings
3. Auto-deploys on push to main

### Netlify
1. Site name from netlify.toml
2. Auto-deploys on push

### GitHub Actions
1. Read the deploy workflow
2. Ask user for production URL
3. Note: deploy happens on push to the configured branch

### Heroku
1. Check CLI: `which heroku 2>/dev/null`
2. App name from Procfile context
3. Production URL: `https://{app}.herokuapp.com`

### Railway
1. Production URL from railway dashboard
2. Auto-deploys on push

### No Platform Detected
If no platform config found:
1. Ask user which platform they use
2. Guide through creating the initial config file
3. Common options: Fly.io (simplest), Vercel (frontend), Render (full-stack)

## Step 4: Write Deploy Config

Append to `AGENTS.md` (project-level context file):

```markdown

## Deploy Configuration (configured by /setup-deploy)

- **Platform:** {fly|render|vercel|netlify|heroku|railway|github-actions}
- **App name:** {app}
- **Production URL:** {url}
- **Health check:** {url/health-path}
- **Deploy trigger:** {auto on push to main | manual via CLI | GitHub Actions workflow}
- **Deploy command:** {command to deploy, or "auto on push"}
- **Deploy status command:** {command to check deploy status}
- **Rollback command:** {command to rollback, or "auto on git revert"}

### Manual Deploy (if needed)
\```bash
{deploy-command}
\```
```

## Step 5: Verify

Test the deploy status command if possible:
```bash
{deploy-status-command} 2>/dev/null || echo "Status check not available (platform may not have CLI)"
```

If CLI available and authenticated, verify the app exists and is reachable.

## Output

```
DEPLOY SETUP COMPLETE
══════════════════════
Platform: {platform}
App: {app}
Production URL: {url}
Deploy: {auto/manual trigger description}
Health check: {health-check-url}
Status command: {status-command}
──────────────────────
Deploy config written to AGENTS.md.
/skill:land-and-deploy will use these settings when shipping.
```

