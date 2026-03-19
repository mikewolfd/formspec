/** @filedesc Chevrotain-backed FEL runtime — adapts the existing lexer/parser/interpreter to IFelRuntime. */

import { FelLexer } from './lexer.js';
import { parser } from './parser.js';
import { interpreter } from './interpreter.js';
export { FelUnsupportedFunctionError } from './interpreter.js';
import { dependencyVisitor } from './dependency-visitor.js';
import type {
    IFelRuntime,
    ICompiledExpression,
    FelCompilationResult,
    FelCompilationError,
    FelContext,
    FELBuiltinFunctionCatalogEntry,
} from './runtime.js';

/**
 * Compiled expression backed by a Chevrotain CST node.
 *
 * Holds the parsed CST and extracted dependencies; evaluation delegates
 * to the shared `FelInterpreter` singleton.
 */
class ChevrotainCompiledExpression implements ICompiledExpression {
    readonly dependencies: string[];
    private readonly cst: any;

    constructor(cst: any, dependencies: string[]) {
        this.cst = cst;
        this.dependencies = dependencies;
    }

    evaluate(context: FelContext): any {
        return interpreter.evaluate(this.cst, context);
    }
}

/**
 * FEL runtime backed by the existing Chevrotain pipeline
 * (lexer → parser → CstVisitor interpreter + dependency visitor).
 *
 * This is the default runtime used when no Rust/WASM backend is available.
 */
export class ChevrotainFelRuntime implements IFelRuntime {
    compile(expression: string): FelCompilationResult {
        const lexResult = FelLexer.tokenize(expression);

        if (lexResult.errors.length > 0) {
            const errors: FelCompilationError[] = lexResult.errors.map(e => ({
                message: e.message,
                offset: e.offset,
                line: e.line,
                column: e.column,
            }));
            return { expression: null, errors };
        }

        parser.input = lexResult.tokens;
        const cst = parser.expression();

        if (parser.errors.length > 0) {
            const errors: FelCompilationError[] = parser.errors.map(e => ({
                message: e.message,
                offset: e.token?.startOffset,
                line: e.token?.startLine ?? undefined,
                column: e.token?.startColumn ?? undefined,
            }));
            return { expression: null, errors };
        }

        const dependencies = dependencyVisitor.getDependencies(cst);
        return {
            expression: new ChevrotainCompiledExpression(cst, dependencies),
            errors: [],
        };
    }

    listBuiltInFunctions(): FELBuiltinFunctionCatalogEntry[] {
        return interpreter.listBuiltInFunctions();
    }
}

/** Shared default instance. */
export const chevrotainFelRuntime = new ChevrotainFelRuntime();
