<script setup lang="ts">
import { formatDateTime } from '../../shared/format';
import LoadState from '../../shared/LoadState.vue';
import { useResource } from '../../shared/useResource';
import { getCustomer } from './api';

const props = defineProps<{ id: number }>();
const { data: customer, error, loading } = useResource(() => getCustomer(props.id));
</script>

<template>
  <section aria-labelledby="customer-heading">
    <LoadState
      :loading="loading"
      :error="error"
    >
      <template v-if="customer">
        <header class="page-header">
          <h2 id="customer-heading">
            {{ customer.name }}
          </h2>
        </header>
        <dl
          class="detail-list"
          data-test="customer-detail"
        >
          <dt>Address</dt>
          <dd>{{ customer.address }}</dd>
          <dt>Phone</dt>
          <dd class="mono">
            {{ customer.phone }}
          </dd>
          <dt>Registered</dt>
          <dd>{{ formatDateTime(customer.createdAt) }}</dd>
        </dl>
      </template>
    </LoadState>
    <RouterLink to="/customers">
      ← Back to customers
    </RouterLink>
  </section>
</template>
