import { BindCard } from '../../components/ui/BindCard';
import { InlineExpression } from '../../components/ui/InlineExpression';
import { useDispatch } from '../../state/useDispatch';

interface BindEntry {
  required?: string;
  relevant?: string;
  calculate?: string;
  constraint?: string;
  readonly?: string;
}

interface BindsSectionProps {
  binds: Record<string, BindEntry>;
  activeFilter?: (typeof bindTypes)[number] | null;
  onSelectPath?: (path: string) => void;
}

const bindTypes = ['required', 'relevant', 'calculate', 'constraint', 'readonly'] as const;

export function BindsSection({ binds, activeFilter = null, onSelectPath }: BindsSectionProps) {
  const dispatch = useDispatch();

  const entries = Object.entries(binds).filter(([, bind]) => {
    if (!activeFilter) return true;
    return Boolean(bind[activeFilter]);
  });
  if (entries.length === 0) return null;

  const handleSave = (path: string, type: string, newValue: string) => {
    dispatch({
      type: 'definition.setBind',
      payload: { path, properties: { [type]: newValue || null } },
    });
  };

  return (
    <div className="space-y-4">
      {entries.map(([path, bind]) => (
        <div key={path} className="space-y-1.5">
          <button
            type="button"
            onClick={() => onSelectPath?.(path)}
            className="text-[14px] font-bold text-ink hover:text-accent font-mono transition-colors"
          >
            {path}
          </button>
          <div className="space-y-1.5 pl-3 border-l border-border/50 ml-1">
            {bindTypes.map((type) => {
              const expression = bind[type];
              if (!expression) return null;
              return (
                <BindCard key={type} bindType={type} expression={expression}>
                  <InlineExpression
                    value={expression}
                    onSave={(val) => handleSave(path, type, val)}
                    placeholder="Click to add expression"
                  />
                </BindCard>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
