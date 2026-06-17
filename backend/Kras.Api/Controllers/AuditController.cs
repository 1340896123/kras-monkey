using Microsoft.AspNetCore.Mvc;
using Kras.Service.Audit;
using Kras.Service.Protocol.Response;

namespace Kras.Api.Controllers;

/// <summary>
/// 审计日志查询。对应需求 REQ-130。
/// </summary>
[ApiController]
[Route("api")]
public class AuditController : ControllerBase
{
    private readonly IAuditLogService _audit;
    public AuditController(IAuditLogService audit) => _audit = audit;

    /// <summary>
    /// 查询审计日志。可按 item_type / item_id 过滤。
    /// </summary>
    [HttpGet("audit")]
    [ProducesResponseType(typeof(KrasEnvelope<List<AuditEntry>>), 200)]
    public IActionResult Query([FromQuery] string? itemType, [FromQuery] string? itemId, [FromQuery] int limit = 100)
    {
        return Ok(ApiResponseFactory.Success(_audit.Query(itemType, itemId, limit)));
    }
}
