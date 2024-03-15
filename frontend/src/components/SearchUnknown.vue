<!-- eslint-disable vuejs-accessibility/no-autofocus -->
<template>
  <Button @click="visible = true" icon="pi pi-search" />
  <Dialog
    v-model:visible="visible"
    modal
    header="Unknown検索"
    :style="{ width: '50vw' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
    @after-hide="afterHideSearchUnknownDialog"
    @show="showSearchUnknownDialog"
  >
    <div class="dialog-content">
      <div class="content-left">
        <ImageUploader @SelectedFile="getSelectedFile" ref="UploaderRef" :propFileKey="propFilekey" />
      </div>
      <div class="content-right">
        <div class="flex-auto">
          <label for="searchperiod" class="font-bold block mb-2"> 検索期間 </label>
          <Calendar v-model="dates" selectionMode="range" :manualInput="false" showButtonBar />
        </div>
        <div>
          <div class="input-switch">
            <label for="name"> 検索後には社員登録を行う </label>
            <InputSwitch v-model="AddStaffAfterSearch" @change="initialStaffData" />
          </div>
          <div v-if="AddStaffAfterSearch">
            <div>
              <label for="name"> 氏名 </label>
              <InputText id="name" v-model="staff.name" />
            </div>
            <div>
              <label for="staffNo"> 社員No. </label>
              <InputText id="staffNo" v-model="staff.num" />
            </div>
            <div>
              <label for="department"> 所属 </label>
              <InputText id="department" v-model="staff.department" />
            </div>
          </div>
        </div>
      </div>
    </div>
    <template v-slot:footer>
      <Button label="Cancel" outlined @click="visible = false" />
      <Button label="Search" outlined @click="handleSearch" :loading="searchBtnLoading" icon="pi pi-search" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, onMounted, onBeforeMount, reactive, defineProps, getCurrentInstance } from 'vue';
import Calendar from 'primevue/calendar';
import InputSwitch from 'primevue/inputswitch';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import ImageUploader from '@/components/ImageUploader.vue';
import ApiService from '@/services/api.service';

const { emitter } = getCurrentInstance().appContext.config.globalProperties;

const toast = useToast();

const visible = ref(false);
const UploaderRef = ref();

const props = defineProps({ fileKey: String });
const propFilekey = ref(props.fileKey);

const dates = ref();
const AddStaffAfterSearch = ref(false);
const staff = reactive({
  name: '',
  num: '',
  department: '',
});

// onMounted(() => {
//   console.log(UploaderRef);
// });
onBeforeMount(() => {
  propFilekey.value = undefined;
});

const selectedFile = ref();
const initialStaffData = () => {
  if (!AddStaffAfterSearch.value) {
    Object.keys(staff).forEach((key) => {
      staff[key] = '';
    });
  }
};
const getSelectedFile = (file) => {
  selectedFile.value = file;
};

const searchBtnLoading = ref(false);
const handleSearch = async () => {
  searchBtnLoading.value = true;
  const file = UploaderRef.value.files[0];
  const fname = file.name;
  const formData = new FormData();
  formData.append('image', file, fname);

  try {
    const { data } = await ApiService.post('/user/savetmpimg', formData);
    const { filename } = data;
    const compareFaceResults = await ApiService.post('/user/comparetwofaces', { fn: filename, dates: dates.value });
    console.log(compareFaceResults);
    const { ids } = compareFaceResults.data;
    console.log(ids);
    visible.value = false;
    emitter.emit('compareFacesInRange', ids);
  } catch (error) {
    toast.add({ severity: 'failed', summary: 'Failed', detail: 'Search Failed', life: 3000 });
    throw new Error('Failed to search unknown');
  }
  if (AddStaffAfterSearch.value) {
    const fd = new FormData();
    fd.append('files[]', file);
    await ApiService.post(`filesystem/folders/${staff.value.name}`);
    await ApiService.post(`train/add/${staff.name}`, formData);
    await ApiService.post('/user/add', {
      data: {
        name: staff.name,
        staffNum: staff.num,
        department: staff.department,
      },
    });
  }
  searchBtnLoading.value = false;
};

const afterHideSearchUnknownDialog = () => {
  // UploaderRef.value.clearImgUploader();
  propFilekey.value = undefined;
  dates.value = [];
  AddStaffAfterSearch.value = false;
};

const showSearchUnknownDialog = () => {
  propFilekey.value = props.fileKey;
};
</script>

<style scoped>
.dialog-content {
  display: grid;
  grid-template-columns: 6fr 4fr;
  gap: 10px;
}
</style>
