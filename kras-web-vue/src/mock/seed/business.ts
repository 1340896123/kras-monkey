// seed/business.ts —— 业务对象示例数据（Part / Document / BOM / ECO / CAD / Method / LifeCycle / Workflow）
// 对应需求 §2.2、design.md §3.1

import type { KrasItem } from '@/types'
import { id, newId } from './id'

const now = Date.now()
const day = 86400000
const dateStr = (offset: number) => new Date(now + offset * day).toISOString().slice(0, 10)

// ===== Part（50 条示例）=====
const partCategories = ['Mechanical/Fastener', 'Mechanical/Bearing', 'Mechanical/Shaft', 'Electrical/Resistor', 'Electrical/Capacitor', 'Electrical/IC', 'Consumable/Label']
const partNames = [
  '深沟球轴承 6204', '圆锥滚子轴承 30205', '内六角螺栓 M6×20', '内六角螺栓 M8×30', '十字盘头螺钉 M4×10',
  '平垫圈 M6', '平垫圈 M8', '弹簧垫圈 M6', '主轴 φ25×200', '传动轴 φ18×150',
  '0805 电阻 10kΩ', '0805 电阻 4.7kΩ', '0603 电阻 1kΩ', '铝电解电容 100μF', '陶瓷电容 0.1μF',
  '钽电容 10μF', 'STM32F407VGT6', 'TPS61023DRLR', 'LM2596S-5.0', 'W25Q128JVSIQ',
  '尼龙柱 M3×15', 'PCB 支撑 φ8', '热缩管 φ3', '标签纸 30×40', '防静电袋 100×150',
  '深沟球轴承 6205', '推力球轴承 51200', '直线轴承 LM12UU', '联轴器 6×8', '同步带 HTD-5M-280',
  '主轴 φ32×300', '导轨 SBR16', '滑块 SBR16UU', '齿轮模数 1.5', '蜗杆模数 2',
  '0805 电感 10μH', '共模电感 2×1mH', 'TVS 二极管 SMAJ12A', '肖特基二极管 SS34', '光耦 TLP281-4',
  'EEPROM 24C256', '运放 LM358', '比较器 LM393', 'DC 插座 5.5×2.1', 'MicroUSB 母座',
  'Type-C 母座 16P', 'Type-C 母座 24P', '蓝牙模块 HC-05', 'WiFi 模块 ESP-12F', '4G 模块 SIM7600',
]

export const parts: KrasItem[] = partNames.map((name, i) => {
  const cat = partCategories[i % partCategories.length]
  const makeBuy = ['make', 'buy', 'phantom'][i % 3]
  const unit = ['pcs', 'kg', 'm', 'set', 'l'][i % 5]
  return {
    '@type': 'Part',
    '@id': newId(),
    '@keyed_name': `P-${String(10000 + i).padStart(5, '0')} ${name}`,
    item_number: `P-${String(10000 + i).padStart(5, '0')}`,
    name,
    classification: cat,
    make_buy: makeBuy,
    unit,
    cost: parseFloat((Math.random() * 500 + 5).toFixed(2)),
    qty_on_hand: Math.floor(Math.random() * 1000),
    description: `${name}，分类 ${cat}`,
    lifecycle_state: ['草稿', '已发布', '已发布', '已废止'][i % 4],
    is_active: i % 7 === 0 ? 0 : 1,
    major_rev: 'A',
    minor_rev: String(1 + (i % 3)),
    generation: 1,
    is_released: i % 3 === 0 ? 1 : 0,
    is_current: 1,
    created_on: dateStr(-i),
    owned_by_id: id('identity:engineer'),
  }
})

// ===== Document（30 条）=====
const docTitles = [
  '主轴机械设计规格书', 'PCBA 电路原理图 V2', '产品装配手册', '环境测试报告 2025Q1',
  '电源模块 BOM 清单', '固件版本说明 v3.2', '电源板 Layout 设计文档', '外壳 3D 图纸 STEP',
  '结构应力分析报告', 'EMC 测试报告', 'RoHS 合规声明', '可靠性测试方案',
  '安全规范检查表', '供应商评审记录', '物料认证报告 P-10001', '物料认证报告 P-10010',
  '运输包装规范', '用户操作手册 v1.0', '快速安装指南', '故障排查手册',
  'CAD 模型变更说明', '工艺流程图 v3', '质量检验规范', 'IQC 进料检验标准',
  'OQC 出货检验标准', '返修流程指南', '维修手册 v2', 'RF 性能测试报告',
  '盐雾测试结果', '跌落测试报告',
]
export const documents: KrasItem[] = docTitles.map((title, i) => ({
  '@type': 'Document',
  '@id': newId(),
  '@keyed_name': `D-${String(20000 + i).padStart(5, '0')} ${title}`,
  document_number: `D-${String(20000 + i).padStart(5, '0')}`,
  title,
  category: ['spec', 'drawing', 'manual', 'report', 'other'][i % 5],
  author_id: [id('user:engineer'), id('user:pmlin'), id('user:admin')][i % 3],
  version: `${String.fromCharCode(65 + (i % 4))}.${(i % 3) + 1}`,
  release_date: dateStr(-i * 2),
  is_confidential: i % 5 === 0 ? 1 : 0,
  major_rev: String.fromCharCode(65 + (i % 4)),
  minor_rev: String((i % 3) + 1),
  is_released: i % 2,
  is_current: 1,
  owned_by_id: id('identity:engineer'),
}))

