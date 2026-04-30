# pi-gstack

gstack 方法论移植到 [pi-coding-agent](https://github.com/badlogic/pi-mono) 的 prompt template 集合。

灵感来自 [garrytan/gstack](https://github.com/garrytan/gstack) — Garry Tan 的 Claude Code 工作流。本包将其核心方法论重写为 pi 原生格式。

## 安装

```bash
pi install git:github.com/alfadb/pi-gstack
```

## 已包含的 Prompt Templates

| 命令 | 角色 | 说明 |
|------|------|------|
| `/review` | Staff Engineer | 分支 diff 审查：SQL 安全、竞态条件、shell 注入、范围漂移、完成度审计 |

计划移植：`/cso`（安全审计）、`/ship`（发布检查）、`/qa`（质量测试）

## 使用

```bash
pi                    # 启动 pi
/review               # 审查当前分支的 diff
```

## 与 gstack 的差异

- 纯 prompt template，无 preamble / 遥测 / 守护进程
- 用 pi 内建工具（read/bash/edit/write/grep/find）替代 Claude Code 专属工具
- 方法论核心保留，基础设施重写

## 许可

MIT。包含 gstack 原始版权声明（见 LICENSE）。
