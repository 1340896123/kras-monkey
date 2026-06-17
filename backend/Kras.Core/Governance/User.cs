namespace Kras.Core.Governance;

public class User
{
    public string Id { get; set; } = string.Empty;
    public string LoginName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public int IsActive { get; set; } = 1;
    public int IsLoginAllowed { get; set; } = 1;
    public string? Avatar { get; set; }
    public string? DefaultVaultId { get; set; }
    public string? Company { get; set; }
    public List<string> IdentityIds { get; set; } = new();

    // mock 演示用：明文密码；真实环境改 PasswordHasher
    public string Password { get; set; } = string.Empty;
}

public class Identity
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "user";
}

public class Team
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public List<string> IdentityIds { get; set; } = new();
}

public class MenuItem
{
    public string Id { get; set; } = string.Empty;
    public string? ParentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string? Path { get; set; }
    public string? Icon { get; set; }
    public string? ItemTypeId { get; set; }
    public int SortOrder { get; set; }
    public int IsHidden { get; set; }
}
