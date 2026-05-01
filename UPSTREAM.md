# 上游追踪

记录从 gstack 迁移时的上游 commit，用于后续跟进更新。

上游仓库已作为 submodule 存放在 `vendor/gstack/`。

基准 commit: `454423a` (v1.21.1.0, 2026-04-30)

| pi-gstack 文件 | 形式 | 上游来源 | 迁移日期 |
|---------------|------|---------|---------|
| `skills/office-hours/SKILL.md` | Skill | `garrytan/gstack` `office-hours/SKILL.md` | 2026-04-30 |
| `skills/plan-ceo-review/SKILL.md` | Skill | `garrytan/gstack` `plan-ceo-review/SKILL.md` | 2026-04-30 |
| `skills/review/SKILL.md` | Skill | `garrytan/gstack` `review/SKILL.md` | 2026-04-30 |
| `skills/investigate/SKILL.md` | Skill | `garrytan/gstack` `investigate/SKILL.md` | 2026-04-30 |
| `skills/cso/SKILL.md` | Skill | `garrytan/gstack` `cso/SKILL.md` | 2026-04-30 |
| `skills/qa/SKILL.md` | Skill | `garrytan/gstack` `qa/SKILL.md` | 2026-04-30 |
| `skills/retro/SKILL.md` | Skill | `garrytan/gstack` `retro/SKILL.md` | 2026-04-30 |
| `skills/document-release/SKILL.md` | Skill | `garrytan/gstack` `document-release/SKILL.md` | 2026-04-30 |
| `skills/land-and-deploy/SKILL.md` | Skill | `garrytan/gstack` `land-and-deploy/SKILL.md` | 2026-04-30 |
| `prompts/ship.md` | Template | `garrytan/gstack` `ship/SKILL.md` | 2026-04-30 |
| `extensions/browse/` | Extension | `garrytan/gstack` `browse/src/*.ts` | 2026-04-30 |
| `skills/review/references/checklist.md` | Reference | `garrytan/gstack` `review/checklist.md` | 2026-04-30 |
| `skills/review/references/testing.md` | Reference | `garrytan/gstack` `review/specialists/testing.md` | 2026-04-30 |
| `skills/review/references/security.md` | Reference | `garrytan/gstack` `review/specialists/security.md` | 2026-04-30 |
| `skills/review/references/performance.md` | Reference | `garrytan/gstack` `review/specialists/performance.md` | 2026-04-30 |
| `skills/review/references/data-migration.md` | Reference | `garrytan/gstack` `review/specialists/data-migration.md` | 2026-04-30 |
| `skills/review/references/api-contract.md` | Reference | `garrytan/gstack` `review/specialists/api-contract.md` | 2026-04-30 |
| `skills/review/references/maintainability.md` | Reference | `garrytan/gstack` `review/specialists/maintainability.md` | 2026-04-30 |
| `skills/review/references/red-team.md` | Reference | `garrytan/gstack` `review/specialists/red-team.md` | 2026-04-30 |
| `skills/qa/references/issue-taxonomy.md` | Reference | `garrytan/gstack` `qa/references/issue-taxonomy.md` | 2026-04-30 |
| `skills/qa/references/qa-report-template.md` | Reference | `garrytan/gstack` `qa/templates/qa-report-template.md` | 2026-04-30 |
| `skills/plan-design-review/SKILL.md` | Skill | `garrytan/gstack` `plan-design-review/SKILL.md` | 2026-04-30 |
| `skills/plan-devex-review/SKILL.md` | Skill | `garrytan/gstack` `plan-devex-review/SKILL.md` | 2026-04-30 |
| `skills/plan-devex-review/references/dx-hall-of-fame.md` | Reference | `garrytan/gstack` `plan-devex-review/dx-hall-of-fame.md` | 2026-04-30 |
| `skills/qa-only/SKILL.md` | Skill | `garrytan/gstack` `qa-only/SKILL.md` | 2026-04-30 |
| `skills/setup-deploy/SKILL.md` | Skill | `garrytan/gstack` `setup-deploy/SKILL.md` | 2026-04-30 |
| `skills/canary/SKILL.md` | Skill | `garrytan/gstack` `canary/SKILL.md` | 2026-04-30 |
| `skills/scrape/SKILL.md` | Skill | `garrytan/gstack` `scrape/SKILL.md` | 2026-04-30 |
| `skills/health/SKILL.md` | Skill | `garrytan/gstack` `health/SKILL.md` | 2026-04-30 |
| `skills/benchmark/SKILL.md` | Skill | `garrytan/gstack` `benchmark/SKILL.md` | 2026-04-30 |
| `skills/plan-eng-review/SKILL.md` | Skill | `garrytan/gstack` `plan-eng-review/SKILL.md` | 2026-04-30 |
| `skills/autoplan/SKILL.md` | Skill | `garrytan/gstack` `autoplan/SKILL.md` | 2026-04-30 |
| `skills/cso/references/owasp-top10.md` | Reference | `garrytan/gstack` `cso/SKILL.md` Phase 9 (extracted) | 2026-04-30 |
| `skills/cso/SKILL.md` (Phase 5,11,12) | Enhancement | `garrytan/gstack` `cso/SKILL.md` Phases 5,11,12 | 2026-05-01 |
| `prompts/ship.md` (step numbering, path refs) | Fix | review feedback — pi-native path references | 2026-05-01 |

