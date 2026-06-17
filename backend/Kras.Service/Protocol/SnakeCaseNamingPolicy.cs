using System.Text.Json;

namespace Kras.Service.Protocol;

/// <summary>
/// Snake_case JSON 命名策略。前端契约统一 snake_case。
/// 对应需求 §1.3：字段名采用 snake_case。
/// </summary>
public class SnakeCaseNamingPolicy : JsonNamingPolicy
{
    public static new SnakeCaseNamingPolicy Instance { get; } = new();

    public override string ConvertName(string name)
    {
        if (string.IsNullOrEmpty(name)) return name;
        var sb = new System.Text.StringBuilder(name.Length + 4);
        for (var i = 0; i < name.Length; i++)
        {
            var c = name[i];
            if (char.IsUpper(c))
            {
                if (i > 0) sb.Append('_');
                sb.Append(char.ToLowerInvariant(c));
            }
            else
            {
                sb.Append(c);
            }
        }
        return sb.ToString();
    }
}
