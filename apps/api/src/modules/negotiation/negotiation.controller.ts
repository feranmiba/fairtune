import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
  UsePipes,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { NegotiationService } from './negotiation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createConversationSchema,
  sendAIMessageSchema,
  CreateConversationInput,
  SendAIMessageInput,
} from '@fairtune/validation';
import { UserDto } from '@fairtune/shared';

@ApiTags('Contract Negotiation Copilot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('negotiation')
export class NegotiationController {
  constructor(private readonly negotiationService: NegotiationService) {}

  @Post('conversations')
  @ApiOperation({
    summary: 'Create a new AI negotiation copilot conversation linked to a contract',
  })
  @ApiResponse({ status: 201, description: 'Conversation initialized successfully' })
  @UsePipes(new ZodValidationPipe(createConversationSchema))
  async createConversation(@CurrentUser() user: UserDto, @Body() input: CreateConversationInput) {
    return this.negotiationService.createConversation(user.id, input);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List all negotiation copilot conversations for current artist' })
  @ApiResponse({ status: 200, description: 'Conversations list retrieved' })
  async listConversations(@CurrentUser() user: UserDto) {
    return this.negotiationService.listUserConversations(user.id);
  }

  @Get('conversations/:id/stream')
  @ApiOperation({
    summary: 'Stream AI negotiation copilot response via Server-Sent Events (SSE) (GET)',
  })
  @ApiQuery({
    name: 'content',
    required: true,
    description: 'Question or prompt for the AI copilot',
  })
  @ApiResponse({ status: 200, description: 'SSE stream connected' })
  async streamMessageGet(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
    @Query('content') content: string,
    @Res() res: Response,
  ) {
    return this.negotiationService.streamMessage(
      user.id,
      id,
      { content: content || 'Explain this contract.' },
      res,
    );
  }

  @Post('conversations/:id/stream')
  @ApiOperation({
    summary: 'Stream AI negotiation copilot response via Server-Sent Events (SSE) (POST)',
  })
  @ApiResponse({ status: 200, description: 'SSE stream connected' })
  @UsePipes(new ZodValidationPipe(sendAIMessageSchema))
  async streamMessagePost(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
    @Body() input: SendAIMessageInput,
    @Res() res: Response,
  ) {
    return this.negotiationService.streamMessage(user.id, id, input, res);
  }

  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Get conversation details and full chat history with source clause references',
  })
  @ApiResponse({ status: 200, description: 'Conversation retrieved' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversation(@CurrentUser() user: UserDto, @Param('id') id: string) {
    return this.negotiationService.getConversationById(user.id, id);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({
    summary: 'Send a message to the AI Negotiation Copilot with grounded clause citations',
  })
  @ApiResponse({ status: 200, description: 'AI copilot response generated' })
  @UsePipes(new ZodValidationPipe(sendAIMessageSchema))
  async sendMessage(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
    @Body() input: SendAIMessageInput,
  ) {
    return this.negotiationService.sendMessage(user.id, id, input);
  }
}
