import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        environment: 'jsdom',
        include: ['**/*.{test,spec}.{ts,tsx}'],
        globals: true,
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },
}); 