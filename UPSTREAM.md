# 上游追踪

记录从 gstack 迁移时的上游 commit，用于后续跟进更新。

上游仓库已作为 submodule 存放在 `vendor/gstack/`。

| pi-gstack 文件 | 上游来源 | 上游 commit | 迁移日期 |
|---------------|---------|------------|---------|
| `prompts/review.md` | `garrytan/gstack` `review/SKILL.md` | `e8893a1` (v1.20.0.0, 2026-04-28) | 2026-04-30 |
| `prompts/cso.md` | `garrytan/gstack` `cso/SKILL.md` | `e8893a1` (v1.20.0.0, 2026-04-28) | 2026-04-30 |
| `prompts/ship.md` | `garrytan/gstack` `ship/SKILL.md` | `e8893a1` (v1.20.0.0, 2026-04-28) | 2026-04-30 |

## 跟进方法

```bash
cd vendor/gstack

# 拉取上游最新
git fetch origin main
git checkout origin/main

# 查看自此 commit 以来的变更
git log e8893a1..HEAD --oneline -- review/SKILL.md

# 查看具体 diff
git diff e8893a1..HEAD -- review/SKILL.md
```

后续跟进后将 `UPSTREAM.md` 中的 commit 更新为新基准。
