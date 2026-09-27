import { onMounted, ref, type Ref } from 'vue';
import { errorMessage } from './http';

export interface Resource<T> {
  data: Ref<T | null>;
  error: Ref<string | null>;
  loading: Ref<boolean>;
  reload: () => Promise<void>;
}

/** Loads data when the component mounts and keeps the loading and error state. */
export function useResource<T>(loader: () => Promise<T>): Resource<T> {
  const data = ref<T | null>(null) as Ref<T | null>;
  const error = ref<string | null>(null);
  const loading = ref(true);

  async function reload(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      data.value = await loader();
    } catch (err) {
      error.value = errorMessage(err);
    } finally {
      loading.value = false;
    }
  }

  onMounted(reload);
  return { data, error, loading, reload };
}
