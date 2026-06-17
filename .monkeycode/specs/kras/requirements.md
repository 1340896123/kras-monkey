# Kras 需求规格说明书（Requirements）

> 文档版本：v1.0
> 整理日期：2026-06-17
> 来源：Kras 原始需求文档（2026-06-17 版）
> 编写规范：EARS（Easy Approach to Requirements Syntax）+ INCOSE 语义质量规则
> 适用版本：Kras 主干（AML 协议 2.x、前端 kras-web-vue）

---

## 0. 文档目的

本文档将 Kras 原始需求结构化为可验证、可追溯、可测试的 EARS 需求条目，作为后续 `design.md`（技术方案）与 `tasklist.md`（任务拆解）的输入。

### 0.1 EARS 关键字说明

| 关键字 | 含义 | 示例 |
| --- | --- | --- |
| **The system shall** | 无条件必须行为 | The system shall generate a 32-digit unhyphenated ID for every business object. |
| **When \<condition\>, the system shall** | 事件触发 | When the user logs in, the system shall load ItemType/Property/RelationshipType metadata in parallel. |
| **While \<state\>, the system shall** | 状态持续 | While a transaction is open, the system shall reuse the same connection for all applyItem side effects. |
| **Where \<feature\>, the system shall** | 特性前提 | Where ItemType.is_versionable = 1, the system shall execute the version action on demand. |
| **If \<condition\>, then the system shall** | 异常/可选分支 | If the relationship_id is missing, then the system shall reject the request with ITEMTYPE_NOT_FOUND. |

### 0.2 优先级与追溯

每条需求标记 `[P0]`（必须）/ `[P1]`（应该）/ `[P2]`（可选），并在末尾给出 `Source: §x.y` 指向原始需求章节。

---

## 1. 系统定位与设计原则

### REQ-001 系统定位 `[P0]`
**The system shall** be a metadata-driven and Item-protocol-driven enterprise low-code / PLM platform, supporting full lifecycle management of business objects (Part / Document / BOM / ECO / Workflow Approval) through unified data modeling, unified interaction protocol, and unified permission and governance capabilities.
- Source: §0, §1.1

### REQ-002 设计原则优先级 `[P0]`
**When** the implementation faces a tradeoff, **the system shall** resolve it in the following priority order: (1) follow existing protocols and documentation; (2) reuse the `kras` unified entry and cache; (3) keep metadata-driven; (4) keep interaction consistent with existing pages; (5) only as a last resort introduce new wrappers or abstractions.
- Source: §1.2

### REQ-003 技术选型约束 `[P0]`
**The system shall** satisfy the following stack constraints:
- Windows command environment MUST use `pwsh`, MUST NOT use `powershell`.
- Frontend MUST be Vue 3 (`kras-web-vue`) with Ant Design v6 as the preferred UI library.
- Backend MUST be .NET, layered as `Kras.Core` / `Kras.Service` / `Kras.Api` / `Kras.DbInit`.
- Business IDs MUST be 32-digit, unhyphenated (uppercase recommended), MUST NOT reuse third-party UUIDs with hyphens.
- Database MUST be relational with default schema `dbo` and `snake_case` column names.
- Source: §1.3

---

## 2. 元数据驱动建模

### REQ-010 元数据对象清单 `[P0]`
**The system shall** support the following categories of metadata objects, each implemented as a built-in ItemType (IDs defined in `ConstItemTypeId`):
1. Data modeling: ItemType, Property, RelationshipType, List, List Value, View, Form.
2. Permission & identity: User, Identity, Alias, Team, Team Identity, Permission, Access, AllowedPermission, CanAdd, Vault.
3. Lifecycle: LifeCycle Definition (+ Version / State / Transition / BendPoint / State Method / Transition Method / Version Method / Event Log / ItemType LifeCycle Definition).
4. Workflow: Workflow Definition (+ Version / Lane / Node / Edge / BendPoint / Activity Template / Activity Assignment Template / Node Method / Edge Method / Version Method) and runtime (Workflow Process + Lane/Node/Edge/BendPoint + Activity + Activity Assignment + Token + Event Log + ItemType Workflow Definition).
5. Methods & events: Method, Server Event, Relationship Grid Event, Relationship View, Audit Log.
6. AI: Ai Scenario (+ Version), Ai Prompt Template, Ai Skill Definition, Ai Tool Definition, Ai MCP Server, Ai Provider Profile, and bindings.
7. File & storage: File, Image, File Preview Rule, Upload Session, Upload Chunk, Located.
8. Business samples: Part, BOM, Bom Item.
- Source: §3.1

### REQ-011 Property.data_source / foreign_property 语义强约束 `[P0]`
**The system shall** enforce the following `data_source` / `foreign_property` semantics, and **if** the configuration is invalid, **then the system shall** surface the error explicitly without silent fallback:
- `data_type=list` → `data_source` MUST be `List.id`.
- `data_type=item` → `data_source` MUST be `ItemType.id`.
- `data_type=foreign` → `data_source` MUST be `Property.id` of a target Property whose `data_type=item` and whose `source_id` equals the current Property's source; `foreign_property` MUST point to an `id` of a Property under the target ItemType.
- The frontend MUST treat `data_source` / `foreign_property` only as reference IDs, MUST NOT guess them as name/label/value.
- Source: §3.2.1

