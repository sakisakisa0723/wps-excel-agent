<template>
  <router-view />
</template>

<script setup>
import ribbon from './components/ribbon.js';

// 暴露 ribbon 给 WPS
window.ribbon = ribbon;
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
