<template>
  <a-space direction="vertical" :size="12">
    <a-range-picker v-model:value="value2" show-time />
  </a-space>
</template>

<script>
import { RangePicker } from 'ant-design-vue';
import { ref } from 'vue';

const value2 = ref();
</script>
