<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import FormError from '../../shared/FormError.vue';
import { formatYen } from '../../shared/format';
import { ApiError, errorMessage } from '../../shared/http';
import LoadState from '../../shared/LoadState.vue';
import { useResource } from '../../shared/useResource';
import { listCustomers } from '../customers/api';
import { listStock, type StockShortage } from '../inventory/api';
import { listProducts } from '../products/api';
import { createOrder } from './api';
import {
  completeLines,
  type DraftLine,
  draftTotal,
  type ProductOption,
  shortageMessages,
} from './order-form';

const router = useRouter();

const { data, error, loading } = useResource(async () => {
  const [customers, products, stock] = await Promise.all([
    listCustomers(),
    listProducts(),
    listStock(),
  ]);
  const stockById = new Map(stock.map((item) => [item.productId, item.quantity]));
  const options: ProductOption[] = products
    .filter((product) => product.salesStatus === 'on_sale')
    .map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price,
      stock: stockById.get(product.id) ?? 0,
    }));
  return { customers, options };
});

const productsById = computed(
  () => new Map((data.value?.options ?? []).map((option) => [option.id, option])),
);

let nextKey = 1;
const customerId = ref<number | null>(null);
const lines = reactive<DraftLine[]>([{ key: nextKey++, productId: null, quantity: 1 }]);
const total = computed(() => draftTotal(lines, productsById.value));
const lineErrors = ref(new Map<number, string>());
const submitError = ref<string | null>(null);
const saving = ref(false);

function addLine(): void {
  lines.push({ key: nextKey++, productId: null, quantity: 1 });
}

function removeLine(index: number): void {
  lines.splice(index, 1);
}

function lineAmount(line: DraftLine): number | null {
  const product = line.productId === null ? undefined : productsById.value.get(line.productId);
  return product ? product.price * line.quantity : null;
}

async function submit(): Promise<void> {
  submitError.value = null;
  lineErrors.value = new Map();
  const complete = completeLines(lines);
  if (customerId.value === null || complete.length === 0) {
    submitError.value = 'Choose a customer and at least one product.';
    return;
  }
  saving.value = true;
  try {
    const order = await createOrder({ customerId: customerId.value, lines: complete });
    await router.push(`/orders/${order.id}`);
  } catch (err) {
    if (err instanceof ApiError && err.code === 'INSUFFICIENT_STOCK') {
      lineErrors.value = shortageMessages(err.details as StockShortage[]);
      submitError.value = 'Not enough stock for some lines. Nothing was ordered.';
    } else {
      submitError.value = errorMessage(err);
    }
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section aria-labelledby="order-form-heading">
    <h2 id="order-form-heading">
      New order
    </h2>
    <LoadState
      :loading="loading"
      :error="error"
    >
      <form
        v-if="data"
        class="form form--wide"
        data-test="order-form"
        @submit.prevent="submit"
      >
        <label>
          Customer
          <select
            v-model="customerId"
            name="customerId"
            required
          >
            <option
              :value="null"
              disabled
            >
              Choose a customer
            </option>
            <option
              v-for="customer in data.customers"
              :key="customer.id"
              :value="customer.id"
            >
              {{ customer.name }}
            </option>
          </select>
        </label>

        <fieldset class="order-lines">
          <legend>Lines</legend>
          <div
            v-for="(line, index) in lines"
            :key="line.key"
            class="order-line"
            data-test="order-line"
          >
            <label class="grow">
              Product
              <select
                v-model="line.productId"
                :name="`productId-${index}`"
              >
                <option
                  :value="null"
                  disabled
                >
                  Choose a product
                </option>
                <option
                  v-for="option in data.options"
                  :key="option.id"
                  :value="option.id"
                  :disabled="option.stock === 0"
                >
                  {{ option.sku }} · {{ option.name }} · {{ formatYen(option.price) }} ({{ option.stock }} in stock)
                </option>
              </select>
            </label>
            <label>
              Quantity
              <input
                v-model.number="line.quantity"
                :name="`quantity-${index}`"
                type="number"
                min="1"
                step="1"
                required
              >
            </label>
            <output class="line-amount numeric">
              {{ lineAmount(line) === null ? '—' : formatYen(lineAmount(line) as number) }}
            </output>
            <button
              class="button"
              type="button"
              :aria-label="`Remove line ${index + 1}`"
              :disabled="lines.length === 1"
              @click="removeLine(index)"
            >
              Remove
            </button>
            <p
              v-if="line.productId !== null && lineErrors.get(line.productId)"
              class="line-error"
              data-test="line-error"
            >
              {{ lineErrors.get(line.productId) }}
            </p>
          </div>
          <button
            class="button"
            type="button"
            data-test="add-line"
            @click="addLine"
          >
            Add line
          </button>
        </fieldset>

        <p
          class="order-total"
          data-test="draft-total"
        >
          Total <strong>{{ formatYen(total) }}</strong>
        </p>
        <FormError :message="submitError" />
        <div class="actions">
          <button
            class="button button--primary"
            type="submit"
            :disabled="saving"
          >
            {{ saving ? 'Placing order…' : 'Place order' }}
          </button>
          <RouterLink
            class="button"
            to="/orders"
          >
            Cancel
          </RouterLink>
        </div>
      </form>
    </LoadState>
  </section>
</template>
