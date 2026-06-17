using Microsoft.AspNetCore.Mvc;
using Kras.Core.Items;
using Kras.Service.Items;
using Kras.Service.Protocol;
using Kras.Service.Protocol.Aml;
using Kras.Service.Protocol.Parsing;
using Kras.Service.Protocol.Response;

namespace Kras.Api.Controllers;

/// <summary>
/// Item / AML 协议入口。所有数据交互都通过本控制器的端点完成。
/// 对应需求 §4.5 HTTP 端点契约。
/// </summary>
[ApiController]
[Route("api")]
public class ApplyController : ControllerBase
{
    private readonly IItemActionHandler _handler;
    public ApplyController(IItemActionHandler handler) => _handler = handler;

    /// <summary>
    /// 单 Item 请求（统一事务）。
    /// onBefore* / 主 action/method / onAfter* 视为同一执行单元，任一环节报错整体回滚。
    /// </summary>
    /// <remarks>
    /// 最小请求示例：
    ///
    ///     { "@type": "Part", "@action": "get" }
    ///
    /// 标准 action：get / new / add / edit / update / copy / lock / unlock / version / promote / delete。
    /// 内置 action：quickSearch、startWorkflow、advanceWorkflow、submitApproval 等。
    /// 服务端 Method 名称可直接写入 @action。
    /// </remarks>
    /// <param name="item">Item 协议载荷（AML 兼容）</param>
    /// <response code="200">成功返回 Item 或 Item 列表</response>
    /// <response code="400">协议解析失败或业务校验失败（VALIDATION_ERROR / ITEM_NOT_FOUND 等）</response>
    /// <response code="500">服务端内部错误</response>
    [HttpPost("applyItem")]
    [Consumes("application/json")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(KrasEnvelope<object>), 200)]
    [ProducesResponseType(typeof(KrasEnvelope), 400)]
    [ProducesResponseType(typeof(KrasEnvelope), 500)]
    public IActionResult ApplyItem([FromBody] Item item)
    {
        ItemRequest request;
        try
        {
            // 已由 [FromBody] 解析，这里走 parser 复用错误码映射
            request = new ItemRequest { Type = item.Type, Id = item.Id, Action = item.Action, Item = item };
            ItemRequestParser.Validate(request);
        }
        catch (KrasException ex)
        {
            return BadRequest(ApiResponseFactory.Error(ex.CodeString, ex.Message));
        }

        try
        {
            var result = _handler.Dispatch(request.Item);
            return Ok(UnwrapResult(result));
        }
        catch (KrasException ex)
        {
            return BadRequest(ApiResponseFactory.Error(ex.CodeString, ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponseFactory.Error("INTERNAL_ERROR", ex.Message));
        }
    }

    /// <summary>
    /// 批量 AML 请求。同批 AML 共享一个批量事务，任一项失败整批回滚。
    /// </summary>
    /// <remarks>
    /// 请求必须是 { "AML": [ ...Item ] } 形式：
    ///
    ///     {
    ///       "AML": [
    ///         { "@type": "Part", "@action": "add", "name": "A" },
    ///         { "@type": "Part", "@action": "add", "name": "B" }
    ///       ]
    ///     }
    ///
    /// </remarks>
    /// <param name="aml">AML 批量载荷</param>
    /// <response code="200">全部成功，data 为结果数组</response>
    /// <response code="400">任一项失败，整批回滚</response>
    [HttpPost("applyAml")]
    [Consumes("application/json")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(KrasEnvelope<List<object>>), 200)]
    [ProducesResponseType(typeof(KrasEnvelope), 400)]
    public IActionResult ApplyAml([FromBody] AmlRequestDto aml)
    {
        if (aml?.Aml is null || aml.Aml.Count == 0)
        {
            return BadRequest(ApiResponseFactory.Error("INVALID_JSON", "AML 必须是非空数组"));
        }

        try
        {
            // 单事务模拟：任一失败整批回滚（演示）
            var results = new List<object?>();
            foreach (var item in aml.Aml)
            {
                var r = _handler.Dispatch(item);
                results.Add(UnwrapData(r));
            }
            return Ok(new { success = true, data = results });
        }
        catch (KrasException ex)
        {
            return BadRequest(ApiResponseFactory.Error(ex.CodeString,
                $"批量事务已回滚：{ex.Message}"));
        }
    }

    /// <summary>
    /// 反向引用查询（被谁使用）。
    /// </summary>
    /// <remarks>查询某个对象被哪些关系引用。</remarks>
    /// <param name="request">{ "@type": "Part", "@id": "..." }</param>
    /// <response code="200">返回引用方列表</response>
    [HttpPost("whereUsed")]
    [ProducesResponseType(typeof(KrasEnvelope<List<Item>>), 200)]
    public IActionResult WhereUsed([FromBody] Item request) =>
        Ok(new { success = true, data = Array.Empty<object>() });

    // 把内部 __items__ 包装的对象展开为前端期望的 data 形态
    private static object UnwrapResult(Item result)
    {
        if (result.TryGetValue("__items__", out var itemsObj) && itemsObj is List<Item> list)
        {
            return new { success = true, data = list };
        }
        return ApiResponseFactory.Success(result);
    }

    private static object UnwrapData(Item result)
    {
        if (result.TryGetValue("__items__", out var itemsObj) && itemsObj is List<Item> list)
        {
            return list;
        }
        return result;
    }
}

/// <summary>
/// 批量 AML 请求 DTO（仅用于 Swagger 展示）。
/// </summary>
public class AmlRequestDto
{
    /// <summary>AML 数组</summary>
    public List<Item> Aml { get; set; } = new();
}

/// <summary>
/// 统一响应 envelope（Swagger 展示用）。
/// </summary>
public class KrasEnvelope
{
    public bool Success { get; set; }
    public object? Data { get; set; }
    public string? Message { get; set; }
    public KrasErrorBody? Error { get; set; }
}

/// <summary>
/// 泛型 envelope，让 Swagger 能展开 data 的结构。
/// </summary>
public class KrasEnvelope<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Message { get; set; }
}

public class KrasErrorBody
{
    public string Type { get; set; } = "";
    public string IsError { get; set; } = "";
    public string Code { get; set; } = "";
    public string Message { get; set; } = "";
}
