import { defineStore } from 'pinia';

const userStore = defineStore('users', {
  state: () => ({
    usersData: [],
  }),
  actions: {
    setUsers(users) {
      this.usersData = users;
    },
  },
  getters: {
    getUsers: () => this.usersData,
  },
});

export default userStore;
