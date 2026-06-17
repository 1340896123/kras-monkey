using Microsoft.AspNetCore.Mvc;
using Kras.Core.Governance;
using Kras.Core.Items;
using Kras.Service.Items;
using Kras.Service.Protocol.Response;
using Kras.Service.Seed;

namespace Kras.Api.Controllers;

/// <summary>
/// 菜单树。前端登录后通过本接口渲染左侧导航。
/// </summary>
[ApiController]
[Route("api")]
public class MenusController : ControllerBase
{
    private readonly KrasSeedData _seed;
    private readonly IItemRepository _repo;
    public MenusController(KrasSeedData seed, IItemRepository repo)
    {
        _seed = seed;
        _repo = repo;
    }

    /// <summary>
    /// 获取菜单树（自定义菜单 + ItemType 自动分组）。
    /// </summary>
    [HttpGet("menus")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(List<MenuItem>), 200)]
    public IActionResult Get()
    {
        return Ok(_seed.Menus);
    }

    /// <summary>
    /// 新建菜单项。
    /// </summary>
    /// <param name="body">菜单字段</param>
    [HttpPost("menus")]
    [Consumes("application/json")]
    [ProducesResponseType(typeof(KrasEnvelope<MenuItem>), 200)]
    public IActionResult Create([FromBody] MenuItem body)
    {
        body.Id = KrasId.NewId();
        _seed.Menus.Add(body);
        return Ok(ApiResponseFactory.Success(body));
    }

    /// <summary>
    /// 更新菜单项。
    /// </summary>
    /// <param name="id">菜单 id</param>
    /// <param name="body">更新字段</param>
    [HttpPut("menus/{id}")]
    [Consumes("application/json")]
    [ProducesResponseType(typeof(KrasEnvelope<MenuItem>), 200)]
    public IActionResult Update(string id, [FromBody] MenuItem body)
    {
        var found = _seed.Menus.FirstOrDefault(m => m.Id == id);
        if (found == null)
            return NotFound(ApiResponseFactory.Error("ITEM_NOT_FOUND", $"菜单不存在：{id}"));
        found.Name = body.Name ?? found.Name;
        found.Label = body.Label ?? found.Label;
        found.ParentId = body.ParentId ?? found.ParentId;
        found.Path = body.Path ?? found.Path;
        found.Icon = body.Icon ?? found.Icon;
        found.ItemTypeId = body.ItemTypeId ?? found.ItemTypeId;
        found.SortOrder = body.SortOrder;
        found.IsHidden = body.IsHidden;
        return Ok(ApiResponseFactory.Success(found));
    }

    /// <summary>
    /// 删除菜单项。
    /// </summary>
    /// <param name="id">菜单 id</param>
    [HttpDelete("menus/{id}")]
    [ProducesResponseType(typeof(KrasEnvelope), 200)]
    public IActionResult Delete(string id)
    {
        var found = _seed.Menus.FirstOrDefault(m => m.Id == id);
        if (found != null) _seed.Menus.Remove(found);
        return Ok(ApiResponseFactory.Success(new { id, deleted = found != null }));
    }

    /// <summary>
    /// 批量排序菜单（拖拽重排）。
    /// </summary>
    /// <param name="body">{ "orders": [{ "id": "...", "sort_order": 1, "parent_id": "..." }] }</param>
    [HttpPost("menus/reorder")]
    [Consumes("application/json")]
    [ProducesResponseType(typeof(KrasEnvelope), 200)]
    public IActionResult Reorder([FromBody] ReorderRequest body)
    {
        if (body?.Orders != null)
        {
            foreach (var o in body.Orders)
            {
                var m = _seed.Menus.FirstOrDefault(x => x.Id == o.Id);
                if (m == null) continue;
                m.SortOrder = o.SortOrder;
                if (o.ParentId != null) m.ParentId = o.ParentId;
            }
        }
        return Ok(ApiResponseFactory.Success(new { updated = body?.Orders?.Count ?? 0 }));
    }

    public class ReorderRequest
    {
        public List<ReorderItem>? Orders { get; set; }
    }

    public class ReorderItem
    {
        public string Id { get; set; } = "";
        public int SortOrder { get; set; }
        public string? ParentId { get; set; }
    }
}
