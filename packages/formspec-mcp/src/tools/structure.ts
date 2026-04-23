/**
 * Structure tools: field, content, group, place, edit (batch-enabled via items[] array).
 * Plus: page CRUD, update, submit.
 */

import { HelperError } from '@formspec-org/studio-core';
import type { ProjectRegistry } from '../registry.js';
import { wrapCall, wrapBatchCall, resolveProject, errorResponse, formatToolError } from '../errors.js';
import type { BatchItem } from '../batch.js';
import type {
  FieldProps,
  ContentProps,
  GroupProps,
  RepeatProps,
  PlacementOptions,
  ItemChanges,
  MetadataChanges,
} from '@formspec-org/studio-core';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { READ_ONLY, NON_DESTRUCTIVE, DESTRUCTIVE } from '../annotations.js';
import { bracketMutation } from './changeset.js';
import { fieldPropsSchema } from '../tool-schemas.js';

const fieldItemSchema = z.object({
  path: z.string().describe('Item path (e.g., "name", "contact.email", "items[0].amount")'),
  label: z.string(),
  type: z.string().describe('Data type: "string" (single-line text), "text" (multi-line textarea), "integer", "decimal", "boolean", "date", "choice". Also accepts aliases: "number" (-> decimal), "email"/"phone" (-> string + validation), "url" (-> uri), "money"/"currency", "file" (-> attachment), "multichoice", "rating" (-> integer + Rating widget), "slider" (-> decimal + Slider widget). For "date" fields, use initialValue: "=today()" to auto-populate with today\'s date'),
  props: fieldPropsSchema.optional(),
});

const contentItemSchema = z.object({
  path: z.string().describe('Item path (e.g., "intro_heading", "section1.instructions")'),
  body: z.string().describe('Display text'),
  kind: z.enum(['heading', 'paragraph', 'divider', 'banner']).optional().describe('Display kind. Default: paragraph'),
  props: z.object({
    page: z.string().optional().describe('Page ID to place this item on after creation'),
    parentPath: z.string().optional().describe('Parent group path to nest this item under'),
    insertIndex: z.number().optional().describe('Position among siblings (0-based). Omit to append at end.'),
  }).partial().optional(),
});

const groupItemSchema = z.object({
  path: z.string().describe('Item path (e.g., "contact_info", "items")'),
  label: z.string(),
  props: z.object({
    display: z.enum(['stack', 'dataTable']),
    repeat: z.object({
      min: z.number(),
      max: z.number(),
      addLabel: z.string(),
      removeLabel: z.string(),
    }).partial(),
    parentPath: z.string().describe('Parent group path to nest this group under'),
  }).partial().optional(),
});

/**
 * Merge top-level parentPath into props when props.parentPath is absent.
 * Handles the common LLM mistake of passing parentPath at the top level
 * instead of nesting it inside props.
 */
function mergeParentPath<T extends { parentPath?: string }>(
  props: T | undefined,
  parentPath: string | undefined,
): T | undefined {
  if (!parentPath) return props;
  if (props?.parentPath) return props; // explicit props.parentPath wins
  return { ...props, parentPath } as T;
}

// ── Batch-enabled add tools ─────────────────────────────────────────

export function handleField(
  registry: ProjectRegistry,
  projectId: string,
  params: { path: string; label: string; type: string; props?: FieldProps; parentPath?: string },
): ReturnType<typeof wrapCall>;
export function handleField(
  registry: ProjectRegistry,
  projectId: string,
  params: { items: Array<{ path: string; label: string; type: string; props?: FieldProps }> },
): ReturnType<typeof wrapBatchCall>;
export function handleField(
  registry: ProjectRegistry,
  projectId: string,
  params: { path?: string; label?: string; type?: string; props?: FieldProps; parentPath?: string; items?: BatchItem[] },
) {
  if (params.items) {
    const { project, error } = resolveProject(registry, projectId);
    if (error) return error;
    return wrapBatchCall(params.items, (item) => {
      const props = mergeParentPath(item.props as FieldProps | undefined, (item as any).parentPath);
      return project!.addField(
        item.path as string,
        item.label as string,
        item.type as string,
        props,
      );
    });
  }
  const props = mergeParentPath(params.props, params.parentPath);
  return wrapCall(() => {
    const project = registry.getProject(projectId);
    return project.addField(params.path!, params.label!, params.type!, props);
  });
}

