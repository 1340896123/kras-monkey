using Kras.Core.Items;

namespace Kras.Service.Items;

/// <summary>
/// Item action 分发器。对应需求 §4.2 优先级与标准动作。
/// 优先级：DB Method 名称 > [BuiltInAction] > DirectBuiltInActions > 标准 DB action
/// 当前实现：标准 DB action（get/new/add/edit/update/delete/lock/unlock/version/promote）
/// </summary>
public interface IItemActionHandler
{
    Item Dispatch(Item request);
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
        "quickSearch", "startWorkflow", "advanceWorkflow", "submitApproval",
        "approveWorkflow", "rejectWorkflow", "addSign", "removeSign",
        "delegate", "transfer", "reassign", "takeOver",
        "getWorkflowNodeForm", "getWorkflowProcessForm",
    };

    public ItemActionHandler(IItemRepository repo)
    {
        _repo = repo;
    }

    public Item Dispatch(Item request)
    {
        var action = request.Action ?? "get";
        var type = request.Type ?? throw new KrasException(KrasErrorCode.Validation, "@type 不能为空");

        // 元数据查询：返回种子数据
        if (IsMetadataType(type))
        {
            return DispatchMetadata(type, request);
        }

        // 标准 DB action 分发
        if (StandardActions.Contains(action))
        {
            return DispatchStandard(action, type, request);
        }

        // BuiltInAction：当前回显原对象
        if (DirectBuiltInActions.Contains(action))
        {
            return request;
        }

        // 服务端 Method 名称（当前未实现，回显）
        return request;
    }

    private bool IsMetadataType(string type)
    {
        return type is "ItemType" or "Property" or "RelationshipType"
            or "List" or "View" or "Permission";
    }

    private Item DispatchMetadata(string type, Item request)
    {
        var list = _repo.GetByType(type);
        // 列表返回：包装为返回数组在 envelope.data 层
        var result = new Item
        {
            ["@type"] = type,
            ["@action"] = "get",
            ["__items__"] = list,
        };
        return result;
    }

    private Item DispatchStandard(string action, string type, Item request)
    {
        switch (action)
        {
            case "get":
                return OnGet(type, request);
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
                return OnDelete(type, request);
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

    private Item OnGet(string type, Item request)
    {
        // 按 id 单查
        if (request.Id != null)
        {
            var found = _repo.GetById(request.Id)
                ?? throw new KrasException(KrasErrorCode.ItemNotFound, $"Item 不存在：{request.Id}");
            return found;
        }

        // 列表查询
        var list = _repo.GetByType(type);

        // 应用过滤（包括 @keyed_name 这种带前缀的引用查询）
        var fields = new Dictionary<string, object?>();
        foreach (var (k, v) in request)
        {
            if (k.StartsWith("@") && k != Item.SysKeyedName) continue;
            if (string.IsNullOrEmpty(v?.ToString())) continue;
            fields[k] = v;
        }
        list = ItemFilter.Apply(list, fields);

        // quickSearch 语义
        if (request.TryGetValue("@searchKey", out var sk))
        {
            var key = AsString(sk);
            if (!string.IsNullOrEmpty(key))
            {
                var lk = key.ToLowerInvariant();
                list = list.Where(i => i.Any(kv =>
                    !kv.Key.StartsWith("@") &&
                    AsString(kv.Value)?.ToLowerInvariant().Contains(lk) == true)).ToList();
            }
        }

        // 用 __items__ 包装，控制器层展开为数组
        var result = new Item
        {
            ["@type"] = type,
            ["@action"] = "get",
            ["__items__"] = list,
        };
        return result;
    }

    private static string? AsString(object? v)
    {
        if (v is null) return null;
        if (v is string s) return s;
        if (v is System.Text.Json.JsonElement el)
        {
            return el.ValueKind == System.Text.Json.JsonValueKind.String ? el.GetString() : el.ToString();
        }
        return v.ToString();
    }

    private static int AsInt(object? v)
    {
        if (v is null) return 0;
        if (v is int i) return i;
        if (v is long l) return (int)l;
        if (v is System.Text.Json.JsonElement el)
        {
            return el.ValueKind == System.Text.Json.JsonValueKind.Number ? el.GetInt32() : int.TryParse(el.GetString(), out var n) ? n : 0;
        }
        return int.TryParse(v.ToString(), out var x) ? x : 0;
    }

    private Item OnAdd(string type, Item request)
    {
        var newId = KrasId.NewId();
        var cloned = request.Clone();
        cloned.Id = newId;
        cloned.Action = null;
        cloned.Type = type;

        if (string.IsNullOrEmpty(cloned.KeyedName))
        {
            var labelField = new[] { "item_number", "document_number", "eco_number", "cad_number", "name", "title", "login_name" }
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
        cloned.TryAdd("created_on", DateTime.UtcNow.ToString("yyyy-MM-dd"));

        return _repo.Save(cloned);
    }

    private Item OnUpdate(string type, Item request)
    {
        if (request.Id == null) throw new KrasException(KrasErrorCode.Validation, "更新操作必须传 @id");
        var existed = _repo.GetById(request.Id)
            ?? throw new KrasException(KrasErrorCode.ItemNotFound, $"Item 不存在：{request.Id}");

        foreach (var (k, v) in request)
        {
            if (k.StartsWith("@") && k != Item.SysKeyedName) continue;
            existed[k] = v;
        }
        existed.Action = null;
        existed.Remove(Item.SysDirty);
        return _repo.Save(existed);
    }

    private Item OnDelete(string type, Item request)
    {
        if (request.Id == null) throw new KrasException(KrasErrorCode.Validation, "删除操作必须传 @id");
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
        if (request.Id == null) throw new KrasException(KrasErrorCode.Validation, "操作必须传 @id");
        var existed = _repo.GetById(request.Id)
            ?? throw new KrasException(KrasErrorCode.ItemNotFound, $"Item 不存在");
        if (lockOn) existed["locked_by_id"] = "system";
        else existed.Remove("locked_by_id");
        return _repo.Save(existed);
    }

    private Item OnVersion(string type, Item request)
    {
        if (request.Id == null) throw new KrasException(KrasErrorCode.Validation, "version 必须传 @id");
        var existed = _repo.GetById(request.Id)
            ?? throw new KrasException(KrasErrorCode.ItemNotFound, $"Item 不存在");

        // 简化：实现 A.1 -> A.2 / 已发布则 B.1 规则
        var oldMajor = existed.TryGetValue("major_rev", out var mr) ? mr?.ToString() ?? "A" : "A";
        var oldMinorStr = existed.TryGetValue("minor_rev", out var mnr) ? mnr?.ToString() ?? "1" : "1";
        int.TryParse(oldMinorStr, out var oldMinor);
        var oldReleased = existed.TryGetValue("is_released", out var r) && r?.ToString() == "1";

        var newMajor = oldReleased ? ((char)(oldMajor[0] + 1)).ToString() : oldMajor;
        var newMinor = oldReleased ? 1 : oldMinor + 1;

        existed["is_current"] = 0;
        _repo.Save(existed);

        var versioned = existed.Clone();
        var newId = KrasId.NewId();
        versioned.Id = newId;
        versioned.KeyedName = $"{existed.KeyedName} (v{newMajor}.{newMinor})";
        versioned["major_rev"] = newMajor;
        versioned["minor_rev"] = newMinor.ToString();
        versioned["generation"] = AsInt(existed.TryGetValue("generation", out var g) ? g : null) + 1;
        versioned["is_released"] = 0;
        versioned.Remove("release_date");
        versioned["is_current"] = 1;
        return _repo.Save(versioned);
    }

    private Item OnPromote(string type, Item request)
    {
        if (request.Id == null) throw new KrasException(KrasErrorCode.Validation, "promote 必须传 @id");
        var existed = _repo.GetById(request.Id)
            ?? throw new KrasException(KrasErrorCode.ItemNotFound, $"Item 不存在");
        existed["lifecycle_state"] = "已发布";
        existed["is_released"] = 1;
        existed["release_date"] = DateTime.UtcNow.ToString("yyyy-MM-dd");
        return _repo.Save(existed);
    }
}
