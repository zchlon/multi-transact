import Vue from 'vue';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import App from './App.vue';
import config from './utils/config'

import VueApollo from 'vue-apollo'
import apolloClient from './utils/apollo'

Vue.use(ElementUI);
Vue.use(VueApollo)

Vue.prototype.$config = config

const apolloProvider = new VueApollo({
  defaultClient: apolloClient,
  defaultOptions: {
    $query: {
      loadingKey: 'loading',
      fetchPolicy: 'network-only',
    },
  },
})

window.vm = new Vue({
  el: '#app',
  apolloProvider,
  render: h => h(App)
});