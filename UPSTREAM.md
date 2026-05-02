# 上游追踪

记录从 gstack 迁移时的上游 commit，用于后续跟进更新。

上游仓库已作为 submodule 存放在 `vendor/gstack/`。

基准 commit: `b512be7` (v1.25.1.0, 2026-04-30)

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
| 全部 19 个 skill + ship (gbrain 集成) | Enhancement | Brain Context Load（gbrain_search/gbrain_get）。Save Results 由 pi-sediment 自动处理 | 2026-05-02 |

## 跟进方法

**核心原则：不要机械化 diff 对比文件列表。把上游完整 diff 交给 LLM 推理哪些变更对 pi-gstack 有实际价值。**

pi-gstack 不是 gstack 的 1:1 文件副本——它剥离了 preamble/telemetry 等 Claude Code 基础设施，改了工具名（browse_* 替代 $B，gbrain_search/gbrain_get 替代 gbrain CLI），review/ship 等剥离了 Codex/Agent subagent。Save Results 由 pi-sediment 自动处理。所以「文件 A 改了所以文件 A' 也要改」的逻辑不成立。

### 1. 拉取上游

```bash
cd vendor/gstack
git fetch origin main
git checkout main && git pull --ff-only origin main
```

### 2. 获取上游完整 diff

```bash
# 从记录的基准 commit 到当前 HEAD 的完整 diff（不含测试/CI/无关目录）
BASE_COMMIT=<从本文件读>
git diff $BASE_COMMIT..HEAD -- . \
  ':!test/' ':!.github/' ':!.gitlab-ci.yml' ':!CHANGELOG.md' \
  ':!TODOS.md' ':!docs/' ':!bun.lock' ':!package.json' \
  > /tmp/gstack-upstream.diff
wc -l /tmp/gstack-upstream.diff
```

### 3. LLM 分析 diff + 决定应用范围

把 diff 交给 LLM，同时提供以下上下文：

- pi-gstack 的架构概述（READ ME.md 中的「与 gstack 的差异」部分）
- 当前 UPSTREAM.md 中记录的映射关系
- pi 的工具集（bash/read/edit/write/grep/find, browse_* 扩展, gbrain_*）

让 LLM 回答三个问题：

1. **哪些变更是纯基础设施**（gstack 内部路径、遥测、Claude Code 特有机制如 AskUserQuestion/plan-mode/Agent subagent/Codex CLI）→ **跳过**
2. **哪些变更是方法论增强**（工作流步骤改进、检查项增加、判定逻辑增强、STOP gate 强化）→ **评估是否适用于 pi**
3. **方法论变更中，pi-gstack 已有对等模块的，diff 应该如何适配**（替换工具名、剥离基础设施引用、保留核心逻辑）

### 4. 应用变更

根据 LLM 的判断，对 pi-gstack 对应文件做精确编辑：
- 保持 pi 原生工具名
- 保持 gstack 兼容输出路径（`~/.gstack/projects/$SLUG/...`）
- 剥离 preamble/telemetry/gbrain/Codex/Agent 引用
- 如果 pi 没有对应模块（如 Codex adversarial review），方法论有价值的可以新建，否则跳过

### 5. 收尾

**必须更新两个文件：**

1. **UPSTREAM.md**：顶部 `基准 commit` + 底部新增 `跟进记录` 条目
2. **README.md**：顶部 `上游版本` + `最后跟进` 日期

```bash
cd vendor/gstack
NEW_VER=$(cat VERSION)
cd ../..
# 更新 UPSTREAM.md 基准 commit 和跟进记录
# 更新 README.md 上游版本号和日期
```

## 跟进记录

### 2026-05-02: v1.21.1.0 → v1.25.1.0 (b512be7)

**上游变更概览**（4 个版本，99 files，+3626/-237）：
- v1.23.0.0: PR 标题版本前缀
- v1.24.0.0: 跨平台加固（claude-bin.ts、gstack-paths、import.meta.main guard）
- v1.25.0.0: AskUserQuestion/MCP 解析（触及全部 19 个 skill）
- v1.25.1.0: office-hours Phase 4 STOP gate 强化 + adversarial review recommendation 格式

**LLM 分析结论：**
- 跳过：AskUserQuestion/MCP 解析（pi 无此机制）、gstack-paths（pi 无状态目录）、claude-bin.ts（pi browse 扩展架构不同）、security-classifier（pi 不调用 claude CLI）、PR 标题前缀（gstack 特有版本约定）、adversarial review（pi-gstack 已剥离 Codex/Agent subagent）
- 应用：office-hours Phase 4 STOP gate（纯方法论——推荐理由必须映射到创始人目标、Phase 4 后强制等待用户批准才进入 Phase 5）

**pi-gstack 变更：**
- `skills/office-hours/SKILL.md`: RECOMMENDATION 理由要求映射到 founder's stated goal；新增 STOP gate 阻止跳过用户批准直接生成设计文档

### 2026-05-02: gbrain 集成（全部 19 个 skill + ship prompt）

**Brain Context Load（保留）：** 为所有缺失 skill 添加启动前 gbrain 搜索。全部 19 个 skill + ship prompt 均已覆盖。

**Save Results to Brain（删除）：** pi-sediment 自动覆盖此功能——每轮对话后 evaluator 判定价值 → Pensieve + gbrain 双写。手动 `gbrain_put` 指令冗余，已全部移除。
