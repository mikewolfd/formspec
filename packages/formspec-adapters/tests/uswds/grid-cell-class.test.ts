/** @filedesc Unit tests: USWDS grid cell classes from planner `gridColumn` on region Stacks. */
import { describe, it, expect } from 'vitest';
import { equalGridCellClass, uswdsGridCellClassForChild } from '../../src/uswds/layout/grid-shared';

describe('uswdsGridCellClassForChild', () => {
    it('falls back to equalGridCellClass when gridColumn is missing', () => {
        expect(uswdsGridCellClassForChild(undefined, 12)).toBe(equalGridCellClass(12));
        expect(uswdsGridCellClassForChild({}, 12)).toBe(equalGridCellClass(12));
    });

    it('maps span N to full-width mobile + tablet:grid-col-N', () => {
        expect(uswdsGridCellClassForChild({ gridColumn: 'span 8' }, 12)).toBe('grid-col-12 tablet:grid-col-8');
        expect(uswdsGridCellClassForChild({ gridColumn: 'span 4' }, 12)).toBe('grid-col-12 tablet:grid-col-4');
        expect(uswdsGridCellClassForChild({ gridColumn: 'span 12' }, 12)).toBe('grid-col-12 tablet:grid-col-12');
    });

    it('clamps span to 1..12', () => {
        expect(uswdsGridCellClassForChild({ gridColumn: 'span 0' }, 12)).toBe('grid-col-12 tablet:grid-col-1');
        expect(uswdsGridCellClassForChild({ gridColumn: 'span 99' }, 12)).toBe('grid-col-12 tablet:grid-col-12');
    });

    it('maps start / span with tablet offset', () => {
        expect(uswdsGridCellClassForChild({ gridColumn: '3 / span 6' }, 12)).toBe(
            'grid-col-12 tablet:grid-offset-2 tablet:grid-col-6',
        );
    });

    it('ignores unknown gridColumn strings', () => {
        expect(uswdsGridCellClassForChild({ gridColumn: '1fr / 2fr' }, 6)).toBe(equalGridCellClass(6));
    });
});
