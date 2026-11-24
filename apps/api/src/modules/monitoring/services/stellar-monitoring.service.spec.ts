import { Test, TestingModule } from '@nestjs/testing';
import { StellarMonitoringService } from './stellar-monitoring.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { StellarNetworkService } from '../../stellar/services/stellar-network.service';
import { PaymentSyncService } from './payment-sync.service';

describe('StellarMonitoringService', () => {
  let service: StellarMonitoringService;
  let prisma: any;
  let mockRpcServer: any;
  let mockNetworkService: any;
  let paymentSyncService: any;

  const mockContractId = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';

  beforeEach(async () => {
    prisma = {
      stellarMonitoringCheckpoint: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    mockRpcServer = {
      getLatestLedger: jest.fn().mockResolvedValue({ sequence: 1000 }),
      getEvents: jest.fn().mockResolvedValue({
        events: [
          {
            id: 'evt-1',
            type: 'contract',
            ledger: 995,
            ledgerClosedAt: '2026-11-24T14:00:00Z',
            contractId: mockContractId,
            topic: ['royalty', 'distrib', '1'],
            value: ['100000000', '0'],
            txHash: 'tx-1',
          },
        ],
      }),
    };

    mockNetworkService = {
      getRpcServer: jest.fn().mockReturnValue(mockRpcServer),
    };

    paymentSyncService = {
      processContractEvent: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarMonitoringService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => (key === 'stellar.contractId' ? mockContractId : null)),
          },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: StellarNetworkService, useValue: mockNetworkService },
        { provide: PaymentSyncService, useValue: paymentSyncService },
      ],
    }).compile();

    service = module.get<StellarMonitoringService>(StellarMonitoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreateCheckpoint', () => {
    it('should return existing checkpoint if present', async () => {
      const mockCheckpoint = {
        id: 'chk-1',
        contractAddress: mockContractId,
        lastLedgerSequence: 950,
      };
      prisma.stellarMonitoringCheckpoint.findUnique.mockResolvedValue(mockCheckpoint);

      const res = await service.getOrCreateCheckpoint();
      expect(res).toEqual(mockCheckpoint);
    });

    it('should create checkpoint if none exists', async () => {
      prisma.stellarMonitoringCheckpoint.findUnique.mockResolvedValue(null);
      prisma.stellarMonitoringCheckpoint.create.mockResolvedValue({
        id: 'chk-2',
        contractAddress: mockContractId,
        lastLedgerSequence: 0,
      });

      const res = await service.getOrCreateCheckpoint();
      expect(res?.contractAddress).toBe(mockContractId);
      expect(prisma.stellarMonitoringCheckpoint.create).toHaveBeenCalled();
    });
  });

  describe('pollEvents', () => {
    it('should query events from checkpoint and process them', async () => {
      prisma.stellarMonitoringCheckpoint.findUnique.mockResolvedValue({
        id: 'chk-1',
        contractAddress: mockContractId,
        lastLedgerSequence: 990,
      });

      const res = await service.pollEvents(100);
      expect(res.processed).toBe(1);
      expect(paymentSyncService.processContractEvent).toHaveBeenCalled();
      expect(prisma.stellarMonitoringCheckpoint.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contractAddress: mockContractId },
          data: expect.objectContaining({ lastLedgerSequence: 995 }),
        }),
      );
    });
  });
});
