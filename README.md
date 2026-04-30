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
| `/skill:review` | Staff Engineer | 分支 diff 审查：SQL 安全、竞态条件、shell 注入、范围漂移、完成度审计 |
| `/skill:cso` | Chief Security Officer | 安全审计：OWASP Top 10、STRIDE 威胁模型、密钥扫描、供应链风险、CI/CD 安全、LLM 攻击面 |
| `/skill:qa` | QA Lead | 浏览器测试：页面导航、交互测试、bug 修复、回归测试生成。需 Chrome + browser-tools |

## Prompt Templates（用户显式调用）

| 命令 | 角色 | 说明 |
|------|------|------|
| `/ship` | Release Engineer | 发布工作流：merge base → 测试 → review → 版本号 → CHANGELOG → commit → push → PR |

## 使用

```bash
pi                       # 启动 pi
/ship                    # 发布当前分支
/skill:review            # 审查 diff（模型也会主动建议）
/skill:cso               # 安全审计
/skill:qa https://...    # 浏览器 QA 测试
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
