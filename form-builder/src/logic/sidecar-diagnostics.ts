import type { BuilderDiagnostic, BuilderProject } from '../types';

export function collectSidecarDiagnostics(project: BuilderProject): BuilderDiagnostic[] {
  const diagnostics: BuilderDiagnostic[] = [];

  project.mappings.forEach((entry, index) => {
    const mapping = entry as Record<string, unknown>;
    const prefix = `mappings[${index}]`;
    if (mapping.$formspecMapping !== '1.0') {
      diagnostics.push({
        severity: 'error',
        artifact: 'mapping',
        path: prefix,
        message: 'Mapping document missing $formspecMapping: 1.0',
        source: 'studio-sidecar',
      });
    }
    if (mapping.definitionRef !== project.definition?.url) {
      diagnostics.push({
        severity: 'warning',
        artifact: 'mapping',
        path: `${prefix}.definitionRef`,
        message: 'Mapping definitionRef does not match active definition URL',
        source: 'studio-sidecar',
      });
    }
    const rules = Array.isArray(mapping.rules) ? (mapping.rules as Array<Record<string, unknown>>) : [];
    if (rules.length === 0) {
      diagnostics.push({
        severity: 'warning',
        artifact: 'mapping',
        path: `${prefix}.rules`,
        message: 'Mapping has no rules',
        source: 'studio-sidecar',
      });
    }
  });

  project.changelogs.forEach((entry, index) => {
    const changelog = entry as Record<string, unknown>;
    const prefix = `changelogs[${index}]`;
    if (changelog.$formspecChangelog !== '1.0') {
      diagnostics.push({
        severity: 'error',
        artifact: 'changelog',
        path: prefix,
        message: 'Changelog document missing $formspecChangelog: 1.0',
        source: 'studio-sidecar',
      });
    }
    if (changelog.definitionUrl !== project.definition?.url) {
      diagnostics.push({
        severity: 'warning',
        artifact: 'changelog',
        path: `${prefix}.definitionUrl`,
        message: 'Changelog definitionUrl does not match active definition URL',
        source: 'studio-sidecar',
      });
    }
  });

  return diagnostics;
}
