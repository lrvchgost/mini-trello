import { describe, expect, it } from 'vitest';
import { aggregateByStatus } from './stats-chart';

describe('aggregateByStatus', () => {
  it('sums identically titled columns across boards', () => {
    expect(
      aggregateByStatus([
        { columnId: 'a', columnTitle: 'To Do', count: 2 },
        { columnId: 'b', columnTitle: 'Done', count: 1 },
        { columnId: 'c', columnTitle: 'To Do', count: 3 },
      ]),
    ).toEqual([
      { name: 'To Do', value: 5 },
      { name: 'Done', value: 1 },
    ]);
  });

  it('returns an empty list for no columns', () => {
    expect(aggregateByStatus([])).toEqual([]);
  });
});
