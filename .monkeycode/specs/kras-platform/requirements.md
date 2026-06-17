# Kras 平台需求摘要

> 来源：`Kras 原始需求文档`（整理日期 2026-06-17）
> 本文档为需求摘要，完整需求见原始文档。技术设计见 `design.md`。

## 1. 定位

Kras 是一个**元数据驱动 + Item 协议驱动**的企业级低代码 / PLM 平台，支撑物料、文档、BOM、变更、流程审批等业务对象全生命周期管理。

## 2. 核心目标（EARS 风格）

1. **元数据驱动建模**：系统 SHALL 通过 ItemType / Property / RelationshipType / List / View / Form 元数据定义业务对象，运行时统一渲染，业务对象零代码上线。
2. **统一协议交互**：系统 SHALL 通过 `applyItem` / `applyAml` 统一所有数据交互，禁止业务层零散 RESTful 接口。
3. **统一缓存与入口**：前端 SHALL 通过全局 `kras` 对象完成数据读取、缓存、协议操作，禁止自建平行缓存或绕过协议拼装请求。
4. **企业级治理**：系统 SHALL 内置版本管理、生命周期、工作流、权限矩阵、审计日志。
5. **可扩展方法体系**：系统 SHALL 支持服务端 C# Method 与前端 JS Method 双轨扩展，并支持 BuiltInAction。

## 3. 设计原则（优先级递减）

1. 遵守现有协议与文档约定
2. 复用 `kras` 统一入口与缓存
3. 保持元数据驱动
4. 保持与现有页面交互一致
5. 最后才考虑额外封装或新抽象

## 4. 技术约束

- 命令环境：`pwsh`（禁用 `powershell`）。
- 前端：Vue 3 + Ant Design v6，禁止无理由重写已有能力组件。
- 后端：.NET，分层 `Kras.Core` / `Kras.Service` / `Kras.Api` / `Kras.DbInit`。
- ID：32 位无连字符（推荐大写），禁用带连字符 UUID。
- 数据库：关系型，默认 schema `dbo`，字段名 `snake_case`。

## 5. 角色与场景

系统管理员、业务建模人员、流程设计人员、业务用户、二次开发人员。
典型 PLM 场景：Part 管理、Part BOM、Document 管理、ECO 变更、工程变更审批。

## 6. 元数据强约束（关键）

- `data_type=list` → `data_source = List.id`
- `data_type=item` → `data_source = ItemType.id`
- `data_type=foreign` → `data_source = Property.id`（目标 Property `data_type=item` 且 `source_id` 一致），`foreign_property` 指向目标 ItemType 下某 Property.id
- RelationshipType 三元关系（source/related/relationship），`relationship_id` 缺失必须报错
- `fn_CheckEntityAccess` 以 SQL 文件为唯一准则；`team_id` 独立分支，owner 分支仅基于 `owned_by_id`

## 7. 主要能力域

| 域 | 关键能力 |
| --- | --- |
| 元数据 | ItemType / Property / RelationshipType / List / View / Form |
| 协议 | applyItem / applyAml / 统一 envelope / 事务规则 |
| 版本 | major_rev / minor_rev / generation / 换版规则 |
| 生命周期 | 多映射解析 / promote / 转换方法 |
| 工作流 | 启动绑定 / 流转审批 / 加减签 / 联动 / 审计 |
| 方法 | C# Method / JS Method / BuiltInAction |
| 权限 | Permission / Access / 字段级权限 / 限流 |
| 文件 | File / Image / 分片上传 / Vault |
| AI | Scenario / Prompt / Skill / Tool / MCP / Provider |
| 审计 | AuditLog + 后台 worker |
| DbInit | 建库 / 系统属性种子 / fn_CheckEntityAccess |

## 8. 验收标准（功能性，节选）

1. 新建 ItemType + Property，前端无需代码即可出现列表/详情/表单/关系/菜单。
2. 所有数据交互通过 applyItem/applyAml，批量单事务。
3. 无查看权字段在列表/详情/元数据/缓存均不暴露。
4. promote 在 state 缺失/脏值时报错；require_workflow_context 时非工作流入口不可推动。
5. 审批→流转→自动节点→路径方法→生命周期联动全链路可追溯。
6. 换版后版本号/generation/is_released/release_date/起始态均符合规则。
7. Tab 状态保留；关系 Tab 按需加载。
8. 门禁：`dotnet build Kras.sln` + 前端 `lint` + `build` 通过。
9. E2E 每步有截图、Console 无 error、Network 无失败请求。
