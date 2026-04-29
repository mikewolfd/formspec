/** @filedesc Recursive Layout canvas renderer for authored Page sections, layout containers, and bound nodes. */
import React, { type Key, type ReactNode } from 'react';
import type { CompNode, ContainerLayoutProps, DefLookupEntry, FormItem } from '@formspec-org/studio-core';
import { LayoutPageSection } from './LayoutPageSection';
import { LayoutContainer } from './LayoutContainer';
import { FieldBlock, type LayoutContext } from './FieldBlock';
import { DisplayBlock } from './DisplayBlock';
import {
  resolveDefPathMaps,
  parseColSpan,
  parseRowSpan,
  buildContainerLayoutProps,
} from './layout-tree-utils';

type DisplayNode = CompNode & {
  label?: string;
  text?: string;
};

/** Pointer / keyboard events from layout row clicks — drives modifier multi-select in LayoutCanvas. */
export type LayoutRowSelectEvent = React.MouseEvent<Element> | React.KeyboardEvent<Element>;

export interface LayoutRenderContext {
  defLookup: Map<string, DefLookupEntry>;
  bindKeyMap: Map<string, string>;
  isSelected: (selectionKey: string) => boolean;
  /** Primary layout selection key — inline toolbars stay on this row when multiple are selected. */
  layoutPrimaryKey: string | null;
  onSelect: (
    ev: LayoutRowSelectEvent | null,
    key: string,
    type: 'field' | 'group' | 'display' | 'layout',
  ) => void;
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  /** Write a property to a component node identified by selectionKey. */
  onSetNodeProp?: (selectionKey: string, key: string, value: unknown) => void;
  /** Unwrap a layout node (remove container, keep children). */
  onUnwrapNode?: (selectionKey: string) => void;
  /** Remove a layout node from the tree. */
  onRemoveNode?: (selectionKey: string) => void;
  /** Add a style override to a component node. */
  onSetStyle?: (selectionKey: string, key: string, value: string) => void;
  /** Remove a style override from a component node. */
  onStyleRemove?: (selectionKey: string, key: string) => void;
  /** Resize a node's grid column span. */
  onResizeColSpan?: (selectionKey: string, newSpan: number) => void;
  /** Resize a node's grid row span. */
  onResizeRowSpan?: (selectionKey: string, newSpan: number) => void;
  /**
   * Persist display item body copy for Tier 1 definition `display` items.
   */
  onCommitDisplayLabel?: (defPath: string, text: string | null) => void;
  /** Rename key + sync label on a definition item (field or display), then re-select `nextPath`. */
  onRenameDefinitionItem?: (
    defPath: string,
    nextKey: string,
    nextLabel: string | null,
    kind: 'field' | 'display',
  ) => void;
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
  definitionItemPath?: string,
): string | null {
  return resolveDefPathMaps(key, defPathPrefix, ctx.defLookup, ctx.bindKeyMap, definitionItemPath);
}

/** Depth-first list of layout row selection keys (same order as `renderLayoutTree`). Used for Shift+click range select. */
export function collectLayoutFlatSelectionKeys(
  nodes: CompNode[],
  defLookup: Map<string, DefLookupEntry>,
  bindKeyMap: Map<string, string>,
  activePageId: string | null,
  defPathPrefix: string,
  pageSectionActive = false,
): string[] {
  const keys: string[] = [];

  for (const node of nodes) {
    if (node._layout && node.component === 'Page') {
      const pageId = node.nodeId ?? 'page';
      const activePageSection = activePageId == null || activePageId === pageId;
      if (node.children) {
        keys.push(
          ...collectLayoutFlatSelectionKeys(
            node.children,
            defLookup,
            bindKeyMap,
            activePageId,
            defPathPrefix,
            activePageSection,
          ),
        );
      }
      continue;
    }

    if (node._layout && (node.component === 'Heading' || node.component === 'Divider')) {
      if (!node.nodeId) continue;
      keys.push(`__node:${node.nodeId}`);
      continue;
    }

    if (node._layout) {
      if (!node.nodeId) continue;
      keys.push(`__node:${node.nodeId}`);
      if (node.children) {
        keys.push(
          ...collectLayoutFlatSelectionKeys(
            node.children,
            defLookup,
            bindKeyMap,
            activePageId,
            defPathPrefix,
            pageSectionActive,
          ),
        );
      }
      continue;
    }

    if (node.bind) {
      const defPath = resolveDefPathMaps(
        node.bind,
        defPathPrefix,
        defLookup,
        bindKeyMap,
        node.definitionItemPath,
      );
      const defEntry = defPath ? defLookup.get(defPath) : null;
      if (!defPath || !defEntry) continue;
      const item = defEntry.item;
      if (item.type === 'group') {
        keys.push(defPath);
        if (node.children) {
          keys.push(
            ...collectLayoutFlatSelectionKeys(
              node.children,
              defLookup,
              bindKeyMap,
              activePageId,
              defPath,
              pageSectionActive,
            ),
          );
        }
        continue;
      }
      keys.push(defPath);
      continue;
    }

    if (node.nodeId) {
      const defPath = resolveDefPathMaps(
        node.nodeId,
        defPathPrefix,
        defLookup,
        bindKeyMap,
        node.definitionItemPath,
      );
      const displaySelKey = defPath || node.nodeId;
      keys.push(displaySelKey);
    }
  }

  return keys;
}

