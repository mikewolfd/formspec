/** @filedesc Vitest configuration for the formspec-webcomponent package (happy-dom environment). */
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            'formspec-engine/fel-tools': path.resolve(__dirname, '../formspec-engine/src/fel/fel-api-tools.ts'),
            'formspec-engine/fel-runtime': path.resolve(__dirname, '../formspec-engine/src/fel/fel-api-runtime.ts'),
            'formspec-engine/init-formspec-engine': path.resolve(
                __dirname,
                '../formspec-engine/src/init-formspec-engine.ts',
            ),
            'formspec-engine/render': path.resolve(__dirname, '../formspec-engine/src/engine-render-entry.ts'),
            'formspec-engine': path.resolve(__dirname, '../formspec-engine/src/index.ts'),
        },
    },
    test: {
        environment: 'happy-dom',
        include: ['tests/**/*.test.ts'],
        setupFiles: ['tests/setup.mjs'],
    },
});
