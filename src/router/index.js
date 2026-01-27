import { createRouter, createWebHashHistory } from 'vue-router';
import AgentPage from '../pages/AgentPage.vue';

const routes = [
  {
    path: '/',
    redirect: '/agent'
  },
  {
    path: '/agent',
    name: 'Agent',
    component: AgentPage
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
