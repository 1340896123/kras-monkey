using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Kras.Service.Access;
using Kras.Service.Audit;
using Kras.Service.Auth;
using Kras.Service.Items;
using Kras.Service.Seed;

namespace Kras.Service.Host;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddKrasCoreServices(this IServiceCollection services)
    {
        services.AddSingleton<TokenService>();
        services.AddKrasAccessContext();
        services.AddScoped<IAuditLogService, AuditLogService>();
        services.AddScoped<IAccessService, AccessService>();
        services.AddSingleton<IItemRepository, InMemoryItemRepository>();
        services.AddSingleton<IItemActionHandler, ItemActionHandler>();

        // 启动时注入种子
        var seed = KrasSeedBuilder.Build();
        services.AddSingleton(seed);

        return services;
    }

    public static IApplicationBuilder UseKrasSeedInitialization(this IApplicationBuilder app)
    {
        // 把种子塞进仓储
        var repo = app.ApplicationServices.GetRequiredService<IItemRepository>();
        var seed = app.ApplicationServices.GetRequiredService<KrasSeedData>();
        repo.Seed(seed.BusinessItems);
        return app;
    }
}