function nodePropsRecord(node: CompNode): Record<string, unknown> {
  return node as unknown as Record<string, unknown>;
}

/** Render a LayoutContainer with shared props. */
function renderContainer(
  key: Key,
  node: CompNode,
  nodeType: 'layout' | 'group',
  selectionKey: string,
  ctx: LayoutRenderContext,
  children: React.ReactNode,
  layoutProps: ContainerLayoutProps,
  pageSectionActive: boolean,
  sortableGroupId: string,
  sortableIndex: number,
  extraProps?: Partial<{
    bind: string;
    bindPath: string;
    nodeId: string;
  }>,
) {
  return (
    <LayoutContainer
      key={key}
      component={node.component}
      nodeType={nodeType}
      bind={extraProps?.bind}
      bindPath={extraProps?.bindPath}
      nodeId={extraProps?.nodeId}
      selectionKey={selectionKey}
      selected={ctx.isSelected(selectionKey)}
      onSelect={(e) =>
        ctx.onSelect(e, selectionKey, nodeType === 'layout' ? 'layout' : 'group')}
      layoutPrimaryKey={ctx.layoutPrimaryKey}
      layoutProps={layoutProps}
      nodeProps={nodePropsRecord(node)}
      onSetProp={ctx.onSetNodeProp ? (k, v) => ctx.onSetNodeProp!(selectionKey, k, v) : undefined}
      onSetStyle={ctx.onSetStyle ? (k, v) => ctx.onSetStyle!(selectionKey, k, v) : undefined}
      onUnwrap={ctx.onUnwrapNode ? () => ctx.onUnwrapNode!(selectionKey) : undefined}
      onRemove={ctx.onRemoveNode ? () => ctx.onRemoveNode!(selectionKey) : undefined}
      onStyleRemove={ctx.onStyleRemove ? (k) => ctx.onStyleRemove!(selectionKey, k) : undefined}
      pageSectionActive={pageSectionActive}
      sortableGroup={sortableGroupId}
      sortableIndex={sortableIndex}
    >
      {children}
    </LayoutContainer>
  );
}

