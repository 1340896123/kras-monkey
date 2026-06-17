using Microsoft.AspNetCore.Mvc;
using Kras.Service.Protocol.Response;

namespace Kras.Api.Controllers;

/// <summary>
/// 文件上传与下载。
/// </summary>
[ApiController]
public class FilesController : ControllerBase
{
    private static readonly byte[] PlaceholderPng =
    {
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82,
    };

    /// <summary>
    /// 按 ID 获取文件内容。
    /// </summary>
    /// <param name="id">文件 @id（32 位）</param>
    /// <response code="200">返回文件字节流</response>
    [HttpGet("api/files/{id}")]
    [Produces("application/octet-stream")]
    [ProducesResponseType(200)]
    public IActionResult GetFile(string id) => File(PlaceholderPng, "image/png");

    /// <summary>
    /// 上传文件。返回新创建的 File 对象（含 32 位 @id）。
    /// </summary>
    /// <response code="200">上传成功</response>
    [HttpPost("api/file/upload")]
    [ProducesResponseType(typeof(KrasEnvelope<FileUploadResult>), 200)]
    public IActionResult Upload() => Ok(ApiResponseFactory.Success(new FileUploadResult
    {
        Type = "File",
        Id = Kras.Core.Items.KrasId.NewId(),
        Name = "uploaded.bin",
    }));

    public class FileUploadResult
    {
        public string Type { get; set; } = "";
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
    }
}
