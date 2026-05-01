# 上游追踪

记录从 gstack 迁移时的上游 commit，用于后续跟进更新。

上游仓库已作为 submodule 存放在 `vendor/gstack/`。

基准 commit: `e8893a1` (v1.20.0.0, 2026-04-28)

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

```bash
cd vendor/gstack
git fetch origin main && git checkout origin/main

# 查看自此 commit 以来所有已迁移 skill 的变更
for skill in office-hours plan-ceo-review review investigate cso qa retro document-release land-and-deploy ship; do
  echo "=== $skill ==="
  git log e8893a1..HEAD --oneline -- "$skill/SKILL.md" 2>/dev/null || echo "  (no changes)"
done

# 查看具体 diff
git diff e8893a1..HEAD -- review/SKILL.md
```

后续跟进后将 `UPSTREAM.md` 中的 commit 更新为新基准。
