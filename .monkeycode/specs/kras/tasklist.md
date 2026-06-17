# Kras 实现任务清单（Tasklist）

> 文档版本：v1.0
> 整理日期：2026-06-17
> 输入：`requirements.md` v1.0、`design.md` v1.0
> 工作量级：超大（企业级 PLM 平台）。任务按里程碑 M0 → M7 排列，每个里程碑结束都应能通过对应的门禁。

---

## 里程碑总览

| 里程碑 | 主题 | 出口标准 |
| --- | --- | --- |
| M0 | 工程骨架与基础设施 | `dotnet build`、`npm run lint && build` 全绿；`docker compose up` 起得来；`/health` 200 |
| M1 | 协议层与元数据建表 | `applyItem(get/new/add/edit/update/delete)` 单事务通过；DbInit 能建库 + 种子 + fn_CheckEntityAccess |
| M2 | 权限与身份 | 登录可用；字段级权限双校验；列表/详情按权限裁剪 |
| M3 | 前端运行时 + 列表/详情 | kras 运行时；ItemTypeTable；ItemDetailPage；多 Tab；E2E 跑通基础路径 |
| M4 | 版本与生命周期 | version action；promote；多映射解析；转换方法 |
| M5 | 工作流引擎 | start/advance/submit/approve/reject；加减签/委托/转办/接管；自动节点；与生命周期联动 |
| M6 | 扩展能力（方法 / 文件 / 菜单 / 搜索 / AI / 审计） | BuiltIn、JS Method、文件分片、菜单、ES、AI 端点、审计后台 |
| M7 | 收尾与门禁 | check-kras-gates.ps1 全绿；Playwright E2E 全覆盖；文档同步 |

---

## M0 工程骨架与基础设施

### M0.1 后端解决方案骨架 `[P0]`
- [ ] 创建 `Kras.sln` 与 5 个项目（Kras.Core / Kras.Service / Kras.Api / Kras.Api.Tests / Kras.DbInit），目标框架 `net8.0`
- [ ] 配置 `Directory.Build.props`（统一 LangVersion、Nullable、TreatWarningsAsErrors）
- [ ] Kras.Core 不依赖任何外部包；Kras.Service 仅依赖 Kras.Core 与必要基础库；Kras.Api 引入 ASP.NET Core
- [ ] 验收：`dotnet build Kras.sln` 退出码 0
- Source: REQ-003, design §2.1

### M0.2 前端骨架 `[P0]`
- [ ] 用 Vite + Vue 3 + TypeScript 初始化 `kras-web-vue`
- [ ] 接入 Ant Design v6、Vue Router、Pinia
- [ ] 配置 `vite.config.ts`：`server.allowedHosts = ['.monkeycode-ai.online']`，反向代理 `/api` 到后端
- [ ] 接入 ESLint + Prettier；`npm run lint`、`npm run build` 全绿
- Source: REQ-003, REQ-070；vite-allowedhosts-config 规则；frontend-reverse-proxy 规则

### M0.3 Docker 基础设施 `[P0]`
- [ ] `infra/docker-compose.yml`：sqlserver (2022-latest)、elasticsearch (8.x)、kras-dbinit、kras-api、kras-web
- [ ] 为 kras-api（基于 `mcr.microsoft.com/dotnet/aspnet:8.0`）和 kras-web（nginx）编写 Dockerfile
- [ ] 健康检查：`/health` 返回 200，探活 DB / ES
- [ ] 验收：`docker compose up` 起得来，`curl http://localhost/health` 返回 200
- Source: REQ-024, REQ-130, design §15

### M0.4 仓库根资产 `[P0]`
- [ ] `AGENTS.md`（开发强制规则，覆盖命名、协议、ID、schema、命令约束）
- [ ] `docs/applyItem请求动作说明.md`、`docs/Item对象JSON格式规范.md` 占位骨架
- [ ] `scripts/check-kras-gates.ps1`（pwsh 门禁脚本）
- [ ] `.gitignore`（dotnet + node + IDE）
- Source: REQ-141, REQ-160, REQ-162

