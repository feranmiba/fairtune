import { Controller, Post, Get, Param, Body, Query, UseGuards, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RoyaltyIntelligenceService } from './royalty-intelligence.service';
import { RoyaltyAnalyticsService } from './services/royalty-analytics.service';
import { RoyaltyForecastingService } from './services/royalty-forecasting.service';
import { AnomalyDetectionService } from './services/anomaly-detection.service';
import { AnomalyReviewService } from './services/anomaly-review.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  simulateRoyaltySchema,
  saveSimulationSchema,
  forecastEarningsSchema,
  queryAnomaliesSchema,
  reviewAnomalySchema,
  SimulateRoyaltyInput,
  SaveSimulationInput,
  ForecastEarningsInput,
  QueryAnomaliesInput,
  ReviewAnomalyInput,
} from '@fairtune/validation';
import { UserDto } from '@fairtune/shared';

@ApiTags('AI Royalty Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('royalty-intelligence')
export class RoyaltyIntelligenceController {
  constructor(
    private readonly royaltyIntelligenceService: RoyaltyIntelligenceService,
    private readonly analyticsService: RoyaltyAnalyticsService,
    private readonly forecastingService: RoyaltyForecastingService,
    private readonly anomalyDetectionService: AnomalyDetectionService,
    private readonly anomalyReviewService: AnomalyReviewService,
  ) {}

  @Get('earnings/summary')
  @ApiOperation({
    summary: 'Get aggregated historical royalty earnings summary derived from confirmed payments',
  })
  @ApiResponse({ status: 200, description: 'Royalty earnings summary' })
  async getEarningsSummary(@CurrentUser() user: UserDto) {
    return this.analyticsService.getEarningsSummary(user.id, user.role);
  }

  @Get('earnings/by-track')
  @ApiOperation({ summary: 'Get historical earnings grouped by track/project' })
  @ApiResponse({ status: 200, description: 'Track earnings list' })
  async getEarningsByTrack(@CurrentUser() user: UserDto) {
    const summary = await this.analyticsService.getEarningsSummary(user.id, user.role);
    return summary.byTrack;
  }

  @Get('earnings/by-collaborator')
  @ApiOperation({ summary: 'Get historical earnings grouped by collaborator' })
  @ApiResponse({ status: 200, description: 'Collaborator earnings list' })
  async getEarningsByCollaborator(@CurrentUser() user: UserDto) {
    const summary = await this.analyticsService.getEarningsSummary(user.id, user.role);
    return summary.byCollaborator;
  }

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
  async forecast(@CurrentUser() _user: UserDto, @Body() input: ForecastEarningsInput) {
    return this.forecastingService.generateForecast(input);
  }

  @Get('anomalies/:agreementId')
  @ApiOperation({ summary: 'Run legacy anomaly and discrepancy check for a royalty agreement' })
  @ApiResponse({ status: 200, description: 'Anomaly report generated' })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  async checkAnomalies(@CurrentUser() user: UserDto, @Param('agreementId') agreementId: string) {
    return this.royaltyIntelligenceService.checkAgreementAnomalies(user.id, agreementId);
  }

  @Post('anomalies/detect/:agreementId')
  @ApiOperation({
    summary:
      'Run comprehensive deterministic anomaly detection with AI explanations on an agreement',
  })
  @ApiParam({ name: 'agreementId', description: 'Royalty agreement UUID' })
  @ApiResponse({ status: 200, description: 'Anomalies detected and explained' })
  async detectAnomalies(@CurrentUser() user: UserDto, @Param('agreementId') agreementId: string) {
    return this.anomalyDetectionService.detectAgreementAnomalies(agreementId, user.id, user.role);
  }

  @Get('anomalies')
  @ApiOperation({ summary: 'List detected royalty anomalies with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated anomalies list' })
  @UsePipes(new ZodValidationPipe(queryAnomaliesSchema))
  async listAnomalies(@CurrentUser() user: UserDto, @Query() query: QueryAnomaliesInput) {
    return this.anomalyReviewService.listAnomalies(query, user.id, user.role);
  }

  @Get('anomalies/detail/:id')
  @ApiOperation({ summary: 'Get anomaly details, AI explanation, and investigation audit history' })
  @ApiParam({ name: 'id', description: 'Anomaly UUID' })
  @ApiResponse({ status: 200, description: 'Anomaly report retrieved' })
  async getAnomalyById(@CurrentUser() user: UserDto, @Param('id') id: string) {
    return this.anomalyReviewService.getAnomalyById(id, user.id, user.role);
  }

  @Post('anomalies/:id/review')
  @ApiOperation({
    summary: 'Review an anomaly finding (mark reviewed, resolve, flag false positive)',
  })
  @ApiParam({ name: 'id', description: 'Anomaly UUID' })
  @ApiResponse({ status: 200, description: 'Anomaly reviewed successfully' })
  @UsePipes(new ZodValidationPipe(reviewAnomalySchema))
  async reviewAnomaly(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
    @Body() input: ReviewAnomalyInput,
  ) {
    return this.anomalyReviewService.reviewAnomaly(id, user.id, input);
  }
}
