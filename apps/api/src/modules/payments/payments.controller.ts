import { Controller, Get, Post, Body, Param, Query, UseGuards, UsePipes } from '@nestjs/common';
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
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PaymentAssetService } from './services/payment-asset.service';
import { PaymentsService } from './services/payments.service';
import {
  createPaymentAssetSchema,
  CreatePaymentAssetInput,
  queryPaymentsSchema,
  QueryPaymentsInput,
} from '@fairtune/validation';
import { UserDto, StellarNetwork } from '@fairtune/shared';

@ApiTags('Payments & Assets')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly assetService: PaymentAssetService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('assets')
  @ApiOperation({ summary: 'Register a new payment asset or token contract' })
  @ApiResponse({ status: 201, description: 'Payment asset registered successfully' })
  @UsePipes(new ZodValidationPipe(createPaymentAssetSchema))
  async registerAsset(@Body() input: CreatePaymentAssetInput) {
    return this.assetService.createAsset(input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('assets')
  @ApiOperation({ summary: 'List all registered payment assets' })
  @ApiQuery({ name: 'network', enum: StellarNetwork, required: false })
  @ApiResponse({ status: 200, description: 'List of payment assets' })
  async listAssets(@Query('network') network?: StellarNetwork) {
    return this.assetService.listAssets(network);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('assets/:id')
  @ApiOperation({ summary: 'Get payment asset by ID' })
  @ApiParam({ name: 'id', description: 'Asset UUID' })
  @ApiResponse({ status: 200, description: 'Payment asset details' })
  async getAssetById(@Param('id') id: string) {
    return this.assetService.getAssetById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'List payment history with filters' })
  @ApiResponse({ status: 200, description: 'Paginated payments list' })
  @UsePipes(new ZodValidationPipe(queryPaymentsSchema))
  async listPayments(@CurrentUser() user: UserDto, @Query() query: QueryPaymentsInput) {
    return this.paymentsService.listPayments(query, user.id, user.role);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get payment details by ID' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({ status: 200, description: 'Payment details retrieved' })
  async getPaymentById(@CurrentUser() user: UserDto, @Param('id') id: string) {
    return this.paymentsService.getPaymentById(id, user.id, user.role);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('agreements/:agreementId')
  @ApiOperation({ summary: 'Get all payments associated with an agreement' })
  @ApiParam({ name: 'agreementId', description: 'Agreement UUID' })
  @ApiResponse({ status: 200, description: 'Agreement payments list' })
  async getAgreementPayments(
    @CurrentUser() user: UserDto,
    @Param('agreementId') agreementId: string,
  ) {
    return this.paymentsService.getAgreementPayments(agreementId, user.id, user.role);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('collaborators/:collaboratorId')
  @ApiOperation({ summary: 'Get all payments received by a collaborator' })
  @ApiParam({ name: 'collaboratorId', description: 'Collaborator UUID' })
  @ApiResponse({ status: 200, description: 'Collaborator payments list' })
  async getCollaboratorPayments(
    @CurrentUser() user: UserDto,
    @Param('collaboratorId') collaboratorId: string,
  ) {
    return this.paymentsService.getCollaboratorPayments(collaboratorId, user.id, user.role);
  }
}
