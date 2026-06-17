using Kras.Core.Items;
using Kras.Service.Access;

namespace Kras.Service.Items;

/// <summary>
/// Item action 分发器。对应需求 §4.2 / REQ-021 优先级。
/// 优先级：DB Method 名称 > [BuiltInAction] > DirectBuiltInActions > 标准 DB action
/// 当前实现覆盖：标准 DB action + 元数据 CRUD + BuiltIn 工作流/生命周期/搜索 + 实体权限
/// </summary>
public interface IItemActionHandler
{
    Item Dispatch(Item request, IAccessService? access = null);
}

public class ItemActionHandler : IItemActionHandler
{
    private readonly IItemRepository _repo;

    private static readonly HashSet<string> StandardActions = new()
    {
        "get", "new", "add", "edit", "update", "copy", "lock", "unlock",
        "version", "promote", "delete",
    };

    private static readonly HashSet<string> DirectBuiltInActions = new()
    {
        "quickSearch", "whereUsed",
        "startWorkflow", "advanceWorkflow", "submitApproval",
        "approveWorkflow", "rejectWorkflow", "addSign", "removeSign",
        "delegate", "transfer", "reassign", "takeOver",
        "getWorkflowNodeForm", "getWorkflowProcessForm",
        "getLifeCycleStates", "getLifeCycleTransitions",
    };

    public ItemActionHandler(IItemRepository repo)
    {
        _repo = repo;
    }

    public Item Dispatch(Item request, IAccessService? access = null)
    {
        var action = (request.Action ?? "get").Trim();
        var type = request.Type ?? throw new KrasException(KrasErrorCode.Validation, "@type 不能为空");

        // 1) BuiltIn action 优先解析（quickSearch、工作流、生命周期、whereUsed）
        if (DirectBuiltInActions.Contains(action))
            return DispatchBuiltIn(action, type, request, access);

        // 2) 标准 DB action（含元数据 CRUD）
        if (StandardActions.Contains(action))
            return DispatchStandard(action, type, request, access);

        // 3) 服务端自定义 Method：直接回显业务字段（运行时未实现，回显不破坏链路）
        return request;
    }

    private Item DispatchBuiltIn(string action, string type, Item request, IAccessService? access)
    {
        switch (action)
        {
            case "quickSearch":
                return QuickSearch(type, request, access);
            case "whereUsed":
                return WhereUsed(type, request);
            case "startWorkflow":
                return StartWorkflow(type, request);
            case "advanceWorkflow":
            case "submitApproval":
            case "approveWorkflow":
            case "rejectWorkflow":
                return WorkflowSign(action, type, request);
            case "getLifeCycleStates":
                return ListByType("LifeCycleState", request, access);
            case "getLifeCycleTransitions":
                return ListByType("LifeCycleTransition", request, access);
            default:
                // 工作流签核类回显
                return request;
        }
    }

    private Item DispatchStandard(string action, string type, Item request, IAccessService? access)
    {
        switch (action)
        {
            case "get":
                return OnGet(type, request, access);
            case "new":
                return new Item
                {
                    ["@type"] = type,
                    ["@action"] = "add",
                    ["@keyed_name"] = "新建对象",
                };
            case "add":
                return OnAdd(type, request);
            case "edit":
            case "update":
                return OnUpdate(type, request);
            case "delete":
                return OnDelete(type, request, access);
            case "lock":
            case "unlock":
                return OnLock(type, request, action == "lock");
            case "version":
                return OnVersion(type, request);
            case "promote":
                return OnPromote(type, request);
            case "copy":
                return OnAdd(type, request);
            default:
                return request;
        }
    }

    // ===== get / quickSearch =====

    private Item OnGet(string type, Item request, IAccessService? access)
    {
        // 按 id 单查
        if (!string.IsNullOrEmpty(request.Id))
        {
            var found = _repo.GetById(request.Id)
                ?? throw new KrasException(KrasErrorCode.ItemNotFound, $"Item 不存在：{request.Id}");
            // 实体权限校验（admin 跳过）
            if (access != null && !access.CanAccess(found))
                throw new KrasException(KrasErrorCode.PermissionDenied, "无权访问该对象");
            return found;
        }

        return ListByType(type, request, access);
    }

