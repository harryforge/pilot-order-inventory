<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { fetchHealth, type HealthStatus } from '../api/health';

const health = ref<HealthStatus | null>(null);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    health.value = await fetchHealth();
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  }
});
</script>

<template>
  <section aria-labelledby="health-heading">
    <h2 id="health-heading">
      System status
    </h2>
    <p
      v-if="error"
      data-test="health-error"
    >
      API unreachable: {{ error }}
    </p>
    <p
      v-else-if="health"
      data-test="health-status"
    >
      API: {{ health.status }}, database: {{ health.database }}
    </p>
    <p
      v-else
      data-test="health-loading"
    >
      Checking…
    </p>
  </section>
</template>
