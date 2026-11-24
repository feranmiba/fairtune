import { Module, Global } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsController } from './notifications.controller';
import { NotificationService } from './services/notifications.service';

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [NotificationsController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
