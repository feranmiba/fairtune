import {
  Controller,
  Post,
  Get,
  Body,
  UsePipes,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
} from '@fairtune/validation';
import { UserDto } from '@fairtune/shared';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new FairTune user and artist profile' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 409, description: 'User email already exists' })
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(@Body() input: RegisterInput) {
    return this.authService.register(input);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and obtain JWT tokens' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() input: LoginInput) {
    return this.authService.login(input);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and retrieve new access token' })
  @ApiResponse({ status: 200, description: 'Tokens rotated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid, expired, or reused refresh token' })
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  async refresh(@Body() input: RefreshTokenInput) {
    return this.authService.refreshTokens(input);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke active refresh token and end session' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(@Body() body?: { refreshToken?: string }) {
    return this.authService.logout(body?.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get currently authenticated user details' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: UserDto) {
    return user;
  }
}
