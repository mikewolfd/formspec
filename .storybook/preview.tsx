import type { Preview } from '@storybook/react';
// Subpath import matches `formspec-webcomponent` so Vite keeps one wasm-bridge-runtime instance.
import { initFormspecEngine } from '@formspec-org/engine/init-formspec-engine';
import { resolveStoryAppearance } from '../stories/_shared/storyAppearance';

// CSS is loaded inside shadow DOM by IsolatedFormStory / IsolatedWebComponentStory
// to prevent cross-renderer style collisions. No global CSS imports needed.

let engineReady = false;

const preview: Preview = {
    loaders: [
        async () => {
            if (!engineReady) {
                await initFormspecEngine();
                engineReady = true;
            }
            return {};
        },
    ],
    decorators: [
        (Story, context) => {
            const appearance = resolveStoryAppearance(context.globals);
            return <Story args={{ ...context.args, appearance }} />;
        },
    ],
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        backgrounds: {
            default: 'light',
            values: [
                { name: 'light', value: '#f4efe6' },
                { name: 'dark', value: '#161311' },
            ],
        },
    },
};

export default preview;
