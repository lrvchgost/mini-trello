import { planCardMove } from './reorder.util';

describe('planCardMove', () => {
  it('moves a card to the front of the same column', () => {
    const plan = planCardMove(['a', 'b', 'c'], ['a', 'b', 'c'], 'c', 0);

    expect(plan.targetIds).toEqual(['c', 'a', 'b']);
    expect(plan.sourceIds).toEqual(['c', 'a', 'b']);
  });

  it('moves a card to the middle of the same column', () => {
    const plan = planCardMove(['a', 'b', 'c'], ['a', 'b', 'c'], 'a', 1);

    expect(plan.targetIds).toEqual(['b', 'a', 'c']);
  });

  it('moves a card to the end of the same column', () => {
    const plan = planCardMove(['a', 'b', 'c'], ['a', 'b', 'c'], 'a', 2);

    expect(plan.targetIds).toEqual(['b', 'c', 'a']);
  });

  it('clamps a target order beyond the end', () => {
    const plan = planCardMove(['a', 'b', 'c'], ['a', 'b', 'c'], 'a', 99);

    expect(plan.targetIds).toEqual(['b', 'c', 'a']);
  });

  it('moves a card into another column at the requested position', () => {
    const plan = planCardMove(['a', 'b'], ['x', 'y'], 'a', 1);

    expect(plan.sourceIds).toEqual(['b']);
    expect(plan.targetIds).toEqual(['x', 'a', 'y']);
  });

  it('moves a card into an empty column', () => {
    const plan = planCardMove(['a'], [], 'a', 0);

    expect(plan.sourceIds).toEqual([]);
    expect(plan.targetIds).toEqual(['a']);
  });

  it('keeps the source column order stable for the remaining cards', () => {
    const plan = planCardMove(['a', 'b', 'c'], ['x'], 'b', 0);

    expect(plan.sourceIds).toEqual(['a', 'c']);
    expect(plan.targetIds).toEqual(['b', 'x']);
  });
});
