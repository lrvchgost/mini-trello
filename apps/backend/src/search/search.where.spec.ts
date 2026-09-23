import { buildCardSearchWhere } from './search.where';

const base = { ownerId: 'user-1' };

describe('buildCardSearchWhere', () => {
  it('always scopes to the owner boards', () => {
    expect(buildCardSearchWhere(base)).toEqual({
      column: { board: { ownerId: 'user-1' } },
    });
  });

  it('narrows to a single board when boardId is given', () => {
    expect(buildCardSearchWhere({ ...base, boardId: 'board-1' })).toEqual({
      column: { board: { id: 'board-1', ownerId: 'user-1' } },
    });
  });

  it('searches title and description case-insensitively', () => {
    const where = buildCardSearchWhere({ ...base, q: 'fix' });
    expect(where.OR).toEqual([
      { title: { contains: 'fix', mode: 'insensitive' } },
      { description: { contains: 'fix', mode: 'insensitive' } },
    ]);
  });

  it('applies priority, label, assignee and deadline filters', () => {
    expect(buildCardSearchWhere({ ...base, priority: 'high' })).toMatchObject({ priority: 'high' });
    expect(buildCardSearchWhere({ ...base, labelId: 'label-1' })).toMatchObject({
      labels: { some: { labelId: 'label-1' } },
    });
    expect(buildCardSearchWhere({ ...base, assigneeId: 'user-1' })).toMatchObject({
      assigneeId: 'user-1',
    });
    expect(buildCardSearchWhere({ ...base, hasDeadline: true })).toMatchObject({
      deadline: { not: null },
    });
    expect(buildCardSearchWhere({ ...base, hasDeadline: false })).toMatchObject({
      deadline: null,
    });
  });
});