### M0.5 CI 占位 `[P1]`
- [ ] GitHub Actions / GitLab CI 占位，调用 `scripts/check-kras-gates.ps1`
- Source: REQ-162

---

## M1 协议层与元数据建表

### M1.1 ID 与基础模型 `[P0]`
- [ ] `Kras.Core/Items/KrasId.cs`：`NewId()` 返回 32 位无连字符大写
- [ ] `Kras.Core/Items/Item.cs` + `ItemBase`：系统属性访问器（id、keyed_name、created_on、owned_by_id 等）
- [ ] `Kras.Core/Attributes.cs`：PropertyAttribute
- [ ] 单元测试：ID 唯一性 / 格式校验
- Source: REQ-003, REQ-141, design §3.3

### M1.2 元数据模型 `[P0]`
- [ ] `Kras.Core/Metadata/`：ItemType、Property、RelationshipType、List、ListValue、View、Form
- [ ] `ConstItemTypeId`：内置 ItemType 常量
- [ ] Property.data_source / foreign_property 类型与校验 API（运行时校验在 M1.6）
- Source: REQ-010, REQ-011, REQ-012, design §3.1

### M1.3 数据库访问层 `[P0]`
- [ ] `Kras.Service/Db/SqlQueryExecutor.cs`：参数化执行，禁止 `select *`
- [ ] `Kras.Service/Db/DbTransactionScope.cs`：基于 `TransactionScope` / `DbTransaction` 的统一 scope
- [ ] `Kras.Service/Db/DbService.*.cs` partial：Infrastructure、SchemaSync
- [ ] 单元测试：CRUD 通过 SqlQueryExecutor
- Source: REQ-026, REQ-151, design §4.5

### M1.4 DbInit 建库与种子 `[P0]`
- [ ] `Kras.DbInit/Program.cs`：建库、建表
- [ ] `BuildSystemProperties`、`DefaultSystemColumns`、`DefaultSystemPropertyItems`：种子系统属性 / 系统列 / 系统属性 Item
- [ ] `fn_CheckEntityAccess`：按 `sqls/fn_CheckEntityAccess.sql` 内容生成（单一来源）
- [ ] schema 默认 `dbo`，安全标识符处理
- [ ] 验收：DbInit 跑通后，ItemType/Property/RelationshipType/User/Permission 等系统表有种子数据
- Source: REQ-013, REQ-140, REQ-142, REQ-143, design §3.4

### M1.5 ItemRequestParser / AmlRequestParser / ApiResponseFactory `[P0]`
- [ ] `Kras.Api/Protocol/Item/ItemRequestParser.cs`
- [ ] `Kras.Api/Protocol/Aml/AmlRequestParser.cs`（严格 `{"AML":[...]}`）
- [ ] `Kras.Api/Protocol/Response/ApiResponseFactory.cs`：成功 / 错误 envelope；错误码封闭集合
- [ ] 单元测试：合法 / 非法 AML 解析、错误码映射
- Source: REQ-020, REQ-021, REQ-022, REQ-025, REQ-027, design §4

### M1.6 ItemActionHandler 与标准 DB action `[P0]`
- [ ] `Kras.Service/Item/ItemActionHandler.cs`：按优先级解析 @action
- [ ] `Kras.Service/Item/ItemQueryService.cs`：get
- [ ] `Kras.Service/Item/ItemCommandService.cs`：new/add/edit/update/copy/delete
- [ ] Property.data_source / foreign_property 校验在 add/update 路径生效（REQ-011 / REQ-012）
- [ ] RelationshipType 解析：`relationship_id` 缺失/无效 → 报错（REQ-012）
- [ ] applyItem 单事务：onBefore* / 主 action / onAfter* 同事务，任一失败回滚（REQ-026）
- [ ] 验收：单 Item CRUD 通过；事件方法在同事务内进一步修改数据可用
- Source: REQ-011, REQ-012, REQ-020 ~ REQ-026, design §4.5

### M1.7 applyAml 批量 `[P0]`
- [ ] `POST /api/applyAml`，单事务批量；任一失败整批回滚；返回体反映整批回滚
- [ ] 单元测试：部分失败用例
- Source: REQ-027, design §4.5

