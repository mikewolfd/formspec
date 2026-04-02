/** @filedesc Recursive Layout canvas renderer for authored Page sections, layout containers, and bound nodes. Passes layout context (parentContainerType, parentGridColumns) to children. */
import type { DefLookupEntry } from '@formspec-org/studio-core';
import { LayoutPageSection } from './LayoutPageSection';
import { LayoutContainer } from './LayoutContainer';
import { FieldBlock, type LayoutContext } from './FieldBlock';
import { DisplayBlock } from './DisplayBlock';

interface CompNode {
  component: string;
  bind?: string;
  nodeId?: string;
  title?: string;
  _layout?: boolean;
  children?: CompNode[];
  // Layout props (from component tree node)
  columns?: number;
  gap?: string;
  direction?: string;
  wrap?: boolean;
  align?: string;
  elevation?: number;
  width?: string;
  position?: string;
  defaultOpen?: boolean;
  style?: Record<string, unknown>;
  [key: string]: unknown;
}

interface Item {
  key: string;
  type: string;
  dataType?: string;
  label?: string;
}

export interface LayoutRenderContext {
  defLookup: Map<string, DefLookupEntry>;
  bindKeyMap: Map<string, string>;
  selectedKey: string | null;
  onSelect: (key: string, type: 'field' | 'group' | 'display' | 'layout') => void;
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  /** Write a property to a component node identified by selectionKey. */
  onSetNodeProp?: (selectionKey: string, key: string, value: unknown) => void;
  /** Unwrap a layout node (remove container, keep children). */
  onUnwrapNode?: (selectionKey: string) => void;
  /** Remove a layout node from the tree. */
  onRemoveNode?: (selectionKey: string) => void;
  /** Add a style override to a component node. */
  onStyleAdd?: (selectionKey: string, key: string, value: string) => void;
  /** Remove a style override from a component node. */
  onStyleRemove?: (selectionKey: string, key: string) => void;
}

/** Layout context propagated from a parent container down to its children. */
interface ParentLayoutContext {
  parentContainerType: string | null;
  parentGridColumns: number;
}

const ROOT_CONTEXT: ParentLayoutContext = {
  parentContainerType: null,
  parentGridColumns: 0,
};

function resolveDefPath(
  key: string,
  defPathPrefix: string,
  ctx: LayoutRenderContext,
): string | null {
  const candidate = defPathPrefix ? `${defPathPrefix}.${key}` : key;
  if (ctx.defLookup.has(candidate)) return candidate;
  return ctx.bindKeyMap.get(key) ?? candidate;
}

