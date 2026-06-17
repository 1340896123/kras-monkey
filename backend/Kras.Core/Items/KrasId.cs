using System.Globalization;
using System.Security.Cryptography;

namespace Kras.Core.Items;

/// <summary>
/// 32 位无连字符大写 ID 生成器。
/// 对应需求 §1.3：禁止复用第三方带连字符 UUID。
/// </summary>
public static class KrasId
{
    public static string NewId()
    {
        Span<byte> bytes = stackalloc byte[16];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToHexString(bytes.ToArray());
    }

    /// <summary>
    /// 用命名空间 key 生成稳定 ID（用于种子），与前端 hash32 实现兼容。
    /// </summary>
    public static string ForSeed(string key)
    {
        var input = System.Text.Encoding.UTF8.GetBytes("kras::" + key);
        Span<byte> hash = stackalloc byte[16];
        RandomNumberGenerator.Fill(hash);
        // FNV-ish 简化：用 key 与随机种子做位移
        ulong h1 = 0xcbf29ce484222325UL;
        ulong h2 = 0x84222325cbf29ce4UL;
        foreach (var b in input)
        {
            h1 = (h1 ^ b) * 0x100000001b3UL;
            h2 = (h2 ^ (uint)(b + 7)) * 0x100000001b3UL;
        }
        return (h1.ToString("X16", CultureInfo.InvariantCulture) + h2.ToString("X16", CultureInfo.InvariantCulture));
    }

    public static bool IsValid(string? id)
    {
        if (string.IsNullOrEmpty(id) || id.Length != 32) return false;
        foreach (var c in id)
        {
            if (!IsHexUpper(c)) return false;
        }
        return true;
    }

    private static bool IsHexUpper(char c) => (c >= '0' && c <= '9') || (c >= 'A' && c <= 'F');
}