### M1.8 whereUsed `[P1]`
- [ ] `POST /api/whereUsed`：反向引用查询（基于 RelationshipType 元数据扫描）
- Source: REQ-024

### M1.9 RequestMetadataCache `[P0]`
- [ ] `Kras.Api/Infrastructure/Cache/RequestMetadataCache.cs`：请求级 metadata 缓存
- [ ] `MetadataCacheInvalidationService`：类型级修改时主动失效
- Source: REQ-014, REQ-018, REQ-077, design §5.3

---

## M2 权限与身份

### M2.1 User / Identity / Alias / Team 模型 `[P0]`
- [ ] `Kras.Core/Governance/`：User、Identity、Alias、Team、TeamIdentity
- [ ] DbInit 种子默认 admin 用户
- Source: REQ-090, design §3.1

### M2.2 PasswordHasher `[P0]`
- [ ] `Kras.Service/Auth/PasswordHasher.cs`：统一密码哈希（PBKDF2 / BCrypt），含 legacy 明文升级判定
- [ ] 单元测试：哈希 / 校验 / legacy 升级
- Source: design §2.1 (Auth)

### M2.3 TokenService 与鉴权中间件 `[P0]`
- [ ] JWT 签发 / 校验
- [ ] `AccessContextMiddleware`：从 Bearer token 解析 identityIds
- [ ] `AccessContext` 注入到请求管线
- Source: REQ-092, design §9.1

### M2.4 /api/login（敏感限流） `[P0]`
- [ ] `LoginController` + `SensitiveRateLimiter`
- [ ] 登录成功后返回 token + 触发前端 `kras.getMetadata()` 的最小元数据
- Source: REQ-024, REQ-092

### M2.5 实体权限（AccessService） `[P0]`
- [ ] `Kras.Service/Access/AccessService.cs`：调用 `fn_CheckEntityAccess` TVP
- [ ] ItemQueryService / ItemCommandService 在构造 SQL 前 check
- [ ] 列表查询 join `fn_CheckEntityAccess`
- [ ] 单元测试：owner / team / 显式 Access 三个分支独立判定，team 不合并进 owner
- Source: REQ-013, REQ-090, REQ-091, design §3.4, §9.3

### M2.6 字段级权限 `[P0]`
- [ ] Property.field_permission_id 落地
- [ ] 元数据返回按 `can_view` 过滤
- [ ] SQL 投影按可见字段裁剪
- [ ] get/quickSearch/update/add/version/applyAml 路径最终校验
- [ ] 单元测试：无权字段不返回、不写入
- Source: REQ-017, REQ-018, REQ-091, design §5.4

### M2.7 限流策略 `[P0]`
- [ ] `SensitiveRateLimiter`：login、AI、compile-check
- [ ] `UploadRateLimiter`：file/upload
- [ ] 单元测试：超限返回 429
- Source: REQ-092

---

## M3 前端运行时 + 列表/详情

### M3.1 kras 运行时核心 `[P0]`
- [ ] `src/data/kras.item.ts`：applyItem / applyAml（带 Bearer token、envelope 兼容）
- [ ] `src/data/kras.metadata.ts`：getMetadata、getItemTypeMetadata/Properties/RelationshipTypes
- [ ] `src/data/kras.cache.ts`：只读缓存（内存 + localStorage），命中失败返回空
- [ ] `src/data/kras.objects.ts`：markDirty
- [ ] `src/data/kras.governance.ts`、`kras.ui-bridge.ts`
- [ ] 验收：登录后 `await kras.getMetadata()` 写入 localStorage，刷新后缓存命中
- Source: REQ-014, REQ-015, REQ-016, REQ-075, design §5

### M3.2 路由与布局 `[P0]`
- [ ] 路由表（REQ-071 全部条目）
- [ ] `MainLayout.vue`：左菜单（来自 /api/menus）+ 顶部操作区 + 多 Tab 内容区
- [ ] Tab 切换保状态、关闭互不影响、内容直接渲染在 `ant-tabs-content-holder`、不包 Card
- Source: REQ-070, REQ-071, design §6

