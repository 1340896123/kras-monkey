namespace Kras.Core.Metadata;

public class RelationshipType
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string? LabelZh { get; set; }
    public string SourceId { get; set; } = string.Empty;
    public string RelatedId { get; set; } = string.Empty;
    public string RelationshipId { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public int IsHidden { get; set; }
}

public class KrasList
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public List<KrasListValue> Values { get; set; } = new();
}

public class KrasListValue
{
    public string Id { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
