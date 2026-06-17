using Kras.Core.Items;

namespace Kras.Service.Items;

/// <summary>
/// 元数据语义校验。对应需求 REQ-011 / REQ-012。
/// data_type=list → data_source = List.id
/// data_type=item → data_source = ItemType.id
/// data_type=foreign → data_source = Property.id（目标 Property.data_type=item 且 source 一致），foreign_property 指向目标 ItemType 下某 Property.id
/// RelationshipType 三元关系：relationship_id 必填，缺失/无效报错
/// </summary>
public static class MetadataValidator
{
    /// <summary>所有元数据类型集合（这些类型本身的 CRUD 走元数据分支）。</summary>
    public static readonly HashSet<string> MetadataTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "ItemType", "Property", "RelationshipType",
        "List", "ListValue", "View", "Form", "Permission",
        "LifeCycleDefinition", "WorkflowDefinition", "Method",
        "LifeCycleState", "LifeCycleTransition",
        "WorkflowNode", "WorkflowEdge", "WorkflowPath",
    };

    public static bool IsMetadataType(string? type)
        => type != null && MetadataTypes.Contains(type);

    /// <summary>
    /// 对 add/update 的元数据 Item 执行语义校验。失败抛 KrasException。
    /// </summary>
    public static void Validate(Item item, IItemRepository repo)
    {
        var type = item.Type ?? "";
        switch (type)
        {
            case "Property":
                ValidateProperty(item, repo);
                break;
            case "RelationshipType":
                ValidateRelationshipType(item, repo);
                break;
            case "ItemType":
                ValidateItemType(item, repo);
                break;
        }
    }

    private static void ValidateItemType(Item item, IItemRepository repo)
    {
        var name = AsString(item.GetValueOrDefault("name"));
        if (string.IsNullOrWhiteSpace(name))
            throw new KrasException(KrasErrorCode.Validation, "ItemType.name 必填");

        // name 全局唯一（除自身）
        var selfId = item.Id;
        var allItemTypes = repo.GetByType("ItemType");
        if (allItemTypes.Any(t =>
            AsString(t.GetValueOrDefault("name"))?.Equals(name, StringComparison.OrdinalIgnoreCase) == true
            && t.Id != selfId))
        {
            throw new KrasException(KrasErrorCode.Conflict, $"ItemType.name 已存在：{name}");
        }
    }

    private static void ValidateProperty(Item item, IItemRepository repo)
    {
        var name = AsString(item.GetValueOrDefault("name"));
        var sourceId = AsString(item.GetValueOrDefault("source_id"));
        var dataType = AsString(item.GetValueOrDefault("data_type"))?.ToLowerInvariant() ?? "string";
        var dataSource = AsString(item.GetValueOrDefault("data_source"));
        var foreignProperty = AsString(item.GetValueOrDefault("foreign_property"));

        if (string.IsNullOrWhiteSpace(name))
            throw new KrasException(KrasErrorCode.Validation, "Property.name 必填");
        if (string.IsNullOrWhiteSpace(sourceId))
            throw new KrasException(KrasErrorCode.Validation, "Property.source_id 必填（所属 ItemType）");

        // 同一 ItemType 下 name 唯一
        var selfId = item.Id;
        var siblings = repo.GetByType("Property")
            .Where(p => AsString(p.GetValueOrDefault("source_id")) == sourceId);
        if (siblings.Any(p =>
            AsString(p.GetValueOrDefault("name"))?.Equals(name, StringComparison.OrdinalIgnoreCase) == true
            && p.Id != selfId))
        {
            throw new KrasException(KrasErrorCode.Conflict, $"字段名已存在：{name}");
        }

        // data_type 语义约束
        switch (dataType)
        {
            case "list":
                if (string.IsNullOrWhiteSpace(dataSource))
                    throw new KrasException(KrasErrorCode.Validation,
                        "data_type=list 时 data_source 必填（指向 List.id）");
                if (!ExistsIn(repo, "List", dataSource))
                    throw new KrasException(KrasErrorCode.Validation,
                        $"data_source 不是有效的 List.id：{dataSource}");
                break;

            case "item":
                if (string.IsNullOrWhiteSpace(dataSource))
                    throw new KrasException(KrasErrorCode.Validation,
                        "data_type=item 时 data_source 必填（指向 ItemType.id）");
                if (!ExistsIn(repo, "ItemType", dataSource))
                    throw new KrasException(KrasErrorCode.Validation,
                        $"data_source 不是有效的 ItemType.id：{dataSource}");
                break;

            case "foreign":
                if (string.IsNullOrWhiteSpace(dataSource))
                    throw new KrasException(KrasErrorCode.Validation,
                        "data_type=foreign 时 data_source 必填（指向 Property.id，目标 Property.data_type=item）");
                var targetProp = repo.GetById(dataSource);
                if (targetProp == null || AsString(targetProp.GetValueOrDefault("data_type"))?.ToLowerInvariant() != "item")
                    throw new KrasException(KrasErrorCode.Validation,
                        $"data_source 指向的 Property 必须 data_type=item：{dataSource}");
                if (AsString(targetProp.GetValueOrDefault("source_id")) != sourceId)
                    throw new KrasException(KrasErrorCode.Validation,
                        "data_source 指向的 Property.source_id 必须等于当前 Property.source_id");

                if (string.IsNullOrWhiteSpace(foreignProperty))
                    throw new KrasException(KrasErrorCode.Validation,
                        "data_type=foreign 时 foreign_property 必填");
                var targetItemType = AsString(targetProp.GetValueOrDefault("data_source"));
                if (targetItemType == null
                    || !repo.GetByType("Property").Any(p =>
                        p.Id == foreignProperty
                        && AsString(p.GetValueOrDefault("source_id")) == targetItemType))
                    throw new KrasException(KrasErrorCode.Validation,
                        $"foreign_property 必须指向目标 ItemType 下的 Property.id：{foreignProperty}");
                break;
        }
    }

    private static void ValidateRelationshipType(Item item, IItemRepository repo)
    {
        var name = AsString(item.GetValueOrDefault("name"));
        var sourceId = AsString(item.GetValueOrDefault("source_id"));
        var relatedId = AsString(item.GetValueOrDefault("related_id"));
        var relationshipId = AsString(item.GetValueOrDefault("relationship_id"));

        if (string.IsNullOrWhiteSpace(name))
            throw new KrasException(KrasErrorCode.Validation, "RelationshipType.name 必填");
        if (string.IsNullOrWhiteSpace(sourceId))
            throw new KrasException(KrasErrorCode.Validation, "source_id 必填");
        if (string.IsNullOrWhiteSpace(relatedId))
            throw new KrasException(KrasErrorCode.Validation, "related_id 必填");

        // relationship_id 必填且必须是合法的 ItemType.id
        if (string.IsNullOrWhiteSpace(relationshipId))
            throw new KrasException(KrasErrorCode.Validation,
                "relationship_id 必填（关系对象类型 ItemType.id），不允许缺失");
        if (!ExistsIn(repo, "ItemType", relationshipId))
            throw new KrasException(KrasErrorCode.Validation,
                $"relationship_id 不是有效的 ItemType.id：{relationshipId}");
    }

    private static bool ExistsIn(IItemRepository repo, string type, string id)
    {
        return repo.GetByType(type).Any(t => t.Id == id)
            || (repo.GetById(id)?.Type == type);
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
