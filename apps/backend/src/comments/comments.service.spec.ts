import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Card, Comment, Paginated } from '@min-trello/shared';
import type { ActivityService } from '../activity/activity.service';
import type { ICardRepository } from '../cards/repositories/card.repository';
import { CommentsService } from './comments.service';
import type { ICommentRepository } from './repositories/comment.repository';

const card: Card = {
  id: 'card-1',
  title: 'First task',
  description: null,
  priority: 'medium',
  deadline: null,
  order: 0,
  columnId: 'column-1',
  assigneeId: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const comment: Comment = {
  id: 'comment-1',
  content: 'ping',
  cardId: 'card-1',
  authorId: 'user-1',
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

const paginated: Paginated<Comment> = { items: [comment], total: 1, page: 1, limit: 20 };

describe('CommentsService', () => {
  let service: CommentsService;
  let commentRepo: jest.Mocked<ICommentRepository>;
  let cardRepo: jest.Mocked<ICardRepository>;
  let activityService: jest.Mocked<ActivityService>;

  beforeEach(() => {
    commentRepo = {
      findById: jest.fn(),
      findByCard: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
    };

    cardRepo = {
      findById: jest.fn(),
      findDetailById: jest.fn(),
      findManyByColumn: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      move: jest.fn(),
      setAssignee: jest.fn(),
      remove: jest.fn(),
    };

    activityService = {
      log: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<ActivityService>;

    service = new CommentsService(commentRepo, cardRepo, activityService);
  });

  describe('list', () => {
    it('returns comments of the card paginated', async () => {
      cardRepo.findById.mockResolvedValue(card);
      commentRepo.findByCard.mockResolvedValue(paginated);

      await expect(service.list('card-1', 1, 20)).resolves.toBe(paginated);
      expect(commentRepo.findByCard).toHaveBeenCalledWith('card-1', 1, 20);
    });

    it('throws CARD_NOT_FOUND when the card is missing', async () => {
      cardRepo.findById.mockResolvedValue(null);

      await expect(service.list('missing', 1, 20)).rejects.toThrow(NotFoundException);
      expect(commentRepo.findByCard).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('creates a comment authored by the current user and logs activity', async () => {
      cardRepo.findById.mockResolvedValue(card);
      commentRepo.create.mockResolvedValue(comment);

      await expect(
        service.create('card-1', { content: 'ping' }, 'user-1', 'board-1'),
      ).resolves.toBe(comment);
      expect(commentRepo.create).toHaveBeenCalledWith({
        content: 'ping',
        cardId: 'card-1',
        authorId: 'user-1',
      });
      expect(activityService.log).toHaveBeenCalledWith(
        'board-1',
        'comment.created',
        { commentId: 'comment-1', cardId: 'card-1' },
        'user-1',
        'card-1',
      );
    });

    it('throws CARD_NOT_FOUND when the card is missing', async () => {
      cardRepo.findById.mockResolvedValue(null);

      await expect(
        service.create('missing', { content: 'ping' }, 'user-1', 'board-1'),
      ).rejects.toThrow(NotFoundException);
      expect(commentRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the comment when requested by its author and logs activity', async () => {
      commentRepo.findById.mockResolvedValue(comment);
      commentRepo.remove.mockResolvedValue(undefined);

      await service.remove('comment-1', 'user-1', 'board-1');
      expect(commentRepo.remove).toHaveBeenCalledWith('comment-1');
      expect(activityService.log).toHaveBeenCalledWith(
        'board-1',
        'comment.deleted',
        { commentId: 'comment-1', cardId: 'card-1' },
        'user-1',
        'card-1',
      );
    });

    it('throws COMMENT_NOT_FOUND when the comment is missing', async () => {
      commentRepo.findById.mockResolvedValue(null);

      await expect(service.remove('missing', 'user-1', 'board-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(commentRepo.remove).not.toHaveBeenCalled();
    });

    it('forbids deleting a comment of another author (403)', async () => {
      commentRepo.findById.mockResolvedValue({ ...comment, authorId: 'user-2' });

      await expect(service.remove('comment-1', 'user-1', 'board-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(commentRepo.remove).not.toHaveBeenCalled();
    });
  });
});
