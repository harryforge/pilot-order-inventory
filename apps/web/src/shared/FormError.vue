<script setup lang="ts">
defineProps<{ message: string | null }>();
</script>

<template>
  <p
    v-if="message"
    class="notice notice--error"
    role="alert"
    data-test="form-error"
  >
    {{ message }}
  </p>
</template>
