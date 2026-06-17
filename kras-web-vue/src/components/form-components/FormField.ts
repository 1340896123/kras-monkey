// @ts-nocheck
// 表单字段组件：基于元数据 + scheme 渲染基础/扩展/布局组件
// 对应需求 §9.6
import { defineComponent, h, ref, watch, computed } from 'vue'
import {
  Input,
  InputNumber,
  DatePicker,
  Switch,
  Select,
  Input as AInput,
} from 'ant-design-vue'
import ItemSearch from './ItemSearch.vue'
import FileField from './FileField.vue'
import ImageField from './ImageField.vue'
import ClassStructureField from '../ClassStructureField.vue'
import type { Property } from '@/types'
import { krasCache } from '@/data/kras.cache'
import { formatFieldValue, parseFieldValue, normalizeFieldValue, resolveReference } from '@/utils/fieldValue'

const TextArea = Input.TextArea

export interface FieldProps {
  property: Property
  value: unknown
  readonly?: boolean
  disabled?: boolean
}

export const FormField = defineComponent({
  name: 'FormField',
  props: ['property', 'value', 'readonly', 'disabled'],
  emits: ['update:value'],
  setup(props: FieldProps, { emit }) {
    const prop = computed(() => props.property)
    const isReadonly = computed(() => !!props.readonly || props.property.is_readonly === 1)

    function emitValue(v: unknown) {
      emit('update:value', v)
    }

    function listOptions() {
      if (prop.value.data_type !== 'list' || !prop.value.data_source) return []
      const list = krasCache.getList(prop.value.data_source)
      return (list?.values ?? []).map((v) => ({ value: v.value, label: v.label }))
    }

    return () => {
      const p = prop.value
      switch (p.data_type) {
        case 'text':
          return h(TextArea, {
            value: props.value ?? '',
            'onUpdate:value': emitValue,
            readonly: isReadonly.value,
            disabled: props.disabled,
            rows: 3,
            placeholder: '请输入',
          })
        case 'integer':
          return h(InputNumber, {
            value: props.value,
            'onUpdate:value': emitValue,
            readonly: isReadonly.value,
            disabled: props.disabled,
            style: 'width: 100%',
            placeholder: '请输入整数',
          })
        case 'decimal':
          return h(InputNumber, {
            value: props.value,
            'onUpdate:value': emitValue,
            readonly: isReadonly.value,
            disabled: props.disabled,
            style: 'width: 100%',
            step: 0.01,
            precision: p.data_scale,
            placeholder: '请输入数值',
          })
        case 'date':
          return h(DatePicker, {
            value: props.value ? (typeof props.value === 'string' ? props.value : undefined) : undefined,
            'onUpdate:value': (v: unknown) => emitValue(v),
            disabled: isReadonly.value || props.disabled,
            style: 'width: 100%',
            placeholder: '选择日期',
          })
        case 'boolean':
          return h(Switch, {
            checked: props.value === true || props.value === 1 || props.value === '1',
            'onUpdate:checked': (v: boolean) => emitValue(v ? 1 : 0),
            disabled: isReadonly.value || props.disabled,
          })
        case 'list':
          return h(Select, {
            value: props.value as string,
            'onUpdate:value': emitValue,
            disabled: isReadonly.value || props.disabled,
            style: 'width: 100%',
            placeholder: '请选择',
            allowClear: true,
            options: listOptions(),
          })
        case 'item':
        case 'foreign':
          return h(ItemSearch, {
            property: p,
            value: props.value,
            'onUpdate:value': emitValue,
            readonly: isReadonly.value,
            disabled: props.disabled,
          })
        case 'file':
          return h(FileField, {
            property: p,
            value: props.value,
            'onUpdate:value': emitValue,
            readonly: isReadonly.value,
            disabled: props.disabled,
          })
        case 'image':
          return h(ImageField, {
            property: p,
            value: props.value,
            'onUpdate:value': emitValue,
            readonly: isReadonly.value,
            disabled: props.disabled,
          })
        case 'classification':
          return h(ClassStructureField, {
            value: props.value as string,
            'onUpdate:value': emitValue,
            readonly: isReadonly.value,
            disabled: props.disabled,
            classStructure: itemTypeClassStructure(p),
          })
        default:
          return h(Input, {
            value: props.value as string,
            'onUpdate:value': emitValue,
            readonly: isReadonly.value,
            disabled: props.disabled,
            placeholder: '请输入',
          })
      }
    }
  },
})

function itemTypeClassStructure(p: Property): string[] {
  const it = krasCache.getMetadata().itemTypes.find((t) => t.id === p.source_id)
  if (!it?.class_structure) return []
  try {
    const obj = JSON.parse(it.class_structure)
    return obj.roots ?? []
  } catch {
    return []
  }
}

export default FormField
