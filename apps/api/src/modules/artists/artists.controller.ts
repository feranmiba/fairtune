import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ArtistsService } from './artists.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Artists')
@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get public artist profile by ID' })
  @ApiResponse({ status: 200, description: 'Artist profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Artist profile not found' })
  async getById(@Param('id') id: string) {
    return this.artistsService.findById(id);
  }
}
