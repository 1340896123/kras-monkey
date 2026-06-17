using Kras.Core.Items;

namespace Kras.Service.Access;

/// <summary>
/// 实体权限服务（简化版）。对应需求 REQ-013 / fn_CheckEntityAccess。
/// 三分支独立判定：owner / team / 显式 Access。team 不合并进 owner。
///
/// 真实 fn_CheckEntityAccess 走 SQL TVF；这里基于 Item 的 owned_by_id / team_id / access 列做内存判定，
/// 因为当前是 InMemoryRepo 演示。
/// </summary>
public interface IAccessService
{
    /// <summary>检查当前用户对单 Item 是否有指定权限。</summary>
    bool CanAccess(Item item, string accessLevel = "can_view");

    /// <summary>检查当前用户是否能查看整个 ItemType。</summary>
    bool CanViewItemType(string itemTypeId);

    /// <summary>对列表应用过滤：剔除当前用户无权访问的项。</summary>
    List<Item> FilterByAccess(List<Item> items);

    /// <summary>字段级权限：返回当前用户对该 ItemType 可见的 Property 名集合。null 表示无限制。</summary>
    HashSet<string>? GetVisibleProperties(string itemTypeName);
}

public class AccessService : IAccessService
{
    private readonly AccessContext _ctx;

    public AccessService(AccessContext ctx)
    {
        _ctx = ctx;
    }

    public bool CanAccess(Item item, string accessLevel = "can_view")
    {
        // 未登录：拒绝所有
        if (!_ctx.IsAuthenticated) return false;
        // admin 全权
        if (_ctx.IsAdmin) return true;

        var ownedBy = AsString(item.GetValueOrDefault("owned_by_id"));
        var teamId = AsString(item.GetValueOrDefault("team_id"));
        var createdBy = AsString(item.GetValueOrDefault("created_by_id"));

        // 分支 1：owner —— 仅基于 owned_by_id，不合并 team
        if (!string.IsNullOrEmpty(ownedBy) && _ctx.IdentityIds.Contains(ownedBy))
            return true;
        // 创建者默认可见自己创建的
        if (!string.IsNullOrEmpty(createdBy) && _ctx.IdentityIds.Contains(createdBy))
            return true;

        // 分支 2：team —— 独立分支
        if (!string.IsNullOrEmpty(teamId) && _ctx.TeamIds.Contains(teamId))
            return true;

        // 分支 3：显式 Access —— Item.access_identity_ids 字段，逗号分隔
        var explicitAccess = AsString(item.GetValueOrDefault("access_identity_ids"));
        if (!string.IsNullOrEmpty(explicitAccess))
        {
            var ids = explicitAccess.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (ids.Any(id => _ctx.IdentityIds.Contains(id))) return true;
        }

        // 默认：无元数据声明的业务对象对所有已登录用户可见（演示友好）
        // 真实环境根据 Permission/Access 表决定
        if (string.IsNullOrEmpty(ownedBy) && string.IsNullOrEmpty(teamId) && string.IsNullOrEmpty(explicitAccess))
            return true;

        return false;
    }

    public bool CanViewItemType(string itemTypeId) => _ctx.IsAuthenticated;

    public List<Item> FilterByAccess(List<Item> items)
    {
        if (_ctx.IsAdmin) return items;
        return items.Where(i => CanAccess(i)).ToList();
    }

    public HashSet<string>? GetVisibleProperties(string itemTypeName)
    {
        // 演示版：admin 返回 null（无限制），其他角色也全部可见
        // 真实环境：查 Property.field_permission_id → Permission.access_can_view
        return null;
    }

    private static string? AsString(object? v)
    {
        if (v is null) return null;
        if (v is string s) return s;
        if (v is System.Text.Json.JsonElement el)
            return el.ValueKind == System.Text.Json.JsonValueKind.String ? el.GetString() : el.ToString();
        return v.ToString();
    }
}
