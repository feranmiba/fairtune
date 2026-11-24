import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import configuration from './config/configuration';

// Global Providers & Middleware
import { DatabaseModule } from './database/database.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ArtistsModule } from './modules/artists/artists.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AiModule } from './modules/ai/ai.module';
import { ContractAnalysisModule } from './modules/contract-analysis/contract-analysis.module';
import { NegotiationModule } from './modules/negotiation/negotiation.module';
import { RoyaltyIntelligenceModule } from './modules/royalty-intelligence/royalty-intelligence.module';
import { RightsIntelligenceModule } from './modules/rights-intelligence/rights-intelligence.module';
import { RoyaltyAgreementsModule } from './modules/royalty-agreements/royalty-agreements.module';
import { CollaboratorsModule } from './modules/collaborators/collaborators.module';
import { StellarModule } from './modules/stellar/stellar.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Structured Logging with Pino
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'body.password',
          'body.refreshToken',
        ],
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                },
              }
            : undefined,
      },
    }),

    // Rate Limiting (Default: 100 requests per 60 seconds)
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Database & Features
    DatabaseModule,
    AiModule,
    AuthModule,
    UsersModule,
    ArtistsModule,
    DocumentsModule,
    ContractAnalysisModule,
    NegotiationModule,
    RoyaltyIntelligenceModule,
    RightsIntelligenceModule,
    RoyaltyAgreementsModule,
    CollaboratorsModule,
    StellarModule,
    PaymentsModule,
    MonitoringModule,
    ReconciliationModule,
    NotificationsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
