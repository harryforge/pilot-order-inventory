<script setup lang="ts">
import { formatYen } from '../../shared/format';
import LoadState from '../../shared/LoadState.vue';
import { useResource } from '../../shared/useResource';
import { listProducts, SALES_STATUS_LABELS } from './api';

const { data: products, error, loading } = useResource(listProducts);
</script>

<template>
  <section aria-labelledby="products-heading">
    <header class="page-header">
      <h2 id="products-heading">
        Products
      </h2>
      <RouterLink
        class="button button--primary"
        to="/products/new"
      >
        New product
      </RouterLink>
    </header>
    <LoadState
      :loading="loading"
      :error="error"
    >
      <p
        v-if="products?.length === 0"
        class="notice"
      >
        No products yet.
      </p>
      <table
        v-else
        class="data-table"
        data-test="product-table"
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
              Price
            </th>
            <th scope="col">
              Sales status
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="product in products"
            :key="product.id"
          >
            <td class="mono">
              {{ product.sku }}
            </td>
            <td>
              <RouterLink :to="`/products/${product.id}`">
                {{ product.name }}
              </RouterLink>
            </td>
            <td class="numeric">
              {{ formatYen(product.price) }}
            </td>
            <td>
              <span :class="['badge', `badge--${product.salesStatus}`]">
                {{ SALES_STATUS_LABELS[product.salesStatus] }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </LoadState>
  </section>
</template>
