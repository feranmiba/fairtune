import { Controller, Post, Get, Param, Body, UseGuards, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RoyaltyAgreementsService } from './royalty-agreements.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createRoyaltyAgreementSchema, CreateRoyaltyAgreementInput } from '@fairtune/validation';
import { UserDto } from '@fairtune/shared';

@ApiTags('Royalty Agreements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('royalty-agreements')
export class RoyaltyAgreementsController {
  constructor(private readonly royaltyService: RoyaltyAgreementsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new royalty agreement with validated 100% split allocations' })
  @ApiResponse({ status: 201, description: 'Royalty agreement created successfully' })
  @ApiResponse({ status: 400, description: 'Splits do not equal 100% or invalid wallet addresses' })
  @UsePipes(new ZodValidationPipe(createRoyaltyAgreementSchema))
  async create(@CurrentUser() user: UserDto, @Body() input: CreateRoyaltyAgreementInput) {
    return this.royaltyService.createAgreement(user.id, input);
  }

  @Get()
  @ApiOperation({ summary: 'List all royalty agreements created by or involving current user' })
  @ApiResponse({ status: 200, description: 'Agreements list retrieved' })
  async list(@CurrentUser() user: UserDto) {
    return this.royaltyService.listUserAgreements(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get details, collaborator participants, and payout history for an agreement',
  })
  @ApiResponse({ status: 200, description: 'Agreement details retrieved' })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  async getById(@CurrentUser() user: UserDto, @Param('id') id: string) {
    return this.royaltyService.getAgreementById(user.id, id);
  }
}
