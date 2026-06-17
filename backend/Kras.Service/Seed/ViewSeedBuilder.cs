using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace Kras.Service.Seed;

/// <summary>
/// View + Form Scheme 种子生成。用字典 + JsonDocument 构造，避免 raw string JSON 转义错误。
/// 结构与前端 kras-web-vue/src/mock/seed/views.ts 一致。
/// </summary>
public static class ViewSeedBuilder
{
    public static List<ViewSeed> Build()
    {
        var list = new List<ViewSeed>();

        object Field(string prop, string comp, bool req = false, bool ro = false)
        {
            var f = new Dictionary<string, object> { ["id"] = $"f_{prop}", ["name"] = prop, ["component"] = comp };
            if (req) f["required"] = true;
            if (ro) f["readonly"] = true;
            return f;
        }

        object Section(string id, string label, int columns, params object[] fields) => new
        {
            id,
            type = "group",
            label,
            columns,
            fields,
        };

        JsonElement Scheme(params object[] sections)
        {
            var json = JsonSerializer.Serialize(new { sections }, JsonOpts.Default);
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.Clone();
        }

        // Part detail
        list.Add(new ViewSeed
        {
            ItemType = "Part",
            Name = "default",
            Label = "详情视图",
            ViewType = "detail",
            FormScheme = Scheme(
                Section("g_基本信息", "基本信息", 2,
                    Field("item_number", "text", req: true),
                    Field("name", "text", req: true),
                    Field("classification", "classification"),
                    Field("make_buy", "select")),
                Section("g_库存与成本", "库存与成本", 2,
                    Field("unit", "select"),
                    Field("cost", "number"),
                    Field("qty_on_hand", "number"),
                    Field("is_active", "switch")),
                Section("g_生命周期", "生命周期", 1,
                    Field("lifecycle_state", "text", ro: true),
                    Field("thumbnail", "image")),
                Section("g_描述", "描述", 1,
                    Field("description", "textarea"))
            ),
        });
        list.Add(new ViewSeed { ItemType = "Part", Name = "list", Label = "列表视图", ViewType = "list", FormScheme = Scheme() });

        // Document detail
        list.Add(new ViewSeed
        {
            ItemType = "Document",
            Name = "default",
            Label = "详情视图",
            ViewType = "detail",
            FormScheme = Scheme(
                Section("g_文档信息", "文档信息", 2,
                    Field("document_number", "text", req: true),
                    Field("title", "text", req: true),
                    Field("category", "select"),
                    Field("author_id", "item")),
                Section("g_版本与发布", "版本与发布", 3,
                    Field("version", "text", ro: true),
                    Field("release_date", "date"),
                    Field("is_confidential", "switch")),
                Section("g_附件", "附件", 1,
                    Field("attachment", "file"))
            ),
        });
        list.Add(new ViewSeed { ItemType = "Document", Name = "list", Label = "列表视图", ViewType = "list", FormScheme = Scheme() });

        // ECO detail
        list.Add(new ViewSeed
        {
            ItemType = "ECO",
            Name = "default",
            Label = "详情视图",
            ViewType = "detail",
            FormScheme = Scheme(
                Section("g_变更单", "变更单", 2,
                    Field("eco_number", "text", req: true),
                    Field("title", "text", req: true),
                    Field("priority", "select"),
                    Field("status", "select", ro: true)),
                Section("g_r", "变更原因", 1,
                    Field("reason", "textarea"))
            ),
        });
        list.Add(new ViewSeed { ItemType = "ECO", Name = "list", Label = "列表视图", ViewType = "list", FormScheme = Scheme() });

        // CAD detail
        list.Add(new ViewSeed
        {
            ItemType = "CAD",
            Name = "default",
            Label = "详情视图",
            ViewType = "detail",
            FormScheme = Scheme(
                Section("g_CAD模型", "CAD 模型", 2,
                    Field("cad_number", "text", req: true),
                    Field("name", "text", req: true),
                    Field("material", "select"),
                    Field("part_id", "item"))
            ),
        });
        list.Add(new ViewSeed { ItemType = "CAD", Name = "list", Label = "列表视图", ViewType = "list", FormScheme = Scheme() });

        // User detail
        list.Add(new ViewSeed
        {
            ItemType = "User",
            Name = "default",
            Label = "详情视图",
            ViewType = "detail",
            FormScheme = Scheme(
                Section("g_用户信息", "用户信息", 2,
                    Field("login_name", "text", req: true),
                    Field("name", "text", req: true),
                    Field("email", "text"),
                    Field("phone", "text")),
                Section("g_账户", "账户", 2,
                    Field("is_active", "switch"),
                    Field("company", "text"))
            ),
        });
        list.Add(new ViewSeed { ItemType = "User", Name = "list", Label = "列表视图", ViewType = "list", FormScheme = Scheme() });

        // 简单 detail 给其余类型
        foreach (var t in new[] { "Team", "LifeCycle Definition", "Workflow Definition", "Method", "Ai Scenario" })
        {
            list.Add(new ViewSeed
            {
                ItemType = t,
                Name = "default",
                Label = "详情视图",
                ViewType = "detail",
                FormScheme = Scheme(
                    Section("g_基本信息", "基本信息", 2,
                        Field("name", "text", req: true),
                        Field("label", "text"))
                ),
            });
            list.Add(new ViewSeed { ItemType = t, Name = "list", Label = "列表视图", ViewType = "list", FormScheme = Scheme() });
        }

        // 稳定 ID
        foreach (var v in list)
        {
            v.Id = Core.Items.KrasId.ForSeed($"view:{v.ItemType}:{v.ViewType}:{v.Name}");
        }
        return list;
    }
}
