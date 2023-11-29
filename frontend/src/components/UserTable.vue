/* eslint-disable */
<template>
  <div>
    <div class="card">
      <Toolbar class="mb-4">
        <template v-slot:start>
          <Button label="New" icon="pi pi-plus" severity="success" class="mr-2" @click="openNew" />
          <Button
            label="Delete"
            icon="pi pi-trash"
            severity="danger"
            @click="confirmDeleteSelected"
            :disabled="!selectedUsers || !selectedUsers.length"
          />
        </template>

        <template v-slot:end>
          <!-- <FileUpload
            mode="basic"
            accept="image/*"
            :maxFileSize="1000000"
            label="Import"
            chooseLabel="Import"
            class="mr-2 inline-block"
          /> -->
          <Button label="Export" icon="pi pi-upload" severity="help" @click="exportCSV($event)" />
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
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} users"
      >
        <template v-slot:header>
          <div class="flex flex-wrap gap-2 align-items-center justify-content-between">
            <h4 class="m-0">Manage Users</h4>
            <span class="p-input-icon-left">
              <i class="pi pi-search" />
              <InputText v-model="filters['global'].value" placeholder="Search..." />
            </span>
          </div>
        </template>

        <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
        <Column field="id" header="ID" sortable style="min-width: 8rem"></Column>
        <Column field="name" header="Name" style="min-width: 16rem"></Column>
        <Column header="Image">
          <template v-slot:body="slotProps">
            <img
              v-if="slotProps.data.fileKey"
              :src="`http://localhost:3000/api/storage/${slotProps.data.fileKey}`"
              :alt="slotProps.data.fileKey"
              class="shadow-2 border-round"
              style="width: 64px"
            />
          </template>
        </Column>
        <Column :exportable="false" style="min-width: 8rem">
          <template v-slot:body="slotProps">
            <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="toUserProfile(slotProps.data)" />
            <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteUser(slotProps.data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="userDialog" :style="{ width: '450px' }" header="User" :modal="true" class="p-fluid">
      <div class="field">
        <label for="name">Name</label>
        <InputText
          id="name"
          v-model.trim="user.name"
          required="true"
          autofocus
          :class="{ 'p-invalid': submitted && !user.name }"
        />
        <small class="p-error" v-if="submitted && !user.name">Name is required.</small>
      </div>
      <template v-slot:footer>
        <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
        <Button label="Save" icon="pi pi-check" text @click="saveUser" />
      </template>
    </Dialog>

    <Dialog v-model:visible="deleteUserDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
        <span v-if="user"
          >Are you sure you want to delete <b>{{ user.name }}</b
          >?</span
        >
      </div>
      <template v-slot:footer>
        <Button label="No" icon="pi pi-times" text @click="deleteUserDialog = false" />
        <Button label="Yes" icon="pi pi-check" text @click="deleteUser" />
      </template>
    </Dialog>

    <Dialog v-model:visible="deleteUsersDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
        <span v-if="user">Are you sure you want to delete the selected users?</span>
      </div>
      <template v-slot:footer>
        <Button label="No" icon="pi pi-times" text @click="deleteUsersDialog = false" />
        <Button label="Yes" icon="pi pi-check" text @click="deleteSelectedUsers" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { FilterMatchMode } from 'primevue/api';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import FileUpload from 'primevue/fileupload';
import Toolbar from 'primevue/toolbar';
import Tag from 'primevue/tag';
import Rating from 'primevue/rating';
import Textarea from 'primevue/textarea';
import RadioButton from 'primevue/radiobutton';
import InputNumber from 'primevue/inputnumber';
import { useRouter } from 'vue-router';
import { UserService } from '../services/user.service';
import Constants from '@/util/constants.util';
import ApiService from '@/services/api.service';

const toast = useToast();
const dt = ref();
const users = ref();
const userDialog = ref(false);
const deleteUserDialog = ref(false);
const deleteUsersDialog = ref(false);
const user = ref({});
const selectedUsers = ref();
const router = useRouter();

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
});
const submitted = ref(false);
const statuses = ref([
  { label: 'INSTOCK', value: 'instock' },
  { label: 'LOWSTOCK', value: 'lowstock' },
  { label: 'OUTOFSTOCK', value: 'outofstock' },
]);

onMounted(() => {
  UserService.getUsers().then((data) => (users.value = data));
});

const openNew = () => {
  user.value = {};
  submitted.value = false;
  userDialog.value = true;
};
const hideDialog = () => {
  userDialog.value = false;
  submitted.value = false;
};
const saveUser = async () => {
  submitted.value = true;

  if (user.value.name.trim()) {
    try {
      await ApiService.post(`/user/add/${user.value.name}`);
    } catch (error) {
      toast.add({ severity: 'failed', summary: 'Failed', detail: 'Add New Failed', life: 3000 });
      throw new Error('Failed to add data');
    }
    userDialog.value = false;
    user.value = {};
  }
};
const toUserProfile = (data) => {
  console.log('prod', data.name);
  user.value = { ...data };
  router.push({
    name: 'Train',
    params: { name: data.name },
  });
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

const exportCSV = () => {
  dt.value.exportCSV();
};
const confirmDeleteSelected = () => {
  deleteUsersDialog.value = true;
};
const deleteSelectedUsers = async () => {
  const names = [];
  selectedUsers.value.forEach((ele) => {
    names.push(ele.name);
  });
  try {
    await ApiService.delete('/user/remove', { data: { names } });
    users.value = users.value.filter((val) => !selectedUsers.value.includes(val));
    deleteUsersDialog.value = false;
    selectedUsers.value = null;
  } catch (error) {
    toast.add({ severity: 'failed', summary: 'Failed', detail: 'delete Failed', life: 3000 });
    throw new Error('Failed to delete data');
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'INSTOCK':
      return 'success';

    case 'LOWSTOCK':
      return 'warning';

    case 'OUTOFSTOCK':
      return 'danger';

    default:
      return null;
  }
};
</script>

<style scoped>
.card {
  background: var(--surface-card);
  padding: 2rem;
  border-radius: 10px;
  margin-bottom: 1rem;
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
