import React, { useState, useEffect, useId } from 'react';
import type { ProviderConfig, ProviderType } from 'formspec-chat';
import { validateProviderConfig } from 'formspec-chat';

interface ProviderSetupProps {
  open: boolean;
  onClose: () => void;
  onSave: (config: ProviderConfig) => void;
}

export function ProviderSetup({ open, onClose, onSave }: ProviderSetupProps) {
  const titleId = useId();
  const [provider, setProvider] = useState<ProviderType>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = () => {
    const config: ProviderConfig = { provider, apiKey };
    const validationErrors = validateProviderConfig(config);
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map(e => e.message));
      return;
    }
    setErrors([]);
    onSave(config);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md bg-surface border border-border rounded-lg shadow-xl"
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h2 id={titleId} className="text-sm font-semibold text-ink">
            AI Provider Setup
          </h2>
          <p className="text-xs text-muted mt-1">
            Configure an AI provider for conversational form building.
          </p>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="space-y-1">
            <label htmlFor="provider-select" className="text-xs font-medium text-muted">
              Provider
            </label>
            <select
              id="provider-select"
              value={provider}
              onChange={e => setProvider(e.target.value as ProviderType)}
              className="w-full rounded-[3px] border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
            >
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="api-key-input" className="text-xs font-medium text-muted">
              API Key
            </label>
            <input
              id="api-key-input"
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="w-full rounded-[3px] border border-border bg-surface px-2 py-1.5 text-sm font-mono outline-none focus:border-accent"
            />
          </div>

          {errors.length > 0 && (
            <div className="text-xs text-error space-y-1">
              {errors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            aria-label="Cancel"
            className="px-3 py-1.5 text-sm rounded border border-border text-muted hover:text-ink transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            aria-label="Save"
            className="px-3 py-1.5 text-sm rounded bg-accent text-white font-medium hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
