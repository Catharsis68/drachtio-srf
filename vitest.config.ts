import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: './test/test-setup.ts',
    include: ['test/**/*.test.ts'],
    threads: false,
  },
})
