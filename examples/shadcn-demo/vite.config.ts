import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const pkg = (name: string) => path.resolve(repoRoot, 'packages', name, 'src');

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: [
            // formspec-engine subpath exports (source names differ from export names)
            { find: 'formspec-engine/init-formspec-engine', replacement: `${pkg('formspec-engine')}/init-formspec-engine.ts` },
            { find: 'formspec-engine/render', replacement: `${pkg('formspec-engine')}/engine-render-entry.ts` },
            { find: 'formspec-engine/fel-runtime', replacement: `${pkg('formspec-engine')}/fel/fel-api-runtime.ts` },
            { find: 'formspec-engine/fel-tools', replacement: `${pkg('formspec-engine')}/fel/fel-api-tools.ts` },
            { find: 'formspec-engine', replacement: `${pkg('formspec-engine')}/index.ts` },
            // formspec-layout
            { find: 'formspec-layout', replacement: `${pkg('formspec-layout')}/index.ts` },
            // formspec-webcomponent (CSS first, then JS)
            { find: 'formspec-webcomponent/formspec-layout.css', replacement: `${pkg('formspec-webcomponent')}/formspec-layout.css` },
            { find: 'formspec-webcomponent/formspec-default.css', replacement: `${pkg('formspec-webcomponent')}/formspec-default.css` },
            { find: 'formspec-webcomponent', replacement: `${pkg('formspec-webcomponent')}/index.ts` },
            // formspec-adapters
            { find: 'formspec-adapters/shadcn', replacement: `${pkg('formspec-adapters')}/shadcn/index.ts` },
            { find: 'formspec-adapters', replacement: `${pkg('formspec-adapters')}/index.ts` },
        ],
    },
    server: {
        port: 5199,
        allowedHosts: true,
        fs: { allow: [repoRoot] },
    },
});
