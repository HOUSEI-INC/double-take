/* eslint-disable */
import ApiService from '@/services/api.service';

export const UserService = {
  async getUsers() {
    // return ApiService.get('/filesystem/folders').then((res) => res.data.map((name) => ({ name })));
    try {
      const {
        data: { users },
      } = await ApiService.get('/user');
      const result = await Promise.all(
        users.map(async (user) => {
          const { id, name, staffNum, department } = user;
          const {
            data: { files },
          } = await ApiService.get(`/train?name=${name}`);
          const fileKey = files.length > 0 ? files[0].file.key : '';
          return { id, name, staffNum, department, fileKey };
        }),
      );
      console.log(result);
      return result;
    } catch (error) {
      console.error(error);
      return [];
    }
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
      const date = new Date(createdAt);
      const localTime = date.toLocaleString();
      // const image = await ApiService.get(`/storage/matches/${filename}`);

      // const content = `
      //   <div class="content-time">${createdAt}</div>
      //   <div class="content-image">${image}</div>
      // `;
      results.push({ title: camera, content: localTime });
    }
    return results;
  },
};