export function handleContent(
  registry: ProjectRegistry,
  projectId: string,
  params: { path: string; body: string; kind?: string; props?: ContentProps; parentPath?: string },
): ReturnType<typeof wrapCall>;
export function handleContent(
  registry: ProjectRegistry,
  projectId: string,
  params: { items: Array<{ path: string; body: string; kind?: string; props?: ContentProps }> },
): ReturnType<typeof wrapBatchCall>;
export function handleContent(
  registry: ProjectRegistry,
  projectId: string,
  params: { path?: string; body?: string; kind?: string; props?: ContentProps; parentPath?: string; items?: BatchItem[] },
) {
  if (params.items) {
    const { project, error } = resolveProject(registry, projectId);
    if (error) return error;
    return wrapBatchCall(params.items, (item) => {
      const props = mergeParentPath(item.props as ContentProps | undefined, (item as any).parentPath);
      return project!.addContent(
        item.path as string,
        item.body as string,
        item.kind as 'heading' | 'paragraph' | 'banner' | 'divider' | undefined,
        props,
      );
    });
  }
  const props = mergeParentPath(params.props, params.parentPath);
  return wrapCall(() => {
    const project = registry.getProject(projectId);
    return project.addContent(
      params.path!,
      params.body!,
      params.kind as 'heading' | 'paragraph' | 'banner' | 'divider' | undefined,
      props,
    );
  });
}

export function handleGroup(
  registry: ProjectRegistry,
  projectId: string,
  params: { path: string; label: string; props?: GroupProps & { repeat?: RepeatProps }; parentPath?: string },
): ReturnType<typeof wrapCall>;
export function handleGroup(
  registry: ProjectRegistry,
  projectId: string,
  params: { items: Array<{ path: string; label: string; props?: GroupProps & { repeat?: RepeatProps } }> },
): ReturnType<typeof wrapBatchCall>;
export function handleGroup(
  registry: ProjectRegistry,
  projectId: string,
  params: { path?: string; label?: string; props?: GroupProps & { repeat?: RepeatProps }; parentPath?: string; items?: BatchItem[] },
) {
  if (params.items) {
    const { project, error } = resolveProject(registry, projectId);
    if (error) return error;
    return wrapBatchCall(params.items, (item) => {
      const merged = mergeParentPath(
        item.props as (GroupProps & { repeat?: RepeatProps }) | undefined,
        (item as any).parentPath,
      );
      const { repeat, ...groupProps } = merged ?? {};
      const result = project!.addGroup(
        item.path as string,
        item.label as string,
        Object.keys(groupProps).length ? groupProps as GroupProps : undefined,
      );
      if (repeat) {
        project!.makeRepeatable(result.affectedPaths[0], repeat);
        appendRepeatSummary(result, repeat);
      }
      return result;
    });
  }
  return wrapCall(() => {
    const project = registry.getProject(projectId);
    const merged = mergeParentPath(params.props, params.parentPath);
    const { repeat, ...groupProps } = merged ?? {};
    const result = project.addGroup(
      params.path!,
      params.label!,
      Object.keys(groupProps).length ? groupProps as GroupProps : undefined,
    );
    if (repeat) {
      project.makeRepeatable(result.affectedPaths[0], repeat);
      appendRepeatSummary(result, repeat);
    }
    return result;
  });
}

/** Attach repeat summary to a group creation HelperResult (UX-4c). */
function appendRepeatSummary(result: unknown, repeat: RepeatProps): void {
  (result as any).repeat = repeat;
}

// ── Submit button (folded into content conceptually, separate handler) ──

export function handleSubmitButton(
  registry: ProjectRegistry,
  projectId: string,
  label?: string,
  pageId?: string,
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);
    return project.addSubmitButton(label, pageId);
  });
}

// ── Page CRUD ───────────────────────────────────────────────────────

export function handlePage(
  registry: ProjectRegistry,
  projectId: string,
  action: 'add' | 'remove' | 'move' | 'list',
  params: { title?: string; description?: string; page_id?: string; direction?: 'up' | 'down' },
) {
  if (action === 'list') {
    return wrapCall(() => {
      const project = registry.getProject(projectId);
      return { pages: project.listPages() };
    });
  }
  return wrapCall(() => {
    const project = registry.getProject(projectId);
    switch (action) {
      case 'add':
        return project.addPage(params.title!, params.description, params.page_id);
      case 'remove':
        return project.removePage(params.page_id!);
      case 'move':
        return project.reorderPage(params.page_id!, params.direction!);
    }
  });
}

