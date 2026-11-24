import { Controller, Post, Get, Param, Body, UseGuards, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RoyaltyIntelligenceService } from './royalty-intelligence.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  simulateRoyaltySchema,
  saveSimulationSchema,
  forecastEarningsSchema,
  SimulateRoyaltyInput,
  SaveSimulationInput,
  ForecastEarningsInput,
} from '@fairtune/validation';
import { UserDto } from '@fairtune/shared';

@ApiTags('AI Royalty Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('royalty-intelligence')
export class RoyaltyIntelligenceController {
  constructor(private readonly royaltyIntelligenceService: RoyaltyIntelligenceService) {}

  @Post('simulate')
  @ApiOperation({
    summary:
      'Simulate music revenue splits using deterministic, decimal-accurate financial arithmetic',
  })
  @ApiResponse({ status: 200, description: 'Simulation successfully calculated' })
  @ApiResponse({
    status: 400,
    description: 'Invalid simulation input or percentages exceeding 100%',
  })
  @UsePipes(new ZodValidationPipe(simulateRoyaltySchema))
  async simulate(@CurrentUser() user: UserDto, @Body() input: SimulateRoyaltyInput) {
    return this.royaltyIntelligenceService.simulateSplits(user.id, input);
  }

  @Post('simulate/save')
  @ApiOperation({
    summary: 'Calculate and persist a royalty split simulation for future reference',
  })
  @ApiResponse({ status: 201, description: 'Simulation successfully created and saved' })
  @ApiResponse({ status: 400, description: 'Invalid simulation input' })
  @UsePipes(new ZodValidationPipe(saveSimulationSchema))
  async saveSimulation(@CurrentUser() user: UserDto, @Body() input: SaveSimulationInput) {
    return this.royaltyIntelligenceService.saveSimulation(user.id, input);
  }

  @Get('simulations')
  @ApiOperation({ summary: 'List all saved royalty simulations for the current artist' })
  @ApiResponse({ status: 200, description: 'Simulations retrieved' })
  async listSimulations(@CurrentUser() user: UserDto) {
    return this.royaltyIntelligenceService.listSimulations(user.id);
  }

  @Get('simulations/:id')
  @ApiOperation({ summary: 'Get a specific saved royalty simulation by ID' })
  @ApiResponse({ status: 200, description: 'Simulation details retrieved' })
  @ApiResponse({ status: 404, description: 'Simulation not found' })
  async getSimulation(@CurrentUser() user: UserDto, @Param('id') id: string) {
    return this.royaltyIntelligenceService.getSimulationById(user.id, id);
  }

  @Post('forecast')
  @ApiOperation({
    summary:
      'Model projected revenue shares from historical performance, strictly separating factual data from mathematical estimates',
  })
  @ApiResponse({ status: 200, description: 'Earnings forecast modeled successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @UsePipes(new ZodValidationPipe(forecastEarningsSchema))
  async forecast(@CurrentUser() user: UserDto, @Body() input: ForecastEarningsInput) {
    return this.royaltyIntelligenceService.forecastEarnings(user.id, input);
  }

  @Get('anomalies/:agreementId')
  @ApiOperation({ summary: 'Run anomaly and discrepancy detection for a royalty agreement' })
  @ApiResponse({ status: 200, description: 'Anomaly report generated' })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  async checkAnomalies(@CurrentUser() user: UserDto, @Param('agreementId') agreementId: string) {
    return this.royaltyIntelligenceService.checkAgreementAnomalies(user.id, agreementId);
  }
}