### REQ-012 RelationshipType 语义强约束 `[P0]`
**The system shall** resolve the relationship object type metadata via the ItemType pointed to by `relationship_id`. **If** `relationship_id` is missing or invalid, **then the system shall** reject with an error, MUST NOT silently fall back to inference by `name`.
- Source: §3.2.2

### REQ-013 实体权限函数唯一准则 `[P0]`
**The system shall** implement entity permission check strictly following `Kras.DbInit/sqls/fn_CheckEntityAccess.sql`. The `team_id` MUST be an independent permission branch; the `owner` branch MUST only rely on `owned_by_id`. **The system shall NOT** merge team into the owner branch.
- Source: §3.2.3, §10.2

### REQ-014 登录后元数据加载与缓存 `[P0]`
**When** the user logs in, **the system shall** invoke `await kras.getMetadata()` to concurrently fetch ItemType / Property / RelationshipType and write them back to memory cache and localStorage.
- Source: §3.3

### REQ-015 只读缓存语义 `[P0]`
**While** reading metadata cache, **the system shall** use `kras.cache.getMetadata()` / `getItemTypeMetadata()` / `getItemTypeProperties()` / `getItemTypeRelationshipTypes()`. **If** a cache miss occurs, **then the system shall** return empty directly, MUST NOT issue a fallback request inside the cache layer.
- Source: §3.3

### REQ-016 缓存清理 API `[P0]`
**The system shall** provide cache clearing APIs: `kras.cache.clearItemType('Part')`, `kras.cache.clearItemType()`, `kras.reset()`.
- Source: §3.3

### REQ-017 字段级权限定义与渲染 `[P0]`
**The system shall** attach field permission to `Property.field_permission_id`, reusing Permission / Access. **The system shall** return only fields with `can_view=true` for the current user in visible metadata. **The system shall** determine readonly state by `readonly=true` OR `can_edit=false`.
- Source: §3.4

### REQ-018 字段级权限后端最终校验 `[P0]`
**The system shall** perform final field-permission validation on the backend paths `get` / `quickSearch` / `update` / `add` / `version` / `applyAml`. Fields without view permission MUST NOT leak business content in list columns, detail fields, or metadata cache.
- Source: §3.4

---

## 3. 统一数据协议（Item / AML）

### REQ-020 Item 统一数据单元 `[P0]`
**The system shall** represent every record as an Item object in AML-compatible format: business attributes at the top level, system attributes prefixed with `@` (`@type`, `@id`, `@action`, `@keyed_name`, `@relationships`).
- Source: §4.1

### REQ-021 @action 解析优先级 `[P0]`
**When** resolving `@action`, **the system shall** apply this priority: Database Method name > `[BuiltInAction]` > static whitelist `DirectBuiltInActions` > standard DB action.
- Standard DB actions: `get`, `new`, `add`, `edit`, `update`, `copy`, `lock`, `unlock`, `version`, `promote`, `delete`.
- System built-in actions: `quickSearch` and `[BuiltInAction("xxx")]` (e.g. `startWorkflow`, `advanceWorkflow`, `submitApproval`).
- A server-side Method name MAY be written directly into `@action`.
- `@action="apply"` MUST NOT be a valid action for a plain Item; batch MUST go through `POST /api/applyAml`.
- Source: §4.2

### REQ-022 关系字段协议 `[P0]`
**The system shall** distinguish:
- `@Relationships` (capital R): for submitting relationship changes (an array).
- `@relationships` (lowercase r): for `get` to control returned relationships. Values: `"all"` or a comma-separated list (e.g. `"Property,View"`).
- **If** `get` does not explicitly pass `@relationships`, **then the system shall NOT** implicitly return relationships.
- Source: §4.3

### REQ-023 引用字段值与显示分离 `[P0]`
**The system shall** separate reference field value (the referenced `id`) from display (`@keyed_name` / `name` / `label`). **The system shall** be compatible with three return formats: inline object / split fields (`field@id`, `field@keyed_name`, `field@type`) / hybrid. **When** clearing a reference field, **the system shall** truly clear the form value, MUST NOT retain the stale reference object.
- Source: §4.4

