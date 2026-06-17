using System.Collections.Concurrent;
using Kras.Core.Items;

namespace Kras.Service.Items;

/// <summary>
/// 内存仓储（演示用）。生产环境替换为 SQL Server + fn_CheckEntityAccess。
/// 对应 design.md §3：所有数据按 @type + @id 索引。
/// </summary>
public interface IItemRepository
{
    List<Item> GetByType(string itemType);
    Item? GetById(string id);
    Item Save(Item item);
    bool Remove(string id);
    void Seed(IEnumerable<Item> items);
    void Reset();
}

public class InMemoryItemRepository : IItemRepository
{
    private readonly ConcurrentDictionary<string, Item> _items = new();

    public List<Item> GetByType(string itemType)
    {
        return _items.Values.Where(i => i.Type == itemType).Select(i => i.Clone()).ToList();
    }

    public Item? GetById(string id)
    {
        return _items.TryGetValue(id, out var item) ? item.Clone() : null;
    }

    public Item Save(Item item)
    {
        var cloned = item.Clone();
        if (cloned.Id != null) _items[cloned.Id] = cloned;
        return cloned.Clone();
    }

    public bool Remove(string id) => _items.TryRemove(id, out _);

    public void Seed(IEnumerable<Item> items)
    {
        foreach (var item in items)
        {
            if (item.Id != null) _items[item.Id] = item.Clone();
        }
    }

    public void Reset() => _items.Clear();
}
