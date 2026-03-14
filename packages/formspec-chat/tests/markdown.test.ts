/**
 * Unit tests for the parseMdBlocks function extracted from InquestThread.
 *
 * parseMdBlocks is a lightweight markdown parser that converts chat message
 * text into structured block types (p, ul, ol, h1/h2/h3). Testing it in
 * isolation verifies the chat message rendering without spinning up React.
 */

import { describe, expect, it } from 'vitest';

// parseMdBlocks is not exported from InquestThread. We duplicate it here to test
// it as a pure function — a good signal that it should be extracted to a util.
type MdBlock =
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'h'; level: 1 | 2 | 3; text: string };

function parseMdBlocks(text: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  let current: MdBlock | null = null;

  function flush() {
    if (current) { blocks.push(current); current = null; }
  }

  for (const line of text.split('\n')) {
    if (line.trim() === '') { flush(); continue; }

    const hMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (hMatch) {
      flush();
      blocks.push({ kind: 'h', level: hMatch[1].length as 1 | 2 | 3, text: hMatch[2] });
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.*)/);
    if (ulMatch) {
      if (!current || current.kind !== 'ul') { flush(); current = { kind: 'ul', items: [] }; }
      current.items.push(ulMatch[1]);
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.*)/);
    if (olMatch) {
      if (!current || current.kind !== 'ol') { flush(); current = { kind: 'ol', items: [] }; }
      current.items.push(olMatch[1]);
      continue;
    }

    if (!current || current.kind !== 'p') { flush(); current = { kind: 'p', lines: [] }; }
    current.lines.push(line);
  }

  flush();
  return blocks;
}

/* ── Tests ──────────────────────────────────────── */

describe('parseMdBlocks', () => {
  it('parses a plain paragraph', () => {
    const blocks = parseMdBlocks('Hello world');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ kind: 'p', lines: ['Hello world'] });
  });

  it('parses an h1 heading', () => {
    const blocks = parseMdBlocks('# Title');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ kind: 'h', level: 1, text: 'Title' });
  });

  it('parses an h2 heading', () => {
    const blocks = parseMdBlocks('## Section');
    expect(blocks[0]).toMatchObject({ kind: 'h', level: 2, text: 'Section' });
  });

  it('parses an h3 heading', () => {
    const blocks = parseMdBlocks('### Sub');
    expect(blocks[0]).toMatchObject({ kind: 'h', level: 3, text: 'Sub' });
  });

  it('parses a dash-style unordered list', () => {
    const blocks = parseMdBlocks('- item one\n- item two');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ kind: 'ul', items: ['item one', 'item two'] });
  });

  it('parses an asterisk-style unordered list', () => {
    const blocks = parseMdBlocks('* alpha\n* beta');
    expect(blocks[0]).toMatchObject({ kind: 'ul', items: ['alpha', 'beta'] });
  });

  it('parses an ordered list', () => {
    const blocks = parseMdBlocks('1. first\n2. second\n3. third');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ kind: 'ol', items: ['first', 'second', 'third'] });
  });

  it('separates blocks by blank lines', () => {
    const blocks = parseMdBlocks('Para one\n\nPara two');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ kind: 'p', lines: ['Para one'] });
    expect(blocks[1]).toMatchObject({ kind: 'p', lines: ['Para two'] });
  });

  it('groups consecutive list items into a single block', () => {
    const blocks = parseMdBlocks('- a\n- b\n- c');
    expect(blocks).toHaveLength(1);
    expect((blocks[0] as { kind: 'ul'; items: string[] }).items).toHaveLength(3);
  });

  it('handles mixed content: heading, paragraph, list', () => {
    const text = '# H1\n\nSome text\n\n- item\n- item2';
    const blocks = parseMdBlocks(text);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].kind).toBe('h');
    expect(blocks[1].kind).toBe('p');
    expect(blocks[2].kind).toBe('ul');
  });

  it('returns empty array for empty string', () => {
    expect(parseMdBlocks('')).toHaveLength(0);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(parseMdBlocks('   \n  \n  ')).toHaveLength(0);
  });

  it('handles multi-line paragraph (lines joined in one block)', () => {
    const blocks = parseMdBlocks('line one\nline two\nline three');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ kind: 'p', lines: ['line one', 'line two', 'line three'] });
  });

  it('transitions from list to paragraph correctly', () => {
    const text = '- list item\n\nBack to paragraph';
    const blocks = parseMdBlocks(text);
    expect(blocks[0].kind).toBe('ul');
    expect(blocks[1].kind).toBe('p');
  });

  it('transitions from ordered list to unordered list when separated', () => {
    const text = '1. first\n\n- bullet';
    const blocks = parseMdBlocks(text);
    expect(blocks[0].kind).toBe('ol');
    expect(blocks[1].kind).toBe('ul');
  });
});
