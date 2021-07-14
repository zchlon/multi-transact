import Vue from 'vue';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import App from './App.vue';
import config from './utils/config'

Vue.use(ElementUI);

Vue.prototype.$config = config

window.vm = new Vue({
  el: '#app',
  render: h => h(App)
});