// ── Placement (batch-enabled) ────────────────────────────────────────

export function handlePlace(
  registry: ProjectRegistry,
  projectId: string,
  params: { action: 'place' | 'unplace'; target: string; page_id: string; options?: PlacementOptions },
): ReturnType<typeof wrapCall>;
export function handlePlace(
  registry: ProjectRegistry,
  projectId: string,
  params: { items: Array<{ action: 'place' | 'unplace'; target: string; page_id: string; options?: PlacementOptions }> },
): ReturnType<typeof wrapBatchCall>;
export function handlePlace(
  registry: ProjectRegistry,
  projectId: string,
  params: {
    action?: 'place' | 'unplace';
    target?: string;
    page_id?: string;
    options?: PlacementOptions;
    items?: BatchItem[];
  },
) {
  if (params.items) {
    const { project, error } = resolveProject(registry, projectId);
    if (error) return error;
    return wrapBatchCall(params.items, (item) => {
      const action = item.action as 'place' | 'unplace';
      const target = item.target as string;
      const pageId = item.page_id as string;
      if (action === 'place') {
        return project!.placeOnPage(target, pageId, item.options as PlacementOptions | undefined);
      }
      return project!.unplaceFromPage(target, pageId);
    });
  }
  return wrapCall(() => {
    const project = registry.getProject(projectId);
    if (params.action === 'place') {
      return project.placeOnPage(params.target!, params.page_id!, params.options);
    }
    return project.unplaceFromPage(params.target!, params.page_id!);
  });
}

// ── formspec_update: change properties on existing items or metadata ──

/** Expand nested `repeat` shape to the flat keys updateItem expects. */
function normalizeItemChanges(changes: Record<string, unknown>): ItemChanges {
  const { repeat, ...rest } = changes as { repeat?: { min?: number; max?: number }; [k: string]: unknown };
  if (!repeat) return rest as ItemChanges;

  const expanded: Record<string, unknown> = { ...rest, repeatable: true };
  if (repeat.min !== undefined) expanded.minRepeat = repeat.min;
  if (repeat.max !== undefined) expanded.maxRepeat = repeat.max;
  return expanded as ItemChanges;
}

export function handleUpdate(
  registry: ProjectRegistry,
  projectId: string,
  target: 'item' | 'metadata',
  params: { path?: string; changes?: ItemChanges | MetadataChanges; items?: Array<{ path: string; changes: ItemChanges }> },
) {
  // Batch mode: items[] array for target='item' only
  if (params.items) {
    if (target !== 'item') {
      return errorResponse(formatToolError(
        'INVALID_BATCH',
        "Batch mode (items[]) is only supported for target='item', not metadata.",
      ));
    }
    const { project, error } = resolveProject(registry, projectId);
    if (error) return error;
    return wrapBatchCall(params.items, (item) => {
      const normalized = normalizeItemChanges(item.changes as Record<string, unknown>);
      return project!.updateItem(item.path as string, normalized);
    });
  }

  return wrapCall(() => {
    const project = registry.getProject(projectId);
    if (target === 'metadata') {
      return project.setMetadata(params.changes as MetadataChanges);
    }
    const normalized = normalizeItemChanges(params.changes as Record<string, unknown>);
    return project.updateItem(params.path!, normalized);
  });
}

// ── formspec_edit: structural mutations ──────────────────────────────

/** Error response when action is missing in non-batch edit mode */
export function editMissingAction() {
  return errorResponse(formatToolError(
    'MISSING_ACTION',
    'action is required for single-item mode. Provide action or use items[] for batch mode with per-item action overrides.',
  ));
}

type EditAction = 'remove' | 'move' | 'rename' | 'copy';

type MovePosition = 'inside' | 'after' | 'before';

interface EditParams {
  path: string;
  target_path?: string;
  index?: number;
  new_key?: string;
  deep?: boolean;
  position?: MovePosition;
}

/**
 * Resolve sibling-relative positioning into (parentPath, index) for moveItem.
 *
 * 'inside' (default): target_path is the parent container.
 * 'before'/'after': target_path is a sibling. We find its parent and index,
 * then return the parent path and the computed insertion index.
 */
