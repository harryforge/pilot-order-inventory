// Jest runs in native ES module mode because NestJS 12 ships ES modules only.
// ts-jest compiles with tsc, which emits the decorator metadata that NestJS dependency injection needs.
/** @type {import('jest').Config} */
export default {
  rootDir: 'src',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // Source files import siblings as './file.js' (Node ESM rule); map them back to the .ts file.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json', useESM: true }],
  },
  collectCoverageFrom: ['**/*.ts', '!main.ts', '!data-source.ts', '!migrations/**'],
  coverageDirectory: '../coverage',
};