// ===== ECO（10 条）=====
const ecoTitles = [
  '主轴材料由 45# 钢改为 40Cr', '电源模块输出电压调整 5V→5.1V', 'PCB 板厚由 1.6mm 改为 2.0mm',
  '外壳颜色统一为工业灰', '0805 电阻供应商替换', '包装箱尺寸优化', '增加防静电标识',
  '蓝牙模组升级为 V5.2', '增加 ROHS 复检工序', '主控芯片 STM32 替换为国产 GD32',
]
export const ecos: KrasItem[] = ecoTitles.map((title, i) => ({
  '@type': 'ECO',
  '@id': newId(),
  '@keyed_name': `ECO-${String(30000 + i).padStart(5, '0')} ${title}`,
  eco_number: `ECO-${String(30000 + i).padStart(5, '0')}`,
  title,
  reason: `${title}：基于产品工艺优化与降本考量发起变更。`,
  priority: ['low', 'medium', 'high', 'critical'][i % 4],
  status: ['draft', 'submitted', 'approved', 'rejected', 'implemented'][i % 5],
  requester_id: id('user:pmlin'),
  owned_by_id: id('identity:pmlin'),
  created_on: dateStr(-i * 3),
}))

// ===== BOM（10 条关系，关联 parts 之间）=====
export const boms: KrasItem[] = Array.from({ length: 10 }, (_, i) => {
  const parent = parts[i * 2]
  const child = parts[(i * 2 + 1) % parts.length]
  return {
    '@type': 'BOM',
    '@id': newId(),
    '@keyed_name': `${parent['@keyed_name']} → ${child['@keyed_name']}`,
    source_id: parent['@id'],
    related_id: child['@id'],
    quantity: parseFloat((Math.random() * 10 + 1).toFixed(2)),
    sort_order: i + 1,
    effective_from: dateStr(-30),
    effective_to: dateStr(365),
    owned_by_id: id('identity:engineer'),
  }
})

// ===== CAD（10 条）=====
export const cads: KrasItem[] = Array.from({ length: 10 }, (_, i) => {
  const part = parts[i * 3]
  return {
    '@type': 'CAD',
    '@id': newId(),
    '@keyed_name': `CAD-${String(40000 + i).padStart(5, '0')} ${part['name']}`,
    cad_number: `CAD-${String(40000 + i).padStart(5, '0')}`,
    name: part['name'] + ' CAD 模型',
    material: ['steel', 'aluminum', 'plastic', 'copper', 'composite'][i % 5],
    part_id: part['@id'],
    major_rev: 'A',
    minor_rev: '1',
    is_released: i % 2,
    is_current: 1,
    owned_by_id: id('identity:engineer'),
  }
})

// ===== Method（5 条示例）=====
export const methods: KrasItem[] = [
  {
    '@type': 'Method',
    '@id': id('method:defaultCost'),
    '@keyed_name': '默认成本计算',
    name: 'defaultCost',
    method_type: 'cs',
    comment: '为物料写入默认成本：若用户未填则按分类基线给默认值',
    method_code: `// onBeforeAdd
var cost = item.getProperty("cost");
if (cost == null || cost == "") {
  var cls = item.getProperty("classification") ?? "";
  var baseline = cls.contains("Electrical") ? 5.5m : 12.8m;
  item.setProperty("cost", baseline);
}
return item;`,
    owned_by_id: id('identity:admin'),
  },
  {
    '@type': 'Method',
    '@id': id('method:computeQty'),
    '@keyed_name': '库存联动计算',
    name: 'computeQty',
    method_type: 'javascript',
    comment: '前端 JS Method：编辑数量时自动联动估算总价',
    method_code: `// onchange on qty field
async function execute(item, ctx) {
  const qty = Number(ctx.changedValues?.qty ?? item.qty ?? 0);
  const unitCost = Number(item.cost ?? 0);
  item.estimated_total = Math.round(qty * unitCost * 100) / 100;
  return item;
}`,
    owned_by_id: id('identity:admin'),
  },
  {
    '@type': 'Method',
    '@id': id('method:ecoAutoStatus'),
    '@keyed_name': 'ECO 自动状态推进',
    name: 'ecoAutoStatus',
    method_type: 'cs',
    comment: 'ECO onAfterAdd：自动置为 submitted',
    method_code: `// onAfterAdd
item.setProperty("status", "submitted");
return item;`,
    owned_by_id: id('identity:admin'),
  },
  {
    '@type': 'Method',
    '@id': id('method:partReleaseNotify'),
    '@keyed_name': '物料发布通知',
    name: 'partReleaseNotify',
    method_type: 'cs',
    comment: '生命周期 onAfterPromote：物料到达 Released 时发送通知（after-commit）',
    method_code: `// lifecycle onAfterPromote (Released)
// after-commit only
var user = item.getOwnedBy();
kras.email.send(user, "Part released", item.getKeyedName());
return item;`,
    owned_by_id: id('identity:admin'),
  },
  {
    '@type': 'Method',
    '@id': id('method:workflowAutoComplete'),
    '@keyed_name': '工作流自动节点',
    name: 'workflowAutoComplete',
    method_type: 'cs',
    comment: '工作流自动节点：自动签核（演示）',
    method_code: `// workflow node onAfterActivate (is_automatic=true)
activity.approve("automatic approval");
return item;`,
    owned_by_id: id('identity:admin'),
  },
]

