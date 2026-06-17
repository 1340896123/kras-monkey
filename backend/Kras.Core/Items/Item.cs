using System.Text.Json;
using System.Text.Json.Serialization;

namespace Kras.Core.Items;

/// <summary>
/// Item 协议载荷（AML 兼容）。业务属性在顶层，系统属性以 @ 前缀。
/// 对应需求 §4.1。
/// </summary>
public class Item : Dictionary<string, object?>
{
    public const string SysType = "@type";
    public const string SysId = "@id";
    public const string SysAction = "@action";
    public const string SysKeyedName = "@keyed_name";
    public const string SysRelationships = "@relationships";
    public const string SysSubmitRelationships = "@Relationships";
    public const string SysDirty = "@dirty";
    public const string SysError = "@error";
    public const string SysIsError = "@is_error";

    [JsonIgnore]
    public string? Type
    {
        get => TryGetValue(SysType, out var v) ? AsString(v) : null;
        set => this[SysType] = value;
    }

    [JsonIgnore]
    public string? Id
    {
        get => TryGetValue(SysId, out var v) ? AsString(v) : null;
        set => this[SysId] = value;
    }

    [JsonIgnore]
    public string? Action
    {
        get => TryGetValue(SysAction, out var v) ? AsString(v) : null;
        set => this[SysAction] = value;
    }

    [JsonIgnore]
    public string? KeyedName
    {
        get => TryGetValue(SysKeyedName, out var v) ? AsString(v) : null;
        set => this[SysKeyedName] = value;
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

    public bool IsError => this.TryGetValue(SysIsError, out var v) && v?.ToString() == "1";

    /// <summary>
    /// 序列化为 JSON，所有键原样保留（@ 前缀也保留）。
    /// </summary>
    public string ToJson(JsonSerializerOptions? options = null) =>
        JsonSerializer.Serialize(this, options ?? JsonOpts.Default);

    public static Item FromJson(string json, JsonSerializerOptions? options = null) =>
        JsonSerializer.Deserialize<Item>(json, options ?? JsonOpts.Default)
            ?? new Item();

    public Item Clone()
    {
        var clone = new Item();
        foreach (var (k, v) in this)
        {
            clone[k] = v is Item nested ? nested.Clone() : v;
        }
        return clone;
    }
}

public static class JsonOpts
{
    public static readonly JsonSerializerOptions Default = new()
    {
        PropertyNamingPolicy = null,
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
        WriteIndented = false,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };
}
