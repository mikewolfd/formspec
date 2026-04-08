import { describe, it, expect } from 'vitest';
import { humanizeFEL } from '@formspec-org/studio-core';

describe('humanizeFEL', () => {
  it('translates equality comparison', () => {
    expect(humanizeFEL('$evHist = true')).toEqual({ text: 'Ev Hist is Yes', supported: true });
  });

  it('translates not-equal comparison', () => {
    expect(humanizeFEL('$status != "active"')).toEqual({ text: 'Status is not "active"', supported: true });
  });

  it('translates numeric comparison', () => {
    expect(humanizeFEL('$age >= 18')).toEqual({ text: 'Age is at least 18', supported: true });
  });

  it('translates less-than comparison', () => {
    expect(humanizeFEL('$score < 50')).toEqual({ text: 'Score is less than 50', supported: true });
  });

  it('translates boolean true reference', () => {
    expect(humanizeFEL('$isActive = true')).toEqual({ text: 'Is Active is Yes', supported: true });
  });

  it('translates boolean false reference', () => {
    expect(humanizeFEL('$isActive = false')).toEqual({ text: 'Is Active is No', supported: true });
  });

  it('returns raw expression for complex FEL with supported: false', () => {
    const expr = 'if($a > 1, $b + $c, $d)';
    expect(humanizeFEL(expr)).toEqual({ text: expr, supported: false });
  });

  it('returns raw expression for function calls with supported: false', () => {
    const expr = 'count($items)';
    expect(humanizeFEL(expr)).toEqual({ text: expr, supported: false });
  });
});