export function renderLayoutTree(
  nodes: CompNode[],
  ctx: LayoutRenderContext,
  defPathPrefix: string,
  parentCtx: ParentLayoutContext = ROOT_CONTEXT,
  containerDepth = 0,
  pageSectionActive = false,
  sortableGroupId = 'root',
): ReactNode[] {
  const result: ReactNode[] = [];
  let siblingSortIndex = 0;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    
    // Authored Page node
    if (node._layout && node.component === 'Page') {
      const pageId = node.nodeId ?? 'page';
      const activePageSection = ctx.activePageId == null || ctx.activePageId === pageId;
      const children = node.children
        ? renderLayoutTree(node.children, ctx, defPathPrefix, ROOT_CONTEXT, containerDepth, activePageSection, node.nodeId ?? pageId)
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

    // Tier 3 display-only nodes (Heading, Divider)
    if (node._layout && (node.component === 'Heading' || node.component === 'Divider')) {
      if (!node.nodeId) continue;
      const displayNode = node as DisplayNode;
      const label = (node.component === 'Divider' ? displayNode.label : displayNode.text) || node.component;
      const nodeSelKey = `__node:${node.nodeId!}`;
      result.push(
        <DisplayBlock
          key={`node:${node.nodeId}`}
          itemKey={node.nodeId!}
          selectionKey={nodeSelKey}
          label={label}
          widgetHint={node.component}
          selected={ctx.isSelected(nodeSelKey)}
          layoutPrimaryKey={ctx.layoutPrimaryKey}
          onSelect={(e, sk) => ctx.onSelect(e, sk, 'layout')}
          layoutContext={parentCtx.parentContainerType ? {
            parentContainerType: parentCtx.parentContainerType,
            parentGridColumns: parentCtx.parentGridColumns,
            currentColSpan: parseColSpan(node.style?.gridColumn),
            currentRowSpan: parseRowSpan(node.style?.gridRow),
          } : undefined}
          nodeStyle={node.style as Record<string, unknown> | undefined}
          onResizeColSpan={ctx.onResizeColSpan ? (n) => ctx.onResizeColSpan!(nodeSelKey, n) : undefined}
          onResizeRowSpan={ctx.onResizeRowSpan ? (n) => ctx.onResizeRowSpan!(nodeSelKey, n) : undefined}
          sortableGroup={sortableGroupId}
          sortableIndex={siblingSortIndex++}
          treeDragNodeRef={{ nodeId: node.nodeId! }}
        />,
      );
      continue;
    }

    // Layout container
    if (node._layout) {
      if (!node.nodeId) continue;
      const innerSortGroup = node.nodeId!;
      const children = node.children
        ? renderLayoutTree(node.children, ctx, defPathPrefix, {
            parentContainerType: node.component.toLowerCase(),
            parentGridColumns: (typeof node.columns === 'number' ? node.columns : undefined) ?? 2,
          }, containerDepth + 1, pageSectionActive, innerSortGroup)
        : null;
      const nodeSelKey = `__node:${node.nodeId!}`;
      result.push(renderContainer(`node:${node.nodeId}`, node, 'layout', nodeSelKey, ctx, children, buildContainerLayoutProps(node), pageSectionActive, sortableGroupId, siblingSortIndex++, { nodeId: node.nodeId! }));
      continue;
    }

    // Bound node
    if (node.bind) {
      const defPath = resolveDefPath(node.bind, defPathPrefix, ctx, node.definitionItemPath);
      const defEntry = defPath ? ctx.defLookup.get(defPath) : null;
      if (!defPath || !defEntry) continue;
      const item = defEntry.item;

      if (item.type === 'group') {
        const innerSortGroup = node.nodeId ? node.nodeId : `bind:${node.bind}`;
        const children = node.children
          ? renderLayoutTree(node.children, ctx, defPath, {
              parentContainerType: node.component.toLowerCase(),
              parentGridColumns: (typeof node.columns === 'number' ? node.columns : undefined) ?? 2,
            }, containerDepth + 1, pageSectionActive, innerSortGroup)
          : null;
        result.push(renderContainer(defPath, node, 'group', defPath, ctx, children, buildContainerLayoutProps(node), pageSectionActive, sortableGroupId, siblingSortIndex++, { bind: item.key, bindPath: defPath, ...(node.nodeId ? { nodeId: node.nodeId } : {}) }));
        continue;
      }

      const itemRec = item as unknown as Record<string, unknown>;
      result.push(
        <FieldBlock
          key={defPath}
          itemKey={item.key}
          bindPath={defPath}
          selectionKey={defPath}
          label={item.label}
          dataType={item.dataType}
          itemType={item.type}
          selected={ctx.isSelected(defPath)}
          layoutPrimaryKey={ctx.layoutPrimaryKey}
          onSelect={(e, sk) => ctx.onSelect(e, sk, 'field')}
          groupPathPrefix={defPath.includes('.') ? `${defPath.slice(0, defPath.lastIndexOf('.'))}.` : null}
          description={typeof itemRec.description === 'string' ? itemRec.description : null}
          hint={typeof itemRec.hint === 'string' ? itemRec.hint : null}
          onRenameDefinitionItem={ctx.onRenameDefinitionItem ? (nextKey, nextLabel) => ctx.onRenameDefinitionItem!(defPath, nextKey, nextLabel, 'field') : undefined}
          layoutContext={parentCtx.parentContainerType ? {
            parentContainerType: parentCtx.parentContainerType,
            parentGridColumns: parentCtx.parentGridColumns,
            currentColSpan: parseColSpan(node.style?.gridColumn),
            currentRowSpan: parseRowSpan(node.style?.gridRow),
          } : undefined}
          nodeStyle={node.style}
          nodeProps={nodePropsRecord(node)}
          onSetProp={ctx.onSetNodeProp ? (k, v) => ctx.onSetNodeProp!(defPath, k, v) : undefined}
          onSetStyle={ctx.onSetStyle ? (k, v) => ctx.onSetStyle!(defPath, k, v) : undefined}
          onSetColumnSpan={ctx.onResizeColSpan ? (n) => ctx.onResizeColSpan!(defPath, n) : undefined}
          onResizeColSpan={ctx.onResizeColSpan ? (n) => ctx.onResizeColSpan!(defPath, n) : undefined}
          onResizeRowSpan={ctx.onResizeRowSpan ? (n) => ctx.onResizeRowSpan!(defPath, n) : undefined}
          onRemove={ctx.onRemoveNode ? () => ctx.onRemoveNode!(defPath) : undefined}
          onStyleRemove={ctx.onStyleRemove ? (k) => ctx.onStyleRemove!(defPath, k) : undefined}
          sortableGroup={sortableGroupId}
          sortableIndex={siblingSortIndex++}
        />
      );
      continue;
    }

    // Display node (nodeId, no _layout, no bind)
    if (node.nodeId) {
      const defPath = resolveDefPath(node.nodeId, defPathPrefix, ctx, node.definitionItemPath);
      const defEntry = defPath ? ctx.defLookup.get(defPath) : null;
      const displayNode = node as DisplayNode;
      const label = defEntry?.item.label || displayNode.text || node.nodeId;
      const defItem: FormItem | undefined = defEntry?.item;
      const isDefinitionDisplay = defItem?.type === 'display' && !!defPath;
      const defRec = defItem ? (defItem as unknown as Record<string, unknown>) : null;
      const displaySelKey = defPath || node.nodeId;
      
      result.push(
        <DisplayBlock
          key={displaySelKey}
          itemKey={node.nodeId}
          selectionKey={displaySelKey}
          label={label}
          widgetHint={node.component !== 'Text' ? node.component : undefined}
          selected={ctx.isSelected(displaySelKey)}
          layoutPrimaryKey={ctx.layoutPrimaryKey}
          onSelect={(e, sk) => ctx.onSelect(e, sk, 'display')}
          groupPathPrefix={defPath && defPath.includes('.') ? `${defPath.slice(0, defPath.lastIndexOf('.'))}.` : null}
          description={defRec && typeof defRec.description === 'string' ? defRec.description : null}
          hint={defRec && typeof defRec.hint === 'string' ? defRec.hint : null}
          onRenameDefinitionItem={isDefinitionDisplay && ctx.onRenameDefinitionItem && defPath ? (nextKey, nextLabel) => ctx.onRenameDefinitionItem!(defPath, nextKey, nextLabel, 'display') : undefined}
          definitionCopyPath={isDefinitionDisplay && defPath ? defPath : null}
          layoutContext={parentCtx.parentContainerType ? {
            parentContainerType: parentCtx.parentContainerType,
            parentGridColumns: parentCtx.parentGridColumns,
            currentColSpan: parseColSpan(node.style?.gridColumn),
            currentRowSpan: parseRowSpan(node.style?.gridRow),
          } : undefined}
          nodeStyle={node.style as Record<string, unknown> | undefined}
          onResizeColSpan={ctx.onResizeColSpan ? (n) => ctx.onResizeColSpan!(displaySelKey, n) : undefined}
          onResizeRowSpan={ctx.onResizeRowSpan ? (n) => ctx.onResizeRowSpan!(displaySelKey, n) : undefined}
          onCommitDisplayLabel={isDefinitionDisplay && ctx.onCommitDisplayLabel ? (text) => ctx.onCommitDisplayLabel!(defPath!, text) : undefined}
          sortableGroup={sortableGroupId}
          sortableIndex={siblingSortIndex++}
          treeDragNodeRef={{ nodeId: node.nodeId }}
        />
      );
    }
  }

  return result;
}
