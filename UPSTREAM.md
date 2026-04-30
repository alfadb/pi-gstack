# 上游追踪

记录从 gstack 迁移时的上游 commit，用于后续跟进更新。

| pi-gstack 文件 | 上游来源 | 上游 commit | 迁移日期 |
|---------------|---------|------------|---------|
| `prompts/review.md` | `garrytan/gstack` `review/SKILL.md` | `e8893a1` (v1.20.0.0, 2026-04-28) | 2026-04-30 |

## 跟进方法

```bash
# 查看自此 commit 以来的变更
git -C ~/.claude/skills/gstack log e8893a1..HEAD --oneline -- review/SKILL.md

# 查看具体 diff
git -C ~/.claude/skills/gstack diff e8893a1..HEAD -- review/SKILL.md
```