// ===== LifeCycle Definition（1 条默认生命周期）=====
export const lifecycles: KrasItem[] = [
  {
    '@type': 'LifeCycleDefinition',
    '@id': id('lifecycle:default'),
    '@keyed_name': '默认生命周期',
    name: '默认生命周期',
    key: 'default',
    is_enabled: 1,
    states: [
      { id: id('lcs:draft'), name: 'draft', label: '草稿', is_start: 1, is_released: 0 },
      { id: id('lcs:review'), name: 'review', label: '评审中', is_released: 0 },
      { id: id('lcs:released'), name: 'released', label: '已发布', is_released: 1 },
      { id: id('lcs:deprecated'), name: 'deprecated', label: '已废止', is_released: 0 },
    ],
    transitions: [
      { id: id('lct:1'), from: 'draft', to: 'review', label: '提交评审' },
      { id: id('lct:2'), from: 'review', to: 'released', label: '批准发布', require_workflow_context: 1 },
      { id: id('lct:3'), from: 'review', to: 'draft', label: '驳回' },
      { id: id('lct:4'), from: 'released', to: 'deprecated', label: '废止' },
    ],
    owned_by_id: id('identity:admin'),
  },
]

// ===== Workflow Definition（2 条示例）=====
export const workflows: KrasItem[] = [
  {
    '@type': 'WorkflowDefinition',
    '@id': id('workflow:approval'),
    '@keyed_name': '标准审批流',
    name: '标准审批流',
    key: 'standard_approval',
    is_enabled: 1,
    lanes: [
      { id: id('wfl:1'), name: 'requester', label: '申请人' },
      { id: id('wfl:2'), name: 'reviewer', label: '评审人' },
      { id: id('wfl:3'), name: 'approver', label: '批准人' },
    ],
    nodes: [
      { id: id('wf:s'), name: 'start', label: '发起', type: 'start', lane: id('wfl:1') },
      { id: id('wf:r'), name: 'review', label: '评审', type: 'task', lane: id('wfl:2'), require_signature: 1 },
      { id: id('wf:a'), name: 'approve', label: '批准', type: 'task', lane: id('wfl:3'), require_signature: 1 },
      { id: id('wf:e'), name: 'end', label: '结束', type: 'end', lane: id('wfl:3') },
    ],
    edges: [
      { id: id('wfe:1'), from: id('wf:s'), to: id('wf:r') },
      { id: id('wfe:2'), from: id('wf:r'), to: id('wf:a'), label: '同意', life_cycle_transition_id: id('lct:2') },
      { id: id('wfe:3'), from: id('wf:r'), to: id('wf:s'), label: '驳回' },
      { id: id('wfe:4'), from: id('wf:a'), to: id('wf:e') },
    ],
    owned_by_id: id('identity:admin'),
  },
  {
    '@type': 'WorkflowDefinition',
    '@id': id('workflow:eco'),
    '@keyed_name': 'ECO 工程变更流',
    name: 'ECO 工程变更流',
    key: 'eco_workflow',
    is_enabled: 1,
    lanes: [
      { id: id('wfl:e1'), name: 'requester', label: '申请人' },
      { id: id('wfl:e2'), name: 'ccb', label: '变更委员会' },
    ],
    nodes: [
      { id: id('wf:eco-s'), name: 'start', label: '发起变更', type: 'start', lane: id('wfl:e1') },
      { id: id('wf:eco-ccb'), name: 'ccb', label: 'CCB 评审', type: 'task', lane: id('wfl:e2'), require_signature: 1 },
      { id: id('wf:eco-impl'), name: 'implement', label: '实施', type: 'automatic', lane: id('wfl:e2'), is_automatic: 1 },
      { id: id('wf:eco-e'), name: 'end', label: '结束', type: 'end', lane: id('wfl:e2') },
    ],
    edges: [
      { id: id('wfe:e1'), from: id('wf:eco-s'), to: id('wf:eco-ccb') },
      { id: id('wfe:e2'), from: id('wf:eco-ccb'), to: id('wf:eco-impl'), label: '批准' },
      { id: id('wfe:e3'), from: id('wf:eco-impl'), to: id('wf:eco-e') },
    ],
    owned_by_id: id('identity:admin'),
  },
]
