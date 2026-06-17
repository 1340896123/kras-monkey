using Kras.Core;
using Kras.Core.Governance;
using Kras.Core.Items;
using Kras.Core.Metadata;

namespace Kras.Service.Seed;

/// <summary>
/// 默认种子（演示用）。结构与前端 kras-web-vue seed 一致。
/// 生产环境改由 Kras.DbInit 写入数据库。
/// </summary>
public class KrasSeedData
{
    public List<ItemType> ItemTypes { get; } = new();
    public List<Property> Properties { get; } = new();
    public List<RelationshipType> RelationshipTypes { get; } = new();
    public List<KrasList> Lists { get; } = new();
    public List<User> Users { get; } = new();
    public List<Identity> Identities { get; } = new();
    public List<Team> Teams { get; } = new();
    public List<MenuItem> Menus { get; } = new();
    public List<Item> BusinessItems { get; } = new();
    public List<ViewSeed> Views { get; set; } = new();
    public List<Item> Permissions { get; set; } = new();
}

public static class KrasSeedBuilder
{
    public static KrasSeedData Build()
    {
        var data = new KrasSeedData();

        // Lists 必须先于 Properties（Properties 通过 list key 查 data_source）
        SeedLists(data);
        SeedItemTypes(data);
        SeedProperties(data);
        SeedUsers(data);
        SeedViews(data);
        SeedPermissions(data);
        SeedBusinessItems(data);
        SeedMenus(data);

        return data;
    }

    private static void SeedItemTypes(KrasSeedData data)
    {
        string Id(string key) => KrasId.ForSeed("itemtype:" + key);
        void Add(string key, string name, string label, string? icon = null, int sortOrder = 0, int isHidden = 0, int isSystem = 0, int isVersionable = 0, int isEsIndex = 0, int isRelationship = 0, string? classStructure = null, string? labelZh = null)
        {
            data.ItemTypes.Add(new ItemType
            {
                Id = Id(key),
                Name = name,
                Label = label,
                LabelZh = labelZh ?? label,
                Icon = icon,
                SortOrder = sortOrder,
                IsHidden = isHidden,
                IsSystem = isSystem,
                IsVersionable = isVersionable,
                IsEsIndex = isEsIndex,
                IsRelationship = isRelationship,
                ClassStructure = classStructure,
                DefaultPageSize = 20,
            });
        }

        // 系统元数据
        Add("itemtype", "ItemType", "业务对象类型", "AppstoreOutlined", isHidden: 1, isSystem: 1);
        Add("property", "Property", "字段定义", "ColumnHeightOutlined", isHidden: 1, isSystem: 1, isRelationship: 1);
        Add("relationshiptype", "RelationshipType", "关系类型", "ApartmentOutlined", isHidden: 1, isSystem: 1);
        Add("list", "List", "列表", "UnorderedListOutlined", isHidden: 1, isSystem: 1);
        Add("view", "View", "视图", "LayoutOutlined", isHidden: 1, isSystem: 1);
        Add("permission", "Permission", "权限", isHidden: 1, isSystem: 1);
        Add("user", "User", "用户", "UserOutlined", sortOrder: 1);
        Add("team", "Team", "团队", "TeamOutlined", sortOrder: 2);
        Add("lifecycle", "LifeCycleDefinition", "生命周期定义", "NodeIndexOutlined", sortOrder: 3);
        Add("workflow", "WorkflowDefinition", "工作流定义", "DeploymentUnitOutlined", sortOrder: 4);
        Add("method", "Method", "方法", "CodeOutlined", sortOrder: 5);
        Add("aiscenario", "AiScenario", "AI 场景", "RobotOutlined", sortOrder: 6);

        // 业务示例
        Add("part", "Part", "物料", "BlockOutlined", sortOrder: 10, isVersionable: 1, isEsIndex: 1,
            classStructure: "{\"roots\":[\"Mechanical\",\"Electrical\",\"Consumable\"]}", labelZh: "物料");
        Add("document", "Document", "文档", "FileTextOutlined", sortOrder: 11, isVersionable: 1, isEsIndex: 1, labelZh: "文档");
        Add("bom", "BOM", "物料清单", "PartitionOutlined", sortOrder: 12, isRelationship: 1);
        Add("eco", "ECO", "工程变更单", "SyncOutlined", sortOrder: 13, isEsIndex: 1);
        Add("cad", "CAD", "CAD 模型", "BoxPlotOutlined", sortOrder: 14, isVersionable: 1);
    }

