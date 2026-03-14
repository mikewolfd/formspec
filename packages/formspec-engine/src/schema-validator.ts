/**
 * Structural (JSON Schema) validation for Formspec artifacts.
 * Mirrors the Python validator in src/formspec/validator/schema.py:
 * - Definition, theme, mapping: validate document against full schema.
 * - Component: shallow top-level validation + per-node validation to avoid
 *   exponential backtracking from oneOf/AnyComponent over the whole tree.
 */

import Ajv2020 from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";

export type DocumentType =
  | "definition"
  | "theme"
  | "component"
  | "mapping"
  | "response"
  | "validation_report"
  | "validation_result"
  | "registry"
  | "changelog"
  | "fel_functions";

export interface SchemaValidationError {
  path: string;
  message: string;
  /** Raw Ajv error for consumers that need it */
  raw?: ErrorObject;
}

export interface SchemaValidationResult {
  documentType: DocumentType | null;
  errors: SchemaValidationError[];
}

export interface SchemaValidatorSchemas {
  definition?: object;
  theme?: object;
  component?: object;
  mapping?: object;
  response?: object;
  validation_report?: object;
  validation_result?: object;
  registry?: object;
  changelog?: object;
  fel_functions?: object;
}

/** Convert path array to JSONPath string like $.items[0].key */
function toJsonPath(path: (string | number)[]): string {
  let out = "$";
  for (const part of path) {
    if (typeof part === "number") out += `[${part}]`;
    else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) out += `.${part}`;
    else out += `[${JSON.stringify(part)}]`;
  }
  return out;
}

/** JSON Pointer to path segments (e.g. "/children/0" -> ["children", 0]). */
function pointerToSegments(pointer: string): (string | number)[] {
  if (!pointer || pointer === "/") return [];
  const parts = pointer.split("/").slice(1);
  return parts.map((p) => {
    const unescaped = p.replace(/~1/g, "/").replace(/~0/g, "~");
    return /^\d+$/.test(unescaped) ? parseInt(unescaped, 10) : unescaped;
  });
}

/** Merge base path with Ajv instancePath (JSON Pointer) for full document path. */
function mergePath(basePath: (string | number)[], instancePath: string): string {
  const segments = pointerToSegments(instancePath);
  return toJsonPath([...basePath, ...segments]);
}

/** Build { componentConstValue: $defsKey } from AnyComponent.oneOf (skip CustomComponentRef for type map). */
function buildComponentTypeMap(schema: Record<string, unknown>): Map<string, string> {
  const defs = (schema.$defs as Record<string, unknown>) ?? {};
  const anyComp = defs.AnyComponent as Record<string, unknown> | undefined;
  const oneOf = Array.isArray(anyComp?.oneOf) ? (anyComp.oneOf as Record<string, unknown>[]) : [];
  const map = new Map<string, string>();
  for (const refObj of oneOf) {
    const ref = refObj?.$ref as string | undefined;
    if (!ref) continue;
    const defName = ref.split("/").pop() ?? "";
    if (defName === "CustomComponentRef") continue;
    const compDef = defs[defName] as Record<string, unknown> | undefined;
    const props = compDef?.properties as Record<string, unknown> | undefined;
    const compProp = props?.component as Record<string, unknown> | undefined;
    const constVal = compProp?.const;
    if (constVal != null && typeof constVal === "string") map.set(constVal, defName);
  }
  return map;
}

/** Deep clone and replace AnyComponent + ChildrenArray with stubs so top-level validation doesn't recurse. */
function makeShallowComponentSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const shallow = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;
  const defs = shallow.$defs as Record<string, unknown>;
  if (defs) {
    defs.AnyComponent = {
      type: "object",
      required: ["component"],
      properties: { component: { type: "string", minLength: 1 } },
    };
    defs.ChildrenArray = {
      type: "array",
      items: { $ref: "#/$defs/AnyComponent" },
    };
  }
  const id = (shallow.$id as string) ?? "urn:formspec:component";
  shallow.$id = id.endsWith("-shallow") ? id : `${id}-shallow`;
  return shallow;
}

/** Collect (pathParts, node) for every component node in the tree (follows children). */
function walkComponentNodes(
  node: unknown,
  basePath: (string | number)[],
  visited: WeakSet<object> = new WeakSet()
): Array<{ path: (string | number)[]; node: Record<string, unknown> }> {
  if (node == null || typeof node !== "object" || !("component" in node)) return [];
  if (visited.has(node)) return [];
  visited.add(node);
  const obj = node as Record<string, unknown>;
  const out: Array<{ path: (string | number)[]; node: Record<string, unknown> }> = [
    { path: [...basePath], node: obj },
  ];
  const children = obj.children;
  if (Array.isArray(children)) {
    children.forEach((child, i) => {
      out.push(...walkComponentNodes(child, [...basePath, "children", i], visited));
    });
  }
  return out;
}

function detectDocumentType(document: unknown): DocumentType | null {
  if (document == null || typeof document !== "object") return null;
  const doc = document as Record<string, unknown>;
  if ("$formspec" in doc) return "definition";
  if ("$formspecTheme" in doc) return "theme";
  if ("$formspecComponent" in doc) return "component";
  if ("$formspecRegistry" in doc) return "registry";
  const keys = new Set(Object.keys(doc));
  if (["path", "severity", "constraintKind", "message"].every((k) => keys.has(k)))
    return "validation_result";
  if (["version", "functions"].every((k) => keys.has(k))) return "fel_functions";
  if (["fromVersion", "toVersion", "changes"].every((k) => keys.has(k))) return "changelog";
  if (["definitionUrl", "data"].every((k) => keys.has(k))) return "response";
  if (["valid", "counts", "results"].every((k) => keys.has(k))) return "validation_report";
  if (["targetSchema", "rules"].every((k) => keys.has(k))) return "mapping";
  return null;
}

