<script setup lang="ts">
import HealthStatus from './components/HealthStatus.vue';
</script>

<template>
  <main class="app">
    <h1>受注・在庫管理 / Order and inventory</h1>
    <p>Sample pilot app with fictional data. Features come in the next tasks.</p>
    <HealthStatus />
  </main>
</template>

<style scoped>
.app {
  max-width: 48rem;
  margin: 2rem auto;
  padding: 0 1rem;
  font-family: system-ui, sans-serif;
}
</style>
