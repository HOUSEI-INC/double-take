/* eslint-disable */
import ApiService from '@/services/api.service';
import axios from 'axios';

export const ConfigService = {
  async getCurrentCameras() {
    const res = await ApiService.get('/config');
    const { cameras } = res.data.frigate;
    return cameras;
  },
  async getFrigateCameras() {
    const res = await axios.get('http://localhost:5000/api/config');
    const { cameras } = res.data;
    return Object.keys(cameras).filter((key) => key !== 'init');
  },
};
