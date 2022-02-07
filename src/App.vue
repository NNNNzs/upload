<template>
  <NMessageProvider>
    <NDialogProvider>
      <Upload />
    </NDialogProvider>
  </NMessageProvider>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { NMessageProvider, NDialogProvider } from "naive-ui";
import Upload from "./components/Upload.vue";
export default defineComponent({
  components: {
    NMessageProvider,
    NDialogProvider,
    Upload,
  },
  setup() {},
});
</script>

<style>
</style>