export interface SchemaValidator {
  validate(
    document: unknown,
    documentType?: DocumentType | null
  ): SchemaValidationResult;
}

/**
 * Create a schema validator that uses the same strategy as the Python validator:
 * - definition, theme, mapping, etc.: full schema validation.
 * - component: shallow document validation + per-node validation (O(n), no backtracking).
 */
export function createSchemaValidator(schemas: SchemaValidatorSchemas): SchemaValidator {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const docTypes: DocumentType[] = [
    "definition",
    "theme",
    "mapping",
    "response",
    "validation_report",
    "validation_result",
    "registry",
    "changelog",
    "fel_functions",
  ];

  // Add all non-component schemas by $id so $ref works
  for (const docType of docTypes) {
    const schema = schemas[docType];
    if (schema && typeof schema === "object" && "$id" in schema) {
      ajv.addSchema(schema as object);
    }
  }

  let componentShallowValidate: ValidateFunction | null = null;
  let componentTypeMap: Map<string, string> | null = null;
  let componentNodeValidators: Map<string, ValidateFunction> | null = null;
  let componentCustomRefValidate: ValidateFunction | null = null;
  let shallowSchemaId: string | null = null;

  const compSchema = schemas.component;
  if (compSchema && typeof compSchema === "object") {
    const comp = compSchema as Record<string, unknown>;
    componentTypeMap = buildComponentTypeMap(comp);
    const shallow = makeShallowComponentSchema(comp) as object;
    shallowSchemaId = (shallow as Record<string, unknown>).$id as string;
    ajv.addSchema(shallow);
    componentShallowValidate = ajv.compile(shallow);

    componentNodeValidators = new Map();
    const defs = (shallow as Record<string, unknown>).$defs as Record<string, unknown>;
    for (const [constName, defKey] of componentTypeMap) {
      const nodeSchema = { $ref: `${shallowSchemaId}#/$defs/${defKey}` };
      componentNodeValidators.set(constName, ajv.compile(nodeSchema));
    }
    if (defs?.CustomComponentRef) {
      const customSchema = { $ref: `${shallowSchemaId}#/$defs/CustomComponentRef` };
      componentCustomRefValidate = ajv.compile(customSchema);
    }
  }

  return {
    validate(
      document: unknown,
      documentType?: DocumentType | null
    ): SchemaValidationResult {
      const detected = documentType ?? detectDocumentType(document);
      if (detected === null) {
        return {
          documentType: null,
          errors: [
            {
              path: "$",
              message: "Unable to detect Formspec document type",
            },
          ],
        };
      }

      const schemaForType = schemas[detected];
      if (!schemaForType && detected !== "component") {
        return {
          documentType: detected,
          errors: [{ path: "$", message: `No schema provided for document type: ${detected}` }],
        };
      }

      const errors: SchemaValidationError[] = [];

      if (detected === "component") {
        if (!componentShallowValidate || !componentTypeMap || !componentNodeValidators) {
          return {
            documentType: "component",
            errors: [{ path: "$", message: "Component schema was not provided to the validator." }],
          };
        }
        // Step 1: top-level with shallow schema
        const ok = componentShallowValidate(document);
        const shallowErrors = componentShallowValidate.errors;
        if (!ok && shallowErrors) {
          for (const e of shallowErrors) {
            errors.push({
              path: mergePath([], e.instancePath ?? ""),
              message: e.message ?? String(e),
              raw: e,
            });
          }
        }
        // Step 2: walk tree and validate each node
        const doc = document as Record<string, unknown>;
        const tree = doc.tree;
        if (tree && typeof tree === "object") {
          for (const { path: pathParts, node } of walkComponentNodes(
            tree,
            ["tree"]
          )) {
            const compName = (node.component as string) ?? "";
            const validator =
              componentNodeValidators.get(compName) ?? componentCustomRefValidate;
            if (validator) {
              const nodeOk = validator(node);
              const errs = validator.errors;
              if (!nodeOk && errs) {
                for (const e of errs) {
                  errors.push({
                    path: mergePath(pathParts, e.instancePath ?? ""),
                    message: e.message ?? String(e),
                    raw: e,
                  });
                }
              }
            }
          }
        }
        // Step 3: custom component template trees
        const components = doc.components;
        if (components && typeof components === "object") {
          const comps = components as Record<string, unknown>;
          for (const [compName, compDef] of Object.entries(comps)) {
            if (compDef && typeof compDef === "object") {
              const templateTree = (compDef as Record<string, unknown>).tree;
              if (templateTree && typeof templateTree === "object") {
                for (const { path: pathParts, node } of walkComponentNodes(
                  templateTree,
                  ["components", compName, "tree"]
                )) {
                  const name = (node.component as string) ?? "";
                  const validator =
                    componentNodeValidators.get(name) ?? componentCustomRefValidate;
                  if (validator) {
                    const nodeOk = validator(node);
                    const errs = validator.errors;
                    if (!nodeOk && errs) {
                      for (const e of errs) {
                        errors.push({
                          path: mergePath(pathParts, e.instancePath ?? ""),
                          message: e.message ?? String(e),
                          raw: e,
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } else {
        const validate = ajv.compile(schemaForType as object);
        const ok = validate(document);
        const validateErrors = validate.errors;
        if (!ok && validateErrors) {
          for (const e of validateErrors) {
            errors.push({
              path: mergePath([], e.instancePath ?? ""),
              message: e.message ?? String(e),
              raw: e,
            });
          }
        }
      }

      return {
        documentType: detected,
        errors: errors.sort((a, b) => a.path.localeCompare(b.path)),
      };
    },
  };
}
