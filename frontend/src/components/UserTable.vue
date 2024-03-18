/* eslint-disable */
<template>
  <div>
    <div v-if="pageLoading" class="page-loading">
      <div
        style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 2000"
      >
        <i class="pi pi-spin pi-spinner p-as-center" style="font-size: 2.5rem"></i>
      </div>
    </div>
    <div class="card">
      <Toolbar class="mb-4">
        <template v-slot:start>
          <Button label="新規追加" icon="pi pi-plus" severity="success" class="mr-2" @click="openNew" />
          <Button
            label="削除"
            icon="pi pi-trash"
            severity="danger"
            @click="confirmDeleteSelected"
            :disabled="!selectedUsers || !selectedUsers.length"
          />
        </template>

        <template v-slot:end>
          <Button icon="pi pi-upload" label="アップロード" @click="openUpload" />
          <Button label="エクスポート" icon="pi pi-download" severity="help" @click="exportUserDataByXlxs" />
        </template>
      </Toolbar>

      <DataTable
        ref="dt"
        :value="users"
        v-model:selection="selectedUsers"
        dataKey="id"
        :paginator="true"
        :rows="10"
        :filters="filters"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        :rowsPerPageOptions="[5, 10, 25]"
        currentPageReportTemplate="全 {totalRecords} 人中の{first} ～ {last} 人目を表示中"
      >
        <template v-slot:header>
          <div class="flex flex-wrap gap-2 align-items-center justify-content-between">
            <h3 class="m-0">ユーザ管理テーブル</h3>
            <span class="p-input-icon-left">
              <i class="pi pi-search" />
              <InputText v-model="filters['global'].value" placeholder="検索..." />
            </span>
          </div>
        </template>

        <Column selectionMode="multiple" style="width: 6rem" :exportable="false"></Column>
        <!-- <Column field="id" header="ID" sortable style="min-width: 6rem"></Column> -->
        <Column field="name" header="氏名" style="min-width: 12rem"></Column>
        <Column field="staffNum" header="社員No." style="min-width: 12rem"></Column>
        <Column field="department" header="部署" style="min-width: 12rem"></Column>
        <Column field="fileKey" header="顔写真">
          <template v-slot:body="slotProps">
            <img
              v-if="slotProps.data.fileKey"
              :src="imageUrl(slotProps.data.fileKey)"
              :alt="slotProps.data.fileKey"
              class="shadow-2 border-round"
              style="width: 64px"
            />
          </template>
        </Column>
        <Column :exportable="false" style="min-width: 8rem" header="操作">
          <template v-slot:body="slotProps">
            <Button icon="pi pi-user" outlined rounded class="mr-2" @click="toUserProfile(slotProps.data)" />
            <Button icon="pi pi-user-edit" outlined rounded class="mr-2" @click="editUser(slotProps.data)" />
            <Button icon="pi pi-info" outlined rounded class="mr-2" @click="showUserTimeline(slotProps.data)" />
            <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteUser(slotProps.data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="userDialog"
      :style="{ width: '450px' }"
      header="User"
      :modal="true"
      class="p-fluid"
      @hide="hideUserDialog"
    >
      <div class="field">
        <label for="name"> 氏名 </label>
        <InputText
          id="name"
          v-model.trim="user.name"
          required="true"
          :class="{ 'p-invalid': submitted && !user.name }"
          :disabled="nameInputInvalid"
        />
        <small class="p-error" v-if="submitted && !user.name">Name is required.</small>
      </div>
      <div class="field">
        <label for="staffNum"> 社員No. </label>
        <InputText v-model="user.staffNum" />
      </div>
      <div class="field">
        <label for="department"> 所属 </label>
        <InputText v-model="user.department" />
      </div>
      <div>
        <ImageUploader @SelectedFile="getSelectedFile" :propFileKey="propFilekey" ref="UploaderRef" />
      </div>
      <template v-slot:footer>
        <Button label="キャンセル" icon="pi pi-times" text @click="hideDialog" />
        <Button label="保存" icon="pi pi-check" text @click="saveUser" :loading="saveUserBtnLoading" />
      </template>
    </Dialog>

    <Dialog v-model:visible="deleteUserDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
        <span v-if="user"
          ><b>{{ user.name }}</b> 削除してもよろしいですか?</span
        >
      </div>
      <template v-slot:footer>
        <Button label="No" icon="pi pi-times" text @click="deleteUserDialog = false" />
        <Button label="Yes" icon="pi pi-check" text @click="deleteUser" />
      </template>
    </Dialog>

    <Dialog v-model:visible="deleteUsersDialog" :style="{ width: '450px' }" header="確認" :modal="true">
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
        <span v-if="user">選択したユーザーを削除してよろしいですか？</span>
      </div>
      <template v-slot:footer>
        <Button label="いいえ" icon="pi pi-times" text @click="deleteUsersDialog = false" />
        <Button label="はい" icon="pi pi-check" text @click="deleteSelectedUsers" :loading="delUsersBtnLoading" />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="timelineDialog"
      :style="{ width: '450px' }"
      header="Timeline"
      :modal="true"
      class="p-fluid"
      maximizable
    >
      <div class="user-timeline">
        <TimeLine :username="username" />
      </div>
    </Dialog>

    <OverlayPanel ref="op">
      <div class="op-content">
        <div class="template-downloader">
          <Button icon="pi pi-download" label="テンプレート" @click="downloadTemplate" />
        </div>
        <div class="csv-uploader">
          <FileUpload
            mode="basic"
            customUpload
            accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            :maxFileSize="20971520"
            @uploader="uploadUserDataFromXlsx"
            chooseLabel="選択"
          />
        </div>
      </div>
    </OverlayPanel>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { FilterMatchMode } from 'primevue/api';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import FileUpload from 'primevue/fileupload';
import OverlayPanel from 'primevue/overlaypanel';
import Toolbar from 'primevue/toolbar';
import { useRouter } from 'vue-router';
import Excel from 'exceljs';
import ProgressSpinner from 'primevue/progressspinner';
import ImageUploader from '@/components/ImageUploader.vue';
import { UserService } from '../services/user.service';
import ApiService from '@/services/api.service';
import TimeLine from '@/components/TimeLine.vue';
import Config from '@/util/config.util';
import { userStore } from '@/store';
import Constants from '@/util/constants.util';

const toast = useToast();
const dt = ref();
const users = ref();
const timelineDialog = ref(false);
const userDialog = ref(false);
const deleteUserDialog = ref(false);
const deleteUsersDialog = ref(false);
const user = ref({});
const selectedUsers = ref();
const router = useRouter();
const username = ref();
const propFilekey = ref();

const selectedFile = ref();

const UploaderRef = ref();

const nameInputInvalid = ref(false);
const op = ref();
const store = userStore();

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
});
const submitted = ref(false);

