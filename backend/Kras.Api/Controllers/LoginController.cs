using Microsoft.AspNetCore.Mvc;
using System.Text.Json.Serialization;
using Kras.Service.Auth;
using Kras.Service.Protocol.Response;
using Kras.Service.Seed;

namespace Kras.Api.Controllers;

/// <summary>
/// 登录与鉴权。
/// </summary>
[ApiController]
[Route("api")]
public class LoginController : ControllerBase
{
    private readonly KrasSeedData _seed;
    private readonly TokenService _tokens;

    public LoginController(KrasSeedData seed, TokenService tokens)
    {
        _seed = seed;
        _tokens = tokens;
    }

    /// <summary>
    /// 用户登录，返回 Bearer Token。
    /// </summary>
    /// <remarks>
    /// 演示账号：
    ///
    ///     admin / admin        系统管理员
    ///     pmlin / pmlin        PLM 协调员
    ///     engineer / engineer  研发工程师
    ///     viewer / viewer      只读用户
    ///
    /// </remarks>
    /// <param name="body">登录请求</param>
    /// <response code="200">登录成功</response>
    /// <response code="401">登录名或密码错误</response>
    [HttpPost("login")]
    [Consumes("application/json")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(KrasEnvelope<LoginResponse>), 200)]
    [ProducesResponseType(typeof(KrasEnvelope), 401)]
    public IActionResult Login([FromBody] LoginRequest? body)
    {
        if (string.IsNullOrEmpty(body?.LoginName) || string.IsNullOrEmpty(body.Password))
        {
            return Unauthorized(ApiResponseFactory.Error("VALIDATION_ERROR", "登录名或密码不能为空"));
        }

        var user = _seed.Users.FirstOrDefault(u =>
            u.LoginName == body.LoginName && u.Password == body.Password);
        if (user == null)
        {
            return Unauthorized(ApiResponseFactory.Error("PERMISSION_DENIED", "登录名或密码错误"));
        }

        var token = _tokens.Issue(user.Id);
        return Ok(ApiResponseFactory.Success(new LoginResponse
        {
            Token = token,
            User = new LoginUser
            {
                Id = user.Id,
                LoginName = user.LoginName,
                Name = user.Name,
                Email = user.Email,
                IdentityIds = user.IdentityIds,
            },
        }));
    }

    /// <summary>登录请求</summary>
    public class LoginRequest
    {
        /// <summary>登录名</summary>
        [JsonPropertyName("login_name")]
        public string? LoginName { get; set; }

        /// <summary>密码</summary>
        [JsonPropertyName("password")]
        public string? Password { get; set; }
    }

    public class LoginResponse
    {
        public string Token { get; set; } = "";
        public LoginUser User { get; set; } = new();
    }

    public class LoginUser
    {
        public string Id { get; set; } = "";
        [JsonPropertyName("login_name")] public string LoginName { get; set; } = "";
        public string Name { get; set; } = "";
        public string? Email { get; set; }
        public List<string> IdentityIds { get; set; } = new();
    }
}
