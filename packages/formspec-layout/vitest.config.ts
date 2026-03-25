/** @filedesc Vitest configuration for the formspec-layout package. */
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            'formspec-engine/fel-tools': path.resolve(__dirname, '../formspec-engine/src/fel/fel-api-tools.ts'),
            'formspec-engine/init-formspec-engine': path.resolve(
                __dirname,
                '../formspec-engine/src/init-formspec-engine.ts',
            ),
            'formspec-engine': path.resolve(__dirname, '../formspec-engine/src/index.ts'),
        },
    },
    test: {
        include: ['tests/**/*.test.ts'],
        setupFiles: ['tests/setup.ts'],
    },
});