    private static void SeedProperties(KrasSeedData data)
    {
        var byName = data.ItemTypes.ToDictionary(t => t.Name, t => t.Id);
        var byListKey = new Dictionary<string, string>();
        foreach (var l in data.Lists) byListKey[l.Name] = l.Id;

        void Add(string itemTypeName, string name, string label, PropertyDataType dt,
            int sortOrder, bool required = false, bool unique = false, bool hidden = false, bool isReadonly = false,
            string? listKey = null, string? itemRef = null, int? length = null, int? columnWidth = null, string? columnAlign = null,
            int? precision = null, int? scale = null, string? defaultValue = null, string? labelZh = null)
        {
            data.Properties.Add(new Property
            {
                Id = KrasId.ForSeed($"prop:{itemTypeName}:{name}"),
                SourceId = byName[itemTypeName],
                Name = name,
                Label = label,
                LabelZh = labelZh ?? label,
                DataType = dt,
                SortOrder = sortOrder,
                IsRequired = required ? 1 : 0,
                IsUnique = unique ? 1 : 0,
                IsHidden = hidden ? 1 : 0,
                IsReadonly = isReadonly ? 1 : 0,
                DataSource = listKey != null && byListKey.TryGetValue(listKey, out var lid) ? lid
                    : itemRef != null ? byName[itemRef] : null,
                DataLength = length,
                ColumnWidth = columnWidth,
                ColumnAlign = columnAlign,
                DataPrecision = precision,
                DataScale = scale,
                DefaultValue = defaultValue,
            });
        }

        // Part
        Add("Part", "item_number", "物料编号", PropertyDataType.String, 1, required: true, unique: true, length: 64, columnWidth: 160);
        Add("Part", "name", "名称", PropertyDataType.String, 2, required: true, length: 200, columnWidth: 200);
        Add("Part", "classification", "分类", PropertyDataType.Classification, 3, columnWidth: 140);
        Add("Part", "make_buy", "Make/Buy", PropertyDataType.List, 4, listKey: "make_buy", columnWidth: 100, columnAlign: "center");
        Add("Part", "unit", "单位", PropertyDataType.List, 5, listKey: "uom", columnWidth: 80, columnAlign: "center");
        Add("Part", "cost", "成本", PropertyDataType.Decimal, 6, precision: 18, scale: 4, columnWidth: 120, columnAlign: "right");
        Add("Part", "qty_on_hand", "库存", PropertyDataType.Integer, 7, columnWidth: 100, columnAlign: "right");
        Add("Part", "description", "描述", PropertyDataType.Text, 8, hidden: true, length: 2000);
        Add("Part", "lifecycle_state", "生命周期", PropertyDataType.String, 9, isReadonly: true, columnWidth: 120);
        Add("Part", "is_active", "启用", PropertyDataType.Boolean, 10, defaultValue: "1", columnWidth: 80, columnAlign: "center");
        Add("Part", "thumbnail", "缩略图", PropertyDataType.Image, 11, hidden: true);

        // Document
        Add("Document", "document_number", "文档编号", PropertyDataType.String, 1, required: true, unique: true, length: 64, columnWidth: 160);
        Add("Document", "title", "标题", PropertyDataType.String, 2, required: true, length: 200, columnWidth: 220);
        Add("Document", "category", "类型", PropertyDataType.List, 3, listKey: "doc_category", columnWidth: 120);
        Add("Document", "author_id", "作者", PropertyDataType.Item, 4, itemRef: "User", columnWidth: 140);
        Add("Document", "version", "版本", PropertyDataType.String, 5, isReadonly: true, columnWidth: 80, columnAlign: "center");
        Add("Document", "release_date", "发布日期", PropertyDataType.Date, 6, columnWidth: 130);
        Add("Document", "is_confidential", "机密", PropertyDataType.Boolean, 7, columnWidth: 80, columnAlign: "center");

        // ECO
        Add("ECO", "eco_number", "变更单号", PropertyDataType.String, 1, required: true, unique: true, length: 64, columnWidth: 160);
        Add("ECO", "title", "标题", PropertyDataType.String, 2, required: true, length: 200, columnWidth: 240);
        Add("ECO", "reason", "变更原因", PropertyDataType.Text, 3, length: 2000);
        Add("ECO", "priority", "优先级", PropertyDataType.List, 4, listKey: "priority", columnWidth: 100, columnAlign: "center");
        Add("ECO", "status", "状态", PropertyDataType.List, 5, listKey: "eco_status", isReadonly: true, columnWidth: 100, columnAlign: "center");
        Add("ECO", "requester_id", "申请人", PropertyDataType.Item, 6, itemRef: "User", columnWidth: 140);

        // CAD
        Add("CAD", "cad_number", "CAD 编号", PropertyDataType.String, 1, required: true, unique: true, length: 64, columnWidth: 160);
        Add("CAD", "name", "名称", PropertyDataType.String, 2, required: true, length: 200, columnWidth: 220);
        Add("CAD", "material", "材料", PropertyDataType.List, 3, listKey: "material", columnWidth: 120);
        Add("CAD", "part_id", "关联物料", PropertyDataType.Item, 4, itemRef: "Part", columnWidth: 200);

        // User
        Add("User", "login_name", "登录名", PropertyDataType.String, 1, required: true, unique: true, length: 64, columnWidth: 140);
        Add("User", "name", "姓名", PropertyDataType.String, 2, required: true, length: 64, columnWidth: 140);
        Add("User", "email", "邮箱", PropertyDataType.String, 3, length: 128, columnWidth: 200);
        Add("User", "phone", "手机", PropertyDataType.String, 4, length: 32, columnWidth: 140);
        Add("User", "is_active", "启用", PropertyDataType.Boolean, 5, defaultValue: "1", columnWidth: 80, columnAlign: "center");
        Add("User", "company", "公司", PropertyDataType.String, 6, length: 128, columnWidth: 180);
    }

