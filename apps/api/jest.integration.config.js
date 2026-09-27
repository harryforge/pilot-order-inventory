// Integration tests: real PostgreSQL (see src/testing/test-app.ts). Run with `pnpm test:integration`.
import base from './jest.config.js';

/** @type {import('jest').Config} */
export default {
  ...base,
  testRegex: '.*\\.int-spec\\.ts$',
  testTimeout: 30000,
};
