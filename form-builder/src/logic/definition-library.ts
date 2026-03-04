import type { FormspecDefinition, FormspecItem } from 'formspec-engine';
import type { BuilderProject } from '../types';

export interface LibraryEntry {
  url: string;
  version: string;
  definition: FormspecDefinition;
}

export function addLibraryDefinition(project: BuilderProject, def: FormspecDefinition): BuilderProject {
  const filtered = project.library.filter((entry) => entry.url !== def.url);
  return {
    ...project,
    library: [...filtered, { url: def.url, version: def.version, definition: def }],
  };
}

export function removeLibraryDefinition(project: BuilderProject, url: string): BuilderProject {
  return {
    ...project,
    library: project.library.filter((entry) => entry.url !== url),
  };
}

export function createResolver(library: LibraryEntry[]): (url: string, version?: string) => FormspecDefinition {
  return (url: string, version?: string) => {
    const match = library.find(
      (entry) => entry.url === url && (!version || entry.version === version),
    );
    if (!match) {
      throw new Error(`Definition "${url}"${version ? ` version ${version}` : ''} not found in library`);
    }
    return match.definition;
  };
}

export function forkRefGroup(
  authored: FormspecDefinition,
  assembled: FormspecDefinition,
  groupKey: string,
): FormspecDefinition {
  const result = structuredClone(authored);

  function findGroup(items: FormspecItem[], key: string): FormspecItem | null {
    for (const item of items) {
      if (item.key === key) return item;
      if (item.children) {
        const found = findGroup(item.children, key);
        if (found) return found;
      }
    }
    return null;
  }

  const authoredGroup = findGroup(result.items, groupKey);
  if (!authoredGroup) {
    throw new Error(`Group "${groupKey}" not found in authored definition`);
  }

  const assembledGroup = findGroup(assembled.items, groupKey);
  if (!assembledGroup) {
    throw new Error(`Group "${groupKey}" not found in assembled definition`);
  }

  authoredGroup.children = structuredClone(assembledGroup.children ?? []);
  delete (authoredGroup as Record<string, unknown>).$ref;
  delete (authoredGroup as Record<string, unknown>).keyPrefix;

  return result;
}
