import { Controller, Get, Patch, Post, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationService } from './services/notifications.service';
import { UserDto } from '@fairtune/shared';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current authenticated user' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Notifications list retrieved' })
  async listNotifications(@CurrentUser() user: UserDto, @Query('unreadOnly') unreadOnly?: string) {
    const isUnread = unreadOnly === 'true' || unreadOnly === '1';
    return this.notificationService.listUserNotifications(user.id, isUnread);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markRead(@CurrentUser() user: UserDto, @Param('id') id: string) {
    return this.notificationService.markAsRead(id, user.id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllRead(@CurrentUser() user: UserDto) {
    return this.notificationService.markAllAsRead(user.id);
  }
}