### REQ-024 HTTP 端点契约 `[P0]`
**The system shall** expose the following endpoints (rate-limited where marked):
| Endpoint | Method | Purpose | Rate limit |
| --- | --- | --- | --- |
| `/api/applyItem` | POST | Single Item action / method | - |
| `/api/applyAml` | POST | Strict batch `{"AML":[...]}`, single transaction | - |
| `/api/whereUsed` | POST | Reverse reference lookup | - |
| `/api/login` | POST | Login | sensitive |
| `/api/files/{id}` | GET | Get file | - |
| `/api/file/upload` | POST | Upload file | upload |
| `/api/menus` | GET | Menu tree | - |
| `/api/menus` | POST/PUT/DELETE | Menu CRUD & reorder | - |
| `/api/views/{id}/form` | POST | Save View form scheme | - |
| `/api/ai/layout` | POST | AI layout | sensitive |
| `/api/ai/item-detail-draft` | POST | AI detail draft | sensitive |
| `/api/ai/method-edit` | POST | AI method edit | sensitive |
| `/api/methods/compile-check` | POST | Method compile check | sensitive |
| `/lsp/dotnet` | ANY | .NET LSP | - |
| `/health` | GET | Health check | - |
- Source: §4.5

### REQ-025 统一响应 envelope `[P0]`
**The system shall** support both bare `data` and standard envelope. Success: `{ "success": true, "data": ..., "message": "..." }`. Error: `{ "success": false, "error": { "@type": "Error", "@is_error": "1", "code": "...", "message": "..." } }`.
**The system shall** use error codes from the closed set: `VALIDATION_ERROR` / `ITEM_NOT_FOUND` / `ITEMTYPE_NOT_FOUND` / `PERMISSION_DENIED` / `CONFLICT` / `METHOD_EXECUTION_FAILED` / `DELETE_FAILED` / `INTERNAL_ERROR` / `DATABASE_ERROR` / `INVALID_JSON`.
- Source: §4.6

### REQ-026 applyItem 事务规则 `[P0]`
**The system shall** open a single transaction for each `applyItem` call. The onBefore* handlers, the main action/method, and the onAfter* handlers MUST be treated as one execution unit. **If** any step errors, **then the system shall** roll back the whole unit. Event methods that further modify data MUST reuse the current transaction via unified `applyItem/applyAml`.
- Source: §4.7

### REQ-027 applyAml 批量事务 `[P0]`
**The system shall** share one batch transaction across all items in an `applyAml` request. **If** any item fails, **then the system shall** roll back the whole batch, and the response MUST reflect that the entire batch was rolled back.
- Source: §4.7

### REQ-028 事务内副作用规则 `[P0]`
**The system shall** place roll-backable, atomic logic (field backfill, relationship linkage, lifecycle linkage, workflow business object creation) inside the transaction. **The system shall NOT** execute non-roll-backable side effects (email, external HTTP, ES index sync, WebHook) synchronously inside the transaction; they MUST be dispatched via after-commit events and triggered only after the DB transaction truly commits.
- Source: §4.8

---

## 4. 版本管理

### REQ-030 版本字段语义 `[P0]`
**The system shall** maintain the following version fields with the specified semantics: `major_rev` (default `A`), `minor_rev` (default `1`), `generation` (default `1`), `is_released`, `release_date`, `is_current`, `config_id`.
- Source: §5.1

### REQ-031 version action 规则 `[P0]`
**Where** `ItemType.is_versionable = 1`, **the system shall** execute the `version` action with the following rules:
- New first version defaults to `A.1`, `generation = 1`.
- Each `version` MUST increment `generation`.
- If current `is_released != 1`: `major_rev` unchanged, `minor_rev` incremented.
- If current `is_released = 1`: `major_rev` incremented in alphabetic order (`A → B → C → ...`), `minor_rev` reset to `1`.
- With a lifecycle map configured, the new version MUST return to the lifecycle start state (priority: `default_state_id`, then `is_start`, then `is_released=false`), MUST NOT inherit the old version's current state.
- When the lifecycle state's `is_released = 1`, set `is_released = 1` and write `release_date`. A new version returning to non-released state MUST recompute based on the target state, MUST NOT inherit the old release result.
- Source: §5.2

### REQ-032 manual_versioning `[P1]`
**Where** `manual_versioning = 1`, **the system shall** let the user manually version. **Where** `manual_versioning = 0`, **the system may** enter the auto-versioning save path on `edit`.
- Source: §5.2

### REQ-033 非 versionable 跳过 `[P0]`
**Where** `ItemType.is_versionable != 1`, **the system shall** skip the version action and return `version_skipped = true, version_skip_reason = "not_versionable"`.
- Source: §5.2

---

## 5. 生命周期（LifeCycle）

### REQ-040 多映射解析 `[P0]`
**The system shall** resolve the current lifecycle map from `ItemType LifeCycle` (only enabled mappings). **Where** `class_path` exists, **the system shall** match the object's `classification` by longest prefix. **If** multiple maps match with the same priority, **then the system shall** raise an error.
- Source: §6.1

### REQ-041 promote 必填与路由 `[P0]`
**When** promoting, **the system shall** require `@type`, `@id`, `transition_id`. `transition_id` is the backend routing key; `target_state_name` is for audit display only. **The system shall** resolve from the object's current real `state`. **If** `state` is missing, empty, or unmatched, **then the system shall** raise an error, MUST NOT silently fall back to `default_state_id` / `is_start` / the first state.
- Source: §6.2

