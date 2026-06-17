using System.Text.Json;
using Kras.Core.Items;

namespace Kras.Service.Protocol.Parsing;

/// <summary>
/// 单 Item 请求解析器。把前端 JSON 解析为强类型请求对象。
/// 对应需求 §4.1 / design.md §4.3。
/// </summary>
public class ItemRequest
{
    public string? Type { get; set; }
    public string? Id { get; set; }
    public string? Action { get; set; }
    public Item Item { get; set; } = new();

    /// <summary>
    /// 业务字段（去掉 @ 系统前缀）。
    /// </summary>
    public Dictionary<string, object?> BusinessFields
    {
        get
        {
            var d = new Dictionary<string, object?>();
            foreach (var (k, v) in Item)
            {
                if (k.StartsWith("@")) continue;
                d[k] = v;
            }
            return d;
        }
    }
}

public static class ItemRequestParser
{
    public static ItemRequest Parse(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            throw new KrasException(KrasErrorCode.InvalidJson, "请求体为空");

        Item item;
        try
        {
            item = JsonSerializer.Deserialize<Item>(json, JsonOpts.Default)
                ?? throw new KrasException(KrasErrorCode.InvalidJson, "无法解析 Item");
        }
        catch (JsonException ex)
        {
            throw new KrasException(KrasErrorCode.InvalidJson, $"JSON 解析失败：{ex.Message}");
        }

        var req = new ItemRequest
        {
            Type = item.Type,
            Id = item.Id,
            Action = item.Action,
            Item = item,
        };
        Validate(req);
        return req;
    }

    /// <summary>
    /// 校验请求基本字段。供 [FromBody] 已解析对象复用。
    /// </summary>
    public static void Validate(ItemRequest request)
    {
        if (string.IsNullOrEmpty(request.Type))
            throw new KrasException(KrasErrorCode.Validation, "@type 不能为空");
    }
}
