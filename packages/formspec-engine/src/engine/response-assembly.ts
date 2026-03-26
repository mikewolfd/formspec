/** @filedesc Response envelope, validation report, changelog migration, and pinned-definition resolution. */

import type { FormDefinition } from '@formspec-org/types';
import type { ValidationReport, ValidationResult } from '@formspec-org/types';
import type { EvalResult } from '../diff.js';
import type { PinnedResponseReference } from '../interfaces.js';
import { wasmApplyMigrationsToResponseData } from '../wasm-bridge-runtime.js';
import { toValidationResult } from './helpers.js';
import type { EvalShapeTiming } from './wasm-fel.js';

export function buildFormspecResponseEnvelope(options: {
    definition: FormDefinition;
    data: Record<string, unknown>;
    report: ValidationReport;
    timestamp: string;
    meta?: {
        id?: string;
        author?: { id: string; name?: string };
        subject?: { id: string; type?: string };
    };
}): Record<string, unknown> {
    const response: Record<string, unknown> = {
        $formspecResponse: '1.0',
        definitionUrl: options.definition.url ?? 'http://example.org/form',
        definitionVersion: options.definition.version ?? '1.0.0',
        status: options.report.valid ? 'completed' : 'in-progress',
        data: options.data,
        validationResults: options.report.results,
        authored: options.timestamp,
    };

    if (options.meta?.id) {
        response.id = options.meta.id;
    }
    if (options.meta?.author) {
        response.author = options.meta.author;
    }
    if (options.meta?.subject) {
        response.subject = options.meta.subject;
    }

    return response;
}

/** Shape validations that only run on submit, from a WASM eval with `trigger: 'submit'`. */
export function collectSubmitModeShapeValidationResults(
    submitEval: EvalResult,
    shapeTiming: Map<string, EvalShapeTiming>,
): ValidationResult[] {
    const results: ValidationResult[] = [];
    for (const validation of submitEval.validations) {
        if (!validation.shapeId) {
            continue;
        }
        if ((shapeTiming.get(validation.shapeId) ?? 'continuous') === 'submit') {
            results.push(toValidationResult(validation));
        }
    }
    return results;
}

/** Strip optional cardinality `source`, compute counts, and wrap the spec envelope. */
export function buildValidationReportEnvelope(
    results: ValidationResult[],
    timestamp: string,
): ValidationReport {
    const finalResults = results.map((result) => {
        if (result.constraintKind === 'cardinality') {
            const { source: _source, ...rest } = result as ValidationResult & { source?: string };
            return rest as ValidationResult;
        }
        return result;
    });

    const counts = { error: 0, warning: 0, info: 0 };
    for (const result of finalResults) {
        counts[result.severity as keyof typeof counts] += 1;
    }

    return {
        $formspecValidationReport: '1.0',
        valid: counts.error === 0,
        results: finalResults,
        counts,
        timestamp,
    };
}

export function migrateResponseData(
    definition: FormDefinition,
    responseData: Record<string, any>,
    fromVersion: string,
    options: { nowIso: string },
): Record<string, any> {
    if (!Array.isArray(definition.migrations)) {
        return responseData;
    }
    return JSON.parse(
        wasmApplyMigrationsToResponseData(
            JSON.stringify(definition),
            JSON.stringify(responseData),
            fromVersion,
            options.nowIso,
        ),
    ) as Record<string, any>;
}

export function resolvePinnedDefinition<T extends { url?: string; version?: string }>(
    response: PinnedResponseReference,
    definitions: T[],
): T {
    const exact = definitions.find(
        (definition) =>
            definition.url === response.definitionUrl
            && definition.version === response.definitionVersion,
    );
    if (exact) {
        return exact;
    }

    const availableVersions = definitions
        .filter((definition) => definition.url === response.definitionUrl)
        .map((definition) => definition.version)
        .filter((version): version is string => typeof version === 'string')
        .sort();

    let message = `No definition found for pinned response ${response.definitionUrl}@${response.definitionVersion}`;
    if (availableVersions.length > 0) {
        message += `; available versions: ${availableVersions.join(', ')}`;
    }
    throw new Error(message);
}
