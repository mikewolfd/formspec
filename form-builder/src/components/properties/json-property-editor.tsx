import { useEffect, useState } from 'preact/hooks';
import { showToast } from '../../state/toast';

function stringifyJson(value: unknown): string {
  if (value === undefined) return '';
  return JSON.stringify(value, null, 2);
}

export function JsonPropertyEditor({
  value,
  onChange,
  placeholder = '{}',
  rows = 4,
  label,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  placeholder?: string;
  rows?: number;
  label: string;
}) {
  const [text, setText] = useState(() => stringifyJson(value));

  useEffect(() => {
    setText(stringifyJson(value));
  }, [value]);

  function apply(nextText: string) {
    const trimmed = nextText.trim();
    if (!trimmed) {
      onChange(undefined);
      return;
    }
    try {
      const parsed = JSON.parse(nextText);
      onChange(parsed);
    } catch {
      showToast(`${label}: invalid JSON`, 'error');
    }
  }

  return (
    <textarea
      class="studio-input studio-input-mono studio-json-input"
      rows={rows}
      value={text}
      placeholder={placeholder}
      spellcheck={false}
      onInput={(event) => {
        setText((event.target as HTMLTextAreaElement).value);
      }}
      onBlur={(event) => {
        apply((event.target as HTMLTextAreaElement).value);
      }}
    />
  );
}
