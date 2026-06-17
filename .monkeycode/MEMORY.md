# 用户指令记忆

本文件记录了用户的指令、偏好和教导，用于在未来的交互中提供参考。

## 格式

### 用户指令条目
用户指令条目应遵循以下格式：

[用户指令摘要]
- Date: [YYYY-MM-DD]
- Context: [提及的场景或时间]
- Instructions:
  - [用户教导或指示的内容，逐行描述]

### 项目知识条目
Agent 在任务执行过程中发现的条目应遵循以下格式：

[项目知识摘要]
- Date: [YYYY-MM-DD]
- Context: Agent 在执行 [具体任务描述] 时发现
- Category: [运维部署|构建方法|测试方法|排错调试|工作流协作|环境配置]
- Instructions:
  - [具体的知识点，逐行描述]

## 去重策略
- 添加新条目前，检查是否存在相似或相同的指令
- 若发现重复，跳过新条目或与已有条目合并
- 合并时，更新上下文或日期信息
- 这有助于避免冗余条目，保持记忆文件整洁

## 条目

Kras 项目运行环境与构建约束
- Date: 2026-06-17
- Context: 用户在为 Kras 需求确认起手策略时，指定运行环境用 Docker 处理；项目本身要求 Windows pwsh / SQL Server / ES
- Category: 构建方法 / 环境配置
- Instructions:
  - Kras 运行环境统一用 Docker（SQL Server 2022 + ES 8.x + API + Web），docker-compose 骨架在 infra/docker-compose.yml
  - 项目正式门禁命令：后端 dotnet build Kras.sln、后端测试 dotnet test Kras.Api.Tests、前端 cd kras-web-vue && npm run lint && npm run build，统一脚本 scripts/check-kras-gates.ps1（pwsh）
  - 沙箱为 Linux，但 Kras 项目规则要求 Windows pwsh 命令；Linux 沙箱下需要附加 check-kras-gates.sh 兜底，不替代正式 pwsh 门禁
  - 业务 ID 必须 32 位无连字符（推荐大写），数据库默认 schema dbo、字段名 snake_case

Kras 需求文档体系位置
- Date: 2026-06-17
- Context: Agent 在为 Kras 生成需求/设计/任务拆解时发现
- Category: 工作流协作
- Instructions:
  - Kras 的需求与设计文档放在 .monkeycode/specs/kras/（requirements.md / design.md / tasklist.md）
  - 详细协议文档放在 docs/（applyItem请求动作说明.md / Item对象JSON格式规范.md / kras-web-vue-迁移现状.md）
  - 开发强制规则在 AGENTS.md（包含 22.3 共享独立文件职责清单）

Kras .NET SDK 安装位置
- Date: 2026-06-17
- Context: Agent 在为 Kras 装配 .NET 8 环境时发现，沙箱无 dotnet/docker/pwsh，需要从微软脚本装
- Category: 环境配置 / 构建方法
- Instructions:
  - 沙箱是 Debian 12，无预装 dotnet。.NET SDK 8 安装在 /usr/local/share/dotnet，已 symlink 到 /usr/local/bin/dotnet，PATH 已写入 /etc/profile
  - 必须先装 libicu-dev（否则 dotnet --info 报 ICU missing），安装命令：DEBIAN_FRONTEND=noninteractive apt-get install -y libicu-dev（需先 apt-get update）
  - dotnet 命令在 background_terminal 里执行需先 `export PATH=/usr/local/share/dotnet:$PATH`（因为 background shell 不读 /etc/profile）

Kras 后端工程结构
- Date: 2026-06-17
- Context: Agent 在生成 .NET 后端骨架时发现
- Category: 工作流协作 / 构建方法
- Instructions:
  - Kras 后端位于 backend/ 目录下：Kras.Core/Kras.Service/Kras.Api/Kras.Api.Tests/Kras.DbInit 五个项目
  - 解决方案根 sln：/workspace/Kras.sln（dotnet build Kras.sln 全绿）
  - 测试：dotnet test backend/Kras.Api.Tests/Kras.Api.Tests.csproj，当前 10 个测试全过
  - 后端启动命令：cd backend/Kras.Api && dotnet run --urls http://0.0.0.0:8080 --no-launch-profile
  - 关键约束：JSON 序列化使用 SnakeCaseNamingPolicy（Kras.Service/Protocol/SnakeCaseNamingPolicy.cs），错误 envelope 的 @type/@is_error 必须保留 @ 前缀（用 Dictionary 而非匿名对象实现）

Kras 前后端联调模式切换
- Date: 2026-06-17
- Context: Agent 在配置前端可切换 MSW / 真实后端时发现
- Category: 工作流协作 / 排错调试
- Instructions:
  - 前端默认走 MSW Mock（main.ts 检测 VITE_USE_MOCK，默认 true）
  - 切换到真实后端：npm run dev -- --mode real-backend，会加载 .env.real-backend（VITE_USE_MOCK=false）
  - Vite dev 反代 /api → http://localhost:8080（vite.config.ts），因此前后端单 5173 端口对外
  - 演示账号（前后端通用）：admin/admin、pmlin/pmlin、engineer/engineer、viewer/viewer