/** Parse column span from a style.gridColumn value like "span 2". */
function parseColSpan(gridColumn: unknown): number {
  if (typeof gridColumn !== 'string') return 1;
  const m = gridColumn.match(/span\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : 1;
}

export function renderLayoutTree(
  nodes: CompNode[],
  ctx: LayoutRenderContext,
  defPathPrefix: string,
  parentCtx: ParentLayoutContext = ROOT_CONTEXT,
): React.ReactNode[] {
  const result: React.ReactNode[] = [];

  for (const node of nodes) {
    // Authored Page node — render as a titled section in the Layout workspace.
    if (node._layout && node.component === 'Page') {
      const children = node.children
        ? renderLayoutTree(node.children, ctx, defPathPrefix, ROOT_CONTEXT)
        : null;
      result.push(
        <LayoutPageSection
          key={node.nodeId ?? node.title ?? 'page'}
          title={(node.title as string) || 'Untitled Page'}
          pageId={node.nodeId ?? 'page'}
          active={ctx.activePageId === (node.nodeId ?? 'page')}
          onSelect={ctx.onSelectPage}
        >
          {children}
        </LayoutPageSection>,
      );
      continue;
    }

    // Tier 3 display-only nodes (Heading, Divider) — _layout:true but no children
    if (node._layout && (node.component === 'Heading' || node.component === 'Divider')) {
      if (!node.nodeId) continue;
      const label = (node.component === 'Divider' ? (node.label as string) : (node.text as string)) || node.component;
      result.push(
        <DisplayBlock
          key={`node:${node.nodeId}`}
          itemKey={node.nodeId!}
          selectionKey={`__node:${node.nodeId!}`}
          label={label}
          widgetHint={node.component}
          selected={ctx.selectedKey === `__node:${node.nodeId!}`}
          onSelect={(selectionKey) => ctx.onSelect(selectionKey, 'layout')}
        />,
      );
      continue;
    }

    // Layout container (Card, Grid, Panel, Stack, Collapsible, Accordion, etc.)
    if (node._layout) {
      if (!node.nodeId) continue;
      const childCtx: ParentLayoutContext = {
        parentContainerType: node.component.toLowerCase(),
        parentGridColumns: node.columns ?? 2,
      };
      const children = node.children
        ? renderLayoutTree(node.children, ctx, defPathPrefix, childCtx)
        : null;
      const nodeSelKey = `__node:${node.nodeId!}`;
      result.push(
        <LayoutContainer
          key={`node:${node.nodeId}`}
          component={node.component}
          nodeType="layout"
          nodeId={node.nodeId!}
          selectionKey={nodeSelKey}
          selected={ctx.selectedKey === nodeSelKey}
          onSelect={() => ctx.onSelect(nodeSelKey, 'layout')}
          columns={node.columns}
          gap={node.gap}
          direction={node.direction}
          wrap={node.wrap}
          align={node.align}
          elevation={node.elevation}
          width={node.width}
          position={node.position}
          title={node.title}
          defaultOpen={node.defaultOpen}
          nodeStyle={node.style}
          nodeProps={node as Record<string, unknown>}
          onSetProp={ctx.onSetNodeProp ? (k, v) => ctx.onSetNodeProp!(nodeSelKey, k, v) : undefined}
          onSetStyle={ctx.onStyleAdd ? (k, v) => ctx.onStyleAdd!(nodeSelKey, k, v) : undefined}
          onUnwrap={ctx.onUnwrapNode ? () => ctx.onUnwrapNode!(nodeSelKey) : undefined}
          onRemove={ctx.onRemoveNode ? () => ctx.onRemoveNode!(nodeSelKey) : undefined}
          onStyleAdd={ctx.onStyleAdd ? (k, v) => ctx.onStyleAdd!(nodeSelKey, k, v) : undefined}
          onStyleRemove={ctx.onStyleRemove ? (k) => ctx.onStyleRemove!(nodeSelKey, k) : undefined}
        >
          {children}
        </LayoutContainer>,
      );
      continue;
    }

    // Bound node — field or group
    if (node.bind) {
      const defPath = resolveDefPath(node.bind, defPathPrefix, ctx);
      const defEntry = defPath ? ctx.defLookup.get(defPath) : null;
      if (!defPath || !defEntry) continue;

      const item = defEntry.item as Item;

      if (item.type === 'group') {
        const childCtx: ParentLayoutContext = {
          parentContainerType: node.component.toLowerCase(),
          parentGridColumns: (node.columns as number | undefined) ?? 2,
        };
        const children = node.children
          ? renderLayoutTree(node.children, ctx, defPath, childCtx)
          : null;
        result.push(
          <LayoutContainer
            key={defPath}
            component={node.component}
            nodeType="group"
            bind={item.key}
            bindPath={defPath}
            selected={ctx.selectedKey === defPath}
            onSelect={() => ctx.onSelect(defPath, 'group')}
          >
            {children}
          </LayoutContainer>,
        );
        continue;
      }

      const fieldLayoutCtx: LayoutContext | undefined = parentCtx.parentContainerType
        ? {
            parentContainerType: parentCtx.parentContainerType,
            parentGridColumns: parentCtx.parentGridColumns,
            currentColSpan: parseColSpan(node.style?.gridColumn),
          }
        : undefined;

      result.push(
        <FieldBlock
          key={defPath}
          itemKey={item.key}
          bindPath={defPath}
          selectionKey={defPath}
          label={item.label}
          dataType={item.dataType}
          itemType={item.type}
          selected={ctx.selectedKey === defPath}
          onSelect={(selectionKey) => ctx.onSelect(selectionKey, 'field')}
          layoutContext={fieldLayoutCtx}
          nodeStyle={node.style}
          nodeProps={node as Record<string, unknown>}
          onSetProp={ctx.onSetNodeProp ? (k, v) => ctx.onSetNodeProp!(defPath, k, v) : undefined}
          onRemove={ctx.onRemoveNode ? () => ctx.onRemoveNode!(defPath) : undefined}
          onStyleAdd={ctx.onStyleAdd ? (k, v) => ctx.onStyleAdd!(defPath, k, v) : undefined}
          onStyleRemove={ctx.onStyleRemove ? (k) => ctx.onStyleRemove!(defPath, k) : undefined}
        />,
      );
      continue;
    }

    // Display node (nodeId, no _layout, no bind)
    if (node.nodeId) {
      const defPath = resolveDefPath(node.nodeId, defPathPrefix, ctx);
      const defEntry = defPath ? ctx.defLookup.get(defPath) : null;
      const label = (defEntry?.item as Item | undefined)?.label
        || (node as { text?: string }).text
        || node.nodeId;
      result.push(
        <DisplayBlock
          key={defPath || node.nodeId}
          itemKey={node.nodeId}
          selectionKey={defPath || node.nodeId}
          label={label}
          widgetHint={node.component !== 'Text' ? node.component : undefined}
          selected={ctx.selectedKey === (defPath || node.nodeId)}
          onSelect={(selectionKey) => ctx.onSelect(selectionKey, 'display')}
        />,
      );
    }
  }

  return result;
}
