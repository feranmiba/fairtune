import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
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
import { PaymentReconciliationService } from './services/payment-reconciliation.service';
import { UserDto } from '@fairtune/shared';

@ApiTags('Payment Reconciliation')
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: PaymentReconciliationService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('agreements/:agreementId')
  @ApiOperation({
    summary: 'Trigger a deterministic payment reconciliation audit for a royalty agreement',
  })
  @ApiParam({ name: 'agreementId', description: 'Agreement UUID' })
  @ApiResponse({ status: 200, description: 'Reconciliation audit report generated' })
  async reconcileAgreement(
    @CurrentUser() user: UserDto,
    @Param('agreementId') agreementId: string,
  ) {
    return this.reconciliationService.reconcileAgreement(agreementId, user.id, user.role);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('agreements/:agreementId')
  @ApiOperation({ summary: 'Get the latest reconciliation report for an agreement' })
  @ApiParam({ name: 'agreementId', description: 'Agreement UUID' })
  @ApiResponse({ status: 200, description: 'Latest reconciliation report' })
  async getLatestReconciliation(
    @CurrentUser() user: UserDto,
    @Param('agreementId') agreementId: string,
  ) {
    return this.reconciliationService.getLatestReconciliation(agreementId, user.id, user.role);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('history')
  @ApiOperation({ summary: 'List reconciliation audit history across authorized agreements' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Reconciliation history list' })
  async listHistory(@CurrentUser() user: UserDto, @Query('limit') limit?: number) {
    return this.reconciliationService.listReconciliations(
      user.id,
      user.role,
      limit ? Number(limit) : 20,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('discrepancies')
  @ApiOperation({ summary: 'List all unresolved reconciliation discrepancies and findings' })
  @ApiResponse({ status: 200, description: 'Unresolved findings list' })
  async listUnresolvedFindings(@CurrentUser() user: UserDto) {
    return this.reconciliationService.listUnresolvedFindings(user.id, user.role);
  }
}
