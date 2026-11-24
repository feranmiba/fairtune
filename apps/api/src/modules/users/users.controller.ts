import { Controller, Get, Patch, Body, UseGuards, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { updateUserProfileSchema, UpdateUserProfileInput } from '@fairtune/validation';
import { UserDto } from '@fairtune/shared';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile and artist details' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@CurrentUser() user: UserDto) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user personal profile and artist information' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  @UsePipes(new ZodValidationPipe(updateUserProfileSchema))
  async updateProfile(@CurrentUser() user: UserDto, @Body() input: UpdateUserProfileInput) {
    return this.usersService.updateProfile(user.id, input);
  }
}
