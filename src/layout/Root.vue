
<template>
  <NMessageProvider>
    <NDialogProvider>
      <router-view></router-view>
    </NDialogProvider>
  </NMessageProvider>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { NMessageProvider, NDialogProvider } from "naive-ui";
export default defineComponent({
  components: {
    NMessageProvider,
    NDialogProvider,
  }
});
</script>
