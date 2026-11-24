import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationType } from '@fairtune/shared';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createNotification(params: CreateNotificationParams) {
    this.logger.log(
      `Dispatching notification to user ${params.userId}: [${params.type || 'SYSTEM'}] ${params.title}`,
    );

    return this.prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || NotificationType.SYSTEM,
        metadataJson: (params.metadata as any) || undefined,
      },
    });
  }

  async listUserNotifications(userId: string, unreadOnly = false, limit = 50) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
