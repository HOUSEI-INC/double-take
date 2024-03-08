/* eslint-disable */
<template>
  <div class="timeline-container">
    <div class="timeline-dropdown">
      <Dropdown
        v-model="selectedRange"
        :options="filterOpts"
        optionLabel="name"
        placeholder="Filter"
        class="w-full md:w-14rem"
        @change="handleChange"
      />
    </div>
    <div class="timeline-content">
      <vue-horizontal-timeline :items="timeLineData" timeline-padding="20px" timeline-background="#2a323d">
      </vue-horizontal-timeline>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineProps } from 'vue';
import VueHorizontalTimeline from 'vue-horizontal-timeline';
import Dropdown from 'primevue/dropdown';
import { UserService } from '@/services/user.service';
import ApiService from '@/services/api.service';

const props = defineProps(['username']);
const selectedRange = ref();
const timeLineData = ref([]);

onMounted(() => {
  UserService.getUserTimeline(props.username).then((data) => {
    timeLineData.value = data;
  });
});

const filterOpts = ref([
  { name: 'Today', range: 0 },
  { name: 'Yesterday', range: 1 },
  { name: '3 Days Ago', range: 3 },
  { name: '7 Days Ago', range: 7 },
  { name: '15 Days Ago', range: 15 },
  { name: '1 Month Ago', range: 30 },
]);

const handleChange = async () => {
  UserService.getUserTimeline(props.username, selectedRange.value.range).then((data) => {
    timeLineData.value = data;
  });
};
</script>
