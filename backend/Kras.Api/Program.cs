using System.Reflection;
using System.Text.Json;
using Kras.Core.Items;
using Kras.Service.Host;
using Kras.Service.Protocol.Response;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = Kras.Service.Protocol.SnakeCaseNamingPolicy.Instance;
        opts.JsonSerializerOptions.Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping;
    });

builder.Services.AddEndpointsApiExplorer();

// === Swagger / OpenAPI ===
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Version = "v1",
        Title = "Kras PLM API",
        Description = "元数据驱动 + Item 协议驱动的企业级 PLM 平台 API。" +
                      "\n\n统一协议：所有数据交互通过 /api/applyItem（单事务）或 /api/applyAml（批量单事务）完成。" +
                      "\n\n认证：除 /api/login、/health 外的端点都需要 `Authorization: Bearer {token}`。",
        Contact = new Microsoft.OpenApi.Models.OpenApiContact
        {
            Name = "Kras",
        },
    });

    // 加载 XML 注释
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }

    // Bearer Token 鉴权定义
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "Token",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "填入登录返回的 token。例：kras.ABCDEF...",
    });
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer",
                },
            },
            Array.Empty<string>()
        },
    });
});

// CORS：允许前端跨域（dev：5173）
builder.Services.AddCors(opts =>
{
    opts.AddDefaultPolicy(p => p
        .AllowAnyOrigin()
        .AllowAnyMethod()
        .AllowAnyHeader());
});

builder.Services.AddKrasCoreServices();

var app = builder.Build();

// Swagger UI（开发与生产都启用，便于联调）
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Kras PLM API v1");
    options.RoutePrefix = "swagger"; // /swagger
    options.DocumentTitle = "Kras PLM API";
    options.DefaultModelsExpandDepth(2);
    options.DefaultModelExpandDepth(2);
    options.DisplayRequestDuration();
});

app.UseCors();
app.UseKrasSeedInitialization();

// 把根路径直接重定向到 swagger，方便打开
app.MapGet("/", () => Results.Redirect("/swagger"))
    .ExcludeFromDescription();

app.MapControllers();

// 健康检查
app.MapGet("/health", () => Results.Json(ApiResponseFactory.Success(new
{
    status = "ok",
    time = DateTime.UtcNow,
}), JsonOpts.Default)).ExcludeFromDescription();

app.MapGet("/api/health", () => Results.Json(ApiResponseFactory.Success(new
{
    status = "ok",
    time = DateTime.UtcNow,
}), JsonOpts.Default)).ExcludeFromDescription();

app.Run();
