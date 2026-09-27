<script setup lang="ts">
import LoadState from '../../shared/LoadState.vue';
import { useResource } from '../../shared/useResource';
import { listCustomers } from './api';

const { data: customers, error, loading } = useResource(listCustomers);
</script>

<template>
  <section aria-labelledby="customers-heading">
    <header class="page-header">
      <h2 id="customers-heading">
        Customers
      </h2>
      <RouterLink
        class="button button--primary"
        to="/customers/new"
      >
        New customer
      </RouterLink>
    </header>
    <LoadState
      :loading="loading"
      :error="error"
    >
      <p
        v-if="customers?.length === 0"
        class="notice"
      >
        No customers yet.
      </p>
      <table
        v-else
        class="data-table"
        data-test="customer-table"
      >
        <thead>
          <tr>
            <th scope="col">
              Name
            </th>
            <th scope="col">
              Address
            </th>
            <th scope="col">
              Phone
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="customer in customers"
            :key="customer.id"
          >
            <td>
              <RouterLink :to="`/customers/${customer.id}`">
                {{ customer.name }}
              </RouterLink>
            </td>
            <td>{{ customer.address }}</td>
            <td class="mono">
              {{ customer.phone }}
            </td>
          </tr>
        </tbody>
      </table>
    </LoadState>
  </section>
</template>
