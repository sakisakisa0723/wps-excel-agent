import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import ribbon from './components/ribbon.js';
import './assets/main.css';

// 暴露 ribbon 给 WPS
window.ribbon = ribbon;

const app = createApp(App);
app.use(router);
app.mount('#app');
