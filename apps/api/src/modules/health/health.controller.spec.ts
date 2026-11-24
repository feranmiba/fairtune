import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../../database/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: {
    $queryRaw: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return ok status and database status up when database query succeeds', async () => {
    const response = await controller.check();
    expect(response.status).toBe('ok');
    expect(response.services.database).toBe('up');
    expect(response.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should report database status unreachable if database query fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('Connection lost'));
    const response = await controller.check();
    expect(response.status).toBe('ok');
    expect(response.services.database).toBe('unreachable');
  });
});
