import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StellarMonitoringService } from './services/stellar-monitoring.service';
import { UserRole } from '@fairtune/shared';

@ApiTags('Blockchain Monitoring & Sync')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: StellarMonitoringService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('status')
  @ApiOperation({
    summary: 'Get current Soroban monitoring status, checkpoint ledger, and RPC health',
  })
  @ApiResponse({ status: 200, description: 'Monitoring health and cursor status' })
  async getStatus() {
    return this.monitoringService.getStatus();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ARTIST)
  @Post('sync')
  @ApiOperation({ summary: 'Trigger a manual Soroban contract event polling pass' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum events to poll (default 100)' })
  @ApiResponse({ status: 200, description: 'Event polling pass completed' })
  async triggerSync(@Query('limit') limit?: number) {
    const numLimit = limit ? Number(limit) : 100;
    return this.monitoringService.pollEvents(numLimit);
  }
}
