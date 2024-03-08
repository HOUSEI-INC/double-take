import { publicIpv4 } from 'public-ip';

const yaml = require('js-yaml');

export default {
  updateConfigCameras: (yamlString, newCameras) => {
    try {
      // 解析 YAML 字符串
      const config = yaml.load(yamlString);

      // 修改 cameras 字段的值
      config.frigate.cameras = newCameras;

      // 将修改后的内容转换为 YAML 字符串
      const updatedYaml = yaml.dump(config);
      return updatedYaml;
    } catch (error) {
      console.error('Error updating cameras field:', error);
      return null;
    }
  },
  getLocalIpAddress: async () => {
    const ip = await publicIpv4();
    console.log(ip);
    return ip;
  },
};
