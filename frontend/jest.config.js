const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

/** @type {import('jest').Config} */
const config = {
  setupFiles: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Coverage measures production frontend code. After Phase 1 the old
  // lib/api.ts / lib/authFetch.ts and their dead-code test suites are
  // deleted; the report now covers the real layers: the typed browser API
  // boundary (lib/api), the RSC data layer (lib/data), contexts, and the
  // Phase 4 admin primitives (form split + shared list shell).
  collectCoverageFrom: [
    'lib/**/*.{js,jsx,ts,tsx}',
    'contexts/**/*.{js,jsx,ts,tsx}',
    'components/admin/form/**/*.{js,jsx,ts,tsx}',
    'components/admin/list/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
}

module.exports = createJestConfig(config)
