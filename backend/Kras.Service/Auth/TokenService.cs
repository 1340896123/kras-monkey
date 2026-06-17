using System.Security.Cryptography;
using System.Text;

namespace Kras.Service.Auth;

/// <summary>
/// 简易 token 签发器（演示用）。生产环境换 JWT。
/// </summary>
public class TokenService
{
    private static readonly Dictionary<string, string> Tokens = new(); // token → userId
    private static readonly object Lock = new();

    public string Issue(string userId)
    {
        var bytes = RandomNumberGenerator.GetBytes(24);
        var token = "kras." + Convert.ToHexString(bytes);
        lock (Lock)
        {
            Tokens[token] = userId;
        }
        return token;
    }

    public string? Validate(string? token)
    {
        if (string.IsNullOrEmpty(token)) return null;
        if (!token.StartsWith("kras.")) return null;
        lock (Lock)
        {
            return Tokens.TryGetValue(token, out var uid) ? uid : null;
        }
    }
}