### REQ-042 require_workflow_context `[P0]`
**Where** `LifeCycle Transition.require_workflow_context = true`, **the system shall** require a valid workflow context (`workflow_process_id` / `workflow_map_id` / `workflow_map_activity_id` / `workflow_map_path_id`).
- Source: §6.2

### REQ-043 promote 转换方法执行顺序 `[P0]`
**The system shall** execute transition methods in this order: global `onBeforePromote` → current transition `onBeforePromote` → DB state migration → current transition `onAfterPromote` → global `onAfterPromote`. Methods MUST return the same business Item type and id. To persist extra fields, the method MUST explicitly invoke the unified `applyItem/applyAml`. Multiple methods on the same transition execute by `sort_order asc, id asc`.
- Source: §6.3

---

## 6. 工作流（Workflow）

### REQ-050 工作流启动绑定 `[P0]`
**The system shall** bind `Workflow Map` to allowed business object types via `source_type_id`. A workflow MUST NOT start without binding. **The system shall** resolve the current ItemType's startable maps via `ItemType Workflow Map`. **The system shall** show only maps with `start_scope` allowing `manual` in the frontend candidates; frontend and backend validation MUST be consistent. **Where** `is_default = true` and no `workflow_map_id` is explicitly passed, **the system may** use the default binding. **Where** `Workflow Map.start_state_id` is configured, **the system shall** allow start only when the object's current lifecycle state equals that state.
- Source: §7.1

### REQ-051 advanceWorkflow 路由 `[P0]`
**The system shall** support `advanceWorkflow`. **If** the current node has exactly one path or a default path, **the system may** advance directly. **If** multiple paths exist, **the system shall** require explicit `path_id` or `next_activity_id`.
- Source: §7.2

### REQ-052 签核前置 `[P0]`
**Where** a node has signing assignments, **the system shall** require `submitApproval` / `approveWorkflow` / `rejectWorkflow` before `advanceWorkflow`. **The system shall** validate: caller is a signer; required signers all submitted; reject conclusion clearly marks the reject path.
- Source: §7.2

### REQ-053 自动节点 `[P0]`
**Where** `Activity Template.is_automatic = true` and the node is not an end node, **the system shall** treat it as automatic upon activation: MUST NOT create a human assignment, and MUST continue routing via the same `advanceWorkflow` chain. **The system shall** limit consecutive automatic steps to prevent loops.
- Source: §7.2

### REQ-054 加减签 / 委托 / 转办 / 接管 `[P0]`
**The system shall** support the following assignment operations:
- `addSign` / `removeSign`: add/remove signers; reuse existing active assignment for the same Identity, MUST NOT duplicate.
- `delegate`: close source assignment (state `Delegated`), create/reuse target active assignment; trigger `onBeforeDelegate` / `onAfterDelegate`.
- `transfer` / `reassign`: source assignment state `Transferred`.
- `takeOver`: source assignment state `TakenOver`. **If** no target identity is passed, **the system shall** default to the current login user's primary Identity (Alias preferred).
- **If** multiple active assignments exist and neither `assignment_id` nor `source_identity_id` is passed, **then the system shall** return an error.
- Source: §7.3

### REQ-055 节点 / 路径 / 表单方法事件 `[P0]`
**The system shall** fire activity method events: `onBeforeActivate` / `onAfterActivate` / `onBeforeAssign` / `onAfterAssign` / `onBeforeDispatch` / `onAfterDispatch` / `onBeforeComplete` / `onAfterComplete` / `onBeforeCancel` / `onAfterCancel` / `onBeforeAddSign` / `onAfterAddSign` / `onBeforeRemoveSign` / `onAfterRemoveSign` / `onBeforeDelegate` / `onAfterDelegate`.
**The system shall** support path methods `Workflow Map Path Method`: `onBeforeTransit` (may return `route_selected` / `route_skip` / `route_decision` / `next_activity_id` / `route_message`) and `onAfterTransit`.
**The system shall** provide `getWorkflowNodeForm` (by Workflow Map Activity) and `getWorkflowProcessForm` (by process instance current node). **If** a node has no form configured, **then the system shall** raise an explicit error, MUST NOT fall back to other sources.
- Source: §7.4

### REQ-056 工作流与生命周期联动 `[P0]`
**Where** `Workflow Map Path.life_cycle_transition_id` is configured, **the system shall**, before the path advances in `advanceWorkflow`, automatically trigger `promote` on the same business object via the unified `promote` action. **The system shall NOT** let the frontend or business Method directly modify `state`.
**Where** `LifeCycle Transition.require_workflow_context = true`, **the system shall** ensure the transition can only be triggered by the workflow chain.
- Source: §7.5

### REQ-057 审批审计字段 `[P0]`
**The system shall** write the following audit fields on `submitApproval` and its variants: `approval_action` / `approval_result` / `approval_comment` / `completed_by_id` / `completed_identity_id` / `completed_on`.
- Source: §7.6

---

## 7. 方法体系（双轨扩展）