function resolveMovePosition(
  project: import('@formspec-org/studio-core').Project,
  sourcePath: string,
  targetPath: string | undefined,
  position: MovePosition | undefined,
  explicitIndex: number | undefined,
): { parentPath?: string; index?: number } {
  if (!position || position === 'inside') {
    return { parentPath: targetPath, index: explicitIndex };
  }

  if (!targetPath) {
    throw new HelperError('MISSING_PARAM', 'target_path is required when position is "before" or "after"');
  }

  // Parse target_path to find parent and leaf key
  const segments = targetPath.split('.');
  const leafKey = segments.pop()!;
  const parentPath = segments.length > 0 ? segments.join('.') : undefined;

  // Find the sibling's index among its parent's children
  const parentItem = parentPath ? project.itemAt(parentPath) : null;
  const children = parentItem
    ? (parentItem.children ?? [])
    : (project.definition.items ?? []);

  const siblingIndex = children.findIndex((c: any) => c.key === leafKey);
  if (siblingIndex === -1) {
    throw new HelperError('PATH_NOT_FOUND', `Target sibling not found: ${targetPath}`);
  }

  // For 'before': insert at sibling's index. For 'after': insert after it.
  // Account for the source item being removed from the same parent first:
  // if the source is in the same parent AND before the target, the target index
  // shifts down by 1 after removal.
  const sourceSegments = sourcePath.split('.');
  const sourceLeaf = sourceSegments.pop()!;
  const sourceParent = sourceSegments.length > 0 ? sourceSegments.join('.') : undefined;
  const sameParent = sourceParent === parentPath;

  let sourceIndex = -1;
  if (sameParent) {
    sourceIndex = children.findIndex((c: any) => c.key === sourceLeaf);
  }

  let insertIndex: number;
  if (position === 'before') {
    insertIndex = siblingIndex;
    // If source is in same parent and before the target, removal shifts target down
    if (sameParent && sourceIndex >= 0 && sourceIndex < siblingIndex) {
      insertIndex -= 1;
    }
  } else {
    // 'after'
    insertIndex = siblingIndex + 1;
    // If source is in same parent and before or at the sibling, removal shifts target down
    if (sameParent && sourceIndex >= 0 && sourceIndex < siblingIndex) {
      insertIndex -= 1;
    }
  }

  return { parentPath, index: insertIndex };
}

export function handleEdit(
  registry: ProjectRegistry,
  projectId: string,
  action: EditAction,
  params: EditParams,
): ReturnType<typeof wrapCall>;
export function handleEdit(
  registry: ProjectRegistry,
  projectId: string,
  action: EditAction,
  params: { items: Array<{ action?: EditAction } & Partial<EditParams>> },
): ReturnType<typeof wrapBatchCall>;
export function handleEdit(
  registry: ProjectRegistry,
  projectId: string,
  action: EditAction,
  params: Partial<EditParams> & { items?: BatchItem[] },
) {
  if (params.items) {
    const { project, error } = resolveProject(registry, projectId);
    if (error) return error;
    return wrapBatchCall(params.items, (item) => {
      const itemAction = (item.action as EditAction) ?? action;
      const path = item.path as string;
      switch (itemAction) {
        case 'remove':
          return project!.removeItem(path);
        case 'move': {
          const pos = resolveMovePosition(
            project!, path, item.target_path as string | undefined,
            (item as any).position as MovePosition | undefined,
            item.index as number | undefined,
          );
          return project!.moveItem(path, pos.parentPath, pos.index);
        }
        case 'rename':
          return project!.renameItem(path, item.new_key as string);
        case 'copy':
          return project!.copyItem(path, item.deep as boolean | undefined, item.target_path as string | undefined);
        default:
          throw new HelperError('INVALID_ACTION', `Unknown edit action: ${itemAction}`);
      }
    });
  }
  return wrapCall(() => {
    const project = registry.getProject(projectId);
    switch (action) {
      case 'remove':
        return project.removeItem(params.path!);
      case 'move': {
        const pos = resolveMovePosition(
          project, params.path!, params.target_path,
          params.position, params.index,
        );
        return project.moveItem(params.path!, pos.parentPath, pos.index);
      }
      case 'rename':
        return project.renameItem(params.path!, params.new_key!);
      case 'copy':
        return project.copyItem(params.path!, params.deep, params.target_path);
      default:
        throw new HelperError('INVALID_ACTION', `Unknown edit action: ${action}`);
    }
  });
}