    private static void SeedLists(KrasSeedData data)
    {
        void Add(string key, string label, params (string value, string lab)[] values)
        {
            var list = new KrasList
            {
                Id = KrasId.ForSeed("list:" + key),
                Name = key,
                Label = label,
            };
            for (var i = 0; i < values.Length; i++)
            {
                list.Values.Add(new KrasListValue
                {
                    Id = KrasId.ForSeed($"listvalue:{key}:{values[i].value}"),
                    Value = values[i].value,
                    Label = values[i].lab,
                    SortOrder = i + 1,
                });
            }
            data.Lists.Add(list);
        }

        // 注意：先于 ItemType 添加，但因为 SeedProperties 使用 byListKey 查找，
        // 这里需要把 Lists 数据提前放到 data.Lists 才行。改成在 Build 入口先调用。
        Add("make_buy", "Make/Buy",
            ("make", "制造"), ("buy", "采购"), ("phantom", "虚拟件"));
        Add("uom", "单位",
            ("pcs", "件"), ("kg", "千克"), ("m", "米"), ("set", "套"), ("l", "升"));
        Add("doc_category", "文档类型",
            ("spec", "规格书"), ("drawing", "图纸"), ("manual", "手册"), ("report", "报告"), ("other", "其他"));
        Add("priority", "优先级",
            ("low", "低"), ("medium", "中"), ("high", "高"), ("critical", "紧急"));
        Add("eco_status", "ECO 状态",
            ("draft", "草稿"), ("submitted", "已提交"), ("approved", "已批准"), ("rejected", "已驳回"), ("implemented", "已实施"));
        Add("material", "材料",
            ("steel", "钢"), ("aluminum", "铝"), ("plastic", "塑料"), ("copper", "铜"), ("composite", "复合材料"));
    }

    private static void SeedUsers(KrasSeedData data)
    {
        void AddIdentity(string key, string name)
        {
            data.Identities.Add(new Identity { Id = KrasId.ForSeed("identity:" + key), Name = name });
        }
        void AddUser(string key, string login, string name, string email, string password, string company)
        {
            var uid = KrasId.ForSeed("user:" + key);
            var iid = KrasId.ForSeed("identity:" + key);
            data.Users.Add(new User
            {
                Id = uid,
                LoginName = login,
                Name = name,
                Email = email,
                IsActive = 1,
                IsLoginAllowed = 1,
                Company = company,
                Password = password,
                IdentityIds = new List<string> { iid },
            });
            data.Identities.Add(new Identity { Id = iid, Name = login });
        }

        AddUser("admin", "admin", "系统管理员", "admin@kras.demo", "admin", "Kras");
        AddUser("pmlin", "pmlin", "张文清", "pmlin@kras.demo", "pmlin", "Kras");
        AddUser("engineer", "engineer", "李工", "engineer@kras.demo", "engineer", "Kras");
        AddUser("viewer", "viewer", "王查阅", "viewer@kras.demo", "viewer", "Kras");

        data.Teams.Add(new Team
        {
            Id = KrasId.ForSeed("team:plm"),
            Name = "plm",
            Label = "PLM 团队",
            IdentityIds = new List<string> { KrasId.ForSeed("identity:admin"), KrasId.ForSeed("identity:pmlin") },
        });
        data.Teams.Add(new Team
        {
            Id = KrasId.ForSeed("team:rd"),
            Name = "rd",
            Label = "研发团队",
            IdentityIds = new List<string> { KrasId.ForSeed("identity:engineer") },
        });
    }