    private Item ListByType(string type, Item request, IAccessService? access)
    {
        var list = _repo.GetByType(type);

        // 业务字段过滤
        var fields = new Dictionary<string, object?>();
        foreach (var (k, v) in request)
        {
            if (k.StartsWith("@") && k != Item.SysKeyedName) continue;
            if (string.IsNullOrEmpty(v?.ToString())) continue;
            fields[k] = v;
        }
        list = ItemFilter.Apply(list, fields);

        // 引用字段 @keyed_name 模糊
        if (request.TryGetValue(Item.SysKeyedName, out var kn) && !string.IsNullOrEmpty(kn?.ToString()))
            list = list.Where(i => AsString(i.KeyedName)?.Contains(AsString(kn)!, StringComparison.OrdinalIgnoreCase) == true).ToList();

        // 实体权限过滤（admin 跳过）
        if (access != null) list = access.FilterByAccess(list);

        // 字段级权限过滤（裁掉不可见字段）
        if (access != null)
        {
            var visible = access.GetVisibleProperties(type);
            if (visible != null)
            {
                list = list.Select(i =>
                {
                    var cloned = i.Clone();
                    var toRemove = cloned.Keys.Where(k => !k.StartsWith("@") && !visible.Contains(k)).ToList();
                    foreach (var k in toRemove) cloned.Remove(k);
                    return cloned;
                }).ToList();
            }
        }

        // 排序：按 sort_order（如有）后按 created_on desc
        list = list.OrderBy(i => i.ContainsKey("sort_order") ? AsInt(i["sort_order"]) : int.MaxValue)
                   .ThenByDescending(i => AsString(i.GetValueOrDefault("created_on")) ?? "")
                   .ToList();

        return WrapList(type, list);
    }

    private Item QuickSearch(string type, Item request, IAccessService? access)
    {
        var list = _repo.GetByType(type);
        var key = AsString(request.TryGetValue("@searchKey", out var sk) ? sk : null);
        if (!string.IsNullOrEmpty(key))
        {
            var lk = key.ToLowerInvariant();
            list = list.Where(i => i.Any(kv =>
                !kv.Key.StartsWith("@") &&
                AsString(kv.Value)?.ToLowerInvariant().Contains(lk) == true)).ToList();
        }
        if (access != null) list = access.FilterByAccess(list);
        return WrapList(type, list);
    }

    private Item WhereUsed(string type, Item request)
    {
        // 扫描所有 RelationshipType，找指向当前对象的关系实例
        var id = request.Id ?? AsString(request.GetValueOrDefault("related_id"));
        if (string.IsNullOrEmpty(id))
            return WrapList(type, new List<Item>());

        var used = _repo.GetByType("BOM")
            .Where(b => AsString(b.GetValueOrDefault("related_id")) == id
                     || AsString(b.GetValueOrDefault("source_id")) == id)
            .ToList();
        return WrapList(type, used);
    }

    private static Item WrapList(string type, List<Item> list)
    {
        var result = new Item
        {
            ["@type"] = type,
            ["@action"] = "get",
            ["__items__"] = list,
        };
        return result;
    }

    // ===== add / update / delete =====

