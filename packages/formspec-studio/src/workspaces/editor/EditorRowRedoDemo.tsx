/** @filedesc Unwired visual study for a denser, more legible editor row design. */

const GROUPS = [
  {
    title: 'Applicant Information',
    key: 'applicant',
    accent: 'bg-accent/80',
    rows: [
      {
        icon: 'Aa',
        label: 'Applicant Name',
        key: 'fullName',
        type: 'string',
        facts: [
          { label: 'Hint', value: 'First, middle, last' },
          { label: 'Semantic', value: 'person:legal-name' },
          { label: 'Required', value: 'Always on first pass' },
        ],
        status: ['req'],
      },
      {
        icon: '📅',
        label: 'Date of Birth',
        key: 'dob',
        type: 'date',
        facts: [
          { label: 'Format', value: 'YYYY-MM-DD' },
          { label: 'Rule', value: 'Must be in the past' },
        ],
        status: ['rule'],
        addCtas: ['+ Add description', '+ Add hint'],
        state: 'selected',
      },
      {
        icon: '?',
        label: 'Marital Status',
        key: 'maritalStatus',
        type: 'choice',
        facts: [
          { label: 'Options', value: '4 choices' },
          { label: 'Source', value: 'Inline options' },
        ],
        status: [],
        addCtas: ['+ Add behavior'],
        state: 'add-missing',
      },
    ],
  },
  {
    title: 'Household',
    key: 'household',
    accent: 'bg-green/80',
    rows: [
      {
        icon: '#',
        label: 'Household Size',
        key: 'householdSize',
        type: 'integer',
        facts: [
          { label: 'Initial', value: '1' },
          { label: 'Suffix', value: 'people' },
        ],
        status: [],
        addCtas: ['+ Add behavior'],
      },
      {
        icon: '$',
        label: 'Monthly Income',
        key: 'monthlyIncome',
        type: 'money',
        facts: [
          { label: 'Currency', value: 'USD' },
          { label: 'Precision', value: '2 decimals' },
          { label: 'Prefix', value: '$' },
        ],
        status: ['pre', 'rule'],
        addCtas: ['+ Add hint'],
      },
    ],
  },
];

const statusTone: Record<string, string> = {
  req: 'bg-accent/10 text-accent border-accent/20',
  rule: 'bg-error/10 text-error border-error/20',
  pre: 'bg-amber/10 text-amber border-amber/20',
};

export function EditorRowRedoDemo() {
  return (
    <div data-testid="editor-row-redo-demo" className="mx-auto flex w-full max-w-[1160px] flex-col gap-6 px-3 py-4 md:px-4">
      <section className="border-b border-border/70 px-1 pb-6">
        <div className="max-w-3xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Row Redesign Study</div>
          <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-ink md:text-[34px]">
            Stronger sections, flatter rows, less chrome.
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted md:text-[16px]">
            This version removes the mini-card feel. Group headers become architectural dividers, and row facts sit in plain bands so the eye tracks left to right without hitting boxes.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-accent/25 bg-accent/8 px-2.5 py-1 text-[12px] font-medium text-accent">Selected</span>
            <span className="inline-flex items-center rounded-full border border-border/80 bg-surface px-2.5 py-1 text-[12px] font-medium text-ink/75">Inline edit</span>
            <span className="inline-flex items-center rounded-full border border-border/80 bg-surface px-2.5 py-1 text-[12px] font-medium text-ink/75">Add missing</span>
            <span className="inline-flex items-center rounded-full border border-border/80 bg-surface px-2.5 py-1 text-[12px] font-medium text-ink/75">Behavior menu</span>
          </div>
        </div>
      </section>

      <div className="space-y-8">
        {GROUPS.map((group) => (
          <section key={group.key} data-testid={`editor-row-redo-group-${group.key}`} className="px-1">
            <div className="flex items-start justify-between gap-4 pb-4">
              <div className="flex min-w-0 items-start gap-4">
                <div className="pt-1">
                  <div className={`h-14 w-1.5 rounded-full ${group.accent}`} />
                  <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/55">
                    Group
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[24px] font-semibold tracking-tight text-ink md:text-[28px]">{group.title}</div>
                  <div className="mt-1 font-mono text-[12px] tracking-[0.12em] text-muted">{group.key}</div>
                </div>
              </div>
              <button
                type="button"
                className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/80 bg-bg-default text-[18px] text-ink/80"
                aria-label={`Add item to ${group.title}`}
              >
                +
              </button>
            </div>

              <div className="space-y-2 border-t border-border/80">
              {group.rows.map((row) => (
                <article
                  key={row.key}
                  data-testid={`editor-row-redo-row-${row.key}`}
                  className={[
                    'border-b border-border/75 py-4 last:border-b-0',
                    row.state === 'selected' ? 'bg-accent/[0.04] -mx-2 px-2 rounded-[18px] border border-accent/20' : '',
                  ].join(' ')}
                >
                  <div className="grid gap-3 md:grid-cols-[minmax(0,18rem),minmax(0,1fr)] md:items-start">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-surface text-[14px] font-semibold text-ink">
                        {row.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[18px] font-semibold leading-6 text-ink">{row.label}</div>
                        <div className="mt-1 font-mono text-[12px] tracking-[0.08em] text-muted">{row.key}</div>
                      </div>
                    </div>

                    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="border-l border-border/85 pl-3">
                        <dt className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink/55">Type</dt>
                        <dd className="mt-1 text-[15px] font-medium text-ink">{row.type}</dd>
                      </div>
                      {row.facts.map((fact) => (
                        <div key={fact.label} className="border-l border-border/85 pl-3">
                          <dt className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink/55">{fact.label}</dt>
                          <dd className="mt-1 text-[15px] font-medium leading-5 text-ink">
                            {row.state === 'selected' && fact.label === 'Rule' ? (
                              <input
                                type="text"
                                readOnly
                                value={fact.value}
                                className="w-full rounded-[10px] border border-accent/30 bg-surface px-2.5 py-2 text-[14px] text-ink shadow-sm outline-none"
                              />
                            ) : (
                              fact.value
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  {(row.status.length > 0 || row.addCtas?.length) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {row.status.map((pill) => (
                        <span
                          key={pill}
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium ${statusTone[pill] ?? 'bg-subtle text-muted border-border'}`}
                        >
                          {pill}
                        </span>
                      ))}
                      {row.addCtas?.map((cta: string) => (
                        <button
                          key={cta}
                          type="button"
                          className={[
                            'inline-flex items-center rounded-full border border-dashed border-border/90 px-2.5 py-1 text-[12px] font-medium text-ink/70 transition-colors hover:border-accent/40 hover:text-ink',
                            row.state === 'add-missing' && cta === '+ Add behavior' ? 'border-accent/45 bg-accent/[0.05] text-accent' : '',
                          ].join(' ')}
                        >
                          {cta}
                        </button>
                      ))}
                      {row.state === 'selected' && (
                        <div className="ml-1 inline-flex items-center rounded-full border border-border/90 bg-surface px-2.5 py-1 text-[12px] font-medium text-ink/75">
                          Inline edit
                        </div>
                      )}
                      {row.state === 'add-missing' && (
                        <div className="ml-1 inline-flex items-center rounded-full border border-border/90 bg-surface px-2.5 py-1 text-[12px] font-medium text-ink/75">
                          Behavior menu
                        </div>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
