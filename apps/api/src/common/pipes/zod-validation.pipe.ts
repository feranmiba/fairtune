import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    // Never transform or strip custom decorators (e.g. @CurrentUser)
    if (metadata.type === 'custom') {
      return value;
    }

    // Do not run body/query object validation schemas against string route params
    if (metadata.type === 'param' && typeof value === 'string') {
      return value;
    }

    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          error: 'Bad Request',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
