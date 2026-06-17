namespace Kras.Core.Metadata;

public class Property
{
    public string Id { get; set; } = string.Empty;
    public string SourceId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string? LabelZh { get; set; }
    public PropertyDataType DataType { get; set; } = PropertyDataType.String;
    public int? DataLength { get; set; }
    public int? DataPrecision { get; set; }
    public int? DataScale { get; set; }
    public string? DataSource { get; set; }
    public string? ForeignProperty { get; set; }
    public int IsRequired { get; set; }
    public int IsUnique { get; set; }
    public int IsHidden { get; set; }
    public int IsHidden2 { get; set; }
    public int IsReadonly { get; set; }
    public string? DefaultValue { get; set; }
    public int SortOrder { get; set; }
    public int? ColumnWidth { get; set; }
    public string? ColumnAlign { get; set; }
    public string? FieldPermissionId { get; set; }
    public string? Pattern { get; set; }
    public string? Description { get; set; }
}