### REQ-060 服务端 C# Method `[P0]`
**The system shall** store server-side Methods in the `Method` object with `method_type = cs`. **The system shall** invoke them via `@action = "<MethodName>"`, resolved before BuiltInAction and standard actions. Methods that write to DB MUST reuse the unified `applyItem/applyAml`. Built-in behaviors live in `Kras.Service/Methods/BuiltIn`. Direct SQL on business data MUST be avoided unless confirmed to not trigger events/permissions/lifecycle/workflow/index sync. Compile check endpoint: `/api/methods/compile-check`. .NET LSP endpoint: `/lsp/dotnet`.
- Source: §8.1

### REQ-061 前端 JavaScript Method `[P0]`
**The system shall** let the View editor bind component events to frontend JS Methods (`method_type = js/javascript`), MUST NOT bind component events directly to backend C# Methods. `methods` is an array executed in `sort_order` ascending. Supported events: `button → click`; `text/textarea/class_select/number/date/switch/select/item → change`. **The system shall** merge "current object + current form values + this change" as `item` passed to `execute(item, context)`. **The system shall** inject `kras`, `message`, `Modal`, `context` (with `eventName` / `fieldName` / `fieldLabel` / `methodId` / `methodName` / `changedValue` / `changedValues` / `values`). Methods MAY be sync or async, MUST return an `item` object, and the result auto-fills the form.
- Source: §8.2

---

## 8. 前端功能需求

### REQ-070 总体布局 `[P0]`
**The system shall** render a left menu (from `/api/menus`, ItemType menu from metadata, frontend MUST NOT hardcode) + top action area + content area (multi-Tab). Tab switching MUST preserve page state. Closing one Tab MUST NOT affect others. Tab content renders directly in `ant-tabs-content-holder`. The dynamic page body MUST NOT be wrapped in Card.
- Source: §9.1

### REQ-071 路由规范 `[P0]`
**The system shall** expose the following routes (ItemType list `/item-types/{ItemTypeName}`, detail `/item-types/{ItemTypeName}/{id}`, View editor `/view-editor/{viewId}`, dashboard `/dashboard`, AI management `/ai-management`, users `/users`, settings `/settings`, menu management `/menu-management`, debug panel `/debug-panel`, permission report `/permission-report/{ItemTypeName}/{id}`, file preview `/file-preview/{ItemTypeName}/{id}`, login `/login`). Definition editors (Method / LifeCycle Definition / Workflow Definition) share `DefinitionEditorPage`.
- Source: §9.2

### REQ-072 列表页（ItemTypeTable） `[P0]`
**The system shall** render the first row as an input filter row (not frontend local filtering UI): numeric `>100` / `<=50`, date `<2025/01/11`, wildcard include `*123*`. **The system shall** execute filter / quick search / range filtering on the backend, MUST NOT do it locally on the frontend. **The system shall** build table columns from Property metadata: `label` → title, `sort_order` → order, `column_width` → width, `is_hidden` → hidden. **The system shall** render the table structure even with empty data; columns MUST NOT depend on data rows (MUST NOT fall back to `Object.keys(rows[0])`). Double-clicking a row opens the detail Tab. Reference fields store id, display via `@keyed_name`.
- Source: §9.3

### REQ-073 详情页（ItemDetailPage） `[P0]`
**The system shall** render a unified detail page structure: (1) top keyed_name display; (2) action buttons (Edit / Save / Complete / Version / Lock-Unlock / Cancel); (3) middle form area; (4) bottom Relationship Tabs; (5) each relationship Tab shows its relationship data list.
- Source: §9.4

### REQ-074 详情页数据分层 `[P0]`
**The system shall** separate data layers: main object data / type metadata (ItemTypeMetadata, Properties, RelationshipTypes, View/Form) / relationship row data / scenario-level UI state (editing / current Tab / local loading / dirty / local height).
- Source: §9.4

### REQ-075 详情页首屏加载 `[P0]`
**The system shall** block only the minimal renderable data on first paint: main object + `getItemTypeMetadata` + `getItemTypeProperties`. **The system may** synchronously read `kras.cache.getItem / getItemKeyedName / getItemTypeProperties` for placeholder on the first frame; the formal read goes through the real source entry. RelationshipTypes / Relationship View / relationship rows MUST NOT block first paint. **If** the form scheme is not returned, **then the system shall** render a fallback form from Properties.
- Source: §9.4

### REQ-076 关系区加载 `[P0]`
**The system shall** load `getItemTypeRelationshipTypes` on entering to build Relationship Tabs. **The system shall** let relationship Tab row data load on demand by relationship components, MUST NOT pull all relationship rows at first paint. **The system shall** load a Tab only when first activated; an already-loaded Tab MUST retain state for its lifetime.
- Source: §9.4

