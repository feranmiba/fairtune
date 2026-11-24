import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Attach Pino Logger
  const logger = app.get(Logger);
  app.useLogger(logger);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 4000;
  const apiPrefix = configService.get<string>('app.apiPrefix') || '/api/v1';
  const corsOrigin = configService.get<string | string[]>('app.corsOrigin') || '*';

  // Security Middleware
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Versioned API Prefix
  app.setGlobalPrefix(apiPrefix.replace(/^\//, ''));

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('FairTune API')
    .setDescription(
      'FairTune - AI-Powered Music Contract Intelligence & Stellar Royalty Protection Platform API',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'User registration, login, token rotation, and current session')
    .addTag('Users', 'User profiles and artist identity')
    .addTag('Documents', 'Music contract upload, storage, and retrieval')
    .addTag('Contract Analysis', 'AI-assisted legal contract clause extraction and risk analysis')
    .addTag(
      'Contract Negotiation Copilot',
      'Interactive AI negotiation assistant with contract-grounded answers and clause citations',
    )
    .addTag(
      'AI Royalty Intelligence',
      'Deterministic split simulations, recoupment waterfalls, and anomaly detection',
    )
    .addTag(
      'AI Music Rights Intelligence',
      'Music ownership metadata extraction, collaborator parsing, and discrepancy checks',
    )
    .addTag('Royalty Agreements', 'Collaborative music royalty split creation and state management')
    .addTag('Collaborators', 'Collaborator lookup and Stellar wallet mappings')
    .addTag(
      'Stellar Blockchain',
      'Stellar Testnet, account verification, and Soroban contract endpoints',
    )
    .addTag('Health', 'Service health and readiness checks')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Enable graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`FairTune API listening on port ${port} with prefix '${apiPrefix}'`);
  logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
