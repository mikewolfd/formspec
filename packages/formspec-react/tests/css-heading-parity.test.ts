/** @filedesc Verifies heading size parity between React and WC default CSS. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const reactCSS = readFileSync(
    resolve(__dirname, '../src/formspec.css'), 'utf-8'
);
const wcCSS = readFileSync(
    resolve(__dirname, '../../formspec-webcomponent/src/formspec-default.css'), 'utf-8'
);

/**
 * Extract a CSS property value from a rule whose selector list includes
 * `hN.formspec-heading`. Handles combined selectors like `h5.formspec-heading,\nh6.formspec-heading`.
 */
function extractHeadingProp(css: string, level: number, prop: string): string | null {
    // Find all rule blocks, then check if any selector list contains hN.formspec-heading
    const ruleRe = /([^{}]+)\{([^}]+)\}/g;
    let m: RegExpExecArray | null;
    while ((m = ruleRe.exec(css)) !== null) {
        const selectors = m[1];
        const body = m[2];
        if (selectors.includes(`h${level}.formspec-heading`)) {
            const propRe = new RegExp(`${prop}:\\s*([^;]+);`);
            const pm = body.match(propRe);
            if (pm) return pm[1].trim();
        }
    }
    return null;
}

describe('Heading size parity (React vs WC)', () => {
    const expectedScale: Record<number, { size: string; weight: string }> = {
        1: { size: '1.375rem', weight: '700' },
        2: { size: '1.125rem', weight: '700' },
        3: { size: '0.9375rem', weight: '600' },
        4: { size: '0.8125rem', weight: '600' },
        5: { size: '0.75rem', weight: '600' },
        6: { size: '0.75rem', weight: '600' },
    };

    for (const level of [1, 2, 3, 4, 5, 6]) {
        it(`h${level} font-size matches between React and WC`, () => {
            const reactSize = extractHeadingProp(reactCSS, level, 'font-size');
            const wcSize = extractHeadingProp(wcCSS, level, 'font-size');
            expect(reactSize).toBe(expectedScale[level].size);
            expect(wcSize).toBe(expectedScale[level].size);
        });

        it(`h${level} font-weight matches between React and WC`, () => {
            const reactWeight = extractHeadingProp(reactCSS, level, 'font-weight');
            const wcWeight = extractHeadingProp(wcCSS, level, 'font-weight');
            expect(reactWeight).toBe(expectedScale[level].weight);
            expect(wcWeight).toBe(expectedScale[level].weight);
        });
    }
});