### M3.3 ItemTypeTable（列表页） `[P0]`
- [ ] `components/metadata-table/useMetadataGridColumns.ts` / `useMetadataGridRows.ts`
- [ ] `utils/metadataTable.ts`：列顺序、列宽、筛选归一化、行 key、虚拟列窗口、列表值映射、引用预处理、分页参数
- [ ] `utils/fieldValue.ts`：字段值格式化 / 引用字段解析（与表单组件共用）
- [ ] 第一行筛选行；过滤/搜索/范围下推后端
- [ ] 列定义不依赖行数据；空数据保留结构；双击行打开详情 Tab
- [ ] 分页 + 虚拟滚动 + 列窗口
- [ ] key 稳定（业务 id）
- Source: REQ-072, REQ-150, design §6.1, §14.1

### M3.4 ItemDetailPage（详情页） `[P0]`
- [ ] 统一结构：keyed_name + 操作按钮 + 表单 + Relationship Tabs
- [ ] 首屏最小阻塞集：主对象 + ItemTypeMetadata + Properties
- [ ] 缺省 form scheme 时按 Properties fallback
- [ ] RelationshipTypes / Relationship View / 关系行非阻塞
- [ ] 关系 Tab 首次激活才加载，已加载保状态
- [ ] 编辑：draft + markDirty，编辑不触发远程重读
- [ ] 保存：以服务端结果为准，强制刷新主对象 + 定向刷新脏关系；新 id 先切路径再刷新
- [ ] 锁定/解锁仅刷新主对象
- [ ] 类型级修改才清元数据缓存
- Source: REQ-073, REQ-074, REQ-075, REQ-076, REQ-077, design §6.2~§6.4

### M3.5 表单字段组件 `[P0]`
- [ ] `components/form-components/helpers.ts`
- [ ] 基础组件：text / textarea / number / date / switch / select
- [ ] 扩展组件：file / image / button
- [ ] 布局组件：layout / group / divider / title（容器支持嵌套拖拽）
- [ ] 文件/图片字段统一值协议（@type/@id/name/bytes，multiple 数组、单文件单对象、null）
- [ ] config：`formFieldMapping.ts` / `metadataTableReadonlyMapping.ts` / `metadataTableFilterMapping.ts`
- Source: REQ-079, design §6.2

### M3.6 引用字段 / ItemSearch `[P0]`
- [ ] 下拉打开立即加载首批
- [ ] 默认 `keyed_name: *keyword*`，不用 quickSearch 替代
- [ ] 文案优先级 @keyed_name → label → name → id
- [ ] 弹层走组件生命周期，onOpenChange 感知
- [ ] 动态查询：schema.query + JS Method 运行时条件
- [ ] `kras.searchItems.getController(fieldName)`
- Source: REQ-080, design §6.2

### M3.7 RelationshipTable `[P0]`
- [ ] 复用 metadataTable 工具
- [ ] 关系行按场景参数加载（首屏不拉全部）
- [ ] 行 key 用关系 id
- Source: REQ-076, REQ-150, design §6.2

### M3.8 Playwright E2E 基础 `[P0]`
- [ ] homepage → menu → button → search → login → page links → forward/back/refresh
- [ ] 禁止：手改 URL、深链直访、绕过页面调接口、改 storage
- [ ] 每步：截图 + Console 无 error + Network 无失败
- Source: REQ-163, REQ-178

---

## M4 版本与生命周期

### M4.1 版本字段与 VersionService `[P0]`
- [ ] VersionService：实现 REQ-031 全部规则
- [ ] 非 versionable 跳过 + version_skipped 返回（REQ-033）
- [ ] manual_versioning 处理（REQ-032）
- [ ] 单元测试：A.1→A.2、A.x(released)→B.1、generation 递增、is_released/release_date 计算
- Source: REQ-030, REQ-031, REQ-032, REQ-033, design §7.1

### M4.2 生命周期元数据 `[P0]`
- [ ] `Kras.Core/Lifecycle/`：Definition、Version、State、Transition、BendPoint、State/Transition/Version Method、Event Log、ItemTypeLifeCycleDefinition
- Source: REQ-010, design §3.1

