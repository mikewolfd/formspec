import { Section } from '../../../components/ui/Section';

export function OptionsSection({
  path,
  item,
  dispatch,
}: {
  path: string;
  item: any;
  dispatch: (command: any) => any;
}) {
  const rawChoiceOptions = item.options ?? item.choices;
  const choiceOptions = Array.isArray(rawChoiceOptions)
    ? (rawChoiceOptions as Array<{ value: string; label?: string }>)
    : [];

  const updateOption = (index: number, property: 'value' | 'label', value: string) => {
    const nextOptions = choiceOptions.map((option, optionIndex) =>
      optionIndex === index ? { ...option, [property]: value } : option,
    );
    dispatch({
      type: 'definition.setItemProperty',
      payload: { path, property: 'options', value: nextOptions },
    });
  };

  const addOption = () => {
    dispatch({
      type: 'definition.setItemProperty',
      payload: {
        path,
        property: 'options',
        value: [...choiceOptions, { value: '', label: '' }],
      },
    });
  };

  const removeOption = (index: number) => {
    dispatch({
      type: 'definition.setItemProperty',
      payload: {
        path,
        property: 'options',
        value: choiceOptions.filter((_, optionIndex) => optionIndex !== index),
      },
    });
  };

  return (
    <Section title="Options">
      <div className="space-y-2">
        {choiceOptions.map((option, index) => (
          <div
            key={`${option.value}-${index}`}
            className="rounded-[4px] border border-border bg-subtle/40 px-2 py-2 space-y-2 relative"
          >
            <button
              type="button"
              aria-label="Remove option"
              className="absolute top-1 right-1 text-[10px] text-muted hover:text-error cursor-pointer transition-colors"
              onClick={() => removeOption(index)}
            >
              ✕
            </button>
            <div className="space-y-1">
              <label className="font-mono text-[10px] text-muted uppercase tracking-wider block" htmlFor={`${path}-option-${index}-value`}>
                Option {index + 1} Value
              </label>
              <input
                id={`${path}-option-${index}-value`}
                aria-label={`Option ${index + 1} Value`}
                type="text"
                className="w-full px-2 py-1 text-[12px] font-mono border border-border rounded-[4px] bg-surface outline-none focus:border-accent transition-colors"
                defaultValue={option.value}
                onBlur={(event) => updateOption(index, 'value', event.currentTarget.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[10px] text-muted uppercase tracking-wider block" htmlFor={`${path}-option-${index}-label`}>
                Option {index + 1} Label
              </label>
              <input
                id={`${path}-option-${index}-label`}
                aria-label={`Option ${index + 1} Label`}
                type="text"
                className="w-full px-2 py-1 text-[12px] border border-border rounded-[4px] bg-surface outline-none focus:border-accent transition-colors"
                defaultValue={option.label ?? option.value}
                onBlur={(event) => updateOption(index, 'label', event.currentTarget.value)}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          aria-label="Add option"
          className="w-full py-1.5 border border-dashed border-border rounded-[4px] font-mono text-[11px] text-muted hover:text-accent hover:border-accent transition-colors cursor-pointer"
          onClick={addOption}
        >
          + Add Option
        </button>
      </div>
    </Section>
  );
}
