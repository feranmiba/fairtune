import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notifications.service';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationType } from '@fairtune/shared';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: any;

  const mockNotification = {
    id: 'notif-1',
    userId: 'user-1',
    title: 'Payout Received',
    message: 'You received 50 USDC for Summer Beats.',
    type: NotificationType.PAYMENT_RECEIVED,
    read: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn().mockResolvedValue(mockNotification),
        findMany: jest.fn().mockResolvedValue([mockNotification]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create and dispatch notification', async () => {
      const res = await service.createNotification({
        userId: 'user-1',
        title: 'Payout Received',
        message: 'You received 50 USDC for Summer Beats.',
        type: NotificationType.PAYMENT_RECEIVED,
      });

      expect(res).toEqual(mockNotification);
      expect(prisma.notification.create).toHaveBeenCalled();
    });
  });

  describe('listUserNotifications', () => {
    it('should retrieve notifications for user', async () => {
      const res = await service.listUserNotifications('user-1', false);
      expect(res).toHaveLength(1);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark single notification as read', async () => {
      await service.markAsRead('notif-1', 'user-1');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        data: { read: true },
      });
    });

    it('should mark all notifications as read', async () => {
      await service.markAllAsRead('user-1');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
        data: { read: true },
      });
    });
  });
});
