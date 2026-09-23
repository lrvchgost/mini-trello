import { placeAtEnd } from './order.util';

describe('placeAtEnd', () => {
  const ids = ['a', 'b', 'c'];

  it('moves a column to the front', () => {
    expect(placeAtEnd(ids, 'c', 0)).toEqual(['c', 'a', 'b']);
  });

  it('moves a column to the middle', () => {
    expect(placeAtEnd(ids, 'a', 1)).toEqual(['b', 'a', 'c']);
  });

  it('moves a column to the end', () => {
    expect(placeAtEnd(ids, 'a', 2)).toEqual(['b', 'c', 'a']);
  });

  it('clamps a target order beyond the end', () => {
    expect(placeAtEnd(ids, 'a', 99)).toEqual(['b', 'c', 'a']);
  });

  it('clamps a negative target order to the front', () => {
    expect(placeAtEnd(ids, 'b', -5)).toEqual(['b', 'a', 'c']);
  });

  it('keeps a single column in place', () => {
    expect(placeAtEnd(['a'], 'a', 0)).toEqual(['a']);
  });
});
