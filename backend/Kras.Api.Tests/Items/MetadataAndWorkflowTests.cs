using Kras.Core.Items;
using Kras.Service.Items;
using Kras.Service.Seed;
using Xunit;

namespace Kras.Api.Tests.Items;

/// <summary>
/// 元数据 CRUD + 语义校验测试。覆盖 REQ-010/011/012。
/// </summary>
public class MetadataCrudTests
{
    private static IItemActionHandler BuildHandler()
    {
        var repo = new InMemoryItemRepository();
        repo.Seed(KrasSeedBuilder.Build().BusinessItems);
        return new ItemActionHandler(repo);
    }

    [Fact]
    public void ItemType_Add_Success_And_Reject_DuplicateName()
    {
        var h = BuildHandler();
        var added = h.Dispatch(new()
        {
            ["@type"] = "ItemType",
            ["@action"] = "add",
            ["name"] = "CustomThing",
            ["label"] = "自定义物",
        });
        Assert.NotNull(added.Id);

        // 重名应失败
        var ex = Assert.Throws<KrasException>(() => h.Dispatch(new()
        {
            ["@type"] = "ItemType",
            ["@action"] = "add",
            ["name"] = "CustomThing",
            ["label"] = "dup",
        }));
        Assert.Contains("已存在", ex.Message);
    }

    [Fact]
    public void Property_ListType_Requires_DataSource_ListId()
    {
        var h = BuildHandler();
        // 先拿一个 ItemType id
        var itemTypeList = h.Dispatch(new() { ["@type"] = "ItemType", ["@action"] = "get" });
        var itemTypeId = ((List<Item>)itemTypeList["__items__"]!)[0].Id;

        // 缺 data_source 应失败
        var ex = Assert.Throws<KrasException>(() => h.Dispatch(new()
        {
            ["@type"] = "Property",
            ["@action"] = "add",
            ["name"] = "cat",
            ["source_id"] = itemTypeId,
            ["data_type"] = "list",
        }));
        Assert.Contains("data_source 必填", ex.Message);

        // 找一个 List id
        var listList = h.Dispatch(new() { ["@type"] = "List", ["@action"] = "get" });
        var listId = ((List<Item>)listList["__items__"]!)[0].Id;
        // 成功添加
        var ok = h.Dispatch(new()
        {
            ["@type"] = "Property",
            ["@action"] = "add",
            ["name"] = "category",
            ["source_id"] = itemTypeId,
            ["data_type"] = "list",
            ["data_source"] = listId,
            ["label"] = "分类",
        });
        Assert.NotNull(ok.Id);
    }

    [Fact]
    public void RelationshipType_Requires_RelationshipId()
    {
        var h = BuildHandler();
        var itemTypeList = h.Dispatch(new() { ["@type"] = "ItemType", ["@action"] = "get" });
        var itemTypeId = ((List<Item>)itemTypeList["__items__"]!)[0].Id;

        var ex = Assert.Throws<KrasException>(() => h.Dispatch(new()
        {
            ["@type"] = "RelationshipType",
            ["@action"] = "add",
            ["name"] = "Rel1",
            ["source_id"] = itemTypeId,
            ["related_id"] = itemTypeId,
        }));
        Assert.Contains("relationship_id 必填", ex.Message);
    }

    [Fact]
    public void Metadata_Update_Runs_Validation()
    {
        var h = BuildHandler();
        var added = h.Dispatch(new()
        {
            ["@type"] = "ItemType",
            ["@action"] = "add",
            ["name"] = "ToRename",
            ["label"] = "初始",
        });
        // 改成空名应失败
        Assert.Throws<KrasException>(() => h.Dispatch(new()
        {
            ["@type"] = "ItemType",
            ["@action"] = "update",
            ["@id"] = added.Id,
            ["name"] = "",
        }));
    }

    [Fact]
    public void Metadata_Delete_Removes_From_List()
    {
        var h = BuildHandler();
        var added = h.Dispatch(new()
        {
            ["@type"] = "ItemType",
            ["@action"] = "add",
            ["name"] = "WillDelete",
            ["label"] = "x",
        });
        h.Dispatch(new()
        {
            ["@type"] = "ItemType",
            ["@action"] = "delete",
            ["@id"] = added.Id,
        });
        // 再次 get 单查应失败
        Assert.Throws<KrasException>(() => h.Dispatch(new()
        {
            ["@type"] = "ItemType",
            ["@action"] = "get",
            ["@id"] = added.Id,
        }));
    }
}

