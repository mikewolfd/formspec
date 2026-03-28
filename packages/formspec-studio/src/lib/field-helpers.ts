/** @filedesc Re-export wrapper for authoring helpers from @formspec-org/studio-core. */

export {
  bindsFor,
  buildBatchMoveCommands,
  buildBindKeyMap,
  buildDefLookup,
  compatibleWidgets,
  componentForWidgetHint,
  computeUnassignedItems,
  countDefinitionFields,
  dataTypeInfo,
  findComponentNodeById,
  flatItems,
  flattenComponentTree,
  getFieldTypeCatalog,
  humanizeFEL,
  isLayoutId,
  nodeIdFromLayoutId,
  nodeRefFor,
  normalizeBindEntries,
  normalizeBindsView,
  propertyHelp,
  pruneDescendants,
  sanitizeIdentifier,
  shapesFor,
  sortForBatchDelete,
  widgetHintForComponent,
} from '../../../formspec-studio-core/src/authoring-helpers';

export type {
  DataTypeDisplay,
  DefLookupEntry,
  FieldTypeCatalogEntry,
  FlatEntry,
  FlatItem,
  NormalizedBindEntry,
  UnassignedItem,
} from '../../../formspec-studio-core/src/authoring-helpers';