    private static readonly string[] PartCategories =
    {
        "Mechanical/Fastener", "Mechanical/Bearing", "Mechanical/Shaft",
        "Electrical/Resistor", "Electrical/Capacitor", "Electrical/IC",
        "Consumable/Label",
    };
    private static readonly string[] PartNames =
    {
        "深沟球轴承 6204", "圆锥滚子轴承 30205", "内六角螺栓 M6×20", "内六角螺栓 M8×30", "十字盘头螺钉 M4×10",
        "平垫圈 M6", "平垫圈 M8", "弹簧垫圈 M6", "主轴 φ25×200", "传动轴 φ18×150",
        "0805 电阻 10kΩ", "0805 电阻 4.7kΩ", "0603 电阻 1kΩ", "铝电解电容 100μF", "陶瓷电容 0.1μF",
        "钽电容 10μF", "STM32F407VGT6", "TPS61023DRLR", "LM2596S-5.0", "W25Q128JVSIQ",
        "尼龙柱 M3×15", "PCB 支撑 φ8", "热缩管 φ3", "标签纸 30×40", "防静电袋 100×150",
        "深沟球轴承 6205", "推力球轴承 51200", "直线轴承 LM12UU", "联轴器 6×8", "同步带 HTD-5M-280",
        "主轴 φ32×300", "导轨 SBR16", "滑块 SBR16UU", "齿轮模数 1.5", "蜗杆模数 2",
        "0805 电感 10μH", "共模电感 2×1mH", "TVS 二极管 SMAJ12A", "肖特基二极管 SS34", "光耦 TLP281-4",
        "EEPROM 24C256", "运放 LM358", "比较器 LM393", "DC 插座 5.5×2.1", "MicroUSB 母座",
        "Type-C 母座 16P", "Type-C 母座 24P", "蓝牙模块 HC-05", "WiFi 模块 ESP-12F", "4G 模块 SIM7600",
    };

    private static void SeedViews(KrasSeedData data)
    {
        data.Views = ViewSeedBuilder.Build();
    }

    private static void SeedPermissions(KrasSeedData data)
    {
        // 为每个业务 ItemType 创建一个默认 Permission
        foreach (var it in data.ItemTypes.Where(t => t.IsSystem == 0))
        {
            data.Permissions.Add(new Item
            {
                ["@type"] = "Permission",
                ["@id"] = KrasId.ForSeed("permission:" + it.Name),
                ["@keyed_name"] = $"{it.Name}:default",
                ["name"] = $"{it.Name}:default",
                ["source_id"] = it.Id,
                ["is_private"] = 0,
            });
        }
    }

