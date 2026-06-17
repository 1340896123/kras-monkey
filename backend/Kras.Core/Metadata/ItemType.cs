namespace Kras.Core.Metadata;

public class ItemType
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string? LabelZh { get; set; }
    public int IsRelationship { get; set; }
    public int IsVersionable { get; set; }
    public string ImplementationType { get; set; } = "Table";
    public string? ClassStructure { get; set; }
    public int DefaultPageSize { get; set; } = 20;
    public string? Icon { get; set; }
    public int IsEsIndex { get; set; }
    public int IsHidden { get; set; }
    public int IsSystem { get; set; }
    public int SortOrder { get; set; }
    public string? Description { get; set; }
}
