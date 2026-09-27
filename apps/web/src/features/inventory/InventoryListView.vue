<script setup lang="ts">
import { formatDateTime } from '../../shared/format';
import LoadState from '../../shared/LoadState.vue';
import { useResource } from '../../shared/useResource';
import { listStock } from './api';

const { data: stock, error, loading } = useResource(listStock);
</script>

<template>
  <section aria-labelledby="inventory-heading">
    <header class="page-header">
      <h2 id="inventory-heading">
        Inventory
      </h2>
    </header>
    <LoadState
      :loading="loading"
      :error="error"
    >
      <p
        v-if="stock?.length === 0"
        class="notice"
      >
        No products yet.
      </p>
      <table
        v-else
        class="data-table"
        data-test="stock-table"
      >
        <thead>
          <tr>
            <th scope="col">
              SKU
            </th>
            <th scope="col">
              Name
            </th>
            <th
              scope="col"
              class="numeric"
            >
              In stock
            </th>
            <th scope="col">
              Last change
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in stock"
            :key="item.productId"
          >
            <td class="mono">
              {{ item.sku }}
            </td>
            <td>
              <RouterLink :to="`/inventory/${item.productId}`">
                {{ item.name }}
              </RouterLink>
            </td>
            <td
              class="numeric"
              :class="{ 'is-empty': item.quantity === 0 }"
            >
              {{ item.quantity }}
            </td>
            <td>{{ formatDateTime(item.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </LoadState>
  </section>
</template>
