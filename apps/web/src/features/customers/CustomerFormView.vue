<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import FormError from '../../shared/FormError.vue';
import { errorMessage } from '../../shared/http';
import { createCustomer, type CustomerInput } from './api';

const router = useRouter();
const form = reactive<CustomerInput>({ name: '', address: '', phone: '' });
const submitError = ref<string | null>(null);
const saving = ref(false);

async function submit(): Promise<void> {
  saving.value = true;
  submitError.value = null;
  try {
    const customer = await createCustomer({ ...form });
    await router.push(`/customers/${customer.id}`);
  } catch (err) {
    submitError.value = errorMessage(err);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section aria-labelledby="customer-form-heading">
    <h2 id="customer-form-heading">
      New customer
    </h2>
    <form
      class="form"
      data-test="customer-form"
      @submit.prevent="submit"
    >
      <label>
        Name
        <input
          v-model="form.name"
          name="name"
          required
          maxlength="100"
        >
      </label>
      <label>
        Address
        <input
          v-model="form.address"
          name="address"
          required
          maxlength="200"
        >
      </label>
      <label>
        Phone
        <input
          v-model="form.phone"
          name="phone"
          type="tel"
          required
          maxlength="20"
          placeholder="03-0000-0000"
        >
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
          to="/customers"
        >
          Cancel
        </RouterLink>
      </div>
    </form>
  </section>
</template>
