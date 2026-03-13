import type { ConnectionResult, InquestProviderAdapter } from '../../shared/contracts/inquest';

interface ProviderSetupProps {
  adapters: InquestProviderAdapter[];
  selectedProviderId?: string;
  apiKey: string;
  rememberKey: boolean;
  connection?: ConnectionResult;
  onProviderSelected(providerId: string): void;
  onApiKeyChange(value: string): void;
  onRememberChange(value: boolean): void;
  onTestConnection(): void;
  onCredentialsCleared(): void;
}

export function ProviderSetup({
  adapters,
  selectedProviderId,
  apiKey,
  rememberKey,
  connection,
  onProviderSelected,
  onApiKeyChange,
  onRememberChange,
  onTestConnection,
  onCredentialsCleared,
}: ProviderSetupProps) {
  return (
    <section className="rounded-2xl border border-[#cfbf9f] bg-gradient-to-br from-[#1C2433] to-[#2B3544] p-6 text-white shadow-xl">
      <div className="mb-6">
        <div className="text-xs font-mono uppercase tracking-[0.4em] text-[#d6ab5b]">Provider Setup</div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight">Intelligence Engine</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Inquest requires an LLM provider for analysis and drafting. Requests stay on this browser in v1; your keys are never sent to our servers.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {adapters.map((adapter) => {
          const selected = adapter.id === selectedProviderId;
          return (
            <button
              key={adapter.id}
              type="button"
              className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-300 hover:translate-y-[-2px] ${
                selected 
                  ? 'border-[#d6ab5b] bg-white/10 shadow-lg shadow-black/20' 
                  : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
              }`}
              onClick={() => onProviderSelected(adapter.id)}
            >
              <div className={`text-sm font-bold ${selected ? 'text-[#d6ab5b]' : 'text-white'}`}>
                {adapter.label}
              </div>
              <div className="mt-1 text-xs text-slate-400 group-hover:text-slate-300">
                {adapter.capabilities.structuredOutput ? 'Structured output ready' : 'Limited output'}
              </div>
              {selected && (
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#d6ab5b] shadow-[0_0_8px_#d6ab5b]" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">API Key</span>
          <input
            type="password"
            className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm outline-none focus:border-[#d6ab5b]"
            value={apiKey}
            onChange={(event) => onApiKeyChange(event.target.value)}
            placeholder="Paste your provider key"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={rememberKey}
            onChange={(event) => onRememberChange(event.target.checked)}
          />
          Remember on this browser
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md bg-[#2F6B7E] px-3 py-2 text-sm font-medium text-white"
            onClick={onTestConnection}
          >
            Test connection
          </button>
          <button
            type="button"
            className="rounded-md border border-white/20 px-3 py-2 text-sm"
            onClick={onCredentialsCleared}
          >
            Clear
          </button>
        </div>
      </div>

      {connection ? (
        <div
          className={`mt-3 rounded-md px-3 py-2 text-sm ${
            connection.ok ? 'bg-emerald-900/40 text-emerald-100' : 'bg-red-900/40 text-red-100'
          }`}
        >
          {connection.message}
        </div>
      ) : null}
    </section>
  );
}
