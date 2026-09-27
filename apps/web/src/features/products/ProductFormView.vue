<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import FormError from '../../shared/FormError.vue';
import { ApiError, errorMessage } from '../../shared/http';
import {
  createProduct,
  getProduct,
  type ProductInput,
  SALES_STATUS_LABELS,
  SALES_STATUSES,
  updateProduct,
} from './api';

/** Without an id the form creates a product; with an id it edits that product. */
const props = defineProps<{ id?: number }>();
const router = useRouter();

const form = reactive<ProductInput>({ sku: '', name: '', price: 0, salesStatus: 'on_sale' });
const loadError = ref<string | null>(null);
const submitError = ref<string | null>(null);
const saving = ref(false);
const isEdit = computed(() => props.id !== undefined);

onMounted(async () => {
  if (props.id === undefined) {
    return;
  }
  try {
    const { sku, name, price, salesStatus } = await getProduct(props.id);
    Object.assign(form, { sku, name, price, salesStatus });
  } catch (err) {
    loadError.value = errorMessage(err);
  }
});

async function submit(): Promise<void> {
  saving.value = true;
  submitError.value = null;
  try {
    const input = { ...form, price: Number(form.price) };
    const saved =
      props.id === undefined ? await createProduct(input) : await updateProduct(props.id, input);
    await router.push(`/products/${saved.id}`);
  } catch (err) {
    submitError.value =
      err instanceof ApiError && err.code === 'SKU_ALREADY_EXISTS'
        ? 'This SKU is already used by another product.'
        : errorMessage(err);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section aria-labelledby="product-form-heading">
    <h2 id="product-form-heading">
      {{ isEdit ? 'Edit product' : 'New product' }}
    </h2>
    <FormError :message="loadError" />
    <form
      class="form"
      data-test="product-form"
      @submit.prevent="submit"
    >
      <label>
        SKU
        <input
          v-model="form.sku"
          name="sku"
          required
          maxlength="64"
          autocomplete="off"
        >
      </label>
      <label>
        Name
        <input
          v-model="form.name"
          name="name"
          required
          maxlength="200"
        >
      </label>
      <label>
        Price (JPY)
        <input
          v-model.number="form.price"
          name="price"
          type="number"
          required
          min="0"
          step="1"
        >
      </label>
      <label>
        Sales status
        <select
          v-model="form.salesStatus"
          name="salesStatus"
        >
          <option
            v-for="status in SALES_STATUSES"
            :key="status"
            :value="status"
          >
            {{ SALES_STATUS_LABELS[status] }}
          </option>
        </select>
      </label>
      <FormError :message="submitError" />
      <div class="actions">
        <button
          class="button button--primary"
          type="submit"
          :disabled="saving"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <RouterLink
          class="button"
          :to="isEdit ? `/products/${props.id}` : '/products'"
        >
          Cancel
        </RouterLink>
      </div>
    </form>
  </section>
</template>
