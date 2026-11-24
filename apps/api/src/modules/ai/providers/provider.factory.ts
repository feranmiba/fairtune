import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAiProvider } from './interfaces/ai-provider.interface';
import { DevelopmentAiAdapter } from './adapters/development-ai.adapter';

@Injectable()
export class AiProviderFactory {
  private readonly logger = new Logger(AiProviderFactory.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly devAdapter: DevelopmentAiAdapter,
  ) {}

  getProvider(): IAiProvider {
    const providerName = this.configService.get<string>('ai.provider') || 'placeholder';

    switch (providerName.toLowerCase()) {
      case 'openai':
      case 'anthropic':
        this.logger.log(
          `Configured AI provider is '${providerName}'. Active adapter fallback: development-mock (Phase 1).`,
        );
        return this.devAdapter;
      case 'placeholder':
      default:
        return this.devAdapter;
    }
  }
}
