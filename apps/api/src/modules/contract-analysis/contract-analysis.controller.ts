import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ContractAnalysisService } from './contract-analysis.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UserDto } from '@fairtune/shared';
import {
  TriggerContractAnalysisInput,
  CompareContractsInput,
  compareContractsSchema,
} from '@fairtune/validation';

@ApiTags('Contract Analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contract-analysis')
export class ContractAnalysisController {
  constructor(private readonly analysisService: ContractAnalysisService) {}

  @Post('compare')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(compareContractsSchema))
  @ApiOperation({
    summary: 'Compare two contract document versions and identify risk/clause differences',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sourceDocumentId', 'targetDocumentId'],
      properties: {
        sourceDocumentId: { type: 'string', format: 'uuid' },
        targetDocumentId: { type: 'string', format: 'uuid' },
        comparisonFocus: {
          type: 'array',
          items: { type: 'string' },
          example: ['ROYALTIES', 'RIGHTS', 'TERMINATION'],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Comparison computed successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'One or both documents not found' })
  async compare(@CurrentUser() user: UserDto, @Body() input: CompareContractsInput) {
    return this.analysisService.compareContracts(user.id, input);
  }

  @Get('document/:documentId')
  @ApiOperation({
    summary: 'Get structured contract analysis results and risk assessment by document ID',
  })
  @ApiResponse({ status: 200, description: 'Analysis results retrieved' })
  @ApiResponse({ status: 404, description: 'Analysis not found' })
  async getByDocumentId(@CurrentUser() user: UserDto, @Param('documentId') documentId: string) {
    return this.analysisService.getAnalysisByDocumentId(user.id, documentId);
  }

  @Post(':documentId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger AI analysis on an uploaded contract document' })
  @ApiResponse({ status: 202, description: 'Analysis job queued/processed' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async trigger(
    @CurrentUser() user: UserDto,
    @Param('documentId') documentId: string,
    @Body() input?: TriggerContractAnalysisInput,
  ) {
    return this.analysisService.triggerAnalysis(user.id, documentId, input);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get structured contract analysis results and risk assessment by analysis ID',
  })
  @ApiResponse({ status: 200, description: 'Analysis results retrieved' })
  @ApiResponse({ status: 404, description: 'Analysis not found' })
  async getById(@CurrentUser() user: UserDto, @Param('id') id: string) {
    return this.analysisService.getAnalysisById(user.id, id);
  }
}