### REQ-077 编辑与保存 `[P0]`
**When** a field changes, **the system shall** update local draft + unified dirty marker (`@dirty: true`, prefer `kras.objects.markDirty`). Editing MUST NOT trigger a full-page remote re-read. **When** lock/unlock changes server state, **the system shall** prefer refreshing only the main object, MUST NOT reload the whole page. **After** saving, the server result is authoritative: "force refresh main object + targeted refresh of dirty relationships", MUST NOT indiscriminately reload the whole page. **When** the response returns a new id, **the system shall** first switch to the new detail path, then refresh the main object. **The system shall** clear type-level metadata cache only when the modification affects ItemType / Property / RelationshipType / View / Form.
- Source: §9.4

### REQ-078 View 编辑器 `[P0]`
**The system shall** render a View editor with: top title + Save / Preview / Reset; left component library & object properties (left/right Tab); middle form preview design area; right selected component property editor + JSON source editor. **The system shall** support interactions: select title & input area, Ctrl/Cmd multi-select, Shift same-container range select, multi-select batch drag & delete, Delete to delete, drag ghost placeholder, drag left/right insertion feedback. **The system shall** support `sections` at the top level, recursive `fields`, container components supporting `children`. **The system shall** save via `POST /api/views/{id}/form`, writing to `Form.scheme` (synced with `form_scheme`), and validate JSON parsability before save. **The system shall** keep the ViewEditorPage (designer) and FormSchemeRenderer (renderer) protocols consistent.
- Source: §9.5

### REQ-079 表单字段组件 `[P0]`
**The system shall** provide base components (text / textarea / number / date / switch / select), extension components (file / image / button), layout components (layout / group / divider / title; container supports mixed nesting & drag). **The system shall** unify file/image field value protocol as `{ "@type":"File", "@id":"32-digit", "name":"file.ext", "bytes":[137,80,78,71] }`. `bytes` optional; **if** no `@id` but a name exists, **then the system may** auto-generate a 32-digit id on the frontend. `multiple=true` submits an array, single file submits a single object, no value submits `null`. schema config: `accept` / `max_count` / `multiple` / `show_list` / `downloadable` / `preview` / `fit` / `upload_path` / `max_size` (frontend only retains `upload_path` and `max_size` values for now).
- Source: §9.6

### REQ-080 引用字段 / ItemSearch `[P0]`
**The system shall** load the first batch of data immediately when the dropdown opens, MUST NOT require typing before requesting. **The system shall** search by display name preferring `keyed_name: *keyword*`, MUST NOT default to `quickSearch`. **The system shall** order dropdown text priority: `@keyed_name → label → name → id`. **The system shall** rely on component lifecycle for popover control, only sensing state on `onOpenChange`, MUST NOT manually force-control `Select.open`. **The system shall** compose dynamic query: static `query` in field schema + JS Method runtime conditions (`${field.name}@query`, `${field.name}@button_disabled`, `${field.name}@search_query`, etc.). **The system shall** expose `kras.searchItems.getController(fieldName)` returning a controller (open/close, setQuery/mergeQuery, setModalState, setToolbarState, table.getSelection, etc.).
- Source: §9.7

### REQ-081 quickSearch `[P0]`
**The system shall** unify quick search via the BuiltInAction `quickSearch`, carrying `@searchKey`. **When** `@action="get"` carries `@searchKey`, **the system shall** treat it as quickSearch semantics. Default ES index fields include only Properties with `is_hidden=0`, `is_hidden2=0`, and empty `field_permission_id`. **Where** `ItemType.is_es_index=true`, **the system shall** build/use the ES index. **Where** `is_es_index != true`, **the system shall** fall back to DB `LIKE`. `onAfterAdd / onAfterUpdate / onAfterDelete` MUST trigger incremental index sync (after-commit).
- Source: §9.8

---

## 9. 权限与安全

### REQ-090 权限模型 `[P0]`
**The system shall** define permission items in `Permission`, with `Access` (its relationship class) giving per-Identity `can_get / can_add / can_update / can_delete / can_discover / can_change_access / show_permissions_warning`. Permission subjects are Identity (incl. Alias), aggregable via Team. Object ownership fields: `owned_by_id` (owner), `managed_by_id` (manager), `team_id` (team).
- Source: §10.1

### REQ-091 字段级权限双校验 `[P0]`
**The system shall** implement field-level permission as: frontend hide + backend final validation. Both are mandatory.
- Source: §10.3, §3.4

### REQ-092 鉴权与限流 `[P0]`
**The system shall** authenticate requests via `Authorization: Bearer {token}`. **The system shall** apply sensitive rate limit to `/api/login`, AI endpoints, and `/api/methods/compile-check`. **The system shall** apply upload rate limit to `/api/file/upload`. **The system shall** gate debug headers via a debug switch.
- Source: §10.4

---

## 10. 文件与存储

### REQ-100 文件存储 `[P0]`
**The system shall** model files as `File` and `Image` objects with `related_id` association. **The system shall** support chunked upload via `Upload Session` + `Upload Chunk`. Endpoints: get `/api/files/{id}`, upload `/api/file/upload` (upload rate limited). **The system shall** support `File Preview Rule` and a file preview page `/file-preview/{ItemTypeName}/{id}`. **The system shall** use Vault as the user default storage.
- Source: §11

