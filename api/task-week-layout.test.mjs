import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { layoutTimedBlocks } from '../src/lib/taskLenses.js';

describe('layoutTimedBlocks', () => {
  it('keeps a single block full width', () => {
    const [a] = layoutTimedBlocks([
      { id: 'a', start: '09:00', end: '10:00' },
    ]);
    assert.equal(a.col, 0);
    assert.equal(a.cols, 1);
  });

  it('puts two overlapping blocks side by side', () => {
    const laid = layoutTimedBlocks([
      { id: 'a', start: '09:00', end: '10:00' },
      { id: 'b', start: '09:00', end: '10:00' },
    ]);
    const cols = new Set(laid.map((x) => x.col));
    assert.equal(cols.size, 2);
    assert.equal(laid[0].cols, 2);
    assert.equal(laid[1].cols, 2);
  });

  it('does not shrink a later non-overlapping block', () => {
    const laid = layoutTimedBlocks([
      { id: 'a', start: '09:00', end: '10:00' },
      { id: 'b', start: '09:30', end: '10:30' },
      { id: 'c', start: '14:00', end: '15:00' },
    ]);
    const c = laid.find((x) => x.id === 'c');
    assert.equal(c.col, 0);
    assert.equal(c.cols, 1);
  });
});
