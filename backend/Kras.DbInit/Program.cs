// Kras.DbInit：建库 / 种子 / fn_CheckEntityAccess 生成（占位）
// 当前仅打印种子统计；生产环境补 SQL Server + Schema 同步实现。
// 对应需求 §15。
using Kras.Service.Seed;

var seed = KrasSeedBuilder.Build();
Console.WriteLine("Kras.DbInit");
Console.WriteLine($"  ItemTypes: {seed.ItemTypes.Count}");
Console.WriteLine($"  Properties: {seed.Properties.Count}");
Console.WriteLine($"  Lists: {seed.Lists.Count}");
Console.WriteLine($"  Users: {seed.Users.Count}");
Console.WriteLine($"  Teams: {seed.Teams.Count}");
Console.WriteLine($"  Menus: {seed.Menus.Count}");
Console.WriteLine($"  Business Items: {seed.BusinessItems.Count}");
Console.WriteLine("Done. (SQL Server 同步待实现)");
