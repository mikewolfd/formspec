import type { ConnectionResult, InquestProviderAdapter } from '../../shared/contracts/inquest';

interface ProviderSetupProps {
  adapters: InquestProviderAdapter[];
  selectedProviderId?: string;
  apiKey: string;
  rememberKey: boolean;
  connection?: ConnectionResult;
  isTesting?: boolean;
  onProviderSelected(providerId: string): void;
  onApiKeyChange(value: string): void;
  onRememberChange(value: boolean): void;
  onTestConnection(): void;
  onContinue(): void;
  onCredentialsCleared(): void;
}

export function ProviderSetup({
  adapters,
  selectedProviderId,
  apiKey,
  rememberKey,
  connection,
  isTesting,
  onProviderSelected,
  onApiKeyChange,
  onRememberChange,
  onTestConnection,
  onContinue,
  onCredentialsCleared,
}: ProviderSetupProps) {
  const isVerified = connection?.ok && !isTesting;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Step 1</div>
          <h2 className="text-xl font-bold text-slate-900">Intelligence Setup</h2>
        </div>
        {(connection?.ok || isTesting) && (
          <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${isTesting ? 'text-accent animate-pulse' : 'text-emerald-500'}`}>
            <span className={`h-2 w-2 rounded-full ${isTesting ? 'bg-accent' : 'bg-emerald-500'}`} />
            {isTesting ? 'Verifying...' : 'Verified'}
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Choose Provider</label>
          <div className="flex flex-wrap gap-2">
            {adapters.map((adapter) => {
              const selected = adapter.id === selectedProviderId;
              return (
                <button
                  key={adapter.id}
                  type="button"
                  className={`rounded-xl px-4 py-2 text-[12px] font-bold transition-all border ${
                    selected 
                      ? 'border-accent bg-accent text-white shadow-md' 
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400'
                  }`}
                  onClick={() => onProviderSelected(adapter.id)}
                >
                  {adapter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block">Access Key</label>
          <input
            type="password"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] outline-none placeholder:text-slate-300 focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all font-mono"
            value={apiKey}
            onChange={(event) => onApiKeyChange(event.target.value)}
            placeholder="sk-..."
          />
          
          <div className="flex items-center justify-between mt-4 px-1">
            <label className="flex items-center gap-2.5 text-[11px] font-bold text-slate-400 cursor-pointer select-none group/check">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-accent transition-all focus:ring-0 cursor-pointer bg-white"
                  checked={rememberKey}
                  onChange={(event) => onRememberChange(event.target.checked)}
                />
              </div>
              <span className="group-hover/check:text-slate-500 transition-colors">Save to this browser</span>
            </label>
            
            <button
              type="button"
              className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors px-1"
              onClick={onCredentialsCleared}
            >
              Clear Credentials
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4">
        {isVerified ? (
          <button
            type="button"
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-4 text-sm font-bold text-white shadow-xl transition-all hover:bg-black hover:scale-[1.02] active:scale-95 animate-in zoom-in-95 duration-200"
            onClick={onContinue}
          >
            <span>Continue to Chat</span>
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 px-6 py-4 text-sm font-bold transition-all ${
              isTesting 
                ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed' 
                : 'border-accent bg-accent/5 text-accent hover:bg-accent hover:text-white hover:shadow-lg'
            }`}
            onClick={onTestConnection}
            disabled={isTesting || !apiKey.trim()}
          >
            {isTesting && (
              <svg className="h-4 w-4 animate-spin text-accent" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {isTesting ? 'Verifying Key...' : 'Verify Connection'}
          </button>
        )}
      </div>

      {connection && !connection.ok && !isTesting ? (
        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 text-[12px] font-bold text-red-600 animate-in fade-in slide-in-from-top-2">
          <div className="flex gap-2">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{connection.message}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
