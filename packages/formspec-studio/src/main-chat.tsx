/** @filedesc Entry point for the chat-only build; seeds a Gemini dev key and mounts ChatShellV2. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SessionStore } from '@formspec-org/chat';
import { ChatShellV2 } from './chat-v2/index.js';
import {
  CANONICAL_PROVIDER_CONFIG_KEY,
  migrateLegacyProviderConfigKeys,
} from './lib/provider-config-storage.js';
import './index.css';
import './chat-v2/chat-v2.css';

migrateLegacyProviderConfigKeys();

// Pre-seed Gemini dev key from env if no provider is configured
const devKey = import.meta.env.VITE_GEMINI_DEV_KEY;
if (devKey && !localStorage.getItem(CANONICAL_PROVIDER_CONFIG_KEY)) {
  localStorage.setItem(CANONICAL_PROVIDER_CONFIG_KEY, JSON.stringify({
    provider: 'google',
    apiKey: devKey,
  }));
}

const store = new SessionStore(localStorage);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChatShellV2 store={store} storage={localStorage} />
  </StrictMode>
);
