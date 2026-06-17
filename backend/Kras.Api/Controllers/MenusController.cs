using Microsoft.AspNetCore.Mvc;
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
    public MenusController(KrasSeedData seed) => _seed = seed;

    /// <summary>
    /// 获取当前用户可见的菜单树。
    /// </summary>
    /// <remarks>
    /// 含两段：自定义菜单项 + 自动从 ItemType 元数据生成的业务对象分组（隐藏系统 ItemType 不进菜单）。
    /// </remarks>
    /// <response code="200">返回菜单节点数组（带 parent_id 形成树结构）</response>
    [HttpGet("menus")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(List<Kras.Core.Governance.MenuItem>), 200)]
    public IActionResult Get()
    {
        return Ok(_seed.Menus);
    }
}
