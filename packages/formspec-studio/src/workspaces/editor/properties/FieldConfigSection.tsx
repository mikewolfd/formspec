import { useState } from 'react';
import { Section } from '../../../components/ui/Section';
import { HelpTip } from '../../../components/ui/HelpTip';
import { propertyHelp } from '../../../lib/field-helpers';
import { AddPlaceholder, PropInput } from './shared';

export function FieldConfigSection({
  path,
  item,
  dispatch,
  isDecimalLike,
  isMoney,
}: {
  path: string;
  item: any;
  dispatch: (command: any) => any;
  isDecimalLike: boolean;
  isMoney: boolean;
}) {
  const [showPrePopulate, setShowPrePopulate] = useState(!!item.prePopulate);
  const prePopulate = item.prePopulate as { instance: string; path: string; editable?: boolean } | undefined;

  return (
    <Section title="Field Config">
      <PropInput
        path={path}
        property="initialValue"
        label="Initial Value"
        value={item.initialValue != null ? String(item.initialValue) : ''}
        dispatch={dispatch}
        help={propertyHelp.initialValue}
      />

      {isDecimalLike && typeof item.precision === 'number' && (
        <PropInput
          path={path}
          property="precision"
          label="Precision"
          type="number"
          min={0}
          value={item.precision}
          dispatch={dispatch}
          help={propertyHelp.precision}
        />
      )}

      {isMoney && typeof item.currency === 'string' && (
        <PropInput
          path={path}
          property="currency"
          label="Currency"
          value={item.currency}
          dispatch={dispatch}
          help={propertyHelp.currency}
        />
      )}

      {typeof item.prefix === 'string' && (
        <PropInput
          path={path}
          property="prefix"
          label="Prefix"
          value={item.prefix}
          dispatch={dispatch}
          help={propertyHelp.prefix}
        />
      )}
      {typeof item.suffix === 'string' && (
        <PropInput
          path={path}
          property="suffix"
          label="Suffix"
          value={item.suffix}
          dispatch={dispatch}
          help={propertyHelp.suffix}
        />
      )}
      {typeof item.semanticType === 'string' && (
        <PropInput
          path={path}
          property="semanticType"
          label="Semantic Type"
          value={item.semanticType}
          dispatch={dispatch}
          help={propertyHelp.semanticType}
        />
      )}

      {showPrePopulate || prePopulate ? (
        <div className="space-y-1.5 mb-2">
          <label className="font-mono text-[10px] text-muted uppercase tracking-wider block">
            <HelpTip text={propertyHelp.prePopulate}>Pre-Population</HelpTip>
          </label>
          <div className="rounded-[4px] border border-border bg-subtle/40 px-2 py-2 space-y-2">
            <div className="space-y-1">
              <label className="font-mono text-[10px] text-muted uppercase tracking-wider block" htmlFor={`${path}-prepop-instance`}>
                <HelpTip text={propertyHelp.instance}>Instance</HelpTip>
              </label>
              <input
                id={`${path}-prepop-instance`}
                type="text"
                aria-label="Instance"
                className="w-full px-2 py-1 text-[12px] font-mono border border-border rounded-[4px] bg-surface outline-none focus:border-accent transition-colors"
                defaultValue={prePopulate?.instance ?? ''}
                onBlur={(event) => {
                  dispatch({
                    type: 'definition.setItemProperty',
                    payload: {
                      path,
                      property: 'prePopulate',
                      value: { ...(prePopulate || {}), instance: event.currentTarget.value },
                    },
                  });
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[10px] text-muted uppercase tracking-wider block" htmlFor={`${path}-prepop-path`}>
                <HelpTip text={propertyHelp.path}>Path</HelpTip>
              </label>
              <input
                id={`${path}-prepop-path`}
                type="text"
                aria-label="Path"
                className="w-full px-2 py-1 text-[12px] font-mono border border-border rounded-[4px] bg-surface outline-none focus:border-accent transition-colors"
                defaultValue={prePopulate?.path ?? ''}
                onBlur={(event) => {
                  dispatch({
                    type: 'definition.setItemProperty',
                    payload: {
                      path,
                      property: 'prePopulate',
                      value: { ...(prePopulate || {}), path: event.currentTarget.value },
                    },
                  });
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id={`${path}-prepop-editable`}
                type="checkbox"
                aria-label="Editable"
                className="accent-accent"
                defaultChecked={prePopulate?.editable !== false}
                onChange={(event) => {
                  dispatch({
                    type: 'definition.setItemProperty',
                    payload: {
                      path,
                      property: 'prePopulate',
                      value: { ...(prePopulate || {}), editable: event.currentTarget.checked },
                    },
                  });
                }}
              />
              <label htmlFor={`${path}-prepop-editable`} className="font-mono text-[10px] text-muted uppercase tracking-wider">
                <HelpTip text={propertyHelp.editable}>Editable</HelpTip>
              </label>
            </div>
          </div>
        </div>
      ) : (
        <AddPlaceholder label="pre-population" onAdd={() => setShowPrePopulate(true)} help={propertyHelp.prePopulate} />
      )}
    </Section>
  );
}
