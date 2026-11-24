import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseFilePipeBuilder,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserDto } from '@fairtune/shared';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a music contract document (PDF up to 10MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Music contract in PDF format',
        },
        title: {
          type: 'string',
          description: 'Custom contract title',
          example: 'Universal Music Publishing Agreement 2026',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file format or size exceeded' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: UserDto,
    @Body('title') title: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'pdf',
        })
        .addMaxSizeValidator({
          maxSize: 10 * 1024 * 1024, // 10MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        }),
    )
    file: Express.Multer.File,
  ) {
    return this.documentsService.uploadDocument(user.id, title, file);
  }

  @Get()
  @ApiOperation({ summary: 'List all uploaded contracts for the current user' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  async list(@CurrentUser() user: UserDto) {
    return this.documentsService.listUserDocuments(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document metadata and status by ID' })
  @ApiResponse({ status: 200, description: 'Document details retrieved' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getById(@CurrentUser() user: UserDto, @Param('id') id: string) {
    return this.documentsService.getDocumentById(user.id, id);
  }

  @Get(':id/status')
  @ApiOperation({
    summary: 'Track asynchronous processing status, chunk counts, and embedding status',
  })
  @ApiResponse({ status: 200, description: 'Processing status retrieved' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getStatus(@CurrentUser() user: UserDto, @Param('id') id: string) {
    return this.documentsService.getDocumentStatus(user.id, id);
  }

  @Get(':id/text')
  @ApiOperation({
    summary: 'Retrieve full extracted text, page count, and segmented clause chunks',
  })
  @ApiResponse({ status: 200, description: 'Extracted text retrieved' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getText(@CurrentUser() user: UserDto, @Param('id') id: string) {
    return this.documentsService.getExtractedText(user.id, id);
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Retry failed PDF extraction and embedding generation' })
  @ApiResponse({ status: 202, description: 'Document processing retry scheduled' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async retry(@CurrentUser() user: UserDto, @Param('id') id: string) {
    return this.documentsService.retryExtraction(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a document and its stored contract file' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async delete(@CurrentUser() user: UserDto, @Param('id') id: string) {
    return this.documentsService.deleteDocument(user.id, id);
  }
}
