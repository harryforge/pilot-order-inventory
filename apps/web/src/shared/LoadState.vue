<script setup lang="ts">
defineProps<{ loading: boolean; error: string | null }>();
</script>

<template>
  <p
    v-if="error"
    class="notice notice--error"
    role="alert"
    data-test="load-error"
  >
    Could not load the data: {{ error }}
  </p>
  <p
    v-else-if="loading"
    class="notice"
    data-test="loading"
  >
    Loading…
  </p>
  <slot v-else />
</template>
