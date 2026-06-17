using Kras.Core.Items;
using Kras.Service.Access;

namespace Kras.Service.Audit;

/// <summary>
/// 审计日志条目。对应需求 REQ-130 / design §13。
/// </summary>
public class AuditEntry
{
    public string Id { get; set; } = "";
    public DateTime At { get; set; }
    public string? UserId { get; set; }
    public string ActionType { get; set; } = "";
    public string ItemType { get; set; } = "";
    public string? ItemId { get; set; }
    public string? ItemKeyedName { get; set; }
    public string? Detail { get; set; }
    public string? IpAddress { get; set; }
}

/// <summary>
/// 审计服务（简化版同步写）。生产环境走 channel + 后台 worker 批量写库。
/// </summary>
public interface IAuditLogService
{
    void Log(string actionType, Item item, string? detail = null);
    List<AuditEntry> Query(string? itemTypeId = null, string? itemId = null, int limit = 100);
}

public class AuditLogService : IAuditLogService
{
    private static readonly List<AuditEntry> Entries = new();
    private static readonly object Lock = new();
    private readonly AccessContext _ctx;
    private readonly Microsoft.AspNetCore.Http.IHttpContextAccessor _http;

    public AuditLogService(AccessContext ctx, Microsoft.AspNetCore.Http.IHttpContextAccessor http)
    {
        _ctx = ctx;
        _http = http;
    }

    public void Log(string actionType, Item item, string? detail = null)
    {
        var entry = new AuditEntry
        {
            Id = Kras.Core.Items.KrasId.NewId(),
            At = DateTime.UtcNow,
            UserId = _ctx.UserId,
            ActionType = actionType,
            ItemType = item.Type ?? "",
            ItemId = item.Id,
            ItemKeyedName = item.KeyedName,
            Detail = detail,
            IpAddress = _http.HttpContext?.Connection.RemoteIpAddress?.ToString(),
        };
        lock (Lock) { Entries.Add(entry); }
    }

    public List<AuditEntry> Query(string? itemTypeId = null, string? itemId = null, int limit = 100)
    {
        lock (Lock)
        {
            var q = Entries.AsEnumerable();
            if (!string.IsNullOrEmpty(itemTypeId)) q = q.Where(e => e.ItemType == itemTypeId);
            if (!string.IsNullOrEmpty(itemId)) q = q.Where(e => e.ItemId == itemId);
            return q.OrderByDescending(e => e.At).Take(limit).ToList();
        }
    }

    public static List<AuditEntry> Snapshot() { lock (Lock) { return Entries.ToList(); } }
    public static void Reset() { lock (Lock) { Entries.Clear(); } }
}
