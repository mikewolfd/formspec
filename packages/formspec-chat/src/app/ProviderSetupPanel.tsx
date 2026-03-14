import { ProviderSetup } from '../features/provider-setup/ProviderSetup';
import { inquestProviderAdapters } from '../providers';
import type { ConnectionResult, InquestSessionV1 } from 'formspec-shared';

interface ProviderSetupPanelProps {
  session: InquestSessionV1;
  providerApiKey: string;
  rememberKey: boolean;
  connection: ConnectionResult | undefined;
  isTesting: boolean;
  onContinue: () => void;
  onProviderSelected: (providerId: string) => void;
  onApiKeyChange: (val: string) => void;
  onRememberChange: (val: boolean) => void;
  onTestConnection: () => void;
  onCredentialsCleared: () => void;
}

export function ProviderSetupPanel({
  session,
  providerApiKey,
  rememberKey,
  connection,
  isTesting,
  onContinue,
  onProviderSelected,
  onApiKeyChange,
  onRememberChange,
  onTestConnection,
  onCredentialsCleared,
}: ProviderSetupPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto flex items-start justify-center px-8 py-16">
      <div className="w-full max-w-md">
        {/* Hero */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/8 text-accent ring-1 ring-accent/15">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4l3 3" />
            </svg>
          </div>
          <h2 className="text-[22px] font-bold tracking-tight text-slate-900">Connect an AI provider</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
            Your API key stays in this browser and is never sent to our servers.
          </p>
        </div>

        <ProviderSetup
          adapters={inquestProviderAdapters}
          selectedProviderId={session.providerId}
          apiKey={providerApiKey}
          rememberKey={rememberKey}
          connection={connection}
          isTesting={isTesting}
          onContinue={onContinue}
          onProviderSelected={onProviderSelected}
          onApiKeyChange={onApiKeyChange}
          onRememberChange={onRememberChange}
          onTestConnection={onTestConnection}
          onCredentialsCleared={onCredentialsCleared}
        />
      </div>
    </div>
  );
}
