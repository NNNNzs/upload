import { createApp } from 'vue'
import App from './App.vue'
// import Test from './components/Test.vue'
import Empty from './layout/Empty.vue'
import { createRouter, createWebHashHistory } from 'vue-router'


const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      name: 'index',
      path: "/",
      component: Empty,
      children: [
        { name: 'upload', path: '/', component: App },
        // { name: 'test', path: '/test', component: Test },
      ]
    },

  ]
});

createApp(Empty)
  .use(router)
  .mount('#app');

