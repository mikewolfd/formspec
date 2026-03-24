/** @filedesc Tab bar for switching between top-level definition groups in the editor canvas. */
import { useEffect, useRef, useState } from 'react';
import { useDefinition } from '../../state/useDefinition';
import { useProject } from '../../state/useProject';

interface GroupTabsProps {
  activeGroupKey: string | null;
  onGroupChange: (key: string | null) => void;
}

export function GroupTabs({ activeGroupKey, onGroupChange }: GroupTabsProps) {
  const definition = useDefinition();
  const project = useProject();
  const items = definition.items || [];
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const groups = items.filter((item: any) => item.type === 'group');
  if (groups.length === 0) return null;

  useEffect(() => {
    if (!editingGroupKey) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editingGroupKey]);

  const startEditing = (group: any) => {
    setEditingGroupKey(group.key);
    setDraftLabel(group.label || group.key);
  };

  const stopEditing = () => {
    setEditingGroupKey(null);
    setDraftLabel('');
  };

  const commitLabel = (groupKey: string) => {
    project.updateItem(groupKey, { label: draftLabel.trim() || null });
    stopEditing();
  };

  return (
    <div
      role="tablist"
      className="flex items-center gap-0 py-2 overflow-x-auto"
    >
      {groups.map((group: any, i: number) => {
        const isActive = group.key === activeGroupKey;
        const isEditing = group.key === editingGroupKey;
        return (
          <div key={group.key} className="flex items-center shrink-0">
            <button
              role="tab"
              aria-selected={isActive}
              title={group.label || group.key}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-[4px] transition-all cursor-pointer border ${
                isActive
                  ? 'bg-accent/5 border-accent/20 text-accent font-semibold'
                  : 'bg-transparent border-transparent text-muted hover:text-ink hover:bg-subtle'
              }`}
              onClick={() => onGroupChange(group.key)}
              onDoubleClick={() => startEditing(group)}
            >
              <span
                className={`w-[18px] h-[18px] rounded-full flex items-center justify-center font-mono text-[10px] font-bold transition-colors shrink-0 ${
                  isActive ? 'bg-accent text-white' : 'bg-border/80 text-muted'
                }`}
              >
                {i + 1}
              </span>
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={draftLabel}
                  aria-label={`Rename ${group.label || group.key}`}
                  className="min-w-0 max-w-[140px] px-1 py-0.5 text-[12.5px] rounded-[3px] border border-accent/30 bg-surface outline-none"
                  onChange={(event) => setDraftLabel(event.currentTarget.value)}
                  onClick={(event) => event.stopPropagation()}
                  onDoubleClick={(event) => event.stopPropagation()}
                  onBlur={() => commitLabel(group.key)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      commitLabel(group.key);
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      stopEditing();
                    }
                  }}
                />
              ) : (
                <span className="text-[12.5px] whitespace-nowrap max-w-[140px] overflow-hidden text-ellipsis">
                  {group.label || group.key}
                </span>
              )}
            </button>
            {i < groups.length - 1 && (
              <div className="w-3 h-px bg-border/60 mx-1 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
