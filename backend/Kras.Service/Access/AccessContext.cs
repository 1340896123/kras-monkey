using Kras.Service.Auth;
using Kras.Service.Seed;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace Kras.Service.Access;

/// <summary>
/// 当前请求的访问上下文。从 Bearer Token 解析得到 userId + identityIds + 所属 teams。
/// 对应需求 §9.1 AccessContextMiddleware。
/// </summary>
public class AccessContext
{
    public string? UserId { get; set; }
    public List<string> IdentityIds { get; set; } = new();
    public List<string> TeamIds { get; set; } = new();
    public bool IsAuthenticated => !string.IsNullOrEmpty(UserId);

    /// <summary>是否是 admin（演示用：admin 跳过权限）。</summary>
    public bool IsAdmin => UserId == AdminUserId;
    public const string AdminUserId = "USER_ADMIN";
}

/// <summary>
/// HTTP 中间件：解析 Bearer Token 写入 AccessContext。
/// 通过 AsyncLocal 实现请求级单例。
/// </summary>
public class AccessContextMiddleware
{
    private readonly RequestDelegate _next;
    public AccessContextMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext ctx, TokenService tokens, KrasSeedData seed, AccessContext access)
    {
        var auth = ctx.Request.Headers["Authorization"].ToString();
        if (!string.IsNullOrEmpty(auth) && auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = auth["Bearer ".Length..].Trim();
            var userId = tokens.Validate(token);
            if (!string.IsNullOrEmpty(userId))
            {
                access.UserId = userId;
                var user = seed.Users.FirstOrDefault(u => u.Id == userId);
                if (user != null)
                {
                    access.IdentityIds = user.IdentityIds.ToList();
                    // 计算 teamIds：identity 在哪些 team 中
                    access.TeamIds = seed.Teams
                        .Where(t => t.IdentityIds.Any(id => user.IdentityIds.Contains(id)))
                        .Select(t => t.Id).ToList();
                }
            }
        }
        await _next(ctx);
    }
}

public static class AccessContextServiceExtensions
{
    public static IServiceCollection AddKrasAccessContext(this IServiceCollection services)
    {
        services.AddScoped<AccessContext>();
        return services;
    }

    public static IApplicationBuilder UseKrasAccessContext(this IApplicationBuilder app)
    {
        app.UseMiddleware<AccessContextMiddleware>();
        return app;
    }
}
