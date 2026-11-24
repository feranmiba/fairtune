import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RightsIntelligenceService } from './rights-intelligence.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserDto } from '@fairtune/shared';

@ApiTags('AI Music Rights Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rights-intelligence')
export class RightsIntelligenceController {
  constructor(private readonly rightsService: RightsIntelligenceService) {}

  @Post('extract/:documentId')
  @ApiOperation({
    summary:
      'Extract track titles, contributors, publishers, and ownership percentages from a contract',
  })
  @ApiResponse({ status: 200, description: 'Rights metadata successfully extracted' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async extractRights(@CurrentUser() user: UserDto, @Param('documentId') documentId: string) {
    return this.rightsService.extractRightsMetadata(user.id, documentId);
  }
}
