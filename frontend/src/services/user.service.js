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

  async getUserTimeline(username, range) {
    const res = await ApiService.get('user/timeline', {
      params: {
        username: username.toLowerCase(),
        range,
      },
    });
    const results = [];
    const { timelines } = res.data;
    for (const timeline of timelines) {
      const { id, filename, event, response, createdAt } = timeline;
      const { camera } = JSON.parse(event);
      const date = new Date(createdAt)
      const localTime = date.toLocaleString()
      // const image = await ApiService.get(`/storage/matches/${filename}`);

      // const content = `
      //   <div class="content-time">${createdAt}</div>
      //   <div class="content-image">${image}</div>
      // `;
      results.push({ title: camera, content: localTime });
    }
    return results;
  },

  getProductsWithOrdersSmall() {
    return Promise.resolve(this.getProductsWithOrdersData().slice(0, 10));
  },

  getProductsWithOrders() {
    return Promise.resolve(this.getProductsWithOrdersData());
  },
};