### M4.3 LifeCycleService 多映射解析 `[P0]`
- [ ] ItemTypeLifeCycleDefinition 启用映射解析
- [ ] class_path 最长前缀匹配；同优先级多命中报错
- [ ] 单元测试：多映射场景
- Source: REQ-040, design §7.2

### M4.4 PromoteService `[P0]`
- [ ] promote(item, transition_id, [workflow_context])
- [ ] state 缺失/空/不匹配 → 报错，不静默回退
- [ ] require_workflow_context 强制校验
- [ ] 转换方法执行顺序（global onBeforePromote → transition onBeforePromote → DB → transition onAfterPromote → global onAfterPromote）
- [ ] 多方法按 sort_order asc, id asc
- [ ] 集成测试：promote 触发 onAfterPromote，事件方法在同事务改字段
- Source: REQ-041, REQ-042, REQ-043, design §7.2

---

## M5 工作流引擎

### M5.1 工作流元数据 `[P0]`
- [ ] `Kras.Core/Workflow/`：Definition、Version、Lane、Node、Edge、BendPoint、ActivityTemplate、ActivityAssignmentTemplate、Node/Edge/Version Method、Process、ProcessLane/Node/Edge/BendPoint、Activity、ActivityAssignment、Token、EventLog、ItemTypeWorkflowDefinition
- Source: REQ-010, design §3.1

### M5.2 WorkflowEngine 启动 `[P0]`
- [ ] startWorkflow：ItemType Workflow Map 解析、manual scope、start_state_id 校验
- [ ] is_default 兜底
- [ ] Process 实例化 + 首 Activity + Assignment（自动节点跳过）
- [ ] onBeforeActivate / onAfterActivate / onBeforeAssign / onAfterAssign
- Source: REQ-050, design §7.3

### M5.3 advanceWorkflow `[P0]`
- [ ] 路径解析（path_id / default / single）
- [ ] 签核前置校验
- [ ] path.onBeforeTransit（route_selected/route_skip/route_decision/next_activity_id/route_message）
- [ ] path.life_cycle_transition_id → 同对象 promote（统一 promote action）
- [ ] token 推进
- [ ] 自动节点递归（loop guard）
- [ ] path.onAfterTransit + node onBeforeComplete/onAfterComplete
- [ ] 集成测试：审批→流转→自动节点→路径方法→生命周期联动
- Source: REQ-051, REQ-052, REQ-053, REQ-056, REQ-174, design §7.3

### M5.4 签核操作 `[P0]`
- [ ] submitApproval / approveWorkflow / rejectWorkflow（写 approval_* 审计字段）
- [ ] addSign / removeSign（复用同 Identity 活动 assignment）
- [ ] delegate（Delegated + onBefore/AfterDelegate）
- [ ] transfer/reassign（Transferred）
- [ ] takeOver（TakenOver，默认当前登录主 Identity，Alias 优先）
- [ ] 多 assignment 未传 assignment_id/source_identity_id → 报错
- [ ] 单元 + 集成测试
- Source: REQ-054, REQ-057, design §7.3

### M5.5 节点表单与路径方法 `[P0]`
- [ ] getWorkflowNodeForm（按 Workflow Map Activity）
- [ ] getWorkflowProcessForm（按实例当前节点）
- [ ] 节点未配置表单 → 报错
- [ ] Workflow Map Path Method（onBeforeTransit/onAfterTransit）
- Source: REQ-055, design §7.3

### M5.6 活动事件全量 `[P0]`
- [ ] onBeforeActivate/onAfterActivate、onBeforeAssign/onAfterAssign、onBeforeDispatch/onAfterDispatch、onBeforeComplete/onAfterComplete、onBeforeCancel/onAfterCancel、onBeforeAddSign/onAfterAddSign、onBeforeRemoveSign/onAfterRemoveSign、onBeforeDelegate/onAfterDelegate
- Source: REQ-055

---

## M6 扩展能力