onMounted(async () => {
  console.log(Constants().sshHost);
  const data = await UserService.getUsers();
  users.value = data;
  store.setUsers(users.value);
});

// const imageUrl = computed((fileKey) => `http://${Constants().sshHost}:3000/api/storage/${fileKey}`);
const imageUrl = computed(
  () =>
    function (fileKey) {
      return `http://${Constants().sshHost}:3000/api/storage/${fileKey}`;
    },
);

const openNew = () => {
  user.value = {};
  nameInputInvalid.value = false;
  submitted.value = false;
  userDialog.value = true;
};
const hideDialog = () => {
  userDialog.value = false;
  submitted.value = false;
};

const saveUserBtnLoading = ref(false);
const saveUser = async () => {
  submitted.value = true;
  saveUserBtnLoading.value = true;
  if (!user.value.id) {
    const files = [];
    files.push(selectedFile.value);
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files[]', file);
    });
    await Promise.all([
      ApiService.post('/user/add', {
        data: {
          name: user.value.name,
          staffNum: user.value.staffNum,
          department: user.value.department,
        },
      }),
      ApiService.post(`filesystem/folders/${user.value.name}`),
      ApiService.post(`user/trainUserImg/${user.value.name}`, formData),
    ]).catch((err) => {
      toast.add({ severity: 'failed', summary: 'Failed', detail: 'Add New Failed', life: 3000 });
      throw new Error(err);
    });
  } else {
    try {
      await ApiService.post('/user/updateuser', {
        data: {
          id: user.value.id,
          staffNum: user.value.staffNum,
          department: user.value.department,
        },
      });
    } catch (error) {
      toast.add({ severity: 'failed', summary: 'Failed', detail: 'Update Failed', life: 3000 });
      throw new Error(error);
    }
  }
  saveUserBtnLoading.value = false;
  userDialog.value = false;
  user.value = {};
  window.location.reload();
};
const toUserProfile = (data) => {
  router.push({
    name: 'Train',
    query: { name: data.name },
  });
};

const editUser = (data) => {
  user.value = { ...data };
  nameInputInvalid.value = true;
  userDialog.value = true;
  propFilekey.value = user.value.fileKey;
};
const confirmDeleteUser = (prod) => {
  user.value = prod;
  deleteUserDialog.value = true;
};
const deleteUser = async () => {
  const names = [];
  names.push(user.value.name);
  try {
    await ApiService.delete('/user/remove', { data: { names } });
    users.value = users.value.filter((val) => val.id !== user.value.id);
    deleteUserDialog.value = false;
    user.value = {};
    toast.add({ severity: 'success', summary: 'Successful', detail: 'User Deleted', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'failed', summary: 'Failed', detail: 'delete Failed', life: 3000 });
    throw new Error('Failed to delete data');
  }
};

const confirmDeleteSelected = () => {
  deleteUsersDialog.value = true;
};

const delUsersBtnLoading = ref(false);
const deleteSelectedUsers = async () => {
  const names = [];
  selectedUsers.value.forEach((ele) => {
    names.push(ele.name);
  });
  try {
    delUsersBtnLoading.value = true;
    await ApiService.delete('/user/remove', { data: { names } });
    users.value = users.value.filter((val) => !selectedUsers.value.includes(val));
    deleteUsersDialog.value = false;
    selectedUsers.value = null;
    delUsersBtnLoading.value = false;
  } catch (error) {
    toast.add({ severity: 'failed', summary: 'Failed', detail: 'delete Failed', life: 3000 });
    throw new Error('Failed to delete data');
  }
};

