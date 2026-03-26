import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');

export default defineConfig({
    plugins: [preact()],
    resolve: {
        alias: {
            '@formspec/engine': path.resolve(repoRoot, 'packages/formspec-engine/src/index.ts'),
            '@formspec/engine/init-formspec-engine': path.resolve(
                repoRoot,
                'packages/formspec-engine/src/init-formspec-engine.ts',
            ),
            '@formspec/engine/render': path.resolve(repoRoot, 'packages/formspec-engine/src/engine-render-entry.ts'),
            '@formspec/webcomponent': path.resolve(repoRoot, 'packages/formspec-webcomponent/src/index.ts'),
        },
    },
    server: {
        allowedHosts: true,
        fs: {
            allow: [repoRoot],
        },
    },
});