export function registerStructureTools(server: McpServer, registry: ProjectRegistry): void {
  server.registerTool('formspec_field', {
    title: 'Add Field',
    description: 'Add NEW data-collecting fields to the form. Supports single item or batch via items[] array. To modify an existing field\'s properties, use formspec_update instead.\n\nPath conventions:\n- Authoring paths use dot notation: "contact.email" (nests under group "contact")\n- FEL expressions use $-prefix: "$contact.email"\n- Runtime/preview uses indexed paths for repeating groups: "items[0].amount"\n\nParent context: Use ONE of these — combining them causes double-nesting:\n- Dot notation in path: "contact.email" nests under group "contact"\n- parentPath (top-level or in props): sets an explicit parent group\n- props.page: auto-resolves to the page\'s primary group',
    inputSchema: {
      project_id: z.string(),
      path: z.string().optional().describe('Item path (e.g., "name", "contact.email", "items[0].amount")'),
      label: z.string().optional(),
      type: z.string().optional().describe('Data type: "string" (single-line text), "text" (multi-line textarea), "integer", "decimal", "boolean", "date", "choice". Also accepts aliases: "number" (-> decimal), "email"/"phone" (-> string + validation), "url" (-> uri), "money"/"currency", "file" (-> attachment), "multichoice", "rating" (-> integer + Rating widget), "slider" (-> decimal + Slider widget). For "date" fields, use initialValue: "=today()" to auto-populate with today\'s date'),
      parentPath: z.string().optional().describe('Parent group path to nest this field under (convenience alias — also accepted inside props)'),
      props: fieldPropsSchema.optional(),
      items: z.array(fieldItemSchema).optional().describe('Batch: array of field definitions to add'),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, path, label, type, parentPath, props, items }) => {
    return bracketMutation(registry, project_id, 'formspec_field', () => {
      if (items) return handleField(registry, project_id, { items });
      return handleField(registry, project_id, { path: path!, label: label!, type: type!, parentPath, props });
    });
  });

  server.registerTool('formspec_content', {
    title: 'Add Content',
    description: 'Add non-data display elements to the form: headings, paragraphs, dividers, or banners. Supports batch via items[] array.\n\nParent context: Use ONE of these — combining them causes double-nesting:\n- Dot notation in path: "section.heading" nests under group "section"\n- parentPath (top-level or in props): sets an explicit parent group\n- props.page: auto-resolves to the page\'s primary group',
    inputSchema: {
      project_id: z.string(),
      path: z.string().optional(),
      body: z.string().optional().describe('Display text'),
      kind: z.enum(['heading', 'paragraph', 'divider', 'banner']).optional(),
      parentPath: z.string().optional().describe('Parent group path to nest this content under (convenience alias — also accepted inside props)'),
      props: contentItemSchema.shape.props,
      items: z.array(contentItemSchema).optional(),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, path, body, kind, parentPath, props, items }) => {
    return bracketMutation(registry, project_id, 'formspec_content', () => {
      if (items) return handleContent(registry, project_id, { items });
      return handleContent(registry, project_id, { path: path!, body: body!, kind, parentPath, props });
    });
  });

  server.registerTool('formspec_group', {
    title: 'Add Group',
    description: 'Add a logical group container for related items. Supports batch via items[] array.\n\nParent context: Use ONE of these — combining them causes double-nesting:\n- Dot notation in path: "parent.child_group" nests under "parent"\n- props.parentPath: sets an explicit parent group\n\nGroups do not have a page prop — use formspec_place to assign a group to a page after creation.',
    inputSchema: {
      project_id: z.string(),
      path: z.string().optional(),
      label: z.string().optional(),
      parentPath: z.string().optional().describe('Parent group path to nest this group under (convenience alias — also accepted inside props)'),
      props: groupItemSchema.shape.props.optional(),
      items: z.array(groupItemSchema).optional(),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, path, label, parentPath, props, items }) => {
    return bracketMutation(registry, project_id, 'formspec_group', () => {
      if (items) return handleGroup(registry, project_id, { items });
      return handleGroup(registry, project_id, { path: path!, label: label!, parentPath, props });
    });
  });

  server.registerTool('formspec_submit_button', {
    title: 'Add Submit Button',
    description: 'Add a submit button to the form or a specific page.',
    inputSchema: {
      project_id: z.string(),
      label: z.string().optional(),
      page_id: z.string().optional(),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, label, page_id }) => {
    return bracketMutation(registry, project_id, 'formspec_submit_button', () =>
      handleSubmitButton(registry, project_id, label, page_id),
    );
  });

  server.registerTool('formspec_update', {
    title: 'Update',
    description: 'Modify properties on EXISTING items or form-level metadata. target="item" changes an item\'s label, description, choices, etc. target="metadata" changes form-level title, description, version, etc. Supports batch via items[] array (target="item" only).',
    inputSchema: {
      project_id: z.string(),
      target: z.enum(['item', 'metadata']),
      path: z.string().optional(),
      changes: z.record(z.string(), z.unknown()).optional(),
      items: z.array(z.object({
        path: z.string().describe('Item path to update'),
        changes: z.record(z.string(), z.unknown()).describe('Properties to change'),
      })).optional().describe('Batch: array of item updates (target="item" only)'),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, target, path, changes, items }) => {
    return bracketMutation(registry, project_id, 'formspec_update', () =>
      handleUpdate(registry, project_id, target, { path, changes, items }),
    );
  });

  server.registerTool('formspec_edit', {
    title: 'Edit Structure',
    description: 'Structural tree mutations: remove, move, rename, or copy items. Action "remove" is DESTRUCTIVE.\n\nFor move: position controls how target_path is interpreted:\n- "inside" (default): target_path is the parent container\n- "before": target_path is a sibling; item is placed before it\n- "after": target_path is a sibling; item is placed after it',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['remove', 'move', 'rename', 'copy']).optional(),
      path: z.string().optional(),
      target_path: z.string().optional().describe('For move: parent container (position="inside") or sibling reference (position="before"/"after"). For copy: target parent group.'),
      position: z.enum(['inside', 'after', 'before']).optional().describe('How to interpret target_path for move. Default: "inside"'),
      index: z.number().optional(),
      new_key: z.string().optional(),
      deep: z.boolean().optional(),
      items: z.array(z.object({
        action: z.enum(['remove', 'move', 'rename', 'copy']).optional(),
        path: z.string(),
        target_path: z.string().optional(),
        position: z.enum(['inside', 'after', 'before']).optional(),
        index: z.number().optional(),
        new_key: z.string().optional(),
        deep: z.boolean().optional(),
      })).optional(),
    },
    annotations: DESTRUCTIVE,
  }, async ({ project_id, action, path, target_path, position, index, new_key, deep, items }) => {
    return bracketMutation(registry, project_id, 'formspec_edit', () => {
      if (items) return handleEdit(registry, project_id, action ?? 'remove', { items });
      if (!action) return editMissingAction();
      return handleEdit(registry, project_id, action, { path: path!, target_path, position, index, new_key, deep });
    });
  });

  server.registerTool('formspec_page', {
    title: 'Page',
    description: 'Manage form pages: add, remove, reorder, or list. After adding a page, assign items to it using props.page on formspec_field/formspec_content, or via formspec_place. For a review/summary page, use the Summary component (S6.12) via formspec_component.',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['add', 'remove', 'move', 'list']),
      title: z.string().optional(),
      description: z.string().optional(),
      page_id: z.string().optional(),
      direction: z.enum(['up', 'down']).optional(),
    },
    annotations: DESTRUCTIVE,
  }, async ({ project_id, action, title, description, page_id, direction }) => {
    return bracketMutation(registry, project_id, 'formspec_page', () =>
      handlePage(registry, project_id, action, { title, description, page_id, direction }),
    );
  });

  server.registerTool('formspec_place', {
    title: 'Place on Page',
    description: 'Assign items to pages or change column spans. Supports batch via items[] array.',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['place', 'unplace']).optional(),
      target: z.string().optional(),
      page_id: z.string().optional(),
      options: z.object({ span: z.number() }).optional(),
      items: z.array(z.object({
        action: z.enum(['place', 'unplace']),
        target: z.string(),
        page_id: z.string(),
        options: z.object({ span: z.number() }).optional(),
      })).optional(),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, action, target, page_id, options, items }) => {
    return bracketMutation(registry, project_id, 'formspec_place', () => {
      if (items) return handlePlace(registry, project_id, { items });
      return handlePlace(registry, project_id, { action: action!, target: target!, page_id: page_id!, options });
    });
  });
}
