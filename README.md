# pi-gstack

gstack 方法论移植到 [pi-coding-agent](https://github.com/badlogic/pi-mono) 的 pi 原生包，混用 Skills 和 Prompt Templates。

灵感来自 [garrytan/gstack](https://github.com/garrytan/gstack) — Garry Tan 的 Claude Code 工作流。

**上游版本:** v1.26.0.0 · **最后跟进:** 2026-05-03 · **跟进记录:** [UPSTREAM.md](UPSTREAM.md)

## 安装

```bash
pi install git:github.com/alfadb/pi-gstack
# 或作为 submodule
git submodule add https://github.com/alfadb/pi-gstack agent/skills/pi-gstack
```

配置 `settings.json`（submodule 方式需手动声明路径）：

```json
{
  "prompts": ["~/.pi/agent/skills/pi-gstack/prompts"],
  "skills": ["~/.pi/agent/skills/pi-gstack/skills"],
  "extensions": ["~/.pi/agent/skills/pi-gstack/extensions/browse"]
}
```

安装 browse 扩展依赖（需要 Node.js 和 Playwright）：

```bash
cd agent/skills/pi-gstack/extensions/browse
npm install
npx playwright install chromium
```

### 推荐：安装 pi-sediment（自动沉淀引擎）

[pi-sediment](https://github.com/alfadb/pi-sediment) 在每轮对话后自动评估价值，将项目级洞察写入 Pensieve、通用工程原则写入 gbrain。pi-gstack 的 Save Results 完全由它接管，无需手动 `gbrain_put`。

```bash
pi install git:github.com/alfadb/pi-sediment
```

配置 `settings.json`：

```json
{
  "extensions": [
    "~/.pi/agent/skills/pi-sediment/extensions/pi-sediment"
  ]
}
```

## Skills（模型可主动加载）

| 命令 | 角色 | 说明 |
|------|------|------|
| `/skill:office-hours` | YC Office Hours | 产品讨论：6 个强制问题诊断需求、Builder 模式生成方案、产出设计文档 |
| `/skill:autoplan` | Pipeline Orchestrator | 完整审查流水线：串联 office-hours→ceo-review→eng-review→design-review→devex-review，自动决策 |
| `/skill:plan-ceo-review` | CEO/Founder | 策略审查：4 种范围模式、架构/安全/部署 11 章节、产出实施计划 |
| `/skill:plan-eng-review` | Engineering Manager | 工程审查：架构锁定、数据流、边缘情况、测试覆盖。在实施前锁定方案 |
| `/skill:plan-design-review` | Designer | 设计审查：0-10 分制评估 10 个设计维度，识别改进点，修正方案 |
| `/skill:plan-devex-review` | DX Lead | 开发者体验审查：开发者画像、竞品对标、魔法时刻设计、8 个 DX 维度评分 |
| `/skill:review` | Staff Engineer | 代码审查：SQL 安全、竞态条件、shell 注入、范围漂移、完成度审计、12 阶段 11 类问题 |
| `/skill:investigate` | Debugger | 根因定位：Iron Law、假设验证、3-strike 规则、最小修复 + 回归测试 |
| `/skill:cso` | Chief Security Officer | 安全审计：12 阶段全面扫描（密钥/供应链/CI/CD/基础设施/OWASP/STRIDE/数据分类），支持 daily/comprehensive/diff/scope 四种模式 |
| `/skill:qa` | QA Lead | 浏览器测试：页面导航、交互验证、bug 修复、回归测试。需 pi-browse 扩展 |
| `/skill:qa-only` | QA Tester | 只报告不修复：查找 bug、截图记录、生成报告。不修改源码 |
| `/skill:retro` | Engineering Lead | 工程回顾：commit 分析、文件热点、质量信号、工作模式、TODOS 健康度 |
| `/skill:document-release` | Doc Engineer | 文档审计：diff 交叉对比、自动修复路径/版本号等事实性更新 |
| `/skill:land-and-deploy` | Release Engineer | 合并部署：merge PR → 等 CI → 验证部署 → 生产烟雾测试 |
| `/skill:canary` | Production Monitor | 部署后监控：页面加载、控制台错误、基线对比、健康评分。部署后第一个 10 分钟 |
| `/skill:scrape` | Data Extractor | 页面数据提取：browse_js DOM 提取 JSON，只读契约，不允许写操作 |
| `/skill:health` | Code Quality | 代码质量仪表盘：类型检查/lint/测试/死代码/shell 5 类评分+趋势 |
| `/skill:benchmark` | Performance | 性能回归检测：Core Web Vitals、资源大小、基线对比、性能预算 |
| `/skill:setup-deploy` | DevOps | 部署配置：自动检测 7 种平台（Fly.io/Render/Vercel/Netlify/Heroku/Railway/GitHub Actions），写入 AGENTS.md |

## Prompt Templates（用户显式调用）

| 命令 | 角色 | 说明 |
|------|------|------|
| `/ship` | Release Engineer | 发布工作流：merge base → 测试 → review → 版本号 → CHANGELOG → commit → push → PR |

## 完整 Pipeline

```
/skill:office-hours        ─→  设计文档
        ↓
/skill:autoplan           ─→  完整流水线（串联以下 4 个审查）
/skill:plan-ceo-review     ─→  策略审查 + 范围锁定
/skill:plan-eng-review     ─→  工程审查（架构、数据流、测试）
/skill:plan-design-review  ─→  设计审查（UX、交互、视觉）
/skill:plan-devex-review   ─→  DX 审查（API、CLI、SDK）
        ↓
    [实现代码]
        ↓
/skill:health              ─→  代码质量仪表盘
/skill:review              ─→  代码审查（12 阶段 11 类问题）
/skill:investigate         ─→  根因定位（Iron Law）
/skill:cso                 ─→  安全审计（12 阶段）
/skill:qa / :qa-only       ─→  浏览器测试 / 只报告
/skill:benchmark           ─→  性能回归检测
        ↓
/ship                      ─→  发布 PR（11 步自动化）
        ↓
/skill:document-release    ─→  文档更新
        ↓
/skill:land-and-deploy     ─→  合并 + 部署验证
/skill:canary              ─→  生产监控（10 分钟）
/skill:setup-deploy        ─→  部署配置（首次）
        ↓
/skill:retro               ─→  每周回顾
/skill:scrape              ─→  页面数据提取（横向）
```

## 选择逻辑

- **Skill**：有外部依赖、体积大需延迟加载、模型应主动建议时用
- **Template**：紧凑纯方法论、始终用户显式触发

## Extensions（pi 原生扩展）

| 扩展 | 说明 |
|------|------|
| `pi-browse` | 无头浏览器测试：基于 Playwright 的持久化 Chromium，提供 snapshot + @ref 元素选择、diff 快照、标注截图、is-checks 断言。LLM 直接调用 browse_* 工具，无需 bash 中转。 |

### pi-browse 工具清单

**导航：** `browse_goto`, `browse_back`, `browse_reload`, `browse_url`
**核心：** `browse_snapshot` — 可访问树 + @ref 标注，支持 interactive/diff/annotate 模式
**交互：** `browse_click`, `browse_fill`, `browse_select`, `browse_hover`, `browse_type`, `browse_press`, `browse_scroll`, `browse_wait`, `browse_viewport`
**读取：** `browse_text`, `browse_html`, `browse_links`, `browse_console`, `browse_js`, `browse_title`
**断言：** `browse_is` — visible/hidden/enabled/disabled/checked/editable/focused
**截图：** `browse_screenshot`, `browse_responsive` — mobile/tablet/desktop 自适应截图
**对话框：** `browse_dialog_accept`, `browse_dialog_dismiss`

## 与 gstack 的差异

- pi 原生：无 preamble / 遥测 / 守护进程 / gstack 特定路径
- 用 pi 内建工具（read/bash/edit/write/grep/find）和 pi 生态（extensions + browser-tools）
- 方法论核心保留，基础设施用 pi extension 重写
- browse 扩展从 gstack browse daemon 移植，适配为 pi registerTool 工具
- gbrain 集成：全部 19 个 skill 内置 Brain Context Load（启动前 `gbrain_search`/`gbrain_get`），使用 pi 原生 gbrain 工具。持久化由 [pi-sediment](https://github.com/alfadb/pi-sediment) 自动处理（每轮对话后 evaluator 判定 → Pensieve + gbrain 双写），无需手动 `gbrain_put`。
- gstack v1.26 memory ingest / retrieval helper 属于 gstack CLI 基础设施，pi-gstack 不直接移植；对应方法论价值已通过 pi-sediment + per-skill Brain Context Load（含 gstack 兼容本地 artifact 读取提示）吸收。
- 上游追踪见 `UPSTREAM.md`，原始参考 `vendor/gstack/`

## 许可

MIT。包含 gstack 原始版权声明（见 LICENSE）。
