import { createApp, defineAsyncComponent } from 'vue'
import App from './App.vue'
import RootVue from './layout/Root.vue';
import { createRouter, createWebHistory } from 'vue-router';
import STView from './view/ST.vue'

const router = createRouter({
  // 4. 内部提供了 history 模式的实现。为了简单起见，我们在这里使用 hash 模式。
  history: createWebHistory('/upload'),
  routes: [
    {
      name:'index',
      path: '/',
      component: App
    },
    {
      name: 'stList',
      path: '/stList',
      component: STView
    }
  ]
})

createApp(RootVue)
  .use(router)
  .mount('#app');