---

## 11. 菜单管理

### REQ-110 菜单数据源 `[P0]`
**The system shall** serve the menu tree from `/api/menus` via `MenuTreeQueryService` merging custom menu items with ItemType metadata groups. ItemType groups auto-generated from `ItemType.label ?? name`, path `/item-types/{name}`. Hidden system ItemType MUST NOT enter the menu. **The system shall** support CRUD (`MenuItemCreate` / `MenuItemUpdate`), reorder (`MenuTreeReorderRequest`), cascade delete. **The system shall** filter menu items by current user `identityIds`.
- Source: §12

---

## 12. AI 能力

### REQ-120 AI 场景化配置 `[P1]`
**The system shall** support AI scenario configuration via `Ai Scenario` (+ Version) + `Ai Prompt Template` + `Ai Skill Definition` + `Ai Tool Definition` + `Ai MCP Server` + `Ai Provider Profile` + bindings.
- Source: §13

### REQ-121 内置 AI 端点 `[P1]`
**The system shall** expose built-in AI endpoints (all sensitive rate limited): `/api/ai/layout`, `/api/ai/item-detail-draft`, `/api/ai/method-edit`. **The system shall** place AI scenario adapters in `Kras.Service/Ai` (`AiScenarioAdapters` / `AiScenarioAdapterBases` / `AiRuntime` / `AiRoadmapTools`). Frontend AI management page: `/ai-management`.
- Source: §13

---

## 13. 审计与可观测

### REQ-130 审计日志 `[P0]`
**The system shall** enqueue audit events to a channel and write them asynchronously via a background worker (`AuditLogBackgroundService`). **The system shall** land audit checkpoints in the `applyItem` / `applyAml` chain. **The system shall** expose a health endpoint `/health`. **The system shall** log request duration and inject access context via middleware. **The system shall NOT** output large objects or sensitive fields in high-frequency paths.
- Source: §14

---

## 14. 数据库初始化（DbInit）

### REQ-140 DbInit 职责 `[P0]`
**The system shall** have `Kras.DbInit/Program.cs` responsible for: creating DB & tables, seeding system properties (`BuildSystemProperties`), `DefaultSystemColumns`, `DefaultSystemPropertyItems`, and generating `fn_CheckEntityAccess`.
- Source: §15

### REQ-141 新增系统属性同步覆盖 `[P0]`
**When** adding a new system property, **the system shall** sync-update: `BuildSystemProperties`, `DefaultSystemColumns`, `DefaultSystemPropertyItems`, the `Item` base class accessor, `Property.cs` + `Attributes.cs` (PropertyAttribute), `docs/Item对象JSON格式规范.md`, and `AGENTS.md`.
- Source: §15

### REQ-142 fn_CheckEntityAccess 单一来源 `[P0]`
**The system shall** generate `fn_CheckEntityAccess` consistently with `sqls/fn_CheckEntityAccess.sql`. **The system shall NOT** maintain another variant in code.
- Source: §15

### REQ-143 Schema 安全 `[P0]`
**The system shall** use default schema `dbo` and treat it as a safe identifier.
- Source: §15

---

## 15. 高性能要求

### REQ-150 前端性能 `[P0]`
**The system shall** prefer pagination / virtual scroll / column window for list / relationship / large tables. **The system shall** derive columns from metadata, MUST NOT fall back to `Object.keys(rows[0])` for performance. **The system shall** push search / filter / sort / range / permission clipping to the backend. **The system shall** use stable `key` from business id / relationship id / row key, MUST NOT use array indices as long-term keys for mutable lists. **The system shall** use `useMemo` / `useCallback` only when they reduce recompute or avoid re-rendering large components. **The system shall** lazily load/init large modals / large tables / complex editors. **The system shall** wait for container ready/render before initializing third-party DOM instances (X6 / Monaco / charts / maps) and release listeners / timers / instances on unmount. **The system shall NOT** write stale async results into expired state on unmount or scenario switch (cancel / ignore / request sequence number).
- Source: §16.1

### REQ-151 后端性能 `[P0]`
**The system shall** construct queries unified by metadata / field permission / entity permission, MUST NOT fetch large result sets then filter in memory. **The system shall** support pagination & necessary projection in list queries. **The system shall** scope relationship returns by `@relationships` in detail queries. **The system shall** use `applyAml` single transaction for batch save / graph editor / relationship batch. **The system shall** reuse request-level cache or system unified cache, MUST NOT build parallel caches. **The system shall** avoid N+1 (per-row metadata / permission / keyed_name / list value lookups MUST be batched or unified cached). **The system shall** parameterize SQL and project reasonably, MUST NOT `select *`. **The system shall** batch/stream/background large operations, MUST NOT run unbounded long transactions or CPU-heavy logic in request threads.
- Source: §16.2

---

## 16. 开发与质量门禁

