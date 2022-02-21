<template>
  <div>
    <ul>
      <div @dragenter="handleDragEnter" @dragleave="hanleDragLeave" class="before">
        <h3 ref="before" v-show="target === before">在之前</h3>
      </div>
      <li
        @dragenter="handleDragEnter"
        @dragleave="hanleDragLeave"
        v-for="item in list"
        :key="item.value"
      >
        <div>{{ item.value }}</div>

        <div
          style="height: 20px;"
          class="after"
          @dragenter="handleDragEnter"
          @dragleave="hanleDragLeave"
        >
          <h3 v-show="target === after && target !== null" ref="after">在之后</h3>
        </div>

        
      </li>
    </ul>
    {{ target === after }}
    <ul>
      <li
        draggable="true"
        @drag="handleDrag"
        v-for="item in list"
        :key="item.value"
      >{{ item.value }}</li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { defineComponent, ref } from "vue";

let target = ref(null);

const after = ref(null)
const before = ref(null)

const list = ref([
  { name: "1", value: '1' },
  { name: "2", value: '2' },
  { name: "3", value: '3' },
]);

const handleDrag = (e: any) => {
  // console.log(e)
}
const handleDragEnter = (e: any) => {
  console.log(e.target)
  target.value = e.target;
  console.log('handleDragEnter', e)
}
const hanleDragLeave = (e: any) => {
  // target.value = e.target;
}

</script>

<style>
</style>