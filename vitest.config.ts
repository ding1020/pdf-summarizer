import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    root: rootDir,
    setupFiles: [path.join(rootDir, 'tests/setup.ts')],
    include: [
      path.join(rootDir, 'tests/**/*.test.ts'),
      path.join(rootDir, 'tests/**/*.test.tsx'),
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '.next/',
      ],
    },
  },
  resolve: {
    alias: [
      { find: '@', replacement: rootDir },
      { find: /^@\/(.*)$/, replacement: `${rootDir}/$1` },
    ],
  },
});
