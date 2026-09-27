<script setup lang="ts">
import { useRoute } from 'vue-router';
import HealthStatus from './features/health/HealthStatus.vue';

const navigation = [
  { to: '/products', label: 'Products' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/customers', label: 'Customers' },
];

const route = useRoute();

/** A section stays highlighted on its detail and form pages too. */
function isActive(to: string): boolean {
  return route.path === to || route.path.startsWith(`${to}/`);
}
</script>

<template>
  <div class="shell">
    <header class="masthead">
      <RouterLink
        to="/"
        class="brand"
      >
        <span class="brand__ja">受注・在庫管理</span>
        <span class="brand__en">Order and inventory</span>
      </RouterLink>
      <nav aria-label="Main navigation">
        <RouterLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ 'is-active': isActive(item.to) }"
          :aria-current="isActive(item.to) ? 'page' : undefined"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </header>
    <main class="content">
      <RouterView />
    </main>
    <footer class="footer">
      <span>Sample pilot app. All data is fictional.</span>
      <HealthStatus />
    </footer>
  </div>
</template>
