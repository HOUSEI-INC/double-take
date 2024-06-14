<template>
  <Toast />
  <FileUpload
    :multiple="true"
    :fileLimit="1"
    accept="image/*"
    :maxFileSize="1000000000"
    @select="onSelectedFiles"
    ref="ImgUploadRef"
    customUpload
    @uploader="myUploader"
    :pt="{
      content: {
        style: {
          padding: '1rem',
        },
      },
    }"
  >
    <template v-slot:header>
      <h3>顔写真</h3>
    </template>
    <template v-slot:content="{ files, removeFileCallback }">
      <div v-if="files.length > 0" class="content-row">
        <div class="img-container">
          <img role="presentation" :alt="files[0].name" :src="files[0].objectURL" width="200" height="300" />
        </div>
        <Button
          icon="pi pi-times"
          @click="onRemoveTemplatingFile(files[0], removeFileCallback, 0)"
          outlined
          rounded
          severity="danger"
        />
      </div>
      <!-- <div v-if="files.length > 0">
        <div v-for="(file, index) of files" :key="file.name + file.type + file.size" class="content-row">
          <div class="img-container">
            <img role="presentation" :alt="file.name" :src="file.objectURL" width="200" height="300" />
          </div>
          <Button
            icon="pi pi-times"
            @click="onRemoveTemplatingFile(file, removeFileCallback, index)"
            outlined
            rounded
            severity="danger"
          />
        </div>
      </div> -->
    </template>

    <template v-slot:empty>
      <div class="empty-container" @click="chooseFileHandler">
        <p style="width: 100%; text-align: center"><i class="pi pi-cloud-upload" style="font-size: xx-large" /></p>
        <p style="text-align: center">ドラッグ＆ドロップするか、ここをクリックし画像をアップロードしてください</p>
      </div>
    </template>
  </FileUpload>
</template>

<script setup>
import { ref, defineEmits, computed, defineExpose, onMounted, defineProps, onBeforeUnmount, nextTick } from 'vue';
import { useToast } from 'primevue/usetoast';
import FileUpload from 'primevue/fileupload';
import Button from 'primevue/button';
import Toast from 'primevue/toast';
import Constants from '@/util/constants.util';
import ApiService from '@/services/api.service';

const toast = useToast();

const files = ref([]);

const ImgUploadRef = ref();

const emit = defineEmits(['SelectedFile']);

const props = defineProps({ propFileKey: String });

onMounted(async () => {
  await nextTick(); // 等待 Vue 更新 DOM
  if (props.propFileKey) {
    const segments = props.propFileKey.split('/');
    const fileName = segments[segments.length - 1];
    const imgSrc = `${Constants().api}/storage/${props.propFileKey}`;
    const response = await fetch(imgSrc);
    const blob = await response.blob();
    const file = new File([blob], fileName, { type: blob.type });
    const objectURL = URL.createObjectURL(file);
    file.objectURL = objectURL;
    files.value.push(file);
    ImgUploadRef.value.files.push(file);
  }

  // console.log(ImgUploadRef.value);
});

onBeforeUnmount(() => {
  ImgUploadRef.value.clear();
});

const uploadUrl = computed(() => `${Constants().api}/user/savetmpimg`);

const onRemoveTemplatingFile = (file, removeFileCallback, index) => {
  removeFileCallback(index);
};

const onSelectedFiles = (event) => {
  files.value = event.files;
  emit('SelectedFile', files.value[0]);
};

const chooseFileHandler = () => {
  ImgUploadRef.value.choose();
};

const clearImgUploader = () => {
  ImgUploadRef.value.clear();
};

const myUploader = async (event) => {
  // const file = event.files[0];
  // const formData = new FormData();
  // formData.append('image', file, file.name);
  // const { data } = await ApiService.post('/user/savetmpimg', formData);
  // ImgUploadRef.value.clear();
  // ImgUploadRef.value.uploadedFileCount = 0;
};
defineExpose({ files, clearImgUploader });
</script>

<style scoped>
:deep(.p-fileupload-buttonbar) {
  padding: 0rem 1.25rem;
}

.empty-container {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
}
.p-fileupload {
}

.img-container {
  display: flex;
  justify-content: center;
  width: 100%;
  margin-bottom: 0.75rem;
}
.content-row {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
}
</style>
