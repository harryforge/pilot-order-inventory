<script setup lang="ts">
import { formatDateTime, formatYen } from '../../shared/format';
import LoadState from '../../shared/LoadState.vue';
import { useResource } from '../../shared/useResource';
import { getProduct, SALES_STATUS_LABELS } from './api';

const props = defineProps<{ id: number }>();
const { data: product, error, loading } = useResource(() => getProduct(props.id));
</script>

<template>
  <section aria-labelledby="product-heading">
    <LoadState
      :loading="loading"
      :error="error"
    >
      <template v-if="product">
        <header class="page-header">
          <h2 id="product-heading">
            {{ product.name }}
          </h2>
          <div class="actions">
            <RouterLink
              class="button"
              :to="`/inventory/${product.id}`"
            >
              Stock
            </RouterLink>
            <RouterLink
              class="button button--primary"
              :to="`/products/${product.id}/edit`"
            >
              Edit
            </RouterLink>
          </div>
        </header>
        <dl
          class="detail-list"
          data-test="product-detail"
        >
          <dt>SKU</dt>
          <dd class="mono">
            {{ product.sku }}
          </dd>
          <dt>Price</dt>
          <dd>{{ formatYen(product.price) }}</dd>
          <dt>Sales status</dt>
          <dd>{{ SALES_STATUS_LABELS[product.salesStatus] }}</dd>
          <dt>Updated</dt>
          <dd>{{ formatDateTime(product.updatedAt) }}</dd>
        </dl>
      </template>
    </LoadState>
    <RouterLink to="/products">
      ← Back to products
    </RouterLink>
  </section>
</template>
