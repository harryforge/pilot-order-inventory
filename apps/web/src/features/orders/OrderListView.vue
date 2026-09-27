<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { formatDateTime, formatYen } from '../../shared/format';
import { errorMessage } from '../../shared/http';
import LoadState from '../../shared/LoadState.vue';
import { listOrders, type Order, ORDER_STATUS_CLASS, type OrderFilters } from './api';

const route = useRoute();
const router = useRouter();

/** The search lives in the URL (`?orderNumber=&customer=`), so a search can be shared. */
function filtersFromUrl(): OrderFilters {
  const read = (key: string) => (typeof route.query[key] === 'string' ? route.query[key] : '');
  return { orderNumber: read('orderNumber'), customer: read('customer') };
}

const form = reactive(filtersFromUrl());
const orders = ref<Order[] | null>(null);
const error = ref<string | null>(null);
const loading = ref(true);

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    orders.value = await listOrders(filtersFromUrl());
  } catch (err) {
    error.value = errorMessage(err);
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.query,
  () => {
    Object.assign(form, filtersFromUrl());
    void load();
  },
  { immediate: true },
);

function search(): void {
  const query = Object.fromEntries(
    Object.entries(form)
      .map(([key, value]) => [key, value?.trim() ?? ''])
      .filter(([, value]) => value !== ''),
  );
  void router.push({ path: '/orders', query });
}

function clear(): void {
  Object.assign(form, { orderNumber: '', customer: '' });
  void router.push({ path: '/orders' });
}
</script>

<template>
  <section aria-labelledby="orders-heading">
    <header class="page-header">
      <h2 id="orders-heading">
        Orders
      </h2>
      <RouterLink
        class="button button--primary"
        to="/orders/new"
      >
        New order
      </RouterLink>
    </header>

    <form
      class="form form--inline"
      role="search"
      data-test="order-search"
      @submit.prevent="search"
    >
      <label>
        Order number
        <input
          v-model="form.orderNumber"
          name="orderNumber"
          placeholder="SO-000123"
          maxlength="20"
        >
      </label>
      <label class="grow">
        Customer
        <input
          v-model="form.customer"
          name="customer"
          maxlength="100"
        >
      </label>
      <button
        class="button button--primary"
        type="submit"
      >
        Search
      </button>
      <button
        class="button"
        type="button"
        data-test="clear-search"
        @click="clear"
      >
        Clear
      </button>
    </form>

    <LoadState
      :loading="loading"
      :error="error"
    >
      <p
        v-if="orders?.length === 0"
        class="notice"
        data-test="no-orders"
      >
        No orders found.
      </p>
      <template v-else-if="orders">
        <p
          class="subtle"
          data-test="order-count"
        >
          {{ orders.length }} orders
        </p>
        <table
          class="data-table"
          data-test="order-table"
        >
          <thead>
            <tr>
              <th scope="col">
                Order number
              </th>
              <th scope="col">
                Ordered
              </th>
              <th scope="col">
                Customer
              </th>
              <th scope="col">
                Status
              </th>
              <th
                scope="col"
                class="numeric"
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in orders"
              :key="order.id"
            >
              <td class="mono">
                <RouterLink :to="`/orders/${order.id}`">
                  {{ order.orderNumber }}
                </RouterLink>
              </td>
              <td>{{ formatDateTime(order.orderedAt) }}</td>
              <td>{{ order.customer.name }}</td>
              <td>
                <span :class="['status', `status--${ORDER_STATUS_CLASS[order.status]}`]">
                  {{ order.status }}
                </span>
              </td>
              <td class="numeric">
                {{ formatYen(order.totalAmount) }}
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </LoadState>
  </section>
</template>
