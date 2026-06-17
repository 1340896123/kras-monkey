namespace Kras.Core;

public enum PropertyDataType
{
    String,
    Text,
    Integer,
    Decimal,
    Boolean,
    Date,
    List,
    Item,
    Foreign,
    Image,
    File,
    Color,
    Classification,
}

public static class PropertyDataTypeExtensions
{
    public static PropertyDataType Parse(string s)
    {
        return s?.ToLowerInvariant() switch
        {
            "string" => PropertyDataType.String,
            "text" => PropertyDataType.Text,
            "integer" => PropertyDataType.Integer,
            "decimal" => PropertyDataType.Decimal,
            "boolean" => PropertyDataType.Boolean,
            "date" => PropertyDataType.Date,
            "list" => PropertyDataType.List,
            "item" => PropertyDataType.Item,
            "foreign" => PropertyDataType.Foreign,
            "image" => PropertyDataType.Image,
            "file" => PropertyDataType.File,
            "color" => PropertyDataType.Color,
            "classification" => PropertyDataType.Classification,
            _ => PropertyDataType.String,
        };
    }
}