## 跟进方法

### 1. 拉取上游最新代码

```bash
cd vendor/gstack
git fetch origin main
git checkout main && git pull origin main
```

### 2. 扫描所有已移植文件的变更

```bash
BASE_COMMIT=e8893a1

# ── Skills（19 个）──
for skill in \
  office-hours autoplan \
  plan-ceo-review plan-eng-review plan-design-review plan-devex-review \
  review investigate cso \
  qa qa-only \
  retro document-release land-and-deploy \
  canary scrape health benchmark setup-deploy; do
  echo ""
  echo "══════ $skill ══════"
  changes=$(git log $BASE_COMMIT..HEAD --oneline -- "$skill/SKILL.md" 2>/dev/null)
  if [ -n "$changes" ]; then
    echo "$changes"
    # 自动生成逐文件 diff 摘要
    git diff $BASE_COMMIT..HEAD --stat -- "$skill/SKILL.md" 2>/dev/null
  else
    echo "  (no changes)"
  fi
done

# ── Prompt Template ──
echo ""
echo "══════ ship (prompt template) ══════"
git log $BASE_COMMIT..HEAD --oneline -- "ship/SKILL.md" 2>/dev/null || echo "  (no changes)"

# ── Reference 文件 ──
echo ""
echo "══════ reference files ══════"
for ref in \
  "review/checklist.md" \
  "review/specialists/testing.md" \
  "review/specialists/security.md" \
  "review/specialists/performance.md" \
  "review/specialists/maintainability.md" \
  "review/specialists/api-contract.md" \
  "review/specialists/data-migration.md" \
  "review/specialists/red-team.md" \
  "qa/references/issue-taxonomy.md" \
  "qa/templates/qa-report-template.md" \
  "plan-devex-review/dx-hall-of-fame.md"; do
  changes=$(git log $BASE_COMMIT..HEAD --oneline -- "$ref" 2>/dev/null)
  [ -n "$changes" ] && echo "CHANGED: $ref — $changes"
done

# ── Browse 扩展源码 ──
echo ""
echo "══════ browse extension ══════"
git log $BASE_COMMIT..HEAD --oneline -- "browse/src/" 2>/dev/null || echo "  (no changes)"
```

### 3. 查看具体 diff

```bash
# 查看某个 skill 的完整 diff
git diff $BASE_COMMIT..HEAD -- review/SKILL.md

# 只看新增/修改的章节标题（快速了解结构性变更）
git diff $BASE_COMMIT..HEAD -- review/SKILL.md | grep '^+##'
```

### 4. 逐项评估并应用

对每个有变更的文件：

1. **读 diff**：理解上游改了什么（方法论增强？bug 修复？措辞优化？）
2. **判断适用性**：
   - **方法论变更** → 值得移植到 pi-gstack
   - **gstack 基础设施变更**（preamble/telemetry/hook） → 忽略
   - **模型覆盖层/调谐**（model-overlay/plan-tune） → pi 无对等概念，忽略
3. **应用变更**：手动编辑 pi-gstack 对应文件，保持：
   - pi 原生工具名（`bash/read/edit/write/grep/find`）
   - gstack 兼容的输出路径（`~/.gstack/projects/$SLUG/...`）
   - 剥离 preamble/telemetry/gbrain 等基础设施段
4. **更新本文件**：将 `BASE_COMMIT` 更新为当前 `origin/main` 的 HEAD

### 5. 收尾

```bash
# 更新基准 commit
cd vendor/gstack
NEW_BASE=$(git rev-parse --short HEAD)
cd ../..
sed -i "s/基准 commit: \`.*\`/基准 commit: \`$NEW_BASE\`/" UPSTREAM.md

# 提交
git add UPSTREAM.md <changed-skill-files>
git commit -m "chore: follow upstream gstack to $NEW_BASE"
```

后续跟进后将 `UPSTREAM.md` 中的 commit 更新为新基准。
