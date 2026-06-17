using System.Text.Json;
using Kras.Core.Governance;
using Kras.Core.Items;
using Kras.Core.Metadata;

namespace Kras.Service.Seed;

public class ViewSeed
{
    public string Id { get; set; } = "";
    public string SourceId { get; set; } = ""; // ItemType name（运行时解析）
    public string ItemType { get; set; } = "";
    public string Name { get; set; } = "";
    public string Label { get; set; } = "";
    public string ViewType { get; set; } = "detail"; // detail | list
    public int IsDefault { get; set; } = 1;
    public int SortOrder { get; set; } = 1;
    public JsonElement? FormScheme { get; set; }
}
