<script setup lang="ts">
import { reactive, ref } from 'vue';
import FormError from '../../shared/FormError.vue';
import { formatDateTime } from '../../shared/format';
import { ApiError, errorMessage } from '../../shared/http';
import LoadState from '../../shared/LoadState.vue';
import { useResource } from '../../shared/useResource';
import {
  getStock,
  listMovements,
  MOVEMENT_REASON_LABELS,
  type MovementType,
  recordMovement,
  type StockShortage,
} from './api';

const props = defineProps<{ productId: number }>();

const { data, error, loading, reload } = useResource(async () => {
  const [stock, movements] = await Promise.all([
    getStock(props.productId),
    listMovements(props.productId),
  ]);
  return { stock, movements };
});

const form = reactive({ type: 'in' as MovementType, quantity: 1, note: '' });
const submitError = ref<string | null>(null);
const saving = ref(false);

function describeError(err: unknown): string {
  if (err instanceof ApiError && err.code === 'INSUFFICIENT_STOCK') {
    const shortage = (err.details as StockShortage[] | undefined)?.[0];
    return shortage
      ? `Not enough stock: ${shortage.requested} requested, ${shortage.available} available.`
      : 'Not enough stock.';
  }
  return errorMessage(err);
}

async function submit(): Promise<void> {
  saving.value = true;
  submitError.value = null;
  try {
    const note = form.note.trim();
    await recordMovement(form.type, {
      productId: props.productId,
      quantity: Number(form.quantity),
      ...(note ? { note } : {}),
    });
    Object.assign(form, { quantity: 1, note: '' });
    await reload();
  } catch (err) {
    submitError.value = describeError(err);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section aria-labelledby="stock-heading">
    <LoadState
      :loading="loading && !data"
      :error="error"
    >
      <template v-if="data">
        <header class="page-header">
          <h2 id="stock-heading">
            {{ data.stock.name }}
            <span class="mono subtle">{{ data.stock.sku }}</span>
          </h2>
          <p
            class="stock-figure"
            data-test="stock-quantity"
          >
            <span class="stock-figure__value">{{ data.stock.quantity }}</span> in stock
          </p>
        </header>

        <form
          class="form form--inline"
          data-test="movement-form"
          @submit.prevent="submit"
        >
          <fieldset class="segmented">
            <legend>Movement</legend>
            <label>
              <input
                v-model="form.type"
                type="radio"
                name="type"
                value="in"
              > Goods in
            </label>
            <label>
              <input
                v-model="form.type"
                type="radio"
                name="type"
                value="out"
              > Goods out
            </label>
          </fieldset>
          <label>
            Quantity
            <input
              v-model.number="form.quantity"
              name="quantity"
              type="number"
              min="1"
              step="1"
              required
            >
          </label>
          <label class="grow">
            Note
            <input
              v-model="form.note"
              name="note"
              maxlength="200"
            >
          </label>
          <button
            class="button button--primary"
            type="submit"
            :disabled="saving"
          >
            Record
          </button>
        </form>
        <FormError :message="submitError" />

        <h3>Movement history</h3>
        <p
          v-if="data.movements.length === 0"
          class="notice"
        >
          No movements yet.
        </p>
        <table
          v-else
          class="data-table"
          data-test="movement-table"
        >
          <thead>
            <tr>
              <th scope="col">
                Date
              </th>
              <th scope="col">
                Reason
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
                Balance
              </th>
              <th scope="col">
                Note
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="movement in data.movements"
              :key="movement.id"
            >
              <td>{{ formatDateTime(movement.createdAt) }}</td>
              <td>{{ MOVEMENT_REASON_LABELS[movement.reason] }}</td>
              <td
                class="numeric"
                :class="movement.type === 'in' ? 'is-in' : 'is-out'"
              >
                {{ movement.type === 'in' ? '+' : '−' }}{{ movement.quantity }}
              </td>
              <td class="numeric">
                {{ movement.balanceAfter }}
              </td>
              <td>{{ movement.note ?? '' }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </LoadState>
    <RouterLink to="/inventory">
      ← Back to inventory
    </RouterLink>
  </section>
</template>
