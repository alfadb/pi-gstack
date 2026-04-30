# pi-gstack

gstack 方法论移植到 [pi-coding-agent](https://github.com/badlogic/pi-mono) 的 pi 原生包，混用 Skills 和 Prompt Templates。

灵感来自 [garrytan/gstack](https://github.com/garrytan/gstack) — Garry Tan 的 Claude Code 工作流。

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
  "skills": ["~/.pi/agent/skills/pi-gstack/skills"]
}
```

## Skills（模型可主动加载）

| 命令 | 角色 | 说明 |
|------|------|------|
| `/skill:office-hours` | YC Office Hours | 产品讨论：6 个强制问题诊断需求、Builder 模式生成方案、产出设计文档 |
| `/skill:plan-ceo-review` | CEO/Founder | 策略审查：4 种范围模式、架构/安全/部署 11 章节、产出实施计划 |
| `/skill:review` | Staff Engineer | 代码审查：SQL 安全、竞态条件、shell 注入、范围漂移、完成度审计 |
| `/skill:investigate` | Debugger | 根因定位：假设验证、3-strike 规则、最小修复 + 回归测试 |
| `/skill:cso` | Chief Security Officer | 安全审计：OWASP Top 10、STRIDE 威胁模型、密钥扫描、供应链、CI/CD、LLM 攻击面 |
| `/skill:qa` | QA Lead | 浏览器测试：页面导航、交互验证、bug 修复、回归测试。需 Chrome + browser-tools |
| `/skill:retro` | Engineering Lead | 工程回顾：commit 分析、文件热点、质量信号、工作模式、TODOS 健康度 |
| `/skill:document-release` | Doc Engineer | 文档审计：diff 交叉对比、自动修复路径/版本号等事实性更新 |
| `/skill:land-and-deploy` | Release Engineer | 合并部署：merge PR → 等 CI → 验证部署 → 生产烟雾测试 |

## Prompt Templates（用户显式调用）

| 命令 | 角色 | 说明 |
|------|------|------|
| `/ship` | Release Engineer | 发布工作流：merge base → 测试 → review → 版本号 → CHANGELOG → commit → push → PR |

## 完整 Pipeline

```
/skill:office-hours     ─→  设计文档
        ↓
/skill:plan-ceo-review  ─→  策略审查 + 范围锁定
        ↓
    [实现代码]
        ↓
/skill:review           ─→  代码质量审查
/skill:investigate      ─→  根因定位
/skill:cso              ─→  安全审计
/skill:qa               ─→  浏览器测试
        ↓
/ship                   ─→  发布 PR
        ↓
/skill:document-release ─→  文档更新
        ↓
/skill:land-and-deploy  ─→  合并 + 部署验证
        ↓
/skill:retro            ─→  每周回顾
```

## 选择逻辑

- **Skill**：有外部依赖、体积大需延迟加载、模型应主动建议时用
- **Template**：紧凑纯方法论、始终用户显式触发

## 与 gstack 的差异

- pi 原生：无 preamble / 遥测 / 守护进程 / gstack 特定路径
- 用 pi 内建工具（read/bash/edit/write/grep/find）和 pi 生态（browser-tools）
- 方法论核心保留，基础设施重写
- 上游追踪见 `UPSTREAM.md`，原始参考 `vendor/gstack/`

## 许可

MIT。包含 gstack 原始版权声明（见 LICENSE）。
