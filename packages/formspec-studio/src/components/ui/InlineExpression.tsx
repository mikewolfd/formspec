import { useEffect, useRef, useState } from 'react';
import { FELReferencePopup } from './FELReferencePopup';

interface InlineExpressionProps {
  value: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
  className?: string;
}

export function InlineExpression({ value, onSave, placeholder, className }: InlineExpressionProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      autoResize(textareaRef.current);
    }
  }, [editing]);

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  function enterEdit() {
    setDraft(value);
    setEditing(true);
  }

  function save() {
    setEditing(false);
    if (draft !== value) {
      onSave(draft);
    }
  }

  function cancel() {
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      cancel();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      save();
    }
  }

  if (editing) {
    return (
      <div className={`flex items-start gap-1 ${className ?? ''}`}>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            autoResize(e.target);
          }}
          onBlur={save}
          onKeyDown={handleKeyDown}
          className="flex-1 font-mono text-[11px] text-ink bg-subtle border border-accent/40 rounded px-2 py-1 resize-none outline-none focus:ring-1 focus:ring-accent"
          rows={1}
        />
        <FELReferencePopup />
      </div>
    );
  }

  if (!value && placeholder) {
    return (
      <span
        onClick={enterEdit}
        className={`font-mono text-[11px] text-muted/50 italic cursor-pointer hover:text-muted transition-colors ${className ?? ''}`}
      >
        {placeholder}
      </span>
    );
  }

  return (
    <span
      onClick={enterEdit}
      className={`font-mono text-[11px] text-muted bg-subtle px-1.5 py-0.5 rounded-[2px] cursor-pointer hover:bg-subtle/80 hover:text-ink transition-colors ${className ?? ''}`}
      title={value}
    >
      {value}
    </span>
  );
}
