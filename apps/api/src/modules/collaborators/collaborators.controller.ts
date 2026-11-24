import { Controller, Get, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CollaboratorsService } from './collaborators.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Collaborators')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('collaborators')
export class CollaboratorsController {
  constructor(private readonly collaboratorsService: CollaboratorsService) {}

  @Get('wallet/:address')
  @ApiOperation({ summary: 'Lookup collaborator profile by Stellar wallet address' })
  @ApiResponse({ status: 200, description: 'Collaborator details retrieved' })
  @ApiResponse({ status: 404, description: 'Collaborator not found' })
  async getByWallet(@Param('address') address: string) {
    const collaborator = await this.collaboratorsService.findByWallet(address);
    if (!collaborator) {
      throw new NotFoundException('No collaborator found with this wallet address');
    }
    return collaborator;
  }
}
