import {
  createApp
} from "vue";
import App from "./App.vue";
import router from "./router";
import vuetify from './plugins/vuetify'
//import { VueRecaptchaPlugin } from 'vue-recaptcha' 
import {
  loadFonts
} from './plugins/webfontloader'
import store from './store.js'
import mixin from './mixin'
import overlay from '@/module/Overlay.js'
import {
  io
} from 'socket.io-client';
loadFonts()
window.Kakao.init("8acdd93f5a6fa89a6d2fe9190ea23ff1");
const token = localStorage.getItem('token');
const vue = 'http://localhost:3000'
const socket = io(vue, {
  query: {
    token
  }
});
const app = createApp(App);
app.config.globalProperties.$socket = socket;





app
  .use(router)
  .use(vuetify)
  .use(store)
  .use(overlay)
  .mixin(mixin)
  .mount('#app')