    private static void SeedBusinessItems(KrasSeedData data)
    {
        var rand = new Random(42);
        for (var i = 0; i < PartNames.Length; i++)
        {
            var itemNumber = $"P-{10000 + i:D5}";
            var item = new Item
            {
                ["@type"] = "Part",
                ["@id"] = KrasId.NewId(),
                ["@keyed_name"] = $"{itemNumber} {PartNames[i]}",
                ["item_number"] = itemNumber,
                ["name"] = PartNames[i],
                ["classification"] = PartCategories[i % PartCategories.Length],
                ["make_buy"] = new[] { "make", "buy", "phantom" }[i % 3],
                ["unit"] = new[] { "pcs", "kg", "m", "set", "l" }[i % 5],
                ["cost"] = Math.Round(rand.NextDouble() * 500 + 5, 2),
                ["qty_on_hand"] = rand.Next(0, 1000),
                ["description"] = $"{PartNames[i]}，分类 {PartCategories[i % PartCategories.Length]}",
                ["lifecycle_state"] = new[] { "草稿", "已发布", "已发布", "已废止" }[i % 4],
                ["is_active"] = i % 7 == 0 ? 0 : 1,
                ["major_rev"] = "A",
                ["minor_rev"] = (1 + i % 3).ToString(),
                ["generation"] = 1,
                ["is_released"] = i % 3 == 0 ? 1 : 0,
                ["is_current"] = 1,
                ["created_on"] = DateTime.UtcNow.AddDays(-i).ToString("yyyy-MM-dd"),
                ["owned_by_id"] = KrasId.ForSeed("identity:engineer"),
            };
            data.BusinessItems.Add(item);
        }

        // Document 10 条
        var docTitles = new[]
        {
            "主轴机械设计规格书", "PCBA 电路原理图 V2", "产品装配手册", "环境测试报告 2025Q1", "电源模块 BOM 清单",
            "固件版本说明 v3.2", "电源板 Layout 设计文档", "外壳 3D 图纸 STEP", "结构应力分析报告", "EMC 测试报告",
        };
        for (var i = 0; i < docTitles.Length; i++)
        {
            var num = $"D-{20000 + i:D5}";
            data.BusinessItems.Add(new Item
            {
                ["@type"] = "Document",
                ["@id"] = KrasId.NewId(),
                ["@keyed_name"] = $"{num} {docTitles[i]}",
                ["document_number"] = num,
                ["title"] = docTitles[i],
                ["category"] = new[] { "spec", "drawing", "manual", "report", "other" }[i % 5],
                ["author_id"] = new[] { "admin", "pmlin", "engineer" }[i % 3],
                ["version"] = $"{(char)('A' + i % 4)}.{(i % 3) + 1}",
                ["release_date"] = DateTime.UtcNow.AddDays(-i * 2).ToString("yyyy-MM-dd"),
                ["is_confidential"] = i % 5 == 0 ? 1 : 0,
                ["major_rev"] = ((char)('A' + i % 4)).ToString(),
                ["minor_rev"] = ((i % 3) + 1).ToString(),
                ["is_released"] = i % 2,
                ["is_current"] = 1,
            });
        }

        // ECO 6 条
        var ecoTitles = new[]
        {
            "主轴材料由 45# 钢改为 40Cr", "电源模块输出电压调整 5V→5.1V", "PCB 板厚由 1.6mm 改为 2.0mm",
            "外壳颜色统一为工业灰", "0805 电阻供应商替换", "增加防静电标识",
        };
        for (var i = 0; i < ecoTitles.Length; i++)
        {
            var num = $"ECO-{30000 + i:D5}";
            data.BusinessItems.Add(new Item
            {
                ["@type"] = "ECO",
                ["@id"] = KrasId.NewId(),
                ["@keyed_name"] = $"{num} {ecoTitles[i]}",
                ["eco_number"] = num,
                ["title"] = ecoTitles[i],
                ["reason"] = $"{ecoTitles[i]}：基于产品工艺优化与降本考量发起变更。",
                ["priority"] = new[] { "low", "medium", "high", "critical" }[i % 4],
                ["status"] = new[] { "draft", "submitted", "approved", "rejected", "implemented" }[i % 5],
                ["requester_id"] = KrasId.ForSeed("user:pmlin"),
                ["owned_by_id"] = KrasId.ForSeed("identity:pmlin"),
            });
        }

        // 元数据本身也作为 Item 暴露（供前端 get 调用）
        foreach (var t in data.ItemTypes)
        {
            data.BusinessItems.Add(new Item
            {
                ["@type"] = "ItemType",
                ["@id"] = t.Id,
                ["id"] = t.Id,
                ["@keyed_name"] = t.Label,
                ["name"] = t.Name,
                ["label"] = t.Label,
                ["label_zh"] = t.LabelZh,
                ["icon"] = t.Icon,
                ["is_relationship"] = t.IsRelationship,
                ["is_versionable"] = t.IsVersionable,
                ["is_es_index"] = t.IsEsIndex,
                ["is_hidden"] = t.IsHidden,
                ["is_system"] = t.IsSystem,
                ["sort_order"] = t.SortOrder,
                ["default_page_size"] = t.DefaultPageSize,
                ["class_structure"] = t.ClassStructure,
                ["implementation_type"] = t.ImplementationType,
            });
        }
        foreach (var p in data.Properties)
        {
            data.BusinessItems.Add(new Item
            {
                ["@type"] = "Property",
                ["@id"] = p.Id,
                ["id"] = p.Id,
                ["@keyed_name"] = p.Label,
                ["source_id"] = p.SourceId,
                ["name"] = p.Name,
                ["label"] = p.Label,
                ["label_zh"] = p.LabelZh,
                ["data_type"] = p.DataType.ToString().ToLowerInvariant(),
                ["data_source"] = p.DataSource,
                ["foreign_property"] = p.ForeignProperty,
                ["is_required"] = p.IsRequired,
                ["is_unique"] = p.IsUnique,
                ["is_hidden"] = p.IsHidden,
                ["is_hidden2"] = p.IsHidden2,
                ["is_readonly"] = p.IsReadonly,
                ["default_value"] = p.DefaultValue,
                ["sort_order"] = p.SortOrder,
                ["column_width"] = p.ColumnWidth,
                ["column_align"] = p.ColumnAlign,
                ["data_length"] = p.DataLength,
                ["data_precision"] = p.DataPrecision,
                ["data_scale"] = p.DataScale,
            });
        }
        foreach (var l in data.Lists)
        {
            data.BusinessItems.Add(new Item
            {
                ["@type"] = "List",
                ["@id"] = l.Id,
                ["@keyed_name"] = l.Label,
                ["name"] = l.Name,
                ["label"] = l.Label,
                ["values"] = l.Values,
            });
        }

        // 把 Users 暴露为可查询 Item
        foreach (var u in data.Users)
        {
            data.BusinessItems.Add(new Item
            {
                ["@type"] = "User",
                ["@id"] = u.Id,
                ["@keyed_name"] = $"{u.LoginName} {u.Name}",
                ["login_name"] = u.LoginName,
                ["name"] = u.Name,
                ["email"] = u.Email,
                ["phone"] = u.Phone,
                ["is_active"] = u.IsActive,
                ["company"] = u.Company,
            });
        }

        // Views 暴露为可查询 Item（含 form_scheme）
        foreach (var v in data.Views)
        {
            var byName = data.ItemTypes.ToDictionary(t => t.Name, t => t.Id);
            var sourceId = byName.TryGetValue(v.ItemType, out var sid) ? sid : "";
            data.BusinessItems.Add(new Item
            {
                ["@type"] = "View",
                ["@id"] = v.Id,
                ["@keyed_name"] = v.Label,
                ["name"] = v.Name,
                ["label"] = v.Label,
                ["source_id"] = sourceId,
                ["view_type"] = v.ViewType,
                ["is_default"] = v.IsDefault,
                ["sort_order"] = v.SortOrder,
                ["form_scheme"] = v.FormScheme,
            });
        }

        // Permissions
        foreach (var p in data.Permissions)
        {
            data.BusinessItems.Add(p.Clone());
        }
    }