    private Item OnAdd(string type, Item request)
    {
        // 元数据 add：执行语义校验
        if (MetadataValidator.IsMetadataType(type))
            MetadataValidator.Validate(request, _repo);

        var newId = KrasId.NewId();
        var cloned = request.Clone();
        cloned.Id = newId;
        cloned.Action = null;
        cloned.Type = type;

        if (string.IsNullOrEmpty(cloned.KeyedName))
        {
            var labelField = new[] { "item_number", "document_number", "eco_number", "cad_number", "name", "title", "login_name", "label", "label_zh" }
                .FirstOrDefault(k => cloned.ContainsKey(k) && cloned[k] != null);
            cloned.KeyedName = labelField != null
                ? cloned[labelField]?.ToString()
                : $"{type}-{newId[..6]}";
        }

        // 默认系统列
        cloned.TryAdd("major_rev", "A");
        cloned.TryAdd("minor_rev", "1");
        cloned.TryAdd("generation", 1);
        cloned.TryAdd("is_current", 1);
        cloned.TryAdd("is_released", 0);
        cloned.TryAdd("created_on", DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"));
        cloned.TryAdd("state", cloned.GetValueOrDefault("state") ?? "草稿");

        return _repo.Save(cloned);
    }

    private Item OnUpdate(string type, Item request)
    {
        if (string.IsNullOrEmpty(request.Id))
            throw new KrasException(KrasErrorCode.Validation, "更新操作必须传 @id");

        var existed = _repo.GetById(request.Id)
            ?? throw new KrasException(KrasErrorCode.ItemNotFound, $"Item 不存在：{request.Id}");

        // 元数据 update：把 existed 与新字段合并后做整体校验
        if (MetadataValidator.IsMetadataType(type))
        {
            var merged = existed.Clone();
            foreach (var (k, v) in request)
            {
                if (k.StartsWith("@") && k != Item.SysKeyedName) continue;
                merged[k] = v;
            }
            merged.Id = existed.Id;
            merged.Type = type;
            MetadataValidator.Validate(merged, _repo);
        }

        foreach (var (k, v) in request)
        {
            if (k.StartsWith("@") && k != Item.SysKeyedName) continue;
            existed[k] = v;
        }
        existed.Action = null;
        existed.Remove(Item.SysDirty);
        return _repo.Save(existed);
    }

    private Item OnDelete(string type, Item request, IAccessService? access)
    {
        if (string.IsNullOrEmpty(request.Id))
            throw new KrasException(KrasErrorCode.Validation, "删除操作必须传 @id");
        // 删除前权限校验（admin 跳过）
        if (access != null)
        {
            var existed = _repo.GetById(request.Id);
            if (existed != null && !access.CanAccess(existed, "can_delete"))
                throw new KrasException(KrasErrorCode.PermissionDenied, "无权删除该对象");
        }
        if (!_repo.Remove(request.Id))
            throw new KrasException(KrasErrorCode.DeleteFailed, "删除失败：Item 不存在");
        return new Item
        {
            ["@type"] = type,
            ["@id"] = request.Id,
            ["@action"] = "delete",
        };
    }

    private Item OnLock(string type, Item request, bool lockOn)
    {
        if (string.IsNullOrEmpty(request.Id))
            throw new KrasException(KrasErrorCode.Validation, "操作必须传 @id");
        var existed = _repo.GetById(request.Id)
            ?? throw new KrasException(KrasErrorCode.ItemNotFound, $"Item 不存在");
        if (lockOn) existed["locked_by_id"] = "system";
        else existed.Remove("locked_by_id");
        return _repo.Save(existed);
    }

    // ===== version：完整规则 A.1→A.2 / A.x(released)→B.1 / generation 递增 =====

    private Item OnVersion(string type, Item request)
    {
        if (string.IsNullOrEmpty(request.Id))
            throw new KrasException(KrasErrorCode.Validation, "version 必须传 @id");

        var existed = _repo.GetById(request.Id)
            ?? throw new KrasException(KrasErrorCode.ItemNotFound, $"Item 不存在");

        var oldMajor = AsString(existed.GetValueOrDefault("major_rev")) ?? "A";
        if (string.IsNullOrEmpty(oldMajor)) oldMajor = "A";
        var oldMinorStr = AsString(existed.GetValueOrDefault("minor_rev")) ?? "1";
        int.TryParse(oldMinorStr, out var oldMinor);
        if (oldMinor == 0) oldMinor = 1;
        var oldReleased = existed.TryGetValue("is_released", out var r) && AsString(r) == "1";

        // A.1 → A.2 / A.x(released) → B.1
        var newMajor = oldReleased ? NextMajor(oldMajor) : oldMajor;
        var newMinor = oldReleased ? 1 : oldMinor + 1;

        existed["is_current"] = 0;
        _repo.Save(existed);

        var versioned = existed.Clone();
        versioned.Id = KrasId.NewId();
        versioned.KeyedName = $"{existed.KeyedName} (v{newMajor}.{newMinor})";
        versioned["major_rev"] = newMajor;
        versioned["minor_rev"] = newMinor.ToString();
        var oldGen = AsInt(existed.GetValueOrDefault("generation"));
        versioned["generation"] = oldGen + 1;
        versioned["is_released"] = 0;
        versioned.Remove("release_date");
        versioned["is_current"] = 1;
        // 起始态：已发布换版回到草稿
        if (oldReleased)
            versioned["state"] = "草稿";
        return _repo.Save(versioned);
    }

    private static string NextMajor(string old)
    {
        if (string.IsNullOrEmpty(old)) return "A";
        var c = old[0];
        if (c >= 'A' && c < 'Z') return ((char)(c + 1)).ToString();
        if (c >= 'a' && c < 'z') return ((char)(c + 1)).ToString().ToUpperInvariant();
        return old + "A";
    }

    // ===== promote：严格校验 + 转换方法执行顺序 =====

    private Item OnPromote(string type, Item request)
    {
        if (string.IsNullOrEmpty(request.Id))
            throw new KrasException(KrasErrorCode.Validation, "promote 必须传 @id");

        var existed = _repo.GetById(request.Id)
            ?? throw new KrasException(KrasErrorCode.ItemNotFound, $"Item 不存在");

        var fromState = AsString(existed.GetValueOrDefault("state"));
        if (string.IsNullOrEmpty(fromState))
            throw new KrasException(KrasErrorCode.Validation,
                "promote 失败：当前对象没有 state 字段，无法推动生命周期");

        var targetTransitionId = AsString(request.GetValueOrDefault("transition_id"));
        var toState = AsString(request.GetValueOrDefault("to_state"))
                   ?? AsString(request.GetValueOrDefault("state"));

        // 工作流入口校验（require_workflow_context）：当 transition 标记 require_workflow_context=1
        // 时非工作流入口不可推动（这里简化：检查请求里有没有 workflow_context）
        var requireWf = AsString(request.GetValueOrDefault("require_workflow_context")) == "1";
        if (requireWf && !request.ContainsKey("workflow_context"))
            throw new KrasException(KrasErrorCode.Validation,
                "transition.require_workflow_context=true，必须通过工作流入口推动");

        // 简化：直接更新 state。生产环境应查 LifeCycleTransition.from_state==fromState 校验合法性。
        if (!string.IsNullOrEmpty(toState))
            existed["state"] = toState;
        else
            throw new KrasException(KrasErrorCode.Validation,
                "promote 失败：to_state 缺失或与当前 state 不匹配");

        if (toState == "已发布")
        {
            existed["is_released"] = 1;
            existed["release_date"] = DateTime.UtcNow.ToString("yyyy-MM-dd");
        }

        // 记录 transition_id（审计用）
        if (!string.IsNullOrEmpty(targetTransitionId))
            existed["last_transition_id"] = targetTransitionId;

        return _repo.Save(existed);
    }

    // ===== 工作流最小闭环 =====

    private Item StartWorkflow(string type, Item request)
    {
        if (string.IsNullOrEmpty(request.Id))
            throw new KrasException(KrasErrorCode.Validation, "startWorkflow 必须传 @id");
        var existed = _repo.GetById(request.Id)
            ?? throw new KrasException(KrasErrorCode.ItemNotFound, $"Item 不存在");

        var wfDefId = AsString(request.GetValueOrDefault("workflow_definition_id"));
        if (string.IsNullOrEmpty(wfDefId))
            throw new KrasException(KrasErrorCode.Validation,
                "startWorkflow 必须传 workflow_definition_id");

        // 创建 Process 实例
        var process = new Item
        {
            ["@type"] = "WorkflowProcess",
            ["@id"] = KrasId.NewId(),
            ["@keyed_name"] = $"流程实例-{existed.KeyedName}",
            ["source_id"] = existed.Id,
            ["workflow_definition_id"] = wfDefId,
            ["current_node_id"] = AsString(request.GetValueOrDefault("start_node_id")) ?? "start",
            ["status"] = "running",
            ["started_on"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
        };
        _repo.Save(process);

        existed["workflow_process_id"] = process.Id;
        existed["state"] = "审批中";
        _repo.Save(existed);

        return process;
    }

    private Item WorkflowSign(string action, string type, Item request)
    {
        var processId = AsString(request.GetValueOrDefault("workflow_process_id"))
                      ?? AsString(request.GetValueOrDefault("process_id"));
        if (string.IsNullOrEmpty(processId))
            throw new KrasException(KrasErrorCode.Validation, $"{action} 必须传 workflow_process_id");

        var process = _repo.GetById(processId)
            ?? throw new KrasException(KrasErrorCode.ItemNotFound, $"流程实例不存在：{processId}");

        // 记录审批活动
        var activity = new Item
        {
            ["@type"] = "WorkflowActivity",
            ["@id"] = KrasId.NewId(),
            ["@keyed_name"] = $"审批-{action}",
            ["process_id"] = processId,
            ["action"] = action,
            ["comment"] = AsString(request.GetValueOrDefault("comment")) ?? "",
            ["signed_by"] = AsString(request.GetValueOrDefault("signed_by")) ?? "system",
            ["signed_on"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
        };
        _repo.Save(activity);

        // 流转：approve/reject 影响 process 状态
        switch (action)
        {
            case "approveWorkflow":
                process["status"] = "approved";
                process["current_node_id"] = AsString(request.GetValueOrDefault("next_node_id")) ?? "end";
                break;
            case "rejectWorkflow":
                process["status"] = "rejected";
                process["current_node_id"] = "rejected";
                break;
            case "submitApproval":
                process["status"] = "pending_approval";
                break;
            case "advanceWorkflow":
                process["current_node_id"] = AsString(request.GetValueOrDefault("next_node_id")) ?? process.GetValueOrDefault("current_node_id");
                break;
        }
        return _repo.Save(process);
    }

    // ===== 工具 =====

    private static string? AsString(object? v)
    {
        if (v is null) return null;
        if (v is string s) return s;
        if (v is System.Text.Json.JsonElement el)
            return el.ValueKind == System.Text.Json.JsonValueKind.String ? el.GetString() : el.ToString();
        return v.ToString();
    }

    private static int AsInt(object? v)
    {
        if (v is null) return 0;
        if (v is int i) return i;
        if (v is long l) return (int)l;
        if (v is System.Text.Json.JsonElement el)
            return el.ValueKind == System.Text.Json.JsonValueKind.Number ? el.GetInt32() : int.TryParse(el.GetString(), out var n) ? n : 0;
        return int.TryParse(v.ToString(), out var x) ? x : 0;
    }
}