### M6.1 服务端 Method Runtime `[P0]`
- [ ] `Kras.Service/Methods/MethodRuntime.cs`：@action="<MethodName>" 优先于 BuiltIn / 标准 action
- [ ] `Kras.Service/Methods/BuiltIn/*`：Search、Workflow*、LifeCycle、FileStorage、FilePreview、PropertyIndex、RequiredPropertyValidation、SchemaSync、UserDefaultVault
- [ ] Method 内写库走 applyItem/applyAml 复用事务
- [ ] DirectBuiltInActions 白名单
- Source: REQ-021, REQ-060, design §8.1

### M6.2 编译检查与 LSP `[P1]`
- [ ] `/api/methods/compile-check`（Roslyn）
- [ ] `/lsp/dotnet`（OmniSharp / Roslyn LSP）
- [ ] 敏感限流
- Source: REQ-024, REQ-060, REQ-092

### M6.3 前端 JS Method Runtime `[P0]`
- [ ] `src/data/clientMethodRuntime.ts`：execute(item, context)
- [ ] View 编辑器绑定组件事件 → JS Method（button.click、*.change）
- [ ] methods 数组按 sort_order 升序执行
- [ ] 注入 kras / message / Modal / context
- [ ] 返回 item 回填表单
- Source: REQ-061, design §8.2

### M6.4 View 编辑器 `[P0]`
- [ ] `pages/ViewEditorPage.vue`：顶部 + 左侧组件/属性 Tab + 中间设计区 + 右侧属性/JSON
- [ ] 选中、Ctrl/Cmd 多选、Shift 范围选、批量拖动/删除、Delete、ghost 占位、左右插入反馈
- [ ] scheme：sections + 递归 fields + 容器 children
- [ ] `POST /api/views/{id}/form` 保存 Form.scheme，保存前校验 JSON
- [ ] FormSchemeRenderer 协议一致
- Source: REQ-078, design §6.2

### M6.5 文件与存储 `[P0]`
- [ ] `Kras.Core/Files/`：File、Image、UploadSession、UploadChunk、Located
- [ ] `FileService` + `ChunkedUploadService`
- [ ] `/api/file/upload`（upload 限流）、`/api/files/{id}`
- [ ] Vault 抽象（FS / S3）
- [ ] File Preview Rule + `/file-preview/{ItemTypeName}/{id}` 页面
- [ ] 真实 File 数据回归（REQ-182）
- Source: REQ-100, REQ-182, design §10

### M6.6 菜单管理 `[P0]`
- [ ] `MenuTreeQueryService`：合并自定义菜单 + ItemType 分组（is_hidden=0）
- [ ] CRUD（MenuItemCreate/Update）、reorder、级联删除
- [ ] identityIds 可见性过滤
- [ ] 前端菜单管理页 `/menu-management`
- Source: REQ-110, design §11

### M6.7 搜索（ES + DB LIKE 回退） `[P0]`
- [ ] `ItemSearchContracts` + `ElasticItemSearchService` + `DbItemSearchFallback`
- [ ] quickSearch BuiltInAction
- [ ] `@action="get"` + `@searchKey` 走 quickSearch 语义
- [ ] 默认索引字段：is_hidden=0、is_hidden2=0、field_permission_id 为空
- [ ] is_es_index 开关
- [ ] onAfterAdd/Update/Delete 触发 after-commit 增量同步
- Source: REQ-081, design §3.2, §14.2

### M6.8 AI 能力 `[P1]`
- [ ] `Kras.Core/Ai/`：Scenario、ScenarioVersion、PromptTemplate、SkillDefinition、ToolDefinition、McpServer、ProviderProfile、各 Binding
- [ ] `Kras.Service/Ai/AiScenarioAdapters` / `AiScenarioAdapterBases` / `AiRuntime` / `AiRoadmapTools`
- [ ] `/api/ai/layout`、`/api/ai/item-detail-draft`、`/api/ai/method-edit`（敏感限流）
- [ ] 前端 `/ai-management`
- Source: REQ-120, REQ-121, design §12