    private static void SeedMenus(KrasSeedData data)
    {
        var order = 0;
        void Add(string key, string label, string? parentId, string? path, string icon)
        {
            data.Menus.Add(new MenuItem
            {
                Id = KrasId.ForSeed("menu:" + key),
                ParentId = parentId,
                Name = key,
                Label = label,
                Path = path,
                Icon = icon,
                SortOrder = order++,
                IsHidden = 0,
            });
        }

        Add("dashboard", "仪表盘", null, "/dashboard", "DashboardOutlined");

        // 业务对象分组
        var businessGroupId = KrasId.ForSeed("menu:group-business");
        Add("group-business", "业务对象", null, null, "AppstoreOutlined");
        foreach (var it in data.ItemTypes.Where(t => t.IsSystem == 0 && t.IsHidden == 0).OrderBy(t => t.SortOrder))
        {
            data.Menus.Add(new MenuItem
            {
                Id = KrasId.ForSeed($"menu:it:{it.Name}"),
                ParentId = businessGroupId,
                Name = it.Name,
                Label = it.LabelZh ?? it.Label,
                Path = $"/item-types/{it.Name}",
                Icon = it.Icon ?? "BlockOutlined",
                SortOrder = order++,
                IsHidden = 0,
            });
        }

        var sysGroupId = KrasId.ForSeed("menu:group-system");
        Add("group-system", "系统管理", null, null, "ToolOutlined");
        Add("users", "用户管理", sysGroupId, "/users", "UserOutlined");
        Add("menu-management", "菜单管理", sysGroupId, "/menu-management", "MenuOutlined");
        Add("ai-management", "AI 管理", sysGroupId, "/ai-management", "RobotOutlined");
        Add("settings", "系统设置", sysGroupId, "/settings", "SettingOutlined");
        Add("debug-panel", "调试面板", sysGroupId, "/debug-panel", "BugOutlined");
    }
}
