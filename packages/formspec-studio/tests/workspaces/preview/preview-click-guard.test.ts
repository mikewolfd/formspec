/** @filedesc Verifies the preview click bridge does not hijack interactive form elements. */
import { describe, it, expect } from 'vitest';
import { isInteractiveTarget } from '../../../src/workspaces/preview/FormspecPreviewHost';

function dom(html: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.innerHTML = html.trim();
  return wrap.firstElementChild as HTMLElement;
}

describe('isInteractiveTarget', () => {
  it('returns false for null or non-element targets', () => {
    expect(isInteractiveTarget(null)).toBe(false);
    expect(isInteractiveTarget({} as unknown as EventTarget)).toBe(false);
  });

  it('returns false for a plain field-card root with no interactive descendants in path', () => {
    const card = dom('<div data-name="age"><label>Age</label></div>');
    expect(isInteractiveTarget(card)).toBe(false);
  });

  it('returns true when target is an <input> inside a field card', () => {
    const card = dom('<div data-name="age"><input type="number" /></div>');
    const input = card.querySelector('input')!;
    expect(isInteractiveTarget(input)).toBe(true);
  });

  it('returns true when target is inside a <button>', () => {
    const card = dom('<div data-name="submit"><button><span>Send</span></button></div>');
    const span = card.querySelector('span')!;
    expect(isInteractiveTarget(span)).toBe(true);
  });

  it('returns true for <select>, <textarea>, <a>', () => {
    expect(isInteractiveTarget(dom('<select></select>'))).toBe(true);
    expect(isInteractiveTarget(dom('<textarea></textarea>'))).toBe(true);
    expect(isInteractiveTarget(dom('<a href="#"></a>'))).toBe(true);
  });

  it('returns true for contenteditable elements', () => {
    expect(isInteractiveTarget(dom('<div contenteditable="true"></div>'))).toBe(true);
  });

  it('returns true for role=button surfaces', () => {
    expect(isInteractiveTarget(dom('<div role="button"></div>'))).toBe(true);
  });

  it('stops walking at the field root, not beyond', () => {
    // A button OUTSIDE the field card should not pollute the answer for clicks on the card.
    const tree = document.createElement('div');
    tree.innerHTML = '<button>outside</button><div data-name="age"><label>Age</label></div>';
    const label = tree.querySelector('label')!;
    expect(isInteractiveTarget(label)).toBe(false);
  });
});
