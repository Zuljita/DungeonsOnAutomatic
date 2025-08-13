import { describe, expect, it } from 'vitest';
import { rng, pick, id } from '../src/services/random.js';

describe('random utilities', () => {
  it('rng generates deterministic sequences for the same seed', () => {
    const r1 = rng('seed');
    const r2 = rng('seed');
    const seq1 = [r1(), r1(), r1()];
    const seq2 = [r2(), r2(), r2()];
    expect(seq1).toEqual(seq2);
  });

  it('pick selects an element based on RNG output', () => {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    const r = () => 0.9; // should pick last element
    expect(pick(r, arr)).toBe('e');
  });

  it('id uses the prefix and RNG output', () => {
    const r = () => 0.123456;
    expect(id('test', r)).toBe('test-4fzyo82m');
  });
});
