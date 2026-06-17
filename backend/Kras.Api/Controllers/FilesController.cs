using Microsoft.AspNetCore.Mvc;
using Kras.Service.Protocol.Response;

namespace Kras.Api.Controllers;

/// <summary>
/// 文件分片上传 / Vault 抽象（演示版，落地存储到 wwwroot/uploads）。
/// </summary>
[ApiController]
public class FilesController : ControllerBase
{
    private static readonly string UploadDir = Path.Combine(AppContext.BaseDirectory, "uploads");
    private static readonly Dictionary<string, FileMeta> FileIndex = new();

    static FilesController()
    {
        Directory.CreateDirectory(UploadDir);
    }

    /// <summary>
    /// 按 ID 获取文件内容。
    /// </summary>
    [HttpGet("api/files/{id}")]
    [Produces("application/octet-stream")]
    [ProducesResponseType(200)]
    public IActionResult GetFile(string id)
    {
        if (!FileIndex.TryGetValue(id, out var meta))
        {
            // 回退：返回 placeholder PNG（兼容旧 seed）
            return File(PlaceholderPng, "image/png");
        }
        var path = Path.Combine(UploadDir, meta.StoredName);
        if (!System.IO.File.Exists(path)) return NotFound(ApiResponseFactory.Error("ITEM_NOT_FOUND", "文件丢失"));
        return PhysicalFile(path, meta.ContentType ?? "application/octet-stream", meta.OriginalName);
    }

    /// <summary>
    /// 整文件上传（小文件）。
    /// </summary>
    [HttpPost("api/file/upload")]
    [ProducesResponseType(typeof(KrasEnvelope<FileUploadResult>), 200)]
    [RequestSizeLimit(50_000_000)]
    public async Task<IActionResult> Upload([FromForm] IFormFile? file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponseFactory.Error("VALIDATION_ERROR", "未提供文件"));
        var id = Kras.Core.Items.KrasId.NewId();
        var stored = $"{id}_{Path.GetFileName(file.FileName)}";
        await using var fs = System.IO.File.Create(Path.Combine(UploadDir, stored));
        await file.CopyToAsync(fs);
        var meta = new FileMeta
        {
            Id = id,
            OriginalName = file.FileName,
            StoredName = stored,
            ContentType = file.ContentType,
            Size = file.Length,
        };
        FileIndex[id] = meta;
        return Ok(ApiResponseFactory.Success(new FileUploadResult
        {
            Type = "File",
            Id = id,
            Name = file.FileName,
            Size = file.Length,
            ContentType = file.ContentType,
        }));
    }

    /// <summary>
    /// 分片上传 - 初始化会话。
    /// </summary>
    [HttpPost("api/file/upload-session")]
    [ProducesResponseType(typeof(KrasEnvelope<UploadSession>), 200)]
    public IActionResult CreateSession([FromBody] UploadSessionRequest body)
    {
        var sessionId = Kras.Core.Items.KrasId.NewId();
        var session = new UploadSession
        {
            SessionId = sessionId,
            FileName = body.FileName,
            TotalSize = body.TotalSize,
            ChunkSize = body.ChunkSize,
            ReceivedChunks = new List<int>(),
            Status = "open",
        };
        Sessions[sessionId] = session;
        return Ok(ApiResponseFactory.Success(session));
    }

    /// <summary>
    /// 分片上传 - 上传分片。
    /// </summary>
    [HttpPost("api/file/upload-chunk/{sessionId}/{index}")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> UploadChunk(string sessionId, int index, [FromForm] IFormFile? chunk)
    {
        if (!Sessions.TryGetValue(sessionId, out var session))
            return NotFound(ApiResponseFactory.Error("ITEM_NOT_FOUND", "session 不存在"));
        if (chunk == null) return BadRequest(ApiResponseFactory.Error("VALIDATION_ERROR", "chunk 缺失"));
        var path = Path.Combine(UploadDir, $"{sessionId}_{index}.part");
        await using var fs = System.IO.File.Create(path);
        await chunk.CopyToAsync(fs);
        session.ReceivedChunks.Add(index);
        session.ChunkPaths[index] = path;
        return Ok(ApiResponseFactory.Success(new { sessionId, index, received = session.ReceivedChunks.Count }));
    }

    /// <summary>
    /// 分片上传 - 合并完成。
    /// </summary>
    [HttpPost("api/file/upload-complete/{sessionId}")]
    public IActionResult CompleteUpload(string sessionId)
    {
        if (!Sessions.TryGetValue(sessionId, out var session))
            return NotFound(ApiResponseFactory.Error("ITEM_NOT_FOUND", "session 不存在"));

        var fileId = Kras.Core.Items.KrasId.NewId();
        var stored = $"{fileId}_{session.FileName}";
        var finalPath = Path.Combine(UploadDir, stored);
        using (var output = System.IO.File.Create(finalPath))
        {
            foreach (var (idx, _) in session.ChunkPaths.OrderBy(p => p.Key))
            {
                using var input = System.IO.File.OpenRead(session.ChunkPaths[idx]);
                input.CopyTo(output);
            }
        }
        // 清理分片
        foreach (var p in session.ChunkPaths.Values)
        {
            try { System.IO.File.Delete(p); } catch { }
        }

        FileIndex[fileId] = new FileMeta
        {
            Id = fileId,
            OriginalName = session.FileName,
            StoredName = stored,
            ContentType = "application/octet-stream",
            Size = session.TotalSize,
        };
        session.Status = "completed";
        return Ok(ApiResponseFactory.Success(new
        {
            id = fileId,
            name = session.FileName,
            size = session.TotalSize,
        }));
    }

    // ===== 静态占位 PNG（旧测试用） =====
    private static readonly byte[] PlaceholderPng =
    {
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82,
    };

    private static readonly Dictionary<string, UploadSession> Sessions = new();

    public class FileMeta
    {
        public string Id { get; set; } = "";
        public string OriginalName { get; set; } = "";
        public string StoredName { get; set; } = "";
        public string? ContentType { get; set; }
        public long Size { get; set; }
    }

    public class FileUploadResult
    {
        public string Type { get; set; } = "File";
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public long Size { get; set; }
        public string? ContentType { get; set; }
    }

    public class UploadSessionRequest
    {
        public string FileName { get; set; } = "";
        public long TotalSize { get; set; }
        public int ChunkSize { get; set; } = 1024 * 1024;
    }

    public class UploadSession
    {
        public string SessionId { get; set; } = "";
        public string FileName { get; set; } = "";
        public long TotalSize { get; set; }
        public int ChunkSize { get; set; }
        public List<int> ReceivedChunks { get; set; } = new();
        public string Status { get; set; } = "open";
        public Dictionary<int, string> ChunkPaths { get; set; } = new();
    }
}
