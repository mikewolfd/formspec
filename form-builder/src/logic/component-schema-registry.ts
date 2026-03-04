import componentSchema from '../../../schemas/component.schema.json';

const BASE_PROPS = new Set([
  'component', 'bind', 'when', 'responsive', 'style', 'accessibility', 'cssClass', 'children',
]);

export interface SchemaPropertyDef {
  name: string;
  type: string;
  enum?: string[];
  description?: string;
  minimum?: number;
  maximum?: number;
  default?: unknown;
}

interface ComponentSchemaDef {
  properties: Record<string, Record<string, unknown>>;
  required?: string[];
}

const schemaCache = new Map<string, ComponentSchemaDef | null>();

export function getComponentSchema(componentType: string): ComponentSchemaDef | null {
  if (schemaCache.has(componentType)) return schemaCache.get(componentType)!;

  const defs = (componentSchema as Record<string, unknown>).$defs as Record<string, Record<string, unknown>> | undefined;
  if (!defs) {
    schemaCache.set(componentType, null);
    return null;
  }

  const def = defs[componentType];
  if (!def) {
    schemaCache.set(componentType, null);
    return null;
  }

  const props: Record<string, Record<string, unknown>> = {};
  if (def.properties && typeof def.properties === 'object') {
    Object.assign(props, def.properties);
  }

  const result: ComponentSchemaDef = {
    properties: props,
    required: Array.isArray(def.required) ? (def.required as string[]) : [],
  };

  schemaCache.set(componentType, result);
  return result;
}

export function getComponentPropertyDefs(componentType: string): SchemaPropertyDef[] {
  const schema = getComponentSchema(componentType);
  if (!schema) return [];

  return Object.entries(schema.properties)
    .filter(([name]) => !BASE_PROPS.has(name))
    .map(([name, def]) => {
      const typeDef = def as Record<string, unknown>;
      let type = 'string';
      if (typeDef.type === 'integer') type = 'integer';
      else if (typeDef.type === 'number') type = 'number';
      else if (typeDef.type === 'boolean') type = 'boolean';
      else if (typeDef.type === 'array') type = 'array';
      else if (typeDef.type === 'object') type = 'object';

      return {
        name,
        type,
        ...(Array.isArray(typeDef.enum) ? { enum: typeDef.enum as string[] } : {}),
        ...(typeof typeDef.description === 'string' ? { description: typeDef.description } : {}),
        ...(typeof typeDef.minimum === 'number' ? { minimum: typeDef.minimum } : {}),
        ...(typeof typeDef.maximum === 'number' ? { maximum: typeDef.maximum } : {}),
        ...(typeDef.default !== undefined ? { default: typeDef.default } : {}),
      };
    });
}