### M6.9 审计与可观测 `[P0]`
- [ ] `AuditLogService`（channel 入队）
- [ ] `AuditLogBackgroundService`（后台 worker 批量写）
- [ ] applyItem / applyAml 链路落点
- [ ] `/health`
- [ ] RequestDurationMiddleware + 高频路径敏感字段过滤
- Source: REQ-130, design §13

### M6.10 关系表新增校验扩展 `[P1]`
- [ ] 「新增后保存并再次打开校验」扩展到更多关系类型（REQ-180）
- [ ] Relationship View Tab 更多业务页面覆盖（REQ-181）
- Source: REQ-180, REQ-181

### M6.11 Failed to fetch 排查 `[P2]`
- [ ] 确认定义编辑页保存后偶发 Failed to fetch 是否为页面切换请求中断噪音（REQ-183）
- Source: REQ-183

---

## M7 收尾与门禁

### M7.1 文档同步 `[P0]`
- [ ] `docs/applyItem请求动作说明.md`：全部动作级请求体
- [ ] `docs/Item对象JSON格式规范.md`：Item JSON 结构与响应格式
- [ ] `docs/kras-web-vue-迁移现状.md`：更新实现状态
- [ ] `AGENTS.md` 22.3 共享独立文件职责清单对齐
- Source: REQ-141, REQ-160, REQ-161

### M7.2 命名规范扫描 `[P0]`
- [ ] 目录/文件/标识符命名审计（business domain / object+behavior / 布尔前缀 / 集合复数）
- [ ] 禁用名：temp / misc / new / demo / data.ts / utils2.ts / page1.tsx / doThing / processIt
- Source: REQ-161

### M7.3 门禁脚本完整化 `[P0]`
- [ ] `scripts/check-kras-gates.ps1`：dotnet build + Kras.Api.Tests + lint + build
- [ ] Windows 必须用 pwsh；Linux 沙箱可附加 `check-kras-gates.sh` 兜底
- [ ] CI 调用门禁
- Source: REQ-162

### M7.4 Playwright E2E 全覆盖 `[P0]`
- [ ] route-accessibility、method-editor、lifecycle-definition、workflow-definition、view-editor、lifecycle-relationship-edit
- [ ] 真实数据 E2E：新建 ItemType + Property → 列表/详情/表单/关系 Tab/菜单项
- [ ] 每步：截图 + Console 无 error + Network 无 failed
- Source: REQ-163, REQ-170 ~ REQ-178

### M7.5 性能压测 `[P1]`
- [ ] 列表分页 / 虚拟滚动 / 列窗口基准
- [ ] 关系表大数据量
- [ ] 后端 N+1 检测（元数据 / 权限 / keyed_name / 列表值收口）
- Source: REQ-150, REQ-151

### M7.6 验收用例对照 `[P0]`
- [ ] REQ-170 元数据驱动验收
- [ ] REQ-171 统一协议验收
- [ ] REQ-172 权限验收
- [ ] REQ-173 生命周期严格验收
- [ ] REQ-174 工作流闭环验收
- [ ] REQ-175 版本正确验收
- [ ] REQ-176 Tab 状态验收
- [ ] REQ-177 门禁通过验收
- [ ] REQ-178 E2E 可追溯验收

---

## 工作量级评估与建议

| 里程碑 | 任务数 | 量级 | 建议执行节奏 |
| --- | --- | --- | --- |
| M0 | 5 | 中 | 1 轮会话 |
| M1 | 9 | 大 | 2-3 轮会话 |
| M2 | 7 | 中 | 1-2 轮会话 |
| M3 | 8 | 大（前端重点） | 2-3 轮会话 |
| M4 | 4 | 中 | 1-2 轮会话 |
| M5 | 6 | 大（治理重点） | 2-3 轮会话 |
| M6 | 11 | 超大 | 3-4 轮会话 |
| M7 | 6 | 中 | 1-2 轮会话 |
| **合计** | **56** | **超大** | **建议按里程碑顺序推进，每里程碑结束跑门禁** |

> 单次会话内无法完成全部 56 项任务。建议每次会话聚焦 1 个里程碑，结束时跑通对应门禁并提交 git。
