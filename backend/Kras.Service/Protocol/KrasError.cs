namespace Kras.Service.Protocol;

public enum KrasErrorCode
{
    Validation,
    ItemNotFound,
    ItemTypeNotFound,
    PermissionDenied,
    Conflict,
    MethodExecutionFailed,
    DeleteFailed,
    Internal,
    Database,
    InvalidJson,
}

public static class KrasErrorCodeExtensions
{
    public static string ToCodeString(this KrasErrorCode code) => code switch
    {
        KrasErrorCode.Validation => "VALIDATION_ERROR",
        KrasErrorCode.ItemNotFound => "ITEM_NOT_FOUND",
        KrasErrorCode.ItemTypeNotFound => "ITEMTYPE_NOT_FOUND",
        KrasErrorCode.PermissionDenied => "PERMISSION_DENIED",
        KrasErrorCode.Conflict => "CONFLICT",
        KrasErrorCode.MethodExecutionFailed => "METHOD_EXECUTION_FAILED",
        KrasErrorCode.DeleteFailed => "DELETE_FAILED",
        KrasErrorCode.Internal => "INTERNAL_ERROR",
        KrasErrorCode.Database => "DATABASE_ERROR",
        KrasErrorCode.InvalidJson => "INVALID_JSON",
        _ => "INTERNAL_ERROR",
    };
}

public class KrasException : Exception
{
    public KrasErrorCode ErrorCode { get; }
    public string CodeString => ErrorCode.ToCodeString();

    public KrasException(KrasErrorCode code, string message) : base(message)
    {
        ErrorCode = code;
    }
}
