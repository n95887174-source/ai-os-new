/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/tests/setup-light.ts'],
        include: ['src/**/*.test.{ts,tsx}'],
        testTimeout: 15000,
        hookTimeout: 15000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'html'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/**/*.test.*', 'src/**/*.d.ts', 'src/types/**'],
            // Thresholds intentionally low — test infrastructure is early-stage.
            // Most kernel services lack tests (46 test files cover UI + LLM only).
            // Raise after kernel test migration: see TASKS.md §P0 "Tests on kernel/router/memory/tool services"
            thresholds: {
                statements: 20,
                branches: 10,
                functions: 15,
                lines: 20,
            },
        },
    },
});
