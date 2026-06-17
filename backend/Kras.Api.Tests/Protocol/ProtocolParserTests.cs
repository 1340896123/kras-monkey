using Kras.Service.Protocol.Aml;
using Kras.Service.Protocol.Parsing;
using Xunit;

namespace Kras.Api.Tests.Protocol;

public class ProtocolParserTests
{
    [Fact]
    public void ItemRequestParser_ParsesSystemAndBusinessFields()
    {
        var req = ItemRequestParser.Parse("""
            {"@type":"Part","@action":"get","@id":"ABC123","item_number":"P-10001","name":"轴承"}
            """);
        Assert.Equal("Part", req.Type);
        Assert.Equal("get", req.Action);
        Assert.Equal("ABC123", req.Id);
        Assert.Equal("P-10001", req.BusinessFields["item_number"]?.ToString());
        Assert.Equal("轴承", req.BusinessFields["name"]?.ToString());
    }

    [Fact]
    public void ItemRequestParser_ThrowsOnEmpty()
    {
        Assert.Throws<KrasException>(() => ItemRequestParser.Parse(""));
    }

    [Fact]
    public void ItemRequestParser_ThrowsOnInvalidJson()
    {
        Assert.Throws<KrasException>(() => ItemRequestParser.Parse("not json"));
    }

    [Fact]
    public void AmlRequestParser_ParsesArray()
    {
        var aml = AmlRequestParser.Parse("""
            {"AML":[{"@type":"Part","@action":"add","name":"A"},{"@type":"Part","@action":"add","name":"B"}]}
            """);
        Assert.Equal(2, aml.Items.Count);
        Assert.Equal("A", aml.Items[0]["name"]?.ToString());
        Assert.Equal("B", aml.Items[1]["name"]?.ToString());
    }

    [Fact]
    public void AmlRequestParser_RejectsNonAmlShape()
    {
        Assert.Throws<KrasException>(() => AmlRequestParser.Parse("""{"items":[]}"""));
    }
}
