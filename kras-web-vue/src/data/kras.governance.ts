// kras.governance.ts —— 治理域：版本 / 生命周期 / 工作流快捷调用
// 对应需求 §5 / §6 / §7

import { applyItem } from './kras.item'
import type { KrasItem, KrasId } from '@/types'

export const governance = {
  lock(itemType: string, id: KrasId): Promise<KrasItem> {
    return applyItem({ '@type': itemType, '@id': id, '@action': 'lock' })
  },
  unlock(itemType: string, id: KrasId): Promise<KrasItem> {
    return applyItem({ '@type': itemType, '@id': id, '@action': 'unlock' })
  },
  version(itemType: string, id: KrasId): Promise<KrasItem> {
    return applyItem({ '@type': itemType, '@id': id, '@action': 'version' })
  },
  promote(itemType: string, id: KrasId, transitionId: KrasId, ctx?: Record<string, unknown>): Promise<KrasItem> {
    return applyItem({
      '@type': itemType,
      '@id': id,
      '@action': 'promote',
      transition_id: transitionId,
      ...ctx,
    })
  },
  startWorkflow(itemType: string, id: KrasId, workflowMapId?: KrasId): Promise<KrasItem> {
    return applyItem({
      '@type': itemType,
      '@id': id,
      '@action': 'startWorkflow',
      workflow_map_id: workflowMapId,
    })
  },
  advanceWorkflow(
    itemType: string,
    id: KrasId,
    options?: { path_id?: KrasId; next_activity_id?: KrasId }
  ): Promise<KrasItem> {
    return applyItem({
      '@type': itemType,
      '@id': id,
      '@action': 'advanceWorkflow',
      ...options,
    })
  },
  submitApproval(
    itemType: string,
    id: KrasId,
    body: { approval_action: string; approval_result: 'approve' | 'reject'; approval_comment?: string }
  ): Promise<KrasItem> {
    return applyItem({ '@type': itemType, '@id': id, '@action': 'submitApproval', ...body })
  },
}
