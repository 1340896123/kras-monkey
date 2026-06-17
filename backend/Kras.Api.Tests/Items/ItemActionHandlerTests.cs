using Kras.Service.Items;
using Kras.Service.Seed;
using Xunit;

namespace Kras.Api.Tests.Items;

public class ItemActionHandlerTests
{
    private static IItemActionHandler BuildHandler()
    {
        var repo = new InMemoryItemRepository();
        repo.Seed(KrasSeedBuilder.Build().BusinessItems);
        return new ItemActionHandler(repo);
    }

    [Fact]
    public void Get_ListByType_ReturnsItems()
    {
        var handler = BuildHandler();
        var result = handler.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "get",
        });
        Assert.True(result.TryGetValue("__items__", out var items));
        var list = Assert.IsType<List<Kras.Core.Items.Item>>(items!);
        Assert.True(list.Count >= 10);
    }

    [Fact]
    public void Add_AssignsNewIdAndKeyedName()
    {
        var handler = BuildHandler();
        var added = handler.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "add",
            ["name"] = "TestPart",
        });
        Assert.NotNull(added.Id);
        Assert.Equal("TestPart", added.KeyedName);
        Assert.Equal("A", added["major_rev"]);
    }

    [Fact]
    public void Update_MergesFields()
    {
        var handler = BuildHandler();
        var added = handler.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "add",
            ["name"] = "Original",
        });
        var updated = handler.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@id"] = added.Id,
            ["@action"] = "update",
            ["name"] = "Updated",
        });
        Assert.Equal("Updated", updated["name"]);
    }

    [Fact]
    public void Delete_RemovesItem()
    {
        var handler = BuildHandler();
        var added = handler.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "add",
            ["name"] = "ToDelete",
        });
        var result = handler.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@id"] = added.Id,
            ["@action"] = "delete",
        });
        Assert.Equal("delete", result["@action"]);
        Assert.Throws<KrasException>(() => handler.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@id"] = added.Id,
            ["@action"] = "get",
        }));
    }

    [Fact]
    public void Version_IncrementsMinorRev()
    {
        var handler = BuildHandler();
        var added = handler.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "add",
            ["name"] = "V1",
        });
        var v2 = handler.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@id"] = added.Id,
            ["@action"] = "version",
        });
        Assert.Equal("2", v2["minor_rev"]);
        Assert.Equal(2, Convert.ToInt32(v2["generation"]));
    }
}
