using Microsoft.AspNetCore.Mvc;
using Kras.Service.Protocol.Response;

namespace Kras.Api.Controllers;

/// <summary>
/// AI 能力端点（占位实现，演示友好）。对应需求 §12 / REQ-120。
/// 真实环境接入 Provider / PromptTemplate / Skill。
/// </summary>
[ApiController]
[Route("api/ai")]
public class AiController : ControllerBase
{
    /// <summary>
    /// 生成详情页布局建议。
    /// </summary>
    [HttpPost("layout")]
    [ProducesResponseType(typeof(KrasEnvelope<object>), 200)]
    public IActionResult Layout([FromBody] AiLayoutRequest body)
    {
        var suggestion = new
        {
            sections = new[]
            {
                new { title = "基础信息", fields = new[] { "name", "item_number" } },
                new { title = "规格属性", fields = new[] { "spec", "cost" } },
                new { title = "版本与生命周期", fields = new[] { "major_rev", "state" } },
            },
            note = $"基于 ItemType={body.ItemType} 的建议布局（AI 演示占位）",
        };
        return Ok(ApiResponseFactory.Success(suggestion));
    }

    /// <summary>
    /// 生成详情页内容草稿。
    /// </summary>
    [HttpPost("item-detail-draft")]
    [ProducesResponseType(typeof(KrasEnvelope<object>), 200)]
    public IActionResult ItemDetailDraft([FromBody] AiItemDraftRequest body)
    {
        return Ok(ApiResponseFactory.Success(new
        {
            summary = $"这是 {body.ItemType}（id={body.ItemId}）的 AI 草稿描述（演示占位）。",
            tags = new[] { "AI 草稿", body.ItemType },
        }));
    }

    /// <summary>
    /// 编辑服务端方法代码（建议补全）。
    /// </summary>
    [HttpPost("method-edit")]
    [ProducesResponseType(typeof(KrasEnvelope<object>), 200)]
    public IActionResult MethodEdit([FromBody] AiMethodEditRequest body)
    {
        return Ok(ApiResponseFactory.Success(new
        {
            suggestion = $"// {body.MethodName ?? "CustomMethod"} 的 AI 补全建议（演示）\nreturn item;",
        }));
    }

    public class AiLayoutRequest
    {
        public string? ItemType { get; set; }
    }

    public class AiItemDraftRequest
    {
        public string? ItemType { get; set; }
        public string? ItemId { get; set; }
    }

    public class AiMethodEditRequest
    {
        public string? MethodName { get; set; }
        public string? Code { get; set; }
    }
}

/// <summary>
/// 服务端 Method 编译检查与 LSP 占位。对应需求 REQ-060 / design §8。
/// 真实环境用 Roslyn。
/// </summary>
[ApiController]
public class MethodToolingController : ControllerBase
{
    /// <summary>
    /// 编译检查（占位）。真实实现接入 Roslyn。
    /// </summary>
    [HttpPost("api/methods/compile-check")]
    [ProducesResponseType(typeof(KrasEnvelope<object>), 200)]
    public IActionResult CompileCheck([FromBody] CompileCheckRequest body)
    {
        var code = body.Code ?? "";
        var errors = new List<object>();
        if (string.IsNullOrWhiteSpace(code))
            errors.Add(new { line = 1, column = 1, severity = "error", message = "代码为空" });
        // 简单语法检查：括号配对
        var openCurly = code.Count(c => c == '{');
        var closeCurly = code.Count(c => c == '}');
        if (openCurly != closeCurly)
            errors.Add(new { line = code.Split('\n').Length, column = 1, severity = "error", message = "大括号不匹配" });

        return Ok(ApiResponseFactory.Success(new
        {
            success = errors.Count == 0,
            errors,
            diagnostics = errors,
        }));
    }

    /// <summary>
    /// LSP 入口（占位）。任何方法都返回 501 Not Implemented，提示真实实现未启用。
    /// </summary>
    [Route("lsp/dotnet/{*any}")]
    [ProducesResponseType(501)]
    public IActionResult Lsp() =>
        StatusCode(501, ApiResponseFactory.Error("INTERNAL_ERROR",
            "LSP 未启用。本环境仅占位，真实接入需 OmniSharp/Roslyn LSP host。"));

    public class CompileCheckRequest
    {
        public string? Code { get; set; }
        public string? MethodName { get; set; }
    }
}
