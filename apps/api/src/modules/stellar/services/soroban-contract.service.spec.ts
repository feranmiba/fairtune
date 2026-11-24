import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SorobanContractService } from './soroban-contract.service';
import { StellarNetworkService } from './stellar-network.service';
import { nativeToScVal } from '@stellar/stellar-sdk';

describe('SorobanContractService', () => {
  let service: SorobanContractService;
  let mockConfigService: any;
  let mockNetworkService: any;
  let mockRpcServer: any;

  const validContractId = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';
  const dummyPublicKey = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

  beforeEach(async () => {
    mockRpcServer = {
      simulateTransaction: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'stellar.contractId') return validContractId;
        if (key === 'stellar.platformPublicKey') return dummyPublicKey;
        return null;
      }),
    };

    mockNetworkService = {
      getRpcUrl: jest.fn().mockReturnValue('https://soroban-testnet.stellar.org'),
      getRpcServer: jest.fn().mockReturnValue(mockRpcServer),
      getNetworkPassphrase: jest.fn().mockReturnValue('Test SDF Network ; September 2015'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SorobanContractService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: StellarNetworkService, useValue: mockNetworkService },
      ],
    }).compile();

    service = module.get<SorobanContractService>(SorobanContractService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.getContractId()).toBe(validContractId);
  });

  describe('isValidContractId', () => {
    it('should validate proper Soroban contract IDs (C...)', () => {
      expect(service.isValidContractId(validContractId)).toBe(true);
      expect(service.isValidContractId('invalid')).toBe(false);
      expect(service.isValidContractId('')).toBe(false);
    });
  });

  describe('getContractConfig', () => {
    it('should return contract configuration', () => {
      const config = service.getContractConfig();
      expect(config.contractId).toBe(validContractId);
      expect(config.rpcUrl).toBe('https://soroban-testnet.stellar.org');
    });
  });

  describe('getAgreement', () => {
    it('should return null when contractId is not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'stellar.contractId') return undefined;
        return dummyPublicKey;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SorobanContractService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: StellarNetworkService, useValue: mockNetworkService },
        ],
      }).compile();

      const serviceNoContract = module.get<SorobanContractService>(SorobanContractService);
      const res = await serviceNoContract.getAgreement(1);
      expect(res).toBeNull();
    });

    it('should return parsed agreement data when simulation succeeds', async () => {
      const mockRawAgreement = {
        id: BigInt(1),
        creator: 'GCREATOR...',
        track_id: 'TRK-001',
        metadata_hash: Buffer.from(
          'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          'hex',
        ),
        token: 'CDUMMYTOKEN...',
        participants: [
          { address: 'GPARTICIPANT1...', basis_points: 6000 },
          { address: 'GPARTICIPANT2...', basis_points: 4000 },
        ],
        approvals: ['GPARTICIPANT1...'],
        status: { Active: [] },
        total_deposited: BigInt(1000000000),
        total_distributed: BigInt(500000000),
        created_at: BigInt(1700000000),
      };

      mockRpcServer.simulateTransaction.mockResolvedValue({
        transactionData: {},
        result: {
          retval: nativeToScVal(mockRawAgreement),
        },
      });

      const res = await service.getAgreement(1);
      expect(res).toBeDefined();
      expect(res?.id).toBe('1');
      expect(res?.creator).toBe('GCREATOR...');
      expect(res?.trackId).toBe('TRK-001');
      expect(res?.status).toBe('Active');
      expect(res?.totalDeposited).toBe('1000000000');
      expect(res?.totalDistributed).toBe('500000000');
      expect(res?.participants).toHaveLength(2);
    });

    it('should return null if simulation fails or has no return value', async () => {
      mockRpcServer.simulateTransaction.mockResolvedValue({
        error: 'Host error: agreement not found',
      });

      const res = await service.getAgreement(999);
      expect(res).toBeNull();
    });
  });

  describe('getAgreementStatus', () => {
    it('should return the agreement status if found', async () => {
      jest.spyOn(service, 'getAgreement').mockResolvedValue({
        id: '1',
        creator: 'GCREATOR...',
        trackId: 'TRK-001',
        metadataHash: 'abc',
        token: 'CTOKEN...',
        participants: [],
        approvals: [],
        status: 'ACTIVE',
        totalDeposited: '1000',
        totalDistributed: '500',
        createdAt: 1700000000,
      });

      const status = await service.getAgreementStatus(1);
      expect(status).toBe('ACTIVE');
    });

    it('should return null if agreement is not found', async () => {
      jest.spyOn(service, 'getAgreement').mockResolvedValue(null);
      const status = await service.getAgreementStatus(999);
      expect(status).toBeNull();
    });
  });

  describe('getUndistributedBalance', () => {
    it('should calculate undistributed balance accurately', async () => {
      jest.spyOn(service, 'getAgreement').mockResolvedValue({
        id: '1',
        creator: 'GCREATOR...',
        trackId: 'TRK-001',
        metadataHash: 'abc',
        token: 'CTOKEN...',
        participants: [],
        approvals: [],
        status: 'FUNDED',
        totalDeposited: '15000000',
        totalDistributed: '5000000',
        createdAt: 1700000000,
      });

      const balance = await service.getUndistributedBalance(1);
      expect(balance).toBe(BigInt(10000000));
    });

    it('should return 0 when distributed >= deposited or agreement not found', async () => {
      jest.spyOn(service, 'getAgreement').mockResolvedValue({
        id: '1',
        creator: 'GCREATOR...',
        trackId: 'TRK-001',
        metadataHash: 'abc',
        token: 'CTOKEN...',
        participants: [],
        approvals: [],
        status: 'COMPLETED',
        totalDeposited: '5000000',
        totalDistributed: '5000000',
        createdAt: 1700000000,
      });

      const balance = await service.getUndistributedBalance(1);
      expect(balance).toBe(BigInt(0));

      jest.spyOn(service, 'getAgreement').mockResolvedValue(null);
      const balanceNotFound = await service.getUndistributedBalance(999);
      expect(balanceNotFound).toBe(BigInt(0));
    });
  });
});
