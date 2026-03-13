import { Section } from '../../../components/ui/Section';
import { HelpTip } from '../../../components/ui/HelpTip';
import {
  compatibleWidgets,
  componentForWidgetHint,
  propertyHelp,
  widgetHintForComponent,
} from '../../../lib/field-helpers';
import { useProject } from '../../../state/useProject';

export function WidgetHintSection({
  path,
  item,
  dispatch,
}: {
  path: string;
  item: any;
  dispatch: (command: any) => any;
}) {
  const project = useProject();
  const widgets = compatibleWidgets(item.type, item.dataType);
  const defaultWidget = widgets[0] ?? '';
  const treeWidget = project.componentFor(item.key)?.component as string | undefined;
  const hintWidget = componentForWidgetHint((item.presentation as any)?.widgetHint);
  const currentWidget = treeWidget && treeWidget !== defaultWidget
    ? treeWidget
    : hintWidget || treeWidget || defaultWidget;

  if (widgets.length < 2) return null;

  return (
    <Section title="Widget">
      <div className="space-y-1.5 mb-2">
        <label className="font-mono text-[10px] text-muted uppercase tracking-wider block" htmlFor={`${path}-widget`}>
          <HelpTip text={propertyHelp.widgetHint}>Widget</HelpTip>
        </label>
        <select
          id={`${path}-widget`}
          aria-label="Widget"
          className="w-full px-2 py-1 text-[13px] font-mono border border-border rounded-[4px] bg-surface outline-none focus:border-accent transition-colors"
          value={currentWidget}
          onChange={(event) => {
            const widget = event.currentTarget.value || null;
            const widgetHint = widget ? widgetHintForComponent(widget, item.dataType) : null;

            try {
              dispatch({
                type: 'component.setFieldWidget',
                payload: { fieldKey: item.key, widget },
              });
            } catch {
              // Some items have no component-tree node yet; keep the definition hint in sync.
            }

            dispatch({
              type: 'definition.setItemProperty',
              payload: { path, property: 'presentation.widgetHint', value: widgetHint },
            });
          }}
        >
          <option value="">Default</option>
          {widgets.map((widget) => (
            <option key={widget} value={widget}>
              {widget}
            </option>
          ))}
        </select>
      </div>
    </Section>
  );
}
