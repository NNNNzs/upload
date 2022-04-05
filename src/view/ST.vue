<template>
  <NDataTable
    :max-height="`100vw`"
    ref="table"
    :columns="columns"
    :data="tableList"
    :rowKey="rowKey"
  ></NDataTable>
</template>

<script setup lang="ts">
import axios from 'axios';
import { h, ref, onMounted, VNode, defineComponent } from 'vue';
import { useMessage, NDataTable, NInput, DataTableColumns, NButton } from 'naive-ui'
import { cloneDeep } from 'lodash';


interface RowData {
  id: number,
  title: string,
  key: string,
  value: string
}

const msg = useMessage()
const currentEditIndex = ref(-1);
const oldData = ref<any>(null);

const columns: DataTableColumns = [
  // {
  //   title: 'id',
  //   key: 'id',
  // },
  {
    title: '标题',
    key: 'title',
    width:100,
  },
  // {
  //   title: 'key',
  //   key: "key"
  // },
  {
    title: '值',
    key: "value",
    render(row, index) {
      if (currentEditIndex.value === row.id) {
        return h(NInput, {
          value: row.value as string,
          type: "textarea",
          onUpdateValue(v: string) {
            row.value = v
          }
        })
      } else {
        return h('div', row.value as string)
      }
    }
  },
  {
    title: '操作',
    key: 'update',
    width:150,
    render(row, index) {
      if (currentEditIndex.value !== row.id) {
        return h(NButton, {
          onClick: () => {
            currentEditIndex.value = row.id as number
            oldData.value = cloneDeep(row);
          }
        }, () => h('span', '编辑'))
      } else {
        return h('div', [
          h(NButton, {
            type: 'primary',
            onClick: () => {
              updateRowByKey(row.id as number, { value: row.value })
                .then(() => {
                  currentEditIndex.value = -1;
                  msg.success('修改成功')
                  oldData.value = null;
                })
            }
          }, () => h('span', '保存')),
          h(NButton, {
            type: 'warning',
            onClick: () => {
              currentEditIndex.value = -1;
              tableList.value[index] = cloneDeep(oldData.value)
              // row = 
            }
          }, () => h('span', '取消'))
        ])
      }
    }
  }
]
const rowKey = (row: { id: string | number }) => row.id

const baseUrl = import.meta.env.DEV ? '/api' : ''

const tableList = ref<RowData[]>([])

const updateRowByKey = (id: number, data: any) => {
  return new Promise((resolve, reject) => {
    axios({
      url: baseUrl + '/dict/' + id,
      method: 'put',
      data: data
    }).then(res => {
      if (res.status) {
        resolve(res.data)
      }
    }).catch(err => {
      reject(err)
    })
  })

}

onMounted(() => {
  axios({
    url: baseUrl + '/dict/like/shentou%25'
  }).then(res => {
    tableList.value = res.data;
    console.log(res.data)
  })
})




</script>

<style scoped>
</style>