### REQ-160 文档同步 `[P0]`
**When** changes involve `kras.getMetadata` / `metadataStore` / metadata read chain / unified protocol, **the system shall** sync-update the documentation. Code MUST NOT drift from spec.
- Source: §17.1

### REQ-161 命名语义规则 `[P0]`
**The system shall** name directories by business domain / module responsibility / scenario boundary; MUST NOT use `temp` / `misc` / `new` / `demo`. **The system shall** keep file names consistent with the file's main responsibility; MUST NOT use `data.ts` / `utils2.ts` / `page1.tsx`. **The system shall** name code as "object + behavior/responsibility": `load/fetch`, `normalize/build/resolve`, `handle`; MUST NOT use `doThing` / `processIt`. **The system shall** prefix booleans with `is/has/can/should`, pluralize collections, and qualify current/object/relationship/field with `current/active/selected/source/target`.
- Source: §17.2

### REQ-162 提交前检查 `[P0]`
**The system shall** run, before commit: backend `dotnet build Kras.sln`; frontend `cd kras-web-vue && npm run lint && npm run build`. **The system shall** provide a unified regression gate script `scripts/check-kras-gates.ps1` (backend compile + `Kras.Api.Tests` + frontend lint + build). Windows environment MUST use `pwsh`.
- Source: §17.3

### REQ-163 E2E 测试要求 `[P0]`
**The system shall** run E2E tests like real users: open homepage → menu → button → search → login → page links → forward/back/refresh. MUST NOT: manually edit URL bar, directly access deep routes, call APIs bypassing the page, modify localStorage/sessionStorage/cookie (unless the case explicitly requires). Each step records: target, actual operation, success criteria, evidence (screenshot), anomaly check. Evidence: page screenshot + Console error-free + Network no failed requests.
- Source: §17.4

---

## 17. 验收标准（功能性）

### REQ-170 元数据驱动验收 `[P0]`
**The system shall** satisfy: after creating a new ItemType + several Properties, the frontend lists, detail page, form, relationship Tabs, and menu item appear without writing frontend code.
- Source: §20.1

### REQ-171 统一协议验收 `[P0]`
**The system shall** satisfy: all data interactions complete via `applyItem` / `applyAml`; batch submissions are single-transaction consistent.
- Source: §20.2

### REQ-172 权限验收 `[P0]`
**The system shall** satisfy: fields without view permission do not leak business content in list / detail / metadata / cache; backend final validation on each path.
- Source: §20.3

### REQ-173 生命周期严格验收 `[P0]`
**The system shall** satisfy: missing or dirty `state` causes promote to error directly; `require_workflow_context` blocks non-workflow entry.
- Source: §20.4

### REQ-174 工作流闭环验收 `[P0]`
**The system shall** satisfy: approval → advance → automatic node → path method → lifecycle linkage, all traceable with event logs.
- Source: §20.5

### REQ-175 版本正确验收 `[P0]`
**The system shall** satisfy: after versioning, version number / generation / is_released / release_date / lifecycle start state all conform to rules.
- Source: §20.6

### REQ-176 Tab 状态验收 `[P0]`
**The system shall** satisfy: Tab switching preserves state; relationship Tabs load on demand and retain loaded state.
- Source: §20.7

### REQ-177 门禁通过验收 `[P0]`
**The system shall** satisfy: `dotnet build Kras.sln` and kras-web-vue `lint` + `build` pass.
- Source: §20.8

### REQ-178 E2E 可追溯验收 `[P0]`
**The system shall** satisfy: every E2E step has a screenshot, Console error-free, Network no failed requests.
- Source: §20.9

---

## 18. 遗留事项（来自迁移现状）

### REQ-180 关系表新增后校验扩展 `[P1]`
**The system shall** extend the "add-then-save-then-reopen-validate" flow to more relationship types.
- Source: §19

### REQ-181 Relationship View Tab 覆盖 `[P1]`
**The system shall** extend the Relationship View Tab to more real business pages beyond the signing record page.
- Source: §19

### REQ-182 File Preview 真实回归 `[P1]`
**The system shall** complete the File Preview page with real `File` data and a full regression chain.
- Source: §19

### REQ-183 定义编辑页 Failed to fetch 排查 `[P2]`
**The system shall** confirm whether the occasional `Failed to fetch` warning after saving on the definition edit page is page-switch-induced request-cancel noise.
- Source: §19

---

## 19. INCOSE 语义质量自检

| 质量维度 | 状态 |
| --- | --- |
| 唯一性（每条需求一个明确 ID） | 已满足 |
| 完整性（覆盖原始需求 §0–§20） | 已满足 |
| 可追溯（每条标注 `Source:`） | 已满足 |
| 一致性（无相互冲突） | 已满足 |
| 可验证（每条可被测试/检查） | 已满足 |
| 可行性（在选定技术栈下可实现） | 已满足 |
| 无歧义（EARS 关键字限定） | 已满足 |
| 必要性（无冗余/无重复） | 已满足 |

---

> 下一步：以本文档为输入生成 `design.md`（技术方案）与 `tasklist.md`（任务拆解）。
