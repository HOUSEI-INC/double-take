/* eslint-disable */
import ApiService from '@/services/api.service';

export const UserService = {
  getProductsMini() {
    return Promise.resolve(this.getProductsData().slice(0, 5));
  },

  getProductsSmall() {
    return Promise.resolve(this.getProductsData().slice(0, 10));
  },

  getProducts() {
    return Promise.resolve(this.getProductsData());
  },
  async getUsers() {
    // return ApiService.get('/filesystem/folders').then((res) => res.data.map((name) => ({ name })));
    const res = await ApiService.get('/user');
    console.log(res);
    const { users } = res.data;
    const result = [];
    for (const user of users) {
      const { id, name } = user;
      const images = await ApiService.get(`/train?name=${name}`);
      let fileKey = '';
      if (images.data.files.length > 0) {
        fileKey = images.data.files[0].file.key;
      }
      result.push({ id, name, fileKey });
    }
    return result;
  },

  getProductsWithOrdersSmall() {
    return Promise.resolve(this.getProductsWithOrdersData().slice(0, 10));
  },

  getProductsWithOrders() {
    return Promise.resolve(this.getProductsWithOrdersData());
  },
};