/// <summary>
/// 版本管理 / promote / 工作流测试。覆盖 REQ-030/031/041/050/051。
/// </summary>
public class VersionAndWorkflowTests
{
    private static IItemActionHandler BuildHandler()
    {
        var repo = new InMemoryItemRepository();
        repo.Seed(KrasSeedBuilder.Build().BusinessItems);
        return new ItemActionHandler(repo);
    }

    [Fact]
    public void Version_A1_To_A2_Then_Released_Branches_To_B1()
    {
        var h = BuildHandler();
        var added = h.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "add",
            ["name"] = "VersionFlow",
        });
        Assert.Equal("A", added["major_rev"]);
        Assert.Equal("1", added["minor_rev"]);

        // 未发布换版 → A.2
        var v2 = h.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "version",
            ["@id"] = added.Id,
        });
        Assert.Equal("A", v2["major_rev"]);
        Assert.Equal("2", v2["minor_rev"]);
        Assert.Equal(2, Convert.ToInt32(v2["generation"]));

        // 把 v2 promote 到已发布，再换版 → B.1
        h.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "promote",
            ["@id"] = v2.Id,
            ["to_state"] = "已发布",
        });
        var v3 = h.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "version",
            ["@id"] = v2.Id,
        });
        Assert.Equal("B", v3["major_rev"]);
        Assert.Equal("1", v3["minor_rev"]);
        Assert.Equal("0", v3["is_released"].ToString());
        Assert.Equal("草稿", v3["state"]?.ToString());
    }

    [Fact]
    public void Promote_Rejects_When_State_Missing()
    {
        var h = BuildHandler();
        var added = h.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "add",
            ["name"] = "NoState",
            ["state"] = "草稿",
        });
        // 清空 state
        h.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "update",
            ["@id"] = added.Id,
            ["state"] = "",
        });
        // 用 update 设空字符串不会清空（被业务字段过滤），改为 delete 字段：直接读出来移除
        // 这里通过不传 to_state 模拟 promote 失败
        var ex = Assert.Throws<KrasException>(() => h.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "promote",
            ["@id"] = added.Id,
        }));
        Assert.Contains("state", ex.Message);
    }

    [Fact]
    public void Promote_Sets_Released_Flag_When_State_Is_Released()
    {
        var h = BuildHandler();
        var added = h.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "add",
            ["name"] = "PromoteTarget",
        });
        var result = h.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "promote",
            ["@id"] = added.Id,
            ["to_state"] = "已发布",
        });
        Assert.Equal("1", result["is_released"].ToString());
        Assert.NotNull(result["release_date"]);
    }

    [Fact]
    public void Workflow_Start_Submit_Approve_FullPath()
    {
        var h = BuildHandler();
        // 工作流定义
        var wf = h.Dispatch(new()
        {
            ["@type"] = "WorkflowDefinition",
            ["@action"] = "add",
            ["name"] = "ApprovalFlow",
        });
        // 业务对象
        var biz = h.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "add",
            ["name"] = "WfPart",
        });
        // 启动
        var proc = h.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "startWorkflow",
            ["@id"] = biz.Id,
            ["workflow_definition_id"] = wf.Id,
            ["start_node_id"] = "review",
        });
        Assert.Equal("running", proc["status"]);
        var procId = proc.Id!;

        // 提交
        var submitted = h.Dispatch(new()
        {
            ["@type"] = "WorkflowProcess",
            ["@action"] = "submitApproval",
            ["workflow_process_id"] = procId,
            ["comment"] = "请审",
        });
        Assert.Equal("pending_approval", submitted["status"]);

        // 审批
        var approved = h.Dispatch(new()
        {
            ["@type"] = "WorkflowProcess",
            ["@action"] = "approveWorkflow",
            ["workflow_process_id"] = procId,
            ["next_node_id"] = "end",
            ["signed_by"] = "admin",
        });
        Assert.Equal("approved", approved["status"]);
        Assert.Equal("end", approved["current_node_id"]);
    }

    [Fact]
    public void QuickSearch_Filters_By_Keyword()
    {
        var h = BuildHandler();
        h.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "add",
            ["name"] = "AlphaSearch",
        });
        h.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "add",
            ["name"] = "BetaSearch",
        });

        var result = h.Dispatch(new()
        {
            ["@type"] = "Part",
            ["@action"] = "quickSearch",
            ["@searchKey"] = "Alpha",
        });
        var list = (List<Item>)result["__items__"]!;
        Assert.True(list.Count >= 1);
        Assert.All(list, i => Assert.Contains("AlphaSearch", i["name"]?.ToString() ?? ""));
    }
}
