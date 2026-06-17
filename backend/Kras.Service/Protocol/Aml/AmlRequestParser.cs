using System.Text.Json;
using Kras.Core.Items;

namespace Kras.Service.Protocol.Aml;

/// <summary>
/// 严格 AML 请求解析器。请求必须是 { "AML": [...] } 形式。
/// 对应需求 §4.5 / §4.7。
/// </summary>
public class AmlRequest
{
    public List<Item> Items { get; set; } = new();
}

public static class AmlRequestParser
{
    public static AmlRequest Parse(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            throw new KrasException(KrasErrorCode.InvalidJson, "AML 请求体为空");

        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(json);
        }
        catch (JsonException ex)
        {
            throw new KrasException(KrasErrorCode.InvalidJson, $"AML JSON 解析失败：{ex.Message}");
        }

        if (!doc.RootElement.TryGetProperty("AML", out var amlEl) || amlEl.ValueKind != JsonValueKind.Array)
        {
            throw new KrasException(KrasErrorCode.InvalidJson, "AML 必须是 {\"AML\":[...]} 形式");
        }

        var items = new List<Item>();
        foreach (var el in amlEl.EnumerateArray())
        {
            var item = JsonSerializer.Deserialize<Item>(el.GetRawText(), JsonOpts.Default);
            if (item != null) items.Add(item);
        }
        return new AmlRequest { Items = items };
    }
}
