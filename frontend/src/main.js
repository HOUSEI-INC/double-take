import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';
import ToastService from 'primevue/toastservice';
import { createPinia } from 'pinia';
import emitter from '@/services/emitter.service';
import router from '@/router';
import App from '@/App.vue';

const app = createApp(App)
  .use(router)
  .use(PrimeVue)
  .use(ConfirmationService)
  .use(ToastService)
  .use(createPinia())
  .directive('tooltip', Tooltip);

app.config.globalProperties.emitter = emitter;
app.mount('#app');
