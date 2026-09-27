<script setup lang="ts">
import { ref } from 'vue';
import FormError from '../../shared/FormError.vue';
import { formatDateTime, formatYen } from '../../shared/format';
import { errorMessage } from '../../shared/http';
import LoadState from '../../shared/LoadState.vue';
import { useResource } from '../../shared/useResource';
import { getOrder, ORDER_STATUS, ORDER_STATUS_CLASS, shipOrder } from './api';

const props = defineProps<{ id: number }>();
const { data: order, error, loading } = useResource(() => getOrder(props.id));
const shipError = ref<string | null>(null);
const shipping = ref(false);

async function ship(): Promise<void> {
  shipping.value = true;
  shipError.value = null;
  try {
    order.value = await shipOrder(props.id);
  } catch (err) {
    shipError.value = errorMessage(err);
  } finally {
    shipping.value = false;
  }
}
</script>

<template>
  <section aria-labelledby="order-heading">
    <LoadState
      :loading="loading"
      :error="error"
    >
      <template v-if="order">
        <header class="page-header">
          <h2 id="order-heading">
            <span class="mono-heading">{{ order.orderNumber }}</span>
            <span
              :class="['status', `status--${ORDER_STATUS_CLASS[order.status]}`]"
              data-test="order-status"
            >{{ order.status }}</span>
          </h2>
          <button
            v-if="order.status === ORDER_STATUS.received"
            class="button button--primary"
            type="button"
            data-test="ship-button"
            :disabled="shipping"
            @click="ship"
          >
            {{ shipping ? 'Shipping…' : 'Mark as shipped' }}
          </button>
        </header>
        <FormError :message="shipError" />
        <dl
          class="detail-list"
          data-test="order-detail"
        >
          <dt>Customer</dt>
          <dd>
            <RouterLink :to="`/customers/${order.customer.id}`">
              {{ order.customer.name }}
            </RouterLink>
          </dd>
          <dt>Ordered</dt>
          <dd>{{ formatDateTime(order.orderedAt) }}</dd>
          <dt>Shipped</dt>
          <dd>{{ order.shippedAt ? formatDateTime(order.shippedAt) : '—' }}</dd>
        </dl>
        <table
          class="data-table"
          data-test="order-lines"
        >
          <thead>
            <tr>
              <th scope="col">
                SKU
              </th>
              <th scope="col">
                Product
              </th>
              <th
                scope="col"
                class="numeric"
              >
                Unit price
              </th>
              <th
                scope="col"
                class="numeric"
              >
                Quantity
              </th>
              <th
                scope="col"
                class="numeric"
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="line in order.lines"
              :key="line.id"
            >
              <td class="mono">
                {{ line.product.sku }}
              </td>
              <td>
                <RouterLink :to="`/products/${line.product.id}`">
                  {{ line.product.name }}
                </RouterLink>
              </td>
              <td class="numeric">
                {{ formatYen(line.unitPrice) }}
              </td>
              <td class="numeric">
                {{ line.quantity }}
              </td>
              <td class="numeric">
                {{ formatYen(line.lineAmount) }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th
                scope="row"
                colspan="4"
                class="numeric"
              >
                Total
              </th>
              <td
                class="numeric total"
                data-test="order-total"
              >
                {{ formatYen(order.totalAmount) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </template>
    </LoadState>
    <RouterLink to="/orders">
      ← Back to orders
    </RouterLink>
  </section>
</template>
