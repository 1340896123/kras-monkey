using System.Text.RegularExpressions;
using Kras.Core.Items;

namespace Kras.Service.Items;

/// <summary>
/// 过滤表达式解析（对应前端 metadataTable.normalizeFilterInput）。
/// 支持：name=*abc* / qty>100 / <2025/01/11 / exact=value
/// </summary>
public static class ItemFilter
{
    private static readonly Regex OpRegex = new(
        @"^([a-zA-Z_][a-zA-Z0-9_]*)(>=|<=|<>|!=|>|<|=)(.*)$",
        RegexOptions.Compiled);

    public static List<Item> Apply(List<Item> items, Dictionary<string, object?> fields)
    {
        foreach (var (field, rawValue) in fields)
        {
            if (rawValue is null) continue;
            var v = AsString(rawValue);
            if (string.IsNullOrEmpty(v)) continue;

            items = items.Where(item => MatchField(item, field, v)).ToList();
        }
        return items;
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

    private static bool MatchField(Item item, string field, string expr)
    {
        if (!item.TryGetValue(field, out var raw)) return false;
        if (raw is null) return false;

        var valueStr = AsString(raw) ?? string.Empty;

        // 引用对象：取 @id / @keyed_name
        if (raw is System.Text.Json.JsonElement el && el.ValueKind == System.Text.Json.JsonValueKind.Object)
        {
            if (el.TryGetProperty("@id", out var idProp)) valueStr = idProp.GetString() ?? valueStr;
            else if (el.TryGetProperty("@keyed_name", out var knProp)) valueStr = knProp.GetString() ?? valueStr;
        }
        else if (raw is IDictionary<string, object?> dict)
        {
            valueStr = (dict.TryGetValue("@id", out var id) ? id?.ToString() : null)
                       ?? (dict.TryGetValue("@keyed_name", out var kn) ? kn?.ToString() : null)
                       ?? valueStr;
        }

        // 通配符
        if (expr.Contains('*'))
        {
            var pattern = "^" + Regex.Escape(expr).Replace("\\*", ".*") + "$";
            return Regex.IsMatch(valueStr, pattern, RegexOptions.IgnoreCase);
        }

        // 数值比较
        if (expr.StartsWith(">") || expr.StartsWith("<") || expr.StartsWith(">=") || expr.StartsWith("<="))
        {
            return NumericCompare(valueStr, expr);
        }

        // 精确匹配（不区分大小写）
        return string.Equals(valueStr, expr, StringComparison.OrdinalIgnoreCase);
    }

    private static bool NumericCompare(string value, string expr)
    {
        var match = OpRegex.Match($"x{expr}");
        if (!match.Success) return false;
        var op = match.Groups[2].Value;
        var rhsStr = match.Groups[3].Value;

        if (decimal.TryParse(value, out var lhs) && decimal.TryParse(rhsStr, out var rhs))
        {
            return op switch
            {
                ">" => lhs > rhs,
                "<" => lhs < rhs,
                ">=" => lhs >= rhs,
                "<=" => lhs <= rhs,
                _ => false,
            };
        }
        // 日期比较
        if (DateTime.TryParse(value, out var ld) && DateTime.TryParse(rhsStr, out var rd))
        {
            return op switch
            {
                ">" => ld > rd,
                "<" => ld < rd,
                ">=" => ld >= rd,
                "<=" => ld <= rd,
                _ => false,
            };
        }
        return op switch
        {
            ">" => string.Compare(value, rhsStr, StringComparison.Ordinal) > 0,
            "<" => string.Compare(value, rhsStr, StringComparison.Ordinal) < 0,
            _ => false,
        };
    }
}