const showUserTimeline = (data) => {
  timelineDialog.value = true;
  username.value = data.name;
};

const getSelectedFile = (file) => {
  selectedFile.value = file;
};

const hideUserDialog = () => {
  propFilekey.value = null;
};

const openUpload = (event) => {
  op.value.toggle(event);
};

const pageLoading = ref(false);
const uploadUserDataFromXlsx = async (event) => {
  const workbook = new Excel.Workbook();
  const file = event.files[0];
  const reader = new FileReader();
  reader.readAsArrayBuffer(file);
  reader.onloadend = async () => {
    const data = reader.result;
    await workbook.xlsx.load(data);
    const worksheet = workbook.getWorksheet(1);
    const images = worksheet.getImages();
    const postData = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }
      images.forEach((image, index) => {
        const { range } = image;
        const thisRowNum = rowNumber - 1;
        // if (thisRowNum >= range.tl.nativeRow && thisRowNum <= range.br.nativeRow) {
        if (thisRowNum === range.tl.nativeRow) {
          const img = workbook.getImage(image.imageId);
          const thisRowData = {
            name: row.values[1],
            staffNum: row.values[2],
            department: row.values[3],
            img,
          };
          postData.push(thisRowData);
        }
      });
    });
    pageLoading.value = true;
    op.value.hide();
    await ApiService.post('/user/adduserbyxlxs', { data: { postData } });
    pageLoading.value = false;
    window.location.reload();
  };
};

const downloadTemplate = async () => {
  const path = '/template/template.xlsx';
  const csvData = await fetch(path);
  const blob = await csvData.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'template.xlsx';
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(blob);
  document.body.removeChild(link);
};

const exportUserDataByXlxs = async () => {
  const { usersData } = store;
  const workbook = new Excel.Workbook();
  const sheet = workbook.addWorksheet('ユーザ一覧');
  sheet.columns = [
    { header: '氏名', key: 'name', width: 15 },
    { header: '社員No.', key: 'staffNum', width: 15 },
    { header: '所属', key: 'department', width: 15 },
    { header: '顔写真', key: 'faceImg', width: 20 },
  ];

  await Promise.all(
    usersData.map(async (userdata, index) => {
      const newRow = sheet.addRow({
        name: userdata.name,
        staffNum: userdata.staffNum,
        department: userdata.department,
      });
      newRow.height = 90;
      const imgSrc = `${Constants().api}/storage/${userdata.fileKey}`;

      const blob = await fetch(imgSrc).then((r) => r.blob());
      const base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });

      const header = base64Data.split(';')[0];
      const imgFormat = header.split('/')[1];

      const img = workbook.addImage({
        base64: base64Data,
        extension: imgFormat,
      });

      // 计算图片的左上角和右下角的坐标以插入单元格,分别为左上角纵横，右下角纵横坐标
      const tlCol = 3.8;
      const tlRow = index + 1.2;
      const brCol = tlCol + 0.6;
      const brRow = tlRow + 0.6;
      // const imgWidth = Math.floor(sheet.getColumn(4).width * 0.8);
      // console.log(imgWidth);
      // const imgHeight = Math.floor(sheet.getRow(index + 2).height * 0.8);
      sheet.addImage(img, {
        tl: { col: tlCol, row: tlRow },
        ext: { width: 100, height: 120 },
        editAs: 'undefined',
      });
    }),
  );

  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const downloadLink = document.createElement('a');
  downloadLink.href = window.URL.createObjectURL(blob);
  downloadLink.download = 'users.xlsx';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(downloadLink.href);
};
</script>

<style scoped>
.card {
  background: var(--surface-card);
  padding: 2rem;
  border-radius: 10px;
  margin-bottom: 1rem;
}

.page-loading {
  position: fixed; /* 固定定位 */
  top: 0; /* 距离顶部距离为 0 */
  left: 0; /* 距离左侧距离为 0 */
  width: 100%; /* 宽度为整个窗口宽度 */
  height: 100%; /* 高度为整个窗口高度 */
  background-color: rgba(233, 230, 230, 0.5); /* 半透明的灰色背景 */
  z-index: 1000; /* 确保遮罩层在其他内容之上 */
}

.op-content {
  width: 20rem;
  display: flex;
  justify-content: space-between;
}

::deep(.p-overlaypanel) {
  background: whitesmoke;
}

p {
  line-height: 1.75;
}
.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media screen and (max-width: 960px) {
    align-items: start;
  }
}

.user-image {
  width: 100px;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);
}

.p-dialog .user-image {
  width: 150px;
  margin: 0 auto 2rem auto;
  display: block;
}

.confirmation-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

@media screen and (max-width: 1000000000px) {
  :deep(.p-toolbar) {
    flex-wrap: wrap;
    .p-button {
      margin-bottom: 0.25rem;
    }
  }
}
</style>
@/store
