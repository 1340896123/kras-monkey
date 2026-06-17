using System.Collections.Generic;
using System.Text.Json;
using Kras.Core.Items;

namespace Kras.Service.Protocol.Response;

/// <summary>
/// 统一响应工厂。对应需求 §4.6。
/// 同时支持裸 data 与标准 envelope。
/// 注意：错误 envelope 的 @type/@is_error 必须保留 @ 前缀，
/// 故用 Dictionary 而非匿名对象。
/// </summary>
public static class ApiResponseFactory
{
    public static object Success(object? data, string? message = null)
    {
        return new Dictionary<string, object?>
        {
            ["success"] = true,
            ["data"] = data,
            ["message"] = message,
        };
    }

    public static object Error(string code, string message, object? details = null)
    {
        return new Dictionary<string, object?>
        {
            ["success"] = false,
            ["error"] = new Dictionary<string, object?>
            {
                ["@type"] = "Error",
                ["@is_error"] = "1",
                ["code"] = code,
                ["message"] = message,
                ["details"] = details,
            },
        };
    }

    public static string SuccessJson(object? data) =>
        JsonSerializer.Serialize(Success(data), JsonOpts.Default);

    public static string ErrorJson(string code, string message) =>
        JsonSerializer.Serialize(Error(code, message), JsonOpts.Default);
}
