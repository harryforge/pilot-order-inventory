import { createRouter, createWebHistory, type RouteLocationNormalized, type RouteRecordRaw, type Router, type RouterHistory } from 'vue-router';
import CustomerDetailView from './features/customers/CustomerDetailView.vue';
import CustomerFormView from './features/customers/CustomerFormView.vue';
import CustomerListView from './features/customers/CustomerListView.vue';
import InventoryDetailView from './features/inventory/InventoryDetailView.vue';
import InventoryListView from './features/inventory/InventoryListView.vue';
import ProductDetailView from './features/products/ProductDetailView.vue';
import ProductFormView from './features/products/ProductFormView.vue';
import ProductListView from './features/products/ProductListView.vue';

/** Passes a numeric route parameter to the view as a number prop. */
function numberParam(name: string, prop = name) {
  return (route: RouteLocationNormalized) => ({ [prop]: Number(route.params[name]) });
}

export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/products' },
  { path: '/products', component: ProductListView },
  { path: '/products/new', component: ProductFormView },
  { path: '/products/:id(\\d+)', component: ProductDetailView, props: numberParam('id') },
  { path: '/products/:id(\\d+)/edit', component: ProductFormView, props: numberParam('id') },
  { path: '/inventory', component: InventoryListView },
  {
    path: '/inventory/:productId(\\d+)',
    component: InventoryDetailView,
    props: numberParam('productId'),
  },
  { path: '/customers', component: CustomerListView },
  { path: '/customers/new', component: CustomerFormView },
  { path: '/customers/:id(\\d+)', component: CustomerDetailView, props: numberParam('id') },
];

export function createAppRouter(history: RouterHistory = createWebHistory()): Router {
  return createRouter({ history, routes });
}
